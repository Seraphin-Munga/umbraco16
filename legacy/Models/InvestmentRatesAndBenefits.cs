using System.Collections.Generic;

namespace Web.Models
{
    public class InvestmentRatesAndBenefits
    {
        public IEnumerable<string> RatesTermsAndConditions { get; set; }

        public string CalculatorIntroduction { get; set; }

        public string CalculatorButtonText { get; set; }

        public Benefits Benefits { get; set; }
    }
}