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

An interview is a chat: the interviewer opens with a question, reacts to each answer (sometimes with one follow-up), and after `Interview:MaxAnswers` answers (default 3) closes the interview and gives overall feedback. All endpoints need the `Authorization: Bearer` header:

- `GET /api/interview/topics`: categories and lessons to interview about.
- `GET /api/interview/sessions`: your last 20 interviews, `[{ id, title, status, score, createdAt }]`.
- `POST /api/interview/sessions` with `{ "lessonId": "primary-foreign-keys" }`, `{ "categoryId": "databases" }` (all its lessons) or `{}` (random category): starts an interview and returns the session with the opening message.
- `GET /api/interview/sessions/{id}`: the session `{ id, title, status, answersGiven, maxAnswers, messages: [{ id, role, content, createdAt }], evaluation }`. `role` is `interviewer` or `candidate`; `status` is `active` or `finished`; `evaluation` is `{ score, summary, strengths, improvements }` once finished.
- `POST /api/interview/sessions/{id}/messages` with `{ "content": "..." }` (up to 2000 characters): adds your answer and the interviewer's reply and returns the session. If the AI fails, nothing is saved and you can resend.
- `POST /api/interview/sessions/{id}/finish`: ends the interview early and evaluates the answers so far (also retries a failed evaluation).
- `POST /api/interview/sessions/{id}/transcribe` with a multipart `audio` file (WAV, MP3, OGG, FLAC or AAC, up to 5 MB): returns `{ sessionId, text }`, the spoken answer as text.

The lessons come from `frontend/src/learn/content.ts`, exported to `backend/DevBrawl.Interview/Knowledge/learn-content.json`. The backend build re-exports it when `content.ts` changes (needs Node 22.18+); a test fails if the JSON is out of date.

Settings in the `Gemini` section of `appsettings.json`: `Model` (default `gemini-3.5-flash-lite`), `ThinkingLevel` (default `low`, which keeps replies to a few seconds; empty uses the model's slower default) and `TimeoutSeconds` (default 120).

In the app, open **Interview** on the main page, pick a topic and start. Answer in the chat box (Enter sends, Shift+Enter adds a line) or press the microphone: the browser records, converts to WAV and sends it to `transcribe`, and the text lands in the box to check before sending. Past interviews are in the history on the left.

Starting, every answer, the final feedback and every transcription are one AI call each (a full interview is about 5), so they share a per-user rate limit: 30 per hour by default (`Interview:RateLimit:RequestsPerHour`). Past the limit they return 429 with a `Retry-After` header; a user gets one request back every 60 / limit minutes.

## Google sign-in

The login and signup pages show a "Continue with Google" button once a Google client ID is set. Without one, the button is hidden and `POST /api/auth/google` answers 503.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create credentials of type **OAuth client ID**, application type **Web application**. If asked, set up the consent screen first (External, app name and support email are enough).
2. Under **Authorized JavaScript origins** add `http://localhost:5173` and `http://localhost`. No redirect URI is needed.
3. Put the client ID in `backend/DevBrawl.Api/appsettings.json` under `"Google": { "ClientId": "...apps.googleusercontent.com" }`. The client ID is public (it ships to the browser), so it can be committed. Don't create or use a client secret.

How it works: the Google button gives the frontend an ID token, and the backend checks it with `Google.Apis.Auth` (signature, expiry, audience = our client ID) before issuing the usual JWT and refresh token.

- A returning Google user is logged in.
- A Google account whose verified email matches an existing account is linked to that account, and the password still works.
- A new user gets `status: "nicknameRequired"` with a suggested username. The frontend asks them to pick one and sends the same ID token again with `nickname`. Nothing is saved until then.

Google-only accounts have no password. They can set one in settings without a current password, and changing the email needs a password, so they have to set one first.

## Other commands

```bash
dotnet build DevBrawl.slnx   # build backend
cd frontend && npm run build # type-check + build frontend
cd frontend && npm run lint  # lint frontend
```
