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
    UserNotFound,
    // The Google ID token was missing, expired, or issued for another app
    InvalidGoogleToken,
    // Google:ClientId isn't set on the server
    GoogleNotConfigured
}

public sealed record AuthResult(AuthResponse? Response, AuthError? Error)
{
    public static AuthResult Ok(AuthResponse response) => new(response, null);
    public static AuthResult Fail(AuthError error) => new(null, error);
}

public sealed record GoogleLoginResult(GoogleLoginResponse? Response, AuthError? Error)
{
    public static GoogleLoginResult LoggedIn(AuthResponse auth) => new(new GoogleLoginResponse("loggedIn", auth, null, null), null);

    public static GoogleLoginResult NicknameRequired(string email, string suggestedNickname) =>
        new(new GoogleLoginResponse("nicknameRequired", null, email, suggestedNickname), null);

    public static GoogleLoginResult Fail(AuthError error) => new(null, error);
}
