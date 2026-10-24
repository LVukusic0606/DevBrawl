using DevBrawl.Auth.Dtos;

namespace DevBrawl.Auth;

public enum AuthError
{
    EmailTaken,
    NicknameTaken,
    InvalidCredentials,
    InvalidRefreshToken,
    // Account changes: the current password didn't match
    WrongPassword,
    UserNotFound
}

public sealed record AuthResult(AuthResponse? Response, AuthError? Error)
{
    public static AuthResult Ok(AuthResponse response) => new(response, null);
    public static AuthResult Fail(AuthError error) => new(null, error);
}
