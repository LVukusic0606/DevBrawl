using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using DevBrawl.Interview.Domain;
using DevBrawl.Interview.Gemini;
using DevBrawl.Interview.Knowledge;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace DevBrawl.Interview.Tests;

// Runs against a fake HTTP handler: no network, and the key is a dummy value
public class GeminiInterviewerTests
{
    private const string DummyKey = "test-key-not-real";
    private static readonly LessonKnowledge Lesson = new("databases", "Databases", "keys", "Linking tables with keys", "# Linking tables with keys\nLesson text.\n");

    [Fact]
    public async Task Sends_the_prompt_schema_and_key_header_to_generateContent()
    {
        var handler = new FakeHandler(HttpStatusCode.OK, Reply("""{"question":"Why ids?","keyPoints":["ids are stored once"],"modelAnswer":"Because."}"""));

        var question = await Interviewer(handler).GenerateQuestionAsync(Lesson, ["Earlier?"]);

        Assert.Equal("Why ids?", question.Question);
        Assert.Equal("https://gemini.test/v1beta/models/gemini-3.8-flash:generateContent", handler.Request!.RequestUri!.ToString());
        Assert.Equal(DummyKey, handler.Request.Headers.GetValues("x-goog-api-key").Single());
        // The key never goes into the URL, where request logs would show it
        Assert.DoesNotContain(DummyKey, handler.Request.RequestUri.ToString());

        var body = JsonNode.Parse(handler.Body!)!;
        Assert.Contains("You interview learners on DevBrawl", (string)body["systemInstruction"]!["parts"]![0]!["text"]!);
        Assert.Contains("- Earlier?", (string)body["contents"]![0]!["parts"]![0]!["text"]!);
        Assert.Equal("application/json", (string)body["generationConfig"]!["responseMimeType"]!);
        Assert.Equal("OBJECT", (string)body["generationConfig"]!["responseSchema"]!["type"]!);
        Assert.Equal("low", (string)body["generationConfig"]!["thinkingConfig"]!["thinkingLevel"]!);
    }

    [Fact]
    public async Task Parses_a_review_and_skips_thought_parts()
    {
        var reply = JsonSerializer.Serialize(new
        {
            candidates = new[]
            {
                new
                {
                    finishReason = "STOP",
                    content = new
                    {
                        parts = new object[]
                        {
                            new { text = "thinking about it", thought = true },
                            new { text = """{"verdict":"partiallyCorrect","score":120,"feedback":" Close. ","strengths":["a"],"improvements":["b"]}""" }
                        }
                    }
                }
            }
        });

        var review = await Interviewer(new FakeHandler(HttpStatusCode.OK, reply)).ReviewAnswerAsync(Lesson, "Why?", ["k"], "answer");

        Assert.Equal(AnswerVerdict.PartiallyCorrect, review.Verdict);
        Assert.Equal(100, review.Score);
        Assert.Equal("Close.", review.Feedback);
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, "{}", "Gemini is busy")]
    [InlineData(HttpStatusCode.BadRequest, """{"error":{"message":"API key not valid. Please pass a valid API key."}}""", "Gemini API key is invalid")]
    [InlineData(HttpStatusCode.Forbidden, "{}", "Gemini API key is invalid")]
    [InlineData(HttpStatusCode.NotFound, "{}", "Gemini model not found")]
    [InlineData(HttpStatusCode.ServiceUnavailable, "{}", "Gemini is unavailable")]
    [InlineData(HttpStatusCode.OK, """{"promptFeedback":{"blockReason":"SAFETY"}}""", "Gemini declined the request")]
    [InlineData(HttpStatusCode.OK, """{"candidates":[{"finishReason":"SAFETY","content":{"parts":[]}}]}""", "Gemini declined the request")]
    [InlineData(HttpStatusCode.OK, """{"candidates":[{"finishReason":"MAX_TOKENS","content":{"parts":[{"text":"{"}]}}]}""", "Gemini's reply was cut off")]
    [InlineData(HttpStatusCode.OK, """{"candidates":[{"finishReason":"STOP","content":{"parts":[{"text":"not json"}]}}]}""", "Gemini returned invalid JSON")]
    public async Task Failures_make_the_interviewer_unavailable(HttpStatusCode status, string body, string message)
    {
        var error = await Assert.ThrowsAsync<InterviewerUnavailableException>(() =>
            Interviewer(new FakeHandler(status, body)).GenerateQuestionAsync(Lesson, []));

        Assert.Equal(message, error.Message);
    }

    [Fact]
    public async Task Missing_key_fails_without_calling_Gemini()
    {
        var handler = new FakeHandler(HttpStatusCode.OK, "{}");
        var options = new GeminiOptions { ApiKey = null };
        // Only meaningful when the machine running the tests has no key in its environment
        if (options.ResolveApiKey() is not null) return;

        var interviewer = new GeminiInterviewer(new HttpClient(handler) { BaseAddress = new Uri("https://gemini.test/") },
            Options.Create(options), NullLogger<GeminiInterviewer>.Instance);

        var error = await Assert.ThrowsAsync<InterviewerUnavailableException>(() => interviewer.GenerateQuestionAsync(Lesson, []));
        Assert.Equal("Gemini API key is missing", error.Message);
        Assert.Null(handler.Request);
    }

    private static GeminiInterviewer Interviewer(FakeHandler handler) =>
        new(new HttpClient(handler) { BaseAddress = new Uri("https://gemini.test/") },
            Options.Create(new GeminiOptions { ApiKey = DummyKey }),
            NullLogger<GeminiInterviewer>.Instance);

    private static string Reply(string json) => JsonSerializer.Serialize(new
    {
        candidates = new[] { new { finishReason = "STOP", content = new { parts = new[] { new { text = json } } } } }
    });

    private sealed class FakeHandler(HttpStatusCode status, string body) : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Request = request;
            Body = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
        }
    }
}
