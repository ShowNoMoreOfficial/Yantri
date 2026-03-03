import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const batch = await prisma.trendBatch.findUnique({
    where: { id: params.id },
    include: {
      trends: {
        orderBy: { rank: "asc" },
        include: {
          narratives: {
            include: { brand: true },
            orderBy: { priority: "asc" },
          },
        },
      },
    },
  });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(batch);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  // Delete narratives for all trends in this batch
  const trends = await prisma.trend.findMany({
    where: { batchId: params.id },
    select: { id: true },
  });
  const trendIds = trends.map((t) => t.id);

  await prisma.narrative.deleteMany({ where: { trendId: { in: trendIds } } });
  await prisma.trend.deleteMany({ where: { batchId: params.id } });
  await prisma.trendBatch.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}

// Reset batch: delete narratives and reset trend statuses so Yantri can re-run
export async function PUT(_request: Request, { params }: { params: { id: string } }) {
  const trends = await prisma.trend.findMany({
    where: { batchId: params.id },
    select: { id: true },
  });
  const trendIds = trends.map((t) => t.id);

  await prisma.narrative.deleteMany({ where: { trendId: { in: trendIds } } });
  await prisma.trend.updateMany({
    where: { batchId: params.id },
    data: { status: "pending", skipReason: null },
  });

  return NextResponse.json({ ok: true });
}
