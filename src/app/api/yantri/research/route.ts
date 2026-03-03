import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callClaude } from "@/lib/anthropic";
import { buildResearchPrompt } from "@/lib/prompts";
import { spawn } from "child_process";
import path from "path";

export async function POST(request: Request) {
  const { narrativeId } = await request.json();

  const narrative = await prisma.narrative.findUnique({
    where: { id: narrativeId },
    include: { trend: true, brand: true },
  });

  if (!narrative) return NextResponse.json({ error: "Narrative not found" }, { status: 404 });

  // Step 1: Generate the research prompt via Gemini
  const { systemPrompt, userMessage } = buildResearchPrompt(
    narrative.angle,
    narrative.trend.headline,
    narrative.brand.name,
    narrative.platform
  );

  const { parsed, raw } = await callClaude(systemPrompt, userMessage);
  const researchPromptText = parsed?.research_prompt || raw;

  // Save the generated research prompt
  await prisma.narrative.update({
    where: { id: narrativeId },
    data: {
      researchPrompt: researchPromptText,
      status: "researching",
    },
  });

  // Step 2: Run deep research via Interactions API (Python script)
  const scriptPath = path.join(process.cwd(), "scripts", "deep_research.py");
  const geminiKey = process.env.GEMINI_API_KEY || "";

  // Build a focused research query from the narrative
  const researchQuery = `${narrative.angle} — From trend: ${narrative.trend.headline} — For brand: ${narrative.brand.name} on platform: ${narrative.platform}`;

  // Stream SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent({ event: "prompt_ready", researchPrompt: researchPromptText, manualQueries: parsed?.manual_queries || [] });

      const child = spawn("python", [scriptPath, researchQuery], {
        env: { ...process.env, GEMINI_API_KEY: geminiKey },
      });

      let fullOutput = "";

      child.stdout.on("data", (data: Buffer) => {
        const lines = data.toString().split("\n").filter((l: string) => l.trim());
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            sendEvent(parsed);

            if (parsed.event === "complete" && parsed.research) {
              fullOutput = parsed.research;
            }
          } catch {
            // Non-JSON output, send as status
            sendEvent({ event: "status", message: line });
          }
        }
      });

      child.stderr.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) {
          console.error("Deep research stderr:", msg);
          sendEvent({ event: "status", message: `[stderr] ${msg}` });
        }
      });

      child.on("close", async (code) => {
        if (fullOutput) {
          // Save research results to narrative
          await prisma.narrative.update({
            where: { id: narrativeId },
            data: { researchResults: fullOutput },
          });
          sendEvent({ event: "done", success: true });
        } else {
          // Reset status so user can retry
          await prisma.narrative.update({
            where: { id: narrativeId },
            data: { status: "planned" },
          });
          sendEvent({ event: "done", success: false, error: `Process exited with code ${code}` });
        }
        controller.close();
      });

      child.on("error", (err) => {
        sendEvent({ event: "error", message: err.message });
        controller.close();
      });
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
