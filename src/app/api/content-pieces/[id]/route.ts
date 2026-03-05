import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Platform, ContentStatus } from "@prisma/client";

const VALID_PLATFORMS = new Set<string>(Object.values(Platform));
const VALID_STATUSES = new Set<string>(Object.values(ContentStatus));
const DELETABLE_STATUSES = new Set<ContentStatus>([ContentStatus.PLANNED, ContentStatus.KILLED]);

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/content-pieces/[id]
// Fetch a single content piece with its brand relation.
// ---------------------------------------------------------------------------
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const contentPiece = await prisma.contentPiece.findUnique({
    where: { id },
    include: { brand: true },
  });

  if (!contentPiece) {
    return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  }

  return NextResponse.json(contentPiece);
}

// ---------------------------------------------------------------------------
// PUT /api/content-pieces/[id]
// Partial update of a content piece. Handles status transition side-effects:
//   - APPROVED  -> sets approvedAt
//   - PUBLISHED -> sets publishedAt
//   - Any status change -> creates an EditorialLog entry
// ---------------------------------------------------------------------------
export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;

  // Verify the content piece exists (and grab current state for comparison)
  const existing = await prisma.contentPiece.findUnique({
    where: { id },
    include: { brand: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Build the update payload from allowed fields
  const data: Record<string, unknown> = {};

  if (body.brandId !== undefined) {
    if (typeof body.brandId !== "string") {
      return NextResponse.json({ error: "brandId must be a string" }, { status: 400 });
    }
    const brand = await prisma.brand.findUnique({ where: { id: body.brandId } });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }
    data.brandId = body.brandId;
  }

  if (body.platform !== undefined) {
    if (typeof body.platform !== "string" || !VALID_PLATFORMS.has(body.platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${[...VALID_PLATFORMS].join(", ")}` },
        { status: 400 },
      );
    }
    data.platform = body.platform as Platform;
  }

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !VALID_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}` },
        { status: 400 },
      );
    }
    data.status = body.status as ContentStatus;

    // Automatic timestamp side-effects
    if (body.status === ContentStatus.APPROVED) {
      data.approvedAt = new Date();
    }
    if (body.status === ContentStatus.PUBLISHED) {
      data.publishedAt = new Date();
    }
  }

  if (body.bodyText !== undefined) {
    if (typeof body.bodyText !== "string") {
      return NextResponse.json({ error: "bodyText must be a string" }, { status: 400 });
    }
    data.bodyText = body.bodyText;
  }

  if (body.treeId !== undefined) data.treeId = body.treeId;
  if (body.postingPlan !== undefined) data.postingPlan = body.postingPlan;
  if (body.visualPrompts !== undefined) data.visualPrompts = body.visualPrompts;
  if (body.performanceData !== undefined) data.performanceData = body.performanceData;

  // Persist update
  const updated = await prisma.contentPiece.update({
    where: { id },
    data,
    include: { brand: true },
  });

  // Create EditorialLog for status changes
  if (body.status !== undefined && body.status !== existing.status) {
    const newStatus = body.status as string;
    let action: string;
    if (newStatus === ContentStatus.KILLED) {
      action = "killed";
    } else if (newStatus === ContentStatus.PUBLISHED) {
      action = "published";
    } else if (newStatus === ContentStatus.APPROVED) {
      action = "approved";
    } else {
      action = "status_change";
    }

    await prisma.editorialLog.create({
      data: {
        action,
        reasoning:
          (body.reason as string) ||
          `Content piece status changed from ${existing.status} to ${newStatus}`,
        trendHeadline: updated.treeId ?? `Content piece ${updated.id}`,
        narrativeAngle: updated.bodyText.slice(0, 120),
        platform: updated.platform,
        brandName: updated.brand.name,
      },
    });
  }

  return NextResponse.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/content-pieces/[id]
// Delete a content piece. Only allowed when status is PLANNED or KILLED.
// ---------------------------------------------------------------------------
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const existing = await prisma.contentPiece.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  }

  if (!DELETABLE_STATUSES.has(existing.status)) {
    return NextResponse.json(
      {
        error: `Cannot delete content piece with status "${existing.status}". Only PLANNED or KILLED pieces can be deleted.`,
      },
      { status: 409 },
    );
  }

  await prisma.contentPiece.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
