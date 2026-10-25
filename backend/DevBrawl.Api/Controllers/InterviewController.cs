using System.Diagnostics;
using System.Security.Claims;
using DevBrawl.Api.RateLimiting;
using DevBrawl.Infrastructure.Services.Contracts;
using DevBrawl.Interview;
using DevBrawl.Interview.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.JsonWebTokens;

namespace DevBrawl.Api.Controllers;

// A chat-style interview: an AI interviewer (Gemini) asks about the Learn lessons, reacts to each answer and gives feedback at the end
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class InterviewController(IInterviewService interviewService) : ControllerBase
{
    // Formats Gemini accepts for audio; the frontend sends 16 kHz mono WAV
    private static readonly HashSet<string> AudioTypes =
        ["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/flac", "audio/aac"];

    // About 2 minutes of 16 kHz mono WAV
    private const long MaxAudioBytes = 5 * 1024 * 1024;

    [HttpGet("topics")]
    [ProducesResponseType<InterviewTopicsResponse>(StatusCodes.Status200OK)]
    public InterviewTopicsResponse Topics() => interviewService.GetTopics();

    [HttpGet("sessions")]
    [ProducesResponseType<IReadOnlyList<InterviewSessionSummaryResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListSessions(CancellationToken cancellationToken) =>
        TryGetUserId(out var userId) ? Ok(await interviewService.ListSessionsAsync(userId, cancellationToken)) : Unauthorized();

    [HttpPost("sessions")]
    [EnableRateLimiting(InterviewRateLimit.PolicyName)]
    [ProducesResponseType<InterviewSessionResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Start(StartInterviewRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await interviewService.StartAsync(userId, request, cancellationToken);
        return result.Error is null ? StatusCode(StatusCodes.Status201Created, result.Value) : ToProblem(result.Error.Value);
    }

    [HttpGet("sessions/{sessionId:guid}")]
    [ProducesResponseType<InterviewSessionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid sessionId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await interviewService.GetAsync(userId, sessionId, cancellationToken);
        return result.Error is null ? Ok(result.Value) : ToProblem(result.Error.Value);
    }

    [HttpPost("sessions/{sessionId:guid}/messages")]
    [EnableRateLimiting(InterviewRateLimit.PolicyName)]
    [ProducesResponseType<InterviewSessionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Send(Guid sessionId, SendMessageRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await interviewService.SendAsync(userId, sessionId, request.Content, cancellationToken);
        return result.Error is null ? Ok(result.Value) : ToProblem(result.Error.Value);
    }

    [HttpPost("sessions/{sessionId:guid}/finish")]
    [EnableRateLimiting(InterviewRateLimit.PolicyName)]
    [ProducesResponseType<InterviewSessionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Finish(Guid sessionId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await interviewService.FinishAsync(userId, sessionId, cancellationToken);
        return result.Error is null ? Ok(result.Value) : ToProblem(result.Error.Value);
    }

    // The interviewer's message as speech (WAV). Has its own rate limit, so voice doesn't use up the interview budget.
    [HttpGet("sessions/{sessionId:guid}/messages/{messageId:guid}/speech")]
    [EnableRateLimiting(InterviewRateLimit.VoicePolicyName)]
    [ProducesResponseType<FileContentResult>(StatusCodes.Status200OK, "audio/wav")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Speech(Guid sessionId, Guid messageId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await interviewService.SpeakAsync(userId, sessionId, messageId, cancellationToken);
        // Tells the frontend how long to keep the voice off
        if (result.RetryAfter is { } wait)
            Response.Headers.RetryAfter = ((int)Math.Ceiling(wait.TotalSeconds)).ToString();
        return result.Error is null ? File(result.Value!, "audio/wav") : ToProblem(result.Error.Value);
    }

    [HttpPost("sessions/{sessionId:guid}/transcribe")]
    [EnableRateLimiting(InterviewRateLimit.PolicyName)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxAudioBytes + 64 * 1024)]
    [ProducesResponseType<TranscriptResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Transcribe(Guid sessionId, IFormFile audio, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var mimeType = audio.ContentType.Split(';')[0].Trim().ToLowerInvariant();
        if (audio.Length == 0 || audio.Length > MaxAudioBytes)
            return Problem("The recording must be between 1 second and 2 minutes long.", statusCode: StatusCodes.Status400BadRequest);
        if (!AudioTypes.Contains(mimeType))
            return Problem($"Unsupported audio format '{mimeType}'. Send WAV, MP3, OGG, FLAC or AAC.", statusCode: StatusCodes.Status400BadRequest);

        using var buffer = new MemoryStream((int)audio.Length);
        await audio.CopyToAsync(buffer, cancellationToken);
        var result = await interviewService.TranscribeAsync(userId, sessionId, buffer.ToArray(), mimeType, cancellationToken);
        return result.Error is null ? Ok(result.Value) : ToProblem(result.Error.Value);
    }

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out userId);

    private ObjectResult ToProblem(InterviewError error) => error switch
    {
        InterviewError.CategoryNotFound => Problem(
            "This category doesn't exist. Use a category id from GET /api/interview/topics, such as \"databases\".",
            statusCode: StatusCodes.Status404NotFound),
        InterviewError.LessonNotFound => Problem(
            "This lesson doesn't exist. Use a lesson id from GET /api/interview/topics, such as \"primary-foreign-keys\".",
            statusCode: StatusCodes.Status404NotFound),
        InterviewError.LessonNotInCategory => Problem(
            "This lesson belongs to a different category. Send only the lessonId; its category is found automatically.",
            statusCode: StatusCodes.Status400BadRequest),
        InterviewError.SessionNotFound => Problem("This interview doesn't exist.", statusCode: StatusCodes.Status404NotFound),
        InterviewError.MessageNotFound => Problem("This interviewer message doesn't exist.", statusCode: StatusCodes.Status404NotFound),
        InterviewError.SessionFinished => Problem("This interview has ended. Start a new one.", statusCode: StatusCodes.Status409Conflict),
        InterviewError.SessionChanged => Problem(
            "This interview changed in another tab. Reload it and try again.", statusCode: StatusCodes.Status409Conflict),
        InterviewError.InterviewerUnavailable => Problem(
            "The interviewer isn't available right now. Try again in a moment.", statusCode: StatusCodes.Status503ServiceUnavailable),
        InterviewError.VoiceQuotaExceeded => Problem(
            "The interviewer's voice is used up for today. You can still read the messages.",
            statusCode: StatusCodes.Status429TooManyRequests),
        _ => throw new UnreachableException()
    };
}
