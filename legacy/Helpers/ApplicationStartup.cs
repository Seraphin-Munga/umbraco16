namespace Web.Helpers
{
    /*public class ApplicationStartup : ApplicationEventHandler
    {
        /// <summary>
        /// Overridable method to execute when the ApplicationContext is created and other static objects that require initialization have been setup
        /// </summary>
        /// <param name="umbracoApplication"></param>
        /// <param name="applicationContext"></param>
        protected override void ApplicationInitialized(UmbracoApplicationBase umbracoApplication, Umbraco.Web.Composing.Current applicationContext)
        {
            base.ApplicationInitialized(umbracoApplication, applicationContext);

            LocalizationService.SavedDictionaryItem += LocalizationService_SavedDictionaryItem;
        }

        /// <summary>
        /// Localizations the service saved dictionary item.
        /// </summary>
        /// <param name="sender">The sender.</param>
        /// <param name="e">The <see cref="Umbraco.Core.Events.SaveEventArgs{IDictionaryItem}"/> instance containing the event data.</param>
        private void LocalizationService_SavedDictionaryItem(ILocalizationService sender, Umbraco.Core.Events.SaveEventArgs<IDictionaryItem> e)
        {
            foreach (var item in e.SavedEntities)
            {
                foreach (var ee in item.Translations)
                {
                    CacheFactory.Insert(string.Format(CultureInfo.InvariantCulture, "{0}_{1}", item.ItemKey, ee.LanguageId), ee.Value);
                }
            }
        }
    }*/
}