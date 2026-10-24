namespace DevBrawl.Duel.Engine.Domain;

public enum DuelStatus
{
    InProgress = 1,
    Finished = 2,
    // The server stopped while the duel was running; no ratings or XP were applied
    Abandoned = 3
}

// Stored in the Duels table. Named DuelMatch because "Duel" is also a namespace.
public class DuelMatch
{
    public Guid Id { get; set; }
    public Guid Player1Id { get; set; }
    public Guid Player2Id { get; set; }
    public DuelStatus Status { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    // null while running and when the duel is a draw
    public Guid? WinnerId { get; set; }
    // Rounds won
    public int Player1Score { get; set; }
    public int Player2Score { get; set; }
    // PlayerRewards as JSON, set when the duel finishes; shown again in the results review
    public string? Player1Rewards { get; set; }
    public string? Player2Rewards { get; set; }

    public List<DuelRound> Rounds { get; set; } = [];
}
