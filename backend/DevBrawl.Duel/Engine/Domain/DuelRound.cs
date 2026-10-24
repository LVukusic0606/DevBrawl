using DevBrawl.Duel.Contracts;

namespace DevBrawl.Duel.Engine.Domain;

// Stored in the DuelRounds table. Inserted when the round starts, completed when it ends.
public class DuelRound
{
    public Guid DuelId { get; set; }
    public int RoundNumber { get; set; }
    public string ChallengeId { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public ChallengeType Type { get; set; }
    public string AnswerKey { get; set; } = string.Empty;
    // The exact view the players saw, so the results review doesn't depend on the content files
    public string ClientView { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime EndsAt { get; set; }
    public DateTime? EndedAt { get; set; }

    // Answers as sent by the client (JSON); null when the player didn't answer in time
    public string? Player1Answer { get; set; }
    public bool Player1Correct { get; set; }
    public DateTime? Player1AnsweredAt { get; set; }
    public string? Player2Answer { get; set; }
    public bool Player2Correct { get; set; }
    public DateTime? Player2AnsweredAt { get; set; }

    public RoundResult? Result { get; set; }
    // IChallengeCatalog.GetReveal as JSON
    public string? Reveal { get; set; }
}
