using DevBrawl.Common.Domain;
using DevBrawl.Duel.Scoring;
using DevBrawl.Duel.Scoring.Domain;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Repositories.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Repositories;

public class PlayerStatsRepository(AppDbContext db) : IPlayerStatsRepository
{
    public async Task AddStartingStatsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var categoryIds = await db.Categories.Select(c => c.Id).ToListAsync(cancellationToken);

        db.CategoryRatings.AddRange(categoryIds.Select(categoryId => new CategoryRating
        {
            UserId = userId,
            CategoryId = categoryId,
            Rating = EloCalculator.StartingRating,
            UpdatedAt = now
        }));
        db.PlayerProgress.Add(new PlayerProgress { UserId = userId });
    }
}
