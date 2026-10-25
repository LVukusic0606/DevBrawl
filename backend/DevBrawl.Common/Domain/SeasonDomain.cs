using DevBrawl.Common.Season;

namespace DevBrawl.Common.Domain;

// A cosmetic a player owns from a season pass; owned forever, also after the season ends
public class UserReward
{
    public Guid UserId { get; set; }
    public RewardKind Kind { get; set; }
    public string Key { get; set; } = string.Empty;
    // Where it came from, e.g. "2026-10", stage 5, Free track
    public string Season { get; set; } = string.Empty;
    public int Stage { get; set; }
    public RewardTrack Track { get; set; }
    public DateTime UnlockedAt { get; set; }
}

// One row per player who ever had Premium; Premium is active while PremiumUntil is in the future
public class Subscription
{
    public Guid UserId { get; set; }
    public DateTime PremiumUntil { get; set; }
    public DateTime UpdatedAt { get; set; }
}

// "Contact us" form for schools and universities; the team follows up by hand
public class ContactRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Institution { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    // Set when the sender was logged in
    public Guid? UserId { get; set; }
    public DateTime CreatedAt { get; set; }
}
