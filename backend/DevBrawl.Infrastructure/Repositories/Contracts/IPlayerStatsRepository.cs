namespace DevBrawl.Infrastructure.Repositories.Contracts;

public interface IPlayerStatsRepository
{
    // Stages the starting rating in every category and an empty XP total for a new user; the caller saves
    Task AddStartingStatsAsync(Guid userId, CancellationToken cancellationToken = default);
}
