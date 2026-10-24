namespace DevBrawl.Duel.Scoring.Domain;

// Stored in RatingChanges: one row per category whose rating a duel changed.
// Feeds "recent rating changes" on the dashboard.
public class RatingHistoryEntry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public int CategoryId { get; set; }
    public Guid DuelId { get; set; }
    public int Before { get; set; }
    public int After { get; set; }
    public DateTime CreatedAt { get; set; }
}
