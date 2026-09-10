using System.Collections.Generic;

namespace Web.Entities
{
    public class CalculatorModel
    {
        public string Product { get; set; }
        public List<Rate> Rates { get; set; }
    }
}
