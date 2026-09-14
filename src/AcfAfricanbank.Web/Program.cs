using Microsoft.Data.SqlClient;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;

var builder = WebApplication.CreateBuilder(args);

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

    var shortStringHelper =
        app.Services.GetRequiredService<IShortStringHelper>();

    // ========================================================
    // STEP 1
    // CONTENT TYPES
    // ========================================================

    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 1 - CONTENT TYPES");
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

            var contentType =
                new ContentType(shortStringHelper, -1)
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
    // STEP 1B
    // TEMPLATES
    // ========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("STEP 1B - TEMPLATES");
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

    var targetDataTypesByEditorAlias =
        (await dataTypeService.GetAllAsync())
            .GroupBy(x => x.EditorAlias, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.First(),
                StringComparer.OrdinalIgnoreCase);

    // A handful of editor aliases were renamed between v8 and modern Umbraco.
    var editorAliasRemap =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Umbraco.TextboxMultiple"] = "Umbraco.TextArea",
            ["Umbraco.MediaPicker"] = "Umbraco.MediaPicker3",
            ["Umbraco.MultipleMediaPicker"] = "Umbraco.MediaPicker3",
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
                Console.WriteLine(
                    $"EXISTS PROPERTY: " +
                    $"{contentTypeAlias}.{property.Alias}");

                continue;
            }

            // ------------------------------------------------
            // System datatypes have negative IDs in Umbraco 8.
            // ------------------------------------------------

            if (property.DataTypeId <= 0)
            {
                Console.WriteLine(
                    $"SKIP PROPERTY: {property.Alias} " +
                    $"(system datatype {property.DataTypeId})");

                continue;
            }

            // ------------------------------------------------
            // Resolve the source datatype's editor alias, then find a
            // target datatype using the same (or remapped) editor alias.
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

            if (!targetDataTypesByEditorAlias.TryGetValue(
                    editorAlias,
                    out var dataType) &&
                editorAliasRemap.TryGetValue(
                    editorAlias,
                    out var remappedAlias))
            {
                targetDataTypesByEditorAlias.TryGetValue(
                    remappedAlias,
                    out dataType);
            }

            if (dataType == null)
            {
                unresolvedEditorAliases.Add(editorAlias);

                Console.WriteLine(
                    $"SKIP PROPERTY: {property.Alias} " +
                    $"(no target datatype for editor '{editorAlias}')");

                continue;
            }

            string? groupName = null;

            if (property.PropertyGroupId.HasValue)
            {
                groupName =
                    propertyGroups
                        .FirstOrDefault(x =>
                            x.Id ==
                            property.PropertyGroupId.Value)
                        ?.Name;
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
                groupName ?? "content");

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

                    var actualValue =
                        GetValue(value);

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

    foreach (var targetKey in contentMap.Values)
    {
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


static async Task<List<SourceContentType>> GetContentTypesAsync(
    SqlConnection connection)
{
    var result = new List<SourceContentType>();

    const string sql = """
        SELECT
            nodeId,
            ISNULL(alias, ''),
            ISNULL(description, ''),
            ISNULL(icon, ''),
            allowAtRoot
        FROM cmsContentType
        ORDER BY nodeId
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
                reader.GetBoolean(4)));
    }

    return result;
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
                reader.GetString(1),

                reader.IsDBNull(2)
                    ? null
                    : reader.GetString(2),

                reader.IsDBNull(3)
                    ? null
                    : reader.GetString(3),

                reader.IsDBNull(4)
                    ? null
                    : reader.GetInt32(4),

                reader.IsDBNull(5)
                    ? null
                    : reader.GetDecimal(5),

                reader.IsDBNull(6)
                    ? null
                    : reader.GetDateTime(6)));
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


// ============================================================
// RECORDS
// ============================================================

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
    bool AllowAtRoot);

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