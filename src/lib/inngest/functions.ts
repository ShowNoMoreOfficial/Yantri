import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { routeToModel } from "@/lib/modelRouter";
import { buildResearchPrompt, buildContentGenerationPrompt } from "@/lib/prompts";
import { analyzeGap } from "@/lib/gapAnalysis";
import { runStrategist } from "@/lib/strategist";

// ─── Event Types ─────────────────────────────────────────────────────────────

type NarrativeEvent = {
  data: { narrativeId: string };
};

type DossierEvent = {
  data: { treeId: string };
};

type TreeUpdatedEvent = {
  data: { treeId: string };
};

// ─── narrativeResearch ───────────────────────────────────────────────────────
// Triggered by "yantri/narrative.research"
// Runs AI research for a planned narrative, then kicks off content generation.

export const narrativeResearch = inngest.createFunction(
  {
    id: "narrative-research",
    retries: 2,
  },
  { event: "yantri/narrative.research" },
  async ({ event, step }) => {
    const { narrativeId } = event.data as NarrativeEvent["data"];

    // Step 1 — Fetch the narrative with its trend and brand
    const narrative = await step.run("fetch-narrative", async () => {
      const n = await prisma.narrative.findUniqueOrThrow({
        where: { id: narrativeId },
        include: { trend: true, brand: true },
      });
      return n;
    });

    // Step 2 — Mark status as "researching"
    await step.run("set-status-researching", async () => {
      await prisma.narrative.update({
        where: { id: narrativeId },
        data: { status: "researching" },
      });
    });

    // Step 3 — Run AI research via model router
    // Use the scan-generated deep_research_prompt if available, fall back to template
    const researchResults = await step.run("run-research", async () => {
      const systemPrompt = narrative.researchPrompt || buildResearchPrompt(
        narrative.angle,
        narrative.trend.headline,
        narrative.brand.name,
        narrative.platform
      ).systemPrompt;

      const userMessage = `Research this narrative angle now: ${narrative.angle}`;

      const result = await routeToModel("research", systemPrompt, userMessage);
      return result.raw;
    });

    // Step 4 — Save research results and advance status to "producing"
    await step.run("save-research-results", async () => {
      await prisma.narrative.update({
        where: { id: narrativeId },
        data: {
          researchResults,
          status: "producing",
        },
      });
    });

    // Step 5 — Send follow-up event to trigger content generation
    await step.sendEvent("trigger-generate", {
      name: "yantri/narrative.generate",
      data: { narrativeId },
    });

    return { narrativeId, status: "research-complete" };
  }
);

// ─── narrativeGenerate ───────────────────────────────────────────────────────
// Triggered by "yantri/narrative.generate"
// Generates platform-specific content from research results.

export const narrativeGenerate = inngest.createFunction(
  {
    id: "narrative-generate",
    retries: 2,
  },
  { event: "yantri/narrative.generate" },
  async ({ event, step }) => {
    const { narrativeId } = event.data as NarrativeEvent["data"];

    // Step 1 — Fetch the narrative with research, brand, and trend
    const narrative = await step.run("fetch-narrative", async () => {
      const n = await prisma.narrative.findUniqueOrThrow({
        where: { id: narrativeId },
        include: { trend: true, brand: true },
      });

      if (!n.researchResults) {
        throw new Error(
          `Narrative ${narrativeId} has no research results — cannot generate content.`
        );
      }

      return n;
    });

    // Step 2 — Generate platform-specific content via model router
    const generatedContent = await step.run("generate-content", async () => {
      // Parse voice rules — stored as native JSON in Prisma
      const voiceRules = Array.isArray(narrative.brand.voiceRules)
        ? (narrative.brand.voiceRules as string[]).join("; ")
        : JSON.stringify(narrative.brand.voiceRules);

      const { systemPrompt, userMessage } = buildContentGenerationPrompt(
        narrative.platform,
        narrative.angle,
        narrative.format,
        narrative.brand.name,
        narrative.brand.tone,
        voiceRules,
        narrative.brand.language,
        narrative.researchResults!,
        narrative.trend.headline
      );

      const result = await routeToModel("drafting", systemPrompt, userMessage, {
        maxTokens: 8192,
      });

      return result.raw;
    });

    // Step 3 — Save generated content and set status to "producing"
    await step.run("save-content", async () => {
      await prisma.narrative.update({
        where: { id: narrativeId },
        data: {
          finalContent: generatedContent,
          status: "producing",
        },
      });
    });

    return { narrativeId, status: "content-generated" };
  }
);

// ─── factDossierSync ─────────────────────────────────────────────────────────
// Triggered by "yantri/dossier.build"
// Synthesizes a FactDossier from all nodes in a NarrativeTree.

