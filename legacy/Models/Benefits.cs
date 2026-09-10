using System.Collections.Generic;
using Umbraco.Web.PublishedModels;

namespace Web.Models
{
    public class Benefits
    {
        public Benefits()
        {
        }

        public Benefits(string header, string desc, List<Card> cards, List<NCcard> cards1)
        {
            Header = header;
            Description = desc;
            BenefitCards = cards;
            BenefitCards1 = cards1;
        }

        public string Header { get; set; }

        public string Description { get; set; }
        public List<Card> BenefitCards { get; set; }
        public List<NCcard> BenefitCards1 { get; set; }
    }
}