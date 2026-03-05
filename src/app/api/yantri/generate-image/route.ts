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
      model: "gemini-3.1-flash-image-preview",
      contents: `Generate an image based on this prompt: ${prompt}`,
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts?.find((p: any) => p.inlineData);

    if (!imagePart || !imagePart.inlineData) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    const { data, mimeType } = imagePart.inlineData as { data: string; mimeType: string };

    return NextResponse.json({
      image: data,
      mimeType: mimeType || "image/png",
    });
  } catch (error) {
    console.error("Image generation failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
