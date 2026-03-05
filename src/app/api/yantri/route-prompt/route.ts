import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGemini } from "@/lib/gemini";
import { buildEnginePrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  const { narrativeId } = await request.json();

  const narrative = await prisma.narrative.findUnique({
    where: { id: narrativeId },
    include: { trend: true, brand: true },
  });

  if (!narrative) return NextResponse.json({ error: "Narrative not found" }, { status: 404 });
  if (!narrative.researchResults) {
    return NextResponse.json({ error: "No research results yet" }, { status: 400 });
  }

  const { systemPrompt, userMessage } = buildEnginePrompt(
    narrative.angle,
    narrative.platform,
    narrative.format,
    narrative.brand.name,
    Array.isArray(narrative.brand.voiceRules)
      ? (narrative.brand.voiceRules as string[]).join("; ")
      : String(narrative.brand.voiceRules),
    narrative.researchResults
  );

  const { parsed, raw } = await callGemini(systemPrompt, userMessage);

  if (!parsed) {
    return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
  }

  // Update narrative with engine prompt
  await prisma.narrative.update({
    where: { id: narrativeId },
    data: {
      enginePrompt: parsed.prompt || raw,
      status: "producing",
    },
  });

  return NextResponse.json({ engine: parsed, raw });
}
