import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: `Generate an image based on this prompt: ${prompt}`,
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find(
      (p: Record<string, unknown>) => p.inlineData && typeof p.inlineData === "object"
    );

    if (!imagePart || !("inlineData" in imagePart)) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    const inlineData = imagePart.inlineData as { data: string; mimeType: string };

    return NextResponse.json({
      image: inlineData.data,
      mimeType: inlineData.mimeType || "image/png",
    });
  } catch (error) {
    console.error("Image generation failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
