using System.Web.Mvc;
using Umbraco.Web.Mvc;

namespace Web.Controllers
{
    [PluginController("CustomUmbracoDashboard")]
    [OutputCache(NoStore = true, Duration = 0)]
    public class CustomUmbracoDashboardController : SurfaceController
    {
        public ActionResult DashboardLayout()
        {
            var pageObj = Umbraco.Content(15877);
            // return View("/App_Plugins/CustomUmbracoDashboard/Views/shared/_callMeBackForm.cshtml", pageObj);
            return PartialView("/App_Plugins/CustomUmbracoDashboard/Views/shared/index.html");
        }
    }
}