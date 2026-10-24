namespace DevBrawl.Duel.Scoring;

// The overall rating is the average of a player's category ratings (spec section 12).
// It's a summary only: duels never change it directly, and it can hide big gaps between categories.
// Use this everywhere an overall rating is shown (profile, overall leaderboard), so the numbers always match.
public static class OverallRating
{
    // Missing categories count at the starting rating, so every player is averaged over the same categories
    public static int FromCategories(IEnumerable<int> categoryIds, IReadOnlyDictionary<int, int> ratings)
    {
        var values = categoryIds.Select(id => ratings.GetValueOrDefault(id, EloCalculator.StartingRating)).ToList();
        return values.Count == 0
            ? EloCalculator.StartingRating
            : (int)Math.Round(values.Average(), MidpointRounding.AwayFromZero);
    }
}
