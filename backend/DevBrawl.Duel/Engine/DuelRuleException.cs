namespace DevBrawl.Duel.Engine;

// A request the engine refuses (wrong round, already answered, time is up...). The message is shown to the player.
public sealed class DuelRuleException(string message) : Exception(message);
