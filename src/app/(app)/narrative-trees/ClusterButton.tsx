"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default function ClusterButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ clustered: number; totalSignals: number } | null>(null);
  const [error, setError] = useState("");

  async function handleCluster() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/narratives/cluster", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Clustering failed");
        return;
      }

      setResult({ clustered: data.clustered, totalSignals: data.totalSignals });
      router.refresh();
    } catch {
      setError("Failed to connect to clustering service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleCluster}
        disabled={loading}
        className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-900/20"
      >
        <Zap className="w-4 h-4" />
        {loading ? "Clustering..." : "Cluster All Trends"}
      </Button>

      {result && (
        <span className="text-xs text-emerald-400 font-semibold">
          {result.clustered} clusters from {result.totalSignals} signals
        </span>
      )}
      {error && (
        <span className="text-xs text-red-400 font-semibold">{error}</span>
      )}
    </div>
  );
}
