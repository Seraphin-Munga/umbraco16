using Newtonsoft.Json;
using System;
using System.Collections.Generic;
//using AfricanBank.Cms.Portal;
using System.IO;
using System.Web.Mvc;
using Umbraco.Core.Scoping;
using Umbraco.Web.Mvc;
using Web.Entities;
using Web.Models;
using Web.Portal;

namespace Web.Controllers
{
    public class JSONWriterController : SurfaceController
    {
        public string jsonLibraryPath = AppDomain.CurrentDomain.BaseDirectory + @"Common.JS.Library\Json\";
        public const string AccessFile = "AccessAccumulatorRates.json";
        public const string FixedFile = "FixedRates.json";
        public const string NoticeFile = "NoticeDepositRates.json";
        public const string TaxFreeFile = "TaxFreeRates.json";

        string filePath = null;
        JsonSerializer jsonSerializer = new JsonSerializer();
        private readonly IScopeProvider _scopeProvider;
        public JSONWriterController(IScopeProvider scopeProvider)
        {
            _scopeProvider = scopeProvider;
        }
        public JsonResult SaveCookieData(cmsCookies form)
        {
            bool hasUserAccepted = false;
            string cookieAdded = "";
            if (ModelState.IsValid)
            {
                cmsCookies cookieModel = new cmsCookies()
                {
                    UserData = form.UserData,
                    HasAccepted = 1,
                    Date = DateTime.Now
                };
                /* var db = ApplicationContext.DatabaseContext.Database;
                 //Add the object to the DB
                 hasUserAccepted = (bool)db.Insert(cookieModel);
                 if ((bool)hasUserAccepted)
                 {
                     cookieAdded = "Commit";
                 }
                 else
                 {
                     cookieAdded = "No commit";
                 }*/
                using (var scope = _scopeProvider.CreateScope())
                {
                    //DB Stuff
                    scope.Database.Insert<cmsCookies>(cookieModel);
                    scope.Complete();

                }
            }
            return Json(new { data = cookieAdded, error = false });
        }

        // save json object
        public JsonResult SaveRateForProduct(CalculatorModel jsonInfo)
        {
            filePath = jsonLibraryPath + returnFilePath(jsonInfo.Product);

            switch (jsonInfo.Product)
            {
                case CmsConstants.Products.Access:

                    WriteToJSON(jsonInfo, filePath);
                    return Json(new { results = "Access..." });
                case CmsConstants.Products.Notice:

                    WriteToJSON(jsonInfo, filePath);
                    return Json(new { results = "Notice..." });
                case CmsConstants.Products.TxFree:

                    WriteToJSON(jsonInfo, filePath);
                    return Json(new { results = "TxFree..." });
                case CmsConstants.Products.Fixed:

                    WriteToJSON(jsonInfo, filePath);
                    return Json(new { results = "Fixed..." });
                default:
                    return null;
            }
        }

        // write json object to a specific file
        private void WriteToJSON(CalculatorModel data, string filePath)
        {
            // Clear text before appending
            System.IO.File.WriteAllText(filePath, String.Empty);

            // Append json string to the file
            using (StreamWriter _file = System.IO.File.AppendText(filePath))
            {
                jsonSerializer.Serialize(_file, data.Rates);
            }
        }

        // return File Path for a given product
        private string returnFilePath(string jsonFileSelector)
        {
            switch (jsonFileSelector)
            {
                case CmsConstants.Products.Access:
                    return AccessFile;
                case CmsConstants.Products.Fixed:
                    return FixedFile;
                case CmsConstants.Products.Notice:
                    return NoticeFile;
                case CmsConstants.Products.TxFree:
                    return TaxFreeFile;
                default:
                    return "";
            }
        }

        // do fetch rates
        private JsonResult GetRates(string product)
        {
            // fetch the flat file specific to the product
            filePath = jsonLibraryPath + returnFilePath(product);

            string jsonStr = System.IO.File.ReadAllText(filePath);
            List<Rate> jsonRates = JsonConvert.DeserializeObject<List<Rate>>(System.IO.File.ReadAllText(filePath));

            CalculatorModel jsonRate = new CalculatorModel()
            {
                Product = product,
                Rates = jsonRates
            };

            return Json(new { Result = jsonRate });
        }

        // get rates for a given product
        public JsonResult GetRatesForProduct(string product)
        {
            switch (product)
            {
                case CmsConstants.Products.Fixed:
                    return GetRates(CmsConstants.Products.Fixed);
                case CmsConstants.Products.Access:
                    return GetRates(CmsConstants.Products.Access);
                case CmsConstants.Products.Notice:
                    return GetRates(CmsConstants.Products.Notice);
                case CmsConstants.Products.TxFree:
                    return GetRates(CmsConstants.Products.TxFree);
                default:
                    return null;
            }
        }
    }
}