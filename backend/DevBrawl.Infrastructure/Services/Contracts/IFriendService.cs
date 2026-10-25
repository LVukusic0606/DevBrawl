using DevBrawl.Infrastructure.Friends;

namespace DevBrawl.Infrastructure.Services.Contracts;

// Friend requests and friendships. Friends can play friendly duels, which change no ELO or XP.
// The mutating calls return null on success.
public interface IFriendService
{
    Task<FriendsResponse> GetAsync(Guid userId, CancellationToken cancellationToken = default);

    // The nickname is matched ignoring case. If the other player already sent you a request, it is accepted instead.
    Task<FriendError?> SendRequestAsync(Guid userId, string nickname, CancellationToken cancellationToken = default);

    // Only the player who received the request can accept it
    Task<FriendError?> AcceptRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default);

    // Declines a request you received or withdraws one you sent
    Task<FriendError?> DeleteRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default);

    Task<FriendError?> RemoveFriendAsync(Guid userId, Guid friendId, CancellationToken cancellationToken = default);

    // The friend's nickname, or null when the two players aren't friends
    Task<string?> GetFriendNicknameAsync(Guid userId, Guid friendId, CancellationToken cancellationToken = default);

    // How the requester relates to another player, for their profile
    Task<ProfileFriendshipResponse> GetRelationAsync(Guid requesterId, Guid userId, CancellationToken cancellationToken = default);
}
