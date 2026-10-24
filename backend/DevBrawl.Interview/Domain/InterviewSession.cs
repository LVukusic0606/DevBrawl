namespace DevBrawl.Interview.Domain;

public enum InterviewStatus
{
    Active = 1,
    Finished = 2
}

// One interview: a conversation between the AI interviewer and a user about a category or a single lesson
public class InterviewSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    // Ids from frontend/src/learn/content.ts, e.g. "databases" / "primary-foreign-keys"; LessonId is null for a whole category
    public string CategoryId { get; set; } = string.Empty;
    public string? LessonId { get; set; }
    // Shown in the history list, e.g. "Databases" or "Primary and foreign keys"
    public string Title { get; set; } = string.Empty;
    public InterviewStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? FinishedAt { get; set; }

    // Set when the interview ends with at least one answer
    public int? Score { get; set; }
    // InterviewEvaluation as JSON
    public string? Evaluation { get; set; }

    public List<InterviewMessage> Messages { get; set; } = [];
}

public enum MessageRole
{
    Interviewer = 1,
    Candidate = 2
}

public class InterviewMessage
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    // Position in the conversation, starting at 1
    public int Sequence { get; set; }
    public MessageRole Role { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
