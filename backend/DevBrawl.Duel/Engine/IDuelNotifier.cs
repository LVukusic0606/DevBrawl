namespace DevBrawl.Duel.Engine;

// Sends a SignalR event to every connection of a user. Implemented in DevBrawl.Api.
public interface IDuelNotifier
{
    Task SendAsync(Guid userId, string eventName, object payload);
}
