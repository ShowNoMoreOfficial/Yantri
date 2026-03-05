import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NarrativeTreeStatus } from "@prisma/client";

const VALID_STATUSES = new Set<string>(Object.values(NarrativeTreeStatus));

// ---------------------------------------------------------------------------
// GET /api/narrative-trees
// List all NarrativeTrees with node count and dossier existence.
// Query params: status (ACTIVE | MERGED | ARCHIVED)
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (status && !VALID_STATUSES.has(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}` },
      { status: 400 },
    );
  }

  const where: Record<string, unknown> = {};
  if (status) where.status = status as NarrativeTreeStatus;

  const trees = await prisma.narrativeTree.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { nodes: true } },
      dossier: { select: { id: true } },
    },
  });

  return NextResponse.json(trees);
}
