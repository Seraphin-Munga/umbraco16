using Examine;
using Examine.Search;
//using Examine.SearchCriteria;
//using Examine.SearchCriteria;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using Umbraco.Core.Models;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Core.Services;
using Umbraco.Web;
using Umbraco.Web.Mvc;
using Umbraco.Web.PublishedModels;
using Web.Entities;
using Web.Helpers;
using Web.Models.KnowledgeCentreModels;

namespace Web.Controllers
{
    public class SearchSurfaceController : SurfaceController
    {
        private static string docTypeAliases = "pageCampaign";
        private static string fieldPropertyAliases = "nodeName,heroBody,heroBodyFAQ,tabBody,Video Hub";

        String FAQs = "Frequently Asked Questions";
        String knCentre = "Video Hub";
        private UmbracoHelper _uHelper { get; set; }
        private IExamineManager _examineManager { get; set; }
        private SearchHelper _searchHelper
        {
            get
            {
                return new SearchHelper(_uHelper, _examineManager); // new UmbracoHelper(Umbraco.AssignedContentItem)
            }
        }
        private IContentTypeService _contentTypeService;
        private ISearchResults _searchResults;

        public SearchSurfaceController(IExamineManager examineManager)
        {
            // and now we have an instance of an ExamineManager we can use in our controller actions...
            _examineManager = examineManager;
        }

        public SearchSurfaceController(UmbracoHelper uHelper, IExamineManager examineManager, IContentTypeService contentTypeService)
        {
            // and now we have an instance of an ExamineManager we can use in our controller actions...
            _uHelper = uHelper;
            _examineManager = examineManager;
            _contentTypeService = contentTypeService;
        }

        public SearchSurfaceController(IExamineManager examineManager, IContentTypeService contentTypeService, ISearchResults searchResults)
        {
            // and now we have an instance of an ExamineManager we can use in our controller actions...
            _examineManager = examineManager;
            _contentTypeService = contentTypeService;
            _searchResults = searchResults;
        }


        private string PartialViewPath(string name)
        {
            return $"~/Views/Partials/{name}.cshtml";
        }
        private List<SearchGroup> GetSearchGroups(SearchViewModel model)
        {
            List<SearchGroup> searchGroups = null;
            if (!string.IsNullOrEmpty(model.FieldPropertyAliases))
            {
                searchGroups = new List<SearchGroup>();
                searchGroups.Add(new SearchGroup(model.FieldPropertyAliases.Split(','), model.SearchTerm.Split(' ')));
            }
            return searchGroups;
        }

