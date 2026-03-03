import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const brand = await prisma.brand.findUnique({ where: { id: params.id } });
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(brand);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const brand = await prisma.brand.update({
    where: { id: params.id },
    data: {
      name: body.name,
      tagline: body.tagline || null,
      language: body.language,
      tone: body.tone,
      editorialCovers: JSON.stringify(body.editorialCovers || []),
      editorialNever: JSON.stringify(body.editorialNever || []),
      audienceSize: body.audienceSize || null,
      audienceDemographics: body.audienceDemographics ? JSON.stringify(body.audienceDemographics) : null,
      audienceGeography: body.audienceGeography ? JSON.stringify(body.audienceGeography) : null,
      audienceInterests: body.audienceInterests ? JSON.stringify(body.audienceInterests) : null,
      audienceDescription: body.audienceDescription || null,
      activePlatforms: JSON.stringify(body.activePlatforms || []),
      voiceRules: JSON.stringify(body.voiceRules || []),
      editorialPriorities: JSON.stringify(body.editorialPriorities || []),
      contentFrequency: body.contentFrequency ? JSON.stringify(body.contentFrequency) : null,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(brand);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await prisma.brand.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
