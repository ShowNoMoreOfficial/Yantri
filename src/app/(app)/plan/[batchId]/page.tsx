"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import StatusBadge from "@/components/StatusBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ContentReview from "./_components/ContentReview";

interface Narrative {
  id: string;
  angle: string;
  whyThisAngle: string;
  informationGap: string;
  priority: number;
  platform: string;
  secondaryPlatform: string | null;
  format: string;
  urgency: string;
  status: string;
  researchPrompt: string | null;
  researchResults: string | null;
  enginePrompt: string | null;
  packageData: string | null;
  finalContent: string | null;
  brand: { id: string; name: string };
  trend: { headline: string; score: number };
}

interface Trend {
  id: string;
  rank: number;
  score: number;
  headline: string;
  reason: string;
  status: string;
  skipReason: string | null;
  narratives: Narrative[];
}

interface Batch {
  id: string;
  importedAt: string;
  trends: Trend[];
}

// Platform display helpers
function getPlatformLabel(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes("twitter") || p === "x_thread") return "Twitter Thread";
  if (p === "x_single") return "Twitter Post";
  if (p.includes("youtube")) return "YouTube Longform";
  if (p.includes("blog")) return "Blog Article";
  if (p === "meta_reel") return "Meta Reel";
  if (p === "meta_carousel") return "Meta Carousel";
  if (p === "meta_post") return "Meta Post";
  if (p.includes("linkedin")) return "LinkedIn Post";
  return platform.replace(/_/g, " ");
}

function getAgentName(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes("twitter") || p.includes("x_")) return "Twitter Agent";
  if (p.includes("youtube")) return "YouTube Agent";
  if (p.includes("blog")) return "Blog Agent";
  if (p === "meta_reel") return "Meta Reel Agent";
  if (p === "meta_carousel") return "Meta Carousel Agent";
  if (p === "meta_post") return "Meta Post Agent";
  if (p.includes("meta")) return "Meta Agent";
  if (p.includes("linkedin")) return "LinkedIn Agent";
  return "Content Agent";
}

function getDeliverableDescription(platform: string): string[] {
  const p = platform.toLowerCase();
  if (p.includes("twitter"))
    return ["Complete thread with hook, data tweets, and CTA", "Optimal posting time and strategy", "Hashtag recommendations"];
  if (p.includes("youtube"))
    return ["Full video script with production cues", "Three title options with thumbnail brief", "SEO description, tags, and posting time"];
  if (p.includes("blog"))
    return ["Complete article with headings and SEO", "Meta description and keyphrases", "Publishing schedule"];
  if (p === "meta_reel")
    return ["Reel script with text overlays and timing", "AI voiceover narration", "Cover thumbnail, caption, and posting time"];
  if (p === "meta_carousel")
    return ["8-12 slide carousel with visual prompts", "Cover thumbnail for high CTR", "SEO caption, hashtags, and posting time"];
  if (p === "meta_post")
    return ["Single image post with visual prompt", "Caption and hashtag strategy", "Posting time and engagement plan"];
  if (p.includes("meta"))
    return ["Platform-specific Meta content", "Caption and hashtag strategy", "Story tease and posting time"];
  if (p.includes("linkedin"))
    return ["Complete professional post", "Hashtag strategy and posting time", "Engagement playbook"];
  return ["Platform-specific content", "Posting plan"];
}

