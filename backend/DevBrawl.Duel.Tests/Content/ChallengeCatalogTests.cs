using System.Text.Json;
using System.Text.Json.Nodes;
using DevBrawl.Duel.Content;
using DevBrawl.Duel.Contracts;

namespace DevBrawl.Duel.Tests.Content;

public class ChallengeCatalogTests
{
    private static readonly string[] ForbiddenFields =
        ["correctOptionId", "commonMistake", "answer", "rootCauseLine", "outcome", "explanation"];

    private readonly ChallengeCatalog _catalog = TestCatalog.Load();
    private readonly AnswerChecker _checker = new();

    [Fact]
    public void Loads_all_shipped_challenges_with_every_type_in_every_category()
    {
        var prepared = _catalog.ChallengeIds.Select(_catalog.Prepare).ToList();

        Assert.Equal(60, _catalog.Count);
        foreach (var type in Enum.GetValues<ChallengeType>())
            Assert.Equal(12, prepared.Count(p => p.Type == type));
        Assert.Equal(TestCatalog.CategoryIds.Values.Order(), prepared.Select(p => p.CategoryId).Distinct().Order());
    }

    [Theory]
    [InlineData(ChallengeType.ConceptQuiz)]
    [InlineData(ChallengeType.CodeInvestigation)]
    [InlineData(ChallengeType.FixTheBug)]
    [InlineData(ChallengeType.FollowTheRequest)]
    [InlineData(ChallengeType.LogAnalysis)]
    public void GetRandom_returns_the_requested_type(ChallengeType type)
    {
        for (var i = 0; i < 20; i++)
        {
            var challenge = _catalog.GetRandom(type);
            Assert.Equal(type, challenge.Type);
            Assert.Equal(challenge.ChallengeId, (string?)challenge.ClientView["challengeId"]);
        }
    }

    [Fact]
    public void Client_view_never_contains_answer_fields()
    {
        foreach (var id in _catalog.ChallengeIds)
        {
            var names = PropertyNames(_catalog.Prepare(id).ClientView).ToList();
            Assert.DoesNotContain(names, ForbiddenFields.Contains);
        }
    }

    [Fact]
    public void Answer_from_the_reveal_is_correct_and_any_other_answer_is_not()
    {
        foreach (var id in _catalog.ChallengeIds)
        {
            var challenge = _catalog.Prepare(id);
            var view = challenge.ClientView;
            var reveal = _catalog.GetReveal(id, challenge.AnswerKey);

            var (correct, wrong) = challenge.Type switch
            {
                ChallengeType.ConceptQuiz or ChallengeType.FixTheBug => (
                    Answer(new { optionId = (string)reveal["correctOptionId"]! }),
                    Answer(new { optionId = Ids(view["options"]).First(o => o != (string)reveal["correctOptionId"]!) })),
                ChallengeType.CodeInvestigation => (
                    Answer(new { path = (string)reveal["answer"]!["path"]! }),
                    Answer(new { path = ((JsonArray)view["files"]!).Select(f => (string)f!["path"]!).First(p => p != (string)reveal["answer"]!["path"]!) })),
                // The displayed order is never the correct one
                ChallengeType.FollowTheRequest => (
                    Answer(new { stepIds = ((JsonArray)reveal["correctOrder"]!).Select(s => (string)s!).ToArray() }),
                    Answer(new { stepIds = Ids(view["steps"]).ToArray() })),
                ChallengeType.LogAnalysis => (
                    Answer(new { line = (int)reveal["rootCauseLine"]! }),
                    Answer(new { line = (int)reveal["rootCauseLine"]! == 1 ? 2 : 1 })),
                _ => throw new InvalidOperationException()
            };

            Assert.True(_checker.IsCorrect(challenge.Type, challenge.AnswerKey, correct), $"{id}: correct answer rejected");
            Assert.False(_checker.IsCorrect(challenge.Type, challenge.AnswerKey, wrong), $"{id}: wrong answer accepted");
        }
    }

    [Fact]
    public void Options_are_relabeled_a_to_d_and_the_reveal_points_at_the_right_text()
    {
        // sec-concept-01: correct is the bcrypt option, the common mistake is SHA-256 with a shared salt
        for (var seed = 0; seed < 25; seed++)
        {
            var catalog = TestCatalog.Load(new Random(seed));
            var challenge = catalog.Prepare("sec-concept-01");
            var options = (JsonArray)challenge.ClientView["options"]!;
            var reveal = catalog.GetReveal("sec-concept-01", challenge.AnswerKey);

            Assert.Equal(["a", "b", "c", "d"], Ids(options));
            Assert.StartsWith("Hashed with a slow, adaptive algorithm", TextOf(options, (string)reveal["correctOptionId"]!, "text"));
            Assert.StartsWith("SHA-256 of the password combined with one secret salt",
                TextOf(options, (string)reveal["commonMistake"]!["optionId"]!, "text"));
        }
    }

