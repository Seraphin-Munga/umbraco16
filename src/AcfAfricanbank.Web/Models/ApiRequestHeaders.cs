namespace DocumentUploadApi.Models
{
    public class ApiRequestHeaders
    {
        public string Authorization { get; set; }
        public string XUser { get; set; }
        public string XSystem { get; set; }
        public string XChannel { get; set; }
        public string XServiceOperation { get; set; }
        public string XSessionId { get; set; }
    }
}
