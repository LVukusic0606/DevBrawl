using DevBrawl.Common.Domain;
using DevBrawl.Common.Season;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Store;

public class PremiumService(AppDbContext db, ISeasonService seasons) : IPremiumService
{
    public async Task<PremiumResponse> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var subscription = await db.Subscriptions.AsNoTracking().SingleOrDefaultAsync(s => s.UserId == userId, cancellationToken);
        return new PremiumResponse(
            subscription?.PremiumUntil > DateTime.UtcNow,
            subscription?.PremiumUntil,
            PremiumPlan.MonthlyPriceEur,
            PremiumPlan.FreeInterviewsPerMonth,
            PremiumPlan.PremiumInterviewsPerMonth,
            await GetInterviewAllowanceAsync(userId, cancellationToken));
    }

    // Demo checkout: no payment provider yet, so this grants one period directly.
    // A real payment provider would call this after a successful payment instead.
    public async Task<PremiumResponse> ActivateAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var subscription = await db.Subscriptions.FindAsync([userId], cancellationToken);
        if (subscription is null)
        {
            subscription = new Subscription { UserId = userId };
            db.Subscriptions.Add(subscription);
        }

        // Renewing early adds a period on top of the time that's left
        var from = subscription.PremiumUntil > now ? subscription.PremiumUntil : now;
        subscription.PremiumUntil = from + PremiumPlan.Period;
        subscription.UpdatedAt = now;

        // Premium rewards for stages already reached this month unlock right away
        await seasons.GrantUnlockedAsync(userId, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return await GetAsync(userId, cancellationToken);
    }

    public async Task<InterviewAllowanceResponse> GetInterviewAllowanceAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var start = SeasonCatalog.StartOf(now);
        var used = await db.InterviewSessions.AsNoTracking()
            .CountAsync(s => s.UserId == userId && s.CreatedAt >= start, cancellationToken);
        var premium = await db.Subscriptions.AsNoTracking()
            .AnyAsync(s => s.UserId == userId && s.PremiumUntil > now, cancellationToken);
        return new InterviewAllowanceResponse(used, premium ? PremiumPlan.PremiumInterviewsPerMonth : PremiumPlan.FreeInterviewsPerMonth);
    }
}
