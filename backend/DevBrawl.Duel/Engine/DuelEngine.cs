using System.Collections.Concurrent;
using System.Text.Json;
using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Engine.Domain;
using DevBrawl.Duel.Engine.Protocol;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DevBrawl.Duel.Engine;

// Matchmaking, friend invites and running duels. Singleton: running duels live in memory (single server instance),
// the database keeps the record. Time is advanced by DuelTicker.
public sealed class DuelEngine(
    IChallengeCatalog catalog,
    IAnswerChecker answerChecker,
    IDuelStore store,
    IDuelNotifier notifier,
    IOptions<DuelOptions> options,
    ILogger<DuelEngine> logger)
{
    private const int RoundCount = 5;

    private sealed record QueuedPlayer(Guid UserId, string Nickname);

    // A friendly duel offer. Friendship is checked by the caller (DuelHub); the engine only knows the two players.
    private sealed record DuelInvite(Guid Id, QueuedPlayer From, QueuedPlayer To, DateTime ExpiresAt)
    {
        public bool Involves(Guid userId) => From.UserId == userId || To.UserId == userId;

        public DuelInviteEvent ToEvent() => new(Id, new InvitePlayer(From.UserId, From.Nickname),
            new InvitePlayer(To.UserId, To.Nickname), ExpiresAt, DateTime.UtcNow);
    }

    // Guards the queue, the invites and duel creation. Lock order: matchmaking lock, then a duel's lock.
    private readonly SemaphoreSlim _matchmakingLock = new(1, 1);
    private readonly List<QueuedPlayer> _queue = [];
    // At most one outgoing invite per player
    private readonly List<DuelInvite> _invites = [];
    private readonly ConcurrentDictionary<Guid, ActiveDuel> _duels = new();
    private readonly ConcurrentDictionary<Guid, ActiveDuel> _duelsByUser = new();
    // Open SignalR connections per user, so a second tab closing doesn't count as a disconnect
    private readonly ConcurrentDictionary<Guid, int> _connections = new();

    private DuelOptions Options => options.Value;

    public async Task JoinQueueAsync(Guid userId, string nickname)
    {
        await _matchmakingLock.WaitAsync();
        try
        {
            if (_duelsByUser.TryGetValue(userId, out var running))
            {
                // Already playing (e.g. in another tab): resync instead of queueing again
                await SendStateAsync(running, userId);
                return;
            }

            if (_queue.Any(q => q.UserId == userId))
            {
                await notifier.SendAsync(userId, DuelEvents.QueueJoined, new QueueEvent());
                return;
            }

            // Looking for a random opponent withdraws an invite to a friend
            await CloseOutgoingInviteAsync(userId);

            if (_queue.Count == 0)
            {
                _queue.Add(new QueuedPlayer(userId, nickname));
                await notifier.SendAsync(userId, DuelEvents.QueueJoined, new QueueEvent());
                return;
            }

            var opponent = _queue[0];
            _queue.RemoveAt(0);
            await StartDuelAsync(opponent, new QueuedPlayer(userId, nickname), invite: null);
        }
        finally
        {
            _matchmakingLock.Release();
        }
    }

    // Offers a friendly duel. A new invite replaces the player's previous one;
    // inviting a friend who already invited you accepts their invite.
    public async Task InviteFriendAsync(Guid userId, string nickname, Guid friendId, string friendNickname)
    {
        if (friendId == userId)
            throw new DuelRuleException("You can't invite yourself.");

        await _matchmakingLock.WaitAsync();
        try
        {
            if (_duelsByUser.TryGetValue(userId, out var running))
            {
                await SendStateAsync(running, userId);
                return;
            }
            if (_duelsByUser.ContainsKey(friendId))
                throw new DuelRuleException($"{friendNickname} is in a duel right now. Try again in a few minutes.");

            var theirs = _invites.Find(i => i.From.UserId == friendId && i.To.UserId == userId);
            if (theirs is not null)
            {
                await StartInvitedDuelAsync(theirs);
                return;
            }

            var mine = _invites.Find(i => i.From.UserId == userId);
            if (mine is not null && mine.To.UserId == friendId)
            {
                // Another tab already sent it: resync instead of restarting the clock
                await notifier.SendAsync(userId, DuelEvents.DuelInviteSent, mine.ToEvent());
                return;
            }
            if (mine is not null)
                await CloseInviteAsync(mine, DuelInviteClosedReason.Canceled);

            // A player is in the queue or waiting for a friend, never both
            if (_queue.RemoveAll(q => q.UserId == userId) > 0)
                await notifier.SendAsync(userId, DuelEvents.QueueLeft, new QueueEvent());

            var invite = new DuelInvite(Guid.CreateVersion7(), new QueuedPlayer(userId, nickname),
                new QueuedPlayer(friendId, friendNickname), DateTime.UtcNow.AddSeconds(Options.InviteSeconds));
            _invites.Add(invite);
            await notifier.SendAsync(userId, DuelEvents.DuelInviteSent, invite.ToEvent());
            await notifier.SendAsync(friendId, DuelEvents.DuelInviteReceived, invite.ToEvent());
        }
        finally
        {
            _matchmakingLock.Release();
        }
    }

    public async Task AcceptInviteAsync(Guid userId, Guid inviteId)
    {
        await _matchmakingLock.WaitAsync();
        try
        {
            var invite = _invites.Find(i => i.Id == inviteId && i.To.UserId == userId)
                ?? throw new DuelRuleException("This invite is no longer available.");
            if (DateTime.UtcNow > invite.ExpiresAt)
            {
                await CloseInviteAsync(invite, DuelInviteClosedReason.Expired);
                throw new DuelRuleException("This invite has expired.");
            }
            if (_duelsByUser.ContainsKey(userId))
                throw new DuelRuleException("Finish your current duel first.");

            // The inviter can't be in a duel: starting one closes all of their invites
            await StartInvitedDuelAsync(invite);
        }
        finally
        {
            _matchmakingLock.Release();
        }
    }

    // Declines an invite you received or withdraws one you sent. An invite that is already gone is ignored.
    public async Task DismissInviteAsync(Guid userId, Guid inviteId)
    {
        await _matchmakingLock.WaitAsync();
        try
        {
            var invite = _invites.Find(i => i.Id == inviteId && i.Involves(userId));
            if (invite is not null)
                await CloseInviteAsync(invite,
                    invite.To.UserId == userId ? DuelInviteClosedReason.Declined : DuelInviteClosedReason.Canceled);
        }
        finally
        {
            _matchmakingLock.Release();
        }
    }

    // Called when two players stop being friends
    public async Task CloseInvitesBetweenAsync(Guid userId, Guid otherUserId)
    {
        await _matchmakingLock.WaitAsync();
        try
        {
            foreach (var invite in _invites.Where(i => i.Involves(userId) && i.Involves(otherUserId)).ToList())
                await CloseInviteAsync(invite, DuelInviteClosedReason.Unavailable);
        }
        finally
        {
            _matchmakingLock.Release();
        }
    }

    public async Task LeaveQueueAsync(Guid userId)
    {
        await _matchmakingLock.WaitAsync();
        try
        {
            if (_queue.RemoveAll(q => q.UserId == userId) > 0)
                await notifier.SendAsync(userId, DuelEvents.QueueLeft, new QueueEvent());
        }
        finally
        {
            _matchmakingLock.Release();
        }
    }

    public async Task SubmitAnswerAsync(Guid userId, Guid duelId, int roundNumber, JsonElement answer)
    {
        if (!_duels.TryGetValue(duelId, out var duel) || !duel.HasPlayer(userId))
            throw new DuelRuleException("You are not playing in this duel.");

        await duel.Lock.WaitAsync();
        try
        {
            if (duel.Closed || duel.Phase != DuelPhase.Round || duel.RoundNumber != roundNumber)
                throw new DuelRuleException("This round is not accepting answers.");

            var now = DateTime.UtcNow;
            if (now > duel.PhaseEndsAt)
                throw new DuelRuleException("Time is up for this round.");

            var player = duel.Player(userId);
            if (player.AnsweredAt is not null)
                throw new DuelRuleException("You already answered this round.");

            var challenge = duel.Challenge!;
            // The JsonElement belongs to the incoming message, which is disposed after the call
            player.Answer = answer.Clone();
            player.AnsweredAt = now;
            player.Correct = answerChecker.IsCorrect(challenge.Type, challenge.AnswerKey, answer);

            var roundEvent = new RoundAnswerEvent(duel.Id, roundNumber);
            await notifier.SendAsync(userId, DuelEvents.AnswerAccepted, roundEvent);
            await notifier.SendAsync(duel.Opponent(userId).UserId, DuelEvents.OpponentAnswered, roundEvent);

            // The timer keeps running for a disconnected opponent, so only both answers end a round early
            if (duel.Player1.AnsweredAt is not null && duel.Player2.AnsweredAt is not null)
            {
                try
                {
                    await EndRoundAsync(duel, now);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Duel {DuelId} failed and is aborted", duel.Id);
                    await AbortAsync(duel, "Something went wrong on the server. This duel doesn't count.");
                }
            }
        }
        finally
        {
            duel.Lock.Release();
        }
    }

    public async Task OnConnectedAsync(Guid userId)
    {
        var connections = _connections.AddOrUpdate(userId, 1, (_, count) => count + 1);
        if (_duelsByUser.TryGetValue(userId, out var duel))
        {
            await SendStateAsync(duel, userId);
            if (connections == 1)
                await notifier.SendAsync(duel.Opponent(userId).UserId, DuelEvents.OpponentReconnected, new DuelEvent(duel.Id));
            return;
        }

        // Invites sent while the player wasn't in the arena, and their own from another tab
        List<DuelInvite> invites;
        await _matchmakingLock.WaitAsync();
        try
        {
            invites = _invites.Where(i => i.Involves(userId)).ToList();
        }
        finally
        {
            _matchmakingLock.Release();
        }

        foreach (var invite in invites)
            await notifier.SendAsync(userId,
                invite.From.UserId == userId ? DuelEvents.DuelInviteSent : DuelEvents.DuelInviteReceived, invite.ToEvent());
    }

    public async Task OnDisconnectedAsync(Guid userId)
    {
        var connections = _connections.AddOrUpdate(userId, 0, (_, count) => Math.Max(0, count - 1));
        if (connections > 0)
            return;
        _connections.TryRemove(new KeyValuePair<Guid, int>(userId, 0));

        await _matchmakingLock.WaitAsync();
        try
        {
            _queue.RemoveAll(q => q.UserId == userId);
            // A friend accepting must not start a duel the inviter isn't there for.
            // Invites they received stay: they can still accept when they come back.
            await CloseOutgoingInviteAsync(userId);
        }
        finally
        {
            _matchmakingLock.Release();
        }

        // The duel goes on; unanswered rounds time out (spec section 6, Disconnects)
        if (_duelsByUser.TryGetValue(userId, out var duel))
            await notifier.SendAsync(duel.Opponent(userId).UserId, DuelEvents.OpponentDisconnected, new DuelEvent(duel.Id));
    }

    // Called by DuelTicker a few times per second
    public async Task TickAsync()
    {
        foreach (var duel in _duels.Values)
            await AdvanceAsync(duel);
        if (_invites.Count > 0)
            await ExpireInvitesAsync();
    }

    private async Task ExpireInvitesAsync()
    {
        await _matchmakingLock.WaitAsync();
        try
        {
            var now = DateTime.UtcNow;
            foreach (var invite in _invites.Where(i => now > i.ExpiresAt).ToList())
                await CloseInviteAsync(invite, DuelInviteClosedReason.Expired);
        }
        finally
        {
            _matchmakingLock.Release();
        }
    }

    // Callers hold the matchmaking lock
    private async Task CloseInviteAsync(DuelInvite invite, DuelInviteClosedReason reason)
    {
        _invites.Remove(invite);
        var closed = new DuelInviteClosedEvent(invite.Id, reason);
        await notifier.SendAsync(invite.From.UserId, DuelEvents.DuelInviteClosed, closed);
        await notifier.SendAsync(invite.To.UserId, DuelEvents.DuelInviteClosed, closed);
    }

    private async Task CloseOutgoingInviteAsync(Guid userId)
    {
        var invite = _invites.Find(i => i.From.UserId == userId);
        if (invite is not null)
            await CloseInviteAsync(invite, DuelInviteClosedReason.Canceled);
    }

    private async Task StartInvitedDuelAsync(DuelInvite invite)
    {
        _queue.RemoveAll(q => q.UserId == invite.From.UserId || q.UserId == invite.To.UserId);
        await StartDuelAsync(invite.From, invite.To, invite);
    }

    private async Task AdvanceAsync(ActiveDuel duel)
    {
        await duel.Lock.WaitAsync();
        try
        {
            var now = DateTime.UtcNow;
            if (duel.Closed || now < duel.PhaseEndsAt)
                return;

            switch (duel.Phase)
            {
                case DuelPhase.Countdown:
                    await StartRoundAsync(duel, 1, now);
                    break;
                case DuelPhase.Round:
                    await EndRoundAsync(duel, now);
                    break;
                case DuelPhase.Reveal:
                    await StartRoundAsync(duel, duel.RoundNumber + 1, now);
                    break;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Duel {DuelId} failed and is aborted", duel.Id);
            await AbortAsync(duel, "Something went wrong on the server. This duel doesn't count.");
        }
        finally
        {
            duel.Lock.Release();
        }
    }

    // invite is set for a friendly duel; null for a ranked one from the queue
    private async Task StartDuelAsync(QueuedPlayer first, QueuedPlayer second, DuelInvite? invite)
    {
        var player1 = new DuelPlayer(first.UserId, first.Nickname, await store.GetAvatarIdAsync(first.UserId),
            await store.GetRatingsAsync(first.UserId));
        var player2 = new DuelPlayer(second.UserId, second.Nickname, await store.GetAvatarIdAsync(second.UserId),
            await store.GetRatingsAsync(second.UserId));
        var now = DateTime.UtcNow;
        var friendly = invite is not null;
        var duel = new ActiveDuel(Guid.CreateVersion7(), player1, player2, friendly)
        {
            Phase = DuelPhase.Countdown,
            PhaseEndsAt = now.AddSeconds(Options.CountdownSeconds)
        };

        await store.CreateDuelAsync(new DuelMatch
        {
            Id = duel.Id,
            Player1Id = player1.UserId,
            Player2Id = player2.UserId,
            IsFriendly = friendly,
            Status = DuelStatus.InProgress,
            StartedAt = now
        });

        _duelsByUser[player1.UserId] = duel;
        _duelsByUser[player2.UserId] = duel;
        _duels[duel.Id] = duel;
        logger.LogInformation("Duel {DuelId} started: {Player1} vs {Player2}, friendly: {Friendly}",
            duel.Id, player1.Nickname, player2.Nickname, friendly);

        // Both players are busy now, so every other invite they're part of is off
        foreach (var other in _invites.Where(i => i.Involves(player1.UserId) || i.Involves(player2.UserId)).ToList())
            await CloseInviteAsync(other, other == invite ? DuelInviteClosedReason.Accepted : DuelInviteClosedReason.Unavailable);

        foreach (var player in duel.Players)
            await notifier.SendAsync(player.UserId, DuelEvents.MatchFound,
                new MatchFoundEvent(duel.Id, player.Info, duel.Opponent(player.UserId).Info, friendly, duel.PhaseEndsAt,
                    DateTime.UtcNow));
    }

    private async Task StartRoundAsync(ActiveDuel duel, int roundNumber, DateTime now)
    {
        // Round N always uses challenge type N (A to E)
        var type = (ChallengeType)roundNumber;
        var challenge = catalog.GetRandom(type);
        var timeLimit = Options.TimeLimit(type);
        var endsAt = now + timeLimit;

        await store.AddRoundAsync(new DuelRound
        {
            DuelId = duel.Id,
            RoundNumber = roundNumber,
            ChallengeId = challenge.ChallengeId,
            CategoryId = challenge.CategoryId,
            Type = type,
            AnswerKey = challenge.AnswerKey,
            ClientView = challenge.ClientView.ToJsonString(),
            StartedAt = now,
            EndsAt = endsAt
        });

        foreach (var player in duel.Players)
            player.ResetAnswer();
        duel.LastRoundEnded.Clear();
        duel.RoundNumber = roundNumber;
        duel.Challenge = challenge;
        duel.Phase = DuelPhase.Round;
        duel.PhaseEndsAt = endsAt;
        duel.CurrentRound = new RoundStartedEvent(duel.Id, roundNumber, type, challenge.CategoryId,
            challenge.ClientView, (int)timeLimit.TotalSeconds, endsAt, now);

        foreach (var player in duel.Players)
            await notifier.SendAsync(player.UserId, DuelEvents.RoundStarted, duel.CurrentRound);
    }

    private async Task EndRoundAsync(ActiveDuel duel, DateTime now)
    {
        var (player1, player2) = (duel.Player1, duel.Player2);
        var challenge = duel.Challenge!;

        var result = RoundRules.Decide(player1.Correct, player1.AnsweredAt, player2.Correct, player2.AnsweredAt);
        if (result == RoundResult.Player1Won) player1.Score++;
        if (result == RoundResult.Player2Won) player2.Score++;
        duel.Outcomes.Add(new RoundOutcome(duel.RoundNumber, challenge.CategoryId, challenge.Type,
            player1.Correct, player2.Correct, result));

        var reveal = catalog.GetReveal(challenge.ChallengeId, challenge.AnswerKey);
        await store.CompleteRoundAsync(duel.Id, duel.RoundNumber, player1.ToRecord(), player2.ToRecord(),
            result, reveal.ToJsonString(), now);

        foreach (var player in duel.Players)
        {
            var opponent = duel.Opponent(player.UserId);
            var ended = new RoundEndedEvent(duel.Id, duel.RoundNumber,
                player.AnsweredAt is not null, player.Correct,
                opponent.AnsweredAt is not null, opponent.Correct,
                RoundRules.ForPlayer(result, player == player1),
                player.Score, opponent.Score, reveal);
            duel.LastRoundEnded[player.UserId] = ended;
            await notifier.SendAsync(player.UserId, DuelEvents.RoundEnded, ended);
        }

        if (duel.RoundNumber == RoundCount)
        {
            await FinalizeAsync(duel, now);
            return;
        }

        duel.Phase = DuelPhase.Reveal;
        duel.PhaseEndsAt = now.AddSeconds(Options.RevealSeconds);
    }

    private async Task FinalizeAsync(ActiveDuel duel, DateTime now)
    {
        var (player1, player2) = (duel.Player1, duel.Player2);
        Guid? winnerId = player1.Score > player2.Score ? player1.UserId
            : player2.Score > player1.Score ? player2.UserId
            : null;

        var outcome = new DuelOutcome(duel.Id, player1.UserId, player2.UserId, winnerId, duel.Outcomes.ToList());
        var rewards = await store.FinalizeAsync(outcome, player1.Score, player2.Score, now);
        Close(duel);
        if (rewards is null)
            return;

        logger.LogInformation("Duel {DuelId} finished {Score1}:{Score2}", duel.Id, player1.Score, player2.Score);
        foreach (var (player, reward) in new[] { (player1, rewards.Player1), (player2, rewards.Player2) })
        {
            var opponent = duel.Opponent(player.UserId);
            await notifier.SendAsync(player.UserId, DuelEvents.DuelEnded, new DuelEndedEvent(duel.Id,
                RoundRules.ForPlayer(player.Score, opponent.Score), player.Score, opponent.Score, duel.Friendly,
                reward.RatingChanges, reward.XpGained, reward.TotalXp, reward.Level));
        }
    }

    private async Task AbortAsync(ActiveDuel duel, string reason)
    {
        Close(duel);
        try
        {
            await store.AbandonAsync(duel.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Couldn't mark duel {DuelId} as abandoned", duel.Id);
        }

        foreach (var player in duel.Players)
            await notifier.SendAsync(player.UserId, DuelEvents.DuelAborted, new DuelAbortedEvent(duel.Id, reason));
    }

    private void Close(ActiveDuel duel)
    {
        duel.Closed = true;
        _duels.TryRemove(duel.Id, out _);
        foreach (var player in duel.Players)
            _duelsByUser.TryRemove(new KeyValuePair<Guid, ActiveDuel>(player.UserId, duel));
    }

    private async Task SendStateAsync(ActiveDuel duel, Guid userId)
    {
        await duel.Lock.WaitAsync();
        try
        {
            if (duel.Closed)
                return;

            var player = duel.Player(userId);
            var opponent = duel.Opponent(userId);
            await notifier.SendAsync(userId, DuelEvents.DuelState, new DuelStateEvent(
                duel.Id, player.Info, opponent.Info, duel.Friendly, duel.Phase, duel.RoundNumber, duel.PhaseEndsAt,
                duel.Phase == DuelPhase.Countdown ? null : duel.CurrentRound,
                player.AnsweredAt is not null, opponent.AnsweredAt is not null,
                player.Score, opponent.Score,
                duel.Phase == DuelPhase.Reveal ? duel.LastRoundEnded.GetValueOrDefault(userId) : null,
                DateTime.UtcNow));
        }
        finally
        {
            duel.Lock.Release();
        }
    }
}
