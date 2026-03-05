import { createHash } from "crypto";

/**
 * Embedding dimensions — matches the pgvector column definition in schema.prisma.
 */
const EMBEDDING_DIMS = 1536;

/**
 * Generate an embedding vector for the given text.
 *
 * TODO: Replace the placeholder implementation with a real embedding API call.
 * When ready, swap the body of this function to call Gemini's embedding endpoint:
 *
 *   const { GoogleGenAI } = await import("@google/genai");
 *   const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
 *   const result = await genAI.models.embedContent({
 *     model: "text-embedding-004",
 *     contents: text,
 *   });
 *   return result.embeddings[0].values;
 *
 * The current implementation generates a deterministic fake 1536-dim vector
 * derived from the SHA-256 hash of the input text. This ensures:
 *   - Identical inputs always produce identical vectors
 *   - Different inputs produce different (but not semantically meaningful) vectors
 *   - The output shape matches what pgvector expects
 *
 * @param text - The text to embed
 * @returns A 1536-dimensional vector of floats in the range [-1, 1]
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return generateFakeEmbedding(text);
}

/**
 * Deterministic fake embedding generator.
 *
 * Uses SHA-256 to produce a repeatable hash, then expands it into a
 * 1536-dimensional vector by iteratively hashing with an index suffix.
 * Each pair of hash bytes is converted to a float in [-1, 1].
 */
function generateFakeEmbedding(text: string): number[] {
  const embedding: number[] = [];
  const normalizedText = text.toLowerCase().trim();

  // We need 1536 floats. Each SHA-256 hash gives us 32 bytes = 16 float pairs.
  // So we need ceil(1536 / 16) = 96 hash rounds.
  const roundsNeeded = Math.ceil(EMBEDDING_DIMS / 16);

  for (let round = 0; round < roundsNeeded; round++) {
    const hash = createHash("sha256")
      .update(`${normalizedText}::${round}`)
      .digest();

    // Extract 16 floats from each 32-byte hash (2 bytes per float)
    for (let i = 0; i < 32 && embedding.length < EMBEDDING_DIMS; i += 2) {
      // Combine two bytes into a 16-bit unsigned int, then normalize to [-1, 1]
      const value = ((hash[i] << 8) | hash[i + 1]) / 32767.5 - 1;
      embedding.push(value);
    }
  }

  // L2-normalize the vector so cosine similarity works correctly
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) return embedding;

  return embedding.map((val) => val / magnitude);
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
