using DevBrawl.Common.Domain;
using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Scoring;
using DevBrawl.Duel.Scoring.Domain;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Duels;

// Scoped: DuelStore.FinalizeAsync calls it with the same DbContext and saves the duel and these changes together
public sealed class DuelScoring(AppDbContext db, IXpService xp) : IDuelScoring
{
    // Spec section 10
    private const int FinishXp = 50;
    private const int CorrectAnswerXp = 10;
    private const int WinBonusXp = 50;

    public async Task<IReadOnlyDictionary<int, int>> GetRatingsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var stored = await db.CategoryRatings
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .ToDictionaryAsync(r => r.CategoryId, r => r.Rating, cancellationToken);
        var categoryIds = await db.Categories
            .AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        return categoryIds.ToDictionary(id => id, id => stored.GetValueOrDefault(id, EloCalculator.StartingRating));
    }

    public async Task<DuelRewards> ApplyDuelResultAsync(DuelOutcome outcome, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        // In round order, so RatingChanges list categories in the order they were played
        var categoryIds = outcome.Rounds.Select(r => r.CategoryId).Distinct().ToList();

        // Tracked, so the new ratings are saved with the duel. A player is in at most one duel at a time,
        // so these are still the ratings from the start of this duel.
        var rows = await db.CategoryRatings
            .Where(r => (r.UserId == outcome.Player1Id || r.UserId == outcome.Player2Id) && categoryIds.Contains(r.CategoryId))
            .ToListAsync(cancellationToken);

        var player1Start = categoryIds.ToDictionary(id => id, id => RowFor(rows, outcome.Player1Id, id, now).Rating);
        var player2Start = categoryIds.ToDictionary(id => id, id => RowFor(rows, outcome.Player2Id, id, now).Rating);
        var player1Deltas = EloCalculator.Player1Deltas(outcome.Rounds, player1Start, player2Start);

        var player1Changes = ApplyRatings(rows, outcome.Player1Id, outcome.DuelId, player1Start, id => player1Deltas[id], now);
        var player2Changes = ApplyRatings(rows, outcome.Player2Id, outcome.DuelId, player2Start, id => -player1Deltas[id], now);

        var player1 = await AwardXpAsync(outcome, outcome.Player1Id, r => r.Player1Correct, player1Changes, cancellationToken);
        var player2 = await AwardXpAsync(outcome, outcome.Player2Id, r => r.Player2Correct, player2Changes, cancellationToken);
        return new DuelRewards(player1, player2);
    }

    private List<RatingChange> ApplyRatings(List<CategoryRating> rows, Guid userId, Guid duelId,
        Dictionary<int, int> start, Func<int, int> delta, DateTime now)
    {
        var changes = new List<RatingChange>();
        foreach (var (categoryId, before) in start)
        {
            var after = before + delta(categoryId);
            changes.Add(new RatingChange(categoryId, before, after));
            if (after == before) continue;

            var row = RowFor(rows, userId, categoryId, now);
            row.Rating = after;
            row.UpdatedAt = now;
            db.RatingChanges.Add(new RatingHistoryEntry
            {
                Id = Guid.CreateVersion7(),
                UserId = userId,
                CategoryId = categoryId,
                DuelId = duelId,
                Before = before,
                After = after,
                CreatedAt = now
            });
        }
        return changes;
    }

    private async Task<PlayerRewards> AwardXpAsync(DuelOutcome outcome, Guid userId, Func<RoundOutcome, bool> answeredCorrectly,
        List<RatingChange> ratingChanges, CancellationToken cancellationToken)
    {
        var amount = FinishXp
            + CorrectAnswerXp * outcome.Rounds.Count(answeredCorrectly)
            + (outcome.WinnerId == userId ? WinBonusXp : 0);
        var award = await xp.AwardAsync(userId, XpSources.Duel, outcome.DuelId.ToString(), amount, cancellationToken);

        return new PlayerRewards(userId, ratingChanges, award.Awarded ? amount : 0, award.TotalXp, award.Level);
    }

    // Every user has a row per category from signup; a missing one starts at the default rating
    private CategoryRating RowFor(List<CategoryRating> rows, Guid userId, int categoryId, DateTime now)
    {
        var row = rows.Find(r => r.UserId == userId && r.CategoryId == categoryId);
        if (row is not null) return row;

        row = new CategoryRating { UserId = userId, CategoryId = categoryId, Rating = EloCalculator.StartingRating, UpdatedAt = now };
        db.CategoryRatings.Add(row);
        rows.Add(row);
        return row;
    }
}
