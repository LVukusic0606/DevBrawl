using DevBrawl.Common.Progression;
using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Dtos;
using DevBrawl.Duel.Engine;
using DevBrawl.Duel.Engine.Domain;
using DevBrawl.Duel.Scoring;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Profiles;

public class ProfileService(AppDbContext db, ILessonProgressService lessons, ILearningStreakService streaks,
    IFriendService friends) : IProfileService
{
    private const int RecentDuelCount = 10;

    public async Task<ProfileResponse?> GetAsync(Guid userId, Guid requesterId, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new ProfileUserResponse(u.Id, u.Nickname, u.CreatedAt, u.AvatarId, u.Tag))
            .SingleOrDefaultAsync(cancellationToken);
        if (user is null)
            return null;

        var categories = await db.Categories.AsNoTracking().OrderBy(c => c.SortOrder).ToListAsync(cancellationToken);
        var ratings = await RatingsAsync(userId, categories, cancellationToken);

        return new ProfileResponse(
            user,
            userId == requesterId,
            await ProgressAsync(userId, cancellationToken),
            Overall(ratings),
            ratings,
            ExtremeCategory(ratings, strongest: true),
            ExtremeCategory(ratings, strongest: false),
            await DuelStatsAsync(userId, cancellationToken),
            await AccuracyAsync(userId, categories.Select(c => c.Id).ToList(), cancellationToken),
            await RecentDuelsAsync(userId, cancellationToken),
            new ProfileLearningResponse(await lessons.GetCompletedAsync(userId, cancellationToken)),
            await streaks.GetAsync(userId, cancellationToken),
            userId == requesterId ? null : await friends.GetRelationAsync(requesterId, userId, cancellationToken));
    }

    private async Task<ProfileProgressResponse> ProgressAsync(Guid userId, CancellationToken cancellationToken)
    {
        var totalXp = await db.PlayerProgress.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.TotalXp)
            .SingleOrDefaultAsync(cancellationToken);
        var level = Levels.FromTotalXp(totalXp);
        return new ProfileProgressResponse(level, totalXp, Levels.TotalXpForLevel(level), Levels.TotalXpForLevel(level + 1));
    }

    private async Task<List<ProfileRatingResponse>> RatingsAsync(Guid userId, List<Common.Domain.Category> categories,
        CancellationToken cancellationToken)
    {
        var current = await db.CategoryRatings.AsNoTracking()
            .Where(r => r.UserId == userId)
            .ToDictionaryAsync(r => r.CategoryId, r => r.Rating, cancellationToken);
        var lastDeltas = await db.RatingChanges.AsNoTracking()
            .Where(c => c.UserId == userId)
            .GroupBy(c => c.CategoryId)
            .Select(g => g.OrderByDescending(c => c.CreatedAt).Select(c => new { c.CategoryId, Delta = c.After - c.Before }).First())
            .ToDictionaryAsync(x => x.CategoryId, x => x.Delta, cancellationToken);

        return categories.Select(category =>
        {
            var rating = current.GetValueOrDefault(category.Id, EloCalculator.StartingRating);
            return new ProfileRatingResponse(category.Id, category.Slug, category.Name, rating,
                RankTiers.FromRating(rating), lastDeltas.TryGetValue(category.Id, out var delta) ? delta : null);
        }).ToList();
    }

    private static ProfileOverallResponse Overall(List<ProfileRatingResponse> ratings)
    {
        var rating = OverallRating.FromCategories(
            ratings.Select(r => r.CategoryId),
            ratings.ToDictionary(r => r.CategoryId, r => r.Rating));
        return new ProfileOverallResponse(rating, RankTiers.FromRating(rating));
    }

    private static int? ExtremeCategory(List<ProfileRatingResponse> ratings, bool strongest)
    {
        if (ratings.Count == 0 || ratings.All(r => r.Rating == ratings[0].Rating))
            return null;
        var extreme = strongest ? ratings.MaxBy(r => r.Rating)! : ratings.MinBy(r => r.Rating)!;
        return extreme.CategoryId;
    }

    private async Task<ProfileDuelStatsResponse> DuelStatsAsync(Guid userId, CancellationToken cancellationToken)
    {
        // Ranked duels only: friendly duels with friends don't count toward the record
        var finished = db.Duels.AsNoTracking()
            .Where(d => d.Status == DuelStatus.Finished && !d.IsFriendly && (d.Player1Id == userId || d.Player2Id == userId));

        var played = await finished.CountAsync(cancellationToken);
        var wins = await finished.CountAsync(d => d.WinnerId == userId, cancellationToken);
        var draws = await finished.CountAsync(d => d.WinnerId == null, cancellationToken);
        return new ProfileDuelStatsResponse(played, wins, played - wins - draws, draws);
    }

    private async Task<ProfileAccuracyResponse> AccuracyAsync(Guid userId, List<int> categoryIds, CancellationToken cancellationToken)
    {
        var rounds = await (
                from round in db.DuelRounds.AsNoTracking()
                join duel in db.Duels.AsNoTracking() on round.DuelId equals duel.Id
                where duel.Status == DuelStatus.Finished && !duel.IsFriendly && (duel.Player1Id == userId || duel.Player2Id == userId)
                select new
                {
                    round.CategoryId,
                    round.Type,
                    Correct = duel.Player1Id == userId ? round.Player1Correct : round.Player2Correct
                })
            .ToListAsync(cancellationToken);

        return new ProfileAccuracyResponse(
            new AccuracyResponse(rounds.Count(r => r.Correct), rounds.Count),
            categoryIds.Select(id =>
            {
                var inCategory = rounds.Where(r => r.CategoryId == id).ToList();
                return new CategoryAccuracyResponse(id, inCategory.Count(r => r.Correct), inCategory.Count);
            }).ToList(),
            Enum.GetValues<ChallengeType>().Select(type =>
            {
                var ofType = rounds.Where(r => r.Type == type).ToList();
                return new TypeAccuracyResponse(type, ofType.Count(r => r.Correct), ofType.Count);
            }).ToList());
    }

    private async Task<List<ProfileDuelResponse>> RecentDuelsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var duels = await db.Duels.AsNoTracking()
            .Where(d => d.Status == DuelStatus.Finished && !d.IsFriendly && (d.Player1Id == userId || d.Player2Id == userId))
            .OrderByDescending(d => d.FinishedAt)
            .Take(RecentDuelCount)
            .ToListAsync(cancellationToken);

        var duelIds = duels.Select(d => d.Id).ToList();
        var deltas = await db.RatingChanges.AsNoTracking()
            .Where(c => c.UserId == userId && duelIds.Contains(c.DuelId))
            .GroupBy(c => c.DuelId)
            .Select(g => new { DuelId = g.Key, Delta = g.Sum(c => c.After - c.Before) })
            .ToDictionaryAsync(x => x.DuelId, x => x.Delta, cancellationToken);

        var opponentIds = duels.Select(d => d.Player1Id == userId ? d.Player2Id : d.Player1Id).Distinct().ToList();
        var nicknames = await db.Users.AsNoTracking()
            .Where(u => opponentIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Nickname, cancellationToken);

        return duels.Select(d =>
        {
            var isPlayer1 = d.Player1Id == userId;
            var opponentId = isPlayer1 ? d.Player2Id : d.Player1Id;
            var yourScore = isPlayer1 ? d.Player1Score : d.Player2Score;
            var opponentScore = isPlayer1 ? d.Player2Score : d.Player1Score;
            return new ProfileDuelResponse(
                d.Id,
                new DuelOpponentResponse(opponentId, nicknames.GetValueOrDefault(opponentId, "Unknown player")),
                RoundRules.ForPlayer(yourScore, opponentScore),
                yourScore,
                opponentScore,
                d.FinishedAt ?? d.StartedAt,
                deltas.GetValueOrDefault(d.Id));
        }).ToList();
    }
}
