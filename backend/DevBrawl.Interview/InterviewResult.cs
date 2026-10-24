namespace DevBrawl.Interview;

public enum InterviewError
{
    CategoryNotFound,
    LessonNotFound,
    LessonNotInCategory,
    QuestionNotFound,
    AlreadyAnswered,
    // The AI couldn't be reached, declined, or returned something unusable
    InterviewerUnavailable
}

public sealed record InterviewResult<T>(T? Value, InterviewError? Error)
{
    public static InterviewResult<T> Ok(T value) => new(value, null);
    public static InterviewResult<T> Fail(InterviewError error) => new(default, error);
}
