import { GoogleGenerativeAI } from "@google/generative-ai";

const globalForGemini = globalThis as unknown as {
  genAI: GoogleGenerativeAI | undefined;
};

const genAI =
  globalForGemini.genAI ??
  new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

if (process.env.NODE_ENV !== "production") globalForGemini.genAI = genAI;

export async function callClaude(systemPrompt: string, userMessage: string) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userMessage);
  const rawText = result.response.text();

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim();

  try {
    return { parsed: JSON.parse(jsonStr), raw: rawText };
  } catch {
    return { parsed: null, raw: rawText };
  }
}
