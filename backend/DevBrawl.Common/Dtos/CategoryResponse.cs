using DevBrawl.Common.Domain;

namespace DevBrawl.Common.Dtos;

public sealed record CategoryResponse(int Id, string Slug, string Name, string Description)
{
    public static CategoryResponse From(Category category) =>
        new(category.Id, category.Slug, category.Name, category.Description);
}
