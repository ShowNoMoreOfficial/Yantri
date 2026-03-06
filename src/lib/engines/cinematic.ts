/**
 * Cinematic Engine — YouTube Long-Form Pipeline
 *
 * Complete storyboarding, B-roll curation, and video planning:
 * 1. Scriptwriter: Multi-act YouTube script with production cues
 * 2. Storyboard Coordinator: Frame-by-frame visual layout planning
 * 3. B-Roll Director: Generates cinematic b-roll asset prompts
 */

import { routeToModel } from "@/lib/modelRouter";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ScriptSection {
  title: string;
  timestamp: string;
  script: string;
  productionCues: string[];
  visualAnchors: string[];
}

export interface StoryboardFrame {
  frameNumber: number;
  timestamp: string;
  shotType: string;
  description: string;
  visualPrompt: string;
  duration: string;
  transitionTo: string;
}

export interface BRollAsset {
  id: number;
  description: string;
  generationPrompt: string;
  duration: string;
  placementTimestamp: string;
  style: "cinematic" | "documentary" | "data_viz" | "archival" | "ambient";
}

export interface CinematicResult {
  script: {
    sections: ScriptSection[];
    fullScript: string;
    runtimeEstimate: string;
    actStructure: string;
  };
  storyboard: StoryboardFrame[];
  brollAssets: BRollAsset[];
  postingPlan: Record<string, unknown>;
  model: string;
  raw: string;
}

export interface CinematicEngineParams {
  narrativeAngle: string;
  brandName: string;
  brandTone: string;
  voiceRules: string;
  language: string;
  researchResults: string;
  trendHeadline: string;
  targetRuntime?: string; // "10-15" or "15-20" minutes
}

// ─── Scriptwriter ───────────────────────────────────────────────────────────

