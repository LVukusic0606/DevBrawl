using System.Text.Json;
using System.Text.RegularExpressions;
using DevBrawl.Interview.Knowledge;

namespace DevBrawl.Interview.Tests;

public class LearnKnowledgeBaseTests
{
    private static readonly string JsonPath = Path.Combine(AppContext.BaseDirectory, "Knowledge", "learn-content.json");
    private readonly LearnKnowledgeBase _knowledge = LearnKnowledgeBase.Load(JsonPath);

    [Fact]
    public void Loads_every_category_and_lesson()
    {
        Assert.Equal(
            ["apis-networking", "databases", "security", "debugging", "system-design", "infrastructure"],
            _knowledge.Categories.Select(c => c.Id));
        Assert.All(_knowledge.Categories, c => Assert.Equal(10, c.Lessons.Count));
        Assert.Equal("Databases", _knowledge.FindLesson("primary-foreign-keys")!.CategoryTitle);
    }

    [Fact]
    public void Json_matches_the_lessons_in_the_frontend()
    {
        // Lessons live in content.ts and learn/lessons/*.ts; category and lesson ids are the only `id: '...'` entries there
        var learn = Path.Combine(RepoRoot(), "frontend", "src", "learn");
        var sources = Directory.GetFiles(Path.Combine(learn, "lessons"), "*.ts").Append(Path.Combine(learn, "content.ts"));
        var idsInTs = sources
            .SelectMany(file => Regex.Matches(File.ReadAllText(file), @"\bid: '([^']+)'").Select(m => m.Groups[1].Value))
            .Order();
        var idsInJson = _knowledge.Categories.SelectMany(c => c.Lessons.Select(l => l.Id).Prepend(c.Id)).Order();

        Assert.True(idsInTs.SequenceEqual(idsInJson),
            "learn-content.json is out of date: run node backend/DevBrawl.Interview/Knowledge/export-learn-content.mjs");
    }

    [Fact]
    public void Renders_every_block_type_as_readable_text()
    {
        var request = _knowledge.FindLesson("api-request")!.Text;
        var methods = _knowledge.FindLesson("http-methods")!.Text;
        var reproduce = _knowledge.FindLesson("reproduce-bugs")!.Text;
        var ciCd = _knowledge.FindLesson("ci-cd")!.Text;

        Assert.StartsWith("# What happens during an API request?\n", request);
        Assert.Contains("1. Client sends a request\n2. Server checks who is asking", request);
        Assert.Contains("api/:\n```\napi/\n├── controllers/", request);
        Assert.Contains("Common mistakes:\n- Expecting the server to remember the previous request", request);
        Assert.Contains("Key takeaway: A request travels through layers in order", request);
        Assert.Contains("| Method | Intent | Changes data? |\n| --- | --- | --- |\n| GET | Read something | No |", methods);
        Assert.Contains("- Reproduce: Follow the steps until the bug appears on your machine.", reproduce);
        Assert.Contains("[Interactive diagram: branches]", ciCd);
    }

    [Fact]
    public void Picks_every_category_at_random()
    {
        var picked = Enumerable.Range(0, 200).Select(i => _knowledge.PickCategory(new Random(i)).Id).Distinct();

        Assert.Equal(6, picked.Count());
    }

    [Fact]
    public void Category_material_contains_every_lesson_of_the_category()
    {
        var databases = _knowledge.FindCategory("databases")!;
        var material = _knowledge.CategoryMaterial(databases);

        Assert.All(databases.Lessons, lesson => Assert.Contains($"# {lesson.Title}\n", material));
        Assert.DoesNotContain("# What happens during an API request?", material);
    }

    [Fact]
    public void Unknown_lesson_and_category_are_not_found()
    {
        Assert.Null(_knowledge.FindLesson("nope"));
        Assert.Null(_knowledge.FindCategory("nope"));
        Assert.Equal("Security", _knowledge.FindCategory("security")!.Title);
    }

    [Fact]
    public void Rejects_content_with_an_empty_category()
    {
        var path = Path.Combine(Directory.CreateTempSubdirectory().FullName, "learn-content.json");
        File.WriteAllText(path, JsonSerializer.Serialize(new[] { new { id = "x", title = "X", description = "", lessons = Array.Empty<object>() } }));

        Assert.Throws<InvalidOperationException>(() => LearnKnowledgeBase.Load(path));
    }

    private static string RepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "DevBrawl.slnx")))
            dir = dir.Parent;
        return dir?.FullName ?? throw new InvalidOperationException("Repository root not found");
    }
}
