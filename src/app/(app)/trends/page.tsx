"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        <h1 className="text-2xl font-bold text-foreground">Trend Batches</h1>
        <Button asChild>
          <Link href="/trends/import">+ Import Trends</Link>
        </Button>
      </div>

      {batches.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent className="p-0">
            <p className="text-muted-foreground mb-4">No trend batches yet.</p>
            <Button asChild>
              <Link href="/trends/import">Import Your First Trends</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => {
            const hasNarratives = batch.trends.some((t) => t.narratives.length > 0);
            const selectedCount = batch.trends.filter((t) => t.status === "selected").length;
            const skippedCount = batch.trends.filter((t) => t.status === "skipped").length;

            return (
              <Card key={batch.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-foreground">
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
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
                          Scanned
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20">
                          Pending Scan
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {batch.trends.length} trends — {selectedCount} selected, {skippedCount} skipped
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {hasNarratives && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20 hover:text-yellow-300"
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!confirm("Reset this batch and re-run Yantri?")) return;
                          await fetch(`/api/trends/batch/${batch.id}`, { method: "PUT" });
                          const res = await fetch("/api/trends/batches");
                          setBatches(await res.json());
                        }}
                      >
                        Re-run
                      </Button>
                    )}
                    <Button asChild size="sm">
                      <Link href={`/plan/${batch.id}`}>
                        {hasNarratives ? "View Plan" : "Run Yantri"}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:text-red-300"
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!confirm("Delete this batch and all its trends?")) return;
                        await fetch(`/api/trends/batch/${batch.id}`, { method: "DELETE" });
                        setBatches(batches.filter((b) => b.id !== batch.id));
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {batch.trends.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0"
                    >
                      <span className="text-sm font-bold text-zinc-500 w-6">#{t.rank}</span>
                      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 w-12 justify-center">
                        {t.score}
                      </Badge>
                      <span className="text-sm flex-1 text-foreground">{t.headline}</span>
                      <Badge
                        className={
                          t.status === "selected"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            : t.status === "skipped"
                            ? "bg-zinc-800/50 text-muted-foreground border-border hover:bg-zinc-700"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20"
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
