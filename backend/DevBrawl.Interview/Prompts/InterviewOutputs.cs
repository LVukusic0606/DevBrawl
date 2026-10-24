using DevBrawl.Interview.Domain;

namespace DevBrawl.Interview.Prompts;

// The JSON the interviewer asks the model for, and its conversion into the interviewer's results
internal sealed record QuestionOutput(string Question, List<string> KeyPoints, string ModelAnswer);

internal sealed record ReviewOutput(string Verdict, int Score, string Feedback, List<string> Strengths, List<string> Improvements);

internal static class InterviewOutputs
{
    public static GeneratedQuestion ToQuestion(QuestionOutput output, string provider)
    {
        if (string.IsNullOrWhiteSpace(output.Question) || output.KeyPoints is not { Count: > 0 })
            throw new InterviewerUnavailableException($"{provider} returned an empty question");
        return new GeneratedQuestion(output.Question.Trim(), output.KeyPoints, output.ModelAnswer?.Trim() ?? string.Empty);
    }

    public static AnswerReview ToReview(ReviewOutput output, string provider)
    {
        var verdict = output.Verdict switch
        {
            "correct" => AnswerVerdict.Correct,
            "partiallyCorrect" => AnswerVerdict.PartiallyCorrect,
            "incorrect" => AnswerVerdict.Incorrect,
            _ => throw new InterviewerUnavailableException($"{provider} returned an unknown verdict '{output.Verdict}'")
        };
        return new AnswerReview(verdict, Math.Clamp(output.Score, 0, 100), output.Feedback?.Trim() ?? string.Empty,
            output.Strengths ?? [], output.Improvements ?? []);
    }
}
