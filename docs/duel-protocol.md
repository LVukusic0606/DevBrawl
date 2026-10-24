# Duel protocol

How the frontend plays a 1v1 duel. Duels run over SignalR; duel history is plain REST.

Try it without the frontend: start the backend and open http://localhost:5287/dev/duel-test.html in two tabs, logged in as two different users.

## Connecting

Package: `@microsoft/signalr`.

```ts
import * as signalR from '@microsoft/signalr'

const connection = new signalR.HubConnectionBuilder()
  .withUrl('/hubs/duel', { accessTokenFactory: () => getAccessToken() })
  .withAutomaticReconnect()
  .build()

connection.on('RoundStarted', (e) => { /* ... */ })
// register every event before start()
await connection.start()
```

- The access token goes in the query string (browsers can't set headers on WebSockets); `accessTokenFactory` does that. Return a fresh token: it's called on every (re)connect.
- The Vite dev server proxies `/hubs` to the backend, WebSockets included.
- A user can have several tabs open; events go to all of them.

## Client → server

Call with `connection.invoke(...)`.

| Method | Arguments | Returns |
|---|---|---|
| `JoinQueue` | — | — |
| `LeaveQueue` | — | — |
| `SubmitAnswer` | `duelId`, `roundNumber`, `answer` (shape below) | `{ ok, error }` |

`SubmitAnswer` returns `{ ok: false, error: "..." }` when the answer is refused (wrong round, already answered, time is up); `error` can be shown to the player. The promise only rejects on real failures (connection lost, server error).

Answer shapes, one per challenge type:

| Type | `answer` |
|---|---|
| `conceptQuiz` | `{ "optionId": "c" }` |
| `codeInvestigation` | `{ "path": "src/middleware/requireAuth.ts" }` |
| `fixTheBug` | `{ "optionId": "b" }` |
| `followTheRequest` | `{ "stepIds": ["k3", "a9", "x1", "p0"] }` — every step, in the player's order |
| `logAnalysis` | `{ "line": 2 }` — 1-based |

An answer can't be changed once submitted.

## Server → client

All times are UTC ISO strings. Enums are camelCase strings. Results are always from the receiving player's point of view (`you` / `opponent`).

| Event | Payload |
|---|---|
| `QueueJoined` | `{}` |
| `QueueLeft` | `{}` |
| `MatchFound` | `{ duelId, you, opponent, startsAt }` — `you`/`opponent`: `{ id, nickname, ratings }`, `ratings` maps category id → rating |
| `RoundStarted` | `{ duelId, roundNumber, type, categoryId, challenge, timeLimitSeconds, endsAt }` |
| `AnswerAccepted` | `{ duelId, roundNumber }` — your answer was recorded |
| `OpponentAnswered` | `{ duelId, roundNumber }` — never says whether it was correct |
| `RoundEnded` | `{ duelId, roundNumber, youAnswered, youCorrect, opponentAnswered, opponentCorrect, result, yourScore, opponentScore, reveal }` |
| `DuelEnded` | `{ duelId, result, yourScore, opponentScore, ratingChanges, xpGained, totalXp, level }` |
| `DuelState` | full state, see "Reconnecting" |
| `OpponentDisconnected` / `OpponentReconnected` | `{ duelId }` |
| `DuelAborted` | `{ duelId, reason }` — server error; the duel doesn't count |

- `challenge` is the challenge without answers; its fields per type are in [backend/DevBrawl.Duel/Content/README.md](../backend/DevBrawl.Duel/Content/README.md) (`ClientView`). So is `reveal` (`GetReveal`).
- Round `result`: `won`, `lost`, `draw` (both correct at the same instant), `noWinner` (both wrong or no answer).
- Duel `result`: `won`, `lost`, `draw`. The score counts rounds won.
- `ratingChanges`: `[{ categoryId, before, after, delta }]`, one per category played.

## Flow

```
JoinQueue → QueueJoined → (wait) → MatchFound
  countdown until startsAt
  ×5: RoundStarted → SubmitAnswer → AnswerAccepted / OpponentAnswered → RoundEnded → reveal pause
DuelEnded (right after round 5's RoundEnded)
```

- Rounds 1–5 are always `conceptQuiz`, `codeInvestigation`, `fixTheBug`, `followTheRequest`, `logAnalysis`.
- A round ends when both players have answered or at `endsAt`. Count down to `endsAt`, not from `timeLimitSeconds`, so both players see the same clock. Limits per type are in `appsettings.json` (`Duel:RoundTimeLimitsSeconds`).
- After `RoundEnded` there's a short pause (`Duel:RevealSeconds`) before the next `RoundStarted`. Show the reveal during it.

## Reconnecting

The clock never stops. A player who is away when a round times out gets "no answer" for it.

When a user connects (or calls `JoinQueue`) while they are in a running duel, the server sends `DuelState`:

```
{ duelId, you, opponent, phase, roundNumber, phaseEndsAt,
  currentRound,      // RoundStarted payload, null during the countdown
  youAnswered, opponentAnswered, yourScore, opponentScore,
  lastRoundEnded }   // RoundEnded payload, only during the reveal
```

`phase` is `countdown`, `round` or `reveal`. Rebuild the screen from it.

## REST

Both need the usual `Authorization: Bearer` header.

- `GET /api/duels?limit=20` — your recent duels, newest first: `[{ id, status, opponent: { id, nickname }, result, yourScore, opponentScore, startedAt, finishedAt }]`. `status`: `inProgress`, `finished`, `abandoned`. `result` is null unless finished.
- `GET /api/duels/{id}` — `{ summary, rewards, rounds }` for the results review. Each round: `{ roundNumber, type, categoryId, challenge, yourAnswer, youCorrect, opponentCorrect, result, reveal }`. 404 if you didn't play in it.
