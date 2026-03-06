import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { routeToModel } from "@/lib/modelRouter";
import { inngest } from "@/lib/inngest/client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FactEnginePostBody {
  treeId: string;
  forceRefresh?: boolean;
}

interface StructuredDossier {
  facts: { claim: string; source: string; confidence: string }[];
  stats: { metric: string; value: string; source: string; context: string }[];
  quotes: { text: string; speaker: string; role: string; date: string; source: string }[];
  timeline: { date: string; event: string; source: string }[];
  sources: string[];
}

// ─── Fact Engine System Prompt ──────────────────────────────────────────────

function buildFactEnginePrompt(
  rootTrend: string,
  nodes: { signalTitle: string; signalData: unknown }[]
): { systemPrompt: string; userMessage: string } {
  const signalList = nodes
    .map((n, i) => {
      const data =
        typeof n.signalData === "object" && n.signalData !== null
          ? JSON.stringify(n.signalData)
          : String(n.signalData);
      return `Signal ${i + 1}: "${n.signalTitle}"\nData: ${data}`;
    })
    .join("\n\n");

  const systemPrompt = `You are a Fact Engine — a web-grounded research synthesizer for a narrative intelligence platform. Your job is to conduct thorough, source-backed research on a narrative tree and its constituent signals.

ROOT TREND: ${rootTrend}

SIGNALS IN THIS NARRATIVE TREE:
${signalList}

INSTRUCTIONS:
1. Research the root trend and all related signals using web search.
2. Cross-reference claims across multiple sources for accuracy.
3. Prioritize recent, verified information over older or unverified claims.
4. Extract hard data points: numbers, dates, names, places, direct quotes.
5. Identify contradictions between official statements and evidence.
6. Build a chronological timeline of key events.
7. Compile all source URLs for verification.

Be exhaustive but precise. Every fact must be traceable to a source. No speculation, no filler.`;

  const userMessage = `Conduct comprehensive research on the narrative tree: "${rootTrend}"

Investigate all ${nodes.length} signals and their interconnections. Focus on:
- Verifiable facts and their sources
- Statistical data with context
- Direct quotes from key stakeholders
- A chronological timeline of events
- All source URLs used

Provide your findings as a detailed research report.`;

  return { systemPrompt, userMessage };
}

// ─── Structuring Prompt ─────────────────────────────────────────────────────

function buildStructuringPrompt(rawResearch: string): {
  systemPrompt: string;
  userMessage: string;
} {
  const systemPrompt = `You are a research structuring engine. You receive raw research text and must extract and organize it into a strict JSON structure.

OUTPUT FORMAT (respond in JSON only, no other text):
{
  "facts": [
    { "claim": "Specific factual claim", "source": "Source URL or name", "confidence": "high|medium|low" }
  ],
  "stats": [
    { "metric": "What is being measured", "value": "The number or percentage", "source": "Source URL or name", "context": "Why this number matters" }
  ],
  "quotes": [
    { "text": "Exact quote text", "speaker": "Person's name", "role": "Their title/role", "date": "When they said it", "source": "Source URL or name" }
  ],
  "timeline": [
    { "date": "YYYY-MM-DD or descriptive date", "event": "What happened", "source": "Source URL or name" }
  ],
  "sources": ["https://source1.com", "https://source2.com"]
}

RULES:
- Extract ALL facts, stats, quotes, and timeline events from the research
- Every item must have a source attribution
- Timeline must be in chronological order
- Sources array must contain all unique URLs/references found
- If confidence in a fact is uncertain, mark it "low" — do not omit it
- Be thorough: aim for at least 5 facts, 3 stats, and 3 timeline entries when data supports it`;

  return {
    systemPrompt,
    userMessage: `Structure the following research into the required JSON format:\n\n${rawResearch}`,
  };
}

// ─── Extract Source URLs ────────────────────────────────────────────────────

function extractSources(structured: StructuredDossier, raw: string): string[] {
  const urlSet = new Set<string>();

  // Collect from structured sources array
  if (Array.isArray(structured.sources)) {
    for (const s of structured.sources) {
      if (typeof s === "string" && s.startsWith("http")) {
        urlSet.add(s);
      }
    }
  }

  // Collect URLs from source fields in facts, stats, quotes, timeline
  const allItems = [
    ...(structured.facts ?? []),
    ...(structured.stats ?? []),
    ...(structured.quotes ?? []),
    ...(structured.timeline ?? []),
  ];
  for (const item of allItems) {
    const source = (item as { source?: string }).source;
    if (typeof source === "string" && source.startsWith("http")) {
      urlSet.add(source);
    }
  }

  // Extract URLs from raw text as fallback
  const urlRegex = /https?:\/\/[^\s)>\]"']+/g;
  const rawUrls = raw.match(urlRegex);
  if (rawUrls) {
    for (const url of rawUrls) {
      urlSet.add(url.replace(/[.,;:]+$/, "")); // Strip trailing punctuation
    }
  }

  return Array.from(urlSet);
}

