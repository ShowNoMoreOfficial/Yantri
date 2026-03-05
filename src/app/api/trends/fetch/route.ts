import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGemini, callGeminiResearch } from "@/lib/gemini";

const TREND_ENGINE_PROMPT = `You are TREND_ENGINE. Your job is to identify and rank the most important trending topics right now for an Indian content creator focused on governance, geopolitics, and economic accountability.

SCORING CRITERIA (0-10 scale each):
1. PRESSURE: Does this force people to change behavior, money, or safety?
2. TRIGGER: Is there a specific new event today that makes this urgent?
3. NARRATIVE: Is there a clear "System Failure" or "Accountability Gap" — where an institution, policy, or power structure has failed the public?
4. SPREAD: Does this have conflict, novelty, or emotional stakes that drive sharing?
5. INFORMATION_GAP: Is mainstream coverage missing the data, system, or stakeholder that tells the real story? (0-10)

TOPIC CATEGORIES (scan only these):
- Indian domestic politics and policy
- Governance failures and successes with data
- Economic impact (prices, jobs, taxes, inflation)
- Defence and national security
- India-specific international events (must have direct India angle)
- Infrastructure, safety, and public health failures
- Constitutional and legal developments

NEVER INCLUDE:
- Entertainment, Bollywood, celebrity
- Sports
- Religious or communal framing
- Lifestyle, health trends, motivation
- Pure international events with zero India connection

TASK:
1. Identify top trending topics in India right now across the approved categories above.
2. Deduplicate similar stories — keep the most specific, data-rich version.
3. Select the Top 15 highest-impact trends.
4. Return strictly valid JSON. No preamble, no markdown, no explanation outside the JSON.

JSON FORMAT:
[
  {
    "rank": 1,
    "topic": "Concise Headline",
    "score": 95,
    "information_gap": "One sentence: what mainstream coverage is missing or underreporting about this story",
    "reason": "One sentence: analysis of the pressure, trigger, and why it scores high"
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
            (t: { rank: number; topic: string; score: number; reason: string; information_gap?: string }) => ({
              rank: t.rank || 0,
              score: t.score || 0,
              headline: t.topic || "",
              reason: t.reason || "",
              informationGap: t.information_gap || null,
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
