using StackExchange.Profiling;
using System.Globalization;
using System.Linq;
//using umbraco.cms.businesslogic.web;

namespace Web.Helpers
{
    public class ResourceHelper
    {
        public static string GetResource(string resource)
        {
            //TODO GET CURRENT LANG using lang =1 first language
            int langId = 2;

            return GetResource(resource, langId);
        }

        public static string GetResource(string resource, int langId)
        {
            var profiler = MiniProfiler.Current; // it's ok if this is null
            using (profiler.Step(string.Format(CultureInfo.InvariantCulture, "GetResource [{0}].[{1}]", resource, langId)))
            {
                string value = (string)CacheFactory.GetValue(resource + langId);
                if (string.IsNullOrWhiteSpace(value))
                {
                    var dic = Umbraco.Core.Composing.Current.Services.LocalizationService.GetDictionaryItemByKey(resource);
                    if (dic == null)
                    {
                        ///there is no resource in dictionary
                        value = string.Empty;
                    }
                    else
                    {
                        var transl = dic.Translations.ToList();
                        if (transl == null || transl.FirstOrDefault() == null)
                        {
                            ///there is no Translation resource dictionary
                            value = string.Empty;
                        }
                        else
                        {
                            value = transl.FirstOrDefault().Value;
                        }
                    }

                    if (string.IsNullOrEmpty(value))
                    {
                        value = "NoDictionary:[" + resource + "]";
                    }
                    else
                    {
                        CacheFactory.Insert(string.Format(CultureInfo.InvariantCulture, "{0}_{1}", resource, langId), value);
                    }
                }
                return value;
            }
        }

        /*public static CultureInfo GetCulture(IPublishedContent content)
        {
            List<IPublishedContent> ancestors = content.Ancestors().ToList();
            Umbraco.Web.Routing.Domain[] domains = Umbraco.Web.Routing.Domain.GetDomains(true).ToArray<Umbraco.Web.Routing.Domain>();

            foreach (IPublishedContent cnt in ancestors)
            {
                Umbraco.Web.Routing.Domain nodeDomain = domains.Where(d => d.RootNodeId == cnt.Id).FirstOrDefault();
                if (nodeDomain != null)
                    return new CultureInfo(nodeDomain.Language.CultureAlias);
            }
            return new CultureInfo(domains.First().Language.CultureAlias);
        }*/
    }
}