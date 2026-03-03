import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const brandId = searchParams.get("brandId");
  const platform = searchParams.get("platform");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (brandId) where.brandId = brandId;
  if (platform) where.platform = platform;

  const narratives = await prisma.narrative.findMany({
    where,
    include: { brand: true, trend: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(narratives);
}
