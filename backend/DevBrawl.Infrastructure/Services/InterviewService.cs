using System.Text.Json;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using DevBrawl.Interview;
using DevBrawl.Interview.Domain;
using DevBrawl.Interview.Dtos;
using DevBrawl.Interview.Knowledge;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Services;

public class InterviewService(AppDbContext db, LearnKnowledgeBase knowledge, IInterviewer interviewer) : IInterviewService
{
    // Enough history for the interviewer to avoid repeats without bloating the prompt
    private const int PreviousQuestionsShown = 10;

    public InterviewTopicsResponse GetTopics() => new(knowledge.Categories
        .Select(c => new InterviewCategoryResponse(c.Id, c.Title, c.Lessons.Select(l => new InterviewLessonResponse(l.Id, l.Title)).ToList()))
        .ToList());

    public async Task<InterviewResult<QuestionResponse>> CreateQuestionAsync(Guid userId, CreateQuestionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.CategoryId is not null && !knowledge.HasCategory(request.CategoryId))
            return InterviewResult<QuestionResponse>.Fail(InterviewError.CategoryNotFound);

        LessonKnowledge lesson;
        if (request.LessonId is not null)
        {
            var found = knowledge.FindLesson(request.LessonId);
            if (found is null)
                return InterviewResult<QuestionResponse>.Fail(InterviewError.LessonNotFound);
            if (request.CategoryId is not null && found.CategoryId != request.CategoryId)
                return InterviewResult<QuestionResponse>.Fail(InterviewError.LessonNotInCategory);
            lesson = found;
        }
        else
        {
            lesson = knowledge.PickLesson(request.CategoryId, Random.Shared);
        }

        var previous = await db.InterviewQuestions
            .AsNoTracking()
            .Where(q => q.UserId == userId && q.LessonId == lesson.LessonId)
            .OrderByDescending(q => q.CreatedAt)
            .Take(PreviousQuestionsShown)
            .Select(q => q.Question)
            .ToListAsync(cancellationToken);

        GeneratedQuestion generated;
        try
        {
            generated = await interviewer.GenerateQuestionAsync(lesson, previous, cancellationToken);
        }
        catch (InterviewerUnavailableException)
        {
            return InterviewResult<QuestionResponse>.Fail(InterviewError.InterviewerUnavailable);
        }

        var question = new InterviewQuestion
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            CategoryId = lesson.CategoryId,
            LessonId = lesson.LessonId,
            Question = generated.Question,
            KeyPoints = [.. generated.KeyPoints],
            ModelAnswer = generated.ModelAnswer,
            CreatedAt = DateTime.UtcNow
        };
        db.InterviewQuestions.Add(question);
        await db.SaveChangesAsync(cancellationToken);

        return InterviewResult<QuestionResponse>.Ok(new QuestionResponse(
            question.Id, lesson.CategoryId, lesson.CategoryTitle, lesson.LessonId, lesson.LessonTitle, question.Question, question.CreatedAt));
    }

    public async Task<InterviewResult<AnswerReviewResponse>> SubmitAnswerAsync(Guid userId, Guid questionId, string answer,
        CancellationToken cancellationToken = default)
    {
        var question = await db.InterviewQuestions
            .SingleOrDefaultAsync(q => q.Id == questionId && q.UserId == userId, cancellationToken);
        if (question is null)
            return InterviewResult<AnswerReviewResponse>.Fail(InterviewError.QuestionNotFound);
        if (question.Answer is not null)
            return InterviewResult<AnswerReviewResponse>.Fail(InterviewError.AlreadyAnswered);

        // A lesson removed from content.ts after the question was asked
        var lesson = knowledge.FindLesson(question.LessonId);
        if (lesson is null)
            return InterviewResult<AnswerReviewResponse>.Fail(InterviewError.LessonNotFound);

        AnswerReview review;
        try
        {
            review = await interviewer.ReviewAnswerAsync(lesson, question.Question, question.KeyPoints, answer.Trim(), cancellationToken);
        }
        catch (InterviewerUnavailableException)
        {
            return InterviewResult<AnswerReviewResponse>.Fail(InterviewError.InterviewerUnavailable);
        }

        question.Answer = answer.Trim();
        question.Verdict = review.Verdict;
        question.Score = review.Score;
        question.Review = JsonSerializer.Serialize(review, JsonSerializerOptions.Web);
        question.AnsweredAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return InterviewResult<AnswerReviewResponse>.Ok(new AnswerReviewResponse(
            question.Id,
            JsonNamingPolicy.CamelCase.ConvertName(review.Verdict.ToString()),
            review.Score,
            review.Feedback,
            review.Strengths,
            review.Improvements,
            question.ModelAnswer));
    }
}
