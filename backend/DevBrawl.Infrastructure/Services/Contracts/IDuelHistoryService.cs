using DevBrawl.Duel.Dtos;

namespace DevBrawl.Infrastructure.Services.Contracts;

public interface IDuelHistoryService
{
    // Most recent first
    Task<List<DuelSummaryResponse>> GetForUserAsync(Guid userId, int limit, CancellationToken cancellationToken = default);

    // null if the duel doesn't exist or the user didn't play in it
    Task<DuelDetailsResponse?> GetDetailsAsync(Guid userId, Guid duelId, CancellationToken cancellationToken = default);
}
