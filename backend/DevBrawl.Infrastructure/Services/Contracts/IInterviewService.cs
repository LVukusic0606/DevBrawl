using DevBrawl.Interview;
using DevBrawl.Interview.Dtos;

namespace DevBrawl.Infrastructure.Services.Contracts;

public interface IInterviewService
{
    InterviewTopicsResponse GetTopics();

    // The user's interviews, newest first
    Task<IReadOnlyList<InterviewSessionSummaryResponse>> ListSessionsAsync(Guid userId, CancellationToken cancellationToken = default);

    // Starts an interview; the response already contains the interviewer's opening message
    Task<InterviewResult<InterviewSessionResponse>> StartAsync(Guid userId, StartInterviewRequest request,
        CancellationToken cancellationToken = default);

    Task<InterviewResult<InterviewSessionResponse>> GetAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default);

    // Adds the user's answer and the interviewer's reply. After the last answer the interview finishes and is evaluated.
    Task<InterviewResult<InterviewSessionResponse>> SendAsync(Guid userId, Guid sessionId, string content,
        CancellationToken cancellationToken = default);

    // Ends the interview early, or retries an evaluation that failed
    Task<InterviewResult<InterviewSessionResponse>> FinishAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default);

    // An interviewer message read aloud, as WAV
    Task<InterviewResult<byte[]>> SpeakAsync(Guid userId, Guid sessionId, Guid messageId, CancellationToken cancellationToken = default);

    // Turns a recorded answer into text the user can check before sending it
    Task<InterviewResult<TranscriptResponse>> TranscribeAsync(Guid userId, Guid sessionId, byte[] audio, string mimeType,
        CancellationToken cancellationToken = default);
}
