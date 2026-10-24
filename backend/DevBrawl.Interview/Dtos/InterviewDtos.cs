using System.ComponentModel.DataAnnotations;

namespace DevBrawl.Interview.Dtos;

public sealed record InterviewTopicsResponse(IReadOnlyList<InterviewCategoryResponse> Categories);

public sealed record InterviewCategoryResponse(string Id, string Title, IReadOnlyList<InterviewLessonResponse> Lessons);

public sealed record InterviewLessonResponse(string Id, string Title);

// Both optional: no lesson picks a random one, from the category if one is given
public sealed record CreateQuestionRequest
{
    [StringLength(50)]
    public string? CategoryId { get; init; }

    [StringLength(50)]
    public string? LessonId { get; init; }
}

public sealed record QuestionResponse(
    Guid Id,
    string CategoryId,
    string CategoryTitle,
    string LessonId,
    string LessonTitle,
    string Question,
    DateTime CreatedAt);

public sealed record SubmitAnswerRequest
{
    // The cap also bounds what each review costs
    [Required, StringLength(2000, MinimumLength = 1)]
    public string Answer { get; init; } = string.Empty;
}

public sealed record AnswerReviewResponse(
    Guid QuestionId,
    // "correct", "partiallyCorrect" or "incorrect"
    string Verdict,
    // 0 to 100
    int Score,
    string Feedback,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> Improvements,
    string ModelAnswer);
