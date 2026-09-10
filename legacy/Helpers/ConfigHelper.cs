using System.Configuration;
using System.Globalization;

namespace Web.Helpers
{
    public static class ConfigHelper
    {
        public readonly static int SearchMinChars = int.Parse(ConfigurationManager.AppSettings["ebankit.Portal.Search.MinChars"], CultureInfo.InvariantCulture);
        public readonly static int SearchMaxResults = int.Parse(ConfigurationManager.AppSettings["ebankit.Portal.Search.MaxResults"], CultureInfo.InvariantCulture);
        public readonly static string SearchContentTypesToIgnore = ConfigurationManager.AppSettings["ebankit.Portal.Search.ContentTypesToIgnore"];
        public readonly static string SearchURLToIgnore = ConfigurationManager.AppSettings["ebankit.Portal.Search.URLToIgnore"];
    }
}