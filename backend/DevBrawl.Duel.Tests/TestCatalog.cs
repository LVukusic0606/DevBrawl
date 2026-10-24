using DevBrawl.Duel.Content;

namespace DevBrawl.Duel.Tests;

// The real backend/Questions content, copied to the test output by DevBrawl.Duel.csproj
internal static class TestCatalog
{
    public static readonly string Directory = Path.Combine(AppContext.BaseDirectory, "Questions");

    // Same ids as the seeded Categories table
    public static readonly Dictionary<string, int> CategoryIds = new()
    {
        ["apis-networking"] = 1,
        ["databases"] = 2,
        ["security"] = 3,
        ["debugging"] = 4,
        ["system-design"] = 5,
        ["infrastructure"] = 6
    };

    public static ChallengeCatalog Load(Random? random = null) => ChallengeCatalog.Load(Directory, CategoryIds, random);
}
