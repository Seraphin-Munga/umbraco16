using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Data.SqlClient;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;

var builder = WebApplication.CreateBuilder(args);

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
// SOURCE UMBRACO 8 DATABASE
// ============================================================

var sourceConnectionString = new SqlConnectionStringBuilder
{
    DataSource = @"MDWSQL2016\SQL01",
    InitialCatalog = "Umbraco8_AB_CMS_13Nov",
    UserID = "UmbracoDev",
    Password = "mCH^aBp::4Ui;t;TCY*:",
    TrustServerCertificate = true
}.ConnectionString;

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
// Drops EVERY table in the TARGET database only - sourceConnectionString
// is never referenced anywhere in this block, so the v8 database cannot
// be touched by this command no matter what. Needed because STEP 4 (in
// the migrate command below) had no idempotency check until this
// session's fix, so earlier runs left the target with ~13x duplicated
// content - see MIGRATION.md. Runs BEFORE Umbraco boots (unlike
// migrate/schema below, which need Umbraco's services) so dropping
// tables out from under an already-booted runtime's own lock/cache
// machinery is never a concern.

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
    Console.WriteLine(
        "The source Umbraco 8 database is never touched by this command.");
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
        "rebuild its schema fresh, then run 'migrate' again.");

    return;
}

// ============================================================
// BUILD UMBRACO
// ============================================================

builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddComposers()
    .Build();

var app = builder.Build();

await app.BootUmbracoAsync();

// ============================================================
// MIGRATION COMMAND
// ============================================================

