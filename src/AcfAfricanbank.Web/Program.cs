using Umbraco.Cms.Core.DependencyInjection;

using Umbraco.Cms.Core.Notifications;

using Umbraco.Cms.Infrastructure.Persistence;

using Umbraco.Cms.Web.Common.ApplicationBuilder;

var builder = WebApplication.CreateBuilder(args);

// Add Umbraco

builder.CreateUmbracoBuilder()

    .AddBackOffice()

    .AddWebsite()

    .AddDeliveryApi()

    .AddComposers()

    .Build();

var app = builder.Build();

// Configure Umbraco

await app.BootUmbracoAsync();

app.UseUmbraco()

    .WithMiddleware(u =>

    {

        u.UseBackOffice();

        u.UseWebsite();

    })

    .WithEndpoints(u =>

    {

        u.UseBackOfficeEndpoints();

        u.UseWebsiteEndpoints();

    });

await app.RunAsync();
