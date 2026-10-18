# Builds the .NET API. Built from the repository root (see docker-compose.prod.yml).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY backend/MenswearStore.Api/MenswearStore.Api.csproj backend/MenswearStore.Api/
RUN dotnet restore backend/MenswearStore.Api/MenswearStore.Api.csproj
COPY backend/MenswearStore.Api/ backend/MenswearStore.Api/
RUN dotnet publish backend/MenswearStore.Api/MenswearStore.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
# uploads/ and DataProtectionKeys/ sit under the content root (/app) and are
# mounted as volumes so they survive rebuilds. Create them owned by the non-root
# user so a fresh volume is writable.
RUN mkdir -p uploads DataProtectionKeys && chown -R app:app uploads DataProtectionKeys
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "MenswearStore.Api.dll"]
