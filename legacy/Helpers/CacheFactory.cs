using System;
using System.Globalization;
using System.Web;
using System.Web.Caching;

namespace Web.Helpers
{
    public class CacheFactory
    {
        /// <summary>
        /// Gets the Cache version.
        /// </summary>
        /// <returns></returns>
        public static string CacheVersion()
        {
            string version = version = "" + DateTime.Now.ToString("yyyyMMddhhmmss", CultureInfo.InvariantCulture);
            var debug = HttpContext.Current.IsDebuggingEnabled;
            if (!debug)
            {
                string cacheKey = "CacheVersion";
                object o = CacheFactory.GetValue(cacheKey);

                if (o == null)
                {
                    string fileVersion = System.Diagnostics.FileVersionInfo.GetVersionInfo(System.Reflection.Assembly.GetExecutingAssembly().Location).FileVersion.Replace(" ", string.Empty);

                    if (!debug)
                    {
                        version = fileVersion;
                    }

                    CacheFactory.Insert(cacheKey, version);
                }
                else
                {
                    version = o.ToString();
                }
            }

            return version;
        }

        private static object lockObj = new object();

        public static void Insert(string cacheKey, object value, DateTime expireDate)
        {
            if (value != null)
            {
                lock (lockObj)
                {
                    HttpContext.Current.Cache.Insert(cacheKey, value, null, expireDate, Cache.NoSlidingExpiration, CacheItemPriority.Default, null);
                }
            }
        }

        public static object GetValue(string cacheKey)
        {
            object o = null;
            if (!string.IsNullOrEmpty(cacheKey))
            {
                lock (lockObj)
                {
                    o = HttpContext.Current.Cache[cacheKey];
                }
            }

            return o;
        }

        public static void Insert(string cacheKey, object value)
        {
            if (value != null)
            {
                lock (lockObj)
                {
                    HttpContext.Current.Cache.Insert(cacheKey, value);
                }
            }
        }
    }
}