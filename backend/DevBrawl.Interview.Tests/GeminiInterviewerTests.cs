using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using DevBrawl.Interview.Domain;
using DevBrawl.Interview.Gemini;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace DevBrawl.Interview.Tests;

// Runs against a fake HTTP handler: no network, and the key is a dummy value
public class GeminiInterviewerTests
{
    private const string DummyKey = "test-key-not-real";
    private static readonly InterviewTopic Topic = new("Databases", "# Primary and foreign keys\nLesson text.\n");
    private static readonly ChatTurn[] History = [new(MessageRole.Interviewer, "Why ids?"), new(MessageRole.Candidate, "They are stored once.")];

    [Fact]
    public async Task Sends_the_prompt_schema_and_key_header_to_generateContent()
    {
        var handler = new FakeHandler(HttpStatusCode.OK, Reply("""{"message":" Good. What happens on rename? ","done":false}"""));

        var reply = await Interviewer(handler).ReplyAsync(Topic, History, 1, 6, closing: false);

        Assert.Equal("Good. What happens on rename?", reply.Message);
        Assert.False(reply.Done);
        Assert.Equal("https://gemini.test/v1beta/models/gemini-3.5-flash-lite:generateContent", handler.Request!.RequestUri!.ToString());
        Assert.Equal(DummyKey, handler.Request.Headers.GetValues("x-goog-api-key").Single());
        // The key never goes into the URL, where request logs would show it
        Assert.DoesNotContain(DummyKey, handler.Request.RequestUri.ToString());

        var body = JsonNode.Parse(handler.Body!)!;
        Assert.Contains("technical interviewer on DevBrawl", (string)body["systemInstruction"]!["parts"]![0]!["text"]!);
        Assert.Contains("Candidate: They are stored once.", (string)body["contents"]![0]!["parts"]![0]!["text"]!);
        Assert.Equal("application/json", (string)body["generationConfig"]!["responseMimeType"]!);
        Assert.Equal("OBJECT", (string)body["generationConfig"]!["responseSchema"]!["type"]!);
        Assert.Equal("low", (string)body["generationConfig"]!["thinkingConfig"]!["thinkingLevel"]!);
    }

    [Fact]
    public async Task Sends_the_recording_inline_and_returns_the_transcript()
    {
        var handler = new FakeHandler(HttpStatusCode.OK, Reply("""{"transcript":"  It stores the user id.  "}"""));
        byte[] audio = [1, 2, 3, 4];

        var text = await Interviewer(handler).TranscribeAsync("Why ids?", audio, "audio/wav");

        Assert.Equal("It stores the user id.", text);
        var parts = JsonNode.Parse(handler.Body!)!["contents"]![0]!["parts"]!.AsArray();
        Assert.Contains("<question>Why ids?</question>", (string)parts[0]!["text"]!);
        Assert.Equal("audio/wav", (string)parts[1]!["inlineData"]!["mimeType"]!);
        Assert.Equal(Convert.ToBase64String(audio), (string)parts[1]!["inlineData"]!["data"]!);
    }

    [Fact]
    public async Task Parses_an_evaluation_and_skips_thought_parts()
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
                            new { text = """{"score":120,"summary":" Close. ","strengths":["a"],"improvements":["b"]}""" }
                        }
                    }
                }
            }
        });

        var evaluation = await Interviewer(new FakeHandler(HttpStatusCode.OK, reply)).EvaluateAsync(Topic, History);

        Assert.Equal(100, evaluation.Score);
        Assert.Equal("Close.", evaluation.Summary);
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
    [InlineData(HttpStatusCode.OK, """{"candidates":[{"finishReason":"STOP","content":{"parts":[{"text":"{\"message\":\"\",\"done\":false}"}]}}]}""", "Gemini returned an empty message")]
    public async Task Failures_make_the_interviewer_unavailable(HttpStatusCode status, string body, string message)
    {
        var error = await Assert.ThrowsAsync<InterviewerUnavailableException>(() =>
            Interviewer(new FakeHandler(status, body)).ReplyAsync(Topic, [], 0, 6, closing: false));

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

        var error = await Assert.ThrowsAsync<InterviewerUnavailableException>(() => interviewer.ReplyAsync(Topic, [], 0, 6, closing: false));
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
