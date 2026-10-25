using DevBrawl.Auth.Domain;
using DevBrawl.Common.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class LessonCompletionConfiguration : IEntityTypeConfiguration<LessonCompletion>
{
    public void Configure(EntityTypeBuilder<LessonCompletion> builder)
    {
        // A lesson counts once per player, however often its quiz is passed
        builder.HasKey(c => new { c.UserId, c.LessonId });

        builder.Property(c => c.LessonId).HasMaxLength(LessonCompletion.LessonIdMaxLength).IsRequired();

        builder.HasOne<User>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
