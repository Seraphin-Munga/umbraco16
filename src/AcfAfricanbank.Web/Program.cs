using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using Microsoft.SqlServer.Dac;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Extensions;

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
            .WithOrigins("http://localhost:5173", "http://37.27.4.29:8070")
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
// TEST-CONNECTION COMMAND
// ============================================================
//
// Quick, non-destructive check: opens umbracoDbDSN - exactly the same
// connection string/provider the app itself uses (see "TARGET UMBRACO 16
// DATABASE" above) - and reports success/failure. Deliberately exercises
// the real Microsoft.Data.SqlClient connection-string parsing rather than
// a raw sqlcmd/SSMS login test (which uses separate -S/-U/-P flags and so
// never actually parses a "Password=..." value the way this app does) -
// catches connection-string-level mistakes (a mis-escaped/mis-quoted
// Password value), not just wrong credentials.

if (args.Length > 0 &&
    args[0].Equals("test-connection", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" TEST CONNECTION - umbracoDbDSN");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    try
    {
        await using var connection = new SqlConnection(targetConnectionString);
        await connection.OpenAsync();

        Console.WriteLine("Connected OK.");
        Console.WriteLine($"  Server:   {connection.DataSource}");
        Console.WriteLine($"  Database: {connection.Database}");

        await using var versionCommand =
            new SqlCommand("SELECT @@VERSION;", connection) { CommandTimeout = 15 };

        var version = (string?)await versionCommand.ExecuteScalarAsync();
        Console.WriteLine($"  Version:  {version?.Split('\n')[0].Trim()}");

        var tables = await GetTableListAsync(connection);
        Console.WriteLine($"  Tables:   {tables.Count}");
    }
    catch (Exception ex)
    {
        Console.WriteLine("CONNECTION FAILED:");
        Console.WriteLine($"  {ex.GetType().Name}: {ex.Message}");
    }

    return;
}

// ============================================================
// MIGRATE-LOCAL-TO-REMOTE COMMAND
// ============================================================
//
// Copies this machine's local LocalDB database (the personal dev sandbox
// connection string committed in appsettings.json - see that file's own
// comment) onto the remote target database (umbracoDbDSN - normally set
// via user-secrets, see MIGRATION.md), using Microsoft.SqlServer.DacFx.
// Unlike a native SQL Server BACKUP/RESTORE, this streams schema+data
// through THIS machine's own two connections rather than needing a file
// path both SQL Server processes can see - works as long as this machine
// can reach both databases over the network, which matters here since
// local and remote are different physical servers.
//
// NEVER DROPS OR RECREATES THE REMOTE DATABASE, under any circumstance.
// Which of two paths runs depends entirely on whether it already exists
// (checked below, before anything happens):
//   - doesn't exist yet -> export+import a bacpac (schema+data in one
//     step), which creates it fresh. Needs CREATE DATABASE permission.
//   - already exists (e.g. a DBA created an empty shell for it ahead of
//     time) -> extract a dacpac (schema only) from local and
//     DacServices.Deploy it into the existing database - deploy targets
//     an existing database by design, so this needs only ordinary
//     db_owner/db_ddladmin rights within it, not CREATE/DROP DATABASE -
//     then copy every table's data across directly via SqlBulkCopy
//     (KeepIdentity, so every row keeps its original ID - essential,
//     since Umbraco's internal references depend on exact IDs matching),
//     with foreign keys disabled for the copy and re-enabled after.
//
// Runs BEFORE Umbraco boots (raw SQL Server administration, same
// reasoning as "reset" above). Still uses the same interactive "type the
// database name to confirm" guard as "reset" above - even though neither
// path here is destructive, both make real changes on a shared server
// worth a deliberate confirmation.

