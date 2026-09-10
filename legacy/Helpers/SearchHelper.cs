using Examine;
using Examine.Search;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using Umbraco.Core.Models.PublishedContent;
//using Examine.SearchCriteria;
using Umbraco.Web;
using Umbraco.Web.PublishedModels;
using Web.Models.KnowledgeCentreModels;

namespace Web.Helpers
{
    public class SearchHelper
    {
        private string _docTypeAliasFieldName { get { return "nodeTypeAlias"; } }
        private static string videoHubNode = "Video Hub";
        private static string frequentlyAskedQuestionsNode = "Frequently Asked Questions";
        private UmbracoHelper _uHelper { get; set; }


        /// <summary>
        /// Default constructor for SearchHelper
        /// </summary>
        /// <param name="uHelper">An umbraco helper to use in your class</param>

        private readonly IExamineManager _examineManager;

        //public SearchHelper(UmbracoHelper uHelper)
        // {
        //     _uHelper = uHelper;
        //}

        public SearchHelper(UmbracoHelper uHelper, IExamineManager examineManager)
        {
            _uHelper = uHelper;
            _examineManager = examineManager;
        }

        public static Dictionary<string, string> ReturnJSONSearchNodes()
        {
            string jsonPath = AppDomain.CurrentDomain.BaseDirectory + @"Content\";
            string json = System.IO.File.ReadAllText(jsonPath + @"searchNodes.json");
            return JsonConvert.DeserializeObject<Dictionary<string, string>>(json);
        }

        public static Dictionary<string, string> ReturnJSONSearchPlatforms()
        {
            string jsonPath = AppDomain.CurrentDomain.BaseDirectory + @"Content\";
            string json = System.IO.File.ReadAllText(jsonPath + @"platforms.json");
            return JsonConvert.DeserializeObject<Dictionary<string, string>>(json);
        }


        /// <summary>
        /// Gets the search results model from the search term/// 
        /// </summary>
        /// <param name="searchModel">The search model with search term and other settings in it</param>
        /// <param name="allKeys">The form keys that were submitted</param>
        /// <returns>A SearchResultsModel object loaded with the results</returns>
        public SearchResultsModel GetSearchResults(SearchViewModel searchModel, string[] allKeys)
        {
            SearchResultsModel resultsModel = new SearchResultsModel();
            resultsModel.SearchTerm = searchModel.SearchTerm;
            resultsModel.PageNumber = GetPageNumber(allKeys);

            ISearchResults allResults = SearchUsingExamine(searchModel.DocTypeAliases.Split(','), searchModel.SearchGroups, searchModel.WhichPlatforms);

            resultsModel.TotalItemCount = (int)allResults.TotalItemCount;
            resultsModel.Results = (IEnumerable<IPublishedContent>)GetResultsForThisPage(allResults, resultsModel.PageNumber, searchModel.PageSize);

            return resultsModel;
        }

        /// <summary>
        /// Takes the examine search results and return the content for each page
        /// </summary>
        /// <param name="allResults">The examine search results</param>
        /// <param name="pageNumber">The page number of results to return</param>
        /// <param name="pageSize">The number of items per page</param>
        /// <returns>A collection of content pages for the page of results</returns>
        private IEnumerable<IPublishedContent> GetResultsForThisPage(ISearchResults allResults, int pageNumber, int pageSize)
        {
            return allResults.Skip((pageNumber - 1) * pageSize).Take(pageSize).Select(x => _uHelper.Content(x.Id)).ToList();
        }

