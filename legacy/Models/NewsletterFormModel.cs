using System.Collections.Generic;
using System.Web.WebPages.Html;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Web.Models;
using Web.CustomValidators;

namespace Web.Models
{
    public class NewsletterFormFields
    {
        [UmbracoRequired("CellPhoneNumberRequiredErrorMessage")]
        public string CellPhoneNumber { get; set; }

        [UmbracoRequired("EmailRequiredErrorMessage")]
        public string Email { get; set; }

        [UmbracoRequired("FirstNameRequiredErrorMessage")]
        public string FirstName { get; set; }

        public string Interest { get; set; }
        public List<SelectListItem> InterestOptions { get; set; }

        [UmbracoRequired("LastNameRequiredErrorMessage")]
        public string LastName { get; set; }

        [UmbracoRequired("OrganisationRequiredErrorMessage")]
        public string Organization { get; set; }

        public string RoleOrganization { get; set; }
        public List<SelectListItem> RoleOrganizationOptions { get; set; }
    }

    public class NewsletterFormModel : ContentModel
    {
        //public NewsletterFormModel()
        //    : this(new Umbraco.Web.Composing.Current.UmbracoHelper.TypedContent(Umbraco.Web.Composing.Current.UmbracoHelper.AssignedContentItem.Id))
        //{
        //}

        public NewsletterFormModel(IPublishedContent content)
            : base(content)
        {
            FormFields = new NewsletterFormFields();
        }

        public string ErrorMessage { get; set; }

        public NewsletterFormFields FormFields { get; set; }

        public bool HasError { get; set; }

        public bool ShowFormOnError { get; set; }

        public string SuccessMessage { get; set; }
    }
}