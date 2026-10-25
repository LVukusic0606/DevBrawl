using System.Text.Json;
using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Engine.Protocol;

namespace DevBrawl.Duel.Engine;

internal sealed class DuelPlayer(Guid userId, string nickname, int? avatarId, IReadOnlyDictionary<int, int> ratings)
{
    public Guid UserId { get; } = userId;
    public string Nickname { get; } = nickname;
    public int? AvatarId { get; } = avatarId;
    public IReadOnlyDictionary<int, int> Ratings { get; } = ratings;
    public int Score { get; set; }

    // Current round; reset when a round starts
    public JsonElement? Answer { get; set; }
    public bool Correct { get; set; }
    public DateTime? AnsweredAt { get; set; }

    public PlayerInfo Info => new(UserId, Nickname, AvatarId, Ratings);

    public RoundAnswerRecord ToRecord() => new(Answer?.GetRawText(), Correct, AnsweredAt);

    public void ResetAnswer()
    {
        Answer = null;
        Correct = false;
        AnsweredAt = null;
    }
}

// A running duel, kept in memory by DuelEngine. Every access goes through Lock.
internal sealed class ActiveDuel(Guid id, DuelPlayer player1, DuelPlayer player2, bool friendly)
{
    public Guid Id { get; } = id;
    // Between friends: finalizing changes no ELO or XP
    public bool Friendly { get; } = friendly;
    public DuelPlayer Player1 { get; } = player1;
    public DuelPlayer Player2 { get; } = player2;
    public SemaphoreSlim Lock { get; } = new(1, 1);

    public DuelPhase Phase { get; set; } = DuelPhase.Countdown;
    public DateTime PhaseEndsAt { get; set; }
    public int RoundNumber { get; set; }
    public PreparedChallenge? Challenge { get; set; }
    public RoundStartedEvent? CurrentRound { get; set; }
    public List<RoundOutcome> Outcomes { get; } = [];
    // Last RoundEnded per player, resent on reconnect during the reveal
    public Dictionary<Guid, RoundEndedEvent> LastRoundEnded { get; } = [];
    // Set when the duel has been finalized or aborted; ticks and answers that were waiting on the lock do nothing
    public bool Closed { get; set; }

    public bool HasPlayer(Guid userId) => Player1.UserId == userId || Player2.UserId == userId;
    public DuelPlayer Player(Guid userId) => Player1.UserId == userId ? Player1 : Player2;
    public DuelPlayer Opponent(Guid userId) => Player1.UserId == userId ? Player2 : Player1;
    public IEnumerable<DuelPlayer> Players => [Player1, Player2];
}
