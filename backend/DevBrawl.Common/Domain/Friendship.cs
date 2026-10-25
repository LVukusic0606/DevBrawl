namespace DevBrawl.Common.Domain;

public enum FriendshipStatus
{
    Pending = 1,
    Accepted = 2
}

// A friend request and, once accepted, the friendship itself. There is one row per pair of players,
// whichever of them sent the request. Declining a request or removing a friend deletes the row.
public class Friendship
{
    public Guid Id { get; set; }
    public Guid RequesterId { get; set; }
    public Guid AddresseeId { get; set; }
    public FriendshipStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
}
