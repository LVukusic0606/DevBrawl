namespace DevBrawl.Common.Domain;

// Running XP total per user, kept in step with XpEvents so profiles and leaderboards don't sum the ledger.
// The level is derived from it with Levels.FromTotalXp.
public class PlayerProgress
{
    public Guid UserId { get; set; }
    public int TotalXp { get; set; }
}
