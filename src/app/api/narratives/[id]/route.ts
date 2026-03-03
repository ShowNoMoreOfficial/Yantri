import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const narrative = await prisma.narrative.findUnique({
    where: { id: params.id },
    include: { brand: true, trend: true },
  });
  if (!narrative) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(narrative);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.researchResults !== undefined) data.researchResults = body.researchResults;
  if (body.finalContent !== undefined) data.finalContent = body.finalContent;
  if (body.angle !== undefined) data.angle = body.angle;
  if (body.platform !== undefined) data.platform = body.platform;
  if (body.brandId !== undefined) data.brandId = body.brandId;

  const narrative = await prisma.narrative.update({
    where: { id: params.id },
    data,
    include: { brand: true, trend: true },
  });

  // Log status changes
  if (body.status) {
    await prisma.editorialLog.create({
      data: {
        action: body.status === "killed" ? "killed" : body.status === "published" ? "published" : "override",
        reasoning: body.reason || `Status changed to ${body.status}`,
        trendHeadline: narrative.trend.headline,
        narrativeAngle: narrative.angle,
        platform: narrative.platform,
        brandName: narrative.brand.name,
      },
    });
  }

  return NextResponse.json(narrative);
}
