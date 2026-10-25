using DevBrawl.Common.Progression;

namespace DevBrawl.Infrastructure.Services.Contracts;

public interface ILearningStreakService
{
    Task<Streak> GetAsync(Guid userId, CancellationToken cancellationToken = default);

    // Current streak per player, for lists such as the leaderboard; players without lessons get 0
    Task<IReadOnlyDictionary<Guid, int>> GetCurrentAsync(IReadOnlyCollection<Guid> userIds, CancellationToken cancellationToken = default);
}
