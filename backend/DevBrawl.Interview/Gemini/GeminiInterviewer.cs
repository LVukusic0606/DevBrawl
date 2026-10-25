using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using DevBrawl.Interview.Prompts;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DevBrawl.Interview.Gemini;

// Runs interviews with the Gemini API (generateContent), using a response schema so the replies are JSON
public sealed class GeminiInterviewer(HttpClient http, IOptions<GeminiOptions> options, ILogger<GeminiInterviewer> logger)
    : IInterviewer
{
    private const string Provider = "Gemini";
    private readonly GeminiOptions _options = options.Value;

    public async Task<InterviewerReply> ReplyAsync(InterviewTopic topic, IReadOnlyList<ChatTurn> history, int answersGiven,
        int maxAnswers, bool closing, CancellationToken cancellationToken = default)
    {
        var output = await AskAsync<ReplyOutput>(
            InterviewPrompts.InterviewerSystem,
            InterviewPrompts.InterviewerRequest(topic, history, answersGiven, maxAnswers, closing),
            ReplySchema,
            cancellationToken);
        return InterviewOutputs.ToReply(output, Provider);
    }

    public async Task<InterviewEvaluation> EvaluateAsync(InterviewTopic topic, IReadOnlyList<ChatTurn> history,
        CancellationToken cancellationToken = default)
    {
        var output = await AskAsync<EvaluationOutput>(
            InterviewPrompts.EvaluationSystem,
            InterviewPrompts.EvaluationRequest(topic, history),
            EvaluationSchema,
            cancellationToken);
        return InterviewOutputs.ToEvaluation(output, Provider);
    }

    public async Task<string> TranscribeAsync(string lastQuestion, byte[] audio, string mimeType, CancellationToken cancellationToken = default)
    {
        var output = await AskAsync<TranscriptOutput>(
            InterviewPrompts.TranscribeSystem,
            InterviewPrompts.TranscribeRequest(lastQuestion),
            TranscriptSchema,
            cancellationToken,
            // The recording goes inline with the request; a 2-minute 16 kHz WAV is about 4 MB, well under Gemini's limit
            new JsonObject { ["inlineData"] = new JsonObject { ["mimeType"] = mimeType, ["data"] = Convert.ToBase64String(audio) } });
        return output.Transcript?.Trim() ?? string.Empty;
    }

    public async Task<byte[]> SpeakAsync(string text, CancellationToken cancellationToken = default)
    {
        var body = new JsonObject
        {
            // Only the words to say: the speech model sometimes reads instructions in the text out loud,
            // so the voice is chosen in speechConfig instead
            ["contents"] = new JsonArray(new JsonObject
            {
                ["role"] = "user",
                ["parts"] = new JsonArray(new JsonObject { ["text"] = text })
            }),
            ["generationConfig"] = new JsonObject
            {
                ["responseModalities"] = new JsonArray("AUDIO"),
                ["speechConfig"] = new JsonObject
                {
                    ["voiceConfig"] = new JsonObject
                    {
                        ["prebuiltVoiceConfig"] = new JsonObject { ["voiceName"] = _options.Voice }
                    }
                }
            }
        };

        using var reply = JsonDocument.Parse(await PostAsync(_options.TtsModel, body, cancellationToken));
        var audio = reply.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0
            && candidates[0].TryGetProperty("content", out var content) && content.TryGetProperty("parts", out var parts)
            ? parts.EnumerateArray().Select(p => p.TryGetProperty("inlineData", out var data) ? data : (JsonElement?)null).FirstOrDefault(d => d is not null)
            : null;
        if (audio is null)
            throw new InterviewerUnavailableException("Gemini returned no audio");

        var bytes = Convert.FromBase64String(audio.Value.GetProperty("data").GetString()!);
        var mimeType = audio.Value.TryGetProperty("mimeType", out var type) ? type.GetString() ?? "" : "";
        return Wav.IsWav(bytes) ? bytes : Wav.FromPcm16(bytes, Wav.SampleRateOf(mimeType) ?? 24000);
    }

    private async Task<T> AskAsync<T>(string system, string request, JsonObject schema, CancellationToken cancellationToken,
        JsonObject? attachment = null)
    {
        var body = new JsonObject
        {
            ["systemInstruction"] = new JsonObject { ["parts"] = new JsonArray(new JsonObject { ["text"] = system }) },
            ["contents"] = new JsonArray(new JsonObject
            {
                ["role"] = "user",
                ["parts"] = attachment is null
                    ? new JsonArray(new JsonObject { ["text"] = request })
                    : new JsonArray(new JsonObject { ["text"] = request }, attachment)
            }),
            ["generationConfig"] = new JsonObject
            {
                ["responseMimeType"] = "application/json",
                ["responseSchema"] = schema.DeepClone()
            }
        };
        if (!string.IsNullOrWhiteSpace(_options.ThinkingLevel))
            body["generationConfig"]!["thinkingConfig"] = new JsonObject { ["thinkingLevel"] = _options.ThinkingLevel };

        return ParseReply<T>(await PostAsync(_options.Model, body, cancellationToken));
    }

    // Sends a generateContent request and returns the reply JSON; failures become InterviewerUnavailableException
    private async Task<string> PostAsync(string model, JsonObject body, CancellationToken cancellationToken)
    {
        var apiKey = _options.ResolveApiKey();
        if (apiKey is null)
        {
            logger.LogError("Gemini API key is missing: set Gemini:ApiKey in user secrets or GEMINI_API_KEY");
            throw new InterviewerUnavailableException("Gemini API key is missing");
        }

        using var message = new HttpRequestMessage(HttpMethod.Post, $"v1beta/models/{Uri.EscapeDataString(model)}:generateContent")
        {
            Content = JsonContent.Create(body)
        };
        // In a header rather than the ?key= query string, so it never ends up in request logs
        message.Headers.Add("x-goog-api-key", apiKey);

        HttpResponseMessage response;
        try
        {
            response = await http.SendAsync(message, cancellationToken);
        }
        catch (Exception e) when (e is HttpRequestException || (e is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning(e, "Couldn't reach the Gemini API");
            throw new InterviewerUnavailableException("Couldn't reach Gemini", e);
        }

        using (response)
        {
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw Failure(response.StatusCode, json, model);
            return json;
        }
    }

    private InterviewerUnavailableException Failure(HttpStatusCode status, string body, string model)
    {
        var detail = Truncate(body);
        switch (status)
        {
            case HttpStatusCode.TooManyRequests:
                logger.LogWarning("Gemini rate limit or quota reached: {Body}", detail);
                return new("Gemini is busy");
            case HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden:
            case HttpStatusCode.BadRequest when body.Contains("API_KEY_INVALID") || body.Contains("API key not valid"):
                logger.LogError("Gemini API key is invalid or not allowed: {Body}", detail);
                return new("Gemini API key is invalid");
            case HttpStatusCode.NotFound:
                logger.LogError("Gemini model {Model} wasn't found; change it in the Gemini section of appsettings.json: {Body}", model, detail);
                return new("Gemini model not found");
            case >= HttpStatusCode.InternalServerError:
                logger.LogWarning("Gemini API server error {Status}: {Body}", (int)status, detail);
                return new("Gemini is unavailable");
            default:
                logger.LogError("Gemini API rejected the request with {Status}: {Body}", (int)status, detail);
                return new("Gemini rejected the request");
        }
    }

    internal T ParseReply<T>(string json)
    {
        using var reply = JsonDocument.Parse(json);
        var root = reply.RootElement;

        if (root.TryGetProperty("promptFeedback", out var feedback) && feedback.TryGetProperty("blockReason", out var blockReason))
        {
            logger.LogWarning("Gemini blocked an interview request ({Reason})", blockReason.GetString());
            throw new InterviewerUnavailableException("Gemini declined the request");
        }
        if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            throw new InterviewerUnavailableException("Gemini returned no answer");

        var candidate = candidates[0];
        var finishReason = candidate.TryGetProperty("finishReason", out var reason) ? reason.GetString() : null;
        if (finishReason == "MAX_TOKENS")
            throw new InterviewerUnavailableException("Gemini's reply was cut off");
        if (finishReason is not (null or "STOP"))
        {
            logger.LogWarning("Gemini stopped with {FinishReason}", finishReason);
            throw new InterviewerUnavailableException("Gemini declined the request");
        }

        // Skip thought summaries, if the model includes any
        var text = candidate.TryGetProperty("content", out var content) && content.TryGetProperty("parts", out var parts)
            ? string.Concat(parts.EnumerateArray()
                .Where(p => !(p.TryGetProperty("thought", out var thought) && thought.ValueKind == JsonValueKind.True))
                .Select(p => p.TryGetProperty("text", out var t) ? t.GetString() : null))
            : string.Empty;

        try
        {
            return JsonSerializer.Deserialize<T>(text, JsonSerializerOptions.Web)
                ?? throw new InterviewerUnavailableException("Gemini returned an empty reply");
        }
        catch (JsonException e)
        {
            logger.LogError(e, "Gemini returned invalid JSON: {Text}", Truncate(text));
            throw new InterviewerUnavailableException("Gemini returned invalid JSON", e);
        }
    }

    private static string Truncate(string text) => text.Length <= 1000 ? text : text[..1000] + "...";

    // Gemini's response schema is an OpenAPI subset, so no additionalProperties; property order keeps the JSON predictable
    internal static readonly JsonObject ReplySchema = Schema("""
        {
          "type": "OBJECT",
          "properties": {
            "message": { "type": "STRING", "description": "The interviewer's next message to the candidate" },
            "done": { "type": "BOOLEAN", "description": "True only when this message closes the interview" }
          },
          "required": ["message", "done"],
          "propertyOrdering": ["message", "done"]
        }
        """);

    internal static readonly JsonObject EvaluationSchema = Schema("""
        {
          "type": "OBJECT",
          "properties": {
            "score": { "type": "INTEGER", "description": "0 to 100" },
            "summary": { "type": "STRING" },
            "strengths": { "type": "ARRAY", "items": { "type": "STRING" } },
            "improvements": { "type": "ARRAY", "items": { "type": "STRING" } }
          },
          "required": ["score", "summary", "strengths", "improvements"],
          "propertyOrdering": ["score", "summary", "strengths", "improvements"]
        }
        """);

    internal static readonly JsonObject TranscriptSchema = Schema("""
        {
          "type": "OBJECT",
          "properties": {
            "transcript": { "type": "STRING", "description": "What the candidate said; empty if there is no speech" }
          },
          "required": ["transcript"]
        }
        """);

    // Parsed nodes fill in lazily, which isn't safe across requests; a deep clone is fully built and only read afterwards
    private static JsonObject Schema(string json) => (JsonObject)JsonNode.Parse(json)!.DeepClone();
}
