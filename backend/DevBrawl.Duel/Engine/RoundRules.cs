using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Engine.Protocol;

namespace DevBrawl.Duel.Engine;

public static class RoundRules
{
    // Correctness first; speed only breaks a tie between two correct answers (spec section 8).
    // An unanswered round counts as incorrect.
    public static RoundResult Decide(bool player1Correct, DateTime? player1AnsweredAt, bool player2Correct, DateTime? player2AnsweredAt)
    {
        if (player1Correct && player2Correct)
        {
            var comparison = player1AnsweredAt!.Value.CompareTo(player2AnsweredAt!.Value);
            return comparison < 0 ? RoundResult.Player1Won : comparison > 0 ? RoundResult.Player2Won : RoundResult.Draw;
        }
        if (player1Correct) return RoundResult.Player1Won;
        if (player2Correct) return RoundResult.Player2Won;
        return RoundResult.NoWinner;
    }

    // The same result from one player's point of view
    public static PlayerRoundResult ForPlayer(RoundResult result, bool isPlayer1) => result switch
    {
        RoundResult.Player1Won => isPlayer1 ? PlayerRoundResult.Won : PlayerRoundResult.Lost,
        RoundResult.Player2Won => isPlayer1 ? PlayerRoundResult.Lost : PlayerRoundResult.Won,
        RoundResult.Draw => PlayerRoundResult.Draw,
        _ => PlayerRoundResult.NoWinner
    };

    public static PlayerDuelResult ForPlayer(int yourScore, int opponentScore) =>
        yourScore > opponentScore ? PlayerDuelResult.Won
        : yourScore < opponentScore ? PlayerDuelResult.Lost
        : PlayerDuelResult.Draw;
}
