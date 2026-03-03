"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "./LoadingSpinner";

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
  placeholder = "Type and press Enter",
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
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
    <div className="space-y-3">
      <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-xl text-xs font-bold border border-indigo-500/20 animate-fade-in"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, j) => j !== i))}
              className="text-indigo-500/50 hover:text-rose-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          className="flex-1"
          placeholder={placeholder}
        />
        <Button type="button" variant="secondary" onClick={addTag} className="gap-1">
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
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
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
          <CardDescription>Basic Profile & Persona</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Brand Name</Label>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g., Apple Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Tagline / Mission</Label>
              <Input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="Think Different"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Language</Label>
              <Input
                type="text"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                required
              />
            </div>
            <div className="flex items-center gap-3 bg-zinc-900 px-6 rounded-2xl border border-border">
              <Checkbox
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked as boolean })}
              />
              <Label htmlFor="isActive" className="text-sm font-black text-zinc-400 uppercase tracking-widest cursor-pointer">Active in Pipeline</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Tone of Voice</Label>
            <Textarea
              value={form.tone}
              onChange={(e) => setForm({ ...form, tone: e.target.value })}
              rows={2}
              required
              placeholder="Analytical, visionary, and concise."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Audience Profile</Label>
            <Textarea
              value={form.audienceDescription}
              onChange={(e) => setForm({ ...form, audienceDescription: e.target.value })}
              rows={2}
              placeholder="Senior engineers and tech enthusiasts."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editorial Territory</CardTitle>
          <CardDescription>Topics & Content Boundaries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <TagInput
            label="Primary Topics"
            tags={form.editorialCovers}
            onChange={(tags) => setForm({ ...form, editorialCovers: tags })}
            placeholder="e.g., AI Research, Cloud Architecture"
          />
          <TagInput
            label="Blacklisted Topics"
            tags={form.editorialNever}
            onChange={(tags) => setForm({ ...form, editorialNever: tags })}
            placeholder="e.g., Politics, Celebrity Gossip"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Multi-Platform Routing</CardTitle>
          <CardDescription>Distribution & Presence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map((platform) => {
              const active = form.activePlatforms.find((p) => p.name === platform);
              return (
                <div key={platform} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${active ? "bg-indigo-500/10 border-indigo-500/20 shadow-sm" : "bg-zinc-900 border-border opacity-60"}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={!!active}
                      onCheckedChange={() => togglePlatform(platform)}
                    />
                    <span className="text-xs font-black text-foreground uppercase tracking-widest">{platform}</span>
                  </label>
                  {active && (
                    <select
                      value={active.role}
                      onChange={(e) => setPlatformRole(platform, e.target.value)}
                      className="px-3 py-1 bg-zinc-900 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500/20"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice Rules & Priorities</CardTitle>
          <CardDescription>Engine Behavioral Constraints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <TagInput
            label="Core Voice Directives"
            tags={form.voiceRules}
            onChange={(tags) => setForm({ ...form, voiceRules: tags })}
            placeholder="e.g., Avoid jargon, use active voice"
          />
          <TagInput
            label="Editorial Hierarchy"
            tags={form.editorialPriorities}
            onChange={(tags) => setForm({ ...form, editorialPriorities: tags })}
            placeholder="e.g., Speed first, Accuracy always"
          />
        </CardContent>
      </Card>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={saving} className="flex-1 py-6 font-black uppercase tracking-widest">
          {saving ? <><LoadingSpinner size="sm" /> Syncing...</> : initial?.id ? "Update Architecture" : "Deploy Identity"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/brands")} className="py-6 px-8 font-black uppercase tracking-widest">
          Cancel
        </Button>
      </div>
    </form>
  );
}
