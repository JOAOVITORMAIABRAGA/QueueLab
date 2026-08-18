using QueueLab.Application;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<ISimulationEngine, SimulationEngine>();

var configuredOrigins = builder.Configuration["CORS_ORIGINS"];
var allowedOrigins = string.IsNullOrWhiteSpace(configuredOrigins)
    ? new[] { "http://localhost:5173", "https://localhost:5173" }
    : configuredOrigins.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("Frontend");

app.MapGet("/", () => Results.Ok(new { name = "QueueLab API", status = "ok", docs = "/swagger" }));
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

app.Run();
