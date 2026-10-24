namespace DevBrawl.Interview.Prompts;

// The JSON the interviewer asks the model for, and its conversion into the interviewer's results
internal sealed record ReplyOutput(string Message, bool Done);

internal sealed record EvaluationOutput(int Score, string Summary, List<string> Strengths, List<string> Improvements);

internal sealed record TranscriptOutput(string Transcript);

internal static class InterviewOutputs
{
    public static InterviewerReply ToReply(ReplyOutput output, string provider)
    {
        if (string.IsNullOrWhiteSpace(output.Message))
            throw new InterviewerUnavailableException($"{provider} returned an empty message");
        return new InterviewerReply(output.Message.Trim(), output.Done);
    }

    public static InterviewEvaluation ToEvaluation(EvaluationOutput output, string provider)
    {
        if (string.IsNullOrWhiteSpace(output.Summary))
            throw new InterviewerUnavailableException($"{provider} returned an empty evaluation");
        return new InterviewEvaluation(Math.Clamp(output.Score, 0, 100), output.Summary.Trim(),
            output.Strengths ?? [], output.Improvements ?? []);
    }
}
