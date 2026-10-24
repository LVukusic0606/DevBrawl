using System.Text.Json;
using DevBrawl.Duel.Contracts;

namespace DevBrawl.Duel.Content;

// Stateless: everything needed is in the answer key, so it doesn't depend on the catalog
public sealed class AnswerChecker : IAnswerChecker
{
    public bool IsCorrect(ChallengeType type, string answerKey, JsonElement answer)
    {
        var key = AnswerKey.TryParse(answerKey);
        if (key is null || answer.ValueKind != JsonValueKind.Object) return false;

        return type switch
        {
            ChallengeType.ConceptQuiz or ChallengeType.FixTheBug =>
                key.CorrectOptionId is not null && GetString(answer, "optionId") == key.CorrectOptionId,
            ChallengeType.CodeInvestigation =>
                key.Path is not null && GetString(answer, "path") == key.Path,
            ChallengeType.FollowTheRequest =>
                key.StepIds is { Length: > 0 } && GetStrings(answer, "stepIds")?.SequenceEqual(key.StepIds) == true,
            ChallengeType.LogAnalysis =>
                key.Line is not null && GetInt(answer, "line") == key.Line,
            _ => false
        };
    }

    private static string? GetString(JsonElement obj, string name) =>
        obj.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

    private static int? GetInt(JsonElement obj, string name) =>
        obj.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var n) ? n : null;

    private static List<string>? GetStrings(JsonElement obj, string name)
    {
        if (!obj.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.Array) return null;

        var items = new List<string>();
        foreach (var item in value.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.String) return null;
            items.Add(item.GetString()!);
        }
        return items;
    }
}
