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

    public bool HasCategory(string categoryId) => _categories.Any(c => c.Id == categoryId);

    // A random lesson, optionally limited to one category
    public LessonKnowledge PickLesson(string? categoryId, Random random)
    {
        var candidates = _lessons.Values.Where(l => categoryId is null || l.CategoryId == categoryId).ToList();
        return candidates[random.Next(candidates.Count)];
    }

    internal static string Render(LearnLesson lesson)
    {
        var text = new StringBuilder($"# {lesson.Title}\n");
        foreach (var block in lesson.Blocks)
        {
            text.Append('\n');
            switch (block.Type)
            {
                case "text":
                    text.Append(block.Text).Append('\n');
                    break;
                case "code":
                    text.Append($"{block.File}:\n```\n{block.Code}\n```\n");
                    break;
                case "steps":
                    for (var i = 0; i < block.Steps!.Count; i++)
                        text.Append($"{i + 1}. {block.Steps[i]}\n");
                    break;
                case "table":
                    text.Append($"| {string.Join(" | ", block.Headers!)} |\n");
                    text.Append($"|{string.Concat(block.Headers!.Select(_ => " --- |"))}\n");
                    foreach (var row in block.Rows!)
                        text.Append($"| {string.Join(" | ", row)} |\n");
                    break;
                case "timeline":
                    foreach (var item in block.Items!.Value.EnumerateArray())
                        text.Append($"- {item.GetProperty("title").GetString()}: {item.GetProperty("detail").GetString()}\n");
                    break;
                case "mistakes":
                    text.Append("Common mistakes:\n");
                    foreach (var item in block.Items!.Value.EnumerateArray())
                        text.Append($"- {item.GetString()}\n");
                    break;
                case "takeaway":
                    text.Append($"Key takeaway: {block.Text}\n");
                    break;
                case "visual":
                    // Interactive diagram in the app; the surrounding text explains it
                    text.Append($"[Interactive diagram: {block.Visual}]\n");
                    break;
            }
        }
        return text.ToString();
    }
}

// Mirrors the types in frontend/src/learn/content.ts
public sealed record LearnCategory(string Id, string Title, string Description, List<LearnLesson> Lessons);

public sealed record LearnLesson(string Id, string Title, List<LearnBlock> Blocks);

public sealed record LearnBlock(
    string Type,
    string? Text,
    string? File,
    string? Code,
    List<string>? Steps,
    List<string>? Headers,
    List<List<string>>? Rows,
    // Timeline: [{ title, detail }]; mistakes: [string]
    JsonElement? Items,
    string? Visual);
