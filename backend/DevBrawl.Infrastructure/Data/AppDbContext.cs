using DevBrawl.Auth.Domain;
using DevBrawl.Common.Domain;
using DevBrawl.Duel.Engine.Domain;
using DevBrawl.Duel.Scoring.Domain;
using DevBrawl.Interview.Domain;
using DevBrawl.Infrastructure.Repositories.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<DuelMatch> Duels => Set<DuelMatch>();
    public DbSet<DuelRound> DuelRounds => Set<DuelRound>();
    public DbSet<CategoryRating> CategoryRatings => Set<CategoryRating>();
    public DbSet<RatingHistoryEntry> RatingChanges => Set<RatingHistoryEntry>();
    public DbSet<XpEvent> XpEvents => Set<XpEvent>();
    public DbSet<PlayerProgress> PlayerProgress => Set<PlayerProgress>();
    public DbSet<InterviewQuestion> InterviewQuestions => Set<InterviewQuestion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