        #region Controller Actions
        [AcceptVerbs(HttpVerbs.Get | HttpVerbs.Post)]
        public ActionResult RenderSearchForm(string query, int pageSize, int pagingGroupSize)
        {
            SearchViewModel model = new SearchViewModel();
            if (!string.IsNullOrEmpty(query))
            {
                model.SearchTerm = query;
                model.DocTypeAliases = docTypeAliases;
                model.FieldPropertyAliases = fieldPropertyAliases;
                model.PageSize = pageSize;
                model.PagingGroupSize = pagingGroupSize;
                model.SearchGroups = GetSearchGroups(model);
                model.SearchResults = _searchHelper.GetSearchResults(model, Request.Form.AllKeys);
            }

            return PartialView(PartialViewPath("_searchForm"), model);
        }
        private Dictionary<string, string> ReturnJSONSearchNodes()
        {
            string jsonPath = AppDomain.CurrentDomain.BaseDirectory + @"Content\";
            string json = System.IO.File.ReadAllText(jsonPath + @"searchNodes.json");
            return JsonConvert.DeserializeObject<Dictionary<string, string>>(json);
        }
        [HttpPost]
        public JsonResult SubmitSearchForm(SearchViewModel model, FormCollection form, int? pageNumber)
        {
            Dictionary<string, string> valuePair = model.WhichPlatforms;
            Dictionary<string, string> deviceViews = model.WhichView;
            model.WhichPlatforms = new Dictionary<string, string>();
            model.WhichView = new Dictionary<string, string>();
            if (valuePair != null)
            {
                foreach (var _keyValue in valuePair)
                {
                    SearchHelper.ReturnJSONSearchNodes().ToList().ForEach(x =>
                    {
                        if (x.Key == _keyValue.Value)
                        {
                            model.WhichPlatforms.Add(_keyValue.Value, x.Value);
                        }
                    });
                }
            }

            if (deviceViews != null)
            {
                foreach (var _keyValue in deviceViews)
                {
                    SearchHelper.ReturnJSONSearchNodes().ToList().ForEach(x =>
                    {
                        if (x.Key == _keyValue.Value)
                        {
                            model.WhichView.Add(_keyValue.Value, x.Value);
                        }
                    });
                }
            }
            SearchResultsModel renderResults = null;
            model.SearchTerm = Request["searchstring"] ?? model.SearchTerm;
            // if (pageNumber != null) { model.SearchResults.PageNumber = (int)pageNumber; }
            if (ModelState.IsValid)
            {
                if (!string.IsNullOrEmpty(model.SearchTerm))
                {
                    // Default search if User didn't select any
                    if (model.WhichPlatforms.Count == 0) { model.WhichPlatforms = SearchHelper.ReturnJSONSearchNodes(); }
                    if (model.WhichView.Count == 0) { model.WhichView = SearchHelper.ReturnJSONSearchPlatforms(); } // please change this to Nodes

                    model.SearchTerm = model.SearchTerm;
                    model.DocTypeAliases = docTypeAliases;
                    model.FieldPropertyAliases = fieldPropertyAliases;
                    model.SearchGroups = GetSearchGroups(model);
                    model.SearchResults = _searchHelper.GetSearchResults(model, Request.Form.AllKeys);
                    model.SearchResults.HasResults = true;
                    model.SearchResults.WhichNodesResult = model.WhichView;
                    model.SearchResults.WhichPlatformsResult = model.WhichPlatforms;

                    renderResults = RenderSearchResults(model.SearchResults);
                }
                // return PartialView("_pageSearchKnowledgeHubResult", model.SearchResults);
            }
            if (renderResults == null)
            {
                return Json(new { results = renderResults });
            }
            else
            {
                return Json(new { results = renderResults.DisplayResults });
            }
        }
        public SearchResultsModel RenderSearchResults(SearchResultsModel model)
        {
            IList<DisplayResults> displayResults = new List<DisplayResults>();
            DisplayResults displayResult = new DisplayResults();

            List<Dictionary<string, string>> _mediaItems = new List<Dictionary<string, string>>();
            Dictionary<string, string> _videoItemFields = new Dictionary<string, string>();
            Dictionary<string, string> _pdfItemFields = new Dictionary<string, string>();

            foreach (var result in model.Results)
            {
                if (result != null)
                {
                    if (result.Name == knCentre)
                    {
                        var archiveData = result.Children.Where(x => x is HeroBody).FirstOrDefault().Children.Where(xx => xx is TabGroup).FirstOrDefault();
                        var archives = archiveData.Children.Where(c => c is TabHeader).FirstOrDefault().Children.Skip(1).ToList();

                        var _displayKHList = SearchHelper.ReturnDisplayResults(model.SearchTerm, null, archives);
                        ((List<DisplayResults>)displayResults).AddRange(_displayKHList);

                    }
                    else if (result.Name == FAQs)
                    {
                        if (result.Children.Where(c => c is HeroBodyFaq).FirstOrDefault() != null)
                        {
                            var headerImage = result.Children.Where(x => x is HeroHeader).FirstOrDefault();
                            TabBody tabBody = (TabBody)result;
                            HeroBodyFaq heroBodyTabGroup = (HeroBodyFaq)tabBody.Children.Where(x => x is HeroBodyFaq).FirstOrDefault();
                            // HeroBodyFaq heroBodyTabGroup = (HeroBodyFaq)heroBodyData; // /*ViewModelHelper.GetGenericTabContent((PageManageYourAccount)*/(HeroBodyFaq)result/*)*/;
                            if (heroBodyTabGroup != null)
                            {
                                var heroBodyFaq = heroBodyTabGroup.Value("questionGroups"); // (ICollection<IPublishedContent>)heroBodyTabGroup.Value("sectionContent");
                                var _displayResults = SearchHelper.ReturnDisplayResultQuestionAndAnswers(model.SearchTerm, heroBodyTabGroup, null);
                                // var _displayResults = SearchHelper.ReturnDisplayResults(model.SearchTerm, heroBodyFaq, null);
                                ((List<DisplayResults>)displayResults).AddRange(_displayResults);
                            }
                        }
                        //if (result.Children.Where(c => c is HeroBody).FirstOrDefault() != null)
                        //{
                        //    var headerImage = result.Children.Where(x => x is HeroHeader).FirstOrDefault();
                        //    NCtabGenericContent heroBodyTabGroup = ViewModelHelper.GetGenericTabContent((PageManageYourAccount)result);
                        //    if (heroBodyTabGroup != null)
                        //    {
                        //        var heroBodyFaq = (ICollection<IPublishedContent>)heroBodyTabGroup.Value("sectionContent");
                        //        var _displayResults = SearchHelper.ReturnDisplayResults(model.SearchTerm, heroBodyFaq, null);
                        //        ((List<DisplayResults>)displayResults).AddRange(_displayResults);
                        //    }
                        //}
                    }
                }

            }
            model.DisplayResults = displayResults;

            model.TotalItemCount = model.DisplayResults.Count();
            // model.DisplayResults = model.DisplayResults.ToPagedList(model.PageNumber, 4);
            // return PartialView(PartialViewPath("_pageSearchKnowledgeHubResult"), model);
            return model;
        }

