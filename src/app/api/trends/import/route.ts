import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const { trends, source } = body;

  const batch = await prisma.trendBatch.create({
    data: {
      source: source || "khabri_manual",
      trends: {
        create: trends.map(
          (t: { rank: number; score: number; headline: string; reason: string }) => ({
            rank: t.rank,
            score: t.score,
            headline: t.headline,
            reason: t.reason,
          })
        ),
      },
    },
    include: { trends: true },
  });

  return NextResponse.json(batch, { status: 201 });
}
