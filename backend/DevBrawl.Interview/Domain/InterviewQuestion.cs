namespace DevBrawl.Interview.Domain;

// A question the AI interviewer asked one user about one Learn lesson, and the review of their answer.
// KeyPoints and ModelAnswer stay on the server until the answer is reviewed.
public class InterviewQuestion
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    // Ids from frontend/src/learn/content.ts, e.g. "databases" / "primary-foreign-keys"
    public string CategoryId { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    // What a complete answer must contain; answers are graded against these
    public List<string> KeyPoints { get; set; } = [];
    public string ModelAnswer { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // Set once, when the user answers
    public string? Answer { get; set; }
    public AnswerVerdict? Verdict { get; set; }
    public int? Score { get; set; }
    // AnswerReview as JSON
    public string? Review { get; set; }
    public DateTime? AnsweredAt { get; set; }
}

public enum AnswerVerdict
{
    Correct = 1,
    PartiallyCorrect = 2,
    Incorrect = 3
}
