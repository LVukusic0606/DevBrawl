using System.Text.Json;
using DevBrawl.Duel.Engine;
using DevBrawl.Infrastructure.Services.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace DevBrawl.Api.Hubs;

// Real-time duels. Protocol: docs/duel-protocol.md. Connect with ?access_token=<JWT>.
[Authorize]
public sealed class DuelHub(DuelEngine engine, IFriendService friends) : Hub
{
    private Guid UserId => Guid.Parse(Context.UserIdentifier!);
    private string Nickname => Context.User?.FindFirst("nickname")?.Value ?? "Player";

    public override async Task OnConnectedAsync()
    {
        await engine.OnConnectedAsync(UserId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await engine.OnDisconnectedAsync(UserId);
        await base.OnDisconnectedAsync(exception);
    }

    public Task JoinQueue() => Run(() => engine.JoinQueueAsync(UserId, Nickname));

    public Task LeaveQueue() => Run(() => engine.LeaveQueueAsync(UserId));

    // Friendly duel: no ELO or XP. Only friends can be invited.
    public async Task InviteFriend(Guid friendId)
    {
        var friendNickname = await friends.GetFriendNicknameAsync(UserId, friendId, Context.ConnectionAborted)
            ?? throw new HubException("You can only invite players on your friends list.");
        await Run(() => engine.InviteFriendAsync(UserId, Nickname, friendId, friendNickname));
    }

    public Task AcceptInvite(Guid inviteId) => Run(() => engine.AcceptInviteAsync(UserId, inviteId));

    // Declines an invite you received or withdraws one you sent
    public Task DismissInvite(Guid inviteId) => Run(() => engine.DismissInviteAsync(UserId, inviteId));

    // Refusing an answer (wrong round, already answered, time is up) is a normal outcome,
    // so it's returned instead of thrown: { ok: false, error: "..." }
    public async Task<SubmitAnswerResult> SubmitAnswer(Guid duelId, int roundNumber, JsonElement answer)
    {
        try
        {
            await engine.SubmitAnswerAsync(UserId, duelId, roundNumber, answer);
            return new SubmitAnswerResult(true, null);
        }
        catch (DuelRuleException ex)
        {
            return new SubmitAnswerResult(false, ex.Message);
        }
    }

    // Rule violations reach the client as a rejected invoke() with this message
    private static async Task Run(Func<Task> action)
    {
        try
        {
            await action();
        }
        catch (DuelRuleException ex)
        {
            throw new HubException(ex.Message);
        }
    }
}

public sealed record SubmitAnswerResult(bool Ok, string? Error);
