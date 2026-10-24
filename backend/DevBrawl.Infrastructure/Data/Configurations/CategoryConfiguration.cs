using DevBrawl.Common.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.HasKey(c => c.Id);
        // Ids come from the seed data below, not from the database
        builder.Property(c => c.Id).ValueGeneratedNever();

        builder.Property(c => c.Slug).HasMaxLength(50).IsRequired();
        builder.Property(c => c.Name).HasMaxLength(100).IsRequired();
        builder.Property(c => c.Description).HasMaxLength(500).IsRequired();

        builder.HasIndex(c => c.Slug).IsUnique();

        builder.HasData(
            new Category
            {
                Id = 1, Slug = "apis-networking", Name = "APIs & Networking", SortOrder = 1,
                Description = "How clients and servers talk: HTTP, REST, status codes, headers, caching and network failures."
            },
            new Category
            {
                Id = 2, Slug = "databases", Name = "Databases", SortOrder = 2,
                Description = "Storing and querying data: relational models, joins, indexes, transactions and query performance."
            },
            new Category
            {
                Id = 3, Slug = "security", Name = "Security", SortOrder = 3,
                Description = "Protecting systems and users: authentication, authorization, tokens and common vulnerabilities."
            },
            new Category
            {
                Id = 4, Slug = "debugging", Name = "Debugging", SortOrder = 4,
                Description = "Finding out why things break: reading logs, tracing requests and separating symptoms from root causes."
            },
            new Category
            {
                Id = 5, Slug = "system-design", Name = "System Design", SortOrder = 5,
                Description = "Designing systems that scale: trade-offs, caching, queues, load balancing and reliability."
            },
            new Category
            {
                Id = 6, Slug = "infrastructure", Name = "Infrastructure", SortOrder = 6,
                Description = "Where software runs: servers, containers, deployments, configuration and monitoring."
            });
    }
}
