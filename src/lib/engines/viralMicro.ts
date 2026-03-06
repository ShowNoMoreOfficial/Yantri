/**
 * Viral Micro-Content Engine — X & LinkedIn Pipeline
 *
 * Identifies tweet-worthy/post-worthy content, deeply researches a single
 * narrative, and constructs high-engagement posts:
 * 1. Signal Analyzer: Filters to isolate high-potential narrative
 * 2. Viral Copywriter: Drafts hook, body, CTA tailored to brand persona
 * 3. Asset Generator: Creates image prompts to accompany the post
 * 4. HR/Ops Specialist: LinkedIn thought-leadership variant
 */

import { routeToModel } from "@/lib/modelRouter";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ViralMicroResult {
  platform: "x" | "linkedin";
  primaryPost: string;
  hook: string;
  bodyContent: string;
  cta: string;
  characterCount: number;
  hookArchetype: string;
  imagePrompt: string | null;
  linkedinVariant: string | null;
  engagementStrategy: Record<string, unknown>;
  postingPlan: Record<string, unknown>;
  model: string;
  raw: string;
}

export interface ViralMicroParams {
  narrativeAngle: string;
  brandName: string;
  brandTone: string;
  voiceRules: string;
  language: string;
  researchResults: string;
  trendHeadline: string;
  targetPlatform: "x" | "linkedin" | "both";
}

// ─── Signal Analyzer Prompt ─────────────────────────────────────────────────

function buildViralMicroPrompt(params: ViralMicroParams): string {
  return `You are the Viral Micro-Content Engine for ${params.brandName} — a specialist in crafting high-engagement, scroll-stopping micro-content for X (Twitter) and LinkedIn.

NARRATIVE ANGLE: ${params.narrativeAngle}
SOURCE TREND: ${params.trendHeadline}
BRAND: ${params.brandName}
BRAND TONE: ${params.brandTone}
VOICE RULES: ${params.voiceRules}
LANGUAGE: ${params.language}
TARGET PLATFORM: ${params.targetPlatform}

RESEARCH DOSSIER:
${params.researchResults}

PHASE 1 — SIGNAL ANALYSIS:
From the research dossier, identify the SINGLE most viral-worthy data point, contradiction, or insight. This is your ammunition. It must be:
- Verifiable (cited source)
- Surprising (not common knowledge)
- Emotionally resonant (makes people feel something)
- Shareable (people want others to see this)

PHASE 2 — VIRAL COPYWRITING:
Write the complete post using the identified signal.

For X (Twitter):
- HOOK: First line must stop the scroll. Use one of these archetypes:
  * The Number That Should Not Exist
  * The Contradiction
  * The Question Nobody Is Asking
  * The System Reveal
  * The Uncomfortable Comparison
- BODY: 1-3 supporting sentences. Data-dense. Source-cited.
- CTA: Forward-looking question or implication. Never generic.
- Total: Under 280 characters for single tweet, or 3-5 tweet thread.

For LinkedIn:
- HOOK: First 2 lines before "see more" fold. Bold statement or question.
- BODY: 400-800 words. Professional but not corporate. Data-backed.
- Structure: Hook → Context → Data → Insight → Implication → CTA
- Generous line breaks. One thought per line.
- Hashtags at end only (3-5).

PHASE 3 — ASSET GENERATION:
If an image would increase engagement, generate a detailed prompt for an AI image generator:
- For X: Data-card, comparison visual, or editorial infographic style
- For LinkedIn: Professional infographic, data visualization, or editorial photography
- Include: aesthetic, color palette (hex codes), composition, text overlay placement

PHASE 4 — LINKEDIN THOUGHT-LEADERSHIP VARIANT:
${params.targetPlatform === "both" ? "Also generate a LinkedIn variant that reframes the same narrative for professional audiences. Different angle, different tone, but same factual base." : "Skip if target is single platform."}

OUTPUT FORMAT (respond in JSON only):
{
  "signalAnalysis": {
    "chosenSignal": "The specific data point/contradiction/insight chosen",
    "viralityScore": 8,
    "reasoning": "Why this signal is the most viral-worthy"
  },
  "primaryPost": "Complete post text ready to publish",
  "hook": "Just the hook line",
  "bodyContent": "The body section",
  "cta": "The call-to-action line",
  "characterCount": 240,
  "hookArchetype": "The Contradiction",
  "imagePrompt": "Detailed image generation prompt (50-100 words) or null if no image needed",
  "linkedinVariant": ${params.targetPlatform === "both" ? '"Complete LinkedIn variant post text"' : "null"},
  "engagementStrategy": {
    "bestReplyAngle": "What the brand should reply with to the first comment",
    "quoteRetweetBait": "Why people will want to quote-retweet this",
    "anticipatedPushback": "The likely counter-argument and how to address it"
  },
  "postingPlan": {
    "time_ist": "8:30 PM",
    "time_reasoning": "Peak engagement reasoning for this audience",
    "hashtags": ["#tag1"],
    "thread_follow_up": "Optional follow-up tweet/post idea to keep engagement going"
  }
}`;
}

// ─── Generator ──────────────────────────────────────────────────────────────

export async function runViralMicroEngine(
  params: ViralMicroParams
): Promise<ViralMicroResult> {
  const { narrativeAngle, brandName } = params;

  if (!narrativeAngle?.trim()) {
    throw new Error("ViralMicroEngine: narrativeAngle is required");
  }
  if (!brandName?.trim()) {
    throw new Error("ViralMicroEngine: brandName is required");
  }

  const systemPrompt = buildViralMicroPrompt(params);
  const userMessage = `Analyze the research, identify the most viral signal, and craft the complete micro-content for: "${narrativeAngle}". Make it scroll-stopping.`;

  const result = await routeToModel("drafting", systemPrompt, userMessage, {
    temperature: 0.6,
  });

  if (!result.parsed) {
    throw new Error(
      `ViralMicroEngine: model returned unparseable response. Raw (first 300 chars): ${result.raw.slice(0, 300)}`
    );
  }

  const parsed = result.parsed as Record<string, unknown>;

  return {
    platform: params.targetPlatform === "linkedin" ? "linkedin" : "x",
    primaryPost: (parsed.primaryPost as string) ?? "",
    hook: (parsed.hook as string) ?? "",
    bodyContent: (parsed.bodyContent as string) ?? "",
    cta: (parsed.cta as string) ?? "",
    characterCount: (parsed.characterCount as number) ?? 0,
    hookArchetype: (parsed.hookArchetype as string) ?? "",
    imagePrompt: (parsed.imagePrompt as string) ?? null,
    linkedinVariant: (parsed.linkedinVariant as string) ?? null,
    engagementStrategy: (parsed.engagementStrategy as Record<string, unknown>) ?? {},
    postingPlan: (parsed.postingPlan as Record<string, unknown>) ?? {},
    model: result.model,
    raw: result.raw,
  };
}
