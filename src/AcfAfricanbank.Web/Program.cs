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

    // Legacy int data type IDs only exist in the v8 source database, so the
    // target-side data types are looked up by their legacy int Id property
    // (kept on IDataType for back-compat) rather than by GetAsync(Guid/string).
    var dataTypesById =
        (await dataTypeService.GetAllAsync())
            .ToDictionary(x => x.Id);

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
            // Try to find datatype by database node ID.
            // ------------------------------------------------

            if (!dataTypesById.TryGetValue(
                    property.DataTypeId,
                    out var dataType))
            {
                Console.WriteLine(
                    $"SKIP PROPERTY: {property.Alias} " +
                    $"(datatype {property.DataTypeId} not found)");

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