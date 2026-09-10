using System.Collections.Generic;

namespace Web.Entities
{
    public class ApiUrlList
    {
        public string Url { get; set; }
    }

    public class MultiApiUrlList
    {
        public string Name { get; set; }
        public List<ApiUrlList> UrlList { get; set; }
    }
}