using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Engine.Domain;

namespace DevBrawl.Duel.Engine;

// Answer of one player in one round
public sealed record RoundAnswerRecord(string? AnswerJson, bool Correct, DateTime? AnsweredAt);

// Persistence for the engine. Implemented in DevBrawl.Infrastructure; every call uses its own DbContext,
// because the engine is a singleton.
public interface IDuelStore
{
    // Called at startup: duels that were running when the server stopped can't be resumed
    Task AbandonInProgressAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyDictionary<int, int>> GetRatingsAsync(Guid userId, CancellationToken cancellationToken = default);

    // The avatar the player picked on their profile; null if none
    Task<int?> GetAvatarIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task CreateDuelAsync(DuelMatch duel, CancellationToken cancellationToken = default);

    Task AddRoundAsync(DuelRound round, CancellationToken cancellationToken = default);

    Task CompleteRoundAsync(Guid duelId, int roundNumber, RoundAnswerRecord player1, RoundAnswerRecord player2,
        RoundResult result, string revealJson, DateTime endedAt, CancellationToken cancellationToken = default);

    // Marks the duel Finished and applies IDuelScoring in the same SaveChanges.
    // Returns null if the duel is not InProgress (already finalized), so rewards are never applied twice.
    Task<DuelRewards?> FinalizeAsync(DuelOutcome outcome, int player1Score, int player2Score, DateTime finishedAt,
        CancellationToken cancellationToken = default);

    Task AbandonAsync(Guid duelId, CancellationToken cancellationToken = default);
}
