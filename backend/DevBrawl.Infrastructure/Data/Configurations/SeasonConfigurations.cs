using DevBrawl.Auth.Domain;
using DevBrawl.Common.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class UserRewardConfiguration : IEntityTypeConfiguration<UserReward>
{
    public void Configure(EntityTypeBuilder<UserReward> builder)
    {
        // Owning the same cosmetic twice is impossible
        builder.HasKey(r => new { r.UserId, r.Kind, r.Key });

        builder.Property(r => r.Key).HasMaxLength(UserTags.MaxLength).IsRequired();
        builder.Property(r => r.Season).HasMaxLength(7).IsRequired();

        builder.HasOne<User>().WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class SubscriptionConfiguration : IEntityTypeConfiguration<Subscription>
{
    public void Configure(EntityTypeBuilder<Subscription> builder)
    {
        builder.HasKey(s => s.UserId);
        builder.HasOne<User>().WithOne().HasForeignKey<Subscription>(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ContactRequestConfiguration : IEntityTypeConfiguration<ContactRequest>
{
    public void Configure(EntityTypeBuilder<ContactRequest> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name).HasMaxLength(100).IsRequired();
        builder.Property(c => c.Institution).HasMaxLength(200).IsRequired();
        builder.Property(c => c.Email).HasMaxLength(254).IsRequired();
        builder.Property(c => c.Message).HasMaxLength(2000).IsRequired();

        builder.HasOne<User>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.SetNull);
    }
}
