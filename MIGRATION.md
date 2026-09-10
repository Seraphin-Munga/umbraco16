# AcfAfricanbank — Umbraco 8 → Umbraco 16 / .NET 9 migration

## Target

| Item | From | To |
|------|------|----|
| CMS | Umbraco 8.2.1 | Umbraco 16.5.1 |
| Runtime | .NET Framework 4.7.2 | .NET 9 |
| Project style | packages.config, non-SDK csproj | SDK-style, `<PackageReference>` |
| Backoffice | AngularJS | Lit / TypeScript Web Components |
| Database | `MDWSQL2016\SQL01` / `Umbraco8_AB_CMS_13Nov` (leave untouched) | `MTWSQL2019\SQL01` / `Umbraco16_AB_CMS_10Sept` |
| DB auth | SQL login `UmbracoDev` | SQL login `UmbracoDev` (same) — provider `Microsoft.Data.SqlClient` |
| DB migration strategy | — | **Option A — run Umbraco's DB upgrade chain on a copy (8.18 → 10 → 16)** |

For Option A, `Umbraco16_AB_CMS_10Sept` must be **seeded with a restore of
`Umbraco8_AB_CMS_13Nov`** before the v16 app runs against it. The Umbraco 16 app then runs
migrations that transform that data to the v16 schema — all content, doc types, data
types, media references, members, dictionary, languages, redirects carry over. The live v8
DB is never touched.

Connection string is in **user-secrets** on each dev machine (not committed):
`Server=MTWSQL2019\SQL01;Database=Umbraco16_AB_CMS_10Sept;User Id=UmbracoDev;Password=…;TrustServerCertificate=True;Encrypt=True`
plus `umbracoDbDSN_ProviderName = Microsoft.Data.SqlClient`.

Old solution stays in place at `../Platform` for reference throughout.

## Strategy decision — Option A (chosen 2026-09-10)

**In-place upgrade of the v8 project is impossible** (different runtime, different web
framework, CMS was rewritten at v9). So: migrate the **database** up the version chain,
and port the **code** into the new v16 project on top of the migrated schema.

1. Upgrade a **restored copy** of the v8 DB to the latest Umbraco 8 (**8.18.x**) — required
   baseline for the v10 migration.
2. Migrate that DB to **Umbraco 10** using HQ's "Migrate from Umbraco 8" guide.
3. Point the **Umbraco 16** project at the v10 DB; let it run all 10→16 migrations on boot.
4. Copy the `media` folder across; rebuild Examine indexes.
5. Port code (controllers, views, ModelsBuilder models, backoffice) against the now-migrated
   content. No doc types recreated by hand — they come across in the DB.

### Environment required for the DB steps
- A **Windows machine on the corp network** (Integrated Auth to `MTWSQL2019\SQL01`; also
  needed to run the .NET Framework v8.18 app for step 1).
- `Umbraco16_AB_CMS_10Sept` **restored from the v8 backup** — DBA action (if not already).
- The v8 `media` folder from the live server.

## Status

### Done — Step 1: solution scaffold
- [x] `AcfAfricanbank.sln` created
- [x] `src/AcfAfricanbank.Web` — `dotnet new umbraco` (Umbraco.Cms 16.5.1, net9.0)
- [x] `src/AcfAfricanbank.Core` — net9.0 class library, references `Umbraco.Cms.Web.Website` 16.5.1
- [x] Web project references Core
- [x] `dotnet build` succeeds (1 warning: NU1902 moderate advisory on Umbraco.Cms 16.5.1 — latest 16.x patch, no action available)
- [x] App boots on .NET 9 and serves the installer (`GET /` and `GET /umbraco` → 200)

### Done — Database target wired (SQL login)
Target DB: `MTWSQL2019\SQL01` / **`Umbraco16_AB_CMS_10Sept`**, SQL login `UmbracoDev`.
Stored in user-secrets on the dev machine (not committed); provider updated from the v8
config's `System.Data.SqlClient` → **`Microsoft.Data.SqlClient`** (required for v16).

- [x] SQLite dev DB removed
- [x] `dotnet user-secrets set` — connection string + provider name
- [x] `appsettings.Development.json` carries no connection string

Note: the DB password was shared in plain text; consider rotating it after the migration.

### BLOCKER — cannot connect from the current dev machine
This Mac cannot resolve `MTWSQL2019` (home network, no VPN / corp LAN). Auth is now a SQL
login so no Kerberos is needed — any machine **with a network route to the server** can
connect. Until this Mac is on the corp network/VPN, DB steps run on a machine that is.

