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

## Other commands

```bash
dotnet build DevBrawl.slnx   # build backend
cd frontend && npm run build # type-check + build frontend
cd frontend && npm run lint  # lint frontend
```
