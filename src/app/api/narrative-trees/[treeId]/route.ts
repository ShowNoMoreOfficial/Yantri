import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NarrativeTreeStatus } from "@prisma/client";

const VALID_STATUSES = new Set<string>(Object.values(NarrativeTreeStatus));

// ---------------------------------------------------------------------------
// GET /api/narrative-trees/[treeId]
// Return a single tree with all nodes, dossier, and linked content pieces.
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;

  const tree = await prisma.narrativeTree.findUnique({
    where: { id: treeId },
    include: {
      nodes: { orderBy: { identifiedAt: "desc" } },
      dossier: true,
    },
  });

  if (!tree) {
    return NextResponse.json({ error: "Narrative tree not found" }, { status: 404 });
  }

  // Fetch linked content pieces separately (treeId is on ContentPiece)
  const contentPieces = await prisma.contentPiece.findMany({
    where: { treeId },
    include: { brand: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ ...tree, contentPieces });
}

// ---------------------------------------------------------------------------
// PUT /api/narrative-trees/[treeId]
// Update tree status and/or summary.
// Body: { status?, summary? }
// ---------------------------------------------------------------------------
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate status if provided
  if (body.status && !VALID_STATUSES.has(body.status as string)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}` },
      { status: 400 },
    );
  }

  // Verify tree exists
  const existing = await prisma.narrativeTree.findUnique({ where: { id: treeId } });
  if (!existing) {
    return NextResponse.json({ error: "Narrative tree not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status as NarrativeTreeStatus;
  if (typeof body.summary === "string") data.summary = body.summary;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.narrativeTree.update({
    where: { id: treeId },
    data,
    include: {
      _count: { select: { nodes: true } },
      dossier: { select: { id: true } },
    },
  });

  return NextResponse.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/narrative-trees/[treeId]
// Delete tree and cascading nodes/dossier (handled by Prisma onDelete: Cascade).
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;

  const existing = await prisma.narrativeTree.findUnique({ where: { id: treeId } });
  if (!existing) {
    return NextResponse.json({ error: "Narrative tree not found" }, { status: 404 });
  }

  // Unlink any content pieces before deleting the tree
  await prisma.contentPiece.updateMany({
    where: { treeId },
    data: { treeId: null },
  });

  await prisma.narrativeTree.delete({ where: { id: treeId } });

  return NextResponse.json({ ok: true });
}
