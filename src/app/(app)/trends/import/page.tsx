"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [mode, setMode] = useState<"paste" | "table">("paste");
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
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-4xl mb-4">&#10003;</div>
        <h2 className="text-xl font-bold mb-2">Trends Imported</h2>
        <p className="text-gray-500 mb-6">
          {trendCount || parsed.length || manualRows.length} trends saved to batch
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push(`/plan/${batchId}`)}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Run Yantri
          </button>
          <button
            onClick={() => {
              setImported(false);
              setPasteText("");
              setParsed([]);
            }}
            className="px-6 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Import More
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Import Trends</h1>

      {/* Khabri Auto-Fetch */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Fetch from Khabri</h2>
            <p className="text-sm text-gray-500 mt-1">
              Automatically fetch and rank live trends from RSS feeds and Google News
            </p>
          </div>
          <button
            onClick={handleKhabriFetch}
            disabled={fetching}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {fetching ? "Fetching & Ranking..." : "Fetch Live Trends"}
          </button>
        </div>
        {fetching && (
          <p className="text-sm text-gray-400 mt-3">
            Scanning RSS feeds, Google News, Reddit... ranking with Gemini. This may take up to a minute.
          </p>
        )}
        {fetchError && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {fetchError}
          </div>
        )}
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
        <div className="relative flex justify-center"><span className="bg-gray-50 px-3 text-sm text-gray-400">or import manually</span></div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("paste")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            mode === "paste" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          Paste Mode
        </button>
        <button
          onClick={() => setMode("table")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            mode === "table" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          Table Mode
        </button>
      </div>

      {mode === "paste" ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste Khabri Output
            </label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="1&#9;98&#9;7-Year-Old Crushed: School Bus Safety Failure&#9;Extreme emotional trigger...&#10;2&#9;97&#9;Global Escalation: Israel Strikes Beirut & Iran&#9;High pressure geopolitical..."
            />
            <button
              onClick={handleParse}
              className="mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
            >
              Parse Trends
            </button>
          </div>

          {parsed.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold mb-4">
                Parsed {parsed.length} trend{parsed.length !== 1 ? "s" : ""}
              </h3>
              <div className="space-y-3">
                {parsed.map((t, i) => (
                  <div key={i} className="flex gap-4 items-start border-b border-gray-100 pb-3 last:border-0">
                    <div className="text-lg font-bold text-gray-400 w-8">#{t.rank}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          Score: {t.score}
                        </span>
                        <span className="font-medium text-sm">{t.headline}</span>
                      </div>
                      {t.reason && (
                        <p className="text-xs text-gray-500 mt-1">{t.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleImport(parsed)}
                disabled={importing}
                className="mt-4 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {importing ? "Importing..." : "Import Trends"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-3">
            {manualRows.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="number"
                  value={row.rank}
                  onChange={(e) => {
                    const updated = [...manualRows];
                    updated[i] = { ...row, rank: parseInt(e.target.value) || 0 };
                    setManualRows(updated);
                  }}
                  className="col-span-1 px-2 py-2 border rounded text-sm text-center"
                  placeholder="#"
                />
                <input
                  type="number"
                  value={row.score}
                  onChange={(e) => {
                    const updated = [...manualRows];
                    updated[i] = { ...row, score: parseInt(e.target.value) || 0 };
                    setManualRows(updated);
                  }}
                  className="col-span-1 px-2 py-2 border rounded text-sm text-center"
                  placeholder="Score"
                />
                <input
                  type="text"
                  value={row.headline}
                  onChange={(e) => {
                    const updated = [...manualRows];
                    updated[i] = { ...row, headline: e.target.value };
                    setManualRows(updated);
                  }}
                  className="col-span-5 px-2 py-2 border rounded text-sm"
                  placeholder="Headline"
                />
                <input
                  type="text"
                  value={row.reason}
                  onChange={(e) => {
                    const updated = [...manualRows];
                    updated[i] = { ...row, reason: e.target.value };
                    setManualRows(updated);
                  }}
                  className="col-span-4 px-2 py-2 border rounded text-sm"
                  placeholder="Reason"
                />
                <button
                  onClick={() => setManualRows(manualRows.filter((_, j) => j !== i))}
                  className="col-span-1 text-red-400 hover:text-red-600 text-center"
                >
                  x
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={addManualRow}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              + Add Row
            </button>
            <button
              onClick={() =>
                handleImport(manualRows.filter((r) => r.headline.trim()))
              }
              disabled={importing}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import Trends"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
