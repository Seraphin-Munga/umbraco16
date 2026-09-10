using System;
using System.IO;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.WebPages;
using Umbraco.Core;
using System.Web;
using Umbraco.Core.Composing;
using Web.App_Start;
using Web.Controllers;
using Web.Models;
using System.Web.Routing;

namespace Web.Components
{
    public class CustomGlobal : Umbraco.Web.UmbracoApplication
    {
        protected override void OnApplicationError(object sender, EventArgs e)
        {
            //Exception exception = HttpContext.Current.Server.GetLastError();

            //HttpContext.Current.Response.Clear();
            //var httpException = new HttpException(404, exception.Message);
            //var routeData = new RouteData();
            //routeData.Values.Add("controller", "Error");

            //if (exception == null)
            //{
            //    routeData.Values.Add("action", "PageNotFound");
            //}
            //else
            //{
            //    switch (httpException.GetHttpCode())
            //    {
            //        case 404:
            //            routeData.Values.Add("action", "PageNotFound");
            //            break;
            //        default:
            //            routeData.Values.Add("action", "PageNotFound");
            //            break;
            //    }
            //}
            //routeData.Values.Add("error", exception);
            //HttpContext.Current.Server.ClearError();

            //var request = ((HttpApplication)sender).Request;
            //var response = ((HttpApplication)sender).Response;
            //var httpContext = new HttpContext(request, response);
            //using (var controller = new ErrorController())
            //{
            //    ((IController)controller).Execute(new RequestContext(new HttpContextWrapper(httpContext), routeData));
            //}

        }
    }

    [RuntimeLevel(MinLevel = RuntimeLevel.Run)]
    public class MyComposer : IUserComposer
    {
        public void Compose(Composition composition)
        {
            composition.Components().Append<MyComponent>();
        }
    }

    public class MyComponent : IComponent
    {
        public MyComponent()
        {

        }
        public void Initialize()
        {
            AreaRegistration.RegisterAllAreas();
            BundleConfig.RegisterBundles(BundleTable.Bundles);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            //  MvcApplication.Application_Error();
            // App_Start.BundleConfig.RegisterBundles(BundleTable.Bundles);
        }
        public class BundleConfig
        {
            public static void RegisterBundles(BundleCollection bundles)
            {
                bundles.Add(new StyleBundle("~/bundles/styles").Include(
                    "~/css/bootstrap.min.css",
                    "~/css/main.min.css",
                    "~/css/custom_main.min.css"
                ));
                new ScriptBundle("~/bundles/scripts")
                    .IncludeDirectory("~/scripts/", "*.min.js", true)
                    .IncludeDirectory("~/javascripts/", "*.min.js", true)
                    .IncludeDirectory("~/Common.JS.Library.Ab/Calculator/", "*.min.js", true);

                bundles.Add(new ScriptBundle("~/bundles/quickLoansJs").Include(
                   "~/scripts/smartWizard/jquery.smartWizard.min.js"));
                BundleTable.EnableOptimizations = false;
            }

        }
        protected void Application_Start()
        {
            RouteConfig.RegisterRoutes(RouteTable.Routes);
        }
        public class MvcApplication : HttpApplication
        {
            public static void Application_Start()
            {
                AreaRegistration.RegisterAllAreas();
                RouteConfig.RegisterRoutes(RouteTable.Routes);
                BundleConfig.RegisterBundles(BundleTable.Bundles);

                DisplayModeProvider.Instance.Modes.Clear();
                DisplayModeProvider.Instance.Modes.Add(new GoogleAmpDisplayMode());
                DisplayModeProvider.Instance.Modes.Add(new DefaultDisplayMode());
            }


