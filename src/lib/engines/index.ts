/**
 * Engine Orchestrator
 *
 * Central entry point for content generation and packaging engines.
 * Delegates prompt building to `@/lib/prompts` and model routing to
 * `@/lib/modelRouter`.
 */

import { buildContentGenerationPrompt, buildPackagingPrompt } from "@/lib/prompts";
import { routeToModel } from "@/lib/modelRouter";

// ─── Content Engine Types ───────────────────────────────────────────────────

export interface ContentEngineParams {
  narrativeAngle: string;
  trendHeadline: string;
  platform: string;
  format: string;
  brandName: string;
  brandTone: string;
  voiceRules: string;
  language: string;
  researchResults: string;
}

/**
 * Platform-specific content shape returned by each prompt builder.
 * The exact structure varies by platform (tweets array for Twitter,
 * script string for YouTube, etc.) so we type it loosely here and
 * let consumers narrow with runtime checks.
 */
export interface ContentEngineResult {
  platform: string;
  content: Record<string, unknown>;
  postingPlan: Record<string, unknown>;
  model: string;
  raw: string;
}

// ─── Packaging Engine Types ─────────────────────────────────────────────────

export interface PackagingEngineParams {
  narrativeAngle: string;
  platform: string;
  brandName: string;
  keyDataPoints: string;
}

export interface PackagingEngineResult {
  titles: {
    data_first: string;
    question: string;
    consequence: string;
  };
  thumbnail: {
    visual: string;
    text_overlay: string;
    emotion: string;
    color_mood: string;
  };
  description: string;
  tags: string[];
  posting_time: {
    time_ist: string;
    reasoning: string;
  };
  repurpose: Array<{
    target_platform: string;
    what_to_extract: string;
    format: string;
  }>;
  model: string;
  raw: string;
}

// ─── Content Engine ─────────────────────────────────────────────────────────

/**
 * Generate platform-specific, publish-ready content for a narrative.
 *
 * 1. Builds a platform-aware system prompt via `buildContentGenerationPrompt`.
 * 2. Routes the prompt to the optimal model (Claude for drafting tasks).
 * 3. Returns the parsed content object and posting plan.
 */
export async function runContentEngine(
  params: ContentEngineParams
): Promise<ContentEngineResult> {
  const {
    narrativeAngle,
    trendHeadline,
    platform,
    format,
    brandName,
    brandTone,
    voiceRules,
    language,
    researchResults,
  } = params;

  if (!narrativeAngle?.trim()) {
    throw new Error("ContentEngine: narrativeAngle is required");
  }
  if (!platform?.trim()) {
    throw new Error("ContentEngine: platform is required");
  }
  if (!brandName?.trim()) {
    throw new Error("ContentEngine: brandName is required");
  }

  const { systemPrompt, userMessage } = buildContentGenerationPrompt(
    platform,
    narrativeAngle,
    format,
    brandName,
    brandTone,
    voiceRules,
    language,
    researchResults,
    trendHeadline
  );

  const result = await routeToModel("drafting", systemPrompt, userMessage, {
    temperature: 0.5, // Slightly higher creativity for content generation
  });

  if (!result.parsed) {
    throw new Error(
      `ContentEngine: model returned unparseable response. Raw (first 300 chars): ${result.raw.slice(0, 300)}`
    );
  }

  const parsed = result.parsed as Record<string, unknown>;

  return {
    platform: (parsed.platform as string) ?? platform,
    content: (parsed.content as Record<string, unknown>) ?? {},
    postingPlan: (parsed.postingPlan as Record<string, unknown>) ?? {},
    model: result.model,
    raw: result.raw,
  };
}

// ─── Packaging Engine ───────────────────────────────────────────────────────

/**
 * Generate a complete content package (titles, thumbnail brief, SEO,
 * posting time, cross-platform repurpose plan) for a narrative piece.
 *
 * 1. Builds the packaging system prompt via `buildPackagingPrompt`.
 * 2. Routes to the optimal model (Claude for packaging tasks).
 * 3. Returns a typed packaging result.
 */
export async function runPackagingEngine(
  params: PackagingEngineParams
): Promise<PackagingEngineResult> {
  const { narrativeAngle, platform, brandName, keyDataPoints } = params;

  if (!narrativeAngle?.trim()) {
    throw new Error("PackagingEngine: narrativeAngle is required");
  }
  if (!platform?.trim()) {
    throw new Error("PackagingEngine: platform is required");
  }
  if (!brandName?.trim()) {
    throw new Error("PackagingEngine: brandName is required");
  }

  const { systemPrompt, userMessage } = buildPackagingPrompt(
    narrativeAngle,
    platform,
    brandName,
    keyDataPoints
  );

  const result = await routeToModel("packaging", systemPrompt, userMessage);

  if (!result.parsed) {
    throw new Error(
      `PackagingEngine: model returned unparseable response. Raw (first 300 chars): ${result.raw.slice(0, 300)}`
    );
  }

  const parsed = result.parsed as Record<string, unknown>;

  const titles = (parsed.titles ?? {}) as PackagingEngineResult["titles"];
  const thumbnail = (parsed.thumbnail ?? {}) as PackagingEngineResult["thumbnail"];
  const posting_time = (parsed.posting_time ?? {}) as PackagingEngineResult["posting_time"];
  const repurpose = (parsed.repurpose ?? []) as PackagingEngineResult["repurpose"];

  return {
    titles,
    thumbnail,
    description: (parsed.description as string) ?? "",
    tags: (parsed.tags as string[]) ?? [],
    posting_time,
    repurpose,
    model: result.model,
    raw: result.raw,
  };
}
