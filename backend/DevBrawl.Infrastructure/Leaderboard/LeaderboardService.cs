using DevBrawl.Common.Progression;
using DevBrawl.Duel.Engine.Domain;
using DevBrawl.Duel.Scoring;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Leaderboard;

// Computed in memory on every request: fine for a hackathon-sized player base,
// and it uses OverallRating so the numbers always match the profile
public class LeaderboardService(AppDbContext db) : ILeaderboardService
{
    public async Task<LeaderboardResponse> GetOverallAsync(Guid requesterId, int limit, CancellationToken cancellationToken = default)
    {
        var finished = await db.Duels.AsNoTracking()
            .Where(d => d.Status == DuelStatus.Finished)
            .Select(d => new { d.Player1Id, d.Player2Id, d.WinnerId })
            .ToListAsync(cancellationToken);

        // Only players who finished at least one duel are ranked
        var played = new Dictionary<Guid, (int Duels, int Wins)>();
        foreach (var duel in finished)
        {
            foreach (var player in new[] { duel.Player1Id, duel.Player2Id })
            {
                var (duels, wins) = played.GetValueOrDefault(player);
                played[player] = (duels + 1, wins + (duel.WinnerId == player ? 1 : 0));
            }
        }

        var userIds = played.Keys.ToList();
        var categoryIds = await db.Categories.AsNoTracking().Select(c => c.Id).ToListAsync(cancellationToken);
        var ratings = (await db.CategoryRatings.AsNoTracking()
                .Where(r => userIds.Contains(r.UserId))
                .Select(r => new { r.UserId, r.CategoryId, r.Rating })
                .ToListAsync(cancellationToken))
            .GroupBy(r => r.UserId)
            .ToDictionary(g => g.Key, g => (IReadOnlyDictionary<int, int>)g.ToDictionary(r => r.CategoryId, r => r.Rating));
        var users = await db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Nickname, u.AvatarId, u.Tag })
            .ToDictionaryAsync(u => u.Id, cancellationToken);
        var totalXp = await db.PlayerProgress.AsNoTracking()
            .Where(p => userIds.Contains(p.UserId))
            .ToDictionaryAsync(p => p.UserId, p => p.TotalXp, cancellationToken);

        var ranked = userIds
            .Where(users.ContainsKey)
            .Select(id => new
            {
                Id = id,
                users[id].Nickname,
                users[id].AvatarId,
                users[id].Tag,
                Rating = OverallRating.FromCategories(categoryIds, ratings.GetValueOrDefault(id, new Dictionary<int, int>())),
                Stats = played[id]
            })
            .OrderByDescending(p => p.Rating)
            .ThenBy(p => p.Nickname, StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Standard competition ranking: a tie shares the position and the next one skips
        var entries = new List<LeaderboardEntryResponse>(ranked.Count);
        for (var i = 0; i < ranked.Count; i++)
        {
            var player = ranked[i];
            var position = i > 0 && player.Rating == ranked[i - 1].Rating ? entries[i - 1].Position : i + 1;
            entries.Add(new LeaderboardEntryResponse(position, player.Id, player.Nickname, player.AvatarId, player.Tag, player.Rating,
                RankTiers.FromRating(player.Rating), player.Stats.Duels, player.Stats.Wins,
                Levels.FromTotalXp(totalXp.GetValueOrDefault(player.Id)), player.Id == requesterId));
        }

        var top = entries.Take(limit).ToList();
        var you = top.Any(e => e.IsYou) ? null : entries.FirstOrDefault(e => e.IsYou);
        return new LeaderboardResponse(entries.Count, top, you);
    }
}
