namespace DevBrawl.Duel.Contracts;

public sealed record DuelRewards(PlayerRewards Player1, PlayerRewards Player2);

public sealed record PlayerRewards(
    Guid UserId,
    // One entry per category played in the duel, including categories that ended unchanged
    IReadOnlyList<RatingChange> RatingChanges,
    int XpGained,
    int TotalXp,
    int Level);

public sealed record RatingChange(int CategoryId, int Before, int After)
{
    public int Delta => After - Before;
}
