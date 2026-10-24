using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Engine;
using DevBrawl.Duel.Engine.Fakes;
using DevBrawl.Infrastructure.Duels;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace DevBrawl.Infrastructure;

public static class DuelEngineRegistration
{
    // Must run after AddDuelContent. IDuelNotifier is registered by DevBrawl.Api (it needs SignalR).
    public static IServiceCollection AddDuelEngine(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<DuelOptions>(configuration.GetSection(DuelOptions.SectionName));

        services.AddSingleton<IDuelStore, DuelStore>();
        services.AddSingleton<DuelEngine>();
        services.AddHostedService<DuelTicker>();
        services.AddScoped<IDuelHistoryService, DuelHistoryService>();

        // Only used until the real scoring is registered
        services.TryAddScoped<IDuelScoring, FakeDuelScoring>();

        return services;
    }
}
