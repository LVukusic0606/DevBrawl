using DevBrawl.Common.Domain;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Repositories.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Repositories;

public class CategoryRepository(AppDbContext db) : ICategoryRepository
{
    public Task<List<Category>> GetAllAsync(CancellationToken cancellationToken = default) =>
        db.Categories.AsNoTracking().OrderBy(c => c.SortOrder).ToListAsync(cancellationToken);

    public Task<Category?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
        db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Slug == slug, cancellationToken);
}
