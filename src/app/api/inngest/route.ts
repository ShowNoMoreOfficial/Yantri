import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  narrativeResearch,
  narrativeGenerate,
  factDossierSync,
  gapAnalysisOnIngest,
} from "@/lib/inngest/functions";
import { contentPipeline } from "@/lib/inngest/pipeline";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    narrativeResearch,
    narrativeGenerate,
    factDossierSync,
    contentPipeline,
    gapAnalysisOnIngest,
  ],
});
