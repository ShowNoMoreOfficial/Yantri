import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGemini } from "@/lib/gemini";
import { generateEmbedding } from "@/lib/embeddings";

interface ClusterResult {
  majorTrend: string;
  summary: string;
  subTrends: string[];
}

const CLUSTER_SYSTEM_PROMPT = `You are a narrative intelligence analyst. Given a list of news trends/signals, your job is to identify MAJOR narrative clusters and group related sub-trends under each.

Rules:
- Identify 3-10 major overarching narratives from the trends
- Each major narrative should be a broad theme (e.g., "Iran-Israel Military Escalation", "Indian Economic Policy Shifts")
- Assign every trend as a sub-trend under exactly ONE major narrative
- Sub-trends that don't fit any major theme can be grouped under a "Miscellaneous Signals" cluster
- Use the EXACT headline text for sub-trends (do not rephrase)
- Write a 1-2 sentence summary for each major narrative

Return JSON:
{
  "clusters": [
    {
      "majorTrend": "The overarching narrative title",
      "summary": "1-2 sentence summary of this narrative cluster",
      "subTrends": ["exact headline 1", "exact headline 2"]
    }
  ]
}`;

export async function POST() {
  try {
    // Fetch all trends from DB
    const trends = await prisma.trend.findMany({
      orderBy: { score: "desc" },
      select: { id: true, headline: true, reason: true, score: true },
    });

    if (trends.length === 0) {
      return NextResponse.json(
        { error: "No trends found. Import trends first." },
        { status: 400 }
      );
    }

    // Build the trend list for Gemini
    const trendList = trends
      .map((t, i) => `${i + 1}. [Score: ${t.score}] ${t.headline} — ${t.reason}`)
      .join("\n");

    const userMessage = `Here are ${trends.length} current trends/signals. Cluster them into major narrative themes:\n\n${trendList}`;

    const { parsed } = await callGemini(CLUSTER_SYSTEM_PROMPT, userMessage, {
      temperature: 0.2,
    });

    if (!parsed?.clusters || !Array.isArray(parsed.clusters)) {
      return NextResponse.json(
        { error: "AI failed to generate valid clusters" },
        { status: 500 }
      );
    }

    const clusters: ClusterResult[] = parsed.clusters;

    // Clear existing trees to rebuild fresh clusters
    await prisma.narrativeNode.deleteMany({});
    await prisma.factDossier.deleteMany({});
    await prisma.contentPiece.deleteMany({ where: { treeId: { not: null } } });
    await prisma.narrativeTree.deleteMany({});

    const createdTrees: { id: string; rootTrend: string; nodeCount: number }[] = [];

    for (const cluster of clusters) {
      // Generate embedding for the major narrative
      let embeddingStr: string | null = null;
      try {
        const embedding = await generateEmbedding(
          `${cluster.majorTrend}. ${cluster.summary}`
        );
        embeddingStr = JSON.stringify(embedding);
      } catch (err) {
        console.error(`Embedding failed for "${cluster.majorTrend}":`, err);
      }

      // Match sub-trends back to actual trend records
      const matchedTrends = cluster.subTrends
        .map((sub) => {
          const match = trends.find(
            (t) =>
              t.headline === sub ||
              t.headline.toLowerCase().includes(sub.toLowerCase().slice(0, 40)) ||
              sub.toLowerCase().includes(t.headline.toLowerCase().slice(0, 40))
          );
          return match ? { ...match, originalSub: sub } : null;
        })
        .filter(Boolean) as (typeof trends[number] & { originalSub: string })[];

      const tree = await prisma.narrativeTree.create({
        data: {
          rootTrend: cluster.majorTrend,
          summary: cluster.summary,
          embedding: embeddingStr,
          nodes: {
            create: matchedTrends.map((t) => ({
              signalTitle: t.headline,
              signalScore: t.score,
              signalData: {
                title: t.headline,
                score: t.score,
                reason: t.reason,
                source: "cluster_import",
              },
            })),
          },
        },
      });

      createdTrees.push({
        id: tree.id,
        rootTrend: cluster.majorTrend,
        nodeCount: matchedTrends.length,
      });
    }

    return NextResponse.json({
      clustered: createdTrees.length,
      totalSignals: trends.length,
      trees: createdTrees,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Clustering failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
