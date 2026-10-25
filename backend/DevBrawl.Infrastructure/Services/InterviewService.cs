using System.Text.Json;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using DevBrawl.Interview;
using DevBrawl.Interview.Domain;
using DevBrawl.Interview.Dtos;
using DevBrawl.Interview.Knowledge;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace DevBrawl.Infrastructure.Services;

public class InterviewService(
    AppDbContext db,
    LearnKnowledgeBase knowledge,
    IInterviewer interviewer,
    IOptions<InterviewOptions> options,
    IMemoryCache cache,
    IPremiumService premium) : IInterviewService
{
    private const int HistoryShown = 20;
    // Replaying a message reuses the audio instead of paying for speech again
    private static readonly TimeSpan SpeechCacheTime = TimeSpan.FromMinutes(30);
    private readonly int _maxAnswers = Math.Max(1, options.Value.MaxAnswers);

    public InterviewTopicsResponse GetTopics() => new(knowledge.Categories
        .Select(c => new InterviewCategoryResponse(c.Id, c.Title, c.Lessons.Select(l => new InterviewLessonResponse(l.Id, l.Title)).ToList()))
        .ToList());

    public async Task<IReadOnlyList<InterviewSessionSummaryResponse>> ListSessionsAsync(Guid userId,
        CancellationToken cancellationToken = default) =>
        await db.InterviewSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .Take(HistoryShown)
            .Select(s => new InterviewSessionSummaryResponse(s.Id, s.Title, s.Status, s.Score, s.CreatedAt))
            .ToListAsync(cancellationToken);

    public async Task<InterviewResult<InterviewSessionResponse>> StartAsync(Guid userId, StartInterviewRequest request,
        CancellationToken cancellationToken = default)
    {
        // Free and Premium allow a number of interviews per calendar month
        var allowance = await premium.GetInterviewAllowanceAsync(userId, cancellationToken);
        if (allowance.Used >= allowance.Limit)
            return Fail(InterviewError.MonthlyLimitReached);

        string categoryId, title;
        if (request.LessonId is not null)
        {
            var lesson = knowledge.FindLesson(request.LessonId);
            if (lesson is null)
                return Fail(InterviewError.LessonNotFound);
            if (request.CategoryId is not null && lesson.CategoryId != request.CategoryId)
                return Fail(knowledge.FindCategory(request.CategoryId) is null ? InterviewError.CategoryNotFound : InterviewError.LessonNotInCategory);
            (categoryId, title) = (lesson.CategoryId, lesson.LessonTitle);
        }
        else
        {
            var category = request.CategoryId is null ? knowledge.PickCategory(Random.Shared) : knowledge.FindCategory(request.CategoryId);
            if (category is null)
                return Fail(InterviewError.CategoryNotFound);
            (categoryId, title) = (category.Id, category.Title);
        }

        var session = new InterviewSession
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            CategoryId = categoryId,
            LessonId = request.LessonId,
            Title = title,
            Status = InterviewStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        // The interview only exists once the interviewer has opened it
        InterviewerReply opening;
        try
        {
            opening = await interviewer.ReplyAsync(TopicOf(session)!, [], 0, _maxAnswers, closing: false, cancellationToken);
        }
        catch (InterviewerUnavailableException)
        {
            return Fail(InterviewError.InterviewerUnavailable);
        }

        AddMessage(session, MessageRole.Interviewer, opening.Message);
        db.InterviewSessions.Add(session);
        await db.SaveChangesAsync(cancellationToken);
        return InterviewResult<InterviewSessionResponse>.Ok(ToResponse(session));
    }

    public async Task<InterviewResult<InterviewSessionResponse>> GetAsync(Guid userId, Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var session = await LoadAsync(userId, sessionId, tracked: false, cancellationToken);
        return session is null ? Fail(InterviewError.SessionNotFound) : InterviewResult<InterviewSessionResponse>.Ok(ToResponse(session));
    }

    public async Task<InterviewResult<InterviewSessionResponse>> SendAsync(Guid userId, Guid sessionId, string content,
        CancellationToken cancellationToken = default)
    {
        var session = await LoadAsync(userId, sessionId, tracked: true, cancellationToken);
        if (session is null)
            return Fail(InterviewError.SessionNotFound);
        if (session.Status != InterviewStatus.Active)
            return Fail(InterviewError.SessionFinished);
        var topic = TopicOf(session);
        if (topic is null)
            return Fail(InterviewError.LessonNotFound);

        var answer = content.Trim();
        var answersGiven = session.Messages.Count(m => m.Role == MessageRole.Candidate) + 1;
        var closing = answersGiven >= _maxAnswers;
        var history = History(session).Append(new ChatTurn(MessageRole.Candidate, answer)).ToList();

        // Nothing is saved unless the interviewer answers, so a failed request can simply be sent again
        InterviewerReply reply;
        try
        {
            reply = await interviewer.ReplyAsync(topic, history, answersGiven, _maxAnswers, closing, cancellationToken);
        }
        catch (InterviewerUnavailableException)
        {
            return Fail(InterviewError.InterviewerUnavailable);
        }

        AddMessage(session, MessageRole.Candidate, answer);
        AddMessage(session, MessageRole.Interviewer, reply.Message);
        if (closing || reply.Done)
            await FinishWithEvaluationAsync(session, topic, cancellationToken);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // The unique (SessionId, Sequence) index: another request added a message to this interview first
            return Fail(InterviewError.SessionChanged);
        }
        return InterviewResult<InterviewSessionResponse>.Ok(ToResponse(session));
    }

    public async Task<InterviewResult<InterviewSessionResponse>> FinishAsync(Guid userId, Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var session = await LoadAsync(userId, sessionId, tracked: true, cancellationToken);
        if (session is null)
            return Fail(InterviewError.SessionNotFound);

        var answered = session.Messages.Any(m => m.Role == MessageRole.Candidate);
        if (answered && session.Evaluation is null)
        {
            var topic = TopicOf(session);
            if (topic is null)
                return Fail(InterviewError.LessonNotFound);
            try
            {
                SetEvaluation(session, await interviewer.EvaluateAsync(topic, History(session).ToList(), cancellationToken));
            }
            catch (InterviewerUnavailableException)
            {
                return Fail(InterviewError.InterviewerUnavailable);
            }
        }

        if (session.Status == InterviewStatus.Active)
        {
            session.Status = InterviewStatus.Finished;
            session.FinishedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(cancellationToken);
        return InterviewResult<InterviewSessionResponse>.Ok(ToResponse(session));
    }

    public async Task<InterviewResult<byte[]>> SpeakAsync(Guid userId, Guid sessionId, Guid messageId,
        CancellationToken cancellationToken = default)
    {
        var message = await db.InterviewMessages
            .AsNoTracking()
            .Where(m => m.Id == messageId && m.SessionId == sessionId && m.Role == MessageRole.Interviewer)
            .Where(m => db.InterviewSessions.Any(s => s.Id == m.SessionId && s.UserId == userId))
            .SingleOrDefaultAsync(cancellationToken);
        if (message is null)
            return InterviewResult<byte[]>.Fail(InterviewError.MessageNotFound);

        var key = $"interview-speech:{message.Id}";
        if (cache.TryGetValue(key, out byte[]? cached) && cached is not null)
            return InterviewResult<byte[]>.Ok(cached);

        try
        {
            var audio = await interviewer.SpeakAsync(message.Content, cancellationToken);
            cache.Set(key, audio, SpeechCacheTime);
            return InterviewResult<byte[]>.Ok(audio);
        }
        catch (InterviewerUnavailableException)
        {
            return InterviewResult<byte[]>.Fail(InterviewError.InterviewerUnavailable);
        }
    }

    public async Task<InterviewResult<TranscriptResponse>> TranscribeAsync(Guid userId, Guid sessionId, byte[] audio, string mimeType,
        CancellationToken cancellationToken = default)
    {
        // Only for the user's own running interviews, so the endpoint can't be used as a general transcription service
        var session = await LoadAsync(userId, sessionId, tracked: false, cancellationToken);
        if (session is null)
            return InterviewResult<TranscriptResponse>.Fail(InterviewError.SessionNotFound);
        if (session.Status != InterviewStatus.Active)
            return InterviewResult<TranscriptResponse>.Fail(InterviewError.SessionFinished);

        var lastQuestion = session.Messages.LastOrDefault(m => m.Role == MessageRole.Interviewer)?.Content ?? session.Title;
        try
        {
            var text = await interviewer.TranscribeAsync(lastQuestion, audio, mimeType, cancellationToken);
            return InterviewResult<TranscriptResponse>.Ok(new TranscriptResponse(session.Id, text));
        }
        catch (InterviewerUnavailableException)
        {
            return InterviewResult<TranscriptResponse>.Fail(InterviewError.InterviewerUnavailable);
        }
    }

    // Finishes the interview. If the evaluation fails, it stays empty and FinishAsync can retry it.
    private async Task FinishWithEvaluationAsync(InterviewSession session, InterviewTopic topic, CancellationToken cancellationToken)
    {
        session.Status = InterviewStatus.Finished;
        session.FinishedAt = DateTime.UtcNow;
        try
        {
            SetEvaluation(session, await interviewer.EvaluateAsync(topic, History(session).ToList(), cancellationToken));
        }
        catch (InterviewerUnavailableException)
        {
            // The conversation is still saved; the page offers to retry the feedback
        }
    }

    private static void SetEvaluation(InterviewSession session, InterviewEvaluation evaluation)
    {
        session.Score = evaluation.Score;
        session.Evaluation = JsonSerializer.Serialize(evaluation, JsonSerializerOptions.Web);
    }

    private async Task<InterviewSession?> LoadAsync(Guid userId, Guid sessionId, bool tracked, CancellationToken cancellationToken)
    {
        var query = db.InterviewSessions.Include(s => s.Messages).Where(s => s.Id == sessionId && s.UserId == userId);
        var session = await (tracked ? query : query.AsNoTracking()).SingleOrDefaultAsync(cancellationToken);
        session?.Messages.Sort((a, b) => a.Sequence.CompareTo(b.Sequence));
        return session;
    }

    // Null when the lesson or category was removed from the Learn content after the interview started
    private InterviewTopic? TopicOf(InterviewSession session)
    {
        if (session.LessonId is not null)
            return knowledge.FindLesson(session.LessonId) is { } lesson ? new InterviewTopic(lesson.LessonTitle, lesson.Text) : null;
        return knowledge.FindCategory(session.CategoryId) is { } category
            ? new InterviewTopic(category.Title, knowledge.CategoryMaterial(category))
            : null;
    }

    private static IEnumerable<ChatTurn> History(InterviewSession session) =>
        session.Messages.Select(m => new ChatTurn(m.Role, m.Content));

    private void AddMessage(InterviewSession session, MessageRole role, string content)
    {
        var message = new InterviewMessage
        {
            Id = Guid.CreateVersion7(),
            SessionId = session.Id,
            Sequence = session.Messages.Count + 1,
            Role = role,
            Content = content,
            CreatedAt = DateTime.UtcNow
        };
        session.Messages.Add(message);
        // The id is set here, so EF would take a message added to a loaded session for an existing row; mark it as new
        if (db.Entry(session).State != EntityState.Detached)
            db.Entry(message).State = EntityState.Added;
    }

    private InterviewSessionResponse ToResponse(InterviewSession session) => new(
        session.Id,
        session.Title,
        session.CategoryId,
        session.LessonId,
        session.Status,
        session.Messages.Count(m => m.Role == MessageRole.Candidate),
        _maxAnswers,
        session.CreatedAt,
        session.FinishedAt,
        session.Messages.Select(m => new InterviewMessageResponse(m.Id, m.Role, m.Content, m.CreatedAt)).ToList(),
        session.Evaluation is null
            ? null
            : JsonSerializer.Deserialize<InterviewEvaluationResponse>(session.Evaluation, JsonSerializerOptions.Web));

    private static InterviewResult<InterviewSessionResponse> Fail(InterviewError error) => InterviewResult<InterviewSessionResponse>.Fail(error);
}
