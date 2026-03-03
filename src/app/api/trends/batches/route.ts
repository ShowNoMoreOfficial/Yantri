import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const batches = await prisma.trendBatch.findMany({
    orderBy: { importedAt: "desc" },
    include: {
      trends: {
        orderBy: { rank: "asc" },
        include: { narratives: { select: { id: true } } },
      },
    },
  });
  return NextResponse.json(batches);
}
