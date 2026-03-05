import { GoogleGenAI } from "@google/genai";

/**
 * Embedding module — real Gemini embeddings + shared similarity utilities.
 *
 * Uses Gemini text-embedding-004 for semantic vector generation.
 * Exports cosine similarity and tree matching functions used by both
 * the ingest API and the content pipeline.
 */

const SIMILARITY_THRESHOLD = 0.85;

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return genAIInstance;
}

/**
 * Generate an embedding vector for the given text using Gemini text-embedding-004.
 *
 * @param text - The text to embed
 * @returns A 768-dimensional vector of floats
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = getGenAI();
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
 * Loads all active tree embeddings and compares in-memory using cosine similarity.
 */
export async function findSimilarTree(
  embedding: number[],
  // Accept any Prisma-like client that has narrativeTree.findMany
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaClient: any,
  threshold: number = SIMILARITY_THRESHOLD
): Promise<SimilarTreeResult | null> {
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
