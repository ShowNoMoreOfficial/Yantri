/**
 * HR/Ops Engine — Operational & People Content Generator
 *
 * Generates LinkedIn-formatted content for ShowNoMore's internal brand:
 * hiring posts, culture showcases, methodology articles, and team updates.
 *
 * This engine serves the operational side of the media studio, turning
 * internal topics into talent-attracting, methodology-showcasing
 * professional content.
 */

import { routeToModel } from "@/lib/modelRouter";

// ─── Types ──────────────────────────────────────────────────────────────────

export type HRContentType =
  | "hiring_post"
  | "culture_showcase"
  | "methodology_article"
  | "team_update";

export interface HRContentParams {
  topic: string;
  contentType: HRContentType;
  brandName: string;
  targetAudience: string;
}

export interface HRContentResult {
  post: string;
  headline: string;
  hashtags: string[];
  postingTime: {
    time_ist: string;
    reasoning: string;
  };
  engagementNotes: string;
  contentType: HRContentType;
  wordCount: number;
  model: string;
  raw: string;
}

// ─── Content Type Directives ────────────────────────────────────────────────

function getContentTypeDirective(contentType: HRContentType): string {
  switch (contentType) {
    case "hiring_post":
      return `CONTENT TYPE: HIRING POST
Write a compelling hiring post that:
- Opens with the MISSION, not the job title. Lead with what the person will BUILD, not their credentials.
- Describes the role in terms of impact: what will this person change, create, or own?
- Shows the team culture through specifics (tools used, rituals, pace, autonomy level).
- Includes 3-5 clear requirements but frames them as "You'll thrive here if..." not "Must have X years of..."
- Ends with a clear CTA: how to apply, what to send, who to contact.
- Avoids corporate jargon: no "rockstars", "ninjas", "fast-paced environment", or "competitive salary".
- Word count: 400-800 words.`;

    case "culture_showcase":
      return `CONTENT TYPE: CULTURE SHOWCASE
Write a culture-revealing post that:
- Tells a SPECIFIC STORY from inside the studio — a real moment, decision, or practice.
- Shows (not tells) the values: demonstrate the culture through an anecdote, not a values list.
- Makes the reader think "I want to work there" or "I want to work WITH them."
- Includes a concrete detail that proves authenticity (a tool, a ritual, a number, a quote).
- Balances vulnerability with confidence — acknowledges challenges without being self-deprecating.
- Ends with a reflection or insight that connects the story to a broader professional truth.
- Word count: 400-700 words.`;

    case "methodology_article":
      return `CONTENT TYPE: METHODOLOGY ARTICLE
Write a methodology deep-dive that:
- Opens with a PROBLEM the audience recognizes — then reveals the framework/approach used to solve it.
- Breaks down the methodology into clear, numbered or named steps/principles.
- Includes at least one concrete example or case study showing the methodology in action.
- Provides enough detail that the reader could attempt to apply it (generous, not gatekeeping).
- Positions the brand as a thought leader through expertise, not self-promotion.
- Closes with results or outcomes that validate the approach.
- Word count: 600-1200 words.`;

    case "team_update":
      return `CONTENT TYPE: TEAM UPDATE
Write a team/company update post that:
- Opens with the NEWS or MILESTONE — don't bury it under context.
- Frames the update in terms of what it means for the audience (not just internally).
- Credits specific people or teams by role (not necessarily by name unless public figures).
- Shows growth trajectory: where the team was, where it is now, where it's headed.
- Maintains excitement without being breathless — professional enthusiasm.
- Includes a forward-looking statement that creates anticipation.
- Word count: 300-600 words.`;
  }
}

// ─── System Prompt ──────────────────────────────────────────────────────────

