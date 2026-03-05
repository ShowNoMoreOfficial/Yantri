/**
 * Model Router — delegates tasks to the optimal AI model.
 *
 * Gemini 1.5 Pro  → Strategy, long-context ingestion, research synthesis, feedback analysis
 * Claude Opus     → High-precision drafting, voice-mimicry, final packaging
 */

import { callGemini, callGeminiResearch, type CallGeminiOptions } from "./gemini";

// ─── Types ──────────────────────────────────────────────────────────────────

export type TaskType =
  | "strategy"      // Editorial scan, trend evaluation, platform routing
  | "research"      // Web search + synthesis into FactDossier
  | "drafting"      // Content writing (threads, scripts, articles)
  | "packaging"     // Title variants, thumbnails, SEO, posting plans
  | "analysis"      // Performance feedback loop analysis
  | "visual";       // Nano Banana structural prompt generation

export type ModelId = "gemini" | "claude";

interface ModelResult {
  parsed: unknown;
  raw: string;
  model: ModelId;
}

// ─── Routing Logic ──────────────────────────────────────────────────────────

const TASK_MODEL_MAP: Record<TaskType, ModelId> = {
  strategy:  "gemini",   // Long context, multi-brand reasoning
  research:  "gemini",   // Google Search grounding
  drafting:  "claude",   // Voice precision, creative writing
  packaging: "claude",   // Nuanced title/thumbnail generation
  analysis:  "gemini",   // Data pattern recognition
  visual:    "claude",   // Structural prompt crafting
};

export function getModelForTask(task: TaskType): ModelId {
  return TASK_MODEL_MAP[task];
}

// ─── Claude Client ──────────────────────────────────────────────────────────

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<{ parsed: unknown; raw: string }> {
  // Dynamic import to avoid loading SDK when not needed
  const { default: Anthropic } = await import("@anthropic-ai/sdk");

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: options?.maxTokens ?? 8192,
    temperature: options?.temperature ?? 0.3,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = response.content
    .filter((block) => block.type === "text")
    .map((block) => {
      if (block.type === "text") return block.text;
      return "";
    })
    .join("");

  // Try to parse as JSON
  try {
    return { parsed: JSON.parse(raw), raw };
  } catch {
    // Try extracting JSON from markdown fences
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return { parsed: JSON.parse(jsonMatch[1].trim()), raw };
      } catch {
        // Fall through
      }
    }
    return { parsed: null, raw };
  }
}

// ─── Unified Router ─────────────────────────────────────────────────────────

export async function routeToModel(
  task: TaskType,
  systemPrompt: string,
  userMessage: string,
  options?: {
    forceModel?: ModelId;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<ModelResult> {
  const model = options?.forceModel ?? getModelForTask(task);

  if (model === "claude") {
    const result = await callClaude(systemPrompt, userMessage, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });
    return { ...result, model: "claude" };
  }

  // Gemini path
  if (task === "research") {
    const raw = await callGeminiResearch(systemPrompt, userMessage);
    return { parsed: null, raw, model: "gemini" };
  }

  const geminiOpts: CallGeminiOptions = {};
  if (options?.maxTokens) geminiOpts.maxOutputTokens = options.maxTokens;
  if (options?.temperature) geminiOpts.temperature = options.temperature;

  const result = await callGemini(systemPrompt, userMessage, geminiOpts);
  return { ...result, model: "gemini" };
}
