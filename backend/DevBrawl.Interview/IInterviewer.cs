using DevBrawl.Interview.Domain;
using DevBrawl.Interview.Knowledge;

namespace DevBrawl.Interview;

public sealed record GeneratedQuestion(string Question, IReadOnlyList<string> KeyPoints, string ModelAnswer);

public sealed record AnswerReview(
    AnswerVerdict Verdict,
    int Score,
    string Feedback,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> Improvements);

// Asks and grades questions about a lesson. Throws InterviewerUnavailableException when no usable result comes back.
public interface IInterviewer
{
    Task<GeneratedQuestion> GenerateQuestionAsync(LessonKnowledge lesson, IReadOnlyList<string> previousQuestions,
        CancellationToken cancellationToken = default);

    Task<AnswerReview> ReviewAnswerAsync(LessonKnowledge lesson, string question, IReadOnlyList<string> keyPoints, string answer,
        CancellationToken cancellationToken = default);

    // A spoken answer to the question, as text. Empty when the recording has no speech.
    Task<string> TranscribeAsync(string question, byte[] audio, string mimeType, CancellationToken cancellationToken = default);
}

public sealed class InterviewerUnavailableException(string message, Exception? innerException = null)
    : Exception(message, innerException);
