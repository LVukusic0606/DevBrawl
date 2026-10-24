using System.Text.Json.Nodes;
using DevBrawl.Duel.Contracts;

namespace DevBrawl.Duel.Content;

// Challenges from backend/Questions, loaded once and kept in memory. Thread-safe: the loaded
// content is never modified, and every prepared round gets its own copies of the nodes.
public sealed class ChallengeCatalog : IChallengeCatalog
{
    private const string SchemaFileName = "challenge.schema.json";
    // No 0/o or 1/l, so ids are easy to tell apart when debugging
    private const string StepIdAlphabet = "abcdefghijkmnpqrstuvwxyz23456789";

    private static readonly Dictionary<string, ChallengeType> TypesByName = new()
    {
        ["conceptQuiz"] = ChallengeType.ConceptQuiz,
        ["codeInvestigation"] = ChallengeType.CodeInvestigation,
        ["fixTheBug"] = ChallengeType.FixTheBug,
        ["followTheRequest"] = ChallengeType.FollowTheRequest,
        ["logAnalysis"] = ChallengeType.LogAnalysis
    };

    private sealed record Challenge(
        string Id, ChallengeType Type, string TypeName,
        int CategoryId, string CategorySlug, string CategoryName,
        JsonObject Source);

    private readonly Dictionary<string, Challenge> _byId;
    private readonly Dictionary<ChallengeType, Challenge[]> _byType;
    private readonly Random _random;

    private ChallengeCatalog(List<Challenge> challenges, Random random)
    {
        _byId = challenges.ToDictionary(c => c.Id);
        _byType = challenges.GroupBy(c => c.Type).ToDictionary(g => g.Key, g => g.ToArray());
        _random = random;
    }

    public int Count => _byId.Count;

    // Throws with the file and challenge id if the content is invalid, so broken content fails at startup
    public static ChallengeCatalog Load(string directory, IReadOnlyDictionary<string, int> categoryIdsBySlug, Random? random = null)
    {
        if (!Directory.Exists(directory))
            throw new DirectoryNotFoundException($"Challenge directory not found: {directory}");

        var challenges = new List<Challenge>();
        var files = Directory.EnumerateFiles(directory, "*.json")
            .Where(f => Path.GetFileName(f) != SchemaFileName)
            .Order();

        foreach (var file in files)
        {
            var where = Path.GetFileName(file);
            var pack = JsonNode.Parse(File.ReadAllText(file)) as JsonObject ?? throw Invalid(where, "not a JSON object");
            var category = pack["category"] as JsonObject ?? throw Invalid(where, "category is missing");
            var slug = RequiredString(category, "id", where);
            if (!categoryIdsBySlug.TryGetValue(slug, out var categoryId))
                throw Invalid(where, $"category '{slug}' doesn't exist in the Categories table");
            var categoryName = RequiredString(category, "name", where);

            foreach (var node in pack["challenges"] as JsonArray ?? throw Invalid(where, "challenges is missing"))
            {
                var source = node as JsonObject ?? throw Invalid(where, "challenge is not an object");
                var id = RequiredString(source, "id", where);
                var typeName = RequiredString(source, "type", $"{where} {id}");
                if (!TypesByName.TryGetValue(typeName, out var type))
                    throw Invalid($"{where} {id}", $"unknown type '{typeName}'");
                if (challenges.Any(c => c.Id == id))
                    throw Invalid($"{where} {id}", "duplicate id");

                Validate(source, type, $"{where} {id}");
                // Parsed nodes materialize lazily, which isn't safe when duels read them concurrently;
                // a deep clone is fully built up front and is only ever read afterwards
                challenges.Add(new Challenge(id, type, typeName, categoryId, slug, categoryName, (JsonObject)source.DeepClone()));
            }
        }

        var missing = Enum.GetValues<ChallengeType>().Where(t => challenges.All(c => c.Type != t)).ToList();
        if (missing.Count > 0)
            throw new InvalidOperationException($"No challenges of type {string.Join(", ", missing)} in {directory}");

        return new ChallengeCatalog(challenges, random ?? Random.Shared);
    }

    public PreparedChallenge GetRandom(ChallengeType type)
    {
        if (!_byType.TryGetValue(type, out var candidates))
            throw new ArgumentOutOfRangeException(nameof(type), type, "No challenges of this type");
        return Prepare(candidates[_random.Next(candidates.Length)]);
    }

    internal PreparedChallenge Prepare(string challengeId) => Prepare(Find(challengeId));

    internal IEnumerable<string> ChallengeIds => _byId.Keys;

