using System;
using System.Data.SqlClient;
using System.Web.Helpers;
using System.Web.Mvc;
using Umbraco.Core.Scoping;
using Umbraco.Web.Mvc;
using Web.Models;

namespace Web.Controllers
{
    public class EnterpriseController : SurfaceController
    {
        private readonly IScopeProvider _scopeProvider;

        // GET: Enterprise
        public ActionResult Index()
        {
            return View();
        }


        [HttpPost]
        public ActionResult CreateSupplierInfo(EnterpriseSupplier es)
        {
            SqlConnection con = new SqlConnection("user id=ShopAdmin;password=ShopAdmin;database=commerce_app;Data Source=TMAROTHOLI1LP");
            SqlCommand cmd = new SqlCommand("INSERT into [dbo].[tbSupplier] ([Name]) VALUES (@EnterpriseName)", con);
            cmd.Parameters.AddWithValue("@EnterpriseName", es.EnterpriseName);
            try
            {
                con.Open();
                cmd.ExecuteNonQuery();
                con.Close();
                string message = "SUCCESS";
                return Json(new { Message = message, JsonRequestBehavior.AllowGet });
            }
            catch (Exception e)
            {

                string message = "failed";
                return Json(new { Message = message, JsonRequestBehavior.AllowGet });
            }

        }


        [HttpPost]
        [ValidateHeaderAntiForgeryToken]
        public JsonResult SaveEnterprise(EnterpriseSupplier supplier)
        {
            bool isConsentSaved = false;
            try
            {
                if (ModelState.IsValid)
                {
                    using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                    {
                        scope.Database.Insert<EnterpriseSupplier>(supplier);
                    }
                    isConsentSaved = true;
                }
                else
                {
                    Console.WriteLine("Model not valid");
                }
            }
            catch (Exception ex)
            {
                return Json(new { data = isConsentSaved.ToString(), error = false });
            }
            return Json(new { data = isConsentSaved.ToString(), error = false });
        }

        [HttpPost]
        [ValidateHeaderAntiForgeryToken]
        public JsonResult SaveEnterpriseDocuments(EnterpriseSupplier supplier)
        {
            int intReturnValue = 0;
            try
            {
                if (PostSave(supplier))
                {
                    intReturnValue = 1;
                }
                else
                {
                    intReturnValue = 0;
                }

            }
            catch (Exception ex)
            {
                return Json(new { data = intReturnValue, error = false });
            }
            return Json(new { data = intReturnValue, error = false });
        }

        private bool PostSave(EnterpriseSupplier enterprise)
        {
            bool blnReturnVal = false;
            try
            {
                var scope = _scopeProvider.CreateScope(autoComplete: true);
                if (enterprise.EnterpriseId > 0)
                    scope.Database.Update(enterprise);
                else
                    scope.Database.Save(enterprise);
                blnReturnVal = true;
            }
            catch (Exception e)
            {
                blnReturnVal = false;
            }
            return blnReturnVal;
        }

        [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
        public sealed class ValidateHeaderAntiForgeryTokenAttribute : FilterAttribute, IAuthorizationFilter
        {
            public void OnAuthorization(AuthorizationContext filterContext)
            {
                if (filterContext == null)
                {
                    throw new ArgumentNullException("filterContext");
                }

                var httpContext = filterContext.HttpContext;
                var cookie = httpContext.Request.Cookies[AntiForgeryConfig.CookieName];
                AntiForgery.Validate(cookie != null ? cookie.Value : null, httpContext.Request.Headers["__RequestVerificationToken"]);
            }
        }

    }
}