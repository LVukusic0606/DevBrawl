using DevBrawl.Duel.Content;
using DevBrawl.Duel.Contracts;
using DevBrawl.Duel.Engine;
using DevBrawl.Duel.Engine.Domain;
using DevBrawl.Duel.Engine.Protocol;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace DevBrawl.Duel.Tests.Engine;

public class DuelInviteTests
{
    private static readonly Guid Ana = Guid.NewGuid();
    private static readonly Guid Ben = Guid.NewGuid();
    private static readonly Guid Cleo = Guid.NewGuid();

    private readonly RecordingNotifier _notifier = new();
    private readonly FakeStore _store = new();

    private DuelEngine CreateEngine(int inviteSeconds = 60) => new(
        TestCatalog.Load(new Random(1)),
        new AnswerChecker(),
        _store,
        _notifier,
        Options.Create(new DuelOptions { InviteSeconds = inviteSeconds }),
        NullLogger<DuelEngine>.Instance);

    [Fact]
    public async Task Invite_reaches_both_players()
    {
        var engine = CreateEngine();

        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");

        var sent = _notifier.Single<DuelInviteEvent>(Ana, DuelEvents.DuelInviteSent);
        var received = _notifier.Single<DuelInviteEvent>(Ben, DuelEvents.DuelInviteReceived);
        Assert.Equal(sent.InviteId, received.InviteId);
        Assert.Equal("ana", received.From.Nickname);
        Assert.Equal(Ben, received.To.Id);
    }

    [Fact]
    public async Task Accepting_starts_a_friendly_duel()
    {
        var engine = CreateEngine();
        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");
        var invite = _notifier.Single<DuelInviteEvent>(Ben, DuelEvents.DuelInviteReceived);

        await engine.AcceptInviteAsync(Ben, invite.InviteId);

        Assert.True(_notifier.Single<MatchFoundEvent>(Ana, DuelEvents.MatchFound).Friendly);
        Assert.True(_notifier.Single<MatchFoundEvent>(Ben, DuelEvents.MatchFound).Friendly);
        Assert.True(Assert.Single(_store.Created).IsFriendly);
        Assert.Equal(DuelInviteClosedReason.Accepted,
            _notifier.Single<DuelInviteClosedEvent>(Ana, DuelEvents.DuelInviteClosed).Reason);
    }

    [Fact]
    public async Task Queue_duels_stay_ranked()
    {
        var engine = CreateEngine();

        await engine.JoinQueueAsync(Ana, "ana");
        await engine.JoinQueueAsync(Ben, "ben");

        Assert.False(_notifier.Single<MatchFoundEvent>(Ana, DuelEvents.MatchFound).Friendly);
        Assert.False(Assert.Single(_store.Created).IsFriendly);
    }

    [Fact]
    public async Task Only_the_invited_friend_can_accept()
    {
        var engine = CreateEngine();
        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");
        var invite = _notifier.Single<DuelInviteEvent>(Ben, DuelEvents.DuelInviteReceived);

        await Assert.ThrowsAsync<DuelRuleException>(() => engine.AcceptInviteAsync(Ana, invite.InviteId));
        await Assert.ThrowsAsync<DuelRuleException>(() => engine.AcceptInviteAsync(Cleo, invite.InviteId));
        Assert.Empty(_store.Created);
    }

    [Fact]
    public async Task Declining_and_withdrawing_close_the_invite()
    {
        var engine = CreateEngine();
        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");
        var first = _notifier.Single<DuelInviteEvent>(Ben, DuelEvents.DuelInviteReceived);
        await engine.DismissInviteAsync(Ben, first.InviteId);

        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");
        var second = _notifier.Last<DuelInviteEvent>(Ben, DuelEvents.DuelInviteReceived);
        await engine.DismissInviteAsync(Ana, second.InviteId);

        var reasons = _notifier.All<DuelInviteClosedEvent>(Ana, DuelEvents.DuelInviteClosed).Select(e => e.Reason);
        Assert.Equal([DuelInviteClosedReason.Declined, DuelInviteClosedReason.Canceled], reasons);
        await Assert.ThrowsAsync<DuelRuleException>(() => engine.AcceptInviteAsync(Ben, second.InviteId));
    }

    [Fact]
    public async Task A_new_invite_replaces_the_previous_one()
    {
        var engine = CreateEngine();
        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");
        var toBen = _notifier.Single<DuelInviteEvent>(Ben, DuelEvents.DuelInviteReceived);

        await engine.InviteFriendAsync(Ana, "ana", Cleo, "cleo");

        Assert.Equal(DuelInviteClosedReason.Canceled,
            _notifier.Single<DuelInviteClosedEvent>(Ben, DuelEvents.DuelInviteClosed).Reason);
        await Assert.ThrowsAsync<DuelRuleException>(() => engine.AcceptInviteAsync(Ben, toBen.InviteId));
    }

    [Fact]
    public async Task Inviting_back_accepts_their_invite()
    {
        var engine = CreateEngine();
        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");

        await engine.InviteFriendAsync(Ben, "ben", Ana, "ana");

        Assert.True(Assert.Single(_store.Created).IsFriendly);
        Assert.Empty(_notifier.All<DuelInviteEvent>(Ana, DuelEvents.DuelInviteReceived));
    }