### Outstanding requests to the DBA / infra
- [ ] Restore `Umbraco8_AB_CMS_13Nov` → **`Umbraco16_AB_CMS_10Sept`** on `MTWSQL2019\SQL01`
  (unless it is already seeded), with `UmbracoDev` granted `db_owner`.
- [ ] Provide a copy of the live `~/media` folder from the v8 web server.

### Done — Step 2: ported `AcfAfricanbank.Core`
`Umbraco.Cms.Web.Website` 16.5.1 package ref added. Solution builds clean (0 warnings in Core).

| New file | From v8 | Notes |
|---|---|---|
| `Models/Forms/FloatingFormViewModel.cs` | same | copied; non-null string defaults added |
| `Models/CustomDataType/RdaImagePicker.cs` | same | namespace → `Umbraco.Cms.Core.Models.PublishedContent`; nullable props |
| `Utilities/ExtensionMethods.cs` | same | `GroupBy(itemsPerGroup)` reimplemented with `Select`+index (single enumeration; same result) |
| `Utilities/MobileDetection.cs` | same | **behaviour change**: was a broken `static` using the removed `Current` locator → now an injectable service taking `IHttpContextAccessor`; reads real `User-Agent` header + `?mobile=true` override |
| `Composing/CoreComposer.cs` | new | registers `MobileDetection` as scoped |

Dropped: `Utilities/Helper.cs` (empty class), `Properties/AssemblyInfo.cs` (SDK-generated),
`Utilities/CustomPropertyConverters/RdaImagePickerPropertyConverter.cs` (was 100% commented
out in v8 — revive only if `RDA.ImagePicker` is found in real content).

Follow-ups for the Web port:
- callers of `MobileDetection.IsMobileDevice()` must now resolve it from DI (inject into
  controller / `@inject` in views) instead of calling it statically.

### Done — v8 source imported to `legacy/` (reference, not compiled)
The old `Web/` code lives in `legacy/` so the port happens in this repo. It is **outside
the solution and does not build** (`System.Web` / .NET Framework). See `legacy/README.md`
for the folder→port-target map. Static front-end assets (css/js/fonts/images,
`Common.JS.Library`) were copied into `src/AcfAfricanbank.Web/wwwroot/` and are served
as-is. ~431 `.cs` files are staged in `legacy/` for porting once ModelsBuilder can
regenerate against the migrated doc types (Steps 5–6).

The **~150 views** were copied straight into `src/AcfAfricanbank.Web/Views/` (not
`legacy/`) — still v8 syntax, don't render yet, but Razor isn't build-compiled so the
solution stays green. Scaffolded Umbraco partials (`_ViewImports`, `Partials/blockgrid`,
`Partials/blocklist`) were preserved.

### Remaining steps — Option A (DB upgrade chain)

The two tracks run in parallel once the DBA has restored `DTData`; the code track lands
on top of the migrated schema.

#### Database track (Windows + corp network)
- [ ] **Step 3 — v8 copy → Umbraco 8.18** (on `DTData` copy)
  - Take the old `../Platform` solution, update `UmbracoCms` 8.2.1 → 8.18.x, point it at
    the `DTData` copy, run once so it migrates the DB to the 8.18 schema. Back up after.
  - Pre-clean datatypes that use editors with no v10 handler (`RDA.ImagePicker`,
    DocTypeFieldsets, EzSearch): either install a v10-compatible build or switch those
    datatypes to a built-in editor **before** the v10 step.
- [ ] **Step 4 — DB migration to Umbraco 10** (HQ "Migrate from Umbraco 8" guide)
  - New throwaway Umbraco 10 project → point at the 8.18 `DTData` → `Umbraco:CMS:Unattended:UpgradeUnattended=true` → boot → migrations transform schema+data to v10.
  - Resolve migration errors (unknown property editors, packages). Verify content tree,
    media, members in the v10 backoffice.
- [ ] **Step 5 — DB migration 10 → 16**
  - Point `src/AcfAfricanbank.Web` (this repo) at the v10 `DTData`, `UpgradeUnattended=true`,
    boot → runs all 10→16 migrations in one pass. Verify backoffice loads.
  - Copy the v8 `media` folder into `src/AcfAfricanbank.Web/wwwroot/media`.
  - Rebuild Examine indexes.

#### Code track (Mac, on top of the migrated DB)
- [ ] **Step 6 — Regenerate ModelsBuilder models** from the migrated doc types (set mode to
  SourceCode; models replace the v8 `Web/Models/*.generated.cs`). Reattach custom partials.
