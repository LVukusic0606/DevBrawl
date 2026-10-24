namespace DevBrawl.Interview.Gemini;

public class GeminiOptions
{
    public const string SectionName = "Gemini";

    // Put it in user secrets (Gemini:ApiKey), never in appsettings.json; GEMINI_API_KEY in the environment also works
    public string? ApiKey { get; set; }
    public string Model { get; set; } = "gemini-3.8-flash";
    // How long Gemini reasons before answering. "low" keeps replies to seconds; questions and grading don't need more.
    // Leave empty to use the model's default (much slower).
    public string? ThinkingLevel { get; set; } = "low";
    public int TimeoutSeconds { get; set; } = 120;
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/";

    public string? ResolveApiKey() =>
        new[] { ApiKey, Environment.GetEnvironmentVariable("GEMINI_API_KEY"), Environment.GetEnvironmentVariable("GOOGLE_API_KEY") }
            .FirstOrDefault(key => !string.IsNullOrWhiteSpace(key))?.Trim();
}
