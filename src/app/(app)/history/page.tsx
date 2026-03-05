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
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">Narrative History</h1>
        <p className="text-muted-foreground mt-1 font-medium text-sm">Review past intelligence cycles and generated outputs.</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-hover:text-indigo-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pl-10 pr-10 py-3 bg-zinc-900 border border-border rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-300 focus:ring-2 focus:ring-indigo-500/40 outline-none appearance-none cursor-pointer hover:border-zinc-600 transition-all shadow-sm"
          >
            <option value="">Status: All Levels</option>
            <option value="planned">S1: PLANNED</option>
            <option value="researching">S2: RESEARCHING</option>
            <option value="producing">S3: PRODUCING</option>
            <option value="published">S4: PUBLISHED</option>
            <option value="killed">S0: KILLED</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-hover:text-indigo-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="pl-10 pr-10 py-3 bg-zinc-900 border border-border rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-300 focus:ring-2 focus:ring-indigo-500/40 outline-none appearance-none cursor-pointer hover:border-zinc-600 transition-all shadow-sm"
          >
            <option value="">Origin: Global</option>
            <option value="twitter_thread">Twitter Thread</option>
            <option value="twitter_single">Twitter Single</option>
            <option value="youtube_longform">YouTube Longform</option>
            <option value="blog">Editorial Blog</option>
            <option value="meta_reel">Meta Reel</option>
            <option value="linkedin">LinkedIn Post</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {narratives.map((n) => (
          <div key={n.id} className={`glass-card rounded-3xl border-border overflow-hidden transition-all duration-300 ${expanded === n.id ? "ring-2 ring-indigo-500 shadow-2xl shadow-indigo-500/10" : "hover:border-zinc-600"}`}>
            <button
              onClick={() => setExpanded(expanded === n.id ? null : n.id)}
              className="w-full text-left p-6 group"
            >
              <div className="flex items-start justify-between gap-3 sm:gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={n.status} />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-black text-foreground leading-tight mb-2 group-hover:text-indigo-400 transition-colors">{n.angle}</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                    <span className="shrink-0">Source Trend:</span>
                    <span className="text-zinc-300 truncate max-w-[200px] sm:max-w-md">{n.trend.headline}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0">
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px] font-black uppercase tracking-tighter border border-border">
                      {n.brand.name}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-black uppercase tracking-tighter border border-indigo-500/20">
                      {n.platform.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className={`transition-transform duration-300 ${expanded === n.id ? "rotate-180 text-indigo-500" : "text-zinc-600 group-hover:text-muted-foreground"}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>

            {expanded === n.id && (
              <div className="border-t border-zinc-800 p-6 space-y-6 bg-zinc-800/30 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {n.researchPrompt && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Research Intelligence</div>
                      <div className="relative group/code">
                        <pre className="text-[11px] font-medium leading-relaxed bg-zinc-900 border border-border rounded-2xl p-5 text-zinc-300 whitespace-pre-wrap max-h-60 overflow-auto shadow-sm">
                          {n.researchPrompt}
                        </pre>
                      </div>
                    </div>
                  )}
                  {n.enginePrompt && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Generation Architecture</div>
                      <pre className="text-[11px] font-medium leading-relaxed bg-zinc-900 border border-border rounded-2xl p-5 text-zinc-300 whitespace-pre-wrap max-h-60 overflow-auto shadow-sm">
                        {n.enginePrompt}
                      </pre>
                    </div>
                  )}
                </div>

                {n.packageData && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Payload Structure</div>
                    <pre className="text-[11px] font-mono bg-slate-900 text-indigo-400 rounded-2xl p-5 overflow-auto shadow-2xl">
                      {JSON.stringify(JSON.parse(n.packageData), null, 2)}
                    </pre>
                  </div>
                )}

                {n.finalContent && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Final Disseminated Content</div>
                    <div className="bg-indigo-950 text-indigo-50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16H9.01703V14H12.017C13.1216 14 14.017 13.1046 14.017 12V9C14.017 7.89543 13.1216 7 12.017 7H5.01703C3.91246 7 3.01703 7.89543 3.01703 9V21C3.01703 22.1046 3.91246 23 5.01703 23H12.017C13.1216 23 14.017 22.1046 14.017 21ZM17.017 13V11C17.017 9.89543 17.9124 9 19.017 9H21.017C22.1216 9 23.017 9.89543 23.017 11V13C23.017 14.1046 22.1216 15 21.017 15H19.017C17.9124 15 17.017 14.1046 17.017 13ZM17.017 21V19C17.017 17.8954 17.9124 17 19.017 17H21.017C22.1216 17 23.017 17.8954 23.017 19V21C23.017 22.1046 22.1216 23 21.017 23H19.017C17.9124 23 17.017 22.1046 17.017 21ZM17.017 5V3C17.017 1.89543 17.9124 1 19.017 1H21.017C22.1216 1 23.017 1.89543 23.017 3V5C23.017 6.10457 22.1216 7 21.017 7H19.017C17.9124 7 17.017 6.10457 17.017 5Z" />
                        </svg>
                      </div>
                      <pre className="text-sm font-medium leading-relaxed whitespace-pre-wrap relative z-10">
                        {n.finalContent}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {narratives.length === 0 && (
          <div className="glass-card rounded-3xl p-20 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
              <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground">Archive is empty</h3>
            <p className="text-sm text-zinc-500 mt-1">Generated narratives will be stored here for post-production review.</p>
          </div>
        )}
      </div>
    </div>
  );
}
