import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ContentStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// GET /api/pipeline/status
//
// Returns pipeline status info.
//
// Query params:
//   ?contentPieceId=xxx  — returns the specific piece's status and pipeline position
//
// Always includes aggregate stats: how many pieces are in each status.
// ---------------------------------------------------------------------------

// Pipeline step order for positional display
const PIPELINE_STEPS: Record<string, { position: number; label: string }> = {
  PLANNED: { position: 0, label: "Queued" },
  RESEARCHING: { position: 1, label: "Researching" },
  DRAFTED: { position: 2, label: "Drafted (awaiting approval)" },
  APPROVED: { position: 3, label: "Approved" },
  RELAYED: { position: 4, label: "Relayed to platform" },
  PUBLISHED: { position: 5, label: "Published" },
  KILLED: { position: -1, label: "Killed" },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contentPieceId = searchParams.get("contentPieceId");

  try {
    // Aggregate stats — count pieces in each status
    const statusCounts = await prisma.contentPiece.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const stats: Record<string, number> = {};
    for (const s of Object.values(ContentStatus)) {
      stats[s] = 0;
    }
    for (const row of statusCounts) {
      stats[row.status] = row._count.id;
    }

    const response: Record<string, unknown> = { stats };

    // If a specific piece was requested, include its details
    if (contentPieceId) {
      const piece = await prisma.contentPiece.findUnique({
        where: { id: contentPieceId },
        include: { brand: { select: { id: true, name: true } } },
      });

      if (!piece) {
        return NextResponse.json(
          { error: "ContentPiece not found", stats },
          { status: 404 }
        );
      }

      const stepInfo = PIPELINE_STEPS[piece.status] ?? {
        position: -1,
        label: piece.status,
      };

      response.piece = {
        id: piece.id,
        status: piece.status,
        platform: piece.platform,
        brandName: piece.brand.name,
        treeId: piece.treeId,
        hasBody: !!piece.bodyText,
        hasVisualPrompts: !!piece.visualPrompts,
        hasPostingPlan: !!piece.postingPlan,
        pipelinePosition: stepInfo.position,
        pipelineLabel: stepInfo.label,
        createdAt: piece.createdAt,
        updatedAt: piece.updatedAt,
        approvedAt: piece.approvedAt,
        publishedAt: piece.publishedAt,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[pipeline/status] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline status" },
      { status: 500 }
    );
  }
}
