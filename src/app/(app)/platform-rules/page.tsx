"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PlatformRule {
  id: string;
  narrativeType: string;
  primaryPlatform: string;
  secondaryPlatform: string | null;
  brandName: string | null;
  speedPriority: string;
}

const emptyRule = {
  narrativeType: "",
  primaryPlatform: "",
  secondaryPlatform: "",
  brandName: "",
  speedPriority: "2_4_hours",
};

export default function PlatformRulesPage() {
  const [rules, setRules] = useState<PlatformRule[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState(emptyRule);
  const [adding, setAdding] = useState(false);
  const [newData, setNewData] = useState(emptyRule);

  useEffect(() => {
    fetch("/api/platform-rules")
      .then((r) => r.json())
      .then(setRules);
  }, []);

  const startEdit = (rule: PlatformRule) => {
    setEditing(rule.id);
    setEditData({
      narrativeType: rule.narrativeType,
      primaryPlatform: rule.primaryPlatform,
      secondaryPlatform: rule.secondaryPlatform || "",
      brandName: rule.brandName || "",
      speedPriority: rule.speedPriority,
    });
  };

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/platform-rules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    const updated = await res.json();
    setRules(rules.map((r) => (r.id === id ? updated : r)));
    setEditing(null);
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/platform-rules/${id}`, { method: "DELETE" });
    setRules(rules.filter((r) => r.id !== id));
  };

  const addRule = async () => {
    const res = await fetch("/api/platform-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newData),
    });
    const created = await res.json();
    setRules([...rules, created]);
    setAdding(false);
    setNewData(emptyRule);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Routing Rules</h1>
          <p className="text-muted-foreground mt-1 font-medium text-sm">Define how narratives flow across platforms.</p>
        </div>
        <Button
          onClick={() => setAdding(true)}
          className="px-6 py-3 rounded-2xl font-bold shadow-lg shadow-black/20 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
          Add New Rule
        </Button>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden border-border shadow-xl shadow-black/20">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800/30 border-b border-border">
              <th className="text-left px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">Narrative Type</th>
              <th className="text-left px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">Primary Target</th>
              <th className="text-left px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">Secondary</th>
              <th className="text-left px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">SLA / Speed</th>
              <th className="text-left px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px]">Brand Scope</th>
              <th className="px-6 py-4 font-black text-zinc-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rules.map((rule) => (
              <tr key={rule.id} className="group hover:bg-zinc-800/50 transition-colors">
                {editing === rule.id ? (
                  <>
                    <td className="px-6 py-4">
                      <Input value={editData.narrativeType} onChange={(e) => setEditData({ ...editData, narrativeType: e.target.value })} className="w-full px-3 py-2 bg-zinc-900 border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/40 outline-none" />
                    </td>
                    <td className="px-6 py-4">
                      <Input value={editData.primaryPlatform} onChange={(e) => setEditData({ ...editData, primaryPlatform: e.target.value })} className="w-full px-3 py-2 bg-zinc-900 border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/40 outline-none" />
                    </td>
                    <td className="px-6 py-4">
                      <Input value={editData.secondaryPlatform} onChange={(e) => setEditData({ ...editData, secondaryPlatform: e.target.value })} className="w-full px-3 py-2 bg-zinc-900 border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/40 outline-none" />
                    </td>
                    <td className="px-6 py-4">
                      <Input value={editData.speedPriority} onChange={(e) => setEditData({ ...editData, speedPriority: e.target.value })} className="w-full px-3 py-2 bg-zinc-900 border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/40 outline-none" />
                    </td>
                    <td className="px-6 py-4">
                      <Input value={editData.brandName} onChange={(e) => setEditData({ ...editData, brandName: e.target.value })} className="w-full px-3 py-2 bg-zinc-900 border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/40 outline-none" placeholder="All brands" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button onClick={() => saveEdit(rule.id)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors">Save</Button>
                        <Button variant="secondary" onClick={() => setEditing(null)} className="px-3 py-1.5 bg-zinc-800 text-muted-foreground rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-zinc-700 transition-colors">Cancel</Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4">
                      <span className="font-bold text-foreground">{rule.narrativeType}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-300 uppercase tracking-tighter text-xs">{rule.primaryPlatform}</td>
                    <td className="px-6 py-4">
                      {rule.secondaryPlatform ? (
                        <span className="text-xs font-medium text-zinc-500 capitalize">{rule.secondaryPlatform}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 shadow-sm">
                        {rule.speedPriority.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold ${rule.brandName ? "text-indigo-400" : "text-zinc-500 uppercase tracking-widest text-[10px]"}`}>
                        {rule.brandName || "GLOBAL"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(rule)}
                          className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                          title="Edit Rule"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Delete Rule"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {adding && (
              <tr className="bg-indigo-500/5">
                <td className="px-6 py-4">
                  <Input value={newData.narrativeType} onChange={(e) => setNewData({ ...newData, narrativeType: e.target.value })} className="w-full px-3 py-2 bg-zinc-900 border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/40 outline-none" placeholder="e.g., system_failure" />
                </td>
                <td className="px-6 py-4">
                  <Input value={newData.primaryPlatform} onChange={(e) => setNewData({ ...newData, primaryPlatform: e.target.value })} className="w-full px-3 py-2 bg-zinc-900 border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/40 outline-none" placeholder="e.g., twitter_thread" />
                </td>
                <td className="px-6 py-4">
                  <Input value={newData.secondaryPlatform} onChange={(e) => setNewData({ ...newData, secondaryPlatform: e.target.value })} className="w-full px-3 py-2 bg-zinc-900 border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/40 outline-none" placeholder="e.g., linkedin_post" />
                </td>
                <td className="px-6 py-4">
                  <Input value={newData.speedPriority} onChange={(e) => setNewData({ ...newData, speedPriority: e.target.value })} className="w-full px-3 py-2 bg-zinc-900 border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/40 outline-none" placeholder="e.g., 2_4_hours" />
                </td>
                <td className="px-6 py-4">
                  <Input value={newData.brandName} onChange={(e) => setNewData({ ...newData, brandName: e.target.value })} className="w-full px-3 py-2 bg-zinc-900 border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/40 outline-none" placeholder="All brands" />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button onClick={addRule} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors">Add</Button>
                    <Button variant="secondary" onClick={() => setAdding(false)} className="px-3 py-1.5 bg-zinc-800 text-muted-foreground rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-zinc-700 transition-colors">Cancel</Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {rules.length === 0 && !adding && (
          <div className="py-20 text-center animate-fade-in">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
              <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground">No routing rules defined</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-8">Define how trends are mapped to platforms based on narrative type.</p>
            <Button
              onClick={() => setAdding(true)}
              className="px-6 py-3 rounded-xl font-bold shadow-lg shadow-black/20"
            >
              Add Initial Rule
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
