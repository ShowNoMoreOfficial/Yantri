import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const rule = await prisma.platformRule.update({
    where: { id },
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
  return NextResponse.json(rule);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.platformRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
