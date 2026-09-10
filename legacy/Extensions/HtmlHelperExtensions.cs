using System;
using System.Configuration;
using System.IO;
using System.Web;
using System.Web.Configuration;
using System.Web.Mvc;

namespace Web.Extensions
{
    public static class HtmlHelperExtensions
    {
        public static bool IsDebug(this HtmlHelper htmlHelper)
        {
            var configSection = (CompilationSection)ConfigurationManager.GetSection("system.web/compilation");
            return configSection.Debug;
        }

        private static bool CanBrowserHandleWebPImages()
        {
            HttpRequest httpRequest = HttpContext.Current.Request;
            HttpBrowserCapabilities browser = httpRequest.Browser;

            if (browser.Type.Contains("Chrome") || browser.Type.Contains("Opera") || browser.Type.Contains("Android"))
            {
                return true;
            }

            return false;
        }

        public static MvcHtmlString PlaceImageBackground(this HtmlHelper helper, string imageUrl)
        {
            if (CanBrowserHandleWebPImages())
            {
                // Get the file type
                string fileType = Path.GetExtension(imageUrl);
                if (fileType != null)
                {
                    imageUrl = imageUrl.Replace(fileType, ".webp");
                }

                return new MvcHtmlString(String.Format("url('{0}') ", imageUrl));
            }

            return new MvcHtmlString(String.Format("url('{0}') ", imageUrl));
        }

        public static MvcHtmlString PlaceImage(this HtmlHelper helper, string imageUrl, string alt, string cssStyle)
        {
            if (CanBrowserHandleWebPImages())
            {
                // Get the file type
                string fileType = Path.GetExtension(imageUrl);
                if (fileType != null)
                {
                    imageUrl = imageUrl.Replace(fileType, ".webp");
                }

                return new MvcHtmlString(String.Format("<img src=\"{0}\" " + "alt=\"{1}\" " + "style=\"{2}\"  />", imageUrl, alt, cssStyle));
            }

            return new MvcHtmlString(String.Format("<img src=\"{0}\" " + "alt=\"{1}\" " + "style=\"{2}\"/>", imageUrl, alt, cssStyle));
        }
    }
}