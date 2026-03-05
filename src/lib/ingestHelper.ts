/**
 * Ingest Helper — Shared signal-to-NarrativeTree processing
 *
 * Extracts the core semantic similarity logic and NarrativeTree/Node DB creation
 * so it can be reused by both the Khabri ingest API and the legacy trend import.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateEmbedding, findSimilarTree } from "@/lib/embeddings";
import { inngest } from "@/lib/inngest/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IngestSignal {
  title: string;
  score: number;
  reason: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestResult {
  ingested: number;
  newTrees: string[];
  appendedTo: string[];
  skipped: string[];
}

// ─── Core Processor ─────────────────────────────────────────────────────────

/**
 * Process an array of signals into NarrativeTrees.
 *
 * For each signal:
 * 1. Generate an embedding from title + reason
 * 2. Find a semantically similar active tree (threshold 0.85)
 * 3. If found, append as a NarrativeNode to the existing tree
 * 4. If not found, create a new NarrativeTree with its first node
 * 5. Fire the `yantri/tree.updated` Inngest event for downstream processing
 */
export async function processSignalsToTrees(
  signals: IngestSignal[]
): Promise<IngestResult> {
  const newTrees: string[] = [];
  const appendedTo: string[] = [];
  const skipped: string[] = [];

  for (const signal of signals) {
    try {
      const textToEmbed = `${signal.title}. ${signal.reason}`;
      const embedding = await generateEmbedding(textToEmbed);

      const similarTree = await findSimilarTree(embedding, prisma);

      if (similarTree) {
        // Append as a new node to the existing tree
        await prisma.narrativeNode.create({
          data: {
            treeId: similarTree.id,
            signalTitle: signal.title,
            signalScore: Math.round(signal.score),
            signalData: {
              title: signal.title,
              score: signal.score,
              reason: signal.reason,
              source: signal.source ?? "",
              metadata: JSON.parse(JSON.stringify(signal.metadata ?? {})),
            } satisfies Prisma.InputJsonValue,
          },
        });

        // Update tree's updatedAt timestamp
        await prisma.narrativeTree.update({
          where: { id: similarTree.id },
          data: { updatedAt: new Date() },
        });

        appendedTo.push(
          `"${signal.title}" -> tree "${similarTree.rootTrend}" (similarity: ${similarTree.similarity.toFixed(3)})`
        );

        // Trigger gap analysis for the updated tree
        await inngest.send({
          name: "yantri/tree.updated",
          data: { treeId: similarTree.id },
        });
      } else {
        // Create a new NarrativeTree with its first node
        const tree = await prisma.narrativeTree.create({
          data: {
            rootTrend: signal.title,
            summary: `Initial signal: ${signal.reason}`,
            embedding: JSON.stringify(embedding),
            nodes: {
              create: {
                signalTitle: signal.title,
                signalScore: Math.round(signal.score),
                signalData: {
                  title: signal.title,
                  score: signal.score,
                  reason: signal.reason,
                  source: signal.source ?? "",
                  metadata: JSON.parse(JSON.stringify(signal.metadata ?? {})),
                } satisfies Prisma.InputJsonValue,
              },
            },
          },
        });

        newTrees.push(signal.title);

        // Trigger gap analysis for the new tree
        await inngest.send({
          name: "yantri/tree.updated",
          data: { treeId: tree.id },
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Failed to process signal "${signal.title}":`, message);
      skipped.push(`"${signal.title}": ${message}`);
    }
  }

  return {
    ingested: newTrees.length + appendedTo.length,
    newTrees,
    appendedTo,
    skipped,
  };
}
