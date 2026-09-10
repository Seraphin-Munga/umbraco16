using System;

namespace Web.Models
{
    public class MarketingConsent
    {
        public int isOptIn { get; set; }
        public string Name { get; set; }
        public string Surname { get; set; }

        public long IdNumber { get; set; }
        public string Email { get; set; }
        public int isMailContactable { get; set; }
        public string Cellphone { get; set; }
        public int isCellphoneContactable { get; set; }
        public string AlternativeNumber { get; set; }
        public int isAlternativeNumberContactable { get; set; }
        public int isInvestmentSelected { get; set; }
        public int isInsuranceSelected { get; set; }
        public int isLoanAndCreditCardSelected { get; set; }
        public int isTransactionBankingSelected { get; set; }
        public string consentSource { get; set; }
        public DateTime consentDate { get; set; }
    }
}