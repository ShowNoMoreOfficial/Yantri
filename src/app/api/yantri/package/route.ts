import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGemini } from "@/lib/gemini";
import { buildPackagingPrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  const { narrativeId } = await request.json();

  const narrative = await prisma.narrative.findUnique({
    where: { id: narrativeId },
    include: { trend: true, brand: true },
  });

  if (!narrative) return NextResponse.json({ error: "Narrative not found" }, { status: 404 });

  let keyDataPoints = "No research data available yet";
  if (narrative.researchResults) {
    // Summarize research via Gemini instead of blindly truncating
    const { parsed: summary } = await callGemini(
      "Extract the key data points from this research for content packaging. Return JSON: {\"key_points\": \"a concise summary of the most important numbers, facts, quotes, and contradictions (under 1500 chars)\"}",
      narrative.researchResults
    );
    keyDataPoints = summary?.key_points || narrative.researchResults.slice(0, 1500);
  }

  const { systemPrompt, userMessage } = buildPackagingPrompt(
    narrative.angle,
    narrative.platform,
    narrative.brand.name,
    keyDataPoints
  );

  const { parsed, raw } = await callGemini(systemPrompt, userMessage);

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
