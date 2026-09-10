using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Umbraco.Core.Models.PublishedContent;

namespace Web.Extensions
{
    public static class UmbracoExtensions
    {
        /// <summary>
        /// Gets the property value.
        /// </summary>
        /// <param name="properties">The properties.</param>
        /// <param name="propertyName">Name of the property.</param>
        /// <returns>An <c>object</c> containing the proprty value.</returns>
        /// <exception cref="System.ArgumentException">The property name must be specified. - propertyName</exception>
        public static object GetPropertyValue(this IEnumerable<IPublishedProperty> properties, string propertyName)
        {
            if (string.IsNullOrWhiteSpace(propertyName))
            {
                throw new ArgumentException("The property name must be specified.", "propertyName");
            }

            return properties.Single(p => propertyName.Equals(p.PropertyType.Alias));
        }

        /// <summary>
        /// Gets the property value.
        /// </summary>
        /// <typeparam name="T">The return type of the property value.</typeparam>
        /// <param name="properties">The properties.</param>
        /// <param name="propertyName">Name of the property.</param>
        /// <returns>The property value cast to type T.</returns>
        public static T GetPropertyValue<T>(this IEnumerable<IPublishedProperty> properties, string propertyName)
        {
            var value = GetPropertyValue(properties, propertyName);

            if (value != null && !string.IsNullOrEmpty(value.ToString()))
            {
                if (typeof(T).IsGenericType && typeof(T).GetGenericTypeDefinition() == typeof(Nullable<>))
                {
                    var typeToConvert = Nullable.GetUnderlyingType(typeof(T));
                    return (T)Convert.ChangeType(value, typeToConvert, CultureInfo.InvariantCulture);
                }

                return (T)Convert.ChangeType(value, typeof(T), CultureInfo.InvariantCulture);
            }

            return default(T);
        }
    }
}