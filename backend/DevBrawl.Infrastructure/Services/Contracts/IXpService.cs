namespace DevBrawl.Infrastructure.Services.Contracts;

// TotalXp and Level are the values after this award
public sealed record XpAward(bool Awarded, int TotalXp, int Level);

public interface IXpService
{
    // Stages a ledger entry and the new total; does NOT call SaveChanges, the caller saves both together.
    // Awarding the same (source, sourceId) to a user again changes nothing and returns Awarded = false,
    // e.g. AwardAsync(userId, XpSources.Quiz, lessonId, 30) on every quiz completion only pays out once.
    Task<XpAward> AwardAsync(Guid userId, string source, string sourceId, int amount, CancellationToken cancellationToken = default);
}
