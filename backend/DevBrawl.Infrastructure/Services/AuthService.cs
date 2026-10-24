using DevBrawl.Auth;
using DevBrawl.Auth.Domain;
using DevBrawl.Auth.Dtos;
using DevBrawl.Infrastructure.Repositories.Contracts;
using DevBrawl.Infrastructure.Services.Contracts;

namespace DevBrawl.Infrastructure.Services;

public class AuthService(
    IUserRepository users,
    IRefreshTokenRepository refreshTokens,
    IUnitOfWork unitOfWork,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    IPlayerStatsRepository playerStats) : IAuthService
{
    public async Task<AuthResult> SignupAsync(SignupRequest request, CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(request.Email);
        var nickname = request.Nickname.Trim();

        if (await users.EmailExistsAsync(email, cancellationToken))
            return AuthResult.Fail(AuthError.EmailTaken);
        if (await users.NicknameExistsAsync(nickname, cancellationToken))
            return AuthResult.Fail(AuthError.NicknameTaken);

        var user = new User
        {
            Id = Guid.CreateVersion7(),
            Nickname = nickname,
            Email = email,
            PasswordHash = passwordHasher.Hash(request.Password),
            CreatedAt = DateTime.UtcNow
        };
        users.Add(user);
        // 1000 in every category and 0 XP, saved together with the user
        await playerStats.AddStartingStatsAsync(user.Id, cancellationToken);

        var (response, _) = IssueTokens(user);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return AuthResult.Ok(response);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByEmailAsync(NormalizeEmail(request.Email), cancellationToken);
        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            return AuthResult.Fail(AuthError.InvalidCredentials);

        var (response, _) = IssueTokens(user);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return AuthResult.Ok(response);
    }

    public async Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var stored = await refreshTokens.GetByTokenHashAsync(tokenService.HashRefreshToken(refreshToken), cancellationToken);
        if (stored is null)
            return AuthResult.Fail(AuthError.InvalidRefreshToken);

        if (stored.RevokedAt is not null)
        {
            // A revoked token coming back means it was likely stolen, so log the user out everywhere
            await refreshTokens.RevokeAllForUserAsync(stored.UserId, now, cancellationToken);
            return AuthResult.Fail(AuthError.InvalidRefreshToken);
        }

        if (!stored.IsActive(now))
            return AuthResult.Fail(AuthError.InvalidRefreshToken);

        var (response, replacement) = IssueTokens(stored.User);
        stored.RevokedAt = now;
        stored.ReplacedByTokenId = replacement.Id;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return AuthResult.Ok(response);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var stored = await refreshTokens.GetByTokenHashAsync(tokenService.HashRefreshToken(refreshToken), cancellationToken);
        if (stored is null || stored.RevokedAt is not null)
            return;

        stored.RevokedAt = DateTime.UtcNow;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserResponse?> GetUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(userId, cancellationToken);
        return user is null ? null : UserResponse.From(user);
    }

    public async Task<AuthResult> ChangeNicknameAsync(Guid userId, ChangeNicknameRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(userId, cancellationToken);
        if (user is null)
            return AuthResult.Fail(AuthError.UserNotFound);

        var nickname = request.Nickname.Trim();
        if (nickname != user.Nickname)
        {
            if (await users.NicknameExistsAsync(nickname, cancellationToken))
                return AuthResult.Fail(AuthError.NicknameTaken);
            user.Nickname = nickname;
        }

        var (response, _) = IssueTokens(user);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return AuthResult.Ok(response);
    }

    public async Task<AuthResult> ChangeEmailAsync(Guid userId, ChangeEmailRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(userId, cancellationToken);
        if (user is null)
            return AuthResult.Fail(AuthError.UserNotFound);
        if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            return AuthResult.Fail(AuthError.WrongPassword);

        var email = NormalizeEmail(request.Email);
        if (email != user.Email)
        {
            if (await users.EmailExistsAsync(email, cancellationToken))
                return AuthResult.Fail(AuthError.EmailTaken);
            user.Email = email;
        }

        var (response, _) = IssueTokens(user);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return AuthResult.Ok(response);
    }

    public async Task<AuthResult> ChangePasswordAsync(Guid userId, ChangePasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(userId, cancellationToken);
        if (user is null)
            return AuthResult.Fail(AuthError.UserNotFound);
        if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            return AuthResult.Fail(AuthError.WrongPassword);

        user.PasswordHash = passwordHasher.Hash(request.NewPassword);
        // Sessions on other devices were opened with the old password; this device gets the new pair below
        await refreshTokens.RevokeAllForUserAsync(user.Id, DateTime.UtcNow, cancellationToken);

        var (response, _) = IssueTokens(user);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return AuthResult.Ok(response);
    }

    // Stages a new refresh token; the caller saves it
    private (AuthResponse Response, RefreshToken Stored) IssueTokens(User user)
    {
        var accessToken = tokenService.CreateAccessToken(user);
        var refreshToken = tokenService.CreateRefreshToken();

        var stored = new RefreshToken
        {
            Id = Guid.CreateVersion7(),
            UserId = user.Id,
            TokenHash = refreshToken.Hash,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = refreshToken.ExpiresAt
        };
        refreshTokens.Add(stored);

        var response = new AuthResponse(
            accessToken.Token,
            accessToken.ExpiresAt,
            refreshToken.Token,
            refreshToken.ExpiresAt,
            UserResponse.From(user));
        return (response, stored);
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