if (args.Length > 0 &&
    args[0].Equals("migrate", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" UMBRACO 8 -> UMBRACO 16 MIGRATION");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    await using var source =
        new SqlConnection(sourceConnectionString);

    await source.OpenAsync();

    Console.WriteLine("SOURCE DATABASE: CONNECTED");

    await using var target =
        new SqlConnection(targetConnectionString);

    await target.OpenAsync();

    Console.WriteLine("TARGET DATABASE: CONNECTED");
    Console.WriteLine();

    // ========================================================
    // SERVICES
    // ========================================================

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var dataTypeService =
        app.Services.GetRequiredService<IDataTypeService>();

    var propertyEditors =
        app.Services.GetRequiredService<PropertyEditorCollection>();

    var configurationEditorJsonSerializer =
        app.Services.GetRequiredService<IConfigurationEditorJsonSerializer>();

    var shortStringHelper =
        app.Services.GetRequiredService<IShortStringHelper>();

    // ========================================================
    // STEP 1
    // DOCUMENT TYPE FOLDERS
    // ========================================================
    //
    // Umbraco 8 organizes document types into folders (e.g. Settings >
    // Document Types > Base, Compositions, Pages, ...). Those folders are
    // plain umbracoNode rows with nodeObjectType = the well-known "Document
    // Type Container" GUID, not part of cmsContentType. Migrate them first
    // so STEP 1B can place each content type under the right folder.

    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 1 - DOCUMENT TYPE FOLDERS");
    Console.WriteLine("=================================================");

    var contentTypeContainerService =
        app.Services.GetRequiredService<IContentTypeContainerService>();

    var sourceContainers =
        await GetContentTypeContainersAsync(source);

    Console.WriteLine(
        $"Found {sourceContainers.Count} document type folders.");

    var existingContainers =
        (await contentTypeContainerService.GetAllAsync()).ToList();

    // Source Umbraco 8 folder node ID -> already-created target folder.
    var containerMap =
        new Dictionary<int, EntityContainer>();

    foreach (var sourceContainer in sourceContainers)
    {
        try
        {
            Guid? parentKey = null;
            int? parentId = null;

            if (sourceContainer.ParentId > 0)
            {
                if (!containerMap.TryGetValue(
                        sourceContainer.ParentId,
                        out var parentContainer))
                {
                    Console.WriteLine(
                        $"SKIP FOLDER {sourceContainer.Name}: " +
                        "parent folder not migrated.");

                    continue;
                }

                parentKey = parentContainer.Key;
                parentId = parentContainer.Id;
            }

            var existingContainer =
                existingContainers.FirstOrDefault(x =>
                    x.Name != null &&
                    x.Name.Equals(
                        sourceContainer.Name,
                        StringComparison.OrdinalIgnoreCase) &&
                    x.ParentId == (parentId ?? -1));

            if (existingContainer != null)
            {
                containerMap[sourceContainer.NodeId] =
                    existingContainer;

                Console.WriteLine(
                    $"EXISTS FOLDER  : {sourceContainer.Name}");

                continue;
            }

            var createResult =
                await contentTypeContainerService.CreateAsync(
                    null,
                    sourceContainer.Name,
                    parentKey,
                    Constants.Security.SuperUserKey);

            if (!createResult.Success ||
                createResult.Result == null)
            {
                Console.WriteLine(
                    $"FAILED FOLDER  : {sourceContainer.Name} " +
                    $"- {createResult.Status}");

                continue;
            }

            containerMap[sourceContainer.NodeId] =
                createResult.Result;

            existingContainers.Add(createResult.Result);

            Console.WriteLine(
                $"CREATED FOLDER : {sourceContainer.Name}");
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"ERROR FOLDER {sourceContainer.Name}: " +
                ex.Message);
        }
    }

    // ========================================================
    // STEP 1B
    // CONTENT TYPES
    // ========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 1B - CONTENT TYPES");
    Console.WriteLine("=================================================");

    var sourceContentTypes =
        await GetContentTypesAsync(source);

    Console.WriteLine(
        $"Found {sourceContentTypes.Count} content types.");

    var contentTypeMap =
        new Dictionary<int, string>();

    foreach (var sourceType in sourceContentTypes)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(sourceType.Alias))
                continue;

            var existing =
                contentTypeService.Get(sourceType.Alias);

            if (existing != null)
            {
                contentTypeMap[sourceType.NodeId] =
                    existing.Alias;

                Console.WriteLine(
                    $"EXISTS  : {sourceType.Alias}");

                continue;
            }

            var typeParentId = -1;

            if (sourceType.ParentId > 0)
            {
                if (containerMap.TryGetValue(
                        sourceType.ParentId,
                        out var typeParentContainer))
                {
                    typeParentId = typeParentContainer.Id;
                }
                else
                {
                    Console.WriteLine(
                        $"NOTE    : {sourceType.Alias} - source folder " +
                        $"{sourceType.ParentId} wasn't migrated, " +
                        "creating at root instead.");
                }
            }

            var contentType =
                new ContentType(shortStringHelper, typeParentId)
                {
                    Alias =
                        sourceType.Alias,

                    Name =
                        string.IsNullOrWhiteSpace(sourceType.Name)
                            ? sourceType.Alias
                            : sourceType.Name,

                    Icon =
                        string.IsNullOrWhiteSpace(sourceType.Icon)
                            ? "icon-document"
                            : sourceType.Icon,

                    AllowedAsRoot =
                        sourceType.AllowAtRoot
                };

            contentTypeService.Save(contentType);

            contentTypeMap[sourceType.NodeId] =
                contentType.Alias;

            Console.WriteLine(
                $"CREATED : {sourceType.Alias}");
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"ERROR CONTENT TYPE {sourceType.NodeId}: " +
                ex.Message);
        }
    }

    // ========================================================
    // STEP 1B2
    // CONTENT TYPE COMPOSITIONS
    // ========================================================
    //
    // A content type can pull in shared property sets from separate
    // "composition" content types (cmsContentType2ContentType: each row's
    // childContentTypeId composes in parentContentTypeId's properties).
    // Composition content types already get created above like any other
    // content type, along with their own direct properties in STEP 3 - but
    // without this link, composing types never show those properties, since
    // Umbraco has no other way to know PageHome (say) also uses them.

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 1B2 - CONTENT TYPE COMPOSITIONS");
    Console.WriteLine("=================================================");

    var sourceCompositions =
        await GetContentTypeCompositionsAsync(source);

    Console.WriteLine(
        $"Found {sourceCompositions.Count} composition links.");

    foreach (var composition in sourceCompositions)
    {
        try
        {
            if (!contentTypeMap.TryGetValue(
                    composition.ChildNodeId,
                    out var childAlias))
            {
                Console.WriteLine(
                    $"SKIP COMPOSITION {composition.ChildNodeId}: " +
                    "composing content type not migrated.");

                continue;
            }

            if (!contentTypeMap.TryGetValue(
                    composition.ParentNodeId,
                    out var compositionAlias))
            {
                Console.WriteLine(
                    $"SKIP COMPOSITION {childAlias}: " +
                    $"composition {composition.ParentNodeId} not migrated.");

                continue;
            }

            var childType =
                contentTypeService.Get(childAlias);

            var compositionType =
                contentTypeService.Get(compositionAlias);

            if (childType == null || compositionType == null)
            {
                continue;
            }

            if (childType.ContentTypeCompositionExists(compositionAlias))
            {
                Console.WriteLine(
                    $"EXISTS COMPOSITION: {childAlias} -> {compositionAlias}");

                continue;
            }

            if (!childType.AddContentType(compositionType))
            {
                Console.WriteLine(
                    $"FAILED COMPOSITION: {childAlias} -> {compositionAlias} " +
                    "(rejected - would create a cycle or alias clash).");

                continue;
            }

            contentTypeService.Save(childType);

            Console.WriteLine(
                $"CREATED COMPOSITION: {childAlias} -> {compositionAlias}");
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"ERROR COMPOSITION {composition.ChildNodeId}: " +
                ex.Message);
        }
    }

    // ========================================================
    // STEP 1C
    // TEMPLATES
    // ========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 1C - TEMPLATES");
    Console.WriteLine("=================================================");

    var fileService =
        app.Services.GetRequiredService<IFileService>();

    var sourceTemplates =
        await GetTemplatesAsync(source);

    Console.WriteLine(
        $"Found {sourceTemplates.Count} templates.");

    var templateMap =
        new Dictionary<int, string>();

    var remainingTemplates =
        new List<SourceTemplate>(sourceTemplates);

    // Create templates in dependency order: a template can only be created
    // once its master template (if any) already exists. Loop until nothing
    // changes so any inheritance depth is handled.
    var madeProgress = true;

    while (remainingTemplates.Count > 0 && madeProgress)
    {
        madeProgress = false;

        foreach (var sourceTemplate in remainingTemplates.ToList())
        {
            string? masterAlias = null;

            if (sourceTemplate.MasterId.HasValue)
            {
                if (!templateMap.TryGetValue(
                        sourceTemplate.MasterId.Value,
                        out masterAlias))
                {
                    // Master not created yet - try again next pass.
                    continue;
                }
            }

            try
            {
                if (string.IsNullOrWhiteSpace(sourceTemplate.Alias))
                {
                    remainingTemplates.Remove(sourceTemplate);
                    madeProgress = true;
                    continue;
                }

                var existingTemplate =
                    fileService.GetTemplate(sourceTemplate.Alias);

                if (existingTemplate != null)
                {
                    templateMap[sourceTemplate.NodeId] =
                        existingTemplate.Alias;

                    Console.WriteLine(
                        $"EXISTS  : {sourceTemplate.Alias}");
                }
                else
                {
                    var masterTemplate =
                        masterAlias != null
                            ? fileService.GetTemplate(masterAlias)
                            : null;

                    // v8 templates are files on disk, not a DB column - the
                    // matching .cshtml was already copied into this
                    // project's own Views/ folder.
                    var viewPath =
                        Path.Combine(
                            app.Environment.ContentRootPath,
                            "Views",
                            $"{sourceTemplate.Alias}.cshtml");

                    var design =
                        System.IO.File.Exists(viewPath)
                            ? await System.IO.File.ReadAllTextAsync(viewPath)
                            : string.Empty;

                    if (!System.IO.File.Exists(viewPath))
                    {
                        Console.WriteLine(
                            $"NOTE    : {sourceTemplate.Alias} " +
                            $"- no matching Views/{sourceTemplate.Alias}.cshtml, " +
                            "created empty.");
                    }

                    var newTemplate =
                        fileService.CreateTemplateWithIdentity(
                            string.IsNullOrWhiteSpace(sourceTemplate.Name)
                                ? sourceTemplate.Alias
                                : sourceTemplate.Name,
                            sourceTemplate.Alias,
                            design,
                            masterTemplate);

                    templateMap[sourceTemplate.NodeId] =
                        newTemplate.Alias;

                    Console.WriteLine(
                        $"CREATED : {sourceTemplate.Alias}");
                }

                remainingTemplates.Remove(sourceTemplate);
                madeProgress = true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"ERROR TEMPLATE {sourceTemplate.NodeId}: " +
                    ex.Message);

                remainingTemplates.Remove(sourceTemplate);
                madeProgress = true;
            }
        }
    }

    foreach (var leftoverTemplate in remainingTemplates)
    {
        Console.WriteLine(
            $"SKIP TEMPLATE {leftoverTemplate.NodeId}: " +
            "master template could not be resolved.");
    }

    // --------------------------------------------------------
    // Wire up allowed + default templates on content types.
    // --------------------------------------------------------

    try
    {
        var docTypeTemplates =
            await GetDocumentTypeTemplatesAsync(source);

        foreach (var group in docTypeTemplates.GroupBy(x => x.ContentTypeNodeId))
        {
            if (!contentTypeMap.TryGetValue(
                    group.Key,
                    out var contentTypeAliasForTemplates))
            {
                continue;
            }

            var contentTypeForTemplates =
                contentTypeService.Get(contentTypeAliasForTemplates);

            if (contentTypeForTemplates == null)
            {
                continue;
            }

            var allowedTemplates =
                group
                    .Select(x =>
                        templateMap.TryGetValue(x.TemplateNodeId, out var alias)
                            ? fileService.GetTemplate(alias)
                            : null)
                    .Where(t => t != null)
                    .Select(t => t!)
                    .ToArray();

            if (allowedTemplates.Length == 0)
            {
                continue;
            }

            contentTypeForTemplates.AllowedTemplates =
                allowedTemplates;

            var defaultEntry =
                group.FirstOrDefault(x => x.IsDefault);

            if (defaultEntry != null &&
                templateMap.TryGetValue(
                    defaultEntry.TemplateNodeId,
                    out var defaultAlias))
            {
                contentTypeForTemplates.SetDefaultTemplate(
                    fileService.GetTemplate(defaultAlias));
            }

            contentTypeService.Save(contentTypeForTemplates);

            Console.WriteLine(
                $"LINKED TEMPLATES: {contentTypeAliasForTemplates} " +
                $"({allowedTemplates.Length})");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"ERROR LINKING TEMPLATES: {ex.Message}");
    }

    // ========================================================
    // STEP 1D
    // MEDIA
    // ========================================================
    //
    // Media (images/files/folders) lives in its own tree, unrelated to
    // document types, so it's migrated independently. cmsContentType also
    // stores the built-in media type definitions (Image, File, Folder, ...)
    // - those already exist out of the box in Umbraco 16, so mediaTypeAlias
    // is only used to find/create the matching type by alias, same as
    // GetTemplatesAsync does for templates.
    //
    // The physical files live on disk under the v8 site's ~/media folder.
    // Set "Migration:SourceMediaRootPath" in appsettings/user-secrets to an
    // absolute path on whichever machine runs `migrate` - there's no way to
    // guess this reliably across machines. Falls back to assuming this repo
    // checkout sits next to a sibling `Platform` checkout of the old v8
    // solution (i.e. "../../../Platform/Web/Media" from this project), which
    // only holds on some dev setups.

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 1D - MEDIA");
    Console.WriteLine("=================================================");

    var mediaService =
        app.Services.GetRequiredService<IMediaService>();

    var mediaFileManager =
        app.Services.GetRequiredService<MediaFileManager>();

    var mediaUrlGenerators =
        app.Services.GetRequiredService<MediaUrlGeneratorCollection>();

    var contentTypeBaseServiceProvider =
        app.Services.GetRequiredService<IContentTypeBaseServiceProvider>();

    var sourceMediaRootPath =
        builder.Configuration["Migration:SourceMediaRootPath"] ??
        Path.Combine(
            app.Environment.ContentRootPath,
            "..", "..", "..",
            "Platform", "Web", "Media");

    if (!Directory.Exists(sourceMediaRootPath))
    {
        Console.WriteLine();
        Console.WriteLine("*************************************************");
        Console.WriteLine("WARNING: source media folder not found at:");
        Console.WriteLine($"  {Path.GetFullPath(sourceMediaRootPath)}");
        Console.WriteLine(
            "No media files will be copied - items will be created " +
            "with no umbracoFile value. Set \"Migration:SourceMediaRootPath\" " +
            "in appsettings.json or user-secrets to the correct absolute " +
            "path on this machine and re-run migrate.");
        Console.WriteLine("*************************************************");
        Console.WriteLine();
    }

    var sourceMediaItems =
        await GetMediaAsync(source);

    Console.WriteLine(
        $"Found {sourceMediaItems.Count} media items.");

    var sourceMediaFileValues =
        await GetMediaFileValuesAsync(source);

    // Source Umbraco 8 media node ID -> target media item's int Id.
    var mediaMap =
        new Dictionary<int, int>();

    var mediaCreatedCount = 0;
    var mediaFileCopiedCount = 0;

    foreach (var mediaItem in sourceMediaItems)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(mediaItem.MediaTypeAlias))
            {
                Console.WriteLine(
                    $"SKIP MEDIA {mediaItem.NodeId}: " +
                    "no media type alias.");

                continue;
            }

            var mediaParentId = -1;

            if (mediaItem.ParentId > 0)
            {
                if (!mediaMap.TryGetValue(
                        mediaItem.ParentId,
                        out var mappedParentId))
                {
                    Console.WriteLine(
                        $"SKIP MEDIA {mediaItem.NodeId}: " +
                        "parent not migrated.");

                    continue;
                }

                mediaParentId = mappedParentId;
            }

            // Unlike content types/content elsewhere in this script, media
            // has no natural unique key to check against (no alias) - match
            // on name within the same parent instead, so re-running migrate
            // doesn't create a fresh duplicate set every time, and so an
            // item created by an earlier broken run (e.g. before
            // SourceMediaRootPath was fixed) gets its file filled in now
            // instead of being skipped as "already there".
            var existingSiblings =
                mediaService.GetPagedChildren(
                    mediaParentId,
                    0,
                    int.MaxValue,
                    out _);

            var media =
                existingSiblings.FirstOrDefault(x => x.Name == mediaItem.Name);

            if (media != null)
            {
                Console.WriteLine(
                    $"EXISTS MEDIA: {mediaItem.NodeId} -> {mediaItem.Name}");
            }
            else
            {
                media =
                    mediaService.CreateMedia(
                        mediaItem.Name,
                        mediaParentId,
                        mediaItem.MediaTypeAlias);
            }

            if (sourceMediaFileValues.TryGetValue(
                    mediaItem.NodeId,
                    out var rawFileValue))
            {
                var relativePath =
                    ExtractMediaSrc(rawFileValue);

                if (!string.IsNullOrWhiteSpace(relativePath))
                {
                    var trimmedPath =
                        relativePath.TrimStart('~').TrimStart('/');

                    if (trimmedPath.StartsWith(
                            "media/",
                            StringComparison.OrdinalIgnoreCase))
                    {
                        trimmedPath =
                            trimmedPath["media/".Length..];
                    }

                    var physicalPath =
                        Path.Combine(
                            sourceMediaRootPath,
                            trimmedPath.Replace(
                                '/',
                                Path.DirectorySeparatorChar));

                    if (System.IO.File.Exists(physicalPath))
                    {
                        await using var fileStream =
                            System.IO.File.OpenRead(physicalPath);

                        media.SetValue(
                            mediaFileManager,
                            mediaUrlGenerators,
                            shortStringHelper,
                            contentTypeBaseServiceProvider,
                            "umbracoFile",
                            Path.GetFileName(physicalPath),
                            fileStream);

                        mediaFileCopiedCount++;
                    }
                    else
                    {
                        Console.WriteLine(
                            $"NOTE MEDIA {mediaItem.NodeId}: " +
                            $"file not found at {physicalPath}");
                    }
                }
            }

            var mediaSaveResult =
                mediaService.Save(media);

            if (!mediaSaveResult.Success)
            {
                Console.WriteLine(
                    $"FAILED MEDIA: {mediaItem.NodeId}");

                continue;
            }

            mediaMap[mediaItem.NodeId] =
                media.Id;

            mediaCreatedCount++;

            Console.WriteLine(
                $"CREATED MEDIA: " +
                $"{mediaItem.NodeId} -> {mediaItem.Name}");
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"ERROR MEDIA {mediaItem.NodeId}: " +
                ex.Message);
        }
    }

    Console.WriteLine(
        $"Created {mediaCreatedCount} of {sourceMediaItems.Count} " +
        $"media items ({mediaFileCopiedCount} files copied).");

    // ========================================================
    // STEP 2
    // PROPERTY GROUPS
    // ========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 2 - PROPERTY GROUPS");
    Console.WriteLine("=================================================");

    var propertyGroups =
        await GetPropertyGroupsAsync(source);

    Console.WriteLine(
        $"Found {propertyGroups.Count} property groups.");

    // Every cmsPropertyTypeGroup row in Umbraco 8 is a top-level Tab (v8 has
    // no Tab/Group nesting - the table has no parent column). Umbraco 16's
    // AddPropertyType convenience overload used in STEP 3/3B below only
    // creates a loose Group nested under an implicit "Generic" tab when
    // given a bare name - it does NOT recreate a real Tab, which is why the
    // Design canvas can end up looking empty/unstructured for content types
    // that had real tabs in v8. Explicitly create a Tab-type PropertyGroup
    // per source group here instead, and hand STEP 3/3B its alias.
    var propertyGroupAliasMap =
        new Dictionary<(int ContentTypeId, int SourceGroupId), string>();

    var propertyGroupTabsCreated = 0;

    foreach (var grouping in propertyGroups.GroupBy(x => x.ContentTypeId))
    {
        if (!contentTypeMap.TryGetValue(
                grouping.Key,
                out var contentTypeAlias))
        {
            continue;
        }

        var contentType =
            contentTypeService.Get(contentTypeAlias);

        if (contentType == null)
        {
            continue;
        }

        var changed = false;

        foreach (var sourceGroup in grouping)
        {
            var groupAlias =
                shortStringHelper.CleanStringForSafeAlias(sourceGroup.Name);

            if (string.IsNullOrWhiteSpace(groupAlias))
            {
                continue;
            }

            var existingGroup =
                contentType.PropertyGroups
                    .FirstOrDefault(x =>
                        x.Alias.Equals(
                            groupAlias,
                            StringComparison.OrdinalIgnoreCase));

            if (existingGroup == null)
            {
                contentType.AddPropertyGroup(groupAlias, sourceGroup.Name);

                existingGroup =
                    contentType.PropertyGroups
                        .FirstOrDefault(x =>
                            x.Alias.Equals(
                                groupAlias,
                                StringComparison.OrdinalIgnoreCase));

                if (existingGroup != null)
                {
                    existingGroup.Type = PropertyGroupType.Tab;
                    existingGroup.SortOrder = sourceGroup.SortOrder;

                    changed = true;
                    propertyGroupTabsCreated++;
                }
            }

            propertyGroupAliasMap[(grouping.Key, sourceGroup.Id)] =
                groupAlias;
        }

        if (changed)
        {
            contentTypeService.Save(contentType);
        }
    }

    Console.WriteLine(
        $"Created {propertyGroupTabsCreated} property group tab(s).");

    // ========================================================
    // STEP 3
    // PROPERTIES
    // ========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 3 - PROPERTIES");
    Console.WriteLine("=================================================");

    var properties =
        await GetPropertiesAsync(source);

    Console.WriteLine(
        $"Found {properties.Count} properties.");

    // Legacy int data type IDs are only meaningful within the v8 source
    // database - the target database's system data types get their own,
    // unrelated auto-incremented IDs on install, so an ID-to-ID match finds
    // almost nothing. Match by property EDITOR ALIAS instead (e.g.
    // "Umbraco.TextBox"), which is stable across versions for most editors.
    var sourceDataTypes =
        (await GetDataTypesAsync(source))
            .ToDictionary(x => x.NodeId);

    var allTargetDataTypes =
        (await dataTypeService.GetAllAsync()).ToList();

    var targetDataTypesByEditorAlias =
        allTargetDataTypes
            .GroupBy(x => x.EditorAlias, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.First(),
                StringComparer.OrdinalIgnoreCase);

    // DataType.EditorAlias (e.g. "Umbraco.BlockList") is the legacy storage-
    // format alias and is all the DataType(editor, serializer) constructor
    // below sets on its own. The v16 backoffice's client-side editor UI is
    // looked up separately, by DataType.EditorUiAlias (e.g.
    // "Umb.PropertyEditorUi.BlockList") - leaving it unset is what produces
    // "This property editor UI is missing" when a Data Type this migration
    // created is opened. There's no server-side API or constant for this
    // mapping; it's extracted from the built-in backoffice client bundle
    // (Umbraco.Cms.StaticAssets package, packages/*/manifests.js,
    // propertyEditorSchema entries' defaultPropertyEditorUiAlias field).
    var editorUiAliases =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Umbraco.BlockList"] = "Umb.PropertyEditorUi.BlockList",
            ["Umbraco.BlockGrid"] = "Umb.PropertyEditorUi.BlockGrid",
            ["Umbraco.CheckBoxList"] = "Umb.PropertyEditorUi.CheckBoxList",
            ["Umbraco.ColorPicker"] = "Umb.PropertyEditorUi.ColorPicker",
            ["Umbraco.ColorPicker.EyeDropper"] = "Umb.PropertyEditorUi.EyeDropper",
            ["Umbraco.ContentPicker"] = "Umb.PropertyEditorUi.DocumentPicker",
            ["Umbraco.DateTime"] = "Umb.PropertyEditorUi.DatePicker",
            ["Umbraco.Decimal"] = "Umb.PropertyEditorUi.Decimal",
            ["Umbraco.DropDown.Flexible"] = "Umb.PropertyEditorUi.Dropdown",
            ["Umbraco.EmailAddress"] = "Umb.PropertyEditorUi.EmailAddress",
            ["Umbraco.ImageCropper"] = "Umb.PropertyEditorUi.ImageCropper",
            ["Umbraco.Integer"] = "Umb.PropertyEditorUi.Integer",
            ["Umbraco.Label"] = "Umb.PropertyEditorUi.Label",
            ["Umbraco.ListView"] = "Umb.PropertyEditorUi.Collection",
            ["Umbraco.MarkdownEditor"] = "Umb.PropertyEditorUi.MarkdownEditor",
            ["Umbraco.MediaPicker3"] = "Umb.PropertyEditorUi.MediaPicker",
            ["Umbraco.MemberGroupPicker"] = "Umb.PropertyEditorUi.MemberGroupPicker",
            ["Umbraco.MemberPicker"] = "Umb.PropertyEditorUi.MemberPicker",
            ["Umbraco.MultiNodeTreePicker"] = "Umb.PropertyEditorUi.ContentPicker",
            ["Umbraco.MultiUrlPicker"] = "Umb.PropertyEditorUi.MultiUrlPicker",
            ["Umbraco.MultipleTextstring"] = "Umb.PropertyEditorUi.MultipleTextString",
            ["Umbraco.RadioButtonList"] = "Umb.PropertyEditorUi.RadioButtonList",
            ["Umbraco.RichText"] = "Umb.PropertyEditorUi.Tiptap",
            ["Umbraco.Slider"] = "Umb.PropertyEditorUi.Slider",
            ["Umbraco.Tags"] = "Umb.PropertyEditorUi.Tags",
            ["Umbraco.TextArea"] = "Umb.PropertyEditorUi.TextArea",
            ["Umbraco.TextBox"] = "Umb.PropertyEditorUi.TextBox",
            ["Umbraco.TrueFalse"] = "Umb.PropertyEditorUi.Toggle",
            ["Umbraco.UploadField"] = "Umb.PropertyEditorUi.UploadField",
            ["Umbraco.UserPicker"] = "Umb.PropertyEditorUi.UserPicker",
        };

    // Self-heal: a run of this migration before EditorUiAlias was set below
    // may have already created Data Types (including one "Migrated Block
    // List - X.Y" per Nested Content property in STEP 3B) with a blank
    // EditorUiAlias. Re-running the migration wouldn't otherwise touch them
    // again, since they're found as already-existing further down - fix them
    // here instead so re-running against an already-migrated database
    // repairs the backoffice, not just a fresh one.
    foreach (var existingDataType in allTargetDataTypes)
    {
        if (string.IsNullOrEmpty(existingDataType.EditorUiAlias) &&
            editorUiAliases.TryGetValue(
                existingDataType.EditorAlias,
                out var healedUiAlias))
        {
            existingDataType.EditorUiAlias = healedUiAlias;

            await dataTypeService.UpdateAsync(
                existingDataType,
                Constants.Security.SuperUserKey);

            Console.WriteLine(
                $"HEALED DATATYPE UI ALIAS: {existingDataType.Name} -> " +
                healedUiAlias);
        }
    }

    // A handful of editor aliases were renamed between v8 and modern Umbraco.
    // Umbraco.TinyMCE -> Umbraco.RichText is the big one: the Rich Text
    // Editor is used on almost every content type, so without this remap
    // nearly every RTE property across the whole site gets silently
    // skipped.
    var editorAliasRemap =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Umbraco.TextboxMultiple"] = "Umbraco.TextArea",
            ["Umbraco.MediaPicker"] = "Umbraco.MediaPicker3",
            ["Umbraco.MultipleMediaPicker"] = "Umbraco.MediaPicker3",
            ["Umbraco.TinyMCE"] = "Umbraco.RichText",
            // Umbraco.Grid was removed in v16 (replaced by Block Grid, a
            // different value format with no reliable automated layout
            // conversion). Rather than lose the content, properties land on
            // the built-in RichText editor instead, and STEP 5 below
            // flattens each Grid property's rows/areas/controls into plain
            // HTML (rte/textstring/headline/quote text, media as <img>) when
            // it applies values - content over exact layout.
            ["Umbraco.Grid"] = "Umbraco.RichText",
        };

    // These editors still exist in Umbraco 16, but a fresh install doesn't
    // seed a default Data Type for them (unlike Textstring/RichText/Date/
    // etc.) - create one on demand instead of skipping every property that
    // uses them. Umbraco.NestedContent is genuinely gone in v16 (replaced by
    // Block List) and is NOT here - see STEP 3B below, which converts it to
    // a real Block List Data Type instead of just remapping the alias.
    var autoCreatableEditorAliases =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Umbraco.Decimal",
            "Umbraco.MultipleTextstring",
        };

    var unresolvedEditorAliases =
        new SortedSet<string>(StringComparer.OrdinalIgnoreCase);

    foreach (var property in properties)
    {
        try
        {
            if (!contentTypeMap.TryGetValue(
                    property.ContentTypeId,
                    out var contentTypeAlias))
            {
                Console.WriteLine(
                    $"SKIP PROPERTY {property.Alias}: " +
                    "content type not migrated.");

                continue;
            }

            var contentType =
                contentTypeService.Get(contentTypeAlias);

            if (contentType == null)
            {
                continue;
            }

            var existing =
                contentType.PropertyTypes
                    .FirstOrDefault(x =>
                        x.Alias.Equals(
                            property.Alias,
                            StringComparison.OrdinalIgnoreCase));

            if (existing != null)
            {
                // A run before STEP 2's Tab-type property groups existed
                // may have left this property under a loose auto-created
                // group instead of the real Tab created above - move it
                // now so re-running migrate against an already-populated
                // database still fixes the Design canvas, not just a
                // fresh one.
                var existingGroupAlias = "content";

                if (property.PropertyGroupId.HasValue &&
                    propertyGroupAliasMap.TryGetValue(
                        (property.ContentTypeId, property.PropertyGroupId.Value),
                        out var resolvedExistingGroupAlias))
                {
                    existingGroupAlias = resolvedExistingGroupAlias;
                }

                if (contentType.MovePropertyType(
                        property.Alias,
                        existingGroupAlias))
                {
                    contentTypeService.Save(contentType);

                    Console.WriteLine(
                        $"MOVED PROPERTY TO TAB: " +
                        $"{contentTypeAlias}.{property.Alias} -> " +
                        $"{existingGroupAlias}");
                }
                else
                {
                    Console.WriteLine(
                        $"EXISTS PROPERTY: " +
                        $"{contentTypeAlias}.{property.Alias}");
                }

                continue;
            }

            // ------------------------------------------------
            // Resolve the source datatype's editor alias, then find a
            // target datatype using the same (or remapped) editor alias.
            //
            // Negative IDs are NOT necessarily "system-only" - Umbraco
            // seeds its default data types (Richtext editor, Textstring,
            // Date, ...) with fixed negative IDs too, and those are normal,
            // editable properties. They still resolve fine via
            // sourceDataTypes below since GetDataTypesAsync doesn't filter
            // by sign; only a genuinely-missing lookup falls through to the
            // "not found" skip beneath this.
            // ------------------------------------------------

            if (!sourceDataTypes.TryGetValue(
                    property.DataTypeId,
                    out var sourceDataType))
            {
                Console.WriteLine(
                    $"SKIP PROPERTY: {property.Alias} " +
                    $"(source datatype {property.DataTypeId} not found)");

                continue;
            }

            var editorAlias =
                sourceDataType.EditorAlias;

            var resolvedEditorAlias =
                editorAliasRemap.TryGetValue(editorAlias, out var remappedAlias)
                    ? remappedAlias
                    : editorAlias;

            if (!targetDataTypesByEditorAlias.TryGetValue(
                    resolvedEditorAlias,
                    out var dataType) &&
                autoCreatableEditorAliases.Contains(resolvedEditorAlias) &&
                propertyEditors.TryGet(resolvedEditorAlias, out var editor))
            {
                editorUiAliases.TryGetValue(
                    resolvedEditorAlias,
                    out var newDataTypeUiAlias);

                var newDataType =
                    new DataType(editor, configurationEditorJsonSerializer)
                    {
                        Name = $"{resolvedEditorAlias} (migrated)",
                        EditorUiAlias = newDataTypeUiAlias
                    };

                var createResult =
                    await dataTypeService.CreateAsync(
                        newDataType,
                        Constants.Security.SuperUserKey);

                if (createResult.Success)
                {
                    dataType = createResult.Result;

                    targetDataTypesByEditorAlias[resolvedEditorAlias] =
                        dataType;

                    Console.WriteLine(
                        $"CREATED DATATYPE: {resolvedEditorAlias}");
                }
            }

            if (dataType == null)
            {
                unresolvedEditorAliases.Add(editorAlias);

                Console.WriteLine(
                    $"SKIP PROPERTY: {property.Alias} " +
                    $"(no target datatype for editor '{editorAlias}')");

                continue;
            }

            var groupAlias = "content";

            if (property.PropertyGroupId.HasValue &&
                propertyGroupAliasMap.TryGetValue(
                    (property.ContentTypeId, property.PropertyGroupId.Value),
                    out var resolvedGroupAlias))
            {
                groupAlias = resolvedGroupAlias;
            }

            var propertyType =
                new PropertyType(
                    shortStringHelper,
                    dataType,
                    property.Alias);

            propertyType.Name =
                string.IsNullOrWhiteSpace(property.Name)
                    ? property.Alias
                    : property.Name;

            propertyType.SortOrder =
                property.SortOrder;

            propertyType.Mandatory =
                property.Mandatory;

            propertyType.Description =
                property.Description;

            contentType.AddPropertyType(
                propertyType,
                groupAlias);

            contentTypeService.Save(contentType);

            Console.WriteLine(
                $"CREATED PROPERTY: " +
                $"{contentTypeAlias}.{property.Alias}");
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"ERROR PROPERTY " +
                $"{property.ContentTypeId}/" +
                $"{property.Alias}: {ex.Message}");
        }
    }

    // ========================================================
    // STEP 3B
    // NESTED CONTENT -> BLOCK LIST
    // ========================================================
    //
    // Umbraco.NestedContent has no equivalent Data Type to create in v16
    // (replaced by Block List, a different value format), so STEP 3 above
    // deliberately skips these properties. Rather than trust the v8 data
    // type's own prevalue/config (a schema we're not certain of on this DB -
    // guessing table names has already failed twice for cmsTemplate and
    // cmsDataType), the element types actually used are discovered directly
    // from the real stored JSON values, which is accurate regardless of
    // schema drift. STEP 5 below converts each item's JSON into Block
    // List's wire format when it applies property values.
    //
    // Known limitation: sub-property values are carried over as-is. Text/
    // richtext/number sub-properties transfer correctly since their raw
    // value format didn't change, but a media picker sub-property nested
    // inside a Nested Content item keeps its old v8 integer ID, which won't
    // resolve in v16's UDI-based MediaPicker3 format.

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 3B - NESTED CONTENT -> BLOCK LIST");
    Console.WriteLine("=================================================");

    propertyEditors.TryGet("Umbraco.BlockList", out var blockListEditor);

    var nestedContentProperties =
        properties
            .Where(p =>
                sourceDataTypes.TryGetValue(p.DataTypeId, out var dt) &&
                dt.EditorAlias.Equals(
                    "Umbraco.NestedContent",
                    StringComparison.OrdinalIgnoreCase))
            .ToList();

    Console.WriteLine(
        $"Found {nestedContentProperties.Count} Nested Content properties.");

    // property.Id (source cmsPropertyType.id) -> target Block List IDataType.
    // Populated below and reused in STEP 5 to know which values need
    // converting instead of copying straight across.
    var nestedContentDataTypes =
        new Dictionary<int, IDataType>();

    if (nestedContentProperties.Count == 0)
    {
        // nothing to do
    }
    else if (blockListEditor == null)
    {
        Console.WriteLine(
            "SKIP: Umbraco.BlockList editor not found - " +
            "Nested Content properties will stay empty.");
    }
    else
    {
        var allPropertyValues =
            await GetPropertyValuesAsync(source);

        foreach (var property in nestedContentProperties)
        {
            try
            {
                if (!contentTypeMap.TryGetValue(
                        property.ContentTypeId,
                        out var contentTypeAlias))
                {
                    continue;
                }

                var elementTypeAliases =
                    new SortedSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (var value in allPropertyValues)
                {
                    if (value.PropertyTypeId != property.Id ||
                        string.IsNullOrWhiteSpace(value.TextValue))
                    {
                        continue;
                    }

                    try
                    {
                        using var doc =
                            JsonDocument.Parse(value.TextValue);

                        if (doc.RootElement.ValueKind != JsonValueKind.Array)
                            continue;

                        foreach (var item in doc.RootElement.EnumerateArray())
                        {
                            if (item.TryGetProperty(
                                    "ncContentTypeAlias",
                                    out var aliasEl) &&
                                aliasEl.ValueKind == JsonValueKind.String)
                            {
                                elementTypeAliases.Add(aliasEl.GetString()!);
                            }
                        }
                    }
                    catch (JsonException)
                    {
                        // Not valid JSON for this value - other items for
                        // the same property can still convert fine.
                    }
                }

                if (elementTypeAliases.Count == 0)
                {
                    Console.WriteLine(
                        $"SKIP NESTED CONTENT: {contentTypeAlias}.{property.Alias} " +
                        "(no items found to infer element types from)");

                    continue;
                }

                // ConfigurationObject on DataType is a read-only value
                // computed FROM ConfigurationData - the raw dictionary shape
                // the Block List config editor's JSON round-trips into
                // ({"blocks":[{"contentElementTypeKey":"<guid>"}]}), so that
                // raw dictionary is what actually gets set below.
                var blockConfigs =
                    new List<Dictionary<string, object>>();

                foreach (var elementAlias in elementTypeAliases)
                {
                    var elementType =
                        contentTypeService.Get(elementAlias);

                    if (elementType == null)
                    {
                        Console.WriteLine(
                            $"SKIP NESTED CONTENT ELEMENT: {elementAlias} " +
                            "(content type not migrated)");

                        continue;
                    }

                    if (!elementType.IsElement)
                    {
                        elementType.IsElement = true;
                        contentTypeService.Save(elementType);
                    }

                    blockConfigs.Add(
                        new Dictionary<string, object>
                        {
                            ["contentElementTypeKey"] =
                                elementType.Key.ToString()
                        });
                }

                if (blockConfigs.Count == 0)
                {
                    continue;
                }

                var newDataType =
                    new DataType(blockListEditor, configurationEditorJsonSerializer)
                    {
                        Name =
                            $"Migrated Block List - {contentTypeAlias}.{property.Alias}",
                        EditorUiAlias = "Umb.PropertyEditorUi.BlockList",
                        ConfigurationData =
                            new Dictionary<string, object>
                            {
                                ["blocks"] = blockConfigs
                            }
                    };

                var createResult =
                    await dataTypeService.CreateAsync(
                        newDataType,
                        Constants.Security.SuperUserKey);

                if (!createResult.Success)
                {
                    Console.WriteLine(
                        $"ERROR CREATE BLOCKLIST DATATYPE: " +
                        $"{contentTypeAlias}.{property.Alias} - " +
                        $"{createResult.Status}");

                    continue;
                }

                nestedContentDataTypes[property.Id] =
                    createResult.Result;

                Console.WriteLine(
                    $"CREATED BLOCKLIST DATATYPE: " +
                    $"{contentTypeAlias}.{property.Alias} " +
                    $"({blockConfigs.Count} element type(s))");
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"ERROR NESTED CONTENT DATATYPE " +
                    $"{property.ContentTypeId}/{property.Alias}: {ex.Message}");
            }
        }

        // Now add the actual PropertyType to each content type, same
        // pattern as STEP 3, using the new Block List Data Type.
        foreach (var property in nestedContentProperties)
        {
            if (!nestedContentDataTypes.TryGetValue(
                    property.Id,
                    out var dataType))
            {
                continue;
            }

            try
            {
                if (!contentTypeMap.TryGetValue(
                        property.ContentTypeId,
                        out var contentTypeAlias))
                {
                    continue;
                }

                var contentType =
                    contentTypeService.Get(contentTypeAlias);

                if (contentType == null)
                    continue;

                var existing =
                    contentType.PropertyTypes
                        .FirstOrDefault(x =>
                            x.Alias.Equals(
                                property.Alias,
                                StringComparison.OrdinalIgnoreCase));

                var groupAlias = "content";

                if (property.PropertyGroupId.HasValue &&
                    propertyGroupAliasMap.TryGetValue(
                        (property.ContentTypeId, property.PropertyGroupId.Value),
                        out var resolvedGroupAlias))
                {
                    groupAlias = resolvedGroupAlias;
                }

                if (existing != null)
                {
                    // Same self-healing move as STEP 3 above - re-parent
                    // properties left under a loose group by an earlier
                    // run into the real Tab created in STEP 2.
                    if (contentType.MovePropertyType(
                            property.Alias,
                            groupAlias))
                    {
                        contentTypeService.Save(contentType);
                    }

                    continue;
                }

                var propertyType =
                    new PropertyType(shortStringHelper, dataType, property.Alias)
                    {
                        Name =
                            string.IsNullOrWhiteSpace(property.Name)
                                ? property.Alias
                                : property.Name,
                        SortOrder = property.SortOrder,
                        Mandatory = property.Mandatory,
                        Description = property.Description
                    };

                contentType.AddPropertyType(
                    propertyType,
                    groupAlias);

                contentTypeService.Save(contentType);

                Console.WriteLine(
                    $"CREATED NESTED CONTENT PROPERTY: " +
                    $"{contentTypeAlias}.{property.Alias}");
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"ERROR NESTED CONTENT PROPERTY " +
                    $"{property.ContentTypeId}/{property.Alias}: {ex.Message}");
            }
        }
    }

    // ========================================================
    // STEP 4
    // CONTENT
    // ========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 4 - CONTENT");
    Console.WriteLine("=================================================");

    var sourceContent =
        await GetContentAsync(source);

    Console.WriteLine(
        $"Found {sourceContent.Count} content records.");

    // Source Umbraco 8 node ID
    // ->
    // Target Umbraco 16 content GUID
    var contentMap =
        new Dictionary<int, Guid>();

    // GetRootContent()/GetPagedChildren() below only search LIVE content -
    // they don't see anything sitting in the Recycle Bin. If a node this
    // migration already created was manually trashed since the last run
    // (e.g. cleaning up duplicates from before the idempotency check
    // existed), the live-only search below finds nothing and creates
    // *another* duplicate instead of reusing/restoring the one already
    // there. Check the bin too, and restore a match instead of duplicating.
    IContent? FindTrashedMatch(string name, string typeAlias)
    {
        var trashed =
            contentService.GetPagedContentInRecycleBin(
                0,
                10000,
                out _);

        return trashed.FirstOrDefault(c =>
            c.Name == name &&
            c.ContentType.Alias.Equals(
                typeAlias,
                StringComparison.OrdinalIgnoreCase));
    }

    // --------------------------------------------------------
    // Create parents before children.
    // --------------------------------------------------------

    foreach (var item in sourceContent
        .OrderBy(x => x.Level)
        .ThenBy(x => x.SortOrder)
        .ThenBy(x => x.NodeId))
    {
        try
        {
            if (!contentTypeMap.TryGetValue(
                    item.ContentTypeId,
                    out var contentTypeAlias))
            {
                Console.WriteLine(
                    $"SKIP CONTENT {item.NodeId}: " +
                    "content type not mapped.");

                continue;
            }

            // ------------------------------------------------
            // Check for an already-migrated match first. This step
            // previously had no idempotency check at all (unlike
            // STEP 1B/3, which do check), so every re-run of migrate
            // created a full duplicate copy of every content node -
            // confirmed via the schema command: umbracoDocument ended
            // up at ~13x the source row count after repeated runs.
            // Match on (parent, name, content type), the closest
            // available equivalent to a v8 source node's identity.
            // ------------------------------------------------

            IContent existingContent = null;

            if (item.ParentId <= 0)
            {
                existingContent =
                    contentService.GetRootContent()
                        .FirstOrDefault(c =>
                            c.Name == item.Name &&
                            c.ContentType.Alias.Equals(
                                contentTypeAlias,
                                StringComparison.OrdinalIgnoreCase));

                if (existingContent == null)
                {
                    var trashedMatch =
                        FindTrashedMatch(item.Name, contentTypeAlias);

                    if (trashedMatch != null)
                    {
                        contentService.Move(trashedMatch, -1);
                        existingContent = trashedMatch;

                        Console.WriteLine(
                            $"RESTORED FROM RECYCLE BIN: " +
                            $"{item.NodeId} -> {item.Name}");
                    }
                }
            }
            else if (contentMap.TryGetValue(
                item.ParentId,
                out var existingParentKey))
            {
                var parentContent =
                    contentService.GetById(existingParentKey);

                if (parentContent != null)
                {
                    existingContent =
                        contentService
                            .GetPagedChildren(
                                parentContent.Id,
                                0,
                                10000,
                                out _)
                            .FirstOrDefault(c =>
                                c.Name == item.Name &&
                                c.ContentType.Alias.Equals(
                                    contentTypeAlias,
                                    StringComparison.OrdinalIgnoreCase));

                    if (existingContent == null)
                    {
                        var trashedMatch =
                            FindTrashedMatch(item.Name, contentTypeAlias);

                        if (trashedMatch != null)
                        {
                            contentService.Move(
                                trashedMatch,
                                parentContent.Id);

                            existingContent = trashedMatch;

                            Console.WriteLine(
                                $"RESTORED FROM RECYCLE BIN: " +
                                $"{item.NodeId} -> {item.Name}");
                        }
                    }
                }
            }

            if (existingContent != null)
            {
                contentMap[item.NodeId] =
                    existingContent.Key;

                Console.WriteLine(
                    $"EXISTS CONTENT: " +
                    $"{item.NodeId} -> {item.Name}");

                continue;
            }

            IContent content;

            // ------------------------------------------------
            // ROOT CONTENT
            // ------------------------------------------------

            if (item.ParentId <= 0)
            {
                content =
                    contentService.Create(
                        item.Name,
                        -1,
                        contentTypeAlias);
            }
            else
            {
                // ------------------------------------------------
                // CHILD CONTENT
                // ------------------------------------------------

                if (!contentMap.TryGetValue(
                        item.ParentId,
                        out var parentKey))
                {
                    Console.WriteLine(
                        $"SKIP CONTENT {item.NodeId}: " +
                        $"parent {item.ParentId} not found.");

                    continue;
                }

                content =
                    contentService.Create(
                        item.Name,
                        parentKey,
                        contentTypeAlias);
            }

            content.Name = item.Name;

            var result =
                contentService.Save(content);

            if (!result.Success)
            {
                Console.WriteLine(
                    $"FAILED CONTENT: {item.NodeId}");

                continue;
            }

            contentMap[item.NodeId] =
                content.Key;

            Console.WriteLine(
                $"CREATED CONTENT: " +
                $"{item.NodeId} -> {item.Name}");
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"ERROR CONTENT {item.NodeId}: " +
                ex.Message);
        }
    }

    // ========================================================
    // STEP 5
    // PROPERTY VALUES
    // ========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 5 - PROPERTY VALUES");
    Console.WriteLine("=================================================");

    var propertyValues =
        await GetPropertyValuesAsync(source);

    Console.WriteLine(
        $"Found {propertyValues.Count} property values.");

    // Properties whose value needs converting rather than copying straight
    // across - populated in STEP 3B (Nested Content) and derived here from
    // the same source-editor-alias lookup STEP 3 uses (Grid).
    var gridPropertyIds =
        properties
            .Where(p =>
                sourceDataTypes.TryGetValue(p.DataTypeId, out var dt) &&
                dt.EditorAlias.Equals("Umbraco.Grid", StringComparison.OrdinalIgnoreCase))
            .Select(p => p.Id)
            .ToHashSet();

    var valuesByNode =
        propertyValues
            .GroupBy(x => x.NodeId);

    foreach (var nodeValues in valuesByNode)
    {
        try
        {
            if (!contentMap.TryGetValue(
                    nodeValues.Key,
                    out var targetKey))
            {
                continue;
            }

            var content =
                contentService.GetById(targetKey);

            if (content == null)
                continue;

            var changed = false;

            foreach (var value in nodeValues)
            {
                try
                {
                    var property =
                        content.Properties
                            .FirstOrDefault(x =>
                                x.Alias.Equals(
                                    value.Alias,
                                    StringComparison.OrdinalIgnoreCase));

                    if (property == null)
                    {
                        continue;
                    }

                    object? actualValue;

                    if (nestedContentDataTypes.ContainsKey(value.PropertyTypeId) &&
                        !string.IsNullOrWhiteSpace(value.TextValue))
                    {
                        actualValue =
                            ConvertNestedContentToBlockList(
                                value.TextValue,
                                alias => contentTypeService.Get(alias));
                    }
                    else if (gridPropertyIds.Contains(value.PropertyTypeId) &&
                        !string.IsNullOrWhiteSpace(value.TextValue))
                    {
                        actualValue =
                            ConvertGridToRichText(value.TextValue);
                    }
                    else
                    {
                        actualValue = GetValue(value);
                    }

                    if (actualValue == null)
                        continue;

                    property.SetValue(actualValue);

                    changed = true;

                    Console.WriteLine(
                        $"VALUE: {nodeValues.Key} / " +
                        $"{value.Alias}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine(
                        $"ERROR VALUE " +
                        $"{nodeValues.Key}/{value.Alias}: " +
                        ex.Message);
                }
            }

            if (changed)
            {
                contentService.Save(content);

                Console.WriteLine(
                    $"SAVED VALUES: {nodeValues.Key}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"ERROR NODE {nodeValues.Key}: " +
                ex.Message);
        }
    }

    // ========================================================
    // STEP 5B
    // PUBLISH CONTENT
    // ========================================================
    //
    // contentService.Save() above only ever writes a draft. Umbraco does
    // not serve draft content on the live site, so without this step
    // every migrated page 404s despite existing in the content tree.
    // contentMap was populated in parent-before-child order (STEP 4), and
    // Dictionary preserves insertion order in practice, so iterating it
    // publishes parents before their children.

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 5B - PUBLISH CONTENT");
    Console.WriteLine("=================================================");

    var publishedCount = 0;
    var processedCount = 0;

    foreach (var targetKey in contentMap.Values)
    {
        processedCount++;

        try
        {
            var content =
                contentService.GetById(targetKey);

            if (content == null || content.Published)
            {
                continue;
            }

            var publishResult =
                contentService.Publish(content, new[] { "*" });

            if (publishResult.Success)
            {
                publishedCount++;
            }
            else
            {
                Console.WriteLine(
                    $"FAILED PUBLISH: {targetKey} - " +
                    $"{publishResult.Result}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"ERROR PUBLISH {targetKey}: " +
                ex.Message);
        }

        // Publishing does real per-item work (cache/index updates), so it's
        // much slower than the earlier bulk-save steps - print progress
        // regularly instead of going silent for a long, unpredictable time.
        if (processedCount % 25 == 0 ||
            processedCount == contentMap.Count)
        {
            Console.WriteLine(
                $"... {processedCount}/{contentMap.Count} processed, " +
                $"{publishedCount} published so far");
        }
    }

    Console.WriteLine(
        $"Published {publishedCount} of {contentMap.Count} content items.");

    // ========================================================
    // STEP 6
    // DICTIONARY
    // ========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 6 - DICTIONARY");
    Console.WriteLine("=================================================");

    var dictionaries =
        await GetDictionaryAsync(source);

    Console.WriteLine(
        $"Found {dictionaries.Count} dictionary items.");

    foreach (var dictionary in dictionaries)
    {
        Console.WriteLine(
            $"DICTIONARY: {dictionary.Key}");
    }

    // ========================================================
    // STEP 7
    // USERS
    // ========================================================
    //
    // Password hashes are NOT migrated - Umbraco 8 and 16 use different
    // hashing schemes, so copying the hash bytes would produce a login
    // that looks migrated but doesn't actually work. Each migrated user
    // gets a fresh Umbraco-generated initial password instead (printed
    // below), not a working v8 password - they (or whoever administers
    // this) need that password or a reset link to actually log in.
    //
    // The whole step is wrapped in one try/catch: umbracoUser/
    // umbracoUserGroup/umbracoUser2UserGroup column names are trusted at
    // face value here (unlike cmsTemplate/cmsDataType, which turned out
    // to differ from assumptions on this exact database) - if they're
    // wrong too, this logs a clear error and the rest of migrate still
    // completes rather than crashing over user accounts.

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 7 - USERS");
    Console.WriteLine("=================================================");

    try
    {
        var userGroupService =
            app.Services.GetRequiredService<IUserGroupService>();

        var userService =
            app.Services.GetRequiredService<IUserService>();

        var sourceUserGroups =
            await GetUserGroupsAsync(source);

        Console.WriteLine(
            $"Found {sourceUserGroups.Count} user groups.");

        var userGroupMap =
            new Dictionary<int, Guid>();

        foreach (var group in sourceUserGroups)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(group.Alias))
                {
                    continue;
                }

                var existingGroup =
                    await userGroupService.GetAsync(group.Alias);

                if (existingGroup != null)
                {
                    userGroupMap[group.Id] =
                        existingGroup.Key;

                    Console.WriteLine(
                        $"EXISTS USER GROUP: {group.Alias}");

                    continue;
                }

                var newGroup =
                    new UserGroup(
                        shortStringHelper,
                        0,
                        group.Alias,
                        string.IsNullOrWhiteSpace(group.Name)
                            ? group.Alias
                            : group.Name,
                        "icon-users");

                var createGroupResult =
                    await userGroupService.CreateAsync(
                        newGroup,
                        Constants.Security.SuperUserKey);

                if (!createGroupResult.Success)
                {
                    Console.WriteLine(
                        $"ERROR CREATE USER GROUP: {group.Alias} - " +
                        $"{createGroupResult.Status}");

                    continue;
                }

                userGroupMap[group.Id] =
                    createGroupResult.Result.Key;

                Console.WriteLine(
                    $"CREATED USER GROUP: {group.Alias}");
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"ERROR USER GROUP {group.Id}: {ex.Message}");
            }
        }

        var sourceUsers =
            await GetUsersAsync(source);

        Console.WriteLine(
            $"Found {sourceUsers.Count} users.");

        var sourceMemberships =
            await GetUserGroupMembershipsAsync(source);

        var existingUsersByEmail =
            userService
                .GetAll(
                    0,
                    1000,
                    out _,
                    "Username",
                    Direction.Ascending,
                    null,
                    null,
                    null)
                .Where(u => !string.IsNullOrWhiteSpace(u.Email))
                .GroupBy(u => u.Email, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.Key,
                    g => g.First().Key,
                    StringComparer.OrdinalIgnoreCase);

        foreach (var user in sourceUsers)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(user.Email))
                {
                    Console.WriteLine(
                        $"SKIP USER {user.Id}: no email.");

                    continue;
                }

                if (existingUsersByEmail.ContainsKey(user.Email))
                {
                    Console.WriteLine(
                        $"EXISTS USER: {user.Email}");

                    continue;
                }

                var groupKeys =
                    sourceMemberships
                        .Where(m => m.UserId == user.Id)
                        .Select(m =>
                            userGroupMap.TryGetValue(
                                m.UserGroupId,
                                out var key)
                                ? key
                                : (Guid?)null)
                        .Where(k => k.HasValue)
                        .Select(k => k!.Value)
                        .ToHashSet();

                var model =
                    new UserCreateModel
                    {
                        Name =
                            string.IsNullOrWhiteSpace(user.Name)
                                ? user.Email
                                : user.Name,
                        Email = user.Email,
                        UserName =
                            string.IsNullOrWhiteSpace(user.Login)
                                ? user.Email
                                : user.Login,
                        Kind = UserKind.Default,
                        UserGroupKeys = groupKeys
                    };

                var createResult =
                    await userService.CreateAsync(
                        Constants.Security.SuperUserKey,
                        model,
                        approveUser: true);

                if (!createResult.Success)
                {
                    Console.WriteLine(
                        $"ERROR CREATE USER: {user.Email} - " +
                        $"{createResult.Status}");

                    continue;
                }

                Console.WriteLine(
                    $"CREATED USER: {user.Email} " +
                    $"(initial password: {createResult.Result.InitialPassword})");
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"ERROR USER {user.Id}/{user.Email}: {ex.Message}");
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"ERROR STEP 7 USERS: {ex.Message}");
        Console.WriteLine(
            "Skipping user migration - the rest of migrate will continue.");
    }

    // ========================================================
    // RESULT
    // ========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("MIGRATION FINISHED");
    Console.WriteLine("=================================================");

    Console.WriteLine(
        $"Content types created/found : {contentTypeMap.Count}");

    Console.WriteLine(
        $"Content created             : {contentMap.Count}");

    Console.WriteLine(
        $"Property values read        : {propertyValues.Count}");

    Console.WriteLine(
        $"Dictionary items read       : {dictionaries.Count}");

    if (unresolvedEditorAliases.Count > 0)
    {
        Console.WriteLine();
        Console.WriteLine(
            "Editor aliases with no matching target datatype " +
            "(create one in the backoffice with this editor, then " +
            "re-run migrate to fill in those properties):");

        foreach (var alias in unresolvedEditorAliases)
        {
            Console.WriteLine($"  - {alias}");
        }
    }

    Console.WriteLine();
    Console.WriteLine(
        "Migration command completed.");

    return;
}

