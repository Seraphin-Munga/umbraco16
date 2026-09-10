using System;
using System.Web;
namespace Web.Helpers
{
    public class ContainerViewModel
    {
        public Func<object, IHtmlString> HTMLContent { get; set; }
        public Func<object, IHtmlString> HTMLContent2 { get; set; }
    }
}