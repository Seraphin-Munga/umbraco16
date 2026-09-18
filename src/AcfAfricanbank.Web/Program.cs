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
        var existing =
            (await dataTypeService.GetAllAsync())
                .FirstOrDefault(d =>
                    d.Name != null &&
                    d.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (existing != null)
        {
            Console.WriteLine($"EXISTS BLOCKLIST DATATYPE: {name}");

            return existing;
        }

        if (!propertyEditors.TryGet("Umbraco.BlockList", out var editor))
        {
            throw new InvalidOperationException(
                "Umbraco.BlockList editor is not registered.");
        }

        var blocks =
            allowedElementTypes
                .Select(t => new Dictionary<string, object>
                {
                    ["contentElementTypeKey"] = t.Key.ToString()
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
            bankWithAudacityBlock,
            loanCalculatorBlock,
            myWorldAccountBlock,
            debitCardShowcaseBlock,
            rewardsSectionBlock,
            tap2GlassBlock,
            businessAudacityBlock,
            appDownloadBlock,
            testimonialsBlock);

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
        var existing =
            (await dataTypeService.GetAllAsync())
                .FirstOrDefault(d =>
                    d.Name != null &&
                    d.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (existing != null)
        {
            Console.WriteLine($"EXISTS BLOCKLIST DATATYPE: {name}");

            return existing;
        }

        if (!propertyEditors.TryGet("Umbraco.BlockList", out var editor))
        {
            throw new InvalidOperationException(
                "Umbraco.BlockList editor is not registered.");
        }

        var blocks =
            allowedElementTypes
                .Select(t => new Dictionary<string, object>
                {
                    ["contentElementTypeKey"] = t.Key.ToString()
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
    // Not scoped to the product loan page - faqItem/faqSectionBlock are
    // general-purpose and meant to be added to any other page's own
    // "sections" Block List later without redefining them (see this
    // command's own top comment). contentCard and featureItem are reused
    // as-is from create-home-schema (same alias, same shape) rather than
    // redefined here.

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
            new PropSpec("label", "Label", txt),
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
            new PropSpec("secondaryCta", "Secondary Button", link));

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

    // ==========================================================
    // PRODUCT LOAN PAGE
    // ==========================================================

    Console.WriteLine();
    Console.WriteLine("--- product loan page ---");

    var productLoanPageSections =
        await GetOrCreateBlockListAsync(
            "React Migration - productLoanPage.sections",
            heroBannerBlock,
            loanCalculatorBlock,
            creditLifeInsuranceBlock,
            faqSectionBlock,
            downloadsSectionBlock,
            crossSellBlock);

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