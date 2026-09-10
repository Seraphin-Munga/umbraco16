using System.Collections.Generic;
using System.Web.Mvc;
using Umbraco.Web.Mvc;
using Web.Helpers;
using Web.Models;

namespace Web.Controllers
{
    public class NewsletterFormSurfaceController : SurfaceController
    {
        public ActionResult RenderForm(NewsletterFormModel model, string id)
        {
            model.FormFields.RoleOrganizationOptions = new List<System.Web.WebPages.Html.SelectListItem>
            {
                new System.Web.WebPages.Html.SelectListItem()
                {
                    Text = ResourceHelper.GetResource("NewsletterForm_RoleOrganisation_Placeholder"),
                    Value = ""
                },
                new System.Web.WebPages.Html.SelectListItem() {Text = "Executive", Value = "Executive"},
                new System.Web.WebPages.Html.SelectListItem() {Text = "Senior Management", Value = "Senior Management"},
                new System.Web.WebPages.Html.SelectListItem()
                {
                    Text = "Portfolio Management",
                    Value = "Portfolio Management"
                },
                new System.Web.WebPages.Html.SelectListItem() {Text = "Analyst", Value = "Analyst"},
                new System.Web.WebPages.Html.SelectListItem() {Text = "Other", Value = "Other"}
            };

            model.FormFields.InterestOptions = new List<System.Web.WebPages.Html.SelectListItem>
            {
                new System.Web.WebPages.Html.SelectListItem()
                {
                    Text = ResourceHelper.GetResource("NewsletterForm_Interest_Placeholder"),
                    Value = ""
                },
                new System.Web.WebPages.Html.SelectListItem() {Text = "Debt Investor", Value = "Debt Investor"},
                new System.Web.WebPages.Html.SelectListItem() {Text = "Equity Investor", Value = "Equity Investor"},
                new System.Web.WebPages.Html.SelectListItem()
                {
                    Text = "Debt & Equity Investor",
                    Value = "Debt & Equity Investor"
                },
                new System.Web.WebPages.Html.SelectListItem() {Text = "Media", Value = "Media"},
                new System.Web.WebPages.Html.SelectListItem() {Text = "Other", Value = "Other"}
            };

            return PartialView("_ebankitNewsletterForm", model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult HandleForm(NewsletterFormModel model)
        {
            return CurrentUmbracoPage();
        }
    }
}