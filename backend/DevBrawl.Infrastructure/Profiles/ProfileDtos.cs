using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Dtos;
using DevBrawl.Duel.Engine.Protocol;
using DevBrawl.Duel.Scoring;

namespace DevBrawl.Infrastructure.Profiles;

// A player's public profile (spec section 13). Never contains the email.
public sealed record ProfileResponse(
    ProfileUserResponse User,
    // True when the requester is looking at their own profile
    bool IsYou,
    ProfileProgressResponse Progress,
    // All categories, in display order
    IReadOnlyList<ProfileRatingResponse> Ratings,
    // null when every category has the same rating (e.g. a new player)
    int? StrongestCategoryId,
    int? WeakestCategoryId,
    ProfileDuelStatsResponse Duels,
    ProfileAccuracyResponse Accuracy,
    // Finished duels, newest first
    IReadOnlyList<ProfileDuelResponse> RecentDuels,
    // Lesson and quiz stats; null until the Learn backend provides them
    object? Learning);

public sealed record ProfileUserResponse(Guid Id, string Nickname, DateTime MemberSince);

// LevelStartXp and NextLevelXp are total XP thresholds, for the progress bar
public sealed record ProfileProgressResponse(int Level, int TotalXp, int LevelStartXp, int NextLevelXp);

public sealed record ProfileRatingResponse(
    int CategoryId,
    string Slug,
    string Name,
    int Rating,
    RankTier Tier,
    // Change in the most recent duel that changed this category; null if no duel has changed it yet
    int? LastDelta);

public sealed record ProfileDuelStatsResponse(int Played, int Wins, int Losses, int Draws);

public sealed record AccuracyResponse(int Correct, int Total);

public sealed record CategoryAccuracyResponse(int CategoryId, int Correct, int Total);

public sealed record TypeAccuracyResponse(ChallengeType Type, int Correct, int Total);

// Rounds of finished duels; an unanswered round counts as incorrect
public sealed record ProfileAccuracyResponse(
    AccuracyResponse Overall,
    // All categories and all types, in display order, including ones with Total = 0
    IReadOnlyList<CategoryAccuracyResponse> ByCategory,
    IReadOnlyList<TypeAccuracyResponse> ByType);

public sealed record ProfileDuelResponse(
    Guid Id,
    DuelOpponentResponse Opponent,
    PlayerDuelResult Result,
    int YourScore,
    int OpponentScore,
    DateTime FinishedAt,
    // Sum of this player's rating changes in the duel, across categories
    int RatingDelta);
