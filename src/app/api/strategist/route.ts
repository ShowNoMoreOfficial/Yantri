import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runStrategist, type StrategyDecision } from "@/lib/strategist";

// ─── POST /api/strategist ───────────────────────────────────────────────────
// Runs the Strategist Agent against all active brands for a given NarrativeTree.

export async function POST(request: Request) {
  try {
    // 1. Parse and validate request body
    let body: { treeId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { treeId } = body;

    if (!treeId || typeof treeId !== "string") {
      return NextResponse.json(
        { error: "Request body must contain a `treeId` string" },
        { status: 400 }
      );
    }

    // 2. Verify the tree exists and fetch its dossier
    const tree = await prisma.narrativeTree.findUnique({
      where: { id: treeId },
      include: { dossier: true },
    });

    if (!tree) {
      return NextResponse.json(
        { error: `NarrativeTree "${treeId}" not found` },
        { status: 404 }
      );
    }

    if (!tree.dossier) {
      return NextResponse.json(
        {
          error: `NarrativeTree "${treeId}" has no FactDossier. Build a dossier before running the strategist.`,
          hint: "Send a 'yantri/dossier.build' event with this treeId first.",
        },
        { status: 422 }
      );
    }

    // 3. Fetch all active brands
    const activeBrands = await prisma.brand.findMany({
      where: { isActive: true },
    });

    if (activeBrands.length === 0) {
      return NextResponse.json(
        { error: "No active brands found. Create at least one active brand first." },
        { status: 422 }
      );
    }

    // 4. Run the strategist
    const decisions: StrategyDecision[] = await runStrategist({
      treeId,
      brands: activeBrands,
      dossier: {
        structuredData: tree.dossier.structuredData,
        sources: tree.dossier.sources,
        rawResearch: tree.dossier.rawResearch,
      },
    });

    return NextResponse.json(
      {
        treeId,
        treeName: tree.rootTrend,
        decisionsCount: decisions.length,
        decisions,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Strategist API error:", message);
    return NextResponse.json(
      { error: `Strategist failed: ${message}` },
      { status: 500 }
    );
  }
}
