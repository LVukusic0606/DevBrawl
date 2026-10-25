using System.Globalization;
using DevBrawl.Auth.Domain;
using DevBrawl.Common.Domain;
using DevBrawl.Common.Season;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Store;

public class SeasonService(AppDbContext db) : ISeasonService
{
    public async Task<SeasonResponse> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Safety net: anything reached but not yet granted (e.g. Premium that expired and came back) is granted here
        await GrantUnlockedAsync(userId, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var seasonXp = await SeasonXpAsync(userId, now, cancellationToken);
        var owned = await OwnedKeysAsync(userId, cancellationToken);

        return new SeasonResponse(
            SeasonCatalog.KeyFor(now),
            SeasonCatalog.StartOf(now).ToString("MMMM yyyy", CultureInfo.InvariantCulture),
            SeasonCatalog.StartOf(now),
            SeasonCatalog.EndOf(now),
            SeasonCatalog.Stages,
            SeasonCatalog.XpPerStage,
            seasonXp,
            SeasonCatalog.StageFor(seasonXp),
            await IsPremiumAsync(userId, now, cancellationToken),
            SeasonCatalog.Rewards
                .Select(r => new SeasonRewardResponse(r.Stage, r.Track, r.Kind, r.Key, owned.Contains((r.Kind, r.Key))))
                .ToList());
    }

    public async Task GrantUnlockedAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var stage = SeasonCatalog.StageFor(await SeasonXpAsync(userId, now, cancellationToken));
        if (stage == 0)
            return;

        var premium = await IsPremiumAsync(userId, now, cancellationToken);
        var owned = await OwnedKeysAsync(userId, cancellationToken);

        foreach (var reward in SeasonCatalog.Rewards)
        {
            if (reward.Stage > stage || (reward.Track == RewardTrack.Premium && !premium) || owned.Contains((reward.Kind, reward.Key)))
                continue;

            db.UserRewards.Add(new UserReward
            {
                UserId = userId,
                Kind = reward.Kind,
                Key = reward.Key,
                Season = SeasonCatalog.KeyFor(now),
                Stage = reward.Stage,
                Track = reward.Track,
                UnlockedAt = now
            });
            owned.Add((reward.Kind, reward.Key));
        }
    }

    public async Task<OwnedCosmeticsResponse> GetOwnedAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var owned = await OwnedKeysAsync(userId, cancellationToken);
        var avatarIds = User.StarterAvatarIds
            .Concat(owned.Where(o => o.Kind == RewardKind.Avatar).Select(o => int.Parse(o.Key, CultureInfo.InvariantCulture)))
            .Order()
            .ToList();
        var tags = UserTags.All.Concat(owned.Where(o => o.Kind == RewardKind.Tag).Select(o => o.Key)).ToList();
        return new OwnedCosmeticsResponse(avatarIds, tags);
    }

    public async Task<bool> CanUseAvatarAsync(Guid userId, int avatarId, CancellationToken cancellationToken = default) =>
        User.StarterAvatarIds.Contains(avatarId)
        || await db.UserRewards.AnyAsync(r => r.UserId == userId && r.Kind == RewardKind.Avatar
            && r.Key == avatarId.ToString(CultureInfo.InvariantCulture), cancellationToken);

    public async Task<bool> CanUseTagAsync(Guid userId, string tag, CancellationToken cancellationToken = default) =>
        UserTags.All.Contains(tag)
        || await db.UserRewards.AnyAsync(r => r.UserId == userId && r.Kind == RewardKind.Tag && r.Key == tag, cancellationToken);

    // Saved XP this month plus XP staged in this unit of work, so rewards unlock in the same save as the XP
    private async Task<int> SeasonXpAsync(Guid userId, DateTime now, CancellationToken cancellationToken)
    {
        var start = SeasonCatalog.StartOf(now);
        var saved = await db.XpEvents.AsNoTracking()
            .Where(e => e.UserId == userId && e.CreatedAt >= start)
            .SumAsync(e => e.Amount, cancellationToken);
        var staged = db.ChangeTracker.Entries<XpEvent>()
            .Where(e => e.State == EntityState.Added && e.Entity.UserId == userId && e.Entity.CreatedAt >= start)
            .Sum(e => e.Entity.Amount);
        return saved + staged;
    }

    // FindAsync also sees a subscription staged in this unit of work (Premium being activated right now)
    private async Task<bool> IsPremiumAsync(Guid userId, DateTime now, CancellationToken cancellationToken) =>
        (await db.Subscriptions.FindAsync([userId], cancellationToken))?.PremiumUntil > now;

    private async Task<HashSet<(RewardKind Kind, string Key)>> OwnedKeysAsync(Guid userId, CancellationToken cancellationToken)
    {
        var saved = await db.UserRewards.AsNoTracking()
            .Where(r => r.UserId == userId)
            .Select(r => new { r.Kind, r.Key })
            .ToListAsync(cancellationToken);
        var staged = db.ChangeTracker.Entries<UserReward>()
            .Where(e => e.State == EntityState.Added && e.Entity.UserId == userId)
            .Select(e => new { e.Entity.Kind, e.Entity.Key });
        return saved.Concat(staged).Select(r => (r.Kind, r.Key)).ToHashSet();
    }
}
