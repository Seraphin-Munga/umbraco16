using System;

namespace Web.Models
{
    public class cmsTrackMyLoanAudit
    {
        public int Id { get; set; }
        public string ClientNumber { get; set; }
        public string ApplicationId { get; set; }
        public string ApplicationType { get; set; }
        public string ApplicationStatus { get; set; }
        public string URLapi { get; set; }
        public string Request { get; set; }
        public string Response { get; set; }
        public DateTime DateTime { get; set; }
        public string CreatedBy { get; set; }
    }
}