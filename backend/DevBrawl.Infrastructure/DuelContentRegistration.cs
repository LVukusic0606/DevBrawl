using DevBrawl.Duel.Content;
using DevBrawl.Duel.Contracts;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Duels;
using DevBrawl.Infrastructure.Repositories;
using DevBrawl.Infrastructure.Repositories.Contracts;
using DevBrawl.Infrastructure.Services;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DevBrawl.Infrastructure;

// Content, scoring, ratings and XP. Must run before AddDuelEngine.
public static class DuelContentRegistration
{
    public static IServiceCollection AddDuelContent(this IServiceCollection services, IConfiguration configuration)
    {
        // Defaults to the copy of backend/Questions in the build output; Duel:QuestionsPath overrides it
        var directory = configuration["Duel:QuestionsPath"] ?? Path.Combine(AppContext.BaseDirectory, "Questions");

        services.AddSingleton<IChallengeCatalog>(sp =>
        {
            // The JSON files name categories by slug; the ids come from the seeded Categories table
            using var scope = sp.CreateScope();
            var categoryIds = scope.ServiceProvider.GetRequiredService<AppDbContext>().Categories
                .AsNoTracking()
                .ToDictionary(c => c.Slug, c => c.Id);
            return ChallengeCatalog.Load(directory, categoryIds);
        });
        services.AddHostedService<ChallengeCatalogWarmup>();
        services.AddSingleton<IAnswerChecker, AnswerChecker>();

        services.AddScoped<IDuelScoring, DuelScoring>();
        services.AddScoped<IXpService, XpService>();
        services.AddScoped<IPlayerStatsRepository, PlayerStatsRepository>();

        return services;
    }

    // Loads the content when the app starts, so broken content stops the app instead of the first duel
    private sealed class ChallengeCatalogWarmup(IServiceProvider services) : IHostedService
    {
        public Task StartAsync(CancellationToken cancellationToken)
        {
            services.GetRequiredService<IChallengeCatalog>();
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
