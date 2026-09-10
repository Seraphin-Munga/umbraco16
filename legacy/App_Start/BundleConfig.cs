using System.Web.Optimization;

namespace Web.App_Start
{
    public class BundleConfig
    {
        public static void RegisterBundles(BundleCollection bundles)
        {
            //bundles.Add(new StyleBundle("~/bundles/preNavCss").Include(
            //    "~/css/bootstrap.css",
            //    "~/css/navigation.css"
            //    ));

            //bundles.Add(new StyleBundle("~/bundles/styles").Include(
            //    "~/css/Site.css",
            //    "~/css/Responsive.css"
            //    ));

            /* */
            bundles.Add(new StyleBundle("~/bundles/styles").Include(
                "~/css/bootstrap.min.css",
                "~/css/main.min.css",
                "~/css/custom_main.min.css"
                ));


            bundles.Add(new StyleBundle("~/bundles/quickLoansCss").Include(
                "~/stylesheets/smartWizard/smart_wizard.css",
                "~/stylesheets/smartWizard/smart_wizard_theme_arrows.css"));

            new ScriptBundle("~/bundles/scripts")
                .IncludeDirectory("~/scripts/", "*.min.js", true)
                .IncludeDirectory("~/javascripts/", "*.min.js", true)
                .IncludeDirectory("~/Common.JS.Library.Ab/Calculator/", "*.min.js", true);


            bundles.Add(new ScriptBundle("~/bundles/quickLoansJs").Include(
               "~/scripts/smartWizard/jquery.smartWizard.min.js"));

            //Comment this out to control this setting via web.config compilation debug attribute
            BundleTable.EnableOptimizations = true;
        }
    }
}