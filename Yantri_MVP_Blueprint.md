# YANTRI MVP — Technical Blueprint for Claude Code

## WHAT THIS DOCUMENT IS
This is a complete technical specification for building Yantri as a web application. Feed this entire document to Claude Code. It contains everything needed: architecture, database schema, API routes, UI screens, AI integration, and build sequence.

## WHAT YANTRI IS
Yantri is a narrative intelligence orchestrator for a media-tech studio called ShowNoMore. It takes ranked news trends (from a system called Khabri), applies editorial judgment using brand identity rules and platform strategy rules, selects the best narrative angle, routes it to the right platform, generates research prompts, and produces ready-to-use prompts for downstream content engines (YouTube scripts, Twitter threads, blog articles).

Think of it as: a newsroom editor's brain in a web app. Trends go in, production plans come out.

## TECH STACK (MVP)
- Framework: Next.js 14 (App Router)
- Database: SQLite via Prisma ORM (easy, no external DB for MVP)
- Auth: NextAuth.js with credentials provider (email/password)
- AI: Anthropic Claude API (claude-sonnet-4-5-20250929) for editorial intelligence
- Styling: Tailwind CSS
- Deployment: Local development (localhost:3000) — deploy to Vercel later

## WHY THIS STACK
- Same stack as operator's existing tools (Khabri web, Relay) so developer can take over easily
- SQLite means zero infrastructure — just run it
- Claude API for all AI calls — operator already has Anthropic account
- Tailwind for fast UI iteration

---

## DATABASE SCHEMA (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./yantri.db"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  createdAt DateTime @default(now())
}

model Brand {
  id                String   @id @default(cuid())
  name              String   @unique
  tagline           String?
  language          String
  tone              String
  editorialCovers   String   // JSON array of topics this brand covers
  editorialNever    String   // JSON array of topics this brand never covers
  audienceSize      String?
  audienceDemographics String? // JSON object
  audienceGeography String?   // JSON object
  audienceInterests String?   // JSON object
  audienceDescription String?
  activePlatforms   String   // JSON array of platform objects with name and role
  voiceRules        String   // JSON array of voice rules
  editorialPriorities String // JSON array ordered by priority
  contentFrequency  String?  // JSON object of platform frequency targets
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  narratives        Narrative[]
}

