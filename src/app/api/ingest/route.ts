import { NextResponse } from "next/server";
import { processSignalsToTrees, type IngestSignal } from "@/lib/ingestHelper";

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

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // Parse request body
    let body: { signals: unknown[] };
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

    // Process signals into NarrativeTrees using shared helper
    const response = await processSignalsToTrees(validatedSignals);

    return NextResponse.json(response, {
      status: response.skipped.length === validatedSignals.length ? 500 : 201,
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