    public JsonObject GetReveal(string challengeId, string answerKey)
    {
        var challenge = Find(challengeId);
        var key = AnswerKey.TryParse(answerKey) ?? throw new ArgumentException("Invalid answer key", nameof(answerKey));
        var source = challenge.Source;

        var reveal = new JsonObject { ["challengeId"] = challenge.Id };
        switch (challenge.Type)
        {
            case ChallengeType.ConceptQuiz:
            {
                var order = RequireOrder(key);
                var mistake = (JsonObject)source["commonMistake"]!;
                reveal["correctOptionId"] = key.CorrectOptionId;
                reveal["commonMistake"] = new JsonObject
                {
                    ["optionId"] = DisplayedId(order, (string)mistake["optionId"]!),
                    ["explanation"] = Clone(mistake["explanation"])
                };
                break;
            }
            case ChallengeType.FixTheBug:
            {
                var order = RequireOrder(key);
                var byOriginalId = Options(source).ToDictionary(o => (string)o["id"]!);
                reveal["correctOptionId"] = key.CorrectOptionId;
                reveal["outcomes"] = new JsonArray(order.Select((originalId, index) => (JsonNode)new JsonObject
                {
                    ["optionId"] = Label(index),
                    ["outcome"] = Clone(byOriginalId[originalId]["outcome"])
                }).ToArray());
                break;
            }
            case ChallengeType.CodeInvestigation:
                reveal["answer"] = Clone(source["answer"]);
                break;
            case ChallengeType.FollowTheRequest:
                reveal["correctOrder"] = new JsonArray((key.StepIds ?? throw InvalidKey()).Select(id => (JsonNode)JsonValue.Create(id)).ToArray());
                break;
            case ChallengeType.LogAnalysis:
                reveal["rootCauseLine"] = key.Line ?? throw InvalidKey();
                break;
        }
        reveal["explanation"] = Clone(source["explanation"]);
        return reveal;
    }

    private PreparedChallenge Prepare(Challenge challenge)
    {
        var source = challenge.Source;

        // Built from an allowlist, so fields added to the content later can't leak answers
        var view = new JsonObject
        {
            ["challengeId"] = challenge.Id,
            ["type"] = challenge.TypeName,
            ["category"] = new JsonObject
            {
                ["id"] = challenge.CategoryId,
                ["slug"] = challenge.CategorySlug,
                ["name"] = challenge.CategoryName
            },
            ["title"] = Clone(source["title"]),
            ["prompt"] = Clone(source["prompt"])
        };

        AnswerKey key;
        switch (challenge.Type)
        {
            case ChallengeType.ConceptQuiz:
            case ChallengeType.FixTheBug:
            {
                var options = Shuffle(Options(source).ToList());
                var order = options.Select(o => (string)o["id"]!).ToArray();
                view["options"] = new JsonArray(options.Select((option, index) =>
                {
                    var shown = new JsonObject { ["id"] = Label(index) };
                    // Fix the Bug options keep their code but not their outcome
                    var fields = challenge.Type == ChallengeType.ConceptQuiz ? new[] { "text" } : new[] { "summary", "code" };
                    foreach (var field in fields)
                        shown[field] = Clone(option[field]);
                    return (JsonNode)shown;
                }).ToArray());
                if (challenge.Type == ChallengeType.FixTheBug)
                    view["code"] = Clone(source["code"]);
                key = new AnswerKey
                {
                    CorrectOptionId = DisplayedId(order, (string)source["correctOptionId"]!),
                    OptionOrder = order
                };
                break;
            }
            case ChallengeType.CodeInvestigation:
                view["files"] = Clone(source["files"]);
                key = new AnswerKey { Path = (string)source["answer"]!["path"]! };
                break;
            case ChallengeType.FollowTheRequest:
            {
                var steps = ((JsonArray)source["steps"]!).Select(s => (string)s!).ToList();
                var ids = NewStepIds(steps.Count);
                var shuffled = Enumerable.Range(0, steps.Count).ToList();
                // Showing the steps already in the right order would give the answer away
                do Shuffle(shuffled); while (shuffled.SequenceEqual(Enumerable.Range(0, steps.Count)));
                view["steps"] = new JsonArray(shuffled.Select(i => (JsonNode)new JsonObject
                {
                    ["id"] = ids[i],
                    ["text"] = steps[i]
                }).ToArray());
                key = new AnswerKey { StepIds = ids };
                break;
            }
            case ChallengeType.LogAnalysis:
                view["logs"] = Clone(source["logs"]);
                key = new AnswerKey { Line = (int)source["rootCauseLine"]! };
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(challenge), challenge.Type, "Unknown challenge type");
        }

