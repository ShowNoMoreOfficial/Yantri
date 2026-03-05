import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGemini, callGeminiResearch } from "@/lib/gemini";

const TREND_ENGINE_PROMPT = `You are TREND_ENGINE. Your job is to identify and rank the most important trending topics right now for an Indian content creator.

SCORING CRITERIA (0-10 scale each):
1. PRESSURE: Does this force people to change behavior/money/safety?
2. TRIGGER: Is there a specific new event today?
3. NARRATIVE: Is there a clear "Villain vs Victim" or "System Failure"?
4. SPREAD: Conflict, Emotion, Novelty.

TASK:
1. Identify the top trending topics in India right now across politics, economy, defence, technology, governance, and culture.
2. Deduplicate similar stories.
3. Select the Top 15 highest-impact trends.
4. Return strictly valid JSON.

JSON FORMAT:
[
  {
    "rank": 1,
    "topic": "Concise Headline",
    "score": 95,
    "reason": "Detailed 1-sentence analysis of the pressure/trigger."
  }
]`;

export async function POST() {
  try {
    // Step 1: Use Gemini with Google Search grounding to find current trends
    const rawSignals = await callGeminiResearch(
      "You are a news aggregator. Find the most important trending news topics in India right now. Cover: politics, economy, defence, technology, governance, culture, and social issues. For each topic, give a concise headline and brief context. List at least 20 topics.",
      "What are the top trending news topics and events in India right now? Include topics from Reddit India, Google News India, and social media trends. Be specific with names, dates, and events."
    );

    if (!rawSignals.trim()) {
      return NextResponse.json(
        { error: "No signals fetched from search" },
        { status: 500 }
      );
    }

    // Step 2: Rank the signals using Gemini JSON mode
    const rankResult = await callGemini(
      TREND_ENGINE_PROMPT,
      `RAW SIGNALS:\n${rawSignals}`
    );

    const ranked = rankResult.parsed;

    if (!Array.isArray(ranked) || ranked.length === 0) {
      return NextResponse.json(
        { error: "No trends returned from ranking", raw: rankResult.raw },
        { status: 500 }
      );
    }

    // Step 3: Import as a new batch
    const batch = await prisma.trendBatch.create({
      data: {
        source: "khabri_auto",
        trends: {
          create: ranked.map(
            (t: { rank: number; topic: string; score: number; reason: string }) => ({
              rank: t.rank || 0,
              score: t.score || 0,
              headline: t.topic || "",
              reason: t.reason || "",
            })
          ),
        },
      },
      include: { trends: true },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Trend fetch error:", message);
    return NextResponse.json(
      { error: `Trend fetch failed: ${message}` },
      { status: 500 }
    );
  }
}
