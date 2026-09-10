using System;
using System.Web.Mvc;
using Web.Models;

namespace Web.Controllers
{
    public class UnsubscribeNewsletterFormSurfaceController : Controller
    {
        public ActionResult RenderForm(UnsubscribeNewsletterFormModel model, string id)
        {
            return PartialView("_ebankitUnsubscribeNewsletterForm", model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult HandleForm(UnsubscribeNewsletterFormModel model)
        {
            return CurrentUmbracoPage();
        }
        private ActionResult CurrentUmbracoPage()
        {
            throw new NotImplementedException();
        }
    }
}