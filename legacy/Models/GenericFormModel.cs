using System.Collections.Generic;
using System.Web.WebPages.Html;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Web.Models;
using Web.CustomValidators;

namespace Web.Models
{
    public class GenericFormModel : ContentModel
    {
        //public GenericFormModel()
        //    : this(new UmbracoHelper(UmbracoContext.Current).TypedContent(UmbracoContext.Current.PageId))
        //{

        //}
        public GenericFormModel(IPublishedContent content)
            : base(content)
        {
            FormFields = new FormFields();

        }

        public bool HasError { get; set; }
        public bool ShowFormOnError { get; set; }
        public string ErrorMessage { get; set; }
        public string SuccessMessage { get; set; }

        public FormFields FormFields { get; set; }

    }

    public class FormFields
    {
        public string Subject { get; set; }
        public List<SelectListItem> SubjectOptions { get; set; }


        [UmbracoRequired("FirstNameRequiredErrorMessage")]
        [RegexValidator("FirstNameOnlyAlphanumericAndUnderScore", "^[a-zA-Z0-9_]*$")]
        public string FirstName { get; set; }

        [UmbracoRequired("LastNameRequiredErrorMessage")]
        [RegexValidator("LastNameOnlyAlphanumericAndUnderScore", "^[a-zA-Z0-9_]*$")]
        public string LastName { get; set; }

        [UmbracoRequired("ID_NumberRequiredErrorMessage")]
        [RegexValidator("ID_Number13DigitsErrorMessage", @"^(\d{13})?$")]
        public string IdNumber { get; set; }

        [UmbracoRequired("CellPhoneRequiredErrorMessage")]
        [RegexValidator("CellPhone10DigitsErrorMessage", @"^(\d{10})?$")]
        public string CellPhone { get; set; }

        [UmbracoRequired("EmailRequiredErrorMessage")]
        [UmbracoEmail(ErrorMessageDictionaryKey = "EmailBadFormatErrorMessage")]
        public string Email { get; set; }

        [UmbracoRequired("MessageRequiredErrorMessage")]
        public string Message { get; set; }

        public string FacebookId { get; set; }

    }
}