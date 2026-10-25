using System.Text.Json.Nodes;
using DevBrawl.Duel.Contracts;

namespace DevBrawl.Duel.Engine.Protocol;

// SignalR events sent by the server. See docs/duel-protocol.md.
// Results are always from the receiving player's point of view ("you" / "opponent").
public static class DuelEvents
{
    public const string QueueJoined = "QueueJoined";
    public const string QueueLeft = "QueueLeft";
    public const string MatchFound = "MatchFound";
    public const string RoundStarted = "RoundStarted";
    public const string AnswerAccepted = "AnswerAccepted";
    public const string OpponentAnswered = "OpponentAnswered";
    public const string RoundEnded = "RoundEnded";
    public const string DuelEnded = "DuelEnded";
    public const string DuelState = "DuelState";
    public const string OpponentDisconnected = "OpponentDisconnected";
    public const string OpponentReconnected = "OpponentReconnected";
    public const string DuelAborted = "DuelAborted";
    public const string DuelInviteSent = "DuelInviteSent";
    public const string DuelInviteReceived = "DuelInviteReceived";
    public const string DuelInviteClosed = "DuelInviteClosed";
}

public enum DuelPhase
{
    // Between "match found" and round 1
    Countdown,
    Round,
    // After a round, while the correct answer is shown
    Reveal
}

public enum PlayerRoundResult { Won, Lost, Draw, NoWinner }

public enum PlayerDuelResult { Won, Lost, Draw }

public enum DuelInviteClosedReason
{
    // The friend accepted; MatchFound follows
    Accepted,
    Declined,
    // The inviter withdrew it, sent a new one, joined the queue or left the arena
    Canceled,
    Expired,
    // One of the players started another duel or they are no longer friends
    Unavailable
}

// Events with a deadline also carry ServerTime, the server's clock when the event was sent.
// Device clocks can be minutes off, so clients count down on the server's clock: deadline - (now + offset),
// where offset = ServerTime - device time on arrival.

// Ratings: category id → rating
// AvatarId is the player's picked avatar (as on their profile), null when they haven't picked one
public sealed record PlayerInfo(Guid Id, string Nickname, int? AvatarId, IReadOnlyDictionary<int, int> Ratings);

public sealed record QueueEvent;

public sealed record DuelEvent(Guid DuelId);

// Friendly: a duel between friends, which changes no ELO or XP
public sealed record MatchFoundEvent(Guid DuelId, PlayerInfo You, PlayerInfo Opponent, bool Friendly, DateTime StartsAt,
    DateTime ServerTime);

public sealed record RoundStartedEvent(
    Guid DuelId,
    int RoundNumber,
    ChallengeType Type,
    int CategoryId,
    // PreparedChallenge.ClientView: no answers
    JsonObject Challenge,
    int TimeLimitSeconds,
    DateTime EndsAt,
    // When the round started; inside a DuelState use DuelState.ServerTime instead
    DateTime ServerTime);

public sealed record RoundAnswerEvent(Guid DuelId, int RoundNumber);

public sealed record RoundEndedEvent(
    Guid DuelId,
    int RoundNumber,
    bool YouAnswered,
    bool YouCorrect,
    bool OpponentAnswered,
    bool OpponentCorrect,
    PlayerRoundResult Result,
    int YourScore,
    int OpponentScore,
    // IChallengeCatalog.GetReveal: correct answer and explanation
    JsonObject Reveal);

public sealed record DuelEndedEvent(
    Guid DuelId,
    PlayerDuelResult Result,
    int YourScore,
    int OpponentScore,
    bool Friendly,
    // Empty for a friendly duel
    IReadOnlyList<RatingChange> RatingChanges,
    int XpGained,
    int TotalXp,
    int Level);

// Sent on reconnect (or when joining the queue while already in a duel) so the client can rebuild the screen
public sealed record DuelStateEvent(
    Guid DuelId,
    PlayerInfo You,
    PlayerInfo Opponent,
    bool Friendly,
    DuelPhase Phase,
    int RoundNumber,
    DateTime PhaseEndsAt,
    // null during the countdown
    RoundStartedEvent? CurrentRound,
    bool YouAnswered,
    bool OpponentAnswered,
    int YourScore,
    int OpponentScore,
    // Set during the reveal phase
    RoundEndedEvent? LastRoundEnded,
    DateTime ServerTime);

public sealed record DuelAbortedEvent(Guid DuelId, string Reason);

public sealed record InvitePlayer(Guid Id, string Nickname);

// Sent to both players: DuelInviteSent to the inviter, DuelInviteReceived to the friend.
// Pending invites are sent again when a player connects.
public sealed record DuelInviteEvent(Guid InviteId, InvitePlayer From, InvitePlayer To, DateTime ExpiresAt, DateTime ServerTime);

// Sent to both players when an invite stops being pending
public sealed record DuelInviteClosedEvent(Guid InviteId, DuelInviteClosedReason Reason);
