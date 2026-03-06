/**
 * Carousel Engine — Visual Carousel Pipeline (Meta / Instagram)
 *
 * Creates swipeable, narrative-driven carousel posts by:
 * 1. Breaking FactDossier into a 5-10 slide narrative arc
 * 2. Generating structural visual prompts for each slide
 * 3. Writing the overarching Meta caption with hashtags
 */

import { routeToModel } from "@/lib/modelRouter";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CarouselSlide {
  position: number;
  role: "hook" | "context" | "escalation" | "data" | "climax" | "cta";
  headline: string;
  bodyText: string;
  visualPrompt: string;
  textOverlay: string;
  colorHex: string;
}

export interface CarouselStrategyResult {
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
  narrativeArc: string;
  slideCount: number;
  model: string;
  raw: string;
}

export interface CarouselEngineParams {
  narrativeAngle: string;
  brandName: string;
  brandTone: string;
  voiceRules: string;
  language: string;
  researchResults: string;
  trendHeadline: string;
}

// ─── System Prompt ──────────────────────────────────────────────────────────

function buildCarouselSystemPrompt(params: CarouselEngineParams): string {
  return `You are the Carousel Strategist — an Instagram/Meta carousel architect for ${params.brandName}. You break complex narratives into swipeable, visually-driven carousel posts that educate and engage.

NARRATIVE ANGLE: ${params.narrativeAngle}
SOURCE TREND: ${params.trendHeadline}
BRAND: ${params.brandName}
BRAND TONE: ${params.brandTone}
VOICE RULES: ${params.voiceRules}
LANGUAGE: ${params.language}

RESEARCH DOSSIER:
${params.researchResults}

CAROUSEL ARCHITECTURE:
Build a 5-10 slide narrative arc following this structure:
1. HOOK (Slide 1): Stop the scroll. A bold stat, question, or contradiction. Text overlay only — no long copy.
2. CONTEXT (Slides 2-3): Set the stage. What happened? Why does it matter? One idea per slide.
3. ESCALATION (Slides 4-6): Build tension. Data points, stakeholder positions, contradictions. Each slide reveals something new.
4. CLIMAX (Slide 7-8): The core insight. The "aha" moment. The thing nobody else is saying.
5. CTA (Final Slide): What should the reader do? Share, save, comment, follow. Clear and specific.

VISUAL CONSISTENCY RULES:
- All slides must share a consistent color palette (provide hex codes)
- Text overlay placement must be consistent across slides (same zone, same font weight suggestion)
- Visual style must be consistent: same aesthetic (editorial, data-viz, minimalist, etc.)
- Each slide's visual prompt must specify: shot type, color palette, text placement zone, aesthetic style

SLIDE RULES:
- Maximum 40 words of body text per slide (people don't read walls of text on carousels)
- Headline: bold, 3-8 words, instantly communicates the slide's point
- Text overlay: the 2-5 words that appear ON the image itself
- Every data point must cite its source

CAPTION RULES:
- 150-300 words
- Hook in first line (before the fold)
- Call-to-action: "Save this for later" / "Share with someone who needs to see this"
- 5-10 relevant hashtags at the end
- No external links

OUTPUT FORMAT (respond in JSON only):
{
  "narrativeArc": "One sentence describing the story arc of this carousel",
  "slides": [
    {
      "position": 1,
      "role": "hook",
      "headline": "Bold 3-8 word headline",
      "bodyText": "Max 40 words of supporting text for this slide",
      "visualPrompt": "Detailed structural prompt for the slide image: aesthetic, colors, composition, text placement zone, visual elements. 50-80 words.",
      "textOverlay": "2-5 words that appear ON the image",
      "colorHex": "#hex primary color for this slide"
    }
  ],
  "caption": "Full Instagram caption text...",
  "hashtags": ["#tag1", "#tag2"],
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "postingTime": {
    "time_ist": "12:30 PM",
    "reasoning": "Peak engagement reasoning"
  }
}`;
}

// ─── Generator ──────────────────────────────────────────────────────────────

export async function runCarouselEngine(
  params: CarouselEngineParams
): Promise<CarouselStrategyResult> {
  const { narrativeAngle, brandName } = params;

  if (!narrativeAngle?.trim()) {
    throw new Error("CarouselEngine: narrativeAngle is required");
  }
  if (!brandName?.trim()) {
    throw new Error("CarouselEngine: brandName is required");
  }

  const systemPrompt = buildCarouselSystemPrompt(params);
  const userMessage = `Break this narrative into a visually consistent, swipeable Instagram carousel. Narrative: "${narrativeAngle}". Create the full slide deck with visual prompts and caption.`;

  const result = await routeToModel("drafting", systemPrompt, userMessage, {
    temperature: 0.5,
  });

  if (!result.parsed) {
    throw new Error(
      `CarouselEngine: model returned unparseable response. Raw (first 300 chars): ${result.raw.slice(0, 300)}`
    );
  }

  const parsed = result.parsed as Record<string, unknown>;
  const slides = (parsed.slides as CarouselSlide[]) ?? [];

  return {
    slides,
    caption: (parsed.caption as string) ?? "",
    hashtags: (parsed.hashtags as string[]) ?? [],
    narrativeArc: (parsed.narrativeArc as string) ?? "",
    slideCount: slides.length,
    model: result.model,
    raw: result.raw,
  };
}
