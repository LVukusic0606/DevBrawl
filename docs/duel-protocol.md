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
| `InviteFriend` | `friendId` | — |
| `AcceptInvite` | `inviteId` | — |
| `DismissInvite` | `inviteId` | — |
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
| `MatchFound` | `{ duelId, you, opponent, friendly, startsAt }` — `you`/`opponent`: `{ id, nickname, avatarId, ratings }` (`avatarId` null when not picked), `ratings` maps category id → rating |
| `RoundStarted` | `{ duelId, roundNumber, type, categoryId, challenge, timeLimitSeconds, endsAt }` |
| `AnswerAccepted` | `{ duelId, roundNumber }` — your answer was recorded |
| `OpponentAnswered` | `{ duelId, roundNumber }` — never says whether it was correct |
| `RoundEnded` | `{ duelId, roundNumber, youAnswered, youCorrect, opponentAnswered, opponentCorrect, result, yourScore, opponentScore, reveal }` |
| `DuelEnded` | `{ duelId, result, yourScore, opponentScore, friendly, ratingChanges, xpGained, totalXp, level }` |
| `DuelState` | full state, see "Reconnecting" |
| `OpponentDisconnected` / `OpponentReconnected` | `{ duelId }` |
| `DuelAborted` | `{ duelId, reason }` — server error; the duel doesn't count |
| `DuelInviteSent` | `{ inviteId, from, to, expiresAt }` — your invite is pending; `from`/`to`: `{ id, nickname }` |
| `DuelInviteReceived` | same payload — a friend invited you |
| `DuelInviteClosed` | `{ inviteId, reason }` — the invite is no longer pending |

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

## Friendly duels

Friends (see `/api/friends` below) can play friendly duels: the same five rounds, but no ELO or XP changes. They don't count toward profile stats or the leaderboard, and `friendly` is `true` on `MatchFound`, `DuelState`, `DuelEnded` and in duel history. `ratingChanges` is empty and `xpGained` is 0.

```
InviteFriend(friendId) → DuelInviteSent (you) + DuelInviteReceived (friend)
  friend: AcceptInvite(inviteId) → DuelInviteClosed (accepted) → MatchFound { friendly: true } → normal duel
  friend: DismissInvite(inviteId) → DuelInviteClosed (declined)
  you:    DismissInvite(inviteId) → DuelInviteClosed (canceled)
  nobody answers within Duel:InviteSeconds (60) → DuelInviteClosed (expired)
```

- `InviteFriend` is refused unless the two players are friends, or when the friend is in a duel. The refusal reaches the client as a rejected `invoke()` with the message after `HubException: `.
- One outgoing invite per player: a new one replaces the old one (`canceled`). Inviting a friend who already invited you accepts their invite.
- Inviting takes you out of the queue; joining the queue or leaving the arena (closing the last connection) withdraws your invite (`canceled`). Invites you received stay pending while you're away and are sent again (`DuelInviteReceived`) when you connect.
- When a duel starts, every other invite of both players closes with `unavailable`. Removing a friend closes invites between the two the same way.
- `reason`: `accepted`, `declined`, `canceled`, `expired`, `unavailable`.

## Reconnecting

The clock never stops. A player who is away when a round times out gets "no answer" for it.

When a user connects (or calls `JoinQueue`) while they are in a running duel, the server sends `DuelState`:

```
{ duelId, you, opponent, friendly, phase, roundNumber, phaseEndsAt,
  currentRound,      // RoundStarted payload, null during the countdown
  youAnswered, opponentAnswered, yourScore, opponentScore,
  lastRoundEnded }   // RoundEnded payload, only during the reveal
```

`phase` is `countdown`, `round` or `reveal`. Rebuild the screen from it.

## REST

Both need the usual `Authorization: Bearer` header.

- `GET /api/duels?limit=20` — your recent duels, newest first: `[{ id, status, friendly, opponent: { id, nickname }, result, yourScore, opponentScore, startedAt, finishedAt }]`. `status`: `inProgress`, `finished`, `abandoned`. `result` is null unless finished.
- `GET /api/duels/{id}` — `{ summary, rewards, rounds }` for the results review. Each round: `{ roundNumber, type, categoryId, challenge, yourAnswer, youCorrect, opponentAnswered, opponentCorrect, result, reveal }`. 404 if you didn't play in it.

Friends (every change returns the updated `{ friends, incoming, outgoing }`):

- `GET /api/friends` — `friends: [{ user, since }]` by nickname; `incoming`/`outgoing: [{ id, user, sentAt }]`, newest first. `user`: `{ id, nickname, avatarId, tag, rating }` (`rating` is the overall rating).
- `POST /api/friends/requests` `{ nickname }` — matched ignoring case. If that player already sent you a request, it's accepted instead. 404 unknown nickname, 400 yourself, 409 already friends or already sent.
- `POST /api/friends/requests/{id}/accept` — only the receiver can accept. 404 otherwise.
- `DELETE /api/friends/requests/{id}` — decline a request you received or withdraw one you sent.
- `DELETE /api/friends/{userId}` — remove a friend.
- `GET /api/profiles/{userId}` also returns `friendship: { state, requestId }` (`state`: `none`, `friends`, `requestSent`, `requestReceived`), null on your own profile.
