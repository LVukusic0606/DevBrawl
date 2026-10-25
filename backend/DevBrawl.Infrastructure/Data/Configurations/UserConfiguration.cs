using DevBrawl.Auth.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Nickname).HasMaxLength(30).IsRequired();
        builder.Property(u => u.Email).HasMaxLength(254).IsRequired();
        builder.Property(u => u.PasswordHash).HasMaxLength(100).IsRequired();
        builder.Property(u => u.GoogleSubject).HasMaxLength(255);

        builder.HasIndex(u => u.Email).IsUnique();
        builder.HasIndex(u => u.Nickname).IsUnique();
        // One DevBrawl account per Google account; NULLs (no Google) don't collide in PostgreSQL
        builder.HasIndex(u => u.GoogleSubject).IsUnique();
    }
}
