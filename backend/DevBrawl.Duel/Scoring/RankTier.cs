namespace DevBrawl.Duel.Scoring;

// Never stored: always derived from the rating (spec section 8)
public enum RankTier
{
    Beginner,
    Bronze,
    Silver,
    Gold,
    Platinum,
    Diamond,
    Master,
    Grandmaster
}

public static class RankTiers
{
    public static RankTier FromRating(int rating) => rating switch
    {
        < 900 => RankTier.Beginner,
        < 1100 => RankTier.Bronze,
        < 1300 => RankTier.Silver,
        < 1500 => RankTier.Gold,
        < 1700 => RankTier.Platinum,
        < 1900 => RankTier.Diamond,
        < 2100 => RankTier.Master,
        _ => RankTier.Grandmaster
    };
}
