using DevBrawl.Auth.Domain;

namespace DevBrawl.Infrastructure.Repositories.Contracts;

public interface IRefreshTokenRepository
{
    // Includes the owning User
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
    void Add(RefreshToken token);
    // Runs immediately, without waiting for IUnitOfWork.SaveChangesAsync
    Task RevokeAllForUserAsync(Guid userId, DateTime revokedAt, CancellationToken cancellationToken = default);
}
