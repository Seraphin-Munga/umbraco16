# No "# syntax=docker/dockerfile:1" directive here on purpose - see
# react-ts-app/Dockerfile's own matching comment: nothing here needs
# BuildKit-exclusive syntax, and that directive makes `docker compose
# build` fetch the syntax frontend from docker.io at build time, which
# fails on the production EC2 host's allowlisted network.

# Build context for this Dockerfile must be the repo root (Platform.Umbraco16/),
# not this project's own folder - AcfAfricanbank.Web project-references
# ../AcfAfricanbank.Core, so both projects need to be in the build context:
#   docker build -f src/AcfAfricanbank.Web/Dockerfile .
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# NuGet's package-signature check does online certificate revocation
# lookups over plain HTTP (port 80), which the production EC2 host's
# allowlisted network blocks - restore hangs indefinitely on SYN-SENT.
# "offline" still verifies every signature, just skips that online lookup.
ENV NUGET_CERT_REVOCATION_MODE=offline

COPY src/AcfAfricanbank.Core/AcfAfricanbank.Core.csproj src/AcfAfricanbank.Core/
COPY src/AcfAfricanbank.Web/AcfAfricanbank.Web.csproj src/AcfAfricanbank.Web/
RUN dotnet restore src/AcfAfricanbank.Web/AcfAfricanbank.Web.csproj

COPY src/AcfAfricanbank.Core/ src/AcfAfricanbank.Core/
COPY src/AcfAfricanbank.Web/ src/AcfAfricanbank.Web/
RUN dotnet publish src/AcfAfricanbank.Web/AcfAfricanbank.Web.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "AcfAfricanbank.Web.dll"]
