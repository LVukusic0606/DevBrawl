using DevBrawl.Auth.Dtos;

namespace DevBrawl.Auth;

public enum AuthError
{
    EmailTaken,
    NicknameTaken,
    InvalidCredentials,
    InvalidRefreshToken
}

public sealed record AuthResult(AuthResponse? Response, AuthError? Error)
{
    public static AuthResult Ok(AuthResponse response) => new(response, null);
    public static AuthResult Fail(AuthError error) => new(null, error);
}
