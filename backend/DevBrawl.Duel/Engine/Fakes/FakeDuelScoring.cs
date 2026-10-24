using DevBrawl.Duel.Contracts;

namespace DevBrawl.Duel.Engine.Fakes;

// Stand-in until the real IDuelScoring exists: everyone has 1000 everywhere and nothing changes.
// Registered with TryAdd, so the real implementation replaces it automatically. Delete it once that lands.
public sealed class FakeDuelScoring : IDuelScoring
{
    private const int StartingRating = 1000;
    private static readonly int[] CategoryIds = [1, 2, 3, 4, 5, 6];

    public Task<IReadOnlyDictionary<int, int>> GetRatingsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyDictionary<int, int>>(CategoryIds.ToDictionary(id => id, _ => StartingRating));

    public Task<DuelRewards> ApplyDuelResultAsync(DuelOutcome outcome, CancellationToken cancellationToken = default)
    {
        var changes = outcome.Rounds
            .Select(r => r.CategoryId)
            .Distinct()
            .Select(id => new RatingChange(id, StartingRating, StartingRating))
            .ToList();
        return Task.FromResult(new DuelRewards(
            new PlayerRewards(outcome.Player1Id, changes, 0, 0, 1),
            new PlayerRewards(outcome.Player2Id, changes, 0, 0, 1)));
    }
}
