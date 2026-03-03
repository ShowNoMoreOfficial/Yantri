"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ParsedTrend {
  rank: number;
  score: number;
  headline: string;
  reason: string;
}

function parseTrends(text: string): ParsedTrend[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  const trends: ParsedTrend[] = [];

  for (const line of lines) {
    // Try tab-separated: rank\tscore\theadline\treason
    const tabParts = line.split("\t").map((s) => s.trim());
    if (tabParts.length >= 4) {
      const rank = parseInt(tabParts[0]);
      const score = parseInt(tabParts[1]);
      if (!isNaN(rank) && !isNaN(score)) {
        trends.push({ rank, score, headline: tabParts[2], reason: tabParts.slice(3).join(" ") });
        continue;
      }
    }

    // Try multi-space separated: rank  score  headline  reason
    const match = line.match(/^\s*(\d+)\s{2,}(\d+)\s{2,}(.+?)\s{2,}(.+)$/);
    if (match) {
      trends.push({
        rank: parseInt(match[1]),
        score: parseInt(match[2]),
        headline: match[3].trim(),
        reason: match[4].trim(),
      });
      continue;
    }

    // Try simple space-separated with first two being numbers
    const words = line.trim().split(/\s+/);
    if (words.length >= 4) {
      const rank = parseInt(words[0]);
      const score = parseInt(words[1]);
      if (!isNaN(rank) && !isNaN(score) && rank > 0 && rank < 100 && score > 0) {
        // Find where headline ends and reason begins (look for common separators)
        const rest = words.slice(2).join(" ");
        const colonSplit = rest.split(/\s{3,}|\t/);
        if (colonSplit.length >= 2) {
          trends.push({ rank, score, headline: colonSplit[0].trim(), reason: colonSplit.slice(1).join(" ").trim() });
        } else {
          trends.push({ rank, score, headline: rest, reason: "" });
        }
      }
    }
  }

  return trends.sort((a, b) => a.rank - b.rank);
}

