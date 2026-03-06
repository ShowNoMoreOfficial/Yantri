/**
 * Deliverable Pipelines — Platform-Specific Agentic Workflows
 *
 * Three specialized pipelines for the v4 Deliverable model:
 * 1. Viral Micro-Content Pipeline (X & LinkedIn)
 * 2. Visual Carousel Pipeline (Meta/Instagram)
 * 3. Cinematic Long-Form Pipeline (YouTube)
 *
 * Each pipeline:
 *   PLANNED -> RESEARCHING -> [platform-specific stages] -> REVIEW
 */

import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { routeToModel } from "@/lib/modelRouter";
import { runViralMicroEngine } from "@/lib/engines/viralMicro";
import { runCarouselEngine } from "@/lib/engines/carousel";
import { runCinematicEngine } from "@/lib/engines/cinematic";
import { generateVisualPrompts } from "@/lib/engines/nanoBanana";
import { generateEmbedding, findSimilarTree } from "@/lib/embeddings";
import { generateVoiceover } from "@/lib/elevenlabs";

// ─── Event Types ────────────────────────────────────────────────────────────

type DeliverableEvent = {
  data: { deliverableId: string };
};

// ─── Shared: Research Step ──────────────────────────────────────────────────

async function resolveResearch(
  deliverableId: string,
  treeId: string | null,
  bodyText: string,
  brandName: string,
  platform: string,
  researchPrompt: string | null
): Promise<string> {
  if (treeId) {
    const dossier = await prisma.factDossier.findUnique({
      where: { treeId },
    });
    if (dossier) {
      const structured =
        typeof dossier.structuredData === "string"
          ? dossier.structuredData
          : JSON.stringify(dossier.structuredData, null, 2);
      const sources = (dossier.sources ?? []).join("\n");
      return `## FactDossier\n${structured}\n\n## Sources\n${sources}\n\n${dossier.rawResearch ?? ""}`;
    }
  }

  // Inline research fallback
  const systemPrompt =
    researchPrompt ||
    `You are a rapid research assistant for ${brandName}. Gather key facts, statistics, and context. Be concise and data-dense. Cite sources where possible.\n\nPLATFORM: ${platform}`;

  const result = await routeToModel(
    "research",
    systemPrompt,
    `Research the following:\n\n${bodyText.slice(0, 2000)}`
  );
  return result.raw;
}

// ─── Shared: Auto-cluster into NarrativeTree ────────────────────────────────

async function autoCluster(
  deliverableId: string,
  angleText: string,
  platform: string,
  brandId: string
): Promise<string | null> {
  const embedding = await generateEmbedding(angleText);
  const similarTree = await findSimilarTree(embedding, prisma);

  if (similarTree) {
    await prisma.narrativeNode.create({
      data: {
        treeId: similarTree.id,
        signalTitle: angleText.slice(0, 150),
        signalScore: 0,
        signalData: {
          source: "deliverable-pipeline",
          angle: angleText,
          platform,
          brandId,
        },
      },
    });

    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: { treeId: similarTree.id },
    });

    return similarTree.id;
  }

  const newTree = await prisma.narrativeTree.create({
    data: {
      rootTrend: angleText.slice(0, 200),
      summary: `Auto-clustered from deliverable pipeline: ${platform}`,
      embedding: JSON.stringify(embedding),
      nodes: {
        create: {
          signalTitle: angleText.slice(0, 150),
          signalScore: 0,
          signalData: {
            source: "deliverable-pipeline",
            angle: angleText,
            platform,
            brandId,
          },
        },
      },
    },
  });

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: { treeId: newTree.id },
  });

  return newTree.id;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. VIRAL MICRO-CONTENT PIPELINE (X & LinkedIn)
// ═══════════════════════════════════════════════════════════════════════════════

