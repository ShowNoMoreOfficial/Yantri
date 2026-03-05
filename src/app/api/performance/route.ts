import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// GET /api/performance
// List all performance records, most recent first.
// ---------------------------------------------------------------------------
export async function GET() {
  const data = await prisma.performanceData.findMany({
    orderBy: { recordedAt: "desc" },
  });
  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// POST /api/performance
// Ingest performance data from Relay webhook or manual entry.
// Required fields: platform, brandName, contentType
// Optional: narrativeId, contentPieceId, impressions, engagementRate,
//           replies, retweets, bookmarks, views, watchTime, ctr, notes,
//           publishedAt
// ---------------------------------------------------------------------------

const VALID_CONTENT_TYPES = new Set([
  "thread",
  "tweet",
  "video",
  "blog",
  "reel",
]);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // --- Required field validation -------------------------------------------
  const { platform, brandName, contentType, narrativeId, contentPieceId } =
    body as {
      platform?: string;
      brandName?: string;
      contentType?: string;
      narrativeId?: string;
      contentPieceId?: string;
    };

  const missing: string[] = [];
  if (!platform || typeof platform !== "string") missing.push("platform");
  if (!brandName || typeof brandName !== "string") missing.push("brandName");
  if (!contentType || typeof contentType !== "string")
    missing.push("contentType");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  if (!VALID_CONTENT_TYPES.has(contentType!)) {
    return NextResponse.json(
      {
        error: `Invalid contentType "${contentType}". Must be one of: ${[...VALID_CONTENT_TYPES].join(", ")}`,
      },
      { status: 400 },
    );
  }

  // --- Narrative existence check -------------------------------------------
  if (narrativeId) {
    const narrative = await prisma.narrative.findUnique({
      where: { id: narrativeId },
    });
    if (!narrative) {
      return NextResponse.json(
        { error: `Narrative "${narrativeId}" not found` },
        { status: 404 },
      );
    }
  }

  // --- ContentPiece existence check ----------------------------------------
  if (contentPieceId) {
    const piece = await prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
    });
    if (!piece) {
      return NextResponse.json(
        { error: `ContentPiece "${contentPieceId}" not found` },
        { status: 404 },
      );
    }
  }

  // --- Parse numeric fields safely -----------------------------------------
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

  const impressions = safeInt(body.impressions);
  const engagementRate = safeFloat(body.engagementRate);
  const replies = safeInt(body.replies);
  const retweets = safeInt(body.retweets);
  const bookmarks = safeInt(body.bookmarks);
  const views = safeInt(body.views);
  const watchTime = safeFloat(body.watchTime);
  const ctr = safeFloat(body.ctr);
  const notes = typeof body.notes === "string" ? body.notes : null;
  const publishedAt = body.publishedAt
    ? new Date(body.publishedAt as string)
    : null;

  // Validate publishedAt is a real date if provided
  if (body.publishedAt && publishedAt && isNaN(publishedAt.getTime())) {
    return NextResponse.json(
      { error: "Invalid publishedAt date format" },
      { status: 400 },
    );
  }

  // --- Create the PerformanceData record -----------------------------------
  const record = await prisma.performanceData.create({
    data: {
      narrativeId: narrativeId || null,
      platform: platform!,
      brandName: brandName!,
      contentType: contentType!,
      impressions,
      engagementRate,
      replies,
      retweets,
      bookmarks,
      views,
      watchTime,
      ctr,
      notes,
      publishedAt,
    },
  });

  // --- Update ContentPiece.performanceData if contentPieceId provided ------
  if (contentPieceId) {
    const metricsPayload = {
      impressions,
      engagementRate,
      replies,
      retweets,
      bookmarks,
      views,
      watchTime,
      ctr,
      recordedAt: record.recordedAt,
      performanceRecordId: record.id,
    };
    await prisma.contentPiece.update({
      where: { id: contentPieceId },
      data: { performanceData: metricsPayload },
    });
  }

  return NextResponse.json(record, { status: 201 });
}
