using DevBrawl.Duel.Scoring;

namespace DevBrawl.Infrastructure.Leaderboard;

// Overall leaderboard (spec section 12): players with at least one finished duel, ranked by OverallRating
public sealed record LeaderboardResponse(
    int TotalPlayers,
    // Best first, at most the requested limit
    IReadOnlyList<LeaderboardEntryResponse> Entries,
    // The requester's own row when they're ranked but outside Entries; null otherwise
    LeaderboardEntryResponse? You);

public sealed record LeaderboardEntryResponse(
    // Tied players share a position: 1, 2, 2, 4
    int Position,
    Guid UserId,
    string Nickname,
    // The player's preset avatar and tag, as on their profile; null when not picked
    int? AvatarId,
    string? Tag,
    int Rating,
    RankTier Tier,
    int DuelsPlayed,
    int Wins,
    // From the player's total XP, the same level the profile shows
    int Level,
    bool IsYou);
