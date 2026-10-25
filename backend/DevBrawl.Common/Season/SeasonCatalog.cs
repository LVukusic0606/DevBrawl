namespace DevBrawl.Common.Season;

public enum RewardTrack
{
    Free = 1,
    // Unlocked only while the player has Premium
    Premium = 2
}

public enum RewardKind
{
    // Key is an avatar id (number as text), the same ids as the preset avatars
    Avatar = 1,
    // Key is a tag id, the same kind of id as UserTags.All
    Tag = 2
}

public sealed record SeasonReward(int Stage, RewardTrack Track, RewardKind Kind, string Key);

// One season per calendar month (UTC). Season XP is the XP earned during the month, the same XP that adds to
// the player's total; the season stage starts again at 0 every month. Rewards unlock automatically and are kept forever.
// The pass's steps are called stages so they're never confused with the player's level on the profile.
public static class SeasonCatalog
{
    public const int Stages = 20;
    public const int XpPerStage = 100;

    // PLACEHOLDERS: the ids exist so the system works end to end. The frontend draws them
    // (frontend/src/profile/avatars.ts and tags.ts); Buco replaces the stand-in pictures and labels.
    // For the hackathon every month uses this one set.
    public static readonly IReadOnlyList<SeasonReward> Rewards =
    [
        new(1, RewardTrack.Free, RewardKind.Tag, "rookie"),
        new(1, RewardTrack.Premium, RewardKind.Avatar, "13"),
        new(2, RewardTrack.Premium, RewardKind.Tag, "root-cause-hunter"),
        new(3, RewardTrack.Free, RewardKind.Avatar, "14"),
        new(4, RewardTrack.Premium, RewardKind.Avatar, "15"),
        new(5, RewardTrack.Free, RewardKind.Tag, "debugger"),
        new(6, RewardTrack.Premium, RewardKind.Tag, "404-survivor"),
        new(7, RewardTrack.Premium, RewardKind.Avatar, "16"),
        new(8, RewardTrack.Free, RewardKind.Avatar, "17"),
        new(9, RewardTrack.Premium, RewardKind.Tag, "race-condition"),
        new(10, RewardTrack.Free, RewardKind.Tag, "query-whisperer"),
        new(11, RewardTrack.Premium, RewardKind.Avatar, "18"),
        new(12, RewardTrack.Premium, RewardKind.Tag, "zero-downtime"),
        new(13, RewardTrack.Free, RewardKind.Avatar, "19"),
        new(14, RewardTrack.Premium, RewardKind.Avatar, "20"),
        new(15, RewardTrack.Free, RewardKind.Tag, "stack-tracer"),
        new(16, RewardTrack.Premium, RewardKind.Tag, "cache-invalidator"),
        new(17, RewardTrack.Premium, RewardKind.Avatar, "21"),
        new(18, RewardTrack.Free, RewardKind.Avatar, "22"),
        new(19, RewardTrack.Premium, RewardKind.Tag, "kernel-panic"),
        new(20, RewardTrack.Free, RewardKind.Tag, "season-finisher"),
        new(20, RewardTrack.Premium, RewardKind.Avatar, "23"),
    ];

    // "2026-10"
    public static string KeyFor(DateTime utcNow) => $"{utcNow:yyyy-MM}";

    public static DateTime StartOf(DateTime utcNow) => new(utcNow.Year, utcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

    public static DateTime EndOf(DateTime utcNow) => StartOf(utcNow).AddMonths(1);

    public static int StageFor(int seasonXp) => Math.Min(Stages, Math.Max(0, seasonXp) / XpPerStage);
}