        return new PreparedChallenge(challenge.Id, challenge.CategoryId, challenge.Type, view, key.Serialize());
    }

    private Challenge Find(string challengeId) =>
        _byId.TryGetValue(challengeId, out var challenge)
            ? challenge
            : throw new KeyNotFoundException($"Unknown challenge '{challengeId}'");

    private List<T> Shuffle<T>(List<T> items)
    {
        for (var i = items.Count - 1; i > 0; i--)
        {
            var j = _random.Next(i + 1);
            (items[i], items[j]) = (items[j], items[i]);
        }
        return items;
    }

    // Random per round, so ids carry no information about the correct order
    private string[] NewStepIds(int count)
    {
        var ids = new HashSet<string>();
        while (ids.Count < count)
            ids.Add(string.Concat(Enumerable.Range(0, 4).Select(_ => StepIdAlphabet[_random.Next(StepIdAlphabet.Length)])));
        return [.. ids];
    }

    private static IEnumerable<JsonObject> Options(JsonObject source) =>
        ((JsonArray)source["options"]!).Select(o => (JsonObject)o!);

    private static string Label(int index) => ((char)('a' + index)).ToString();

    private static string DisplayedId(string[] order, string originalId) => Label(Array.IndexOf(order, originalId));

    private static string[] RequireOrder(AnswerKey key) =>
        key.OptionOrder is { Length: > 0 } && key.CorrectOptionId is not null ? key.OptionOrder : throw InvalidKey();

    // A JsonNode can only have one parent, so content nodes are copied into every view
    private static JsonNode? Clone(JsonNode? node) => node?.DeepClone();

    private static ArgumentException InvalidKey() => new("Answer key doesn't match the challenge type", "answerKey");

    private static void Validate(JsonObject source, ChallengeType type, string where)
    {
        RequiredString(source, "title", where);
        RequiredString(source, "prompt", where);
        RequiredString(source, "explanation", where);

        switch (type)
        {
            case ChallengeType.ConceptQuiz:
            case ChallengeType.FixTheBug:
            {
                var fields = type == ChallengeType.ConceptQuiz
                    ? new[] { "id", "text" }
                    : new[] { "id", "summary", "code", "outcome" };
                var ids = new List<string>();
                foreach (var node in source["options"] as JsonArray ?? throw Invalid(where, "options is missing"))
                {
                    var option = node as JsonObject ?? throw Invalid(where, "option is not an object");
                    foreach (var field in fields)
                        RequiredString(option, field, where);
                    ids.Add((string)option["id"]!);
                }
                if (ids.Count < 2 || ids.Count > 26 || ids.Distinct().Count() != ids.Count)
                    throw Invalid(where, "options need 2 to 26 unique ids");
                if (!ids.Contains(RequiredString(source, "correctOptionId", where)))
                    throw Invalid(where, "correctOptionId is not one of the options");
                if (type == ChallengeType.ConceptQuiz)
                {
                    var mistake = source["commonMistake"] as JsonObject ?? throw Invalid(where, "commonMistake is missing");
                    RequiredString(mistake, "explanation", where);
                    if (!ids.Contains(RequiredString(mistake, "optionId", where)))
                        throw Invalid(where, "commonMistake.optionId is not one of the options");
                }
                else if (source["code"] is not JsonObject)
                {
                    throw Invalid(where, "code is missing");
                }
                break;
            }
            case ChallengeType.CodeInvestigation:
            {
                var paths = (source["files"] as JsonArray ?? throw Invalid(where, "files is missing"))
                    .Select(f => RequiredString(f as JsonObject ?? throw Invalid(where, "file is not an object"), "path", where))
                    .ToList();
                var answer = source["answer"] as JsonObject ?? throw Invalid(where, "answer is missing");
                if (!paths.Contains(RequiredString(answer, "path", where)))
                    throw Invalid(where, "answer.path is not one of the files");
                break;
            }
            case ChallengeType.FollowTheRequest:
            {
                var steps = source["steps"] as JsonArray ?? throw Invalid(where, "steps is missing");
                if (steps.Count < 2 || steps.Any(s => s?.GetValueKind() != System.Text.Json.JsonValueKind.String))
                    throw Invalid(where, "steps needs at least 2 strings");
                break;
            }
            case ChallengeType.LogAnalysis:
            {
                var logs = source["logs"] as JsonArray ?? throw Invalid(where, "logs is missing");
                var line = source["rootCauseLine"] as JsonValue;
                if (line is null || !line.TryGetValue<int>(out var n) || n < 1 || n > logs.Count)
                    throw Invalid(where, "rootCauseLine must be a line number within logs");
                break;
            }
        }
    }

    private static string RequiredString(JsonObject obj, string name, string where) =>
        obj[name] is JsonValue value && value.TryGetValue<string>(out var text) && text.Length > 0
            ? text
            : throw Invalid(where, $"{name} is missing or not a string");

    private static InvalidOperationException Invalid(string where, string problem) =>
        new($"Invalid challenge content ({where}): {problem}");
}