// ============================================================
// SCHEMA COMMAND
// ============================================================
//
// Deliberately NOT a v8-table -> v16-table name mapping. There isn't a
// reliable 1:1 correspondence to guess at - the schema changed too much
// between versions (cmsTemplate losing its master/design columns and
// cmsDataType not existing at all under that name, both discovered the
// hard way earlier in this migration, are exactly the kind of surprise
// a guessed mapping would produce more of). Instead this lists both
// databases' REAL tables and row counts side by side, so the actual
// schema can be checked directly instead of assumed.

if (args.Length > 0 &&
    args[0].Equals("schema", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" DATABASE SCHEMA - SOURCE (v8) vs TARGET (v16)");
    Console.WriteLine("=================================================");

    await using var source =
        new SqlConnection(sourceConnectionString);

    await source.OpenAsync();

    await using var target =
        new SqlConnection(targetConnectionString);

    await target.OpenAsync();

    var sourceTables = await GetTableListAsync(source);
    var targetTables = await GetTableListAsync(target);

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine($"SOURCE (v8) - {sourceTables.Count} tables");
    Console.WriteLine("=================================================");

    foreach (var t in sourceTables)
    {
        Console.WriteLine($"  {t.Name,-45} {t.RowCount,12:N0} rows");
    }

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine($"TARGET (v16) - {targetTables.Count} tables");
    Console.WriteLine("=================================================");

    foreach (var t in targetTables)
    {
        Console.WriteLine($"  {t.Name,-45} {t.RowCount,12:N0} rows");
    }

    var sourceNames =
        sourceTables
            .Select(t => t.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    var sameNameBothSides =
        targetTables
            .Select(t => t.Name)
            .Where(sourceNames.Contains)
            .OrderBy(x => x)
            .ToList();

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(
        $"SAME TABLE NAME ON BOTH SIDES - {sameNameBothSides.Count}");
    Console.WriteLine(
        "(a starting point only - most v8 tables were renamed or");
    Console.WriteLine(
        "restructured rather than kept verbatim, so an unmatched v8");
    Console.WriteLine(
        "table here doesn't necessarily mean data was lost.)");
    Console.WriteLine("=================================================");

    foreach (var name in sameNameBothSides)
    {
        Console.WriteLine($"  {name}");
    }

    Console.WriteLine();
    Console.WriteLine("Schema listing complete.");

    return;
}

// ============================================================
// NORMAL UMBRACO STARTUP
// ============================================================

app.UseUmbraco()
    .WithMiddleware(u =>
    {
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

static async Task<List<SourceDataType>> GetDataTypesAsync(
    SqlConnection connection)
{
    var result = new List<SourceDataType>();

    // Table/column naming for this drifted a version or two ago (this DB
    // has no cmsDataType, unlike the otherwise-matching cmsContentType /
    // cmsPropertyType / cmsPropertyTypeGroup). Discover the real names via
    // INFORMATION_SCHEMA instead of hardcoding another guess, and never
    // let a schema surprise here take down the rest of the migration.
    try
    {
        var tableName =
            await ResolveSchemaNameAsync(
                connection,
                view: "TABLES",
                nameColumn: "TABLE_NAME",
                tableFilter: null,
                candidates: ["cmsDataType", "umbracoDataType"]);

        if (tableName == null)
        {
            Console.WriteLine(
                "WARNING: no data type table found " +
                "(tried cmsDataType, umbracoDataType) - " +
                "properties will be created without a matched editor.");

            return result;
        }

        var editorAliasColumn =
            await ResolveSchemaNameAsync(
                connection,
                view: "COLUMNS",
                nameColumn: "COLUMN_NAME",
                tableFilter: tableName,
                candidates: ["propertyEditorAlias", "editorAlias"])
            ?? "propertyEditorAlias";

        var sql =
            $"""
            SELECT
                dt.nodeId,
                ISNULL(dt.{editorAliasColumn}, ''),
                ISNULL(n.text, '')
            FROM {tableName} dt
            INNER JOIN umbracoNode n
                ON n.id = dt.nodeId
            ORDER BY dt.nodeId
            """;

        await using var command =
            new SqlCommand(sql, connection);

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            result.Add(
                new SourceDataType(
                    reader.GetInt32(0),
                    reader.GetString(1),
                    reader.GetString(2)));
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"WARNING: could not read data types ({ex.Message}) - " +
            "properties will be created without a matched editor.");
    }

    return result;
}


static async Task<string?> ResolveSchemaNameAsync(
    SqlConnection connection,
    string view,
    string nameColumn,
    string? tableFilter,
    string[] candidates)
{
    var paramNames =
        candidates
            .Select((_, i) => $"@p{i}")
            .ToArray();

    var whereTable =
        tableFilter != null
            ? "TABLE_NAME = @table AND "
            : string.Empty;

    var sql =
        $"""
        SELECT TOP 1 {nameColumn}
        FROM INFORMATION_SCHEMA.{view}
        WHERE {whereTable}{nameColumn} IN ({string.Join(",", paramNames)})
        ORDER BY {nameColumn}
        """;

    await using var command =
        new SqlCommand(sql, connection);

    if (tableFilter != null)
    {
        command.Parameters.AddWithValue("@table", tableFilter);
    }

    for (var i = 0; i < candidates.Length; i++)
    {
        command.Parameters.AddWithValue(paramNames[i], candidates[i]);
    }

    return (await command.ExecuteScalarAsync()) as string;
}


static async Task<List<SourceTemplate>> GetTemplatesAsync(
    SqlConnection connection)
{
    var result = new List<SourceTemplate>();

    // This Umbraco 8 instance stores templates as files on disk
    // (~/Views/{alias}.cshtml) - cmsTemplate only has nodeId/alias, no
    // master/design columns. The master/child relationship lives in the
    // ordinary umbracoNode parent-child tree instead.
    const string sql = """
        SELECT
            t.nodeId,
            ISNULL(t.alias, ''),
            ISNULL(n.text, ''),
            n.parentId
        FROM cmsTemplate t
        INNER JOIN umbracoNode n
            ON n.id = t.nodeId
        ORDER BY
            n.level,
            t.nodeId
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        var parentId =
            reader.IsDBNull(3)
                ? (int?)null
                : reader.GetInt32(3);

        result.Add(
            new SourceTemplate(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2),
                parentId is > 0
                    ? parentId
                    : null));
    }

    // A template's parent node is only a "master" if that parent is
    // itself a template - it may just be the generic templates root.
    var templateNodeIds =
        result
            .Select(x => x.NodeId)
            .ToHashSet();

    return result
        .Select(x =>
            x.MasterId.HasValue &&
            templateNodeIds.Contains(x.MasterId.Value)
                ? x
                : x with { MasterId = null })
        .ToList();
}


static async Task<List<SourceDocumentTypeTemplate>>
    GetDocumentTypeTemplatesAsync(
        SqlConnection connection)
{
    var result = new List<SourceDocumentTypeTemplate>();

    const string sql = """
        SELECT
            contentTypeNodeId,
            templateNodeId,
            IsDefault
        FROM cmsDocumentType
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourceDocumentTypeTemplate(
                reader.GetInt32(0),
                reader.GetInt32(1),
                reader.GetBoolean(2)));
    }

    return result;
}


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


