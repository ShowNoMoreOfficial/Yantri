import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateEmbedding, findSimilarTree } from "@/lib/embeddings";
import { inngest } from "@/lib/inngest/client";

// ─── Request / Response Types ────────────────────────────────────────────────

interface IngestSignal {
  title: string;
  score: number;
  reason: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

interface IngestRequest {
  signals: IngestSignal[];
}

interface IngestResponse {
  ingested: number;
  newTrees: string[];
  appendedTo: string[];
  skipped: string[];
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateSignal(
  signal: unknown,
  index: number
): { valid: true; data: IngestSignal } | { valid: false; error: string } {
  if (!signal || typeof signal !== "object") {
    return { valid: false, error: `signals[${index}]: must be an object` };
  }

  const s = signal as Record<string, unknown>;

  if (typeof s.title !== "string" || s.title.trim().length === 0) {
    return { valid: false, error: `signals[${index}].title: must be a non-empty string` };
  }

  if (typeof s.score !== "number" || !Number.isFinite(s.score)) {
    return { valid: false, error: `signals[${index}].score: must be a finite number` };
  }

  if (typeof s.reason !== "string" || s.reason.trim().length === 0) {
    return { valid: false, error: `signals[${index}].reason: must be a non-empty string` };
  }

  if (s.source !== undefined && typeof s.source !== "string") {
    return { valid: false, error: `signals[${index}].source: must be a string if provided` };
  }

  return {
    valid: true,
    data: {
      title: s.title.trim(),
      score: s.score,
      reason: s.reason.trim(),
      source: typeof s.source === "string" ? s.source.trim() : undefined,
      metadata: typeof s.metadata === "object" && s.metadata !== null
        ? (s.metadata as Record<string, unknown>)
        : undefined,
    },
  };
}

// ─── Semantic Similarity ─────────────────────────────────────────────────────
// Uses shared findSimilarTree from @/lib/embeddings

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // Parse request body
    let body: IngestRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate top-level structure
    if (!body.signals || !Array.isArray(body.signals)) {
      return NextResponse.json(
        { error: "Request body must contain a `signals` array" },
        { status: 400 }
      );
    }

    if (body.signals.length === 0) {
      return NextResponse.json(
        { error: "Signals array must not be empty" },
        { status: 400 }
      );
    }

    // Validate each signal
    const validatedSignals: IngestSignal[] = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < body.signals.length; i++) {
      const result = validateSignal(body.signals[i], i);
      if (result.valid) {
        validatedSignals.push(result.data);
      } else {
        validationErrors.push(result.error);
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    // Process each signal
    const newTrees: string[] = [];
    const appendedTo: string[] = [];
    const skipped: string[] = [];

    for (const signal of validatedSignals) {
      try {
        // Build the text to embed: combine title and reason for richer semantics
        const textToEmbed = `${signal.title}. ${signal.reason}`;
        const embedding = await generateEmbedding(textToEmbed);

        // Check for semantically similar existing trees
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

    const response: IngestResponse = {
      ingested: newTrees.length + appendedTo.length,
      newTrees,
      appendedTo,
      skipped,
    };

    return NextResponse.json(response, {
      status: skipped.length === validatedSignals.length ? 500 : 201,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Ingest error:", message);
    return NextResponse.json(
      { error: `Ingest failed: ${message}` },
      { status: 500 }
    );
  }
}

