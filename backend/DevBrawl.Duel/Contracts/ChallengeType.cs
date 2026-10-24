namespace DevBrawl.Duel.Contracts;

// The value is also the round number: every duel plays round 1 (A) to round 5 (E) in this order
public enum ChallengeType
{
    ConceptQuiz = 1,
    CodeInvestigation = 2,
    FixTheBug = 3,
    FollowTheRequest = 4,
    LogAnalysis = 5
}
