using DevBrawl.Infrastructure.Store;

namespace DevBrawl.Infrastructure.Services.Contracts;

public interface ISeasonService
{
    // The current month's season pass for this player
    Task<SeasonResponse> GetAsync(Guid userId, CancellationToken cancellationToken = default);

    // Adds every reward the player has reached this month and doesn't own yet, without saving (no SaveChanges):
    // XpService calls it right after staging XP, so the XP and its rewards are saved together.
    Task GrantUnlockedAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<OwnedCosmeticsResponse> GetOwnedAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> CanUseAvatarAsync(Guid userId, int avatarId, CancellationToken cancellationToken = default);
    Task<bool> CanUseTagAsync(Guid userId, string tag, CancellationToken cancellationToken = default);
}

public interface IPremiumService
{
    Task<PremiumResponse> GetAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<PremiumResponse> ActivateAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<InterviewAllowanceResponse> GetInterviewAllowanceAsync(Guid userId, CancellationToken cancellationToken = default);
}
