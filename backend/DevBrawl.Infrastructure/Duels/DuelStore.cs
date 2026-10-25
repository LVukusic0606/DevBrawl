using System.Text.Json;
using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Engine;
using DevBrawl.Duel.Engine.Domain;
using DevBrawl.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DevBrawl.Infrastructure.Duels;

// Singleton used by the engine; every call gets its own scope and DbContext
public sealed class DuelStore(IServiceScopeFactory scopeFactory) : IDuelStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task AbandonInProgressAsync(CancellationToken cancellationToken = default)
    {
        using var scope = scopeFactory.CreateScope();
        await Db(scope).Duels
            .Where(d => d.Status == DuelStatus.InProgress)
            .ExecuteUpdateAsync(s => s
                .SetProperty(d => d.Status, DuelStatus.Abandoned)
                .SetProperty(d => d.FinishedAt, DateTime.UtcNow), cancellationToken);
    }

    public async Task<IReadOnlyDictionary<int, int>> GetRatingsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        using var scope = scopeFactory.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<IDuelScoring>().GetRatingsAsync(userId, cancellationToken);
    }

    public async Task<int?> GetAvatarIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        using var scope = scopeFactory.CreateScope();
        return await Db(scope).Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.AvatarId)
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task CreateDuelAsync(DuelMatch duel, CancellationToken cancellationToken = default)
    {
        using var scope = scopeFactory.CreateScope();
        var db = Db(scope);
        db.Duels.Add(duel);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task AddRoundAsync(DuelRound round, CancellationToken cancellationToken = default)
    {
        using var scope = scopeFactory.CreateScope();
        var db = Db(scope);
        db.DuelRounds.Add(round);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task CompleteRoundAsync(Guid duelId, int roundNumber, RoundAnswerRecord player1, RoundAnswerRecord player2,
        RoundResult result, string revealJson, DateTime endedAt, CancellationToken cancellationToken = default)
    {
        using var scope = scopeFactory.CreateScope();
        var db = Db(scope);
        var round = await db.DuelRounds.SingleAsync(r => r.DuelId == duelId && r.RoundNumber == roundNumber, cancellationToken);

        round.Player1Answer = player1.AnswerJson;
        round.Player1Correct = player1.Correct;
        round.Player1AnsweredAt = player1.AnsweredAt;
        round.Player2Answer = player2.AnswerJson;
        round.Player2Correct = player2.Correct;
        round.Player2AnsweredAt = player2.AnsweredAt;
        round.Result = result;
        round.Reveal = revealJson;
        round.EndedAt = endedAt;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<DuelRewards?> FinalizeAsync(DuelOutcome outcome, int player1Score, int player2Score, DateTime finishedAt,
        CancellationToken cancellationToken = default)
    {
        using var scope = scopeFactory.CreateScope();
        var db = Db(scope);
        var duel = await db.Duels.SingleOrDefaultAsync(d => d.Id == outcome.DuelId, cancellationToken);
        if (duel is null || duel.Status != DuelStatus.InProgress)
            return null;

        duel.Status = DuelStatus.Finished;
        duel.FinishedAt = finishedAt;
        duel.WinnerId = outcome.WinnerId;
        duel.Player1Score = player1Score;
        duel.Player2Score = player2Score;

        // Scoring uses the same DbContext (same scope) and only stages its changes,
        // so the duel status, ratings and XP are saved together or not at all
        var rewards = await scope.ServiceProvider.GetRequiredService<IDuelScoring>()
            .ApplyDuelResultAsync(outcome, cancellationToken);
        duel.Player1Rewards = JsonSerializer.Serialize(rewards.Player1, JsonOptions);
        duel.Player2Rewards = JsonSerializer.Serialize(rewards.Player2, JsonOptions);

        await db.SaveChangesAsync(cancellationToken);
        return rewards;
    }

    public async Task AbandonAsync(Guid duelId, CancellationToken cancellationToken = default)
    {
        using var scope = scopeFactory.CreateScope();
        await Db(scope).Duels
            .Where(d => d.Id == duelId && d.Status == DuelStatus.InProgress)
            .ExecuteUpdateAsync(s => s
                .SetProperty(d => d.Status, DuelStatus.Abandoned)
                .SetProperty(d => d.FinishedAt, DateTime.UtcNow), cancellationToken);
    }

    private static AppDbContext Db(IServiceScope scope) => scope.ServiceProvider.GetRequiredService<AppDbContext>();
}