        /// <summary>
        /// Performs a lucene search using Examine.
        /// </summary>
        /// <param name="documentTypes">Array of document type aliases to search for.</param>
        /// <param name="searchGroups">A list of search groupings, if you have more than one group it will apply an and to the search criteria</param>
        /// <returns>Examine search results</returns>
        public Examine.ISearchResults SearchUsingExamine(string[] documentTypes, List<SearchGroup> searchGroups, Dictionary<string, string> keyValuePairs)
        {
            var query = searchGroups.FirstOrDefault().SearchTerms;
            // var searcher = Examine.ExamineManager.Instance.TryGetIndex["ExternalSearcher"];
            var searcher = _examineManager.TryGetIndex("ExternalIndex", out var externalIndex) ? externalIndex.GetSearcher() : null;
            IBooleanOperation searchQuery = null;
            // var searchCriteria = searcher.CreateSearchCriteria(Examine.SearchCriteria.BooleanOperation.Or);
            var searchCriteria = searcher.CreateQuery(null, Examine.Search.BooleanOperation.Or);
            foreach (var valuePair in keyValuePairs)
            {
                if (valuePair.Key == "Knowledge Centre")
                {
                    if (searchQuery == null)
                    {
                        searchQuery = searchCriteria.Field("nodeName", videoHubNode).Or().Field("nodeName", valuePair.Value);
                    }
                    else
                    {
                        searchQuery = searchQuery.Or().Field("nodeName", valuePair.Key).Or().Field("nodeName", valuePair.Value);
                    }
                    continue;
                }
                if (searchQuery == null)
                {
                    searchQuery = searchCriteria.Field("nodeName", valuePair.Key).Or().Field("nodeName", valuePair.Value);
                }
                else
                {
                    searchQuery = searchQuery.Or().Field("nodeName", valuePair.Key).Or().Field("nodeName", valuePair.Value);
                }
            }

            return searchQuery.OrderByDescending(new SortableField[] { new SortableField("publish_time") }).Execute();
            // return (Examine.LuceneEngine.SearchResults)searcher.Search(searchQuery.Compile());
        }

        /// <summary>
        /// Gets the page number from the form keys
        /// </summary>
        /// <param name="formKeys">All of the keys on the form</param>
        /// <returns>The page number</returns>
        public int GetPageNumber(string[] formKeys)
        {
            int pageNumber = 1;
            const string NAME_PREFIX = "page";
            const char NAME_SEPARATOR = '-';
            if (formKeys != null)
            {
                string pagingButtonName = formKeys.Where(x => x.Length > NAME_PREFIX.Length && x.Substring(0, NAME_PREFIX.Length).ToLower() == NAME_PREFIX).FirstOrDefault();
                if (!string.IsNullOrEmpty(pagingButtonName))
                {
                    string[] pagingButtonNameParts = pagingButtonName.Split(NAME_SEPARATOR);
                    if (pagingButtonNameParts.Length > 1)
                    {
                        if (!int.TryParse(pagingButtonNameParts[1], out pageNumber))
                        {
                            //pageNumber already set in tryparse
                        }
                    }
                }
            }
            return pageNumber;
        }

        /// <summary>
        /// Works out which pages the paging should start and end on
        /// </summary>
        /// <param name="pageCount">The number of pages</param>
        /// <param name="pageNumber">The current page number</param>
        /// <param name="groupSize">The number of items per page</param>
        /// <returns>A PagingBoundsModel containing the paging bounds settings</returns>
        /*public static PagingBoundsModel GetPagingBounds(int pageCount, int pageNumber, int groupSize)
        {
            int middlePageNumber = (int)(Math.Ceiling((decimal)groupSize / 2));
            int pagesBeforeMiddle = groupSize - (int)middlePageNumber;
            int pagesAfterMiddle = groupSize - (pagesBeforeMiddle + 1);
            int startPage = 1;
            if (pageNumber >= middlePageNumber)
            {
                startPage = pageNumber - pagesBeforeMiddle;
            }
            else
            {
                pagesAfterMiddle = groupSize - pageNumber;
            }
            int endPage = pageCount;
            if (pageCount >= (pageNumber + pagesAfterMiddle))
            {
                endPage = (pageNumber + pagesAfterMiddle);
            }
            bool showFirstButton = startPage > 1;
            bool showLastButton = endPage < pageCount;
            return new PagingBoundsModel(startPage, endPage, showFirstButton, showLastButton);
        }*/

        #region Package results

