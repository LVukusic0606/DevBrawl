namespace DevBrawl.Infrastructure.Services.Contracts;

public interface ILessonProgressService
{
    // Slugs of the lessons the player has finished, oldest first
    Task<IReadOnlyList<string>> GetCompletedAsync(Guid userId, CancellationToken cancellationToken = default);

    // Marks a lesson as finished; doing it again changes nothing
    Task CompleteAsync(Guid userId, string lessonId, CancellationToken cancellationToken = default);
}
