"use client";

import { useState, useEffect } from "react";

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Performance</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          {showForm ? "Cancel" : "+ Log Performance"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Narrative</label>
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
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Select narrative...</option>
                {narratives.map((n) => (
                  <option key={n.id} value={n.id}>{n.angle}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
              <select value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="thread">Thread</option>
                <option value="tweet">Tweet</option>
                <option value="video">Video</option>
                <option value="blog">Blog</option>
                <option value="reel">Reel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impressions</label>
              <input type="number" value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Engagement Rate (%)</label>
              <input type="number" step="0.01" value={form.engagementRate} onChange={(e) => setForm({ ...form, engagementRate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Views</label>
              <input type="number" value={form.views} onChange={(e) => setForm({ ...form, views: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Replies</label>
              <input type="number" value={form.replies} onChange={(e) => setForm({ ...form, replies: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retweets</label>
              <input type="number" value={form.retweets} onChange={(e) => setForm({ ...form, retweets: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bookmarks</label>
              <input type="number" value={form.bookmarks} onChange={(e) => setForm({ ...form, bookmarks: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Watch Time (min)</label>
              <input type="number" step="0.1" value={form.watchTime} onChange={(e) => setForm({ ...form, watchTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTR (%)</label>
              <input type="number" step="0.01" value={form.ctr} onChange={(e) => setForm({ ...form, ctr: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
            </div>
          </div>
          <button type="submit" className="mt-4 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
            Save Performance Data
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Brand</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Platform</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Views</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Impressions</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Eng. Rate</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium">{r.brandName}</td>
                <td className="px-4 py-3">{r.platform}</td>
                <td className="px-4 py-3">{r.contentType}</td>
                <td className="px-4 py-3 text-right">{r.views?.toLocaleString() || "—"}</td>
                <td className="px-4 py-3 text-right">{r.impressions?.toLocaleString() || "—"}</td>
                <td className="px-4 py-3 text-right">{r.engagementRate ? `${r.engagementRate}%` : "—"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(r.recordedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No performance data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
