namespace DevBrawl.Auth;

public class GoogleOptions
{
    public const string SectionName = "Google";

    // OAuth client ID of type "Web application" from Google Cloud Console. Not a secret: it's also sent to the browser.
    public string? ClientId { get; set; }
}

// Who Google says signed in, after the ID token's signature and audience were checked
public sealed record GoogleIdentity(string Subject, string Email, bool EmailVerified, string? Name);
