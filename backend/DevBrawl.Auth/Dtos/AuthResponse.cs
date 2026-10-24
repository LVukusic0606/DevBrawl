namespace DevBrawl.Auth.Dtos;

public sealed record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken,
    DateTime RefreshTokenExpiresAt,
    UserResponse User);
