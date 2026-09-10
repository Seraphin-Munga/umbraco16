using Umbraco.Web.Mvc;

namespace Web.Controllers
{
    public class GenericFormSurfaceController : SurfaceController
    {

        //public ActionResult RenderForm(GenericFormModel model, string id)
        //{
        //    /*if (string.IsNullOrWhiteSpace((IEnumerable<Web.Models.GenericFormModel>)model.Content["ebankITSubjectValues"]?.ToString()))
        //        return PartialView("_ebankitGenericForm", model);

        //    var optnsString = model.Content["ebankITSubjectValues"].ToString();
        //    model.FormFields.SubjectOptions = new List<SelectListItem>
        //    {
        //        new SelectListItem()
        //        {
        //            Text = ResourceHelper.GetResource("GenericContactForm_SelectOneOption"),
        //            Value = ""
        //        }
        //    };
        //    var stringSeparators = new string[] { "\r\n", "\n" };
        //    var lines = optnsString.Split(stringSeparators, StringSplitOptions.None);

        //    foreach (var item in lines)
        //    {
        //        model.FormFields.SubjectOptions.Add(new SelectListItem() { Text = item, Value = item });
        //    }*/

        //    if (model.FormFields.SubjectOptions.Count() != 2)
        //        return PartialView("_ebankitGenericForm", model);

        //    var selectListItem = model.FormFields.SubjectOptions.LastOrDefault();
        //    if (selectListItem != null)
        //        model.FormFields.Subject = selectListItem.Text;

        //    return PartialView("_ebankitGenericForm", model);
        //}

        //[HttpPost]
        //[ValidateAntiForgeryToken]
        //public ActionResult HandleForm(GenericFormModel model)
        //{
        //    return CurrentUmbracoPage();
        //}
    }
}