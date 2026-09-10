using Examine;
using Examine.Search;
using System;
using System.Collections.Generic;
using System.Linq;
using Umbraco.Core.Models.PublishedContent;
using Umbraco.Web;
using Umbraco.Web.PublishedModels;
//using umbraco.presentation;
//using Examine.SearchCriteria;
//using Examine.LuceneEngine.SearchCriteria;

namespace Web.Helpers
{
    public class UmbracoSectionsHelper
    {
        /* #region Implementable Methods */

        public object this[string alias] => throw new NotImplementedException();

        public IEnumerable<IPublishedContent> ContentSet => throw new NotImplementedException();

        public PublishedContentType ContentType => throw new NotImplementedException();

        public int Id => throw new NotImplementedException();

        public int TemplateId => throw new NotImplementedException();

        public int SortOrder => throw new NotImplementedException();

        public string Name => throw new NotImplementedException();

        public string UrlName => throw new NotImplementedException();

        public string DocumentTypeAlias => throw new NotImplementedException();

        public int DocumentTypeId => throw new NotImplementedException();

        public string WriterName => throw new NotImplementedException();

        public string CreatorName => throw new NotImplementedException();

        public int WriterId => throw new NotImplementedException();

        public int CreatorId => throw new NotImplementedException();

        public string Path => throw new NotImplementedException();

        public DateTime CreateDate => throw new NotImplementedException();

        public DateTime UpdateDate => throw new NotImplementedException();

        public Guid Version => throw new NotImplementedException();

        public int Level => throw new NotImplementedException();

        public string Url => throw new NotImplementedException();

        public PublishedItemType ItemType => throw new NotImplementedException();

        public bool IsDraft => throw new NotImplementedException();

        public IPublishedContent Parent => throw new NotImplementedException();

        public IEnumerable<IPublishedContent> Children => throw new NotImplementedException();

        public ICollection<IPublishedProperty> Properties => throw new NotImplementedException();

        public int GetIndex()
        {
            throw new NotImplementedException();
        }

        public IPublishedProperty GetProperty(string alias)
        {
            throw new NotImplementedException();
        }

        public IPublishedProperty GetProperty(string alias, bool recurse)
        {
            throw new NotImplementedException();
        }

        // umbraco.presentation.UmbracoContext umbracoContext, IPublishedContent content, PublishedContentQuery query
        public PublishedContentQuery _query { get; set; }
        public PublishedContentQuery Query
        {
            get
            {
                return _query;
            }
            set
            {
                value = _query;
            }
        }

        public UmbracoSectionsHelper() { }

        public static IPublishedContent ReturnHeroObjects(IEnumerable<IPublishedContent> _value, string sectionTitle)
        {
            IPublishedContent header = (IPublishedContent)_value.ToList()?.Where(c => c.ContentType.Alias.ToString().ToLower() == sectionTitle).FirstOrDefault();
            return header;
        }

        public static IEnumerable<IPublishedContent> ReturnEbankITAbstractButtons(IEnumerable<IPublishedContent> publishedContents)
        {
            return publishedContents.Where(c => c is EbankItabstractButton).ToList();
        }

        public static string ReturnEbankITButtonLinkUrl(EbankItabstractButton ebankItabstractButton)
        {
            return string.IsNullOrEmpty(ebankItabstractButton?.EbankItbuttonInternalLink?.Url) ? ebankItabstractButton?.EbankItbuttonExternalLink : ebankItabstractButton.EbankItbuttonInternalLink?.Url;
        }

        public static IBooleanOperation GetFilter(string searchTerm, IQuery criteria, List<string> fields)
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
        /* #endregion*/

    }
}