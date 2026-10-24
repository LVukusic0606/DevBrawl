namespace DevBrawl.Duel.Contracts;

// Implemented by scoring (Ivancic), used by the engine (Luka)
public interface IDuelScoring
{
    // Category id → current rating; shown to both players when the match starts
    Task<IReadOnlyDictionary<int, int>> GetRatingsAsync(Guid userId, CancellationToken cancellationToken = default);

    // Stages ELO and XP changes for both players and does NOT call SaveChanges.
    // The engine saves them together with marking the duel Finished, and only finalizes a duel
    // that is still InProgress, so rewards can't be applied twice.
    // ELO: Elo with K = 32, computed from the ratings at the start of the duel; deltas of rounds
    // in the same category are summed. NoWinner rounds change nothing.
    Task<DuelRewards> ApplyDuelResultAsync(DuelOutcome outcome, CancellationToken cancellationToken = default);
}
