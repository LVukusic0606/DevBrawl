using DevBrawl.Auth.Domain;
using DevBrawl.Common.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class XpEventConfiguration : IEntityTypeConfiguration<XpEvent>
{
    public void Configure(EntityTypeBuilder<XpEvent> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Source).HasMaxLength(20).IsRequired();
        builder.Property(e => e.SourceId).HasMaxLength(100).IsRequired();

        builder.HasOne<User>().WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);

        // The same thing can never award XP twice (refreshes, retries, repeated submissions)
        builder.HasIndex(e => new { e.UserId, e.Source, e.SourceId }).IsUnique();
    }
}
