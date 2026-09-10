//-----------------------------------------------------------------------
// <copyright file="LocalizedFaultReason.cs" company="ebankIT, SA">
//    Copyright (c) ebankIT, SA. All rights reserved. 
// </copyright>
//----------------------------------------------------------------------- 
namespace ebankIT.Publishing.Web.Services
{
    using System.Globalization;

    public class LocalizedFaultReason
    {
        /// <summary>
        /// Gets the language cannot be null.
        /// </summary>
        /// <value>
        /// The language cannot be null.
        /// </value>
        public static string LanguageCannotBeNull
        {
            get
            {
                return string.Format(CultureInfo.InvariantCulture, "language parameter cannot be null or empty");
            }
        }

        /// <summary>
        /// Gets the channel cannot be null.
        /// </summary>
        /// <value>
        /// The channel cannot be null.
        /// </value>
        public static string ChannelCannotBeNull
        {
            get
            {
                return string.Format(CultureInfo.InvariantCulture, "channel parameter cannot be null or empty");
            }
        }
    }
}