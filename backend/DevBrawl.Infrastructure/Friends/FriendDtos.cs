using System.ComponentModel.DataAnnotations;

namespace DevBrawl.Infrastructure.Friends;

// AvatarId and Tag as on the profile, null when not picked. Rating is the overall rating (OverallRating).
public sealed record FriendUserResponse(Guid Id, string Nickname, int? AvatarId, string? Tag, int Rating);

public sealed record FriendResponse(FriendUserResponse User, DateTime Since);

// User is the other player: the sender of an incoming request, the receiver of an outgoing one
public sealed record FriendRequestResponse(Guid Id, FriendUserResponse User, DateTime SentAt);

public sealed record FriendsResponse(
    // By nickname
    IReadOnlyList<FriendResponse> Friends,
    // Newest first
    IReadOnlyList<FriendRequestResponse> Incoming,
    IReadOnlyList<FriendRequestResponse> Outgoing);

public sealed record SendFriendRequestBody([Required, MaxLength(30)] string Nickname);

public enum FriendError
{
    PlayerNotFound,
    Yourself,
    AlreadyFriends,
    AlreadyRequested,
    RequestNotFound,
    NotFriends
}

public enum FriendshipState
{
    None,
    Friends,
    // You sent a request that is still pending
    RequestSent,
    // They sent you a request that is still pending
    RequestReceived
}

// RequestId is set while a request is pending, so the profile can accept or withdraw it
public sealed record ProfileFriendshipResponse(FriendshipState State, Guid? RequestId);
