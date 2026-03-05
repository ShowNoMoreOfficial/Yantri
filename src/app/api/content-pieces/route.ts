import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Platform, ContentStatus } from "@prisma/client";

const VALID_PLATFORMS = new Set<string>(Object.values(Platform));
const VALID_STATUSES = new Set<string>(Object.values(ContentStatus));

// ---------------------------------------------------------------------------
// GET /api/content-pieces
// List content pieces with optional filters and pagination.
// Query params: status, platform, brandId, treeId, limit
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const brandId = searchParams.get("brandId");
  const treeId = searchParams.get("treeId");
  const limitParam = searchParams.get("limit");

  // Validate enum filters
  if (status && !VALID_STATUSES.has(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}` },
      { status: 400 },
    );
  }
  if (platform && !VALID_PLATFORMS.has(platform)) {
    return NextResponse.json(
      { error: `Invalid platform. Must be one of: ${[...VALID_PLATFORMS].join(", ")}` },
      { status: 400 },
    );
  }

  // Validate limit
  let take: number | undefined;
  if (limitParam) {
    take = parseInt(limitParam, 10);
    if (isNaN(take) || take < 1) {
      return NextResponse.json(
        { error: "limit must be a positive integer" },
        { status: 400 },
      );
    }
  }

  const where: Record<string, unknown> = {};
  if (status) where.status = status as ContentStatus;
  if (platform) where.platform = platform as Platform;
  if (brandId) where.brandId = brandId;
  if (treeId) where.treeId = treeId;

  const contentPieces = await prisma.contentPiece.findMany({
    where,
    include: { brand: true },
    orderBy: { updatedAt: "desc" },
    ...(take ? { take } : {}),
  });

  return NextResponse.json(contentPieces);
}

// ---------------------------------------------------------------------------
// POST /api/content-pieces
// Create a new content piece. Default status: PLANNED.
// Body: { brandId, platform, bodyText, treeId?, postingPlan?, visualPrompts? }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { brandId, platform, bodyText, treeId, postingPlan, visualPrompts } = body as {
    brandId?: string;
    platform?: string;
    bodyText?: string;
    treeId?: string;
    postingPlan?: unknown;
    visualPrompts?: string;
  };

  // Required field validation
  if (!brandId || typeof brandId !== "string") {
    return NextResponse.json({ error: "brandId is required" }, { status: 400 });
  }
  if (!platform || typeof platform !== "string") {
    return NextResponse.json({ error: "platform is required" }, { status: 400 });
  }
  if (!bodyText || typeof bodyText !== "string") {
    return NextResponse.json({ error: "bodyText is required" }, { status: 400 });
  }

  // Enum validation
  if (!VALID_PLATFORMS.has(platform)) {
    return NextResponse.json(
      { error: `Invalid platform. Must be one of: ${[...VALID_PLATFORMS].join(", ")}` },
      { status: 400 },
    );
  }

  // Verify brand exists
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const contentPiece = await prisma.contentPiece.create({
    data: {
      brandId,
      platform: platform as Platform,
      status: ContentStatus.PLANNED,
      bodyText,
      treeId: treeId ?? null,
      postingPlan: postingPlan ?? undefined,
      visualPrompts: visualPrompts ?? null,
    },
    include: { brand: true },
  });

  return NextResponse.json(contentPiece, { status: 201 });
}
