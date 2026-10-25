namespace DevBrawl.Interview;

public enum InterviewError
{
    CategoryNotFound,
    LessonNotFound,
    LessonNotInCategory,
    SessionNotFound,
    MessageNotFound,
    SessionFinished,
    // Another request (e.g. a second tab) added a message at the same time
    SessionChanged,
    // The AI couldn't be reached, declined, or returned something unusable
    InterviewerUnavailable,
    // The player started all the interviews their plan allows this month (Free or Premium)
    MonthlyLimitReached
}

public sealed record InterviewResult<T>(T? Value, InterviewError? Error)
{
    public static InterviewResult<T> Ok(T value) => new(value, null);
    public static InterviewResult<T> Fail(InterviewError error) => new(default, error);
}
