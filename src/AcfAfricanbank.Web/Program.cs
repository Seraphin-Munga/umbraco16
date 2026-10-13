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
        contactInfoBlockType == null)
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