export const viralMicroPipeline = inngest.createFunction(
  {
    id: "viral-micro-pipeline",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { event: "yantri/deliverable.viral-micro" },
  async ({ event, step }) => {
    const { deliverableId } = event.data as DeliverableEvent["data"];

    // Step 1: Fetch deliverable
    const deliverable = await step.run("fetch-deliverable", async () => {
      return await prisma.deliverable.findUniqueOrThrow({
        where: { id: deliverableId },
        include: { brand: true },
      });
    });

    // Step 2: Auto-cluster into NarrativeTree
    const treeId = await step.run("auto-cluster", async () => {
      if (deliverable.treeId) return deliverable.treeId;
      return await autoCluster(
        deliverableId,
        deliverable.copyMarkdown?.slice(0, 1000) ?? "",
        deliverable.platform,
        deliverable.brandId
      );
    });

    // Step 3: Research
    await step.run("set-researching", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { status: "RESEARCHING" },
      });
    });

    const research = await step.run("research", async () => {
      return await resolveResearch(
        deliverableId,
        treeId,
        deliverable.copyMarkdown ?? "",
        deliverable.brand.name,
        deliverable.platform,
        deliverable.researchPrompt
      );
    });

    // Step 4: Generate viral micro-content
    await step.run("set-scripting", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { status: "SCRIPTING" },
      });
    });

    const viralResult = await step.run("generate-viral-content", async () => {
      const voiceRules = Array.isArray(deliverable.brand.voiceRules)
        ? (deliverable.brand.voiceRules as string[]).join("; ")
        : JSON.stringify(deliverable.brand.voiceRules);

      const platformTarget =
        deliverable.platform === "LINKEDIN"
          ? "linkedin"
          : deliverable.platform === "X_SINGLE" || deliverable.platform === "X_THREAD"
          ? "x"
          : ("both" as const);

      return await runViralMicroEngine({
        narrativeAngle: deliverable.copyMarkdown?.slice(0, 500) ?? "",
        brandName: deliverable.brand.name,
        brandTone: deliverable.brand.tone,
        voiceRules,
        language: deliverable.brand.language,
        researchResults: research,
        trendHeadline: deliverable.copyMarkdown?.slice(0, 150) ?? "",
        targetPlatform: platformTarget,
      });
    });

    // Step 5: Generate visual asset prompt
    await step.run("set-generating-assets", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { status: "GENERATING_ASSETS" },
      });
    });

    await step.run("generate-visual", async () => {
      const visualResult = await generateVisualPrompts({
        narrativeAngle: deliverable.copyMarkdown?.slice(0, 500) ?? "",
        platform: deliverable.platform.toLowerCase(),
        brandName: deliverable.brand.name,
        emotion: "curiosity",
        colorMood: "bold, high contrast",
        generatedContent: viralResult.primaryPost,
        researchData: research,
      });

      // Create asset records for the visual prompts
      if (viralResult.imagePrompt) {
        await prisma.asset.create({
          data: {
            deliverableId,
            type: "IMAGE",
            url: "", // Will be populated when image is generated
            promptUsed: viralResult.imagePrompt,
            metadata: {
              thumbnailPrompt: visualResult.thumbnailPrompt,
              socialCardPrompt: visualResult.socialCardPrompt,
            },
          },
        });
      }

      return { model: visualResult.model };
    });

    // Step 6: Save content and mark for review
    await step.run("save-and-finalize", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: {
          copyMarkdown: viralResult.primaryPost,
          postingPlan: viralResult.postingPlan as object,
          status: "REVIEW",
        },
      });
    });

    return { deliverableId, status: "viral-micro-complete", platform: viralResult.platform };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. VISUAL CAROUSEL PIPELINE (Meta / Instagram)
// ═══════════════════════════════════════════════════════════════════════════════

