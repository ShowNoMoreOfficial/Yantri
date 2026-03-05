# Yantri v3: The Narrative Intelligence Blueprint

## 1. Executive Summary

Yantri is the cognitive middle-layer of a three-engine infrastructure (Khabri → Yantri → Relay). It transforms raw signals into high-precision editorial, marketing, and operational deliverables. It utilizes autonomous "Narrative Trees" and semantic caching to eliminate redundant research and costs, while employing a multi-model approach for maximum strategic depth and creative precision.

## 2. The Tech Stack (Optimized & Future-Proof)

* **Framework:** Next.js 15 (App Router, PWA enabled for remote access).
* **Database:** PostgreSQL + **pgvector** (Essential for semantic memory and Narrative Trees).
* **Workflow Engine:** **Temporal.io** or **Inngest** (For durable, long-running research/generation tasks).
* **AI Models:** 
  * **Gemini 1.5 Pro:** Strategic planning, long-context ingestion (2M tokens), and feedback loop analysis.
  * **Claude 3 Opus:** High-precision drafting, voice-mimicry (Bhupen/Squirrels), and final packaging.
* **Visual Foundry:** **Nano Banana Logic** (Local GPU-based structural prompts for X/Meta; no 3rd party APIs).

## 3. Core Data Schema (Prisma Blueprint)

```prisma
// High-level schema logic
model Brand {
  id                String   @id @default(cuid())
  name              String   // Breaking Tube, The Squirrels, ShowNoMore
  identityMarkdown  String   // Ingests the Identity MD files
  voiceRules        Json
  deliverables      ContentPiece[]
}

model NarrativeTree {
  id                String   @id @default(cuid())
  rootTrend         String   // The primary signal title
  embedding         Unsupported("vector(1536)") 
  nodes             NarrativeNode[]
  factDossier       FactDossier?
}

model NarrativeNode {
  id                String   @id @default(cuid())
  treeId            String
  signalData        Json     // Khabri payload
  identifiedAt      DateTime @default(now())
}

model FactDossier {
  id                String   @id @default(cuid())
  treeId            String   @unique
  structuredData    Json     // Stats, Quotes, Timelines
  sources           String[]
  lastUpdated       DateTime @updatedAt
}

model ContentPiece {
  id                String   @id @default(cuid())
  brandId           String
  platform          Platform // YOUTUBE, X_THREAD, LINKEDIN_POST, etc.
  status            Status   // PLANNED, RESEARCHING, DRAFTED, APPROVED, RELAYED
  bodyText          String
  visualPrompts     String   // Nano Banana structural prompts
  performanceData   Json?    // Fed back from Relay
}
```

## 4. Multi-Agent Workflow

### Phase 1: Ingestion & Throttling (Khabri Gateway)

* **Action:** Khabri cron job hits `/api/ingest`.
* **Logic:** Vectorize the trend. Query `pgvector` for similarity > 0.9.
* **Branching:**
  * **Old Narrative:** Append signal to existing `NarrativeTree`. Trigger "Gap Analysis" to see if a new deliverable is actually needed.
  * **New Narrative:** Create a new Tree. Mark for `Strategist Agent` review.

### Phase 2: On-Demand Research Core (Fact Engine)

* **Trigger:** Manual approval or autonomous high-impact detection.
* **Process:** 
  1.  **Search:** Tavily/Exa API scrapes the web for raw context.
  2.  **Synthesis:** **Gemini 1.5 Pro** digests thousands of lines of raw text into a structured, expert-level `FactDossier`.
  3.  **Storage:** The dossier is locked in the DB, becoming the single source of truth for all departments.

### Phase 3: The Multi-Model Foundry (Foundry Phase)

* **The Strategist (Gemini 1.5 Pro):** Reads the Brand identity, the `FactDossier`, and the performance feedback loop. It decides: *"This is a Twitter thread for The Squirrels and a LinkedIn post for ShowNoMore HR."*
* **The Craftsman (Claude 3 Opus):** Receives the strategy and the dossier. It writes:
  * **Editorial:** High-stakes Hinglish scripts for Bhupen (Breaking Tube) or analytical threads (The Squirrels).
  * **Operations/HR:** Growth-focused LinkedIn posts detailing agency methodology or hiring.
* **Nano Banana Generation:** Yantri generates raw structural prompts (e.g., *"Wide shot, 35mm, cinematic lighting, corporate-tech aesthetic, hex codes #001f3f..."*) for visual assets.

## 5. Implementation Roadmap for Claude Code (Anti-Gravity)

### Stage 1: The Brain (API & Schema)

1. Initialize Next.js 15 project.
2. Deploy the PostgreSQL + pgvector schema.
3. Build the `modelRouter.ts` to handle dynamic switching between Gemini 1.5 Pro and Claude 3 Opus based on task type.

### Stage 2: The Memory (Ingestion Logic)

1. Build the `/api/ingest` endpoint.
2. Implement the **Narrative Tree** logic: semantic search check -> branch update or new tree creation.
3. Setup the **Fact Engine**: Integration with Tavily and the Gemini 1.5 Pro "Fact Extractor" prompt.

### Stage 3: The Factory (Specialist Engines)

1. Develop the `lib/engines/` directory with platform-specific prompts (X, LinkedIn, YouTube).
2. Hardcode the **Nano Banana** prompt generation logic into the Packaging phase.
3. Build the **HR/Ops Engine** to ensure departmental deliverables are treated with the same priority as news.

### Stage 4: The Interface (Remote Command Center)

1. Build the `/dashboard` (Narrative Tree overview).
2. Build the `/workspace` (The mobile-responsive "Approve & Push" screen).
3. Connect the Relay handoff endpoint (`POST /api/relay/publish`).

---

**System Goal:** To reach 100% autonomous delivery capability where the only human intervention is an "Approve" button press on a smartphone, while the system manages complex narratives across infinite brands and platforms.
