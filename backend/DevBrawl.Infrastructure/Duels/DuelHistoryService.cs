using System.Text.Json;
using System.Text.Json.Nodes;
using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Dtos;
using DevBrawl.Duel.Engine;
using DevBrawl.Duel.Engine.Domain;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Duels;

public class DuelHistoryService(AppDbContext db) : IDuelHistoryService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<List<DuelSummaryResponse>> GetForUserAsync(Guid userId, int limit, CancellationToken cancellationToken = default)
    {
        var duels = await db.Duels.AsNoTracking()
            .Where(d => d.Player1Id == userId || d.Player2Id == userId)
            .OrderByDescending(d => d.StartedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);

        var nicknames = await NicknamesAsync(duels.Select(d => OpponentId(d, userId)), cancellationToken);
        return duels.Select(d => Summary(d, userId, nicknames)).ToList();
    }

    public async Task<DuelDetailsResponse?> GetDetailsAsync(Guid userId, Guid duelId, CancellationToken cancellationToken = default)
    {
        var duel = await db.Duels.AsNoTracking()
            .Include(d => d.Rounds)
            .SingleOrDefaultAsync(d => d.Id == duelId && (d.Player1Id == userId || d.Player2Id == userId), cancellationToken);
        if (duel is null)
            return null;

        var isPlayer1 = duel.Player1Id == userId;
        var nicknames = await NicknamesAsync([OpponentId(duel, userId)], cancellationToken);
        var rewardsJson = isPlayer1 ? duel.Player1Rewards : duel.Player2Rewards;

        var rounds = duel.Rounds
            .Where(r => r.EndedAt is not null)
            .OrderBy(r => r.RoundNumber)
            .Select(r => new DuelRoundReviewResponse(
                r.RoundNumber,
                r.Type,
                r.CategoryId,
                JsonNode.Parse(r.ClientView)!,
                ParseOrNull(isPlayer1 ? r.Player1Answer : r.Player2Answer),
                isPlayer1 ? r.Player1Correct : r.Player2Correct,
                (isPlayer1 ? r.Player2AnsweredAt : r.Player1AnsweredAt) is not null,
                isPlayer1 ? r.Player2Correct : r.Player1Correct,
                RoundRules.ForPlayer(r.Result ?? RoundResult.NoWinner, isPlayer1),
                JsonNode.Parse(r.Reveal!)!))
            .ToList();

        return new DuelDetailsResponse(
            Summary(duel, userId, nicknames),
            rewardsJson is null ? null : JsonSerializer.Deserialize<PlayerRewards>(rewardsJson, JsonOptions),
            rounds);
    }

    private async Task<Dictionary<Guid, string>> NicknamesAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken)
    {
        var ids = userIds.Distinct().ToList();
        return await db.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Nickname, cancellationToken);
    }

    private static DuelSummaryResponse Summary(DuelMatch duel, Guid userId, Dictionary<Guid, string> nicknames)
    {
        var isPlayer1 = duel.Player1Id == userId;
        var opponentId = OpponentId(duel, userId);
        var yourScore = isPlayer1 ? duel.Player1Score : duel.Player2Score;
        var opponentScore = isPlayer1 ? duel.Player2Score : duel.Player1Score;

        return new DuelSummaryResponse(
            duel.Id,
            duel.Status,
            duel.IsFriendly,
            new DuelOpponentResponse(opponentId, nicknames.GetValueOrDefault(opponentId, "Unknown player")),
            duel.Status == DuelStatus.Finished ? RoundRules.ForPlayer(yourScore, opponentScore) : null,
            yourScore,
            opponentScore,
            duel.StartedAt,
            duel.FinishedAt);
    }

    private static Guid OpponentId(DuelMatch duel, Guid userId) => duel.Player1Id == userId ? duel.Player2Id : duel.Player1Id;

    private static JsonNode? ParseOrNull(string? json) => json is null ? null : JsonNode.Parse(json);
}
