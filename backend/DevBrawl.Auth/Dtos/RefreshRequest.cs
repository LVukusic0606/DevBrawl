using System.ComponentModel.DataAnnotations;

namespace DevBrawl.Auth.Dtos;

public sealed record RefreshRequest
{
    [Required]
    public string RefreshToken { get; init; } = string.Empty;
}
