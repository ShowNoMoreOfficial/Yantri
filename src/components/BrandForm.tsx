"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BrandData {
  id?: string;
  name: string;
  tagline: string;
  language: string;
  tone: string;
  editorialCovers: string[];
  editorialNever: string[];
  audienceDescription: string;
  activePlatforms: { name: string; role: string }[];
  voiceRules: string[];
  editorialPriorities: string[];
  isActive: boolean;
}

const PLATFORMS = ["twitter", "youtube", "blog", "meta", "linkedin"];
const ROLES = ["PRIMARY", "secondary", "tertiary"];

function TagInput({
  label,
  tags,
  onChange,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput("");
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, j) => j !== i))}
              className="text-gray-400 hover:text-red-500"
            >
              x
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="Type and press Enter"
        />
        <button
          type="button"
          onClick={addTag}
          className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function BrandForm({ initial }: { initial?: BrandData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BrandData>(
    initial || {
      name: "",
      tagline: "",
      language: "English",
      tone: "",
      editorialCovers: [],
      editorialNever: [],
      audienceDescription: "",
      activePlatforms: [],
      voiceRules: [],
      editorialPriorities: [],
      isActive: true,
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const url = initial?.id ? `/api/brands/${initial.id}` : "/api/brands";
    const method = initial?.id ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    router.push("/brands");
    router.refresh();
  };

  const togglePlatform = (platformName: string) => {
    const exists = form.activePlatforms.find((p) => p.name === platformName);
    if (exists) {
      setForm({
        ...form,
        activePlatforms: form.activePlatforms.filter((p) => p.name !== platformName),
      });
    } else {
      setForm({
        ...form,
        activePlatforms: [...form.activePlatforms, { name: platformName, role: "secondary" }],
      });
    }
  };

  const setPlatformRole = (platformName: string, role: string) => {
    setForm({
      ...form,
      activePlatforms: form.activePlatforms.map((p) =>
        p.name === platformName ? { ...p, role } : p
      ),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold">Basic Info</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tagline</label>
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
            <input
              type="text"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              Active
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tone</label>
          <textarea
            value={form.tone}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Audience Description</label>
          <textarea
            value={form.audienceDescription}
            onChange={(e) => setForm({ ...form, audienceDescription: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold">Editorial Territory</h2>
        <TagInput
          label="Topics This Brand Covers"
          tags={form.editorialCovers}
          onChange={(tags) => setForm({ ...form, editorialCovers: tags })}
        />
        <TagInput
          label="Topics This Brand Never Covers"
          tags={form.editorialNever}
          onChange={(tags) => setForm({ ...form, editorialNever: tags })}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold">Platforms</h2>
        <div className="space-y-3">
          {PLATFORMS.map((platform) => {
            const active = form.activePlatforms.find((p) => p.name === platform);
            return (
              <div key={platform} className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm w-24">
                  <input
                    type="checkbox"
                    checked={!!active}
                    onChange={() => togglePlatform(platform)}
                    className="rounded"
                  />
                  {platform}
                </label>
                {active && (
                  <select
                    value={active.role}
                    onChange={(e) => setPlatformRole(platform, e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold">Voice & Priorities</h2>
        <TagInput
          label="Voice Rules"
          tags={form.voiceRules}
          onChange={(tags) => setForm({ ...form, voiceRules: tags })}
        />
        <TagInput
          label="Editorial Priorities (in order)"
          tags={form.editorialPriorities}
          onChange={(tags) => setForm({ ...form, editorialPriorities: tags })}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : initial?.id ? "Update Brand" : "Create Brand"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/brands")}
          className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