static async Task<List<SourceContentType>> GetContentTypesAsync(
    SqlConnection connection)
{
    var result = new List<SourceContentType>();

    // cmsContentType holds document types, media types AND member types in
    // the same table, distinguished only by the underlying node's object
    // type - filter to "a2cb7800-f571-4787-9638-bc48539a0efb" (Umbraco's
    // well-known Document Type GUID) so media types like the built-in
    // "Image" (umbracoFile/umbracoWidth/...) don't get migrated here as if
    // they were document types; they belong to IMediaTypeService instead.
    //
    // Name comes from umbracoNode.text (the real display name shown in the
    // backoffice tree) rather than cmsContentType.description, which is a
    // separate, usually-empty free-text field. n.parentId identifies which
    // document type folder (if any) the content type lives in.
    const string sql = """
        SELECT
            ct.nodeId,
            ISNULL(ct.alias, ''),
            ISNULL(n.text, ''),
            ISNULL(ct.icon, ''),
            ct.allowAtRoot,
            ISNULL(n.parentId, -1)
        FROM cmsContentType ct
        INNER JOIN umbracoNode n
            ON n.id = ct.nodeId
        WHERE n.nodeObjectType = 'a2cb7800-f571-4787-9638-bc48539a0efb'
        ORDER BY
            n.level,
            ct.nodeId
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourceContentType(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetBoolean(4),
                reader.GetInt32(5)));
    }

    return result;
}


static async Task<List<SourceContentTypeContainer>>
    GetContentTypeContainersAsync(
        SqlConnection connection)
{
    var result = new List<SourceContentTypeContainer>();

    // "2f7a2769-6b0b-4468-90dd-af42d64f7f16" is Umbraco's well-known
    // Document Type Container object type GUID - stable across versions,
    // so it identifies document type folders the same way in a v8 source
    // database as it does in modern Umbraco.
    const string sql = """
        SELECT
            n.id,
            ISNULL(n.parentId, -1),
            ISNULL(n.text, ''),
            n.level,
            n.sortOrder
        FROM umbracoNode n
        WHERE n.nodeObjectType = '2f7a2769-6b0b-4468-90dd-af42d64f7f16'
        ORDER BY
            n.level,
            n.sortOrder,
            n.id
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourceContentTypeContainer(
                reader.GetInt32(0),
                reader.GetInt32(1),
                reader.GetString(2),
                reader.GetInt32(3),
                reader.GetInt32(4)));
    }

    return result;
}


