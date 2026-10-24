using System.Text.Json;

namespace DevBrawl.Duel.Contracts;

// Implemented by content (Ivancic), used by the engine (Luka).
//
// Answer JSON sent by the client, per type:
//   ConceptQuiz        { "optionId": "c" }
//   CodeInvestigation  { "path": "src/middleware/requireAuth.ts" }
//   FixTheBug          { "optionId": "b" }
//   FollowTheRequest   { "stepIds": ["k3", "a9", "x1", "p0"] }   full order, all or nothing
//   LogAnalysis        { "line": 2 }                             1-based
public interface IAnswerChecker
{
    // A malformed or empty answer is incorrect; never throws
    bool IsCorrect(ChallengeType type, string answerKey, JsonElement answer);
}