model PlatformRule {
  id                String  @id @default(cuid())
  narrativeType     String  // e.g., "system_failure", "single_number", "human_impact"
  primaryPlatform   String  // e.g., "twitter_thread", "youtube_longform", "blog"
  secondaryPlatform String? // optional secondary
  brandName         String? // if null, applies to all brands
  sendWhen          String  // JSON array of conditions
  neverSend         String  // JSON array of exclusions
  speedPriority     String  // e.g., "30_minutes", "2_4_hours", "24_48_hours"
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model TrendBatch {
  id        String   @id @default(cuid())
  importedAt DateTime @default(now())
  source    String   @default("khabri_manual")
  trends    Trend[]
}

model Trend {
  id         String   @id @default(cuid())
  rank       Int
  score      Int
  headline   String
  reason     String
  status     String   @default("pending") // pending, selected, skipped, monitoring
  skipReason String?
  batchId    String
  batch      TrendBatch @relation(fields: [batchId], references: [id])
  createdAt  DateTime @default(now())
  narratives Narrative[]
}

model Narrative {
  id              String   @id @default(cuid())
  angle           String   // The specific story angle
  whyThisAngle    String   // Editorial reasoning
  informationGap  String   // What others are missing
  priority        Int      // 1 = make today, 2 = this week, 3 = monitoring
  platform        String   // primary platform
  secondaryPlatform String?
  format          String   // thread, single_tweet, youtube_longform, blog, reel, linkedin
  urgency         String   // e.g., "publish within 4 hours"
  status          String   @default("planned") // planned, researching, producing, published, killed
  trendId         String
  trend           Trend    @relation(fields: [trendId], references: [id])
  brandId         String
  brand           Brand    @relation(fields: [brandId], references: [id])
  researchPrompt  String?  // The generated deep research prompt
  researchResults String?  // Pasted back research dossier
  enginePrompt    String?  // The generated prompt for downstream engine
  packageData     String?  // JSON with titles, thumbnail, description, tags, timing
  finalContent    String?  // The final content piece
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model EditorialLog {
  id        String   @id @default(cuid())
  action    String   // "selected", "skipped", "override", "published"
  reasoning String
  trendHeadline String
  narrativeAngle String?
  platform  String?
  brandName String?
  createdAt DateTime @default(now())
}

model PerformanceData {
  id            String   @id @default(cuid())
  narrativeId   String?
  platform      String
  brandName     String
  contentType   String   // thread, video, blog, reel, tweet
  impressions   Int?
  engagementRate Float?
  replies       Int?
  retweets      Int?
  bookmarks     Int?
  views         Int?
  watchTime     Float?
  ctr           Float?
  notes         String?
  publishedAt   DateTime?
  recordedAt    DateTime @default(now())
}
```

---

## AI INTEGRATION LAYER

The core intelligence of Yantri lives in Claude API calls. There are 4 distinct AI functions:

### AI Function 1: EDITORIAL SCAN
Triggered when a new batch of trends is imported.
Input: Array of trends + all active Brand Identity data + Platform Strategy rules
Output: Production plan with priorities, narrative selections, and reasoning

System prompt for this call:
```
You are the editorial brain of a media newsroom. You have been given a set of ranked news trends and the editorial identity files for the brands you serve.

Your job: scan all trends, filter them against brand editorial territory, select the ONE best narrative angle per viable trend, route each to the correct platform, and produce a production plan.

BRAND IDENTITIES:
{Insert all active brand data here as structured text}

PLATFORM ROUTING RULES:
{Insert all platform rules here}

EVALUATION LENSES (apply in order):
1. IMPACT RADIUS - How many people affected, how severely
2. INFORMATION GAP - What does the public not know that they should
3. BRAND FIT - Does this match editorial territory (absolute filter)
4. NARRATIVE DEPTH - Is there a specific human story, not just a headline
5. TIMING - Is this time-sensitive or can it wait for better research

SELECTION CRITERIA for choosing ONE narrative per trend:
- Highest information gap
- Most provable with data
- Best brand fit
- Longest shelf life
- Creates understanding, not just outrage

OUTPUT FORMAT (respond in JSON):
{
  "plan_date": "YYYY-MM-DD",
  "priorities": [
    {
      "priority": 1,
      "trend_headline": "...",
      "trend_score": 98,
      "narrative_angle": "The specific story in one sentence",
      "why_this_narrative": "2-3 lines of reasoning",
      "information_gap": "What others are missing",
      "brand": "The Squirrels",
      "platform": "twitter_thread",
      "secondary_platform": "youtube_longform",
      "format": "thread_6_9",
      "urgency": "publish within 4 hours"
    }
  ],
  "skipped": [
    {
      "trend_headline": "...",
      "reason": "Outside editorial territory"
    }
  ]
}

Select maximum 3 priorities. Skip everything else with reasoning.
Do not present multiple narrative options per trend. Pick one. You are the editor.
```

### AI Function 2: RESEARCH PROMPT GENERATION
Triggered after editorial scan produces priorities.
Input: Selected narrative + brand context
Output: Deep research prompt + manual search queries

System prompt:
```
Generate a precise deep research prompt for the following narrative angle. The prompt will be pasted into a research AI (Gemini Deep Research) to produce a comprehensive dossier.

NARRATIVE: {narrative_angle}
FROM TREND: {trend_headline}
FOR BRAND: {brand_name}
TARGET PLATFORM: {platform}

The research prompt MUST request:
- Timeline of events with dates and sources
- Key numbers (costs, casualties, affected populations, budget figures) with source labels
- Stakeholder positions (who said what, when, where)
- Official claims vs available evidence (contradictions)
- Policy/legal framework (what rules exist, what was violated)
- Ground reality (hidden costs, exclusions, what numbers miss)
- 3-5 expert or institutional quotes with attribution
- What mainstream coverage is missing or underreporting
- Comparable precedents (similar events domestically or internationally)

CRITICAL: Target research at the SPECIFIC NARRATIVE ANGLE, not the broad trend headline. The difference between researching "Iran War" and "financial losses at Dubai airport due to Iran conflict" is the difference between useless and usable research.

Also generate 3-5 specific Google search queries for quick manual data gathering.

OUTPUT FORMAT (JSON):
{
  "research_prompt": "The full prompt text ready to paste into Gemini Deep Research",
  "manual_queries": [
    {"query": "...", "looking_for": "..."},
  ]
}
```

### AI Function 3: ENGINE PROMPT GENERATION
Triggered when research results are pasted back.
Input: Narrative + research dossier + platform + brand + format
Output: Ready-to-paste prompt for the appropriate downstream engine

System prompt:
```
You are generating a prompt to paste into a specialized content engine. Based on the platform and format, generate the appropriate prompt.

NARRATIVE: {narrative_angle}
PLATFORM: {platform}
FORMAT: {format}
BRAND: {brand_name}
BRAND VOICE: {voice_rules}
RESEARCH DOSSIER: {research_results}

IF PLATFORM = twitter:
Generate a complete prompt for the Squirrels X Engine. Include: narrative, format decision with justification, the research structured as priority data points (5-8 most tweetable numbers), stakeholder quotes under 25 words, key contradictions, and a suggested hook angle using one of these archetypes: The Number That Should Not Exist, The Contradiction, The Question Nobody Is Asking, The System Reveal, The Timeline Compression, The Scale Translation, The Uncomfortable Comparison, The Source Authority.

IF PLATFORM = youtube_longform:
Generate a complete prompt for the Bhupen Script Engine. Include:
PROJECT BRIEF with topic_title, platform (YouTube long), target_runtime (10-15 or 15-20 min), language (Hinglish for Breaking Tube, English for Squirrels), audience description, tone_dial (1-10), political_sensitivity_level.
MODE: FROM SCRATCH
RESEARCH_PACK structured as: timeline_facts, key_numbers, quotes_and_attribution, stakeholder_positions, policy_or_legal, contradictions, ground_reality, sensitivity_flags, proof_assets_available.
NARRATIVE DIRECTION explaining the angle and escalation structure.

IF PLATFORM = blog:
Generate a complete prompt for the Blog Engine. Include: topic, format (Explainer/Timeline/Data analysis/Policy breakdown), structured research pack, SEO direction with focus keyphrase, 5-8 secondary keyphrases, 8-12 long-tail search queries.

IF PLATFORM = meta:
Generate the final content directly: reel script (under 60 seconds, works without sound), or carousel outline, or image + caption. Include text overlay sequence for reels.

IF PLATFORM = linkedin:
Generate the final post directly: 400-1200 words, hook in first 2 lines, generous line breaks, 3-5 hashtags at end, no external links in body.

OUTPUT FORMAT (JSON):
{
  "target_engine": "squirrels_x_engine | bhupen_script | blog_engine | direct_meta | direct_linkedin",
  "prompt": "The complete prompt text ready to copy-paste",
  "is_direct_content": true/false
}
```

### AI Function 4: PACKAGING
Triggered alongside engine prompt generation.
Input: Narrative + platform + brand + research highlights
Output: Titles, thumbnail brief, description, tags, posting time, repurpose plan

System prompt:
```
Generate a complete content package for the following piece.

NARRATIVE: {narrative_angle}
PLATFORM: {platform}
BRAND: {brand_name}
KEY DATA POINTS: {top 5 numbers from research}

Generate:
1. THREE title variants:
   - Variant A: Data-first (leads with number or fact)
   - Variant B: Question/curiosity (opens a loop)
   - Variant C: Consequence/impact (what this means for you)
   Apply platform-specific title rules:
   - YouTube Breaking Tube: Hinglish, number in first 5 words, 50-70 chars
   - YouTube Squirrels: English, data-first authority framing, 50-70 chars
   - Twitter: Hook in first 7 words, standalone sentence
   - Blog: SEO-first, focus keyphrase in first 60 chars

2. THUMBNAIL BRIEF:
   - What the image should show
   - Text overlay (max 3-4 words)
   - Primary emotion: shock, curiosity, anger, or disbelief
   - Color mood
   - Brand-specific rules (BT: Bhupen face + data point, Squirrels: clean data-card aesthetic)

3. DESCRIPTION: Platform-appropriate with SEO keywords embedded naturally

4. TAGS/HASHTAGS: Platform-appropriate count (Twitter 0-2, META 5-10, YouTube 8-15)

5. POSTING TIME: Specific IST time with reasoning based on platform and audience geography

6. CROSS-PLATFORM REPURPOSE: What to extract from this piece for other platforms

OUTPUT FORMAT (JSON):
{
  "titles": {"data_first": "...", "question": "...", "consequence": "..."},
  "thumbnail": {"visual": "...", "text_overlay": "...", "emotion": "...", "color_mood": "..."},
  "description": "...",
  "tags": ["..."],
  "posting_time": {"time_ist": "...", "reasoning": "..."},
  "repurpose": [{"target_platform": "...", "what_to_extract": "...", "format": "..."}]
}
```

---

## UI SCREENS AND ROUTES

### Screen 1: Login (/login)
Simple email + password login form. Single user for MVP (seed the database with one user on first run).
After login, redirect to /dashboard.

### Screen 2: Dashboard (/dashboard)
The home screen. Shows:
- Quick stats: trends imported today, narratives in production, content published this week
- Latest production plan (if one exists for today)
- Quick action buttons: "Import Trends", "View Brands", "View Platform Rules"
- Recent activity feed from EditorialLog

### Screen 3: Import Trends (/trends/import)
Two import methods:
- PASTE MODE: Large textarea where operator pastes Khabri output (plain text). Parse it to extract rank, score, headline, reason. Regex pattern: each line has rank number, score number, headline text, and reason text separated by tabs or consistent formatting.
- TABLE MODE: Manual entry form with fields for rank, score, headline, reason. Add row button.

After import: Save to TrendBatch and individual Trend records. Show confirmation with parsed trends. Button: "Run Yantri" which triggers the editorial scan.

### Screen 4: Production Plan (/plan/[batchId])
This is the CORE screen. After Yantri runs editorial scan:

TOP SECTION - Production Plan:
- Priority 1 card (highlighted, prominent): Shows trend, narrative angle, why this narrative, brand badge, platform badge, format, urgency timer
- Priority 2 card (secondary)
- Priority 3 card (tertiary or monitoring)
- Skipped trends collapsed section (expandable, shows reason for each skip)

Each priority card has action buttons:
- "Approve" — locks the narrative and triggers research prompt generation
- "Override" — opens editor to change narrative angle, platform, or brand
- "Kill" — marks as killed with reason input

MIDDLE SECTION - Research Prompt (appears after approving Priority 1):
- Generated research prompt in a copyable text block with one-click copy button
- Manual search queries listed below
- Large textarea: "Paste research results here"
- Button: "Research Done — Generate Engine Prompt"

BOTTOM SECTION - Engine Prompt + Package (appears after research is submitted):
- Engine prompt in copyable text block with one-click copy button
- Label showing which engine chat to paste into
- Packaging section: 3 title options (with copy buttons each), thumbnail brief, description, tags, posting time
- Button: "Mark as Sent to Engine"
- Button: "Paste Final Content" (textarea to paste what the engine produced, for records)
- Button: "Mark Published"

### Screen 5: Brands (/brands)
List all brands with edit/delete/add buttons.

### Screen 6: Brand Editor (/brands/[id] or /brands/new)
Form with all Brand model fields. Key fields:
- Name, tagline, language, tone (text inputs)
- Editorial Covers: tag-style input (add/remove topics)
- Editorial Never: tag-style input
- Active Platforms: checkboxes with role description for each
- Voice Rules: list input (add/remove rules)
- Editorial Priorities: ordered list (drag to reorder)
- Content Frequency: platform-by-frequency grid
- Active toggle

### Screen 7: Platform Strategy (/platform-rules)
Table showing all routing rules. Each row: narrative type, primary platform, secondary platform, conditions, exclusions, speed priority.
Add/edit/delete rows inline.
Pre-seed with the routing rules from the Platform Strategy file.

### Screen 8: History (/history)
Chronological list of all production plans, narratives, and their status.
Filter by: brand, platform, status (planned/researching/producing/published/killed), date range.
Click any narrative to see full detail (research prompt, research results, engine prompt, package, final content).

### Screen 9: Performance (/performance)
Form to log performance data for published content.
Fields: select narrative from published list, impressions, engagement rate, replies, retweets, bookmarks, views, watch time, CTR, notes.
Table showing all logged performance data with sorting.
Future: charts and trends (not MVP, but structure the data for it).

---

## API ROUTES

```
POST   /api/auth/login          — NextAuth credentials login
POST   /api/auth/logout         — NextAuth logout
GET    /api/brands              — List all brands
POST   /api/brands              — Create brand
PUT    /api/brands/[id]         — Update brand
DELETE /api/brands/[id]         — Delete brand
GET    /api/platform-rules      — List all platform rules
POST   /api/platform-rules      — Create rule
PUT    /api/platform-rules/[id] — Update rule
DELETE /api/platform-rules/[id] — Delete rule
POST   /api/trends/import       — Import trend batch (parse and save)
GET    /api/trends/batches       — List all batches
GET    /api/trends/batch/[id]   — Get batch with trends
POST   /api/yantri/scan         — Run editorial scan on a batch (AI Function 1)
POST   /api/yantri/research     — Generate research prompt for narrative (AI Function 2)
POST   /api/yantri/route        — Generate engine prompt from research (AI Function 3)
POST   /api/yantri/package      — Generate packaging for narrative (AI Function 4)
PUT    /api/narratives/[id]     — Update narrative (status, research results, final content)
GET    /api/narratives           — List narratives with filters
GET    /api/history              — Editorial log entries
POST   /api/performance         — Log performance data
GET    /api/performance          — List performance data
```

---

## BUILD SEQUENCE (For Claude Code)

Build in this exact order. Each phase should be fully working before moving to the next.

### Phase 1: Foundation (Day 1)
1. Initialize Next.js 14 project with App Router
2. Install dependencies: prisma, @prisma/client, next-auth, @anthropic-ai/sdk, tailwindcss
3. Set up Prisma schema (copy from above), run prisma db push
4. Set up NextAuth with credentials provider
5. Create seed script that creates default user (email: admin@shownomore.com, password: yantri2026)
6. Create basic layout with sidebar navigation
7. Create login page
8. Verify: can login and see empty dashboard

### Phase 2: Brand Management (Day 2)
1. Build /brands list page
2. Build /brands/new and /brands/[id] editor forms
3. Build all brand API routes
4. Seed database with The Squirrels and Breaking Tube brand data (copy from Brand Identity files in this document)
5. Verify: can create, edit, view brands

### Phase 3: Platform Rules (Day 2-3)
1. Build /platform-rules page with inline editing table
2. Build platform rules API routes
3. Seed database with routing rules (copy from Platform Strategy file)
4. Verify: can view and edit routing rules

### Phase 4: Trend Import (Day 3)
1. Build /trends/import page with paste mode and table mode
2. Build trend parsing logic (extract rank, score, headline, reason from pasted text)
3. Build trends API routes
4. Build trend batch list page
5. Verify: can paste Khabri output, see parsed trends

### Phase 5: Yantri AI Engine (Day 4-5) — THIS IS THE CORE
1. Set up Anthropic client with API key from environment variable
2. Implement AI Function 1 (Editorial Scan): /api/yantri/scan
   - Fetch all active brands from DB
   - Fetch all platform rules from DB
   - Fetch trends from the batch
   - Construct the system prompt with brand data and platform rules injected
   - Call Claude API
   - Parse JSON response
   - Create Narrative records for each priority
   - Create EditorialLog entries for selections and skips
   - Return production plan
3. Implement AI Function 2 (Research Prompt): /api/yantri/research
   - Fetch narrative with brand data
   - Call Claude API with research prompt generation system prompt
   - Save research prompt to narrative record
   - Return prompt and manual queries
4. Implement AI Function 3 (Engine Prompt): /api/yantri/route
   - Fetch narrative with research results and brand data
   - Call Claude API with routing system prompt
   - Save engine prompt to narrative record
   - Return prompt with target engine label
5. Implement AI Function 4 (Packaging): /api/yantri/package
   - Fetch narrative with all context
   - Call Claude API with packaging system prompt
   - Save package data to narrative record
   - Return package
6. Verify: Full flow works — import trends, run scan, get plan, generate research prompt, paste research back, get engine prompt + package

### Phase 6: Production Plan UI (Day 5-6)
1. Build /plan/[batchId] page — the core workflow screen
2. Priority cards with approve/override/kill buttons
3. Research prompt display with copy button
4. Research results textarea with submit button
5. Engine prompt display with copy button and engine label
6. Packaging display with individual copy buttons
7. Status progression buttons (sent to engine, paste final, mark published)
8. Verify: complete workflow from trends to published status

### Phase 7: History and Performance (Day 7)
1. Build /history page with filters
2. Build narrative detail view
3. Build /performance page with data entry form
4. Build performance data table
5. Verify: can track everything end to end

### Phase 8: Polish (Day 8)
1. Dashboard with real stats from database
2. Loading states and error handling
3. Mobile-responsive layout
4. Quick keyboard shortcuts (Ctrl+Enter to submit, etc.)
5. Toast notifications for actions

---

## ENVIRONMENT VARIABLES

```env
DATABASE_URL="file:./yantri.db"
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."
```

---

## SEED DATA

On first run, seed the database with:

1. Default user (admin@shownomore.com / yantri2026)

2. The Squirrels brand:
   - name: "The Squirrels"
   - tagline: "The Opinion Data Center - Where News Meets Clarity"
   - language: "English"
   - tone: "Premium editorial. Investigative. Data-first. System decode."
   - editorialCovers: ["Indian governance and policy", "International geopolitics with India angle", "Economic policy and fiscal data", "Defence and national security", "Constitutional and legal developments", "Government accountability", "Technology policy and AI regulation", "India global positioning"]
   - editorialNever: ["Celebrity or entertainment", "Sports", "Religious content or communal framing", "Lifestyle health food", "Motivation or self-help", "Party politics without governance angle", "Unverified conspiracy theories"]
   - activePlatforms: [{"name": "twitter", "role": "PRIMARY"}, {"name": "youtube", "role": "secondary"}, {"name": "blog", "role": "secondary"}, {"name": "meta", "role": "tertiary"}]
   - voiceRules: ["Leads with data not opinion", "Attributes every claim to a source", "Critiques systems not communities", "Controlled analytical tone", "Neutral on parties ruthless on institutions"]
   - editorialPriorities: ["India geopolitical positioning", "Economic data and policy impact", "Governance accountability", "Technology and AI policy", "Constitutional developments"]

3. Breaking Tube brand:
   - name: "Breaking Tube"
   - language: "Hinglish"
   - tone: "Data-first but warm. Controlled satire. Direct address. Bhupen voice."
   - editorialCovers: ["Indian domestic politics and policy", "Government decisions impacting ordinary Indians", "India-specific economic issues", "Major international events with India impact", "Defence with India angle", "Infrastructure and safety failures"]
   - editorialNever: ["International affairs without India connection", "Entertainment or Bollywood", "Sports", "Religious or communal content", "Technology without policy angle"]
   - activePlatforms: [{"name": "youtube", "role": "PRIMARY"}, {"name": "meta", "role": "secondary"}]
   - voiceRules: ["High-stakes hook with shocking number or question", "Repeat key numbers for emphasis", "System/villain framing not community targeting", "Controlled satire stay factual", "Escalation structure context contradiction consequence who-benefits"]
   - editorialPriorities: ["Domestic governance failures and successes", "Economic impact stories", "Major political events with accountability", "India angle on international crises", "Infrastructure and safety failures"]

4. Platform routing rules (seed these):
   - system_failure -> twitter_thread (primary) -> youtube_longform (secondary) -> speed: 2-4 hours
   - single_number -> twitter_single (primary) -> meta_reel (secondary) -> speed: 30 minutes
   - human_impact -> youtube_longform (primary) -> meta_reel (secondary) -> speed: 24-48 hours
   - policy_explainer -> youtube_longform (primary) -> blog (secondary) -> speed: 24-48 hours
   - data_contradiction -> twitter_thread (primary) -> blog (secondary) -> speed: 2-4 hours
   - timeline_chronology -> twitter_thread (primary) -> youtube_longform (secondary) -> speed: 2-4 hours
   - breaking_news -> twitter_single (primary) -> youtube_longform if massive (secondary) -> speed: 30 minutes
   - economic_impact -> youtube_longform (primary) -> meta_reel (secondary) -> speed: 24-48 hours
   - international_india -> youtube_longform (primary) -> twitter_thread (secondary) -> speed: 24-48 hours
   - business_angle -> linkedin (primary) -> blog (secondary) -> speed: 1 week
   - governance_data -> blog (primary) -> twitter_thread (secondary) -> speed: 48-72 hours

---

## KEY IMPLEMENTATION NOTES

### Trend Parsing
When operator pastes Khabri output, it looks like this format:
```
1    98    7-Year-Old Crushed: School Bus Safety Failure    Extreme emotional trigger...
2    97    Global Escalation: Israel Strikes Beirut & Iran    High pressure geopolitical...
```
Parse each line: first number is rank, second number is score, text before the long description is headline, remaining text is reason. Handle tab-separated and multi-space-separated formats.

### Claude API Calls
Use the Anthropic SDK. All AI functions should:
- Set temperature to 0.3 for consistent editorial decisions
- Use claude-sonnet-4-5-20250929 model
- Request JSON output and parse it
- Handle API errors gracefully with retry logic
- Store the raw API response alongside parsed results for debugging

### Copy to Clipboard
Every generated prompt (research prompt, engine prompt) must have a prominent "Copy" button that copies to clipboard. This is the primary interaction — the operator copies prompts and pastes them into other tools.

### Status Flow for Narratives
planned -> researching (when research prompt generated) -> producing (when engine prompt generated) -> published (when operator marks done) -> killed (if operator kills it)

### Editorial Log
Log EVERY decision Yantri makes with reasoning. This is the audit trail that helps the operator understand and improve the system over time. Log: selections, skips, overrides, status changes.

---

## WHAT THIS MVP DOES NOT INCLUDE (Save for Developer Phase)
- Real-time Khabri API integration (MVP uses paste import)
- Multi-user support (MVP is single user)
- Automated posting via Relay/platform APIs
- Analytics dashboard with charts
- Performance-based learning (using past data to improve future decisions)
- WebSocket real-time updates
- Mobile app
- Multi-tenant SaaS architecture
- Payment/subscription system

These features are for the developer phase after the MVP is battle-tested.

---

## FILE STRUCTURE

```
yantri/
  prisma/
    schema.prisma
    seed.ts
  src/
    app/
      layout.tsx              (sidebar nav + auth wrapper)
      page.tsx                (redirects to /dashboard)
      login/
        page.tsx
      dashboard/
        page.tsx
      trends/
        import/
          page.tsx
        page.tsx
      plan/
        [batchId]/
          page.tsx
      brands/
        page.tsx
        new/
          page.tsx
        [id]/
          page.tsx
      platform-rules/
        page.tsx
      history/
        page.tsx
      performance/
        page.tsx
      api/
        auth/
          [...nextauth]/
            route.ts
        brands/
          route.ts
          [id]/
            route.ts
        platform-rules/
          route.ts
          [id]/
            route.ts
        trends/
          import/
            route.ts
          batches/
            route.ts
          batch/
            [id]/
              route.ts
        yantri/
          scan/
            route.ts
          research/
            route.ts
          route/
            route.ts
          package/
            route.ts
        narratives/
          route.ts
          [id]/
            route.ts
        history/
          route.ts
        performance/
          route.ts
    lib/
      prisma.ts               (Prisma client singleton)
      anthropic.ts            (Claude API client and helper functions)
      auth.ts                 (NextAuth config)
      prompts.ts              (All AI system prompts as template functions)
    components/
      Sidebar.tsx
      TrendCard.tsx
      NarrativeCard.tsx
      BrandForm.tsx
      PlatformRuleRow.tsx
      CopyButton.tsx
      StatusBadge.tsx
      LoadingSpinner.tsx
  .env.local
  package.json
  tailwind.config.ts
  tsconfig.json
```
