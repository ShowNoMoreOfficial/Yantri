import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callClaude } from "@/lib/anthropic";
import { buildEditorialScanPrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  try {
  const { batchId } = await request.json();

  const [batch, brands, rules] = await Promise.all([
    prisma.trendBatch.findUnique({
      where: { id: batchId },
      include: { trends: { orderBy: { rank: "asc" } } },
    }),
    prisma.brand.findMany({ where: { isActive: true } }),
    prisma.platformRule.findMany(),
  ]);

  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (brands.length === 0) return NextResponse.json({ error: "No active brands" }, { status: 400 });

  const { systemPrompt, userMessage } = buildEditorialScanPrompt(
    brands,
    rules,
    batch.trends
  );

  const { parsed, raw } = await callClaude(systemPrompt, userMessage);

  if (!parsed) {
    return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
  }

  // Create narratives for priorities
  const narratives = [];
  for (const priority of parsed.priorities || []) {
    const trend = batch.trends.find(
      (t) =>
        t.headline.toLowerCase().includes(priority.trend_headline?.toLowerCase()?.slice(0, 20)) ||
        priority.trend_headline?.toLowerCase()?.includes(t.headline.toLowerCase().slice(0, 20))
    ) || batch.trends[0];

    const brand = brands.find(
      (b) => b.name.toLowerCase() === priority.brand?.toLowerCase()
    ) || brands[0];

    const narrative = await prisma.narrative.create({
      data: {
        angle: priority.narrative_angle || "",
        whyThisAngle: priority.why_this_narrative || "",
        informationGap: priority.information_gap || "",
        priority: priority.priority || 1,
        platform: priority.platform || "",
        secondaryPlatform: priority.secondary_platform || null,
        format: priority.format || "",
        urgency: priority.urgency || "",
        trendId: trend.id,
        brandId: brand.id,
      },
      include: { brand: true, trend: true },
    });

    // Update trend status
    await prisma.trend.update({
      where: { id: trend.id },
      data: { status: "selected" },
    });

    // Log selection
    await prisma.editorialLog.create({
      data: {
        action: "selected",
        reasoning: priority.why_this_narrative || "",
        trendHeadline: trend.headline,
        narrativeAngle: priority.narrative_angle,
        platform: priority.platform,
        brandName: brand.name,
      },
    });

    narratives.push(narrative);
  }

  // Log skips
  for (const skip of parsed.skipped || []) {
    const trend = batch.trends.find(
      (t) =>
        t.headline.toLowerCase().includes(skip.trend_headline?.toLowerCase()?.slice(0, 20)) ||
        skip.trend_headline?.toLowerCase()?.includes(t.headline.toLowerCase().slice(0, 20))
    );

    if (trend) {
      await prisma.trend.update({
        where: { id: trend.id },
        data: { status: "skipped", skipReason: skip.reason },
      });
    }

    await prisma.editorialLog.create({
      data: {
        action: "skipped",
        reasoning: skip.reason || "",
        trendHeadline: skip.trend_headline || "",
      },
    });
  }

  return NextResponse.json({ plan: parsed, narratives, raw });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Scan error:", message);
    return NextResponse.json(
      { error: `Scan failed: ${message}. Make sure GEMINI_API_KEY is set in .env` },
      { status: 500 }
    );
  }
}
