using System;
using System.Collections.Generic;

namespace Web.Models
{
    public class Insurance
    {
        public string type { get; set; }
        public string subType { get; set; }
        public PersonalDetails personalDetails { get; set; }
        public InsuranceDetails insuranceDetails { get; set; }
    }

    public class PersonalDetails
    {
        public string idNumber { get; set; }
        public string passportNumber { get; set; }
        public string surname { get; set; }
        public string firstName { get; set; }
        public DateTime dateOfBirth { get; set; }
        public string gender { get; set; }
    }

    public class InsuranceDetails
    {
        public decimal coverAmount { get; set; }
        public List<Dependent> spouses { get; set; }
        public List<Dependent> children { get; set; }
        public List<Dependent> parents { get; set; }
        public List<Dependent> extendedFamily { get; set; }
    }

    public class Dependent
    {
        public decimal coverAmount { get; set; }
        public DateTime dateOfBirth { get; set; }
        public string gender { get; set; }
    }
}
