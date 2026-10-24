using System.Text.Json.Nodes;

namespace DevBrawl.Duel.Contracts;

// Implemented by content (Ivancic), used by the engine (Luka).
// Challenges are loaded from backend/Questions into memory at startup.
public interface IChallengeCatalog
{
    // A random challenge of this type from any category, prepared for one round
    PreparedChallenge GetRandom(ChallengeType type);

    // Correct answer and explanation, shown after the round and in the results review
    JsonObject GetReveal(string challengeId, string answerKey);
}
