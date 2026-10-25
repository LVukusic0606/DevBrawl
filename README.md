# DevBrawl

## Stack

- **Backend:** ASP.NET Core Web API (.NET 10) — `backend/DevBrawl.Api`
- **Frontend:** React 19 + Vite + TypeScript — `frontend/`

## Requirements

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- Node.js 20.19+ and npm

## Running locally

Start the backend and frontend in two terminals.

**Backend** (http://localhost:5287):

```bash
dotnet run --project backend/DevBrawl.Api
```

**Frontend** (http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server forwards every request starting with `/api` to the backend, so frontend code calls the API with relative URLs:

```ts
const res = await fetch('/api/health')
```

To check that both are wired up, open http://localhost:5173/api/health — it should return `{"status":"ok"}`.

## Conventions

- Put all backend routes under `/api`, e.g. `[Route("api/[controller]")]` on controllers.
- OpenAPI spec (development only): http://localhost:5287/openapi/v1.json
- Swagger UI (development only): http://localhost:5287/swagger
- Duels run over SignalR at `/hubs/duel`; the protocol is in [docs/duel-protocol.md](docs/duel-protocol.md). To try a duel without the frontend, open http://localhost:5287/dev/duel-test.html (development only) in two tabs and log in as two different users.

## Database

The backend uses a locally installed PostgreSQL (no Docker) through EF Core + Npgsql. The development connection string in `backend/DevBrawl.Api/appsettings.Development.json` expects `postgres`/`postgres` on `localhost:5432`, database `devbrawl`. If your local password differs, override it without editing the file:

```bash
cd backend/DevBrawl.Api
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=devbrawl;Username=postgres;Password=<yours>"
```

Migrations (needs `dotnet tool install -g dotnet-ef`):

```bash
cd backend
dotnet ef migrations add <Name> --project DevBrawl.Infrastructure --startup-project DevBrawl.Api --output-dir Data/Migrations
dotnet ef database update --project DevBrawl.Infrastructure --startup-project DevBrawl.Api
```

Backend projects: `DevBrawl.Api` (controllers, Program.cs) → `DevBrawl.Infrastructure` (DbContext, migrations, repositories, services) → feature projects with domain entities and DTOs: `DevBrawl.Auth` (users, tokens), `DevBrawl.Common` (categories, shared by Learn and Duel), `DevBrawl.Duel` (duels; `Contracts/` holds the interfaces between the engine and content/scoring — change only after agreeing).

Check the connection at http://localhost:5287/api/health/db.

To browse the database in pgAdmin 4, import `backend/pgadmin-servers.json` via **Tools → Import/Export Servers** (password: `postgres`).

## Interview (AI)

`backend/DevBrawl.Interview` uses an AI model to ask open questions about the Learn lessons and grade the user's written answers. It uses the Gemini API. Without an API key the interview endpoints answer 503 and everything else works.

Set your own key in user secrets (stored in your home folder, never in the repo):

```bash
cd backend/DevBrawl.Api
dotnet user-secrets set "Gemini:ApiKey" "<your Gemini key>"   # or export GEMINI_API_KEY
```

Never put a key in `appsettings.json` (it's committed). A `.env` file isn't read by .NET.

All endpoints need the `Authorization: Bearer` header:

- `GET /api/interview/topics`: categories and lessons that can be asked about.
- `POST /api/interview/questions` with `{ "lessonId": "primary-foreign-keys" }`, `{ "categoryId": "databases" }` or `{}` for a random lesson (ids are the Learn ones from `topics`, not the numeric duel category ids): returns `{ id, categoryId, categoryTitle, lessonId, lessonTitle, question, createdAt }`.
- `POST /api/interview/questions/{id}/transcribe` with a multipart `audio` file (WAV, MP3, OGG, FLAC or AAC, up to 5 MB, about 2 minutes of 16 kHz WAV): returns `{ questionId, text }`, the spoken answer as text (empty if no speech was heard). Only for your own unanswered questions.
- `POST /api/interview/questions/{id}/answer` with `{ "answer": "..." }` (up to 2000 characters, once per question): returns `{ questionId, verdict, score, feedback, strengths, improvements, modelAnswer }`. `verdict` is `correct`, `partiallyCorrect` or `incorrect`; `score` is 0 to 100.

The lessons come from `frontend/src/learn/content.ts`, exported to `backend/DevBrawl.Interview/Knowledge/learn-content.json`. The backend build re-exports it when `content.ts` changes (needs Node 22.18+); a test fails if the JSON is out of date.

Settings in the `Gemini` section of `appsettings.json`: `Model` (default `gemini-3.5-flash-lite`), `ThinkingLevel` (default `low`, which keeps replies to a few seconds; empty uses the model's slower default) and `TimeoutSeconds` (default 120).

In the app, open **Interview** on the main page: pick a topic, then type your answer or press **Record answer**. The browser records the microphone, converts it to WAV and sends it to `transcribe`; the text appears in the answer box to check and edit before submitting.

Each question, transcription and answer is one AI call, so they share a per-user rate limit: 30 per hour by default (`Interview:RateLimit:RequestsPerHour`). Past the limit they return 429 with a `Retry-After` header; a user gets one request back every 60 / limit minutes.

## Other commands

```bash
dotnet build DevBrawl.slnx   # build backend
cd frontend && npm run build # type-check + build frontend
cd frontend && npm run lint  # lint frontend
```
