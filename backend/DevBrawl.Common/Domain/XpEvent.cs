namespace DevBrawl.Common.Domain;

// One XP award. The unique index on (UserId, Source, SourceId) makes awarding the same thing twice impossible.
public class XpEvent
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    // XpSources.Duel or XpSources.Quiz
    public string Source { get; set; } = string.Empty;
    // What the XP was for, e.g. the duel id or the lesson id
    public string SourceId { get; set; } = string.Empty;
    public int Amount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public static class XpSources
{
    public const string Duel = "duel";
    public const string Quiz = "quiz";
}
