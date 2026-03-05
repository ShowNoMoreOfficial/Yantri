import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGeminiResearch } from "@/lib/gemini";
import { buildResearchPrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  const { narrativeId } = await request.json();

  const narrative = await prisma.narrative.findUnique({
    where: { id: narrativeId },
    include: { trend: true, brand: true },
  });

  if (!narrative) return NextResponse.json({ error: "Narrative not found" }, { status: 404 });

  // Build the research prompt directly (no meta-prompt step)
  const { systemPrompt, userMessage } = buildResearchPrompt(
    narrative.angle,
    narrative.trend.headline,
    narrative.brand.name,
    narrative.platform
  );

  // Save prompt and set status
  await prisma.narrative.update({
    where: { id: narrativeId },
    data: {
      researchPrompt: systemPrompt,
      status: "researching",
    },
  });

  // Stream SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent({ event: "prompt_ready", researchPrompt: systemPrompt });
      sendEvent({
        event: "status",
        message: "Researching with Gemini + Google Search grounding...",
        phase: "researching",
      });

      try {
        const text = await callGeminiResearch(systemPrompt, userMessage);

        if (text) {
          await prisma.narrative.update({
            where: { id: narrativeId },
            data: { researchResults: text },
          });
          sendEvent({ event: "complete", research: text });
          sendEvent({ event: "done", success: true });
        } else {
          await prisma.narrative.update({
            where: { id: narrativeId },
            data: { status: "planned" },
          });
          sendEvent({ event: "error", message: "Research completed but returned empty output" });
          sendEvent({ event: "done", success: false, error: "Empty output" });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Reset status so user can retry
        await prisma.narrative.update({
          where: { id: narrativeId },
          data: { status: "planned" },
        });
        sendEvent({ event: "error", message: `Research failed: ${message}` });
        sendEvent({ event: "done", success: false, error: message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
