import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

// ---------------------------------------------------------------------------
// POST /api/pipeline/run
//
// Triggers the content pipeline for one or more ContentPieces.
// Accepts:
//   { contentPieceId: string }          — single piece
//   { contentPieceIds: string[] }       — batch of pieces
//
// Validates that all pieces exist and are in PLANNED status before sending
// Inngest events. Returns 202 with { triggered, ids }.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { contentPieceId, contentPieceIds } = body as {
    contentPieceId?: string;
    contentPieceIds?: string[];
  };

  // Normalize to an array
  let ids: string[] = [];

  if (contentPieceIds && Array.isArray(contentPieceIds)) {
    ids = contentPieceIds.filter((id) => typeof id === "string" && id.length > 0);
  } else if (contentPieceId && typeof contentPieceId === "string") {
    ids = [contentPieceId];
  }

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Provide contentPieceId (string) or contentPieceIds (string[])" },
      { status: 400 }
    );
  }

  // Validate all pieces exist and are in PLANNED status
  const pieces = await prisma.contentPiece.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true },
  });

  const foundIds = new Set(pieces.map((p) => p.id));
  const missingIds = ids.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    return NextResponse.json(
      { error: `ContentPiece(s) not found: ${missingIds.join(", ")}` },
      { status: 404 }
    );
  }

  const nonPlanned = pieces.filter((p) => p.status !== "PLANNED");
  if (nonPlanned.length > 0) {
    return NextResponse.json(
      {
        error: `All pieces must be in PLANNED status. Invalid: ${nonPlanned.map((p) => `${p.id} (${p.status})`).join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Mark all pieces as RESEARCHING to prevent double-triggers
  await prisma.contentPiece.updateMany({
    where: { id: { in: ids } },
    data: { status: "RESEARCHING" },
  });

  // Send Inngest events for each piece
  const events = ids.map((id) => ({
    name: "yantri/pipeline.run" as const,
    data: { contentPieceId: id },
  }));

  await inngest.send(events);

  return NextResponse.json(
    { triggered: ids.length, ids },
    { status: 202 }
  );
}
