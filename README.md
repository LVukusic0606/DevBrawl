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

## Other commands

```bash
dotnet build DevBrawl.slnx   # build backend
cd frontend && npm run build # type-check + build frontend
cd frontend && npm run lint  # lint frontend
```
