using DevBrawl.Auth;
using DevBrawl.Auth.Dtos;

namespace DevBrawl.Infrastructure.Services.Contracts;

public interface IAuthService
{
    Task<AuthResult> SignupAsync(SignupRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    // Rotates the refresh token: the old one is revoked and a new pair is issued
    Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);
    // Logs in with a Google ID token, linking or creating the account. A new account first returns "nicknameRequired".
    Task<GoogleLoginResult> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken = default);
    Task LogoutAsync(string refreshToken, CancellationToken cancellationToken = default);
    Task<UserResponse?> GetUserAsync(Guid userId, CancellationToken cancellationToken = default);

    // Account changes return a new token pair, because the access token carries the nickname and email
    Task<AuthResult> ChangeNicknameAsync(Guid userId, ChangeNicknameRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult> ChangeEmailAsync(Guid userId, ChangeEmailRequest request, CancellationToken cancellationToken = default);
    // Also logs the user out on every other device
    Task<AuthResult> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
    // The avatar is not in the token, so no new pair is needed; false when the user no longer exists
    Task<bool> ChangeAvatarAsync(Guid userId, ChangeAvatarRequest request, CancellationToken cancellationToken = default);
    // Like the avatar, the tag is not in the token; the caller checks the tag is one of UserTags.All
    Task<bool> ChangeTagAsync(Guid userId, string? tag, CancellationToken cancellationToken = default);
}
