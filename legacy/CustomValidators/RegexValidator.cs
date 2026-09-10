using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Web.Mvc;
using Web.Helpers;

namespace Web.CustomValidators
{
    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter, AllowMultiple = false)]
    public class RegexValidator : RegularExpressionAttribute, IClientValidatable
    {
        public RegexValidator(string errorMessageDictionaryKey, string pattern)
            : base(pattern)
        {
            ErrorMessage = ResourceHelper.GetResource(errorMessageDictionaryKey);
        }
        /// <summary>
        /// 
        /// </summary>
        /// <param name="metadata"></param>
        /// <param name="context"></param>
        /// <returns></returns>
        public IEnumerable<ModelClientValidationRule> GetClientValidationRules(ModelMetadata metadata, ControllerContext context)
        {
            var error = FormatErrorMessage(metadata.DisplayName);
            var rule = new ModelClientValidationRegexRule(error, Pattern);

            yield return rule;
        }
    }
}