import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const rule = await prisma.platformRule.update({
    where: { id: params.id },
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

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await prisma.platformRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