            public static void Application_Error()
            {



                //var lastException = HttpContext.Current.Server.GetLastError();

                //var request = new HttpRequest(null, "http://localhost:50053/en/home", "");
                //var response = new HttpResponse(new StringWriter());
                //var httpContext = new HttpContext(request, response);


                //var wrappedContext = new HttpContextWrapper(httpContext);
                //wrappedContext.Response.StatusCode = (lastException as HttpException)?.GetHttpCode() ?? 500;
                //wrappedContext.Response.Clear();
                //wrappedContext.Response.TrySkipIisCustomErrors = true;
                //wrappedContext.Server.ClearError();

                //var routeData = new RouteData();
                //routeData.Values.Add("area", "");
                //routeData.Values.Add("controller", "Error");
                //routeData.Values.Add("action", "Index");
                //routeData.Values.Add("httpResponseCode", httpContext.Response.StatusCode);




                //IController errorController = DependencyResolver.Current.GetService<ErrorController>();
                //errorController.Execute(new RequestContext(wrappedContext, routeData));

                Exception exception = HttpContext.Current.Server.GetLastError();

                // HttpContext.Current.Response.Clear();
                var httpException = exception as HttpException;
                var routeData = new RouteData();
                routeData.Values.Add("controller", "Error");

                if (httpException == null)
                {
                    routeData.Values.Add("action", "PageNotFound");
                }
                else
                {
                    switch (httpException.GetHttpCode())
                    {
                        case 404:
                            routeData.Values.Add("action", "PageNotFound");
                            break;
                        default:
                            routeData.Values.Add("action", "PageNotFound");
                            break;
                    }

                    routeData.Values.Add("error", exception);
                    HttpContext.Current.Server.ClearError();

                    // IController errorController = DependencyResolver.Current.GetService<ErrorController>();

                    var request = new HttpRequest(null, "http://localhost:50053/en/home", "");
                    var response = new HttpResponse(new StringWriter());
                    var httpContext = new HttpContext(request, response);
                    using (var controller = new ErrorController())
                    {
                        ((IController)controller).Execute(
                        new RequestContext(new HttpContextWrapper(httpContext), routeData));
                    }

                }


                // errorController.Execute(new RequestContext(new HttpContextWrapper(httpContext), routeData));

            }
        }

        public static class HttpServerUtilityExtensions
        {
            // private static readonly Logger Logger = LogManager.GetCurrentClassLogger();

            public static void HandleError(HttpServerUtility server, HttpContext httpContext)
            {
                var currentController = " ";
                var currentAction = " ";
                var currentRouteData = RouteTable.Routes.GetRouteData(new HttpContextWrapper(httpContext));

                if (currentRouteData != null)
                {
                    if (currentRouteData.Values["controller"] != null && !String.IsNullOrEmpty(currentRouteData.Values["controller"].ToString()))
                        currentController = currentRouteData.Values["controller"].ToString();

                    if (currentRouteData.Values["action"] != null && !String.IsNullOrEmpty(currentRouteData.Values["action"].ToString()))
                        currentAction = currentRouteData.Values["action"].ToString();
                }

                var exception = server.GetLastError();
                // Logger.ErrorException(exception.Message, exception);

                var controller = DependencyResolver.Current.GetService<ErrorController>();
                var routeData = new RouteData();
                var action = "InternalServerError";

                if (exception is HttpException)
                {
                    var httpEx = exception as HttpException;

                    switch (httpEx.GetHttpCode())
                    {
                        case 404:
                            action = "NotFound";
                            break;

                        case 401:
                            action = "AccessDenied";
                            break;
                    }
                }

                httpContext.ClearError();
                httpContext.Response.Clear();
                httpContext.Response.StatusCode = exception is HttpException ? ((HttpException)exception).GetHttpCode() : 500;
                httpContext.Response.TrySkipIisCustomErrors = true;

                routeData.Values["controller"] = "Error";
                routeData.Values["action"] = action;

                controller.ViewData.Model = new HandleErrorInfo(exception, currentController, currentAction);
                ((IController)controller).Execute(new RequestContext(new HttpContextWrapper(httpContext), routeData));
            }
        }


        public void Terminate() { }
    }

}