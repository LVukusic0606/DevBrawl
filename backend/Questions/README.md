# Brawl challenges

Seed content for Brawl duels (spec sections 7 and 14): 60 challenges, 10 per category, 2 of each challenge type.

| File | Category |
|---|---|
| `apis-networking.json` | APIs & Networking |
| `databases.json` | Databases |
| `security.json` | Security |
| `debugging.json` | Debugging |
| `system-design.json` | System Design |
| `infrastructure.json` | Infrastructure |

Every file follows [challenge.schema.json](challenge.schema.json). Editors that support JSON Schema (VS Code does) validate the files and autocomplete fields as you type.

These files are not loaded by the backend yet. When the challenge model exists, seed it from these files at startup and keep the `id` as the stable key.

## Format

A file holds one category and its challenges:

```json
{
  "$schema": "./challenge.schema.json",
  "category": { "id": "databases", "name": "Databases" },
  "challenges": [ ... ]
}
```

Every challenge has `id`, `type`, `title`, `prompt` and `explanation`. The `explanation` is shown after the round. The rest depends on `type`:

| Type | Round | Player action | Answer fields |
|---|---|---|---|
| `conceptQuiz` | A | Pick one of 4 options | `options`, `correctOptionId`, `commonMistake` (the most plausible wrong option and why it's wrong) |
| `codeInvestigation` | B | Read the `files` and pick the one where the problem originates | `answer.path` (graded), `answer.lines` (highlighted after the round) |
| `fixTheBug` | C | Pick one of 4 candidate fixes for `code` | `options` (each with `code` and the simulated `outcome`), `correctOptionId` |
| `followTheRequest` | D | Put shuffled `steps` in order; all or nothing | `steps`, stored in the correct order |
| `logAnalysis` | E | Click the log line that reveals the root cause | `logs`, `rootCauseLine` (1-based) |

## Rules for the server

- Never send answer fields (`correctOptionId`, `commonMistake`, `answer`, `rootCauseLine`, `outcome`, `explanation`) before the round ends.
- Shuffle `options` and `steps` before sending, and give steps random ids, because their stored order is the answer.
- Round time limits are configured per challenge type, not stored here.

## Adding a challenge

- Use the next free id for the category and type, e.g. `db-fix-03`. Prefixes: `api`, `db`, `sec`, `dbg`, `sys`, `infra`. Never change or reuse an id once a duel references it.
- There must be exactly one defensible answer. Wrong options should be plausible mistakes, not jokes.
- In Code Investigation and Log Analysis, the other files and lines should include realistic red herrings and symptoms, so the player has to tell symptoms from the cause.
- Keep it short: a round has to be readable within its time limit.
