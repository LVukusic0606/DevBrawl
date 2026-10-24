using DevBrawl.Auth.Domain;
using DevBrawl.Common.Domain;
using DevBrawl.Duel.Scoring.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class CategoryRatingConfiguration : IEntityTypeConfiguration<CategoryRating>
{
    public void Configure(EntityTypeBuilder<CategoryRating> builder)
    {
        builder.HasKey(r => new { r.UserId, r.CategoryId });

        builder.HasOne<User>().WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Category>().WithMany().HasForeignKey(r => r.CategoryId).OnDelete(DeleteBehavior.Restrict);

        // Category leaderboards: top ratings within one category
        builder.HasIndex(r => new { r.CategoryId, r.Rating });
    }
}
