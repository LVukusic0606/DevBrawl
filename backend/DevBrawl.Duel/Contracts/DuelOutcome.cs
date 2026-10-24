namespace DevBrawl.Duel.Contracts;

// Decided by the engine from correctness and server-side answer times:
// one correct → that player wins; both correct → faster wins (identical time → Draw);
// both wrong or timed out → NoWinner, which changes no ELO
public enum RoundResult
{
    Player1Won,
    Player2Won,
    Draw,
    NoWinner
}

public sealed record RoundOutcome(
    int RoundNumber,
    int CategoryId,
    ChallengeType Type,
    bool Player1Correct,
    bool Player2Correct,
    RoundResult Result);

// Passed by the engine to IDuelScoring when a duel finishes
public sealed record DuelOutcome(
    Guid DuelId,
    Guid Player1Id,
    Guid Player2Id,
    // null when the duel is a draw (both won the same number of rounds)
    Guid? WinnerId,
    IReadOnlyList<RoundOutcome> Rounds);
