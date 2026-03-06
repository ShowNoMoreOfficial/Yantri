import { prisma } from "@/lib/prisma";

/**
 * Embedding module — Gemini embeddings + pgvector similarity search.
 *
 * Uses Gemini text-embedding-004 for semantic vector generation.
 * Uses pgvector cosine distance operator (<=>)  for efficient tree matching
 * instead of loading all trees into memory.
 */

// Re-use the singleton Gemini client from gemini.ts
import { GoogleGenAI } from "@google/genai";

const SIMILARITY_THRESHOLD = 0.85;

const globalForEmbedding = globalThis as unknown as {
  embeddingGenAI: GoogleGenAI | undefined;
};

const genAI =
  globalForEmbedding.embeddingGenAI ??
  new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

if (process.env.NODE_ENV !== "production") globalForEmbedding.embeddingGenAI = genAI;

/**
 * Generate an embedding vector for the given text using Gemini text-embedding-004.
 *
 * @param text - The text to embed
 * @returns A 768-dimensional vector of floats
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await genAI.models.embedContent({
    model: "text-embedding-004",
    contents: text,
  });
  const values = result.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Gemini embedding returned empty values");
  }
  return values;
}

/**
 * Format an embedding vector as a pgvector-compatible string literal.
 *
 * pgvector expects the format: [0.1,0.2,0.3,...]
 *
 * @param embedding - Array of floats
 * @returns A string in pgvector literal format
 */
export function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// ─── Shared Similarity Utilities ─────────────────────────────────────────────

/** Cosine similarity between two vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export interface SimilarTreeResult {
  id: string;
  rootTrend: string;
  similarity: number;
}

/**
 * Find the most semantically similar active NarrativeTree.
 *
 * Uses pgvector's cosine distance operator (<=>) for efficient database-level
 * similarity search instead of loading all trees into memory.
 * Falls back to in-memory comparison if pgvector cast fails.
 */
export async function findSimilarTree(
  embedding: number[],
  // Accept any Prisma-like client that has narrativeTree.findMany
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaClient: any = prisma,
  threshold: number = SIMILARITY_THRESHOLD
): Promise<SimilarTreeResult | null> {
  const vectorStr = toPgVector(embedding);

  // Try pgvector cosine distance search first (fast, database-level)
  try {
    const results: Array<{ id: string; rootTrend: string; distance: number }> =
      await prismaClient.$queryRawUnsafe(
        `SELECT id, "rootTrend", 1 - (embedding::vector <=> $1::vector) AS distance
         FROM "NarrativeTree"
         WHERE embedding IS NOT NULL AND status = 'ACTIVE'
         ORDER BY embedding::vector <=> $1::vector
         LIMIT 1`,
        vectorStr
      );

    if (results.length > 0 && results[0].distance >= threshold) {
      return {
        id: results[0].id,
        rootTrend: results[0].rootTrend,
        similarity: results[0].distance,
      };
    }
    return null;
  } catch {
    // pgvector cast failed — fall back to in-memory (legacy path)
    const trees = await prismaClient.narrativeTree.findMany({
      where: { embedding: { not: null }, status: "ACTIVE" },
      select: { id: true, rootTrend: true, embedding: true },
    });

    let best: SimilarTreeResult | null = null;

    for (const tree of trees) {
      if (!tree.embedding) continue;
      try {
        const treeEmbedding: number[] = JSON.parse(tree.embedding);
        if (!Array.isArray(treeEmbedding) || treeEmbedding.length !== embedding.length) continue;
        const sim = cosineSimilarity(embedding, treeEmbedding);
        if (sim > threshold && (!best || sim > best.similarity)) {
          best = { id: tree.id, rootTrend: tree.rootTrend, similarity: sim };
        }
      } catch {
        continue;
      }
    }

    return best;
  }
}
