using DevBrawl.Duel.Engine;
using Microsoft.AspNetCore.SignalR;

namespace DevBrawl.Api.Hubs;

public sealed class HubDuelNotifier(IHubContext<DuelHub> hub) : IDuelNotifier
{
    // Reaches every open tab of the user
    public Task SendAsync(Guid userId, string eventName, object payload) =>
        hub.Clients.User(userId.ToString()).SendAsync(eventName, payload);
}
