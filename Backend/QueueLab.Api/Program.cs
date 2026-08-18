using System.Text.Json.Serialization;
using QueueLab.Application;
using QueueLab.Domain;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<ISimulationEngine, SimulationEngine>();

var allowedOrigins = builder.Configuration["CORS_ORIGINS"]
    ?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("Frontend");

app.MapGet("/", () => Results.Ok(new
{
    service = "QueueLab API",
    status = "healthy",
    environment = app.Environment.EnvironmentName
}));

app.MapControllers();

app.Run();
