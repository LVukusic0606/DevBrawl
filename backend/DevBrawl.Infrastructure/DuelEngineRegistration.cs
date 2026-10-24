using DevBrawl.Duel.Engine;
using DevBrawl.Infrastructure.Duels;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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

        return services;
    }
}
