using System.Text;
using System.Text.Json;

namespace DevBrawl.Interview.Knowledge;

// One Learn lesson, rendered as plain text for the AI interviewer
public sealed record LessonKnowledge(string CategoryId, string CategoryTitle, string LessonId, string LessonTitle, string Text);

// The Learn lessons from learn-content.json (exported from frontend/src/learn/content.ts). Read-only after loading.
public sealed class LearnKnowledgeBase
{
    private readonly List<LearnCategory> _categories;
    private readonly Dictionary<string, LessonKnowledge> _lessons;

    private LearnKnowledgeBase(List<LearnCategory> categories)
    {
        _categories = categories;
        _lessons = categories
            .SelectMany(c => c.Lessons.Select(l => new LessonKnowledge(c.Id, c.Title, l.Id, l.Title, Render(l))))
            .ToDictionary(l => l.LessonId);
    }

    public IReadOnlyList<LearnCategory> Categories => _categories;

    public static LearnKnowledgeBase Load(string path)
    {
        var categories = JsonSerializer.Deserialize<List<LearnCategory>>(File.ReadAllText(path), JsonSerializerOptions.Web)
            ?? throw new InvalidOperationException($"No Learn content in {path}");
        if (categories.Count == 0 || categories.Any(c => c.Lessons.Count == 0))
            throw new InvalidOperationException($"Learn content in {path} has a category without lessons");
        return new LearnKnowledgeBase(categories);
    }

    public LessonKnowledge? FindLesson(string lessonId) => _lessons.GetValueOrDefault(lessonId);

    public LearnCategory? FindCategory(string categoryId) => _categories.Find(c => c.Id == categoryId);

    public LearnCategory PickCategory(Random random) => _categories[random.Next(_categories.Count)];

    // Every lesson of a category, one after another, for an interview about the whole category
    public string CategoryMaterial(LearnCategory category) =>
        string.Join("\n", category.Lessons.Select(l => _lessons[l.Id].Text));

    // Blocks are read as raw JSON: the frontend keeps adding block types, and an unknown one must never break the interview
    internal static string Render(LearnLesson lesson)
    {
        var text = new StringBuilder($"# {lesson.Title}\n");
        foreach (var block in lesson.Blocks)
        {
            text.Append('\n');
            switch (Str(block, "type"))
            {
                case "text":
                    text.Append(Str(block, "text")).Append('\n');
                    break;
                case "section":
                    text.Append($"## {Str(block, "title")}\n");
                    break;
                case "code":
                    text.Append($"{Str(block, "file")}:\n```\n{Str(block, "code")}\n```\n");
                    break;
                case "steps":
                    var number = 1;
                    foreach (var step in Items(block, "steps"))
                        text.Append($"{number++}. {Flatten(step)}\n");
                    break;
                case "walkthrough":
                    foreach (var step in Items(block, "steps"))
                        text.Append($"```\n{Str(step, "code")}\n```\nResult: {Str(step, "result")}\n{Str(step, "note")}\n\n");
                    break;
                case "table":
                    var headers = Items(block, "headers").Select(Flatten).ToList();
                    text.Append($"| {string.Join(" | ", headers)} |\n");
                    text.Append($"|{string.Concat(headers.Select(_ => " --- |"))}\n");
                    foreach (var row in Items(block, "rows"))
                        text.Append($"| {string.Join(" | ", row.EnumerateArray().Select(Flatten))} |\n");
                    break;
                case "timeline":
                    foreach (var item in Items(block, "items"))
                        text.Append($"- {Str(item, "title")}: {Str(item, "detail")}\n");
                    break;
                case "mistakes":
                    text.Append("Common mistakes:\n");
                    foreach (var item in Items(block, "items"))
                        text.Append($"- {Flatten(item)}\n");
                    break;
                case "takeaway":
                    text.Append($"Key takeaway: {Str(block, "text")}\n");
                    break;
                case "method-explorer":
                    foreach (var method in Items(block, "methods"))
                        text.Append($"- {Str(method, "method")}: {Str(method, "intent")}. Changes data: {Flatten(method.GetProperty("changesData"))}. "
                            + $"Safe to repeat: {Str(method, "repeatSafe")}. Example: {Str(method, "request")} -> {Str(method, "response")}. {Str(method, "note")}\n");
                    break;
                case "visual":
                    // Interactive diagram in the app; the surrounding text explains it
                    text.Append($"[Interactive diagram: {Str(block, "visual")}]\n");
                    break;
                default:
                    // A block type added to the frontend later: keep whatever text it has, or note the interactive part
                    var content = Flatten(block, skip: "type");
                    text.Append(content.Length > 0 ? $"{content}\n" : $"[Interactive {Str(block, "type")}]\n");
                    break;
            }
        }
        return text.ToString();
    }

    private static string Str(JsonElement obj, string name) =>
        obj.ValueKind == JsonValueKind.Object && obj.TryGetProperty(name, out var value) ? Flatten(value) : string.Empty;

    private static IEnumerable<JsonElement> Items(JsonElement obj, string name) =>
        obj.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Array ? value.EnumerateArray() : [];

    // Any JSON value as readable text: strings as is, objects as "key: value" pairs, arrays joined
    private static string Flatten(JsonElement value) => Flatten(value, skip: null);

    private static string Flatten(JsonElement value, string? skip) => value.ValueKind switch
    {
        JsonValueKind.String => value.GetString()!,
        JsonValueKind.True => "yes",
        JsonValueKind.False => "no",
        JsonValueKind.Number => value.GetRawText(),
        JsonValueKind.Array => string.Join("; ", value.EnumerateArray().Select(Flatten).Where(t => t.Length > 0)),
        JsonValueKind.Object => string.Join(". ", value.EnumerateObject()
            .Where(p => p.Name != skip)
            .Select(p => (p.Name, Text: Flatten(p.Value)))
            .Where(p => p.Text.Length > 0)
            .Select(p => $"{p.Name}: {p.Text}")),
        _ => string.Empty
    };
}

// Mirrors the categories and lessons in frontend/src/learn/content.ts; blocks stay raw JSON (see Render)
public sealed record LearnCategory(string Id, string Title, string Description, List<LearnLesson> Lessons);

public sealed record LearnLesson(string Id, string Title, List<JsonElement> Blocks);