function buildHRSystemPrompt(params: HRContentParams): string {
  const directive = getContentTypeDirective(params.contentType);

  return `You are the HR/Ops Content Engine for ${params.brandName} — a narrative intelligence media studio. You write LinkedIn-first professional content that serves three strategic goals simultaneously:

1. GROWTH NARRATIVE — Every post reinforces that this studio is building something significant, growing fast, and operating at a level above its size.
2. TALENT ATTRACTION — Every post makes exceptional people want to join, collaborate, or pay attention.
3. METHODOLOGY SHOWCASE — Every post reveals (or hints at) a distinctive way of working that positions the brand as an innovator in media operations.

BRAND: ${params.brandName}
TOPIC: ${params.topic}
TARGET AUDIENCE: ${params.targetAudience}

${directive}

TONE & VOICE RULES:
- Professional but not corporate. Warm but not casual. Confident but not arrogant.
- Write like a respected studio head speaking at a media conference, not like an HR department.
- Use "we" naturally. Avoid "I" unless attributing a quote.
- Data-informed: include numbers where they strengthen the narrative (team size growth, output metrics, reach numbers).
- No buzzwords: avoid "synergy", "leverage", "disrupt", "hustle culture", "work hard play hard".
- Culturally aware: this is an Indian media studio with global ambitions. Reflect that context naturally.

LINKEDIN FORMATTING RULES:
- HOOK in the first 2 lines (before the "see more" fold). This line must stop the scroll.
- Generous line breaks: one thought per line for mobile readability.
- Structure: Hook -> Story/Context -> Detail/Framework -> Implication -> CTA
- Hashtags (3-5) go at the END only, never scattered through the post.
- NO external links in the body (LinkedIn deprioritizes posts with links).
- Use Unicode sparingly (bullet points are fine, avoid excessive emojis).

OUTPUT FORMAT (respond in JSON only):
{
  "headline": "A compelling 1-line summary for internal tracking (not part of the post)",
  "post": "The complete LinkedIn post text with line breaks...",
  "word_count": 550,
  "hashtags": ["#MediaInnovation", "#Hiring", "#ShowNoMore"],
  "posting_time": {
    "time_ist": "9:00 AM",
    "reasoning": "Early morning catches professionals during commute/morning scroll"
  },
  "engagement_notes": "Tactical notes: who to tag, what to reply to first comment, how to boost reach"
}`;
}

// ─── Generator ──────────────────────────────────────────────────────────────

/**
 * Generate LinkedIn-formatted HR/operational content for ShowNoMore.
 *
 * Supports four content types: hiring posts, culture showcases,
 * methodology articles, and team updates. Each type has tailored
 * directives that guide the model toward the right structure, tone,
 * and strategic positioning.
 */
export async function generateHRContent(
  params: HRContentParams
): Promise<HRContentResult> {
  const { topic, contentType, brandName, targetAudience } = params;

  if (!topic?.trim()) {
    throw new Error("HROpsEngine: topic is required");
  }
  if (!contentType?.trim()) {
    throw new Error("HROpsEngine: contentType is required");
  }
  if (!brandName?.trim()) {
    throw new Error("HROpsEngine: brandName is required");
  }

  const validTypes: HRContentType[] = [
    "hiring_post",
    "culture_showcase",
    "methodology_article",
    "team_update",
  ];

  if (!validTypes.includes(contentType)) {
    throw new Error(
      `HROpsEngine: invalid contentType "${contentType}". Must be one of: ${validTypes.join(", ")}`
    );
  }

  const systemPrompt = buildHRSystemPrompt(params);
  const userMessage = `Generate a ${contentType.replace(/_/g, " ")} about: "${topic}". Target audience: ${targetAudience || "media professionals, potential hires, and industry peers"}.`;

  const result = await routeToModel("drafting", systemPrompt, userMessage, {
    temperature: 0.4, // Balanced: professional but not robotic
  });

  if (!result.parsed) {
    throw new Error(
      `HROpsEngine: model returned unparseable response. Raw (first 300 chars): ${result.raw.slice(0, 300)}`
    );
  }

  const parsed = result.parsed as Record<string, unknown>;

  return {
    post: (parsed.post as string) ?? "",
    headline: (parsed.headline as string) ?? "",
    hashtags: (parsed.hashtags as string[]) ?? [],
    postingTime: (parsed.posting_time as HRContentResult["postingTime"]) ?? {
      time_ist: "",
      reasoning: "",
    },
    engagementNotes: (parsed.engagement_notes as string) ?? "",
    contentType,
    wordCount: (parsed.word_count as number) ?? 0,
    model: result.model,
    raw: result.raw,
  };
}
