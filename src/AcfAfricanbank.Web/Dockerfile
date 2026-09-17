# syntax=docker/dockerfile:1

# Build context for this Dockerfile must be the repo root (Platform.Umbraco16/),
# not this project's own folder - AcfAfricanbank.Web project-references
# ../AcfAfricanbank.Core, so both projects need to be in the build context:
#   docker build -f src/AcfAfricanbank.Web/Dockerfile .
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY src/AcfAfricanbank.Core/AcfAfricanbank.Core.csproj src/AcfAfricanbank.Core/
COPY src/AcfAfricanbank.Web/AcfAfricanbank.Web.csproj src/AcfAfricanbank.Web/
RUN dotnet restore src/AcfAfricanbank.Web/AcfAfricanbank.Web.csproj

COPY src/AcfAfricanbank.Core/ src/AcfAfricanbank.Core/
COPY src/AcfAfricanbank.Web/ src/AcfAfricanbank.Web/
RUN dotnet publish src/AcfAfricanbank.Web/AcfAfricanbank.Web.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "AcfAfricanbank.Web.dll"]