        #endregion

        public JsonResult SearchResults(string searchString)
        {
            try
            {
                if (searchString?.Length > ConfigHelper.SearchMinChars - 1)
                {
                    var resultList = CacheFactory.GetValue("Search_" + searchString.ToLowerInvariant().Trim()) as List<SearchEntity>;
                    if (resultList != null)
                        return Json(new { results = resultList, eish = "bad" });
                    else
                    {
                        resultList = new List<SearchEntity>();
                    }
                    IEnumerable<IContentType> types = _contentTypeService.GetAll();
                    // Old code
                    // var types = Umbraco.Core.Composing.Current.Services.ContentTypeService.GetAllPropertyTypeAliases().ToList();

                    var fields = types.Select(pt => pt).Distinct().ToList();

                    //fields.Add("nodeName");
                    //fields.Add("FileTextContent");
                    // Check how else we can add more to the fields

                    var contentTypeToIgnore = ConfigHelper.SearchContentTypesToIgnore.Split(',');
                    var urlToIgnore = ConfigHelper.SearchURLToIgnore.Split(',');
                    // Old
                    // var searcher = _examineManager.SearchProviderCollection["ContentSearcher"];
                    var searcher = _examineManager.TryGetIndex("ExternalIndex", out var externalIndex) ? externalIndex.GetSearcher() : null;
                    // Old
                    // var searchCriteria = searcher.CreateSearchCriteria(BooleanOperation.Or);
                    var searchCriteria = searcher.CreateQuery("nodes", Examine.Search.BooleanOperation.Or);

                    var query = GetFilter(searchString, searchCriteria, fields.Select(x => x.Description).ToList()).Execute();

                    //var searchResults = searcher.Search(query);

                    //  return Json(new { size = searchResults });

                    foreach (var item in query)
                    {
                        // return Json(new { sear = item.Id });

                        //if (!resultList.Exists(x => x.ID == item.Id))
                        //{
                        var node = Umbraco.Content(item.Id);
                        if (node != null && node.TemplateId > 0 && !contentTypeToIgnore.Contains(node.ContentType.Alias) && !resultList.Exists(x => x.ID == node.Id))
                        {
                            if (!urlToIgnore.Contains(node.Url))
                                SetSearchNode(resultList, node);
                            else
                                break;
                        }
                        else
                        {
                            var mNode = Umbraco.Media(item.Id);
                            if (mNode != null && mNode.Id > 0)
                            {
                                if (!contentTypeToIgnore.Contains((string)mNode.ContentType.Alias) && !urlToIgnore.Contains((string)mNode.Url))
                                    SetSearchNode(resultList, mNode);
                            }
                            else
                            {
                                while (node != null)
                                {
                                    node = node.Parent;
                                    if (node != null && !resultList.Exists(x => x.ID == node.Id) && node.TemplateId > 0 && !contentTypeToIgnore.Contains(node.ContentType.Alias) && !urlToIgnore.Contains(node.Url))
                                    {
                                        SetSearchNode(resultList, node);
                                        break;
                                    }
                                    else if ((node != null && contentTypeToIgnore.Contains(node.ContentType.Alias)) || (node != null && urlToIgnore.Contains(node.Url)) || (node != null && resultList.Exists(x => x.ID == node.Id)))
                                    {
                                        break;
                                    }
                                }
                            }
                        }

                        if (resultList.Count() == ConfigHelper.SearchMaxResults)
                            break;
                        //     }
                    }
                    CacheFactory.Insert("Search_" + searchString.ToLowerInvariant().Trim(), resultList);
                    return Json(new { results = resultList });
                }
                else
                {
                    return Json(new { results = "no data" });
                }
            }
            catch (Exception ex)
            {
                // LogHelper.Error(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType, ex.Message, ex);

                //  return Json(new { results = ex.StackTrace });

            }

            return Json(new { results = "dont qualify-" + searchString });
        }

