using DevBrawl.Common.Season;
using System.ComponentModel.DataAnnotations;

namespace DevBrawl.Infrastructure.Store;

public sealed record SeasonRewardResponse(int Stage, RewardTrack Track, RewardKind Kind, string Key, bool Unlocked);

public sealed record SeasonResponse(
    // "2026-10"
    string Key,
    // "October 2026"
    string Name,
    DateTime StartsAt,
    DateTime EndsAt,
    int Stages,
    int XpPerStage,
    // XP earned this month; the profile's total XP is separate and never resets
    int SeasonXp,
    // 0 to Stages; not the player's level, which comes from total XP
    int Stage,
    bool IsPremium,
    IReadOnlyList<SeasonRewardResponse> Rewards);

// What the avatar and tag pickers may offer: the starter items plus everything unlocked
public sealed record OwnedCosmeticsResponse(IReadOnlyList<int> AvatarIds, IReadOnlyList<string> Tags);

public sealed record InterviewAllowanceResponse(int Used, int Limit);

public sealed record PremiumResponse(
    bool IsPremium,
    // null if the player never had Premium
    DateTime? PremiumUntil,
    decimal MonthlyPriceEur,
    int FreeInterviewsPerMonth,
    int PremiumInterviewsPerMonth,
    // This month, for this player
    InterviewAllowanceResponse Interviews);

public sealed record ContactRequestBody
{
    [Required, StringLength(100, MinimumLength = 2)]
    public string Name { get; init; } = string.Empty;

    [Required, StringLength(200, MinimumLength = 2)]
    public string Institution { get; init; } = string.Empty;

    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;

    [Required, StringLength(2000, MinimumLength = 10)]
    public string Message { get; init; } = string.Empty;
}
