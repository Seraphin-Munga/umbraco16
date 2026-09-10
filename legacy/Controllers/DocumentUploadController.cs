using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Mvc;
using Umbraco.Web.Mvc;

namespace Web.Controllers
{
    public class DocumentUploadController : SurfaceController
    {
        private readonly ApiRequestHeaders _headers = new ApiRequestHeaders
        {
            Authorization = "Basic ZWJhbmtpdDoxNW0xNGkxNmExOXMyM28xOGQ=",
            XUser = "Test",
            XSystem = "ebankit",
            XChannel = "web",
            XServiceOperation = "payments",
            XSessionId = "reiorepropeprier"
        };

        private readonly ApiRequestHeaders _myheaders = new ApiRequestHeaders
        {
            Authorization = "Basic ZWJhbmtpdDoxNW0xNGkxNmExOXMyM28xOGQ=",
            XUser = "AveryLongXUserValue",
            XSystem = "AveryLongXSystemValue",
            XChannel = "WEB",
            XServiceOperation = "getDetails",
            XSessionId = "12341"
        };

        private readonly ApiUrl _apiUrl = new ApiUrl
        {
            BaseUrl = "https://api.stg.africanbank.net",
        };

        [HttpPost]
        public JsonResult SearchClients(string searchCriteria)
        {
            var data = new[]
            {
                new { fieldName = "idnumber", @operator = "=", value = searchCriteria }
            };

            using (var httpClient = new HttpClient())
            {
                var request = new HttpRequestMessage
                {
                    Method = HttpMethod.Post,
                    RequestUri = new Uri(_apiUrl.BaseUrl + "/v2/clients/search"),
                    Content = new StringContent(JsonConvert.SerializeObject(data), System.Text.Encoding.UTF8, "application/json")
                };

                foreach (var header in GetHeaders())
                {
                    request.Headers.Add(header.Key, header.Value);
                }

                try
                {
                    var response =  httpClient.SendAsync(request);

                  
                     
                        return Json(response);
                   
                 
                }
                catch (HttpRequestException ex)
                {
                    return  Json( ex.Message);
                }
            }
        }

        [HttpPost]
        public  JsonResult SearchApplication(string clientNumber)
        {
            var data = new[]
            {
                new { fieldName = "clientNumber", @operator = "=", value = clientNumber }
            };

            using (var httpClient = new HttpClient())
            {
                var request = new HttpRequestMessage
                {
                    Method = HttpMethod.Post,
                    RequestUri = new Uri(_apiUrl.BaseUrl + "/v2/applications/search"),
                    Content = new StringContent(JsonConvert.SerializeObject(data), System.Text.Encoding.UTF8, "application/json")
                };

                foreach (var header in GetHeaders())
                {
                    request.Headers.Add(header.Key, header.Value);
                }

                try
                {
                    var response =  httpClient.SendAsync(request);

                
                  
                        return Json(response);
                    
                 
                }
                catch (HttpRequestException ex)
                {
                    return Json(ex.Message);
                }
            }
        }

        [HttpGet]
        public  JsonResult ApplicationDocument(string documentID)
        {
            using (var httpClient = new HttpClient())
            {
                var request = new HttpRequestMessage
                {
                    Method = HttpMethod.Get,
                    RequestUri = new Uri(_apiUrl.BaseUrl + $"/v2/applications/{documentID}/documents"),
                };

                foreach (var header in GetHeaders())
                {
                    request.Headers.Add(header.Key, header.Value);
                }

                try
                {
                    var response =  httpClient.SendAsync(request);

              
                        return Json(response);
              
               
                }
                catch (HttpRequestException ex)
                {
                    return Json(ex.Message);
                }
            }
        }

        [HttpPost]
        public  JsonResult DocumentUpload(UploadModel model, string applicationId)
        {
            using (var httpClient = new HttpClient())
            {
                var request = new HttpRequestMessage
                {
                    Method = HttpMethod.Post,
                    RequestUri = new Uri(_apiUrl.BaseUrl + $"/v2/applications/{applicationId}/documents/document-data"),
                    Content = new StringContent(JsonConvert.SerializeObject(model), System.Text.Encoding.UTF8, "application/json")
                };

                foreach (var header in GetMyHeaders()) // Corrected method name to GetMyHeaders()
                {
                    request.Headers.Add(header.Key, header.Value);
                }

                try
                {
                    var response =  httpClient.SendAsync(request);

               
                        return  Json(response);
               
                  
                 
                }
                catch (HttpRequestException ex)
                {
                    return Json(ex.Message);
                }
            }
        }

        private IEnumerable<KeyValuePair<string, string>> GetHeaders()
        {
            yield return new KeyValuePair<string, string>("Authorization", _headers.Authorization);
            yield return new KeyValuePair<string, string>("X-User", _headers.XUser);
            yield return new KeyValuePair<string, string>("X-System", _headers.XSystem);
            yield return new KeyValuePair<string, string>("X-Channel", _headers.XChannel);
            yield return new KeyValuePair<string, string>("X-Service-Operation", _headers.XServiceOperation);
            yield return new KeyValuePair<string, string>("X-Session-Id", _headers.XSessionId);
        }

        private IEnumerable<KeyValuePair<string, string>> GetMyHeaders()
        {
            yield return new KeyValuePair<string, string>("Authorization", _myheaders.Authorization);
            yield return new KeyValuePair<string, string>("X-User", _myheaders.XUser);
            yield return new KeyValuePair<string, string>("X-System", _myheaders.XSystem);
            yield return new KeyValuePair<string, string>("X-Channel", _myheaders.XChannel);
            yield return new KeyValuePair<string, string>("X-Service-Operation", _myheaders.XServiceOperation);
            yield return new KeyValuePair<string, string>("X-Session-Id", _myheaders.XSessionId);
        }
    }

    public class ApiRequestHeaders
    {
        public string Authorization { get; set; }
        public string XUser { get; set; }
        public string XSystem { get; set; }
        public string XChannel { get; set; }
        public string XServiceOperation { get; set; }
        public string XSessionId { get; set; }
    }

    public class ApiUrl
    {
        public string BaseUrl { get; set; }
    }

    public class UploadModel
    {
        public string type { get; set; }
        public string subDocumentType { get; set; }
        public string clientNumber { get; set; }
        public string contentType { get; set; }
        public string content { get; set; }
    }
}
