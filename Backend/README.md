# QueueLab Backend

ASP.NET Core Web API + .NET 8. O motor de simulação é independente da API.

## Modelo físico

`Single` representa uma fila comum para todos os caixas. `Random` e `ShortestQueue` representam uma fila física por caixa.

## Run

```bash
dotnet restore
dotnet run --project QueueLab.Api
```

Swagger: `/swagger`.

A porta HTTP local é `54873`. Configure `CORS_ORIGINS` no ambiente para produção.


## Render

This API is packaged with `Dockerfile` for Render. The container listens on `0.0.0.0:10000`; Render forwards its public HTTP traffic to that port. Configure `CORS_ORIGINS` with the Vercel frontend origin.
