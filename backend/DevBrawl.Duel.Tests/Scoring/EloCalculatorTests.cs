using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Scoring;

namespace DevBrawl.Duel.Tests.Scoring;

public class EloCalculatorTests
{
    private const int Security = 3;
    private const int Databases = 2;

    [Fact]
    public void Equal_ratings_win_is_16_and_mirrored()
    {
        var deltas = Deltas([Round(Security, RoundResult.Player1Won)], 1000, 1000);

        Assert.Equal(16, deltas[Security]);
    }

    [Fact]
    public void Equal_ratings_loss_is_minus_16()
    {
        var deltas = Deltas([Round(Security, RoundResult.Player2Won)], 1000, 1000);

        Assert.Equal(-16, deltas[Security]);
    }

    [Fact]
    public void Beating_a_stronger_player_gains_more_than_beating_a_weaker_one()
    {
        var vsStronger = Deltas([Round(Security, RoundResult.Player1Won)], 1000, 1400)[Security];
        var vsWeaker = Deltas([Round(Security, RoundResult.Player1Won)], 1000, 600)[Security];

        // 32 * (1 - 1/11) ≈ 29.1 and 32 * (1 - 10/11) ≈ 2.9
        Assert.Equal(29, vsStronger);
        Assert.Equal(3, vsWeaker);
    }

    [Fact]
    public void Losing_to_a_weaker_player_costs_more_than_losing_to_a_stronger_one()
    {
        var vsWeaker = Deltas([Round(Security, RoundResult.Player2Won)], 1400, 1000)[Security];
        var vsStronger = Deltas([Round(Security, RoundResult.Player2Won)], 1000, 1400)[Security];

        Assert.True(vsWeaker < vsStronger);
        Assert.Equal(-29, vsWeaker);
        Assert.Equal(-3, vsStronger);
    }

    [Fact]
    public void No_winner_round_changes_nothing_but_still_lists_the_category()
    {
        var deltas = Deltas([Round(Security, RoundResult.NoWinner)], 1200, 900);

        Assert.Equal(0, deltas[Security]);
        Assert.Single(deltas);
    }

    [Fact]
    public void Draw_between_equal_ratings_is_zero()
    {
        Assert.Equal(0, Deltas([Round(Security, RoundResult.Draw)], 1000, 1000)[Security]);
    }

    [Fact]
    public void Draw_against_a_stronger_player_gains()
    {
        // 32 * (0.5 - 1/11) ≈ 13.1
        Assert.Equal(13, Deltas([Round(Security, RoundResult.Draw)], 1000, 1400)[Security]);
    }

    [Fact]
    public void Rounds_in_the_same_category_are_summed_from_start_ratings_and_rounded_once()
    {
        // 1000 vs 1100: one win is 32 * (1 - 0.3599) ≈ 20.48. Two wins from the same start ratings ≈ 40.96 → 41.
        // Rounding each round first would give 20 + 20 = 40, and updating between rounds would give less.
        var deltas = Deltas(
            [Round(Security, RoundResult.Player1Won), Round(Security, RoundResult.Player1Won)],
            1000, 1100);

        Assert.Equal(41, deltas[Security]);
    }

    [Fact]
    public void Win_and_loss_in_the_same_category_between_equals_cancel_out()
    {
        var deltas = Deltas(
            [Round(Security, RoundResult.Player1Won), Round(Security, RoundResult.Player2Won)],
            1000, 1000);

        Assert.Equal(0, deltas[Security]);
    }

    [Fact]
    public void Categories_are_independent()
    {
        var deltas = EloCalculator.Player1Deltas(
            [Round(Security, RoundResult.Player1Won), Round(Databases, RoundResult.Player2Won)],
            new Dictionary<int, int> { [Security] = 1000, [Databases] = 1500 },
            new Dictionary<int, int> { [Security] = 1000, [Databases] = 1500 });

        Assert.Equal(16, deltas[Security]);
        Assert.Equal(-16, deltas[Databases]);
    }

    [Fact]
    public void Missing_ratings_default_to_1000()
    {
        var deltas = EloCalculator.Player1Deltas([Round(Security, RoundResult.Player1Won)], new Dictionary<int, int>(), new Dictionary<int, int>());

        Assert.Equal(16, deltas[Security]);
    }

    [Fact]
    public void Player2_delta_mirrors_player1()
    {
        // Player 2's delta is the negation of player 1's before rounding, so the two always mirror exactly
        var deltas = Deltas([Round(Security, RoundResult.Player1Won)], 1000, 1000);

        Assert.Equal(-deltas[Security], Deltas([Round(Security, RoundResult.Player2Won)], 1000, 1000)[Security]);
    }

    [Theory]
    [InlineData(1000, 1000, 0.5)]
    [InlineData(1000, 1400, 1.0 / 11)]
    [InlineData(1400, 1000, 10.0 / 11)]
    public void Expected_score_matches_the_formula(int rating, int opponent, double expected) =>
        Assert.Equal(expected, EloCalculator.ExpectedScore(rating, opponent), 10);

    private static RoundOutcome Round(int categoryId, RoundResult result) =>
        new(1, categoryId, ChallengeType.ConceptQuiz,
            result is RoundResult.Player1Won or RoundResult.Draw,
            result is RoundResult.Player2Won or RoundResult.Draw,
            result);

    private static IReadOnlyDictionary<int, int> Deltas(RoundOutcome[] rounds, int player1Rating, int player2Rating)
    {
        var categories = rounds.Select(r => r.CategoryId).Distinct().ToList();
        return EloCalculator.Player1Deltas(rounds,
            categories.ToDictionary(c => c, _ => player1Rating),
            categories.ToDictionary(c => c, _ => player2Rating));
    }
}
