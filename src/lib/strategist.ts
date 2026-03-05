/**
 * Strategist Agent
 *
 * Cross-references brand identities, FactDossier content, and historical
 * performance data to decide which brands should create content, on which
 * platforms, and with what angle.
 */

import { Brand } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { routeToModel } from "@/lib/modelRouter";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FactDossier {
  structuredData: unknown;
  sources: string[];
  rawResearch?: string | null;
}

export interface StrategyDecision {
  brandId: string;
  brandName: string;
  platform: string;
  angle: string;
  reasoning: string;
  priority: number;
  deep_research_prompt: string;
}

export interface StrategistParams {
  treeId: string;
  brands: Brand[];
  dossier: FactDossier;
}

// ─── Main Function ──────────────────────────────────────────────────────────

/**
 * Run the Strategist Agent against a set of brands and a FactDossier.
 *
 * Fetches historical performance data, cross-references brand identities
 * with the dossier content, and produces routing decisions.
 */
export async function runStrategist(
  params: StrategistParams
): Promise<StrategyDecision[]> {
  const { treeId, brands, dossier } = params;

  // 1. Fetch the tree for context
  const tree = await prisma.narrativeTree.findUniqueOrThrow({
    where: { id: treeId },
    include: {
      nodes: {
        orderBy: { identifiedAt: "desc" },
        take: 10,
      },
    },
  });

  // 2. Fetch performance data for each brand to inform decisions
  const brandNames = brands.map((b) => b.name);
  const performanceData = await prisma.performanceData.findMany({
    where: {
      brandName: { in: brandNames },
    },
    orderBy: { recordedAt: "desc" },
    take: 50, // Last 50 performance records across all brands
  });

  // 3. Build brand profiles for the prompt
  const brandProfiles = brands.map((brand) => {
    const platforms = JSON.parse(brand.activePlatforms) as { name: string; role: string }[];
    const covers = JSON.parse(brand.editorialCovers) as string[];
    const never = JSON.parse(brand.editorialNever) as string[];
    const priorities = JSON.parse(brand.editorialPriorities) as string[];
    const voiceRules = Array.isArray(brand.voiceRules)
      ? (brand.voiceRules as string[]).join("; ")
      : JSON.stringify(brand.voiceRules);

    // Aggregate brand-specific performance stats
    const brandPerf = performanceData.filter((p) => p.brandName === brand.name);
    const perfByPlatform: Record<string, { count: number; avgEngagement: number; avgImpressions: number }> = {};

    for (const p of brandPerf) {
      if (!perfByPlatform[p.platform]) {
        perfByPlatform[p.platform] = { count: 0, avgEngagement: 0, avgImpressions: 0 };
      }
      const entry = perfByPlatform[p.platform];
      entry.count += 1;
      entry.avgEngagement += p.engagementRate ?? 0;
      entry.avgImpressions += p.impressions ?? 0;
    }

    // Compute averages
    for (const key of Object.keys(perfByPlatform)) {
      const entry = perfByPlatform[key];
      if (entry.count > 0) {
        entry.avgEngagement /= entry.count;
        entry.avgImpressions /= entry.count;
      }
    }

    return {
      id: brand.id,
      name: brand.name,
      language: brand.language,
      tone: brand.tone,
      covers,
      never,
      platforms: platforms.map((p) => `${p.name} (${p.role})`),
      platformNames: platforms.map((p) => p.name),
      voiceRules,
      priorities,
      performanceByPlatform: perfByPlatform,
    };
  });

  // 4. Summarize the dossier for the prompt
  const dossierSummary = dossier.rawResearch
    ? dossier.rawResearch.substring(0, 3000)
    : JSON.stringify(dossier.structuredData).substring(0, 3000);

  const signalSummary = tree.nodes
    .map((node) => `- "${node.signalTitle}" (score: ${node.signalScore})`)
    .join("\n");

  // 5. Build the prompt
  const systemPrompt = `You are the Strategist Agent for a multi-brand media newsroom. Your job is to decide which brand(s) should create content for a given narrative, on which platform(s), with what specific angle, and what targeted research is needed to execute that angle.

NARRATIVE TREE: "${tree.rootTrend}"
TREE SUMMARY: ${tree.summary || "No summary available."}

LATEST SIGNALS:
${signalSummary}

BRAND PROFILES:
${brandProfiles
      .map(
        (bp) => `
BRAND: ${bp.name}
  Language: ${bp.language}
  Tone: ${bp.tone}
  Covers: ${bp.covers.join(", ")}
  Never covers: ${bp.never.join(", ")}
  Active platforms: ${bp.platforms.join(", ")}
  Voice rules: ${bp.voiceRules}
  Editorial priorities: ${bp.priorities.join(", ")}
  Performance history:
${Object.entries(bp.performanceByPlatform)
            .map(
              ([platform, stats]) =>
                `    ${platform}: ${stats.count} pieces, avg engagement ${stats.avgEngagement.toFixed(2)}%, avg impressions ${Math.round(stats.avgImpressions)}`
            )
            .join("\n") || "    No performance data available."}`
      )
      .join("\n---")}
  
DECISION RULES:
1. BRAND FIT is an absolute filter. If the narrative touches a brand's "never covers" topics, that brand MUST be excluded.
2. Each brand should only be assigned platforms from its own "Active platforms" list.
3. Prefer platforms where the brand has strong historical performance for similar content types.
4. Each decision should have a unique, specific angle tailored to the brand's voice and audience.
5. Prioritize quality over quantity — only create decisions where there is a genuine editorial fit.
6. Assign a priority number (1 = highest) based on urgency and fit strength.

DEEP RESEARCH PROMPT RULES:
For each decision, generate a \`deep_research_prompt\` — a fully-formed system prompt that will be sent to a research model to produce the sourced dossier needed to execute this specific angle.
The \`deep_research_prompt\` must:
- Target the specific angle, not the broad trend headline
- Explicitly request: timeline of events with dates and sources, key numbers with source labels, stakeholder positions with direct quotes and attribution, official claims versus available evidence, contradictions and what mainstream coverage is missing or underreporting, policy or legal framework relevant to this angle, ground reality including hidden costs and exclusions, comparable historical precedents
- Specify the target platform so the research model knows what data density and format is needed (a YouTube script needs different depth than a single tweet)
- Label confidence requirements: instruct the research model to mark every claim as [VERIFIED - official source], [REPORTED - credible outlet], [ESTIMATED - analyst/expert], or [UNCONFIRMED - single source only], and to exclude [UNCONFIRMED] claims from the key numbers section
- Be 150-300 words. Long enough to be specific, short enough to stay focused.

OUTPUT FORMAT (respond in JSON only, no preamble, no markdown):
{
  "decisions": [
    {
      "brandId": "the brand's ID string",
      "brandName": "Brand Name",
      "platform": "YOUTUBE",
      "angle": "A specific content angle in one sentence",
      "reasoning": "2-3 sentences explaining why this brand, this platform, this angle",
      "priority": 1,
      "deep_research_prompt": "Full system prompt text here. 150-300 words. Targeted at the angle above. Specifies platform. Includes all required research sections. Includes confidence labeling instructions."
    }
  ]
}

PLATFORM VALUES MUST BE ONE OF: YOUTUBE, X_THREAD, X_SINGLE, BLOG, LINKEDIN, META_REEL, META_CAROUSEL, META_POST

If no brand is a good fit for this narrative, return: { "decisions": [] }
Before responding, verify your output is valid JSON. Field names are case-sensitive. Do not add, rename, or omit any field.`;

  const userMessage = `Based on this FactDossier, decide which brands should create content and how:

FACT DOSSIER:
${dossierSummary}

Available brand IDs for reference:
${brandProfiles.map((bp) => `${bp.name}: ${bp.id}`).join("\n")}`;

  // 6. Call the strategy model
  const result = await routeToModel("strategy", systemPrompt, userMessage, {
    temperature: 0.3,
  });

  // 7. Parse and validate decisions
  if (result.parsed && typeof result.parsed === "object") {
    const parsed = result.parsed as Record<string, unknown>;
    const rawDecisions = Array.isArray(parsed.decisions) ? parsed.decisions : [];

    // Validate brand IDs exist in our input set
    const validBrandIds = new Set(brands.map((b) => b.id));

    const decisions: StrategyDecision[] = [];

    for (const raw of rawDecisions) {
      if (!raw || typeof raw !== "object") continue;
      const d = raw as Record<string, unknown>;

      const brandId = typeof d.brandId === "string" ? d.brandId : "";
      if (!validBrandIds.has(brandId)) {
        console.warn(`Strategist returned invalid brandId "${brandId}" — skipping.`);
        continue;
      }

      decisions.push({
        brandId,
        brandName: typeof d.brandName === "string" ? d.brandName : "",
        platform: typeof d.platform === "string" ? d.platform : "",
        angle: typeof d.angle === "string" ? d.angle : "",
        reasoning: typeof d.reasoning === "string" ? d.reasoning : "",
        priority: typeof d.priority === "number" ? d.priority : 99,
        deep_research_prompt: typeof d.deep_research_prompt === "string" ? d.deep_research_prompt : "",
      });
    }

    return decisions;
  }

  console.warn(`Strategist model response could not be parsed for tree ${treeId}. Returning empty decisions.`);
  return [];
}
