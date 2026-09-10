using System.Collections.Generic;
using System.Linq;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Web;
using Umbraco.Web.PublishedModels;
using Web.Models.KnowledgeCentreModels;
using ContentModels = Umbraco.Web.PublishedModels;

namespace Web.Helpers
{
    public class ViewModelHelper
    {

        public List<ResultsModel> GetResultsModels()
        {
            List<ResultsModel> resultsModels = new List<ResultsModel>();

            return resultsModels;
        }
        public static TabBody GetGenericContent(PageManageYourAccount page)
        {
            TabBody tabBody = null;
            try
            {
                var heroBodyTabGroup = page.Children.Where(c => c is HeroBody).FirstOrDefault().Children?.Where(cc => cc is TabGroup).FirstOrDefault()
                            .Children.Where(x => x is TabHeader).FirstOrDefault().Children.Where(xx => xx is TabBody).FirstOrDefault();
                var tabBodyContent = (ICollection<IPublishedContent>)heroBodyTabGroup.Value("tabBodyContent");
                tabBody = (TabBody)tabBodyContent.FirstOrDefault();
            }
            catch
            {
                tabBody = null;
            }
            return tabBody;
        }

        public static NCtabGenericContent GetGenericTabContent(PageManageYourAccount page)
        {
            NCtabGenericContent genericTabBody = null;
            try
            {
                var heroBodyTabGroup = page.Children.Where(c => c is HeroBody).FirstOrDefault().Children?.Where(cc => cc is TabGroup).FirstOrDefault()
                            .Children.Where(x => x is TabHeader).FirstOrDefault().Children.Where(xx => xx is TabBody).FirstOrDefault();
                var tabBodyContent = (ICollection<IPublishedContent>)heroBodyTabGroup.Value("tabBodyContent");
                genericTabBody = (NCtabGenericContent)tabBodyContent.FirstOrDefault();
            }
            catch
            {
                genericTabBody = null;
            }
            return genericTabBody;
        }

        public ICollection<IPublishedContent> ReturnDocumentArchives<T>(T heroBody)
        {
            var _heroBody = (IPublishedContent)heroBody;

            var tabBody = (ContentModels.TabBody)_heroBody.Children(x => x is ContentModels.TabBody).FirstOrDefault();
            var documentArchive = (IEnumerable<IPublishedContent>)tabBody.TabBodyContent.Where(c => c.ContentType.Alias == "nCTabGenericContent").FirstOrDefault().Value("sectionContent");

            ICollection<IPublishedContent> documents = new List<IPublishedContent>();
            //foreach (var documentCollection in (ICollection<object>)documentArchive.Select(x => x.GetProperty("documents")).Select(cc => cc.Value).ToList())
            // {
            //     foreach (var _documentData in (ICollection<IPublishedContent>)documentCollection)
            //     {
            //         documents.Add(_documentData);
            //     }
            // }
            return documents;
        }
    }
}