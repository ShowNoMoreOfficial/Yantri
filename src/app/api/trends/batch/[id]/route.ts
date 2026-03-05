import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await prisma.trendBatch.findUnique({
    where: { id },
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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Delete narratives for all trends in this batch
  const trends = await prisma.trend.findMany({
    where: { batchId: id },
    select: { id: true },
  });
  const trendIds = trends.map((t) => t.id);

  await prisma.narrative.deleteMany({ where: { trendId: { in: trendIds } } });
  await prisma.trend.deleteMany({ where: { batchId: id } });
  await prisma.trendBatch.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

// Reset batch: delete narratives and reset trend statuses so Yantri can re-run
export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trends = await prisma.trend.findMany({
    where: { batchId: id },
    select: { id: true },
  });
  const trendIds = trends.map((t) => t.id);

  await prisma.narrative.deleteMany({ where: { trendId: { in: trendIds } } });
  await prisma.trend.updateMany({
    where: { batchId: id },
    data: { status: "pending", skipReason: null },
  });

  return NextResponse.json({ ok: true });
}
