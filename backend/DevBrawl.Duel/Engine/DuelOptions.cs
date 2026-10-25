using DevBrawl.Duel.Contracts;

namespace DevBrawl.Duel.Engine;

// "Duel" section in appsettings.json
public sealed class DuelOptions
{
    public const string SectionName = "Duel";
    private const int DefaultTimeLimitSeconds = 60;

    // Per challenge type; types missing here get DefaultTimeLimitSeconds
    public Dictionary<ChallengeType, int> RoundTimeLimitsSeconds { get; set; } = [];
    // Pause between "match found" and round 1
    public int CountdownSeconds { get; set; } = 3;
    // Pause after each round, while the players see the correct answer
    public int RevealSeconds { get; set; } = 5;
    // How long a friend has to accept a duel invite
    public int InviteSeconds { get; set; } = 60;

    public TimeSpan TimeLimit(ChallengeType type) =>
        TimeSpan.FromSeconds(RoundTimeLimitsSeconds.TryGetValue(type, out var seconds) ? seconds : DefaultTimeLimitSeconds);
}
