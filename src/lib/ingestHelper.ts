/**
 * Ingest Helper — AI-powered signal-to-NarrativeTree clustering
 *
 * Uses Gemini to assign new signals to existing narrative clusters or create
 * new ones. Clusters are stable — they persist and grow over time.
 * Stale clusters (no new signals in 7+ days) are auto-archived.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embeddings";
import { callGemini } from "@/lib/gemini";
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
  archived: number;
}

interface ClusterAssignment {
  signalTitle: string;
  assignedCluster: string | null; // null = create new cluster
  newClusterName?: string;
  newClusterSummary?: string;
}

// ─── AI Cluster Assignment ──────────────────────────────────────────────────

const ASSIGN_SYSTEM_PROMPT = `You are a narrative intelligence analyst. You will be given:
1. A list of EXISTING narrative clusters (with their names)
2. A list of NEW signals to assign

Your job: assign each new signal to the BEST matching existing cluster, OR mark it for a new cluster if it doesn't fit any.

Rules:
- Match signals to clusters by thematic relevance (e.g., "Gulf oil prices surge" fits "Iran-Israel Military Escalation" if it's a consequence)
- Only create a NEW cluster if the signal truly doesn't fit any existing cluster
- If creating a new cluster, provide a clear name and 1-sentence summary
- Use the EXACT cluster name from the existing list when assigning
- Use the EXACT signal title from the input when referencing signals

Return JSON:
{
  "assignments": [
    {
      "signalTitle": "exact signal title",
      "assignedCluster": "exact existing cluster name OR null if new",
      "newClusterName": "only if assignedCluster is null",
      "newClusterSummary": "only if assignedCluster is null"
    }
  ]
}`;

async function getAIAssignments(
  signals: IngestSignal[],
  existingClusters: { id: string; rootTrend: string }[]
): Promise<ClusterAssignment[]> {
  const clusterList = existingClusters.length > 0
    ? existingClusters.map((c, i) => `${i + 1}. "${c.rootTrend}"`).join("\n")
    : "(No existing clusters)";

  const signalList = signals
    .map((s, i) => `${i + 1}. [Score: ${s.score}] ${s.title} — ${s.reason}`)
    .join("\n");

  const userMessage = `EXISTING CLUSTERS:\n${clusterList}\n\nNEW SIGNALS TO ASSIGN:\n${signalList}`;

  const { parsed } = await callGemini(ASSIGN_SYSTEM_PROMPT, userMessage, {
    temperature: 0.1,
  });

  if (!parsed?.assignments || !Array.isArray(parsed.assignments)) {
    return [];
  }

  return parsed.assignments;
}

// ─── Cluster Lifecycle ──────────────────────────────────────────────────────

const STALE_DAYS = 7;

/** Archive clusters that haven't received new signals in STALE_DAYS */
export async function archiveStaleClusters(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.narrativeTree.updateMany({
    where: {
      status: "ACTIVE",
      updatedAt: { lt: cutoff },
    },
    data: { status: "ARCHIVED" },
  });

  return result.count;
}

// ─── Core Processor ─────────────────────────────────────────────────────────

/**
 * Process signals into NarrativeTrees using AI-powered cluster assignment.
 *
 * 1. Fetch existing active clusters
 * 2. Ask Gemini to assign each signal to an existing cluster or create new ones
 * 3. Create/update NarrativeTrees accordingly
 * 4. Archive stale clusters (no activity in 7+ days)
 */
