using Umbraco.Core.Models.PublishedContent;
using Umbraco.Web.Models;
using Web.CustomValidators;

namespace Web.Models
{
    public class UnsubscribeNewsletterFormFields
    {
        [UmbracoRequired("EmailRequiredErrorMessage")]
        public string Email { get; set; }
    }

    public class UnsubscribeNewsletterFormModel : ContentModel
    {
        //public UnsubscribeNewsletterFormModel()
        //    : this(new UmbracoHelper(UmbracoContext.Current).TypedContent(UmbracoContext.Current.PageId))
        //{
        //}

        public UnsubscribeNewsletterFormModel(IPublishedContent content)
            : base(content)
        {
            FormFields = new UnsubscribeNewsletterFormFields();
        }

        public string ErrorMessage { get; set; }

        public UnsubscribeNewsletterFormFields FormFields { get; set; }

        public bool HasError { get; set; }

        public bool ShowFormOnError { get; set; }

        public string SuccessMessage { get; set; }
    }
}