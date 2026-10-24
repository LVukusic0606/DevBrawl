using DevBrawl.Common.Dtos;
using DevBrawl.Infrastructure.Repositories.Contracts;
using DevBrawl.Infrastructure.Services.Contracts;

namespace DevBrawl.Infrastructure.Services;

public class CategoryService(ICategoryRepository categories) : ICategoryService
{
    public async Task<List<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken = default) =>
        (await categories.GetAllAsync(cancellationToken)).Select(CategoryResponse.From).ToList();

    public async Task<CategoryResponse?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var category = await categories.GetBySlugAsync(slug.ToLowerInvariant(), cancellationToken);
        return category is null ? null : CategoryResponse.From(category);
    }
}
