import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "khabri_fetch.py");
    const geminiKey = process.env.GEMINI_API_KEY || "";

    const { stdout, stderr } = await execAsync(
      `python "${scriptPath}"`,
      {
        env: { ...process.env, GEMINI_API_KEY: geminiKey },
        timeout: 120000, // 2 minute timeout
      }
    );

    if (stderr) {
      console.error("Khabri stderr:", stderr);
    }

    let ranked;
    try {
      ranked = JSON.parse(stdout.trim());
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Khabri output", raw: stdout },
        { status: 500 }
      );
    }

    if (ranked.error) {
      return NextResponse.json({ error: ranked.error }, { status: 500 });
    }

    if (!Array.isArray(ranked) || ranked.length === 0) {
      return NextResponse.json({ error: "No trends returned from Khabri" }, { status: 500 });
    }

    // Import as a new batch
    const batch = await prisma.trendBatch.create({
      data: {
        source: "khabri_auto",
        trends: {
          create: ranked.map(
            (t: { rank: number; topic: string; score: number; reason: string }) => ({
              rank: t.rank || 0,
              score: t.score || 0,
              headline: t.topic || "",
              reason: t.reason || "",
            })
          ),
        },
      },
      include: { trends: true },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Khabri fetch error:", message);
    return NextResponse.json(
      { error: `Khabri fetch failed: ${message}` },
      { status: 500 }
    );
  }
}