export default function ImportTrendsPage() {
  const router = useRouter();
  const [pasteText, setPasteText] = useState("");
  const [parsed, setParsed] = useState<ParsedTrend[]>([]);
  const [manualRows, setManualRows] = useState<ParsedTrend[]>([
    { rank: 1, score: 0, headline: "", reason: "" },
  ]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [trendCount, setTrendCount] = useState(0);

  const handleParse = () => {
    const results = parseTrends(pasteText);
    setParsed(results);
  };

  const handleImport = async (trends: ParsedTrend[]) => {
    if (trends.length === 0) return;
    setImporting(true);

    const res = await fetch("/api/trends/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trends }),
    });
    const batch = await res.json();
    setBatchId(batch.id);
    setImported(true);
    setImporting(false);
  };

  const handleKhabriFetch = async () => {
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch("/api/trends/fetch", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || "Khabri fetch failed");
        setFetching(false);
        return;
      }
      setBatchId(data.id);
      setTrendCount(data.trends?.length || 0);
      setImported(true);
    } catch (err) {
      setFetchError("Failed to connect to Khabri. Make sure Python and dependencies are installed.");
      console.error(err);
    }
    setFetching(false);
  };

  const addManualRow = () => {
    setManualRows([
      ...manualRows,
      { rank: manualRows.length + 1, score: 0, headline: "", reason: "" },
    ]);
  };

  if (imported) {
    return (
      <div className="max-w-2xl mx-auto py-12 animate-fade-in">
        <div className="glass-card rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-foreground mb-2">Trends Secured</h2>
          <p className="text-muted-foreground mb-10 font-medium">
            {trendCount || parsed.length || manualRows.length} items have been ingested into the pipeline.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push(`/plan/${batchId}`)}
              className="px-10 py-4 h-auto rounded-2xl font-bold shadow-xl shadow-black/20 group"
            >
              Run Yantri Intelligence
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setImported(false);
                setPasteText("");
                setParsed([]);
                setTrendCount(0);
              }}
              className="px-10 py-4 h-auto rounded-2xl font-bold"
            >
              Import More
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Import Trends</h1>

      {/* Khabri Auto-Fetch */}
      <Card className="rounded-2xl p-8 mb-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
          <svg className="w-20 h-20 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-1">Khabri Intelligence</h2>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Automatically fetch, rank, and synthesize live trends from RSS feeds, Google News, and social indicators.
            </p>
          </div>
          <Button
            onClick={handleKhabriFetch}
            disabled={fetching}
            className="px-8 py-4 h-auto rounded-2xl font-bold shadow-lg shadow-black/20 shrink-0"
          >
            {fetching ? <><LoadingSpinner size="sm" /> Fetching...</> : <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Fetch Live Trends
            </>}
          </Button>
        </div>
        {fetching && (
          <div className="mt-6 flex items-center gap-3 p-4 bg-zinc-800/30 rounded-xl border border-border animate-pulse">
            <LoadingSpinner size="sm" />
            <p className="text-xs text-muted-foreground font-medium">
              Scanning RSS feeds, Google News, Reddit... ranking with Gemini. This may take up to a minute.
            </p>
          </div>
        )}
        {fetchError && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {fetchError}
          </div>
        )}
      </Card>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
        <div className="relative flex justify-center"><span className="bg-background px-3 text-sm text-muted-foreground">or import manually</span></div>
      </div>

      <Tabs defaultValue="paste" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="paste">Paste Mode</TabsTrigger>
          <TabsTrigger value="table">Table Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="paste">
          <div className="space-y-4">
            <Card className="p-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Paste Khabri Output
              </label>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={10}
                className="font-mono"
                placeholder={"1\t98\t7-Year-Old Crushed: School Bus Safety Failure\tExtreme emotional trigger...\n2\t97\tGlobal Escalation: Israel Strikes Beirut & Iran\tHigh pressure geopolitical..."}
              />
              <Button
                onClick={handleParse}
                className="mt-3"
              >
                Parse Trends
              </Button>
            </Card>

            {parsed.length > 0 && (
              <Card className="glass-card rounded-2xl p-8 animate-fade-in shadow-xl shadow-black/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-foreground uppercase tracking-wider text-sm">
                    Parsed Intelligence ({parsed.length})
                  </h3>
                </div>
                <div className="space-y-4">
                  {parsed.map((t, i) => (
                    <div key={i} className="flex gap-4 items-start border-b border-zinc-800 pb-4 last:border-0 group">
                      <div className="text-xl font-black text-zinc-500 group-hover:text-foreground transition-colors w-10">
                        {t.rank < 10 ? `0${t.rank}` : t.rank}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 font-black text-[10px] tracking-tighter">
                            SCORE {t.score}
                          </Badge>
                          <span className="font-bold text-foreground text-sm">{t.headline}</span>
                        </div>
                        {t.reason && (
                          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{t.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => handleImport(parsed)}
                  disabled={importing}
                  className="mt-8 px-8 py-4 h-auto rounded-2xl font-bold w-full sm:w-auto"
                >
                  {importing ? <><LoadingSpinner size="sm" /> Importing...</> : "Import to Pipeline"}
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <Card className="p-6">
            <div className="space-y-3">
              {manualRows.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    type="number"
                    value={row.rank}
                    onChange={(e) => {
                      const updated = [...manualRows];
                      updated[i] = { ...row, rank: parseInt(e.target.value) || 0 };
                      setManualRows(updated);
                    }}
                    className="col-span-1 text-center"
                    placeholder="#"
                  />
                  <Input
                    type="number"
                    value={row.score}
                    onChange={(e) => {
                      const updated = [...manualRows];
                      updated[i] = { ...row, score: parseInt(e.target.value) || 0 };
                      setManualRows(updated);
                    }}
                    className="col-span-1 text-center"
                    placeholder="Score"
                  />
                  <Input
                    type="text"
                    value={row.headline}
                    onChange={(e) => {
                      const updated = [...manualRows];
                      updated[i] = { ...row, headline: e.target.value };
                      setManualRows(updated);
                    }}
                    className="col-span-5"
                    placeholder="Headline"
                  />
                  <Input
                    type="text"
                    value={row.reason}
                    onChange={(e) => {
                      const updated = [...manualRows];
                      updated[i] = { ...row, reason: e.target.value };
                      setManualRows(updated);
                    }}
                    className="col-span-4"
                    placeholder="Reason"
                  />
                  <button
                    onClick={() => setManualRows(manualRows.filter((_, j) => j !== i))}
                    className="col-span-1 text-red-400 hover:text-red-300 text-center transition-colors"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="secondary"
                onClick={addManualRow}
              >
                + Add Row
              </Button>
              <Button
                onClick={() =>
                  handleImport(manualRows.filter((r) => r.headline.trim()))
                }
                disabled={importing}
              >
                {importing ? "Importing..." : "Import Trends"}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
