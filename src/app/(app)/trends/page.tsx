"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Trend {
  id: string;
  rank: number;
  score: number;
  headline: string;
  reason: string;
  status: string;
  narratives: { id: string }[];
}

interface Batch {
  id: string;
  importedAt: string;
  source: string;
  trends: Trend[];
}

export default function TrendsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    fetch("/api/trends/batches")
      .then((r) => r.json())
      .then(setBatches);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trend Batches</h1>
        <Link
          href="/trends/import"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          + Import Trends
        </Link>
      </div>

      {batches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">No trend batches yet.</p>
          <Link
            href="/trends/import"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Import Your First Trends
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => {
            const hasNarratives = batch.trends.some((t) => t.narratives.length > 0);
            const selectedCount = batch.trends.filter((t) => t.status === "selected").length;
            const skippedCount = batch.trends.filter((t) => t.status === "skipped").length;

            return (
              <div key={batch.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold">
                        {new Date(batch.importedAt).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </h2>
                      {hasNarratives ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Scanned
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          Pending Scan
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {batch.trends.length} trends — {selectedCount} selected, {skippedCount} skipped
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {hasNarratives && (
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!confirm("Reset this batch and re-run Yantri?")) return;
                          await fetch(`/api/trends/batch/${batch.id}`, { method: "PUT" });
                          const res = await fetch("/api/trends/batches");
                          setBatches(await res.json());
                        }}
                        className="px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-100 transition-colors"
                      >
                        Re-run
                      </button>
                    )}
                    <Link
                      href={`/plan/${batch.id}`}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      {hasNarratives ? "View Plan" : "Run Yantri"}
                    </Link>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!confirm("Delete this batch and all its trends?")) return;
                        await fetch(`/api/trends/batch/${batch.id}`, { method: "DELETE" });
                        setBatches(batches.filter((b) => b.id !== batch.id));
                      }}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {batch.trends.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-sm font-bold text-gray-400 w-6">#{t.rank}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium w-12 text-center">
                        {t.score}
                      </span>
                      <span className="text-sm flex-1">{t.headline}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.status === "selected"
                            ? "bg-green-100 text-green-700"
                            : t.status === "skipped"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
