using System.Text.Json.Nodes;

namespace DevBrawl.Duel.Contracts;

// One challenge prepared for one round. Both players get the same ClientView.
public sealed record PreparedChallenge(
    // Stable id from backend/Questions, e.g. "sec-fix-01"
    string ChallengeId,
    // Categories.Id
    int CategoryId,
    ChallengeType Type,
    // Sent to the players as-is: options and steps shuffled, no answer fields
    // (correctOptionId, commonMistake, answer, rootCauseLine, outcome, explanation)
    JsonObject ClientView,
    // Opaque to the engine: stored on the round and passed back to IAnswerChecker and IChallengeCatalog.GetReveal.
    // Needed because Follow the Request steps get random ids per round.
    string AnswerKey);
