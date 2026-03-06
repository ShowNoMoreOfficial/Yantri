import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/deliverables/[id]/assets ──────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const deliverable = await prisma.deliverable.findUnique({ where: { id } });
  if (!deliverable) {
    return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
  }

  const assets = await prisma.asset.findMany({
    where: { deliverableId: id },
    orderBy: [{ slideIndex: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(assets);
}

// ─── POST /api/deliverables/[id]/assets ─────────────────────────────────────
// Add an asset to a deliverable (e.g., after image generation completes)
//
// Body: {
//   type: "IMAGE" | "VIDEO_CLIP" | "BROLL" | "CAROUSEL_SLIDE" | "THUMBNAIL" | "SOCIAL_CARD",
//   url: string,
//   promptUsed?: string,
//   slideIndex?: number,
//   metadata?: object
// }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const deliverable = await prisma.deliverable.findUnique({ where: { id } });
  if (!deliverable) {
    return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
  }

  const { type, url, promptUsed, slideIndex, metadata } = body as {
    type?: string;
    url?: string;
    promptUsed?: string;
    slideIndex?: number;
    metadata?: object;
  };

  if (!type || !url) {
    return NextResponse.json(
      { error: "type and url are required" },
      { status: 400 }
    );
  }

  const validTypes = ["IMAGE", "VIDEO_CLIP", "BROLL", "CAROUSEL_SLIDE", "THUMBNAIL", "SOCIAL_CARD"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid asset type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const asset = await prisma.asset.create({
    data: {
      deliverableId: id,
      type: type as "IMAGE" | "VIDEO_CLIP" | "BROLL" | "CAROUSEL_SLIDE" | "THUMBNAIL" | "SOCIAL_CARD",
      url,
      promptUsed: promptUsed ?? null,
      slideIndex: slideIndex ?? null,
      metadata: metadata ?? undefined,
    },
  });

  return NextResponse.json(asset, { status: 201 });
}