// ─── POST — Trigger Research ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    let body: FactEnginePostBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { treeId, forceRefresh } = body;

    if (!treeId || typeof treeId !== "string") {
      return NextResponse.json(
        { error: "treeId is required and must be a string" },
        { status: 400 }
      );
    }

    // Fetch the NarrativeTree with nodes and existing dossier
    const tree = await prisma.narrativeTree.findUnique({
      where: { id: treeId },
      include: {
        nodes: {
          orderBy: { signalScore: "desc" },
        },
        dossier: true,
      },
    });

    if (!tree) {
      return NextResponse.json(
        { error: `NarrativeTree not found: ${treeId}` },
        { status: 404 }
      );
    }

    // Return existing dossier if present and not forcing refresh
    if (tree.dossier && !forceRefresh) {
      return NextResponse.json({
        dossier: tree.dossier,
        tree: {
          id: tree.id,
          rootTrend: tree.rootTrend,
          status: tree.status,
          nodeCount: tree.nodes.length,
        },
        cached: true,
      });
    }

    // ── Conduct research ────────────────────────────────────────────────

    if (tree.nodes.length === 0) {
      return NextResponse.json(
        { error: "NarrativeTree has no nodes to research" },
        { status: 422 }
      );
    }

    // Step 1: Web-grounded research via Gemini Search
    const { systemPrompt, userMessage } = buildFactEnginePrompt(
      tree.rootTrend,
      tree.nodes.map((n) => ({
        signalTitle: n.signalTitle,
        signalData: n.signalData,
      }))
    );

    const researchResult = await routeToModel("research", systemPrompt, userMessage);
    const rawResearch = researchResult.raw;

    if (!rawResearch || rawResearch.trim().length === 0) {
      return NextResponse.json(
        { error: "Research returned empty results" },
        { status: 502 }
      );
    }

    // Step 2: Structure raw research into FactDossier format
    const { systemPrompt: structPrompt, userMessage: structMessage } =
      buildStructuringPrompt(rawResearch);

    const structureResult = await routeToModel(
      "strategy",
      structPrompt,
      structMessage,
      { temperature: 0.1 }
    );

    const structured = (structureResult.parsed as StructuredDossier) ?? {
      facts: [],
      stats: [],
      quotes: [],
      timeline: [],
      sources: [],
    };

    // Compile all unique source URLs
    const allSources = extractSources(structured, rawResearch);

    // Step 3: Store dossier (upsert — create or update)
    const structuredJson = structured as unknown as Prisma.InputJsonValue;
    const dossier = await prisma.factDossier.upsert({
      where: { treeId },
      create: {
        treeId,
        structuredData: structuredJson,
        sources: allSources,
        visualAssets: [],
        rawResearch,
      },
      update: {
        structuredData: structuredJson,
        sources: allSources,
        rawResearch,
      },
    });

    // Step 4: Send Inngest event for deeper async synthesis
    await inngest.send({
      name: "yantri/dossier.build",
      data: { treeId },
    });

    return NextResponse.json(
      {
        dossier,
        tree: {
          id: tree.id,
          rootTrend: tree.rootTrend,
          status: tree.status,
          nodeCount: tree.nodes.length,
        },
        cached: false,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Fact Engine POST error:", message);
    return NextResponse.json(
      { error: `Fact Engine research failed: ${message}` },
      { status: 500 }
    );
  }
}

// ─── GET — Fetch Existing FactDossier ───────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get("treeId");

    if (!treeId) {
      return NextResponse.json(
        { error: "treeId query parameter is required" },
        { status: 400 }
      );
    }

    const dossier = await prisma.factDossier.findUnique({
      where: { treeId },
      include: {
        tree: {
          select: {
            id: true,
            rootTrend: true,
            summary: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!dossier) {
      return NextResponse.json(
        { error: `No FactDossier found for treeId: ${treeId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ dossier });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Fact Engine GET error:", message);
    return NextResponse.json(
      { error: `Failed to fetch dossier: ${message}` },
      { status: 500 }
    );
  }
}
