/**
 * Model Router — delegates all AI tasks to Gemini 3.1 Pro Preview.
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

export type ModelId = "gemini";

interface ModelResult {
  parsed: unknown;
  raw: string;
  model: ModelId;
}

// ─── Routing Logic ──────────────────────────────────────────────────────────

export function getModelForTask(_task: TaskType): ModelId {
  return "gemini";
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
  // Research tasks use Google Search grounding
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
