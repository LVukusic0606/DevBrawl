using DevBrawl.Common.Dtos;

namespace DevBrawl.Infrastructure.Services.Contracts;

public interface ICategoryService
{
    Task<List<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<CategoryResponse?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
}
