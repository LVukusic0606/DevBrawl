namespace DevBrawl.Auth.Domain;

public class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // SHA-256 of the token sent to the client, so a leaked database can't be used to log in
    public string TokenHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    // Set when the token is rotated on refresh; lets reuse of an old token be detected
    public Guid? ReplacedByTokenId { get; set; }

    public bool IsActive(DateTime now) => RevokedAt is null && ExpiresAt > now;
}
