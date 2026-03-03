"use client";

import { useState, useEffect } from "react";
import StatusBadge from "@/components/StatusBadge";

interface Narrative {
  id: string;
  angle: string;
  priority: number;
  platform: string;
  status: string;
  createdAt: string;
  brand: { name: string };
  trend: { headline: string; score: number };
  researchPrompt: string | null;
  enginePrompt: string | null;
  packageData: string | null;
  finalContent: string | null;
}

export default function HistoryPage() {
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterPlatform) params.set("platform", filterPlatform);
    fetch(`/api/narratives?${params}`)
      .then((r) => r.json())
      .then(setNarratives);
  }, [filterStatus, filterPlatform]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">History</h1>

      <div className="flex gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="researching">Researching</option>
          <option value="producing">Producing</option>
          <option value="published">Published</option>
          <option value="killed">Killed</option>
        </select>
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Platforms</option>
          <option value="twitter_thread">Twitter Thread</option>
          <option value="twitter_single">Twitter Single</option>
          <option value="youtube_longform">YouTube Longform</option>
          <option value="blog">Blog</option>
          <option value="meta_reel">Meta Reel</option>
          <option value="linkedin">LinkedIn</option>
        </select>
      </div>

      <div className="space-y-3">
        {narratives.map((n) => (
          <div key={n.id} className="bg-white rounded-xl border border-gray-200">
            <button
              onClick={() => setExpanded(expanded === n.id ? null : n.id)}
              className="w-full text-left p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{n.angle}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    from: {n.trend.headline}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      {n.brand.name}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                      {n.platform}
                    </span>
                    <StatusBadge status={n.status} />
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleDateString()}
                </div>
              </div>
            </button>

            {expanded === n.id && (
              <div className="border-t border-gray-100 p-5 space-y-4">
                {n.researchPrompt && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Research Prompt</div>
                    <pre className="text-xs bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-auto">
                      {n.researchPrompt}
                    </pre>
                  </div>
                )}
                {n.enginePrompt && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Engine Prompt</div>
                    <pre className="text-xs bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-auto">
                      {n.enginePrompt}
                    </pre>
                  </div>
                )}
                {n.packageData && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Package Data</div>
                    <pre className="text-xs bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-auto">
                      {JSON.stringify(JSON.parse(n.packageData), null, 2)}
                    </pre>
                  </div>
                )}
                {n.finalContent && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Final Content</div>
                    <pre className="text-xs bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-auto">
                      {n.finalContent}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {narratives.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No narratives yet. Import trends and run Yantri to get started.
          </p>
        )}
      </div>
    </div>
  );
}