    [Fact]
    public async Task Joining_the_queue_withdraws_your_invite()
    {
        var engine = CreateEngine();
        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");

        await engine.JoinQueueAsync(Ana, "ana");

        Assert.Equal(DuelInviteClosedReason.Canceled,
            _notifier.Single<DuelInviteClosedEvent>(Ben, DuelEvents.DuelInviteClosed).Reason);
    }

    [Fact]
    public async Task Inviting_takes_you_out_of_the_queue()
    {
        var engine = CreateEngine();
        await engine.JoinQueueAsync(Ana, "ana");

        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");
        await engine.JoinQueueAsync(Cleo, "cleo");

        Assert.Single(_notifier.All<QueueEvent>(Ana, DuelEvents.QueueLeft));
        Assert.Empty(_store.Created);
    }

    [Fact]
    public async Task A_friend_in_a_duel_cant_be_invited()
    {
        var engine = CreateEngine();
        await engine.JoinQueueAsync(Ben, "ben");
        await engine.JoinQueueAsync(Cleo, "cleo");

        await Assert.ThrowsAsync<DuelRuleException>(() => engine.InviteFriendAsync(Ana, "ana", Ben, "ben"));
    }

    [Fact]
    public async Task Starting_a_duel_closes_other_invites()
    {
        var engine = CreateEngine();
        await engine.InviteFriendAsync(Cleo, "cleo", Ben, "ben");
        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");
        var fromAna = _notifier.Last<DuelInviteEvent>(Ben, DuelEvents.DuelInviteReceived);

        await engine.AcceptInviteAsync(Ben, fromAna.InviteId);

        Assert.Equal(DuelInviteClosedReason.Unavailable,
            _notifier.Single<DuelInviteClosedEvent>(Cleo, DuelEvents.DuelInviteClosed).Reason);
    }

    [Fact]
    public async Task Invites_expire()
    {
        var engine = CreateEngine(inviteSeconds: 0);
        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");
        await Task.Delay(10);

        await engine.TickAsync();

        Assert.Equal(DuelInviteClosedReason.Expired,
            _notifier.Single<DuelInviteClosedEvent>(Ben, DuelEvents.DuelInviteClosed).Reason);
    }

    [Fact]
    public async Task Leaving_the_arena_withdraws_your_invite_but_keeps_received_ones()
    {
        var engine = CreateEngine();
        await engine.OnConnectedAsync(Ana);
        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");
        await engine.InviteFriendAsync(Cleo, "cleo", Ana, "ana");

        await engine.OnDisconnectedAsync(Ana);

        Assert.Equal(DuelInviteClosedReason.Canceled,
            _notifier.Single<DuelInviteClosedEvent>(Ben, DuelEvents.DuelInviteClosed).Reason);
        Assert.Empty(_notifier.All<DuelInviteClosedEvent>(Cleo, DuelEvents.DuelInviteClosed));
    }

    [Fact]
    public async Task Pending_invites_are_resent_on_connect()
    {
        var engine = CreateEngine();
        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");

        await engine.OnConnectedAsync(Ben);

        Assert.Equal(2, _notifier.All<DuelInviteEvent>(Ben, DuelEvents.DuelInviteReceived).Count);
    }

    [Fact]
    public async Task Unfriending_closes_invites_between_the_two()
    {
        var engine = CreateEngine();
        await engine.InviteFriendAsync(Ana, "ana", Ben, "ben");

        await engine.CloseInvitesBetweenAsync(Ben, Ana);

        Assert.Equal(DuelInviteClosedReason.Unavailable,
            _notifier.Single<DuelInviteClosedEvent>(Ana, DuelEvents.DuelInviteClosed).Reason);
    }

    private sealed class RecordingNotifier : IDuelNotifier
    {
        private readonly List<(Guid UserId, string EventName, object Payload)> _sent = [];

        public Task SendAsync(Guid userId, string eventName, object payload)
        {
            lock (_sent) _sent.Add((userId, eventName, payload));
            return Task.CompletedTask;
        }

        public List<T> All<T>(Guid userId, string eventName)
        {
            lock (_sent) return _sent.Where(e => e.UserId == userId && e.EventName == eventName).Select(e => (T)e.Payload).ToList();
        }

        public T Single<T>(Guid userId, string eventName) => Assert.Single(All<T>(userId, eventName));

        public T Last<T>(Guid userId, string eventName) => All<T>(userId, eventName)[^1];
    }

    private sealed class FakeStore : IDuelStore
    {
        public List<DuelMatch> Created { get; } = [];

        public Task AbandonInProgressAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task<IReadOnlyDictionary<int, int>> GetRatingsAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyDictionary<int, int>>(new Dictionary<int, int> { [1] = 1000 });

        public Task<int?> GetAvatarIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<int?>(null);

        public Task CreateDuelAsync(DuelMatch duel, CancellationToken cancellationToken = default)
        {
            Created.Add(duel);
            return Task.CompletedTask;
        }

        public Task AddRoundAsync(DuelRound round, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task CompleteRoundAsync(Guid duelId, int roundNumber, RoundAnswerRecord player1, RoundAnswerRecord player2,
            RoundResult result, string revealJson, DateTime endedAt, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task<DuelRewards?> FinalizeAsync(DuelOutcome outcome, int player1Score, int player2Score, DateTime finishedAt,
            CancellationToken cancellationToken = default) => Task.FromResult<DuelRewards?>(null);

        public Task AbandonAsync(Guid duelId, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
