using DevBrawl.Auth.Domain;
using DevBrawl.Interview.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class InterviewQuestionConfiguration : IEntityTypeConfiguration<InterviewQuestion>
{
    public void Configure(EntityTypeBuilder<InterviewQuestion> builder)
    {
        builder.HasKey(q => q.Id);

        builder.Property(q => q.CategoryId).HasMaxLength(50).IsRequired();
        builder.Property(q => q.LessonId).HasMaxLength(50).IsRequired();
        builder.Property(q => q.Question).IsRequired();
        builder.Property(q => q.ModelAnswer).IsRequired();
        builder.Property(q => q.Answer).HasMaxLength(2000);
        builder.Property(q => q.Review).HasColumnType("jsonb");

        builder.HasOne<User>().WithMany().HasForeignKey(q => q.UserId).OnDelete(DeleteBehavior.Cascade);

        // A user's previous questions about a lesson, so new ones don't repeat them
        builder.HasIndex(q => new { q.UserId, q.LessonId, q.CreatedAt });
    }
}
