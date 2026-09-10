namespace Web.Entities
{
    public class Rate
    {
        public double AnnualInterestPayout { get; set; }
        public double InterestPayoutOnExpiry { get; set; }
        public double MinimumInvestmentAmount { get; set; }
        public double MonthlyInterestPayout { get; set; }
        public string ProductCode { get; set; }
        public double SemiannualInterestPayout { get; set; }
        public Term Term { get; set; }
        public string formatedTerm { get; set; }
    }
}