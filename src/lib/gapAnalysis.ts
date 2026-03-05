/**
 * Gap Analysis Engine
 *
 * Examines a NarrativeTree's latest signals, existing content coverage,
 * and information delta to determine whether new content is warranted.
 */

import { prisma } from "@/lib/prisma";
import { routeToModel } from "@/lib/modelRouter";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GapAnalysisResult {
  needsNewContent: boolean;
  reasoning: string;
  suggestedPlatforms: string[];
  suggestedBrands: string[];
  urgency: "high" | "medium" | "low";
}

// ─── Main Function ──────────────────────────────────────────────────────────

/**
 * Analyze a NarrativeTree to determine if new content should be created.
 *
 * Fetches the tree with its nodes, dossier, and any existing ContentPieces,
 * then uses the strategy model to evaluate coverage gaps.
 */
export async function analyzeGap(treeId: string): Promise<GapAnalysisResult> {
  // 1. Fetch the tree with all related data
  const tree = await prisma.narrativeTree.findUniqueOrThrow({
    where: { id: treeId },
    include: {
      nodes: {
        orderBy: { identifiedAt: "desc" },
      },
      dossier: true,
    },
  });

  // 2. Fetch existing ContentPieces linked to this tree
  const existingContent = await prisma.contentPiece.findMany({
    where: { treeId },
    include: { brand: { select: { id: true, name: true } } },
  });

  // 3. Fetch all active brands for reference
  const activeBrands = await prisma.brand.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      activePlatforms: true,
      editorialCovers: true,
    },
  });

  // 4. Build the analysis context
  const latestSignals = tree.nodes.slice(0, 10).map((node) => ({
    title: node.signalTitle,
    score: node.signalScore,
    addedAt: node.identifiedAt.toISOString(),
    data: node.signalData,
  }));

  const existingCoverage = existingContent.map((piece) => ({
    brandName: piece.brand.name,
    platform: piece.platform,
    status: piece.status,
    createdAt: piece.createdAt.toISOString(),
  }));

  const availableBrands = activeBrands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    platforms: JSON.parse(brand.activePlatforms) as { name: string; role: string }[],
    covers: JSON.parse(brand.editorialCovers) as string[],
  }));

  const hasDossier = !!tree.dossier;

  // 5. Build the prompt
  const systemPrompt = `You are an editorial gap analysis engine for a multi-brand newsroom. Your job is to evaluate whether a narrative tree warrants NEW content creation.

NARRATIVE TREE: "${tree.rootTrend}"
TREE STATUS: ${tree.status}
TREE CREATED: ${tree.createdAt.toISOString()}
TREE LAST UPDATED: ${tree.updatedAt.toISOString()}
HAS FACT DOSSIER: ${hasDossier}

EVALUATE using these criteria:
1. SIGNAL RECENCY - How fresh are the latest signals? New signals within 24 hours are high-urgency.
2. EXISTING COVERAGE - What content already exists for this tree? Which platforms and brands are already covered?
3. INFORMATION DELTA - How much new information do the latest signals add compared to what's already been covered?
4. BRAND FIT - Which active brands have editorial territory that matches this narrative?
5. PLATFORM GAPS - Which platforms have NOT been covered yet but should be?

DECISION RULES:
- If there are new signals but all platforms for all relevant brands are already covered with PUBLISHED or APPROVED content, needsNewContent = false unless the information delta is significant.
- If no content exists at all, needsNewContent = true.
- If content exists but on limited platforms, and new signals add meaningful information, needsNewContent = true.
- If the tree has been ARCHIVED or MERGED, needsNewContent = false.

OUTPUT FORMAT (respond in JSON only):
{
  "needsNewContent": true,
  "reasoning": "2-3 sentence explanation of the decision",
  "suggestedPlatforms": ["YOUTUBE", "X_THREAD"],
  "suggestedBrands": ["Brand Name 1"],
  "urgency": "high"
}

URGENCY LEVELS:
- "high": Breaking news, new signals within 6 hours, no existing coverage
- "medium": New signals within 24 hours, partial coverage exists
- "low": Signals older than 24 hours, or tree is well-covered but has a minor gap`;

  const userMessage = `Analyze this narrative tree for content gaps:

LATEST SIGNALS (newest first):
${JSON.stringify(latestSignals, null, 2)}

EXISTING CONTENT COVERAGE:
${existingCoverage.length > 0 ? JSON.stringify(existingCoverage, null, 2) : "No content exists for this tree yet."}

AVAILABLE BRANDS:
${JSON.stringify(availableBrands, null, 2)}`;

  // 6. Call the strategy model
  const result = await routeToModel("strategy", systemPrompt, userMessage, {
    temperature: 0.2,
  });

  // 7. Parse and validate the response
  if (result.parsed && typeof result.parsed === "object") {
    const parsed = result.parsed as Record<string, unknown>;
    return {
      needsNewContent: Boolean(parsed.needsNewContent),
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "No reasoning provided.",
      suggestedPlatforms: Array.isArray(parsed.suggestedPlatforms)
        ? (parsed.suggestedPlatforms as string[])
        : [],
      suggestedBrands: Array.isArray(parsed.suggestedBrands)
        ? (parsed.suggestedBrands as string[])
        : [],
      urgency: isValidUrgency(parsed.urgency) ? parsed.urgency : "medium",
    };
  }

  // Fallback: if parsing failed, default to needing content if tree has no content
  console.warn(`Gap analysis model response could not be parsed for tree ${treeId}. Falling back to heuristic.`);
  return {
    needsNewContent: existingContent.length === 0,
    reasoning: "Model response could not be parsed. Defaulting based on whether content exists.",
    suggestedPlatforms: [],
    suggestedBrands: [],
    urgency: "medium",
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidUrgency(value: unknown): value is "high" | "medium" | "low" {
  return value === "high" || value === "medium" || value === "low";
}
