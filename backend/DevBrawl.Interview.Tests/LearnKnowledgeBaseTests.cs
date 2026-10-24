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
        Assert.Equal(["frontend-web", "backend", "databases", "version-control"], _knowledge.Categories.Select(c => c.Id));
        Assert.Equal(9, _knowledge.Categories.Sum(c => c.Lessons.Count));
        Assert.Equal("Databases", _knowledge.FindLesson("keys")!.CategoryTitle);
    }

    [Fact]
    public void Json_matches_the_lessons_in_content_ts()
    {
        // Ids in content.ts are the only `id: '...'` entries, so a regex is enough to catch a stale export
        var contentTs = File.ReadAllText(Path.Combine(RepoRoot(), "frontend", "src", "learn", "content.ts"));
        var idsInTs = Regex.Matches(contentTs, @"\bid: '([^']+)'").Select(m => m.Groups[1].Value).ToList();
        var idsInJson = _knowledge.Categories.SelectMany(c => c.Lessons.Select(l => l.Id).Prepend(c.Id)).ToList();

        Assert.True(idsInTs.SequenceEqual(idsInJson),
            "learn-content.json is out of date: run node backend/DevBrawl.Interview/Knowledge/export-learn-content.mjs");
    }

    [Fact]
    public void Renders_every_block_type_as_readable_text()
    {
        var keys = _knowledge.FindLesson("keys")!.Text;
        var browser = _knowledge.FindLesson("browser-page")!.Text;
        var commits = _knowledge.FindLesson("commits")!.Text;
        var flexbox = _knowledge.FindLesson("layout-flexbox")!.Text;

        Assert.StartsWith("# Linking tables with keys\n", keys);
        Assert.Contains("| duels.id | winner_id | loser_id |\n| --- | --- | --- |\n| 10 | 1 | 2 |", keys);
        Assert.Contains("1. Download the HTML document\n2. Build the structure of the page", browser);
        Assert.Contains("my-site/:\n```\nmy-site/\n├── index.html", browser);
        Assert.Contains("- Add login screen: A new page and its styles.", commits);
        Assert.Contains("[Interactive diagram: flexbox]", flexbox);
    }

    [Fact]
    public void Picks_a_random_lesson_within_the_category()
    {
        var picked = Enumerable.Range(0, 50).Select(i => _knowledge.PickLesson("databases", new Random(i))).ToList();

        Assert.All(picked, l => Assert.Equal("databases", l.CategoryId));
        Assert.Equal(["keys", "tables"], picked.Select(l => l.LessonId).Distinct().Order());
    }

    [Fact]
    public void Unknown_lesson_and_category_are_not_found()
    {
        Assert.Null(_knowledge.FindLesson("nope"));
        Assert.False(_knowledge.HasCategory("nope"));
        Assert.True(_knowledge.HasCategory("backend"));
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
