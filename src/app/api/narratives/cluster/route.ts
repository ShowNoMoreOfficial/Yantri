import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processSignalsToTrees } from "@/lib/ingestHelper";

/**
 * POST /api/narratives/cluster
 *
 * Incrementally clusters all unclustered trends into NarrativeTrees.
 * - Finds trends that don't have a matching NarrativeNode yet
 * - Uses AI to assign them to existing clusters or create new ones
 * - Never destroys existing clusters — only adds to them
 * - Auto-archives stale clusters (7+ days without new signals)
 */
export async function POST() {
  try {
    // Get all trends
    const allTrends = await prisma.trend.findMany({
      orderBy: { score: "desc" },
      select: { headline: true, reason: true, score: true },
    });

    if (allTrends.length === 0) {
      return NextResponse.json(
        { error: "No trends found. Import trends first." },
        { status: 400 }
      );
    }

    // Find which trend headlines already exist as nodes in NarrativeTrees
    const existingNodes = await prisma.narrativeNode.findMany({
      select: { signalTitle: true },
    });
    const existingTitles = new Set(existingNodes.map((n) => n.signalTitle.toLowerCase()));

    // Filter to unclustered trends only
    const unclustered = allTrends.filter(
      (t) => !existingTitles.has(t.headline.toLowerCase())
    );

    if (unclustered.length === 0) {
      return NextResponse.json({
        message: "All trends are already clustered",
        clustered: 0,
        totalSignals: allTrends.length,
        alreadyClustered: allTrends.length,
      });
    }

    // Convert to signals and process through AI clustering
    const signals = unclustered.map((t) => ({
      title: t.headline,
      score: t.score,
      reason: t.reason,
      source: "manual_cluster",
    }));

    const result = await processSignalsToTrees(signals);

    return NextResponse.json({
      clustered: result.ingested,
      newClusters: result.newTrees.length,
      appendedToExisting: result.appendedTo.length,
      skipped: result.skipped.length,
      archived: result.archived,
      totalSignals: allTrends.length,
      details: {
        newTrees: result.newTrees,
        appendedTo: result.appendedTo,
        skipped: result.skipped,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Clustering failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
