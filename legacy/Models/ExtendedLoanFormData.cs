using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Web.Models
{
    public class ExtendedLoanFormData
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Phone { get; set; }
        public string Amount { get; set; }
        public string Product { get; set; }
        public string AffiliateId { get; set; }
        public string IdNumber { get; set; }
        public decimal? Income { get; set; }
        public decimal? Expenses { get; set; }
        public string Email { get; set; }
        public decimal? GrossSalary { get; set; }
        public string GrossSalaryType { get; set; }
        public string Province { get; set; }
        public string Address { get; set; }
        public string PostalCode { get; set; }
        public string YourBank { get; set; }
        public string EmployeeType { get; set; }
        public string YourEmployer { get; set; }
        public string OccupationStatus { get; set; }
        public string OccupationType { get; set; }
        public string DatetimeInput { get; set; }
    }
}