export default function PlanPage() {
  const params = useParams();
  const batchId = params.batchId as string;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [scanning, setScanning] = useState(false);
  const [activeNarrative, setActiveNarrative] = useState<string | null>(null);
  const [researchText, setResearchText] = useState("");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [researchProgress, setResearchProgress] = useState<string[]>([]);
  const [researching, setResearching] = useState(false);
  const [researchStartTime, setResearchStartTime] = useState<number | null>(null);
  const [researchElapsed, setResearchElapsed] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editJson, setEditJson] = useState("");

  const active = narratives.find((n) => n.id === activeNarrative);

  const loadBatch = useCallback(async () => {
    const res = await fetch(`/api/trends/batch/${batchId}`);
    const data = await res.json();
    setBatch(data);
    const allNarratives = data.trends?.flatMap((t: Trend) =>
      t.narratives.map((n: Narrative) => ({
        ...n,
        trend: n.trend || { headline: t.headline, score: t.score },
      }))
    ) || [];
    setNarratives(allNarratives);
    if (allNarratives.length > 0 && !activeNarrative) {
      setActiveNarrative(allNarratives[0].id);
    }
  }, [batchId, activeNarrative]);

  useEffect(() => { loadBatch(); }, [loadBatch]);

  // Elapsed timer for research
  useEffect(() => {
    if (!researchStartTime) { setResearchElapsed(0); return; }
    const timer = setInterval(() => {
      setResearchElapsed(Math.floor((Date.now() - researchStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [researchStartTime]);

  // Auto-poll when researching but SSE stream is not active
  useEffect(() => {
    if (active?.status !== "researching" || researching || active?.researchResults) return;
    const poller = setInterval(() => loadBatch(), 5000);
    return () => clearInterval(poller);
  }, [active?.status, active?.researchResults, researching, loadBatch]);

  // ---------- Actions ----------

  const runScan = async () => {
    setScanning(true);
    setError("");
    try {
      const res = await fetch("/api/yantri/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Scan failed");
        toast.error("Scan failed");
      } else {
        toast.success("Editorial scan complete");
      }
      await loadBatch();
    } catch (err) {
      setError("Scan failed. Make sure GEMINI_API_KEY is set in .env");
      toast.error("Scan failed");
      console.error(err);
    }
    setScanning(false);
  };

  const generateResearch = async (narrativeId: string) => {
    setResearching(true);
    setResearchStartTime(Date.now());
    setResearchElapsed(0);
    setResearchProgress(["Generating research prompt..."]);
    try {
      const res = await fetch("/api/yantri/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrativeId }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setResearchProgress((prev) => [...prev, "Error: No response stream"]);
        setResearching(false);
        return;
      }
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.event === "prompt_ready") {
              setResearchProgress((prev) => [...prev, "Research prompt ready. Searching web sources..."]);
            } else if (data.event === "status") {
              setResearchProgress((prev) => [...prev, data.message]);
            } else if (data.event === "complete") {
              setResearchProgress((prev) => [...prev, "Research complete!"]);
            } else if (data.event === "error") {
              setResearchProgress((prev) => [...prev, `Error: ${data.message}`]);
            } else if (data.event === "done") {
              if (data.success) {
                setResearchProgress((prev) => [...prev, "Research saved. Ready to generate content."]);
              } else {
                setResearchProgress((prev) => [...prev, `Research failed: ${data.error || "Unknown"} — paste research manually below.`]);
              }
            }
          } catch { /* skip non-JSON */ }
        }
      }
    } catch (err) {
      setResearchProgress((prev) => [...prev, `Failed: ${err}`]);
    }
    await loadBatch();
    setResearching(false);
    setResearchStartTime(null);
  };

  const submitResearch = async (narrativeId: string) => {
    await fetch(`/api/narratives/${narrativeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ researchResults: researchText }),
    });
    setResearchText("");
    toast.success("Research submitted");
    await loadBatch();
  };

  const generateContent = async (narrativeId: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/yantri/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrativeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Content generation failed");
      } else {
        toast.success("Content generated successfully");
      }
      await loadBatch();
    } catch (err) {
      toast.error("Content generation failed");
      console.error(err);
    }
    setGenerating(false);
  };

  const approveAndFinalize = async (narrativeId: string) => {
    setLoading({ ...loading, approve: true });
    try {
      const deliverable = editing && editJson
        ? JSON.parse(editJson)
        : JSON.parse(active!.packageData!);

      await fetch(`/api/narratives/${narrativeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "published",
          finalContent: JSON.stringify(deliverable),
          packageData: JSON.stringify(deliverable),
        }),
      });
      toast.success("Content approved and finalized");
      setEditing(false);
      setEditJson("");
      await loadBatch();
    } catch {
      toast.error("Failed to save. Check JSON format.");
    }
    setLoading({ ...loading, approve: false });
  };

  const updateStatus = async (narrativeId: string, status: string) => {
    await fetch(`/api/narratives/${narrativeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (status === "killed") toast.error("Narrative killed");
    else toast.success(`Narrative ${status}`);
    await loadBatch();
  };

  // ---------- Render ----------

  if (!batch) return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" label="Loading batch..." /></div>;

  const skippedTrends = batch.trends.filter((t) => t.status === "skipped");

  // Parse deliverable from active narrative's packageData
  let deliverable: Record<string, unknown> | null = null;
  if (active?.packageData) {
    try { deliverable = JSON.parse(active.packageData); } catch { /* ignore */ }
  }

  // Check if this is a new-format deliverable (has platform + content + postingPlan)
  const isNewDeliverable = deliverable && "platform" in deliverable && "content" in deliverable && "postingPlan" in deliverable;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Production Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Batch imported {new Date(batch.importedAt).toLocaleString()} — {batch.trends.length} trends
          </p>
        </div>
        <div className="flex gap-2">
          {narratives.length === 0 && (
            <Button onClick={runScan} disabled={scanning} className="px-6 py-2.5 rounded-lg">
              {scanning ? <><LoadingSpinner size="sm" /> Running Yantri...</> : "Run Yantri"}
            </Button>
          )}
          {narratives.length > 0 && (
            <Button
              variant="outline"
              onClick={async () => {
                if (!confirm("Reset all narratives and re-run Yantri?")) return;
                await fetch(`/api/trends/batch/${batchId}`, { method: "PUT" });
                setNarratives([]);
                setActiveNarrative(null);
                await loadBatch();
              }}
              className="bg-yellow-500/10 text-yellow-300 border-yellow-500/20 hover:bg-yellow-500/20 rounded-lg"
            >
              Re-run Yantri
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      {/* ==================== PRIORITIES LIST ==================== */}
      {narratives.length > 0 && (
        <div className="space-y-4 mb-8 text-foreground">
          <h2 className="text-xl font-bold">Priorities</h2>
          <div className="grid gap-4">
            {narratives
              .sort((a, b) => a.priority - b.priority)
              .map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setActiveNarrative(n.id); setEditing(false); setEditJson(""); }}
                  className={`text-left w-full rounded-2xl border p-5 transition-all duration-300 ${
                    activeNarrative === n.id
                      ? "border-indigo-500 bg-card shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500"
                      : "border-border bg-card/50 hover:border-zinc-700 hover:bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black shadow-sm ${
                          n.priority === 1
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : n.priority === 2
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                        }`}>
                          P{n.priority}
                        </span>
                        <span className="font-bold text-foreground italic tracking-tight">{n.angle}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{n.whyThisAngle}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-none rounded-md text-[10px] font-bold uppercase tracking-wider">
                          {n.brand.name}
                        </Badge>
                        <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-none rounded-md text-[10px] font-bold uppercase tracking-wider">
                          {getPlatformLabel(n.platform)}
                        </Badge>
                        <Badge variant="secondary" className="bg-rose-500/10 text-rose-400 border-none rounded-md text-[10px] font-bold uppercase tracking-wider">
                          {n.urgency}
                        </Badge>
                        <StatusBadge status={n.status} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Score</div>
                      <div className="text-xl font-black text-zinc-500">{n.trend?.score ?? "—"}</div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ==================== SKIPPED TRENDS ==================== */}
      {skippedTrends.length > 0 && (
        <details className="mb-8">
          <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-zinc-300">
            Skipped Trends ({skippedTrends.length})
          </summary>
          <div className="mt-2 space-y-2">
            {skippedTrends.map((t) => (
              <div key={t.id} className="bg-zinc-900 rounded-lg p-3 text-sm">
                <span className="font-medium text-foreground">{t.headline}</span>
                {t.skipReason && <span className="text-muted-foreground"> — {t.skipReason}</span>}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ==================== ACTIVE NARRATIVE WORKFLOW ==================== */}
      {active && (
        <div className="space-y-6">
          <div className="border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Workflow: {active.angle}
            </h2>

            {/* ---- STAGE: PLANNED — Approve to start research ---- */}
            {active.status === "planned" && !researching && (
              <div className="flex gap-2 mb-6">
                <Button onClick={() => generateResearch(active.id)} disabled={researching} className="rounded-lg">
                  Approve & Start Research
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateStatus(active.id, "killed")}
                  className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 rounded-lg"
                >
                  Kill
                </Button>
              </div>
            )}

            {/* ---- STAGE: RESEARCHING — Progress panel ---- */}
            {(researching || active.status === "researching") && !active.researchResults && (
              <div className="glass-card rounded-2xl p-8 mb-8 border-indigo-500/20 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                      <LoadingSpinner size="md" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground tracking-tight">Research Pipeline Active</h3>
                      <p className="text-sm text-indigo-400 font-medium">Searching web & synthesizing research...</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-black text-indigo-200 tabular-nums">
                      {researchStartTime
                        ? `${Math.floor(researchElapsed / 60)}:${String(researchElapsed % 60).padStart(2, "0")}`
                        : "0:00"}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Elapsed</span>
                  </div>
                </div>
                <div className="w-full bg-indigo-500/10 rounded-full h-2 mb-6 overflow-hidden border border-indigo-500/20">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_12px_rgba(79,70,229,0.4)]"
                    style={{ width: `${Math.min((researchElapsed / 45) * 100, 95)}%` }}
                  />
                </div>
                {researchProgress.length > 0 && (
                  <div className="bg-zinc-950 rounded-xl p-4 font-mono text-[11px] leading-relaxed shadow-inner">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-700">
                      <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                      <span className="text-zinc-500 uppercase font-black text-[9px] tracking-widest">Live Stream</span>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-auto">
                      {researchProgress.map((msg, i) => (
                        <div key={i} className={`flex items-start gap-2 ${i === researchProgress.length - 1 ? "text-indigo-400" : "text-zinc-400"}`}>
                          <span className="text-indigo-500 opacity-50">{">"}</span>
                          <span>{msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!researching && (
                  <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-zinc-800/50 border border-indigo-500/20 rounded-lg text-indigo-400 text-[10px] font-bold">
                    <LoadingSpinner size="sm" />
                    Background monitor active (polling every 5s)
                  </div>
                )}
              </div>
            )}

            {/* ---- Information Gap (always shown) ---- */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
              <div className="text-xs font-medium text-yellow-300 mb-1">Information Gap</div>
              <p className="text-sm text-yellow-300">{active.informationGap}</p>
            </div>

            {/* ---- Research Prompt (collapsible reference) ---- */}
            {active.researchPrompt && (
              <Card className="rounded-xl border-border p-6 mb-4">
                <details>
                  <summary className="flex items-center justify-between cursor-pointer">
                    <h3 className="font-semibold text-sm text-foreground">Research Prompt (reference)</h3>
                    <CopyButton text={active.researchPrompt} />
                  </summary>
                  <pre className="text-xs bg-zinc-900 rounded-lg p-4 whitespace-pre-wrap max-h-48 overflow-auto mt-3 text-zinc-300">
                    {active.researchPrompt}
                  </pre>
                </details>
              </Card>
            )}

            {/* ---- Research Results (collapsible) ---- */}
            {active.researchResults && (
              <Card className="rounded-xl border-emerald-500/20 p-6 mb-4">
                <details>
                  <summary className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      <h3 className="font-semibold text-sm text-foreground">Research Results</h3>
                    </div>
                    <CopyButton text={active.researchResults} />
                  </summary>
                  <pre className="text-xs bg-zinc-900 rounded-lg p-4 whitespace-pre-wrap max-h-64 overflow-auto mt-3 text-zinc-300">
                    {active.researchResults}
                  </pre>
                </details>
              </Card>
            )}

            {/* ---- Manual research paste fallback ---- */}
            {active.researchPrompt && !active.researchResults && !researching && active.status !== "researching" && (
              <Card className="rounded-xl border-border p-6 mb-4">
                <h3 className="font-semibold text-sm text-foreground mb-2">Manual Research Paste (fallback)</h3>
                <p className="text-xs text-muted-foreground mb-3">If automated research failed, paste your own research here.</p>
                <Textarea
                  value={researchText}
                  onChange={(e) => setResearchText(e.target.value)}
                  rows={6}
                  placeholder="Paste research dossier here..."
                />
                <Button
                  onClick={() => submitResearch(active.id)}
                  disabled={!researchText.trim()}
                  className="mt-2 rounded-lg"
                >
                  Submit Manual Research
                </Button>
              </Card>
            )}

            {/* ==================== NEW: GENERATE CONTENT ==================== */}

            {/* ---- Pre-generation card: Research done, no content yet ---- */}
            {active.researchResults && !active.packageData && !generating && (
              <Card className="rounded-2xl border-indigo-500/20 p-8 mb-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Ready to Generate Content</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-none text-xs font-bold">
                        {getPlatformLabel(active.platform)}
                      </Badge>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-none text-xs">
                        {active.format.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-none text-xs">
                        {active.brand.name}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      The <span className="text-indigo-400 font-medium">{getAgentName(active.platform)}</span> will use the research dossier to generate:
                    </p>
                    <ul className="space-y-1">
                      {getDeliverableDescription(active.platform).map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => generateContent(active.id)} className="px-8 py-3 h-auto rounded-xl font-bold">
                    Generate Content
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateStatus(active.id, "killed")}
                    className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 rounded-xl"
                  >
                    Kill
                  </Button>
                </div>
              </Card>
            )}

            {/* ---- Generating state ---- */}
            {generating && (
              <Card className="rounded-2xl border-indigo-500/20 p-8 mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-xl">
                    <LoadingSpinner size="md" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Running {getAgentName(active.platform)}...</h3>
                    <p className="text-sm text-muted-foreground">Generating content and posting plan. This may take 15-30 seconds.</p>
                  </div>
                </div>
              </Card>
            )}

            {/* ---- Content Review (new-format deliverable) ---- */}
            {isNewDeliverable && active.status === "producing" && !generating && (
              <div className="space-y-6 mb-4">
                <Card className="rounded-2xl border-border p-6">
                  {!editing ? (
                    <ContentReview deliverable={deliverable} />
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Edit Deliverable (JSON)</h4>
                      </div>
                      <Textarea
                        value={editJson}
                        onChange={(e) => setEditJson(e.target.value)}
                        rows={20}
                        className="font-mono text-xs"
                        placeholder="Edit the JSON deliverable..."
                      />
                    </div>
                  )}
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => approveAndFinalize(active.id)}
                    disabled={loading.approve}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl px-8 py-3 h-auto font-bold"
                  >
                    {loading.approve ? <><LoadingSpinner size="sm" /> Approving...</> : "Approve & Finalize"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { generateContent(active.id); setEditing(false); }}
                    disabled={generating}
                    className="bg-yellow-500/10 text-yellow-300 border-yellow-500/20 hover:bg-yellow-500/20 rounded-xl"
                  >
                    Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!editing) {
                        setEditJson(JSON.stringify(deliverable, null, 2));
                        setEditing(true);
                      } else {
                        setEditing(false);
                      }
                    }}
                    className="rounded-xl"
                  >
                    {editing ? "Cancel Edit" : "Edit"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateStatus(active.id, "killed")}
                    className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 rounded-xl"
                  >
                    Kill
                  </Button>
                </div>
              </div>
            )}

            {/* ---- Published state ---- */}
            {active.status === "published" && active.packageData && (
              <div className="space-y-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <h3 className="text-lg font-bold text-emerald-400">Published</h3>
                </div>
                {isNewDeliverable ? (
                  <Card className="rounded-2xl border-emerald-500/20 p-6">
                    <ContentReview deliverable={deliverable} />
                  </Card>
                ) : (
                  <Card className="rounded-xl border-border p-6">
                    <pre className="text-xs bg-zinc-900 rounded-lg p-4 whitespace-pre-wrap max-h-64 overflow-auto text-zinc-300">
                      {active.finalContent || active.packageData}
                    </pre>
                  </Card>
                )}
              </div>
            )}

            {/* ---- Legacy: Old-format packageData (backward compat) ---- */}
            {active.packageData && !isNewDeliverable && active.status !== "published" && (() => {
              let pkg: Record<string, unknown> | null = null;
              try { pkg = JSON.parse(active.packageData!); } catch { /* ignore */ }
              if (!pkg) return null;
              return (
                <Card className="rounded-xl border-border p-6 mb-4">
                  <h3 className="font-semibold text-sm text-foreground mb-4">Content Package (legacy format)</h3>
                  <pre className="text-xs bg-zinc-900 rounded-lg p-4 whitespace-pre-wrap max-h-64 overflow-auto text-zinc-300">
                    {JSON.stringify(pkg, null, 2)}
                  </pre>
                  <div className="flex gap-2 mt-4">
                    {active.status !== "published" && (
                      <Button
                        onClick={() => updateStatus(active.id, "published")}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg"
                      >
                        Mark Published
                      </Button>
                    )}
                    {active.status !== "killed" && (
                      <Button
                        variant="outline"
                        onClick={() => updateStatus(active.id, "killed")}
                        className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 rounded-lg"
                      >
                        Kill
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* ---- Internal prompt reference (hidden collapsible) ---- */}
            {active.enginePrompt && (
              <details className="mb-4">
                <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400">
                  Internal prompt (debug reference)
                </summary>
                <pre className="text-[10px] bg-zinc-950 rounded-lg p-3 whitespace-pre-wrap max-h-32 overflow-auto text-zinc-600 mt-2">
                  {active.enginePrompt.slice(0, 500)}...
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      {/* ==================== NO NARRATIVES YET ==================== */}
      {narratives.length === 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Imported Trends</h2>
          {batch.trends.map((t) => (
            <Card key={t.id} className="rounded-xl border-border p-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-zinc-500">#{t.rank}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-none rounded text-xs font-medium">
                      {t.score}
                    </Badge>
                    <span className="font-medium text-sm text-foreground">{t.headline}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.reason}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
