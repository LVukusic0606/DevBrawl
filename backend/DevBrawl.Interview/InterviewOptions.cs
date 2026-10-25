namespace DevBrawl.Interview;

public class InterviewOptions
{
    public const string SectionName = "Interview";

    // Answers per interview, follow-ups included; the interviewer wraps up after the last one
    public int MaxAnswers { get; set; } = 3;
    // Defaults to Knowledge/learn-content.json in the build output
    public string? KnowledgePath { get; set; }
}
