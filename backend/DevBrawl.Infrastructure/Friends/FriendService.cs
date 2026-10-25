using DevBrawl.Common.Domain;
using DevBrawl.Duel.Scoring;
using DevBrawl.Infrastructure.Data;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.EntityFrameworkCore;

namespace DevBrawl.Infrastructure.Friends;

public class FriendService(AppDbContext db) : IFriendService
{
    public async Task<FriendsResponse> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var rows = await Involving(userId).AsNoTracking().ToListAsync(cancellationToken);
        var users = await UsersAsync(rows.Select(r => OtherId(r, userId)).ToList(), cancellationToken);

        var friends = rows
            .Where(r => r.Status == FriendshipStatus.Accepted && users.ContainsKey(OtherId(r, userId)))
            .Select(r => new FriendResponse(users[OtherId(r, userId)], r.AcceptedAt ?? r.CreatedAt))
            .OrderBy(f => f.User.Nickname, StringComparer.OrdinalIgnoreCase)
            .ToList();

        List<FriendRequestResponse> Requests(Func<Friendship, bool> direction) => rows
            .Where(r => r.Status == FriendshipStatus.Pending && direction(r) && users.ContainsKey(OtherId(r, userId)))
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new FriendRequestResponse(r.Id, users[OtherId(r, userId)], r.CreatedAt))
            .ToList();

        return new FriendsResponse(friends, Requests(r => r.AddresseeId == userId), Requests(r => r.RequesterId == userId));
    }

    public async Task<FriendError?> SendRequestAsync(Guid userId, string nickname, CancellationToken cancellationToken = default)
    {
        var wanted = nickname.Trim().ToLower();
        // Nicknames are unique as typed, so two can differ only in case; an exact match wins
        var candidates = await db.Users.AsNoTracking()
            .Where(u => u.Nickname.ToLower() == wanted)
            .Select(u => new { u.Id, u.Nickname })
            .ToListAsync(cancellationToken);
        var target = candidates.Find(u => u.Nickname == nickname.Trim()) ?? (candidates.Count == 1 ? candidates[0] : null);
        if (target is null)
            return FriendError.PlayerNotFound;
        if (target.Id == userId)
            return FriendError.Yourself;

        var existing = await Between(userId, target.Id).SingleOrDefaultAsync(cancellationToken);
        if (existing?.Status == FriendshipStatus.Accepted)
            return FriendError.AlreadyFriends;
        if (existing is not null && existing.RequesterId == userId)
            return FriendError.AlreadyRequested;

        var now = DateTime.UtcNow;
        if (existing is not null)
        {
            // They asked first: adding them back accepts
            existing.Status = FriendshipStatus.Accepted;
            existing.AcceptedAt = now;
        }
        else
        {
            db.Friendships.Add(new Friendship
            {
                Id = Guid.CreateVersion7(),
                RequesterId = userId,
                AddresseeId = target.Id,
                Status = FriendshipStatus.Pending,
                CreatedAt = now
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<FriendError?> AcceptRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default)
    {
        var request = await db.Friendships.SingleOrDefaultAsync(
            f => f.Id == requestId && f.AddresseeId == userId && f.Status == FriendshipStatus.Pending, cancellationToken);
        if (request is null)
            return FriendError.RequestNotFound;

        request.Status = FriendshipStatus.Accepted;
        request.AcceptedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<FriendError?> DeleteRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default)
    {
        var deleted = await Involving(userId)
            .Where(f => f.Id == requestId && f.Status == FriendshipStatus.Pending)
            .ExecuteDeleteAsync(cancellationToken);
        return deleted > 0 ? null : FriendError.RequestNotFound;
    }

    public async Task<FriendError?> RemoveFriendAsync(Guid userId, Guid friendId, CancellationToken cancellationToken = default)
    {
        var deleted = await Between(userId, friendId)
            .Where(f => f.Status == FriendshipStatus.Accepted)
            .ExecuteDeleteAsync(cancellationToken);
        return deleted > 0 ? null : FriendError.NotFriends;
    }

    public async Task<string?> GetFriendNicknameAsync(Guid userId, Guid friendId, CancellationToken cancellationToken = default)
    {
        var friends = await Between(userId, friendId).AnyAsync(f => f.Status == FriendshipStatus.Accepted, cancellationToken);
        if (!friends)
            return null;
        return await db.Users.AsNoTracking()
            .Where(u => u.Id == friendId)
            .Select(u => u.Nickname)
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<ProfileFriendshipResponse> GetRelationAsync(Guid requesterId, Guid userId,
        CancellationToken cancellationToken = default)
    {
        var row = await Between(requesterId, userId).AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        return row switch
        {
            null => new ProfileFriendshipResponse(FriendshipState.None, null),
            { Status: FriendshipStatus.Accepted } => new ProfileFriendshipResponse(FriendshipState.Friends, null),
            _ when row.RequesterId == requesterId => new ProfileFriendshipResponse(FriendshipState.RequestSent, row.Id),
            _ => new ProfileFriendshipResponse(FriendshipState.RequestReceived, row.Id)
        };
    }

    private IQueryable<Friendship> Involving(Guid userId) =>
        db.Friendships.Where(f => f.RequesterId == userId || f.AddresseeId == userId);

    private IQueryable<Friendship> Between(Guid userId, Guid otherId) =>
        db.Friendships.Where(f => (f.RequesterId == userId && f.AddresseeId == otherId)
                                  || (f.RequesterId == otherId && f.AddresseeId == userId));

    private static Guid OtherId(Friendship row, Guid userId) => row.RequesterId == userId ? row.AddresseeId : row.RequesterId;

    private async Task<Dictionary<Guid, FriendUserResponse>> UsersAsync(List<Guid> userIds, CancellationToken cancellationToken)
    {
        var categoryIds = await db.Categories.AsNoTracking().Select(c => c.Id).ToListAsync(cancellationToken);
        var ratings = (await db.CategoryRatings.AsNoTracking()
                .Where(r => userIds.Contains(r.UserId))
                .Select(r => new { r.UserId, r.CategoryId, r.Rating })
                .ToListAsync(cancellationToken))
            .GroupBy(r => r.UserId)
            .ToDictionary(g => g.Key, g => (IReadOnlyDictionary<int, int>)g.ToDictionary(r => r.CategoryId, r => r.Rating));

        return await db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Nickname, u.AvatarId, u.Tag })
            .ToDictionaryAsync(u => u.Id, u => new FriendUserResponse(u.Id, u.Nickname, u.AvatarId, u.Tag,
                OverallRating.FromCategories(categoryIds, ratings.GetValueOrDefault(u.Id, new Dictionary<int, int>()))),
                cancellationToken);
    }
}