if (args.Length > 0 &&
    args[0].Equals("migrate-local-to-remote", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" MIGRATE LOCAL DATABASE -> REMOTE TARGET (BACPAC)");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    // appsettings.json's own committed LocalDB connection string uses
    // AttachDbFilename (an ad-hoc "attach this .mdf file for the duration
    // of this connection" style) - confirmed live: DacServices flatly
    // rejects that as an unsupported connection string argument
    // ("AttachDBFilename is not supported"). Attach the .mdf under its
    // real name first (a plain SqlConnection, which - unlike DacServices -
    // has no problem with AttachDbFilename) so it becomes an ordinary
    // LocalDB database DacServices can address by Initial Catalog alone.
    const string localDatabaseName = "Umbraco16_AB_CMS_10Sept";

    var dataDirectory = (string)AppDomain.CurrentDomain.GetData("DataDirectory")!;
    var localMdfPath = Path.Combine(dataDirectory, $"{localDatabaseName}.mdf");

    await using (var attachConnection =
        new SqlConnection("Data Source=(localdb)\\MSSQLLocalDB;Integrated Security=True"))
    {
        await attachConnection.OpenAsync();

        await ExecuteSqlAsync(
            attachConnection,
            $"""
            IF DB_ID('{localDatabaseName}') IS NULL
            BEGIN
                CREATE DATABASE [{localDatabaseName}]
                ON (FILENAME = N'{localMdfPath}')
                FOR ATTACH;
            END
            """);
    }

    var localConnectionString =
        $"Data Source=(localdb)\\MSSQLLocalDB;Initial Catalog={localDatabaseName};Integrated Security=True";

    var remoteBuilder = new SqlConnectionStringBuilder(targetConnectionString);
    var remoteDatabaseName = remoteBuilder.InitialCatalog;

    if (string.IsNullOrWhiteSpace(remoteDatabaseName))
    {
        Console.WriteLine("ERROR: the target connection string has no database name set.");

        return;
    }

    // A connection to the target database itself can't DROP/CREATE that
    // same database - "master" is used for the admin (drop + import)
    // steps below, same as any SSMS/sqlcmd workflow would.
    var remoteServerConnectionString =
        new SqlConnectionStringBuilder(targetConnectionString) { InitialCatalog = "master" }
            .ConnectionString;

    Console.WriteLine($"Local source:   (localdb)\\MSSQLLocalDB / {localDatabaseName}");
    Console.WriteLine($"Remote target:  {remoteBuilder.DataSource} / {remoteDatabaseName}");
    Console.WriteLine();

    try
    {
        await using var checkConnection = new SqlConnection(targetConnectionString);
        await checkConnection.OpenAsync();

        var existingTables = await GetTableListAsync(checkConnection);

        Console.WriteLine($"Remote database currently has {existingTables.Count} table(s).");

        foreach (var t in existingTables.Take(10))
        {
            Console.WriteLine($"  {t.Name} ({t.RowCount} rows)");
        }

        if (existingTables.Count > 10)
        {
            Console.WriteLine($"  ... and {existingTables.Count - 10} more");
        }
    }
    catch (SqlException ex)
    {
        Console.WriteLine(
            $"NOTE: could not inspect the remote database ({ex.Message}) - " +
            "it may not exist yet, which is fine.");
    }

    Console.WriteLine();
    Console.WriteLine(
        "This copies the local database's schema and data onto the remote " +
        "database above. If it doesn't exist yet, it gets created fresh; " +
        "if it already exists, its schema is updated in place and every " +
        "table's data is copied in - either way, the remote database is " +
        "never dropped or recreated.");
    Console.WriteLine();
    Console.Write($"Type the remote database name ({remoteDatabaseName}) to confirm: ");

    var confirmation = Console.ReadLine();

    if (!string.Equals(confirmation, remoteDatabaseName, StringComparison.Ordinal))
    {
        Console.WriteLine();
        Console.WriteLine("Confirmation did not match. Aborted - nothing was changed.");

        return;
    }

    // This command never drops or recreates the remote database, under any
    // circumstance. Which of the two paths below runs depends entirely on
    // whether it already exists:
    //   - doesn't exist yet -> export+import a bacpac, which creates it
    //     fresh in one step (needs CREATE DATABASE permission).
    //   - already exists (e.g. a DBA already created an empty shell for
    //     it) -> deploy the schema into it (DacServices.Deploy, which
    //     targets an existing database - no CREATE/DROP DATABASE
    //     permission needed, just ordinary db_owner/db_ddladmin rights
    //     within it) and then copy every table's data across directly.
    bool databaseExists;

    await using (var checkConnection = new SqlConnection(remoteServerConnectionString))
    {
        await checkConnection.OpenAsync();

        await using var existsCommand =
            new SqlCommand($"SELECT DB_ID('{remoteDatabaseName}');", checkConnection);

        databaseExists = await existsCommand.ExecuteScalarAsync() is not DBNull and not null;
    }

    if (databaseExists)
    {
        Console.WriteLine();
        Console.WriteLine(
            $"Remote database '{remoteDatabaseName}' already exists - " +
            "deploying the schema into it and copying data table-by-table " +
            "(not dropping or recreating the database itself).");

        var dacpacPath =
            Path.Combine(Path.GetTempPath(), $"local-schema-{Guid.NewGuid():N}.dacpac");

        Console.WriteLine();
        Console.WriteLine($"Extracting local schema to {dacpacPath} ...");

        var extractDac = new DacServices(localConnectionString);
        extractDac.Message += (_, e) => Console.WriteLine($"  [extract] {e.Message}");

        extractDac.Extract(
            dacpacPath,
            localDatabaseName,
            "AcfAfricanbank",
            new Version(1, 0, 0, 0));

        Console.WriteLine("Extract complete.");
        Console.WriteLine();
        Console.WriteLine($"Deploying schema into '{remoteDatabaseName}' ...");

        var deployDac = new DacServices(remoteServerConnectionString);
        deployDac.Message += (_, e) => Console.WriteLine($"  [deploy] {e.Message}");

        using (var dacpac = DacPackage.Load(dacpacPath))
        {
            var deployOptions = new DacDeployOptions
            {
                BlockOnPossibleDataLoss = false,
                // LocalDB's own engine is a newer SQL Server version (2022)
                // than the real remote target (MTWSQL2019 - SQL Server
                // 2019) - confirmed live: DacFx embeds a "target platform"
                // in whatever it extracts based on the actual connected
                // engine version (not a per-database COMPATIBILITY_LEVEL
                // setting - tried that first, made no difference), and
                // refuses to deploy anything declaring a newer platform
                // than the real target ("cannot be published to SQL Server
                // 2019"). This is the documented, supported bypass for
                // exactly that check (mirrors SqlPackage's own
                // /p:AllowIncompatiblePlatform=true) - the schema itself
                // doesn't actually use any 2022-only feature, so there's
                // nothing for the older server to reject once deployment
                // is allowed to proceed.
                AllowIncompatiblePlatform = true,
            };

            deployDac.Deploy(dacpac, remoteDatabaseName, upgradeExisting: true, deployOptions);
        }

        Console.WriteLine("Schema deploy complete.");
        Console.WriteLine();
        Console.WriteLine("Copying table data (this can take a while for large tables) ...");

        await using (var localDataConnection = new SqlConnection(localConnectionString))
        await using (var remoteDataConnection = new SqlConnection(targetConnectionString))
        {
            await localDataConnection.OpenAsync();
            await remoteDataConnection.OpenAsync();

            var tables = await GetTableListAsync(localDataConnection);

            Console.WriteLine(
                "Disabling foreign key constraints on the remote database " +
                "(re-enabled once every table is copied) ...");

            await ExecuteSqlAsync(
                remoteDataConnection,
                """
                DECLARE @sql NVARCHAR(MAX) = N'';
                SELECT @sql += 'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + ' NOCHECK CONSTRAINT ALL;'
                FROM sys.tables;
                EXEC sp_executesql @sql;
                """);

            foreach (var table in tables)
            {
                Console.WriteLine($"  {table.Name} ({table.RowCount} rows) ...");

                await using var sourceCommand =
                    new SqlCommand($"SELECT * FROM [dbo].[{table.Name}];", localDataConnection)
                    {
                        CommandTimeout = 300,
                    };

                await using var reader = await sourceCommand.ExecuteReaderAsync();

                using var bulkCopy = new SqlBulkCopy(
                    remoteDataConnection,
                    SqlBulkCopyOptions.KeepIdentity | SqlBulkCopyOptions.TableLock,
                    externalTransaction: null)
                {
                    DestinationTableName = $"[dbo].[{table.Name}]",
                    BulkCopyTimeout = 300,
                };

                await bulkCopy.WriteToServerAsync(reader);
            }

            Console.WriteLine();
            Console.WriteLine("Re-enabling foreign key constraints on the remote database ...");

            await ExecuteSqlAsync(
                remoteDataConnection,
                """
                DECLARE @sql NVARCHAR(MAX) = N'';
                SELECT @sql += 'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + ' WITH CHECK CHECK CONSTRAINT ALL;'
                FROM sys.tables;
                EXEC sp_executesql @sql;
                """);
        }

        Console.WriteLine();
        Console.WriteLine("=================================================");
        Console.WriteLine("MIGRATION COMPLETE");
        Console.WriteLine("=================================================");
        Console.WriteLine();
        Console.WriteLine(
            $"Remote database '{remoteDatabaseName}' (the same database - " +
            "never dropped) now has the local database's schema and data.");
        Console.WriteLine(
            $"Temporary dacpac file: {dacpacPath} (safe to delete once " +
            "you've confirmed the app works).");
    }
    else
    {
        Console.WriteLine();
        Console.WriteLine($"Remote database '{remoteDatabaseName}' doesn't exist yet - creating it.");

        var bacpacPath =
            Path.Combine(Path.GetTempPath(), $"local-migration-{Guid.NewGuid():N}.bacpac");

        Console.WriteLine();
        Console.WriteLine($"Exporting local database to {bacpacPath} ...");

        var localDac = new DacServices(localConnectionString);
        localDac.Message += (_, e) => Console.WriteLine($"  [export] {e.Message}");

        localDac.ExportBacpac(bacpacPath, localDatabaseName);

        Console.WriteLine("Export complete.");
        Console.WriteLine();
        Console.WriteLine($"Importing into new remote database '{remoteDatabaseName}' ...");

        var remoteDac = new DacServices(remoteServerConnectionString);
        remoteDac.Message += (_, e) => Console.WriteLine($"  [import] {e.Message}");

        using (var package = BacPackage.Load(bacpacPath))
        {
            remoteDac.ImportBacpac(package, remoteDatabaseName);
        }

        Console.WriteLine();
        Console.WriteLine("=================================================");
        Console.WriteLine("MIGRATION COMPLETE");
        Console.WriteLine("=================================================");
        Console.WriteLine();
        Console.WriteLine(
            $"Remote database '{remoteDatabaseName}' was created and now " +
            "contains a full copy of the local database.");
        Console.WriteLine(
            $"Temporary bacpac file: {bacpacPath} (safe to delete once " +
            "you've confirmed the app works).");
    }

    Console.WriteLine();
    Console.WriteLine(
        "Next: run the app normally ('dotnet run') to confirm it boots " +
        "against the remote target.");

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
                var existingProp =
                    existing.PropertyTypes.FirstOrDefault(p =>
                        p.Alias.Equals(prop.Alias, StringComparison.OrdinalIgnoreCase));

                if (existingProp != null)
                {
                    // Self-healing: fixes a property that was originally
                    // created Mandatory but whose content (e.g. heroSlide's
                    // own "image", seeded blank on purpose for pages with
                    // no real photo available yet - see create-business-
                    // content's own comment) is now deliberately left
                    // blank, which otherwise fails publish with
                    // FailedPublishContentInvalid every time (confirmed
                    // live) regardless of how many times this command
                    // re-runs, since this loop used to just skip an
                    // already-existing property entirely.
                    if (existingProp.Mandatory != prop.Mandatory)
                    {
                        existingProp.Mandatory = prop.Mandatory;
                        changed = true;

                        Console.WriteLine(
                            $"  ~ UPDATED PROPERTY: {alias}.{prop.Alias} " +
                            $"(mandatory -> {prop.Mandatory})");
                    }

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
            // Not mandatory - a hero slide with no real photo available
            // yet (e.g. seeded by create-business-content/create-
            // tap2glass-content, both of which leave it blank on purpose)
            // must still be publishable; GetOrCreateType's own self-
            // healing (see its comment) fixes this on an already-created
            // heroSlide type too, not just a fresh one.
            new PropSpec("image", "Image", media),
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
            new PropSpec("description", "Description", rte),
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
            new PropSpec("imageOnRight", "Image On Right", boolType),
            // Optional - blank/unset on every promoSplitBlock instance
            // seeded before this was added (GetOrCreateType's self-healing
            // "ADDED PROPERTY" path backfills it onto existing nodes as an
            // empty field, same as any other new property here), so this
            // doesn't change how any existing instance looks. Only the
            // Tech Deals page sets it - a plain Tailwind class name
            // ("bg-brand-mist"/"bg-white") the React side applies as-is
            // when present, letting a specific page control its own promo
            // sections' alternating background without a global rule that
            // would also repaint every other page's promoSplitBlock.
            new PropSpec("backgroundColor", "Background Colour (optional)", txt),
            // Optional, default false - every instance seeded before Tech
            // Deals leaves it unset, keeping their existing BlobImage
            // organic-crop look unchanged. Tech Deals' two promo sections
            // set this true: their images are real posters with logo/text
            // right to the edges, which the blob crop cuts into - true
            // sits the full, uncropped image on a plain white card instead
            // (see PromoSplit.tsx's own `imagePlain` prop).
            new PropSpec("imagePlain", "Image: Plain (no blob crop)", boolType));

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
            new PropSpec("downloadTextDescription", "Description", txt),
            new PropSpec("downloadButtonRedirectLink2", "File", media),
            new PropSpec("downloadButtonText", "Button Text", txt));

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
                var existingProp =
                    existing.PropertyTypes.FirstOrDefault(p =>
                        p.Alias.Equals(prop.Alias, StringComparison.OrdinalIgnoreCase));

                if (existingProp != null)
                {
                    // Self-healing: fixes a property that was originally
                    // created Mandatory but whose content (e.g. heroSlide's
                    // own "image", seeded blank on purpose for pages with
                    // no real photo available yet - see create-business-
                    // content's own comment) is now deliberately left
                    // blank, which otherwise fails publish with
                    // FailedPublishContentInvalid every time (confirmed
                    // live) regardless of how many times this command
                    // re-runs, since this loop used to just skip an
                    // already-existing property entirely.
                    if (existingProp.Mandatory != prop.Mandatory)
                    {
                        existingProp.Mandatory = prop.Mandatory;
                        changed = true;

                        Console.WriteLine(
                            $"  ~ UPDATED PROPERTY: {alias}.{prop.Alias} " +
                            $"(mandatory -> {prop.Mandatory})");
                    }

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
            new PropSpec("downloadTextDescription", "Description", txt),
            new PropSpec("downloadButtonRedirectLink2", "File", media),
            new PropSpec("downloadButtonText", "Button Text", txt));

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
            new PropSpec("description", "Description", rte),
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
            new PropSpec("description", "Description", rte),
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
            new PropSpec("description", "Description", rte),
            new PropSpec("primaryCta", "Primary Button", link),
            new PropSpec("secondaryCta", "Secondary Button", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("imageOnRight", "Image On Right", boolType),
            // Optional - blank/unset on every promoSplitBlock instance
            // seeded before this was added (GetOrCreateType's self-healing
            // "ADDED PROPERTY" path backfills it onto existing nodes as an
            // empty field, same as any other new property here), so this
            // doesn't change how any existing instance looks. Only the
            // Tech Deals page sets it - a plain Tailwind class name
            // ("bg-brand-mist"/"bg-white") the React side applies as-is
            // when present, letting a specific page control its own promo
            // sections' alternating background without a global rule that
            // would also repaint every other page's promoSplitBlock.
            new PropSpec("backgroundColor", "Background Colour (optional)", txt),
            // Optional, default false - every instance seeded before Tech
            // Deals leaves it unset, keeping their existing BlobImage
            // organic-crop look unchanged. Tech Deals' two promo sections
            // set this true: their images are real posters with logo/text
            // right to the edges, which the blob crop cuts into - true
            // sits the full, uncropped image on a plain white card instead
            // (see PromoSplit.tsx's own `imagePlain` prop).
            new PropSpec("imagePlain", "Image: Plain (no blob crop)", boolType));

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
            new PropSpec("imageOnRight", "Image On Right", boolType),
            // Optional - rich text shown between the heading and the
            // checklist (e.g. Stokvel's "How To Apply" channels). Blank on
            // every instance seeded before this was added, which renders
            // exactly as before.
            new PropSpec("bodyHtml", "Body (optional, above the checklist)", rte));

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
            new PropSpec("paragraphOne", "Paragraph One", rte),
            new PropSpec("paragraphTwo", "Paragraph Two", rte),
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
            new PropSpec("description", "Description", rte),
            new PropSpec("downloadLink", "Download Link", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt));

    // --------------------------------------------------------
    // TECH DEALS PAGE BLOCKS
    // --------------------------------------------------------
    //
    // Built for the Tech Deals page (/en/home/tech-deals/) - no equivalent
    // for these four elsewhere in this schema: an icon category row, the
    // single-product "Plug & Go" bundle card, the apply-requirements
    // section (which also carries its own nested "perks" mini-carousel, as
    // one block rather than two, matching how the source design nests the
    // grey "Choose our tech credit..." card inside the white requirements
    // section rather than as its own full-width band), and a page-specific
    // phone-number/terms footer strip. Each item below carries its own
    // `iconImage` Media Picker field (not a Lucide icon-key lookup - an
    // earlier version of this schema did that, but the real site needs
    // actual uploaded icon artwork). Named `iconImage`, not `icon` -
    // GetOrCreateType can add a new property to an existing content type,
    // but can't retype an existing one in place, so reusing the old `icon`
    // (txt) alias here would just silently no-op on any install that
    // already ran the earlier version. That old `icon` field is left
    // orphaned (harmless, unused) on such an install rather than migrated.
    //
    // No real icon files were available to upload here - every item below
    // ships with iconImage unset, same "no real media available"
    // treatment as every other image field in this command. Upload the
    // real icon artwork (Handset/Tablets/Laptops/... category icons, the
    // requirements-list icons, the three perk icons) via the backoffice's
    // Media Picker once available.

    var techCategoryItem =
        GetOrCreateType(
            "techCategoryItem", "Tech Category Item", "icon-tags", true, false,
            new PropSpec("iconImage", "Icon", media),
            new PropSpec("label", "Label", txt));

    var techHeroCategories =
        await GetOrCreateBlockListAsync(
            "React Migration - techHeroBlock.categories", techCategoryItem);

    var techHeroBlock =
        GetOrCreateType(
            "techHeroBlock", "Tech Hero", "icon-mobile", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("highlightHeading", "Highlight Heading", txt),
            new PropSpec("subheading", "Subheading", txt),
            new PropSpec("categories", "Categories", techHeroCategories));

    var plugAndGoBlock =
        GetOrCreateType(
            "plugAndGoBlock", "Plug And Go", "icon-wand", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("productName", "Product Name", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("bundleLabel", "Bundle Label", txt),
            new PropSpec("priceAmount", "Price Amount", txt),
            new PropSpec("priceSuffix", "Price Suffix", txt),
            new PropSpec("cta", "Button", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt));

    var requirementItem =
        GetOrCreateType(
            "requirementItem", "Requirement Item", "icon-document", true, false,
            new PropSpec("iconImage", "Icon", media),
            new PropSpec("label", "Label", txt));

    var techRequirementsItems =
        await GetOrCreateBlockListAsync(
            "React Migration - techRequirementsBlock.items", requirementItem);

    var benefitCard =
        GetOrCreateType(
            "benefitCard", "Benefit Card", "icon-trophy", true, false,
            new PropSpec("iconImage", "Icon", media),
            new PropSpec("heading", "Heading", txt),
            new PropSpec("description", "Description", txtArea));

    var techRequirementsPerks =
        await GetOrCreateBlockListAsync(
            "React Migration - techRequirementsBlock.perks", benefitCard);

    var techRequirementsBlock =
        GetOrCreateType(
            "techRequirementsBlock", "Tech Requirements", "icon-list", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("bodyHtml", "Body", rte),
            new PropSpec("itemsHeading", "Items Heading", txt),
            new PropSpec("itemsIntro", "Items Intro", txtArea),
            new PropSpec("items", "Items", techRequirementsItems),
            new PropSpec("perksHeading", "Perks Heading", txt),
            new PropSpec("perks", "Perks", techRequirementsPerks));

    var techCallToActionBlock =
        GetOrCreateType(
            "techCallToActionBlock", "Tech Call To Action", "icon-phone", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("phoneNumber", "Phone Number", txt),
            new PropSpec("phoneUrl", "Phone Url", txt),
            new PropSpec("termsLabel", "Terms Label", txt),
            new PropSpec("termsUrl", "Terms Url", txt),
            new PropSpec("disclaimerHtml", "Disclaimer", rte));

    // --------------------------------------------------------
    // TALK TO US PAGE BLOCKS
    // --------------------------------------------------------
    //
    // Built for the Talk To Us page (/en/home/talk-to-us/) - a green
    // banner heading above a grid of contact cards (Customer Service
    // Centre, MyWORLD customers, Lost or stolen cards, ...). Each card's
    // real content is too varied (some are a single phone+email, some
    // nest two labelled sub-sections like "Personal Banking"/"Business
    // and Commercial Banking", some are WhatsApp-only) to model as strict
    // fields, so contactCardItem is just a heading plus one rich-text
    // body - same "free text over strict fields" choice as
    // techRequirementsBlock's own bodyHtml/disclaimerHtml above.

    var contactCardItem =
        GetOrCreateType(
            "contactCardItem", "Contact Card Item", "icon-megaphone", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("bodyHtml", "Body", rte));

    var contactInfoCards =
        await GetOrCreateBlockListAsync(
            "React Migration - contactInfoBlock.cards", contactCardItem);

    var contactInfoBlock =
        GetOrCreateType(
            "contactInfoBlock", "Contact Info", "icon-address-book", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("cards", "Cards", contactInfoCards));

    // --------------------------------------------------------
    // RATES AND FEATURES BLOCK
    // --------------------------------------------------------
    //
    // Ported from the legacy (pre-React) myworldPv5.cshtml/banking.cshtml/
    // stok.cshtml/productNoticeDepositev2.cshtml Razor views' own "All
    // Rates" + "MyWORLD Banking Features" section - this never got
    // migrated to a React component or a Block List element type before
    // now (confirmed: no trace of it anywhere in react-ts-app/src or
    // elsewhere in this file). One combined block, not two - the rates
    // table and the features comparison table always appear together as
    // a single unit in every real instance of this content.
    //
    // Fixed at exactly 3 plan columns (MyWORLD/Power Pocket/Savings
    // Pocket in the legacy content, but each column's own icon/name is
    // editable per block instance) - matches every real instance of this
    // table seen so far. A 4th column would need a new column1Icon/
    // column1Name-shaped property pair added here, not a structural
    // change.
    //
    // Each feature row's per-column cell is modelled as a toggle (true ->
    // renders a checkmark) plus an optional text value (sits instead of
    // the checkmark when set, e.g. "R0.00"/"1 User"/"Up to 10 Members") -
    // leaving both unset renders a blank cell, matching the legacy
    // table's own mix of checkmark/text/blank per cell per column.

    var rateTierItem =
        GetOrCreateType(
            "rateTierItem", "Rate Tier Item", "icon-coin-dollar", true, false,
            new PropSpec("tierLabel", "Balance Tier (e.g. \"R 0 - R 24 999\")", txt),
            new PropSpec("rateValue", "Interest Rate (e.g. \"2.75%\")", txt));

    var rateTiers =
        await GetOrCreateBlockListAsync(
            "React Migration - ratesAndFeaturesBlock.rateTiers", rateTierItem);

    var featureRowItem =
        GetOrCreateType(
            "featureRowItem", "Feature Row Item", "icon-list", true, false,
            new PropSpec("label", "Feature Label", txt),
            new PropSpec("column1Checked", "Column 1: Checkmark", boolType),
            new PropSpec("column1Value", "Column 1: Text Value (optional)", txt),
            new PropSpec("column2Checked", "Column 2: Checkmark", boolType),
            new PropSpec("column2Value", "Column 2: Text Value (optional)", txt),
            new PropSpec("column3Checked", "Column 3: Checkmark", boolType),
            new PropSpec("column3Value", "Column 3: Text Value (optional)", txt));

    var featureRows =
        await GetOrCreateBlockListAsync(
            "React Migration - ratesAndFeaturesBlock.featureRows", featureRowItem);

    var ratesAndFeaturesBlock =
        GetOrCreateType(
            "ratesAndFeaturesBlock", "Rates And Features", "icon-calculator", true, false,
            new PropSpec("ratesHeading", "Rates Heading (e.g. \"All Rates\")", txt),
            new PropSpec("rateTiers", "Rate Tiers", rateTiers),
            new PropSpec("ratesDisclaimerOne", "Rates Disclaimer (NACM note)", rte),
            new PropSpec("ratesDisclaimerTwo", "Rates Disclaimer (T&Cs note)", rte),
            new PropSpec(
                "featuresHeading", "Features Heading (e.g. \"MyWORLD Banking Features\")", txt),
            new PropSpec("column1Icon", "Column 1 Icon", media),
            new PropSpec("column1Name", "Column 1 Name", txt),
            new PropSpec("column2Icon", "Column 2 Icon", media),
            new PropSpec("column2Name", "Column 2 Name", txt),
            new PropSpec("column3Icon", "Column 3 Icon", media),
            new PropSpec("column3Name", "Column 3 Name", txt),
            new PropSpec("featureRows", "Feature Rows", featureRows));

    // --------------------------------------------------------
    // INVESTMENT PAGE BLOCKS
    // --------------------------------------------------------
    //
    // Ported from the legacy Fixed/Notice Deposit Razor pages
    // (productFixedDepositInvestment*.cshtml, productNoticeDeposit*.cshtml):
    // the outlined icon-card grid ("More About The Notice Deposit"), the
    // tier x term "All Rates" table and the investment calculator. Rendered
    // by IconCardGrid.tsx/RatesMatrix.tsx/InvestmentCalculator.tsx.
    //
    // ratesMatrixBlock keeps its column headings and each row's rates as
    // one "|"-separated text field (e.g. "7 Days Notice|32 Days Notice|90
    // Days Notice", "5.61%|6.32%|5.85%") rather than a nested list per
    // cell, so the column count isn't fixed the way ratesAndFeaturesBlock's
    // is - Notice Deposit has 3 columns, Fixed Deposit 6.

    var iconCardItem =
        GetOrCreateType(
            "iconCardItem", "Icon Card Item", "icon-picture", true, false,
            new PropSpec("icon", "Icon", media),
            new PropSpec("title", "Title", txt),
            new PropSpec("description", "Description", txtArea));

    var iconCardGridCards =
        await GetOrCreateBlockListAsync(
            "React Migration - iconCardGridBlock.cards", iconCardItem);

    var iconCardGridBlock =
        GetOrCreateType(
            "iconCardGridBlock", "Icon Card Grid", "icon-grid", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("cards", "Cards", iconCardGridCards));

    var ratesMatrixRow =
        GetOrCreateType(
            "ratesMatrixRow", "Rates Matrix Row", "icon-coin-dollar", true, false,
            new PropSpec("tierLabel", "Balance Tier (e.g. \"R0 - 24999.99\")", txt),
            new PropSpec("rates", "Rates, one per column, separated by | (e.g. \"5.61%|6.32%|5.85%\")", txt));

    var ratesMatrixRows =
        await GetOrCreateBlockListAsync(
            "React Migration - ratesMatrixBlock.rows", ratesMatrixRow);

    var ratesMatrixDisclaimers =
        await GetOrCreateBlockListAsync(
            "React Migration - ratesMatrixBlock.disclaimers", featureItem);

    var ratesMatrixBlock =
        GetOrCreateType(
            "ratesMatrixBlock", "Rates Matrix", "icon-calculator", true, false,
            new PropSpec("heading", "Heading (e.g. \"All Rates\")", txt),
            new PropSpec(
                "columnHeadings", "Column Headings, separated by | (e.g. \"7 Days Notice|32 Days Notice\")", txt),
            new PropSpec("rows", "Rows", ratesMatrixRows),
            new PropSpec("disclaimers", "Disclaimers", ratesMatrixDisclaimers),
            new PropSpec("tierHeading", "First Column Label (optional, defaults to \"Tier\")", txt));

    var investmentCalculatorBlock =
        GetOrCreateType(
            "investmentCalculatorBlock", "Investment Calculator", "icon-calculator", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("investmentType", "Default Investment Type (Fixed, Notice, Access or TxFree)", txt),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("disclaimer", "Disclaimer", txtArea),
            new PropSpec("openAccountLink", "Open Account Link", link));

    // Two-step "Submit your claim" form (ClaimForm.tsx), ported from
    // productcreditlifev2.cshtml. submitUrl is where it posts - the bank's
    // contact service on the live site; blank it on an environment that
    // mustn't create real claims (the form then shows errorMessage instead
    // of posting).
    var claimFormBlock =
        GetOrCreateType(
            "claimFormBlock", "Claim Form", "icon-message", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("intro", "Intro Text", txt),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("submitUrl", "Submit URL (blank = form shows the error message instead of posting)", txt),
            new PropSpec("successMessage", "Success Message", txtArea),
            new PropSpec("errorMessage", "Error Message", txtArea));

    // Family Funeral Plan calculator (FuneralCalculator.tsx) - its member/
    // cover rules live in the component, so only presentation is editable.
    var funeralCalculatorBlock =
        GetOrCreateType(
            "funeralCalculatorBlock", "Funeral Calculator", "icon-calculator", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("applyLink", "Apply Link", link));

    // Audacious Rewards page blocks (StepCards.tsx / PartnerTabs.tsx): the
    // JOIN / EARN / SPEND row, and the "How to Earn" partner tabs. Each
    // partner tab keeps its two earn-rate cards (Debit Card / Credit Card)
    // as flat card1*/card2* fields rather than a third nested Block List.
    var stepCard =
        GetOrCreateType(
            "stepCard", "Step Card", "icon-navigation-right", true, false,
            new PropSpec("title", "Title", txt),
            new PropSpec("bodyHtml", "Body", rte),
            new PropSpec("cta", "Button", link));

    var stepCardsCards =
        await GetOrCreateBlockListAsync("React Migration - stepCardsBlock.cards", stepCard);

    var stepCardsBlock =
        GetOrCreateType(
            "stepCardsBlock", "Step Cards", "icon-navigation-right", true, false,
            new PropSpec("heading", "Heading (optional)", txt),
            new PropSpec("cards", "Cards", stepCardsCards),
            new PropSpec("introHtml", "Intro (optional, above the cards)", rte),
            new PropSpec("introCta", "Intro Button (optional)", link));

    // Full-width artwork banner whose text is baked into the image
    // (ImageBanner.tsx), plus the "Spend with our benefit partners" slide
    // carousel (SpendCarousel.tsx) and the page's closing strip
    // (RewardsFooter.tsx: navy VISIT STORE band, "ACCESS YOUR REWARDS ..."
    // heading, button and two outline document links).
    var imageBannerBlock =
        GetOrCreateType(
            "imageBannerBlock", "Image Banner", "icon-picture", true, false,
            new PropSpec("image", "Image", media),
            new PropSpec("mobileImage", "Mobile Image (optional)", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("link", "Link (optional)", link));

    var spendSlide =
        GetOrCreateType(
            "spendSlide", "Spend Slide", "icon-shopping-basket", true, false,
            new PropSpec("image", "Partner Logo", media),
            new PropSpec("title", "Title", txt),
            new PropSpec("bodyHtml", "Body", rte),
            new PropSpec("cta", "Button", link));

    var spendCarouselSlides =
        await GetOrCreateBlockListAsync("React Migration - spendCarouselBlock.slides", spendSlide);

    var spendCarouselBlock =
        GetOrCreateType(
            "spendCarouselBlock", "Spend Carousel", "icon-shopping-basket", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("introHtml", "Intro", rte),
            new PropSpec("slides", "Slides", spendCarouselSlides));

    var rewardsFooterBlock =
        GetOrCreateType(
            "rewardsFooterBlock", "Rewards Footer", "icon-flag", true, false,
            new PropSpec("bandCta", "Navy Band Button (e.g. VISIT STORE)", link),
            new PropSpec("headingHtml", "Heading", rte),
            new PropSpec("cta", "Button", link),
            new PropSpec("link1", "Document Link 1 (e.g. Terms and Conditions)", link),
            new PropSpec("link2", "Document Link 2 (e.g. FAQ's)", link));

    var partnerTab =
        GetOrCreateType(
            "partnerTab", "Partner Tab", "icon-store", true, false,
            new PropSpec("label", "Tab Label", txt),
            new PropSpec("heading", "Heading", txt),
            new PropSpec("subheading", "Subheading", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("image", "Banner Image", media),
            new PropSpec("card1Title", "Card 1 Title (e.g. Debit Card)", txt),
            new PropSpec("card1Html", "Card 1 Body", rte),
            new PropSpec("card1Link", "Card 1 Link", link),
            new PropSpec("card2Title", "Card 2 Title (e.g. Credit Card)", txt),
            new PropSpec("card2Html", "Card 2 Body", rte),
            new PropSpec("card2Link", "Card 2 Link", link),
            new PropSpec("footnoteHtml", "Footnote", rte),
            new PropSpec("closingText", "Closing Text", txtArea),
            new PropSpec("cta", "Partner Button", link));

    var partnerTabsTabs =
        await GetOrCreateBlockListAsync("React Migration - partnerTabsBlock.tabs", partnerTab);

    var partnerTabsBlock =
        GetOrCreateType(
            "partnerTabsBlock", "Partner Tabs", "icon-store", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("introHtml", "Intro", rte),
            new PropSpec("tabs", "Tabs", partnerTabsTabs));

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
            techHeroBlock,
            plugAndGoBlock,
            techRequirementsBlock,
            techCallToActionBlock,
            contactInfoBlock,
            featureChecklistBlock,
            loanCalculatorBlock,
            creditLifeInsuranceBlock,
            faqSectionBlock,
            downloadsSectionBlock,
            crossSellBlock,
            appDownloadBlock,
            ratesAndFeaturesBlock,
            iconCardGridBlock,
            ratesMatrixBlock,
            investmentCalculatorBlock,
            claimFormBlock,
            funeralCalculatorBlock,
            stepCardsBlock,
            partnerTabsBlock,
            imageBannerBlock,
            spendCarouselBlock,
            rewardsFooterBlock);

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
// CREATE-BUSINESS-SCHEMA COMMAND
// ============================================================
//
// Builds the Document Types for the Business Banking page
// (/en/home/business-banking/, the live africanbank.co.za page used as the
// reference for this command - header/nav/footer excluded, body only).
// Same pattern as create-home-schema/create-product-loan-schema above:
// idempotent GetOrCreateType/GetOrCreateBlockListAsync helpers, a
// dedicated Document Types folder, shared scalar Data Types looked up by
// editor alias (reused across every create-*-schema command against the
// same Umbraco instance).
//
// Shape, read off the live page's body:
//   - Hero carousel at the top -> its own dedicated businessHeroCarouselBlock
//     (not a reuse of homePage's heroCarouselBlock - see that type's own
//     comment below for why a shared alias wouldn't actually render with
//     this page's own distinct carousel look).
//   - "Our offerings" -> a heading plus three small cards (Bank/Borrow/
//     Invest: title + description + button). Modelled as its own element
//     type rather than reusing contentCard, since this page's own
//     repeating unit is specifically a "card" component - cardOffering,
//     wrapped in a new businessOfferingsBlock the same way
//     crossSellBlock/rewardsSectionBlock wrap their own cards.
//   - Two icon-led feature panels (MSME Access to Finance Report, Book A
//     Banker) -> each an icon + heading + rich-text body + button beside
//     an image. Modelled as cardIconFeature, added directly to the page's
//     sections twice (once per panel) rather than wrapped in its own
//     BlockList, since these two panels aren't a repeating list under a
//     shared heading the way the offerings cards are.
//
// Idempotent: re-running finds already-created types by alias and skips
// them, same as every other create-*-schema command.

if (args.Length > 0 &&
    args[0].Equals("create-business-schema", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" CREATE BUSINESS BANKING PAGE DOCUMENT TYPE STRUCTURE");
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

    var businessFolder =
        existingFolders.FirstOrDefault(x =>
            x.Name != null &&
            x.Name.Equals("React Business Banking Page", StringComparison.OrdinalIgnoreCase) &&
            x.ParentId == -1);

    if (businessFolder == null)
    {
        var folderResult =
            await contentTypeContainerService.CreateAsync(
                null,
                "React Business Banking Page",
                null,
                Constants.Security.SuperUserKey);

        if (!folderResult.Success || folderResult.Result == null)
        {
            Console.WriteLine(
                $"FAILED FOLDER: React Business Banking Page - {folderResult.Status}");

            return;
        }

        businessFolder = folderResult.Result;

        Console.WriteLine("CREATED FOLDER: React Business Banking Page");
    }
    else
    {
        Console.WriteLine("EXISTS FOLDER: React Business Banking Page");
    }

    var folderId = businessFolder.Id;

    // --------------------------------------------------------
    // SHARED SCALAR DATA TYPES (same pattern as create-home-schema/
    // create-product-loan-schema above - see their own comments)
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
                var existingProp =
                    existing.PropertyTypes.FirstOrDefault(p =>
                        p.Alias.Equals(prop.Alias, StringComparison.OrdinalIgnoreCase));

                if (existingProp != null)
                {
                    // Self-healing: fixes a property that was originally
                    // created Mandatory but whose content (e.g. heroSlide's
                    // own "image", seeded blank on purpose for pages with
                    // no real photo available yet - see create-business-
                    // content's own comment) is now deliberately left
                    // blank, which otherwise fails publish with
                    // FailedPublishContentInvalid every time (confirmed
                    // live) regardless of how many times this command
                    // re-runs, since this loop used to just skip an
                    // already-existing property entirely.
                    if (existingProp.Mandatory != prop.Mandatory)
                    {
                        existingProp.Mandatory = prop.Mandatory;
                        changed = true;

                        Console.WriteLine(
                            $"  ~ UPDATED PROPERTY: {alias}.{prop.Alias} " +
                            $"(mandatory -> {prop.Mandatory})");
                    }

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
    // BUSINESS HERO CAROUSEL
    // ==========================================================
    // Its own dedicated alias (businessHeroCarouselBlock), not a reuse of
    // homePage's heroCarouselBlock - the live page's own carousel is a
    // simpler, visually distinct style (plain navy band, no product grid),
    // and the React side's mapAnySection tries Home's own section mapper
    // first, so a shared 'heroCarouselBlock' alias would always render
    // with Home's carousel look regardless (see
    // BusinessHeroCarousel.tsx's own comment). heroSlide itself is still
    // the same shared leaf element type create-home-schema defines -
    // redeclared idempotently here same as every other shared block -
    // only the parent carousel wrapper is dedicated.

    Console.WriteLine();
    Console.WriteLine("--- business hero carousel ---");

    var heroSlide =
        GetOrCreateType(
            "heroSlide", "Hero Slide", "icon-carousel", true, false,
            // Not mandatory - a hero slide with no real photo available
            // yet (e.g. seeded by create-business-content/create-
            // tap2glass-content, both of which leave it blank on purpose)
            // must still be publishable; GetOrCreateType's own self-
            // healing (see its comment) fixes this on an already-created
            // heroSlide type too, not just a fresh one.
            new PropSpec("image", "Image", media),
            new PropSpec("titleMain", "Title", txt),
            new PropSpec("titleHighlight", "Title Highlight", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("cta", "Button", link));

    var businessHeroSlides =
        await GetOrCreateBlockListAsync(
            "React Migration - businessHeroCarouselBlock.slides", heroSlide);

    var businessHeroCarouselBlock =
        GetOrCreateType(
            "businessHeroCarouselBlock", "Business Hero Carousel", "icon-carousel", true, false,
            new PropSpec("slides", "Slides", businessHeroSlides),
            new PropSpec("autoAdvanceSeconds", "Auto-Advance Seconds", num),
            // Optional - blank on the main Business Banking page's own
            // carousel (unset on every instance seeded before this was
            // added, same backfill-as-blank behaviour as every other new
            // property here). Only a sub-page under Business Banking (e.g.
            // Tap2Glass) sets it, to show a "< Back" link above the hero
            // pointing at the Business Banking page itself - the React
            // side only renders that link when a real value is present
            // (see BusinessHeroCarousel.tsx), so this never appears on the
            // parent page's own hero.
            new PropSpec("backLink", "Back Link (optional)", link));

    // ==========================================================
    // BUSINESS PAGE CARD COMPONENTS
    // ==========================================================
    // cardOffering - the three small "Our offerings" cards (Bank/Borrow/
    // Invest): a title, a short description, and a button. cardIconFeature
    // - the two icon-led panels (MSME Access to Finance Report, Book A
    // Banker): an icon, a heading, a rich-text body, a button, and an
    // image (with an imageOnRight toggle, same convention as
    // promoSplitBlock/featureSplitBlock elsewhere in this file).

    Console.WriteLine();
    Console.WriteLine("--- business page card components ---");

    var cardOffering =
        GetOrCreateType(
            "cardOffering", "Card - Offering", "icon-thumbnail-list", true, false,
            new PropSpec("title", "Title", txt),
            new PropSpec("description", "Description", txtArea),
            new PropSpec("cta", "Button", link));

    var cardIconFeature =
        GetOrCreateType(
            "cardIconFeature", "Card - Icon Feature", "icon-lightbulb", true, false,
            new PropSpec("icon", "Icon", media),
            new PropSpec("heading", "Heading", txt),
            new PropSpec("bodyHtml", "Body", rte),
            new PropSpec("cta", "Button", link),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("imageOnRight", "Image On Right", boolType));

    // ==========================================================
    // OUR OFFERINGS SECTION
    // ==========================================================
    // Wraps cardOffering in a heading + Block List, same shape as
    // crossSellBlock/rewardsSectionBlock wrapping their own cards above.

    var businessOfferingsCards =
        await GetOrCreateBlockListAsync(
            "React Migration - businessOfferingsBlock.cards", cardOffering);

    var businessOfferingsBlock =
        GetOrCreateType(
            "businessOfferingsBlock", "Business Offerings", "icon-thumbnail-list", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("cards", "Cards", businessOfferingsCards));

    // ==========================================================
    // PLAIN TEXT INTRO + BENEFITS PANEL
    // ==========================================================
    // textIntroBlock - a lone heading plus a rich-text body, no image, no
    // card (e.g. Tap2Glass's own "Why choose Tap2Glass?" intro) - none of
    // the existing heading+body blocks fit without several unused fields
    // (promoSplitBlock's two CTAs, heroImageBannerBlock's image), so this
    // is intentionally the minimal shape instead of overloading one of
    // those. benefitsPanelBlock - a heading, a green divider, and an
    // arrow-bulleted feature list (not a checkmark list like
    // featureChecklistBlock's own - a visually distinct card, reusing the
    // same shared featureItem element type for its items) beside an
    // image, wrapped in the same card look as cardIconFeature.

    Console.WriteLine();
    Console.WriteLine("--- text intro + benefits panel ---");

    var textIntroBlock =
        GetOrCreateType(
            "textIntroBlock", "Text Intro", "icon-article", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("bodyHtml", "Body", rte));

    var featureItem =
        GetOrCreateType(
            "featureItem", "Feature Item", "icon-bulleted-list", true, false,
            new PropSpec("text", "Text", txt));

    var benefitsPanelFeatures =
        await GetOrCreateBlockListAsync(
            "React Migration - benefitsPanelBlock.features", featureItem);

    var benefitsPanelBlock =
        GetOrCreateType(
            "benefitsPanelBlock", "Benefits Panel", "icon-trophy", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("features", "Features", benefitsPanelFeatures),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt),
            new PropSpec("imageOnRight", "Image On Right", boolType));

    // faqSectionBlock/faqItem - reused as-is from create-home-schema (same
    // alias/shape, idempotent - either command can run first), e.g.
    // Tap2Glass's own FAQ section.

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

    // ==========================================================
    // ICON GRID, DOCUMENT REQUIREMENTS, PRICING GUIDE
    // ==========================================================
    // iconGridBlock - a heading plus a row of small icon+label items (no
    // card, no description - e.g. "Easy online access"/"Free EFT deposit"
    // on Business Transactional Account), reusing heroGridItem (icon,
    // label, link - already shared from create-home-schema) rather than a
    // new leaf type, since the shape is identical.
    //
    // documentRequirementsBlock - a heading, a tab list of named
    // categories (documentCategory: a name plus a list of document names,
    // reusing featureItem) and a trailing sizes/formats note.
    //
    // pricingGuideBlock - a heading, a list of named downloadable files
    // beside an image. Its own dedicated leaf type (pricingLinkItem)
    // rather than reusing downloadItem/downloadsSectionBlock - those are
    // already claimed by Home's own DownloadsSection look (same
    // shared-alias-different-page-visual reasoning as
    // businessHeroCarouselBlock's own comment above).

    Console.WriteLine();
    Console.WriteLine("--- icon grid, document requirements, pricing guide ---");

    var heroGridItem =
        GetOrCreateType(
            "heroGridItem", "Hero Grid Item", "icon-grid", true, false,
            new PropSpec("icon", "Icon", media),
            new PropSpec("label", "Label", txt),
            new PropSpec("link", "Link", link));

    var iconGridItems =
        await GetOrCreateBlockListAsync(
            "React Migration - iconGridBlock.items", heroGridItem);

    var iconGridBlock =
        GetOrCreateType(
            "iconGridBlock", "Icon Grid", "icon-grid", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("items", "Items", iconGridItems));

    var documentCategoryDocuments =
        await GetOrCreateBlockListAsync(
            "React Migration - documentCategory.documents", featureItem);

    var documentCategory =
        GetOrCreateType(
            "documentCategory", "Document Category", "icon-folder", true, false,
            new PropSpec("categoryName", "Category Name", txt),
            new PropSpec("documents", "Documents", documentCategoryDocuments));

    var documentRequirementsCategories =
        await GetOrCreateBlockListAsync(
            "React Migration - documentRequirementsBlock.categories", documentCategory);

    var documentRequirementsBlock =
        GetOrCreateType(
            "documentRequirementsBlock", "Document Requirements", "icon-document", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("categories", "Categories", documentRequirementsCategories),
            new PropSpec("sizesFormatsHeading", "Sizes/Formats Heading", txt),
            new PropSpec("sizesFormatsText", "Sizes/Formats Text", rte));

    var pricingLinkItem =
        GetOrCreateType(
            "pricingLinkItem", "Pricing Link Item", "icon-download-alt", true, false,
            new PropSpec("label", "Label", txt),
            new PropSpec("file", "File", media));

    var pricingGuideLinks =
        await GetOrCreateBlockListAsync(
            "React Migration - pricingGuideBlock.links", pricingLinkItem);

    var pricingGuideBlock =
        GetOrCreateType(
            "pricingGuideBlock", "Pricing Guide", "icon-download-alt", true, false,
            new PropSpec("heading", "Heading", txt),
            new PropSpec("links", "Links", pricingGuideLinks),
            new PropSpec("image", "Image", media),
            new PropSpec("imageAlt", "Image Alt Text", txt));

    // ==========================================================
    // BUSINESS BANKING PAGE
    // ==========================================================
    // Reused generically for every Business Banking page, not just the
    // top-level one - e.g. Tap2Glass (a sub-page under it) is its own
    // separate businessBankingPage content node with a different mix of
    // these same section types, same as how any page type here is reused
    // across several real content nodes.

    Console.WriteLine();
    Console.WriteLine("--- business banking page ---");

    var businessBankingPageSections =
        await GetOrCreateBlockListAsync(
            "React Migration - businessBankingPage.sections",
            businessHeroCarouselBlock,
            businessOfferingsBlock,
            cardIconFeature,
            textIntroBlock,
            benefitsPanelBlock,
            faqSectionBlock,
            iconGridBlock,
            documentRequirementsBlock,
            pricingGuideBlock);

    GetOrCreateType(
        "businessBankingPage", "Business Banking Page", "icon-briefcase", false, true,
        new PropSpec("sections", "Page Sections", businessBankingPageSections));

    // ==========================================================
    // RESULT
    // ==========================================================

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("BUSINESS BANKING PAGE SCHEMA CREATED");
    Console.WriteLine("=================================================");
    Console.WriteLine();
    Console.WriteLine(
        "Document types are created empty - no content values were seeded " +
        "from the live page. cardIconFeature has no own BlockList wrapper - " +
        "add it directly to businessBankingPage's sections twice (once per " +
        "panel), same as appDownloadBlock is added directly elsewhere. " +
        "Create a Business Banking Page content node in the backoffice and " +
        "populate it by hand.");

    return;
}

// ============================================================
// CREATE-BUSINESS-CONTENT COMMAND
// ============================================================
//
// Builds one real businessBankingPage content node under the Home node
// (so it lands at /en/home/business-banking/, matching the live page's own
// URL), using the Document Types create-business-schema defines. Content
// is real, ported directly from the live page's body: 3 hero carousel
// slides, the 3 "Our offerings" cards (Bank/Borrow/Invest), and the 2 icon
// feature panels (MSME Access to Finance Report, Book A Banker).
//
// Images (the vector illustrations, finfindbanner, icon-report.svg,
// book-banker.svg) are deliberately left null - those are the live site's
// own Media library files, not available here, same honest "no real photo
// available" choice create-consolidation-loan-content already makes for
// heroBannerBlock.image/appDownloadBlock.image above. Add them via the
// backoffice's Media Picker once you have the real files. The "Book A
// Banker" panel's own button is left null too (its real href is empty -
// "Coming soon", not a real destination).
//
// Rich text (cardIconFeature.bodyHtml) uses BuildRichText below - the same
// proven {markup, blocks:{layout,contentData,settingsData}} envelope
// migrate-product-loan-pages' own BuildRichText already uses safely
// elsewhere (see its own comment on why a raw guess at this shape was
// risky before that helper existed).
//
// Idempotent: finds an existing "Business Banking" node by name under the
// Home node (or wherever it was moved to) and updates its sections in
// place rather than duplicating it, same pattern as every other content-
// creation command above.

if (args.Length > 0 &&
    args[0].Equals("create-business-content", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" CREATE BUSINESS BANKING CONTENT");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var businessBankingPageType = contentTypeService.Get("businessBankingPage");
    var businessHeroCarouselBlockType = contentTypeService.Get("businessHeroCarouselBlock");
    var heroSlideType = contentTypeService.Get("heroSlide");
    var businessOfferingsBlockType = contentTypeService.Get("businessOfferingsBlock");
    var cardOfferingType = contentTypeService.Get("cardOffering");
    var cardIconFeatureType = contentTypeService.Get("cardIconFeature");

    if (businessBankingPageType == null || businessHeroCarouselBlockType == null ||
        heroSlideType == null || businessOfferingsBlockType == null ||
        cardOfferingType == null || cardIconFeatureType == null)
    {
        Console.WriteLine(
            "ERROR: one or more required content types are missing - run " +
            "'create-business-schema' first.");

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

    JsonObject BuildRichText(string html) =>
        new JsonObject
        {
            ["markup"] = html,
            ["blocks"] =
                new JsonObject
                {
                    ["layout"] = new JsonObject(),
                    ["contentData"] = new JsonArray(),
                    ["settingsData"] = new JsonArray()
                }
        };

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

    // --------------------------------------------------------
    // HERO CAROUSEL - 3 slides, ported from the live carousel
    // --------------------------------------------------------

    var heroSlides =
        BuildBlockList(
            heroSlideType,
            new[]
            {
                new Dictionary<string, JsonNode?>
                {
                    ["titleMain"] = "Welcome to Business and Commercial",
                    ["description"] =
                        "At African Bank Business and Commercial, we are here to help " +
                        "your business grow. We offer simple solutions to support your " +
                        "plans, manage your money, and build a better future. We listen " +
                        "to your needs and find what works best for you.",
                },
                new Dictionary<string, JsonNode?>
                {
                    ["titleMain"] =
                        "Need R20 000 to R5 million for your business? We will back you.",
                    ["description"] =
                        "Qualify for a Digital Business Loan if your business makes " +
                        "R1 million+ in turnover per year.\n\nNo queues and no hidden " +
                        "fees with funds paid into your account within 48 hours from " +
                        "approval.",
                    ["cta"] =
                        BuildExternalLink(
                                "Apply now", "/en/home/business-and-commercial-banking/")
                            .ToJsonString(),
                },
                new Dictionary<string, JsonNode?>
                {
                    ["titleMain"] =
                        "Unlock Funding Insights with the MSME Access to Finance Report",
                    ["description"] =
                        "Discover what lenders are looking for. Learn about funding " +
                        "trends, common barriers to finance, and how to improve your " +
                        "chances of approval — so you can apply with confidence and " +
                        "grow your business.",
                    ["cta"] =
                        BuildExternalLink("explore", "/en/home/business-banking/contact")
                            .ToJsonString(),
                },
            });

    var heroCarouselUdi = $"umb://element/{Guid.NewGuid():N}";

    var heroCarouselContentData =
        new JsonObject
        {
            ["contentTypeKey"] = businessHeroCarouselBlockType.Key.ToString(),
            ["udi"] = heroCarouselUdi,
            ["slides"] = heroSlides.ToJsonString(),
        };

    // --------------------------------------------------------
    // OUR OFFERINGS - 3 cards (Bank/Borrow/Invest)
    // --------------------------------------------------------

    var offeringCards =
        BuildBlockList(
            cardOfferingType,
            new[]
            {
                new Dictionary<string, JsonNode?>
                {
                    ["title"] = "Bank",
                    ["description"] = "Manage your business accounts securely, online.",
                    ["cta"] = BuildExternalLink("Explore", "/en/home/bank/").ToJsonString(),
                },
                new Dictionary<string, JsonNode?>
                {
                    ["title"] = "Borrow",
                    ["description"] =
                        "Get the money your business needs with easy and flexible " +
                        "financing options.",
                    ["cta"] =
                        BuildExternalLink(
                                "Explore", "/en/home/business-and-commercial-banking/")
                            .ToJsonString(),
                },
                new Dictionary<string, JsonNode?>
                {
                    ["title"] = "Invest",
                    ["description"] =
                        "Achieve your business goals with secure, high-return savings " +
                        "solutions.",
                    ["cta"] = BuildExternalLink("Explore", "/en/home/invest/").ToJsonString(),
                },
            });

    var businessOfferingsUdi = $"umb://element/{Guid.NewGuid():N}";

    var businessOfferingsContentData =
        new JsonObject
        {
            ["contentTypeKey"] = businessOfferingsBlockType.Key.ToString(),
            ["udi"] = businessOfferingsUdi,
            ["heading"] = "Our offerings",
            ["cards"] = offeringCards.ToJsonString(),
        };

    // --------------------------------------------------------
    // ICON FEATURE PANELS - MSME Access to Finance Report, Book A Banker
    // --------------------------------------------------------

    var msmeReportUdi = $"umb://element/{Guid.NewGuid():N}";

    var msmeReportContentData =
        new JsonObject
        {
            ["contentTypeKey"] = cardIconFeatureType.Key.ToString(),
            ["udi"] = msmeReportUdi,
            ["heading"] = "Access to finance insights, all in one place",
            ["bodyHtml"] =
                BuildRichText(
                        "<p>Gain <strong>expert-backed insights,</strong> so you can " +
                        "apply for funding with confidence.</p><p>Download the " +
                        "<strong>MSME Access to Finance Report</strong> and uncover " +
                        "funding trends, common barriers, and what lenders are really " +
                        "looking for. This report will help you understand where you " +
                        "stand and <strong>improve your chances for approval</strong>.</p>")
                    .ToJsonString(),
            ["cta"] =
                BuildExternalLink("Explore", "/en/home/business-banking/contact/")
                    .ToJsonString(),
            ["imageOnRight"] = true,
        };

    var bookBankerUdi = $"umb://element/{Guid.NewGuid():N}";

    var bookBankerContentData =
        new JsonObject
        {
            ["contentTypeKey"] = cardIconFeatureType.Key.ToString(),
            ["udi"] = bookBankerUdi,
            ["heading"] = "Book A Banker, banking on your schedule",
            ["bodyHtml"] =
                BuildRichText(
                        "<p>With our easy online booking system, you can " +
                        "<strong>schedule and manage</strong> a virtual meeting with " +
                        "one of our expert Business Bankers in just 4 simple steps.</p>" +
                        "<p>Whether you need <strong>help with business loans, " +
                        "financial planning,</strong> or <strong>any other banking " +
                        "needs,</strong> our experts are here to offer " +
                        "<strong>personalised support,</strong> all from the comfort " +
                        "of your home, office or anywhere you are.</p>")
                    .ToJsonString(),
            // No real cta - the live page's own button here is a disabled
            // "Coming soon" with an empty href, not a real destination.
            ["imageOnRight"] = true,
        };

    // --------------------------------------------------------
    // PAGE SECTIONS - hero carousel, offerings, 2 icon feature panels
    // --------------------------------------------------------

    var sectionsValue =
        new JsonObject
        {
            ["layout"] =
                new JsonObject
                {
                    ["Umbraco.BlockList"] =
                        new JsonArray(
                            new JsonObject { ["contentUdi"] = heroCarouselUdi },
                            new JsonObject { ["contentUdi"] = businessOfferingsUdi },
                            new JsonObject { ["contentUdi"] = msmeReportUdi },
                            new JsonObject { ["contentUdi"] = bookBankerUdi })
                },
            ["contentData"] =
                new JsonArray(
                    heroCarouselContentData,
                    businessOfferingsContentData,
                    msmeReportContentData,
                    bookBankerContentData)
        };

    // --------------------------------------------------------
    // PLACEMENT - as a child of the Home node, so the route comes out as
    // /en/home/business-banking/ (Umbraco slugifies the node name)
    // --------------------------------------------------------

    var parentId = -1;
    var parentDescription = "root";

    var pageHomeType = contentTypeService.Get("pageHome");

    var homeNode =
        pageHomeType == null
            ? null
            : contentService
                .GetPagedOfType(pageHomeType.Id, 0, 10, out _, null!)
                .FirstOrDefault();

    if (homeNode != null)
    {
        parentId = homeNode.Id;
        parentDescription = $"child of \"{homeNode.Name}\" (id={parentId})";
    }
    else
    {
        Console.WriteLine(
            "NOTE: no 'pageHome' content node found - creating at root instead. " +
            "You may need to move this node under Home in the content tree " +
            "afterward so its route matches /en/home/business-banking/.");
    }

    const string nodeName = "Business Banking";

    // This site's own migrated legacy content already has a REAL page
    // named exactly "Business Banking" directly under Home (a pre-
    // existing baseModernUI-typed node, confirmed live) - the same
    // situation migrate-product-loan-pages' own comment describes for
    // productLoanPage ("two published nodes can't share a route"). Rename
    // that legacy sibling (not touched otherwise - its own content/SEO
    // metadata stays intact, just at a new name) to free up the exact
    // name/route for the new businessBankingPage node below. Scoped
    // strictly to a DIRECT CHILD of Home with the exact legacy name - this
    // site has several unrelated "Business Banking"-named nodes elsewhere
    // in the tree (card/File/Folder types), which this must not touch.
    if (parentId != -1)
    {
        var legacySibling =
            contentService
                .GetPagedChildren(parentId, 0, 500, out _, null!)
                .FirstOrDefault(n =>
                    !n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                    n.Name != null &&
                    n.Name.Equals(nodeName, StringComparison.OrdinalIgnoreCase));

        if (legacySibling != null)
        {
            var legacyName = $"{legacySibling.Name} (Legacy)";
            legacySibling.Name = legacyName;
            contentService.Save(legacySibling);
            var legacyPublishResult = contentService.Publish(legacySibling, new[] { "*" });

            Console.WriteLine(
                $"RENAMED LEGACY SIBLING: \"{nodeName}\" (id={legacySibling.Id}) -> " +
                $"\"{legacyName}\" - frees up the route for the node below. " +
                $"Publish: {legacyPublishResult.Result}");
        }
    }

    // Self-heals the duplicate "Business Banking (1)"/"(2)"/... nodes an
    // earlier run of this command created (before the legacy-sibling
    // rename above existed, every run collided with that legacy node and
    // got auto-renamed by Umbraco instead of ever finding its own
    // previous output - this lookup only checked for an EXACT name match,
    // which a "(1)"-suffixed name never satisfies). Matches any
    // businessBankingPage-typed direct child of Home whose name is the
    // target name or that name plus a Umbraco-style " (n)" suffix, keeps
    // the oldest (lowest id) as the real node, and trashes the rest.
    var candidateNodes =
        (parentId == -1
            ? contentService.GetPagedOfType(businessBankingPageType.Id, 0, 50, out _, null!)
            : contentService.GetPagedChildren(parentId, 0, 500, out _, null!))
            .Where(n =>
                n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                n.Name != null &&
                (n.Name.Equals(nodeName, StringComparison.OrdinalIgnoreCase) ||
                 Regex.IsMatch(n.Name, $@"^{Regex.Escape(nodeName)} \(\d+\)$")))
            .OrderBy(n => n.Id)
            .ToList();

    IContent node;

    if (candidateNodes.Count > 0)
    {
        node = candidateNodes[0];

        foreach (var duplicate in candidateNodes.Skip(1))
        {
            contentService.Delete(duplicate);

            Console.WriteLine($"DELETED DUPLICATE: \"{duplicate.Name}\" (id={duplicate.Id})");
        }

        if (node.Name != nodeName)
        {
            node.Name = nodeName;

            Console.WriteLine($"RENAMED: \"{candidateNodes[0].Name}\" (id={node.Id}) -> \"{nodeName}\"");
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
        node = contentService.Create(nodeName, parentId, "businessBankingPage");

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
        Console.WriteLine($"SAVED BUT FAILED PUBLISH: {node.Name} (id={node.Id}) - {publishResult.Result}");

        return;
    }

    Console.WriteLine();
    Console.WriteLine($"DONE. Published \"{nodeName}\" (id={node.Id}).");
    Console.WriteLine("View it at /en/home/business-banking/");
    Console.WriteLine(
        "No images were set (illustrations/finfindbanner/icon-report/book-" +
        "banker) and the 'Book A Banker' panel has no button - add those in " +
        "the backoffice (Media Picker / Link Picker) once you have the real " +
        "files/destination. Everything else (headings/copy/working buttons) " +
        "is real content from the live page.");

    return;
}

// ============================================================
// CREATE-BANKING-PAGE-STRUCTURE COMMAND
// ============================================================
//
// Adds the "Personal Banking" page (new - no such node exists yet,
// confirmed against the live local DB) as a sibling of the existing
// "Business Banking" node under Home, then gives each of the two a shared
// set of empty sub-pages - "Products"/"Campaigns"/"Blogs" under both, plus
// "About Company" (Personal Banking only) and "SMEs" (Business Banking
// only). Every new node reuses businessBankingPage (the same generic
// "sections" Block List type create-business-content's own comment
// describes as "reused generically for every Business Banking page, not
// just the top-level one") rather than a new document type - these are
// empty containers, created with no sections set, same "create it empty,
// populate it by hand in the backoffice" choice create-business-schema's
// own result message already makes.
//
// Also sets businessBankingPage's own allowed child types to itself, the
// same fix fix-home-allowed-children below applies to pageHome - without
// it the backoffice blocks creating/moving a page under these new parents
// even though IContentService.Create (used below) isn't itself blocked by
// it (see fix-home-allowed-children's own comment on why).
//
// Does NOT touch any existing content - the flat productLoanPage/
// businessBankingPage siblings already under Home (Product 12% Loan,
// Tap2Glass, Business Transactional Account, ...) are left exactly where
// they are; nothing is moved or deleted. Idempotent: finds existing nodes
// by exact name + type under the right parent and skips creating them
// again.

if (args.Length > 0 &&
    args[0].Equals("create-banking-page-structure", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" CREATE PERSONAL/BUSINESS BANKING PAGE STRUCTURE");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var businessBankingPageType = contentTypeService.Get("businessBankingPage");

    if (businessBankingPageType == null)
    {
        Console.WriteLine(
            "ERROR: 'businessBankingPage' content type not found - run " +
            "'create-business-schema' first.");

        return;
    }

    var currentAllowed =
        (businessBankingPageType.AllowedContentTypes ?? Enumerable.Empty<ContentTypeSort>())
            .ToList();

    // businessBankingPage itself (so Products/Campaigns/Blogs/SMEs/About
    // Company can nest further businessBankingPage children), plus
    // productLoanPage (so the Products folder can also take the
    // move-products-under-personal-banking command's own nodes via the
    // backoffice afterward, not just this command's direct DB writes).
    var requiredAllowedAliases = new[] { "businessBankingPage", "productLoanPage" };

    foreach (var alias in requiredAllowedAliases)
    {
        if (currentAllowed.Any(t => t.Alias == alias))
        {
            Console.WriteLine($"EXISTS: businessBankingPage already allows \"{alias}\" as a child type.");

            continue;
        }

        var allowedType =
            alias == businessBankingPageType.Alias
                ? businessBankingPageType
                : contentTypeService.Get(alias);

        if (allowedType == null)
        {
            Console.WriteLine($"SKIPPED: content type \"{alias}\" not found.");

            continue;
        }

        currentAllowed.Add(new ContentTypeSort(allowedType.Key, currentAllowed.Count, allowedType.Alias));

        Console.WriteLine($"SET: businessBankingPage now allows \"{alias}\" as a child type.");
    }

    businessBankingPageType.AllowedContentTypes = currentAllowed;

    contentTypeService.Save(businessBankingPageType);

    var pageHomeType = contentTypeService.Get("pageHome");

    var homeNode =
        pageHomeType == null
            ? null
            : contentService
                .GetPagedOfType(pageHomeType.Id, 0, 10, out _, null!)
                .FirstOrDefault();

    if (homeNode == null)
    {
        Console.WriteLine("ERROR: no 'pageHome' content node found.");

        return;
    }

    IContent EnsureChildPage(string name, IContent parent)
    {
        var existing =
            contentService
                .GetPagedChildren(parent.Id, 0, 500, out _, null!)
                .FirstOrDefault(n =>
                    n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                    n.Name != null &&
                    n.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (existing != null)
        {
            Console.WriteLine($"EXISTS: \"{name}\" (id={existing.Id}) under \"{parent.Name}\".");

            return existing;
        }

        var created = contentService.Create(name, parent.Id, "businessBankingPage");
        var saveResult = contentService.Save(created);

        if (!saveResult.Success)
        {
            Console.WriteLine($"FAILED SAVE: \"{name}\" under \"{parent.Name}\".");

            return created;
        }

        var publishResult = contentService.Publish(created, new[] { "*" });

        Console.WriteLine(
            $"CREATED: \"{name}\" (id={created.Id}) under \"{parent.Name}\" - " +
            $"publish: {publishResult.Result}.");

        return created;
    }

    // --------------------------------------------------------
    // PERSONAL BANKING (new - didn't exist before this command)
    // --------------------------------------------------------

    var personalBanking = EnsureChildPage("Personal Banking", homeNode);

    foreach (var name in new[] { "Products", "Campaigns", "About Company", "Blogs" })
    {
        EnsureChildPage(name, personalBanking);
    }

    // --------------------------------------------------------
    // BUSINESS BANKING (already exists - create-business-content's node)
    // --------------------------------------------------------

    var businessBanking =
        contentService
            .GetPagedChildren(homeNode.Id, 0, 500, out _, null!)
            .FirstOrDefault(n =>
                n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                n.Name != null &&
                n.Name.Equals("Business Banking", StringComparison.OrdinalIgnoreCase));

    if (businessBanking == null)
    {
        Console.WriteLine(
            "WARNING: no \"Business Banking\" node found under Home - run " +
            "'create-business-content' first. Skipping its sub-pages.");
    }
    else
    {
        foreach (var name in new[] { "Products", "Campaigns", "Blogs", "SMEs" })
        {
            EnsureChildPage(name, businessBanking);
        }
    }

    Console.WriteLine();
    Console.WriteLine("DONE.");

    return;
}

// ============================================================
// MOVE-PRODUCTS-UNDER-PERSONAL-BANKING COMMAND
// ============================================================
//
// Moves every productLoanPage node that's currently a direct child of Home
// (Product 12% Loan, Product Consolidation Loan, Product Personal Loan,
// Tech Deals, Credit Report, Talk To Us, ...) under "Personal Banking >
// Products" (create-banking-page-structure's own node), matching the
// Personal Banking section of the target content tree instead of sitting
// flat under Home. Doesn't touch the businessBankingPage-typed siblings
// (Tap2Glass, Business Transactional Account) - those weren't part of
// this request, so they stay where they are.
//
// No data is lost - Move keeps the node (and everything under it) intact,
// just reparents it; published content stays published.
//
// Idempotent: a node already moved out from under Home (into Products, or
// anywhere else) no longer shows up in the "direct child of Home" query
// this runs, so re-running finds nothing left to move.

if (args.Length > 0 &&
    args[0].Equals("move-products-under-personal-banking", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" MOVE PRODUCT PAGES UNDER PERSONAL BANKING > PRODUCTS");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var pageHomeType = contentTypeService.Get("pageHome");

    var homeNode =
        pageHomeType == null
            ? null
            : contentService
                .GetPagedOfType(pageHomeType.Id, 0, 10, out _, null!)
                .FirstOrDefault();

    if (homeNode == null)
    {
        Console.WriteLine("ERROR: no 'pageHome' content node found.");

        return;
    }

    var personalBanking =
        contentService
            .GetPagedChildren(homeNode.Id, 0, 500, out _, null!)
            .FirstOrDefault(n =>
                n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                n.Name != null &&
                n.Name.Equals("Personal Banking", StringComparison.OrdinalIgnoreCase));

    if (personalBanking == null)
    {
        Console.WriteLine(
            "ERROR: no \"Personal Banking\" node found under Home - run " +
            "'create-banking-page-structure' first.");

        return;
    }

    var productsFolder =
        contentService
            .GetPagedChildren(personalBanking.Id, 0, 500, out _, null!)
            .FirstOrDefault(n =>
                n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                n.Name != null &&
                n.Name.Equals("Products", StringComparison.OrdinalIgnoreCase));

    if (productsFolder == null)
    {
        Console.WriteLine(
            "ERROR: no \"Products\" node found under Personal Banking - run " +
            "'create-banking-page-structure' first.");

        return;
    }

    var toMove =
        contentService
            .GetPagedChildren(homeNode.Id, 0, 500, out _, null!)
            .Where(n => n.ContentType.Alias.Equals("productLoanPage", StringComparison.OrdinalIgnoreCase))
            .ToList();

    if (toMove.Count == 0)
    {
        Console.WriteLine("Nothing to move - no productLoanPage nodes are direct children of Home.");
    }

    foreach (var node in toMove)
    {
        var moveResult = contentService.Move(node, productsFolder.Id);

        Console.WriteLine(
            $"MOVED: \"{node.Name}\" (id={node.Id}) -> Personal Banking > Products. " +
            $"Result: {moveResult}");
    }

    Console.WriteLine();
    Console.WriteLine("DONE.");

    return;
}

// ============================================================
// MOVE-BUSINESS-PAGES-UNDER-BUSINESS-BANKING COMMAND
// ============================================================
//
// Moves every businessBankingPage node that's currently a direct child of
// Home OTHER than "Business Banking" and "Personal Banking" themselves
// (Tap2Glass, Business Transactional Account) under "Business Banking >
// Products", matching move-products-under-personal-banking's own move for
// Personal Banking's product pages. Same guarantees: Move reparents in
// place (nothing lost/republished-wrong), idempotent (a node already moved
// out from under Home no longer matches the "direct child of Home" query
// this runs).

if (args.Length > 0 &&
    args[0].Equals("move-business-pages-under-business-banking", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" MOVE BUSINESS PAGES UNDER BUSINESS BANKING > PRODUCTS");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var pageHomeType = contentTypeService.Get("pageHome");

    var homeNode =
        pageHomeType == null
            ? null
            : contentService
                .GetPagedOfType(pageHomeType.Id, 0, 10, out _, null!)
                .FirstOrDefault();

    if (homeNode == null)
    {
        Console.WriteLine("ERROR: no 'pageHome' content node found.");

        return;
    }

    var homeChildren =
        contentService
            .GetPagedChildren(homeNode.Id, 0, 500, out _, null!)
            .ToList();

    var businessBanking =
        homeChildren.FirstOrDefault(n =>
            n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
            n.Name != null &&
            n.Name.Equals("Business Banking", StringComparison.OrdinalIgnoreCase));

    if (businessBanking == null)
    {
        Console.WriteLine(
            "ERROR: no \"Business Banking\" node found under Home - run " +
            "'create-business-content' first.");

        return;
    }

    var productsFolder =
        contentService
            .GetPagedChildren(businessBanking.Id, 0, 500, out _, null!)
            .FirstOrDefault(n =>
                n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                n.Name != null &&
                n.Name.Equals("Products", StringComparison.OrdinalIgnoreCase));

    if (productsFolder == null)
    {
        Console.WriteLine(
            "ERROR: no \"Products\" node found under Business Banking - run " +
            "'create-banking-page-structure' first.");

        return;
    }

    var personalBanking =
        homeChildren.FirstOrDefault(n =>
            n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
            n.Name != null &&
            n.Name.Equals("Personal Banking", StringComparison.OrdinalIgnoreCase));

    var toMove =
        homeChildren
            .Where(n =>
                n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                n.Id != businessBanking.Id &&
                (personalBanking == null || n.Id != personalBanking.Id))
            .ToList();

    if (toMove.Count == 0)
    {
        Console.WriteLine(
            "Nothing to move - no other businessBankingPage nodes are direct " +
            "children of Home.");
    }

    foreach (var node in toMove)
    {
        var moveResult = contentService.Move(node, productsFolder.Id);

        Console.WriteLine(
            $"MOVED: \"{node.Name}\" (id={node.Id}) -> Business Banking > Products. " +
            $"Result: {moveResult}");
    }

    Console.WriteLine();
    Console.WriteLine("DONE.");

    return;
}

// ============================================================
// REMOVE-EN-LANGUAGE-NODE COMMAND
// ============================================================
//
// Home currently sits three levels deep - Public Site (redirect) > EN
// (ebankITLanguage) > Home (pageHome) - a legacy v8 multi-language wrapper
// that's never had more than the one "EN" child and isn't used for actual
// language variance here (Umbraco's own culture/language system handles
// that; this is just a leftover content node named "EN"). Removes it by
// moving Home up to be a direct child of EN's own parent (Public Site -
// left alone, along with whatever else lives under it, e.g. Sitemap),
// then trashing the now-empty "EN" node itself.
//
// Trashes (MoveToRecycleBin) rather than permanently deletes - reversible
// from the backoffice's own Recycle Bin > Restore if this turns out to be
// wrong, same reversibility fix-home-allowed-children's own trashed-node
// restore path relies on.
//
// Idempotent: if Home's parent isn't an "EN" node (already removed, or
// never existed), this is a no-op.

if (args.Length > 0 &&
    args[0].Equals("remove-en-language-node", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" REMOVE EN LANGUAGE NODE");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var pageHomeType = contentTypeService.Get("pageHome");

    var homeNode =
        pageHomeType == null
            ? null
            : contentService
                .GetPagedOfType(pageHomeType.Id, 0, 10, out _, null!)
                .FirstOrDefault();

    if (homeNode == null)
    {
        Console.WriteLine("ERROR: no 'pageHome' content node found.");

        return;
    }

    var languageNode =
        homeNode.ParentId > 0 ? contentService.GetById(homeNode.ParentId) : null;

    if (languageNode == null ||
        languageNode.Name == null ||
        !languageNode.Name.Equals("EN", StringComparison.OrdinalIgnoreCase))
    {
        Console.WriteLine(
            "Home's parent is not an \"EN\" node " +
            (languageNode == null
                ? "(Home is already at the root or has no parent)"
                : $"(it's \"{languageNode.Name}\", id={languageNode.Id})") +
            " - nothing to do.");

        return;
    }

    var newParentId = languageNode.ParentId;

    var moveResult = contentService.Move(homeNode, newParentId);

    Console.WriteLine(
        $"MOVED: \"Home\" (id={homeNode.Id}) -> parent id {newParentId} " +
        $"(EN's own parent). Result: {moveResult}");

    var trashResult = contentService.MoveToRecycleBin(languageNode);

    Console.WriteLine(
        $"TRASHED: \"EN\" (id={languageNode.Id}). Result: {trashResult}");

    Console.WriteLine();
    Console.WriteLine("DONE.");

    return;
}

// ============================================================
// FIX-HOME-ALLOWED-CHILDREN COMMAND
// ============================================================
//
// Home's own Document Type (pageHome) has an empty "allowed child node
// types" list in this database - confirmed live: it's what already lets
// real children exist under Home today (productLoanPage, businessBankingPage,
// homePageElements - that check is only enforced by the backoffice UI's own
// create/move/restore flows, not by IContentService.Create/Move called
// directly, which is how every create-*-content command above added its
// own children without ever hitting it). It's exactly why restoring a
// trashed node back under Home from the backoffice's Recycle Bin fails
// with a 400 "operation was not permitted" - confirmed live via the
// backoffice's own browser console error.
//
// Sets the allow-list to the content types that already exist as real
// children of Home (read off this exact database), so the backoffice UI
// stops blocking an action its own existing content already proves is
// fine. Idempotent - re-running just confirms/re-sets the same list.
//
// Optionally also restores one specific trashed node back under Home in
// the same run (pass its GUID as a second argument) - e.g.:
//   dotnet run -- fix-home-allowed-children 9bd96777-5a67-488d-8c70-465a6ce7d84b

if (args.Length > 0 &&
    args[0].Equals("fix-home-allowed-children", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" FIX HOME ALLOWED CHILD TYPES");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var pageHomeType = contentTypeService.Get("pageHome");

    if (pageHomeType == null)
    {
        Console.WriteLine("ERROR: 'pageHome' content type not found.");

        return;
    }

    var childAliases =
        new[] { "homePageElements", "productLoanPage", "businessBankingPage" };

    var childTypes =
        childAliases
            .Select(alias => contentTypeService.Get(alias))
            .Where(t => t != null)
            .Cast<IContentType>()
            .ToList();

    var sort = 0;

    pageHomeType.AllowedContentTypes =
        childTypes
            .Select(t => new ContentTypeSort(t.Key, sort++, t.Alias))
            .ToList();

    contentTypeService.Save(pageHomeType);

    Console.WriteLine(
        $"SET: pageHome's allowed child types -> " +
        string.Join(", ", childTypes.Select(t => t.Alias)));

    if (args.Length > 1 && Guid.TryParse(args[1], out var nodeKey))
    {
        var node = contentService.GetById(nodeKey);

        if (node == null)
        {
            Console.WriteLine($"ERROR: no content node found with key {nodeKey}.");

            return;
        }

        var homeNode =
            contentService
                .GetPagedOfType(pageHomeType.Id, 0, 10, out _, null!)
                .FirstOrDefault();

        if (homeNode == null)
        {
            Console.WriteLine("ERROR: no 'pageHome' content node found to restore under.");

            return;
        }

        // Move() out of the recycle bin is the same underlying operation
        // the backoffice's own "Restore" button performs - it un-trashes
        // the node as part of moving it.
        var moveResult = contentService.Move(node, homeNode.Id);

        Console.WriteLine(
            $"RESTORE: \"{node.Name}\" (id={node.Id}) -> child of " +
            $"\"{homeNode.Name}\" (id={homeNode.Id}). Result: {moveResult}");
    }

    Console.WriteLine();
    Console.WriteLine("DONE.");

    return;
}

// ============================================================
// INSPECT-CONTENT-TYPE COMMAND (temporary diagnostic)
// ============================================================
//
// Dumps a content type's own property groups/types exactly as
// IContentTypeService sees them right now - used to settle whether a
// property shown in the backoffice (e.g. a "Title"/"SEO" group seen on a
// content node) actually lives on that node's own content type, or comes
// from somewhere else (a composition, a core Umbraco feature, etc.).
//
//   dotnet run -- inspect-content-type businessBankingPage

if (args.Length > 0 &&
    args[0].Equals("inspect-content-type", StringComparison.OrdinalIgnoreCase))
{
    if (args.Length < 2)
    {
        Console.WriteLine("Usage: dotnet run -- inspect-content-type <alias>");

        return;
    }

    var contentTypeServiceDiag =
        app.Services.GetRequiredService<IContentTypeService>();

    var type = contentTypeServiceDiag.Get(args[1]);

    if (type == null)
    {
        Console.WriteLine($"ERROR: no content type found with alias \"{args[1]}\".");

        return;
    }

    Console.WriteLine($"TYPE: {type.Alias} (\"{type.Name}\", id={type.Id})");
    Console.WriteLine($"Compositions: {string.Join(", ", type.ContentTypeComposition.Select(c => c.Alias))}");
    Console.WriteLine();

    foreach (var group in type.PropertyGroups.OrderBy(g => g.SortOrder))
    {
        Console.WriteLine($"GROUP: {group.Name} (alias={group.Alias}, type={group.Type})");

        foreach (var prop in group.PropertyTypes!.OrderBy(p => p.SortOrder))
        {
            Console.WriteLine($"  - {prop.Alias} (\"{prop.Name}\") editor={prop.PropertyEditorAlias}");
        }
    }

    return;
}

// ============================================================
// LIST-CONTENT-TYPE-USAGE COMMAND (read-only report)
// ============================================================
//
// For every content type (page types and element types alike), reports:
// live content-node count (page types only - element types are never
// instantiated as their own nodes, only nested inside a Block List, so a
// "0" there wouldn't mean "unused" the way it does for a page type),
// whether any OTHER type depends on it (as a composition or as a listed
// allowed-child-type), and whether its alias appears anywhere in the
// react-ts-app frontend source (a plain grep over that tree, run from
// here via Process - best-effort: if react-ts-app isn't found relative to
// this project's own folder, that column just stays blank rather than
// failing the whole report).
//
// Deliberately does NOT delete anything - this is purely the fact-finding
// step before any "remove unused document types" decision, since deleting
// a content type cascades to every content node of that type and can't be
// undone without a database restore. A type with 0 content nodes is a
// genuinely safe delete candidate; a type with real content nodes but no
// frontend reference yet may just be a page the React port hasn't reached
// (see MIGRATION.md) - that distinction matters and this report keeps the
// two separate rather than collapsing them into one "unused" bucket.
if (args.Length > 0 &&
    args[0].Equals("list-content-type-usage", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" CONTENT TYPE USAGE REPORT");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService = app.Services.GetRequiredService<IContentTypeService>();
    var contentService = app.Services.GetRequiredService<IContentService>();

    var allTypes = contentTypeService.GetAll().OrderBy(t => t.Alias).ToList();

    var compositionUsers = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
    var allowedChildUsers = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

    foreach (var type in allTypes)
    {
        foreach (var comp in type.ContentTypeComposition)
        {
            if (!compositionUsers.TryGetValue(comp.Alias, out var list))
            {
                list = new List<string>();
                compositionUsers[comp.Alias] = list;
            }

            list.Add(type.Alias);
        }

        foreach (var allowed in type.AllowedContentTypes ?? Enumerable.Empty<ContentTypeSort>())
        {
            if (!allowedChildUsers.TryGetValue(allowed.Alias, out var list))
            {
                list = new List<string>();
                allowedChildUsers[allowed.Alias] = list;
            }

            list.Add(type.Alias);
        }
    }

    // Best-effort grep of react-ts-app for each alias - sibling folder to
    // this project's own src/AcfAfricanbank.Web, matching this repo's
    // actual layout (react-ts-app/ alongside src/).
    var reactAppDir =
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "react-ts-app", "src"));

    bool usedInReactApp(string alias)
    {
        if (!Directory.Exists(reactAppDir)) return false;

        try
        {
            foreach (var file in Directory.EnumerateFiles(reactAppDir, "*.ts*", SearchOption.AllDirectories))
            {
                if (System.IO.File.ReadAllText(file).Contains(alias, StringComparison.Ordinal))
                {
                    return true;
                }
            }
        }
        catch
        {
            // Best-effort - a read error on one file shouldn't fail the report.
        }

        return false;
    }

    Console.WriteLine(
        $"{"ALIAS",-36} {"ELEMENT",-8} {"NODES",-7} {"USED AS COMPOSITION BY",-28} {"USED AS ALLOWED CHILD BY",-28} IN REACT APP");
    Console.WriteLine(new string('-', 160));

    foreach (var type in allTypes)
    {
        var nodeCount = "-";

        if (!type.IsElement)
        {
            contentService.GetPagedOfType(type.Id, 0, 1, out var total, null!);
            nodeCount = total.ToString();
        }

        var compUsers =
            compositionUsers.TryGetValue(type.Alias, out var cu) ? string.Join(",", cu) : "";

        var childUsers =
            allowedChildUsers.TryGetValue(type.Alias, out var au) ? string.Join(",", au) : "";

        var inReactApp = usedInReactApp(type.Alias) ? "yes" : "no";

        Console.WriteLine(
            $"{type.Alias,-36} {type.IsElement,-8} {nodeCount,-7} {compUsers,-28} {childUsers,-28} {inReactApp}");
    }

    Console.WriteLine();
    Console.WriteLine($"TOTAL CONTENT TYPES: {allTypes.Count}");
    Console.WriteLine(
        "react-ts-app search root: " + reactAppDir + (Directory.Exists(reactAppDir) ? "" : " (NOT FOUND)"));

    return;
}

// Throwaway diagnostic - dumps every Block List/Block Grid/Rich Text
// DataType's own ConfigurationData["blocks"], resolved from
// contentElementTypeKey to the element type's actual alias, so a specific
// alias's real Block List membership can be grepped directly instead of
// inferred. Not part of the delete-unused-content-types-v2 decision
// pipeline itself - purely for manually spot-checking its block-element
// scan against the live DB before trusting it.
if (args.Length > 0 &&
    args[0].Equals("list-blocklist-configs", StringComparison.OrdinalIgnoreCase))
{
    var contentTypeServiceX = app.Services.GetRequiredService<IContentTypeService>();
    var dataTypeServiceX = app.Services.GetRequiredService<IDataTypeService>();

    var byKeyX = contentTypeServiceX.GetAll().ToDictionary(t => t.Key);

    foreach (var dt in await dataTypeServiceX.GetAllAsync())
    {
        if (dt.ConfigurationData == null ||
            !dt.ConfigurationData.TryGetValue("blocks", out var rawBlocks) ||
            rawBlocks is not System.Text.Json.Nodes.JsonArray blocksArray)
        {
            continue;
        }

        var aliases = new List<string>();

        foreach (var item in blocksArray)
        {
            if (item is not System.Text.Json.Nodes.JsonObject blockObj) continue;
            if (!blockObj.TryGetPropertyValue("contentElementTypeKey", out var keyNode) || keyNode == null) continue;

            var keyStr = keyNode.ToString();

            aliases.Add(
                Guid.TryParse(keyStr, out var g) && byKeyX.TryGetValue(g, out var ct)
                    ? ct.Alias
                    : $"UNRESOLVED({keyStr})");
        }

        Console.WriteLine($"{dt.Name} (editor={dt.EditorAlias}): {string.Join(", ", aliases)}");
    }

    return;
}

// ============================================================
// DELETE-UNUSED-CONTENT-TYPES COMMAND
// ============================================================
//
// Deletes every PAGE content type (IsElement == false) that has BOTH zero
// live content nodes AND zero dependents (not a composition of any other
// type, not listed in any other type's AllowedContentTypes) - the exact
// same classification list-content-type-usage above reports, recomputed
// here from scratch rather than reading that command's saved output, so
// this always deletes against the live DB state at run time, never a
// stale list. Confirmed against a live run: 178 of this project's 422
// content types fall in this bucket, the large majority a seemingly
// unrelated "ebankIT*"-prefixed schema (a different vendor's integration/
// demo content model, pulled in wholesale during the v8 migration dump
// but with zero live content nodes anywhere in this database) plus
// scattered other dead types (blog, bankingCampaign, search, sitemap,
// ...). Reviewed and confirmed with the user before running - see the
// chat history around this command's introduction for the three buckets
// deliberately NOT touched here: types with real content (pending
// frontend migration per MIGRATION.md), types with 0 content but still
// depended on by an active type's composition/allowed-children, and
// Block List element types (dependents on those can't be fully verified
// this way - a Block List's allowed types live in its DataType's own
// configuration, not in ContentTypeComposition/AllowedContentTypes, so
// this command never touches an element type at all, regardless of its
// own dependents count).
//
// Does NOT delete element types, ever (see IsElement skip below) - only
// page/content types. Best-effort per type: one failed delete (e.g. an
// unexpected FK this report's own two dependency checks didn't catch) is
// logged and skipped rather than aborting the whole run.
if (args.Length > 0 &&
    args[0].Equals("delete-unused-content-types", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" DELETE UNUSED CONTENT TYPES");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService = app.Services.GetRequiredService<IContentTypeService>();
    var contentService = app.Services.GetRequiredService<IContentService>();

    var allTypes = contentTypeService.GetAll().OrderBy(t => t.Alias).ToList();

    var compositionUsers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    var allowedChildUsers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    foreach (var type in allTypes)
    {
        foreach (var comp in type.ContentTypeComposition)
        {
            compositionUsers.Add(comp.Alias);
        }

        foreach (var allowed in type.AllowedContentTypes ?? Enumerable.Empty<ContentTypeSort>())
        {
            allowedChildUsers.Add(allowed.Alias);
        }
    }

    var toDelete = new List<IContentType>();

    foreach (var type in allTypes)
    {
        if (type.IsElement) continue;

        contentService.GetPagedOfType(type.Id, 0, 1, out var total, null!);

        if (total != 0) continue;
        if (compositionUsers.Contains(type.Alias)) continue;
        if (allowedChildUsers.Contains(type.Alias)) continue;

        toDelete.Add(type);
    }

    Console.WriteLine($"Found {toDelete.Count} content types with 0 content nodes and 0 dependents.");
    Console.WriteLine();

    var deleted = 0;
    var failed = 0;

    foreach (var type in toDelete)
    {
        try
        {
            contentTypeService.Delete(type);
            Console.WriteLine($"DELETED: {type.Alias}");
            deleted++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"FAILED: {type.Alias} - {ex.Message}");
            failed++;
        }
    }

    Console.WriteLine();
    Console.WriteLine($"DONE. Deleted {deleted}, failed {failed}, out of {toDelete.Count} candidates.");

    return;
}

// ============================================================
// DELETE-UNUSED-CONTENT-TYPES-V2 COMMAND
// ============================================================
//
// Goes further than delete-unused-content-types above: that command only
// ever touched PAGE types with 0 content AND 0 composition/allowed-child
// dependents - it never considered deleting an ELEMENT type (used inside
// a Block List, never instantiated as its own content node) because
// ContentTypeComposition/AllowedContentTypes can't see a Block List's own
// allowed-blocks config - that lives in the owning DataType's
// ConfigurationData["blocks"][].contentElementTypeKey, a different place
// entirely (see GetOrCreateBlockListAsync above for the exact shape).
// Without reading that, "0 dependents" was meaningless for element types -
// confirmed by the fact several actively-rendered blocks (heroCarouselBlock,
// textIntroBlock, ...) showed 0 dependents under the old check.
//
// This command computes a real "keep set" by closure instead of a single
// flat dependents check:
//   1. Seed: every type with >0 live content nodes, OR whose alias
//      appears anywhere in react-ts-app/src (same substring search as
//      list-content-type-usage).
//   2. Expand to a fixed point: for every kept type, also keep (a) every
//      type it composes (ContentTypeComposition) - removing a composition
//      an active type depends on would strip that active type's own
//      properties, and (b) every element type listed in the
//      ConfigurationData["blocks"] of any Block List/Block Grid/Rich Text
//      DataType backing one of its own properties - removing an allowed
//      block type out from under an active page's Block List would corrupt
//      that page's rendering.
// Anything NOT in the final keep set - page type or element type alike -
// is a delete candidate. This is deliberately the ONLY difference from
// the command above: real content is still never touched (seeded into the
// keep set by definition), matching the explicit choice made when this
// command was introduced to leave the 68 content-bearing-but-not-yet-
// ported types alone.
//
// Deletes in repeated passes (bounded) rather than a single loop, since
// the toDelete set itself can have internal composition dependencies (an
// unused element type composing another unused element type) - a type
// that fails because a dependent hasn't been removed yet typically
// succeeds on a later pass once that dependent is gone.
if (args.Length > 0 &&
    args[0].Equals("delete-unused-content-types-v2", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" DELETE UNUSED CONTENT TYPES (V2 - INCLUDES ELEMENT TYPES)");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService = app.Services.GetRequiredService<IContentTypeService>();
    var contentService = app.Services.GetRequiredService<IContentService>();
    var dataTypeService = app.Services.GetRequiredService<IDataTypeService>();

    var allTypes = contentTypeService.GetAll().ToList();
    var byAlias = allTypes.ToDictionary(t => t.Alias, StringComparer.OrdinalIgnoreCase);
    var byKey = allTypes.ToDictionary(t => t.Key);

    var reactAppDir =
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "react-ts-app", "src"));

    var reactAppFileContents = new List<string>();

    if (Directory.Exists(reactAppDir))
    {
        foreach (var file in Directory.EnumerateFiles(reactAppDir, "*.ts*", SearchOption.AllDirectories))
        {
            try
            {
                reactAppFileContents.Add(System.IO.File.ReadAllText(file));
            }
            catch
            {
                // Best-effort - a read error on one file shouldn't fail the run.
            }
        }
    }

    // Case-insensitive on purpose: an alias referenced only via a PascalCase
    // TypeScript type name (e.g. a `FooterLinkCategory` interface for the
    // camelCase `footerLinkCategory` alias) must still count as "used" -
    // the safe direction for a destructive command to err in is keeping
    // more, never fewer.
    bool usedInReactApp(string alias) =>
        reactAppFileContents.Any(c => c.Contains(alias, StringComparison.OrdinalIgnoreCase));

    // Map every Block List/Block Grid/Rich Text DataType's own
    // ConfigurationData["blocks"] to the element-type aliases it allows.
    // ConfigurationData values deserialize as System.Text.Json.Nodes types
    // (JsonArray/JsonObject), NOT IEnumerable<object>/IDictionary<string,
    // object> - confirmed by dumping the actual runtime type via the
    // list-blocklist-configs diagnostic above after an `as IEnumerable
    // <object>` cast here silently matched nothing for every single Block
    // List DataType in the database. Get this wrong and the whole point of
    // this command (catching element types still allowed inside an active
    // page's Block List) silently never fires - exactly the bug that
    // version was shipped with before being caught here and fixed.
    var allDataTypes = (await dataTypeService.GetAllAsync()).ToList();
    var blockElementAliasesByDataTypeId = new Dictionary<int, List<string>>();

    foreach (var dt in allDataTypes)
    {
        if (dt.ConfigurationData == null ||
            !dt.ConfigurationData.TryGetValue("blocks", out var rawBlocks) ||
            rawBlocks is not System.Text.Json.Nodes.JsonArray blocksArray)
        {
            continue;
        }

        var aliases = new List<string>();

        foreach (var item in blocksArray)
        {
            if (item is not System.Text.Json.Nodes.JsonObject blockObj) continue;
            if (!blockObj.TryGetPropertyValue("contentElementTypeKey", out var keyNode) || keyNode == null) continue;

            if (Guid.TryParse(keyNode.ToString(), out var g) && byKey.TryGetValue(g, out var ct))
            {
                aliases.Add(ct.Alias);
            }
        }

        if (aliases.Count > 0)
        {
            blockElementAliasesByDataTypeId[dt.Id] = aliases;
        }
    }

    // Seed the keep set.
    var keep = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    foreach (var type in allTypes)
    {
        if (!type.IsElement)
        {
            contentService.GetPagedOfType(type.Id, 0, 1, out var total, null!);
            if (total > 0)
            {
                keep.Add(type.Alias);
                continue;
            }
        }

        if (usedInReactApp(type.Alias))
        {
            keep.Add(type.Alias);
        }
    }

    Console.WriteLine($"Seeded keep set: {keep.Count} types (real content or referenced in react-ts-app).");

    // Expand to a fixed point.
    var changed = true;

    while (changed)
    {
        changed = false;

        foreach (var alias in keep.ToList())
        {
            if (!byAlias.TryGetValue(alias, out var type)) continue;

            foreach (var comp in type.ContentTypeComposition)
            {
                if (keep.Add(comp.Alias)) changed = true;
            }

            foreach (var prop in type.PropertyTypes)
            {
                if (blockElementAliasesByDataTypeId.TryGetValue(prop.DataTypeId, out var elAliases))
                {
                    foreach (var elAlias in elAliases)
                    {
                        if (keep.Add(elAlias)) changed = true;
                    }
                }
            }
        }
    }

    Console.WriteLine($"Keep set after closure: {keep.Count} types.");
    Console.WriteLine();

    var toDelete =
        allTypes.Where(t => !keep.Contains(t.Alias)).OrderBy(t => t.Alias).ToList();

    Console.WriteLine($"Delete candidates: {toDelete.Count} (of {allTypes.Count} total).");
    Console.WriteLine();

    foreach (var type in toDelete)
    {
        Console.WriteLine($"  {(type.IsElement ? "[element]" : "[page]   ")} {type.Alias}");
    }

    Console.WriteLine();

    if (args.Length > 1 && args[1].Equals("--dry-run", StringComparison.OrdinalIgnoreCase))
    {
        Console.WriteLine("DRY RUN - nothing deleted. Re-run without --dry-run to actually delete.");

        return;
    }

    var remaining = toDelete.ToList();
    var totalDeleted = 0;
    var pass = 0;

    while (remaining.Count > 0 && pass < 10)
    {
        pass++;

        var deletedThisPass = new List<IContentType>();

        foreach (var type in remaining)
        {
            try
            {
                contentTypeService.Delete(type);
                Console.WriteLine($"DELETED: {type.Alias}");
                deletedThisPass.Add(type);
                totalDeleted++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  (pass {pass}) not yet: {type.Alias} - {ex.Message}");
            }
        }

        if (deletedThisPass.Count == 0) break;

        remaining = remaining.Except(deletedThisPass).ToList();
    }

    Console.WriteLine();
    Console.WriteLine(
        $"DONE. Deleted {totalDeleted} of {toDelete.Count} candidates " +
        $"({remaining.Count} could not be deleted after {pass} pass(es)).");

    if (remaining.Count > 0)
    {
        Console.WriteLine("Still remaining:");

        foreach (var type in remaining)
        {
            Console.WriteLine($"  {type.Alias}");
        }
    }

    return;
}

// ============================================================
// ADD-BLOG-SEO-PROPERTIES COMMAND
// ============================================================
//
// Adds a new "SEO" property group to blogDetail (the real blog post
// document type - 782 live content nodes, confirmed via the DB; the
// unused "blog" alias has zero) with 5 fields matching the clean layout
// requested: SEO Title, SEO Description, Canonical URL, OG Image, No
// Index. blogDetail already carries SEO-shaped fields from the v8
// migration (its own "SEO/Meta Properties" group - googlebot_tag, title,
// descriptions - plus more of the same from its searchEngine composition -
// title_tag, description_tag, keywords_tag, image, alternateImageText,
// security, robots_tag), all with real migrated content across those 782
// posts. This command does NOT touch, rename, or remove any of that - it
// only ADDS the 5 new fields alongside them, empty, to fill in via the
// backoffice going forward. No new "Title" field is added since blogDetail
// already owns a "title" alias (an alias can only be used once per
// content type) - reuse that one.
//
// Shared Data Types (Umbraco.TextBox/TextArea/MediaPicker3/TrueFalse),
// same editor aliases create-home-schema's own GetOrCreateSharedDataTypeAsync
// already reuses project-wide - this command looks them up the same way
// rather than creating new ones.
//
// Idempotent: GetOrCreateType's own property-collision check (same helper
// every create-*-schema command uses) skips any property whose alias
// already exists.

if (args.Length > 0 &&
    args[0].Equals("add-blog-seo-properties", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" ADD SEO PROPERTIES TO BLOG POSTS");
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

    var blogDetailType = contentTypeService.Get("blogDetail");

    if (blogDetailType == null)
    {
        Console.WriteLine("ERROR: 'blogDetail' content type not found.");

        return;
    }

    async Task<IDataType> GetOrCreateSharedDataTypeAsync(
        string editorAlias, string editorUiAlias, string name)
    {
        var existingDataType =
            (await dataTypeService.GetAllAsync())
                .FirstOrDefault(d =>
                    d.EditorAlias.Equals(editorAlias, StringComparison.OrdinalIgnoreCase) &&
                    d.Name != null &&
                    d.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (existingDataType != null)
        {
            Console.WriteLine($"EXISTS DATATYPE: {existingDataType.Name}");

            return existingDataType;
        }

        if (!propertyEditors.TryGet(editorAlias, out var editor))
        {
            throw new InvalidOperationException($"Property editor '{editorAlias}' is not registered.");
        }

        var dataType =
            new DataType(editor, configurationEditorJsonSerializer)
            {
                Name = name,
                EditorUiAlias = editorUiAlias
            };

        var createResult =
            await dataTypeService.CreateAsync(dataType, Constants.Security.SuperUserKey);

        if (!createResult.Success)
        {
            throw new InvalidOperationException($"Could not create data type '{name}': {createResult.Status}");
        }

        Console.WriteLine($"CREATED DATATYPE: {name}");

        return createResult.Result;
    }

    var txt =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextBox", "Umb.PropertyEditorUi.TextBox", "React Migration - Textstring");

    var txtArea =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextArea", "Umb.PropertyEditorUi.TextArea", "React Migration - Textarea");

    var media =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.MediaPicker3", "Umb.PropertyEditorUi.MediaPicker", "React Migration - Media Picker");

    var boolType =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TrueFalse", "Umb.PropertyEditorUi.Toggle", "React Migration - Toggle");

    if (!blogDetailType.PropertyGroups.Any(g =>
            g.Alias.Equals("seo", StringComparison.OrdinalIgnoreCase)))
    {
        blogDetailType.AddPropertyGroup("seo", "SEO");

        var seoGroup =
            blogDetailType.PropertyGroups.First(g =>
                g.Alias.Equals("seo", StringComparison.OrdinalIgnoreCase));

        seoGroup.Type = PropertyGroupType.Tab;

        Console.WriteLine("CREATED GROUP: SEO");
    }
    else
    {
        Console.WriteLine("EXISTS GROUP: SEO");
    }

    var seoProps =
        new[]
        {
            new PropSpec("seoTitle", "SEO Title", txt),
            new PropSpec("seoDescription", "SEO Description", txtArea),
            new PropSpec("canonicalUrl", "Canonical URL", txt),
            new PropSpec("ogImage", "OG Image", media),
            new PropSpec("noIndex", "No Index", boolType)
        };

    var changed = false;

    foreach (var prop in seoProps)
    {
        if (blogDetailType.PropertyTypes.Any(p =>
                p.Alias.Equals(prop.Alias, StringComparison.OrdinalIgnoreCase)))
        {
            Console.WriteLine($"EXISTS PROPERTY: blogDetail.{prop.Alias}");

            continue;
        }

        var propertyType =
            new PropertyType(shortStringHelper, prop.Type, prop.Alias)
            {
                Name = prop.Name,
                Mandatory = prop.Mandatory
            };

        blogDetailType.AddPropertyType(propertyType, "seo");
        changed = true;

        Console.WriteLine($"ADDED PROPERTY: blogDetail.{prop.Alias}");
    }

    if (changed)
    {
        contentTypeService.Save(blogDetailType);
    }

    Console.WriteLine();
    Console.WriteLine("DONE.");
    Console.WriteLine(
        "New fields are empty on all 782 existing blog posts - the legacy " +
        "SEO/Meta Properties fields they already had are untouched.");

    return;
}

// ============================================================
// ADD-BANKING-PAGE-SEO-PROPERTIES COMMAND
// ============================================================
//
// Adds the same "SEO" property group/fields add-blog-seo-properties adds to
// blogDetail (SEO Title, SEO Description, Canonical URL, OG Image, No
// Index) to businessBankingPage instead - the generic page type reused for
// every Personal Banking, Business Banking, and nested page (Products,
// Campaigns, About Company, Blogs, SMEs, Tap2Glass, ...) created by
// create-business-schema / create-banking-page-structure above.
// businessBankingPage currently has no SEO fields at all (just "sections"),
// unlike blogDetail's legacy v8 fields, so all 5 are new here.
//
// Shared Data Types reused the same way add-blog-seo-properties does - same
// editor aliases, looked up by name rather than recreated.
//
// Idempotent: same per-group/per-property existence checks as
// add-blog-seo-properties - safe to run again.

if (args.Length > 0 &&
    args[0].Equals("add-banking-page-seo-properties", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" ADD SEO PROPERTIES TO BANKING PAGES");
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

    var businessBankingPageType = contentTypeService.Get("businessBankingPage");

    if (businessBankingPageType == null)
    {
        Console.WriteLine("ERROR: 'businessBankingPage' content type not found.");

        return;
    }

    async Task<IDataType> GetOrCreateSharedDataTypeAsync(
        string editorAlias, string editorUiAlias, string name)
    {
        var existingDataType =
            (await dataTypeService.GetAllAsync())
                .FirstOrDefault(d =>
                    d.EditorAlias.Equals(editorAlias, StringComparison.OrdinalIgnoreCase) &&
                    d.Name != null &&
                    d.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (existingDataType != null)
        {
            Console.WriteLine($"EXISTS DATATYPE: {existingDataType.Name}");

            return existingDataType;
        }

        if (!propertyEditors.TryGet(editorAlias, out var editor))
        {
            throw new InvalidOperationException($"Property editor '{editorAlias}' is not registered.");
        }

        var dataType =
            new DataType(editor, configurationEditorJsonSerializer)
            {
                Name = name,
                EditorUiAlias = editorUiAlias
            };

        var createResult =
            await dataTypeService.CreateAsync(dataType, Constants.Security.SuperUserKey);

        if (!createResult.Success)
        {
            throw new InvalidOperationException($"Could not create data type '{name}': {createResult.Status}");
        }

        Console.WriteLine($"CREATED DATATYPE: {name}");

        return createResult.Result;
    }

    var txt =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextBox", "Umb.PropertyEditorUi.TextBox", "React Migration - Textstring");

    var txtArea =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextArea", "Umb.PropertyEditorUi.TextArea", "React Migration - Textarea");

    var media =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.MediaPicker3", "Umb.PropertyEditorUi.MediaPicker", "React Migration - Media Picker");

    var boolType =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TrueFalse", "Umb.PropertyEditorUi.Toggle", "React Migration - Toggle");

    if (!businessBankingPageType.PropertyGroups.Any(g =>
            g.Alias.Equals("seo", StringComparison.OrdinalIgnoreCase)))
    {
        businessBankingPageType.AddPropertyGroup("seo", "SEO");

        var seoGroup =
            businessBankingPageType.PropertyGroups.First(g =>
                g.Alias.Equals("seo", StringComparison.OrdinalIgnoreCase));

        seoGroup.Type = PropertyGroupType.Tab;

        Console.WriteLine("CREATED GROUP: SEO");
    }
    else
    {
        Console.WriteLine("EXISTS GROUP: SEO");
    }

    var seoProps =
        new[]
        {
            new PropSpec("seoTitle", "SEO Title", txt),
            new PropSpec("seoDescription", "SEO Description", txtArea),
            new PropSpec("canonicalUrl", "Canonical URL", txt),
            new PropSpec("ogImage", "OG Image", media),
            new PropSpec("noIndex", "No Index", boolType)
        };

    var changed = false;

    foreach (var prop in seoProps)
    {
        if (businessBankingPageType.PropertyTypes.Any(p =>
                p.Alias.Equals(prop.Alias, StringComparison.OrdinalIgnoreCase)))
        {
            Console.WriteLine($"EXISTS PROPERTY: businessBankingPage.{prop.Alias}");

            continue;
        }

        var propertyType =
            new PropertyType(shortStringHelper, prop.Type, prop.Alias)
            {
                Name = prop.Name,
                Mandatory = prop.Mandatory
            };

        businessBankingPageType.AddPropertyType(propertyType, "seo");
        changed = true;

        Console.WriteLine($"ADDED PROPERTY: businessBankingPage.{prop.Alias}");
    }

    if (changed)
    {
        contentTypeService.Save(businessBankingPageType);
    }

    Console.WriteLine();
    Console.WriteLine("DONE.");
    Console.WriteLine(
        "New fields are empty on every Personal Banking, Business Banking, " +
        "and nested page (Products/Campaigns/About Company/Blogs/SMEs/...) " +
        "that reuses businessBankingPage - fill them in via the backoffice.");

    return;
}

// ============================================================
// ADD-HOME-PAGE-SEO-PROPERTIES COMMAND
// ============================================================
//
// Same "SEO" property group/fields as add-blog-seo-properties and
// add-banking-page-seo-properties (SEO Title, SEO Description, Canonical
// URL, OG Image, No Index), added to pageHome instead - the real, live
// Home content node's own document type (confirmed via
// models.generated.cs: PageHome implements ISearchEngine, so it already
// carries the same legacy v8 SEO/meta fields - googlebot_tag,
// description_tag, keywords_tag, image, alternateImageText, security,
// robots_tag - blogDetail has; this command does NOT touch those, only
// adds the 5 new ones alongside them, same as the blog command).
//
// Deliberately targets "pageHome" (the type the live Home node actually
// has - see create-banking-page-structure above, which looks up
// "pageHome" to find the real Home node) and NOT "homePage" (the empty
// React-migration schema create-home-schema defines, which isn't used by
// any real content node yet).
//
// Shared Data Types reused the same way the other two SEO commands do.
// Idempotent: same per-group/per-property existence checks.

if (args.Length > 0 &&
    args[0].Equals("add-home-page-seo-properties", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" ADD SEO PROPERTIES TO HOME PAGE");
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

    var pageHomeType = contentTypeService.Get("pageHome");

    if (pageHomeType == null)
    {
        Console.WriteLine("ERROR: 'pageHome' content type not found.");

        return;
    }

    async Task<IDataType> GetOrCreateSharedDataTypeAsync(
        string editorAlias, string editorUiAlias, string name)
    {
        var existingDataType =
            (await dataTypeService.GetAllAsync())
                .FirstOrDefault(d =>
                    d.EditorAlias.Equals(editorAlias, StringComparison.OrdinalIgnoreCase) &&
                    d.Name != null &&
                    d.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (existingDataType != null)
        {
            Console.WriteLine($"EXISTS DATATYPE: {existingDataType.Name}");

            return existingDataType;
        }

        if (!propertyEditors.TryGet(editorAlias, out var editor))
        {
            throw new InvalidOperationException($"Property editor '{editorAlias}' is not registered.");
        }

        var dataType =
            new DataType(editor, configurationEditorJsonSerializer)
            {
                Name = name,
                EditorUiAlias = editorUiAlias
            };

        var createResult =
            await dataTypeService.CreateAsync(dataType, Constants.Security.SuperUserKey);

        if (!createResult.Success)
        {
            throw new InvalidOperationException($"Could not create data type '{name}': {createResult.Status}");
        }

        Console.WriteLine($"CREATED DATATYPE: {name}");

        return createResult.Result;
    }

    var txt =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextBox", "Umb.PropertyEditorUi.TextBox", "React Migration - Textstring");

    var txtArea =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextArea", "Umb.PropertyEditorUi.TextArea", "React Migration - Textarea");

    var media =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.MediaPicker3", "Umb.PropertyEditorUi.MediaPicker", "React Migration - Media Picker");

    var boolType =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TrueFalse", "Umb.PropertyEditorUi.Toggle", "React Migration - Toggle");

    if (!pageHomeType.PropertyGroups.Any(g =>
            g.Alias.Equals("seo", StringComparison.OrdinalIgnoreCase)))
    {
        pageHomeType.AddPropertyGroup("seo", "SEO");

        var seoGroup =
            pageHomeType.PropertyGroups.First(g =>
                g.Alias.Equals("seo", StringComparison.OrdinalIgnoreCase));

        seoGroup.Type = PropertyGroupType.Tab;

        Console.WriteLine("CREATED GROUP: SEO");
    }
    else
    {
        Console.WriteLine("EXISTS GROUP: SEO");
    }

    var seoProps =
        new[]
        {
            new PropSpec("seoTitle", "SEO Title", txt),
            new PropSpec("seoDescription", "SEO Description", txtArea),
            new PropSpec("canonicalUrl", "Canonical URL", txt),
            new PropSpec("ogImage", "OG Image", media),
            new PropSpec("noIndex", "No Index", boolType)
        };

    var changed = false;

    foreach (var prop in seoProps)
    {
        if (pageHomeType.PropertyTypes.Any(p =>
                p.Alias.Equals(prop.Alias, StringComparison.OrdinalIgnoreCase)))
        {
            Console.WriteLine($"EXISTS PROPERTY: pageHome.{prop.Alias}");

            continue;
        }

        var propertyType =
            new PropertyType(shortStringHelper, prop.Type, prop.Alias)
            {
                Name = prop.Name,
                Mandatory = prop.Mandatory
            };

        pageHomeType.AddPropertyType(propertyType, "seo");
        changed = true;

        Console.WriteLine($"ADDED PROPERTY: pageHome.{prop.Alias}");
    }

    if (changed)
    {
        contentTypeService.Save(pageHomeType);
    }

    Console.WriteLine();
    Console.WriteLine("DONE.");
    Console.WriteLine(
        "New fields are empty on the live Home page - the legacy " +
        "SEO/Meta Properties fields it already had (via its searchEngine " +
        "composition) are untouched.");

    return;
}

// ============================================================
// ADD-PRODUCT-LOAN-PAGE-SEO-PROPERTIES COMMAND
// ============================================================
//
// Same "SEO" property group/fields as the other three add-*-seo-properties
// commands above (SEO Title, SEO Description, Canonical URL, OG Image, No
// Index), added to productLoanPage instead - the real children of
// Personal Banking's "Products" folder (Product 12% Loan, Product
// Consolidation Loan, Product Personal Loan, Tech Deals, Credit Report,
// Talk To Us - confirmed via the live Delivery API: all 6 real
// productLoanPage nodes site-wide sit under /home/personal-banking/
// products/). Unlike pageHome/blogDetail, productLoanPage has no
// composition and no legacy SEO fields at all (just "sections", same as
// businessBankingPage before add-banking-page-seo-properties) - all 5
// fields are new here.
//
// Shared Data Types reused the same way the other three SEO commands do.
// Idempotent: same per-group/per-property existence checks.

if (args.Length > 0 &&
    args[0].Equals("add-product-loan-page-seo-properties", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" ADD SEO PROPERTIES TO PRODUCT LOAN PAGES");
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

    var productLoanPageType = contentTypeService.Get("productLoanPage");

    if (productLoanPageType == null)
    {
        Console.WriteLine("ERROR: 'productLoanPage' content type not found.");

        return;
    }

    async Task<IDataType> GetOrCreateSharedDataTypeAsync(
        string editorAlias, string editorUiAlias, string name)
    {
        var existingDataType =
            (await dataTypeService.GetAllAsync())
                .FirstOrDefault(d =>
                    d.EditorAlias.Equals(editorAlias, StringComparison.OrdinalIgnoreCase) &&
                    d.Name != null &&
                    d.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        if (existingDataType != null)
        {
            Console.WriteLine($"EXISTS DATATYPE: {existingDataType.Name}");

            return existingDataType;
        }

        if (!propertyEditors.TryGet(editorAlias, out var editor))
        {
            throw new InvalidOperationException($"Property editor '{editorAlias}' is not registered.");
        }

        var dataType =
            new DataType(editor, configurationEditorJsonSerializer)
            {
                Name = name,
                EditorUiAlias = editorUiAlias
            };

        var createResult =
            await dataTypeService.CreateAsync(dataType, Constants.Security.SuperUserKey);

        if (!createResult.Success)
        {
            throw new InvalidOperationException($"Could not create data type '{name}': {createResult.Status}");
        }

        Console.WriteLine($"CREATED DATATYPE: {name}");

        return createResult.Result;
    }

    var txt =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextBox", "Umb.PropertyEditorUi.TextBox", "React Migration - Textstring");

    var txtArea =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TextArea", "Umb.PropertyEditorUi.TextArea", "React Migration - Textarea");

    var media =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.MediaPicker3", "Umb.PropertyEditorUi.MediaPicker", "React Migration - Media Picker");

    var boolType =
        await GetOrCreateSharedDataTypeAsync(
            "Umbraco.TrueFalse", "Umb.PropertyEditorUi.Toggle", "React Migration - Toggle");

    if (!productLoanPageType.PropertyGroups.Any(g =>
            g.Alias.Equals("seo", StringComparison.OrdinalIgnoreCase)))
    {
        productLoanPageType.AddPropertyGroup("seo", "SEO");

        var seoGroup =
            productLoanPageType.PropertyGroups.First(g =>
                g.Alias.Equals("seo", StringComparison.OrdinalIgnoreCase));

        seoGroup.Type = PropertyGroupType.Tab;

        Console.WriteLine("CREATED GROUP: SEO");
    }
    else
    {
        Console.WriteLine("EXISTS GROUP: SEO");
    }

    var seoProps =
        new[]
        {
            new PropSpec("seoTitle", "SEO Title", txt),
            new PropSpec("seoDescription", "SEO Description", txtArea),
            new PropSpec("canonicalUrl", "Canonical URL", txt),
            new PropSpec("ogImage", "OG Image", media),
            new PropSpec("noIndex", "No Index", boolType)
        };

    var changed = false;

    foreach (var prop in seoProps)
    {
        if (productLoanPageType.PropertyTypes.Any(p =>
                p.Alias.Equals(prop.Alias, StringComparison.OrdinalIgnoreCase)))
        {
            Console.WriteLine($"EXISTS PROPERTY: productLoanPage.{prop.Alias}");

            continue;
        }

        var propertyType =
            new PropertyType(shortStringHelper, prop.Type, prop.Alias)
            {
                Name = prop.Name,
                Mandatory = prop.Mandatory
            };

        productLoanPageType.AddPropertyType(propertyType, "seo");
        changed = true;

        Console.WriteLine($"ADDED PROPERTY: productLoanPage.{prop.Alias}");
    }

    if (changed)
    {
        contentTypeService.Save(productLoanPageType);
    }

    Console.WriteLine();
    Console.WriteLine("DONE.");
    Console.WriteLine(
        "New fields are empty on every Product Loan page under Personal " +
        "Banking's Products folder - fill them in via the backoffice.");

    return;
}

// ============================================================
// RETYPE-PRODUCT-LOAN-RICHTEXT-FIELDS COMMAND
// ============================================================
//
// create-product-loan-schema's own txtArea -> rte edit (heroBannerBlock.
// description, heroImageBannerBlock.description, promoSplitBlock.
// description, creditLifeInsuranceBlock.paragraphOne/paragraphTwo,
// appDownloadBlock.description) only takes effect on a brand-new
// database - GetOrCreateType can add a new property to an existing
// content type but never retypes one already there (see its own comment
// above), so on this live database those 6 properties are still
// Umbraco.TextArea until something explicitly retypes them. This command
// is that something, done the safe way: it (1) points each PropertyType
// at the RichText DataType (DataTypeId/DataTypeKey/PropertyEditorAlias/
// ValueStorageType all updated together, same four fields `new
// PropertyType(shortStringHelper, dataType, alias)` would set for a brand
// new one - confirmed via reflection, PropertyType has no public "retype"
// method, just independently settable properties), then (2) rewrites
// every live content node's already-stored plain string into RichText
// (Tiptap)'s own {markup, blocks:{layout,contentData,settingsData}} JSON
// shape (same shape BuildRichText helpers elsewhere in this file produce)
// so the text itself is never dropped, only reformatted - each existing
// line becomes its own <p> paragraph, HTML-encoded.
//
// Finds every place these 6 properties could actually be nested (any
// Block List DataType whose own "blocks" config allows one of the 5
// retyped element types, then every content type with a property wired
// to that DataType) rather than assuming "productLoanPage.sections" is
// the only such place - these blocks are documented as reused by homePage
// and others too (see create-product-loan-schema's own "GLOBAL/SHARED
// ELEMENT TYPES" comment). Warns (does not crash) if it finds one of
// those container properties on an ELEMENT type instead of a real page -
// confirmed via find-orphaned-elements' own report that none of this
// schema's Block List element types have live content nodes of their own,
// so this should never actually trigger, but a page nested two Block
// Lists deep would need its outer property migrated by hand.
//
// Safe to re-run: a property already pointed at RichText is skipped (step
// 1), and a value that already looks like JSON (starts with "{" - i.e.
// already migrated, or was never plain text to begin with) is left alone
// rather than double-wrapped (step 2). Only republishes a node that was
// already published, at its current property values otherwise unchanged.
if (args.Length > 0 &&
    args[0].Equals("retype-product-loan-richtext-fields", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" RETYPE PRODUCT LOAN TEXTAREA FIELDS TO RICHTEXT");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService = app.Services.GetRequiredService<IContentTypeService>();
    var contentService = app.Services.GetRequiredService<IContentService>();
    var dataTypeService = app.Services.GetRequiredService<IDataTypeService>();

    // Matched by editor alias, not name - GetOrCreateSharedDataTypeAsync
    // (create-product-loan-schema's own helper) resolves its "rte" shared
    // DataType the same way: it reuses whichever DataType already uses
    // editor "Umbraco.RichText" first, before ever checking name, so on
    // this database that's Umbraco's own built-in "Richtext editor"
    // DataType, not a "React Migration - Richtext" one. Looking this up
    // by name (as an earlier version of this command did) silently never
    // matches on a database where that built-in one got reused.
    var rteDataType =
        (await dataTypeService.GetAllAsync())
            .FirstOrDefault(d =>
                d.EditorAlias.Equals("Umbraco.RichText", StringComparison.OrdinalIgnoreCase));

    if (rteDataType == null)
    {
        Console.WriteLine(
            "ERROR: no DataType using editor 'Umbraco.RichText' found - run " +
            "'create-product-loan-schema' first.");
        return;
    }

    Console.WriteLine($"Using RichText DataType: \"{rteDataType.Name}\" (id={rteDataType.Id})");

    var targetProps = new (string TypeAlias, string PropAlias)[]
    {
        ("heroBannerBlock", "description"),
        ("heroImageBannerBlock", "description"),
        ("promoSplitBlock", "description"),
        ("creditLifeInsuranceBlock", "paragraphOne"),
        ("creditLifeInsuranceBlock", "paragraphTwo"),
        ("appDownloadBlock", "description"),
    };

    Console.WriteLine("--- step 1: retype content type properties ---");

    var targetPropsByTypeKey = new Dictionary<Guid, HashSet<string>>();

    foreach (var typeAlias in targetProps.Select(t => t.TypeAlias).Distinct())
    {
        var contentType = contentTypeService.Get(typeAlias);

        if (contentType == null)
        {
            Console.WriteLine($"SKIPPED TYPE (not found): {typeAlias}");
            continue;
        }

        var propAliases =
            targetProps
                .Where(t => t.TypeAlias.Equals(typeAlias, StringComparison.OrdinalIgnoreCase))
                .Select(t => t.PropAlias)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

        targetPropsByTypeKey[contentType.Key] = propAliases;

        var changed = false;

        foreach (var propAlias in propAliases)
        {
            var prop =
                contentType.PropertyTypes.FirstOrDefault(p =>
                    p.Alias.Equals(propAlias, StringComparison.OrdinalIgnoreCase));

            if (prop == null)
            {
                Console.WriteLine($"SKIPPED PROPERTY (not found): {typeAlias}.{propAlias}");
                continue;
            }

            if (prop.DataTypeKey == rteDataType.Key)
            {
                Console.WriteLine($"ALREADY RICHTEXT: {typeAlias}.{propAlias}");
                continue;
            }

            prop.DataTypeId = rteDataType.Id;
            prop.DataTypeKey = rteDataType.Key;
            prop.PropertyEditorAlias = rteDataType.EditorAlias;
            prop.ValueStorageType = rteDataType.DatabaseType;
            changed = true;

            Console.WriteLine($"RETYPED: {typeAlias}.{propAlias} -> RichText");
        }

        if (changed)
        {
            contentTypeService.Save(contentType);
        }
    }

    Console.WriteLine();
    Console.WriteLine("--- step 2: migrate stored content values ---");

    string BuildRichTextValue(string plainText)
    {
        var paragraphs =
            plainText
                .Replace("\r\n", "\n")
                .Split('\n')
                .Select(line => line.Trim())
                .Where(line => line.Length > 0)
                .Select(line => $"<p>{System.Net.WebUtility.HtmlEncode(line)}</p>")
                .ToList();

        var markup =
            paragraphs.Count > 0
                ? string.Concat(paragraphs)
                : $"<p>{System.Net.WebUtility.HtmlEncode(plainText)}</p>";

        var envelope =
            new JsonObject
            {
                ["markup"] = markup,
                ["blocks"] =
                    new JsonObject
                    {
                        ["layout"] = new JsonObject(),
                        ["contentData"] = new JsonArray(),
                        ["settingsData"] = new JsonArray()
                    }
            };

        return envelope.ToJsonString();
    }

    bool TryMigrateBlockListJson(string rawValue, out string newValue)
    {
        newValue = rawValue;

        JsonNode? parsed;

        try
        {
            parsed = JsonNode.Parse(rawValue);
        }
        catch (JsonException)
        {
            return false;
        }

        if (parsed is not JsonObject root ||
            !root.TryGetPropertyValue("contentData", out var cdNode) ||
            cdNode is not JsonArray contentData)
        {
            return false;
        }

        var changed = false;

        foreach (var item in contentData)
        {
            if (item is not JsonObject block) continue;

            if (!block.TryGetPropertyValue("contentTypeKey", out var ctkNode) ||
                ctkNode == null ||
                !Guid.TryParse(ctkNode.ToString(), out var ctk) ||
                !targetPropsByTypeKey.TryGetValue(ctk, out var propAliases))
            {
                continue;
            }

            // Each block's own properties live in a "values" array of
            // {editorAlias, culture, segment, alias, value} tuples - NOT
            // as flat {alias: value} keys directly on the block object
            // (confirmed against this live database's actual stored
            // shape; BuildBlockList's own simplified flat input gets
            // normalized into this exact shape by Umbraco's own Block
            // List property editor once SetValue/Save runs it through
            // the real save pipeline - every live block already looks
            // like this, flat or not going in).
            if (!block.TryGetPropertyValue("values", out var valuesNode) ||
                valuesNode is not JsonArray values)
            {
                continue;
            }

            foreach (var valueEntry in values)
            {
                if (valueEntry is not JsonObject valueObj ||
                    !valueObj.TryGetPropertyValue("alias", out var aliasNode) ||
                    aliasNode == null ||
                    !propAliases.Contains(aliasNode.ToString()))
                {
                    continue;
                }

                if (!valueObj.TryGetPropertyValue("value", out var valNode) ||
                    valNode is not JsonValue jsonValue ||
                    !jsonValue.TryGetValue(out string? textValue) ||
                    string.IsNullOrEmpty(textValue))
                {
                    continue;
                }

                // Already JSON-shaped (re-run of this command, or not
                // actually plain text) - leave it alone rather than
                // double-wrapping it.
                if (textValue.TrimStart().StartsWith('{'))
                {
                    continue;
                }

                valueObj["value"] = BuildRichTextValue(textValue);
                valueObj["editorAlias"] = "Umbraco.RichText";
                changed = true;
            }
        }

        if (changed)
        {
            newValue = root.ToJsonString();
        }

        return changed;
    }

    // Every Block List DataType that allows at least one of the 5 retyped
    // element types, resolved to the (content type, property) pairs that
    // actually store it - the only places these plain-text values can be
    // nested (see list-blocklist-configs' own comment for this same
    // config shape).
    var targetTypeKeys = targetPropsByTypeKey.Keys.ToHashSet();
    var scanTargets = new List<(IContentType OwnerType, string PropertyAlias)>();

    foreach (var dt in await dataTypeService.GetAllAsync())
    {
        if (dt.ConfigurationData == null ||
            !dt.ConfigurationData.TryGetValue("blocks", out var rawBlocks) ||
            rawBlocks is not JsonArray blocksArray)
        {
            continue;
        }

        var allowsTarget =
            blocksArray
                .OfType<JsonObject>()
                .Any(b =>
                    b.TryGetPropertyValue("contentElementTypeKey", out var k) &&
                    k != null &&
                    Guid.TryParse(k.ToString(), out var g) &&
                    targetTypeKeys.Contains(g));

        if (!allowsTarget) continue;

        foreach (var ownerType in contentTypeService.GetAll())
        {
            foreach (var prop in ownerType.PropertyTypes)
            {
                if (prop.DataTypeKey != dt.Key) continue;

                if (ownerType.IsElement)
                {
                    Console.WriteLine(
                        $"WARNING: {ownerType.Alias}.{prop.Alias} is a Block List " +
                        "nested inside an ELEMENT type - not scanned (no top-level " +
                        "page content node to read it from). Check/migrate manually.");

                    continue;
                }

                scanTargets.Add((ownerType, prop.Alias));
            }
        }
    }

    var updatedNodes = 0;

    foreach (var (ownerType, propertyAlias) in scanTargets)
    {
        const int pageSize = 200;
        long pageIndex = 0;
        long total;

        do
        {
            var nodes =
                contentService
                    .GetPagedOfType(ownerType.Id, pageIndex, pageSize, out total, null!)
                    .ToList();

            foreach (var node in nodes)
            {
                var raw = node.GetValue<string>(propertyAlias);

                if (string.IsNullOrWhiteSpace(raw))
                {
                    continue;
                }

                if (!TryMigrateBlockListJson(raw, out var newValue))
                {
                    continue;
                }

                node.SetValue(propertyAlias, newValue);

                var wasPublished = node.Published;

                contentService.Save(node);

                if (wasPublished)
                {
                    contentService.Publish(node, new[] { "*" });
                }

                updatedNodes++;

                Console.WriteLine(
                    $"MIGRATED: {ownerType.Alias}.{propertyAlias} on \"{node.Name}\" " +
                    $"(id={node.Id}, published={wasPublished})");
            }

            pageIndex++;
        }
        while (pageIndex * pageSize < total);
    }

    Console.WriteLine();
    Console.WriteLine("DONE.");
    Console.WriteLine($"Content nodes with a migrated value: {updatedNodes}");
    Console.WriteLine(
        "Every migrated field's original text is preserved verbatim inside " +
        "its new RichText markup - nothing was deleted, only reformatted.");

    return;
}

// ============================================================
// SEED-MYWORLD-RATES COMMAND
// ============================================================
//
// Populates the (already-present, still-empty) ratesAndFeaturesBlock
// instance on the real "MyWorld" productLoanPage content node with the
// actual rate/feature data from the live site's own "All Rates" /
// "MyWORLD Banking Features" tables - a backoffice editor already added
// an empty block of this type to that node's sections once this
// session's create-product-loan-schema command made the type available
// (confirmed via a direct, read-only inspection of the production
// database), so this only fills in that one block's fields - it does
// NOT add a new block, touch any of MyWorld's other 6 sections, or
// change its publish state.
//
// Data transcribed directly from a screenshot of the live page - no
// query against any other database. Icon fields are left unset (no real
// icon artwork available, same "honest - not available" choice this
// file makes everywhere else for media it doesn't have).
//
// Targets MyWorld's "sections" property directly rather than going
// through productLoanPageSections/GetOrCreateBlockListAsync - this is a
// one-off CONTENT edit, not a schema change (ratesAndFeaturesBlock
// itself already exists and is already allowed there).
//
// Writes each top-level field as a {editorAlias, culture, segment,
// alias, value} tuple into the block's own "values" array - confirmed
// against this live database's actual stored shape for an existing
// block (not the simplified flat shape BuildBlockList's own nested
// lists below produce, which Umbraco's save pipeline normalizes into
// this same shape - see retype-product-loan-richtext-fields' own
// comment on this exact distinction, discovered the hard way earlier
// this session). Matches the EXISTING (currently empty) block by its
// own key rather than creating a new contentData entry - scoped to
// "ratesAndFeaturesBlock entries with no values yet", so a second run
// after this one succeeds finds nothing left to populate and no-ops
// instead of double-writing.
if (args.Length > 0 &&
    args[0].Equals("seed-myworld-rates", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" SEED MYWORLD RATES AND FEATURES");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService = app.Services.GetRequiredService<IContentTypeService>();
    var contentService = app.Services.GetRequiredService<IContentService>();
    var shortStringHelper = app.Services.GetRequiredService<IShortStringHelper>();

    var ratesAndFeaturesType = contentTypeService.Get("ratesAndFeaturesBlock");
    var rateTierItemType = contentTypeService.Get("rateTierItem");
    var featureRowItemType = contentTypeService.Get("featureRowItem");

    if (ratesAndFeaturesType == null || rateTierItemType == null || featureRowItemType == null)
    {
        Console.WriteLine(
            "ERROR: ratesAndFeaturesBlock/rateTierItem/featureRowItem not found - " +
            "run 'create-product-loan-schema' first.");
        return;
    }

    var productLoanPageType = contentTypeService.Get("productLoanPage");

    if (productLoanPageType == null)
    {
        Console.WriteLine("ERROR: 'productLoanPage' content type not found.");
        return;
    }

    var myWorldNode =
        contentService
            .GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault(n =>
                n.Name != null &&
                n.Name.Equals("MyWorld", StringComparison.OrdinalIgnoreCase));

    if (myWorldNode == null)
    {
        Console.WriteLine("ERROR: no productLoanPage node named \"MyWorld\" found.");
        return;
    }

    Console.WriteLine($"Found MyWorld node: id={myWorldNode.Id}, published={myWorldNode.Published}");

    var raw = myWorldNode.GetValue<string>("sections");

    if (string.IsNullOrWhiteSpace(raw))
    {
        Console.WriteLine("ERROR: MyWorld's \"sections\" property is empty.");
        return;
    }

    JsonNode? parsed;

    try
    {
        parsed = JsonNode.Parse(raw);
    }
    catch (JsonException ex)
    {
        Console.WriteLine($"ERROR: could not parse MyWorld's sections JSON: {ex.Message}");
        return;
    }

    if (parsed is not JsonObject root ||
        !root.TryGetPropertyValue("contentData", out var cdNode) ||
        cdNode is not JsonArray contentData)
    {
        Console.WriteLine("ERROR: MyWorld's sections JSON has no contentData array.");
        return;
    }

    var ratesBlockKey = ratesAndFeaturesType.Key.ToString();

    // Matches an empty block (fresh from the backoffice) OR one this same
    // command already wrote to but didn't fully complete - "featureRows" is
    // the last of the 12 fields this command writes, so its absence is an
    // unambiguous "not fully populated yet" signal regardless of how many
    // of the other 11 already made it through on a prior run. Re-running
    // this command always does a full overwrite of the block's "values"
    // array (not a merge), so matching on "incomplete" rather than
    // strictly "empty" makes a partial-write recoverable by just running
    // this command again.
    var target =
        contentData
            .OfType<JsonObject>()
            .FirstOrDefault(block =>
                block.TryGetPropertyValue("contentTypeKey", out var ctk) &&
                ctk != null &&
                ctk.ToString().Equals(ratesBlockKey, StringComparison.OrdinalIgnoreCase) &&
                (!block.TryGetPropertyValue("values", out var vals) ||
                 vals is not JsonArray valsArr ||
                 !valsArr.OfType<JsonObject>().Any(v =>
                     v.TryGetPropertyValue("alias", out var a) &&
                     a != null &&
                     a.ToString().Equals("featureRows", StringComparison.OrdinalIgnoreCase))));

    if (target == null)
    {
        Console.WriteLine(
            "No ratesAndFeaturesBlock instance needing population found on " +
            "MyWorld - either none exists yet (add one via the backoffice " +
            "first) or it's already fully populated (this command is a " +
            "no-op once that's done).");
        return;
    }

    Console.WriteLine($"Target block key: {target["key"]}");

    if (target.TryGetPropertyValue("values", out var existingVals) &&
        existingVals is JsonArray existingValsArr &&
        existingValsArr.Count > 0)
    {
        Console.WriteLine(
            $"NOTE: block already has {existingValsArr.Count} value(s) from an " +
            "earlier incomplete run - overwriting with the full set below.");
    }

    // Same {markup, blocks:{layout,contentData,settingsData}} RichText shape
    // every other BuildRichText copy in this file produces.
    JsonObject BuildRichText(string html) =>
        new JsonObject
        {
            ["markup"] = html,
            ["blocks"] =
                new JsonObject
                {
                    ["layout"] = new JsonObject(),
                    ["contentData"] = new JsonArray(),
                    ["settingsData"] = new JsonArray()
                }
        };

    // Same shape every other BuildBlockList copy in this file produces (the
    // "udi"/"contentUdi" legacy shape - Umbraco's own save pipeline
    // normalizes this into the real "key"/"contentKey" shape on Save(), the
    // same way it already normalized the flat-vs-values-array shape found
    // earlier this session).
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

    var rateTiers = new (string TierLabel, string RateValue)[]
    {
        ("R 0 - R 24 999", "2.75%"),
        ("R 25 000 - R 49 999", "3.75%"),
        ("R 50 000 - R 99 999", "4.75%"),
        ("R 100 000 - R 999 999", "5.25%"),
        ("R 1 000 000+", "5.50%"),
    };

    var rateTiersValue =
        BuildBlockList(
            rateTierItemType,
            rateTiers.Select(t =>
                new Dictionary<string, JsonNode?>
                {
                    ["tierLabel"] = t.TierLabel,
                    ["rateValue"] = t.RateValue
                }))
            .ToJsonString();

    // (Label, Col1Checked, Col1Value, Col2Checked, Col2Value, Col3Checked, Col3Value)
    var featureRows = new (string Label, bool C1, string V1, bool C2, string V2, bool C3, string V3)[]
    {
        ("Competitive rate on any positive balance", true, "", true, "", true, ""),
        ("Minimum account balance", false, "R0.00", false, "R0.00", false, "R0.00"),
        ("2 Linked Pocket accounts", false, "", true, "", true, ""),
        ("Deposit money", true, "", true, "", true, ""),
        ("Withdraw cash at till at selected retailers", true, "", true, "", false, ""),
        ("Withdraw cash at any ATM", true, "", true, "", false, ""),
        ("Pay for purchases", true, "", true, "", false, ""),
        ("Transfer between accounts instantly", true, "", true, "", true, ""),
        ("Link VISA debit cards", true, "", true, "", false, ""),
        ("Add up to 5 pocket accounts", false, "", true, "", true, ""),
        ("Add a pocket user to bank", false, "", false, "1 User", false, "1 User"),
        ("Add pocket members to view", false, "", false, "Up to 10 Members", false, "Up to 10 Members"),
        ("Instant Issue VISA debit cards", true, "", true, "", false, ""),
        ("Allocate banking fees", true, "", true, "", false, ""),
        ("Debit orders", true, "", false, "", false, ""),
        ("Instant payments reflect instantly", true, "", true, "", false, ""),
        ("Balance enquiry at till or ATM", true, "", true, "", false, ""),
    };

    var featureRowsValue =
        BuildBlockList(
            featureRowItemType,
            featureRows.Select(r =>
                new Dictionary<string, JsonNode?>
                {
                    ["label"] = r.Label,
                    ["column1Checked"] = r.C1,
                    ["column1Value"] = r.V1,
                    ["column2Checked"] = r.C2,
                    ["column2Value"] = r.V2,
                    ["column3Checked"] = r.C3,
                    ["column3Value"] = r.V3
                }))
            .ToJsonString();

    JsonObject ValueEntry(string alias, string editorAlias, JsonNode? value) =>
        new JsonObject
        {
            ["editorAlias"] = editorAlias,
            ["culture"] = null,
            ["segment"] = null,
            ["alias"] = alias,
            ["value"] = value
        };

    var values = new JsonArray
    {
        ValueEntry("ratesHeading", "Umbraco.TextBox", "All Rates"),
        ValueEntry("rateTiers", "Umbraco.BlockList", rateTiersValue),
        ValueEntry(
            "ratesDisclaimerOne", "Umbraco.RichText",
            BuildRichText(
                "<p>Interest rates are quoted as Nominal Annual Rates Compounded " +
                "Monthly (NACM) and are valid for today only, as they are subject " +
                "to change.</p>").ToJsonString()),
        ValueEntry(
            "ratesDisclaimerTwo", "Umbraco.RichText",
            BuildRichText(
                "<p>Terms and conditions apply. We cannot advise you on the tax " +
                "implications of investing. It is recommended that you contact " +
                "your financial advisor or tax consultant.</p>").ToJsonString()),
        ValueEntry("featuresHeading", "Umbraco.TextBox", "MyWORLD Banking Features"),
        ValueEntry("column1Icon", "Umbraco.MediaPicker3", null),
        ValueEntry("column1Name", "Umbraco.TextBox", "MyWORLD"),
        ValueEntry("column2Icon", "Umbraco.MediaPicker3", null),
        ValueEntry("column2Name", "Umbraco.TextBox", "Power Pocket"),
        ValueEntry("column3Icon", "Umbraco.MediaPicker3", null),
        ValueEntry("column3Name", "Umbraco.TextBox", "Savings Pocket"),
        ValueEntry("featureRows", "Umbraco.BlockList", featureRowsValue),
    };

    target["values"] = values;

    myWorldNode.SetValue("sections", root.ToJsonString());

    var wasPublished = myWorldNode.Published;

    contentService.Save(myWorldNode);

    if (wasPublished)
    {
        contentService.Publish(myWorldNode, new[] { "*" });
    }

    // Self-verify against a FRESH read (not the in-memory `myWorldNode`/
    // `root` this command just built) - re-fetches the node from the
    // content service and re-parses its "sections" value from scratch, so
    // this confirms what was actually persisted rather than trusting the
    // object this command already holds in memory.
    var expectedAliases =
        values.OfType<JsonObject>()
            .Select(v => v["alias"]?.ToString())
            .Where(a => a != null)
            .Cast<string>()
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    var reloaded = contentService.GetById(myWorldNode.Id);
    var reloadedRaw = reloaded?.GetValue<string>("sections");
    var persistedAliases = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    if (reloadedRaw != null &&
        JsonNode.Parse(reloadedRaw) is JsonObject reloadedRoot &&
        reloadedRoot.TryGetPropertyValue("contentData", out var reloadedCd) &&
        reloadedCd is JsonArray reloadedArr)
    {
        var reloadedTarget =
            reloadedArr.OfType<JsonObject>()
                .FirstOrDefault(b =>
                    b.TryGetPropertyValue("key", out var k) &&
                    k != null &&
                    k.ToString().Equals(target["key"]?.ToString(), StringComparison.OrdinalIgnoreCase));

        if (reloadedTarget?["values"] is JsonArray reloadedVals)
        {
            foreach (var v in reloadedVals.OfType<JsonObject>())
            {
                if (v["alias"]?.ToString() is string alias) persistedAliases.Add(alias);
            }
        }
    }

    var missing = expectedAliases.Except(persistedAliases).ToList();

    Console.WriteLine();
    Console.WriteLine("DONE.");
    Console.WriteLine(
        $"Populated ratesAndFeaturesBlock on MyWorld (id={myWorldNode.Id}) with " +
        $"{rateTiers.Length} rate tiers and {featureRows.Length} feature rows. " +
        $"Published: {wasPublished}.");
    Console.WriteLine(
        $"VERIFY: {persistedAliases.Count}/{expectedAliases.Count} fields confirmed " +
        "persisted on re-read.");

    if (missing.Count > 0)
    {
        Console.WriteLine($"WARNING: these fields did NOT persist: {string.Join(", ", missing)}");
    }

    return;
}

// ============================================================
// CREATE-TAP2GLASS-CONTENT COMMAND
// ============================================================
//
// Builds one real businessBankingPage content node under the Home node (so
// it lands at /en/home/tap2glass/, matching the real nav link already live
// on the site's own Business mega menu - "BANK" category, "Tap2Glass").
// Same document type as create-business-content's own "Business Banking"
// node above - businessBankingPage is reused generically, this is just a
// second content node of it with a different mix of sections: a single-
// slide hero (with a "< Back" link to the Business Banking page itself -
// businessHeroCarouselBlock's own backLink field), a plain text intro, the
// 3 pricing cards (no heading, no buttons - just stats), a Benefits panel,
// and an FAQ section.
//
// Image (the phone mockup, the Benefits photo) and the FAQ answers are
// deliberately left blank - the live page's own files/copy aren't
// available here, same honest "not available" choice every other content-
// creation command above makes for what it doesn't actually have. Add
// those via the backoffice once you have them.
//
// Idempotent: finds an existing "Tap2Glass" node by name under the Home
// node (or wherever it was moved to) and updates its sections in place
// rather than duplicating it, same pattern as create-business-content.

if (args.Length > 0 &&
    args[0].Equals("create-tap2glass-content", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" CREATE TAP2GLASS CONTENT");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var businessBankingPageType = contentTypeService.Get("businessBankingPage");
    var businessHeroCarouselBlockType = contentTypeService.Get("businessHeroCarouselBlock");
    var heroSlideType = contentTypeService.Get("heroSlide");
    var textIntroBlockType = contentTypeService.Get("textIntroBlock");
    var businessOfferingsBlockType = contentTypeService.Get("businessOfferingsBlock");
    var cardOfferingType = contentTypeService.Get("cardOffering");
    var benefitsPanelBlockType = contentTypeService.Get("benefitsPanelBlock");
    var featureItemType = contentTypeService.Get("featureItem");
    var faqSectionBlockType = contentTypeService.Get("faqSectionBlock");
    var faqItemType = contentTypeService.Get("faqItem");

    if (businessBankingPageType == null || businessHeroCarouselBlockType == null ||
        heroSlideType == null || textIntroBlockType == null ||
        businessOfferingsBlockType == null || cardOfferingType == null ||
        benefitsPanelBlockType == null || featureItemType == null ||
        faqSectionBlockType == null || faqItemType == null)
    {
        Console.WriteLine(
            "ERROR: one or more required content types are missing - run " +
            "'create-business-schema' first.");

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

    JsonObject BuildRichText(string html) =>
        new JsonObject
        {
            ["markup"] = html,
            ["blocks"] =
                new JsonObject
                {
                    ["layout"] = new JsonObject(),
                    ["contentData"] = new JsonArray(),
                    ["settingsData"] = new JsonArray()
                }
        };

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

    // --------------------------------------------------------
    // HERO - single slide, with a back link to Business Banking
    // --------------------------------------------------------

    var heroSlides =
        BuildBlockList(
            heroSlideType,
            new[]
            {
                new Dictionary<string, JsonNode?>
                {
                    ["titleMain"] = "Tap2Glass",
                    ["description"] =
                        "Tap2Glass turns your NFC enabled Android device (phone or " +
                        "tablet) into a card machine for easy customer payments. It's " +
                        "a quick, cost-effective, convenient, and more importantly, a " +
                        "secure way to transact.",
                },
            });

    var heroCarouselUdi = $"umb://element/{Guid.NewGuid():N}";

    var heroCarouselContentData =
        new JsonObject
        {
            ["contentTypeKey"] = businessHeroCarouselBlockType.Key.ToString(),
            ["udi"] = heroCarouselUdi,
            ["slides"] = heroSlides.ToJsonString(),
            ["backLink"] =
                BuildExternalLink("Back", "/en/home/business-banking/").ToJsonString(),
        };

    // --------------------------------------------------------
    // TEXT INTRO - "Why choose Tap2Glass?"
    // --------------------------------------------------------

    var textIntroUdi = $"umb://element/{Guid.NewGuid():N}";

    var textIntroContentData =
        new JsonObject
        {
            ["contentTypeKey"] = textIntroBlockType.Key.ToString(),
            ["udi"] = textIntroUdi,
            ["heading"] = "Why choose Tap2Glass?",
            ["bodyHtml"] =
                BuildRichText(
                        "<p>A smarter way to manage your business and get paid—anytime, " +
                        "anywhere. Just load Tap2Glass on your mobile device and your " +
                        "customers can pay you instantly through the Tap2Glass App.</p>" +
                        "<p><strong>A Business Transactional Account is required to use " +
                        "the App.</strong></p>")
                    .ToJsonString(),
        };

    // --------------------------------------------------------
    // PRICING CARDS - 3 stats, no heading, no buttons
    // --------------------------------------------------------

    var pricingCards =
        BuildBlockList(
            cardOfferingType,
            new[]
            {
                new Dictionary<string, JsonNode?>
                {
                    ["title"] = "2.5% fixed rate",
                    ["description"] = "Only 2.5%* per transaction – a super-low fixed rate.",
                },
                new Dictionary<string, JsonNode?>
                {
                    ["title"] = "R8.00 cash out fee",
                    ["description"] =
                        "Pay only R8.00* to transfer money from Tap2Glass to your Bank " +
                        "account.",
                },
                new Dictionary<string, JsonNode?>
                {
                    ["title"] = "Value for you",
                    ["description"] =
                        "No hidden fees – free to download with no monthly " +
                        "subscriptions. Data charges may apply from your mobile " +
                        "network provider.\n\n* Fees and rates shown are exclusive of " +
                        "VAT. VAT will be added where applicable..",
                },
            });

    var pricingCardsUdi = $"umb://element/{Guid.NewGuid():N}";

    var pricingCardsContentData =
        new JsonObject
        {
            ["contentTypeKey"] = businessOfferingsBlockType.Key.ToString(),
            ["udi"] = pricingCardsUdi,
            ["heading"] = "",
            ["cards"] = pricingCards.ToJsonString(),
        };

    // --------------------------------------------------------
    // BENEFITS PANEL
    // --------------------------------------------------------

    var benefitsFeatures =
        BuildBlockList(
            featureItemType,
            new[]
            {
                new Dictionary<string, JsonNode?>
                {
                    ["text"] = "Easy payments: Payments made easy for you and your customers.",
                },
                new Dictionary<string, JsonNode?>
                {
                    ["text"] =
                        "Real-time tracking and reporting: See transactions instantly " +
                        "for better business and financial control.",
                },
                new Dictionary<string, JsonNode?>
                {
                    ["text"] = "Mobile-friendly: Set up in minutes, receive payments on the go.",
                },
            });

    var benefitsPanelUdi = $"umb://element/{Guid.NewGuid():N}";

    var benefitsPanelContentData =
        new JsonObject
        {
            ["contentTypeKey"] = benefitsPanelBlockType.Key.ToString(),
            ["udi"] = benefitsPanelUdi,
            ["heading"] = "Benefits",
            ["features"] = benefitsFeatures.ToJsonString(),
            ["imageOnRight"] = true,
        };

    // --------------------------------------------------------
    // FAQ
    // --------------------------------------------------------
    // Answers are a placeholder - the live page's accordions were closed
    // with no answer text visible to port, so this is honestly blank
    // rather than a guess. Fill the real answers in via the backoffice.

    var placeholderAnswer =
        BuildRichText("<p>Add the real answer in the backoffice.</p>").ToJsonString();

    var faqItems =
        BuildBlockList(
            faqItemType,
            new[]
            {
                new Dictionary<string, JsonNode?>
                {
                    ["question"] = "What types of payments can be accepted through the Tap2Glass App?",
                    ["answer"] = placeholderAnswer,
                },
                new Dictionary<string, JsonNode?>
                {
                    ["question"] = "What cards can be used on Tap2Glass?",
                    ["answer"] = placeholderAnswer,
                },
                new Dictionary<string, JsonNode?>
                {
                    ["question"] = "Does Tap2Glass accept payments from Samsung Pay or Apple Pay?",
                    ["answer"] = placeholderAnswer,
                },
            });

    var faqUdi = $"umb://element/{Guid.NewGuid():N}";

    var faqContentData =
        new JsonObject
        {
            ["contentTypeKey"] = faqSectionBlockType.Key.ToString(),
            ["udi"] = faqUdi,
            ["heading"] = "FAQ",
            ["items"] = faqItems.ToJsonString(),
        };

    // --------------------------------------------------------
    // PAGE SECTIONS
    // --------------------------------------------------------

    var sectionsValue =
        new JsonObject
        {
            ["layout"] =
                new JsonObject
                {
                    ["Umbraco.BlockList"] =
                        new JsonArray(
                            new JsonObject { ["contentUdi"] = heroCarouselUdi },
                            new JsonObject { ["contentUdi"] = textIntroUdi },
                            new JsonObject { ["contentUdi"] = pricingCardsUdi },
                            new JsonObject { ["contentUdi"] = benefitsPanelUdi },
                            new JsonObject { ["contentUdi"] = faqUdi })
                },
            ["contentData"] =
                new JsonArray(
                    heroCarouselContentData,
                    textIntroContentData,
                    pricingCardsContentData,
                    benefitsPanelContentData,
                    faqContentData)
        };

    // --------------------------------------------------------
    // PLACEMENT - as a child of the Home node, so the route comes out as
    // /en/home/tap2glass/ (Umbraco slugifies the node name)
    // --------------------------------------------------------

    var parentId = -1;
    var parentDescription = "root";

    var pageHomeType = contentTypeService.Get("pageHome");

    var homeNode =
        pageHomeType == null
            ? null
            : contentService
                .GetPagedOfType(pageHomeType.Id, 0, 10, out _, null!)
                .FirstOrDefault();

    if (homeNode != null)
    {
        parentId = homeNode.Id;
        parentDescription = $"child of \"{homeNode.Name}\" (id={parentId})";
    }
    else
    {
        Console.WriteLine(
            "NOTE: no 'pageHome' content node found - creating at root instead. " +
            "You may need to move this node under Home in the content tree " +
            "afterward so its route matches /en/home/tap2glass/.");
    }

    const string nodeName = "Tap2Glass";

    // This site's own migrated legacy content already has a REAL page
    // named "tap2Glass" directly under Home (a pre-existing baseModernUI-
    // typed node, confirmed live) - same situation as create-business-
    // content's own rename below handles for "Business Banking", see that
    // comment. Scoped strictly to a direct child of Home with the exact
    // legacy name (case-insensitive) - several unrelated "Tap2Glass"-named
    // nodes exist elsewhere in the tree, which this must not touch.
    if (parentId != -1)
    {
        var legacySibling =
            contentService
                .GetPagedChildren(parentId, 0, 500, out _, null!)
                .FirstOrDefault(n =>
                    !n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                    n.Name != null &&
                    n.Name.Equals(nodeName, StringComparison.OrdinalIgnoreCase));

        if (legacySibling != null)
        {
            var legacyName = $"{legacySibling.Name} (Legacy)";
            legacySibling.Name = legacyName;
            contentService.Save(legacySibling);
            var legacyPublishResult = contentService.Publish(legacySibling, new[] { "*" });

            Console.WriteLine(
                $"RENAMED LEGACY SIBLING: \"{nodeName}\" (id={legacySibling.Id}) -> " +
                $"\"{legacyName}\" - frees up the route for the node below. " +
                $"Publish: {legacyPublishResult.Result}");
        }
    }

    // Self-heals any duplicate "Tap2Glass (1)"/"(2)"/... nodes a prior run
    // created before this rename step existed - see create-business-
    // content's own identical comment above for why.
    var candidateNodes =
        (parentId == -1
            ? contentService.GetPagedOfType(businessBankingPageType.Id, 0, 50, out _, null!)
            : contentService.GetPagedChildren(parentId, 0, 500, out _, null!))
            .Where(n =>
                n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                n.Name != null &&
                (n.Name.Equals(nodeName, StringComparison.OrdinalIgnoreCase) ||
                 Regex.IsMatch(n.Name, $@"^{Regex.Escape(nodeName)} \(\d+\)$")))
            .OrderBy(n => n.Id)
            .ToList();

    IContent node;

    if (candidateNodes.Count > 0)
    {
        node = candidateNodes[0];

        foreach (var duplicate in candidateNodes.Skip(1))
        {
            contentService.Delete(duplicate);

            Console.WriteLine($"DELETED DUPLICATE: \"{duplicate.Name}\" (id={duplicate.Id})");
        }

        if (node.Name != nodeName)
        {
            node.Name = nodeName;

            Console.WriteLine($"RENAMED: \"{candidateNodes[0].Name}\" (id={node.Id}) -> \"{nodeName}\"");
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
        node = contentService.Create(nodeName, parentId, "businessBankingPage");

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
        Console.WriteLine($"SAVED BUT FAILED PUBLISH: {node.Name} (id={node.Id}) - {publishResult.Result}");

        return;
    }

    Console.WriteLine();
    Console.WriteLine($"DONE. Published \"{nodeName}\" (id={node.Id}).");
    Console.WriteLine("View it at /en/home/tap2glass/");
    Console.WriteLine(
        "No images were set (the phone mockup, the Benefits photo) and the " +
        "FAQ answers are a placeholder ('Add the real answer in the " +
        "backoffice.') - the live page's own files/copy weren't available " +
        "here. Add them via the backoffice (Media Picker for images, the " +
        "Rich Text editor for each FAQ answer) once you have them. " +
        "Everything else (headings/copy/stats/benefits) is real content " +
        "from the live page.");

    return;
}

// ============================================================
// CREATE-BUSINESS-TRANSACTIONAL-CONTENT COMMAND
// ============================================================
//
// Builds one real businessBankingPage content node under the Home node (so
// it lands at /en/home/business-transactional-account/), using the
// Document Types create-business-schema defines - a single-slide hero
// (with a "< Back" link to Business Banking), a text intro, an icon-only
// benefits row, the "Key features" panel, a second text intro, the 4
// "Easy application" steps, the tabbed document requirements block, and
// the pricing guide downloads list.
//
// Images (the debit card photo, the Key Features photo, the Pricing Guide
// photo) and the Pricing Guide's actual PDF files are deliberately left
// blank - not available here, same honest choice every other content-
// creation command above makes for what it doesn't actually have. Two
// CTAs are also left blank for the same reason: the hero's own real "Apply
// Now" destination and Step 2/3's real destinations reuse this site's own
// already-confirmed real URLs (get-a-quote, ib.africanbank.co.za, the Play
// Store listing - all seen live elsewhere in this codebase), but Step 4's
// "Learn more" (debit card activation) has no confirmed real destination
// anywhere in this codebase, so it's left without a button rather than a
// guessed URL.
//
// "Key features"' own bullet list (benefitsPanelBlock.features) loses the
// live page's mid-sentence bold emphasis ("future-dated", "payroll", ...)
// - featureItem (shared across many other checklists in this app) is
// plain text, not rich text, so only a leading "Label:" prefix (Tap2Glass's
// own Benefits panel shape) can render bold; arbitrary inline bold mid-
// string can't without widening that shared type for every other caller.
//
// Idempotent: finds an existing "Business Transactional Account" node by
// name under the Home node (or wherever it was moved to) and updates its
// sections in place rather than duplicating it, same pattern - including
// the legacy-sibling-rename self-heal - as create-business-content/
// create-tap2glass-content above.

if (args.Length > 0 &&
    args[0].Equals("create-business-transactional-content", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" CREATE BUSINESS TRANSACTIONAL ACCOUNT CONTENT");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService =
        app.Services.GetRequiredService<IContentTypeService>();

    var contentService =
        app.Services.GetRequiredService<IContentService>();

    var businessBankingPageType = contentTypeService.Get("businessBankingPage");
    var businessHeroCarouselBlockType = contentTypeService.Get("businessHeroCarouselBlock");
    var heroSlideType = contentTypeService.Get("heroSlide");
    var textIntroBlockType = contentTypeService.Get("textIntroBlock");
    var iconGridBlockType = contentTypeService.Get("iconGridBlock");
    var heroGridItemType = contentTypeService.Get("heroGridItem");
    var benefitsPanelBlockType = contentTypeService.Get("benefitsPanelBlock");
    var featureItemType = contentTypeService.Get("featureItem");
    var businessOfferingsBlockType = contentTypeService.Get("businessOfferingsBlock");
    var cardOfferingType = contentTypeService.Get("cardOffering");
    var documentRequirementsBlockType = contentTypeService.Get("documentRequirementsBlock");
    var documentCategoryType = contentTypeService.Get("documentCategory");
    var pricingGuideBlockType = contentTypeService.Get("pricingGuideBlock");
    var pricingLinkItemType = contentTypeService.Get("pricingLinkItem");

    if (businessBankingPageType == null || businessHeroCarouselBlockType == null ||
        heroSlideType == null || textIntroBlockType == null || iconGridBlockType == null ||
        heroGridItemType == null || benefitsPanelBlockType == null || featureItemType == null ||
        businessOfferingsBlockType == null || cardOfferingType == null ||
        documentRequirementsBlockType == null || documentCategoryType == null ||
        pricingGuideBlockType == null || pricingLinkItemType == null)
    {
        Console.WriteLine(
            "ERROR: one or more required content types are missing - run " +
            "'create-business-schema' first.");

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

    JsonObject BuildRichText(string html) =>
        new JsonObject
        {
            ["markup"] = html,
            ["blocks"] =
                new JsonObject
                {
                    ["layout"] = new JsonObject(),
                    ["contentData"] = new JsonArray(),
                    ["settingsData"] = new JsonArray()
                }
        };

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

    const string applyNowUrl =
        "https://www.africanbank.co.za/en/home/get-a-quote?" +
        "utm_source=Website&utm_medium=Productpage&utm_campaign=WebLead";

    // --------------------------------------------------------
    // HERO
    // --------------------------------------------------------

    var heroSlides =
        BuildBlockList(
            heroSlideType,
            new[]
            {
                new Dictionary<string, JsonNode?>
                {
                    ["titleMain"] = "Business Transactional Account",
                    ["description"] =
                        "Manage your business better with customised payment and " +
                        "beyond banking solutions, with an account you can access " +
                        "anytime, anywhere.",
                    ["cta"] = BuildExternalLink("Apply Now", applyNowUrl).ToJsonString(),
                },
            });

    var heroUdi = $"umb://element/{Guid.NewGuid():N}";

    var heroContentData =
        new JsonObject
        {
            ["contentTypeKey"] = businessHeroCarouselBlockType.Key.ToString(),
            ["udi"] = heroUdi,
            ["slides"] = heroSlides.ToJsonString(),
            ["backLink"] =
                BuildExternalLink("Back", "/en/home/business-banking/").ToJsonString(),
        };

    // --------------------------------------------------------
    // "EFFORTLESS BANKING" INTRO + ICON GRID
    // --------------------------------------------------------

    var introUdi = $"umb://element/{Guid.NewGuid():N}";

    var introContentData =
        new JsonObject
        {
            ["contentTypeKey"] = textIntroBlockType.Key.ToString(),
            ["udi"] = introUdi,
            ["heading"] = "Effortless banking for your business",
            ["bodyHtml"] =
                BuildRichText(
                        "<p>Our Business Transactional Account offers a digital " +
                        "solution with <strong>convenience, flexibility,</strong> " +
                        "and <strong>24/7 access</strong> anytime, anywhere, " +
                        "through our mobile app.</p><p><strong>Enjoy these " +
                        "benefits with our Business Transactional Account:" +
                        "</strong></p>")
                    .ToJsonString(),
        };

    var iconGridItems =
        BuildBlockList(
            heroGridItemType,
            new[]
            {
                new Dictionary<string, JsonNode?> { ["label"] = "Easy online access" },
                new Dictionary<string, JsonNode?> { ["label"] = "Free EFT deposit" },
                new Dictionary<string, JsonNode?> { ["label"] = "Low banking fees" },
                new Dictionary<string, JsonNode?> { ["label"] = "Secure payments" },
            });

    var iconGridUdi = $"umb://element/{Guid.NewGuid():N}";

    var iconGridContentData =
        new JsonObject
        {
            ["contentTypeKey"] = iconGridBlockType.Key.ToString(),
            ["udi"] = iconGridUdi,
            ["heading"] = "",
            ["items"] = iconGridItems.ToJsonString(),
        };

    // --------------------------------------------------------
    // "KEY FEATURES" PANEL
    // --------------------------------------------------------

    var keyFeatures =
        BuildBlockList(
            featureItemType,
            new[]
            {
                new Dictionary<string, JsonNode?>
                {
                    ["text"] =
                        "Make payments securely, including future-dated and " +
                        "recurring payments.",
                },
                new Dictionary<string, JsonNode?>
                {
                    ["text"] =
                        "Delegate your authority to your staff while you " +
                        "concentrate on managing your business.",
                },
                new Dictionary<string, JsonNode?>
                {
                    ["text"] = "Create your own payroll and payslips.",
                },
                new Dictionary<string, JsonNode?>
                {
                    ["text"] = "Customise quote and invoice templates.",
                },
            });

    var keyFeaturesUdi = $"umb://element/{Guid.NewGuid():N}";

    var keyFeaturesContentData =
        new JsonObject
        {
            ["contentTypeKey"] = benefitsPanelBlockType.Key.ToString(),
            ["udi"] = keyFeaturesUdi,
            ["heading"] = "Key features",
            ["features"] = keyFeatures.ToJsonString(),
            ["imageOnRight"] = true,
        };

    // --------------------------------------------------------
    // "EASY APPLICATION" INTRO + 4 STEPS
    // --------------------------------------------------------

    var applicationIntroUdi = $"umb://element/{Guid.NewGuid():N}";

    var applicationIntroContentData =
        new JsonObject
        {
            ["contentTypeKey"] = textIntroBlockType.Key.ToString(),
            ["udi"] = applicationIntroUdi,
            ["heading"] = "Easy application",
            ["bodyHtml"] =
                BuildRichText(
                        "<p>We know you're eager to get started, so we've made " +
                        "the process simple, for you.</p>")
                    .ToJsonString(),
        };

    var applicationSteps =
        BuildBlockList(
            cardOfferingType,
            new[]
            {
                new Dictionary<string, JsonNode?>
                {
                    ["title"] = "Step 1",
                    ["description"] = "Apply for a Business Transactional Account.",
                    ["cta"] = BuildExternalLink("Apply Now", applyNowUrl).ToJsonString(),
                },
                new Dictionary<string, JsonNode?>
                {
                    ["title"] = "Step 2",
                    ["description"] = "Register for Online Banking.",
                    ["cta"] =
                        BuildExternalLink("Register", "https://ib.africanbank.co.za/")
                            .ToJsonString(),
                },
                new Dictionary<string, JsonNode?>
                {
                    ["title"] = "Step 3",
                    ["description"] = "Download our Mobile Banking App.",
                    ["cta"] =
                        BuildExternalLink(
                                "Download",
                                "https://play.google.com/store/apps/details?" +
                                "id=za.co.android.africanbank")
                            .ToJsonString(),
                },
                new Dictionary<string, JsonNode?>
                {
                    ["title"] = "Step 4",
                    ["description"] = "Activate and manage your debit card.",
                    // No real "Learn more" destination confirmed anywhere
                    // in this codebase - left blank rather than guessed.
                },
            });

    var applicationStepsUdi = $"umb://element/{Guid.NewGuid():N}";

    var applicationStepsContentData =
        new JsonObject
        {
            ["contentTypeKey"] = businessOfferingsBlockType.Key.ToString(),
            ["udi"] = applicationStepsUdi,
            ["heading"] = "",
            ["cards"] = applicationSteps.ToJsonString(),
        };

    // --------------------------------------------------------
    // DOCUMENT REQUIREMENTS
    // --------------------------------------------------------

    var privateCompanyDocuments =
        BuildBlockList(
            featureItemType,
            new[]
            {
                new Dictionary<string, JsonNode?> { ["text"] = "CIPC Document" },
                new Dictionary<string, JsonNode?> { ["text"] = "ID Document" },
                new Dictionary<string, JsonNode?> { ["text"] = "Resolution Document" },
                new Dictionary<string, JsonNode?>
                {
                    ["text"] =
                        "Proof of Address (Any document issued by an independent " +
                        "3rd party that reflects the residential address of the " +
                        "person being verified.)",
                },
            });

    var noDocuments = BuildBlockList(featureItemType, Array.Empty<Dictionary<string, JsonNode?>>());

    var documentCategories =
        BuildBlockList(
            documentCategoryType,
            new[]
            {
                new Dictionary<string, JsonNode?>
                {
                    ["categoryName"] = "Private company",
                    ["documents"] = privateCompanyDocuments.ToJsonString(),
                },
                new Dictionary<string, JsonNode?>
                {
                    ["categoryName"] = "Sole proprietor",
                    ["documents"] = noDocuments.ToJsonString(),
                },
                new Dictionary<string, JsonNode?>
                {
                    ["categoryName"] = "General",
                    ["documents"] = noDocuments.ToJsonString(),
                },
            });

    var documentRequirementsUdi = $"umb://element/{Guid.NewGuid():N}";

    var documentRequirementsContentData =
        new JsonObject
        {
            ["contentTypeKey"] = documentRequirementsBlockType.Key.ToString(),
            ["udi"] = documentRequirementsUdi,
            ["heading"] = "Documents you will need to open a Business Transactional Account",
            ["categories"] = documentCategories.ToJsonString(),
            ["sizesFormatsHeading"] = "Document required sizes and formats:",
            ["sizesFormatsText"] =
                BuildRichText(
                        "<p>The document format required include pdf, doc, docx, " +
                        "xls, xlsx and gif.</p><p>A maximum document size allowed " +
                        "is 5 megabytes (MB) per document.</p>")
                    .ToJsonString(),
        };

    // --------------------------------------------------------
    // PRICING GUIDE
    // --------------------------------------------------------

    var pricingLinks =
        BuildBlockList(
            pricingLinkItemType,
            new[]
            {
                new Dictionary<string, JsonNode?> { ["label"] = "Pricing guide" },
                new Dictionary<string, JsonNode?> { ["label"] = "Privacy and Security" },
                new Dictionary<string, JsonNode?> { ["label"] = "Terms and Conditions" },
            });

    var pricingGuideUdi = $"umb://element/{Guid.NewGuid():N}";

    var pricingGuideContentData =
        new JsonObject
        {
            ["contentTypeKey"] = pricingGuideBlockType.Key.ToString(),
            ["udi"] = pricingGuideUdi,
            ["heading"] = "Pricing guide",
            ["links"] = pricingLinks.ToJsonString(),
        };

    // --------------------------------------------------------
    // PAGE SECTIONS
    // --------------------------------------------------------

    var sectionsValue =
        new JsonObject
        {
            ["layout"] =
                new JsonObject
                {
                    ["Umbraco.BlockList"] =
                        new JsonArray(
                            new JsonObject { ["contentUdi"] = heroUdi },
                            new JsonObject { ["contentUdi"] = introUdi },
                            new JsonObject { ["contentUdi"] = iconGridUdi },
                            new JsonObject { ["contentUdi"] = keyFeaturesUdi },
                            new JsonObject { ["contentUdi"] = applicationIntroUdi },
                            new JsonObject { ["contentUdi"] = applicationStepsUdi },
                            new JsonObject { ["contentUdi"] = documentRequirementsUdi },
                            new JsonObject { ["contentUdi"] = pricingGuideUdi })
                },
            ["contentData"] =
                new JsonArray(
                    heroContentData,
                    introContentData,
                    iconGridContentData,
                    keyFeaturesContentData,
                    applicationIntroContentData,
                    applicationStepsContentData,
                    documentRequirementsContentData,
                    pricingGuideContentData)
        };

    // --------------------------------------------------------
    // PLACEMENT - as a child of the Home node, so the route comes out as
    // /en/home/business-transactional-account/
    // --------------------------------------------------------

    var parentId = -1;
    var parentDescription = "root";

    var pageHomeType = contentTypeService.Get("pageHome");

    var homeNode =
        pageHomeType == null
            ? null
            : contentService
                .GetPagedOfType(pageHomeType.Id, 0, 10, out _, null!)
                .FirstOrDefault();

    if (homeNode != null)
    {
        parentId = homeNode.Id;
        parentDescription = $"child of \"{homeNode.Name}\" (id={parentId})";
    }
    else
    {
        Console.WriteLine(
            "NOTE: no 'pageHome' content node found - creating at root instead. " +
            "You may need to move this node under Home in the content tree " +
            "afterward so its route matches " +
            "/en/home/business-transactional-account/.");
    }

    const string nodeName = "Business Transactional Account";

    if (parentId != -1)
    {
        var legacySibling =
            contentService
                .GetPagedChildren(parentId, 0, 500, out _, null!)
                .FirstOrDefault(n =>
                    !n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                    n.Name != null &&
                    n.Name.Equals(nodeName, StringComparison.OrdinalIgnoreCase));

        if (legacySibling != null)
        {
            var legacyName = $"{legacySibling.Name} (Legacy)";
            legacySibling.Name = legacyName;
            contentService.Save(legacySibling);
            var legacyPublishResult = contentService.Publish(legacySibling, new[] { "*" });

            Console.WriteLine(
                $"RENAMED LEGACY SIBLING: \"{nodeName}\" (id={legacySibling.Id}) -> " +
                $"\"{legacyName}\" - frees up the route for the node below. " +
                $"Publish: {legacyPublishResult.Result}");
        }
    }

    var candidateNodes =
        (parentId == -1
            ? contentService.GetPagedOfType(businessBankingPageType.Id, 0, 50, out _, null!)
            : contentService.GetPagedChildren(parentId, 0, 500, out _, null!))
            .Where(n =>
                n.ContentType.Alias.Equals("businessBankingPage", StringComparison.OrdinalIgnoreCase) &&
                n.Name != null &&
                (n.Name.Equals(nodeName, StringComparison.OrdinalIgnoreCase) ||
                 Regex.IsMatch(n.Name, $@"^{Regex.Escape(nodeName)} \(\d+\)$")))
            .OrderBy(n => n.Id)
            .ToList();

    IContent node;

    if (candidateNodes.Count > 0)
    {
        node = candidateNodes[0];

        foreach (var duplicate in candidateNodes.Skip(1))
        {
            contentService.Delete(duplicate);

            Console.WriteLine($"DELETED DUPLICATE: \"{duplicate.Name}\" (id={duplicate.Id})");
        }

        if (node.Name != nodeName)
        {
            node.Name = nodeName;

            Console.WriteLine($"RENAMED: \"{candidateNodes[0].Name}\" (id={node.Id}) -> \"{nodeName}\"");
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
        node = contentService.Create(nodeName, parentId, "businessBankingPage");

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
        Console.WriteLine($"SAVED BUT FAILED PUBLISH: {node.Name} (id={node.Id}) - {publishResult.Result}");

        return;
    }

    Console.WriteLine();
    Console.WriteLine($"DONE. Published \"{nodeName}\" (id={node.Id}).");
    Console.WriteLine("View it at /en/home/business-transactional-account/");
    Console.WriteLine(
        "No images were set (debit card photo, Key Features photo, " +
        "Pricing Guide photo) and the Pricing Guide links have no actual " +
        "files attached, and Step 4's button has no destination - none of " +
        "those were available here. Add them via the backoffice (Media " +
        "Picker for images/files, Link Picker for Step 4) once you have " +
        "them. Everything else (headings/copy/steps/document lists) is " +
        "real content from the live page.");

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
        Console.WriteLine($"SAVED BUT FAILED PUBLISH: {node.Name} (id={node.Id}) - {publishResult.Result}");

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

    var languageService =
        app.Services.GetRequiredService<ILanguageService>();

    var dataTypeServiceForValidation =
        app.Services.GetRequiredService<IDataTypeService>();

    var productLoanPageType = contentTypeService.Get("productLoanPage");
    var pageLoansType = contentTypeService.Get("pageLoans");
    var heroImageBannerBlockType = contentTypeService.Get("heroImageBannerBlock");
    var loanCalculatorBlockType = contentTypeService.Get("loanCalculatorBlock");
    var creditLifeInsuranceBlockType = contentTypeService.Get("creditLifeInsuranceBlock");
    var featureItemType = contentTypeService.Get("featureItem");
    var crossSellBlockType = contentTypeService.Get("crossSellBlock");
    var contentCardType = contentTypeService.Get("contentCard");
    var heroBannerBlockType = contentTypeService.Get("heroBannerBlock");
    var appDownloadBlockType = contentTypeService.Get("appDownloadBlock");
    var faqSectionBlockType = contentTypeService.Get("faqSectionBlock");
    var faqItemType = contentTypeService.Get("faqItem");
    var downloadsSectionBlockType = contentTypeService.Get("downloadsSectionBlock");
    var downloadItemType = contentTypeService.Get("downloadItem");
    var featureChecklistBlockType = contentTypeService.Get("featureChecklistBlock");
    var promoSplitBlockType = contentTypeService.Get("promoSplitBlock");
    var techCategoryItemType = contentTypeService.Get("techCategoryItem");
    var techHeroBlockType = contentTypeService.Get("techHeroBlock");
    var plugAndGoBlockType = contentTypeService.Get("plugAndGoBlock");
    var requirementItemType = contentTypeService.Get("requirementItem");
    var benefitCardType = contentTypeService.Get("benefitCard");
    var techRequirementsBlockType = contentTypeService.Get("techRequirementsBlock");
    var techCallToActionBlockType = contentTypeService.Get("techCallToActionBlock");
    var contactCardItemType = contentTypeService.Get("contactCardItem");
    var contactInfoBlockType = contentTypeService.Get("contactInfoBlock");
    var featureSplitBlockType = contentTypeService.Get("featureSplitBlock");
    var iconCardGridBlockType = contentTypeService.Get("iconCardGridBlock");
    var iconCardItemType = contentTypeService.Get("iconCardItem");
    var ratesMatrixBlockType = contentTypeService.Get("ratesMatrixBlock");
    var ratesMatrixRowType = contentTypeService.Get("ratesMatrixRow");
    var investmentCalculatorBlockType = contentTypeService.Get("investmentCalculatorBlock");
    var claimFormBlockType = contentTypeService.Get("claimFormBlock");
    var funeralCalculatorBlockType = contentTypeService.Get("funeralCalculatorBlock");
    var stepCardsBlockType = contentTypeService.Get("stepCardsBlock");
    var stepCardType = contentTypeService.Get("stepCard");
    var partnerTabsBlockType = contentTypeService.Get("partnerTabsBlock");
    var partnerTabType = contentTypeService.Get("partnerTab");
    var imageBannerBlockType = contentTypeService.Get("imageBannerBlock");
    var spendCarouselBlockType = contentTypeService.Get("spendCarouselBlock");
    var spendSlideType = contentTypeService.Get("spendSlide");
    var rewardsFooterBlockType = contentTypeService.Get("rewardsFooterBlock");

    if (productLoanPageType == null || pageLoansType == null ||
        heroImageBannerBlockType == null || loanCalculatorBlockType == null ||
        creditLifeInsuranceBlockType == null || featureItemType == null ||
        crossSellBlockType == null || contentCardType == null ||
        heroBannerBlockType == null || appDownloadBlockType == null ||
        faqSectionBlockType == null || faqItemType == null ||
        downloadsSectionBlockType == null || downloadItemType == null ||
        featureChecklistBlockType == null || promoSplitBlockType == null ||
        techCategoryItemType == null || techHeroBlockType == null ||
        plugAndGoBlockType == null || requirementItemType == null ||
        benefitCardType == null || techRequirementsBlockType == null ||
        techCallToActionBlockType == null || contactCardItemType == null ||
        contactInfoBlockType == null || featureSplitBlockType == null ||
        iconCardGridBlockType == null || iconCardItemType == null ||
        ratesMatrixBlockType == null || ratesMatrixRowType == null ||
        investmentCalculatorBlockType == null || claimFormBlockType == null ||
        funeralCalculatorBlockType == null || stepCardsBlockType == null ||
        stepCardType == null || partnerTabsBlockType == null || partnerTabType == null ||
        imageBannerBlockType == null || spendCarouselBlockType == null || spendSlideType == null ||
        rewardsFooterBlockType == null)
    {
        Console.WriteLine(
            "ERROR: one or more required content types are missing - run " +
            "'create-product-loan-schema' (and 'create-home-schema', for " +
            "shared types) first.");

        return;
    }

    // productLoanPage turns out to vary by culture on this install (not
    // something create-product-loan-schema's GetOrCreateType call ever set
    // explicitly - set by hand in the backoffice at some point) - plain
    // `node.Name = "..."` is a silent no-op for variant content (Save()
    // reports success, but the name never actually changes - confirmed by
    // reloading from the database after a rename attempt below), so every
    // rename in this command needs SetCultureName(name, defaultCulture)
    // instead. Resolved once here rather than per-call.
    var defaultCulture =
        productLoanPageType.VariesByCulture()
            ? await languageService.GetDefaultIsoCodeAsync()
            : null;

    // Renames `node` to `name`, culture-aware per the comment above, and
    // returns the name actually persisted (re-read from the database) so
    // callers can verify the rename really stuck instead of trusting
    // Save()'s success flag alone.
    string? RenameProductLoanPageNode(IContent node, string name)
    {
        if (defaultCulture != null)
        {
            node.SetCultureName(name, defaultCulture);
        }
        else
        {
            node.Name = name;
        }

        contentService.Save(node);

        var reloaded = contentService.GetById(node.Id);

        return defaultCulture != null ? reloaded?.GetCultureName(defaultCulture) : reloaded?.Name;
    }

    // Optional second arg scopes this run to just one product's section
    // below instead of all three - e.g. `migrate-product-loan-pages
    // 12-loan` touches only the 12% Loan node, leaving Personal Loan's and
    // Consolidation Loan's nodes completely unexecuted (not just
    // unchanged-by-idempotency - their blocks never run at all). Omit the
    // arg to run all three, same as before this was added.
    var sectionFilter = args.Length > 1 ? args[1] : null;

    bool ShouldRunSection(string name)
    {
        var run = sectionFilter == null || sectionFilter.Equals(name, StringComparison.OrdinalIgnoreCase);

        if (!run)
        {
            Console.WriteLine();
            Console.WriteLine($"--- {name.Replace('-', ' ')} --- SKIPPED (filtered by '{sectionFilter}')");
        }

        return run;
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

    // Umbraco.RichText (Tiptap)'s own stored value shape - a plain-
    // paragraph markup string plus an empty Block-in-Rich-Text envelope
    // (no blocks used here, just text), matching RichTextEditorValue's own
    // {markup, blocks:{layout,contentData,settingsData}} serialization.
    // Nested one level inside a Block List item's own contentData (same as
    // every other nested property above), so it's stringified the same way
    // cta/checklistOne/etc already are.
    JsonObject BuildRichText(string html) =>
        new JsonObject
        {
            ["markup"] = html,
            ["blocks"] =
                new JsonObject
                {
                    ["layout"] = new JsonObject(),
                    ["contentData"] = new JsonArray(),
                    ["settingsData"] = new JsonArray()
                }
        };

    // Media Picker values by FILE NAME rather than by key - the same image
    // has a different key/folder id on every environment (local vs AWS),
    // so the key is looked up from the media library at run time. Built
    // lazily, once per run, by walking every media item's umbracoFile
    // value. Where several items share a file name, one whose file
    // actually exists under wwwroot wins (the AWS media folder is missing
    // some files the database still references).
    var mediaServiceForPickers = app.Services.GetRequiredService<IMediaService>();
    var webRootForPickers = app.Services.GetRequiredService<IWebHostEnvironment>().WebRootPath;
    Dictionary<string, (Guid Key, string Src)>? mediaKeysByFileName = null;

    (Guid Key, string Src)? FindMedia(string fileName)
    {
        if (mediaKeysByFileName == null)
        {
            mediaKeysByFileName = new Dictionary<string, (Guid Key, string Src)>(StringComparer.OrdinalIgnoreCase);
            var fileExists = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var root in mediaServiceForPickers.GetRootMedia())
            {
                foreach (var item in new[] { root }.Concat(
                             mediaServiceForPickers.GetPagedDescendants(root.Id, 0, int.MaxValue, out _)))
                {
                    var src = System.Text.RegularExpressions.Regex.Match(
                        item.GetValue<string>("umbracoFile") ?? "", @"/media/[^""\s]+").Value;

                    if (src.Length == 0) continue;

                    var name = Path.GetFileName(src);
                    var exists = System.IO.File.Exists(Path.Combine(webRootForPickers, src.TrimStart('/')));

                    if (!mediaKeysByFileName.ContainsKey(name) || (exists && !fileExists.Contains(name)))
                    {
                        mediaKeysByFileName[name] = (item.Key, src);
                        if (exists) fileExists.Add(name);
                    }
                }
            }
        }

        if (mediaKeysByFileName.TryGetValue(fileName, out var media)) return media;

        Console.WriteLine($"  MEDIA NOT FOUND: \"{fileName}\" - left unset, attach it in the backoffice.");

        return null;
    }

    Guid? FindMediaKey(string fileName) => FindMedia(fileName)?.Key;

    // A media file's own URL (e.g. "/media/xxchejen/stokvel_faqs.pdf"), for
    // a plain link straight to the file - "#" when it isn't in the library.
    string MediaUrl(string fileName) => FindMedia(fileName)?.Src ?? "#";

    // Umbraco.MediaPicker3's stored value - a one-item array - or null when
    // the file isn't in the media library.
    string? BuildMediaPicker(string fileName) =>
        FindMediaKey(fileName) is Guid mediaKey
            ? new JsonArray(
                    new JsonObject
                    {
                        ["key"] = Guid.NewGuid().ToString(),
                        ["mediaKey"] = mediaKey.ToString(),
                        ["mediaTypeAlias"] = "",
                        ["crops"] = new JsonArray(),
                        ["focalPoint"] = null
                    })
                .ToJsonString()
            : null;

    JsonObject BuildIconCards(IEnumerable<(string IconFile, string Title, string Description)> cards) =>
        BuildBlockList(
            iconCardItemType,
            cards.Select(c =>
                new Dictionary<string, JsonNode?>
                {
                    ["icon"] = BuildMediaPicker(c.IconFile),
                    ["title"] = c.Title,
                    ["description"] = c.Description
                }));

    JsonObject BuildRatesRows(IEnumerable<(string Tier, string Rates)> rows) =>
        BuildBlockList(
            ratesMatrixRowType,
            rows.Select(r =>
                new Dictionary<string, JsonNode?> { ["tierLabel"] = r.Tier, ["rates"] = r.Rates }));

    JsonObject BuildFaqItems(IEnumerable<(string Question, string AnswerHtml)> items) =>
        BuildBlockList(
            faqItemType,
            items.Select(i =>
                new Dictionary<string, JsonNode?>
                {
                    ["question"] = i.Question,
                    ["answer"] = BuildRichText(i.AnswerHtml).ToJsonString()
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

    // Same "free up a URL slug" idea as FreeUpLegacyUrl above, but for a
    // page with no dedicated legacy content type to search (e.g. Talk To
    // Us - the real site already has a page named exactly this, of
    // whatever ad-hoc content type it was built with, sitting as a direct
    // sibling of the productLoanPage nodes under `parentId`). Searches
    // that parent's own children by exact name instead of GetPagedOfType,
    // and explicitly excludes productLoanPage nodes so it can never find
    // (and re-rename) a page this same command already created. Idempotent
    // the same way - an already-"(Legacy)"-suffixed match is returned as
    // -is, not renamed again.
    IContent? FreeUpSiblingUrl(int parentId, string exactName)
    {
        var siblings = contentService.GetPagedChildren(parentId, 0, 500, out _, null!).ToList();

        var alreadyRenamed =
            siblings.FirstOrDefault(n =>
                n.Name != null &&
                n.Name.Contains(exactName, StringComparison.OrdinalIgnoreCase) &&
                n.Name.Contains("(Legacy)", StringComparison.OrdinalIgnoreCase));

        if (alreadyRenamed != null)
        {
            Console.WriteLine($"ALREADY MIGRATED: \"{alreadyRenamed.Name}\" (id={alreadyRenamed.Id})");

            return alreadyRenamed;
        }

        var node =
            siblings.FirstOrDefault(n =>
                n.Name != null &&
                n.ContentTypeId != productLoanPageType.Id &&
                n.Name.Equals(exactName, StringComparison.OrdinalIgnoreCase));

        if (node == null)
        {
            return null;
        }

        var oldName = node.Name;
        node.Name = $"{node.Name} (Legacy)";

        contentService.Save(node);
        contentService.Publish(node, new[] { "*" });

        Console.WriteLine(
            $"RENAMED SIBLING PAGE: \"{oldName}\" -> \"{node.Name}\" (id={node.Id}) - " +
            "its old URL is now free.");

        return node;
    }

    // Same "free up a URL" idea as FreeUpLegacyUrl, for a legacy page that
    // may be a pageLoans node or one built on its own ad-hoc document
    // type(s) (`legacyAliases`) - either way only a node whose name
    // contains `nameContains` is ever matched, so an unrelated page that
    // happens to share one of those types is never renamed. Returns
    // the legacy node (if any) and the name the new productLoanPage node
    // should take - the legacy node's original name, so it inherits the
    // same URL slug - falling back to `defaultName`. Idempotent the same
    // way: an already-"(Legacy)"-suffixed match is returned as-is.
    (IContent? Legacy, string NodeName) FreeUpLegacyUrlOfTypes(
        string[] legacyAliases, string nameContains, string defaultName)
    {
        var candidates =
            legacyAliases
                .Select(alias => contentTypeService.Get(alias))
                .Where(t => t != null)
                .SelectMany(t => contentService.GetPagedOfType(t!.Id, 0, 500, out _, null!))
                .Concat(contentService.GetPagedOfType(pageLoansType.Id, 0, 500, out _, null!))
                .Where(n => n.Name != null && n.Name.Contains(nameContains, StringComparison.OrdinalIgnoreCase))
                .ToList();

        var alreadyRenamed =
            candidates.FirstOrDefault(n =>
                n.Name != null && n.Name.Contains("(Legacy)", StringComparison.OrdinalIgnoreCase));

        if (alreadyRenamed != null)
        {
            Console.WriteLine($"ALREADY MIGRATED: \"{alreadyRenamed.Name}\" (id={alreadyRenamed.Id})");

            return (alreadyRenamed, alreadyRenamed.Name!.Replace(" (Legacy)", "", StringComparison.OrdinalIgnoreCase));
        }

        var node = candidates.FirstOrDefault(n => n.Name != null);

        if (node == null)
        {
            return (null, defaultName);
        }

        var oldName = node.Name!;
        node.Name = $"{oldName} (Legacy)";

        contentService.Save(node);
        contentService.Publish(node, new[] { "*" });

        Console.WriteLine(
            $"RENAMED LEGACY PAGE: \"{oldName}\" -> \"{node.Name}\" (id={node.Id}) - " +
            "its old URL is now free.");

        return (node, oldName);
    }

    IContent CreateOrUpdateProductLoanPage(string nodeName, int parentId, JsonObject sectionsValue)
    {
        // Culture-aware name match - plain `.Name` isn't reliable here (see
        // the "productLoanPage varies by culture" comment above), so the
        // same name a variant node was given via SetCultureName needs to be
        // read back the same way to find it again.
        string? NodeName(IContent n) => defaultCulture != null ? n.GetCultureName(defaultCulture) : n.Name;

        var existing =
            contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
                .FirstOrDefault(n => nodeName.Equals(NodeName(n), StringComparison.OrdinalIgnoreCase));

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

            // The 3-arg Create(...) overload above sets the plain/invariant
            // name, which a variant content type silently ignores (same
            // issue the rename helper above works around) - without this,
            // a brand-new node here would have no name for its only
            // culture and fail on Save with "Cannot save content with an
            // empty name".
            if (defaultCulture != null)
            {
                node.SetCultureName(nodeName, defaultCulture);
            }

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
            var invalidProperties =
                publishResult.InvalidProperties == null || !publishResult.InvalidProperties.Any()
                    ? "(none reported)"
                    : string.Join(", ", publishResult.InvalidProperties.Select(p => $"{p.Alias} (culture={p.Values.FirstOrDefault()?.Culture ?? "invariant"})"));

            Console.WriteLine(
                $"PUBLISH FAILED: \"{nodeName}\" - result={publishResult.Result}, " +
                $"invalid properties: {invalidProperties}");

            foreach (var eventMessage in publishResult.EventMessages?.GetAll() ?? [])
            {
                Console.WriteLine($"  EVENT MESSAGE [{eventMessage.Category}/{eventMessage.MessageType}]: {eventMessage.Message}");
            }

            // InvalidProperties only names the top-level property - re-run
            // its own value editor's validation to print which nested block
            // property actually failed, and why.
            foreach (var invalid in publishResult.InvalidProperties ?? [])
            {
                var dataType = dataTypeServiceForValidation.GetAsync(invalid.PropertyType.DataTypeKey).GetAwaiter().GetResult();
                var valueEditor = dataType?.Editor?.GetValueEditor(dataType.ConfigurationObject);

                // Block List results nest (NestedValidationResults etc.) -
                // walked via reflection rather than by concrete type name,
                // printing each level's JsonPath where one exists.
                void PrintValidation(System.ComponentModel.DataAnnotations.ValidationResult result, string indent)
                {
                    var jsonPath = result.GetType().GetProperty("JsonPath")?.GetValue(result);

                    Console.WriteLine(
                        $"{indent}VALIDATION [{result.GetType().Name}]: {result.ErrorMessage} " +
                        $"(members: {string.Join(", ", result.MemberNames)}; path: {jsonPath})");

                    if (result.GetType().GetProperty("ValidationResults")?.GetValue(result)
                        is IEnumerable<System.ComponentModel.DataAnnotations.ValidationResult> children)
                    {
                        foreach (var child in children)
                        {
                            PrintValidation(child, indent + "  ");
                        }
                    }
                }

                foreach (var result in valueEditor?.Validate(
                             node.GetValue(invalid.Alias), invalid.PropertyType.Mandatory,
                             invalid.PropertyType.ValidationRegExp, Umbraco.Cms.Core.Models.Validation.PropertyValidationContext.Empty()) ?? [])
                {
                    PrintValidation(result, "  ");
                }
            }

            throw new InvalidOperationException($"Could not publish \"{nodeName}\": {publishResult.Result}");
        }

        Console.WriteLine($"PUBLISHED: \"{nodeName}\" (id={node.Id})");

        return node;
    }

    // --------------------------------------------------------
    // PERSONAL LOAN
    // --------------------------------------------------------

    if (ShouldRunSection("personal-loan"))
    {
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
    }

    // --------------------------------------------------------
    // CONSOLIDATION LOAN
    // --------------------------------------------------------
    //
    // Builds the full page explicitly here (hero banner + app download +
    // "how it works" feature checklist + FAQ + cross-sell + credit life
    // insurance + downloads) instead of reusing create-consolidation-loan-
    // content's demo node as-is, so this command alone produces the real,
    // final page content matching the live /en/home/product-consolidation-
    // loan/ layout - heroBannerBlock/appDownloadBlock copy matches what
    // that command seeds, featureChecklistBlock/creditLifeInsuranceBlock/
    // downloadsSectionBlock reuse the same shape as Product Personal
    // Loan's/Product 12% Loan's own sections above. If the demo node (from
    // an earlier create-consolidation-loan-content run) still exists under
    // its old "Dynamic Page Demo - Consolidation Loan" name, it's renamed
    // here first so CreateOrUpdateProductLoanPage (which matches by exact
    // name) updates it in place instead of creating a duplicate node.
    //
    // FAQ answers are plain single-paragraph placeholder copy - African
    // Bank's real consolidation-loan FAQ answers weren't available to port
    // verbatim, so verify/refine the exact wording in the backoffice's Rich
    // Text editor once this has run. Same caveat for the downloads item:
    // no real file attached (downloadButtonRedirectLink2 left null) -
    // attach the actual Loan Terms and Conditions PDF via the backoffice's
    // Media Picker.

    if (ShouldRunSection("consolidation-loan"))
    {
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
        const string demoNodeName = "Dynamic Page Demo - Consolidation Loan";
        const string consolidationApplyUrl =
            "https://www.africanbank.co.za/en/home/get-a-quote?" +
            "utm_source=Website&utm_medium=Productpage&utm_campaign=WebLead";

        var demoNode =
            contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
                .FirstOrDefault(n =>
                    n.Name != null &&
                    n.Name.Equals(demoNodeName, StringComparison.OrdinalIgnoreCase));

        if (demoNode != null)
        {
            demoNode.Name = "Product Consolidation Loan";
            contentService.Save(demoNode);

            Console.WriteLine(
                $"RENAMED: \"{demoNodeName}\" -> \"Product Consolidation Loan\" (id={demoNode.Id})");
        }

        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Combine up to 5 loans in 1",
                ["description"] =
                    "Things work better when we work together. Make the most of " +
                    "your budget when you combine your loans today. Mix 'n match " +
                    "up to 5 loans into 1 easy-to-manage Consolidation Loan to " +
                    "the value of R500 000 and save cash with a lower repayment. " +
                    "Earn 1.3% of your loan instalments back in Audacious " +
                    "Rewards points",
                ["primaryCta"] =
                    BuildExternalLink("APPLY NOW", consolidationApplyUrl).ToJsonString(),
                ["secondaryCta"] = null,
                ["image"] = null,
                ["imageAlt"] = null
            };

        var appDownloadContentData =
            new JsonObject
            {
                ["contentTypeKey"] = appDownloadBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
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

        var howItWorksContentData =
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "How An Online Consolidation Loan Application Works",
                ["subheading"] = "",
                ["features"] =
                    BuildFeatureList(
                        [
                            "Lock interest on your loans with a fixed interest rate and less fees on one loan repayment.",
                            "Improve your cash flow, repayment terms from 18 to 72 months.",
                            "No settlement quotes are required. Proof of payment that your loans have been settled.",
                            "Choose your break on your qualifying consolidation and for one month, take a break on your repayment."
                        ])
                        .ToJsonString(),
                ["cta"] =
                    BuildExternalLink("APPLY NOW", consolidationApplyUrl).ToJsonString(),
                ["image"] = null,
                ["imageAlt"] = null,
                ["imageOnRight"] = true
            };

        var faqContentData =
            new JsonObject
            {
                ["contentTypeKey"] = faqSectionBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Consolidation Loan FAQ",
                ["items"] =
                    BuildFaqItems(
                        [
                            ("How To Apply For A Bank Consolidation loan?",
                                "<p>Apply online, over the phone or at your nearest branch. We'll review the loans you want to combine and, once approved, pay your new Consolidation Loan out directly to settle them.</p>"),
                            ("What is a Consolidation loan?",
                                "<p>A Consolidation Loan combines up to 5 existing loans into a single, easy-to-manage African Bank loan with one fixed interest rate and one monthly repayment.</p>"),
                            ("How And When Do I Make Loan Repayments?",
                                "<p>Your repayment is deducted monthly via debit order on the date you choose when you apply, for the full term of your loan.</p>")
                        ])
                        .ToJsonString()
            };

        var crossSellContentData =
            new JsonObject
            {
                ["contentTypeKey"] = crossSellBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Find your ideal loan solution with African Bank.",
                // Self-excludes Consolidation Loan (the page this cross-sell
                // sits on) in favour of Personal Loan - confirmed live:
                // Product Personal Loan's own cross-sell above self-excludes
                // the same way (Consolidation/12%/Tech, no Personal Loan
                // card), and the 12% Loan page below does too.
                ["cards"] =
                    BuildCards(
                        [
                            ("Personal Loan:",
                                "Offers amounts from R2 000 to R500 000 with flexible repayment terms of 7 to 72 months.",
                                "View Personal Loan", "/en/home/product-personal-loan/"),
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

        var downloadsContentData =
            new JsonObject
            {
                ["contentTypeKey"] = downloadsSectionBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "More to read",
                ["items"] =
                    BuildBlockList(
                        downloadItemType,
                        [
                            new Dictionary<string, JsonNode?>
                            {
                                ["downloadTextDescription"] = "Loan Terms and Conditions",
                                ["downloadButtonRedirectLink2"] = null,
                                ["downloadButtonText"] = "Download"
                            }
                        ])
                        .ToJsonString()
            };

        var consolidationLoanUdis =
            new[]
            {
                heroContentData["udi"]!.GetValue<string>(),
                appDownloadContentData["udi"]!.GetValue<string>(),
                howItWorksContentData["udi"]!.GetValue<string>(),
                faqContentData["udi"]!.GetValue<string>(),
                crossSellContentData["udi"]!.GetValue<string>(),
                creditLifeContentData["udi"]!.GetValue<string>(),
                downloadsContentData["udi"]!.GetValue<string>()
            };

        var consolidationLoanSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(consolidationLoanUdis
                                .Select(udi => (JsonNode)new JsonObject { ["contentUdi"] = udi })
                                .ToArray())
                    },
                ["contentData"] =
                    new JsonArray(
                        heroContentData,
                        appDownloadContentData,
                        howItWorksContentData,
                        faqContentData,
                        crossSellContentData,
                        creditLifeContentData,
                        downloadsContentData)
            };

        CreateOrUpdateProductLoanPage(
            "Product Consolidation Loan",
            legacyConsolidationLoan.ParentId,
            consolidationLoanSections);

        Console.WriteLine(
            "NOTE: FAQ answers above are placeholder copy, not ported from a " +
            "real source - verify/refine the exact wording in the backoffice.");
    }
    }

    // --------------------------------------------------------
    // 12% LOAN
    // --------------------------------------------------------
    //
    // Same shape as Consolidation Loan above: two heroBannerBlock sections
    // (a top banner, then a separate "how it works" explainer further down
    // the page - the real page uses this block twice, each with its own
    // heading/description), an app download, a FAQ, a downloads section and
    // a self-excluding cross-sell. "12% Loan" is assumed as the legacy
    // pageLoans node's exact Name (matching the Personal Loan/Consolidation
    // Loan naming convention and the /en/home/product-12-loan/ route) - if
    // the real node is named differently, FreeUpLegacyUrl below won't find
    // it and this section will just log a SKIP, same as it would for any
    // other missing legacy node.
    //
    // downloadsSectionBlock's one item has no real file attached
    // (downloadButtonRedirectLink2 left null, same "no real media
    // available" treatment as every image field elsewhere in this command)
    // - attach the actual Loan Terms and Conditions PDF via the backoffice's
    // Media Picker. FAQ answer is placeholder copy, same caveat as
    // Consolidation Loan's above - only one question was visible to port
    // from the source page; add any others by hand in the backoffice.

    if (ShouldRunSection("12-loan"))
    {
    Console.WriteLine();
    Console.WriteLine("--- 12% loan ---");

    // A node already exists in the backoffice at this exact key, named
    // "Product  12 Loan" (double space, no "%") - created by hand at some
    // point, not by this command. CreateOrUpdateProductLoanPage below
    // matches by exact name ("Product 12% Loan") AND by content type
    // (GetPagedOfType(productLoanPageType.Id, ...)), so as long as the name
    // mismatch stands, it can never find this node - it would instead try
    // to create a second, competing node. A prior run here renamed it but
    // CreateOrUpdateProductLoanPage still logged "CREATED" (a new node)
    // right after, which then crashed on Save ("Cannot save content with
    // an empty name") - meaning this node almost certainly isn't actually
    // a productLoanPage (GetPagedOfType filters by content type id, so a
    // name match alone wouldn't explain a miss). Diagnosing by content
    // type below before touching anything else, so a second wrong-type
    // node (and a second crash) can't happen again.
    var existingTwelvePercentLoanNode =
        contentService.GetById(Guid.Parse("29da8b90-22e2-4339-97a8-01ec68c0d6b3"));

    if (existingTwelvePercentLoanNode == null)
    {
        Console.WriteLine("DIAGNOSTIC: no node found at key 29da8b90-22e2-4339-97a8-01ec68c0d6b3.");
    }
    else
    {
        var existingNodeTypeAlias =
            contentTypeService.Get(existingTwelvePercentLoanNode.ContentTypeId)?.Alias ?? "(unknown)";

        Console.WriteLine(
            $"DIAGNOSTIC: id={existingTwelvePercentLoanNode.Id}, " +
            $"name=\"{existingTwelvePercentLoanNode.Name}\", " +
            $"contentType=\"{existingNodeTypeAlias}\" (expected \"productLoanPage\"), " +
            $"parentId={existingTwelvePercentLoanNode.ParentId}, " +
            $"trashed={existingTwelvePercentLoanNode.Trashed}");

        if (existingTwelvePercentLoanNode.ContentTypeId != productLoanPageType.Id)
        {
            Console.WriteLine(
                $"STOP: that node's content type is \"{existingNodeTypeAlias}\", not " +
                "\"productLoanPage\" - renaming/publishing sections onto it, or creating a " +
                "new productLoanPage node under its parent, would either corrupt it or create " +
                "a URL-colliding duplicate. Not touching it. Check in the backoffice what this " +
                "node's actual Document Type is and what should happen to it before this " +
                "command tries 12% Loan again.");

            existingTwelvePercentLoanNode = null;
        }
        else
        {
            var currentTwelvePercentLoanName =
                defaultCulture != null
                    ? existingTwelvePercentLoanNode.GetCultureName(defaultCulture)
                    : existingTwelvePercentLoanNode.Name;

            if (!"Product 12% Loan".Equals(currentTwelvePercentLoanName, StringComparison.Ordinal))
            {
                var persistedName = RenameProductLoanPageNode(existingTwelvePercentLoanNode, "Product 12% Loan");

                Console.WriteLine(
                    $"RENAME (culture={defaultCulture ?? "(invariant)"}): " +
                    $"\"{currentTwelvePercentLoanName}\" -> requested \"Product 12% Loan\", " +
                    $"persisted \"{persistedName}\"");

                if ("Product 12% Loan".Equals(persistedName, StringComparison.Ordinal))
                {
                    Console.WriteLine($"RENAMED: id={existingTwelvePercentLoanNode.Id}");
                }
                else
                {
                    Console.WriteLine(
                        "STOP: the rename didn't stick after reloading from the database - not " +
                        "proceeding to create/publish anything for 12% Loan until this is understood.");

                    existingTwelvePercentLoanNode = null;
                }
            }
        }
    }

    var legacy12PercentLoan = FreeUpLegacyUrl("12% Loan");

    // legacy12PercentLoan is only needed for its ParentId (and to free up
    // its URL, best-effort, when it exists) - the renamed node above
    // already sits in the right place in the tree, so its own ParentId
    // works just as well when no "12% Loan" pageLoans node is found (e.g.
    // because the legacy node itself has the same "no %" naming mismatch -
    // see the rename comment above). Only truly nothing to do when neither
    // source gives a parent to create/update under.
    var twelvePercentLoanParentId = legacy12PercentLoan?.ParentId ?? existingTwelvePercentLoanNode?.ParentId;

    if (twelvePercentLoanParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy '12% Loan' pageLoans node or existing Product 12% " +
            "Loan node found - nothing to migrate.");
    }
    else
    {
        const string twelvePercentApplyUrl =
            "https://www.africanbank.co.za/en/home/get-a-quote?" +
            "utm_source=Website&utm_medium=Productpage&utm_campaign=WebLead";

        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "The 12% Loan",
                ["description"] =
                    "With a low interest rate fixed at 12% you will always have the " +
                    "peace of mind of knowing that your repayments will stay the " +
                    "same, with a fixed interest rate and fixed monthly repayments. " +
                    "Start your application journey by finding out how much you can " +
                    "possibly qualify for",
                ["primaryCta"] =
                    BuildExternalLink("APPLY NOW", twelvePercentApplyUrl).ToJsonString(),
                ["secondaryCta"] = null,
                ["image"] = null,
                ["imageAlt"] = null
            };

        var appDownloadContentData =
            new JsonObject
            {
                ["contentTypeKey"] = appDownloadBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
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

        var howItWorksContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "How The 12% Loan Application Works.",
                ["description"] =
                    "Sometimes you want the loan without the endless phone calls and " +
                    "interviews. We can help. You can apply now for an online loan " +
                    "of up to R50,000 in just 3 minutes! Simply fill in your contact " +
                    "details and financial information. For security reasons, you " +
                    "will need to enter an OTP (called a One Time PIN), and we will " +
                    "display an indicative quote to you in seconds if you qualify. " +
                    "Thereafter follow the easy steps to complete your online " +
                    "application.",
                ["primaryCta"] =
                    BuildExternalLink("APPLY NOW", twelvePercentApplyUrl).ToJsonString(),
                ["secondaryCta"] = null,
                ["image"] = null,
                ["imageAlt"] = null
            };

        var faqContentData =
            new JsonObject
            {
                ["contentTypeKey"] = faqSectionBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "12% Loan FAQ",
                ["items"] =
                    BuildFaqItems(
                        [
                            ("Reach your goals with a Personal Loan from African Bank?",
                                "<p>Our 12% Loan gives you a fixed, low interest rate and a fixed monthly repayment, so you always know exactly what you owe - apply online in minutes to see what you qualify for.</p>")
                        ])
                        .ToJsonString()
            };

        var downloadsContentData =
            new JsonObject
            {
                ["contentTypeKey"] = downloadsSectionBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "More to read",
                ["items"] =
                    BuildBlockList(
                        downloadItemType,
                        [
                            new Dictionary<string, JsonNode?>
                            {
                                ["downloadTextDescription"] = "Loan Terms and Conditions",
                                ["downloadButtonRedirectLink2"] = null,
                                ["downloadButtonText"] = "Download"
                            }
                        ])
                        .ToJsonString()
            };

        var crossSellContentData =
            new JsonObject
            {
                ["contentTypeKey"] = crossSellBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Find your ideal loan solution with African Bank.",
                // Self-excludes the 12% Loan (this page) - confirmed live,
                // same as Personal Loan's and Consolidation Loan's own
                // cross-sell sections above.
                ["cards"] =
                    BuildCards(
                        [
                            ("Personal Loan:",
                                "Offers amounts from R2 000 to R500 000 with flexible repayment terms of 7 to 72 months.",
                                "View Personal Loan", "/en/home/product-personal-loan/"),
                            ("Consolidation Loan:",
                                "For those seeking to streamline their finances into one manageable instalment.",
                                "View Consolidation Loan", "/en/home/product-consolidation-loan/"),
                            ("Tech Deals:",
                                "Explore our deals and add a cellphone, tablet or laptop to any loan.",
                                "View Tech Deals", "/en/home/tech-deals/")
                        ])
                        .ToJsonString(),
                ["image"] = null
            };

        var twelvePercentLoanUdis =
            new[]
            {
                heroContentData["udi"]!.GetValue<string>(),
                appDownloadContentData["udi"]!.GetValue<string>(),
                howItWorksContentData["udi"]!.GetValue<string>(),
                faqContentData["udi"]!.GetValue<string>(),
                downloadsContentData["udi"]!.GetValue<string>(),
                crossSellContentData["udi"]!.GetValue<string>()
            };

        var twelvePercentLoanSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(twelvePercentLoanUdis
                                .Select(udi => (JsonNode)new JsonObject { ["contentUdi"] = udi })
                                .ToArray())
                    },
                ["contentData"] =
                    new JsonArray(
                        heroContentData,
                        appDownloadContentData,
                        howItWorksContentData,
                        faqContentData,
                        downloadsContentData,
                        crossSellContentData)
            };

        CreateOrUpdateProductLoanPage(
            "Product 12% Loan",
            twelvePercentLoanParentId.Value,
            twelvePercentLoanSections);

        Console.WriteLine(
            "NOTE: FAQ answer is placeholder copy and the downloads item has " +
            "no file attached - verify the FAQ wording and attach the real " +
            "Loan Terms and Conditions PDF in the backoffice.");
    }
    }

    // --------------------------------------------------------
    // TECH DEALS
    // --------------------------------------------------------
    //
    // Unlike Personal/Consolidation/12% Loan above, this page is built
    // almost entirely from block types that exist only for it (see the
    // "TECH DEALS PAGE BLOCKS" comment in create-product-loan-schema) -
    // promoSplitBlock is the one block here reused as-is from elsewhere.
    // "Learn More"/"View Catalogue" below link to the site root as a
    // placeholder (no real destination URL was available to port) -
    // update both in the backoffice once the real C-Connect/catalogue
    // pages are known. Icon keys (e.g. "handset", "income") are resolved
    // to a Lucide icon client-side - see TechHero.tsx/TechRequirements.tsx
    // for the lookup; an unrecognised key just renders no icon rather than
    // failing, so a typo here is a cosmetic, not a breaking, mistake.

    if (ShouldRunSection("tech-deals"))
    {
    Console.WriteLine();
    Console.WriteLine("--- tech deals ---");

    var legacyTechDeals = FreeUpLegacyUrl("Tech Deals");

    if (legacyTechDeals == null)
    {
        Console.WriteLine(
            "SKIP: no legacy 'Tech Deals' pageLoans node found - nothing to migrate.");
    }
    else
    {
        const string techDealsApplyUrl =
            "https://www.africanbank.co.za/en/home/get-a-quote?" +
            "utm_source=Website&utm_medium=Productpage&utm_campaign=WebLead";
        const string techDealsPlaceholderUrl = "https://www.africanbank.co.za/";

        var techHeroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = techHeroBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Welcome to",
                ["highlightHeading"] = "Tech Deals",
                ["subheading"] = "Add a tech device to your Personal Loan",
                ["categories"] =
                    BuildBlockList(
                        techCategoryItemType,
                        [
                            new Dictionary<string, JsonNode?> { ["iconImage"] = null, ["label"] = "Handset" },
                            new Dictionary<string, JsonNode?> { ["iconImage"] = null, ["label"] = "Tablets" },
                            new Dictionary<string, JsonNode?> { ["iconImage"] = null, ["label"] = "Laptops" },
                            new Dictionary<string, JsonNode?> { ["iconImage"] = null, ["label"] = "Connectivity" },
                            new Dictionary<string, JsonNode?> { ["iconImage"] = null, ["label"] = "Power Solutions" }
                        ])
                        .ToJsonString()
            };

        var plugAndGoContentData =
            new JsonObject
            {
                ["contentTypeKey"] = plugAndGoBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Plug & Go",
                ["productName"] = "Samsung S24",
                ["description"] = "3GB Anytime Data + 200 Anytime Any-Network Minutes per month",
                ["bundleLabel"] = "C-ULTRA BUNDLE",
                ["priceAmount"] = "From R945*",
                ["priceSuffix"] = "P/M",
                ["cta"] = BuildExternalLink("Apply Now", techDealsApplyUrl).ToJsonString(),
                ["image"] = null,
                ["imageAlt"] = "Samsung S24"
            };

        var simPromoContentData =
            new JsonObject
            {
                ["contentTypeKey"] = promoSplitBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Get the only SIM with a pocket and C the rewards",
                ["description"] =
                    "C-CONNECT, the mobile network SIM that keeps on providing you more " +
                    "lifestyle benefits and rewards.",
                ["primaryCta"] = BuildExternalLink("Learn More", techDealsPlaceholderUrl).ToJsonString(),
                ["secondaryCta"] = null,
                ["image"] = null,
                ["imageAlt"] = null,
                ["imageOnRight"] = false,
                ["backgroundColor"] = "bg-white",
                ["imagePlain"] = true
            };

        var cataloguePromoContentData =
            new JsonObject
            {
                ["contentTypeKey"] = promoSplitBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "",
                ["description"] =
                    "Browse our catalogue for latest deals and value bundles on " +
                    "smartphones, tablets and laptops.",
                ["primaryCta"] = BuildExternalLink("View Catalogue", techDealsPlaceholderUrl).ToJsonString(),
                ["secondaryCta"] = null,
                ["image"] = null,
                ["imageAlt"] = null,
                ["imageOnRight"] = true,
                ["backgroundColor"] = "bg-brand-mist",
                ["imagePlain"] = true
            };

        var techRequirementsContentData =
            new JsonObject
            {
                ["contentTypeKey"] = techRequirementsBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "At African Bank, we believe in giving our customers the best value",
                ["bodyHtml"] =
                    BuildRichText(
                            "<h3>Why apply for a Tech Deal from African Bank?</h3>" +
                            "<ul>" +
                            "<li>We offer our customers a range of devices with the best value</li>" +
                            "<li>A simple, secure online application process, via our banking App or Online Banking</li>" +
                            "<li>You get a fixed interest rate of only 12%, payable over 24 months</li>" +
                            "</ul>" +
                            "<h3>How to apply for a Tech Deal?</h3>" +
                            "<ul>" +
                            "<li>Simply add a deal of your choice to your loan at any time during application.</li>" +
                            "<li>To apply for a loan, download our banking App or register for our Online Banking</li>" +
                            "</ul>")
                        .ToJsonString(),
                ["itemsHeading"] = "What will you need to apply for a Tech Deal?",
                ["itemsIntro"] =
                    "To get a Tech Deal suited to your lifestyle, you will need to have the " +
                    "following documents on hand:",
                ["items"] =
                    BuildBlockList(
                        requirementItemType,
                        [
                            new Dictionary<string, JsonNode?>
                            {
                                ["iconImage"] = null,
                                ["label"] = "Most recent proof of income, reflecting three salary deposits"
                            },
                            new Dictionary<string, JsonNode?>
                            {
                                ["iconImage"] = null,
                                ["label"] = "You must be over 18 to apply for a Loan"
                            },
                            new Dictionary<string, JsonNode?>
                            {
                                ["iconImage"] = null,
                                ["label"] = "Latest 3 months bank statements"
                            },
                            new Dictionary<string, JsonNode?>
                            {
                                ["iconImage"] = null,
                                ["label"] = "Original ID, Passport or Valid Driver's License (if you don't have an account)"
                            }
                        ])
                        .ToJsonString(),
                ["perksHeading"] = "Choose our tech credit for your device and enjoy the following",
                ["perks"] =
                    BuildBlockList(
                        benefitCardType,
                        [
                            new Dictionary<string, JsonNode?>
                            {
                                ["iconImage"] = null,
                                ["heading"] = "INTEREST RATE FROM 12%",
                                ["description"] = "Including low repayments over 24 months"
                            },
                            new Dictionary<string, JsonNode?>
                            {
                                ["iconImage"] = null,
                                ["heading"] = "FREE NATIONAL DELIVERY",
                                ["description"] = "You click, we bring"
                            },
                            new Dictionary<string, JsonNode?>
                            {
                                ["iconImage"] = null,
                                ["heading"] = "GET CONNECTED",
                                ["description"] = "Network packages supplied through C-Connect"
                            }
                        ])
                        .ToJsonString()
            };

        var techCallToActionContentData =
            new JsonObject
            {
                ["contentTypeKey"] = techCallToActionBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "1 Number to call",
                ["phoneNumber"] = "0861 123 456",
                ["phoneUrl"] = "tel:0861123456",
                ["termsLabel"] = "Website Terms and Conditions",
                ["termsUrl"] = techDealsPlaceholderUrl,
                ["disclaimerHtml"] =
                    BuildRichText(
                            "<p>Devices are subject to stock availability*. The indicated " +
                            "instalments have been calculated over 72 months at the maximum " +
                            "NCA rate. Terms, conditions &amp; affordability rates apply. All " +
                            "minutes &amp; data packages are only available for 24 months.</p>")
                        .ToJsonString()
            };

        var techDealsUdis =
            new[]
            {
                techHeroContentData["udi"]!.GetValue<string>(),
                plugAndGoContentData["udi"]!.GetValue<string>(),
                simPromoContentData["udi"]!.GetValue<string>(),
                cataloguePromoContentData["udi"]!.GetValue<string>(),
                techRequirementsContentData["udi"]!.GetValue<string>(),
                techCallToActionContentData["udi"]!.GetValue<string>()
            };

        var techDealsSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(techDealsUdis
                                .Select(udi => (JsonNode)new JsonObject { ["contentUdi"] = udi })
                                .ToArray())
                    },
                ["contentData"] =
                    new JsonArray(
                        techHeroContentData,
                        plugAndGoContentData,
                        simPromoContentData,
                        cataloguePromoContentData,
                        techRequirementsContentData,
                        techCallToActionContentData)
            };

        CreateOrUpdateProductLoanPage("Tech Deals", legacyTechDeals.ParentId, techDealsSections);

        Console.WriteLine(
            "NOTE: \"Learn More\"/\"View Catalogue\" link to the site root as a " +
            "placeholder, and the Plug & Go/catalogue images have no real file " +
            "attached - update all three in the backoffice once the real " +
            "destinations/photos are available. None of the category/" +
            "requirement/perk icons have an image attached either (iconImage " +
            "left unset on all 12 items) - upload the real icon artwork for " +
            "each via the backoffice's Media Picker.");
    }
    }

    // --------------------------------------------------------
    // CREDIT REPORT
    // --------------------------------------------------------
    //
    // Unlike every product-loan page above, no legacy pageLoans node exists
    // for this one (it's brand-new content, not a migration of an existing
    // site page) - FreeUpLegacyUrl is tried first in case a node does turn
    // up under an unexpected name, but the real parent source is normally
    // the fallback below: any already-migrated productLoanPage's own
    // ParentId, since every product-loan-family page lives as a sibling
    // under the same "/en/home/" node. Naming the node "Credit Report"
    // (no "Product " prefix, same as "Tech Deals") so Umbraco's generated
    // URL slug is "/en/home/credit-report/" rather than
    // "/en/home/product-credit-report/".
    //
    // All four blocks are existing, reused types (heroBannerBlock /
    // featureChecklistBlock / appDownloadBlock) - no new Umbraco content
    // types needed. featureChecklistBlock has no field for a closing
    // paragraph below its checklist, so the source page's trailing
    // "When you apply for credit..." paragraph isn't captured here - add
    // it by hand in the backoffice if it's wanted (see the NOTE below).

    if (ShouldRunSection("credit-report"))
    {
    Console.WriteLine();
    Console.WriteLine("--- credit report ---");

    var legacyCreditReport = FreeUpLegacyUrl("Credit Report") ?? FreeUpLegacyUrl("Credit Score");

    var creditReportParentId =
        legacyCreditReport?.ParentId ??
        contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault()?.ParentId;

    if (creditReportParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy 'Credit Report' pageLoans node and no existing " +
            "productLoanPage sibling found to infer a parent from - nothing to migrate.");
    }
    else
    {
        const string creditReportPlaceholderUrl = "https://www.africanbank.co.za/";

        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "What is my credit score?",
                ["description"] =
                    "Your credit score is a personal asset and an investment in your " +
                    "future. It is your key to financial security and greater " +
                    "financial freedom. To get your free credit report, simply click " +
                    "on the register button or download the African Bank App now " +
                    "from your App store.",
                ["primaryCta"] =
                    BuildExternalLink("REGISTER/LOGIN", creditReportPlaceholderUrl).ToJsonString(),
                ["secondaryCta"] = null,
                ["image"] = null,
                ["imageAlt"] = null
            };

        var goodCreditContentData =
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "How will a GOOD credit score benefit you?",
                ["subheading"] =
                    "Your credit score and your ability to afford credit will help you " +
                    "to achieve your financial goals, which will mean a brighter " +
                    "future for you and your loves ones:",
                ["features"] =
                    BuildFeatureList(
                        [
                            "Landing that dream job",
                            "Getting a cell phone contract",
                            "Renting a place of your own",
                            "Buying your own car",
                            "Buying your own home",
                            "Building or extending your home",
                            "Buying household items",
                            "Educating your children"
                        ])
                        .ToJsonString(),
                ["cta"] =
                    BuildExternalLink("REGISTER/LOGIN", creditReportPlaceholderUrl).ToJsonString(),
                ["image"] = null,
                ["imageAlt"] = null,
                ["imageOnRight"] = false
            };

        var badCreditContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "How will a BAD credit score affect you?",
                ["description"] =
                    "A bad credit score will limit your access to credit and keep you " +
                    "from reaching your financial goals. At African Bank, it is our " +
                    "purpose to advance lives. We care about your financial well " +
                    "being. As a valued customer, we offer you unlimited access to " +
                    "your FREE credit report. You will now be able to check your " +
                    "credit score every time you log on to your African Bank App or " +
                    "internet banking. African Bank respects your privacy and " +
                    "confidentiality. We will only make this information available " +
                    "to you, based on your stated consent",
                ["primaryCta"] =
                    BuildExternalLink("REGISTER/LOGIN", creditReportPlaceholderUrl).ToJsonString(),
                ["secondaryCta"] = null,
                ["image"] = null,
                ["imageAlt"] = null
            };

        var creditReportAppDownloadContentData =
            new JsonObject
            {
                ["contentTypeKey"] = appDownloadBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
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

        var creditReportUdis =
            new[]
            {
                heroContentData["udi"]!.GetValue<string>(),
                goodCreditContentData["udi"]!.GetValue<string>(),
                badCreditContentData["udi"]!.GetValue<string>(),
                creditReportAppDownloadContentData["udi"]!.GetValue<string>()
            };

        var creditReportSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(creditReportUdis
                                .Select(udi => (JsonNode)new JsonObject { ["contentUdi"] = udi })
                                .ToArray())
                    },
                ["contentData"] =
                    new JsonArray(
                        heroContentData,
                        goodCreditContentData,
                        badCreditContentData,
                        creditReportAppDownloadContentData)
            };

        CreateOrUpdateProductLoanPage("Credit Report", creditReportParentId.Value, creditReportSections);

        Console.WriteLine(
            "NOTE: \"Register/Login\" links to the site root as a placeholder - " +
            "no real registration/login destination was available to port - update " +
            "it in the backoffice once known. All three photos (both hero images " +
            "and the credit-bureau phone mockup) have no real file attached - " +
            "upload them via the Media Picker. The GOOD-credit-score checklist's " +
            "closing paragraph (\"When you apply for credit, credit providers will " +
            "do a credit check on you...\") has no field to hold it on " +
            "featureChecklistBlock - add it by hand in the backoffice if it's " +
            "wanted.");
    }
    }

    // --------------------------------------------------------
    // TALK TO US
    // --------------------------------------------------------
    //
    // Like Credit Report above, no legacy pageLoans node exists for this
    // one - FreeUpLegacyUrl is tried first in case one turns up under an
    // unexpected name, falling back to any already-migrated
    // productLoanPage's own ParentId. Named "Talk To Us" (no "Product "
    // prefix) so the generated URL slug is "/en/home/talk-to-us/".
    //
    // Every phone/fax number below links as a plain `tel:` URI (digits
    // only, "+" kept where the source itself used international format);
    // every email as `mailto:`. The source page's "Apply now"/"Upload
    // documents" links (under Direct Sales) have no real destination
    // available - they point at the site root as a placeholder, same
    // "no real link available" treatment as every other placeholder URL
    // in this command - update them in the backoffice once known.

    if (ShouldRunSection("talk-to-us"))
    {
    Console.WriteLine();
    Console.WriteLine("--- talk to us ---");

    var legacyTalkToUs =
        FreeUpLegacyUrl("Talk To Us") ?? FreeUpLegacyUrl("Contact Us") ?? FreeUpLegacyUrl("Contact Information");

    var talkToUsParentId =
        legacyTalkToUs?.ParentId ??
        contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault()?.ParentId;

    if (talkToUsParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy 'Talk To Us' pageLoans node and no existing " +
            "productLoanPage sibling found to infer a parent from - nothing to migrate.");
    }
    else
    {
        // The real site already has a page named exactly "Talk to us"
        // under this same parent (a pageTalkAndFindUs node, not a
        // pageLoans one, so FreeUpLegacyUrl above never finds it) -
        // without freeing its name first, Umbraco's own sibling-name
        // uniqueness silently renamed the new productLoanPage node to
        // "Talk To Us (1)" on an earlier run of this command, giving it
        // the URL slug "/en/home/talk-to-us-1/" instead of the intended
        // "/en/home/talk-to-us/". FreeUpSiblingUrl frees the name; the
        // orphaned "(1)" node (if an earlier run already created one) is
        // then renamed back to "Talk To Us" so CreateOrUpdateProductLoanPage
        // below finds and updates it by name instead of creating a third,
        // still-misnamed duplicate.
        FreeUpSiblingUrl(talkToUsParentId.Value, "Talk to us");

        var orphanedTalkToUsNode =
            contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
                .FirstOrDefault(n =>
                    n.Name != null &&
                    n.Name.StartsWith("Talk To Us (", StringComparison.OrdinalIgnoreCase));

        if (orphanedTalkToUsNode != null)
        {
            var oldOrphanName = orphanedTalkToUsNode.Name;
            var persistedOrphanName = RenameProductLoanPageNode(orphanedTalkToUsNode, "Talk To Us");

            Console.WriteLine(
                $"RENAMED: \"{oldOrphanName}\" -> \"Talk To Us\" (persisted " +
                $"\"{persistedOrphanName}\", id={orphanedTalkToUsNode.Id})");
        }

        const string talkToUsPlaceholderUrl = "https://www.africanbank.co.za/";

        var contactCards =
            BuildBlockList(
                contactCardItemType,
                [
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Customer service centre",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Tel: <a href=\"tel:0861111011\">0861 111 011</a><br/>" +
                                    "Tel: <a href=\"tel:0112074500\">011 207 4500</a><br/>" +
                                    "Email: <a href=\"mailto:CExperience@africanbank.co.za\">CExperience@africanbank.co.za</a></p>" +
                                    "<p>Operating hours:</p>" +
                                    "<p>Monday-Friday: 7:00 to 19:00<br/>Saturday: 8:00 to 16:00<br/>Sunday: 8:00 to 14:00</p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "MyWORLD customers",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Service related queries and Fraud Reporting</p>" +
                                    "<p>Tel: <a href=\"tel:0861123456\">0861 123 456</a><br/>" +
                                    "Email: <a href=\"mailto:CExperience@africanbank.co.za\">CExperience@africanbank.co.za</a></p>" +
                                    "<p>Operating hours:</p>" +
                                    "<p>Monday – Friday: 7:00 to 19:00<br/>Saturday: 08:00 to 16:00<br/>Sunday: 08:00 to 14:00</p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Direct sales (new loan applications)",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Tel: <a href=\"tel:0860333004\">0860 333 004</a></p>" +
                                    $"<p><a href=\"{talkToUsPlaceholderUrl}\">Apply now</a></p>" +
                                    $"<p><a href=\"{talkToUsPlaceholderUrl}\">Upload documents</a></p>" +
                                    "<p>Where is my loan: <a href=\"tel:0861111011\">0861 111 011</a></p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Savings and Investments",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Tel: <a href=\"tel:0860494940\">0860 494 940</a></p>" +
                                    "<p>Email: <a href=\"mailto:investments@africanbank.co.za\">investments@africanbank.co.za</a></p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Document upload",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>You can upload documents on WhatsApp.</p>" +
                                    "<p>Here's our WhatsApp number: <a href=\"https://wa.me/27600123716\">060 012 3716</a></p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Debt counselling",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Tel: <a href=\"tel:0112569323\">011 256 9323</a></p>" +
                                    "<p>Email: <a href=\"mailto:DebtCounselling@africanbank.co.za\">DebtCounselling@africanbank.co.za</a></p>" +
                                    "<p>Operating Hours:</p>" +
                                    "<p>Monday – Friday 8:00 – 16:00</p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Lost or stolen cards",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Stop card international Tel: <a href=\"tel:+27112569988\">+27 11 256 9988</a></p>" +
                                    "<p>South Africa Tel: <a href=\"tel:0861000555\">0861 000 555</a></p>" +
                                    "<p>Activation line Tel: <a href=\"tel:0861000444\">0861 000 444</a></p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Anonymous complaints or Tip-offs",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Tel: <a href=\"tel:0800633633\">0800 633 633</a><br/>" +
                                    "Fax: 0864 944 107<br/>" +
                                    "Email: <a href=\"mailto:africanbank@tip-offs.com\">africanbank@tip-offs.com</a></p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Collections",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Tel: <a href=\"tel:0112074500\">011 207 4500</a></p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Funeral Cover Service",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Tel: <a href=\"tel:0860000975\">0860 000 975</a></p>" +
                                    "<p>Email: <a href=\"mailto:FuneralPlan@AfricanBank.co.za\">FuneralPlan@AfricanBank.co.za</a></p>" +
                                    "<p>Operating hours</p>" +
                                    "<p>Monday-Friday: 08:00-17:00<br/>Saturday: 09:00-13:00</p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Funeral Claims",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Tel: <a href=\"tel:0860000979\">0860 000 979</a></p>" +
                                    "<p>Email: <a href=\"mailto:FuneralPlanClaims@AfricanBank.co.za\">FuneralPlanClaims@AfricanBank.co.za</a></p>" +
                                    "<p>Operating Hours</p>" +
                                    "<p>Monday-Friday: 08:00-16:30<br/>Weekend closed</p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Sponsorships",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Contact us to discuss sponsorship opportunities</p>" +
                                    "<p>Email: <a href=\"mailto:Sponsorship@africanbank.co.za\">Sponsorship@africanbank.co.za</a></p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Credit Life Claims",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p>Email: <a href=\"mailto:InsuranceClaims@AfricanBank.co.za\">InsuranceClaims@AfricanBank.co.za</a></p>" +
                                    "<p>Operating Hours</p>" +
                                    "<p>Monday-Friday: 08:00-16:30<br/>Weekend closed</p>")
                                .ToJsonString()
                    },
                    new Dictionary<string, JsonNode?>
                    {
                        ["heading"] = "Customer Fraud Reporting and Hotline",
                        ["bodyHtml"] =
                            BuildRichText(
                                    "<p><strong>Personal Banking</strong></p>" +
                                    "<p>Tel: <a href=\"tel:0112569988\">011 256 9988</a><br/>" +
                                    "Tel: <a href=\"tel:0112569227\">011 256 9227</a><br/>" +
                                    "Email: <a href=\"mailto:fdtection@africanbank.co.za\">fdtection@africanbank.co.za</a></p>" +
                                    "<p><strong>Business and Commercial Banking</strong></p>" +
                                    "<p>Tel: <a href=\"tel:0861123120\">0861 123 120</a><br/>" +
                                    "Tel: <a href=\"tel:0112569227\">011 256 9227</a><br/>" +
                                    "Email: <a href=\"mailto:bcbfraud@africanbank.co.za\">bcbfraud@africanbank.co.za</a></p>")
                                .ToJsonString()
                    }
                ]);

        var contactInfoContentData =
            new JsonObject
            {
                ["contentTypeKey"] = contactInfoBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Contact information",
                ["cards"] = contactCards.ToJsonString()
            };

        var talkToUsSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(
                                new JsonObject { ["contentUdi"] = contactInfoContentData["udi"]!.GetValue<string>() })
                    },
                ["contentData"] = new JsonArray(contactInfoContentData)
            };

        CreateOrUpdateProductLoanPage("Talk To Us", talkToUsParentId.Value, talkToUsSections);

        Console.WriteLine(
            "NOTE: Direct Sales' \"Apply now\"/\"Upload documents\" links point at " +
            "the site root as a placeholder - no real destinations were available " +
            "to port - update both in the backoffice once known.");
    }
    }

    // --------------------------------------------------------
    // OVERDRAFT
    // --------------------------------------------------------
    //
    // Ported from the live MyWORLD Overdraft page (Views/Overdraft.cshtml /
    // overdraftV2.cshtml): hero, "What is Overdraft?", "How does it work?",
    // costs, requirements (alternating image sides, same as the source's
    // flex-row-reverse sections), FAQ accordion and app download.
    //
    // The legacy page may be a pageLoans node or one built on its own
    // "overdraft"/"overdraftV2" document type - see FreeUpLegacyUrlOfTypes.
    // Falls back to "Overdraft" under any productLoanPage sibling's parent,
    // same as Credit Report/Talk To Us, when no legacy node exists.
    //
    // Every image has no real file attached (the source's /media/... paths
    // aren't Media Picker values) - attach them via the backoffice. FAQ
    // answers are ported verbatim, including the source's own R69/R60+VAT
    // fee inconsistency - verify with the product team.

    if (ShouldRunSection("overdraft"))
    {
    Console.WriteLine();
    Console.WriteLine("--- overdraft ---");

    var (legacyOverdraft, overdraftNodeName) =
        FreeUpLegacyUrlOfTypes(["overdraft", "overdraftV2"], "Overdraft", "Overdraft");

    var overdraftParentId =
        legacyOverdraft?.ParentId ??
        contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault()?.ParentId;

    if (overdraftParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy Overdraft node and no existing productLoanPage " +
            "sibling found to infer a parent from - nothing to migrate.");
    }
    else
    {
        const string overdraftApplyUrl = "https://ib.africanbank.co.za/";

        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "MyWORLD Overdraft",
                ["description"] =
                    BuildRichText(
                            "<p>Giving you access to emergency funds when you need it most. And " +
                            "because it is linked to your MyWORLD account, you still get access " +
                            "to up to 6 linked accounts – with no monthly fees at SA’s best rates.</p>")
                        .ToJsonString(),
                ["primaryCta"] = BuildExternalLink("Open now", overdraftApplyUrl).ToJsonString(),
                ["secondaryCta"] = null,
                ["image"] = null,
                ["imageAlt"] = null
            };

        var whatIsContentData =
            new JsonObject
            {
                ["contentTypeKey"] = promoSplitBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "What is Overdraft?",
                ["description"] =
                    BuildRichText(
                            "<p>An African Bank Overdraft facility is a credit facility, in the form " +
                            "of an agreement made with African Bank that allows a MyWORLD account " +
                            "holder to use or withdraw more money than what they have in their " +
                            "MyWORLD account, up to an approved limit. In other words, the " +
                            "customer’s MyWORLD account can have a debit, or a negative, balance.</p>")
                        .ToJsonString(),
                ["primaryCta"] = BuildExternalLink("Open now", overdraftApplyUrl).ToJsonString(),
                ["secondaryCta"] = null,
                ["image"] = null,
                ["imageAlt"] = null,
                ["imageOnRight"] = false
            };

        var howItWorksContentData =
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "How does African Bank’s Overdraft work?",
                ["subheading"] =
                    "Because the Overdraft is linked to your MyWORLD account, you will need " +
                    "to have a MyWORLD account first to start the Overdraft application " +
                    "process. Once approved for a certain limit, you will have access to " +
                    "funds when you have used up all the money in your MyWORLD bank " +
                    "account. You can use these funds for emergencies. You can also use " +
                    "these funds for making ATM cash withdrawals and for making online " +
                    "purchases using your MyWORLD bank account. You have peace of mind, " +
                    "knowing you have access to funds in an emergency. The Overdraft can " +
                    "help with:",
                ["features"] =
                    BuildFeatureList(
                        [
                            "Mid-month emergency expenses.",
                            "Access to cash before pay day.",
                            "Cover for rainy days when you are running short on cash.",
                            "It helps you to manage your monthly cash flow and provides protection from unpaid debit orders when your salary gets used up."
                        ])
                        .ToJsonString(),
                ["cta"] = BuildExternalLink("Open now", overdraftApplyUrl).ToJsonString(),
                ["image"] = null,
                ["imageAlt"] = null,
                ["imageOnRight"] = true
            };

        var costContentData =
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "How much does it cost to have an Overdraft facility at African Bank?",
                ["subheading"] = "",
                ["features"] =
                    BuildFeatureList(
                        [
                            "The great news is that there are no initiation fees.",
                            "Customers will be charged a monthly fee of R69 which includes VAT.",
                            "The transaction fees are linked to the MyWORLD transaction fees. Please refer to our pricing guide here."
                        ])
                        .ToJsonString(),
                ["cta"] = BuildExternalLink("Open now", overdraftApplyUrl).ToJsonString(),
                ["image"] = null,
                ["imageAlt"] = null,
                ["imageOnRight"] = false
            };

        var requirementsContentData =
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "What is required to apply for the Overdraft?",
                ["subheading"] = "",
                ["features"] =
                    BuildFeatureList(
                        [
                            "Customers must have an active MyWORLD bank account.",
                            "Customers must be between the age of 18 and 60.",
                            "Customers must earn more than R3 500 a month.",
                            "Customers must be a monthly salary or wage earner for a minimum of ONE month with the same employer.",
                            "To activate the Overdraft, customers must switch their monthly salary to African Bank."
                        ])
                        .ToJsonString(),
                ["cta"] = BuildExternalLink("Open now", overdraftApplyUrl).ToJsonString(),
                ["image"] = null,
                ["imageAlt"] = null,
                ["imageOnRight"] = true
            };

        var faqContentData =
            new JsonObject
            {
                ["contentTypeKey"] = faqSectionBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "MyWorld Overdraft FAQ",
                ["items"] =
                    BuildFaqItems(
                        [
                            ("How do I apply for an Overdraft?",
                                "<p>There are several ways to apply for African Bank’s Overdraft facility. You can:</p>" +
                                "<ul>" +
                                "<li>Apply online 24/7 using our African Bank App or by registering for Online Banking on our website. You will not be charged any data when using our digital banking platforms.</li>" +
                                "<li>You are welcome to visit any African Bank branch and apply in our branch. You can contact our Call Centre on 0860 333 004.</li>" +
                                "</ul>"),
                            ("Is the Overdraft facility a Loan?",
                                "<p>No. The Overdraft is a facility offered to the customer, providing access to additional funds up to an approved specified amount. This Overdraft will be available for use on the customer’s MyWORLD account. There is no disbursement of funds into the MyWORLD bank account, instead a facility limit is loaded thereby increasing the customer’s available funds. Customers will be able to see their current and available balances, as well as limits, on their Online Banking or Banking App profile and on their bank statements.</p>"),
                            ("What happens if I exceed my Overdraft facility limit?",
                                "<p>In exceptional cases, a customer may exceed their Overdraft limit due to fees processed to their account. A customer will always remain responsible for the re-payment of the full balance.</p>"),
                            ("What is the maximum and minimum amounts on African Bank’s Overdraft facility?",
                                "<p>Depending on the customer’s affordability, the maximum facility offered is R100 000 and the minimum facility offered is R3 500.</p>"),
                            ("What happens if I successfully apply for an Overdraft but do not use it?",
                                "<p>The Overdraft will remain available to you, our valued customer, and you will be charged the monthly Overdraft fee of R60 plus VAT. However, if it remains un-utilised for a period of time, African Bank may decide to cancel the Overdraft. Affected customers will be notified in advance if this happens.</p>"),
                            ("Which documents are required to apply for an Overdraft facility?",
                                "<p>One bank statement and 3 payslips are required or one bank statement showing 3 salary deposits and one payslip. All latest documents are required as per African Bank’s Credit Policy.</p>"),
                            ("What will happen if the customer does not qualify for the Overdraft facility?",
                                "<p>The customer will unfortunately be presented with a message that the customer did not qualify for the Overdraft facility. Customers are reminded to regularly check the status of their credit report as this affects their ability to apply for credit in the form of a loan or overdraft. African Bank offers all South Africans a free credit report every month. Simply register for Online Banking on our website or download the African Bank App to get your free credit report today. You do not need to be a customer of African Bank to get your free credit report.</p>"),
                            ("What is the interest rate charged on the Overdraft?",
                                "<p>An interest rate of 18% is charged on the Overdraft amount used.</p>"),
                            ("Will a customer be able to add an Overdraft facility on a Pocket account?",
                                "<p>No. The Overdraft facility is only available on the MYWORLD bank account.</p>"),
                            ("Can a customer to reduce their Overdraft facility limit?",
                                "<p>Yes, the facility can be adjusted. You can do this using Online Banking or the African Bank App or speak to one of our helpful agents in Branch or at our Call Centre.</p>"),
                            ("Can a customer close the Overdraft facility/MyWORLD account?",
                                "<p>A customer can close their Overdraft facility if the amount owed to African Bank is zero. You can do this using Online Banking or the African Bank App or speak to one of our helpful agents in Branch or at our Call Centre. You are recommended to first request a Settlement Letter. This will show you how much needs to be paid to close the Overdraft facility. You can request a Settlement Letter for free using Online Banking or the African Bank App.</p>"),
                            ("How does the customer transfer their salary to their MyWORLD account?",
                                "<ul>" +
                                "<li>You can request for a MyWORLD Account Confirmation letter to be emailed to you. This can be done for free using Online Banking or the African Bank App.</li>" +
                                "<li>You can then email the MyWORLD Account Confirmation letter to your employer to switch your salary before your next pay day.</li>" +
                                "</ul>"),
                            ("Are there monthly fees?",
                                "<p>There is a monthly fee of R60 plus VAT which is charged to your account once the Overdraft facility is activated.</p>")
                        ])
                        .ToJsonString()
            };

        var overdraftAppDownloadContentData =
            new JsonObject
            {
                ["contentTypeKey"] = appDownloadBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Get the app",
                ["subheading"] = "",
                ["description"] =
                    BuildRichText("<p>Take your banking experience to the next level with our mobile app.</p>")
                        .ToJsonString(),
                ["downloadLink"] =
                    BuildExternalLink(
                            "DOWNLOAD NOW",
                            "https://play.google.com/store/apps/details?id=za.co.android.africanbank")
                        .ToJsonString(),
                ["image"] = null,
                ["imageAlt"] = null
            };

        var overdraftContentData =
            new[]
            {
                heroContentData,
                whatIsContentData,
                howItWorksContentData,
                costContentData,
                requirementsContentData,
                faqContentData,
                overdraftAppDownloadContentData
            };

        var overdraftSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(overdraftContentData
                                .Select(c => (JsonNode)new JsonObject { ["contentUdi"] = c["udi"]!.GetValue<string>() })
                                .ToArray())
                    },
                ["contentData"] = new JsonArray(overdraftContentData.Select(c => (JsonNode)c).ToArray())
            };

        CreateOrUpdateProductLoanPage(overdraftNodeName, overdraftParentId.Value, overdraftSections);

        Console.WriteLine(
            "NOTE: none of the six Overdraft images have a real file attached - " +
            "upload them via the backoffice's Media Picker. The cost section's " +
            "\"pricing guide here\" has no link (featureItem is plain text) - " +
            "add one by hand if wanted.");
    }
    }

    // --------------------------------------------------------
    // FIXED DEPOSIT
    // --------------------------------------------------------
    //
    // Ported from the live Fixed Deposit page (Views/
    // productFixedDepositInvestment*.cshtml / fixedDepositV2.cshtml): hero,
    // "More about the Fixed Deposit" icon cards, "All Rates" table (tier x
    // 6 terms), Fixed Deposit Calculator and account requirements. Images
    // are matched by file name (BuildMediaPicker). Legacy node lookup works
    // the same as Overdraft's above; defaults to "Product Fixed Deposit
    // Investment" so the slug matches the source page's own
    // /fixed-deposit-investment route check.

    if (ShouldRunSection("fixed-deposit"))
    {
    Console.WriteLine();
    Console.WriteLine("--- fixed deposit ---");

    var (legacyFixedDeposit, fixedDepositNodeName) =
        FreeUpLegacyUrlOfTypes(
            ["productFixedDepositInvestment", "productFixedDepositInvestmentV2", "fixedDepositV2", "fixed"],
            "Fixed Deposit",
            "Product Fixed Deposit Investment");

    var fixedDepositParentId =
        legacyFixedDeposit?.ParentId ??
        contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault()?.ParentId;

    if (fixedDepositParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy Fixed Deposit node and no existing productLoanPage " +
            "sibling found to infer a parent from - nothing to migrate.");
    }
    else
    {
        const string fixedDepositOpenUrl = "https://ib.africanbank.co.za";

        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "A Fixed Deposit that delivers",
                ["description"] =
                    BuildRichText("<p>Secure competitive interest rates with no monthly fees. Open in minutes.</p>")
                        .ToJsonString(),
                ["primaryCta"] = BuildExternalLink("INVEST TODAY", fixedDepositOpenUrl).ToJsonString(),
                ["secondaryCta"] = BuildExternalLink("CALCULATE RETURNS", "#myCalculator").ToJsonString(),
                ["image"] = BuildMediaPicker("inv2509_001_fd_dig.png"),
                ["imageAlt"] = "A Fixed Deposit that delivers"
            };

        var moreAboutContentData =
            new JsonObject
            {
                ["contentTypeKey"] = iconCardGridBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "More about the Fixed Deposit",
                ["cards"] =
                    BuildIconCards(
                        [
                            ("easy-repayments.png", "FIXED RATE",
                                "Guaranteed returns with an interest rate which is fixed for the duration of the investment."),
                            ("bnaking-on-move.png", "PAYOUT OPTIONS",
                                "Receive your interest payouts monthly, every 6 or 12 months, or at maturity."),
                            ("instant-issue.png", "ONCE-OFF DEPOSIT",
                                "To get around transfer limits, you have 7 days to complete your total opening deposit."),
                            ("earn-int-on-pos-bal.png", "TERMS", "Terms range from 3 to 60 months."),
                            ("instant-issue.png", "EASY APPLICATION", "Register and open your account online in minutes.")
                        ])
                        .ToJsonString()
            };

        var ratesContentData =
            new JsonObject
            {
                ["contentTypeKey"] = ratesMatrixBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "All Rates",
                ["columnHeadings"] =
                    "Fixed Deposit 3 Months|Fixed Deposit 6 Months|Fixed Deposit 12 Months|" +
                    "Fixed Deposit 24 Months|Fixed Deposit 36 Months|Fixed Deposit 60 Months",
                ["rows"] =
                    BuildRatesRows(
                        [
                            ("R0 - 49999.99", "6.51%|6.93%|7.26%|6.93%|7.02%|8.05%"),
                            ("R50000.00 - R249999.99", "6.60%|7.02%|7.35%|7.12%|7.26%|8.43%"),
                            ("R250000.00 - R999999.99", "6.70%|7.02%|7.40%|7.26%|7.49%|8.45%"),
                            ("> R1 000 000.00", "6.79%|7.17%|7.49%|7.40%|7.73%|8.47%")
                        ])
                        .ToJsonString(),
                ["disclaimers"] =
                    BuildFeatureList(
                        [
                            "Interest rates are quoted as Nominal Annual Rates Compounded Monthly (NACM) and are valid for today only, as they are subject to change.",
                            "Terms and conditions apply. We cannot advise you on the tax implications of investing. It is recommended that you contact your financial advisor or tax consultant."
                        ])
                        .ToJsonString()
            };

        var calculatorContentData =
            new JsonObject
            {
                ["contentTypeKey"] = investmentCalculatorBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Fixed Deposit Calculator",
                ["investmentType"] = "Fixed",
                ["image"] = BuildMediaPicker("12-loan.png"),
                ["imageAlt"] = "Investment Vehicle",
                ["disclaimer"] =
                    "*Our calculators are only a guide. Actual payout could differ due to the number of days " +
                    "in a month and interest rates at the start date of the investment.",
                ["openAccountLink"] = BuildExternalLink("Open an account", fixedDepositOpenUrl).ToJsonString()
            };

        var requirementsContentData =
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "What you need to open your Fixed Deposit account",
                ["subheading"] = "",
                ["features"] =
                    BuildFeatureList(
                        [
                            "Identity document",
                            "Non SA Citizen require a Passport, Valid working permit and proof of address to open an Investment.",
                            "The minimum opening deposit is R500."
                        ])
                        .ToJsonString(),
                ["cta"] = BuildExternalLink("OPEN ACCOUNT", fixedDepositOpenUrl).ToJsonString(),
                ["image"] = BuildMediaPicker("grow-your-wealth_inv.png"),
                ["imageAlt"] = "What you need to open your Fixed Deposit account",
                ["imageOnRight"] = false
            };

        // No "More to read" downloads section: downloadItem inherits its
        // File field from the legacy structureTextAndButton composition,
        // which marks it mandatory, and the source PDFs aren't in the media
        // library - an item without one fails publish validation. Add the
        // section in the backoffice once the PDFs are uploaded.
        var fixedDepositContentData =
            new[]
            {
                heroContentData,
                moreAboutContentData,
                ratesContentData,
                calculatorContentData,
                requirementsContentData
            };

        var fixedDepositSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(fixedDepositContentData
                                .Select(c => (JsonNode)new JsonObject { ["contentUdi"] = c["udi"]!.GetValue<string>() })
                                .ToArray())
                    },
                ["contentData"] = new JsonArray(fixedDepositContentData.Select(c => (JsonNode)c).ToArray())
            };

        CreateOrUpdateProductLoanPage(fixedDepositNodeName, fixedDepositParentId.Value, fixedDepositSections);

        Console.WriteLine(
            "NOTE: \"More to read\" downloads and the Interest Rate Infographic " +
            "button were not ported - their PDFs aren't in the media library.");
    }
    }

    // --------------------------------------------------------
    // NOTICE DEPOSIT
    // --------------------------------------------------------
    //
    // Ported from the live Notice Deposit page (Views/
    // productNoticeDeposit*.cshtml): hero, "More About The Notice Deposit"
    // icon cards, "All Rates" table, Notice Deposit Calculator and "How To
    // Apply". Images are matched by file name (BuildMediaPicker). Same
    // legacy lookup as Fixed Deposit above, and the same omission: no
    // "More to read" downloads until their PDFs are in the media library.

    if (ShouldRunSection("notice-deposit"))
    {
    Console.WriteLine();
    Console.WriteLine("--- notice deposit ---");

    var (legacyNoticeDeposit, noticeDepositNodeName) =
        FreeUpLegacyUrlOfTypes(
            ["productNoticeDeposit", "productNoticeDepositeV1", "productNoticeDepositev2"],
            "Notice Deposit",
            "Product Notice Deposit");

    var noticeDepositParentId =
        legacyNoticeDeposit?.ParentId ??
        contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault()?.ParentId;

    if (noticeDepositParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy Notice Deposit node and no existing productLoanPage " +
            "sibling found to infer a parent from - nothing to migrate.");
    }
    else
    {
        const string noticeDepositOpenUrl = "https://ib.africanbank.co.za/";

        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Notice Deposits",
                ["description"] =
                    BuildRichText(
                            "<p>Enjoy competitive interest rates for as long as you choose, with the " +
                            "flexibility to access your funds by providing 7, 32, or 90 days' notice.</p>")
                        .ToJsonString(),
                ["primaryCta"] = BuildExternalLink("OPEN ACCOUNT", noticeDepositOpenUrl).ToJsonString(),
                ["secondaryCta"] = BuildExternalLink("CALCULATE RETURNS", "#myCalculator").ToJsonString(),
                ["image"] = BuildMediaPicker("mw-overdraft-_bg.png"),
                ["imageAlt"] = "Notice Deposits"
            };

        var moreAboutContentData =
            new JsonObject
            {
                ["contentTypeKey"] = iconCardGridBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "More About The Notice Deposit",
                ["cards"] =
                    BuildIconCards(
                        [
                            ("bnaking-on-move.png", "NOTICE PERIOD", "Choose your notice period of 7, 32 or 90 days."),
                            ("62-days-intr-free.png", "EXTRA DEPOSITS",
                                "You can set up a debit order or make extra deposits from as little as R100 to grow your money."),
                            ("cc-limit.png", "EASY NOTICE", "Call us on 0860 49 49 40, or place notice on app or online."),
                            ("earn-int-on-pos-bal.png", "EASY APPLICATION", "Register and open your account online in minutes."),
                            ("62-days-intr-free.png", "VARYING INTEREST RATES",
                                "Interest rate changes in line with prevailing marketing conditions."),
                            ("easy-repayments.png", "TERM",
                                "Investment account has an indefinite term as long as the minimum balance of R500 is maintained.")
                        ])
                        .ToJsonString()
            };

        var ratesContentData =
            new JsonObject
            {
                ["contentTypeKey"] = ratesMatrixBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "All Rates",
                ["columnHeadings"] = "7 Days Notice|32 Days Notice|90 Days Notice",
                ["rows"] =
                    BuildRatesRows(
                        [
                            ("R0 - 24999.99", "5.61%|6.32%|5.85%"),
                            ("R25000.00 - R99999.99", "6.79%|7.02%|6.88%"),
                            ("R100000.00 - R249999.99", "6.93%|7.07%|7.07%"),
                            ("R250000.00 - R999999.99", "6.98%|7.12%|7.26%"),
                            ("> R1 000 000.00", "7.02%|7.17%|7.26%")
                        ])
                        .ToJsonString(),
                ["disclaimers"] =
                    BuildFeatureList(
                        [
                            "Interest rates are quoted as Nominal Annual Rates Compounded Monthly (NACM) and are valid for today only, as they are subject to change.",
                            "Terms and conditions apply. We cannot advise you on the tax implications of investing. It is recommended that you contact your financial adviser or tax consultant."
                        ])
                        .ToJsonString()
            };

        var calculatorContentData =
            new JsonObject
            {
                ["contentTypeKey"] = investmentCalculatorBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Notice Deposit Calculator",
                ["investmentType"] = "Notice",
                ["image"] = BuildMediaPicker("12-loan.png"),
                ["imageAlt"] = "Investment Vehicle",
                ["disclaimer"] =
                    "*Our calculators are only a guide. Actual payout could differ due to the number of days " +
                    "in a month and interest rates at the start date of the investment.",
                ["openAccountLink"] = BuildExternalLink("Open an account", noticeDepositOpenUrl).ToJsonString()
            };

        var howToApplyContentData =
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "How To Apply",
                ["subheading"] = "What you need to open your Notice Deposit account.",
                ["features"] =
                    BuildFeatureList(
                        [
                            "Identity document or Passport",
                            "Non SA Citizen require a Passport, Valid working permit and proof of address to open an Investment.",
                            "The minimum opening deposit is R500"
                        ])
                        .ToJsonString(),
                ["cta"] = BuildExternalLink("OPEN ACCOUNT", "https://ib.africanbank.co.za").ToJsonString(),
                ["image"] = BuildMediaPicker("how-an-online.png"),
                ["imageAlt"] = "How To Apply",
                ["imageOnRight"] = false
            };

        var noticeDepositContentData =
            new[]
            {
                heroContentData,
                moreAboutContentData,
                ratesContentData,
                calculatorContentData,
                howToApplyContentData
            };

        var noticeDepositSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(noticeDepositContentData
                                .Select(c => (JsonNode)new JsonObject { ["contentUdi"] = c["udi"]!.GetValue<string>() })
                                .ToArray())
                    },
                ["contentData"] = new JsonArray(noticeDepositContentData.Select(c => (JsonNode)c).ToArray())
            };

        CreateOrUpdateProductLoanPage(noticeDepositNodeName, noticeDepositParentId.Value, noticeDepositSections);

        Console.WriteLine(
            "NOTE: \"More to read\" downloads were not ported - their PDFs aren't " +
            "in the media library. Add a Downloads Section in the backoffice once " +
            "they're uploaded.");
    }
    }

    // --------------------------------------------------------
    // ACCESS ACCUMULATOR
    // --------------------------------------------------------
    //
    // Ported from the live Access Accumulator page (Views/
    // productAccessAccumulator*.cshtml): hero, "More about the Access
    // Accumulator" icon cards, single-column "All Rates" table, Access
    // Accumulator Calculator and "How to apply". Same shape and omission
    // as Notice Deposit above - no "Downloads" section until its PDFs
    // (incl. the marketing flyer) are in the media library.

    if (ShouldRunSection("access-accumulator"))
    {
    Console.WriteLine();
    Console.WriteLine("--- access accumulator ---");

    var (legacyAccessAccumulator, accessAccumulatorNodeName) =
        FreeUpLegacyUrlOfTypes(
            ["productAccessAccumulator", "productAccessAccumulatorV1"],
            "Access Accumulator",
            "Product Access Accumulator");

    var accessAccumulatorParentId =
        legacyAccessAccumulator?.ParentId ??
        contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault()?.ParentId;

    if (accessAccumulatorParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy Access Accumulator node and no existing productLoanPage " +
            "sibling found to infer a parent from - nothing to migrate.");
    }
    else
    {
        const string accessAccumulatorOpenUrl = "https://ib.africanbank.co.za";

        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Access Accumulator",
                ["description"] =
                    BuildRichText(
                            "<p>With Access Accumulator, you can invest your money with the ability to access it " +
                            "immediately, in full or partially. The distinct feature of the Access Accumulator is " +
                            "that it allows you to earn a competitive interest rate that increases monthly over a " +
                            "maximum term of 24 months.</p>")
                        .ToJsonString(),
                ["primaryCta"] = BuildExternalLink("OPEN ACCOUNT", accessAccumulatorOpenUrl).ToJsonString(),
                ["secondaryCta"] = BuildExternalLink("CALCULATE RETURNS", "#myCalculator").ToJsonString(),
                ["image"] = BuildMediaPicker("how-an-online.png"),
                ["imageAlt"] = "Access Accumulator"
            };

        var moreAboutContentData =
            new JsonObject
            {
                ["contentTypeKey"] = iconCardGridBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "More about the Access Accumulator",
                ["cards"] =
                    BuildIconCards(
                        [
                            ("bnaking-on-move.png", "EARN INCREASING INTEREST",
                                "Your interest increases by 0.15% monthly, for the duration of 24 months. The interest rate will never decrease for the duration of the investment."),
                            ("earn-int-on-pos-bal.png", "ACCESS TO YOUR MONEY",
                                "You have access to your money at any time either partially or fully."),
                            ("cc-limit.png", "EASY APPLICATION", "Register and open your account online in minutes.")
                        ])
                        .ToJsonString()
            };

        var ratesContentData =
            new JsonObject
            {
                ["contentTypeKey"] = ratesMatrixBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "All Rates",
                ["columnHeadings"] = "Access Accumulator 24 Months",
                ["rows"] =
                    BuildRatesRows(
                        [
                            ("R0 - 24999.99", "5.02%"),
                            ("R25000.00 - R99999.99", "5.26%"),
                            ("R100000.00 - R249999.99", "5.49%"),
                            ("> R250000.00", "5.72%")
                        ])
                        .ToJsonString(),
                ["disclaimers"] =
                    BuildFeatureList(
                        [
                            "Quoted interest rates are starting rates, expressed as Nominal Annual Rates Compounded Monthly (NACM). Valid for today only and are subject to change.",
                            "Terms and conditions apply. Disclaimer: African Bank cannot advise you of the tax implications of investing. It is recommended that you contact your financial advisor or your tax consultant."
                        ])
                        .ToJsonString()
            };

        var calculatorContentData =
            new JsonObject
            {
                ["contentTypeKey"] = investmentCalculatorBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Access Accumulator Calculator",
                ["investmentType"] = "Access",
                ["image"] = BuildMediaPicker("12-loan.png"),
                ["imageAlt"] = "Investment Vehicle",
                ["disclaimer"] =
                    "*Our calculators are only a guide. Actual payout could differ due to the number of days " +
                    "in a month and interest rates at the start date of the investment.",
                ["openAccountLink"] = BuildExternalLink("Open an account", "https://ib.africanbank.co.za/").ToJsonString()
            };

        var howToApplyContentData =
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "How to apply",
                ["subheading"] =
                    "With a minimum of R500.00, opening an account is easy. We’ll help you along the way with " +
                    "any of your inquiries. To kick-start your savings journey, simply enter your details below.",
                ["features"] =
                    BuildFeatureList(
                        [
                            "Identity Document",
                            "Non SA Citizen require a Passport, Valid working permit and proof of address to open an Investment.",
                            "The minimum opening deposit is R500"
                        ])
                        .ToJsonString(),
                ["cta"] = BuildExternalLink("OPEN ACCOUNT", accessAccumulatorOpenUrl).ToJsonString(),
                ["image"] = BuildMediaPicker("mw-overdraft-_bg.png"),
                ["imageAlt"] = "How to apply",
                ["imageOnRight"] = false
            };

        var accessAccumulatorContentData =
            new[]
            {
                heroContentData,
                moreAboutContentData,
                ratesContentData,
                calculatorContentData,
                howToApplyContentData
            };

        var accessAccumulatorSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(accessAccumulatorContentData
                                .Select(c => (JsonNode)new JsonObject { ["contentUdi"] = c["udi"]!.GetValue<string>() })
                                .ToArray())
                    },
                ["contentData"] = new JsonArray(accessAccumulatorContentData.Select(c => (JsonNode)c).ToArray())
            };

        CreateOrUpdateProductLoanPage(
            accessAccumulatorNodeName, accessAccumulatorParentId.Value, accessAccumulatorSections);

        Console.WriteLine(
            "NOTE: the \"Downloads\" section was not ported - its PDFs (incl. the " +
            "Access Accumulator marketing flyer) aren't in the media library.");
    }
    }

    // --------------------------------------------------------
    // TAX FREE
    // --------------------------------------------------------
    //
    // Ported from the live Tax-Free Investment page (Views/
    // productTaxFree*.cshtml): hero, "More about Tax-Free Investments" icon
    // cards, single-column "All Rates" table, Tax Free Calculator and
    // account requirements. Node named "Product Tax Free" so the slug is
    // /product-tax-free/. Same omission as the other investment pages - no
    // "More to read" downloads until their PDFs are in the media library.

    if (ShouldRunSection("tax-free"))
    {
    Console.WriteLine();
    Console.WriteLine("--- tax free ---");

    var (legacyTaxFree, taxFreeNodeName) =
        FreeUpLegacyUrlOfTypes(["productTaxFree", "productTaxFreeV1"], "Tax Free", "Product Tax Free");

    var taxFreeParentId =
        legacyTaxFree?.ParentId ??
        contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault()?.ParentId;

    if (taxFreeParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy Tax Free node and no existing productLoanPage " +
            "sibling found to infer a parent from - nothing to migrate.");
    }
    else
    {
        const string taxFreeOpenUrl = "https://ib.africanbank.co.za";

        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Tax-Free Investment",
                ["description"] =
                    BuildRichText(
                            "<p>You can save by investing your money at competitive interest rates with " +
                            "non-taxable payouts.</p>")
                        .ToJsonString(),
                ["primaryCta"] = BuildExternalLink("OPEN ACCOUNT", taxFreeOpenUrl).ToJsonString(),
                ["secondaryCta"] = BuildExternalLink("CALCULATE RETURNS", "#myCalculator").ToJsonString(),
                ["image"] = BuildMediaPicker("how-an-online.png"),
                ["imageAlt"] = "Tax-Free Investment"
            };

        var moreAboutContentData =
            new JsonObject
            {
                ["contentTypeKey"] = iconCardGridBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "More about Tax-Free Investments",
                ["cards"] =
                    BuildIconCards(
                        [
                            ("bnaking-on-move.png", "INVEST FROM R50",
                                "You can make additional deposits from as little as R50 per month."),
                            ("62-days-intr-free.png", "INVEST UP TO R 46 000 PER YEAR TAX FREE",
                                "You can invest tax free up to R 46 000 per tax year and a total of R 500 000 during your lifetime."),
                            ("cc-limit.png", "INTEREST RATE",
                                "Your interest rate remains the same for the first 12 months of the investment. But if the rate increases, you benefit from the increase. On anniversary of the account, the applicable rate at the time will apply."),
                            ("earn-int-on-pos-bal.png", "PAYOUT",
                                "You have the option to withdraw funds during the anniversary month, and every 12 months thereafter."),
                            ("instant-issue.png", "TERM",
                                "Allow your Tax-Free investment to grow as long as you like, provided a minimum balance of R50 is maintained."),
                            ("easy-repayments.png", "EASY APPLICATION", "Register and open your account online in minutes.")
                        ])
                        .ToJsonString()
            };

        var ratesContentData =
            new JsonObject
            {
                ["contentTypeKey"] = ratesMatrixBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "All Rates",
                ["columnHeadings"] = "Tax Free Deposit 1 Day",
                ["rows"] =
                    BuildRatesRows(
                        [
                            ("R0 - 9999.99", "6.98%"),
                            ("R10000.00 - R74999.99", "7.07%"),
                            ("R75000.00 - R249999.99", "7.17%"),
                            ("> R250000.00", "7.26%")
                        ])
                        .ToJsonString(),
                ["disclaimers"] =
                    BuildFeatureList(
                        [
                            "Interest rates are quoted as Nominal Annual Rates Compounded Monthly (NACM) and are valid for today only, as they are subject to change.",
                            "Terms and conditions apply. We cannot advise you on the tax implications of investing. It is recommended that you contact your financial advisor or tax consultant."
                        ])
                        .ToJsonString()
            };

        var calculatorContentData =
            new JsonObject
            {
                ["contentTypeKey"] = investmentCalculatorBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Tax Free Calculator",
                ["investmentType"] = "TxFree",
                ["image"] = BuildMediaPicker("12-loan.png"),
                ["imageAlt"] = "Investment Vehicle",
                ["disclaimer"] =
                    "*Our calculators are only a guide. Actual payout could differ due to the number of days " +
                    "in a month and interest rates at the start date of the investment.",
                ["openAccountLink"] = BuildExternalLink("Open an account", "https://ib.africanbank.co.za/").ToJsonString()
            };

        var requirementsContentData =
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "What you need to open a Tax-Free Investment account",
                ["subheading"] = "The minimum opening deposit is R50.",
                ["features"] =
                    BuildFeatureList(
                        [
                            "Identity document",
                            "Non SA Citizen require a Passport, Valid working permit and proof of address to open an Investment.",
                            "The minimum opening deposit is R50."
                        ])
                        .ToJsonString(),
                ["cta"] = BuildExternalLink("OPEN ACCOUNT", taxFreeOpenUrl).ToJsonString(),
                ["image"] = BuildMediaPicker("mw-overdraft-_bg.png"),
                ["imageAlt"] = "What you need to open a Tax-Free Investment account",
                ["imageOnRight"] = false
            };

        var taxFreeContentData =
            new[]
            {
                heroContentData,
                moreAboutContentData,
                ratesContentData,
                calculatorContentData,
                requirementsContentData
            };

        var taxFreeSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(taxFreeContentData
                                .Select(c => (JsonNode)new JsonObject { ["contentUdi"] = c["udi"]!.GetValue<string>() })
                                .ToArray())
                    },
                ["contentData"] = new JsonArray(taxFreeContentData.Select(c => (JsonNode)c).ToArray())
            };

        CreateOrUpdateProductLoanPage(taxFreeNodeName, taxFreeParentId.Value, taxFreeSections);

        Console.WriteLine(
            "NOTE: \"More to read\" downloads were not ported - their PDFs aren't " +
            "in the media library.");
    }
    }

    // --------------------------------------------------------
    // STOKVEL
    // --------------------------------------------------------
    //
    // Ported from the live Stokvel Account page (Views/stok.cshtml /
    // stokvelV1.cshtml): full-bleed photo hero, "Stokvel Account Benefits"
    // icon cards (title only), sideways "All Rates" table (balances as
    // columns, one "Interest Rate" row), "How To Apply" (channels as rich
    // text above the documents checklist), "More to read" downloads and the
    // "1 Number to call" strip. Unlike the investment pages, every file
    // here - including the download PDFs - is in the media library.

    if (ShouldRunSection("stokvel"))
    {
    Console.WriteLine();
    Console.WriteLine("--- stokvel ---");

    var (legacyStokvel, stokvelNodeName) =
        FreeUpLegacyUrlOfTypes(["stok", "stokvelV1"], "Stokvel", "Stokvel");

    var stokvelParentId =
        legacyStokvel?.ParentId ??
        contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault()?.ParentId;

    if (stokvelParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy Stokvel node and no existing productLoanPage " +
            "sibling found to infer a parent from - nothing to migrate.");
    }
    else
    {
        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroImageBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["headingLead"] = "African Bank",
                ["headingHighlight"] = "Stokvel Account",
                ["description"] =
                    BuildRichText(
                            "<p><strong>Strength in saving together</strong></p>" +
                            "<p>Digital access for up to 100 members. African Bank has been trusted with over " +
                            "R1 billion in stokvel savings.</p>")
                        .ToJsonString(),
                ["primaryCta"] = BuildExternalLink("Apply Now", "https://ib.africanbank.co.za/").ToJsonString(),
                ["secondaryCta"] = BuildExternalLink("Stokvel Faq's", MediaUrl("stokvel_faqs.pdf")).ToJsonString(),
                ["image"] = BuildMediaPicker("dig2603_003_stokvel_productpage.jpg"),
                ["imageAlt"] = "African Bank Stokvel Account"
            };

        var benefitsContentData =
            new JsonObject
            {
                ["contentTypeKey"] = iconCardGridBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Stokvel Account Benefits",
                ["cards"] =
                    BuildIconCards(
                        [
                            ("abw2312_003_stokvel_webpage_assets_icons1.png", "No monthly management fee", ""),
                            ("abw2312_003_stokvel_webpage_assets_icons2.png", "Earn interest at competitive rates", ""),
                            ("abw2312_003_stokvel_webpage_assets_icons3.png", "Transact digitally anytime and everywhere", ""),
                            ("abw2312_003_stokvel_webpage_assets_icons4.png", "No Constitution? We will create one for you!", ""),
                            ("abw2312_003_stokvel_webpage_assets_icons5.png",
                                "Quick and easy application process – online, in branch and via call centre", ""),
                            ("abw2312_003_stokvel_webpage_assets_icons6.png", "Add up to 100 members", "")
                        ])
                        .ToJsonString()
            };

        var ratesContentData =
            new JsonObject
            {
                ["contentTypeKey"] = ratesMatrixBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "All Rates",
                ["tierHeading"] = "Balance",
                ["columnHeadings"] =
                    "R 1 - R 24 999|R 25 000 - R 49 999|R 50 000 - R 99 999|R 100 000 - R 999 999|R 1 000 000+",
                ["rows"] = BuildRatesRows([("Interest Rate", "3.50%|4.50%|5.50%|6.00%|7.00%")]).ToJsonString(),
                ["disclaimers"] =
                    BuildFeatureList(
                        [
                            "Interest rates are quoted as Nominal Annual Rates Compounded Monthly (NACM) and are valid for today only, as they are subject to change.",
                            "Terms and conditions apply. We cannot advise you on the tax implications of investing. It is recommended that you contact your financial advisor or tax consultant."
                        ])
                        .ToJsonString()
            };

        var howToApplyContentData =
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "How To Apply",
                ["subheading"] = "",
                ["bodyHtml"] =
                    BuildRichText(
                            "<ul>" +
                            "<li><strong>Visit nearest African Bank branch — no appointment needed.</strong></li>" +
                            "<li><strong>Visit <a href=\"https://ib.africanbank.co.za/\">www.africanbank.co.za</a></strong></li>" +
                            "<li><strong>Call 0861 111 011 or SMS “Stokvel” to 30963</strong></li>" +
                            "</ul>" +
                            "<h4>Documents Required</h4>")
                        .ToJsonString(),
                ["features"] =
                    BuildFeatureList(
                        [
                            "SA Citizen: Valid ID Document",
                            "Non-RSA citizen: valid passport, work permit, and proof of residence",
                            "3 Executives must be present at branch",
                            "Copy of Stokvel Constitution (If you do not have a constitution, no worries African Bank will assist to create a constitution)"
                        ])
                        .ToJsonString(),
                ["cta"] = null,
                ["image"] = BuildMediaPicker("stokvel-imgaes2.png"),
                ["imageAlt"] = "How To Apply",
                ["imageOnRight"] = false
            };

        var downloadsContentData =
            new JsonObject
            {
                ["contentTypeKey"] = downloadsSectionBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "More to read",
                ["items"] =
                    BuildBlockList(
                        downloadItemType,
                        new[]
                            {
                                ("Stokvel terms and conditions", "stokvel-terms-and-conditions-202604.pdf"),
                                ("Stokvel pricing guide", "stokvel_pricing-guide-202601.pdf")
                            }
                            .Select(d =>
                                new Dictionary<string, JsonNode?>
                                {
                                    ["downloadTextDescription"] = d.Item1,
                                    ["downloadButtonRedirectLink2"] = BuildMediaPicker(d.Item2),
                                    ["downloadButtonText"] = "Download"
                                }))
                        .ToJsonString()
            };

        var callContentData =
            new JsonObject
            {
                ["contentTypeKey"] = techCallToActionBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "1 Number to call",
                ["phoneNumber"] = "086111 1011",
                ["phoneUrl"] = "tel:0861111011",
                ["termsLabel"] = "",
                ["termsUrl"] = "",
                ["disclaimerHtml"] =
                    BuildRichText(
                            "<p>*Banking fees are based on Solidarity's methodology of comparing defined baskets of " +
                            "transactions (12,17,25 and 30 transactions) across 6 biggest entry level bank accounts. " +
                            "In this way, an average industry price was obtained.</p>")
                        .ToJsonString()
            };

        var stokvelContentData =
            new[]
            {
                heroContentData,
                benefitsContentData,
                ratesContentData,
                howToApplyContentData,
                downloadsContentData,
                callContentData
            };

        var stokvelSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(stokvelContentData
                                .Select(c => (JsonNode)new JsonObject { ["contentUdi"] = c["udi"]!.GetValue<string>() })
                                .ToArray())
                    },
                ["contentData"] = new JsonArray(stokvelContentData.Select(c => (JsonNode)c).ToArray())
            };

        CreateOrUpdateProductLoanPage(stokvelNodeName, stokvelParentId.Value, stokvelSections);
    }
    }

    // --------------------------------------------------------
    // CREDIT LIFE
    // --------------------------------------------------------
    //
    // Ported from the live Credit Life Insurance page (Views/
    // productCreditLife*.cshtml / productcreditlifev2.cshtml): hero,
    // "formally employed" cover icon cards, self-employed/pensioner cover,
    // "Submit your claim" form, "ensure coverage" note, and the two "not
    // covered for" checklists. Node named "Product Credit Life" so the slug
    // is /product-credit-life/.
    //
    // The claim form posts to the same production contact service the
    // legacy page does (/public/contacform/submit) - blank its Submit URL
    // in the backoffice on an environment that mustn't create real claims.
    //
    // Not ported: the "Claims, Policies and Complaints" downloads, whose
    // PDFs aren't in the media library (downloadItem's file is mandatory).

    if (ShouldRunSection("credit-life"))
    {
    Console.WriteLine();
    Console.WriteLine("--- credit life ---");

    var (legacyCreditLife, creditLifeNodeName) =
        FreeUpLegacyUrlOfTypes(
            ["productCreditLife", "productCreditLifeV1", "productcreditlifev2"],
            "Credit Life",
            "Product Credit Life");

    var creditLifeParentId =
        legacyCreditLife?.ParentId ??
        contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault()?.ParentId;

    if (creditLifeParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy Credit Life node and no existing productLoanPage " +
            "sibling found to infer a parent from - nothing to migrate.");
    }
    else
    {
        JsonObject Checklist(
            string heading, string bodyHtml, string[] features, string imageFile, bool imageOnRight) =>
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = heading,
                ["subheading"] = "",
                ["bodyHtml"] = bodyHtml.Length == 0 ? null : BuildRichText(bodyHtml).ToJsonString(),
                ["features"] = BuildFeatureList(features).ToJsonString(),
                ["cta"] = null,
                ["image"] = BuildMediaPicker(imageFile),
                ["imageAlt"] = heading,
                ["imageOnRight"] = imageOnRight
            };

        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Credit Life Insurance",
                ["description"] =
                    BuildRichText(
                            "<p>Peace of mind that your credit obligation will be covered during the term of " +
                            "your loan, should you be affected by any of these loss of income events.</p>")
                        .ToJsonString(),
                ["primaryCta"] = BuildExternalLink("SUBMIT CLAIM", "#submit-claim").ToJsonString(),
                ["secondaryCta"] = null,
                ["image"] = BuildMediaPicker("cred-life-insure.png"),
                ["imageAlt"] = "Credit Life Insurance"
            };

        var claimFormContentData =
            new JsonObject
            {
                ["contentTypeKey"] = claimFormBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Submit your claim.",
                ["intro"] = "Please fill in your details to get started with your application.",
                ["image"] = BuildMediaPicker("ensure-coverage.png"),
                ["imageAlt"] = "Submit your claim",
                ["submitUrl"] = "https://mobilev5.africanbank.co.za/public/contacform/submit",
                ["successMessage"] =
                    "Thank you for logging a claim. We will attend to this shortly. For any queries, please " +
                    "contact our call centre on 0861888786.",
                ["errorMessage"] =
                    "An error occurred while trying to submit the information. For any queries, please contact " +
                    "our call centre on 0861888786."
            };

        var coverContentData =
            new JsonObject
            {
                ["contentTypeKey"] = iconCardGridBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Credit customers who are formally employed will be covered for:",
                ["cards"] =
                    BuildIconCards(
                        [
                            ("easy-repayments.png", "Retrenchment Instalment",
                                "We cover your credit repayment, while you are unemployed, for up to 12 months."),
                            ("bnaking-on-move.png", "Death",
                                "We settle your outstanding credit balance so your family will not be burdened by your debt."),
                            ("62-days-intr-free.png", "Compulsory Unpaid Leave or Lay-off or Short Time",
                                "We cover your credit repayment while your income is affected, for up to 12 months."),
                            ("earn-int-on-pos-bal.png", "Temporary Disability",
                                "We cover your credit repayment while you are disabled and unable to work or earn an income for up to 12 months"),
                            ("62-days-intr-free.png", "Permanent Disability", "We settle your outstanding credit balance.")
                        ])
                        .ToJsonString()
            };

        var selfEmployedContentData =
            Checklist(
                "Credit is available for self-employed or pensioner customers.",
                "<h4>Death:</h4>" +
                "<p>We settle your outstanding credit balance so that your family will not be burdened with your debt.</p>" +
                "<h4>Temporary Disability:</h4>" +
                "<p>We cover your credit repayment while you are disabled and unable to work or earn an income for up to 12 months.</p>" +
                "<h4>Permanent Disability:</h4>" +
                "<p>We settle your outstanding credit balance.</p>",
                [],
                "credit-available-se-pen.png",
                imageOnRight: true);

        var ensureCoverageContentData =
            Checklist(
                "",
                "<h4>Ensure coverage by keeping credit repayments current, maintaining an active credit life " +
                "policy for potential claims.</h4>" +
                "<p>Death We settle your outstanding credit balance so that your family will not be burdened with " +
                "your debt. Temporary Disability: We cover your credit repayment while you are disabled and unable " +
                "to work or earn an income for up to 12 months. Permanent Disability: We settle your outstanding " +
                "credit balance.</p>",
                [],
                "ensure-coverage.png",
                imageOnRight: false);

        var retrenchmentContentData =
            Checklist(
                "",
                "<h4>Retrenchment or Compulsory Unpaid Leave or Lay-off or Short Time are not covered for:</h4>",
                [
                    "90 day waiting period",
                    "Dismissals / misconduct",
                    "Suspensions",
                    "Participation in unprotected strikes",
                    "Employment contracts ended",
                    "Voluntary retrenchment",
                    "Voluntary retirement",
                    "Resignation",
                    "You were aware of retrenchment before taking out the credit life policy"
                ],
                "retrench-cl.png",
                imageOnRight: true);

        var deathDisabilityContentData =
            Checklist(
                "Death or Disability are not covered for:",
                "",
                [
                    "Pre-existing medical conditions 12 months before commencement of credit life policy",
                    "Participation in crime",
                    "Wilful self-inflicted injury or suicide / alcohol abuse / drugs or narcotics",
                    "Participation in hazardous activities"
                ],
                "death-and-dis.png",
                imageOnRight: false);

        var creditLifeContentData =
            new[]
            {
                heroContentData,
                coverContentData,
                claimFormContentData,
                selfEmployedContentData,
                ensureCoverageContentData,
                retrenchmentContentData,
                deathDisabilityContentData
            };

        var creditLifeSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(creditLifeContentData
                                .Select(c => (JsonNode)new JsonObject { ["contentUdi"] = c["udi"]!.GetValue<string>() })
                                .ToArray())
                    },
                ["contentData"] = new JsonArray(creditLifeContentData.Select(c => (JsonNode)c).ToArray())
            };

        CreateOrUpdateProductLoanPage(creditLifeNodeName, creditLifeParentId.Value, creditLifeSections);

        Console.WriteLine(
            "NOTE: the claim form posts to the bank's production contact service - " +
            "blank its Submit URL in the backoffice to stop that. The \"Claims, " +
            "Policies and Complaints\" downloads (PDFs not in the media library) " +
            "were not ported.");
    }
    }

    // --------------------------------------------------------
    // FUNERAL COVER
    // --------------------------------------------------------
    //
    // Ported from the live Family Funeral Cover page (Views/
    // productFuneralCover*.cshtml / productFuneralPlanV1.cshtml): hero
    // (with the Family Funeral Cover checklist in its description), Funeral
    // Calculator and "More to read" downloads. Node defaults to "Product
    // Funeral Cover" (slug /product-funeral-cover/) unless a legacy node
    // supplies a name.
    //
    // The calculator ports the legacy member/cover rules, but not its
    // premium calculation or Call Me Back form (that code wasn't available),
    // so Calculate shows a cover summary. The Foreign National Funeral Plan
    // T&Cs PDF isn't in the media library, so that download is missing.

    if (ShouldRunSection("funeral-cover"))
    {
    Console.WriteLine();
    Console.WriteLine("--- funeral cover ---");

    var (legacyFuneralCover, funeralCoverNodeName) =
        FreeUpLegacyUrlOfTypes(
            ["productFuneralCover", "productFuneralCover1", "productFuneralPlanV1"],
            "Funeral",
            "Product Funeral Cover");

    var funeralCoverParentId =
        legacyFuneralCover?.ParentId ??
        contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault()?.ParentId;

    if (funeralCoverParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy Funeral Cover node and no existing productLoanPage " +
            "sibling found to infer a parent from - nothing to migrate.");
    }
    else
    {
        var heroContentData =
            new JsonObject
            {
                ["contentTypeKey"] = heroBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Protect your family’s wellbeing during times of loss",
                ["description"] =
                    BuildRichText(
                            "<h4><strong>Family Funeral Cover</strong></h4>" +
                            "<div class=\"rich-text-ticks\"><ul>" +
                            "<li>Cover up to R100 000, for the Main member and Spouse.</li>" +
                            "<li>Cover up to R50 000 for children</li>" +
                            "<li>Cover up to R50 000 for parents, or in-laws, or extended family</li>" +
                            "</ul></div>")
                        .ToJsonString(),
                ["primaryCta"] = BuildExternalLink("APPLY NOW", "https://ib.africanbank.co.za/").ToJsonString(),
                ["secondaryCta"] = BuildExternalLink("Build Your Own Cover", "#funeral-calculator").ToJsonString(),
                ["image"] = BuildMediaPicker("lr_ins2503_002_web-image.png"),
                ["imageAlt"] = "Family Funeral Cover"
            };

        var calculatorContentData =
            new JsonObject
            {
                ["contentTypeKey"] = funeralCalculatorBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Funeral Calculator",
                ["image"] = BuildMediaPicker("lr_ins2506_002_web-calculator-image.png"),
                ["imageAlt"] = "Funeral Calculator",
                ["applyLink"] = BuildExternalLink("Apply Now", "https://ib.africanbank.co.za/SignIn.aspx").ToJsonString()
            };

        var downloadsContentData =
            new JsonObject
            {
                ["contentTypeKey"] = downloadsSectionBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "More to read",
                ["items"] =
                    BuildBlockList(
                        downloadItemType,
                        new[]
                            {
                                ("Funeral Insurance terms and conditions", "funeral-terms-conditions-83.pdf"),
                                ("African Bank Family Funeral Plan Terms and Conditions",
                                    "african-bank-family-funeral-policy-terms-and-conditions-final-18-02-2025_is_clean.pdf"),
                                ("African Bank Group Employee Family Funeral Plan Terms and Conditions",
                                    "african-bank-group-employee-family-funeral-plan-policy-and-terms-and-conditions-final-18-02-2025_is_clean.pdf")
                            }
                            .Select(d =>
                                new Dictionary<string, JsonNode?>
                                {
                                    ["downloadTextDescription"] = d.Item1,
                                    ["downloadButtonRedirectLink2"] = BuildMediaPicker(d.Item2),
                                    ["downloadButtonText"] = "Download"
                                }))
                        .ToJsonString()
            };

        var funeralCoverContentData = new[] { heroContentData, calculatorContentData, downloadsContentData };

        var funeralCoverSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(funeralCoverContentData
                                .Select(c => (JsonNode)new JsonObject { ["contentUdi"] = c["udi"]!.GetValue<string>() })
                                .ToArray())
                    },
                ["contentData"] = new JsonArray(funeralCoverContentData.Select(c => (JsonNode)c).ToArray())
            };

        CreateOrUpdateProductLoanPage(funeralCoverNodeName, funeralCoverParentId.Value, funeralCoverSections);

        Console.WriteLine(
            "NOTE: the calculator shows a cover summary, not a premium (premium " +
            "logic not yet ported); no Call Me Back form or Foreign National " +
            "Funeral Plan T&Cs download yet.");
    }
    }

    // --------------------------------------------------------
    // AUDACIOUS REWARDS
    // --------------------------------------------------------
    //
    // Ported from the live Audacious Rewards page (Views/
    // AudaciousRewards.cshtml): welcome hero, JOIN / EARN / SPEND cards,
    // "How to Join" and "How to Earn" partner tabs. Node named "Audacious
    // Rewards" so the slug is /audacious-rewards/.
    //
    // Partial port - the source HTML supplied was truncated after the
    // Dining tab, so the DIY / Groceries / Travel / Online-Shopping tabs,
    // the Banking tab, the Spend section and the points calculator aren't
    // here yet. The hero banner, Pace/Spur partner banners and the current
    // T&Cs / FAQ PDFs aren't in the media library either: the hero is text
    // only, the tabs have no banner, and the footnote's T&Cs/FAQ mentions
    // aren't linked.

    if (ShouldRunSection("audacious-rewards"))
    {
    Console.WriteLine();
    Console.WriteLine("--- audacious rewards ---");

    var (legacyRewards, rewardsNodeName) =
        FreeUpLegacyUrlOfTypes(["AudaciousRewards", "audiousRewards"], "Audacious Rewards", "Audacious Rewards");

    var rewardsParentId =
        legacyRewards?.ParentId ??
        contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!)
            .FirstOrDefault()?.ParentId;

    if (rewardsParentId == null)
    {
        Console.WriteLine(
            "SKIP: no legacy Audacious Rewards node and no existing productLoanPage " +
            "sibling found to infer a parent from - nothing to migrate.");
    }
    else
    {
        const string joinUrl = "https://ib.africanbank.co.za/SignIn.aspx";

        const string boostedFootnote =
            "<p>*<strong>Boosted earn rate</strong> applies when you have your <strong>salary paid into your " +
            "primary African Bank account</strong> and <strong>maintain at least two active debit orders</strong>.</p>" +
            "<p>Earn rate requirements, exclusions and monthly spend limits apply. Refer to our T&amp;Cs and FAQ " +
            "for more details.</p>";

        string EarnRates(string standardLabel, string standardHtml, string boostedHtml) =>
            $"<p><strong style=\"color:#89bc44\">{standardLabel}</strong><br>{standardHtml}</p>" +
            $"<p><strong style=\"color:#89bc44\">Boosted Earn Rate*</strong><br>{boostedHtml}</p>";

        Dictionary<string, JsonNode?> Tab(
            string label, string heading, string subheading, string description,
            string debitHtml, string creditHtml, string closingText, string ctaLabel, string ctaUrl) =>
            new()
            {
                ["label"] = label,
                ["heading"] = heading,
                ["subheading"] = subheading,
                ["description"] = description,
                ["image"] = null,
                ["card1Title"] = "Debit Card",
                ["card1Html"] = BuildRichText(debitHtml).ToJsonString(),
                ["card1Link"] = BuildExternalLink("Join Now", "https://ib.africanbank.co.za/").ToJsonString(),
                ["card2Title"] = "Credit Card",
                ["card2Html"] = BuildRichText(creditHtml).ToJsonString(),
                ["card2Link"] = BuildExternalLink("Join Now", "/en/home/get-a-quote").ToJsonString(),
                ["footnoteHtml"] = BuildRichText(boostedFootnote).ToJsonString(),
                ["closingText"] = closingText,
                ["cta"] = BuildExternalLink(ctaLabel, ctaUrl).ToJsonString()
            };

        var bannerContentData =
            new JsonObject
            {
                ["contentTypeKey"] = imageBannerBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["image"] = BuildMediaPicker("ar2407_002_web-banner_grocery-benefit_p10.jpg"),
                ["mobileImage"] = null,
                ["imageAlt"] = "Audacious Rewards - grocery shopping now more rewarding at Checkers, Shoprite and Usave",
                ["link"] = null
            };

        var stepsContentData =
            new JsonObject
            {
                ["contentTypeKey"] = stepCardsBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "",
                ["introHtml"] =
                    BuildRichText(
                            "<h2>Welcome to <strong>Audacious Rewards</strong></h2>" +
                            "<p>Audacious Rewards is African Bank’s rewards programme designed to reward you for " +
                            "your everyday banking and positive financial behaviour. Simply earn Audacious Rewards " +
                            "points by using your African Bank Card and enjoy spending your points on airtime, data, " +
                            "electricity, grocery vouchers and much more.</p>")
                        .ToJsonString(),
                ["introCta"] = BuildExternalLink("Join Now", joinUrl).ToJsonString(),
                ["cards"] =
                    BuildBlockList(
                        stepCardType,
                        new[]
                            {
                                ("JOIN",
                                    "<p><strong>Join for free</strong> in minutes</p><p><strong>Get started</strong> right away</p>" +
                                    "<p><strong>Use our app</strong> or internet banking</p>",
                                    "Join Now", joinUrl),
                                ("EARN",
                                    "<p><strong>Get rewarded</strong> everyday</p><p><strong>Pay with our card</strong> at our partners</p>" +
                                    "<p><strong>Use our app</strong> for your banking</p>",
                                    "Join Now", "#how-to-earn"),
                                ("SPEND",
                                    "<p>Enjoy vouchers from <strong>over 35 partners</strong></p><p>Convert your <strong>points to cash</strong></p>" +
                                    "<p>Or <strong>invest your points tax-free</strong></p>",
                                    "Explore", joinUrl)
                            }
                            .Select(c =>
                                new Dictionary<string, JsonNode?>
                                {
                                    ["title"] = c.Item1,
                                    ["bodyHtml"] = BuildRichText(c.Item2).ToJsonString(),
                                    ["cta"] = BuildExternalLink(c.Item3, c.Item4).ToJsonString()
                                }))
                        .ToJsonString()
            };

        var howToJoinContentData =
            new JsonObject
            {
                ["contentTypeKey"] = featureChecklistBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "How to Join",
                ["subheading"] = "",
                ["bodyHtml"] =
                    BuildRichText(
                            "<ul>" +
                            "<li><strong>Log into</strong> the African Bank App or Website</li>" +
                            "<li><strong>Access</strong> “My Rewards”</li>" +
                            "<li><strong>Tap</strong> \"Join Now\"</li>" +
                            "</ul>")
                        .ToJsonString(),
                ["features"] = BuildFeatureList([]).ToJsonString(),
                ["cta"] = BuildExternalLink("Join Now", "https://ib.africanbank.co.za").ToJsonString(),
                ["image"] = BuildMediaPicker("abw2406_002_ar_assets_pmupdate_howtojoin2.png"),
                ["imageAlt"] = "How to Join",
                ["imageOnRight"] = false
            };

        var howToEarnContentData =
            new JsonObject
            {
                ["contentTypeKey"] = partnerTabsBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "How to Earn",
                ["introHtml"] =
                    BuildRichText(
                            $"<p>Simply <a href=\"{joinUrl}\">register an online profile</a> and you can start using " +
                            "our benefits through our card, partners and app</p>")
                        .ToJsonString(),
                ["tabs"] =
                    BuildBlockList(
                        partnerTabType,
                        [
                            Tab(
                                "Car Hire",
                                "Car Hire",
                                "Rent a car from Pace Car Rental and earn up to 50% back in points with us",
                                "Enjoy short-term and long term car rentals made for everyday South Africans with the best range of vehicles and no hidden costs",
                                EarnRates(
                                    "Standard Earn Rate",
                                    "<strong>Earn 5% back</strong> on rentals of 6 days or less<br><strong>Earn 2.5% back</strong> on rentals between 7–29 days",
                                    "<strong>Earn 10% back</strong> on rentals of 6 days or less<br><strong>Earn 5% back</strong> on rentals between 7–29 days<br><strong>Earn 2.5% back</strong> on rentals greater than 30 days"),
                                EarnRates(
                                    "Standard Earn Rate",
                                    "<strong>Earn 10% back</strong> on rentals of 6 days or less<br><strong>Earn 5% back</strong> on rentals between 7–29 days",
                                    "<strong>Earn 50% back</strong> on rentals of 6 days or less<br><strong>Earn 25% back</strong> on rentals between 7–29 days<br><strong>Earn 5% back</strong> on rentals greater than 30 days"),
                                "Rent with confidence from a proudly South African car rental company with competitive rates and reliable service",
                                "Book Now",
                                "https://africanbank.pacecarrental.co.za/?utm_source=website&utm_medium=referral&utm_campaign=ar-pace-launch-072025&utm_content=cta-book-now"),
                            Tab(
                                "Dining",
                                "Dining",
                                "Eat-out at Spur and earn up to 50% back in Audacious Rewards points",
                                "Enjoy family dinner with more value",
                                EarnRates(
                                    "Standard Earn",
                                    "<strong>Earn 0.3% back</strong> at <strong>Spur Group restaurants:</strong> Panarottis, John Dory’s, RocoMamas, The Hussar Grill, Piza E Vino, Doppio Zero, Casa Bella <strong>and KFC.</strong>",
                                    "<strong>Earn 10% back</strong> at <strong>Spur</strong>."),
                                EarnRates(
                                    "Standard Earn",
                                    "<strong>Earn 1% back</strong> at <strong>Spur Group restaurants:</strong> Panarottis, John Dory’s, RocoMamas, The Hussar Grill, Piza E Vino, Doppio Zero, Casa Bella <strong>and KFC</strong>.",
                                    "<strong>Earn 50% back</strong> at <strong>Spur</strong>."),
                                "Enjoy family dining at your nearest Spur",
                                "Find a Spur",
                                "https://www.spursteakranches.com/za/find-a-spur")
                        ])
                        .ToJsonString()
            };

        // "Shop Now" / "VISIT STORE" point at internet banking (where "My
        // Rewards" and its store live) - the legacy store URL wasn't in the
        // HTML supplied. The TotalEnergies logo isn't in the media library.
        var spendContentData =
            new JsonObject
            {
                ["contentTypeKey"] = spendCarouselBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["heading"] = "Spend with our benefit partners",
                ["introHtml"] =
                    BuildRichText(
                            "<p>Redeem your Audacious Rewards points on the online store for airtime, data, " +
                            "electricity and grocery vouchers and much more or convert your points to cash.</p>")
                        .ToJsonString(),
                ["slides"] =
                    BuildBlockList(
                        spendSlideType,
                        [
                            new Dictionary<string, JsonNode?>
                            {
                                ["image"] = null,
                                ["title"] = "TotalEnergies Vouchers",
                                ["bodyHtml"] =
                                    BuildRichText(
                                            "<p>Save on Fuel and Café Bonjour purchases.</p>" +
                                            "<p>Redeem your Audacious Rewards points for TotalEnergies vouchers today!</p>")
                                        .ToJsonString(),
                                ["cta"] = BuildExternalLink("Shop Now", joinUrl).ToJsonString()
                            }
                        ])
                        .ToJsonString()
            };

        var footerContentData =
            new JsonObject
            {
                ["contentTypeKey"] = rewardsFooterBlockType.Key.ToString(),
                ["udi"] = $"umb://element/{Guid.NewGuid():N}",
                ["bandCta"] = BuildExternalLink("Visit Store", joinUrl).ToJsonString(),
                ["headingHtml"] =
                    BuildRichText("<p><strong>Access your rewards</strong> anytime, anywhere!</p>").ToJsonString(),
                ["cta"] = BuildExternalLink("Join Today", joinUrl).ToJsonString(),
                ["link1"] = null,
                ["link2"] = null
            };

        var rewardsContentData =
            new[]
            {
                bannerContentData,
                stepsContentData,
                howToJoinContentData,
                howToEarnContentData,
                spendContentData,
                footerContentData
            };

        var rewardsSections =
            new JsonObject
            {
                ["layout"] =
                    new JsonObject
                    {
                        ["Umbraco.BlockList"] =
                            new JsonArray(rewardsContentData
                                .Select(c => (JsonNode)new JsonObject { ["contentUdi"] = c["udi"]!.GetValue<string>() })
                                .ToArray())
                    },
                ["contentData"] = new JsonArray(rewardsContentData.Select(c => (JsonNode)c).ToArray())
            };

        CreateOrUpdateProductLoanPage(rewardsNodeName, rewardsParentId.Value, rewardsSections);

        Console.WriteLine(
            "NOTE: partial port - DIY / Groceries / Travel / Online-Shopping / Banking " +
            "tabs, the Spend section and the points calculator still to come; hero " +
            "banner, partner banners and current T&Cs/FAQ PDFs not in the media library.");
    }
    }

    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine("MIGRATION COMPLETE");
    Console.WriteLine("=================================================");

    return;
}

