using DevBrawl.Auth.Domain;
using DevBrawl.Interview.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class InterviewSessionConfiguration : IEntityTypeConfiguration<InterviewSession>
{
    public void Configure(EntityTypeBuilder<InterviewSession> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.CategoryId).HasMaxLength(50).IsRequired();
        builder.Property(s => s.LessonId).HasMaxLength(50);
        builder.Property(s => s.Title).HasMaxLength(200).IsRequired();
        builder.Property(s => s.Evaluation).HasColumnType("jsonb");

        builder.HasOne<User>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(s => s.Messages).WithOne().HasForeignKey(m => m.SessionId).OnDelete(DeleteBehavior.Cascade);

        // A user's interview history, newest first
        builder.HasIndex(s => new { s.UserId, s.CreatedAt });
    }
}
