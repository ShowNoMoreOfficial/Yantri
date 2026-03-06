import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

interface RouteContext {
  params: Promise<{ treeId: string }>;
}

// POST /api/narrative-trees/:treeId/hypothesis
// Create a HYPOTHESIS node and trigger strategist planning
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { treeId } = await ctx.params;
  const body = await req.json();
  const { scenario } = body;

  if (!scenario?.trim()) {
    return NextResponse.json(
      { error: "scenario is required" },
      { status: 400 }
    );
  }

  // Verify tree exists
  const tree = await prisma.narrativeTree.findUnique({ where: { id: treeId } });
  if (!tree) {
    return NextResponse.json({ error: "Tree not found" }, { status: 404 });
  }

  // Create the hypothesis node
  const node = await prisma.narrativeNode.create({
    data: {
      treeId,
      nodeType: "HYPOTHESIS",
      signalTitle: scenario,
      signalData: { type: "hypothesis", scenario, createdBy: "user" },
      signalScore: 0,
    },
  });

  // Trigger the tree.updated event so the Strategist generates planned content
  await inngest.send({
    name: "yantri/tree.updated",
    data: { treeId },
  });

  return NextResponse.json(node, { status: 201 });
}
