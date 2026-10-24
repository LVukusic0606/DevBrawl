using DevBrawl.Auth.Domain;
using DevBrawl.Duel.Engine.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class DuelMatchConfiguration : IEntityTypeConfiguration<DuelMatch>
{
    public void Configure(EntityTypeBuilder<DuelMatch> builder)
    {
        builder.ToTable("Duels");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.Player1Rewards).HasColumnType("jsonb");
        builder.Property(d => d.Player2Rewards).HasColumnType("jsonb");

        // Duels are history: deleting a user must not silently remove their opponent's matches
        builder.HasOne<User>().WithMany().HasForeignKey(d => d.Player1Id).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(d => d.Player2Id).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(d => d.WinnerId).OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(d => d.Rounds)
            .WithOne()
            .HasForeignKey(r => r.DuelId)
            .OnDelete(DeleteBehavior.Cascade);

        // Match history per player
        builder.HasIndex(d => new { d.Player1Id, d.StartedAt });
        builder.HasIndex(d => new { d.Player2Id, d.StartedAt });
    }
}
