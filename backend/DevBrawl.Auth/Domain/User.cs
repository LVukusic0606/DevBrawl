namespace DevBrawl.Auth.Domain;

public class User
{
    // Preset profile pictures every player can pick from: the 12 faces, their 10 recolors and a deep brown
    // skin tone (36, added after the season pass ids). Every other id is a season pass reward.
    public static readonly IReadOnlySet<int> StarterAvatarIds = new HashSet<int>([.. Enumerable.Range(1, 22), 36]);

    public Guid Id { get; set; }
    public string Nickname { get; set; } = string.Empty;
    // Stored lowercased so lookups and the unique index are case-insensitive
    public string Email { get; set; } = string.Empty;
    // bcrypt hash, never the plain password. Empty for accounts that only sign in with Google.
    public string PasswordHash { get; set; } = string.Empty;
    // Google's stable account id ("sub"), set once the account has signed in with Google
    public string? GoogleSubject { get; set; }
    public DateTime CreatedAt { get; set; }
    // A starter avatar or one unlocked in the season pass; null shows the first letter of the nickname
    public int? AvatarId { get; set; }
    // One of UserTags.All, shown next to the nickname; null when the player hasn't picked one
    public string? Tag { get; set; }

    public List<RefreshToken> RefreshTokens { get; set; } = [];
}