static async Task<List<SourceContentTypeComposition>>
    GetContentTypeCompositionsAsync(
        SqlConnection connection)
{
    var result = new List<SourceContentTypeComposition>();

    // childContentTypeId is the composing type (e.g. PageHome);
    // parentContentTypeId is the shared/composition type whose properties
    // it pulls in (e.g. a "Composition Section" type).
    const string sql = """
        SELECT
            childContentTypeId,
            parentContentTypeId
        FROM cmsContentType2ContentType
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourceContentTypeComposition(
                reader.GetInt32(0),
                reader.GetInt32(1)));
    }

    return result;
}


static async Task<List<SourceMedia>> GetMediaAsync(
    SqlConnection connection)
{
    var result = new List<SourceMedia>();

    // "b796f64c-1f99-4ffb-b886-4bf4bc011a9c" is Umbraco's well-known Media
    // object type GUID (as opposed to Document or Media Type). The media
    // type alias (Image, File, Folder, or a custom one) comes from the same
    // cmsContentType table content types use.
    const string sql = """
        SELECT
            n.id,
            ISNULL(n.parentId, -1),
            ISNULL(ct.alias, ''),
            ISNULL(n.text, ''),
            n.level,
            n.sortOrder
        FROM umbracoNode n
        INNER JOIN umbracoContent c
            ON c.nodeId = n.id
        INNER JOIN cmsContentType ct
            ON ct.nodeId = c.contentTypeId
        WHERE n.nodeObjectType = 'b796f64c-1f99-4ffb-b886-4bf4bc011a9c'
        ORDER BY
            n.level,
            n.sortOrder,
            n.id
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourceMedia(
                reader.GetInt32(0),
                reader.GetInt32(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetInt32(4),
                reader.GetInt32(5)));
    }

    return result;
}


