using DevBrawl.Auth;
using DevBrawl.Auth.Dtos;

namespace DevBrawl.Infrastructure.Services.Contracts;

public interface IAuthService
{
    Task<AuthResult> SignupAsync(SignupRequest request, CancellationToken cancellationToken = default);
    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    // Rotates the refresh token: the old one is revoked and a new pair is issued
    Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);
    Task LogoutAsync(string refreshToken, CancellationToken cancellationToken = default);
    Task<UserResponse?> GetUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
