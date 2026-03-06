import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

// ─── GET /api/deliverables ──────────────────────────────────────────────────
// List deliverables with optional filters: ?status=REVIEW&platform=META_CAROUSEL&brandId=xxx

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const brandId = searchParams.get("brandId");
  const pipelineType = searchParams.get("pipelineType");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (platform) where.platform = platform;
  if (brandId) where.brandId = brandId;
  if (pipelineType) where.pipelineType = pipelineType;

  const deliverables = await prisma.deliverable.findMany({
    where,
    include: {
      brand: { select: { id: true, name: true } },
      assets: true,
      tree: { select: { id: true, rootTrend: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(deliverables);
}

// ─── POST /api/deliverables ─────────────────────────────────────────────────
// Create a new deliverable and optionally trigger its pipeline.
//
// Body: {
//   brandId: string,
//   platform: "X_SINGLE" | "X_THREAD" | "LINKEDIN" | "META_CAROUSEL" | "META_POST" | "YOUTUBE" | ...,
//   pipelineType: "viral_micro" | "carousel" | "cinematic" | "standard",
//   copyMarkdown?: string,   // Initial angle / seed text
//   treeId?: string,         // Optional NarrativeTree link
//   researchPrompt?: string, // Custom research prompt
//   autoTrigger?: boolean    // If true, immediately trigger the pipeline
// }

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { brandId, platform, pipelineType, copyMarkdown, treeId, researchPrompt, autoTrigger } =
    body as {
      brandId?: string;
      platform?: string;
      pipelineType?: string;
      copyMarkdown?: string;
      treeId?: string;
      researchPrompt?: string;
      autoTrigger?: boolean;
    };

  if (!brandId || !platform) {
    return NextResponse.json(
      { error: "brandId and platform are required" },
      { status: 400 }
    );
  }

  // Validate brand exists
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    return NextResponse.json({ error: `Brand not found: ${brandId}` }, { status: 404 });
  }

  // Validate platform enum
  const validPlatforms = [
    "YOUTUBE",
    "X_THREAD",
    "X_SINGLE",
    "BLOG",
    "LINKEDIN",
    "META_REEL",
    "META_CAROUSEL",
    "META_POST",
  ];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json(
      { error: `Invalid platform. Must be one of: ${validPlatforms.join(", ")}` },
      { status: 400 }
    );
  }

  const resolvedPipelineType = pipelineType ?? inferPipelineType(platform);

  const deliverable = await prisma.deliverable.create({
    data: {
      brandId,
      platform: platform as "YOUTUBE" | "X_THREAD" | "X_SINGLE" | "BLOG" | "LINKEDIN" | "META_REEL" | "META_CAROUSEL" | "META_POST",
      pipelineType: resolvedPipelineType,
      copyMarkdown: copyMarkdown ?? "",
      treeId: treeId ?? null,
      researchPrompt: researchPrompt ?? null,
      status: "PLANNED",
    },
    include: {
      brand: { select: { id: true, name: true } },
    },
  });

  // Auto-trigger pipeline if requested
  if (autoTrigger) {
    const eventName = getEventNameForPipeline(resolvedPipelineType);

    await prisma.deliverable.update({
      where: { id: deliverable.id },
      data: { status: "RESEARCHING" },
    });

    await inngest.send({
      name: eventName,
      data: { deliverableId: deliverable.id },
    });
  }

  return NextResponse.json(deliverable, { status: 201 });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function inferPipelineType(platform: string): string {
  switch (platform) {
    case "X_SINGLE":
    case "X_THREAD":
    case "LINKEDIN":
      return "viral_micro";
    case "META_CAROUSEL":
      return "carousel";
    case "YOUTUBE":
      return "cinematic";
    default:
      return "standard";
  }
}

function getEventNameForPipeline(pipelineType: string): string {
  switch (pipelineType) {
    case "viral_micro":
      return "yantri/deliverable.viral-micro";
    case "carousel":
      return "yantri/deliverable.carousel";
    case "cinematic":
      return "yantri/deliverable.cinematic";
    default:
      return "yantri/deliverable.viral-micro";
  }
}