- [ ] **Step 7 — Port controllers** (`../Platform/Web/Controllers/`, ~15):
  QuickLoans, Error, NewsletterFormSurface, CustomUmbracoDashboard, InvestmentCalculator,
  GenericFormSurface, Custom, Home, DocumentUpload, JSONWriter, Enterprise,
  UnsubscribeNewsletterFormSurface, SearchSurface
  - `SurfaceController` / `RenderMvcController` → `RenderController`, new DI ctors
  - `UmbracoApiController` → removed in v14+; use plain ASP.NET Core `[ApiController]`
  - `Global.asax.cs` + `Helpers/ApplicationStartup.cs` → `IComposer` + `INotificationHandler<T>`
- [ ] **Step 8 — Port views** (~150 `.cshtml`; no `.master`/`.ascx` in v16)
  - `@inherits` base class + namespace changes in every file; `_ViewImports.cshtml` usings
  - legacy Grid (`@Html.GetGridHtml`) → still renders in v13 but **removed in v14+**; the
    10→16 migration will surface this. Convert Grid content to Block Grid.
- [ ] **Step 9 — Backoffice rewrites** (AngularJS → Web Components):
  - `App_Plugins/CustomUmbracoDashboard`
  - `RdaImagePicker` property editor (or remap its datatype to Media Picker 3 in Step 3)
- [ ] **Step 10 — Package replacements** (see table below) + config: `web.config` /
  `connectionStrings.config` → `appsettings.json` (`Umbraco:CMS:*`); keep minimal
  `web.config` for IIS/ANCM
- [ ] **Step 11 — Test projects** (4 in old solution) → port to `Umbraco.Cms.Tests.*` base classes
- [ ] **Step 12 — Build/deploy**: `dotnet publish` + ASP.NET Core Hosting Bundle on IIS; update CI
- [ ] **Step 13 — Go-live**: re-run Steps 3–5 on a **fresh** restore of the (by-then-current)
  v8 production DB so no editor changes are lost, then cut over.

## Package replacement map

| Umbraco 8 package | Umbraco 16 |
|------------------|-----------|
| LightInject (+ .Mvc/.Web/.WebApi/.Annotation) | built-in MS DI — remove |
| Microsoft.Owin.* / Microsoft.AspNet.Identity.* | ASP.NET Core Identity (built into Umbraco) |
| ClientDependency / ClientDependency-Mvc5 | Smidge (built in) |
| ImageProcessor / ImageProcessor.Web(.Config) | SixLabors.ImageSharp (built in) |
| Examine 1.0.1 / Lucene.Net 3.0.3 | Examine 3.x (built in) |
| MiniProfiler 4.x | built in |
| Serilog.* (manual wiring) | built in (Umbraco configures Serilog) |
| Microsoft.AspNet.Mvc / WebApi / Razor / WebPages | ASP.NET Core MVC (SDK) |
| NPoco 3.9.4 | bundled with Umbraco.Cms.Infrastructure |
| Our.Umbraco.DocTypeFieldsets 0.5.1 | **no port** — native doc-type tabs/groups |
| EzSearch (see `EzSearch` model) | check for v16 build, else custom Examine search |
| Umbraco.SqlServerCE | drop entirely |
| bootstrap 3 / jQuery / Modernizr (front-end) | keep as-is (unaffected by .NET) |

## Known blockers / decisions still open

- **DBA:** restore `Umbraco8_AB_CMS_13Nov` → `DTData` + `db_owner` for the dev; hand over
  the v8 `media` folder. (Nothing on the DB track can start until this exists.)
- **Windows box on the corp network** for Steps 3–5 (runs the v8.18 app + Integrated Auth).
- Confirm whether the v8 site uses the legacy **Grid** editor — it blocks the 10→16 step
  (Grid removed in v14) and drives Step 8 scope.
- Inventory third-party Umbraco packages / property editors on the live box
  (`Web/App_Plugins`, `Web/bin`) so datatypes referencing dead editors are cleaned in Step 3.
- `RDA.ImagePicker` — decide before Step 3: install a v10-compatible build, or remap that
  datatype to Media Picker 3 (simpler, then Step 9 just drops the custom editor).
- Umbraco version to migrate *through*: 8.18 → 10 is mandated; 10 → 16 in one boot is the
  plan — fall back to 10 → 13 (LTS) → 16 if the single jump throws.
