using DevBrawl.Infrastructure;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Api.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);

builder.Services.AddRouting(options => options.LowercaseUrls = true);
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options => options.AddDocumentTransformer<BearerSecuritySchemeTransformer>());

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Swagger UI at /swagger, reading the built-in OpenAPI document
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "DevBrawl API v1"));
}
else
{
    // In development the Vite dev server proxies to plain http, so don't redirect there
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/health/db", async (AppDbContext db) =>
    await db.Database.CanConnectAsync()
        ? Results.Ok(new { database = "ok" })
        : Results.Problem("Database unreachable", statusCode: StatusCodes.Status503ServiceUnavailable));

app.Run();
