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
