namespace DevBrawl.Auth.Domain;

public class User
{
    public Guid Id { get; set; }
    public string Nickname { get; set; } = string.Empty;
    // Stored lowercased so lookups and the unique index are case-insensitive
    public string Email { get; set; } = string.Empty;
    // bcrypt hash, never the plain password
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public List<RefreshToken> RefreshTokens { get; set; } = [];
}
