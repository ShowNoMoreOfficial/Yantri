import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const data = await prisma.performanceData.findMany({
    orderBy: { recordedAt: "desc" },
  });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const record = await prisma.performanceData.create({
    data: {
      narrativeId: body.narrativeId || null,
      platform: body.platform,
      brandName: body.brandName,
      contentType: body.contentType,
      impressions: body.impressions ? parseInt(body.impressions) : null,
      engagementRate: body.engagementRate ? parseFloat(body.engagementRate) : null,
      replies: body.replies ? parseInt(body.replies) : null,
      retweets: body.retweets ? parseInt(body.retweets) : null,
      bookmarks: body.bookmarks ? parseInt(body.bookmarks) : null,
      views: body.views ? parseInt(body.views) : null,
      watchTime: body.watchTime ? parseFloat(body.watchTime) : null,
      ctr: body.ctr ? parseFloat(body.ctr) : null,
      notes: body.notes || null,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
    },
  });
  return NextResponse.json(record, { status: 201 });
}
