"use client";

import { useState, useEffect } from "react";

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
  speedPriority: "",
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Platform Routing Rules</h1>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          + Add Rule
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Narrative Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Primary Platform</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Secondary</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Speed</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Brand</th>
              <th className="px-4 py-3 font-medium text-gray-600 w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-gray-100 last:border-0">
                {editing === rule.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input value={editData.narrativeType} onChange={(e) => setEditData({ ...editData, narrativeType: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editData.primaryPlatform} onChange={(e) => setEditData({ ...editData, primaryPlatform: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editData.secondaryPlatform} onChange={(e) => setEditData({ ...editData, secondaryPlatform: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editData.speedPriority} onChange={(e) => setEditData({ ...editData, speedPriority: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editData.brandName} onChange={(e) => setEditData({ ...editData, brandName: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" placeholder="All brands" />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(rule.id)} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Save</button>
                        <button onClick={() => setEditing(null)} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium">{rule.narrativeType}</td>
                    <td className="px-4 py-3">{rule.primaryPlatform}</td>
                    <td className="px-4 py-3 text-gray-500">{rule.secondaryPlatform || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{rule.speedPriority}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{rule.brandName || "All"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(rule)} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">Edit</button>
                        <button onClick={() => deleteRule(rule.id)} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100">Del</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {adding && (
              <tr className="border-b border-gray-100 bg-blue-50/30">
                <td className="px-4 py-2">
                  <input value={newData.narrativeType} onChange={(e) => setNewData({ ...newData, narrativeType: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" placeholder="e.g., system_failure" />
                </td>
                <td className="px-4 py-2">
                  <input value={newData.primaryPlatform} onChange={(e) => setNewData({ ...newData, primaryPlatform: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" placeholder="e.g., twitter_thread" />
                </td>
                <td className="px-4 py-2">
                  <input value={newData.secondaryPlatform} onChange={(e) => setNewData({ ...newData, secondaryPlatform: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                </td>
                <td className="px-4 py-2">
                  <input value={newData.speedPriority} onChange={(e) => setNewData({ ...newData, speedPriority: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" placeholder="e.g., 2_4_hours" />
                </td>
                <td className="px-4 py-2">
                  <input value={newData.brandName} onChange={(e) => setNewData({ ...newData, brandName: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" placeholder="All brands" />
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={addRule} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Add</button>
                    <button onClick={() => setAdding(false)} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">Cancel</button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
