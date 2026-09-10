//-----------------------------------------------------------------------
// <copyright file="LocalizedFaultCode.cs" company="ebankIT, SA">
//    Copyright (c) ebankIT, SA. All rights reserved. 
// </copyright>
//----------------------------------------------------------------------- 
namespace ebankIT.Publishing.Web.Services
{
    public class LocalizedFaultCode
    {
        /// <summary>
        /// Gets the language cannot be null.
        /// </summary>
        /// <value>
        /// The language cannot be null.
        /// </value>
        public static string Language
        {
            get
            {
                return "language";
            }
        }

        /// <summary>
        /// Gets the channel.
        /// </summary>
        /// <value>
        /// The channel.
        /// </value>
        public static string Channel
        {
            get
            {
                return "channel";
            }
        }
    }
}