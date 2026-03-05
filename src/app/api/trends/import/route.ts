import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processSignalsToTrees } from "@/lib/ingestHelper";

export async function POST(request: Request) {
  const body = await request.json();
  const { trends, source } = body;

  // Create the TrendBatch as before (legacy model)
  const batch = await prisma.trendBatch.create({
    data: {
      source: source || "khabri_manual",
      trends: {
        create: trends.map(
          (t: { rank: number; score: number; headline: string; reason: string }) => ({
            rank: t.rank,
            score: t.score,
            headline: t.headline,
            reason: t.reason,
          })
        ),
      },
    },
    include: { trends: true },
  });

  // Also sync imported trends into NarrativeTrees for the new system
  const signals = trends.map(
    (t: { rank: number; score: number; headline: string; reason: string }) => ({
      title: t.headline,
      score: t.score,
      reason: t.reason,
      source: source || "khabri_manual",
      metadata: { rank: t.rank, batchId: batch.id },
    })
  );

  const treeResult = await processSignalsToTrees(signals);

  return NextResponse.json(
    {
      ...batch,
      narrativeTreeSync: {
        newTrees: treeResult.newTrees,
        appendedTo: treeResult.appendedTo,
        skipped: treeResult.skipped,
      },
    },
    { status: 201 }
  );
}
