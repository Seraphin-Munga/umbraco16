# AcfAfricanbank — Umbraco 8 → Umbraco 16 / .NET 9 migration

## Target

| Item | From | To |
|------|------|----|
| CMS | Umbraco 8.2.1 | Umbraco 16.5.1 |
| Runtime | .NET Framework 4.7.2 | .NET 9 |
| Project style | packages.config, non-SDK csproj | SDK-style, `<PackageReference>` |
| Backoffice | AngularJS | Lit / TypeScript Web Components |
| Database | `MDWSQL2016\SQL01` / `Umbraco8_AB_CMS_13Nov` (leave untouched) | `MTWSQL2019\SQL01` / `DTData` (empty / brand new) |
| DB migration strategy | — | **Fresh rebuild + content sync — content move is the LAST step** |

`DTData` is a new empty database — Umbraco 16 does a first-time install and builds the v16
schema itself. The v8 database is never connected to by the new app. SQL login auth
(username + password); credentials live in **user-secrets**, not in any committed file.

Old solution stays in place at `../Platform` for reference throughout.

## Strategy decision

We are **not** running the Umbraco 8→10 database upgrade chain. Instead:

1. Build a clean Umbraco 16 solution.
2. Recreate document types / data types / templates by hand (or via uSync).
3. Port all server code and views.
4. Rewrite the two backoffice customizations.
5. **Only at the end:** migrate real content + media from the v8 SQL Server DB
   (test run first, then a final sync at go-live).

## Status

### Done — Step 1: solution scaffold
- [x] `AcfAfricanbank.sln` created
- [x] `src/AcfAfricanbank.Web` — `dotnet new umbraco` (Umbraco.Cms 16.5.1, net9.0, SQLite for local dev)
- [x] `src/AcfAfricanbank.Core` — net9.0 class library, references `Umbraco.Cms.Web.Common` 16.5.1
- [x] Web project references Core
- [x] `dotnet build` succeeds (1 warning: NU1902 moderate advisory on Umbraco.Cms 16.5.1 — latest 16.x patch, no action available)
- [x] App boots on .NET 9 and serves the installer (`GET /` and `GET /umbraco` → 200)

### Done — Database target wired (auth: Windows Integrated)
DBA rule: **no SQL login is issued** — connect with your own Windows domain account
(Integrated Security). Connection string is set in user-secrets:

```
Server=MTWSQL2019\SQL01;Database=DTData;Integrated Security=true;TrustServerCertificate=True;Encrypt=True
provider = Microsoft.Data.SqlClient
```

- [x] SQLite dev DB removed
- [x] `dotnet user-secrets init` + connection string stored (no credentials in it)
- [x] `appsettings.Development.json` carries no connection string

### BLOCKER — cannot connect from the current dev machine
This Mac is **not domain-joined, has no Kerberos config, and cannot even resolve
`MTWSQL2019`** (not on the corp network / no VPN). Integrated Security from .NET on
macOS needs all of:
1. Network route to the server (corp LAN or VPN) + DNS resolution
2. `/etc/krb5.conf` with the AD realm
3. A ticket: `kinit you@AD.REALM` (verify with `klist`)
4. For the named instance `\SQL01`: SQL Browser (UDP 1434) reachable, or a fixed port +
   a registered SPN (`MSSQLSvc/mtwsql2019.<domain>:SQL01`)

**Recommended:** run every DB-connected step (installer, the migration chain, content
import) from a **Windows machine on the corp network**, where the domain account "just
works" — which is exactly what the DBA described. Use the Mac for code only.
Alternatives: configure Kerberos on the Mac (fiddly with named instances), or go back to
the DBA for a contained SQL login.

Nothing here blocks continued code porting (Steps 4–6, 10).

On first boot against an empty `DTData`: complete the installer at `/umbraco`, or add an
`Umbraco:CMS:Unattended:InstallUnattended` block (git-ignored dev file only).

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

- [ ] **Step 3 — Recreate doc types / data types / templates** in v16 (native tabs replace `Our.Umbraco.DocTypeFieldsets`)
- [ ] **Step 4 — Port controllers** (`../Platform/Web/Controllers/`, ~15):
  QuickLoans, Error, NewsletterFormSurface, CustomUmbracoDashboard, InvestmentCalculator,
  GenericFormSurface, Custom, Home, DocumentUpload, JSONWriter, Enterprise,
  UnsubscribeNewsletterFormSurface, SearchSurface
  - `SurfaceController` / `RenderMvcController` → `RenderController`, new DI ctors
  - `UmbracoApiController` → removed in v14+; use plain ASP.NET Core `[ApiController]`
  - `Global.asax.cs` + `Helpers/ApplicationStartup.cs` → `IComposer` + `INotificationHandler<T>`
- [ ] **Step 5 — Port views** (~150 `.cshtml`; no `.master`/`.ascx` in v16)
  - `@inherits` base class + namespace changes in every file
  - `_ViewImports.cshtml` for global usings
  - legacy Grid (`@Html.GetGridHtml`) → Block Grid if used
- [ ] **Step 6 — Regenerate ModelsBuilder models** (delete v8 `Web/Models/*.generated.cs`, set mode, regenerate, reattach custom partials)
- [ ] **Step 7 — Backoffice rewrites** (AngularJS → Web Components):
  - `App_Plugins/CustomUmbracoDashboard`
  - `RdaImagePicker` property editor
- [ ] **Step 8 — Package replacements** (see table below)
- [ ] **Step 9 — Config**: `web.config` + `connectionStrings.config` → `appsettings.json` (`Umbraco:CMS:*`); keep minimal `web.config` for IIS/ANCM
- [ ] **Step 10 — Test projects** (4 in old solution) → port to `Umbraco.Cms.Tests.*` base classes
- [ ] **Step 11 — Content + media migration** (last): v8 SQL Server → v16, test run then go-live sync
- [ ] **Step 12 — Build/deploy**: `dotnet publish` + ASP.NET Core Hosting Bundle on IIS; update CI

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

- Confirm whether the v8 site uses the legacy **Grid** editor (drives Step 5 scope).
- Inventory third-party Umbraco packages beyond DocTypeFieldsets / EzSearch (check `Web/App_Plugins` and `Web/bin` on the live box).
- Decide uSync vs. manual for doc-type recreation (Step 3) and content move (Step 11).
- `RdaImagePicker` — decide whether to rebuild as a custom editor or replace with the
  native Media Picker 3 + adjust converters/templates.
