using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Helpers;
using System.Web.Mvc;
using System.Web.Script.Serialization;
using Umbraco.Core;
using Umbraco.Core.Scoping;
using Umbraco.Web.Mvc;
using Web.CustomValidators;
using Web.Entities;
using Web.Models;
using Web.Models.CustomModels;
using Web.Models.QuickLoanModels;
using Web.Models.TrackMyLoanModels;

namespace Web.Controllers
{
    public class CustomController : SurfaceController
    {

        private string url_api = System.Configuration.ConfigurationManager.AppSettings["creditLife"];
        private string credit_url_api = System.Configuration.ConfigurationManager.AppSettings["creditApi"];
        private string Investment_url_api = System.Configuration.ConfigurationManager.AppSettings["invetmentApi"];

        private string application_tracker_url = System.Configuration.ConfigurationManager.AppSettings["applicationTrackerApi"];
        private string getApplication_tracker_url = System.Configuration.ConfigurationManager.AppSettings["getApplicationTrackerApi"];
        private string getOffersUrl = System.Configuration.ConfigurationManager.AppSettings["getApplicationTrackerGetOfferApi"];
        private string getDocumentsUrl = System.Configuration.ConfigurationManager.AppSettings["getApplicationTrackerGetDocumentsApi"];
        private string send_SMS_url = System.Configuration.ConfigurationManager.AppSettings["sendSMSApi"];

        public string jsonCallMeBackVariables = AppDomain.CurrentDomain.BaseDirectory + @"Common.JS.Library\Json\json.json";

        private string service_type = "serviceType";
        private string service_event = "Credit Card Application";
        private string channel_indicator = "WEB";
        private long import_dateTime = 1503471986824;
        private string lead_source = "VB_DF_CALLBACK";

        private int client_number = 123;

        private string x_channel = "open-api";
        private string x_system = "VB_DF_CALLBACK";
        private string x_user = "xCMS";

        private string x_ServiceOperation = "test";
        private int x_SessionId = 12341;
        //private string service_operation = "Lead";
        //private string channel_ser = "WEB";
        //private string system_ser = "AB";
        //private int application_id = 0;

        private string mail_to = "ABsocialmedia@africanbank.co.za";

        private string network_host = "midrandcasarray.africanbank.net";

        private string network_user = "ABsocialmedia";
        private string network_pass = "sW6oWFqkGL`acBFNUV=,";
        private string network_port = "25";

        private readonly IScopeProvider _scopeProvider;

        public CustomController(IScopeProvider scopeProvider)
        {
            _scopeProvider = scopeProvider;
        }
        private string buildHTML(CampaignGrowForIt form, string urlResource, int _term, double _amount, string checkPoint, string monthlyAmount, string formattedValue)
        {
            int periodCheckPointAdjusted = form.period / 6;

            int daysInMonth = 0;



            DateTime today = DateTime.Now;
            daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);
            var checkDate1 = daysInMonth + " " + today.ToString("MMMM yyyy");

            today = today.AddMonths(periodCheckPointAdjusted);
            daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);
            var checkDate2 = daysInMonth + " " + today.ToString("MMMM yyyy");

