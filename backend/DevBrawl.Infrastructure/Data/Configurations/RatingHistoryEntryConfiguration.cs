using DevBrawl.Auth.Domain;
using DevBrawl.Common.Domain;
using DevBrawl.Duel.Engine.Domain;
using DevBrawl.Duel.Scoring.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class RatingHistoryEntryConfiguration : IEntityTypeConfiguration<RatingHistoryEntry>
{
    public void Configure(EntityTypeBuilder<RatingHistoryEntry> builder)
    {
        builder.ToTable("RatingChanges");
        builder.HasKey(r => r.Id);

        builder.HasOne<User>().WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Category>().WithMany().HasForeignKey(r => r.CategoryId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<DuelMatch>().WithMany().HasForeignKey(r => r.DuelId).OnDelete(DeleteBehavior.Cascade);

        // A duel changes each category at most once per player
        builder.HasIndex(r => new { r.DuelId, r.UserId, r.CategoryId }).IsUnique();
        // Dashboard: a user's most recent changes
        builder.HasIndex(r => new { r.UserId, r.CreatedAt });
    }
}
