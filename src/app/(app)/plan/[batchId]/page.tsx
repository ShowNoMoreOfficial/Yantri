"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import StatusBadge from "@/components/StatusBadge";

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

export default function PlanPage() {
  const params = useParams();
  const batchId = params.batchId as string;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [scanning, setScanning] = useState(false);
  const [activeNarrative, setActiveNarrative] = useState<string | null>(null);
  const [researchText, setResearchText] = useState("");
  const [finalContentText, setFinalContentText] = useState("");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [researchProgress, setResearchProgress] = useState<string[]>([]);
  const [researching, setResearching] = useState(false);
  const [researchStartTime, setResearchStartTime] = useState<number | null>(null);
  const [researchElapsed, setResearchElapsed] = useState(0);

  // Derive active narrative early so effects can reference its status
  const active = narratives.find((n) => n.id === activeNarrative);

  const loadBatch = useCallback(async () => {
    const res = await fetch(`/api/trends/batch/${batchId}`);
    const data = await res.json();
    setBatch(data);
    // Collect all narratives from trends, attaching parent trend data
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

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  // Elapsed timer — counts up while research is active in this session
  useEffect(() => {
    if (!researchStartTime) {
      setResearchElapsed(0);
      return;
    }
    const timer = setInterval(() => {
      setResearchElapsed(Math.floor((Date.now() - researchStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [researchStartTime]);

  // Auto-poll every 5s when DB shows "researching" but SSE stream is not active
  useEffect(() => {
    if (active?.status !== "researching" || researching || active?.researchResults) return;
    const poller = setInterval(() => loadBatch(), 5000);
    return () => clearInterval(poller);
  }, [active?.status, active?.researchResults, researching, loadBatch]);

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
        setError(data.error || "Scan failed. Check your GEMINI_API_KEY in .env");
      }
      await loadBatch();
    } catch (err) {
      setError("Scan failed. Make sure GEMINI_API_KEY is set in .env");
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
              setResearchProgress((prev) => [...prev, "Research prompt generated. Starting deep research via Gemini Interactions API..."]);
            } else if (data.event === "status") {
              setResearchProgress((prev) => [...prev, data.message]);
            } else if (data.event === "complete") {
              setResearchProgress((prev) => [...prev, "Deep research complete! Saving results..."]);
            } else if (data.event === "error") {
              const detail = data.traceback ? `\n${data.traceback}` : "";
              setResearchProgress((prev) => [...prev, `Error: ${data.message}${detail}`]);
            } else if (data.event === "done") {
              if (data.success) {
                setResearchProgress((prev) => [...prev, "Research saved to narrative. Ready for engine prompt generation."]);
              } else {
                setResearchProgress((prev) => [...prev, `Research failed: ${data.error || "Unknown error"} — you can paste research manually below.`]);
              }
            }
          } catch {
            // skip non-JSON
          }
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
    await loadBatch();
  };

  const generateEnginePrompt = async (narrativeId: string) => {
    setLoading({ ...loading, engine: true });
    await fetch("/api/yantri/route-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ narrativeId }),
    });
    await loadBatch();
    setLoading({ ...loading, engine: false });
  };

  const generatePackage = async (narrativeId: string) => {
    setLoading({ ...loading, package: true });
    await fetch("/api/yantri/package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ narrativeId }),
    });
    await loadBatch();
    setLoading({ ...loading, package: false });
  };

  const updateStatus = async (narrativeId: string, status: string) => {
    await fetch(`/api/narratives/${narrativeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadBatch();
  };

  const submitFinalContent = async (narrativeId: string) => {
    await fetch(`/api/narratives/${narrativeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finalContent: finalContentText }),
    });
    setFinalContentText("");
    await loadBatch();
  };

  if (!batch) return <div className="text-gray-400">Loading batch...</div>;

  const skippedTrends = batch.trends.filter((t) => t.status === "skipped");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Production Plan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Batch imported {new Date(batch.importedAt).toLocaleString()} — {batch.trends.length} trends
          </p>
        </div>
        <div className="flex gap-2">
          {narratives.length === 0 && (
            <button
              onClick={runScan}
              disabled={scanning}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {scanning ? "Running Yantri..." : "Run Yantri"}
            </button>
          )}
          {narratives.length > 0 && (
            <button
              onClick={async () => {
                if (!confirm("Reset all narratives and re-run Yantri?")) return;
                await fetch(`/api/trends/batch/${batchId}`, { method: "PUT" });
                setNarratives([]);
                setActiveNarrative(null);
                await loadBatch();
              }}
              className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-100"
            >
              Re-run Yantri
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Priorities */}
      {narratives.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">Priorities</h2>
          <div className="grid gap-3">
            {narratives
              .sort((a, b) => a.priority - b.priority)
              .map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActiveNarrative(n.id)}
                  className={`text-left w-full rounded-xl border p-5 transition-colors ${
                    activeNarrative === n.id
                      ? "border-gray-900 bg-white shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            n.priority === 1
                              ? "bg-red-100 text-red-700"
                              : n.priority === 2
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          P{n.priority}
                        </span>
                        <span className="font-medium text-sm">{n.angle}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{n.whyThisAngle}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                          {n.brand.name}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                          {n.platform}
                        </span>
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">
                          {n.urgency}
                        </span>
                        <StatusBadge status={n.status} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      Score: {n.trend?.score ?? "—"}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Skipped Trends */}
      {skippedTrends.length > 0 && (
        <details className="mb-8">
          <summary className="text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
            Skipped Trends ({skippedTrends.length})
          </summary>
          <div className="mt-2 space-y-2">
            {skippedTrends.map((t) => (
              <div key={t.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                <span className="font-medium">{t.headline}</span>
                {t.skipReason && (
                  <span className="text-gray-500"> — {t.skipReason}</span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Active Narrative Detail */}
      {active && (
        <div className="space-y-6">
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold mb-4">
              Workflow: {active.angle}
            </h2>

            {/* Action Buttons */}
            {active.status === "planned" && !researching && (
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => generateResearch(active.id)}
                  disabled={researching}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  Approve & Start Deep Research
                </button>
                <button
                  onClick={() => updateStatus(active.id, "killed")}
                  className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100"
                >
                  Kill
                </button>
              </div>
            )}

            {/* Research In Progress Panel — shown while SSE active OR DB status is "researching" */}
            {(researching || active.status === "researching") && !active.researchResults && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
                    <h3 className="font-semibold text-sm text-indigo-900">Deep Research In Progress</h3>
                  </div>
                  <span className="text-xs font-mono text-indigo-500">
                    {researchStartTime
                      ? `${Math.floor(researchElapsed / 60)}:${String(researchElapsed % 60).padStart(2, "0")}`
                      : "Running…"}
                  </span>
                </div>
                {/* Progress bar — grows over estimated 3-min duration, caps at 95% */}
                <div className="w-full bg-indigo-100 rounded-full h-1.5 mb-4 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${Math.min((researchElapsed / 180) * 100, 95)}%` }}
                  />
                </div>
                {/* Live SSE log when actively streaming */}
                {researchProgress.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-auto mb-2">
                    {researchProgress.map((msg, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-indigo-400 mt-0.5 shrink-0">
                          {i === researchProgress.length - 1 ? "›" : "✓"}
                        </span>
                        <span className={i === researchProgress.length - 1 ? "text-indigo-800 font-medium" : "text-indigo-500"}>
                          {msg}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Background status when not actively streaming (e.g. after page refresh) */}
                {!researching && (
                  <p className="text-xs text-indigo-500 mt-1">
                    Research is running in the background — this page checks for updates every 5 seconds.
                  </p>
                )}
              </div>
            )}

            {/* Information Gap */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="text-xs font-medium text-yellow-800 mb-1">Information Gap</div>
              <p className="text-sm text-yellow-900">{active.informationGap}</p>
            </div>

            {/* Research Prompt (collapsible, for reference) */}
            {active.researchPrompt && (
              <details className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <summary className="flex items-center justify-between cursor-pointer">
                  <h3 className="font-semibold text-sm">Research Prompt (generated)</h3>
                  <CopyButton text={active.researchPrompt} />
                </summary>
                <pre className="text-xs bg-gray-50 rounded-lg p-4 whitespace-pre-wrap max-h-48 overflow-auto mt-3">
                  {active.researchPrompt}
                </pre>
              </details>
            )}

            {/* Research Results */}
            {active.researchResults && (
              <div className="bg-white rounded-xl border border-green-200 p-6 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <h3 className="font-semibold text-sm">Deep Research Results</h3>
                  </div>
                  <CopyButton text={active.researchResults} />
                </div>
                <pre className="text-xs bg-gray-50 rounded-lg p-4 whitespace-pre-wrap max-h-64 overflow-auto">
                  {active.researchResults}
                </pre>
              </div>
            )}

            {/* Manual research paste fallback — only shown if research has fully stopped with no results */}
            {active.researchPrompt && !active.researchResults && !researching && active.status !== "researching" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <h3 className="font-semibold text-sm mb-2">Manual Research Paste (fallback)</h3>
                <p className="text-xs text-gray-500 mb-3">If deep research failed or you have your own research, paste it here.</p>
                <textarea
                  value={researchText}
                  onChange={(e) => setResearchText(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Paste research dossier here..."
                />
                <button
                  onClick={() => submitResearch(active.id)}
                  disabled={!researchText.trim()}
                  className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  Submit Manual Research
                </button>
              </div>
            )}

            {/* Research Results Summary */}
            {active.researchResults && !active.enginePrompt && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <h3 className="font-semibold text-sm mb-2">Research Results Submitted</h3>
                <pre className="text-xs bg-gray-50 rounded-lg p-4 whitespace-pre-wrap max-h-32 overflow-auto">
                  {active.researchResults.slice(0, 500)}...
                </pre>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => generateEnginePrompt(active.id)}
                    disabled={loading.engine}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    {loading.engine ? "Generating..." : "Generate Engine Prompt"}
                  </button>
                  <button
                    onClick={() => generatePackage(active.id)}
                    disabled={loading.package}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    {loading.package ? "Generating..." : "Generate Package"}
                  </button>
                </div>
              </div>
            )}

            {/* Engine Prompt Section */}
            {active.enginePrompt && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Engine Prompt</h3>
                  <CopyButton text={active.enginePrompt} />
                </div>
                <pre className="text-xs bg-gray-50 rounded-lg p-4 whitespace-pre-wrap max-h-64 overflow-auto">
                  {active.enginePrompt}
                </pre>

                {!active.packageData && (
                  <button
                    onClick={() => generatePackage(active.id)}
                    disabled={loading.package}
                    className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    {loading.package ? "Generating..." : "Generate Package"}
                  </button>
                )}
              </div>
            )}

            {/* Package Section */}
            {active.packageData && (() => {
              const pkg = JSON.parse(active.packageData);
              return (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                  <h3 className="font-semibold text-sm mb-4">Content Package</h3>

                  {/* Titles */}
                  {pkg.titles && (
                    <div className="mb-4">
                      <div className="text-xs font-medium text-gray-500 mb-2">Title Options</div>
                      {Object.entries(pkg.titles).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-2">
                          <div>
                            <span className="text-xs text-gray-400 uppercase">{key}: </span>
                            <span className="text-sm font-medium">{val as string}</span>
                          </div>
                          <CopyButton text={val as string} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Thumbnail */}
                  {pkg.thumbnail && (
                    <div className="mb-4">
                      <div className="text-xs font-medium text-gray-500 mb-2">Thumbnail Brief</div>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                        <div><strong>Visual:</strong> {pkg.thumbnail.visual}</div>
                        <div><strong>Text:</strong> {pkg.thumbnail.text_overlay}</div>
                        <div><strong>Emotion:</strong> {pkg.thumbnail.emotion}</div>
                        <div><strong>Color:</strong> {pkg.thumbnail.color_mood}</div>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {pkg.description && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-500">Description</div>
                        <CopyButton text={pkg.description} />
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">{pkg.description}</div>
                    </div>
                  )}

                  {/* Tags */}
                  {pkg.tags && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-500">Tags</div>
                        <CopyButton text={pkg.tags.join(" ")} />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pkg.tags.map((tag: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Posting Time */}
                  {pkg.posting_time && (
                    <div className="mb-4">
                      <div className="text-xs font-medium text-gray-500 mb-2">Posting Time</div>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">
                        <strong>{pkg.posting_time.time_ist}</strong> — {pkg.posting_time.reasoning}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Final Content & Status Actions */}
            {active.enginePrompt && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-sm mb-4">Final Steps</h3>

                {!active.finalContent && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paste Final Content (from engine output)
                    </label>
                    <textarea
                      value={finalContentText}
                      onChange={(e) => setFinalContentText(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="Paste the final content here for records..."
                    />
                    <button
                      onClick={() => submitFinalContent(active.id)}
                      disabled={!finalContentText.trim()}
                      className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                    >
                      Save Final Content
                    </button>
                  </div>
                )}

                {active.finalContent && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-500 mb-2">Final Content Saved</div>
                    <pre className="text-xs bg-gray-50 rounded-lg p-4 whitespace-pre-wrap max-h-32 overflow-auto">
                      {active.finalContent.slice(0, 500)}...
                    </pre>
                  </div>
                )}

                <div className="flex gap-2">
                  {active.status !== "published" && (
                    <button
                      onClick={() => updateStatus(active.id, "published")}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      Mark Published
                    </button>
                  )}
                  {active.status !== "killed" && active.status !== "published" && (
                    <button
                      onClick={() => updateStatus(active.id, "killed")}
                      className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100"
                    >
                      Kill
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No narratives yet, show trend list */}
      {narratives.length === 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Imported Trends</h2>
          {batch.trends.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-400">#{t.rank}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {t.score}
                    </span>
                    <span className="font-medium text-sm">{t.headline}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
