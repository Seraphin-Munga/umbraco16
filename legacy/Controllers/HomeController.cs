using System.Web.Mvc;

namespace Web.Controllers
{
    [HandleError]
    public class HomeController : Umbraco.Web.Mvc.SurfaceController
    {
        [HandleError]

        // GET: Home
        public ActionResult Index()
        {
            var paheHome = Umbraco.Content(2808);
            return View("~/Views/home.cshtml", paheHome);
        }
    }
}