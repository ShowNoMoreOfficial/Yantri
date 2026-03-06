"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Loader2,
  Play,
  CheckCircle,
  Circle,
} from "lucide-react";
import { toast } from "sonner";

interface PromptTemplate {
  id: string;
  platform: string;
  name: string;
  systemPrompt: string;
  userFormat: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Brand {
  id: string;
  name: string;
  tone: string;
  language: string;
  voiceRules: unknown;
}

const PLATFORMS = ["twitter", "youtube", "blog", "meta", "linkedin"];

const PLACEHOLDER_HELP = `Available placeholders:
{{narrativeAngle}}, {{trendHeadline}}, {{brandName}}, {{brandTone}},
{{voiceRules}}, {{language}}, {{researchResults}}, {{format}}, {{platform}}`;

export default function PromptEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("twitter");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userFormat, setUserFormat] = useState(
    "Generate content for {{platform}} about: {{narrativeAngle}}\n\nBrand: {{brandName}} ({{brandTone}})\nVoice: {{voiceRules}}\nLanguage: {{language}}\n\nResearch:\n{{researchResults}}"
  );
  const [isActive, setIsActive] = useState(false);

  // Playground
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [mockDossier, setMockDossier] = useState(
    "## Key Facts\n- Example fact 1\n- Example fact 2\n\n## Critical Numbers\n- 50% increase in X — [Source] [VERIFIED]"
  );
  const [mockAngle, setMockAngle] = useState("Example narrative angle for testing");

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await fetch(`/api/prompt-templates/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data: PromptTemplate = await res.json();
      setName(data.name);
      setPlatform(data.platform);
      setSystemPrompt(data.systemPrompt);
      setUserFormat(data.userFormat);
      setIsActive(data.isActive);
    } catch {
      toast.error("Template not found");
      router.push("/prompt-library");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!isNew) fetchTemplate();
    // Fetch brands for playground
    fetch("/api/brands")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.brands ?? [];
        setBrands(list);
        if (list.length > 0) setSelectedBrandId(list[0].id);
      })
      .catch(() => {});
  }, [isNew, fetchTemplate]);

  async function handleSave() {
    if (!name.trim() || !systemPrompt.trim() || !userFormat.trim()) {
      toast.error("Name, system prompt, and user format are required");
      return;
    }
    setSaving(true);
    try {
      const url = isNew ? "/api/prompt-templates" : `/api/prompt-templates/${id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, name, systemPrompt, userFormat, isActive }),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      toast.success(isNew ? "Template created" : "Template saved");
      if (isNew) router.push(`/prompt-library/${saved.id}`);
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    const brand = brands.find((b) => b.id === selectedBrandId);
    const brandName = brand?.name ?? "Test Brand";
    const brandTone = brand?.tone ?? "informative";
    const voiceRules = brand
      ? Array.isArray(brand.voiceRules)
        ? (brand.voiceRules as string[]).join("; ")
        : JSON.stringify(brand.voiceRules)
      : "Be factual and precise.";
    const language = brand?.language ?? "English";

    // Build the prompts with placeholder replacement
    const replacePlaceholders = (text: string) =>
      text
        .replace(/\{\{narrativeAngle\}\}/g, mockAngle)
        .replace(/\{\{trendHeadline\}\}/g, mockAngle)
        .replace(/\{\{brandName\}\}/g, brandName)
        .replace(/\{\{brandTone\}\}/g, brandTone)
        .replace(/\{\{voiceRules\}\}/g, voiceRules)
        .replace(/\{\{language\}\}/g, language)
        .replace(/\{\{researchResults\}\}/g, mockDossier)
        .replace(/\{\{format\}\}/g, "thread")
        .replace(/\{\{platform\}\}/g, platform);

    const resolvedSystem = replacePlaceholders(systemPrompt);
    const resolvedUser = replacePlaceholders(userFormat);

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/prompt-templates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: resolvedSystem,
          userMessage: resolvedUser,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test failed");
      setTestResult(data.raw);
      toast.success("Prompt tested successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test failed";
      toast.error(msg);
      setTestResult(`Error: ${msg}`);
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/prompt-library"
        className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All Templates
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT — Editor */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isNew ? "New Template" : "Edit Template"}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsActive(!isActive)}
                className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
              >
                {isActive ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Active</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 text-zinc-600" />
                    <span className="text-zinc-500">Inactive</span>
                  </>
                )}
              </button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-semibold"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </Button>
            </div>
          </div>

          {/* Name + Platform */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Contrarian Growth Thread"
                className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 capitalize"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Write the system prompt that defines AI behavior..."
              rows={16}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            />
          </div>

          {/* User Format */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                User Message Format
              </label>
              <span className="text-[10px] text-zinc-600 font-mono">
                Supports placeholders
              </span>
            </div>
            <textarea
              value={userFormat}
              onChange={(e) => setUserFormat(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            />
            <p className="text-[10px] text-zinc-600 mt-1 font-mono whitespace-pre-wrap">
              {PLACEHOLDER_HELP}
            </p>
          </div>
        </div>

        {/* RIGHT — Playground */}
        <div className="lg:w-[420px] shrink-0 space-y-4">
          <Card className="rounded-2xl border-border">
            <CardContent className="p-5">
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Play className="w-4 h-4 text-amber-400" />
                Playground
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block">
                    Brand
                  </label>
                  <select
                    value={selectedBrandId}
                    onChange={(e) => setSelectedBrandId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                    {brands.length === 0 && (
                      <option value="">No brands available</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block">
                    Narrative Angle
                  </label>
                  <input
                    type="text"
                    value={mockAngle}
                    onChange={(e) => setMockAngle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block">
                    Mock Research Dossier
                  </label>
                  <textarea
                    value={mockDossier}
                    onChange={(e) => setMockDossier(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <Button
                  onClick={handleTest}
                  disabled={testing || !systemPrompt.trim()}
                  className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Test Prompt
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Result */}
          {testResult && (
            <Card className="rounded-2xl border-border animate-fade-in">
              <CardContent className="p-5">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                    Result
                  </Badge>
                </h3>
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono max-h-[500px] overflow-y-auto">
                  {testResult}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
