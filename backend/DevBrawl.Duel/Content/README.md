# Duel content

Implements `IChallengeCatalog` and `IAnswerChecker` from `Contracts/`. Challenges are loaded from `backend/Questions` (copied into the build output) the first time the catalog is resolved. Category ids come from the `Categories` table. Registration: `AddDuelContent()` in `DevBrawl.Infrastructure`, called from `AddInfrastructure`.

## `PreparedChallenge.ClientView`

Sent to both players as-is. Every type has:

```json
{
  "challengeId": "sec-fix-01",
  "type": "fixTheBug",
  "category": { "id": 3, "slug": "security", "name": "Security" },
  "title": "Searching players by nickname",
  "prompt": "..."
}
```

Plus, per type:

| Type | Extra fields |
|---|---|
| `conceptQuiz` | `options: [{ id, text }]`, ids `a`–`d` in display order |
| `codeInvestigation` | `files: [{ path, language, content }]` |
| `fixTheBug` | `code: { language, content }`, `options: [{ id, summary, code }]` (`code` in the same language) |
| `followTheRequest` | `steps: [{ id, text }]`, shuffled, never already in the correct order; ids are random per round |
| `logAnalysis` | `logs: [string]`; line `n` is `logs[n - 1]` |

The view is built from an allowlist, so it never contains `correctOptionId`, `commonMistake`, `answer`, `rootCauseLine`, `outcome` or `explanation`.

## `GetReveal(challengeId, answerKey)`

Shown after the round. The ids match the ones in that round's `ClientView`. Every type has `challengeId` and `explanation`, plus:

| Type | Extra fields |
|---|---|
| `conceptQuiz` | `correctOptionId`, `commonMistake: { optionId, explanation }` |
| `codeInvestigation` | `answer: { path, lines: [start, end] }` (lines 1-based, for highlighting) |
| `fixTheBug` | `correctOptionId`, `outcomes: [{ optionId, outcome }]` for every option |
| `followTheRequest` | `correctOrder: [stepId]` |
| `logAnalysis` | `rootCauseLine` |

## `AnswerKey`

A small JSON string that holds everything needed to check and reveal one round. The engine stores it on the round and treats it as opaque. Because checking needs only the key, rounds stored before a restart can still be checked.
