using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Data.SqlClient;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// CORS FOR THE REACT DEV SERVER
// ============================================================
//
// react-ts-app (Vite, localhost:5173) calls the Delivery API directly
// (src/api/contentApi.ts) rather than through a same-origin proxy, so the
// browser sends a real cross-origin request - without this, every fetch
// fails before a response is even received ("Failed to fetch"), since the
// Delivery API has no CORS settings of its own to opt an origin in.

const string ReactDevClientCorsPolicy = "ReactDevClientCorsPolicy";

builder.Services.AddCors(options =>
{
    options.AddPolicy(ReactDevClientCorsPolicy, policy =>
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// ============================================================
// DATA DIRECTORY
// ============================================================
//
// |DataDirectory| in the LocalDB connection string has nothing pinning
// it, so it falls back to .NET's default (the build output folder,
// bin/Debug/net9.0) - confirmed by the exact path SQL Server reported
// in an earlier LocalDB attach error. That folder isn't stable: clean
// builds/IDE rebuilds touch it, and where it resolves can even differ
// depending on how the app gets launched (dotnet run vs an IDE's F5 vs
// running the .exe directly), which is the likely explanation for
// "old data" reappearing after a reset - a stale .mdf sitting in or
// getting restored to that folder, separate from whatever was just
// cleared. Pin it explicitly to the umbraco/Data folder instead -
// already the project's dedicated, git-ignored spot for exactly this
// kind of persistent local file (Umbraco's own Logs/TEMP already live
// there) - so it resolves identically every time regardless of launch
// method.

AppDomain.CurrentDomain.SetData(
    "DataDirectory",
    System.IO.Path.Combine(
        builder.Environment.ContentRootPath,
        "umbraco",
        "Data"));

// ============================================================
// TARGET UMBRACO 16 DATABASE
// ============================================================

var targetConnectionString =
    builder.Configuration.GetConnectionString("umbracoDbDSN");

if (string.IsNullOrWhiteSpace(targetConnectionString))
{
    throw new Exception(
        "Target Umbraco connection string 'umbracoDbDSN' was not found.");
}

// ============================================================
// RESET COMMAND
// ============================================================
//
// Drops EVERY table in the TARGET database. Runs BEFORE Umbraco boots
// (unlike create-home-schema below, which needs Umbraco's services) so
// dropping tables out from under an already-booted runtime's own lock/
// cache machinery is never a concern.

if (args.Length > 0 &&
    args[0].Equals("reset", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" RESET TARGET DATABASE - DROPS EVERY TABLE");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    await using var target =
        new SqlConnection(targetConnectionString);

    await target.OpenAsync();

    Console.WriteLine(
        $"Target: {target.DataSource} / {target.Database}");
    Console.WriteLine();
    Console.WriteLine(
        "This permanently drops EVERY table in the database above.");
    Console.WriteLine();
    Console.Write(
        $"Type the database name ({target.Database}) to confirm: ");

    var confirmation = Console.ReadLine();

    if (!string.Equals(
            confirmation,
            target.Database,
            StringComparison.Ordinal))
    {
        Console.WriteLine();
        Console.WriteLine(
            "Confirmation did not match. Aborted - nothing was changed.");

        return;
    }

    Console.WriteLine();
    Console.WriteLine("Disabling foreign key constraints...");

    await ExecuteSqlAsync(
        target,
        """
        DECLARE @sql NVARCHAR(MAX) = N'';
        SELECT @sql += 'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + ' NOCHECK CONSTRAINT ALL;'
        FROM sys.tables;
        EXEC sp_executesql @sql;
        """);

    Console.WriteLine("Dropping foreign key constraints...");

    await ExecuteSqlAsync(
        target,
        """
        DECLARE @sql NVARCHAR(MAX) = N'';
        SELECT @sql += 'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + '.' + QUOTENAME(t.name) + ' DROP CONSTRAINT ' + QUOTENAME(fk.name) + ';'
        FROM sys.foreign_keys fk
        INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id;
        EXEC sp_executesql @sql;
        """);

    Console.WriteLine("Dropping tables...");

    await ExecuteSqlAsync(
        target,
        """
        DECLARE @sql NVARCHAR(MAX) = N'';
        SELECT @sql += 'DROP TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + ';'
        FROM sys.tables;
        EXEC sp_executesql @sql;
        """);

    var remainingTables =
        await GetTableListAsync(target);

    Console.WriteLine();
    Console.WriteLine(
        $"Done. {remainingTables.Count} tables remain (should be 0).");

    if (remainingTables.Count > 0)
    {
        foreach (var t in remainingTables)
        {
            Console.WriteLine($"  {t.Name}");
        }
    }

    Console.WriteLine();
    Console.WriteLine(
        "Next: run the app normally once (no args) to let Umbraco");
    Console.WriteLine(
        "rebuild its schema fresh, then run 'create-home-schema' again.");

    return;
}

// ============================================================
// BUILD UMBRACO
// ============================================================

builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddDeliveryApi()
    .AddComposers()
    .Build();

var app = builder.Build();

await app.BootUmbracoAsync();

// ============================================================
// CREATE-HOME-SCHEMA COMMAND
// ============================================================
//
// Builds the Document Types / Element Types for the React Home page
// (react-ts-app/src/components/Home/*.tsx, Header.tsx, Footer.tsx) directly
// in code, authored from scratch based on that React code - this content
// is hardcoded JSX/TSX defaults with no CMS source to pull from.
//
// Shape: one "homePage" document type with a single Block List property
// ("sections") that accepts any of the ten section block Element Types
// below, so editors can add/remove/reorder sections without a dev touching
// the schema. Repeating items inside each section (slides, cards, menu
// items, ...) are themselves Block Lists of small Element Types. Two
// singleton settings document types (headerSettings/footerSettings) cover
// the top nav and footer, which are shared across every page, not just
// Home. The Register/Login modal (NavModal.tsx) is deliberately NOT
// modelled - its own comment confirms no CMS field ever backed it.
//
// Idempotent: re-running finds already-created types by alias/name and
// skips them, so interrupting/re-running this is safe.

if (args.Length > 0 &&
    args[0].Equals("create-home-schema", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" CREATE HOME PAGE DOCUMENT TYPE STRUCTURE");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var dataTypeService =
        app.Services.GetRequiredService<IDataTypeService>();

    var propertyEditors =
        app.Services.GetRequiredService<PropertyEditorCollection>();

    var configurationEditorJsonSerializer =
        app.Services.GetRequiredService<IConfigurationEditorJsonSerializer>();

    var shortStringHelper =
        app.Services.GetRequiredService<IShortStringHelper>();

    var contentTypeContainerService =
        app.Services.GetRequiredService<IContentTypeContainerService>();

    var fileService =
        app.Services.GetRequiredService<IFileService>();

    // --------------------------------------------------------
    // FOLDER
    // --------------------------------------------------------
    //
    // Keeps every type this command creates together under one Document
    // Types folder in the backoffice instead of scattered at root.

    var existingFolders =
        (await contentTypeContainerService.GetAllAsync()).ToList();

    var homeFolder =
        existingFolders.FirstOrDefault(x =>
            x.Name != null &&
            x.Name.Equals("React Home Page", StringComparison.OrdinalIgnoreCase) &&
            x.ParentId == -1);

    if (homeFolder == null)
    {
        var folderResult =
            await contentTypeContainerService.CreateAsync(
                null,
                "React Home Page",
                null,
                Constants.Security.SuperUserKey);

        if (!folderResult.Success || folderResult.Result == null)
        {
            Console.WriteLine(
                $"FAILED FOLDER: React Home Page - {folderResult.Status}");

            return;
        }

        homeFolder = folderResult.Result;

        Console.WriteLine("CREATED FOLDER: React Home Page");
    }
    else
    {
        Console.WriteLine("EXISTS FOLDER: React Home Page");
    }

    var folderId = homeFolder.Id;

    // --------------------------------------------------------
    // SHARED SCALAR DATA TYPES
    // --------------------------------------------------------
    //
    // One Data Type per editor, reused across every property that needs it
    // (a Textstring property on heroSlide and one on contentCard share the
    // same Data Type, same as the backoffice's own built-in Textstring) -
    // unlike a Block List's Data Type below, which is always dedicated to
    // one property since its allowed-blocks config differs per property.

    var sharedDataTypeCache =
        new Dictionary<string, IDataType>(StringComparer.OrdinalIgnoreCase);

    async Task<IDataType> GetOrCreateSharedDataTypeAsync(
        string editorAlias,
        string editorUiAlias,
        string name)
    {
        if (sharedDataTypeCache.TryGetValue(editorAlias, out var cached))
        {
            return cached;
        }

        var existing =
            (await dataTypeService.GetAllAsync())
                .FirstOrDefault(d =>
                    d.EditorAlias.Equals(
                        editorAlias,
                        StringComparison.OrdinalIgnoreCase));

        if (existing != null)
        {
            sharedDataTypeCache[editorAlias] = existing;

            Console.WriteLine($"EXISTS DATATYPE: {existing.Name}");

            return existing;
        }

        if (!propertyEditors.TryGet(editorAlias, out var editor))
        {
            throw new InvalidOperationException(
                $"Property editor '{editorAlias}' is not registered.");
        }

        var dataType =
            new DataType(editor, configurationEditorJsonSerializer)
            {
                Name = name,
                EditorUiAlias = editorUiAlias
            };

        var createResult =
            await dataTypeService.CreateAsync(
                dataType,
                Constants.Security.SuperUserKey);

        if (!createResult.Success)
        {
            throw new InvalidOperationException(
                $"Could not create data type '{name}': {createResult.Status}");
        }

        sharedDataTypeCache[editorAlias] = createResult.Result;

        Console.WriteLine($"CREATED DATATYPE: {name}");

        return createResult.Result;
    }

    var txt =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextBox", "Umb.PropertyEditorUi.TextBox", "React Migration - Textstring");

    var txtArea =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextArea", "Umb.PropertyEditorUi.TextArea", "React Migration - Textarea");

    var rte =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.RichText", "Umb.PropertyEditorUi.Tiptap", "React Migration - Richtext");

    var media =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.MediaPicker3", "Umb.PropertyEditorUi.MediaPicker", "React Migration - Media Picker");

    var link =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.MultiUrlPicker", "Umb.PropertyEditorUi.MultiUrlPicker", "React Migration - Link Picker");

    var num =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.Integer", "Umb.PropertyEditorUi.Integer", "React Migration - Number");

    var boolType =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TrueFalse", "Umb.PropertyEditorUi.Toggle", "React Migration - Toggle");

    // --------------------------------------------------------
    // ELEMENT TYPE / DOCUMENT TYPE HELPER
    // --------------------------------------------------------

    // AddPropertyType(propertyType, "content") on its own only creates a
    // loose Group nested under an implicit "Generic" tab, not a real Tab -
    // properties still exist on the content type, but the Design canvas
    // can render them as if the type were empty. EnsureContentTab creates
    // a real Tab-type PropertyGroup first so properties actually show up.
    void EnsureContentTab(IContentType type)
    {
        if (type.PropertyGroups.Any(g =>
                g.Alias.Equals("content", StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        type.AddPropertyGroup("content", "Content");

        var tab =
            type.PropertyGroups.FirstOrDefault(g =>
                g.Alias.Equals("content", StringComparison.OrdinalIgnoreCase));

        if (tab != null)
        {
            tab.Type = PropertyGroupType.Tab;
        }
    }

    IContentType GetOrCreateType(
        string alias,
        string name,
        string icon,
        bool isElement,
        bool allowedAsRoot,
        params PropSpec[] props)
    {
        var existing = contentTypeService.Get(alias);

        if (existing != null)
        {
            var changed = false;

            if (!existing.PropertyGroups.Any(g =>
                    g.Alias.Equals("content", StringComparison.OrdinalIgnoreCase) &&
                    g.Type == PropertyGroupType.Tab))
            {
                EnsureContentTab(existing);
                changed = true;
            }

            foreach (var prop in props)
            {
                if (existing.PropertyTypes.Any(p =>
                        p.Alias.Equals(prop.Alias, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                var propertyType =
                    new PropertyType(shortStringHelper, prop.Type, prop.Alias)
                    {
                        Name = prop.Name,
                        Mandatory = prop.Mandatory
                    };

                existing.AddPropertyType(propertyType, "content");
                changed = true;

                Console.WriteLine($"  + ADDED PROPERTY: {alias}.{prop.Alias}");
            }

            if (changed)
            {
                contentTypeService.Save(existing);
            }

            Console.WriteLine($"EXISTS TYPE: {alias}");

            return existing;
        }

        var contentType =
            new ContentType(shortStringHelper, folderId)
            {
                Alias = alias,
                Name = name,
                Icon = icon,
                IsElement = isElement,
                AllowedAsRoot = allowedAsRoot
            };

        EnsureContentTab(contentType);

        foreach (var prop in props)
        {
            var propertyType =
                new PropertyType(shortStringHelper, prop.Type, prop.Alias)
                {
                    Name = prop.Name,
                    Mandatory = prop.Mandatory
                };

            contentType.AddPropertyType(propertyType, "content");
        }

        contentTypeService.Save(contentType);

        Console.WriteLine($"CREATED TYPE: {alias}");

        return contentType;
    }

    // --------------------------------------------------------
    // BLOCK LIST HELPER
    // --------------------------------------------------------
    //
    // Always creates a dedicated Data Type (never shared), since a Block
    // List's allowed-blocks config is specific to the one property it's
    // used on.

    async Task<IDataType> GetOrCreateBlockListAsync(
        string name,
        params IContentType[] allowedElementTypes)
    {
        var desiredKeys =
            allowedElementTypes.Select(t => t.Key.ToString()).ToList();

        var existing =
            (await dataTypeService.GetAllAsync())
                .FirstOrDefault(d =>
                    d.Name != null &&
                    d.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (existing != null)
        {
            // Self-healing: a Data Type this same name was already created
            // for may be missing block types a later code change added to
            // the call (e.g. heroImageBannerBlock added to homePage's
            // allowed sections after the first run already created this
            // Data Type) - GetOrCreateType already does the equivalent for
            // properties on a content type; this is that same idea for a
            // Block List's own allowed-blocks config. Mirrors create-
            // product-loan-schema's own copy of this helper.
            var existingBlocks =
                existing.ConfigurationData.TryGetValue("blocks", out var rawBlocks)
                    ? rawBlocks
                    : null;

            var existingKeys =
                (existingBlocks as IEnumerable<object>)?
                    .OfType<IDictionary<string, object>>()
                    .Select(b =>
                        b.TryGetValue("contentElementTypeKey", out var k)
                            ? k?.ToString()
                            : null)
                    .Where(k => k != null)
                    .Cast<string>()
                    .ToHashSet(StringComparer.OrdinalIgnoreCase)
                ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var missingKeys =
                desiredKeys.Where(k => !existingKeys.Contains(k)).ToList();

            if (missingKeys.Count == 0)
            {
                Console.WriteLine($"EXISTS BLOCKLIST DATATYPE: {name}");

                return existing;
            }

            var updatedBlocks =
                desiredKeys
                    .Select(k => new Dictionary<string, object>
                    {
                        ["contentElementTypeKey"] = k
                    })
                    .ToList();

            existing.ConfigurationData =
                new Dictionary<string, object> { ["blocks"] = updatedBlocks };

            var updateResult =
                await dataTypeService.UpdateAsync(
                    existing,
                    Constants.Security.SuperUserKey);

            if (!updateResult.Success)
            {
                throw new InvalidOperationException(
                    $"Could not update block list data type '{name}': " +
                    updateResult.Status);
            }

            Console.WriteLine(
                $"UPDATED BLOCKLIST DATATYPE: {name} " +
                $"(+{missingKeys.Count} block type(s), {updatedBlocks.Count} total)");

            return updateResult.Result;
        }

        if (!propertyEditors.TryGet("Umbraco.BlockList", out var editor))
        {
            throw new InvalidOperationException(
                "Umbraco.BlockList editor is not registered.");
        }

        var blocks =
            desiredKeys
                .Select(k => new Dictionary<string, object>
                {
                    ["contentElementTypeKey"] = k
                })
                .ToList();

        var dataType =
            new DataType(editor, configurationEditorJsonSerializer)
            {
                Name = name,
                EditorUiAlias = "Umb.PropertyEditorUi.BlockList",
                ConfigurationData =
                    new Dictionary<string, object> { ["blocks"] = blocks }
            };

        var createResult =
            await dataTypeService.CreateAsync(
                dataType,
                Constants.Security.SuperUserKey);

        if (!createResult.Success)
        {
            throw new InvalidOperationException(
                $"Could not create block list data type '{name}': " +
                createResult.Status);
        }

        Console.WriteLine(
            $"CREATED BLOCKLIST DATATYPE: {name} " +
            $"({blocks.Count} block type(s))");

        return createResult.Result;
    }

    // ==========================================================
    // LEAF ELEMENT TYPES
    // ==========================================================
    // Ported from: HeroCarousel.tsx, BankWithAudacity.tsx,
    // MyWorldAccount.tsx, RewardsSection.tsx, BusinessAudacitySection.tsx,
    // Testimonials.tsx, Header.tsx (menu shapes), Footer.tsx (social links).

    Console.WriteLine();
    Console.WriteLine("--- leaf element types ---");

    var heroSlide =
        GetOrCreateType(
            "heroSlide", "Hero Slide", "icon-carousel", true, false,
            new PropSpec("image", "Image", media, true),
            new PropSpec("titleMain", "Title", txt),
            new PropSpec("titleHighlight", "Title Highlight", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("cta", "Button", link));

    var heroGridItem =
        GetOrCreateType(
            "heroGridItem", "Hero Grid Item", "icon-grid", true, false,
            new PropSpec("icon", "Icon", media),
            new PropSpec("label", "Label", txt),
            new PropSpec("link", "Link", link));

    var contentCard =
        GetOrCreateType(
            "contentCard", "Content Card", "icon-thumbnail-list", true, false,
            new PropSpec("title", "Title", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("cta", "Button", link));

    var featureItem =
        GetOrCreateType(
            "featureItem", "Feature Item", "icon-bulleted-list", true, false,
            new PropSpec("text", "Text", txt));

    var rewardsCard =
        GetOrCreateType(
            "rewardsCard", "Rewards Card", "icon-trophy", true, false,
            new PropSpec("image", "Image", media),
            new PropSpec("description", "Description", rte),
            new PropSpec("cta", "Button", link));

    var businessSlide =
        GetOrCreateType(
            "businessSlide", "Business Slide", "icon-website", true, false,
            new PropSpec("title", "Title", txt),
            new PropSpec("body", "Body", rte));

    var stackedCard =
        GetOrCreateType(
            "stackedCard", "Stacked Contact Card", "icon-newspaper", true, false,
            new PropSpec("title", "Title", txt),
            new PropSpec("subtitle", "Subtitle", txt));

    var testimonialVideo =
        GetOrCreateType(
            "testimonialVideo", "Testimonial Video", "icon-video", true, false,
            new PropSpec("videoId", "Video Id", txt),
            new PropSpec("thumbnail", "Thumbnail", media));

    var simpleLink =
        GetOrCreateType(
            "simpleLink", "Simple Link", "icon-link", true, false,
            new PropSpec("label", "Label", txt),
            new PropSpec("link", "Link", link));

    var megaMenuLink =
        GetOrCreateType(
            "megaMenuLink", "Mega Menu Link", "icon-link", true, false,
            new PropSpec("title", "Title", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("link", "Link", link),
            new PropSpec("pageSection", "Page Section Anchor", txt));

    var footerRichTextCategory =
        GetOrCreateType(
            "footerRichTextCategory", "Footer Rich Text Category", "icon-notepad", true, false,
            new PropSpec("categoryName", "Category Name", txt),
            new PropSpec("content", "Content", rte));

    var socialLink =
        GetOrCreateType(
            "socialLink", "Social Link", "icon-share-alt", true, false,
            new PropSpec("platform", "Platform", txt),
            new PropSpec("url", "Url", txt));

    // ==========================================================
    // MID-LEVEL ELEMENT TYPES (nest a Block List of the leaves above)
    // ==========================================================
    // Ported from: Header.tsx's mega menu (menuItem.menus / categoryName /
    // link.menuList) and Footer.tsx's link categories.

    Console.WriteLine();
    Console.WriteLine("--- mid-level element types ---");

    var megaMenuCategoryLinks =
        await GetOrCreateBlockListAsync(
            "React Migration - megaMenuCategory.links", megaMenuLink);

    var megaMenuCategory =
        GetOrCreateType(
            "megaMenuCategory", "Mega Menu Category", "icon-folder", true, false,
            new PropSpec("categoryName", "Category Name", txt),
            new PropSpec("links", "Links", megaMenuCategoryLinks));

    var footerLinkCategoryLinks =
        await GetOrCreateBlockListAsync(
            "React Migration - footerLinkCategory.links", simpleLink);

    var footerLinkCategory =
        GetOrCreateType(
            "footerLinkCategory", "Footer Link Category", "icon-folder", true, false,
            new PropSpec("categoryName", "Category Name", txt),
            new PropSpec("links", "Links", footerLinkCategoryLinks));

    var navMenuItemCategories =
        await GetOrCreateBlockListAsync(
            "React Migration - navMenuItem.megaMenuCategories", megaMenuCategory);

    var navMenuItem =
        GetOrCreateType(
            "navMenuItem", "Nav Menu Item", "icon-navigation", true, false,
            new PropSpec("title", "Title", txt),
            new PropSpec("link", "Link (when no mega menu)", link),
            new PropSpec("hasMegaMenu", "Has Mega Menu", boolType),
            new PropSpec("megaMenuCategories", "Mega Menu Categories", navMenuItemCategories));

    // ==========================================================
    // HOME PAGE SECTION BLOCKS
    // ==========================================================
    // Ported 1:1 from Home.tsx's ten <section> components, in the order
    // they're rendered there.

    Console.WriteLine();
    Console.WriteLine("--- home page section blocks ---");

    var heroSlides =
        await GetOrCreateBlockListAsync(
            "React Migration - heroCarouselBlock.slides", heroSlide);

    var heroGridItems =
        await GetOrCreateBlockListAsync(
            "React Migration - heroCarouselBlock.gridItems", heroGridItem);

    var heroCarouselBlock =
        GetOrCreateType(
            "heroCarouselBlock", "Hero Carousel", "icon-carousel", true, false,
            new PropSpec("slides", "Slides", heroSlides),
            new PropSpec("gridItems", "Product Grid Items", heroGridItems),
            new PropSpec("autoAdvanceSeconds", "Auto-Advance Seconds", num));

    // Full-bleed background-photo hero (react-ts-app's HeroBanner.tsx) - a
    // second, visually distinct hero style from heroBannerBlock's own
    // two-column layout (see PRODUCT LOAN PAGE SECTION BLOCKS below): a
    // dark overlay across a CMS-picked photo, e.g. the Personal Loan
    // "We give credit / where progress is due" hero. headingLead/
    // headingHighlight are two plain fields (thin line, then bold line)
    // rather than one string parsed by a heuristic - same reasoning as
    // myWorldAccountBlock's own heading/highlightWord split.
    var heroImageBannerBlock =
        GetOrCreateType(
            "heroImageBannerBlock", "Hero Image Banner", "icon-picture", true, false,
            new PropSpec("headingLead", "Heading (thin line)", txt),
            new PropSpec("headingHighlight", "Heading (bold line)", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("primaryCta", "Primary Button", link),
            new PropSpec("secondaryCta", "Secondary Button", link),
            new PropSpec("image", "Background Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt));

    // Two-column promo with two pill CTAs (a filled primary + an outlined
    // secondary) - e.g. the MyWORLD "Bank Account" promo
    // (react-ts-app's PromoSplit.tsx). imageOnRight mirrors
    // loanCalculatorBlock's own property of the same name/purpose.
    var promoSplitBlock =
        GetOrCreateType(
            "promoSplitBlock", "Promo Split", "icon-newspaper", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("primaryCta", "Primary Button", link),
            new PropSpec("secondaryCta", "Secondary Button", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("imageOnRight", "Image On Right", boolType));

    // Two-column feature list (bold-lead lines, not a checklist) beside a
    // photo - e.g. "Why Choose MyWORLD?" (react-ts-app's FeatureSplit.tsx).
    // Reuses contentCard for its feature items (title+description already
    // matches; each item's own cta is simply left unset here, same as
    // crossSellBlock/bankWithAudacityBlock reusing this same element type
    // for a different shape of block).
    var featureSplitFeatures =
        await GetOrCreateBlockListAsync(
            "React Migration - featureSplitBlock.features", contentCard);

    var featureSplitBlock =
        GetOrCreateType(
            "featureSplitBlock", "Feature Split", "icon-bulleted-list", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("features", "Features", featureSplitFeatures),
            new PropSpec("cta", "Button", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("imageOnRight", "Image On Right", boolType));

    // Two-column checkmarked feature list beside a photo, with its own
    // eyebrow subheading and CTA - e.g. "What is a Pocket Account"
    // (react-ts-app's FeatureChecklist.tsx). Reuses featureItem (same
    // plain-text shape myWorldAccountBlock's own checklist already uses).
    var featureChecklistFeatures =
        await GetOrCreateBlockListAsync(
            "React Migration - featureChecklistBlock.features", featureItem);

    var featureChecklistBlock =
        GetOrCreateType(
            "featureChecklistBlock", "Feature Checklist", "icon-checkbox", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("subheading", "Subheading (eyebrow)", txt),
            new PropSpec("features", "Features", featureChecklistFeatures),
            new PropSpec("cta", "Button", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("imageOnRight", "Image On Right", boolType));

    // faqSectionBlock/downloadsSectionBlock/crossSellBlock/
    // creditLifeInsuranceBlock are general-purpose (originally built for
    // Product Loan pages - see create-product-loan-schema below - but not
    // exclusive to them). Defined here too (idempotent, same alias/shape -
    // either command can run first) so they're also available on
    // homePage's own "sections" Block List, not just productLoanPage's.
    var faqItem =
        GetOrCreateType(
            "faqItem", "FAQ Item", "icon-help-alt", true, false,
            new PropSpec("question", "Question", txt),
            new PropSpec("answer", "Answer", rte));

    var faqItems =
        await GetOrCreateBlockListAsync(
            "React Migration - faqSectionBlock.items", faqItem);

    var faqSectionBlock =
        GetOrCreateType(
            "faqSectionBlock", "FAQ Section", "icon-help-alt", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("items", "Questions", faqItems));

    var downloadItem =
        GetOrCreateType(
            "downloadItem", "Download Item", "icon-download-alt", true, false,
            new PropSpec("description", "Description", txt),
            new PropSpec("file", "File", media));

    var downloadsSectionItems =
        await GetOrCreateBlockListAsync(
            "React Migration - downloadsSectionBlock.items", downloadItem);

    var downloadsSectionBlock =
        GetOrCreateType(
            "downloadsSectionBlock", "Downloads Section", "icon-download-alt", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("items", "Downloads", downloadsSectionItems));

    var crossSellCards =
        await GetOrCreateBlockListAsync(
            "React Migration - crossSellBlock.cards", contentCard);

    var crossSellBlock =
        GetOrCreateType(
            "crossSellBlock", "Cross-Sell", "icon-trolley", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("cards", "Cards", crossSellCards),
            new PropSpec("image", "Image", media));

    var creditLifeChecklistOne =
        await GetOrCreateBlockListAsync(
            "React Migration - creditLifeInsuranceBlock.checklistOne", featureItem);

    var creditLifeChecklistTwo =
        await GetOrCreateBlockListAsync(
            "React Migration - creditLifeInsuranceBlock.checklistTwo", featureItem);

    var creditLifeInsuranceBlock =
        GetOrCreateType(
            "creditLifeInsuranceBlock", "Credit Life Insurance", "icon-umbrella", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("paragraphOne", "Paragraph One", txtArea),
            new PropSpec("paragraphTwo", "Paragraph Two", txtArea),
            new PropSpec("checklistOne", "Checklist One", creditLifeChecklistOne),
            new PropSpec("checklistTwo", "Checklist Two", creditLifeChecklistTwo),
            new PropSpec("image", "Image", media));

    var bankWithAudacityCards =
        await GetOrCreateBlockListAsync(
            "React Migration - bankWithAudacityBlock.cards", contentCard);

    var bankWithAudacityBlock =
        GetOrCreateType(
            "bankWithAudacityBlock", "Bank With Audacity", "icon-thumbnail-list", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("cards", "Cards", bankWithAudacityCards));

    var loanCalculatorBlock =
        GetOrCreateType(
            "loanCalculatorBlock", "Loan Calculator", "icon-calculator", true, false,
            new PropSpec("minAmount", "Min Amount", num),
            new PropSpec("maxAmount", "Max Amount", num),
            new PropSpec("defaultAmount", "Default Amount", num),
            new PropSpec("minTerm", "Min Term (months)", num),
            new PropSpec("maxTerm", "Max Term (months)", num),
            new PropSpec("applyLink", "Apply Link", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("imageOnRight", "Image On Right", boolType));

    var myWorldFeatures =
        await GetOrCreateBlockListAsync(
            "React Migration - myWorldAccountBlock.features", featureItem);

    var myWorldAccountBlock =
        GetOrCreateType(
            "myWorldAccountBlock", "MyWorld Account", "icon-wallet", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("highlightWord", "Heading Highlight", txt),
            new PropSpec("subheading", "Subheading", txt),
            new PropSpec("features", "Features", myWorldFeatures),
            new PropSpec("cta", "Button", link));

    var debitCardShowcaseBlock =
        GetOrCreateType(
            "debitCardShowcaseBlock", "Debit Card Showcase", "icon-picture", true, false,
            new PropSpec("image", "Image", media),
            new PropSpec("alt", "Image Alt Text", txt));

    var rewardsCards =
        await GetOrCreateBlockListAsync(
            "React Migration - rewardsSectionBlock.cards", rewardsCard);

    var rewardsSectionBlock =
        GetOrCreateType(
            "rewardsSectionBlock", "Rewards Section", "icon-trophy", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("subheading", "Subheading", txt),
            new PropSpec("intro", "Intro", rte),
            new PropSpec("cards", "Cards", rewardsCards));

    var tap2GlassBlock =
        GetOrCreateType(
            "tap2GlassBlock", "Tap2Glass", "icon-mobile", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("downloadLink", "Download Link", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("description", "Description", txtArea));

    var businessSlides =
        await GetOrCreateBlockListAsync(
            "React Migration - businessAudacityBlock.slides", businessSlide);

    var businessContactCards =
        await GetOrCreateBlockListAsync(
            "React Migration - businessAudacityBlock.contactCards", stackedCard);

    var businessAudacityBlock =
        GetOrCreateType(
            "businessAudacityBlock", "Business Audacity", "icon-briefcase", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("slides", "Slides", businessSlides),
            new PropSpec("videoThumbnail", "Video Thumbnail", media),
            new PropSpec("contactCards", "Contact Cards", businessContactCards));

    var appDownloadBlock =
        GetOrCreateType(
            "appDownloadBlock", "App Download", "icon-android", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("subheading", "Subheading", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("downloadLink", "Download Link", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt));

    var testimonialVideos =
        await GetOrCreateBlockListAsync(
            "React Migration - testimonialsBlock.videos", testimonialVideo);

    var testimonialsBlock =
        GetOrCreateType(
            "testimonialsBlock", "Testimonials", "icon-quote", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("videos", "Videos", testimonialVideos));

    // ==========================================================
    // HOME PAGE
    // ==========================================================

    Console.WriteLine();
    Console.WriteLine("--- home page ---");

    var homePageSections =
        await GetOrCreateBlockListAsync(
            "React Migration - homePage.sections",
            heroCarouselBlock,
            heroImageBannerBlock,
            promoSplitBlock,
            featureSplitBlock,
            featureChecklistBlock,
            bankWithAudacityBlock,
            loanCalculatorBlock,
            myWorldAccountBlock,
            debitCardShowcaseBlock,
            rewardsSectionBlock,
            tap2GlassBlock,
            businessAudacityBlock,
            appDownloadBlock,
            testimonialsBlock,
            faqSectionBlock,
            downloadsSectionBlock,
            crossSellBlock,
            creditLifeInsuranceBlock);

    var homePage =
        GetOrCreateType(
            "homePage", "Home Page", "icon-home", false, true,
            new PropSpec("sections", "Page Sections", homePageSections));

    var homeTemplate =
        fileService.GetTemplate("Home") ??
        fileService.GetTemplate("home") ??
        fileService.GetTemplate("PageHome");

    if (homeTemplate != null)
    {
        homePage.AllowedTemplates = new[] { homeTemplate };
        homePage.SetDefaultTemplate(homeTemplate);
        contentTypeService.Save(homePage);

        Console.WriteLine($"LINKED TEMPLATE: homePage -> {homeTemplate.Alias}");
    }
    else
    {
        Console.WriteLine(
            "NOTE: no Home/PageHome template found - assign one to " +
            "homePage manually in the backoffice.");
    }

    // ==========================================================
    // HEADER SETTINGS
    // ==========================================================
    // Ported from Header.tsx. The Personal mega menu (currently hardcoded
    // in src/routes/personalMenuPages.ts) is folded into topNavigation /
    // megaMenuCategory here so it becomes editable like every other top-nav
    // item instead of staying a special case. The Register/Login modal
    // (NavModal.tsx) is intentionally not modelled - no CMS field ever
    // backed it.

    Console.WriteLine();
    Console.WriteLine("--- header settings ---");

    var headerTopNavigation =
        await GetOrCreateBlockListAsync(
            "React Migration - headerSettings.topNavigation", navMenuItem);

    var headerUtilityLinks =
        await GetOrCreateBlockListAsync(
            "React Migration - headerSettings.utilityLinks", simpleLink);

    GetOrCreateType(
        "headerSettings", "Header Settings", "icon-navigation", false, true,
        new PropSpec("topNavigation", "Top Navigation", headerTopNavigation),
        new PropSpec("utilityLinks", "Utility Links", headerUtilityLinks),
        new PropSpec("searchPlaceholder", "Search Placeholder", txt),
        new PropSpec("onlineUploadUrl", "Online Upload Fallback Url", txt));

    // ==========================================================
    // FOOTER SETTINGS
    // ==========================================================
    // Ported from Footer.tsx.

    Console.WriteLine();
    Console.WriteLine("--- footer settings ---");

    var footerLinkCategories =
        await GetOrCreateBlockListAsync(
            "React Migration - footerSettings.linkCategories", footerLinkCategory);

    var footerRichTextCategories =
        await GetOrCreateBlockListAsync(
            "React Migration - footerSettings.richTextCategories", footerRichTextCategory);

    var footerSocialLinks =
        await GetOrCreateBlockListAsync(
            "React Migration - footerSettings.socialLinks", socialLink);

    GetOrCreateType(
        "footerSettings", "Footer Settings", "icon-align-left", false, true,
        new PropSpec("linkCategories", "Link Categories", footerLinkCategories),
        new PropSpec("richTextCategories", "Rich Text Categories", footerRichTextCategories),
        new PropSpec("disclaimer", "Disclaimer", rte),
        new PropSpec("socialLinks", "Social Links", footerSocialLinks));

    // ==========================================================
    // RESULT
    // ==========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("HOME PAGE SCHEMA CREATED");
    Console.WriteLine("=================================================");
    Console.WriteLine();
    Console.WriteLine(
        "Document types are created empty - no content values were seeded " +
        "from the React DEFAULT_* arrays. Create a Home Page content node " +
        "(and one Header Settings / Footer Settings node) in the backoffice " +
        "and populate them by hand, or ask for a follow-up 'seed-home-content' " +
        "command to do it from the TSX defaults automatically.");

    return;
}

// ============================================================
// CREATE-PRODUCT-LOAN-SCHEMA COMMAND
// ============================================================
//
// Builds the Document Types / Element Types for the React "Product Loan"
// page - react-ts-app/src/pages/PersonalLoanPage/PersonalLoanPage.tsx,
// the component actually rendered at /en/home/product-personal-loan/ today
// (a fully static page - it does not call fetchProductLoanPage or
// fetchPersonalLoanCampaign in contentApi.ts; both of those describe two
// separate RETIRED Razor templates for the same underlying pageLoans
// content type and are wired to no component). Authored directly from that
// component's JSX, same approach as create-home-schema above.
//
// Same shape as homePage: one "productLoanPage" document type with a
// single Block List property ("sections") accepting any of the section
// block Element Types below, in editor-defined order.
//
// FAQ items (faqItem/faqSectionBlock) are deliberately modelled as
// standalone, general-purpose Element Types, not scoped to this page -
// FAQs show up across many pages on this site (see Views/
// FrequentlyAskedQuestionsSection.cshtml, frequentlyAskedQuestions*.cshtml,
// businessBankingFaq.cshtml, ...), so the same faqSectionBlock can be added
// to any other page's own "sections" Block List later (homePage included)
// without redefining it - that's what makes it a shared/global Document
// Type rather than a page-local one.
//
// Reuses contentCard, featureItem and loanCalculatorBlock from
// create-home-schema where the shape matches exactly (GetOrCreateType is
// idempotent - if create-home-schema already created them, this finds and
// reuses the same Element Type; if this command runs first instead, it
// creates them itself and create-home-schema will reuse them later). Each
// command still gets its own dedicated Block List Data Type per property,
// since a Block List's allowed-blocks config is specific to one property
// even when the Element Types it lists are shared.
//
// Idempotent: re-running finds already-created types by alias/name and
// skips them, so interrupting/re-running this is safe.

if (args.Length > 0 &&
    args[0].Equals("create-product-loan-schema", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" CREATE PRODUCT LOAN PAGE DOCUMENT TYPE STRUCTURE");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var dataTypeService =
        app.Services.GetRequiredService<IDataTypeService>();

    var propertyEditors =
        app.Services.GetRequiredService<PropertyEditorCollection>();

    var configurationEditorJsonSerializer =
        app.Services.GetRequiredService<IConfigurationEditorJsonSerializer>();

    var shortStringHelper =
        app.Services.GetRequiredService<IShortStringHelper>();

    var contentTypeContainerService =
        app.Services.GetRequiredService<IContentTypeContainerService>();

    // --------------------------------------------------------
    // FOLDER
    // --------------------------------------------------------

    var existingFolders =
        (await contentTypeContainerService.GetAllAsync()).ToList();

    var productLoanFolder =
        existingFolders.FirstOrDefault(x =>
            x.Name != null &&
            x.Name.Equals("React Product Loan Page", StringComparison.OrdinalIgnoreCase) &&
            x.ParentId == -1);

    if (productLoanFolder == null)
    {
        var folderResult =
            await contentTypeContainerService.CreateAsync(
                null,
                "React Product Loan Page",
                null,
                Constants.Security.SuperUserKey);

        if (!folderResult.Success || folderResult.Result == null)
        {
            Console.WriteLine(
                $"FAILED FOLDER: React Product Loan Page - {folderResult.Status}");

            return;
        }

        productLoanFolder = folderResult.Result;

        Console.WriteLine("CREATED FOLDER: React Product Loan Page");
    }
    else
    {
        Console.WriteLine("EXISTS FOLDER: React Product Loan Page");
    }

    var folderId = productLoanFolder.Id;

    // --------------------------------------------------------
    // SHARED SCALAR DATA TYPES (same pattern as create-home-schema - see
    // its own comment. A fresh cache/lookup here still finds and reuses
    // the exact same Data Types that command created, since both look
    // them up by editor alias against the same Umbraco instance.)
    // --------------------------------------------------------

    var sharedDataTypeCache =
        new Dictionary<string, IDataType>(StringComparer.OrdinalIgnoreCase);

    async Task<IDataType> GetOrCreateSharedDataTypeAsync(
        string editorAlias,
        string editorUiAlias,
        string name)
    {
        if (sharedDataTypeCache.TryGetValue(editorAlias, out var cached))
        {
            return cached;
        }

        var existing =
            (await dataTypeService.GetAllAsync())
                .FirstOrDefault(d =>
                    d.EditorAlias.Equals(
                        editorAlias,
                        StringComparison.OrdinalIgnoreCase));

        if (existing != null)
        {
            sharedDataTypeCache[editorAlias] = existing;

            Console.WriteLine($"EXISTS DATATYPE: {existing.Name}");

            return existing;
        }

        if (!propertyEditors.TryGet(editorAlias, out var editor))
        {
            throw new InvalidOperationException(
                $"Property editor '{editorAlias}' is not registered.");
        }

        var dataType =
            new DataType(editor, configurationEditorJsonSerializer)
            {
                Name = name,
                EditorUiAlias = editorUiAlias
            };

        var createResult =
            await dataTypeService.CreateAsync(
                dataType,
                Constants.Security.SuperUserKey);

        if (!createResult.Success)
        {
            throw new InvalidOperationException(
                $"Could not create data type '{name}': {createResult.Status}");
        }

        sharedDataTypeCache[editorAlias] = createResult.Result;

        Console.WriteLine($"CREATED DATATYPE: {name}");

        return createResult.Result;
    }

    var txt =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextBox", "Umb.PropertyEditorUi.TextBox", "React Migration - Textstring");

    var txtArea =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextArea", "Umb.PropertyEditorUi.TextArea", "React Migration - Textarea");

    var rte =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.RichText", "Umb.PropertyEditorUi.Tiptap", "React Migration - Richtext");

    var media =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.MediaPicker3", "Umb.PropertyEditorUi.MediaPicker", "React Migration - Media Picker");

    var link =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.MultiUrlPicker", "Umb.PropertyEditorUi.MultiUrlPicker", "React Migration - Link Picker");

    var num =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.Integer", "Umb.PropertyEditorUi.Integer", "React Migration - Number");

    var boolType =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TrueFalse", "Umb.PropertyEditorUi.Toggle", "React Migration - Toggle");

    // --------------------------------------------------------
    // ELEMENT TYPE / DOCUMENT TYPE + BLOCK LIST HELPERS
    // (identical to create-home-schema's own - see its comments)
    // --------------------------------------------------------

    void EnsureContentTab(IContentType type)
    {
        if (type.PropertyGroups.Any(g =>
                g.Alias.Equals("content", StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        type.AddPropertyGroup("content", "Content");

        var tab =
            type.PropertyGroups.FirstOrDefault(g =>
                g.Alias.Equals("content", StringComparison.OrdinalIgnoreCase));

        if (tab != null)
        {
            tab.Type = PropertyGroupType.Tab;
        }
    }

    IContentType GetOrCreateType(
        string alias,
        string name,
        string icon,
        bool isElement,
        bool allowedAsRoot,
        params PropSpec[] props)
    {
        var existing = contentTypeService.Get(alias);

        if (existing != null)
        {
            var changed = false;

            if (!existing.PropertyGroups.Any(g =>
                    g.Alias.Equals("content", StringComparison.OrdinalIgnoreCase) &&
                    g.Type == PropertyGroupType.Tab))
            {
                EnsureContentTab(existing);
                changed = true;
            }

            foreach (var prop in props)
            {
                if (existing.PropertyTypes.Any(p =>
                        p.Alias.Equals(prop.Alias, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                var propertyType =
                    new PropertyType(shortStringHelper, prop.Type, prop.Alias)
                    {
                        Name = prop.Name,
                        Mandatory = prop.Mandatory
                    };

                existing.AddPropertyType(propertyType, "content");
                changed = true;

                Console.WriteLine($"  + ADDED PROPERTY: {alias}.{prop.Alias}");
            }

            if (changed)
            {
                contentTypeService.Save(existing);
            }

            Console.WriteLine($"EXISTS TYPE: {alias}");

            return existing;
        }

        var contentType =
            new ContentType(shortStringHelper, folderId)
            {
                Alias = alias,
                Name = name,
                Icon = icon,
                IsElement = isElement,
                AllowedAsRoot = allowedAsRoot
            };

        EnsureContentTab(contentType);

        foreach (var prop in props)
        {
            var propertyType =
                new PropertyType(shortStringHelper, prop.Type, prop.Alias)
                {
                    Name = prop.Name,
                    Mandatory = prop.Mandatory
                };

            contentType.AddPropertyType(propertyType, "content");
        }

        contentTypeService.Save(contentType);

        Console.WriteLine($"CREATED TYPE: {alias}");

        return contentType;
    }

    async Task<IDataType> GetOrCreateBlockListAsync(
        string name,
        params IContentType[] allowedElementTypes)
    {
        var desiredKeys =
            allowedElementTypes.Select(t => t.Key.ToString()).ToList();

        var existing =
            (await dataTypeService.GetAllAsync())
                .FirstOrDefault(d =>
                    d.Name != null &&
                    d.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (existing != null)
        {
            // Self-healing: a Data Type this same name was already created
            // for may be missing block types a later code change added to
            // the call (e.g. appDownloadBlock added to productLoanPage's
            // allowed sections after the first run already created this
            // Data Type) - GetOrCreateType already does the equivalent for
            // properties on a content type; this is that same idea for a
            // Block List's own allowed-blocks config.
            var existingBlocks =
                existing.ConfigurationData.TryGetValue("blocks", out var rawBlocks)
                    ? rawBlocks
                    : null;

            var existingKeys =
                (existingBlocks as IEnumerable<object>)?
                    .OfType<IDictionary<string, object>>()
                    .Select(b =>
                        b.TryGetValue("contentElementTypeKey", out var k)
                            ? k?.ToString()
                            : null)
                    .Where(k => k != null)
                    .Cast<string>()
                    .ToHashSet(StringComparer.OrdinalIgnoreCase)
                ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var missingKeys =
                desiredKeys.Where(k => !existingKeys.Contains(k)).ToList();

            if (missingKeys.Count == 0)
            {
                Console.WriteLine($"EXISTS BLOCKLIST DATATYPE: {name}");

                return existing;
            }

            var updatedBlocks =
                desiredKeys
                    .Select(k => new Dictionary<string, object>
                    {
                        ["contentElementTypeKey"] = k
                    })
                    .ToList();

            existing.ConfigurationData =
                new Dictionary<string, object> { ["blocks"] = updatedBlocks };

            var updateResult =
                await dataTypeService.UpdateAsync(
                    existing,
                    Constants.Security.SuperUserKey);

            if (!updateResult.Success)
            {
                throw new InvalidOperationException(
                    $"Could not update block list data type '{name}': " +
                    updateResult.Status);
            }

            Console.WriteLine(
                $"UPDATED BLOCKLIST DATATYPE: {name} " +
                $"(+{missingKeys.Count} block type(s), {updatedBlocks.Count} total)");

            return updateResult.Result;
        }

        if (!propertyEditors.TryGet("Umbraco.BlockList", out var editor))
        {
            throw new InvalidOperationException(
                "Umbraco.BlockList editor is not registered.");
        }

        var blocks =
            desiredKeys
                .Select(k => new Dictionary<string, object>
                {
                    ["contentElementTypeKey"] = k
                })
                .ToList();

        var dataType =
            new DataType(editor, configurationEditorJsonSerializer)
            {
                Name = name,
                EditorUiAlias = "Umb.PropertyEditorUi.BlockList",
                ConfigurationData =
                    new Dictionary<string, object> { ["blocks"] = blocks }
            };

        var createResult =
            await dataTypeService.CreateAsync(
                dataType,
                Constants.Security.SuperUserKey);

        if (!createResult.Success)
        {
            throw new InvalidOperationException(
                $"Could not create block list data type '{name}': " +
                createResult.Status);
        }

        Console.WriteLine(
            $"CREATED BLOCKLIST DATATYPE: {name} " +
            $"({blocks.Count} block type(s))");

        return createResult.Result;
    }

    // ==========================================================
    // GLOBAL / SHARED ELEMENT TYPES
    // ==========================================================
    // Not scoped to the product loan page. contentCard, featureItem,
    // faqItem/faqSectionBlock, downloadItem/downloadsSectionBlock,
    // crossSellBlock and creditLifeInsuranceBlock are all reused as-is from
    // create-home-schema (same alias, same shape, idempotent - either
    // command can run first) rather than redefined here - homePage's own
    // "sections" Block List already includes all of them too, so none of
    // these blocks are exclusive to Product Loan pages.

    Console.WriteLine();
    Console.WriteLine("--- global/shared element types ---");

    var contentCard =
        GetOrCreateType(
            "contentCard", "Content Card", "icon-thumbnail-list", true, false,
            new PropSpec("title", "Title", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("cta", "Button", link));

    var featureItem =
        GetOrCreateType(
            "featureItem", "Feature Item", "icon-bulleted-list", true, false,
            new PropSpec("text", "Text", txt));

    var faqItem =
        GetOrCreateType(
            "faqItem", "FAQ Item", "icon-help-alt", true, false,
            new PropSpec("question", "Question", txt),
            new PropSpec("answer", "Answer", rte));

    var faqItems =
        await GetOrCreateBlockListAsync(
            "React Migration - faqSectionBlock.items", faqItem);

    var faqSectionBlock =
        GetOrCreateType(
            "faqSectionBlock", "FAQ Section", "icon-help-alt", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("items", "Questions", faqItems));

    var downloadItem =
        GetOrCreateType(
            "downloadItem", "Download Item", "icon-download-alt", true, false,
            new PropSpec("description", "Description", txt),
            new PropSpec("file", "File", media));

    // --------------------------------------------------------
    // loanCalculatorBlock - reused verbatim from create-home-schema. If
    // that command hasn't run yet on this database, this creates it fresh
    // with the exact same shape, so either command can run first.
    // --------------------------------------------------------

    var loanCalculatorBlock =
        GetOrCreateType(
            "loanCalculatorBlock", "Loan Calculator", "icon-calculator", true, false,
            new PropSpec("minAmount", "Min Amount", num),
            new PropSpec("maxAmount", "Max Amount", num),
            new PropSpec("defaultAmount", "Default Amount", num),
            new PropSpec("minTerm", "Min Term (months)", num),
            new PropSpec("maxTerm", "Max Term (months)", num),
            new PropSpec("applyLink", "Apply Link", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("imageOnRight", "Image On Right", boolType));

    // ==========================================================
    // PRODUCT LOAN PAGE SECTION BLOCKS
    // ==========================================================
    // Ported 1:1 from PersonalLoanPage.tsx's own sections, in the order
    // they're rendered there: hero banner, loan calculator, credit life
    // insurance, FAQ accordion, downloads list, cross-sell.

    Console.WriteLine();
    Console.WriteLine("--- product loan page section blocks ---");

    var heroBannerBlock =
        GetOrCreateType(
            "heroBannerBlock", "Hero Banner", "icon-banner", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("primaryCta", "Primary Button", link),
            new PropSpec("secondaryCta", "Secondary Button", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt));

    // Reused verbatim from create-home-schema (same alias/shape) - a
    // genuinely global block, not just a home page one. If that command
    // hasn't run yet on this database, this creates it fresh.
    var heroImageBannerBlock =
        GetOrCreateType(
            "heroImageBannerBlock", "Hero Image Banner", "icon-picture", true, false,
            new PropSpec("headingLead", "Heading (thin line)", txt),
            new PropSpec("headingHighlight", "Heading (bold line)", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("primaryCta", "Primary Button", link),
            new PropSpec("secondaryCta", "Secondary Button", link),
            new PropSpec("image", "Background Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt));

    // Reused verbatim from create-home-schema (same alias/shape) - see that
    // command's own comments for what each renders as in react-ts-app.
    var promoSplitBlock =
        GetOrCreateType(
            "promoSplitBlock", "Promo Split", "icon-newspaper", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("primaryCta", "Primary Button", link),
            new PropSpec("secondaryCta", "Secondary Button", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("imageOnRight", "Image On Right", boolType));

    var featureSplitFeatures =
        await GetOrCreateBlockListAsync(
            "React Migration - featureSplitBlock.features", contentCard);

    var featureSplitBlock =
        GetOrCreateType(
            "featureSplitBlock", "Feature Split", "icon-bulleted-list", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("features", "Features", featureSplitFeatures),
            new PropSpec("cta", "Button", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("imageOnRight", "Image On Right", boolType));

    var featureChecklistFeatures =
        await GetOrCreateBlockListAsync(
            "React Migration - featureChecklistBlock.features", featureItem);

    var featureChecklistBlock =
        GetOrCreateType(
            "featureChecklistBlock", "Feature Checklist", "icon-checkbox", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("subheading", "Subheading (eyebrow)", txt),
            new PropSpec("features", "Features", featureChecklistFeatures),
            new PropSpec("cta", "Button", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("imageOnRight", "Image On Right", boolType));

    var creditLifeChecklistOne =
        await GetOrCreateBlockListAsync(
            "React Migration - creditLifeInsuranceBlock.checklistOne", featureItem);

    var creditLifeChecklistTwo =
        await GetOrCreateBlockListAsync(
            "React Migration - creditLifeInsuranceBlock.checklistTwo", featureItem);

    var creditLifeInsuranceBlock =
        GetOrCreateType(
            "creditLifeInsuranceBlock", "Credit Life Insurance", "icon-umbrella", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("paragraphOne", "Paragraph One", txtArea),
            new PropSpec("paragraphTwo", "Paragraph Two", txtArea),
            new PropSpec("checklistOne", "Checklist One", creditLifeChecklistOne),
            new PropSpec("checklistTwo", "Checklist Two", creditLifeChecklistTwo),
            new PropSpec("image", "Image", media));

    var downloadsSectionItems =
        await GetOrCreateBlockListAsync(
            "React Migration - downloadsSectionBlock.items", downloadItem);

    var downloadsSectionBlock =
        GetOrCreateType(
            "downloadsSectionBlock", "Downloads Section", "icon-download-alt", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("items", "Downloads", downloadsSectionItems));

    var crossSellCards =
        await GetOrCreateBlockListAsync(
            "React Migration - crossSellBlock.cards", contentCard);

    var crossSellBlock =
        GetOrCreateType(
            "crossSellBlock", "Cross-Sell", "icon-trolley", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("cards", "Cards", crossSellCards),
            new PropSpec("image", "Image", media));

    // Reused verbatim from create-home-schema (same alias/shape) - a
    // genuinely global block, not just a "product loan page" one. If that
    // command hasn't run yet on this database, this creates it fresh.
    var appDownloadBlock =
        GetOrCreateType(
            "appDownloadBlock", "App Download", "icon-android", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("subheading", "Subheading", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("downloadLink", "Download Link", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt));

    // ==========================================================
    // PRODUCT LOAN PAGE
    // ==========================================================

    Console.WriteLine();
    Console.WriteLine("--- product loan page ---");

    var productLoanPageSections =
        await GetOrCreateBlockListAsync(
            "React Migration - productLoanPage.sections",
            heroBannerBlock,
            heroImageBannerBlock,
            promoSplitBlock,
            featureSplitBlock,
            featureChecklistBlock,
            loanCalculatorBlock,
            creditLifeInsuranceBlock,
            faqSectionBlock,
            downloadsSectionBlock,
            crossSellBlock,
            appDownloadBlock);

    GetOrCreateType(
        "productLoanPage", "Product Loan Page", "icon-coin-dollar", false, true,
        new PropSpec("sections", "Page Sections", productLoanPageSections));

    // ==========================================================
    // RESULT
    // ==========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("PRODUCT LOAN PAGE SCHEMA CREATED");
    Console.WriteLine("=================================================");
    Console.WriteLine();
    Console.WriteLine(
        "Document types are created empty - no content values were seeded " +
        "from PersonalLoanPage.tsx. faqItem/faqSectionBlock are general-" +
        "purpose - add faqSectionBlock to any other page's own sections " +
        "Block List (e.g. homePage) the same way it's used here, no need " +
        "to redefine it. Create a Product Loan Page content node in the " +
        "backoffice and populate it by hand.");

    return;
}

// ============================================================
// CREATE-CONSOLIDATION-LOAN-CONTENT COMMAND
// ============================================================
//
// Worked example of "create content, not code": builds one real
// productLoanPage content node - no new document type, no new React file,
// no new route - proving DynamicPage renders it purely from what's in the
// database. Requires create-product-loan-schema to have already run
// (specifically for heroBannerBlock's now-added image/imageAlt fields and
// appDownloadBlock's addition to productLoanPage's allowed sections - both
// added in the same change as this command; re-run create-product-loan-
// schema first if this errors on either missing type).
//
// Builds two sections by hand as native Block List JSON (JsonObject/
// JsonArray, same System.Text.Json.Nodes approach as fix-menu-blocklist
// above): a hero banner ("Combine up to 5 loans in 1") and an app download
// block ("Get the app now"), with real copy and real external-link
// buttons. heroBannerBlock.image/appDownloadBlock.image are left null -
// there's no real photo/mockup image file available to attach here; add
// those two via the backoffice's Media Picker once you have them.
//
// Placed as a sibling of the existing Personal Loan node (matched by name,
// productLoanPage or legacy pageLoans) so it lands under the real
// /en/home/ parent without hardcoding a parent node id, which differs per
// install. Named "Dynamic Page Demo - Consolidation Loan" rather than
// "Product Consolidation Loan" - that name's own route
// (/en/home/product-consolidation-loan/) is already live, owned by an
// existing legacy pageLoans node with its own real SEO content (confirmed
// via a live Delivery API response) - two published nodes can't share a
// route, so the legacy one always wins it regardless of where this
// command's own node sits. Ends up at /en/home/dynamic-page-demo-
// consolidation-loan/ instead, a route nothing else could plausibly
// already own. Idempotent: finds an existing node under either name (self-
// healing a rename from an earlier run that used the colliding name) and
// updates it in place rather than duplicating it.

if (args.Length > 0 &&
    args[0].Equals("create-consolidation-loan-content", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" CREATE CONSOLIDATION LOAN CONTENT");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var productLoanPageType = contentTypeService.Get("productLoanPage");

    if (productLoanPageType == null)
    {
        Console.WriteLine(
            "ERROR: no 'productLoanPage' content type exists - run " +
            "'create-product-loan-schema' first.");

        return;
    }

    var heroBannerBlockType = contentTypeService.Get("heroBannerBlock");
    var appDownloadBlockType = contentTypeService.Get("appDownloadBlock");

    if (heroBannerBlockType == null || appDownloadBlockType == null)
    {
        Console.WriteLine(
            "ERROR: 'heroBannerBlock' or 'appDownloadBlock' content type " +
            "is missing - run 'create-product-loan-schema' again (it now " +
            "also creates/updates both).");

        return;
    }

    JsonArray BuildExternalLink(string label, string url) =>
        new JsonArray(
            new JsonObject
            {
                ["name"] = label,
                ["target"] = null,
                ["udi"] = null,
                ["url"] = url,
                ["queryString"] = null
            });

    var heroUdi = $"umb://element/{Guid.NewGuid():N}";
    var appDownloadUdi = $"umb://element/{Guid.NewGuid():N}";

    var heroContentData =
        new JsonObject
        {
            ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
            ["udi"] = heroUdi,
            ["heading"] = "Combine up to 5 loans in 1",
            ["description"] =
                "Things work better when we work together. Make the most of " +
                "your budget when you combine your loans today. Mix 'n match " +
                "up to 5 loans into 1 easy-to-manage Consolidation Loan to " +
                "the value of R500 000 and save cash with a lower repayment. " +
                "Earn 1.3% of your loan instalments back in Audacious " +
                "Rewards points",
            ["primaryCta"] =
                BuildExternalLink(
                        "APPLY NOW",
                        "https://www.africanbank.co.za/en/home/get-a-quote?" +
                        "utm_source=Website&utm_medium=Productpage&utm_campaign=WebLead")
                    .ToJsonString(),
            ["secondaryCta"] = null,
            ["image"] = null,
            ["imageAlt"] = null
        };

    var appDownloadContentData =
        new JsonObject
        {
            ["contentTypeKey"] = appDownloadBlockType.Key.ToString(),
            ["udi"] = appDownloadUdi,
            ["heading"] = "Get the app now",
            ["subheading"] = "",
            ["description"] =
                "Take your banking experience to the next level with our mobile app.",
            ["downloadLink"] =
                BuildExternalLink(
                        "DOWNLOAD NOW",
                        "https://play.google.com/store/apps/details?id=za.co.android.africanbank")
                    .ToJsonString(),
            ["image"] = null,
            ["imageAlt"] = null
        };

    var sectionsValue =
        new JsonObject
        {
            ["layout"] =
                new JsonObject
                {
                    ["Umbraco.BlockList"] =
                        new JsonArray(
                            new JsonObject { ["contentUdi"] = heroUdi },
                            new JsonObject { ["contentUdi"] = appDownloadUdi })
                },
            ["contentData"] = new JsonArray(heroContentData, appDownloadContentData)
        };

    var existingProductLoanPages =
        contentService.GetPagedOfType(
            productLoanPageType.Id,
            0,
            50,
            out _,
            null!)
            .ToList();

    var parentId = -1;
    var parentDescription = "root";

    var personalLoanNode =
        existingProductLoanPages.FirstOrDefault(n =>
            n.Name != null &&
            n.Name.Contains("Personal Loan", StringComparison.OrdinalIgnoreCase));

    if (personalLoanNode != null)
    {
        parentId = personalLoanNode.ParentId;
        parentDescription = $"same parent as \"{personalLoanNode.Name}\" (id={parentId})";
    }
    else
    {
        // No productLoanPage-typed sibling exists yet (confirmed live: the
        // real /en/home/product-personal-loan/ node today is still the old
        // legacy "pageLoans" type, not productLoanPage - deliberately left
        // untouched rather than migrated as part of this command). Fall
        // back to that legacy type's own "Personal Loan" node instead, so
        // this still lands under the real /en/home/ parent rather than at
        // root.
        var legacyPageLoansType = contentTypeService.Get("pageLoans");

        var legacyPersonalLoanNode =
            legacyPageLoansType == null
                ? null
                : contentService
                    .GetPagedOfType(legacyPageLoansType.Id, 0, 200, out _, null!)
                    .FirstOrDefault(n =>
                        n.Name != null &&
                        n.Name.Contains("Personal Loan", StringComparison.OrdinalIgnoreCase));

        if (legacyPersonalLoanNode != null)
        {
            parentId = legacyPersonalLoanNode.ParentId;
            parentDescription =
                $"same parent as the legacy \"{legacyPersonalLoanNode.Name}\" " +
                $"(pageLoans, id={parentId})";
        }
        else
        {
            Console.WriteLine(
                "NOTE: no existing Personal Loan node (productLoanPage or " +
                "legacy pageLoans) found to match its parent/URL structure - " +
                "creating at root instead. You may need to move this node in " +
                "the content tree afterward so its route matches " +
                "/en/home/dynamic-page-demo/.");
        }
    }

    // NOT "Product Consolidation Loan" / product-consolidation-loan - that
    // URL is already live, owned by an existing legacy "pageLoans" node
    // with its own real SEO content (confirmed via a live Delivery API
    // response), same as Personal Loan. Two published nodes can't share a
    // route - the legacy node always wins it regardless of where this
    // command's own node sits - so this demo intentionally uses a route
    // nothing else could plausibly already own instead of fighting a real
    // page for its URL.
    const string oldNodeName = "Product Consolidation Loan";
    const string nodeName = "Dynamic Page Demo - Consolidation Loan";

    var existingNode =
        existingProductLoanPages.FirstOrDefault(n =>
            n.Name != null &&
            n.Name.Equals(oldNodeName, StringComparison.OrdinalIgnoreCase)) ??
        existingProductLoanPages.FirstOrDefault(n =>
            n.Name != null &&
            n.Name.Equals(nodeName, StringComparison.OrdinalIgnoreCase));

    IContent node;

    if (existingNode != null)
    {
        node = existingNode;

        if (node.Name != nodeName)
        {
            Console.WriteLine(
                $"RENAMED: \"{node.Name}\" (id={node.Id}) -> \"{nodeName}\" - its old " +
                "name/route collided with an existing live legacy page.");

            node.Name = nodeName;
        }
        else
        {
            Console.WriteLine($"EXISTS: \"{nodeName}\" (id={node.Id}) - updating its sections.");
        }

        if (node.ParentId != parentId)
        {
            contentService.Move(node, parentId);

            Console.WriteLine($"MOVED: \"{nodeName}\" to {parentDescription}");
        }
    }
    else
    {
        node = contentService.Create(nodeName, parentId, "productLoanPage");

        Console.WriteLine($"CREATED: \"{nodeName}\" under {parentDescription}");
    }

    node.SetValue("sections", sectionsValue.ToJsonString());

    var saveResult = contentService.Save(node);

    if (!saveResult.Success)
    {
        Console.WriteLine($"FAILED SAVE: {node.Name} (id={node.Id})");

        return;
    }

    var publishResult = contentService.Publish(node, new[] { "*" });

    if (!publishResult.Success)
    {
        Console.WriteLine($"SAVED BUT FAILED PUBLISH: {node.Name} (id={node.Id})");

        return;
    }

    Console.WriteLine();
    Console.WriteLine($"DONE. Published \"{nodeName}\" (id={node.Id}).");
    Console.WriteLine("View it at /en/home/dynamic-page-demo-consolidation-loan/");
    Console.WriteLine(
        "No images were set (heroBannerBlock.image / appDownloadBlock.image) " +
        "- add those in the backoffice's Media Picker once you have the real " +
        "photos. Everything else (heading/description/buttons) is real content.");

    return;
}

// ============================================================
// MIGRATE-PRODUCT-LOAN-PAGES COMMAND
// ============================================================
//
// Migrates the two real, live legacy "pageLoans" pages
// (/en/home/product-personal-loan/, /en/home/product-consolidation-loan/)
// onto the new productLoanPage system - explicitly requested and confirmed
// before running, since it changes live, SEO-indexed URLs.
//
// For each page: renames the existing legacy pageLoans node (appending
// " (Legacy)"), which frees up its URL, since two published nodes can't
// share a route - its content/SEO metadata stays intact, just at a new
// URL. Then creates (or reuses/renames an already-existing) productLoanPage
// node as a sibling of the renamed legacy node, so it inherits the exact
// same /en/home/ URL structure the legacy page had.
//
// Personal Loan's content is real, ported from PersonalLoanPage.tsx before
// it was deleted (its own hero/credit-life-insurance/cross-sell copy) -
// hero banner, loan calculator, credit life insurance (with real nested
// featureItem checklists), and cross-sell (with real nested contentCard
// links) sections. Deliberately does NOT include a FAQ or downloads
// section here - faqSectionBlock's items need Rich Text values and
// downloadsSectionBlock's items need a real Media file, and this command
// can't safely guess the exact raw JSON envelope Umbraco's Rich Text
// (Tiptap) editor expects for a value written outside the backoffice UI -
// getting that wrong risks the same class of "Expected start object" crash
// already hit once this session. Add those two sections by hand in the
// backoffice instead, where the Rich Text/Media Picker UI always writes
// correct values.
//
// Consolidation Loan reuses the exact content already seeded by
// create-consolidation-loan-content (hero banner + app download) - that
// command's own node is found and renamed/moved here rather than
// duplicated, so run it first if it hasn't been run yet on this database.
//
// Nested Block List values (checklistOne/checklistTwo/cards) are built the
// same proven way as fix-menu-blocklist's own conversions above - a
// generic BuildBlockList helper, since this command needs several
// different nested lists rather than just one shape.

if (args.Length > 0 &&
    args[0].Equals("migrate-product-loan-pages", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" MIGRATE PRODUCT LOAN PAGES");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var productLoanPageType = contentTypeService.Get("productLoanPage");
    var pageLoansType = contentTypeService.Get("pageLoans");
    var heroImageBannerBlockType = contentTypeService.Get("heroImageBannerBlock");
    var loanCalculatorBlockType = contentTypeService.Get("loanCalculatorBlock");
    var creditLifeInsuranceBlockType = contentTypeService.Get("creditLifeInsuranceBlock");
    var featureItemType = contentTypeService.Get("featureItem");
    var crossSellBlockType = contentTypeService.Get("crossSellBlock");
    var contentCardType = contentTypeService.Get("contentCard");

    if (productLoanPageType == null || pageLoansType == null ||
        heroImageBannerBlockType == null || loanCalculatorBlockType == null ||
        creditLifeInsuranceBlockType == null || featureItemType == null ||
        crossSellBlockType == null || contentCardType == null)
    {
        Console.WriteLine(
            "ERROR: one or more required content types are missing - run " +
            "'create-product-loan-schema' (and 'create-home-schema', for " +
            "shared types) first.");

        return;
    }

    JsonArray BuildExternalLink(string label, string url) =>
        new JsonArray(
            new JsonObject
            {
                ["name"] = label,
                ["target"] = null,
                ["udi"] = null,
                ["url"] = url,
                ["queryString"] = null
            });

    JsonObject BuildBlockList(
        IContentType elementType,
        IEnumerable<Dictionary<string, JsonNode?>> itemsProps)
    {
        var layoutItems = new JsonArray();
        var contentDataItems = new JsonArray();

        foreach (var props in itemsProps)
        {
            var udi = $"umb://element/{Guid.NewGuid():N}";

            var contentDataItem =
                new JsonObject
                {
                    ["contentTypeKey"] = elementType.Key.ToString(),
                    ["udi"] = udi
                };

            foreach (var (key, value) in props)
            {
                contentDataItem[key] = value;
            }

            contentDataItems.Add(contentDataItem);
            layoutItems.Add(new JsonObject { ["contentUdi"] = udi });
        }

        return new JsonObject
        {
            ["layout"] = new JsonObject { ["Umbraco.BlockList"] = layoutItems },
            ["contentData"] = contentDataItems
        };
    }

    JsonObject BuildFeatureList(IEnumerable<string> texts) =>
        BuildBlockList(
            featureItemType,
            texts.Select(t =>
                new Dictionary<string, JsonNode?> { ["text"] = t }));

    JsonObject BuildCards(
        IEnumerable<(string Title, string Description, string CtaLabel, string CtaUrl)> cards) =>
        BuildBlockList(
            contentCardType,
            cards.Select(c =>
                new Dictionary<string, JsonNode?>
                {
                    ["title"] = c.Title,
                    ["description"] = c.Description,
                    ["cta"] = BuildExternalLink(c.CtaLabel, c.CtaUrl).ToJsonString()
                }));

    // Renames the legacy pageLoans node whose name contains
    // `containsName` (skipping ones already migrated, i.e. already
    // carrying " (Legacy)"), freeing up its URL. Idempotent: on a re-run,
    // finds and returns the already-renamed node instead of renaming again.
    IContent? FreeUpLegacyUrl(string containsName)
    {
        var legacyNodes =
            contentService.GetPagedOfType(pageLoansType.Id, 0, 500, out _, null!).ToList();

        var alreadyRenamed =
            legacyNodes.FirstOrDefault(n =>
                n.Name != null &&
                n.Name.Contains(containsName, StringComparison.OrdinalIgnoreCase) &&
                n.Name.Contains("(Legacy)", StringComparison.OrdinalIgnoreCase));

        if (alreadyRenamed != null)
        {
            Console.WriteLine($"ALREADY MIGRATED: \"{alreadyRenamed.Name}\" (id={alreadyRenamed.Id})");

            return alreadyRenamed;
        }

        var node =
            legacyNodes.FirstOrDefault(n =>
                n.Name != null &&
                n.Name.Contains(containsName, StringComparison.OrdinalIgnoreCase));

        if (node == null)
        {
            return null;
        }

        var oldName = node.Name;
        node.Name = $"{node.Name} (Legacy)";

        contentService.Save(node);
        contentService.Publish(node, new[] { "*" });

        Console.WriteLine(
            $"RENAMED LEGACY PAGE: \"{oldName}\" -> \"{node.Name}\" (id={node.Id}) - " +
            "its old URL is now free.");

        return node;
    }

    IContent CreateOrUpdateProductLoanPage(string nodeName, int parentId, JsonObject sectionsValue)
    {
        var existing =
            contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
                .FirstOrDefault(n =>
                    n.Name != null &&
                    n.Name.Equals(nodeName, StringComparison.OrdinalIgnoreCase));

        IContent node;

        if (existing != null)
        {
            node = existing;

            Console.WriteLine($"EXISTS: \"{nodeName}\" (id={node.Id}) - updating its sections.");

            if (node.ParentId != parentId)
            {
                contentService.Move(node, parentId);

                Console.WriteLine($"MOVED: \"{nodeName}\" to parent id={parentId}");
            }
        }
        else
        {
            node = contentService.Create(nodeName, parentId, "productLoanPage");

            Console.WriteLine($"CREATED: \"{nodeName}\" under parent id={parentId}");
        }

        node.SetValue("sections", sectionsValue.ToJsonString());

        var saveResult = contentService.Save(node);

        if (!saveResult.Success)
        {
            throw new InvalidOperationException($"Could not save \"{nodeName}\": {saveResult.Result}");
        }

        var publishResult = contentService.Publish(node, new[] { "*" });

        if (!publishResult.Success)
        {
            throw new InvalidOperationException($"Could not publish \"{nodeName}\": {publishResult.Result}");
        }

        Console.WriteLine($"PUBLISHED: \"{nodeName}\" (id={node.Id})");

        return node;
    }

    // --------------------------------------------------------
    // PERSONAL LOAN
    // --------------------------------------------------------

    Console.WriteLine();
    Console.WriteLine("--- personal loan ---");

    var legacyPersonalLoan = FreeUpLegacyUrl("Personal Loan");

    if (legacyPersonalLoan == null)
    {
        Console.WriteLine(
            "SKIP: no legacy 'Personal Loan' pageLoans node found - nothing to migrate.");
    }
    else
    {
        const string applyUrl =
            "https://www.africanbank.co.za/en/home/get-a-quote?" +
            "utm_source=Website&utm_medium=Productpage&utm_campaign=WebLead";

        // heroImageBannerBlock, not heroBannerBlock - this hero is the
        // full-bleed background-photo style (react-ts-app's HeroBanner.tsx),
        // not the two-column one. Previously seeded as a heroBannerBlock
        // with image left null, which rendered through a contact-banner/
        // contact-overlay CSS class pair that was never actually styled
        // anywhere in the app - switching block type fixes that and adds
        // real (if still-empty) background image support. Attach the photo
        // via the backoffice's Media Picker once you have it.
        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroImageBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["headingLead"] = "We give credit",
                ["headingHighlight"] = "where progress is due",
                ["description"] =
                    "At African Bank, we back the things that matter most - your " +
                    "education, your business, your home, your future - because " +
                    "we give credit where progress is due and for you.",
                ["primaryCta"] =
                    BuildExternalLink("Do I qualify?", "/en/home/get-a-quote").ToJsonString(),
                ["secondaryCta"] = BuildExternalLink("Apply now", applyUrl).ToJsonString(),
                ["image"] = null,
                ["imageAlt"] = null
            };

        var loanCalculatorContentData =
            new JsonObject
            {
                ["contentTypeKey"] = loanCalculatorBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["minAmount"] = 2000,
                ["maxAmount"] = 250000,
                ["defaultAmount"] = null,
                ["minTerm"] = null,
                ["maxTerm"] = null,
                ["applyLink"] = BuildExternalLink("Apply Now", applyUrl).ToJsonString(),
                ["image"] = null,
                ["imageAlt"] = null,
                ["imageOnRight"] = false
            };

        var creditLifeContentData =
            new JsonObject
            {
                ["contentTypeKey"] = creditLifeInsuranceBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Credit Life Insurance",
                ["paragraphOne"] =
                    "With African Bank's Credit Life Insurance, you can rest assured " +
                    "that your credit is insured should anything happen to you that " +
                    "would prevent you from making repayments. You are covered for*.",
                ["paragraphTwo"] =
                    "With MyWORLD, you can open up to 5 accounts with no monthly " +
                    "fees, allowing you to share finances seamlessly with friends " +
                    "and family.",
                ["checklistOne"] =
                    BuildFeatureList(
                        ["Retrenchment", "Death", "Compulsory Unpaid Leave", "Lay Offs", "Short Time"])
                        .ToJsonString(),
                ["checklistTwo"] =
                    BuildFeatureList(
                        [
                            "Loss of Income", "Retrenchment Balance Claim",
                            "Temporary Disability", "Permanent Disability"
                        ])
                        .ToJsonString(),
                ["image"] = null
            };

        var crossSellContentData =
            new JsonObject
            {
                ["contentTypeKey"] = crossSellBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Find your ideal loan solution with African Bank.",
                ["cards"] =
                    BuildCards(
                        [
                            ("Consolidation Loan:",
                                "For those seeking to streamline their finances into one manageable instalment.",
                                "View Consolidation Loan", "/en/home/product-consolidation-loan/"),
                            ("12% Loan:",
                                "Benefit from our competitive 12% Loan, featuring a low interest rate for loans up to R50 000.",
                                "View the 12% Loan", "/en/home/product-12-loan/"),
                            ("Tech Deals:",
                                "Explore our deals and add a cellphone, tablet or laptop to any loan.",
                                "View Tech Deals", "/en/home/tech-deals/")
                        ])
                        .ToJsonString(),
                ["image"] = null
            };

        var personalLoanUdis =
            new[]
            {
                heroContentData["udi"]!.GetValue<string>(),
                loanCalculatorContentData["udi"]!.GetValue<string>(),
                creditLifeContentData["udi"]!.GetValue<string>(),
                crossSellContentData["udi"]!.GetValue<string>()
            };

        var personalLoanSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(personalLoanUdis
                                .Select(udi => (JsonNode)new JsonObject { ["contentUdi"] = udi })
                                .ToArray())
                    },
                ["contentData"] =
                    new JsonArray(
                        heroContentData,
                        loanCalculatorContentData,
                        creditLifeContentData,
                        crossSellContentData)
            };

        CreateOrUpdateProductLoanPage(
            "Product Personal Loan",
            legacyPersonalLoan.ParentId,
            personalLoanSections);

        Console.WriteLine(
            "NOTE: FAQ and downloads sections were not migrated (Rich Text/" +
            "Media Picker values) - add those two sections by hand in the " +
            "backoffice.");
    }

    // --------------------------------------------------------
    // CONSOLIDATION LOAN
    // --------------------------------------------------------

    Console.WriteLine();
    Console.WriteLine("--- consolidation loan ---");

    var legacyConsolidationLoan = FreeUpLegacyUrl("Consolidation Loan");

    if (legacyConsolidationLoan == null)
    {
        Console.WriteLine(
            "SKIP: no legacy 'Consolidation Loan' pageLoans node found - nothing to migrate.");
    }
    else
    {
        var demoNode =
            contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
                .FirstOrDefault(n =>
                    n.Name != null &&
                    n.Name.Equals(
                        "Dynamic Page Demo - Consolidation Loan",
                        StringComparison.OrdinalIgnoreCase));

        if (demoNode != null)
        {
            demoNode.Name = "Product Consolidation Loan";

            if (demoNode.ParentId != legacyConsolidationLoan.ParentId)
            {
                contentService.Move(demoNode, legacyConsolidationLoan.ParentId);
            }

            var saveResult = contentService.Save(demoNode);

            if (!saveResult.Success)
            {
                Console.WriteLine($"FAILED SAVE: {demoNode.Name} (id={demoNode.Id})");
            }
            else
            {
                var publishResult = contentService.Publish(demoNode, new[] { "*" });

                Console.WriteLine(
                    publishResult.Success
                        ? $"RENAMED + PUBLISHED: \"Product Consolidation Loan\" (id={demoNode.Id}), reusing its existing content"
                        : $"SAVED BUT FAILED PUBLISH: {demoNode.Name} (id={demoNode.Id})");
            }
        }
        else
        {
            Console.WriteLine(
                "ERROR: no 'Dynamic Page Demo - Consolidation Loan' node found - " +
                "run 'create-consolidation-loan-content' first, then re-run this command.");
        }
    }

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("MIGRATION COMPLETE");
    Console.WriteLine("=================================================");

    return;
}

// ============================================================
// FIND-ORPHANED-ELEMENTS COMMAND
// ============================================================
//
// Same query as the /diagnostics/orphaned-elements HTTP endpoint below, but
// run as a CLI command instead - that endpoint (and every other URL on this
// site right now) is unreachable, because Umbraco's OWN routing
// (UmbracoRouteValueTransformer -> PublishedRouter -> ContentFinderByUrlAlias)
// scans the whole content tree for a URL-alias match on EVERY request as
// part of ASP.NET Core's endpoint selection itself, before any handler
// (including a custom app.MapGet) runs - so if that scan throws (as it does
// here: "Factory returned model of type ... Link which does not implement
// IPublishedContent", meaning some content type marked IsElement=true also
// has a real, standalone content node in the tree - an Element Type's
// generated model deliberately doesn't implement IPublishedContent, it's
// only ever meant to be read as a Block List/Nested Content sub-model),
// every single URL fails the same way, this app's own diagnostic endpoints
// included. Running this as a CLI command instead sidesteps HTTP routing
// entirely - it runs right after BootUmbracoAsync(), before the web server
// starts accepting requests.

if (args.Length > 0 &&
    args[0].Equals("find-orphaned-elements", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" FIND ORPHANED ELEMENT TYPES");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var elementTypes =
        contentTypeService.GetAll().Where(ct => ct.IsElement).ToList();

    Console.WriteLine($"Scanned {elementTypes.Count} Element Type(s).");
    Console.WriteLine();

    var offendersFound = 0;

    foreach (var elementType in elementTypes)
    {
        var items =
            contentService.GetPagedOfType(
                elementType.Id,
                0,
                10,
                out var totalRecords,
                null!);

        if (totalRecords == 0)
        {
            continue;
        }

        offendersFound++;

        Console.WriteLine(
            $"OFFENDER: {elementType.Alias} ({elementType.Name}) - " +
            $"{totalRecords} live content node(s)");

        foreach (var item in items)
        {
            Console.WriteLine($"  - id={item.Id} name=\"{item.Name}\" path={item.Path}");
        }
    }

    Console.WriteLine();

    if (offendersFound == 0)
    {
        Console.WriteLine(
            "No Element Type has a live content node in the tree - the " +
            "Link/IPublishedContent crash must be coming from something " +
            "else (check the exact content type behind that model name).");
    }
    else
    {
        Console.WriteLine(
            $"Found {offendersFound} Element Type(s) with a live content " +
            "node. Each one needs either its IsElement flag switched off " +
            "(if it should be a real page) or that content node deleted/" +
            "moved out of the content tree (if it's migration debris).");
    }

    return;
}

// ============================================================
// FIX-ORPHANED-ELEMENTS COMMAND
// ============================================================
//
// Flips IsElement back to false on every content type find-orphaned-
// elements reports (a real, standalone content node exists for it, so it
// can't have been meant as an Element Type - those are only ever valid as
// a Block List/Nested Content sub-model, never as the type of a real node
// sitting in the content tree). This is exactly the "richTextboxItem's
// IsElement flip" issue already flagged as a known problem elsewhere in
// this file's own comments (predates this session) - caused by the now-
// removed migrate command's STEP 3B unconditionally setting IsElement=true
// on any content type it ever saw used as a Nested Content item type,
// without checking whether that same content type ALSO had real,
// standalone content nodes elsewhere in the v8 source tree.
//
// Safe/idempotent: only touches types find-orphaned-elements would report,
// skips ones already IsElement=false, and does not touch content values -
// only the content type's own IsElement flag.

if (args.Length > 0 &&
    args[0].Equals("fix-orphaned-elements", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" FIX ORPHANED ELEMENT TYPES");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var elementTypes =
        contentTypeService.GetAll().Where(ct => ct.IsElement).ToList();

    var fixedCount = 0;

    foreach (var elementType in elementTypes)
    {
        contentService.GetPagedOfType(
            elementType.Id,
            0,
            1,
            out var totalRecords,
            null!);

        if (totalRecords == 0)
        {
            continue;
        }

        elementType.IsElement = false;
        contentTypeService.Save(elementType);

        fixedCount++;

        Console.WriteLine(
            $"FIXED: {elementType.Alias} ({elementType.Name}) - " +
            $"IsElement set to false ({totalRecords} live content node(s))");
    }

    Console.WriteLine();

    if (fixedCount == 0)
    {
        Console.WriteLine(
            "Nothing to fix - no Element Type has a live content node.");
    }
    else
    {
        Console.WriteLine(
            $"Fixed {fixedCount} content type(s). Restart the app so " +
            "ModelsBuilder regenerates models for them, then re-run " +
            "find-orphaned-elements to confirm none remain.");
    }

    return;
}

// ============================================================
// FIX-MENU-BLOCKLIST COMMAND
// ============================================================
//
// Fixes the specific shape confirmed via /diagnostics/rawproperty/
// topNavigation/menuInfo: menuInfo's OWN top level was already correctly
// converted to modern Block List JSON ({"layout":...,"contentData":[...]})
// by the now-removed migrate command, but its nested sub-properties were
// carried over "as-is" per that command's own documented limitation -
// each contentData entry's "menus" property (and, one level deeper, each
// menus item's own "link" property) is still a JSON-encoded STRING holding
// the old v8 Nested Content array shape
// ({"key","name","ncContentTypeAlias",...}), not a real nested Block List
// object - so Umbraco's BlockListPropertyValueConverter throws "Expected
// start object" the moment anything expands into them (exactly the crash
// seen from the Delivery API). "menuList" (nested inside "link") is a
// plain MultiUrlPicker value already in the correct format and is left
// untouched, same for "categoryName"/"pageSection"/"menuDescription".
//
// Resolves each converted item's real Umbraco 16 content type by the
// EXACT alias embedded in the legacy JSON's own "ncContentTypeAlias"
// field (nCMenuContent/nCMenuList) rather than a hardcoded guess, so this
// only works if those aliases still exist under those names - which they
// do, since contentApi.ts's own field mappings (categoryName/link/
// menuList/pageSection/menuDescription) are already confirmed against a
// live Delivery API response using those same names.
//
// Idempotent: skips any "menus"/"link" value that's already a JsonObject
// (i.e. already converted) rather than a string, so re-running this is
// safe. Publishes each node it touches so the fix is live immediately.

if (args.Length > 0 &&
    args[0].Equals("fix-menu-blocklist", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" FIX TOPNAVIGATION MENU NESTED BLOCK LIST DATA");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var topNavType = contentTypeService.Get("topNavigation");

    if (topNavType == null)
    {
        Console.WriteLine("ERROR: no content type with alias 'topNavigation' exists.");

        return;
    }

    var contentTypeKeyCache =
        new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);

    Guid? ResolveContentTypeKey(string alias)
    {
        if (contentTypeKeyCache.TryGetValue(alias, out var cached))
        {
            return cached;
        }

        var contentType = contentTypeService.Get(alias);

        if (contentType == null)
        {
            return null;
        }

        contentTypeKeyCache[alias] = contentType.Key;

        return contentType.Key;
    }

    // Converts one leaf-level legacy JSON string (an array of
    // {"key","name","ncContentTypeAlias",...own properties...} items with
    // no further nested Block List sub-properties of their own) into
    // modern Block List JSON. Used for the "link" (nCMenuList) level -
    // its own "menuList" is copied across unchanged, not recursed into.
    JsonObject? ConvertLeafLevel(string rawJson, string[] passthroughProps)
    {
        JsonNode? parsed;

        try
        {
            parsed = JsonNode.Parse(rawJson);
        }
        catch (JsonException)
        {
            return null;
        }

        if (parsed is not JsonArray array)
        {
            return null;
        }

        var layoutItems = new JsonArray();
        var contentDataItems = new JsonArray();

        foreach (var itemNode in array)
        {
            if (itemNode is not JsonObject item)
            {
                continue;
            }

            var alias = item["ncContentTypeAlias"]?.GetValue<string>();
            var legacyKey = item["key"]?.GetValue<string>();

            if (string.IsNullOrWhiteSpace(alias) || string.IsNullOrWhiteSpace(legacyKey))
            {
                continue;
            }

            var contentTypeKey = ResolveContentTypeKey(alias);

            if (contentTypeKey == null)
            {
                Console.WriteLine(
                    $"    SKIP ITEM: no content type with alias '{alias}' - leaving unconverted.");

                continue;
            }

            var udi = $"umb://element/{legacyKey.Replace("-", "")}";

            var contentDataItem =
                new JsonObject
                {
                    ["contentTypeKey"] = contentTypeKey.Value.ToString(),
                    ["udi"] = udi
                };

            foreach (var propAlias in passthroughProps)
            {
                contentDataItem[propAlias] = item[propAlias]?.DeepClone();
            }

            contentDataItems.Add(contentDataItem);
            layoutItems.Add(new JsonObject { ["contentUdi"] = udi });
        }

        if (contentDataItems.Count == 0)
        {
            return null;
        }

        return new JsonObject
        {
            ["layout"] = new JsonObject { ["Umbraco.BlockList"] = layoutItems },
            ["contentData"] = contentDataItems
        };
    }

    // Converts a "menus" (nCMenuContent) level legacy JSON string, which
    // additionally has its own nested "link" (nCMenuList) Block List
    // sub-property needing the same conversion one level deeper.
    JsonObject? ConvertMenusLevel(string rawJson)
    {
        JsonNode? parsed;

        try
        {
            parsed = JsonNode.Parse(rawJson);
        }
        catch (JsonException)
        {
            return null;
        }

        if (parsed is not JsonArray array)
        {
            return null;
        }

        var layoutItems = new JsonArray();
        var contentDataItems = new JsonArray();

        foreach (var itemNode in array)
        {
            if (itemNode is not JsonObject item)
            {
                continue;
            }

            var alias = item["ncContentTypeAlias"]?.GetValue<string>();
            var legacyKey = item["key"]?.GetValue<string>();

            if (string.IsNullOrWhiteSpace(alias) || string.IsNullOrWhiteSpace(legacyKey))
            {
                continue;
            }

            var contentTypeKey = ResolveContentTypeKey(alias);

            if (contentTypeKey == null)
            {
                Console.WriteLine(
                    $"    SKIP ITEM: no content type with alias '{alias}' - leaving unconverted.");

                continue;
            }

            var udi = $"umb://element/{legacyKey.Replace("-", "")}";

            var contentDataItem =
                new JsonObject
                {
                    ["contentTypeKey"] = contentTypeKey.Value.ToString(),
                    ["udi"] = udi,
                    ["categoryName"] = item["categoryName"]?.DeepClone()
                };

            if (item["link"] is JsonValue linkValue &&
                linkValue.TryGetValue<string>(out var linkRaw) &&
                !string.IsNullOrWhiteSpace(linkRaw))
            {
                var convertedLink =
                    ConvertLeafLevel(
                        linkRaw,
                        new[] { "menuList", "pageSection", "menuDescription" });

                if (convertedLink != null)
                {
                    contentDataItem["link"] = convertedLink;
                }
                else
                {
                    Console.WriteLine(
                        "    WARNING: could not convert nested 'link' value - leaving it out.");
                }
            }

            contentDataItems.Add(contentDataItem);
            layoutItems.Add(new JsonObject { ["contentUdi"] = udi });
        }

        if (contentDataItems.Count == 0)
        {
            return null;
        }

        return new JsonObject
        {
            ["layout"] = new JsonObject { ["Umbraco.BlockList"] = layoutItems },
            ["contentData"] = contentDataItems
        };
    }

    var topNavItems =
        contentService.GetPagedOfType(
            topNavType.Id,
            0,
            100,
            out var totalRecords,
            null!);

    Console.WriteLine($"Found {totalRecords} 'topNavigation' node(s).");
    Console.WriteLine();

    var fixedCount = 0;

    foreach (var node in topNavItems)
    {
        try
        {
            var menuInfoProperty =
                node.Properties.FirstOrDefault(p =>
                    p.Alias.Equals("menuInfo", StringComparison.OrdinalIgnoreCase));

            var rawValue = menuInfoProperty?.GetValue() as string;

            if (string.IsNullOrWhiteSpace(rawValue))
            {
                Console.WriteLine($"SKIP: {node.Name} (id={node.Id}) - no menuInfo value.");

                continue;
            }

            JsonObject? menuInfoRoot;

            try
            {
                menuInfoRoot = JsonNode.Parse(rawValue) as JsonObject;
            }
            catch (JsonException ex)
            {
                Console.WriteLine(
                    $"ERROR: {node.Name} (id={node.Id}) - could not parse menuInfo: {ex.Message}");

                continue;
            }

            if (menuInfoRoot?["contentData"] is not JsonArray contentDataArray)
            {
                Console.WriteLine(
                    $"SKIP: {node.Name} (id={node.Id}) - menuInfo is not already a Block List value.");

                continue;
            }

            var changed = false;

            foreach (var entryNode in contentDataArray)
            {
                if (entryNode is not JsonObject entry)
                {
                    continue;
                }

                if (entry["menus"] is not JsonValue menusValue ||
                    !menusValue.TryGetValue<string>(out var menusRaw) ||
                    string.IsNullOrWhiteSpace(menusRaw))
                {
                    // Not a string - either already converted, or not set.
                    continue;
                }

                var convertedMenus = ConvertMenusLevel(menusRaw);

                if (convertedMenus == null)
                {
                    Console.WriteLine(
                        $"  WARNING: {node.Name} - could not convert 'menus' for category " +
                        $"\"{entry["menuDescription"]}\" - leaving it unconverted.");

                    continue;
                }

                entry["menus"] = convertedMenus;
                changed = true;

                Console.WriteLine(
                    $"  CONVERTED: {node.Name} - category \"{entry["menuDescription"]}\" " +
                    $"({((JsonArray)convertedMenus["contentData"]!).Count} sub-item(s))");
            }

            if (!changed)
            {
                Console.WriteLine($"SKIP: {node.Name} (id={node.Id}) - nothing needed converting.");

                continue;
            }

            node.SetValue("menuInfo", menuInfoRoot.ToJsonString());

            var saveResult = contentService.Save(node);

            if (!saveResult.Success)
            {
                Console.WriteLine($"FAILED SAVE: {node.Name} (id={node.Id})");

                continue;
            }

            var publishResult = contentService.Publish(node, new[] { "*" });

            if (!publishResult.Success)
            {
                Console.WriteLine($"SAVED BUT FAILED PUBLISH: {node.Name} (id={node.Id})");

                continue;
            }

            fixedCount++;

            Console.WriteLine($"FIXED + PUBLISHED: {node.Name} (id={node.Id})");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR NODE {node.Id}: {ex.Message}");
        }
    }

    Console.WriteLine();
    Console.WriteLine($"Done. Fixed {fixedCount} of {totalRecords} node(s).");

    return;
}

// ============================================================
// TEMP DIAGNOSTIC - remove once content-type-level issues (richTextboxItem's
// IsElement flip, duplicate homePageElements nodes, ...) are resolved.
// Visit /diagnostics/contenttype/{alias} in the browser, e.g.
// /diagnostics/contenttype/richTextboxItem or
// /diagnostics/contenttype/homePageElements.
//
// Deliberately uses IContentService (draft content) instead of the
// published content API. richTextboxItem's generated model doesn't
// implement IPublishedContent (its content type has IsElement=true), so
// anything going through the published cache for those nodes throws
// "Factory returned model ... which does not implement IPublishedContent" -
// and the same risk applies to any other content type until that's
// confirmed fixed. IContentService works on the raw IContent model
// instead, with no ModelsBuilder typing involved, so it can list content
// of any type safely regardless of that issue.
// ============================================================

app.MapGet("/diagnostics/contenttype/{alias}", (
    string alias,
    string? childAlias,
    bool withChildren,
    IContentTypeService contentTypeService,
    IContentService contentService) =>
{
    var contentType = contentTypeService.Get(alias);

    if (contentType == null)
    {
        return Results.Ok(new
        {
            found = false,
            message = $"No content type with alias '{alias}' exists."
        });
    }

    var items =
        contentService.GetPagedOfType(
            contentType.Id,
            0,
            1000,
            out var totalRecords,
            null!);

    return Results.Ok(new
    {
        found = true,
        contentTypeId = contentType.Id,
        isElement = contentType.IsElement,
        totalRecords,
        items = items.Select(c => new
        {
            id = c.Id,
            key = c.Key,
            name = c.Name,
            parentId = c.ParentId,
            path = c.Path,
            trashed = c.Trashed,
            published = c.Published,
            // ?withChildren=true: every child of this item, unfiltered.
            children = !withChildren
                ? null
                : contentService
                    .GetPagedChildren(c.Id, 0, 1000, out _, null!)
                    .Select(child => new
                    {
                        id = child.Id,
                        name = child.Name,
                        docType = child.ContentType.Alias,
                        trashed = child.Trashed,
                        published = child.Published
                    })
                    .ToList(),
            // ?childAlias=X: does this item have a live child of that
            // specific document type (e.g. does *this* homePageElements
            // node actually have a topNavigation child, not just whether
            // one exists somewhere in the site).
            matchingChild = string.IsNullOrEmpty(childAlias)
                ? null
                : contentService
                    .GetPagedChildren(c.Id, 0, 1000, out _, null!)
                    .Where(child => child.ContentType.Alias.Equals(
                        childAlias,
                        StringComparison.OrdinalIgnoreCase))
                    .Select(child => new
                    {
                        id = child.Id,
                        name = child.Name,
                        trashed = child.Trashed,
                        published = child.Published
                    })
                    .FirstOrDefault()
        })
    });
});

// ============================================================
// TEMP DIAGNOSTIC - remove once the topNavigation/MenuInfo schema is
// confirmed. Visit /diagnostics/schema/search?q=menu in the browser -
// lists every content/element type whose alias or name contains the
// search term, with its full property list (alias, name, editor).
// Settles "is property X missing" directly against the schema instead of
// reading it off backoffice screenshots.
// ============================================================

app.MapGet("/diagnostics/schema/search", (
    string q,
    IContentTypeService contentTypeService) =>
{
    var matches = contentTypeService.GetAll()
        .Where(ct =>
            ct.Alias.Contains(q, StringComparison.OrdinalIgnoreCase) ||
            ct.Name!.Contains(q, StringComparison.OrdinalIgnoreCase))
        .Select(ct => new
        {
            alias = ct.Alias,
            name = ct.Name,
            isElement = ct.IsElement,
            properties = ct.PropertyTypes.Select(pt => new
            {
                alias = pt.Alias,
                name = pt.Name,
                editor = pt.PropertyEditorAlias
            })
        })
        .ToList();

    return Results.Ok(new
    {
        query = q,
        count = matches.Count,
        contentTypes = matches
    });
});

// ============================================================
// TEMP DIAGNOSTIC - dumps a property's RAW stored value via IContentService
// (draft content, no value converter involved) instead of going through the
// Delivery API/published cache - use this when the Delivery API itself
// throws while reading a property (e.g. BlockListPropertyValueConverter's
// "Expected start object" JsonException), since that error happens INSIDE
// the value converter and never reaches a response body to inspect. Visit
// /diagnostics/rawproperty/{contentTypeAlias}/{propertyAlias} in the
// browser, e.g. /diagnostics/rawproperty/topNavigation/menuInfo.
// ============================================================

app.MapGet("/diagnostics/rawproperty/{alias}/{propertyAlias}", (
    string alias,
    string propertyAlias,
    IContentTypeService contentTypeService,
    IContentService contentService) =>
{
    var contentType = contentTypeService.Get(alias);

    if (contentType == null)
    {
        return Results.Ok(new
        {
            found = false,
            message = $"No content type with alias '{alias}' exists."
        });
    }

    var items =
        contentService.GetPagedOfType(
            contentType.Id,
            0,
            10,
            out var totalRecords,
            null!);

    return Results.Ok(new
    {
        found = true,
        totalRecords,
        propertyAlias,
        items = items.Select(c =>
        {
            var property =
                c.Properties.FirstOrDefault(p =>
                    p.Alias.Equals(propertyAlias, StringComparison.OrdinalIgnoreCase));

            var rawValue = property?.GetValue();

            return new
            {
                id = c.Id,
                name = c.Name,
                published = c.Published,
                propertyFound = property != null,
                rawValueClrType = rawValue?.GetType().FullName,
                rawValue = rawValue?.ToString()
            };
        })
    });
});

// ============================================================
// TEMP DIAGNOSTIC - finds every content type marked IsElement=true that
// ALSO has a real, standalone content node living in the actual content
// tree. An Element Type's ModelsBuilder-generated model deliberately does
// NOT implement IPublishedContent (it's only ever meant to be read as a
// sub-model inside a Block List/Nested Content property value) - so the
// moment routing/content-cache code tries to build a full page model for
// one of these nodes (e.g. ContentFinderByUrlAlias scanning every node in
// the tree for a URL-alias match), it throws "Factory returned model of
// type X which does not implement IPublishedContent" and takes down the
// whole request, not just that one node. Visit /diagnostics/orphaned-
// elements in the browser - every row it returns needs either its
// IsElement flag switched off (if it's meant to be a real page) or its
// content node deleted/moved out of the content tree (if it's migration
// debris that should only ever exist nested inside a property value).
// ============================================================

app.MapGet("/diagnostics/orphaned-elements", (
    IContentTypeService contentTypeService,
    IContentService contentService) =>
{
    var elementTypes =
        contentTypeService.GetAll().Where(ct => ct.IsElement).ToList();

    var offenders = elementTypes
        .Select(ct =>
        {
            var items =
                contentService.GetPagedOfType(
                    ct.Id,
                    0,
                    10,
                    out var totalRecords,
                    null!);

            return new
            {
                alias = ct.Alias,
                name = ct.Name,
                liveNodeCount = totalRecords,
                sampleNodes = items.Select(c => new { id = c.Id, name = c.Name, path = c.Path })
            };
        })
        .Where(x => x.liveNodeCount > 0)
        .ToList();

    return Results.Ok(new
    {
        elementTypesScanned = elementTypes.Count,
        offendersFound = offenders.Count,
        offenders
    });
});

// ============================================================
// NORMAL UMBRACO STARTUP
// ============================================================

app.UseUmbraco()
    .WithMiddleware(u =>
    {
        u.AppBuilder.UseCors(ReactDevClientCorsPolicy);
        u.UseBackOffice();
        u.UseWebsite();
    })
    .WithEndpoints(u =>
    {
        u.UseBackOfficeEndpoints();
        u.UseWebsiteEndpoints();
    });

await app.RunAsync();


// ============================================================
// FUNCTIONS
// ============================================================

static async Task ExecuteSqlAsync(
    SqlConnection connection,
    string sql)
{
    await using var command =
        new SqlCommand(sql, connection)
        {
            CommandTimeout = 120
        };

    await command.ExecuteNonQueryAsync();
}


static async Task<List<TableInfo>> GetTableListAsync(
    SqlConnection connection)
{
    var result = new List<TableInfo>();

    // sys.tables/sys.partitions are standard SQL Server system catalog
    // views (not Umbraco-specific), so unlike Umbraco's own tables there's
    // nothing to guess here - this works identically against any SQL
    // Server database regardless of schema/version.
    const string sql = """
        SELECT
            t.name,
            SUM(p.rows)
        FROM sys.tables t
        INNER JOIN sys.partitions p
            ON t.object_id = p.object_id
            AND p.index_id IN (0, 1)
        GROUP BY t.name
        ORDER BY t.name
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new TableInfo(
                reader.GetString(0),
                reader.GetInt64(1)));
    }

    return result;
}


record TableInfo(
    string Name,
    long RowCount);

// Used only by the "create-home-schema" command above - one property spec
// (alias/name/backing Data Type/mandatory flag) passed into GetOrCreateType.
record PropSpec(
    string Alias,
    string Name,
    IDataType Type,
    bool Mandatory = false);