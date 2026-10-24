using System.Collections.Concurrent;
using System.Text.Json;
using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Engine.Domain;
using DevBrawl.Duel.Engine.Protocol;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DevBrawl.Duel.Engine;

// Matchmaking and running duels. Singleton: running duels live in memory (single server instance),
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

    // Guards the queue and duel creation. Lock order: matchmaking lock, then a duel's lock.
    private readonly SemaphoreSlim _matchmakingLock = new(1, 1);
    private readonly List<QueuedPlayer> _queue = [];
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

            if (_queue.Count == 0)
            {
                _queue.Add(new QueuedPlayer(userId, nickname));
                await notifier.SendAsync(userId, DuelEvents.QueueJoined, new QueueEvent());
                return;
            }

            var opponent = _queue[0];
            _queue.RemoveAt(0);
            await StartDuelAsync(opponent, new QueuedPlayer(userId, nickname));
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
        if (!_duelsByUser.TryGetValue(userId, out var duel))
            return;

        await SendStateAsync(duel, userId);
        if (connections == 1)
            await notifier.SendAsync(duel.Opponent(userId).UserId, DuelEvents.OpponentReconnected, new DuelEvent(duel.Id));
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

    private async Task StartDuelAsync(QueuedPlayer first, QueuedPlayer second)
    {
        var player1 = new DuelPlayer(first.UserId, first.Nickname, await store.GetRatingsAsync(first.UserId));
        var player2 = new DuelPlayer(second.UserId, second.Nickname, await store.GetRatingsAsync(second.UserId));
        var now = DateTime.UtcNow;
        var duel = new ActiveDuel(Guid.CreateVersion7(), player1, player2)
        {
            Phase = DuelPhase.Countdown,
            PhaseEndsAt = now.AddSeconds(Options.CountdownSeconds)
        };

        await store.CreateDuelAsync(new DuelMatch
        {
            Id = duel.Id,
            Player1Id = player1.UserId,
            Player2Id = player2.UserId,
            Status = DuelStatus.InProgress,
            StartedAt = now
        });

        _duelsByUser[player1.UserId] = duel;
        _duelsByUser[player2.UserId] = duel;
        _duels[duel.Id] = duel;
        logger.LogInformation("Duel {DuelId} started: {Player1} vs {Player2}", duel.Id, player1.Nickname, player2.Nickname);

        foreach (var player in duel.Players)
            await notifier.SendAsync(player.UserId, DuelEvents.MatchFound,
                new MatchFoundEvent(duel.Id, player.Info, duel.Opponent(player.UserId).Info, duel.PhaseEndsAt, DateTime.UtcNow));
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
                RoundRules.ForPlayer(player.Score, opponent.Score), player.Score, opponent.Score,
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
                duel.Id, player.Info, opponent.Info, duel.Phase, duel.RoundNumber, duel.PhaseEndsAt,
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
