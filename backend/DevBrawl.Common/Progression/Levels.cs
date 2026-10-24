namespace DevBrawl.Common.Progression;

// Advancing from level n to n + 1 costs 100 * n XP (spec section 10):
// level 1 at 0 XP, level 2 at 100, level 3 at 300, level 4 at 600, ...
public static class Levels
{
    public static int FromTotalXp(int totalXp)
    {
        var level = 1;
        while (totalXp >= TotalXpForLevel(level + 1))
            level++;
        return level;
    }

    // Total XP needed to reach a level: 100 * (1 + 2 + ... + (level - 1))
    public static int TotalXpForLevel(int level) => 50 * (level - 1) * level;
}
