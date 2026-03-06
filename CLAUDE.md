# Yantri v3 — Narrative Intelligence Orchestrator

## Project Overview

Yantri is the cognitive middle-layer of a three-engine infrastructure (Khabri → Yantri → Relay). It transforms raw signals into high-precision editorial, marketing, and operational deliverables using autonomous "Narrative Trees" and semantic caching, with a multi-model AI approach for maximum strategic depth and creative precision.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript (strict mode)
- **Database**: PostgreSQL + pgvector via Prisma ORM (semantic memory for Narrative Trees)
- **Auth**: NextAuth v4 with credentials provider (bcryptjs for password hashing)
- **AI Models**:
  - **Gemini 2.5 Flash**: Strategy, long-context ingestion, research synthesis (via `@google/genai`)
  - **Claude Sonnet 4**: High-precision drafting, voice-mimicry, final packaging (via `@anthropic-ai/sdk`)
- **Model Router**: `src/lib/modelRouter.ts` — delegates tasks to optimal model by type
- **Workflow Engine**: Inngest for durable, long-running research/generation tasks
- **Styling**: Tailwind CSS 3
- **Fonts**: Geist Sans (local woff)

## Project Structure

```
src/
  app/
    (app)/              # Authenticated route group
      dashboard/        # Narrative Tree overview + stats
      workspace/        # Mobile-responsive Approve & Push screen
      brands/           # Brand management
      trends/           # Trend import + viewing
      plan/[batchId]/   # Planning interface with content preview
      history/          # Editorial log
      performance/      # Performance tracking
      platform-rules/   # Platform routing rules
    api/
      ingest/           # Khabri Gateway — semantic throttling + tree creation
      inngest/          # Inngest serve endpoint for durable workflows
      relay/publish/    # Relay handoff endpoint
      yantri/           # AI functions (scan, research, generate, package)
      brands/           # Brand CRUD
      narratives/       # Narrative CRUD
      trends/           # Trend management
    login/              # Public login page
    layout.tsx          # Root layout with Providers wrapper
    providers.tsx       # Client-side providers (SessionProvider)
  components/           # Shared UI components
  lib/
    modelRouter.ts      # AI model router (Gemini vs Claude by task type)
    gemini.ts           # Gemini 2.5 Flash client with retry + JSON mode
    embeddings.ts       # Vector embedding generation for pgvector
    prompts.ts          # System prompts for all AI pipelines
    auth.ts             # NextAuth configuration
    prisma.ts           # Prisma client singleton
    inngest/
      client.ts         # Inngest client
      functions.ts      # Durable workflow functions
    engines/
      index.ts          # Content + packaging engine orchestrator
      nanoBanana.ts     # Visual prompt generator (structural prompts)
      hrOps.ts          # HR/Operations content engine
  middleware.ts         # NextAuth route protection
prisma/
  schema.prisma         # PostgreSQL + pgvector schema
  seed.ts               # Database seed script
```

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx prisma db push` — Apply schema to PostgreSQL
- `npx prisma generate` — Regenerate Prisma client
- `npx prisma migrate dev` — Create and apply migration
- `npx tsx prisma/seed.ts` — Seed the database
- `npx inngest-cli dev` — Start Inngest dev server (for local workflow testing)

## Key Conventions

- Path alias: `@/*` maps to `./src/*`
- **Model Router**: Use `routeToModel(taskType, systemPrompt, userMessage)` — task types: `strategy`, `research`, `drafting`, `packaging`, `analysis`, `visual`
- **Narrative Trees**: Semantic deduplication via pgvector. New signals check similarity > 0.9 before creating new trees
- Prisma models use native `Json` type where possible; legacy string-JSON fields still use `JSON.parse()`
- Authenticated routes under `(app)` route group; middleware protects them
- API routes follow RESTful patterns
- Inngest handles long-running tasks (research, content generation) as durable workflows

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/yantri`)
- `GEMINI_API_KEY` — Google Gemini API key
- `ANTHROPIC_API_KEY` — Anthropic Claude API key
- `NEXTAUTH_SECRET` — NextAuth session secret
- `NEXTAUTH_URL` — App URL (e.g., `http://localhost:3000`)
- `ELEVENLABS_API_KEY` — ElevenLabs TTS API key (for voiceover generation)
- `INNGEST_EVENT_KEY` — Inngest event key (optional for dev)

## Database

PostgreSQL with pgvector extension. Core models:

- **NarrativeTree** — Semantic memory: deduplicates signals via vector embeddings
- **NarrativeNode** — Individual signals attached to a tree
- **FactDossier** — Synthesized research locked to a tree
- **ContentPiece** — Multi-platform deliverables with status lifecycle
- **Brand** — Editorial identity with voice rules and platform config
- **Narrative** — Links Trend → Brand with angle, platform, and content

Content lifecycle: `PLANNED → RESEARCHING → DRAFTED → APPROVED → RELAYED → PUBLISHED`

## Multi-Agent Workflow

1. **Ingestion** (Khabri Gateway): Signals vectorized → pgvector similarity check → branch or create NarrativeTree
2. **Research** (Fact Engine): Gemini synthesizes web research into structured FactDossier
3. **Strategy** (Gemini): Reads brand identity + dossier + performance → decides platform routing
4. **Drafting** (Claude): Writes platform-specific content with brand voice precision
5. **Packaging** (Claude): Generates titles, thumbnails, SEO, posting plans
6. **Approval** (Workspace): Human approves via mobile-responsive interface
7. **Relay** (Handoff): Approved content pushed to Relay system for publishing
