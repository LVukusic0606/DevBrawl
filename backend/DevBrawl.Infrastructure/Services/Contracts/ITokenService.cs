using DevBrawl.Auth.Domain;

namespace DevBrawl.Infrastructure.Services.Contracts;

public sealed record AccessToken(string Token, DateTime ExpiresAt);

// Token goes to the client, only Hash is stored
public sealed record NewRefreshToken(string Token, string Hash, DateTime ExpiresAt);

public interface ITokenService
{
    AccessToken CreateAccessToken(User user);
    NewRefreshToken CreateRefreshToken();
    string HashRefreshToken(string token);
}
