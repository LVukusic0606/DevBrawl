using System.Text.Json;
using System.Text.Json.Serialization;

namespace DevBrawl.Duel.Content;

// Everything needed to check and reveal one prepared round. Serialized into PreparedChallenge.AnswerKey,
// so checking doesn't depend on the catalog and works for rounds stored before a restart.
internal sealed record AnswerKey
{
    // ConceptQuiz and FixTheBug: the correct option's displayed id, and the original option ids in displayed order
    public string? CorrectOptionId { get; init; }
    public string[]? OptionOrder { get; init; }

    // CodeInvestigation
    public string? Path { get; init; }

    // FollowTheRequest: the displayed step ids in the correct order
    public string[]? StepIds { get; init; }

    // LogAnalysis, 1-based
    public int? Line { get; init; }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public string Serialize() => JsonSerializer.Serialize(this, JsonOptions);

    public static AnswerKey? TryParse(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        try
        {
            return JsonSerializer.Deserialize<AnswerKey>(value, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