static async Task<Dictionary<int, string>> GetMediaFileValuesAsync(
    SqlConnection connection)
{
    var result = new Dictionary<int, string>();

    // The umbracoFile property holds either a plain relative path
    // ("/media/1234/photo.jpg") or, when the Image Cropper editor is used,
    // a JSON blob with a "src" field - ExtractMediaSrc handles both.
    const string sql = """
        SELECT
            cv.nodeId,
            pd.varcharValue,
            pd.textValue
        FROM umbracoPropertyData pd
        INNER JOIN cmsPropertyType pt
            ON pt.id = pd.propertytypeid
        INNER JOIN umbracoContentVersion cv
            ON cv.id = pd.versionId
        WHERE pt.Alias = 'umbracoFile'
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        var nodeId = reader.GetInt32(0);

        var value =
            reader.IsDBNull(1)
                ? (reader.IsDBNull(2) ? null : reader.GetString(2))
                : reader.GetString(1);

        if (!string.IsNullOrWhiteSpace(value))
        {
            result[nodeId] = value;
        }
    }

    return result;
}


static string? ExtractMediaSrc(string raw)
{
    var trimmed = raw.TrimStart();

    if (trimmed.StartsWith('{'))
    {
        try
        {
            using var document = JsonDocument.Parse(raw);

            return document.RootElement.TryGetProperty("src", out var srcProperty)
                ? srcProperty.GetString()
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    return raw;
}


static async Task<List<SourcePropertyGroup>> GetPropertyGroupsAsync(
    SqlConnection connection)
{
    var result = new List<SourcePropertyGroup>();

    const string sql = """
        SELECT
            id,
            contenttypeNodeId,
            text,
            sortorder
        FROM cmsPropertyTypeGroup
        ORDER BY
            contenttypeNodeId,
            sortorder
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourcePropertyGroup(
                reader.GetInt32(0),
                reader.GetInt32(1),
                reader.GetString(2),
                reader.GetInt32(3)));
    }

    return result;
}


