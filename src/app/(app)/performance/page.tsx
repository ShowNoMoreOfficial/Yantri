"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PerformanceRecord {
  id: string;
  platform: string;
  brandName: string;
  contentType: string;
  impressions: number | null;
  engagementRate: number | null;
  replies: number | null;
  retweets: number | null;
  bookmarks: number | null;
  views: number | null;
  watchTime: number | null;
  ctr: number | null;
  notes: string | null;
  publishedAt: string | null;
  recordedAt: string;
}

interface Narrative {
  id: string;
  angle: string;
  brand: { name: string };
  platform: string;
}

export default function PerformancePage() {
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    narrativeId: "",
    platform: "",
    brandName: "",
    contentType: "thread",
    impressions: "",
    engagementRate: "",
    replies: "",
    retweets: "",
    bookmarks: "",
    views: "",
    watchTime: "",
    ctr: "",
    notes: "",
    publishedAt: "",
  });

  useEffect(() => {
    fetch("/api/performance").then((r) => r.json()).then(setRecords);
    fetch("/api/narratives?status=published").then((r) => r.json()).then(setNarratives);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const record = await res.json();
    setRecords([record, ...records]);
    setShowForm(false);
    setForm({
      narrativeId: "", platform: "", brandName: "", contentType: "thread",
      impressions: "", engagementRate: "", replies: "", retweets: "",
      bookmarks: "", views: "", watchTime: "", ctr: "", notes: "", publishedAt: "",
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1 font-medium text-sm">Monitor reach, engagement, and content performance.</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className={`px-6 py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center gap-2 ${showForm
              ? "bg-zinc-900 border border-border text-zinc-300 hover:bg-zinc-800/50"
              : "shadow-black/20"
            }`}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? "Close Logger" : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
              </svg>
              Log Impact
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 border-border shadow-xl shadow-black/20 mb-10 overflow-hidden relative animate-fade-in">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">Post-Production Logger</h2>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Connect narratives to hard metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="col-span-full space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Select Disseminated Narrative</label>
              <select
                value={form.narrativeId}
                onChange={(e) => {
                  const n = narratives.find((n) => n.id === e.target.value);
                  setForm({
                    ...form,
                    narrativeId: e.target.value,
                    platform: n?.platform || form.platform,
                    brandName: n?.brand.name || form.brandName,
                  });
                }}
                className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-2xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-sm appearance-none"
              >
                <option value="">Choose a narrative...</option>
                {narratives.map((n) => (
                  <option key={n.id} value={n.id}>{n.angle} ({n.brand.name})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Platform</label>
              <Input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border-border rounded-2xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Brand Avatar</label>
              <Input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border-border rounded-2xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Medium / Format</label>
              <select value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-2xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-sm appearance-none">
                <option value="thread">Twitter Thread</option>
                <option value="tweet">Single Tweet</option>
                <option value="video">Longform Video</option>
                <option value="blog">Editorial Blog</option>
                <option value="reel">Social Reel</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Total Impressions</label>
              <Input type="number" value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border-border rounded-2xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Engagement Rate (%)</label>
              <Input type="number" step="0.01" value={form.engagementRate} onChange={(e) => setForm({ ...form, engagementRate: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border-border rounded-2xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Total Views</label>
              <Input type="number" value={form.views} onChange={(e) => setForm({ ...form, views: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border-border rounded-2xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-sm" />
            </div>

            <div className="col-span-full space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Strategic Observations</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-3 bg-zinc-800 border border-border rounded-2xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all" rows={2} placeholder="Sentiment was highly positive..." />
            </div>
          </div>
          <Button type="submit" className="mt-8 px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-black/20">
            Commit Metrics to Ledger
          </Button>
        </form>
      )}

      <div className="glass-card rounded-3xl overflow-hidden border-border shadow-xl shadow-black/20 mb-20">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800/30 border-b border-border">
              <th className="text-left px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">Brand Avatar</th>
              <th className="text-left px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">Platform</th>
              <th className="text-left px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">Medium</th>
              <th className="text-right px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">Views</th>
              <th className="text-right px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">Impressions</th>
              <th className="text-right px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">Eng. Rate</th>
              <th className="text-left px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {records.map((r) => (
              <tr key={r.id} className="group hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4 font-bold text-foreground">{r.brandName}</td>
                <td className="px-6 py-4 uppercase tracking-tighter text-xs font-medium text-muted-foreground">{r.platform}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[9px] font-black uppercase tracking-widest">
                    {r.contentType}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-black text-foreground">{r.views?.toLocaleString() || "—"}</td>
                <td className="px-6 py-4 text-right font-medium text-zinc-300">{r.impressions?.toLocaleString() || "—"}</td>
                <td className="px-6 py-4 text-right">
                  {r.engagementRate ? (
                    <span className="text-emerald-400 font-black text-xs">
                      {r.engagementRate}%
                    </span>
                  ) : "—"}
                </td>
                <td className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  {new Date(r.recordedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                    <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Metrics ledger is empty</h3>
                  <p className="text-sm text-zinc-500 mt-1 mb-8">Log performance data to see impact analysis.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
