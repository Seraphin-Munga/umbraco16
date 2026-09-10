using System.Collections.Generic;
using Umbraco.Web.PublishedModels;

namespace Web.Models
{
    public class HowToApplyDataContainer
    {
        public HowToApplyDataContainer() { }


        public HowToApplyDataContainer(string header, string desc, IEbankItabstractButton button, List<Card> cards)
        {
            Header = header;
            Description = desc;
            ApplyButton = button;
            DocumentsCards = cards;
        }

        public string Header { get; set; }

        public string Description { get; set; }

        public IEbankItabstractButton ApplyButton { get; set; }

        public List<Card> DocumentsCards { get; set; }
    }
}