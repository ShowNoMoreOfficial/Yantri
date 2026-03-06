import { NextRequest, NextResponse } from "next/server";
import { routeToModel } from "@/lib/modelRouter";

// POST /api/yantri/rewrite-segment — micro-regenerate a selected text segment
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { originalText, userInstruction, context } = body;

  if (!originalText || !userInstruction) {
    return NextResponse.json(
      { error: "originalText and userInstruction are required" },
      { status: 400 }
    );
  }

  const systemPrompt = `You are receiving a finalized draft and a specific human instruction. Rewrite ONLY the highlighted text to satisfy the instruction, maintaining exact tone, style, and formatting of the original.

RULES:
- Return ONLY the rewritten text. No preamble, no explanation, no wrapping quotes.
- Match the language, tone, and register of the surrounding content.
- If the instruction asks to shorten, reduce by at least 30%.
- If the instruction asks to rewrite, change the structure and phrasing while keeping the meaning.
- Do NOT add new information that isn't supported by the context.
- Preserve any inline citations or source references.

${context ? `CONTEXT (for reference only — do NOT rewrite this):\n${typeof context === "string" ? context : JSON.stringify(context)}` : ""}`;

  const userMessage = `ORIGINAL TEXT TO REWRITE:\n"${originalText}"\n\nINSTRUCTION: ${userInstruction}`;

  try {
    const result = await routeToModel("drafting", systemPrompt, userMessage, {
      temperature: 0.4,
    });

    // The result might be JSON-wrapped or plain text
    let rewrittenText = result.raw;
    if (result.parsed && typeof result.parsed === "string") {
      rewrittenText = result.parsed;
    } else if (result.parsed && typeof result.parsed === "object") {
      const parsed = result.parsed as Record<string, unknown>;
      if (typeof parsed.text === "string") rewrittenText = parsed.text;
      if (typeof parsed.rewritten === "string") rewrittenText = parsed.rewritten;
    }

    return NextResponse.json({
      originalText,
      rewrittenText: rewrittenText.trim(),
      model: result.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
