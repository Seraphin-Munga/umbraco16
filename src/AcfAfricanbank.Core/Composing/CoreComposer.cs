using AcfAfricanbank.Core.Utilities;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace AcfAfricanbank.Core.Composing;

/// <summary>
/// Registers services provided by AcfAfricanbank.Core.
/// </summary>
public class CoreComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddScoped<MobileDetection>();
    }
}
