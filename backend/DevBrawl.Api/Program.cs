using System.Text.Json;
using System.Text.Json.Serialization;
using DevBrawl.Api.Hubs;
using DevBrawl.Duel.Engine;
using DevBrawl.Infrastructure;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Api.OpenApi;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);

builder.Services.AddRouting(options => options.LowercaseUrls = true);
// Enums as camelCase strings ("conceptQuiz", "won"), the same as in the challenge content
var enumConverter = new JsonStringEnumConverter(JsonNamingPolicy.CamelCase);
builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(enumConverter));

builder.Services.AddSignalR()
    .AddJsonProtocol(options => options.PayloadSerializerOptions.Converters.Add(enumConverter));
builder.Services.AddSingleton<IUserIdProvider, SubClaimUserIdProvider>();
builder.Services.AddSingleton<IDuelNotifier, HubDuelNotifier>();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options => options.AddDocumentTransformer<BearerSecuritySchemeTransformer>());

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Swagger UI at /swagger, reading the built-in OpenAPI document
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "DevBrawl API v1"));
    // Dev-only pages in wwwroot/dev, e.g. /dev/duel-test.html
    app.UseStaticFiles();
}
else
{
    // In development the Vite dev server proxies to plain http, so don't redirect there
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<DuelHub>("/hubs/duel");

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/health/db", async (AppDbContext db) =>
    await db.Database.CanConnectAsync()
        ? Results.Ok(new { database = "ok" })
        : Results.Problem("Database unreachable", statusCode: StatusCodes.Status503ServiceUnavailable));

app.Run();