export async function processSignalsToTrees(
  signals: IngestSignal[]
): Promise<IngestResult> {
  const newTrees: string[] = [];
  const appendedTo: string[] = [];
  const skipped: string[] = [];

  // Get existing active clusters
  const existingClusters = await prisma.narrativeTree.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, rootTrend: true },
  });

  // Build a global set of all existing signal titles (across ALL trees) for dedup
  const allExistingNodes = await prisma.narrativeNode.findMany({
    select: { signalTitle: true },
  });
  const globalTitles = new Set(allExistingNodes.map((n) => n.signalTitle.toLowerCase().trim()));

  // Pre-filter signals: skip any that already exist globally (case-insensitive)
  const freshSignals = signals.filter((s) => {
    const normalizedTitle = s.title.toLowerCase().trim();
    if (globalTitles.has(normalizedTitle)) {
      skipped.push(`"${s.title}": duplicate signal (already exists in a tree)`);
      return false;
    }
    return true;
  });

  if (freshSignals.length === 0) {
    const archived = await archiveStaleClusters();
    return { ingested: 0, newTrees: [], appendedTo: [], skipped, archived };
  }

  // Get AI assignments
  let assignments: ClusterAssignment[] = [];
  try {
    assignments = await getAIAssignments(freshSignals, existingClusters);
  } catch (err) {
    console.error("AI assignment failed, skipping all signals:", err);
    return {
      ingested: 0,
      newTrees: [],
      appendedTo: [],
      skipped: [...skipped, ...freshSignals.map((s) => `"${s.title}": AI assignment failed`)],
      archived: 0,
    };
  }

  // Build a lookup: cluster name -> id
  const clusterMap = new Map(existingClusters.map((c) => [c.rootTrend, c.id]));
  // Track newly created clusters in this batch so subsequent signals can use them
  const newClusterMap = new Map<string, string>();

  for (const signal of freshSignals) {
    try {
      const assignment = assignments.find(
        (a) =>
          a.signalTitle === signal.title ||
          a.signalTitle?.toLowerCase().includes(signal.title.toLowerCase().slice(0, 40)) ||
          signal.title.toLowerCase().includes(a.signalTitle?.toLowerCase().slice(0, 40))
      );

      const signalData = {
        title: signal.title,
        score: signal.score,
        reason: signal.reason,
        source: signal.source ?? "",
        metadata: JSON.parse(JSON.stringify(signal.metadata ?? {})),
      } satisfies Prisma.InputJsonValue;

      if (assignment?.assignedCluster) {
        // Assign to existing cluster
        const treeId =
          clusterMap.get(assignment.assignedCluster) ||
          newClusterMap.get(assignment.assignedCluster);

        if (treeId) {
          // Check for duplicate signal in this tree
          const existing = await prisma.narrativeNode.findFirst({
            where: { treeId, signalTitle: signal.title },
          });

          if (!existing) {
            await prisma.narrativeNode.create({
              data: {
                treeId,
                signalTitle: signal.title,
                signalScore: Math.round(signal.score),
                signalData,
              },
            });

            await prisma.narrativeTree.update({
              where: { id: treeId },
              data: { updatedAt: new Date() },
            });

            globalTitles.add(signal.title.toLowerCase().trim());
            appendedTo.push(`"${signal.title}" -> "${assignment.assignedCluster}"`);

            try {
              await inngest.send({
                name: "yantri/tree.updated",
                data: { treeId },
              });
            } catch { /* inngest may not be running */ }
          } else {
            skipped.push(`"${signal.title}": duplicate in "${assignment.assignedCluster}"`);
          }
        } else {
          // Cluster name not found — fall through to create new
          await createNewCluster(
            signal,
            assignment.assignedCluster,
            `Signals related to: ${assignment.assignedCluster}`,
            signalData,
            newTrees,
            newClusterMap,
            clusterMap,
            globalTitles
          );
        }
      } else {
        // Create new cluster
        const clusterName = assignment?.newClusterName || signal.title;
        const clusterSummary = assignment?.newClusterSummary || `Initial signal: ${signal.reason}`;

        // Check if this new cluster name was already created in this batch
        const existingNewId = newClusterMap.get(clusterName);
        if (existingNewId) {
          await prisma.narrativeNode.create({
            data: {
              treeId: existingNewId,
              signalTitle: signal.title,
              signalScore: Math.round(signal.score),
              signalData,
            },
          });
          globalTitles.add(signal.title.toLowerCase().trim());
          appendedTo.push(`"${signal.title}" -> "${clusterName}" (new this batch)`);
        } else {
          await createNewCluster(
            signal,
            clusterName,
            clusterSummary,
            signalData,
            newTrees,
            newClusterMap,
            clusterMap,
            globalTitles
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Failed to process signal "${signal.title}":`, message);
      skipped.push(`"${signal.title}": ${message}`);
    }
  }

  // Archive stale clusters
  const archived = await archiveStaleClusters();

  return {
    ingested: newTrees.length + appendedTo.length,
    newTrees,
    appendedTo,
    skipped,
    archived,
  };
}

async function createNewCluster(
  signal: IngestSignal,
  clusterName: string,
  summary: string,
  signalData: Prisma.InputJsonValue,
  newTrees: string[],
  newClusterMap: Map<string, string>,
  clusterMap: Map<string, string>,
  globalTitles?: Set<string>
) {
  // Don't create duplicate cluster if one with same name exists
  if (clusterMap.has(clusterName)) {
    return;
  }

  let embeddingStr: string | null = null;
  try {
    const embedding = await generateEmbedding(`${clusterName}. ${summary}`);
    embeddingStr = JSON.stringify(embedding);
  } catch (err) {
    console.error(`Embedding failed for "${clusterName}":`, err);
  }

  const tree = await prisma.narrativeTree.create({
    data: {
      rootTrend: clusterName,
      summary,
      embedding: embeddingStr,
      nodes: {
        create: {
          signalTitle: signal.title,
          signalScore: Math.round(signal.score),
          signalData,
        },
      },
    },
  });

  newTrees.push(clusterName);
  newClusterMap.set(clusterName, tree.id);
  clusterMap.set(clusterName, tree.id);
  if (globalTitles) globalTitles.add(signal.title.toLowerCase().trim());

  try {
    await inngest.send({
      name: "yantri/tree.updated",
      data: { treeId: tree.id },
    });
  } catch { /* inngest may not be running */ }
}
