using DevBrawl.Duel.Content;
using DevBrawl.Duel.Contracts;
using DevBrawl.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DevBrawl.Infrastructure;

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
        services.AddSingleton<IAnswerChecker, AnswerChecker>();

        return services;
    }
}
