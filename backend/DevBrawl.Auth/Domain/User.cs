namespace DevBrawl.Auth.Domain;

public class User
{
    public Guid Id { get; set; }
    public string Nickname { get; set; } = string.Empty;
    // Stored lowercased so lookups and the unique index are case-insensitive
    public string Email { get; set; } = string.Empty;
    // bcrypt hash, never the plain password. Empty for accounts that only sign in with Google.
    public string PasswordHash { get; set; } = string.Empty;
    // Google's stable account id ("sub"), set once the account has signed in with Google
    public string? GoogleSubject { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<RefreshToken> RefreshTokens { get; set; } = [];
}
