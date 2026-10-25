using DevBrawl.Common.Domain;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Services;

public class LessonProgressService(AppDbContext db) : ILessonProgressService
{
    public async Task<IReadOnlyList<string>> GetCompletedAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await db.LessonCompletions.AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.CompletedAt)
            .Select(c => c.LessonId)
            .ToListAsync(cancellationToken);

    public async Task CompleteAsync(Guid userId, string lessonId, CancellationToken cancellationToken = default)
    {
        var alreadyCompleted = await db.LessonCompletions
            .AnyAsync(c => c.UserId == userId && c.LessonId == lessonId, cancellationToken);
        if (alreadyCompleted)
            return;

        db.LessonCompletions.Add(new LessonCompletion { UserId = userId, LessonId = lessonId, CompletedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(cancellationToken);
    }
}
