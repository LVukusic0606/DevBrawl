using DevBrawl.Auth.Domain;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Repositories.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Repositories;

public class RefreshTokenRepository(AppDbContext db) : IRefreshTokenRepository
{
    public Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
        db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

    public void Add(RefreshToken token) => db.RefreshTokens.Add(token);

    public Task RevokeAllForUserAsync(Guid userId, DateTime revokedAt, CancellationToken cancellationToken = default) =>
        db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, revokedAt), cancellationToken);
}
