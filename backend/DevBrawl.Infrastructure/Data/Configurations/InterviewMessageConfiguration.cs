using DevBrawl.Interview.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DevBrawl.Infrastructure.Data.Configurations;

public class InterviewMessageConfiguration : IEntityTypeConfiguration<InterviewMessage>
{
    public void Configure(EntityTypeBuilder<InterviewMessage> builder)
    {
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Content).HasMaxLength(4000).IsRequired();

        // Also stops two requests from adding a message at the same position
        builder.HasIndex(m => new { m.SessionId, m.Sequence }).IsUnique();
    }
}
