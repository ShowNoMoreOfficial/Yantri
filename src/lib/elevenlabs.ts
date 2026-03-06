import { ElevenLabsClient } from "elevenlabs";
import type { Readable } from "stream";

const globalForElevenLabs = globalThis as unknown as {
  elevenLabsClient: ElevenLabsClient | undefined;
};

const client =
  globalForElevenLabs.elevenLabsClient ??
  new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY || "" });

if (process.env.NODE_ENV !== "production")
  globalForElevenLabs.elevenLabsClient = client;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface VoiceoverOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — clear, neutral narrator
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

/**
 * Collect a Readable stream into a Buffer.
 */
async function streamToBuffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Generate voiceover audio from text using ElevenLabs TTS.
 * Returns the audio as a Buffer (mp3 format by default).
 */
export async function generateVoiceover(
  text: string,
  options?: VoiceoverOptions
): Promise<{ audio: Buffer; voiceId: string; modelId: string }> {
  const voiceId = options?.voiceId ?? DEFAULT_VOICE_ID;
  const modelId = options?.modelId ?? DEFAULT_MODEL_ID;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const audioStream = await client.textToSpeech.convert(voiceId, {
        text,
        model_id: modelId,
        voice_settings: {
          stability: options?.stability ?? 0.5,
          similarity_boost: options?.similarityBoost ?? 0.75,
        },
      });

      const audio = await streamToBuffer(audioStream as unknown as Readable);

      return { audio, voiceId, modelId };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on auth errors or invalid requests
      const message = lastError.message.toLowerCase();
      if (
        message.includes("api key") ||
        message.includes("unauthorized") ||
        message.includes("invalid") ||
        message.includes("forbidden")
      ) {
        throw lastError;
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("generateVoiceover failed after retries");
}
