using DevBrawl.Common.Progression;
using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Dtos;
using DevBrawl.Duel.Engine.Protocol;
using DevBrawl.Duel.Scoring;
using DevBrawl.Infrastructure.Friends;

namespace DevBrawl.Infrastructure.Profiles;

// A player's public profile (spec section 13). Never contains the email.
public sealed record ProfileResponse(
    ProfileUserResponse User,
    // True when the requester is looking at their own profile
    bool IsYou,
    ProfileProgressResponse Progress,
    // Average of the category ratings (OverallRating); a summary, not a rating of its own
    ProfileOverallResponse Overall,
    // All categories, in display order
    IReadOnlyList<ProfileRatingResponse> Ratings,
    // null when every category has the same rating (e.g. a new player)
    int? StrongestCategoryId,
    int? WeakestCategoryId,
    ProfileDuelStatsResponse Duels,
    ProfileAccuracyResponse Accuracy,
    // Finished ranked duels, newest first
    IReadOnlyList<ProfileDuelResponse> RecentDuels,
    ProfileLearningResponse Learning,
    // Days in a row with a newly completed lesson
    Streak Streak,
    // How the requester relates to this player; null on their own profile
    ProfileFriendshipResponse? Friendship);

// Lessons the player has finished, as slugs. The lesson catalog lives in the frontend, which turns these into totals.
public sealed record ProfileLearningResponse(IReadOnlyList<string> CompletedLessonIds);

public sealed record ProfileOverallResponse(int Rating, RankTier Tier);

// AvatarId is one of the preset profile pictures and Tag one of UserTags.All; each is null when not picked
public sealed record ProfileUserResponse(Guid Id, string Nickname, DateTime MemberSince, int? AvatarId, string? Tag);

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

// Ranked duels only
public sealed record ProfileDuelStatsResponse(int Played, int Wins, int Losses, int Draws);

public sealed record AccuracyResponse(int Correct, int Total);

public sealed record CategoryAccuracyResponse(int CategoryId, int Correct, int Total);

public sealed record TypeAccuracyResponse(ChallengeType Type, int Correct, int Total);

// Rounds of finished ranked duels; an unanswered round counts as incorrect
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
