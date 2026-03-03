import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rules = await prisma.platformRule.findMany({
    orderBy: { narrativeType: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const body = await request.json();
  const rule = await prisma.platformRule.create({
    data: {
      narrativeType: body.narrativeType,
      primaryPlatform: body.primaryPlatform,
      secondaryPlatform: body.secondaryPlatform || null,
      brandName: body.brandName || null,
      sendWhen: JSON.stringify(body.sendWhen || []),
      neverSend: JSON.stringify(body.neverSend || []),
      speedPriority: body.speedPriority,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