function buildScriptwriterPrompt(params: CinematicEngineParams): string {
  const runtime = params.targetRuntime ?? "10-15";

  return `You are the Cinematic Scriptwriter for ${params.brandName} — a YouTube long-form script architect who produces shoot-ready, multi-act video scripts with complete production cues and storyboard coordination.

NARRATIVE ANGLE: ${params.narrativeAngle}
SOURCE TREND: ${params.trendHeadline}
BRAND: ${params.brandName}
BRAND TONE: ${params.brandTone}
VOICE RULES: ${params.voiceRules}
LANGUAGE: ${params.language}
TARGET RUNTIME: ${runtime} minutes

RESEARCH DOSSIER:
${params.researchResults}

SCRIPT ARCHITECTURE:
Write a complete ${runtime}-minute video script following this multi-act structure:

ACT 1 — THE HOOK (0:00 - 0:30)
- Open with the most shocking number, contradiction, or question from the dossier
- The viewer must feel compelled to keep watching within 5 seconds
- Include: [GRAPHIC], [MUSIC: mood], [CUT TO] production cues

ACT 2 — THE CONTEXT (0:30 - 3:00)
- Set the stage: what happened, when, who's involved
- Use timeline from dossier. Every claim cited.
- Include B-roll suggestions in [B-ROLL: description] cues

ACT 3 — THE ESCALATION (3:00 - 7:00)
- Layer revelations. Each section raises the stakes.
- Stakeholder positions, contradictions, data points
- Include key visual anchors (what the viewer SEES during each segment)

ACT 4 — THE REVELATION (7:00 - 10:00)
- The core insight. What nobody else is saying.
- Ground reality vs. official narrative
- Include comparison graphics, data visualization cues

ACT 5 — THE IMPLICATIONS (10:00 - ${runtime === "15-20" ? "18:00" : "13:00"})
- What happens next. What should the audience watch for.
- Historical precedents, policy context
- Forward-looking questions

ACT 6 — THE CLOSE (final 1-2 minutes)
- Tie back to the hook. Full circle.
- Strong CTA (subscribe, comment with specific question)
- No generic endings

STORYBOARD:
For each major visual transition, provide a storyboard frame:
- Frame number, timestamp, shot type (close-up, wide, graphic, split-screen)
- Visual description (what the viewer sees)
- Generation prompt (for AI or stock footage search)
- Duration and transition type

B-ROLL ASSETS:
Identify 5-10 B-roll assets needed. For each:
- Description of what it shows
- Generation prompt (for Runway/Luma or stock search)
- Style (cinematic, documentary, data_viz, archival, ambient)
- Where it plays in the script (timestamp)

OUTPUT FORMAT (respond in JSON only):
{
  "script": {
    "sections": [
      {
        "title": "Act 1: The Hook",
        "timestamp": "0:00-0:30",
        "script": "Full script text with [PRODUCTION CUES] inline...",
        "productionCues": ["[GRAPHIC: Split screen]", "[MUSIC: Tense, building]"],
        "visualAnchors": ["Description of what viewer sees during this section"]
      }
    ],
    "fullScript": "Complete concatenated script text...",
    "runtimeEstimate": "12-14 minutes",
    "actStructure": "6-act escalation with circular close"
  },
  "storyboard": [
    {
      "frameNumber": 1,
      "timestamp": "0:00",
      "shotType": "close-up",
      "description": "What the viewer sees",
      "visualPrompt": "Detailed prompt for generating this frame (50-80 words)",
      "duration": "5s",
      "transitionTo": "cut"
    }
  ],
  "brollAssets": [
    {
      "id": 1,
      "description": "What this B-roll shows",
      "generationPrompt": "Detailed prompt for Runway/Luma generation or stock search query (50-100 words)",
      "duration": "8s",
      "placementTimestamp": "1:30-1:38",
      "style": "cinematic"
    }
  ],
  "postingPlan": {
    "titles": {
      "data_first": "Title leading with number (50-70 chars)",
      "question": "Curiosity-gap title (50-70 chars)",
      "consequence": "Impact title (50-70 chars)"
    },
    "thumbnail": {
      "visual": "What the thumbnail shows",
      "textOverlay": "3-4 words max",
      "emotion": "shock|curiosity|anger|disbelief",
      "colorMood": "dark editorial palette"
    },
    "description": "Full YouTube description with timestamps and SEO",
    "tags": ["tag1", "tag2"],
    "time_ist": "6:00 PM",
    "time_reasoning": "Peak reasoning"
  }
}`;
}

// ─── Generator ──────────────────────────────────────────────────────────────

export async function runCinematicEngine(
  params: CinematicEngineParams
): Promise<CinematicResult> {
  const { narrativeAngle, brandName } = params;

  if (!narrativeAngle?.trim()) {
    throw new Error("CinematicEngine: narrativeAngle is required");
  }
  if (!brandName?.trim()) {
    throw new Error("CinematicEngine: brandName is required");
  }

  const systemPrompt = buildScriptwriterPrompt(params);
  const userMessage = `Write the complete YouTube script with storyboard and B-roll plan for: "${narrativeAngle}". Include all production cues and visual asset prompts.`;

  const result = await routeToModel("drafting", systemPrompt, userMessage, {
    maxTokens: 16384,
    temperature: 0.5,
  });

  if (!result.parsed) {
    throw new Error(
      `CinematicEngine: model returned unparseable response. Raw (first 300 chars): ${result.raw.slice(0, 300)}`
    );
  }

  const parsed = result.parsed as Record<string, unknown>;
  const script = (parsed.script ?? {}) as Record<string, unknown>;

  return {
    script: {
      sections: (script.sections as ScriptSection[]) ?? [],
      fullScript: (script.fullScript as string) ?? "",
      runtimeEstimate: (script.runtimeEstimate as string) ?? "",
      actStructure: (script.actStructure as string) ?? "",
    },
    storyboard: (parsed.storyboard as StoryboardFrame[]) ?? [],
    brollAssets: (parsed.brollAssets as BRollAsset[]) ?? [],
    postingPlan: (parsed.postingPlan as Record<string, unknown>) ?? {},
    model: result.model,
    raw: result.raw,
  };
}
