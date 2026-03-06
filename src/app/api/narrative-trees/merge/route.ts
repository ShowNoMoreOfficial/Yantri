import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

// POST /api/narrative-trees/merge — merge sourceTree into targetTree
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sourceTreeId, targetTreeId } = body;

  if (!sourceTreeId || !targetTreeId) {
    return NextResponse.json(
      { error: "sourceTreeId and targetTreeId are required" },
      { status: 400 }
    );
  }

  if (sourceTreeId === targetTreeId) {
    return NextResponse.json(
      { error: "Cannot merge a tree into itself" },
      { status: 400 }
    );
  }

  // Verify both trees exist
  const [source, target] = await Promise.all([
    prisma.narrativeTree.findUnique({ where: { id: sourceTreeId } }),
    prisma.narrativeTree.findUnique({ where: { id: targetTreeId } }),
  ]);

  if (!source) {
    return NextResponse.json({ error: "Source tree not found" }, { status: 404 });
  }
  if (!target) {
    return NextResponse.json({ error: "Target tree not found" }, { status: 404 });
  }

  // Move all NarrativeNodes from source to target
  await prisma.narrativeNode.updateMany({
    where: { treeId: sourceTreeId },
    data: { treeId: targetTreeId },
  });

  // Move all ContentPieces from source to target
  await prisma.contentPiece.updateMany({
    where: { treeId: sourceTreeId },
    data: { treeId: targetTreeId },
  });

  // Delete source FactDossier (will be rebuilt)
  await prisma.factDossier.deleteMany({
    where: { treeId: sourceTreeId },
  });

  // Mark source tree as MERGED
  await prisma.narrativeTree.update({
    where: { id: sourceTreeId },
    data: { status: "MERGED" },
  });

  // Trigger dossier rebuild on the target tree
  await inngest.send({
    name: "yantri/dossier.build",
    data: { treeId: targetTreeId },
  });

  return NextResponse.json({
    success: true,
    sourceTreeId,
    targetTreeId,
    message: "Trees merged. Dossier rebuild triggered.",
  });
}
