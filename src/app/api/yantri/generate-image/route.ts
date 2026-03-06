import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    const response = await genAI.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "16:9", // Social media standard, could be customized per platform
      },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
      return NextResponse.json(
        { error: "Image generation failed or returned empty." },
        { status: 500 }
      );
    }

    // GoogleGenAI SDK returns image data as base64 in `image.imageBytes`
    const imageBase64 = response.generatedImages![0].image!.imageBytes;

    return NextResponse.json({
      success: true,
      image: `data:image/jpeg;base64,${imageBase64}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Generate Image error:", message);
    return NextResponse.json(
      { error: `Image generation failed: ${message}` },
      { status: 500 }
    );
  }
}
