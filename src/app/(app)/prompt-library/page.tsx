"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Plus,
  CheckCircle,
  Circle,
  Loader2,
  Trash2,
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

const PLATFORMS = ["twitter", "youtube", "blog", "meta", "linkedin"];

function platformColor(platform: string) {
  switch (platform) {
    case "twitter":
      return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    case "youtube":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "blog":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "meta":
      return "bg-pink-500/10 text-pink-400 border-pink-500/20";
    case "linkedin":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
}

export default function PromptLibraryPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/prompt-templates");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTemplates(data);
    } catch {
      toast.error("Failed to load prompt templates");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, currentlyActive: boolean) {
    try {
      const res = await fetch(`/api/prompt-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentlyActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(currentlyActive ? "Template deactivated" : "Template activated");
      fetchTemplates();
    } catch {
      toast.error("Failed to update template");
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/prompt-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Template deleted");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("Failed to delete template");
    } finally {
      setDeleting(null);
    }
  }

  const filtered =
    filter === "all"
      ? templates
      : templates.filter((t) => t.platform === filter);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Prompt Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage AI prompts for each platform. Set one active per platform for production use.
          </p>
        </div>
        <Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-semibold">
          <Link href="/prompt-library/new">
            <Plus className="w-4 h-4" />
            New Template
          </Link>
        </Button>
      </div>

      {/* Platform Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-xs font-bold tracking-wider rounded transition-all ${
            filter === "all"
              ? "bg-amber-400 text-zinc-950"
              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          }`}
        >
          All
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`px-4 py-2 text-xs font-bold tracking-wider rounded capitalize transition-all ${
              filter === p
                ? "bg-amber-400 text-zinc-950"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <Card className="rounded-2xl border-border">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-semibold text-sm">
                {filter !== "all"
                  ? `No ${filter} prompt templates found.`
                  : "No prompt templates yet."}
              </p>
              <p className="text-zinc-600 text-xs mt-1.5 max-w-sm">
                Create a new template to start customizing AI prompts for your content pipeline.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className="rounded-2xl card-hover border-border group h-full animate-fade-in"
            >
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <Link
                      href={`/prompt-library/${t.id}`}
                      className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-indigo-300 transition-colors leading-snug"
                    >
                      {t.name}
                    </Link>
                  </div>
                  <Badge
                    className={`shrink-0 text-[10px] font-bold uppercase tracking-wide border ${platformColor(t.platform)}`}
                  >
                    {t.platform}
                  </Badge>
                </div>

                <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed mb-3 flex-1">
                  {t.systemPrompt.slice(0, 200)}...
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(t.id, t.isActive)}
                      className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                    >
                      {t.isActive ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Active</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-3.5 h-3.5 text-zinc-600" />
                          <span className="text-zinc-600 hover:text-zinc-400">
                            Inactive
                          </span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                      className="text-zinc-600 hover:text-rose-400 transition-colors"
                    >
                      {deleting === t.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] font-medium text-zinc-600">
                    {new Date(t.updatedAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
