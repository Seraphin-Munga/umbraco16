using AcfAfricanbank.Core.Models.Forms;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Logging;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Infrastructure.Persistence;
using Umbraco.Cms.Web.Website.Controllers;

namespace AcfAfricanbank.Core.Controllers.Forms;

public class FloatingFormController : SurfaceController
{
    public FloatingFormController(
        IUmbracoContextAccessor umbracoContextAccessor,
        IUmbracoDatabaseFactory databaseFactory,
        ServiceContext services,
        AppCaches appCaches,
        IProfilingLogger profilingLogger,
        IPublishedUrlProvider publishedUrlProvider)
        : base(umbracoContextAccessor, databaseFactory, services, appCaches, profilingLogger, publishedUrlProvider)
    {
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Send(FloatingFormViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return CurrentUmbracoPage();
        }

        // TODO: original v8 controller did nothing with the model on success.
        // Wire up the actual send/notify logic here when porting the form.
        return RedirectToCurrentUmbracoPage();
    }
}