export const factDossierSync = inngest.createFunction(
  {
    id: "fact-dossier-sync",
    retries: 2,
  },
  { event: "yantri/dossier.build" },
  async ({ event, step }) => {
    const { treeId } = event.data as DossierEvent["data"];

    // Step 1 — Fetch the NarrativeTree and all its nodes
    const tree = await step.run("fetch-tree", async () => {
      const t = await prisma.narrativeTree.findUniqueOrThrow({
        where: { id: treeId },
        include: { nodes: true },
      });
      return t;
    });

    // Step 2 — Synthesize a FactDossier from all node signals
    const dossierData = await step.run("synthesize-dossier", async () => {
      // Compile all node signals into a research input
      const signalSummary = tree.nodes
        .map(
          (node, idx) =>
            `Signal ${idx + 1}: "${node.signalTitle}" (score: ${node.signalScore})\n` +
            `Data: ${JSON.stringify(node.signalData)}`
        )
        .join("\n\n---\n\n");

      const systemPrompt = `You are a research synthesis engine. You have received multiple signals from a narrative tree titled "${tree.rootTrend}".

Your job: synthesize these signals into a structured FactDossier — a verified, source-attributed knowledge base that can power content generation across platforms.

OUTPUT FORMAT (respond in JSON only):
{
  "facts": [
    { "claim": "...", "source": "...", "verified": true }
  ],
  "stats": [
    { "figure": "...", "context": "...", "source": "..." }
  ],
  "quotes": [
    { "text": "...", "speaker": "...", "date": "...", "source": "..." }
  ],
  "timeline": [
    { "date": "...", "event": "...", "source": "..." }
  ],
  "sources": ["url1", "url2"]
}

RULES:
- Only include verifiable claims with clear attribution
- Prioritize recency and relevance
- Flag any conflicting data points
- Be concise and data-dense`;

      const userMessage = `Synthesize these ${tree.nodes.length} signals into a FactDossier:\n\n${signalSummary}`;

      const result = await routeToModel("research", systemPrompt, userMessage);

      // Parse the structured output
      let structuredData: unknown = {};
      let sources: string[] = [];

      if (result.parsed && typeof result.parsed === "object") {
        const parsed = result.parsed as Record<string, unknown>;
        sources = Array.isArray(parsed.sources)
          ? (parsed.sources as string[])
          : [];
        structuredData = parsed;
      }

      return { structuredData, sources, rawResearch: result.raw };
    });

    // Step 3 — Upsert the FactDossier in the database
    await step.run("upsert-dossier", async () => {
      await prisma.factDossier.upsert({
        where: { treeId },
        create: {
          treeId,
          structuredData: dossierData.structuredData as object,
          sources: dossierData.sources,
          rawResearch: dossierData.rawResearch,
        },
        update: {
          structuredData: dossierData.structuredData as object,
          sources: dossierData.sources,
          rawResearch: dossierData.rawResearch,
        },
      });
    });

    return { treeId, status: "dossier-synced" };
  }
);

// ─── gapAnalysisOnIngest ──────────────────────────────────────────────────
// Triggered by "yantri/tree.updated"
// Runs gap analysis on a NarrativeTree after new signals are ingested.
// If new content is needed, runs the Strategist and creates ContentPiece records.

export const gapAnalysisOnIngest = inngest.createFunction(
  {
    id: "gap-analysis-on-ingest",
    retries: 2,
  },
  { event: "yantri/tree.updated" },
  async ({ event, step }) => {
    const { treeId } = event.data as TreeUpdatedEvent["data"];

    // Step 1 — Run gap analysis
    const gapResult = await step.run("run-gap-analysis", async () => {
      return await analyzeGap(treeId);
    });

    // If no new content is needed, exit early
    if (!gapResult.needsNewContent) {
      return {
        treeId,
        status: "no-action-needed",
        reasoning: gapResult.reasoning,
      };
    }

    // Step 2 — Check if a FactDossier exists; if not, trigger dossier build
    const hasDossier = await step.run("check-dossier", async () => {
      const dossier = await prisma.factDossier.findUnique({
        where: { treeId },
      });
      return !!dossier;
    });

    if (!hasDossier) {
      // Trigger dossier build and exit — the dossier pipeline will
      // eventually feed back into this flow via a subsequent tree.updated event
      await step.sendEvent("trigger-dossier-build", {
        name: "yantri/dossier.build",
        data: { treeId },
      });

      return {
        treeId,
        status: "dossier-build-triggered",
        reasoning: gapResult.reasoning,
      };
    }

    // Step 3 — Fetch dossier and active brands, then run the Strategist
    const decisions = await step.run("run-strategist", async () => {
      const dossier = await prisma.factDossier.findUniqueOrThrow({
        where: { treeId },
      });

      const activeBrands = await prisma.brand.findMany({
        where: { isActive: true },
      });

      if (activeBrands.length === 0) {
        return [];
      }

      return await runStrategist({
        treeId,
        brands: activeBrands,
        dossier: {
          structuredData: dossier.structuredData,
          sources: dossier.sources,
          rawResearch: dossier.rawResearch,
        },
      });
    });

    if (decisions.length === 0) {
      return {
        treeId,
        status: "no-decisions",
        reasoning: "Strategist found no viable brand-platform combinations.",
      };
    }

    // Step 4 — Create ContentPiece records for each strategy decision
    const createdPieces = await step.run("create-content-pieces", async () => {
      const pieces: { id: string; brandName: string; platform: string }[] = [];

      for (const decision of decisions) {
        // Map the strategy platform string to the Platform enum
        const platformValue = decision.platform as
          | "YOUTUBE"
          | "X_THREAD"
          | "X_SINGLE"
          | "BLOG"
          | "LINKEDIN"
          | "META_REEL"
          | "META_CAROUSEL"
          | "META_POST";

        const piece = await prisma.contentPiece.create({
          data: {
            brandId: decision.brandId,
            treeId,
            platform: platformValue,
            status: "PLANNED",
            bodyText: `[Strategist Angle] ${decision.angle}\n\n[Reasoning] ${decision.reasoning}`,
            researchPrompt: decision.deep_research_prompt,
          },
        });

        pieces.push({
          id: piece.id,
          brandName: decision.brandName,
          platform: decision.platform,
        });
      }

      return pieces;
    });

    return {
      treeId,
      status: "content-planned",
      urgency: gapResult.urgency,
      reasoning: gapResult.reasoning,
      decisionsCount: decisions.length,
      createdPieces,
    };
  }
);
