using Umbraco.Cms.Core.Models.PublishedContent;

namespace AcfAfricanbank.Core.Models.CustomDataType;

public class RdaImagePicker
{
    public IPublishedContent? Image { get; set; }
    public string? Title { get; set; }
    public string? Summary { get; set; }
}
