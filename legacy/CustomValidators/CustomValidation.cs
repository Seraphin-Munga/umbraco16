using System;
using System.Text.RegularExpressions;

namespace Web.CustomValidators
{
    public class CustomValidation
    {

        private int char_size = 50;

        public bool validate_string(string string_data, int string_length)
        {
            //default string length
            set_size(string_length);
            string expression = "^[a-zA-Z]{1," + char_size + "}$";
            return regulate_data(expression, string_data);
        }
        public bool validate_integer(string string_data, int string_length)
        {
            set_size(string_length);
            string expression = "^[0-9]{1," + char_size + "}$";
            return regulate_data(expression, string_data);
        }
        public bool validate_email(string string_data, int string_length)
        {
            if (string_data.Length >= 50)
            {
                return false;
            }

            string expression = @"^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)";
            return regulate_data(expression, string_data);
        }
        public bool validate_ID(string string_data, int string_length)
        {
            set_size(string_length);
            string expression = "^[0-9]{" + char_size + "}$";
            return (regulate_data(expression, string_data) && validateAgeRestriction(string_data));
        }


        private void set_size(int string_length)
        {
            char_size = (string_length > 0) ? string_length : 50;
        }
        private bool regulate_data(string expression, string string_data)
        {
            Regex reg = new Regex(expression, RegexOptions.IgnoreCase);
            Match match = reg.Match(string_data);

            return match.Success;
        }

        private bool validateAgeRestriction(string idNumber)
        {
            var currentYear = DateTime.Today.Year;
            var yearOfBirth = Convert.ToInt32(idNumber.Substring(0, 2));

            if (yearOfBirth + 2000 < currentYear)
            { yearOfBirth = 2000 + yearOfBirth; }
            else
            { yearOfBirth = yearOfBirth + 1900; }

            if (currentYear - yearOfBirth >= 91 || currentYear - yearOfBirth <= 18)
            {
                return false;
            }
            return true;

        }
    }
}