    [Fact]
    public void Fix_the_bug_hides_outcomes_and_the_reveal_maps_them_to_displayed_ids()
    {
        for (var seed = 0; seed < 25; seed++)
        {
            var catalog = TestCatalog.Load(new Random(seed));
            var challenge = catalog.Prepare("sec-fix-01");
            var options = (JsonArray)challenge.ClientView["options"]!;
            var reveal = catalog.GetReveal("sec-fix-01", challenge.AnswerKey);
            var correctId = (string)reveal["correctOptionId"]!;
            var outcomes = ((JsonArray)reveal["outcomes"]!).ToDictionary(o => (string)o!["optionId"]!, o => (string)o!["outcome"]!);

            Assert.NotNull(challenge.ClientView["code"]);
            Assert.All(options, o => Assert.NotNull(o!["code"]));
            Assert.Equal("Pass the nickname as a query parameter.", TextOf(options, correctId, "summary"));
            Assert.StartsWith("Searching for x' OR '1'='1 returns no users", outcomes[correctId]);
            Assert.Equal(Ids(options), outcomes.Keys);
        }
    }

    [Fact]
    public void Shuffling_actually_moves_the_correct_option()
    {
        var positions = Enumerable.Range(0, 100)
            .Select(_ => _catalog.GetReveal("db-concept-01", _catalog.Prepare("db-concept-01").AnswerKey))
            .Select(r => (string)r["correctOptionId"]!)
            .ToHashSet();

        Assert.True(positions.Count > 1);
    }

    [Fact]
    public void Steps_get_fresh_unique_ids_and_are_never_shown_in_the_correct_order()
    {
        var seenIds = new HashSet<string>();
        for (var i = 0; i < 200; i++)
        {
            var challenge = _catalog.Prepare("sys-flow-01");
            var shown = Ids(challenge.ClientView["steps"]).ToList();
            var correct = ((JsonArray)_catalog.GetReveal("sys-flow-01", challenge.AnswerKey)["correctOrder"]!).Select(s => (string)s!).ToList();

            Assert.Equal(shown.Count, shown.Distinct().Count());
            Assert.Equal(shown.Order(), correct.Order());
            Assert.NotEqual(correct, shown);
            seenIds.UnionWith(shown);
        }
        // Ids are random per round, not reused
        Assert.True(seenIds.Count > 100);
    }

    [Fact]
    public void Each_prepared_view_is_an_independent_copy()
    {
        var first = _catalog.Prepare("api-logs-01");
        first.ClientView["title"] = "changed";
        ((JsonArray)first.ClientView["logs"]!).Clear();

        var second = _catalog.Prepare("api-logs-01");

        Assert.Equal("502 after a deploy", (string?)second.ClientView["title"]);
        Assert.NotEmpty((JsonArray)second.ClientView["logs"]!);
    }

    [Fact]
    public void Reveal_of_an_unknown_challenge_throws()
    {
        Assert.Throws<KeyNotFoundException>(() => _catalog.GetReveal("nope-concept-01", "{}"));
    }

    [Fact]
    public void Load_rejects_a_pack_with_an_unknown_category()
    {
        var directory = Directory.CreateTempSubdirectory().FullName;
        File.Copy(Path.Combine(TestCatalog.Directory, "databases.json"), Path.Combine(directory, "databases.json"));

        var error = Assert.Throws<InvalidOperationException>(() =>
            ChallengeCatalog.Load(directory, new Dictionary<string, int> { ["security"] = 3 }));
        Assert.Contains("databases", error.Message);
    }

    [Fact]
    public void Load_rejects_a_challenge_whose_answer_points_nowhere()
    {
        var directory = Directory.CreateTempSubdirectory().FullName;
        var pack = JsonNode.Parse(File.ReadAllText(Path.Combine(TestCatalog.Directory, "databases.json")))!;
        pack["challenges"]![0]!["correctOptionId"] = "z";
        File.WriteAllText(Path.Combine(directory, "databases.json"), pack.ToJsonString());

        var error = Assert.Throws<InvalidOperationException>(() => ChallengeCatalog.Load(directory, TestCatalog.CategoryIds));
        Assert.Contains("db-concept-01", error.Message);
    }

    private static JsonElement Answer(object value) => JsonSerializer.SerializeToElement(value);

    private static IEnumerable<string> Ids(JsonNode? items) => ((JsonArray)items!).Select(i => (string)i!["id"]!);

    private static string TextOf(JsonArray options, string id, string field) =>
        (string)options.Single(o => (string)o!["id"]! == id)![field]!;

    private static IEnumerable<string> PropertyNames(JsonNode? node) => node switch
    {
        JsonObject obj => obj.SelectMany(p => PropertyNames(p.Value).Prepend(p.Key)),
        JsonArray array => array.SelectMany(PropertyNames),
        _ => []
    };
}
