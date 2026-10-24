# DevBrawl

A web app for learning programming through general concepts (not syntax). It has a learning section similar to Duolingo and a duel section similar to Chess.com, where users compete by answering quiz questions.

## Structure

- `frontend/`: React 19 + TypeScript + Vite
- `backend/`: .NET (`DevBrawl.Api`)

## Language

All project files, code comments, documentation and UI copy are written in English. Chat replies with the user can be in their language.

## Design

The frontend visual style is defined in [frontend/DESIGN.md](frontend/DESIGN.md). Before building or changing any UI, read that document and follow its rules: palette, typography, radius, motion and the anti-slop list.

Key points:
- Dark theme, cyber cyan palette. The duel uses magenta as its accent.
- Text: Share Tech Mono. Code: Martian Mono Bold.
- Sidebar navigation on desktop, Tabler outline icons.
- Colors, spacing and radius go through tokens, never hardcoded.
