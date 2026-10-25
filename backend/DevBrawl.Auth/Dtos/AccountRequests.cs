using System.ComponentModel.DataAnnotations;
using DevBrawl.Auth.Domain;

namespace DevBrawl.Auth.Dtos;

// Same rules as SignupRequest

public sealed record ChangeNicknameRequest
{
    [Required, StringLength(30, MinimumLength = 3)]
    public string Nickname { get; init; } = string.Empty;
}

public sealed record ChangeEmailRequest
{
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string CurrentPassword { get; init; } = string.Empty;
}

public sealed record ChangeAvatarRequest
{
    // A missing value stays 0 and fails the range check. Whether the player may use it
    // (a starter avatar or one unlocked in the season pass) is checked in the controller.
    [Range(1, int.MaxValue)]
    public int AvatarId { get; init; }
}

public sealed record ChangeTagRequest
{
    // A starter tag (UserTags.All) or one unlocked in the season pass, or null to remove it; checked in the controller
    public string? Tag { get; init; }
}

public sealed record ChangePasswordRequest
{
    // Empty only for an account that signed up with Google and has no password yet; otherwise it must match
    public string CurrentPassword { get; init; } = string.Empty;

    // bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated
    [Required, StringLength(72, MinimumLength = 8)]
    public string NewPassword { get; init; } = string.Empty;
}
