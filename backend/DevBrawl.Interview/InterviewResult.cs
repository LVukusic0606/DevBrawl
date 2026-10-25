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
    // The voice model's daily quota is used up; the result's RetryAfter says when it resets
    VoiceQuotaExceeded
}

public sealed record InterviewResult<T>(T? Value, InterviewError? Error, TimeSpan? RetryAfter = null)
{
    public static InterviewResult<T> Ok(T value) => new(value, null);
    public static InterviewResult<T> Fail(InterviewError error, TimeSpan? retryAfter = null) => new(default, error, retryAfter);
}
