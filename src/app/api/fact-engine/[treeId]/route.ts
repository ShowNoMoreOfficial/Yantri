import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET — Dossier for a specific tree ──────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;

    const tree = await prisma.narrativeTree.findUnique({
      where: { id: treeId },
      include: {
        dossier: true,
        nodes: {
          select: { id: true },
        },
      },
    });

    if (!tree) {
      return NextResponse.json(
        { error: `NarrativeTree not found: ${treeId}` },
        { status: 404 }
      );
    }

    if (!tree.dossier) {
      return NextResponse.json(
        {
          error: `No FactDossier exists for tree: ${treeId}`,
          tree: {
            id: tree.id,
            rootTrend: tree.rootTrend,
            status: tree.status,
            nodeCount: tree.nodes.length,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      dossier: tree.dossier,
      tree: {
        id: tree.id,
        rootTrend: tree.rootTrend,
        summary: tree.summary,
        status: tree.status,
        nodeCount: tree.nodes.length,
        createdAt: tree.createdAt,
        updatedAt: tree.updatedAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Fact Engine GET [treeId] error:", message);
    return NextResponse.json(
      { error: `Failed to fetch dossier: ${message}` },
      { status: 500 }
    );
  }
}

// ─── DELETE — Remove a FactDossier ──────────────────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;

    // Verify the tree exists
    const tree = await prisma.narrativeTree.findUnique({
      where: { id: treeId },
      select: { id: true, rootTrend: true },
    });

    if (!tree) {
      return NextResponse.json(
        { error: `NarrativeTree not found: ${treeId}` },
        { status: 404 }
      );
    }

    // Check if dossier exists before attempting deletion
    const existingDossier = await prisma.factDossier.findUnique({
      where: { treeId },
      select: { id: true },
    });

    if (!existingDossier) {
      return NextResponse.json(
        { error: `No FactDossier exists for tree: ${treeId}` },
        { status: 404 }
      );
    }

    await prisma.factDossier.delete({
      where: { treeId },
    });

    return NextResponse.json({
      message: `FactDossier deleted for tree: ${tree.rootTrend}`,
      treeId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Fact Engine DELETE [treeId] error:", message);
    return NextResponse.json(
      { error: `Failed to delete dossier: ${message}` },
      { status: 500 }
    );
  }
}
