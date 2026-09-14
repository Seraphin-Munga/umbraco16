using System.Collections.Generic;

namespace Web.Models
{
    public class EnterpriseSupplier
    {
        public int EnterpriseId { get; set; }
        public string EnterpriseName { get; set; }
        public string EnterpriseRegistrationNumber { get; set; }
        public string EnterpriseIndustry { get; set; }
        public string EnterpriseEmail { get; set; }
        public string EnterpriseCellphone { get; set; }
        public string EnterpriseAddress { get; set; }
        public List<EnterpriseDocuments> EnterpriseDocuments { get; set; }
    }
}
