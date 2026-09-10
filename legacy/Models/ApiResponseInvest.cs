using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Routing;

namespace Web.Models
{
    public class ApiResponseInvest
    {
        [JsonProperty("data")]
        public QuoteData Data { get; set; }

        [JsonProperty("links")]
        public Links Links { get; set; }

        [JsonProperty("meta")]
        public Meta Meta { get; set; }
    }


    public class QuoteData
    {
        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("subType")]
        public string SubType { get; set; }

        [JsonProperty("currency")]
        public string Currency { get; set; }

        [JsonProperty("maximumCapital")]
        public decimal? MaximumCapital { get; set; }

        [JsonProperty("maximumTerm")]
        public int? MaximumTerm { get; set; }

        [JsonProperty("maximumCreditInterestRate")]
        public decimal? MaximumCreditInterestRate { get; set; }

        [JsonProperty("maximumDebitInterestRate")]
        public decimal? MaximumDebitInterestRate { get; set; }

        [JsonProperty("coverAmount")]
        public string CoverAmount { get; set; }  // Use string if the value comes quoted

        [JsonProperty("premium")]
        public string Premium { get; set; }  // Use string if the value comes quoted

        [JsonProperty("premiumFrequency")]
        public string PremiumFrequency { get; set; }
    }

    public class Links
    {
        [JsonProperty("self")]
        public string Self { get; set; }
    }

    public class Meta
    {
        [JsonProperty("totalPages")]
        public int TotalPages { get; set; }
    }
}