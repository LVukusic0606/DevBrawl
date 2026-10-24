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

// An AI interviewer (Gemini) asks open questions about the Learn lessons and grades the user's written answers
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class InterviewController(IInterviewService interviewService) : ControllerBase
{
    [HttpGet("topics")]
    [ProducesResponseType<InterviewTopicsResponse>(StatusCodes.Status200OK)]
    public InterviewTopicsResponse Topics() => interviewService.GetTopics();

    [HttpPost("questions")]
    [EnableRateLimiting(InterviewRateLimit.PolicyName)]
    [ProducesResponseType<QuestionResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> CreateQuestion(CreateQuestionRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await interviewService.CreateQuestionAsync(userId, request, cancellationToken);
        return result.Error is null ? StatusCode(StatusCodes.Status201Created, result.Value) : ToProblem(result.Error.Value);
    }

    [HttpPost("questions/{questionId:guid}/answer")]
    [EnableRateLimiting(InterviewRateLimit.PolicyName)]
    [ProducesResponseType<AnswerReviewResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> SubmitAnswer(Guid questionId, SubmitAnswerRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var result = await interviewService.SubmitAnswerAsync(userId, questionId, request.Answer, cancellationToken);
        return result.Error is null ? Ok(result.Value) : ToProblem(result.Error.Value);
    }

    // Formats Gemini accepts for audio; the frontend sends 16 kHz mono WAV
    private static readonly HashSet<string> AudioTypes =
        ["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/flac", "audio/aac"];

    // About 2 minutes of 16 kHz mono WAV
    private const long MaxAudioBytes = 5 * 1024 * 1024;

    [HttpPost("questions/{questionId:guid}/transcribe")]
    [EnableRateLimiting(InterviewRateLimit.PolicyName)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxAudioBytes + 64 * 1024)]
    [ProducesResponseType<TranscriptResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> TranscribeAnswer(Guid questionId, IFormFile audio, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var mimeType = audio.ContentType.Split(';')[0].Trim().ToLowerInvariant();
        if (audio.Length == 0 || audio.Length > MaxAudioBytes)
            return Problem("The recording must be between 1 second and 2 minutes long.", statusCode: StatusCodes.Status400BadRequest);
        if (!AudioTypes.Contains(mimeType))
            return Problem($"Unsupported audio format '{mimeType}'. Send WAV, MP3, OGG, FLAC or AAC.", statusCode: StatusCodes.Status400BadRequest);

        using var buffer = new MemoryStream((int)audio.Length);
        await audio.CopyToAsync(buffer, cancellationToken);
        var result = await interviewService.TranscribeAnswerAsync(userId, questionId, buffer.ToArray(), mimeType, cancellationToken);
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
        InterviewError.QuestionNotFound => Problem("This question doesn't exist.", statusCode: StatusCodes.Status404NotFound),
        InterviewError.AlreadyAnswered => Problem("You already answered this question. Ask for a new one.", statusCode: StatusCodes.Status409Conflict),
        InterviewError.InterviewerUnavailable => Problem("The interviewer isn't available right now. Try again in a moment.", statusCode: StatusCodes.Status503ServiceUnavailable),
        _ => throw new UnreachableException()
    };
}
