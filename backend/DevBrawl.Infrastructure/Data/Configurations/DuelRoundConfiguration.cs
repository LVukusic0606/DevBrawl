using DevBrawl.Common.Domain;
using DevBrawl.Duel.Engine.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class DuelRoundConfiguration : IEntityTypeConfiguration<DuelRound>
{
    public void Configure(EntityTypeBuilder<DuelRound> builder)
    {
        builder.HasKey(r => new { r.DuelId, r.RoundNumber });

        builder.Property(r => r.ChallengeId).HasMaxLength(50).IsRequired();
        // Opaque to the engine (contract), so plain text even though the current content uses JSON
        builder.Property(r => r.AnswerKey).IsRequired();
        builder.Property(r => r.ClientView).HasColumnType("jsonb").IsRequired();
        builder.Property(r => r.Player1Answer).HasColumnType("jsonb");
        builder.Property(r => r.Player2Answer).HasColumnType("jsonb");
        builder.Property(r => r.Reveal).HasColumnType("jsonb");

        builder.HasOne<Category>().WithMany().HasForeignKey(r => r.CategoryId).OnDelete(DeleteBehavior.Restrict);
    }
}