static async Task<List<SourceProperty>> GetPropertiesAsync(
    SqlConnection connection)
{
    var result = new List<SourceProperty>();

    const string sql = """
        SELECT
            id,
            dataTypeId,
            contentTypeId,
            propertyTypeGroupId,
            Alias,
            ISNULL(Name, ''),
            sortOrder,
            mandatory,
            ISNULL(Description, '')
        FROM cmsPropertyType
        ORDER BY
            contentTypeId,
            sortOrder
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourceProperty(
                reader.GetInt32(0),
                reader.GetInt32(1),
                reader.GetInt32(2),
                reader.IsDBNull(3)
                    ? null
                    : reader.GetInt32(3),
                reader.GetString(4),
                reader.GetString(5),
                reader.GetInt32(6),
                reader.GetBoolean(7),
                reader.GetString(8)));
    }

    return result;
}


static async Task<List<SourceContent>> GetContentAsync(
    SqlConnection connection)
{
    var result = new List<SourceContent>();

    const string sql = """
        SELECT
            n.id,
            ISNULL(n.parentId, -1),
            c.contentTypeId,
            ISNULL(n.text, ''),
            n.level,
            n.sortOrder
        FROM umbracoNode n
        INNER JOIN umbracoContent c
            ON c.nodeId = n.id
        ORDER BY
            n.level,
            n.sortOrder,
            n.id
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourceContent(
                reader.GetInt32(0),
                reader.GetInt32(1),
                reader.GetInt32(2),
                reader.GetString(3),
                reader.GetInt32(4),
                reader.GetInt32(5)));
    }

    return result;
}


