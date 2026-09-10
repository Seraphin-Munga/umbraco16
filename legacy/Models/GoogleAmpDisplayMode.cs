using System.Web.WebPages;

namespace Web.Models
{
    public class GoogleAmpDisplayMode : DefaultDisplayMode
    {
        public GoogleAmpDisplayMode()
        : base("amp") // for filename.amp.cshtml files.
        {
            ContextCondition = context => context.Request.RawUrl.Contains("?amp");
        }
    }
}