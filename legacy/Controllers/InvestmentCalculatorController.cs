using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using Umbraco.Web.Mvc;
using Web.Models;

namespace Web.Controllers
{
    public class InvestmentCalculatorController : SurfaceController
    {

        private readonly ApiRequestHeaders _headers = new ApiRequestHeaders
        {
            Authorization = "Basic " + GetBase64Credentials(),
            XUser = "Test",
            XSystem = "ebankit",
            XChannel = "web",
            XServiceOperation = "payments",
            XSessionId = "reiorepropeprier",

        };


        private IEnumerable<KeyValuePair<string, string>> GetHeaders()
        {
            yield return new KeyValuePair<string, string>("Authorization", _headers.Authorization);
            yield return new KeyValuePair<string, string>("X-User", _headers.XUser);
            yield return new KeyValuePair<string, string>("X-System", _headers.XSystem);
            yield return new KeyValuePair<string, string>("X-Channel", _headers.XChannel);
            yield return new KeyValuePair<string, string>("X-Service-Operation", _headers.XServiceOperation);
            yield return new KeyValuePair<string, string>("X-Session-Id", _headers.XSessionId);
        }


        private static string GetBase64Credentials()
        {
            var username = "ebankit";
            var password = "manage";

            var credentials = $"{username}:{password}";

            var str = Convert.ToBase64String(Encoding.ASCII.GetBytes(credentials));



            return Convert.ToBase64String(Encoding.ASCII.GetBytes(credentials));
        }


        private HttpClient CreateHttpClient()
        {
            // Create HttpClient with SSL certificate validation bypass (for testing/debugging only)
            var httpClientHandler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
            };

            return new HttpClient(httpClientHandler);
        }


        [HttpPost]
        public async Task<JsonResult> InvestmentCalculator(Insurance form)
        {
            using (var httpClient = CreateHttpClient())
            {
                var request = new HttpRequestMessage
                {
                    Method = HttpMethod.Post,
                    RequestUri = new Uri("http://api.int.africanbank.net/v2/quotes"),
                    Content = new StringContent(
                        JsonConvert.SerializeObject(form),
                        System.Text.Encoding.UTF8,
                        "application/json")
                };

                // Add headers
                foreach (var header in GetHeaders())
                {
                    request.Headers.Add(header.Key, header.Value);
                }

                try
                {
                    var response = await httpClient.SendAsync(request);

                    if (response.IsSuccessStatusCode)
                    {
                        var responseContent = await response.Content.ReadAsStringAsync();
                        var result = JsonConvert.DeserializeObject<ApiResponseInvest>(responseContent);

                        return Json(new
                        {
                            data = result,
                            error = false
                        });
                    }
                    else
                    {
                        return Json(new
                        {
                            data = (object)null,
                            error = true,
                            message = $"Request failed with status: {response.StatusCode}"
                        });
                    }
                }
                catch (HttpRequestException ex)
                {
                    return Json(new
                    {
                        data = (object)null,
                        error = true,
                        message = ex.InnerException?.Message ?? ex.Message
                    });
                }
            }
        }




    }
}