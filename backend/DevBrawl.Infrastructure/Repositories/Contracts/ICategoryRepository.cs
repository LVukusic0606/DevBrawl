using DevBrawl.Common.Domain;

namespace DevBrawl.Infrastructure.Repositories.Contracts;

public interface ICategoryRepository
{
    // Ordered by SortOrder
    Task<List<Category>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Category?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
}
