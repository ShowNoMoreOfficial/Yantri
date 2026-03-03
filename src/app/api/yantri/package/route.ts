import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callClaude } from "@/lib/anthropic";
import { buildPackagingPrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  const { narrativeId } = await request.json();

  const narrative = await prisma.narrative.findUnique({
    where: { id: narrativeId },
    include: { trend: true, brand: true },
  });

  if (!narrative) return NextResponse.json({ error: "Narrative not found" }, { status: 404 });

  const keyDataPoints = narrative.researchResults
    ? narrative.researchResults.slice(0, 500)
    : "No research data available yet";

  const { systemPrompt, userMessage } = buildPackagingPrompt(
    narrative.angle,
    narrative.platform,
    narrative.brand.name,
    keyDataPoints
  );

  const { parsed, raw } = await callClaude(systemPrompt, userMessage);

  if (!parsed) {
    return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
  }

  // Update narrative with package data
  await prisma.narrative.update({
    where: { id: narrativeId },
    data: {
      packageData: JSON.stringify(parsed),
    },
  });

  return NextResponse.json({ package: parsed, raw });
}
