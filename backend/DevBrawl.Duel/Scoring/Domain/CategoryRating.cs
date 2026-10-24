namespace DevBrawl.Duel.Scoring.Domain;

// A user's Elo in one category. Every user has a row for every category, created at signup.
public class CategoryRating
{
    public Guid UserId { get; set; }
    public int CategoryId { get; set; }
    public int Rating { get; set; }
    public DateTime UpdatedAt { get; set; }
}
