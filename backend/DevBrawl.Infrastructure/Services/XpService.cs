using DevBrawl.Common.Domain;
using DevBrawl.Common.Progression;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Services;

public class XpService(AppDbContext db) : IXpService
{
    public async Task<XpAward> AwardAsync(Guid userId, string source, string sourceId, int amount,
        CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(amount);

        // FindAsync also sees a row staged earlier in this unit of work
        var progress = await db.PlayerProgress.FindAsync([userId], cancellationToken);
        if (progress is null)
        {
            // Every user gets a row at signup; this only covers rows that are missing anyway
            progress = new PlayerProgress { UserId = userId };
            db.PlayerProgress.Add(progress);
        }

        var alreadyAwarded =
            db.XpEvents.Local.Any(e => e.UserId == userId && e.Source == source && e.SourceId == sourceId) ||
            await db.XpEvents.AnyAsync(e => e.UserId == userId && e.Source == source && e.SourceId == sourceId, cancellationToken);
        if (alreadyAwarded)
            return new XpAward(false, progress.TotalXp, Levels.FromTotalXp(progress.TotalXp));

        db.XpEvents.Add(new XpEvent
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            Source = source,
            SourceId = sourceId,
            Amount = amount,
            CreatedAt = DateTime.UtcNow
        });
        progress.TotalXp += amount;

        return new XpAward(true, progress.TotalXp, Levels.FromTotalXp(progress.TotalXp));
    }
}