        public ActionResult SearchFromHub(string searchString)
        {
            _searchResults = null;
            // OLd - Examine.LuceneEngine.SearchResults searchResults = null;
            try
            {
                var resultList = CacheFactory.GetValue("SearchKnowledgeHub_" + searchString.ToLowerInvariant().Trim()) as List<SearchEntity>;
                if (resultList != null)
                    return Json(new { results = resultList, eish = "bad" });
                else
                {
                    resultList = new List<SearchEntity>();
                }
                var contentTypeToIgnore = ConfigHelper.SearchContentTypesToIgnore.Split(',');
                var urlToIgnore = ConfigHelper.SearchURLToIgnore.Split(',');

                var query = searchString;


                //var searcher = Examine.ExamineManager.Instance.SearchProviderCollection["ExternalSearcher"];

                //var searchCriteria = searcher.CreateSearchCriteria(Examine.SearchCriteria.BooleanOperation.Or);
                var searcher = _examineManager.TryGetIndex("ExternalSearcher", out var externalIndex) ? externalIndex.GetSearcher() : null;
                IBooleanOperation searchQuery = null;
                // var searchCriteria = searcher.CreateSearchCriteria(Examine.SearchCriteria.BooleanOperation.Or);
                var searchCriteria = searcher.CreateQuery("nodes", BooleanOperation.Or);

                var _query = searchCriteria.Field("nodeName", query.Boost(8)).Or().Field("nodeName", query.Fuzzy()).Execute();

                //var searchQuery = searchCriteria.GroupedOr(new[] { "nodeName", "name", "bodyText" }, query);
                _searchResults = _query; //  (Examine.LuceneEngine.SearchResults)searcher.Search(searchQuery.Compile());

                CacheFactory.Insert("SearchKnowledgeHub_" + searchString.ToLowerInvariant().Trim(), _searchResults);
                // return Json(new { results = searchResults });
            }
            catch (Exception ex)
            {
                // LogHelper.Error(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType, ex.Message, ex);
            }
            return PartialView("_pageSearchKnowledgeHubResult", _searchResults);
        }

        private static void SetSearchNode(ICollection<SearchEntity> resultList, IPublishedContent node)
        {
            var desc = node.Value("ebankITSeoDescription")?.ToString() ?? "";
            // Old
            // var desc = node["ebankITSeoDescription"]?.ToString() ?? "";
            if (string.IsNullOrWhiteSpace(desc))
                desc = node.Value("ebankITTitle")?.ToString() ?? "";
            // Old
            // desc = node["ebankITTitle"]?.ToString() ?? "";
            if (string.IsNullOrWhiteSpace(desc))
                desc = node.Name;
            resultList.Add(new SearchEntity() { ID = node.Id, Url = node.Url, Description = desc });
        }

        private static IBooleanOperation GetFilter(string searchTerm, IQuery criteria, List<string> fields)
        {
            // Handle searching for multiple terms
            if (searchTerm.Contains(" "))
            {
                var terms = searchTerm.Split(' ');
                var result = criteria.GroupedOr(fields, terms[0].MultipleCharacterWildcard());
                for (var i = 1; i < terms.Length; i++)
                {
                    result.Or().GroupedOr(fields, terms[i].MultipleCharacterWildcard());
                }
            }
            // Handle searching for single term
            return criteria.GroupedOr(fields, searchTerm.MultipleCharacterWildcard());
        }
    }
}