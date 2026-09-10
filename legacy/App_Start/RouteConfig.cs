using System.Web.Mvc;
using System.Web.Routing;

namespace Web.App_Start
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapRoute(
            "Default", // Route name
            "en/home/", // URL 
            new { controller = "Home", action = "Index" }); // Parameter defaults


            //routes.MapRoute(
            //    name: "PageForNotFound",
            //    url: "en/home/Error404",
            //    defaults: new { controller = "Error", action = "PageNotFound" }
            //);
        }
    }
}