        public static Dictionary<string, string> ReturnMediaSearchedItems(TabBody tabBody, string searchTerm)
        {
            Dictionary<string, string> _mediItemFields = new Dictionary<string, string>();

            var tabContent = tabBody.TabBodyContent; //  tabBody.Value<IEnumerable<IPublishedContent>>("tabBodyContent");
            var contentItems = tabContent.Where(c => c.ContentType.Alias == "nCTabGenericContent").FirstOrDefault().SectionContent; //.Value<IEnumerable<IPublishedContent>>("sectionContent");

            foreach (var mediaItem in contentItems)
            {
                foreach (var qAndA in ((HeroBodyGuideHelp)mediaItem).MediaItems)
                {
                    if (qAndA.Value("question").ToString().ToLower().Contains(searchTerm.ToLower()))
                    {
                        bool itemExists = _mediItemFields.Any(x => x.Key.ToString().ToLower() == qAndA.Value("question").ToString().ToLower());
                        if (itemExists == false)
                        {
                            _mediItemFields.Add(qAndA.Value("question").ToString(), qAndA.Value("answer").ToString() + "#" + qAndA.Value("description").ToString());
                        }
                        // _mediItemFields.Add(qAndA.GetPropertyValue("question").ToString(), qAndA.GetPropertyValue("answer").ToString() + "#" + qAndA.GetPropertyValue("description").ToString());
                    }
                }
            }
            return _mediItemFields;
        }
        public static List<DisplayResults> ReturnDisplayResultQuestionAndAnswers(string searchTerm, HeroBodyFaq searchResultsHeroBodyFaq, ICollection<IPublishedContent> searchResultTabHeader)
        {
            List<DisplayResults> displayResults = new List<DisplayResults>();
            DisplayResults displayResult = null;
            var qGroups = (List<QuestionGroup>)searchResultsHeroBodyFaq.Value("questionGroups");
            if ((searchResultsHeroBodyFaq != null) && (searchResultTabHeader == null))
            {
                foreach (var faqData in qGroups) // searchResultsHeroBodyFaq)
                {
                    foreach (var group in faqData.QuestionsAndAnswers)
                    {
                        if (group != null)
                        {
                            if (group.Value("question").ToString().ToLower().Contains(searchTerm.ToLower()))
                            {
                                string urlFAQs = "../home/frequently-asked-questions";
                                urlFAQs = urlFAQs + "?searchString=" + searchTerm.ToLower().ToString();
                                displayResult = new DisplayResults()
                                {
                                    Header = group.Value("question").ToString(), // + " | " + @FAQs,
                                    Description = group.Value("Answer").ToString(),
                                    ResultLink = urlFAQs
                                };
                                displayResults.Add(displayResult);
                            }
                        }
                    }
                }
            }
            else if ((searchResultsHeroBodyFaq == null) && (searchResultTabHeader != null))
            {
                Dictionary<string, string> _videoItemFields = new Dictionary<string, string>();
                Dictionary<string, string> _pdfItemFields = new Dictionary<string, string>();

                TabBody pdfArchive = (TabBody)searchResultTabHeader.First();
                TabBody videoArchive = (TabBody)searchResultTabHeader.Last();

                _videoItemFields = ReturnMediaSearchedItems(videoArchive, searchTerm);
                _pdfItemFields = ReturnMediaSearchedItems(pdfArchive, searchTerm);

                var videoTabContentValues = videoArchive.Value("tabBodyContent");
                List<NCtabGenericContent> videoContents = new List<NCtabGenericContent>();
                foreach (var video in (ICollection<Umbraco.Web.PublishedModels.NCtabGenericContent>)videoTabContentValues) //(ICollection<IPublishedContent>)videoTabContentValues)
                {
                    videoContents.Add((NCtabGenericContent)video);
                }

                var commonFoundResults = from video in _videoItemFields where _pdfItemFields.Any(x => x.Key == video.Key) select video;

                foreach (var _result in commonFoundResults)
                {
                    string pathVideoUrl = _videoItemFields.Where(x => x.Key == _result.Key).FirstOrDefault().Value.ToString().Split('#')[0].ToString();
                    string pathPDFUrl = _pdfItemFields.Where(x => x.Key == _result.Key).FirstOrDefault().Value.ToString().Split('#')[0].ToString();

                    string linkPart = "../home/video-hub";
                    string linkStringValue = linkPart + "?path=Knowledge Centre/~" + _result.Key.ToString().Split('-')[1].TrimStart().ToString()
                        + "&selected=" + _result.Key.ToString().Split('-')[1].TrimStart().ToString();

                    displayResult = new DisplayResults()
                    {
                        Header = _result.Key.ToString().Split('-')[1].TrimStart() + " (" + _result.Key.ToString().Split('-')[0].TrimEnd() + ")",
                        Description = _pdfItemFields.Where(x => x.Key == _result.Key).FirstOrDefault().Value.ToString().Split('#')[1].ToString(),
                        ResultLink = linkStringValue
                    };
                    displayResults.Add(displayResult);
                }
            }
            return displayResults;
        }
        public static List<DisplayResults> ReturnDisplayResults(string searchTerm, ICollection<IPublishedContent> searchResultsHeroBodyFaq, ICollection<IPublishedContent> searchResultTabHeader)
        {
            List<DisplayResults> displayResults = new List<DisplayResults>();
            DisplayResults displayResult = null;

            if ((searchResultsHeroBodyFaq != null) && (searchResultTabHeader == null))
            {
                foreach (var faqData in searchResultsHeroBodyFaq)
                {
                    var groups = faqData.Value("questionGroups");

                    foreach (var group in (ICollection<IPublishedContent>)groups)
                    {
                        if (group != null)
                        {
                            foreach (var questionAndAnswer in (ICollection<IPublishedContent>)group.Value("questionsAndAnswers"))
                            {
                                if (questionAndAnswer.Value("question").ToString().ToLower().Contains(searchTerm.ToLower()))
                                {
                                    string urlFAQs = "../home/frequently-asked-questions";
                                    urlFAQs = urlFAQs + "?searchString=" + searchTerm.ToLower().ToString();
                                    displayResult = new DisplayResults()
                                    {
                                        Header = questionAndAnswer.Value("question").ToString(), // + " | " + @FAQs,
                                        Description = questionAndAnswer.Value("Answer").ToString(),
                                        ResultLink = urlFAQs
                                    };
                                    displayResults.Add(displayResult);
                                }
                            }
                        }
                    }
                }
            }
            else if ((searchResultsHeroBodyFaq == null) && (searchResultTabHeader != null))
            {
                Dictionary<string, string> _videoItemFields = new Dictionary<string, string>();
                Dictionary<string, string> _pdfItemFields = new Dictionary<string, string>();

                TabBody pdfArchive = (TabBody)searchResultTabHeader.First();
                TabBody videoArchive = (TabBody)searchResultTabHeader.Last();

                _videoItemFields = ReturnMediaSearchedItems(videoArchive, searchTerm);
                _pdfItemFields = ReturnMediaSearchedItems(pdfArchive, searchTerm);

                var videoTabContentValues = videoArchive.Value("tabBodyContent");
                List<NCtabGenericContent> videoContents = new List<NCtabGenericContent>();
                foreach (var video in (ICollection<Umbraco.Web.PublishedModels.NCtabGenericContent>)videoTabContentValues) //(ICollection<IPublishedContent>)videoTabContentValues)
                {
                    videoContents.Add((NCtabGenericContent)video);
                }

                var commonFoundResults = from video in _videoItemFields where _pdfItemFields.Any(x => x.Key == video.Key) select video;

                foreach (var _result in commonFoundResults)
                {
                    string pathVideoUrl = _videoItemFields.Where(x => x.Key == _result.Key).FirstOrDefault().Value.ToString().Split('#')[0].ToString();
                    string pathPDFUrl = _pdfItemFields.Where(x => x.Key == _result.Key).FirstOrDefault().Value.ToString().Split('#')[0].ToString();

                    string linkPart = "../home/video-hub";
                    string linkStringValue = linkPart + "?path=Knowledge Centre/~" + _result.Key.ToString().Split('-')[1].TrimStart().ToString()
                        + "&selected=" + _result.Key.ToString().Split('-')[1].TrimStart().ToString();

                    displayResult = new DisplayResults()
                    {
                        Header = _result.Key.ToString().Split('-')[1].TrimStart() + " (" + _result.Key.ToString().Split('-')[0].TrimEnd() + ")",
                        Description = _pdfItemFields.Where(x => x.Key == _result.Key).FirstOrDefault().Value.ToString().Split('#')[1].ToString(),
                        ResultLink = linkStringValue
                    };
                    displayResults.Add(displayResult);
                }
            }
            return displayResults;
        }
        #endregion
    }
}