export const carouselPipeline = inngest.createFunction(
  {
    id: "carousel-pipeline",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: "yantri/deliverable.carousel" },
  async ({ event, step }) => {
    const { deliverableId } = event.data as DeliverableEvent["data"];

    // Step 1: Fetch deliverable
    const deliverable = await step.run("fetch-deliverable", async () => {
      return await prisma.deliverable.findUniqueOrThrow({
        where: { id: deliverableId },
        include: { brand: true },
      });
    });

    // Step 2: Auto-cluster
    const treeId = await step.run("auto-cluster", async () => {
      if (deliverable.treeId) return deliverable.treeId;
      return await autoCluster(
        deliverableId,
        deliverable.copyMarkdown?.slice(0, 1000) ?? "",
        deliverable.platform,
        deliverable.brandId
      );
    });

    // Step 3: Research
    await step.run("set-researching", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { status: "RESEARCHING" },
      });
    });

    const research = await step.run("research", async () => {
      return await resolveResearch(
        deliverableId,
        treeId,
        deliverable.copyMarkdown ?? "",
        deliverable.brand.name,
        deliverable.platform,
        deliverable.researchPrompt
      );
    });

    // Step 4: Run carousel strategist
    await step.run("set-scripting", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { status: "SCRIPTING" },
      });
    });

    const carouselResult = await step.run("generate-carousel", async () => {
      const voiceRules = Array.isArray(deliverable.brand.voiceRules)
        ? (deliverable.brand.voiceRules as string[]).join("; ")
        : JSON.stringify(deliverable.brand.voiceRules);

      return await runCarouselEngine({
        narrativeAngle: deliverable.copyMarkdown?.slice(0, 500) ?? "",
        brandName: deliverable.brand.name,
        brandTone: deliverable.brand.tone,
        voiceRules,
        language: deliverable.brand.language,
        researchResults: research,
        trendHeadline: deliverable.copyMarkdown?.slice(0, 150) ?? "",
      });
    });

    // Step 5: Generate assets for each slide
    await step.run("set-generating-assets", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { status: "GENERATING_ASSETS" },
      });
    });

    await step.run("create-slide-assets", async () => {
      for (const slide of carouselResult.slides) {
        await prisma.asset.create({
          data: {
            deliverableId,
            type: "CAROUSEL_SLIDE",
            url: "", // Populated when image is generated
            promptUsed: slide.visualPrompt,
            slideIndex: slide.position,
            metadata: {
              headline: slide.headline,
              bodyText: slide.bodyText,
              textOverlay: slide.textOverlay,
              role: slide.role,
              colorHex: slide.colorHex,
            },
          },
        });
      }
    });

    // Step 6: Save carousel data and mark for review
    await step.run("save-and-finalize", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: {
          copyMarkdown: carouselResult.caption,
          carouselData: {
            slides: carouselResult.slides,
            narrativeArc: carouselResult.narrativeArc,
            slideCount: carouselResult.slideCount,
            hashtags: carouselResult.hashtags,
          },
          status: "REVIEW",
        },
      });
    });

    return { deliverableId, status: "carousel-complete", slideCount: carouselResult.slideCount };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CINEMATIC LONG-FORM PIPELINE (YouTube)
// ═══════════════════════════════════════════════════════════════════════════════

