using Microsoft.Extensions.Caching.Memory;
using Umbraco.Cms.Core.Services;

namespace AcfAfricanbank.Core.Utilities;

/// <summary>
/// Looks up a dictionary item's translated value. Ported from the v8 static
/// helper (which used the removed Umbraco.Core.Composing.Current locator and
/// System.Web.Caching) to an injectable service on ILocalizationService and
/// IMemoryCache.
/// </summary>
public class ResourceHelper
{
    private readonly ILocalizationService _localizationService;
    private readonly IMemoryCache _cache;

    public ResourceHelper(ILocalizationService localizationService, IMemoryCache cache)
    {
        _localizationService = localizationService;
        _cache = cache;
    }

    public string GetResource(string resource) => GetResource(resource, langId: 2);

    public string GetResource(string resource, int langId)
    {
        var cacheKey = $"{resource}_{langId}";

        if (_cache.TryGetValue(cacheKey, out string? cached) && !string.IsNullOrWhiteSpace(cached))
        {
            return cached;
        }

        var dictionaryItem = _localizationService.GetDictionaryItemByKey(resource);
        var value = dictionaryItem?.Translations.FirstOrDefault()?.Value;

        if (string.IsNullOrEmpty(value))
        {
            return $"NoDictionary:[{resource}]";
        }

        _cache.Set(cacheKey, value);
        return value;
    }
}
