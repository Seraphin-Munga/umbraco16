# legacy/ — Umbraco 8 source (reference only, NOT compiled)

A verbatim copy of the relevant parts of the old `Platform/Web` project, kept here so the
port work happens inside this repo. **None of this is part of the build** — it's .NET
Framework / `System.Web` code that cannot compile against .NET 9 / Umbraco 16.

| Folder | What | Port target |
|---|---|---|
| `Controllers/` | 14 controllers (incl. `CustomController` 1466 l, `QuickLoansController` 1566 l) | `src/AcfAfricanbank.Web/Controllers/` — rewrite to `RenderController` / `SurfaceController` / `[ApiController]` |
| `Helpers/` | 8 helpers (Search, ViewModel, UmbracoSections, Cache, Resource, Config…) | `src/…/Services` or `src/AcfAfricanbank.Core` — most depend on ModelsBuilder output |
| `Models/` | 22 hand models + subfolders + **366 generated** ModelsBuilder files | hand models → port; generated → **regenerate** from the migrated doc types |
| `Entities/`, `Extensions/`, `Handlers/`, `CustomValidators/`, `App_Start/` | misc support | port case-by-case |
| `Views/` | ~149 `.cshtml` | `src/AcfAfricanbank.Web/Views/` — `@inherits` + namespace changes, Grid → Block Grid |
| `App_Plugins/CustomUmbracoDashboard/` | AngularJS backoffice dashboard | **full rewrite** as a v16 Web-Components package |
| `Global.asax.cs` | app startup / events | `IComposer` + `INotificationHandler<T>` |
| `web.config`, `packages.config` | old config / package list | `appsettings.json` + `<PackageReference>` (see MIGRATION.md package map) |

## Why it can't be ported yet

Most of it references `Umbraco.Web.PublishedModels` — the strongly-typed classes
ModelsBuilder generates from doc types — plus hardcoded node IDs. Those types don't exist
until the doc types are in the new database, i.e. after the DB migration (MIGRATION.md
Steps 3–5). Port work starts in earnest once ModelsBuilder can regenerate against the
migrated schema.

Static front-end assets (css/js/fonts/images) were copied straight into
`src/AcfAfricanbank.Web/wwwroot/` and are already served.
