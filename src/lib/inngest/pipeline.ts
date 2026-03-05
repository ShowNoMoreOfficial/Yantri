/**
 * Content Pipeline — Master Orchestration
 *
 * Handles a ContentPiece through its entire lifecycle:
 *   PLANNED -> research -> generate -> visuals -> package -> DRAFTED
 *
 * Triggered by "yantri/pipeline.run" with { contentPieceId }.
 * Each step is a durable `step.run()` call so Inngest can retry
 * individual steps on failure without re-running the whole pipeline.
 */

import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { routeToModel } from "@/lib/modelRouter";
import { runContentEngine, type ContentEngineParams } from "@/lib/engines";
import { runPackagingEngine, type PackagingEngineParams } from "@/lib/engines";
import { generateVisualPrompts, type VisualPromptParams } from "@/lib/engines/nanoBanana";

// ─── Event Type ──────────────────────────────────────────────────────────────

type PipelineEvent = {
  data: { contentPieceId: string };
};

// ─── contentPipeline ─────────────────────────────────────────────────────────

export const contentPipeline = inngest.createFunction(
  {
    id: "content-pipeline",
    retries: 2,
  },
  { event: "yantri/pipeline.run" },
  async ({ event, step }) => {
    const { contentPieceId } = event.data as PipelineEvent["data"];

    // ── Step 1: Fetch the ContentPiece with brand ──────────────────────────

    const piece = await step.run("fetch-content-piece", async () => {
      const cp = await prisma.contentPiece.findUniqueOrThrow({
        where: { id: contentPieceId },
        include: { brand: true },
      });
      return cp;
    });

    // ── Step 2: Research ───────────────────────────────────────────────────
    // If the piece is linked to a NarrativeTree, use its FactDossier.
    // If no dossier exists yet, invoke the dossier builder and wait.
    // If no treeId at all, do a quick inline research via the model router.

    const researchText = await step.run("research", async () => {
      if (piece.treeId) {
        // Try to fetch an existing FactDossier for this tree
        const dossier = await prisma.factDossier.findUnique({
          where: { treeId: piece.treeId },
        });

        if (dossier) {
          // Dossier exists — compile it into a research text
          const structured =
            typeof dossier.structuredData === "string"
              ? dossier.structuredData
              : JSON.stringify(dossier.structuredData, null, 2);
          const sources = (dossier.sources ?? []).join("\n");
          return `## FactDossier\n${structured}\n\n## Sources\n${sources}\n\n${dossier.rawResearch ?? ""}`;
        }

        // No dossier yet — we need to build one. We'll trigger the builder
        // outside this step (step.invoke must be at the top level).
        return null;
      }

      // No treeId — quick inline research (or targeted research if strategist generated a prompt)
      // piece.bodyText is the angle, but piece represents an already processed decision
      const systemPrompt = piece.researchPrompt || `You are a rapid research assistant. Gather key facts, statistics, and context for the following content piece. Be concise and data-dense. Cite sources where possible.

PLATFORM: ${piece.platform}
BRAND: ${piece.brand.name}

Provide structured research covering: key facts, critical numbers, stakeholder positions, and context.`;

      // Use the angle (stored in bodyText initially during strategist setup) as the user message
      const userMessage = `Research the following content briefly:\n\n${piece.bodyText.slice(0, 2000)}`;

      const result = await routeToModel("research", systemPrompt, userMessage);
      return result.raw;
    });

    // If researchText is null, we need to build the dossier first
    let finalResearch = researchText;
    if (finalResearch === null && piece.treeId) {
      // Invoke the dossier builder and wait for it to complete
      await step.invoke("build-dossier", {
        function: "fact-dossier-sync",
        data: { treeId: piece.treeId },
      });

      // Now fetch the freshly built dossier
      finalResearch = await step.run("fetch-built-dossier", async () => {
        const dossier = await prisma.factDossier.findUnique({
          where: { treeId: piece.treeId! },
        });

        if (!dossier) {
          throw new Error(
            `Dossier build completed but no dossier found for tree ${piece.treeId}`
          );
        }

        const structured =
          typeof dossier.structuredData === "string"
            ? dossier.structuredData
            : JSON.stringify(dossier.structuredData, null, 2);
        const sources = (dossier.sources ?? []).join("\n");
        return `## FactDossier\n${structured}\n\n## Sources\n${sources}\n\n${dossier.rawResearch ?? ""}`;
      });
    }

    // ── Step 3: Generate content ───────────────────────────────────────────

    const contentResult = await step.run("generate-content", async () => {
      // Parse voice rules from the brand
      const voiceRules = Array.isArray(piece.brand.voiceRules)
        ? (piece.brand.voiceRules as string[]).join("; ")
        : JSON.stringify(piece.brand.voiceRules);

      const params: ContentEngineParams = {
        narrativeAngle: piece.bodyText.slice(0, 500), // Use existing body as the angle seed
        trendHeadline: piece.bodyText.slice(0, 150),
        platform: piece.platform.toLowerCase(),
        format: piece.platform.toLowerCase(), // Derive format from platform
        brandName: piece.brand.name,
        brandTone: piece.brand.tone,
        voiceRules,
        language: piece.brand.language,
        researchResults: finalResearch ?? "",
      };

      const result = await runContentEngine(params);

      // Update the content piece with generated body and status
      await prisma.contentPiece.update({
        where: { id: contentPieceId },
        data: {
          bodyText: result.raw,
          status: "DRAFTED",
        },
      });

      return {
        platform: result.platform,
        content: result.content,
        postingPlan: result.postingPlan,
        raw: result.raw,
      };
    });

    // ── Step 4: Generate visual prompts ────────────────────────────────────

    await step.run("generate-visuals", async () => {
      // Extract emotion and color mood from content result or use defaults
      const postingPlan = contentResult.postingPlan as Record<string, unknown>;
      const thumbnail = (postingPlan?.thumbnail ?? {}) as Record<string, unknown>;

      const visualParams: VisualPromptParams = {
        narrativeAngle: piece.bodyText.slice(0, 500),
        platform: piece.platform.toLowerCase(),
        brandName: piece.brand.name,
        emotion: (thumbnail?.emotion as string) ?? "curiosity",
        colorMood: (thumbnail?.color_mood as string) ?? "bold, high contrast",
      };

      const visualResult = await generateVisualPrompts(visualParams);

      await prisma.contentPiece.update({
        where: { id: contentPieceId },
        data: {
          visualPrompts: JSON.stringify({
            thumbnailPrompt: visualResult.thumbnailPrompt,
            socialCardPrompt: visualResult.socialCardPrompt,
            storyPrompt: visualResult.storyPrompt ?? null,
          }),
        },
      });

      return { model: visualResult.model };
    });

    // ── Step 5: Package (posting plan) ─────────────────────────────────────

    await step.run("package", async () => {
      // Extract key data points from the generated content for packaging
      const contentRaw = contentResult.raw;
      const keyDataPoints = contentRaw.slice(0, 1500);

      const packagingParams: PackagingEngineParams = {
        narrativeAngle: piece.bodyText.slice(0, 500),
        platform: piece.platform.toLowerCase(),
        brandName: piece.brand.name,
        keyDataPoints,
      };

      const packagingResult = await runPackagingEngine(packagingParams);

      await prisma.contentPiece.update({
        where: { id: contentPieceId },
        data: {
          postingPlan: {
            titles: packagingResult.titles,
            thumbnail: packagingResult.thumbnail,
            description: packagingResult.description,
            tags: packagingResult.tags,
            posting_time: packagingResult.posting_time,
            repurpose: packagingResult.repurpose,
          },
        },
      });

      return { model: packagingResult.model };
    });

    // ── Step 6: Mark ready for workspace approval ──────────────────────────

    await step.run("mark-ready", async () => {
      await prisma.contentPiece.update({
        where: { id: contentPieceId },
        data: { status: "DRAFTED" },
      });
    });

    return { contentPieceId, status: "pipeline-complete" };
  }
);
