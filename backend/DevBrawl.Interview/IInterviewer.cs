using DevBrawl.Interview.Domain;

namespace DevBrawl.Interview;

// What the interview is about: a title and the lesson text the interviewer may ask about
public sealed record InterviewTopic(string Title, string Material);

public sealed record ChatTurn(MessageRole Role, string Content);

// Done is true when the interviewer has closed the interview
public sealed record InterviewerReply(string Message, bool Done);

public sealed record InterviewEvaluation(
    int Score,
    string Summary,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> Improvements);

// Runs an interview conversation. Throws InterviewerUnavailableException when no usable result comes back.
public interface IInterviewer
{
    // The interviewer's next message. An empty history opens the interview; closing asks it to wrap up.
    Task<InterviewerReply> ReplyAsync(InterviewTopic topic, IReadOnlyList<ChatTurn> history, int answersGiven, int maxAnswers,
        bool closing, CancellationToken cancellationToken = default);

    // Overall feedback on a finished interview
    Task<InterviewEvaluation> EvaluateAsync(InterviewTopic topic, IReadOnlyList<ChatTurn> history,
        CancellationToken cancellationToken = default);

    // A spoken answer as text, using the interviewer's last message to spell terms right. Empty when there is no speech.
    Task<string> TranscribeAsync(string lastQuestion, byte[] audio, string mimeType, CancellationToken cancellationToken = default);

    // The interviewer's message read aloud, as a WAV file
    Task<byte[]> SpeakAsync(string text, CancellationToken cancellationToken = default);
}

public sealed class InterviewerUnavailableException(string message, Exception? innerException = null)
    : Exception(message, innerException);
