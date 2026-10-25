using System.Text.Json.Nodes;
using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Engine.Domain;
using DevBrawl.Duel.Engine.Protocol;

namespace DevBrawl.Duel.Dtos;

// All results are from the requesting player's point of view

public sealed record DuelOpponentResponse(Guid Id, string Nickname);

public sealed record DuelSummaryResponse(
    Guid Id,
    DuelStatus Status,
    // Against a friend: no ELO or XP
    bool Friendly,
    DuelOpponentResponse Opponent,
    // null while the duel is running or when it was abandoned
    PlayerDuelResult? Result,
    int YourScore,
    int OpponentScore,
    DateTime StartedAt,
    DateTime? FinishedAt);

public sealed record DuelRoundReviewResponse(
    int RoundNumber,
    ChallengeType Type,
    int CategoryId,
    // The challenge exactly as it was shown
    JsonNode Challenge,
    // Your answer as you sent it; null if you didn't answer in time
    JsonNode? YourAnswer,
    bool YouCorrect,
    bool OpponentAnswered,
    bool OpponentCorrect,
    PlayerRoundResult Result,
    // Correct answer and explanation
    JsonNode Reveal);

public sealed record DuelDetailsResponse(
    DuelSummaryResponse Summary,
    // null unless the duel finished
    PlayerRewards? Rewards,
    // Only rounds that ended
    IReadOnlyList<DuelRoundReviewResponse> Rounds);
