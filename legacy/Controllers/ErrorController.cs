using System.Web.Mvc;

namespace Web.Controllers
{
    public class ErrorController : Controller // Umbraco.Web.Mvc.SurfaceController
    {
        [HandleError]
        // GET: Error
        public ActionResult Index()
        {
            return View();
        }

        [HandleError]
        public ActionResult PageNotFound()
        {
            return View();
        }
    }
}