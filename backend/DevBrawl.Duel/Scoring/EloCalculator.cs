using DevBrawl.Duel.Contracts;

namespace DevBrawl.Duel.Scoring;

// Standard Elo per spec section 8. Pure, so it's tested without a database.
public static class EloCalculator
{
    public const int StartingRating = 1000;
    public const int KFactor = 32;

    // Probability that a player rated `rating` beats one rated `opponentRating`
    public static double ExpectedScore(int rating, int opponentRating) =>
        1 / (1 + Math.Pow(10, (opponentRating - rating) / 400.0));

    // Player 1's rating change per category played in the duel; player 2's is the negation.
    // Every round uses the start-of-duel ratings, deltas of rounds in the same category are summed,
    // and the sum is rounded once. Categories whose rounds all had no winner are included with 0.
    public static IReadOnlyDictionary<int, int> Player1Deltas(
        IEnumerable<RoundOutcome> rounds,
        IReadOnlyDictionary<int, int> player1Ratings,
        IReadOnlyDictionary<int, int> player2Ratings)
    {
        var sums = new Dictionary<int, double>();
        foreach (var round in rounds)
        {
            sums.TryAdd(round.CategoryId, 0);

            double? score = round.Result switch
            {
                RoundResult.Player1Won => 1,
                RoundResult.Player2Won => 0,
                RoundResult.Draw => 0.5,
                _ => null
            };
            if (score is null) continue;

            var expected = ExpectedScore(
                player1Ratings.GetValueOrDefault(round.CategoryId, StartingRating),
                player2Ratings.GetValueOrDefault(round.CategoryId, StartingRating));
            sums[round.CategoryId] += KFactor * (score.Value - expected);
        }

        return sums.ToDictionary(s => s.Key, s => (int)Math.Round(s.Value, MidpointRounding.AwayFromZero));
    }
}
