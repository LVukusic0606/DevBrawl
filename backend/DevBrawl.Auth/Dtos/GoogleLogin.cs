using System.ComponentModel.DataAnnotations;

namespace DevBrawl.Auth.Dtos;

public sealed record GoogleLoginRequest
{
    // The ID token from Google's sign-in button
    [Required]
    public string IdToken { get; init; } = string.Empty;

    // Only for a new account: the nickname the player picked after the first try returned "nicknameRequired".
    // Same rules as SignupRequest.Nickname.
    [StringLength(30, MinimumLength = 3)]
    public string? Nickname { get; init; }
}

// Status "loggedIn" comes with Auth. Status "nicknameRequired" means a new account: ask for a nickname
// (SuggestedNickname is free to use) and send the same ID token again with it.
public sealed record GoogleLoginResponse(string Status, AuthResponse? Auth, string? Email, string? SuggestedNickname);

// Null ClientId means Google sign-in isn't set up, so the frontend hides the button
public sealed record GoogleConfigResponse(string? ClientId);