// ============================================================
// INSPECT-PRODUCT-LOAN-PAGES COMMAND
// ============================================================
//
// Read-only diagnostic: lists every productLoanPage and legacy pageLoans
// node (Id/Name/ParentId/Published), and for each productLoanPage prints
// the content-type alias + heading of every block actually stored in its
// "sections" property right now. Written to track down a live report of
// /en/home/product-consolidation-loan/ rendering sections that
// migrate-product-loan-pages never wrote (a checklist-style "How An Online
// Consolidation Loan Application Works" hero and a Credit Life Insurance
// section, which that command only ever writes onto Product Personal
// Loan) - run this first to see whether that's a duplicate node sharing
// the URL, leftover content on the node this command already updates, or
// something else, before changing any seeding code again.

if (args.Length > 0 &&
    args[0].Equals("inspect-product-loan-pages", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("=================================================");
    Console.WriteLine(" INSPECT PRODUCT LOAN PAGES");
    Console.WriteLine("=================================================");
    Console.WriteLine();

    var contentTypeService = app.Services.GetRequiredService<IContentTypeService>();
    var contentService = app.Services.GetRequiredService<IContentService>();

    var productLoanPageType = contentTypeService.Get("productLoanPage");
    var pageLoansType = contentTypeService.Get("pageLoans");

    var typeNamesByKey =
        contentTypeService.GetAll()
            .ToDictionary(t => t.Key.ToString(), t => t.Alias, StringComparer.OrdinalIgnoreCase);

    void PrintNode(IContent node)
    {
        Console.WriteLine(
            $"  id={node.Id,-6} published={node.Published,-5} parentId={node.ParentId,-6} name=\"{node.Name}\"");
    }

    // Prints the ancestor chain (id/name/contentType) from `id` up to the
    // site root (-1), so it's clear whether two different parentIds seen
    // below are the same "/en/home/" tree or two genuinely separate trees -
    // walking ParentId by hand (not relying on a published-content/Url
    // lookup, which needs the published cache rather than this
    // IContentService-level diagnostic).
    void PrintAncestry(int id)
    {
        var chain = new List<string>();
        var currentId = id;
        var guard = 0;

        while (currentId > 0 && guard++ < 50)
        {
            var current = contentService.GetById(currentId);

            if (current == null)
            {
                chain.Add($"id={currentId} (NOT FOUND)");
                break;
            }

            var typeAlias =
                contentTypeService.Get(current.ContentTypeId)?.Alias ?? "?";

            chain.Add($"id={current.Id} \"{current.Name}\" [{typeAlias}]");
            currentId = current.ParentId;
        }

        Console.WriteLine($"  {id} -> " + string.Join("  <-  ", chain));
    }

    Console.WriteLine("--- ancestry of the two parentIds seen on legacy/productLoanPage nodes ---");
    PrintAncestry(8523);
    PrintAncestry(8534);
    Console.WriteLine();

    // "Public Site" (7973) and "Public Site(1)" (8075) are BOTH top-level
    // nodes - the "(1)" strongly suggests one is a full-tree copy of the
    // other (Umbraco auto-renames on a name collision when you copy a
    // node), so node id order alone can't say which one real requests
    // actually route to. Domain bindings are what Umbraco's routing
    // actually keys off of, so list them here and show which of the two
    // root ids (if either) owns them.
    Console.WriteLine("--- domain bindings (decides which site tree real requests route to) ---");

    var domainService = app.Services.GetRequiredService<IDomainService>();
    var allDomains = domainService.GetAll(true).ToList();

    if (allDomains.Count == 0)
    {
        Console.WriteLine("  (no domains registered at all)");
    }
    else
    {
        foreach (var domain in allDomains)
        {
            Console.WriteLine(
                $"  domain=\"{domain.DomainName}\" rootContentId={domain.RootContentId} isWildcard={domain.IsWildcard}");
        }
    }

    Console.WriteLine();

    if (pageLoansType != null)
    {
        Console.WriteLine("--- legacy pageLoans nodes ---");

        var legacyNodes = contentService.GetPagedOfType(pageLoansType.Id, 0, 500, out _, null!).ToList();

        Console.WriteLine($"({legacyNodes.Count} node(s))");

        foreach (var node in legacyNodes)
        {
            PrintNode(node);
        }

        Console.WriteLine();
    }

    if (productLoanPageType != null)
    {
        Console.WriteLine("--- productLoanPage nodes ---");

        var pages = contentService.GetPagedOfType(productLoanPageType.Id, 0, 500, out _, null!).ToList();

        Console.WriteLine($"({pages.Count} node(s))");
        Console.WriteLine();

        foreach (var node in pages)
        {
            PrintNode(node);

            var raw = node.GetValue<string>("sections");

            if (string.IsNullOrWhiteSpace(raw))
            {
                Console.WriteLine("    (sections is empty)");
                Console.WriteLine();
                continue;
            }

            JsonNode? parsed;

            try
            {
                parsed = JsonNode.Parse(raw);
            }
            catch (JsonException ex)
            {
                Console.WriteLine($"    FAILED TO PARSE sections: {ex.Message}");
                Console.WriteLine();
                continue;
            }

            var contentData = parsed?["contentData"] as JsonArray;

            if (contentData == null)
            {
                Console.WriteLine("    (no contentData array in sections)");
                Console.WriteLine();
                continue;
            }

            Console.WriteLine($"    {contentData.Count} block(s) in sections:");

            foreach (var block in contentData)
            {
                var typeKey = block?["contentTypeKey"]?.ToString();
                var alias =
                    typeKey != null && typeNamesByKey.TryGetValue(typeKey, out var a)
                        ? a
                        : $"unknown ({typeKey})";

                var label =
                    block?["heading"]?.ToString() ??
                    block?["headingLead"]?.ToString() ??
                    block?["headingHighlight"]?.ToString();

                Console.WriteLine(
                    label != null
                        ? $"      - {alias}: \"{label}\""
                        : $"      - {alias}");
            }

            Console.WriteLine();
        }
    }

    Console.WriteLine("=================================================");
    Console.WriteLine("DONE (read-only - nothing was changed)");
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
                Console.WriteLine($"SAVED BUT FAILED PUBLISH: {node.Name} (id={node.Id}) - {publishResult.Result}");

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