export const cinematicPipeline = inngest.createFunction(
  {
    id: "cinematic-pipeline",
    retries: 2,
    concurrency: { limit: 2 },
  },
  { event: "yantri/deliverable.cinematic" },
  async ({ event, step }) => {
    const { deliverableId } = event.data as DeliverableEvent["data"];

    // Step 1: Fetch deliverable
    const deliverable = await step.run("fetch-deliverable", async () => {
      return await prisma.deliverable.findUniqueOrThrow({
        where: { id: deliverableId },
        include: { brand: true },
      });
    });

    // Step 2: Auto-cluster
    const treeId = await step.run("auto-cluster", async () => {
      if (deliverable.treeId) return deliverable.treeId;
      return await autoCluster(
        deliverableId,
        deliverable.copyMarkdown?.slice(0, 1000) ?? "",
        deliverable.platform,
        deliverable.brandId
      );
    });

    // Step 3: Research (deep — YouTube requires comprehensive research)
    await step.run("set-researching", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { status: "RESEARCHING" },
      });
    });

    const research = await step.run("research", async () => {
      return await resolveResearch(
        deliverableId,
        treeId,
        deliverable.copyMarkdown ?? "",
        deliverable.brand.name,
        deliverable.platform,
        deliverable.researchPrompt
      );
    });

    // If no dossier existed and we need deeper research, build one
    if (treeId) {
      const hasDossier = await step.run("check-dossier", async () => {
        const d = await prisma.factDossier.findUnique({ where: { treeId: treeId! } });
        return !!d;
      });

      if (!hasDossier) {
        await step.invoke("build-dossier", {
          function: "fact-dossier-sync",
          data: { treeId },
        });
      }
    }

    // Step 4: Scriptwriting + Storyboarding
    await step.run("set-scripting", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { status: "SCRIPTING" },
      });
    });

    const cinematicResult = await step.run("generate-cinematic", async () => {
      const voiceRules = Array.isArray(deliverable.brand.voiceRules)
        ? (deliverable.brand.voiceRules as string[]).join("; ")
        : JSON.stringify(deliverable.brand.voiceRules);

      return await runCinematicEngine({
        narrativeAngle: deliverable.copyMarkdown?.slice(0, 500) ?? "",
        brandName: deliverable.brand.name,
        brandTone: deliverable.brand.tone,
        voiceRules,
        language: deliverable.brand.language,
        researchResults: research,
        trendHeadline: deliverable.copyMarkdown?.slice(0, 150) ?? "",
        targetRuntime: "10-15",
      });
    });

    // Step 5: Voiceover — generate narration audio from script
    await step.run("generate-voiceover", async () => {
      // Strip production cues like [GRAPHIC: ...] and [MUSIC: ...] from script
      const cleanScript = cinematicResult.script.fullScript
        .replace(/\[(?:GRAPHIC|MUSIC|SFX|CUT|TRANSITION|B-ROLL)[^\]]*\]/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      if (!cleanScript) return;

      const result = await generateVoiceover(cleanScript);

      await prisma.asset.create({
        data: {
          deliverableId,
          type: "AUDIO",
          url: "", // Populated when audio is uploaded to storage
          metadata: {
            voiceId: result.voiceId,
            modelId: result.modelId,
            sectionCount: cinematicResult.script.sections.length,
            runtimeEstimate: cinematicResult.script.runtimeEstimate,
            audioSizeBytes: result.audio.length,
          },
        },
      });
    });

    // Step 6: Storyboarding — create frame assets
    await step.run("set-storyboarding", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { status: "STORYBOARDING" },
      });
    });

    await step.run("create-storyboard-assets", async () => {
      // Create storyboard frame assets
      for (const frame of cinematicResult.storyboard) {
        await prisma.asset.create({
          data: {
            deliverableId,
            type: "IMAGE",
            url: "",
            promptUsed: frame.visualPrompt,
            slideIndex: frame.frameNumber,
            metadata: {
              shotType: frame.shotType,
              timestamp: frame.timestamp,
              duration: frame.duration,
              description: frame.description,
              transitionTo: frame.transitionTo,
            },
          },
        });
      }

      // Create B-roll asset records
      for (const broll of cinematicResult.brollAssets) {
        await prisma.asset.create({
          data: {
            deliverableId,
            type: "BROLL",
            url: "",
            promptUsed: broll.generationPrompt,
            metadata: {
              description: broll.description,
              duration: broll.duration,
              placement: broll.placementTimestamp,
              style: broll.style,
            },
          },
        });
      }
    });

    // Step 6: Generate thumbnail asset
    await step.run("set-generating-assets", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { status: "GENERATING_ASSETS" },
      });
    });

    await step.run("generate-thumbnail", async () => {
      const visualResult = await generateVisualPrompts({
        narrativeAngle: deliverable.copyMarkdown?.slice(0, 500) ?? "",
        platform: "youtube",
        brandName: deliverable.brand.name,
        emotion: "curiosity",
        colorMood: "dark editorial, high contrast",
        generatedContent: cinematicResult.script.fullScript.slice(0, 3000),
        researchData: research,
      });

      await prisma.asset.create({
        data: {
          deliverableId,
          type: "THUMBNAIL",
          url: "",
          promptUsed: visualResult.thumbnailPrompt,
          metadata: {
            socialCardPrompt: visualResult.socialCardPrompt,
            nanoBananaAngles: JSON.parse(JSON.stringify(visualResult.nanoBananaAngles)),
          },
        },
      });
    });

    // Step 7: Save script + storyboard and mark for review
    await step.run("save-and-finalize", async () => {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: {
          copyMarkdown: cinematicResult.script.fullScript,
          scriptData: {
            sections: cinematicResult.script.sections,
            runtimeEstimate: cinematicResult.script.runtimeEstimate,
            actStructure: cinematicResult.script.actStructure,
          },
          postingPlan: cinematicResult.postingPlan as object,
          status: "REVIEW",
        },
      });
    });

    return {
      deliverableId,
      status: "cinematic-complete",
      runtime: cinematicResult.script.runtimeEstimate,
      storyboardFrames: cinematicResult.storyboard.length,
      brollAssets: cinematicResult.brollAssets.length,
    };
  }
);
