# Yantri — Narrative Intelligence Orchestrator

## Project Overview

Yantri is a narrative intelligence platform for the ShowNoMore brand. It ingests trending topics, generates editorial narratives with AI, routes content to platforms, and tracks performance.

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript (strict mode)
- **Database**: SQLite via Prisma ORM
- **Auth**: NextAuth v4 with credentials provider (bcryptjs for password hashing)
- **AI**: Gemini 2.5 Flash via `@google/genai` (native JSON mode, retry with exponential backoff); Deep Research via `google-genai` Python SDK (Interactions API with `deep-research-pro-preview-12-2025` agent)
- **Styling**: Tailwind CSS 3
- **Fonts**: Geist Sans (local woff)

## Project Structure

```
src/
  app/
    (app)/          # Authenticated route group (dashboard, brands, trends, etc.)
    api/            # API routes (brands, narratives, trends, yantri AI endpoints, etc.)
    login/          # Public login page
    layout.tsx      # Root layout with Providers wrapper
    providers.tsx   # Client-side providers (NextAuth SessionProvider)
  components/       # Shared UI components (BrandForm, Sidebar, CopyButton, StatusBadge)
  lib/
    gemini.ts       # AI helper — Gemini 2.5 Flash with JSON mode and retry
    auth.ts         # NextAuth configuration
    prisma.ts       # Prisma client singleton
    prompts.ts      # System prompts for AI pipelines
  middleware.ts     # NextAuth route protection
prisma/
  schema.prisma     # Database schema
  seed.ts           # Database seed script
scripts/
  deep_research.py  # Python research script
```

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx prisma db push` — Apply schema changes to SQLite
- `npx prisma generate` — Regenerate Prisma client
- `npx tsx prisma/seed.ts` — Seed the database

## Key Conventions

- Path alias: `@/*` maps to `./src/*`
- Prisma models store JSON as stringified JSON in `String` fields (parse with `JSON.parse()`)
- The `callGemini()` function in `src/lib/gemini.ts` returns `{ parsed, raw }` — uses native JSON mode (`responseMimeType: "application/json"`) with markdown-fence fallback; retries transient errors up to 3 times with exponential backoff
- Authenticated routes live under the `(app)` route group; middleware protects them
- API routes follow RESTful patterns: `api/<resource>/route.ts` for list/create, `api/<resource>/[id]/route.ts` for get/update/delete

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — SQLite connection string (e.g., `file:./dev.db`)
- `GEMINI_API_KEY` — Google Gemini API key
- `NEXTAUTH_SECRET` — NextAuth session secret
- `NEXTAUTH_URL` — App URL (e.g., `http://localhost:3000`)

## Database

SQLite with Prisma. Key models: `Brand`, `Trend`, `TrendBatch`, `Narrative`, `PlatformRule`, `EditorialLog`, `PerformanceData`, `User`.

Narratives are the core entity — they link a `Trend` to a `Brand` with a specific angle, platform, and status lifecycle: `planned → researching → producing → published → killed`.
