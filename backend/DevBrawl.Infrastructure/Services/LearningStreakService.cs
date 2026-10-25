using DevBrawl.Common.Progression;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Services;

// The streak counts days (UTC) on which the player completed a lesson for the first time.
// Repeating a lesson doesn't count: the quiz is the same, so it could be clicked through just to keep the streak.
public class LearningStreakService(AppDbContext db) : ILearningStreakService
{
    public async Task<Streak> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var completedAt = await db.LessonCompletions.AsNoTracking()
            .Where(c => c.UserId == userId)
            .Select(c => c.CompletedAt)
            .ToListAsync(cancellationToken);
        return Streaks.From(completedAt.Select(DateOnly.FromDateTime), Streaks.Today());
    }

    public async Task<IReadOnlyDictionary<Guid, int>> GetCurrentAsync(IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken = default)
    {
        var today = Streaks.Today();
        var completions = await db.LessonCompletions.AsNoTracking()
            .Where(c => userIds.Contains(c.UserId))
            .Select(c => new { c.UserId, c.CompletedAt })
            .ToListAsync(cancellationToken);
        var byUser = completions
            .GroupBy(c => c.UserId)
            .ToDictionary(g => g.Key, g => Streaks.From(g.Select(c => DateOnly.FromDateTime(c.CompletedAt)), today).Current);
        return userIds.ToDictionary(id => id, id => byUser.GetValueOrDefault(id));
    }
}
