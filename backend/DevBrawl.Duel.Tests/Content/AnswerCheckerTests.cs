using System.Text.Json;
using DevBrawl.Duel.Content;
using DevBrawl.Duel.Contracts;

namespace DevBrawl.Duel.Tests.Content;

public class AnswerCheckerTests
{
    private readonly AnswerChecker _checker = new();

    private static readonly string OptionKey = new AnswerKey { CorrectOptionId = "b", OptionOrder = ["c", "a", "d", "b"] }.Serialize();
    private static readonly string PathKey = new AnswerKey { Path = "src/db.ts" }.Serialize();
    private static readonly string StepsKey = new AnswerKey { StepIds = ["k3pa", "a9xz", "x1mn"] }.Serialize();
    private static readonly string LineKey = new AnswerKey { Line = 3 }.Serialize();

    [Theory]
    [InlineData(ChallengeType.ConceptQuiz, """{ "optionId": "b" }""", true)]
    [InlineData(ChallengeType.ConceptQuiz, """{ "optionId": "a" }""", false)]
    [InlineData(ChallengeType.FixTheBug, """{ "optionId": "b" }""", true)]
    [InlineData(ChallengeType.ConceptQuiz, """{ "optionId": "B" }""", false)]
    [InlineData(ChallengeType.ConceptQuiz, """{ "optionId": 1 }""", false)]
    [InlineData(ChallengeType.ConceptQuiz, """{ "option": "b" }""", false)]
    public void Checks_option_answers(ChallengeType type, string answer, bool expected) =>
        Assert.Equal(expected, _checker.IsCorrect(type, OptionKey, Parse(answer)));

    [Theory]
    [InlineData("""{ "path": "src/db.ts" }""", true)]
    [InlineData("""{ "path": "src/DB.ts" }""", false)]
    [InlineData("""{ "path": "" }""", false)]
    [InlineData("""{ "path": null }""", false)]
    public void Checks_file_answers(string answer, bool expected) =>
        Assert.Equal(expected, _checker.IsCorrect(ChallengeType.CodeInvestigation, PathKey, Parse(answer)));

    [Theory]
    [InlineData("""{ "stepIds": ["k3pa", "a9xz", "x1mn"] }""", true)]
    [InlineData("""{ "stepIds": ["a9xz", "k3pa", "x1mn"] }""", false)]
    [InlineData("""{ "stepIds": ["k3pa", "a9xz"] }""", false)]
    [InlineData("""{ "stepIds": ["k3pa", "a9xz", "x1mn", "x1mn"] }""", false)]
    [InlineData("""{ "stepIds": [] }""", false)]
    [InlineData("""{ "stepIds": [1, 2, 3] }""", false)]
    [InlineData("""{ "stepIds": "k3pa,a9xz,x1mn" }""", false)]
    public void Checks_step_orders_all_or_nothing(string answer, bool expected) =>
        Assert.Equal(expected, _checker.IsCorrect(ChallengeType.FollowTheRequest, StepsKey, Parse(answer)));

    [Theory]
    [InlineData("""{ "line": 3 }""", true)]
    [InlineData("""{ "line": 2 }""", false)]
    [InlineData("""{ "line": "3" }""", false)]
    [InlineData("""{ "line": 3.5 }""", false)]
    [InlineData("""{ "line": 99999999999 }""", false)]
    public void Checks_log_line_answers(string answer, bool expected) =>
        Assert.Equal(expected, _checker.IsCorrect(ChallengeType.LogAnalysis, LineKey, Parse(answer)));

    [Theory]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("\"b\"")]
    [InlineData("{}")]
    public void Non_object_or_empty_answers_are_incorrect(string answer)
    {
        foreach (var type in Enum.GetValues<ChallengeType>())
            Assert.False(_checker.IsCorrect(type, OptionKey, Parse(answer)));
    }

    [Fact]
    public void Missing_answer_is_incorrect_and_does_not_throw()
    {
        foreach (var type in Enum.GetValues<ChallengeType>())
            Assert.False(_checker.IsCorrect(type, OptionKey, default));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("[1, 2]")]
    [InlineData("null")]
    public void Broken_answer_key_is_incorrect_and_does_not_throw(string answerKey)
    {
        foreach (var type in Enum.GetValues<ChallengeType>())
            Assert.False(_checker.IsCorrect(type, answerKey, Parse("""{ "optionId": "b", "path": "x", "stepIds": ["a"], "line": 1 }""")));
    }

    [Fact]
    public void Key_for_another_type_is_incorrect()
    {
        Assert.False(_checker.IsCorrect(ChallengeType.LogAnalysis, OptionKey, Parse("""{ "line": 3 }""")));
        Assert.False(_checker.IsCorrect(ChallengeType.ConceptQuiz, LineKey, Parse("""{ "optionId": "b" }""")));
    }

    private static JsonElement Parse(string json) => JsonDocument.Parse(json).RootElement.Clone();
}
