using System.ComponentModel.DataAnnotations;

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

public sealed record ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; init; } = string.Empty;

    // bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated
    [Required, StringLength(72, MinimumLength = 8)]
    public string NewPassword { get; init; } = string.Empty;
}
