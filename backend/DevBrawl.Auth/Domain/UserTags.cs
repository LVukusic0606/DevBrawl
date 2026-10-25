namespace DevBrawl.Auth.Domain;

// The preset tags a player can show next to their nickname. The frontend holds the labels and icons.
public static class UserTags
{
    public const int MaxLength = 20;

    public static readonly IReadOnlySet<string> All = new HashSet<string>
    {
        "learner",
        "builder",
        "bug-hunter",
        "architect",
        "mentor"
    };
}
