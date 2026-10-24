namespace DevBrawl.Infrastructure.Repositories.Contracts;

// Repositories only stage changes; call this once to commit them together
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
