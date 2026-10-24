using DevBrawl.Interview;
using DevBrawl.Interview.Dtos;

namespace DevBrawl.Infrastructure.Services.Contracts;

public interface IInterviewService
{
    InterviewTopicsResponse GetTopics();

    Task<InterviewResult<QuestionResponse>> CreateQuestionAsync(Guid userId, CreateQuestionRequest request,
        CancellationToken cancellationToken = default);

    // Each question can be answered once
    Task<InterviewResult<AnswerReviewResponse>> SubmitAnswerAsync(Guid userId, Guid questionId, string answer,
        CancellationToken cancellationToken = default);
}