            today = today.AddMonths(periodCheckPointAdjusted);
            daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);
            var checkDate3 = daysInMonth + " " + today.ToString("MMMM yyyy");

            today = today.AddMonths(periodCheckPointAdjusted);
            daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);
            var checkDate4 = daysInMonth + " " + today.ToString("MMMM yyyy");

            today = today.AddMonths(periodCheckPointAdjusted);
            daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);
            var checkDate5 = daysInMonth + " " + today.ToString("MMMM yyyy");

            today = today.AddMonths(periodCheckPointAdjusted);
            daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);
            var checkDate6 = "01 " + today.ToString("MMMM yyyy");

            var html = "<html>" +
                             "<head> " +
                                "<style> @font-face { font-family: 'ABFont'; src: url('" + urlResource + "Pacifico-Regular.ttf'); }" +
                                "@font-face { font-family: 'GenText'; " +
                                "src: url('" + urlResource + "IdealSans-Black-Pro.otf'); } " +
                                "#page-1{ position:relative; } " +
                                "#page-2{ position:relative;margin-top:100px;border:solid 1px; } " +
                                "#end-point{ position: absolute; bottom: 102px; right: 69px; font-size: 30px !important; } " +
                                "#customer-name{ position: relative;top:140px;font-size:40px;font-weight:500;text-align:center;} " +
                                "#plan{ line-height:54px;position:absolute;top:277px;right: 96px;text-align:center;font-size:35px;font-weight:500;width: 666px;margin-top: 104px; } " +
                                "#aggreement b{ margin-bottom: -22px; display: block;} " +
                                "#aggreement{ position: absolute; top: 542px; right: 96px; text-align: center; font-size: 35px; font-weight: 500; width: 666px; line-height: 60px; color: #002C5D; } " +
                                "#name-on-certificate{ position: relative; top: 114px; transform: rotate(-4deg);text-align: center;" +
                                "font-size: 60px; font-weight: 500; } " +
                                "#customer-name,#aggreement," +
                                "#name-on-certificate,#plan,#name-on-certificate{ font-family:GenText; } " +
                                "#name-on-certificate ,#customer-name,#plan{ color:#002C5D; } " +
                                "#aggreement span, #plan span,#end-point{ font-family:ABFont; color:#8eb931; font-size:40px; } " +
                                "#page-1 .check-point{ font-family:GenText; font-size: 16px; font-weight: 100; color:#002C5D; } " +
                                "#end-point span{ } " +
                                ".signature-section { font-weight: unset !important;position:absolute; " +
                                    "text-align: center;font-size: 21px;" +
                                    "font-family: sans-serif;" +
                                    "color: #002c5d; " +
                                 "}" +
                                "</style> " +
                             "</head>" +
                             "<body> " +
                                "<div style='width:900px; height:auto; margin:auto;'>" +
                                    "<div id='page-1'>" +
                                        "<div id='customer-name'>" + form.firstName + "'s</div>" +
                                        "<hr style='width:50%;position: relative;top: 315px;' />" +
                                        "<p id='plan'>By saving <span>R " + monthlyAmount + "</span> a month,<br>I'll be able to save for<br>" +
                                            "<span> " + form.itemName + "<br></span>by<br>" +
                                            "<span>" + checkDate5 + "</span>" +
                                        "</p> " +
                                        "<div>" +
                                            "<span class='check-point' style='right: 448px;position: absolute;top: 709px;width: 20%;color: #8eb931;font-size: 21px;" +
                                            "font-weight: 100;'>Congratulations on your first save</span>" +
                                            "<span class='check-point' style='right: 492px;position: absolute;top: 768px;text-transform: uppercase;'>"
                                                + checkDate1 +
                                            "</span>" +
                                        "</div> " +
                                        "<span class='check-point' style='right: 181px;position: absolute;top:761px;width: 20%;" +
                                        "color: #8eb931;font-size: 21px;'>You're getting close. Keep going!</span>" +
                                        "<span class='check-point' style='right: 211px;position: absolute;top: 814px;text-transform: uppercase;'>"
                                            + checkDate2 +
                                        "</span> " +
                                        "<span class='check-point' style='left: 508px; position: absolute; top: 916px; " +
                                        "color: #8eb931;font-size: 21px;'>You're halfway there!</span>" +
                                        "<span class='check-point' style='left: 505px;position: absolute;top: 941px;text-transform: uppercase;'>"
                                            + checkDate3 +
                                        "</span> " +
                                        "<span class='check-point' style='right: 577px; position: absolute; top:921px; " +
                                        "color: #8eb931;width: 20%;font-size: 21px;'>So close! What can you save on even more?</span>" +
                                        "<span class='check-point' style='right: 584px;position: absolute;top: 999px;text-transform: uppercase;'>"
                                            + checkDate4 +
                                        "</span> " +

                                        "<span class='check-point' style='right: 344px;position: absolute;top: 988px;" +
                                        "width:20%;color: #8eb830;font-size: 21px;'>Yay! You are just around the corner!</span>" +

                                        "<span class='check-point' style='right: 379px;position: absolute;top: 1068px;text-transform: uppercase;'>"
                                            + checkDate5 +
                                        "</span> " +
                                        "<img src='" + urlResource + "Gameplan outline-8.png' width='100%' height='auto' alt='african-bank-gameplan-map-outline'> " +
                                        "<p id='end-point' style='right: 135px;'>" + formattedValue + "<br>" +
                                            "<span class='check-point' style='text-transform: uppercase;'> " +
                                                checkDate6 +
                                            "</span>" +
                                        "</p>" +
                                        "</div>" +
                                        "<div id='page-2' style='position:relative'>" +
                                            "<div id='name-on-certificate'>" + form.firstName + "</div>" +
                                            "<p id='aggreement'> " +
                                                "<b>I'm saving for<br/>" +
                                                "<span>" + form.itemName + "</span></b><br>" +
                                                "To do that, I've committed to saving<br>" +
                                                "<span>R " + monthlyAmount + "</span> a month, starting from<br>" +
                                                "<span>" + checkDate1 + "</span><br/><br/><br/>" +
                                                "<span style='font-size:30px;color: #002C5D !important;font-weight:unset !important; font-family:sans-serif !important;'>Signed by me .........................</span>" +
                                            "</p>" +
                                            "<img src='" + urlResource + "Pledge-Certificate.png' width='100%' height='auto' style='margin-top: -74px;' alt='african-bank-pledge-certificate'> " +
                                        "</div> " +
                                      "</div> " +
                                    "</body>" +
                                 "</html>";
            return html;
        }

        private static CultureInfo GetAppropriateCulture(string input)
        {
            if (input.StartsWith("R"))
                return CultureInfo.CreateSpecificCulture("en-ZA");
            if (input.StartsWith("$"))
                return CultureInfo.CreateSpecificCulture("en-US");
            if (input.StartsWith("£"))
                return CultureInfo.CreateSpecificCulture("en-GB");
            if (input.StartsWith("€") || input.EndsWith("€"))
                return CultureInfo.CreateSpecificCulture("de-DE");
            return CultureInfo.InvariantCulture;
        }

        private string buildEmailBody(string name, string cellphone, string email, string biggestWorry, string sexiestBankFeatures, string feelingLikeADinosaur, string partOfSABankingCommunity, string howCanYourBankAddMoreValue)
        {
            string html = "<div>Name:<b> " + name + "</b></div>" +
                "<div>Cellphone:<b> " + cellphone + "</b></div>" +
                "<div>Email:<b> " + email + "</b></div><br>" +
                "<table border='0'>" +
                "<tr><td>My biggest financial worry each month: </td>" +
                "<td><b>" + biggestWorry + "</td></tr>" +
                "<tr><td>Sexiest bank feature I look for: </td>" +
                "<td><b>" + sexiestBankFeatures + "</b></td></tr>" +
                "<tr><td>Do you feel like a dinosaur if you visit your branch?: </td>" +
                "<td><b>" + feelingLikeADinosaur + "</b></td></tr>" +
                "<tr><td>Are you part of SA’s shared banking community?: </td>" +
                "<td><b>" + partOfSABankingCommunity + "</b></td></tr>" +
                "<tr><td>How can your bank add more value in your life?: </td>" +
                "<td><b>" + howCanYourBankAddMoreValue + "</b></td></tr></table>";

            return html;
        }

        private bool sendMail(CampaignSurveyQuestions mailModel)
        {
            bool isMailSent = false;

            try
            {
                var message = new MailMessage();
                message.To.Add(new MailAddress(mail_to));
                message.From = new MailAddress(mailModel.email);
                message.Subject = "African Bank & Sowetan Live Campaign Competition";
                string mailBodyValues = buildEmailBody(mailModel.firstName, mailModel.cellPhone, mailModel.email, mailModel.biggestFinancialWorry, mailModel.sexiestBankFeature, mailModel.feelLikeADinosaur, mailModel.partOfSABanking, mailModel.bankAddMoreValue);
                message.Body = string.Format(mailBodyValues, mailModel.firstName, mailModel.cellPhone, mailModel.email);
                message.IsBodyHtml = true;

                using (var smtp = new SmtpClient())
                {
                    var credential = new NetworkCredential
                    {
                        UserName = network_user,
                        Password = network_pass
                    };
                    smtp.UseDefaultCredentials = true;
                    smtp.Credentials = credential;
                    smtp.Host = network_host;
                    smtp.Port = Convert.ToInt32(network_port);
                    smtp.Send(message);
                    isMailSent = true;
                }
            }
            catch (Exception e)
            {
                isMailSent = false;
            }
            return isMailSent;
        }

        private List<ApiUrlList> GetJsonData(string methodname)
        {
            List<MultiApiUrlList> jsonUrlList = JsonConvert.DeserializeObject<List<MultiApiUrlList>>(System.IO.File.ReadAllText(jsonCallMeBackVariables));

            List<MultiApiUrlList> urlList = jsonUrlList
                            .Where(x => x.Name.ToString().Contains(methodname))
                            .Select(t => (MultiApiUrlList)t).ToList();

            return urlList[0].UrlList;
        }

        [HttpPost]
        [ValidateHeaderAntiForgeryToken]
        public JsonResult SaveVirginActive(cmsVirginActive virginObj)
        {
            bool isConsentSaved = false;
            try
            {
                if (ModelState.IsValid)
                {
                    virginObj.consentDate = DateTime.Now;
                    using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                    {
                        scope.Database.Insert<cmsVirginActive>(virginObj);
                    }
                    var getJsonData = GetJsonData("CallMeBack");
                    // Create a Call Me Back Functionality
                    Form formCallMeBack = new Form()
                    {
                        FirstNameInput = virginObj.Name,
                        LastNameInput = virginObj.Surname,
                        SAIDInput = virginObj.IdNumber.ToString(),
                        CellPhoneInput = virginObj.Cellphone,
                        EmailInput = virginObj.Email,
                        cbx = "on",
                        frmLeadSource = "Virgin Active"
                    };
                    x_system = "Virgin Active";

                    call_me_request(formCallMeBack, int.Parse(getJsonData[0].Url), getJsonData[1].Url, getJsonData[2].Url);
                }
                else
                {
                    Console.WriteLine("Model not valid");
                }
            }
            catch (Exception ex)
            {
                return Json(new { data = isConsentSaved.ToString(), error = false });
            }
            return Json(new { data = isConsentSaved.ToString(), error = false });
        }

        [HttpPost]
        [ValidateHeaderAntiForgeryToken]
        public JsonResult SaveConsent(Models.MarketingConsent marketingObj)
        {
            bool isConsentSaved = false;
            try
            {
                if (ModelState.IsValid)
                {
                    marketingObj.consentDate = DateTime.Now;

                    using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                    {
                        scope.Database.Insert<Models.MarketingConsent>(marketingObj);
                    }
                }
                else
                {
                    Console.WriteLine("Model not valid");
                }
            }
            catch (Exception ex)
            {
                return Json(new { data = isConsentSaved.ToString(), error = false });
            }
            return Json(new { data = isConsentSaved.ToString(), error = false });
        }


        [HttpPost]
        public JsonResult SendSurveyMail(FormCollection form)
        {
            string mailSent = "";
            if (ModelState.IsValid)
            {
                CampaignSurveyQuestions mailModel = new CampaignSurveyQuestions()
                {
                    firstName = Request.Form["firstName"],
                    cellPhone = Request.Form["cellPhone"],
                    email = Request.Form["email"],
                    biggestFinancialWorry = Request.Form["ddInputResult0"],
                    sexiestBankFeature = Request.Form["ddInputResult1"],
                    feelLikeADinosaur = Request.Form["ddInputResult2"],
                    partOfSABanking = Request.Form["ddInputResult3"],
                    bankAddMoreValue = Request.Form["howCanBankAddMore"]
                };

                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    scope.Database.Insert<CampaignSurveyQuestions>(mailModel);
                }
                if (sendMail(mailModel))
                {
                    mailSent += "; Mail sent!";
                }
                else
                {
                    mailSent += "; Mail not sent";
                }
            }
            else
            {
                Console.WriteLine("Model not valid");
            }
            return Json(new { data = mailSent, error = false }); ; //return CurrentUmbracoPage(); 
        }

        public JsonResult newOptOut(FormCollection form)
        {
            string mailSent = "";
            if (ModelState.IsValid)
            {
                CampaignSurveyQuestions mailModel = new CampaignSurveyQuestions()
                {
                    firstName = Request.Form["firstName"],
                    cellPhone = Request.Form["cellPhone"],
                    email = Request.Form["email"],
                    biggestFinancialWorry = "",
                    sexiestBankFeature = "",
                    feelLikeADinosaur = "",
                    partOfSABanking = "",
                    bankAddMoreValue = ""
                };
                using (var scope = _scopeProvider.CreateScope())
                {
                    //DB Stuff
                    scope.Database.Insert<CampaignSurveyQuestions>(mailModel);
                    scope.Complete();
                }
                if (sendMail(mailModel))
                {
                    mailSent += "; Mail sent!";
                }
                else
                {
                    mailSent += "; Mail not sent";
                }
            }
            else
            {
                Console.WriteLine("Model not valid");
            }
            return Json(new { data = mailSent, error = false }); ; //return CurrentUmbracoPage(); 
        }

        [HttpPost]
        // [ValidateHeaderAntiForgeryToken]
        public ActionResult Growit(FormCollection form)
        {

            var _commaValue = Request.Form["amount"].Replace(".", ",");
            decimal decValue = 0.0M;
            decimal.TryParse(_commaValue, NumberStyles.Currency, GetAppropriateCulture(_commaValue), out decValue);

            String formattedValue = Request.Form["amount"];

            CampaignGrowForIt growForIt = new CampaignGrowForIt()
            {
                firstName = Request.Form["firstName"],
                amount = decValue,
                email = Request.Form["email"],
                itemName = Request.Form["itemName"],
                period = Convert.ToInt32(Request.Form["period"])
            };
            string licValue = ConfigurationManager.AppSettings.Get("IronPdf.LicenseKey").ToString();

            return CurrentUmbracoPage(); // RedirectToCurrentUmbracoPage();
        }
        private string ToConfigJSONString(List<configurableParams> request)
        {
            return JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore, DefaultValueHandling = DefaultValueHandling.Ignore });
        }
        private string ToJSONString(object request)
        {
            return JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore, DefaultValueHandling = DefaultValueHandling.Ignore });
        }
        private string ToSMSJSONString(SMS request)
        {
            return JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore, DefaultValueHandling = DefaultValueHandling.Ignore });
        }
        private string returnHttpReponse(HttpWebResponse response)
        {
            string rtnMessage = "";
            int rtnLength = 0;
            switch (response.StatusCode)
            {
                case HttpStatusCode.NoContent: // 204
                    rtnMessage = "Your Call Me Back request has been submitted. Please expect a call from one of our friendly agents within 5 minutes.";
                    rtnLength = 9000;
                    return rtnMessage + ";" + 204 + ";" + rtnLength;
                // break;
                case HttpStatusCode.OK: // 200
                    rtnMessage = "Your Call Me Back request has been submitted. Please expect a call from one of our friendly agents within 5 minutes.";
                    rtnLength = 9000;
                    return rtnMessage + ";" + 200 + ";" + rtnLength;
                case HttpStatusCode.BadRequest: // 400
                    rtnMessage = "Unfortunately, you do not qualify for a credit product right now. Let African Bank help you to improve your credit score and your financial fitness. Click <a href='https://ib.africanbank.co.za/'><b>here</b></a> to apply now for a MyWORLD bank account with zero monthly bank fees";
                    rtnLength = 9000;
                    break;
                case (HttpStatusCode)422: // 
                    rtnMessage = "Unfortunately, we are experiencing technical issues. Please try again in a few minutes.";
                    rtnLength = 9000;
                    break;
                case (HttpStatusCode)429: // 
                    rtnMessage = "Unfortunately, we are experiencing technical issues. Please try again in a few minutes.";
                    rtnLength = 9000;
                    break;
                case HttpStatusCode.InternalServerError: // 500
                    rtnMessage = "Unfortunately, we are experiencing technical issues. Please try again in a few minutes.";
                    rtnLength = 9000;
                    break;
                case HttpStatusCode.GatewayTimeout: // 504
                    rtnMessage = "Unfortunately, we are experiencing technical issues. Please try again in a few minutes.";
                    rtnLength = 9000;
                    break;
                case HttpStatusCode.BadGateway: // 502
                    rtnMessage = "Unfortunately, we are experiencing technical issues. Please try again in a few minutes.";
                    rtnLength = 9000;
                    break;
                case HttpStatusCode.Found: // 302
                    rtnMessage = "Unfortunately, we are experiencing technical issues. Please try again in a few minutes.";
                    rtnLength = 9000;
                    break;
                case (HttpStatusCode)998: // 998
                    rtnMessage = "Unfortunately, we are experiencing technical issues. Please try again in a few minutes.";
                    rtnLength = 9000;
                    break;
                default:
                    rtnMessage = "Unfortunately, we are experiencing technical issues. Please try again in a few minutes.";
                    rtnLength = 9000;
                    break;
            }
            return rtnMessage + ";" + response.StatusCode.ToString() + ";" + rtnLength;
        }
        private string ReturnBasicAuth(string partialUrl)
        {
            string auth = "";

            if (partialUrl == "dev") // DEV Pass
            {
                auth = Convert.ToBase64String(ASCIIEncoding.ASCII.GetBytes("ebankit" + ":" + "manage"));
            }
            else if (partialUrl == "int")
            {
                auth = Convert.ToBase64String(ASCIIEncoding.ASCII.GetBytes("ebankit" + ":" + "manage")); //<-- INT PASS 
            }
            else if (partialUrl == "stg")
            {
                auth = Convert.ToBase64String(ASCIIEncoding.ASCII.GetBytes("ebankit" + ":" + "15m14i16a19s23o18d")); //<-- STG PASS 
            }
            else if (partialUrl == "trn")
            {
                auth = Convert.ToBase64String(ASCIIEncoding.ASCII.GetBytes("ebankit" + ":" + "P3yqhYUM74wTs8Rr")); // < --TRN PASS // 
            }
            else
            {
                auth = Convert.ToBase64String(ASCIIEncoding.ASCII.GetBytes("ebankit" + ":" + "FZZ3DSpfBzFqE8NA")); //< -- LIVE/PRD PASS 
            }

            return auth;
        }

        #region Call Me Back API call
        [HttpPost]
        [ValidateHeaderAntiForgeryToken]
        public JsonResult call_me_request(Form form, int prodId, string call_me_subject, string call_me_contact_type)
        {
            string retResults, _productCode = "";

            if (call_me_subject != "")
            {
                lead_source = call_me_subject;
            }
            else
            {
                lead_source = x_system;
            }

            if (prodId == 1) // Investments
            {
                url_api = Investment_url_api;
                _productCode = "INV";
            }
            else if (prodId == 2) //Loans
            {
                url_api = credit_url_api;
                _productCode = "CRE";
            }
            else if (prodId == 3) // Insurance
            {
                url_api = Investment_url_api;
                channel_indicator = "CRE";
            

            }
            else if (prodId == 4) // Transactions
            {
                url_api = Investment_url_api;
                _productCode = "INV";
            }
            else if (prodId == 5) // Transactions
            {
                url_api = Investment_url_api;
                _productCode = call_me_contact_type;
            }

            try
            {
                //START*************** validating user input*********************

                Form_exception exception = new Form_exception();
                CustomValidation inputValidation = new CustomValidation();
                //validating name

                if (!inputValidation.validate_string(form.FirstNameInput, 30))
                {

                    exception.field = "FirstNameInput";


                    return Json(new { data = exception, error = true });
                }
                //validating surname
                if (!inputValidation.validate_string(form.LastNameInput, 30))
                {
                    exception.field = "LastNameInput";


                    return Json(new { data = exception, error = true });
                }
                //validating SAID
                if (!inputValidation.validate_ID(form.SAIDInput, 13))
                {
                    exception.field = "SAIDInput";


                    return Json(new { data = exception, error = true });
                }
                //validating CEll
                if (!inputValidation.validate_integer(form.CellPhoneInput, 12))
                {
                    exception.field = "CellPhoneInput";


                    return Json(new { data = exception, error = true });
                }
                //validating email
                if (!inputValidation.validate_email(form.EmailInput, 40))
                {
                    exception.field = "EmailInput";
                    return Json(new { data = exception, error = true });
                }
                //END*************** validating user input*********************

                PersonalDetails personalDetails = new PersonalDetails()
                {
                    firstName = form.FirstNameInput,
                    idNumber = form.SAIDInput,
                    surname = form.LastNameInput
                };
                ContactDetails contactDetails = new ContactDetails()
                {
                    phoneNumberDetails = new List<PhoneNumberDetail>()
                    {
                        new PhoneNumberDetail() { type = "MOB", areaCode = form.CellPhoneInput.Substring(0, 3), telephoneNumber = form.CellPhoneInput.Substring(3, 7) }
                    }
                };
                ProductDetail productDetail = new ProductDetail()
                {
                    productCode = _productCode
                };

                Content lead = new Content()
                {
                    contactDetails = contactDetails,
                    personalDetails = personalDetails,
                    productDetails = new List<ProductDetail>() { new ProductDetail() { productCode = _productCode } }
                };
                JavaScriptSerializer js = new JavaScriptSerializer();

                string lead_json = ToJSONString(lead);

                var httpWebRequest = (HttpWebRequest)WebRequest.Create(url_api);
                httpWebRequest.Headers.Add("Authorization", "Basic " + ReturnBasicAuth(url_api.Split('.')[1].ToString()));
                // httpWebRequest.Credentials = new NetworkCredential("cms-team", "L286>cVA1cZH5=@B"); // "apiwhatsapp", "?hrCq5xaws9MZY=R"
                httpWebRequest.Headers.Add("X-Channel", x_channel);
                httpWebRequest.Headers.Add("X-System", lead_source); // x_system);
                httpWebRequest.Headers.Add("X-Service-Operation", x_ServiceOperation);
                httpWebRequest.Headers.Add("X-Session-ID", x_SessionId.ToString());
                httpWebRequest.Headers.Add("X-User", x_user);

                httpWebRequest.ContentType = "application/json";
                httpWebRequest.Method = "POST";

                using (var streamWriter = new StreamWriter(httpWebRequest.GetRequestStream()))
                {
                    streamWriter.Write(lead_json);
                    streamWriter.Flush();
                    streamWriter.Close();
                }

                var httpResponse = (HttpWebResponse)httpWebRequest.GetResponse();
                using (var streamReader = new StreamReader(httpResponse.GetResponseStream()))
                {
                    string _result = returnHttpReponse(httpResponse);
                    hasAuditedRecord("CallMeBack", "", "", "", "", lead_json, _result, "callMeBackFunction");
                    logCallBackRequestForTracking(form); // log the callme back for tracking
                    return Json(new { data = _result, error = false });
                }

            }
            catch (WebException e)
            {
                using (var streamReader = new StreamReader(e.Response.GetResponseStream()))
                {
                    retResults = streamReader.ReadToEnd();
                }
                return Json(new { data = e.Message + "; " + retResults, error = true });
            }
        }
        private JsonResult logCallBackRequestForTracking(Form form)
        {
            string strReturnValue = "";
            try
            {
                if (ModelState.IsValid)
                {
                    CallMeBack callMeBack = new CallMeBack()
                    {
                        IDNumber = form.SAIDInput,
                        CellNumber = form.CellPhoneInput,
                        Name = form.FirstNameInput,
                        Surname = form.LastNameInput,
                        Email = form.EmailInput,
                        utm_campaign = form.utm_campaign,
                        utm_medium = form.utm_medium,
                        utm_source = form.utm_source,
                        date_time = DateTime.Today
                    };
                    //var succes = false;
                    using (var scope = _scopeProvider.CreateScope())
                    {
                        //DB Stuff
                        scope.Database.Insert<CallMeBack>(callMeBack);
                        scope.Complete();
                    }
                    strReturnValue = "Commit";

                }
                return Json(new { data = strReturnValue, error = false });
            }
            catch (Exception e)
            {
                return Json(new { data = e, error = true });
            }
        }

        #endregion

        #region Track my loan / WIML API calls

        [HttpPost]
        [ValidateHeaderAntiForgeryToken]
        public JsonResult ClientSearch(string idNumber)
        {
            string url = application_tracker_url;
            List<configurableParams> configurableParams = new List<configurableParams>()
            {
                new configurableParams()
                {
                    fieldName = "idNumber",
                    @operator = "=",
                    value = idNumber
                }
            };
            string _json = ToConfigJSONString(configurableParams);
            var _result = WebRequestPost(url, _json, null);
            string _clientDataJson = _result.Data.ToString();
            JsonResult resultData = new JsonResult();
            string resultSet = null;
            if (_result != null)
            {
                _clientDataJson = _clientDataJson.Replace("{ data =", "").ToString().Replace(", error = False }", "");
                ClientModel clientModel = JsonConvert.DeserializeObject<ClientModel>(_clientDataJson);
                resultData = GetApplications(clientModel.data.FirstOrDefault().personalDetails.clientNumber.ToString());
                resultSet = JsonConvert.SerializeObject(resultData.Data, Formatting.None, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore, DefaultValueHandling = DefaultValueHandling.Ignore });

                var applicationResponse = new
                {
                    resultCode = 200,
                    resultDescription = "Ok"
                };
                string jsonData = JsonConvert.SerializeObject(applicationResponse);
                resultSet = jsonData;
            }
            // string resultString = _result.Data.ToString().Split(',')[0].Remove(0, 10) + "}}]}";
            return Json(new { data = resultSet, error = false });
        }
        public string PostAsync(string url, object content)
        {
            var client = new HttpClient();
            client.BaseAddress = new Uri(url);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", "ZWJhbmtpdDoxNW0xNGkxNmExOXMyM28xOGQ=");

            var data = JsonConvert.SerializeObject(content);
            var requestContent = new StringContent(data, Encoding.UTF8, "application/json");
            requestContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            var response = client.PostAsync(client.BaseAddress, requestContent);

            var responseContent = response.Result;
            return responseContent.ToString();
        }

        // Example usage
        private string hereher(string url, long applicationId, int clientNumber)
        {
            var response = PostAsync(url, new
            {
                content = new
                {
                    serviceHeaderRequest = new
                    {
                        channel = "test",
                        system = "ebankit",
                        user = "BSP0031332",
                        adUser = "AMpokeli",
                        applicationId = applicationId,
                        serviceOperation = "CLIENT",
                        sessionId = Guid.NewGuid().ToString(),
                        clientNumber = clientNumber,
                        uniqueTransactionID = (string)null
                    }
                }
            });

            return response;
        }
        private List<string> getListOfDocNames(RequiredDocumentsModel documents)
        {
            List<string> docs = new List<string>();
            documents.results.requiredDocumentDetails.ToList().ForEach(x =>
            {
                if (!x.uploaded)
                {
                    docs.Add(x.subdocumentType);
                }
            });
            return docs;
        }
        private string GetRequiredDocumentsModel(string clientNumber, string applicationId)
        {
            string url = getDocumentsUrl + "/" + clientNumber + "/" + applicationId;
            var result = WebRequestGet(url);
            RequiredDocumentsModel offerResponse = GetDocumentsObject(result.Data.ToString().Replace("{ data = ", "").TrimEnd("}").ToString().Replace(", error = False", "").ToString());
            // 1. Get the required documents    
            List<string> _docs = getListOfDocNames(offerResponse);
            string joinedDocs = string.Join(",", _docs.ToArray());
            return joinedDocs;
        }

        private OfferRoot GetOfferAsync(string clientNumber, string applicationId)
        {
            string url = getOffersUrl + "/" + applicationId;
            string _json = null;

            var _request = new
            {
                content = new
                {
                    serviceHeaderRequest = new
                    {
                        channel = "test",
                        system = "ebankit",
                        user = "BSP0031332",
                        adUser = "AMpokeli",
                        applicationId = long.Parse(applicationId),
                        serviceOperation = "CLIENT",
                        sessionId = Guid.NewGuid().ToString(),
                        clientNumber = int.Parse(clientNumber),
                        uniqueTransactionID = (string)null
                    }
                }
            };

            _json = ToJSONString(_request);
            var result = WebRequestPost(url, _json, clientNumber, applicationId);

            OfferRoot offerResponse = GetOfferObject(result.Data.ToString().Replace("{ data = ", "").TrimEnd("}").ToString().Replace(", error = False", "").ToString());
            return offerResponse;
        }
        public string ToJSONString(QuickLoansRequest request)
        {
            return JsonConvert.SerializeObject(request, Formatting.None, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore, DefaultValueHandling = DefaultValueHandling.Ignore });
        }
        private RequiredDocumentsModel GetDocumentsObject(string documentsResponse)
        {
            RequiredDocumentsModel _docResults = JsonConvert.DeserializeObject<RequiredDocumentsModel>(documentsResponse);
            return _docResults;
        }
        private OfferRoot GetOfferObject(string offerResponse)
        {
            OfferRoot _offerResults = JsonConvert.DeserializeObject<OfferRoot>(offerResponse);
            return _offerResults;
        }
        public JsonResult GetApplications(string clientNumber)
        {
            string url = getApplication_tracker_url;

            List<configurableParams> configurableParams = new List<configurableParams>()
            {
                new configurableParams()
                {
                    fieldName = "clientNumber",
                    @operator = "=",
                    value = clientNumber
                }// ,
                //new configurableParams()
                //{
                //    fieldName = "applicationType",
                //    @operator = "=",
                //    value = "CRE"
                //}
            };
            string _json = ToConfigJSONString(configurableParams);

            var result = WebRequestPost(url, _json, null);

            string coreData = result.Data.ToString().Remove(0, 9).ToString();
            string strCoreData = ReplaceLastOccurrence(coreData, "error = False", "");
            strCoreData = strCoreData.Replace(",  }", "");

            //StringBuilder sb = new StringBuilder();
            //sb.Append(DateTime.Now + "; GetApplications RESPONSE: " + strCoreData);
            //System.IO.File.AppendAllText(AppDomain.CurrentDomain.BaseDirectory + @"App_Data\" + "smsLogs.txt", sb.ToString() + Environment.NewLine);
            //sb.Clear();

            Applications currentApplications = JsonConvert.DeserializeObject<Applications>(strCoreData);
            string workflowTempl = "";
            if (currentApplications != null)
            {
                if (currentApplications.data.Count() > 0)
                {
                    string _cashToClient = "0";
                    currentApplications.data.ToList().ForEach(x =>
                    {

                        if ((x.applicationStatus == "NEW") && (x.applicationType == "CRE"))
                        {
                            if (x.workflowStatus == "INI")
                            {
                                workflowTempl = "BOT_INI_SMS";
                            }
                            else if (x.workflowStatus == "IOF")
                            {
                                // 1. SET the workflowTemplate                              
                                workflowTempl = "BOT_IQF_SMS";

                                // 2. Fetch the additional GetOffers API to this application
                                OfferRoot offers = GetOfferAsync(x.clientNumber.ToString(), x.applicationId.ToString());
                                _cashToClient = offers.results.offerResponse.offers.First().offerDetails.cashToClient.ToString();
                                offers.results.offerResponse.offers.ForEach(d =>
                                {
                                    if (d.offerDetails.cashToClient >= double.Parse(_cashToClient))
                                    {
                                        _cashToClient = d.offerDetails.cashToClient.ToString();
                                    }
                                });

                                // 3. Send SMS with collected info
                                // Send SMS based on the condition aforementioned ( MaxOffer )
                                if (_cashToClient != "0")
                                {
                                    result = SendSMSByAPI(workflowTempl, x.clientNumber, x.applicationId.ToString(), "GNQ", x.applicationStatus, _cashToClient, "");
                                }
                            }
                            else if (x.workflowStatus == "DOC")
                            {
                                // 1. SET the workflowTemplate+                             
                                workflowTempl = "BOT_DOC_SMS";

                                // 2. Fetch the outstanding Documents API to this application
                                string requiredDocuments = GetRequiredDocumentsModel(x.clientNumber.ToString(), x.applicationId.ToString());

                                // 3. Send SMS with collected info on condition : aforementioned ( Outstanding Docs )
                                if (requiredDocuments != "")
                                {
                                    result = SendSMSByAPI(workflowTempl, x.clientNumber, x.applicationId.ToString(), "GNQ", x.applicationStatus, "", requiredDocuments);
                                }
                            }
                            else if (x.workflowStatus == "BUR")
                            {
                                workflowTempl = "BOT_BUR_SMS";
                            }
                            else if (x.workflowStatus == "ROF")
                            {
                                workflowTempl = "BOT_ROF_SMS";
                            }
                            else if (x.workflowStatus == "MYD")
                            {
                                workflowTempl = "BOT_MYD_SMS";
                            }
                            else if (x.workflowStatus == "WUP")
                            {
                                workflowTempl = "BOT_WUP_SMS";
                            }
                            else if (x.workflowStatus == "BIO")
                            {
                                workflowTempl = "BOT_BIO_SMS";
                            }
                            else if (x.workflowStatus == "WLT")
                            {
                                workflowTempl = "BOT_WLT_SMS";
                            }
                            else if (x.workflowStatus == "DIS")
                            {
                                workflowTempl = "BOT_DIS_SMS";
                            }
                            else if (x.workflowStatus == "DVQ")
                            {
                                workflowTempl = "BOT_DVQ_SMS";
                            }
                            else if (x.workflowStatus == "INQ")
                            {
                                workflowTempl = "BOT_INQ_SMS";
                            }
                            else if (x.workflowStatus == "ARQ")
                            {
                                workflowTempl = "BOT_ARQ_SMS";
                            }
                            else if (x.workflowStatus == "DIS to MWA")
                            {
                                workflowTempl = "BOT_DISMW_SMS";
                            }


                            result = SendSMSByAPI(workflowTempl, x.clientNumber, x.applicationId.ToString(), "GNQ", x.applicationStatus);


                            // ELIMINATED IN ORDER THAT WE DO NOT SHOW THE CONFIDENTIAL INFO ON THE FRONT END
                            //StringBuilder sb = new StringBuilder();
                            //sb.Append(DateTime.Now + "; Client Number: " + x.clientNumber + "; " + " Application ID: " + x.applicationId + "; " + "Application Status: " + x.applicationStatus +
                            //    "; Application Type: " + x.applicationType + "; WorkFlow: " + workflowTempl);
                            //System.IO.File.AppendAllText(AppDomain.CurrentDomain.BaseDirectory + @"App_Data\" + "smsLogs.txt", sb.ToString() + Environment.NewLine);
                            //sb.Clear();
                        }
                    });
                }
                else
                {
                    // There are no applications linked to this clientNumber
                    var applicationResponse = new
                    {
                        resultCode = 200,
                        resultDescription = "Ok"
                    };
                    string jsonData = JsonConvert.SerializeObject(applicationResponse);
                    result.Data = jsonData;
                }
            }
            return Json(new { data = result, error = false });
        }
        private bool hasAuditedRecord(string _clientNumber, string _applicationId, string _applicationType, string _applicationStatus, string _url, string _request, string _response, string _createdBy)
        {
            bool isRecordAudited = false;
            try
            {
                cmsTrackMyLoanAudit trackMyLoanAudit = new cmsTrackMyLoanAudit()
                {
                    ApplicationId = _applicationId,
                    ApplicationStatus = _applicationStatus,
                    ApplicationType = _applicationType,
                    ClientNumber = _clientNumber,
                    URLapi = _url,
                    CreatedBy = _createdBy,
                    DateTime = DateTime.Now,
                    Request = _request,
                    Response = _response
                };
                using (var scope = _scopeProvider.CreateScope(autoComplete: true))
                {
                    scope.Database.Insert<Models.cmsTrackMyLoanAudit>(trackMyLoanAudit);
                    isRecordAudited = true;
                }
                return isRecordAudited;
            }
            catch (Exception ex)
            {
                StringBuilder sb = new StringBuilder();
                sb.Append(DateTime.Now + "; Failed DB Log ; Request: " + _request + "; Response: " + _response + "; URL: " + _url);
                System.IO.File.AppendAllText(AppDomain.CurrentDomain.BaseDirectory + @"App_Data\" + "smsLogs.txt", sb.ToString() + Environment.NewLine);
                sb.Clear();
                return isRecordAudited;
            }
        }
        private JsonResult SendSMSByAPI(string workflowNr, int _clientNumber, string _refNum, string _applicationType, string _applicationStatus, string maxOffer = "", string requiredDocuments = "")
        {
            string url = send_SMS_url;
            List<SMSKeyValue> smsKeys = null;
            if (maxOffer != "")
            {
                smsKeys = new List<SMSKeyValue>()
                {
                    new SMSKeyValue()
                    {
                        key = "RefNum",
                        value = _refNum
                    },
                    new SMSKeyValue()
                    {
                        key = "applicationType",
                        value = _applicationType
                    },
                    new SMSKeyValue()
                    {
                        key = "MaxCreditOfferAmount",
                        value = "R" + maxOffer
                    }
                };
            }
            else if (requiredDocuments != "")
            {
                smsKeys = new List<SMSKeyValue>()
                {
                    new SMSKeyValue()
                    {
                        key = "RefNum",
                        value = _refNum
                    },
                    new SMSKeyValue()
                    {
                        key = "applicationType",
                        value = _applicationType
                    },
                    new SMSKeyValue()
                    {
                        key = "DocumentList",
                        value = requiredDocuments
                    }
                };
            }
            else
            {
                smsKeys = new List<SMSKeyValue>()
                {
                    new SMSKeyValue()
                    {
                        key = "RefNum",
                        value = _refNum
                    },
                    new SMSKeyValue()
                    {
                        key = "applicationType",
                        value = _applicationType
                    }
                };
            }
            SMS smsObj = new SMS()
            {
                templateNo = workflowNr,
                clientNumber = _clientNumber,
                keyValues = smsKeys
            };
            string _json = ToSMSJSONString(smsObj);
            var result = WebRequestPost(url, _json, _clientNumber.ToString());

            // audit record
            hasAuditedRecord(_clientNumber.ToString(), _refNum, _applicationType, _applicationStatus, url, _json, result.Data.ToString(), "CMS");

            return Json(new { data = result, error = false });
        }


        #endregion
        static string ReplaceLastOccurrence(string str, string toReplace, string replacement)
        {
            return Regex.Replace(str, $@"^(.*){Regex.Escape(toReplace)}(.*?)$", $"$1{Regex.Escape(replacement)}$2");
        }
        private JsonResult WebRequestGet(string url)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", ReturnBasicAuth(url.Split('.')[1].ToString()));
                    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                    var response = client.GetAsync(url).Result;
                    response.EnsureSuccessStatusCode();
                    var responseBody = response.Content.ReadAsStringAsync().Result;

                    return Json(new { data = responseBody, error = false });
                }
            }
            catch (Exception ex)
            {
                return Json(new { data = ex.Message, error = false });
            }
        }
        private JsonResult WebRequestPost(string url, string json, string clientNumber, string applicationId = "")
        {
            try
            {
                var http = (HttpWebRequest)WebRequest.Create(url);
                http.Headers.Add("Authorization", "Basic " + ReturnBasicAuth(url.Split('.')[1].ToString()));

                if (applicationId == "")
                {
                    http.Headers.Add("X-Channel", "test");
                    http.Headers.Add("X-System", "ebankit");
                    if (clientNumber != null)
                    {
                        http.Headers.Add("X-Client-Number", clientNumber);
                    }
                    http.Headers.Add("X-User", "test");
                    if (applicationId != "")
                    {
                        http.Headers.Add("X-Application-ID", applicationId);
                    }
                    else
                    {
                        http.Headers.Add("X-Application-ID", "123321");
                    }
                    http.Headers.Add("X-Session-ID", "test");
                    http.Headers.Add("X-Service-Operation", "test");
                }

                http.ContentType = "application/json";

                //http.ContentType = "application/json";
                http.Method = "POST";

                string parsedContent = json;
                ASCIIEncoding encoding = new ASCIIEncoding();
                Byte[] bytes = encoding.GetBytes(parsedContent);

                Stream newStream = http.GetRequestStream();
                newStream.Write(bytes, 0, bytes.Length);
                newStream.Close();

                var response = http.GetResponse();

                var stream = response.GetResponseStream();
                var sr = new StreamReader(stream);
                var _result = sr.ReadToEnd();
                if (_result == "")
                {
                    int resultCode = 0;
                    string resultDescription = "";
                    var smsResponse = new
                    {
                        resultCode = (int)((HttpWebResponse)response).StatusCode,
                        resultDescription = ((HttpWebResponse)response).StatusCode
                    };
                    string jsonData = JsonConvert.SerializeObject(smsResponse);
                    _result = jsonData;
                }
                return Json(new { data = _result, error = false });
            }
            catch (Exception ex)
            {
                return Json(new { data = ex.Message, error = false });
            }
        }

    }

    #region Applications Model returned by the GetApplications

    public class ApplicationData
    {
        public long applicationId { get; set; }
        public int clientNumber { get; set; }
        public string applicationStatus { get; set; }
        public string applicationType { get; set; }
        public string workflowStatus { get; set; }
        public string company { get; set; }
        public string channel { get; set; }
        public int originationBranch { get; set; }
        public int branch { get; set; }
        public string externalReference { get; set; }
        public string createdBy { get; set; }
        public string creationDate { get; set; }
        public string lastUpdatedBy { get; set; }
        public string lastUpdatedTime { get; set; }
        public string concludedBy { get; set; }
    }

    public class NavLinks
    {
        public string next { get; set; }
        public string previous { get; set; }
        public string last { get; set; }
        public string first { get; set; }
    }

    public class ApplicationMeta
    {
        public int totalPages { get; set; }
        public int pageSize { get; set; }
        public int pageItems { get; set; }
    }

    public class Applications
    {
        public List<ApplicationData> data { get; set; }
        public NavLinks links { get; set; }
        public ApplicationMeta meta { get; set; }
    }


    #endregion End: Applications Model returned by the GetAppliactions 

    #region Classes and Objects

    public class configurableParams
    {
        public string value { get; set; }
        public string @operator { get; set; }
        public string fieldName { get; set; }
    }
    public class Form : tracking_info
    {
        public string FirstNameInput { get; set; }
        public string LastNameInput { get; set; }
        public string EmailInput { get; set; }
        public string SAIDInput { get; set; }
        public string CellPhoneInput { get; set; }
        public string MessageInput { get; set; }
        public string cbx { get; set; }
        public string frmLeadSource { get; set; }
    }

    public class tracking_info
    {
        public string utm_source { get; set; }
        public string utm_medium { get; set; }
        public string utm_campaign { get; set; }
    }

    public class Form_grow_it
    {
        public string firstName { get; set; }
        public string itemName { get; set; }
        public string email { get; set; }
        public string worth { get; set; }
        public string period { get; set; }
    }

    public class Form_exception
    {
        public string error_message { get; set; } = "The value you provided is not valid";
        public string field { get; set; }
        //public string EmailInput { get; set; }
        //public string SAIDInput { get; set; }
        //public string CellPhoneInput { get; set; }
        //public string MessageInput { get; set; }
        //public string cbx { get; set; }
    }

    public class CreditCardLead
    {
        public string firstname { get; set; }
        public string lastname { get; set; }
        public string identityNumber { get; set; }
        public string mobileNumber { get; set; }
        public string email { get; set; }
        public string serviceType { get; set; }
        public string serviceEvent { get; set; }
        public string channelIndicator { get; set; }
        public object product { get; set; }
        public long importDateTime { get; set; }
        public string leadSource { get; set; }
    }

    public class ServiceHeaderRequest
    {
        public string xChannel { get; set; }
        public string xSystem { get; set; }
        public string xServiceOperation { get; set; }
        public int xSessionID { get; set; }

        public string xUser { get; set; }
    }

    // New Call Me Back Class Properties
    public class ContactDetails
    {
        public List<PhoneNumberDetail> phoneNumberDetails { get; set; }
    }

    public class PersonalDetails
    {
        public string idNumber { get; set; }
        public string surname { get; set; }
        public string firstName { get; set; }
    }

    public class PhoneNumberDetail
    {
        public string type { get; set; }
        public string areaCode { get; set; }
        public string telephoneNumber { get; set; }
    }

    public class ProductDetail
    {
        public string productCode { get; set; }
    }

    public class Root
    {
        public PersonalDetails personalDetails { get; set; }
        public ContactDetails contactDetails { get; set; }
        public List<ProductDetail> productDetails { get; set; }
    }

    public class Content
    {
        public PersonalDetails personalDetails { get; set; }
        public ContactDetails contactDetails { get; set; }
        public List<ProductDetail> productDetails { get; set; }
    }

    public class RootObject
    {
        public Content content { get; set; }
    }
    public class SMSKeyValue
    {
        public string value { get; set; }
        public string key { get; set; }
    }

    public class SMS
    {
        public string templateNo { get; set; }
        public int clientNumber { get; set; }
        public List<SMSKeyValue> keyValues { get; set; }
    }

    #endregion

    //START****************response object***************************
    public class RootObject_response
    {
        public Content_response content { get; set; }
    }
    public class Content_response
    {
        public CreditCardLead creditCardLead { get; set; }
        public ServiceHeaderResponse serviceHeaderResponse { get; set; }
    }
    public class ServiceHeaderResponse
    {
        public List<object> notifications { get; set; }
        public long responseTimestamp { get; set; }
        public int resultCode { get; set; }
        public string resultDescription { get; set; }
        public string uniqueTransactionID { get; set; }
    }

    //*END****************response object***************************

    // Cookie Data Collection



    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
    public sealed class ValidateHeaderAntiForgeryTokenAttribute : FilterAttribute, IAuthorizationFilter
    {
        public void OnAuthorization(AuthorizationContext filterContext)
        {
            if (filterContext == null)
            {
                throw new ArgumentNullException("filterContext");
            }

            var httpContext = filterContext.HttpContext;
            var cookie = httpContext.Request.Cookies[AntiForgeryConfig.CookieName];
           // AntiForgery.Validate(cookie != null ? cookie.Value : null, httpContext.Request.Headers["__RequestVerificationToken"]);
        }
    }
}



