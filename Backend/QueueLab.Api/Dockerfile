FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Backend/QueueLab.sln ./
COPY Backend/QueueLab.Api/QueueLab.Api.csproj Backend/QueueLab.Api/
COPY Backend/QueueLab.Application/QueueLab.Application.csproj Backend/QueueLab.Application/
COPY Backend/QueueLab.Domain/QueueLab.Domain.csproj Backend/QueueLab.Domain/

RUN dotnet restore Backend/QueueLab.Api/QueueLab.Api.csproj

COPY Backend/ Backend/
RUN dotnet publish Backend/QueueLab.Api/QueueLab.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://0.0.0.0:10000

EXPOSE 10000

ENTRYPOINT ["dotnet", "QueueLab.Api.dll"]
