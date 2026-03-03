import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(brands);
}

export async function POST(request: Request) {
  const body = await request.json();
  const brand = await prisma.brand.create({
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
  return NextResponse.json(brand, { status: 201 });
}
