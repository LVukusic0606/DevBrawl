using DevBrawl.Common.Progression;
using DevBrawl.Duel.Scoring;

namespace DevBrawl.Duel.Tests.Scoring;

public class ProgressionTests
{
    [Theory]
    [InlineData(0, 1)]
    [InlineData(99, 1)]
    [InlineData(100, 2)]
    [InlineData(299, 2)]
    [InlineData(300, 3)]
    [InlineData(599, 3)]
    [InlineData(600, 4)]
    [InlineData(1000, 5)]
    public void Level_from_total_xp(int totalXp, int level) => Assert.Equal(level, Levels.FromTotalXp(totalXp));

    [Theory]
    [InlineData(1, 0)]
    [InlineData(2, 100)]
    [InlineData(3, 300)]
    [InlineData(4, 600)]
    [InlineData(5, 1000)]
    public void Xp_needed_for_a_level(int level, int totalXp) => Assert.Equal(totalXp, Levels.TotalXpForLevel(level));

    [Theory]
    [InlineData(0, RankTier.Beginner)]
    [InlineData(899, RankTier.Beginner)]
    [InlineData(900, RankTier.Bronze)]
    [InlineData(1000, RankTier.Bronze)]
    [InlineData(1099, RankTier.Bronze)]
    [InlineData(1100, RankTier.Silver)]
    [InlineData(1300, RankTier.Gold)]
    [InlineData(1500, RankTier.Platinum)]
    [InlineData(1700, RankTier.Diamond)]
    [InlineData(1900, RankTier.Master)]
    [InlineData(2099, RankTier.Master)]
    [InlineData(2100, RankTier.Grandmaster)]
    [InlineData(3000, RankTier.Grandmaster)]
    public void Tier_from_rating(int rating, RankTier tier) => Assert.Equal(tier, RankTiers.FromRating(rating));
}
