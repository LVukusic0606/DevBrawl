using DevBrawl.Infrastructure.Leaderboard;

namespace DevBrawl.Infrastructure.Services.Contracts;

public interface ILeaderboardService
{
    Task<LeaderboardResponse> GetOverallAsync(Guid requesterId, int limit, CancellationToken cancellationToken = default);
}
