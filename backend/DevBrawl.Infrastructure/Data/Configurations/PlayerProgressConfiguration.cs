using DevBrawl.Auth.Domain;
using DevBrawl.Common.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class PlayerProgressConfiguration : IEntityTypeConfiguration<PlayerProgress>
{
    public void Configure(EntityTypeBuilder<PlayerProgress> builder)
    {
        builder.ToTable("PlayerProgress");
        builder.HasKey(p => p.UserId);

        builder.HasOne<User>().WithOne().HasForeignKey<PlayerProgress>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
