using System.ComponentModel.DataAnnotations;
using DevBrawl.Interview.Domain;

namespace DevBrawl.Interview.Dtos;

public sealed record InterviewTopicsResponse(IReadOnlyList<InterviewCategoryResponse> Categories);

public sealed record InterviewCategoryResponse(string Id, string Title, IReadOnlyList<InterviewLessonResponse> Lessons);

public sealed record InterviewLessonResponse(string Id, string Title);

// Both optional: a lesson interviews about that lesson, a category about all its lessons, neither picks a random category
public sealed record StartInterviewRequest
{
    [StringLength(50)]
    public string? CategoryId { get; init; }

    [StringLength(50)]
    public string? LessonId { get; init; }
}

public sealed record SendMessageRequest
{
    // The cap also bounds what each reply costs
    [Required, StringLength(2000, MinimumLength = 1)]
    public string Content { get; init; } = string.Empty;
}

// Enums are sent as camelCase strings: role "interviewer" / "candidate", status "active" / "finished"
public sealed record InterviewMessageResponse(Guid Id, MessageRole Role, string Content, DateTime CreatedAt);

public sealed record InterviewEvaluationResponse(
    // 0 to 100
    int Score,
    string Summary,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> Improvements);

public sealed record InterviewSessionResponse(
    Guid Id,
    string Title,
    string CategoryId,
    string? LessonId,
    InterviewStatus Status,
    int AnswersGiven,
    int MaxAnswers,
    DateTime CreatedAt,
    DateTime? FinishedAt,
    IReadOnlyList<InterviewMessageResponse> Messages,
    // Null while active, and for an interview that ended without answers
    InterviewEvaluationResponse? Evaluation);

public sealed record InterviewSessionSummaryResponse(Guid Id, string Title, InterviewStatus Status, int? Score, DateTime CreatedAt);

// Empty Text means no speech was heard in the recording
public sealed record TranscriptResponse(Guid SessionId, string Text);
