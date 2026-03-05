import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/performance/[id]
// Fetch a single performance record by ID.
// ---------------------------------------------------------------------------
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const record = await prisma.performanceData.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json(
      { error: "Performance record not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(record);
}

// ---------------------------------------------------------------------------
// PUT /api/performance/[id]
// Update an existing performance record. Accepts partial updates.
// ---------------------------------------------------------------------------

const VALID_CONTENT_TYPES = new Set([
  "thread",
  "tweet",
  "video",
  "blog",
  "reel",
]);

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const existing = await prisma.performanceData.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Performance record not found" },
      { status: 404 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // --- Build update payload from allowed fields ----------------------------
  const data: Record<string, unknown> = {};

  if (body.platform !== undefined) {
    if (typeof body.platform !== "string" || body.platform.trim() === "") {
      return NextResponse.json(
        { error: "platform must be a non-empty string" },
        { status: 400 },
      );
    }
    data.platform = body.platform;
  }

  if (body.brandName !== undefined) {
    if (typeof body.brandName !== "string" || body.brandName.trim() === "") {
      return NextResponse.json(
        { error: "brandName must be a non-empty string" },
        { status: 400 },
      );
    }
    data.brandName = body.brandName;
  }

  if (body.contentType !== undefined) {
    if (
      typeof body.contentType !== "string" ||
      !VALID_CONTENT_TYPES.has(body.contentType)
    ) {
      return NextResponse.json(
        {
          error: `Invalid contentType. Must be one of: ${[...VALID_CONTENT_TYPES].join(", ")}`,
        },
        { status: 400 },
      );
    }
    data.contentType = body.contentType;
  }

  if (body.narrativeId !== undefined) {
    if (body.narrativeId !== null && typeof body.narrativeId === "string") {
      const narrative = await prisma.narrative.findUnique({
        where: { id: body.narrativeId },
      });
      if (!narrative) {
        return NextResponse.json(
          { error: `Narrative "${body.narrativeId}" not found` },
          { status: 404 },
        );
      }
    }
    data.narrativeId = body.narrativeId || null;
  }

  // --- Numeric fields (safe parsing) ---------------------------------------
  const safeInt = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  };
  const safeFloat = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  if (body.impressions !== undefined) data.impressions = safeInt(body.impressions);
  if (body.engagementRate !== undefined) data.engagementRate = safeFloat(body.engagementRate);
  if (body.replies !== undefined) data.replies = safeInt(body.replies);
  if (body.retweets !== undefined) data.retweets = safeInt(body.retweets);
  if (body.bookmarks !== undefined) data.bookmarks = safeInt(body.bookmarks);
  if (body.views !== undefined) data.views = safeInt(body.views);
  if (body.watchTime !== undefined) data.watchTime = safeFloat(body.watchTime);
  if (body.ctr !== undefined) data.ctr = safeFloat(body.ctr);

  if (body.notes !== undefined) {
    data.notes = typeof body.notes === "string" ? body.notes : null;
  }

  if (body.publishedAt !== undefined) {
    if (body.publishedAt === null) {
      data.publishedAt = null;
    } else {
      const dt = new Date(body.publishedAt as string);
      if (isNaN(dt.getTime())) {
        return NextResponse.json(
          { error: "Invalid publishedAt date format" },
          { status: 400 },
        );
      }
      data.publishedAt = dt;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No valid fields provided for update" },
      { status: 400 },
    );
  }

  const updated = await prisma.performanceData.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/performance/[id]
// Delete a performance record by ID.
// ---------------------------------------------------------------------------
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const existing = await prisma.performanceData.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Performance record not found" },
      { status: 404 },
    );
  }

  await prisma.performanceData.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
