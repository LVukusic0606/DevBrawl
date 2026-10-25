namespace DevBrawl.Auth.Domain;

public class User
{
    // Number of preset profile pictures the player can pick from
    public const int AvatarCount = 12;

    public Guid Id { get; set; }
    public string Nickname { get; set; } = string.Empty;
    // Stored lowercased so lookups and the unique index are case-insensitive
    public string Email { get; set; } = string.Empty;
    // bcrypt hash, never the plain password. Empty for accounts that only sign in with Google.
    public string PasswordHash { get; set; } = string.Empty;
    // Google's stable account id ("sub"), set once the account has signed in with Google
    public string? GoogleSubject { get; set; }
    public DateTime CreatedAt { get; set; }
    // One of the preset profile pictures (1 to AvatarCount); null shows the first letter of the nickname
    public int? AvatarId { get; set; }
    // One of UserTags.All, shown next to the nickname; null when the player hasn't picked one
    public string? Tag { get; set; }

    public List<RefreshToken> RefreshTokens { get; set; } = [];
}
