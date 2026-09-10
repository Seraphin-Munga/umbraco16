using DocumentUploadApi.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using Umbraco.Core.Persistence;
using Umbraco.Core.Scoping;
using Umbraco.Web.Models;
using Umbraco.Web.Mvc;
using Umbraco.Web.PublishedModels;
using Web.Controllers;
using Web.Entities;
using Web.Models;
using Web.Models.CustomModels;
using Web.Models.QuickLoanModels;
using Web.Models.QuickLoanModels.Base;
using static Web.Models.QuickLoanModels.GeneratedIAUrl;

namespace acf_africanbankv1.Controllers
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

    public static class ApplicationFileLogger
    {
        private static readonly object SyncRoot = new object();

        public static void Error<TController>(string message, Exception exception)
        {
            try
            {
                string logDirectory;
                HttpContext context = HttpContext.Current;

                if (context != null)
                    logDirectory = context.Server.MapPath("~/App_Data/Logs");
                else
                    logDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "App_Data", "Logs");

                Directory.CreateDirectory(logDirectory);

                string fileName = typeof(TController).Name + "-" + DateTime.UtcNow.ToString("yyyy-MM-dd") + ".log";
                string logPath = Path.Combine(logDirectory, fileName);
                string entry = string.Format(
                    "[{0:O}] {1}{2}{3}{4}",
                    DateTime.UtcNow,
                    message,
                    Environment.NewLine,
                    exception,
                    Environment.NewLine);

                lock (SyncRoot)
                {
                    System.IO.File.AppendAllText(logPath, entry, Encoding.UTF8);
                }
            }
            catch
            {
                // Logging must never hide the original application error.
            }
        }
    }

    public class QuickLoansController : SurfaceController, IRenderMvcController //  
    {
        private string url_api = System.Configuration.ConfigurationManager.AppSettings["quickLoanApi"];
        public string jsonLibrary = AppDomain.CurrentDomain.BaseDirectory + @"Common.JS.Library\Json\MultiAPICalls.json";

        /*private static readonly ISqlSyntaxProvider SqlSyntaxProvider =
             ApplicationContext.Current.DatabaseContext.SqlSyntax;*/

        private readonly IScopeProvider _scopeProvider;

        public QuickLoansController(IScopeProvider scopeProvider)
        {
            _scopeProvider = scopeProvider;
        }
        private IAUrlRoot GetUrlObject(string iaUrlResponse)
        {
            IAUrlRoot iAUrlRoot = JsonConvert.DeserializeObject<IAUrlRoot>(iaUrlResponse);
            return iAUrlRoot;
        }
        private OfferRoot GetOfferObject(string offerResponse)
        {
            OfferRoot _offerResults = JsonConvert.DeserializeObject<OfferRoot>(offerResponse);
            return _offerResults;
        }
        private List<ApiUrlList> GetURLs(string methodname)
        {
            List<MultiApiUrlList> jsonUrlList = JsonConvert.DeserializeObject<List<MultiApiUrlList>>(System.IO.File.ReadAllText(jsonLibrary));

            List<MultiApiUrlList> urlList = jsonUrlList
                            .Where(x => x.Name.ToString().Contains(methodname))
                            .Select(t => (MultiApiUrlList)t).ToList();

            return urlList[0].UrlList;
        }

        public bool isAuthenticatedUrl(string url)
        {
            List<ApiUrlList> urlList = GetURLs("isAuthenticatedUrl");

            bool blnReturnValue = false;
            urlList.ForEach(x =>
            {
                if (x.Url.ToString() == url)
                {
                    blnReturnValue = true;
                    return;
                }
            });
            return blnReturnValue;
        }

        private JsonResult CreateRecord(object obj)
        {
            JsonResult result = null;

            try
            {
                string connectionString = "Server=myServerName;Database=myDatabase;User Id=myUsername;Password=myPassword;";
                SqlConnection connection = new SqlConnection(connectionString);

                SqlCommand sqlCommand = new SqlCommand("INSERT INTO Table....");
                sqlCommand.Connection = connection;

                // if passed result = 1/success else failed

                return Json(new { data = result, error = false });

            }
            catch (Exception ex)
            {
                ApplicationFileLogger.Error<QuickLoansController>("CreateRecord failed.", ex);
                return Json(new { data = (object)null, error = true });
            }

        }

        // [HttpPost]
        private JsonResult AddLeadSource(string campaignSource, string idNumber, string cellPhone)
        {
            bool isSourceAdded = false;
            string sourceAdded = "";
            if (ModelState.IsValid)
            {
                CampaignSurveyQuestions mailModel = new CampaignSurveyQuestions()
                {
                    firstName = idNumber,
                    cellPhone = cellPhone,
                    email = campaignSource,
                    biggestFinancialWorry = "",
                    sexiestBankFeature = "",
                    feelLikeADinosaur = "",
                    partOfSABanking = "",
                    bankAddMoreValue = ""
                };
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    scope.Database.Insert<CampaignSurveyQuestions>(mailModel);
                    isSourceAdded = true;
                    sourceAdded = "Commit";
                }
                if (isSourceAdded)
                {
                    sourceAdded = "No commit";
                }
            }
            return Json(new { data = sourceAdded, error = false });
        }

        [HttpPost]
        //[ValidateHeaderAntiForgeryToken]
        public JsonResult LogPersonalDetails(cmsQQStepLog form)
        {
            cmsQQStepLog getLog = GetQQEntry(form.PhoneNumber);



            try
            {
                cmsQQStepLog qqLogs = new cmsQQStepLog();
                qqLogs.PhoneNumber = form.PhoneNumber;
                qqLogs.CreatedDate = DateTime.Now;
                qqLogs.utm_source = form.utm_source;
                qqLogs.utm_campaign = form.utm_campaign;
                qqLogs.utm_medium = form.utm_medium;

                if (getLog != null)
                {
                    qqLogs.Id = getLog.Id;
                }


                qqLogs.PersonalDetailsRequestString = form.PersonalDetailsRequestString; // ToQQJSONString();
                var resultValueJSON = PostSave(qqLogs);
            }
            catch (Exception ex)
            {
                ApplicationFileLogger.Error<QuickLoansController>("LogPersonalDetails failed.", ex);
                return Json(new { data = 0, error = true });
            }
            return Json(new { data = 1 });
        }










        public JsonResult LogOffersDetails(cmsQQStepLog qQStepLog)
        {
            cmsQQStepLog getLog = GetQQEntry(qQStepLog.PhoneNumber);
            // Save extra info
            cmsQQStepLog qqLogs = new cmsQQStepLog()
            {
                Offers = qQStepLog.Offers,
                CreatedDate = DateTime.Now,
                URL = qQStepLog.URL
            };

            if (getLog != null)
            {
                qqLogs.PhoneNumber = getLog?.PhoneNumber;
                qqLogs.Id = getLog.Id;
                qqLogs.PersonalDetailsRequestString = getLog.PersonalDetailsRequestString;
                qqLogs.FinancialDetails = getLog?.FinancialDetails;
                qqLogs.MarketingConsent = getLog?.MarketingConsent;
                qqLogs.SelectedOffer = getLog?.SelectedOffer;
                qqLogs.EmployeeDetails = getLog?.EmployeeDetails;
                qqLogs.OTPValue = getLog?.OTPValue;

                qqLogs.utm_source = getLog.utm_source;
                qqLogs.utm_campaign = getLog.utm_campaign;
                qqLogs.utm_medium = getLog.utm_medium;
            }

            var resultValueJSON = PostSave(qqLogs);
            return Json(new { data = resultValueJSON, error = false });
        }


        [HttpPost]
        public JsonResult LogEmployeeDetails(cmsQQStepLog qQStepLog)
        {
            cmsQQStepLog getLog = GetQQEntry(qQStepLog.PhoneNumber);
            // Save extra info
            cmsQQStepLog qqLogs = new cmsQQStepLog()
            {
                EmployeeDetails = qQStepLog.EmployeeDetails,
                CreatedDate = DateTime.Now,
                URL = qQStepLog.URL
            };

            if (getLog != null)
            {
                qqLogs.PhoneNumber = getLog?.PhoneNumber;
                qqLogs.Id = getLog.Id;
                qqLogs.PersonalDetailsRequestString = getLog.PersonalDetailsRequestString;
                qqLogs.FinancialDetails = getLog?.FinancialDetails;
                qqLogs.MarketingConsent = getLog?.MarketingConsent;
                qqLogs.SelectedOffer = getLog?.SelectedOffer;

                qqLogs.utm_source = getLog.utm_source;
                qqLogs.utm_campaign = getLog.utm_campaign;
                qqLogs.utm_medium = getLog.utm_medium;
            }

            var resultValueJSON = PostSave(qqLogs);
            return Json(new { data = resultValueJSON, error = false });
        }


        [HttpPost]
        public JsonResult LogMarketingConsentDetails(cmsQQStepLog qQStepLog)
        {
            cmsQQStepLog getLog = GetQQEntry(qQStepLog.PhoneNumber);
            // Save extra info
            cmsQQStepLog qqLogs = new cmsQQStepLog()
            {
                MarketingConsent = qQStepLog.MarketingConsent,
                CreatedDate = DateTime.Now,
                URL = qQStepLog.URL
            };

            if (getLog != null)
            {
                qqLogs.PhoneNumber = getLog?.PhoneNumber;
                qqLogs.Id = getLog.Id;
                qqLogs.PersonalDetailsRequestString = getLog.PersonalDetailsRequestString;
                qqLogs.FinancialDetails = getLog?.FinancialDetails;
                qqLogs.EmployeeDetails = getLog?.EmployeeDetails;

                qqLogs.utm_source = getLog.utm_source;
                qqLogs.utm_campaign = getLog.utm_campaign;
                qqLogs.utm_medium = getLog.utm_medium;
            }

            var resultValueJSON = PostSave(qqLogs);
            return Json(new { data = resultValueJSON, error = false });
        }





        public JsonResult LogFinancialDetails(cmsQQStepLog qQStepLog)
        {
            cmsQQStepLog getLog = GetQQEntry(qQStepLog.PhoneNumber);
            // Save extra info
            cmsQQStepLog qqLogs = new cmsQQStepLog()
            {
                FinancialDetails = qQStepLog.FinancialDetails,
                CreatedDate = DateTime.Now,
                URL = qQStepLog.URL
            };

            if (getLog != null)
            {
                qqLogs.PhoneNumber = getLog?.PhoneNumber;
                qqLogs.Id = getLog.Id;
                qqLogs.PersonalDetailsRequestString = getLog.PersonalDetailsRequestString;
                qqLogs.EmployeeDetails = getLog?.EmployeeDetails;
                qqLogs.MarketingConsent = getLog?.MarketingConsent;

                qqLogs.utm_source = getLog.utm_source;
                qqLogs.utm_campaign = getLog.utm_campaign;
                qqLogs.utm_medium = getLog.utm_medium;
            }

            var resultValueJSON = PostSave(qqLogs);
            return Json(new { data = resultValueJSON, error = false });
        }
        //private JsonResult LogIAFlag(cmsQQStepLog qQStepLog)
        //{
        //    cmsQQStepLog getLog = GetQQEntry(qQStepLog.PhoneNumber);
        //    cmsQQStepLog qqLogs = new cmsQQStepLog()
        //    {
        //        OTPValue = qQStepLog.OTPValue,
        //        Offers = qQStepLog.Offers,
        //        iaFlag = qQStepLog.iaFlag,
        // CreatedDate = DateTime.Now,
        //        URL = qQStepLog.URL
        //    };
        // qqLogs.Id = getLog.Id;
        //    qqLogs.PhoneNumber = getLog.PhoneNumber;
        //    qqLogs.PersonalDetailsRequestString = getLog.PersonalDetailsRequestString;
        //    qqLogs.FinancialDetails = getLog.FinancialDetails;

        //    qqLogs.utm_source = getLog.utm_source;
        //    qqLogs.utm_campaign = getLog.utm_campaign;
        //    qqLogs.utm_medium = getLog.utm_medium;

        //    var resultValueJSON = PostSave(qqLogs);
        //    return Json(new { data = resultValueJSON, error = false });
        //}
        private JsonResult saveIAurl(cmsQQStepLog form)
        {

            cmsQQStepLog getLog = GetQQEntry(form.PhoneNumber);
            cmsQQStepLog qqLogs = new cmsQQStepLog()
            {
                Id = getLog.Id,
                PersonalDetailsRequestString = getLog.PersonalDetailsRequestString,
                FinancialDetails = getLog.FinancialDetails,
                OTPValue = getLog.OTPValue,
                Offers = getLog.Offers,
                URL = getLog.URL,
                utm_campaign = getLog.utm_campaign,
                utm_medium = getLog.utm_medium,
                utm_source = getLog.utm_source,
                iaFlag = getLog.iaFlag,
                beginIAClicked = getLog.beginIAClicked,
                iaGeneratedURL = form.iaGeneratedURL,
                CreatedDate = DateTime.Now
            };
            qqLogs.PhoneNumber = getLog.PhoneNumber;

            var resultValueJSON = PostSave(qqLogs);
            return Json(new { data = resultValueJSON, error = false });
        }
        [HttpPost]
        public JsonResult beginIA(cmsQQStepLog form)
        {
            cmsQQStepLog getLog = GetQQEntry(form.PhoneNumber);
            cmsQQStepLog qqLogs = new cmsQQStepLog()
            {
                Id = getLog.Id,
                PersonalDetailsRequestString = getLog.PersonalDetailsRequestString,
                FinancialDetails = getLog.FinancialDetails,
                OTPValue = getLog.OTPValue,
                Offers = getLog.Offers,
                URL = getLog.URL,
                utm_campaign = getLog.utm_campaign,
                utm_medium = getLog.utm_medium,
                utm_source = getLog.utm_source,
                iaFlag = getLog.iaFlag,
                beginIAClicked = "Yes",
                CreatedDate = DateTime.Now
            };
            qqLogs.PhoneNumber = getLog.PhoneNumber;

            var resultValueJSON = PostSave(qqLogs);
            return Json(new { data = resultValueJSON, error = false });
        }

        [HttpPost]
        public JsonResult LogOTPOfferDetail(cmsQQStepLog qQStepLog)
        {
            cmsQQStepLog getLog = GetQQEntry(qQStepLog.PhoneNumber);
            cmsQQStepLog qqLogs = new cmsQQStepLog()
            {
                OTPValue = qQStepLog.OTPValue,
                Offers = qQStepLog.Offers,
                CreatedDate = DateTime.Now,
                URL = qQStepLog.URL
            };
            qqLogs.Id = getLog.Id;
            qqLogs.PhoneNumber = getLog.PhoneNumber;
            qqLogs.PersonalDetailsRequestString = getLog.PersonalDetailsRequestString;
            qqLogs.FinancialDetails = getLog.FinancialDetails;
            qqLogs.EmployeeDetails = getLog.EmployeeDetails;
            qqLogs.MarketingConsent = getLog.MarketingConsent;

            qqLogs.utm_source = getLog.utm_source;
            qqLogs.utm_campaign = getLog.utm_campaign;
            qqLogs.utm_medium = getLog.utm_medium;

            var resultValueJSON = PostSave(qqLogs);
            return Json(new { data = resultValueJSON, error = false });
        }

        [HttpPost]
        public JsonResult LogSelectedOffer(cmsQQStepLog qQStepLog)
        {
            cmsQQStepLog getLog = GetQQEntry(qQStepLog.PhoneNumber);
            cmsQQStepLog qqLogs = new cmsQQStepLog()
            {
                SelectedOffer = qQStepLog.SelectedOffer,
                CreatedDate = DateTime.Now,
                URL = qQStepLog.URL
            };
            qqLogs.Id = getLog.Id;
            qqLogs.PhoneNumber = getLog.PhoneNumber;
            qqLogs.PersonalDetailsRequestString = getLog.PersonalDetailsRequestString;
            qqLogs.FinancialDetails = getLog.FinancialDetails;
            qqLogs.EmployeeDetails = getLog.EmployeeDetails;
            qqLogs.MarketingConsent = getLog.MarketingConsent;
            qqLogs.OTPValue = getLog.OTPValue;
            qqLogs.Offers = getLog.Offers;

            qqLogs.utm_source = getLog.utm_source;
            qqLogs.utm_campaign = getLog.utm_campaign;
            qqLogs.utm_medium = getLog.utm_medium;

            var resultValueJSON = PostSave(qqLogs);
            return Json(new { data = resultValueJSON, error = false });
        }


        [HttpGet]
        public JsonResult GetQQByPhone(string phoneNumber)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(phoneNumber))
                    return Json(new { data = (object)null, error = false }, JsonRequestBehavior.AllowGet);

                cmsQQStepLog entry = GetQQEntry(phoneNumber);
                return Json(new { data = entry, error = false }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                ApplicationFileLogger.Error<QuickLoansController>("GetQQByPhone failed.", ex);
                return Json(new { data = (object)null, error = true, message = ex.Message },
                            JsonRequestBehavior.AllowGet);
            }
        }

        public cmsQQStepLog GetQQEntry(string phoneNumber)
        {
            using (var _scope = _scopeProvider.CreateScope())
            {
                // Scope.Database has what you need/want
                cmsQQStepLog tableEntry = _scope.Database.Fetch<cmsQQStepLog>(
                    "select top 1 * from cmsQQStepLog where CAST(PhoneNumber AS VARCHAR(30)) = @0 order by Id desc",
                    phoneNumber).FirstOrDefault();
                _scope.Complete();
                return tableEntry;
            }

            //var scope = _scopeProvider.CreateScope();
            //var query = new Sql("select top 1 * from cmsQQStepLog where PhoneNumber = " + phoneNumber + " order by Id desc");
            //cmsQQStepLog tableEntry = scope.Database.Fetch<cmsQQStepLog>(query).FirstOrDefault();

            /*var db = ApplicationContext.DatabaseContext.Database;
            var query = new Sql("select top 1 * from cmsQQStepLog where PhoneNumber = " + phoneNumber + " order by Id desc");
            cmsQQStepLog tableEntry = db.Fetch<cmsQQStepLog>(query).FirstOrDefault();
            return (cmsQQStepLog)tableEntry;
            return null;*/
        }

        [HttpGet]
        public JsonResult GetLoanData()
        {
            if (Session["LoanFormData"] != null)
            {
                var json = Session["LoanFormData"].ToString();
                var model = JsonConvert.DeserializeObject<ExtendedLoanFormData>(json);
                return Json(model, JsonRequestBehavior.AllowGet);
            }

            return Json(new { success = false, message = "No data in session" }, JsonRequestBehavior.AllowGet);
        }


        [HttpPost]
        public ActionResult AffiliateRedirect(ExtendedLoanFormData model)
        {
            var json = JsonConvert.SerializeObject(model);
            Session["LoanFormData"] = json;



            return Redirect("/en/home/new-get-a-quote");
        }


        public cmsQQStepLog PostSave(cmsQQStepLog qStepLog)
        {
            var scope = _scopeProvider.CreateScope(autoComplete: true);
            if (qStepLog.Id > 0)
                scope.Database.Update(qStepLog);
            else
                scope.Database.Save(qStepLog);

            return qStepLog;
        }

        [HttpPost]

        public JsonResult ValidateClient(Validate form)
        {
            string requestJSON = "";
            string url = "";

            try
            {
                List<ApiUrlList> urlList = GetURLs("ValidateClient");

                foreach (var item in urlList)
                {
                    url = item.Url;
                }
                // Build new data object to be sent to WebRequest
                var request = new QuickLoansRequest
                {
                    content = new QuickLoansRequestContent
                    {
                        serviceHeaderRequest = new QuickLoansServiceHeaderRequest()
                        {
                            channel = "Web",
                            system = "CMS",
                            user = form.mobileNumber,
                            serviceOperation = "QQ",
                            sessionId = Guid.NewGuid().ToString(),
                            clientNumber = form.idNumber
                        },
                        contactDetails = new qContactDetails()
                        {
                            phoneNumberDetails = new List<qPhoneNumberDetail>()
                           {
                               new qPhoneNumberDetail()
                               {
                                   areaCode = form.contactDetails.phoneNumberDetails.FirstOrDefault().areaCode,
                                   telephoneNumber = form.contactDetails.phoneNumberDetails.FirstOrDefault().telephoneNumber,
                                   type = form.contactDetails.phoneNumberDetails.FirstOrDefault().type,
                                   confirmAreaCode = form.contactDetails.phoneNumberDetails.FirstOrDefault().areaCode,
                                   confirmTelephoneNumber = form.contactDetails.phoneNumberDetails.FirstOrDefault().telephoneNumber,
                                   countryCode = "27"
                               }
                           },
                            emailDetails = new List<qEmailDetail>()
                           {
                               new qEmailDetail()
                               {
                                   emailAddress = form.contactDetails.emailDetails.FirstOrDefault().emailAddress,
                                   confirmEmailAddress = form.contactDetails.emailDetails.FirstOrDefault().emailAddress,
                                   type = "HOM"
                               }
                           }
                        },
                        personalDetails = new qPersonalDetails()
                        {
                            idNumber = form.personalDetails.idNumber,
                            clientType = form.personalDetails.clientType,
                            idType = "01", //  form.personalDetails.idType,
                            passportNumber = "",
                            title = form.personalDetails.title,
                            surname = form.personalDetails.surname,
                            firstName = form.personalDetails.firstName,
                            knownName = "",

                        },
                        requestObject3 = new Employment()
                        {
                            applicationEmployment = new ApplicationEmployment
                            {
                                reference = form.employments.reference ?? "",
                                wageType = form.employments.wageType ?? "",
                                salaryDepositDay = form.employments.salaryDepositDay ?? "",
                                employmentStartDate = form.employments.employmentStartDate ?? "",
                                occupationType = form.employments.occupationType ?? "",
                                employmentType = form.employments.employmentType ?? "",
                                occupationStatus = form.employments.occupationStatus ?? "",
                                contractEndDate = form.employments.contractEndDate ?? "",
                                employerName = form.employments.employerName ?? "",
                                calenderId = form.employments.calenderId ?? "",
                                employeeNumber = form.employments.employeeNumber ?? "",
                                switchBoardNumber = form.employments.switchBoardNumber ?? "",
                                switchBoardAreacode = form.employments.switchBoardAreacode ?? "",
                            }
                        },
                        requestObject4 = new FinaceDetails(form.finances),
                        requestObject5 = new Bank()
                        {
                            applicationBankingDetails = new List<ApplicationBankingDetails>()
                        {
                            new ApplicationBankingDetails
                            {
                                id = form.bank.applicationBankingDetails.FirstOrDefault().id,
                                bankCode = form.bank.applicationBankingDetails.FirstOrDefault().bankCode,
                                branchCode = form.bank.applicationBankingDetails.FirstOrDefault().branchCode,
                                accountType = form.bank.applicationBankingDetails.FirstOrDefault().accountType ,
                                accountNumber = form.bank.applicationBankingDetails.FirstOrDefault().accountNumber,
                                accountHolder = form.bank.applicationBankingDetails.FirstOrDefault().accountHolder,
                            }
                         },
                        }
                    }
                };

                requestJSON = ToJSONString(request).Replace("requestObject1", "contactDetails")
                    .Replace("requestObject2", "personalDetails")
                    .Replace("requestObject3", "employments")
                    .Replace("requestObject4", "finances")
                    .Replace("requestObject5", "banks");

                var baseAddress = url;
                var http = (HttpWebRequest)WebRequest.Create(new Uri(baseAddress));

                http.Headers.Add("Authorization", "Basic " + ReturnBasicAuth(baseAddress.Split('.')[1].ToString()));

                http.Accept = "application/json";
                http.ContentType = "application/json";
                http.Method = "POST";

                string parsedContent = requestJSON;
                ASCIIEncoding encoding = new ASCIIEncoding();
                Byte[] bytes = encoding.GetBytes(parsedContent);

                Stream newStream = http.GetRequestStream();
                newStream.Write(bytes, 0, bytes.Length);
                newStream.Close();

                var response = http.GetResponse();

                var stream = response.GetResponseStream();
                var sr = new StreamReader(stream);
                var _result = sr.ReadToEnd();
                AuditLogs auditLogs = new AuditLogs()
                {
                    IDNumber = form.idNumber,
                    Action = "ValidateClient",
                    Cellphone = form.mobileNumber,
                    DateTime = DateTime.Now,
                    Request = requestJSON,
                    Response = _result,
                    Url = url
                };

                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    scope.Database.Insert<AuditLogs>(auditLogs);
                }

                // Log for the drop off
                cmsQQStepLog qQStepLog = new cmsQQStepLog();
                qQStepLog.PhoneNumber = form.mobileNumber;
                qQStepLog.FinancialDetails = requestJSON;
                qQStepLog.URL = url;

                var qqLog = LogFinancialDetails(qQStepLog);

                return Json(new { data = _result, error = false });
            }
            catch (Exception ex)

            {
                ApplicationFileLogger.Error<QuickLoansController>("ValidateClient failed.", ex);
                AuditLogs auditLogs = new AuditLogs()
                {
                    IDNumber = form.idNumber,
                    Action = "ValidateClient",
                    Cellphone = form.mobileNumber,
                    DateTime = DateTime.Now,
                    Request = requestJSON,
                    Response = ex.Message.ToString(),
                    Url = url
                };
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    scope.Database.Insert<AuditLogs>(auditLogs);
                }
                return Json(new { data = ex.Message, error = true });
            }
        }


        [HttpPost]
        public JsonResult CreateApplication(ApplicationDetails form)
        {
            List<ApiUrlList> urlList = GetURLs("CreateApplication");

            var url = "";
            //var url = "https://api.stg.africanbank.net/rest/abPsApplications/applications";
            foreach (var item in urlList)
            {
                url = item.Url;
            }

            var request = new QuickLoansRequest
            {
                content = new QuickLoansRequestContent
                {
                    serviceHeaderRequest = new QuickLoansServiceHeaderRequest(),
                    requestObject1 = new ApplicationDetails(form)
                }
            };

            var requestJSON = ToJSONString(request).Replace("requestObject1", "applicationdetails");

            var result = WebRequestPost(url, requestJSON);
            return Json(new { data = result, error = false });

        }



        [HttpPost]
        public JsonResult CancelApplication(CancelApplicationDetails form)
        {
            List<ApiUrlList> urlList = GetURLs("CancelApplication");

            var url = "";
            foreach (var item in urlList)
            {
                url = item.Url;
            }

            var request = new QuickLoansRequest
            {
                content = new QuickLoansRequestContent
                {
                    requestLong1 = long.Parse(form.clientNumber, System.Globalization.NumberStyles.Any),
                    requestLong2 = long.Parse(form.applicationId),
                    requestString3 = "REJ",
                    serviceHeaderRequest = new QuickLoansServiceHeaderRequest()
                    {
                        uniqueTransactionID = "",
                        system = "EBANKIT",
                        serviceOperation = "CREDIT",
                        channel = "BFO",
                        applicationId = form.applicationId,
                        user = "BWayne"

                    }//,
                    // requestObject1 = new CancelApplicationDetails(form)
                }
            };

            var requestJSON = ToJSONString(request).Replace("requestLong1", "clientNumber").Replace("requestLong2", "applicationID").Replace("requestString3", "status");

            var result = WebRequestPost(url, requestJSON);
            return Json(new { data = result, error = false });
        }

        [HttpPost]
        public JsonResult OtpClientNumber(OtpClientNumber form)
        {
            List<ApiUrlList> urlList = GetURLs("OtpClientNumber");

            var url = "";
            //var url = "https://api.stg.africanbank.net/rest/abPsClients/otp";
            foreach (var item in urlList)
            {
                url = item.Url;
            }

            var request = new QuickLoansRequest
            {
                content = new QuickLoansRequestContent
                {
                    serviceHeaderRequest = new QuickLoansServiceHeaderRequest()
                    {
                        sessionId = Guid.NewGuid().ToString(),
                        applicationId = form.applicationId,
                        channel = "Web"
                    },
                    requestString1 = form.activityName
                }
            };

            url += "/" + form.clientNumber;

            var requestJSON = ToJSONString(request).Replace("requestString1", "activityName");

            var result = WebRequestPost(url, requestJSON);
            return Json(new { data = result, error = false });

        }

        [HttpPost]
        public JsonResult OtpCallBack(OtpClientCallBack form)
        {
            List<ApiUrlList> urlList = GetURLs("OtpCallBack");

            var url = "";
            //var url = "https://api.stg.africanbank.net/rest/abPsClients/otp/validate";
            foreach (var item in urlList)
            {
                url = item.Url;
            }

            var request = new QuickLoansRequest
            {
                content = new QuickLoansRequestContent
                {
                    authenticationInput = new QuickLoansAuthenticationInput()
                    {
                        uniqueID = form.uniqueId
                    },
                    serviceHeaderRequest = new QuickLoansServiceHeaderRequest()
                    {
                        channel = "Web",
                        system = "CMS",
                        applicationId = "0", //  form.applicationId
                        serviceOperation = "QQ",
                        uniqueTransactionID = null,
                        sessionId = Guid.NewGuid().ToString(),

                    },
                    requestString1 = form.otpEntered,
                    requestString2 = form.activityName
                }
            };

            url += "/" + form.clientNumber;

            var requestJSON = ToJSONString(request).Replace("requestString1", "otpEntered").Replace("requestString2", "activityName");


            var result = WebRequestPost(url, requestJSON);
            return Json(new { data = result, error = false });

        }


        [HttpPost]
        public JsonResult SaveApplicationEmployment(SaveApplicationEmployment form)
        {
            List<ApiUrlList> urlList = GetURLs("SaveApplicationEmployment");

            var url = "";
            //var url = "https://api.stg.africanbank.net/rest/abPsApplications/applications/employments";
            foreach (var item in urlList)
            {
                url = item.Url;
            }
            url += "/" + form.applicationId;

            var request = new QuickLoansRequest
            {
                content = new QuickLoansRequestContent
                {
                    serviceHeaderRequest = new QuickLoansServiceHeaderRequest()
                    {
                        serviceOperation = "CREDIT",
                        sessionId = Guid.NewGuid().ToString(),
                        applicationId = form.applicationId
                    },
                    requestObject1 = new Employment(form.employment)
                }
            };

            var requestJSON = ToJSONString(request).Replace("requestObject1", "employment");

            var result = WebRequestPost(url, requestJSON);
            return Json(new { data = result, error = false });

        }

        [HttpPost]
        public JsonResult SaveApplicationBanking(SaveApplicationBanking form)
        {
            List<ApiUrlList> urlList = GetURLs("SaveApplicationBanking");

            var url = "";
            foreach (var item in urlList)
            {
                url = item.Url;
            }
            url += "/" + form.applicationId;

            var request = new QuickLoansRequest
            {
                content = new QuickLoansRequestContent
                {
                    serviceHeaderRequest = new QuickLoansServiceHeaderRequest()
                    {
                        sessionId = Guid.NewGuid().ToString(),
                        applicationId = form.applicationId,

                    },
                    requestObject1 = new Bank(form.bank),
                    requestInt1 = int.Parse(form.clientNumber)
                }
            };



            var requestJSON = ToJSONString(request).Replace("requestObject1", "bank").Replace("requestInt1", "clientNumber");

            var result = WebRequestPost(url, requestJSON);
            return Json(new { data = result, error = false });

        }

        [HttpPost]
        public JsonResult SaveApplicationFinance(SaveApplicationFinance form)
        {
            List<ApiUrlList> urlList = GetURLs("SaveApplicationFinance");

            var url = "";
            foreach (var item in urlList)
            {
                url = item.Url;
            }
            url += "/" + form.applicationId;

            var request = new QuickLoansRequest
            {
                content = new QuickLoansRequestContent
                {
                    serviceHeaderRequest = new QuickLoansServiceHeaderRequest()
                    {
                        sessionId = Guid.NewGuid().ToString(),
                        applicationId = form.applicationId,

                    },
                    requestList1 = form.income.OfType<DynamicObject>().ToList(),
                    requestList2 = form.expense.OfType<DynamicObject>().ToList()
                }
            };



            var requestJSON = ToJSONString(request).Replace("requestList1", "income").Replace("requestList2", "expense");

            var result = WebRequestPost(url, requestJSON);
            return Json(new { data = result, error = false });

        }



        [ValidateHeaderAntiForgeryToken]
        public JsonResult SaveOffer(PatchToIOF form)
        {
            string requestJSON = "";
            string url = "";
            try
            {
                List<ApiUrlList> urlList = GetURLs("SaveOffer");
                foreach (var item in urlList)
                {
                    url = item.Url;
                }

                var request = new QuickLoansRequest
                {
                    content = new QuickLoansRequestContent
                    {
                        serviceHeaderRequest = new QuickLoansServiceHeaderRequest()
                        {
                            system = "EBANKIT",
                            uniqueTransactionID = form.uniqueTransactionId,
                            serviceOperation = "CLIENT",
                            channel = "Web",
                            clientNumber = form.clientNumber.ToString(),
                            sessionId = Guid.NewGuid().ToString(),
                            applicationId = form.applicationId.ToString(),
                            user = "CALLSM95"
                        },
                        requestObject1 = new SaveOfferQuickLoan()
                        {
                            offerId = form.offerId,
                            clientNumber = form.clientNumber,
                            applicationId = form.applicationId,
                            uniqueId = form.uniqueId
                        }
                    }
                };
                requestJSON = ToJSONString(request).Replace("requestObject1", "offer");
                var result = WebRequestPost(url, requestJSON);
                AuditLogs auditLogs = new AuditLogs()
                {
                    IDNumber = form.IDNumber,
                    Action = "SaveOffer",
                    Cellphone = form.mobileNumber,
                    DateTime = DateTime.Now,
                    Request = requestJSON,
                    Response = result,
                    Url = url
                };

                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    scope.Database.Insert<AuditLogs>(auditLogs);
                }

                cmsQQStepLog qQStepLog = new cmsQQStepLog();
                qQStepLog.PhoneNumber = form.mobileNumber;
                qQStepLog.SelectedOffer = requestJSON;
                qQStepLog.URL = url;

                var qqLog = LogSelectedOffer(qQStepLog);

                return Json(new { data = result, error = false });
            }
            catch (Exception ex)
            {
                ApplicationFileLogger.Error<QuickLoansController>("SaveOffer failed.", ex);
                AuditLogs auditLogs = new AuditLogs()
                {
                    IDNumber = form.IDNumber,
                    Action = "SaveOffer",
                    Cellphone = form.mobileNumber,
                    DateTime = DateTime.Now,
                    Request = requestJSON,
                    Response = ex.Message,
                    Url = url
                };
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    scope.Database.Insert<AuditLogs>(auditLogs);
                }
                return Json(new { data = (object)null, error = true });
            }
        }

        [HttpPost]
        public JsonResult GetQuestionnaireForID(string number)
        {
            List<ApiUrlList> urlList = GetURLs("QuestionnaireForID");

            var url = "";
            foreach (var item in urlList)
            {
                url = item.Url;
            }

            var request = new QuestionnaireForID
            {
                id = number,
                idType = "01",
                language = "en",
                country = "GB"
            };

            var requestJSON = QuestionnaireJSONString(request);

            var result = WebRequestWithHeadersPost(url, requestJSON, number);

            // Fetch QQStepLogRow for this transaction
            cmsQQStepLog stepLog = null;
            using (var _scope = _scopeProvider.CreateScope())
            {
                stepLog = _scope.Database.Fetch<cmsQQStepLog>("select top 1 * from cmsQQStepLog where PersonalDetailsRequestString LIKE '%" + number + "%' AND beginIAClicked='Yes' OR iaFlag ='1' order by Id desc").FirstOrDefault();
                _scope.Complete();
            }

            // Save the IA Generated URL
            IAUrlRoot iaResponse = GetUrlObject(result);
            string iaGeneratedUrl = iaResponse.data.questionnaireUrl;

            stepLog.iaGeneratedURL = iaGeneratedUrl;
            stepLog.CreatedDate = DateTime.Now;
            var qqLog = PostSave(stepLog);

            return Json(new { data = result, error = false });
        }


        [HttpPost]
        [ValidateHeaderAntiForgeryToken]
        public JsonResult GetOffers(OtpClientCallBack form) // GetOffers form)
        {
            string requestJSON = "";
            string url = "";
            try
            {
                List<ApiUrlList> urlList = GetURLs("GetOffer");

                foreach (var item in urlList)
                {
                    url = item.Url;
                }

                var request = new QuickLoansRequest
                {
                    content = new QuickLoansRequestContent
                    {
                        authenticationInput = new QuickLoansAuthenticationInput()
                        {
                            uniqueID = form.uniqueId
                        },
                        serviceHeaderOfferRequest = new QuickLoansServiceHeaderOfferRequest()
                        {
                            channel = "CMS",
                            system = "EBANKIT",
                            user = "TALT13",
                            applicationId = 0,
                            serviceOperation = "CLIENT",

                            uniqueTransactionID = form.uniqueId,
                            sessionId = Guid.NewGuid().ToString()

                        },
                        requestLong1 = long.Parse(form.otpEntered),
                        requestString2 = "ContactabilityQQ" // form.activityName
                    }
                };

                requestJSON = ToJSONString(request).Replace("requestLong1", "otpEntered").Replace("requestString2", "activityName");
                requestJSON = requestJSON.Replace("serviceHeaderOfferRequest", "serviceHeaderRequest");
                var result = WebRequestPost(url, requestJSON);

                #region Audit Logging
                AuditLogs auditLogs = new AuditLogs()
                {
                    IDNumber = form.IDNumber,
                    Action = "GetOffers",
                    Cellphone = form.mobileNumber,
                    DateTime = DateTime.Now,
                    Request = requestJSON,
                    Response = result,
                    Url = url
                };
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    scope.Database.Insert<AuditLogs>(auditLogs);
                }
                #endregion

                #region LogIA
                // OfferRoot offerResponse = GetOfferObject(result);

                // BLOCKING OFF STEP LOGGING: START //
                //JObject jsonObject = JObject.Parse(result);
                //int iaFlag = 0;
                //if (jsonObject["results"]["offerResponse"]["iaFlag"] != null) // in case there is no property within the JSON string...
                //{
                //    iaFlag = (int)jsonObject["results"]["offerResponse"]["iaFlag"];
                //}                
                //cmsQQStepLog qQStepLog = new cmsQQStepLog();
                //qQStepLog.PhoneNumber = form.mobileNumber;
                //qQStepLog.OTPValue = requestJSON;
                //qQStepLog.Offers = ToQQJSONString(result);
                //qQStepLog.URL = url;
                //qQStepLog.iaFlag = iaFlag.ToString();

                //var qqLog = LogIAFlag(qQStepLog);
                //var _qqLog = LogOTPOfferDetail(qQStepLog);

                // BLOCKING OFF STEP LOGGING: END //

                #endregion

                cmsQQStepLog log = new cmsQQStepLog();

                log.Offers = result;
                log.PhoneNumber = form.mobileNumber;

                LogOffersDetails(log);

                return Json(new { data = result, error = false });
            }
            catch (Exception ex)
            {
                AuditLogs auditLogs = new AuditLogs()
                {
                    IDNumber = form.IDNumber,
                    Action = "GetOffers",
                    Cellphone = form.mobileNumber,
                    DateTime = DateTime.Now,
                    Request = requestJSON,
                    Response = ex.Message,
                    Url = url
                };
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    scope.Database.Insert<AuditLogs>(auditLogs);
                }
                return Json(new { data = ex.Message, error = false });
            }
        }

        [HttpPost]
        //[ValidateHeaderAntiForgeryToken]
        public JsonResult SaveClientDetails(Web.Controllers.PersonalDetails form)
        {
            List<ApiUrlList> urlList = GetURLs("SaveClientDetails");

            var url = "";
            foreach (var item in urlList)
            {
                url = item.Url;
            }

            var request = new QuickLoansRequest
            {
                content = new QuickLoansRequestContent
                {
                    serviceHeaderRequest = new QuickLoansServiceHeaderRequest()
                }
            };

            var requestJSON = ToJSONString(request).Replace("requestObject1", "personalDetails");

            var result = WebRequestPost(url, requestJSON);
            return Json(new { data = result, error = false });

        }

        [HttpPost]
        //[ValidateHeaderAntiForgeryToken]
        public JsonResult SaveClientContactDetails(SaveClientContactDetails form)
        {
            List<ApiUrlList> urlList = GetURLs("SaveClientContactDetails");

            string url = "";
            foreach (var item in urlList)
            {
                url = item.Url;
            }

            var request = new QuickLoansRequest
            {
                content = new QuickLoansRequestContent
                {
                    serviceHeaderRequest = new QuickLoansServiceHeaderRequest()
                }
            };

            url += "/" + form.clientNumber;

            var requestJSON = ToJSONString(request).Replace("requestObject1", "contactDetails");

            var result = WebRequestPost(url, requestJSON);
            return Json(new { data = result, error = false });

        }

        [HttpGet]
        public string SearchEmployer(string employerName, string employeeType)
        {
            List<ApiUrlList> urlList = GetURLs("SearchEmployer");

            string url = "";
            //string url = "https://api.stg.africanbank.net/rest/abPsParameters/parameters/employer/search";
            foreach (var item in urlList)
            {
                url = item.Url;
            }
            url += "/" + employerName + "/" + employeeType;

            var result = WebRequestGet(url);
            return result;
        }

        [HttpGet]
        public string GetEmploymentTypes()
        {
            List<ApiUrlList> urlList = GetURLs("GetEmploymentTypes");

            string url = "";
            //string url = "https://api.stg.africanbank.net/rest/abPsEbanKITClientService/parameters/employment-type";
            foreach (var item in urlList)
            {
                url = item.Url;
            }

            var result = WebRequestGet(url);

            return result;
        }

        [HttpGet]
        public string GetOccupationTypes(string occType)
        {
            string result = "";
            if (!string.IsNullOrEmpty(occType))
            {
                List<ApiUrlList> urlList = GetURLs("GetOccupationTypes");

                string url = "";
                //string url = "https://api.stg.africanbank.net/rest/abPsParameters/parameters/occupation-status-" + occType.ToLower().ToString();
                foreach (var item in urlList)
                {
                    url = item.Url;
                }
                url = url.ToString() + occType.ToLower().ToString();
                result = WebRequestGet(url);
            }
            return result;
        }

        [HttpGet]
        public string SearchBank(string _bankName)
        {
            List<ApiUrlList> urlList = GetURLs("SearchBank");
            string url = "";
            foreach (var item in urlList)
            {
                url = item.Url;
            }


            var result = WebRequestGet(url);

            return result;
        }


        //Helpers
        public string WebRequestPatch(string url, string requestJSON)
        {
            try
            {
                var httpWebRequest = (HttpWebRequest)WebRequest.Create(url);
                httpWebRequest.ContentType = "application/json";
                httpWebRequest.Method = "PATCH";

                if (isAuthenticatedUrl(url))
                {
                    httpWebRequest.Credentials = new NetworkCredential("ebankit", "manage");
                }

                using (var streamWriter = new StreamWriter(httpWebRequest.GetRequestStream()))
                {
                    streamWriter.Write(requestJSON);
                    streamWriter.Flush();
                    streamWriter.Close();
                }

                var httpResponse = (HttpWebResponse)httpWebRequest.GetResponse();
                using (var streamReader = new StreamReader(httpResponse.GetResponseStream()))
                {
                    var result = streamReader.ReadToEnd();

                    return result;
                }
            }
            catch (Exception e)
            {

                return e.Message;

            }
        }
        private string ReturnBasicAuth(string partialUrl)
        {
            string username = "ebankit";
            string password = "";

            if (partialUrl == "dev")
            {
                password = "manage"; //<-- DEV PASS 
            }
            else if (partialUrl == "int")
            {
                password = "manage"; //<-- INT PASS 
            }
            else if (partialUrl == "stg")
            {
                password = "15m14i16a19s23o18d"; //<-- STG PASS 
            }
            else if (partialUrl == "trn")
            {
                password = "P3yqhYUM74wTs8Rr"; //< --TRN PASS // 
            }
            else
            {
                password = "FZZ3DSpfBzFqE8NA"; //< -- LIVE/PRD PASS 
            }

            string svcCredentials = Convert.ToBase64String(ASCIIEncoding.ASCII.GetBytes(username + ":" + password));
            return svcCredentials;
        }

        public string WebRequestWithHeadersPost(string url, string requestJSON, string number)
        {
            try
            {
                var baseAddress = url;
                var http = (HttpWebRequest)WebRequest.Create(new Uri(baseAddress));
                http.Accept = "application/json";
                if (isAuthenticatedUrl(baseAddress))
                {
                    http.Headers.Add("Authorization", "Basic " + ReturnBasicAuth(url.Split('.')[1].ToString()));
                    http.Headers.Add("X-Channel", "WEB");
                    http.Headers.Add("X-Service-Operation", " getURL");
                    http.Headers.Add("X-System", "WEB");
                    http.Headers.Add("X-User", "  User1");
                    http.Headers.Add("X-Client-Number", number);
                    http.Headers.Add("X-Session-ID", "12341");
                }
                http.ContentType = "application/json";
                http.Method = "POST";

                string parsedContent = requestJSON;
                ASCIIEncoding encoding = new ASCIIEncoding();
                Byte[] bytes = encoding.GetBytes(parsedContent);

                Stream newStream = http.GetRequestStream();
                newStream.Write(bytes, 0, bytes.Length);
                newStream.Close();

                var response = http.GetResponse();

                var stream = response.GetResponseStream();
                var sr = new StreamReader(stream);
                var result = sr.ReadToEnd();
                return result;
            }
            catch (Exception ex)
            {
                ApplicationFileLogger.Error<QuickLoansController>("WebRequestWithHeadersPost failed.", ex);
                return ex.Message;
            }
        }

        public string WebRequestPost(string url, string requestJSON)
        {
            try
            {
                var baseAddress = url;
                var http = (HttpWebRequest)WebRequest.Create(new Uri(baseAddress));
                if (isAuthenticatedUrl(baseAddress))
                {
                    http.Headers.Add("Authorization", "Basic " + ReturnBasicAuth(url.Split('.')[1].ToString()));
                }
                else
                {
                    http.Headers.Add("Authorization", "Basic " + ReturnBasicAuth(url.Split('.')[1].ToString()));
                }
                http.Accept = "application/json";
                http.ContentType = "application/json";
                http.Method = "POST";

                string parsedContent = requestJSON;
                ASCIIEncoding encoding = new ASCIIEncoding();
                Byte[] bytes = encoding.GetBytes(parsedContent);

                Stream newStream = http.GetRequestStream();
                newStream.Write(bytes, 0, bytes.Length);
                newStream.Close();

                var response = http.GetResponse();

                var stream = response.GetResponseStream();
                var sr = new StreamReader(stream);
                var result = sr.ReadToEnd();
                return result;
            }
            catch (Exception ex)
            {
                ApplicationFileLogger.Error<QuickLoansController>("WebRequestPost failed.", ex);
                return ex.Message;
            }


        }

        public string WebRequestGet(string url)
        {
            try
            {
                var httpWebRequest = (HttpWebRequest)WebRequest.Create(url);
                httpWebRequest.ContentType = "application/json";
                httpWebRequest.Method = "Get";

                if (isAuthenticatedUrl(url))
                {
                    httpWebRequest.Credentials = new NetworkCredential("ebankit", "manage");
                }


                var httpResponse = (HttpWebResponse)httpWebRequest.GetResponse();
                using (var streamReader = new StreamReader(httpResponse.GetResponseStream()))
                {
                    var result = streamReader.ReadToEnd();

                    return result;
                }
            }
            catch (Exception e)
            {

                return e.Message;

            }
        }

        public string ToJSONString(QuickLoansRequest request)
        {
            return JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore, DefaultValueHandling = DefaultValueHandling.Ignore });
        }

        public string ToQQJSONString(string request)
        {
            return JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore, DefaultValueHandling = DefaultValueHandling.Ignore });
        }
        public string QuestionnaireJSONString(QuestionnaireForID request)
        {
            return JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore, DefaultValueHandling = DefaultValueHandling.Ignore });
        }


        public ActionResult Index(ContentModel model)
        {
            return View(model);
            // throw new NotImplementedException();
        }
    }
}
