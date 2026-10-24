namespace DevBrawl.Common.Domain;

// Shared by Learn (lessons belong to a category) and Duel (challenges and ratings are per category)
public class Category
{
    // Fixed ids from seed data, so they are the same on every machine
    public int Id { get; set; }
    // URL-friendly key, e.g. "apis-networking"
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