static async Task<List<SourcePropertyValue>>
    GetPropertyValuesAsync(
        SqlConnection connection)
{
    var result =
        new List<SourcePropertyValue>();

    const string sql = """
        SELECT
            pt.id,
            cv.nodeId,
            pt.Alias,
            pd.varcharValue,
            pd.textValue,
            pd.intValue,
            pd.decimalValue,
            pd.dateValue
        FROM umbracoPropertyData pd
        INNER JOIN cmsPropertyType pt
            ON pt.id = pd.propertytypeid
        INNER JOIN umbracoContentVersion cv
            ON cv.id = pd.versionId
        ORDER BY
            cv.nodeId,
            pt.sortOrder
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourcePropertyValue(
                reader.GetInt32(0),
                reader.GetInt32(1),
                reader.GetString(2),

                reader.IsDBNull(3)
                    ? null
                    : reader.GetString(3),

                reader.IsDBNull(4)
                    ? null
                    : reader.GetString(4),

                reader.IsDBNull(5)
                    ? null
                    : reader.GetInt32(5),

                reader.IsDBNull(6)
                    ? null
                    : reader.GetDecimal(6),

                reader.IsDBNull(7)
                    ? null
                    : reader.GetDateTime(7)));
    }

    return result;
}


static object? GetValue(
    SourcePropertyValue value)
{
    if (!string.IsNullOrEmpty(value.VarcharValue))
        return value.VarcharValue;

    if (!string.IsNullOrEmpty(value.TextValue))
        return value.TextValue;

    if (value.IntValue.HasValue)
        return value.IntValue.Value;

    if (value.DecimalValue.HasValue)
        return value.DecimalValue.Value;

    if (value.DateValue.HasValue)
        return value.DateValue.Value;

    return null;
}


// ============================================================
// NESTED CONTENT -> BLOCK LIST
// ============================================================
//
// Hand-built rather than serialized from the strongly-typed
// Umbraco.Cms.Core.Models.Blocks.* classes: those model classes are meant
// for reading an already-stored value back out, and it isn't clear their
// default (de)serialization round-trips into the exact wire format the
// Block List property editor expects to read on the way in. This is the
// well-documented, stable Block List storage shape instead:
// { "layout": { "Umbraco.BlockList": [ { "contentUdi": "umb://element/<guid>" } ] },
//   "contentData": [ { "contentTypeKey": "<guid>", "udi": "umb://element/<guid>", ...propValues } ] }

static string? ConvertNestedContentToBlockList(
    string sourceJson,
    Func<string, IContentType?> getContentType)
{
    JsonDocument doc;

    try
    {
        doc = JsonDocument.Parse(sourceJson);
    }
    catch (JsonException)
    {
        return null;
    }

    using (doc)
    {
        if (doc.RootElement.ValueKind != JsonValueKind.Array)
            return null;

        var layoutItems = new JsonArray();
        var contentData = new JsonArray();

        foreach (var item in doc.RootElement.EnumerateArray())
        {
            if (!item.TryGetProperty("ncContentTypeAlias", out var aliasEl) ||
                aliasEl.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            var elementType = getContentType(aliasEl.GetString()!);

            if (elementType == null)
                continue;

            var blockKey = Guid.NewGuid();
            var udi = $"umb://element/{blockKey:N}";

            layoutItems.Add(new JsonObject { ["contentUdi"] = udi });

            var contentEntry = new JsonObject
            {
                ["contentTypeKey"] = elementType.Key.ToString(),
                ["udi"] = udi
            };

            foreach (var prop in item.EnumerateObject())
            {
                if (prop.NameEquals("key") ||
                    prop.NameEquals("name") ||
                    prop.NameEquals("ncContentTypeAlias"))
                {
                    continue;
                }

                contentEntry[prop.Name] = JsonNode.Parse(prop.Value.GetRawText());
            }

            contentData.Add(contentEntry);
        }

        if (contentData.Count == 0)
            return null;

        var result = new JsonObject
        {
            ["layout"] = new JsonObject { ["Umbraco.BlockList"] = layoutItems },
            ["contentData"] = contentData
        };

        return result.ToJsonString();
    }
}


// ============================================================
// GRID -> FLATTENED RICH TEXT
// ============================================================
//
// Umbraco.Grid's row/area/control layout has no reliable automated
// conversion to Block Grid (a different, more complex value format) - see
// the STEP 3 editorAliasRemap comment. This is a deliberately "content
// over layout" best-effort conversion: every control's text/HTML is
// concatenated in document order into a single RichText value. Multi-
// column layouts collapse to a single stacked column; macro/embed
// controls are skipped rather than guessed at.

static string? ConvertGridToRichText(string sourceJson)
{
    JsonDocument doc;

    try
    {
        doc = JsonDocument.Parse(sourceJson);
    }
    catch (JsonException)
    {
        return null;
    }

    using (doc)
    {
        var html = new StringBuilder();

        if (doc.RootElement.TryGetProperty("sections", out var sections) &&
            sections.ValueKind == JsonValueKind.Array)
        {
            foreach (var section in sections.EnumerateArray())
            {
                if (!section.TryGetProperty("rows", out var rows) ||
                    rows.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var row in rows.EnumerateArray())
                {
                    if (!row.TryGetProperty("areas", out var areas) ||
                        areas.ValueKind != JsonValueKind.Array)
                    {
                        continue;
                    }

                    foreach (var area in areas.EnumerateArray())
                    {
                        if (!area.TryGetProperty("controls", out var controls) ||
                            controls.ValueKind != JsonValueKind.Array)
                        {
                            continue;
                        }

                        foreach (var control in controls.EnumerateArray())
                        {
                            AppendGridControlHtml(control, html);
                        }
                    }
                }
            }
        }

        var result = html.ToString().Trim();

        return string.IsNullOrWhiteSpace(result) ? null : result;
    }
}

static void AppendGridControlHtml(JsonElement control, StringBuilder html)
{
    if (!control.TryGetProperty("editor", out var editorEl) ||
        !editorEl.TryGetProperty("alias", out var aliasEl) ||
        aliasEl.ValueKind != JsonValueKind.String)
    {
        return;
    }

    if (!control.TryGetProperty("value", out var value))
        return;

    switch (aliasEl.GetString())
    {
        case "rte":
            if (value.ValueKind == JsonValueKind.String)
            {
                html.AppendLine(value.GetString());
            }
            break;

        case "media":
            if (value.ValueKind == JsonValueKind.Object &&
                value.TryGetProperty("image", out var imageEl) &&
                imageEl.ValueKind == JsonValueKind.String)
            {
                html.AppendLine($"<img src=\"{imageEl.GetString()}\" />");
            }
            break;

        case "headline":
        case "quote":
        case "textstring":
            if (value.ValueKind == JsonValueKind.String)
            {
                html.AppendLine($"<p>{value.GetString()}</p>");
            }
            break;

        // macro/embed and anything else: not safely convertible to plain
        // HTML, deliberately skipped rather than guessed at.
    }
}


static async Task<List<SourceDictionary>>
    GetDictionaryAsync(
        SqlConnection connection)
{
    var result =
        new List<SourceDictionary>();

    const string sql = """
        SELECT
            id,
            parent,
            [key]
        FROM cmsDictionary
        ORDER BY pk
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourceDictionary(
                reader.GetGuid(0),
                reader.IsDBNull(1)
                    ? null
                    : reader.GetGuid(1),
                reader.GetString(2)));
    }

    return result;
}


static async Task<List<SourceUserGroup>> GetUserGroupsAsync(
    SqlConnection connection)
{
    var result = new List<SourceUserGroup>();

    const string sql = """
        SELECT
            id,
            ISNULL(userGroupAlias, ''),
            ISNULL(userGroupName, '')
        FROM umbracoUserGroup
        ORDER BY id
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourceUserGroup(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2)));
    }

    return result;
}


static async Task<List<SourceUser>> GetUsersAsync(
    SqlConnection connection)
{
    var result = new List<SourceUser>();

    const string sql = """
        SELECT
            id,
            ISNULL(userName, ''),
            ISNULL(userLogin, ''),
            ISNULL(userEmail, '')
        FROM umbracoUser
        ORDER BY id
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourceUser(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3)));
    }

    return result;
}


static async Task<List<SourceUserGroupMembership>>
    GetUserGroupMembershipsAsync(
        SqlConnection connection)
{
    var result = new List<SourceUserGroupMembership>();

    const string sql = """
        SELECT
            userId,
            userGroupId
        FROM umbracoUser2UserGroup
        """;

    await using var command =
        new SqlCommand(sql, connection);

    await using var reader =
        await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        result.Add(
            new SourceUserGroupMembership(
                reader.GetInt32(0),
                reader.GetInt32(1)));
    }

    return result;
}


// ============================================================
// RECORDS
// ============================================================

record TableInfo(
    string Name,
    long RowCount);

record SourceDataType(
    int NodeId,
    string EditorAlias,
    string Name);

record SourceTemplate(
    int NodeId,
    string Alias,
    string Name,
    int? MasterId);

record SourceDocumentTypeTemplate(
    int ContentTypeNodeId,
    int TemplateNodeId,
    bool IsDefault);

record SourceContentType(
    int NodeId,
    string Alias,
    string Name,
    string Icon,
    bool AllowAtRoot,
    int ParentId);

record SourceContentTypeContainer(
    int NodeId,
    int ParentId,
    string Name,
    int Level,
    int SortOrder);

record SourceContentTypeComposition(
    int ChildNodeId,
    int ParentNodeId);

record SourceMedia(
    int NodeId,
    int ParentId,
    string MediaTypeAlias,
    string Name,
    int Level,
    int SortOrder);

record SourcePropertyGroup(
    int Id,
    int ContentTypeId,
    string Name,
    int SortOrder);

record SourceProperty(
    int Id,
    int DataTypeId,
    int ContentTypeId,
    int? PropertyGroupId,
    string Alias,
    string Name,
    int SortOrder,
    bool Mandatory,
    string Description);

record SourceContent(
    int NodeId,
    int ParentId,
    int ContentTypeId,
    string Name,
    int Level,
    int SortOrder);

record SourcePropertyValue(
    int PropertyTypeId,
    int NodeId,
    string Alias,
    string? VarcharValue,
    string? TextValue,
    int? IntValue,
    decimal? DecimalValue,
    DateTime? DateValue);

record SourceDictionary(
    Guid Id,
    Guid? Parent,
    string Key);

record SourceUserGroup(
    int Id,
    string Alias,
    string Name);

record SourceUser(
    int Id,
    string Name,
    string Login,
    string Email);

record SourceUserGroupMembership(
    int UserId,
    int UserGroupId);