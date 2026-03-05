/**
 * Nano Banana — Visual Prompt Generator
 *
 * Generates structural text prompts for visual asset creation (thumbnails,
 * social cards, story frames). Does NOT call an image generation API; it
 * produces richly detailed prompt strings that can be fed into Midjourney,
 * DALL-E, Firefly, or a design brief for a human designer.
 *
 * Routes through the model router with task type "visual" (mapped to Claude
 * for structural prompt crafting precision).
 */

import { routeToModel } from "@/lib/modelRouter";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VisualPromptParams {
  narrativeAngle: string;
  platform: string;
  brandName: string;
  emotion: string;
  colorMood: string;
}

export interface VisualPromptResult {
  thumbnailPrompt: string;
  socialCardPrompt: string;
  storyPrompt?: string;
  model: string;
  raw: string;
}

// ─── Platform Dimensions ────────────────────────────────────────────────────

function getPlatformSpecs(platform: string): {
  thumbnailRatio: string;
  socialCardRatio: string;
  hasStory: boolean;
  storyRatio?: string;
  platformNotes: string;
} {
  const p = platform.toLowerCase();

  if (p.includes("youtube") || p.includes("yt")) {
    return {
      thumbnailRatio: "16:9 (1280x720)",
      socialCardRatio: "16:9 (1200x675)",
      hasStory: false,
      platformNotes:
        "YouTube thumbnails need high contrast, readable text at small sizes, expressive human face if possible. Text overlay max 3-4 words.",
    };
  }

  if (p.includes("twitter") || p.includes("x_thread") || p === "x") {
    return {
      thumbnailRatio: "16:9 (1200x675)",
      socialCardRatio: "1:1 (1080x1080)",
      hasStory: false,
      platformNotes:
        "Twitter images must be punchy data-cards or comparison visuals. Clean typography. No faces unless quoting a public figure.",
    };
  }

  if (p.includes("meta") || p.includes("instagram") || p.includes("reel")) {
    return {
      thumbnailRatio: "1:1 (1080x1080)",
      socialCardRatio: "4:5 (1080x1350)",
      hasStory: true,
      storyRatio: "9:16 (1080x1920)",
      platformNotes:
        "Instagram-first: bold colors, minimal text, scroll-stopping contrast. Story frames need swipe-up CTA zone at bottom 20%.",
    };
  }

  if (p.includes("linkedin")) {
    return {
      thumbnailRatio: "1.91:1 (1200x628)",
      socialCardRatio: "1:1 (1080x1080)",
      hasStory: false,
      platformNotes:
        "LinkedIn visuals should feel professional but not corporate-stock. Data visualizations, clean infographics, or editorial photography style.",
    };
  }

  if (p.includes("blog") || p.includes("article")) {
    return {
      thumbnailRatio: "16:9 (1200x675)",
      socialCardRatio: "2:1 (1200x600)",
      hasStory: false,
      platformNotes:
        "Blog hero images need editorial photography feel. OG social cards must work as standalone shareable images with headline text.",
    };
  }

  // Default fallback
  return {
    thumbnailRatio: "16:9 (1280x720)",
    socialCardRatio: "1:1 (1080x1080)",
    hasStory: false,
    platformNotes: "General-purpose visual with high contrast and minimal text.",
  };
}

// ─── System Prompt ──────────────────────────────────────────────────────────

function buildVisualSystemPrompt(
  params: VisualPromptParams,
  specs: ReturnType<typeof getPlatformSpecs>
): string {
  return `You are Nano Banana — the visual prompt architect for ${params.brandName}. You generate highly detailed, production-ready text prompts for AI image generators and design briefs.

You do NOT generate images. You generate the PROMPT TEXT that a designer or AI tool will use.

NARRATIVE ANGLE: ${params.narrativeAngle}
PLATFORM: ${params.platform}
BRAND: ${params.brandName}
DESIRED EMOTION: ${params.emotion}
COLOR MOOD: ${params.colorMood}

PLATFORM SPECS:
- Thumbnail ratio: ${specs.thumbnailRatio}
- Social card ratio: ${specs.socialCardRatio}
${specs.hasStory ? `- Story ratio: ${specs.storyRatio}` : ""}
- Notes: ${specs.platformNotes}

For EACH visual prompt you generate, include ALL of the following structural elements:

1. SHOT TYPE: Close-up, medium, wide, aerial, macro, split-screen, etc.
2. LENS: 35mm, 50mm, 85mm, fisheye, tilt-shift, telephoto, etc.
3. LIGHTING: Natural, studio, dramatic chiaroscuro, neon, golden hour, harsh flash, etc.
4. AESTHETIC: Photojournalistic, editorial, data-visualization, cinematic, minimalist, etc.
5. HEX COLORS: 2-4 specific hex codes that match the color mood and brand identity
6. COMPOSITION: Rule of thirds placement, leading lines, negative space usage, focal point
7. TEXT OVERLAY PLACEMENT: Where headline text should sit, font weight suggestion, contrast zone
8. EMOTIONAL REGISTER: The specific feeling the image should evoke in the viewer

OUTPUT FORMAT (respond in JSON only):
{
  "thumbnailPrompt": "Complete structural prompt for the thumbnail image...",
  "socialCardPrompt": "Complete structural prompt for the social card...",
  ${specs.hasStory ? '"storyPrompt": "Complete structural prompt for the story frame...",' : '"storyPrompt": null,'}
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "emotionNote": "Brief note on the emotional throughline connecting all visuals"
}`;
}

// ─── Generator ──────────────────────────────────────────────────────────────

/**
 * Generate structural visual prompts for a narrative's visual assets.
 *
 * Returns detailed text prompts (not images) that include shot type, lens,
 * lighting, aesthetic, hex colors, composition, and text overlay placement.
 * These prompts are ready to paste into Midjourney, DALL-E, Firefly, or
 * hand to a designer as a creative brief.
 */
export async function generateVisualPrompts(
  params: VisualPromptParams
): Promise<VisualPromptResult> {
  const { narrativeAngle, platform, brandName, emotion, colorMood } = params;

  if (!narrativeAngle?.trim()) {
    throw new Error("NanoBanana: narrativeAngle is required");
  }
  if (!platform?.trim()) {
    throw new Error("NanoBanana: platform is required");
  }
  if (!brandName?.trim()) {
    throw new Error("NanoBanana: brandName is required");
  }
  if (!emotion?.trim()) {
    throw new Error("NanoBanana: emotion is required");
  }
  if (!colorMood?.trim()) {
    throw new Error("NanoBanana: colorMood is required");
  }

  const specs = getPlatformSpecs(platform);
  const systemPrompt = buildVisualSystemPrompt(params, specs);
  const userMessage = `Generate visual prompts for this narrative now. Narrative: "${narrativeAngle}". Emotion: ${emotion}. Color mood: ${colorMood}.`;

  const result = await routeToModel("visual", systemPrompt, userMessage, {
    temperature: 0.6, // Higher creativity for visual ideation
  });

  if (!result.parsed) {
    throw new Error(
      `NanoBanana: model returned unparseable response. Raw (first 300 chars): ${result.raw.slice(0, 300)}`
    );
  }

  const parsed = result.parsed as Record<string, unknown>;

  return {
    thumbnailPrompt: (parsed.thumbnailPrompt as string) ?? "",
    socialCardPrompt: (parsed.socialCardPrompt as string) ?? "",
    storyPrompt: (parsed.storyPrompt as string) ?? undefined,
    model: result.model,
    raw: result.raw,
  };
}
