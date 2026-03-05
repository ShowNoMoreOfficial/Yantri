"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  GitBranch,
  BookOpen,
  ArrowLeft,
  Calendar,
  Signal,
  FileText,
  Loader2,
  Trash2,
  Archive,
  CheckCircle,
  ExternalLink,
  Quote,
  Clock,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NarrativeNode {
  id: string;
  treeId: string;
  signalTitle: string;
  signalScore: number;
  signalData: Record<string, unknown>;
  identifiedAt: string;
}

interface FactDossier {
  id: string;
  treeId: string;
  structuredData: {
    facts?: string[];
    stats?: { label: string; value: string }[];
    quotes?: { text: string; source?: string }[];
    timeline?: { date: string; event: string }[];
  };
  sources: string[];
  rawResearch: string | null;
  lastUpdated: string;
  createdAt: string;
}

interface ContentPiece {
  id: string;
  brandId: string;
  treeId: string | null;
  platform: string;
  status: string;
  bodyText: string;
  postingPlan: unknown;
  visualPrompts: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  brand: {
    id: string;
    name: string;
  };
}

interface NarrativeTreeDetail {
  id: string;
  rootTrend: string;
  summary: string | null;
  status: string;
  nodes: NarrativeNode[];
  dossier: FactDossier | null;
  contentPieces: ContentPiece[];
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function treeStatusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "MERGED":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "ARCHIVED":
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
}

function contentStatusColor(status: string) {
  switch (status) {
    case "PLANNED":
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    case "RESEARCHING":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "DRAFTED":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "APPROVED":
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    case "RELAYED":
      return "bg-violet-500/10 text-violet-400 border-violet-500/20";
    case "PUBLISHED":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "KILLED":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
}

function formatPlatform(platform: string): string {
  return platform
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NarrativeTreeDetailPage() {
  const { treeId } = useParams<{ treeId: string }>();
  const router = useRouter();

  const [tree, setTree] = useState<NarrativeTreeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dossierBuilding, setDossierBuilding] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch(`/api/narrative-trees/${treeId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Narrative tree not found.");
          return;
        }
        throw new Error("Failed to fetch tree");
      }
      const data = await res.json();
      setTree(data);
      setError(null);
    } catch {
      setError("Failed to load narrative tree.");
      toast.error("Failed to load narrative tree");
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  async function updateStatus(newStatus: string) {
    if (!tree) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/narrative-trees/${treeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setTree((prev) => (prev ? { ...prev, status: updated.status } : prev));
      toast.success(`Tree status updated to ${newStatus.toLowerCase()}`);
    } catch {
      toast.error("Failed to update tree status");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/narrative-trees/${treeId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete tree");
      toast.success("Narrative tree deleted");
      router.push("/narrative-trees");
    } catch {
      toast.error("Failed to delete tree");
      setDeleting(false);
    }
  }

  async function buildDossier() {
    setDossierBuilding(true);
    try {
      const res = await fetch("/api/fact-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treeId }),
      });
      if (!res.ok) throw new Error("Failed to build dossier");
      toast.success("Dossier built successfully");
      await fetchTree();
    } catch {
      toast.error("Failed to build dossier. The fact-engine endpoint may not be available yet.");
    } finally {
      setDossierBuilding(false);
    }
  }

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-10 w-72 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────

  if (error || !tree) {
    return (
      <div className="animate-fade-in">
        <Card className="rounded-2xl border-border">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                <GitBranch className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-semibold text-sm">{error || "Tree not found."}</p>
              <Button asChild variant="outline" className="mt-4 border-zinc-700 text-zinc-400 hover:text-foreground">
                <Link href="/narrative-trees">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Trees
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/narrative-trees"
        className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All Trees
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground leading-snug">
              {tree.rootTrend}
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-3">
            <Badge className={`text-[10px] font-bold uppercase tracking-wide border ${treeStatusColor(tree.status)}`}>
              {tree.status}
            </Badge>
            <span className="text-xs text-zinc-600 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Created {formatDate(tree.createdAt)}
            </span>
            <span className="text-xs text-zinc-600 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Updated {formatDate(tree.updatedAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {tree.status === "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-zinc-700 text-zinc-400 hover:text-foreground"
              disabled={statusUpdating}
              onClick={() => updateStatus("ARCHIVED")}
            >
              {statusUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              Archive
            </Button>
          )}
          {tree.status === "ARCHIVED" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              disabled={statusUpdating}
              onClick={() => updateStatus("ACTIVE")}
            >
              {statusUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Reactivate
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-950 border-zinc-800 rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Delete Narrative Tree</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  This will permanently delete &ldquo;{tree.rootTrend}&rdquo; along with all its nodes and dossier.
                  Content pieces linked to this tree will be unlinked but not deleted. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-zinc-700 text-zinc-400 hover:text-foreground hover:bg-zinc-800">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Delete Tree
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Summary */}
      {tree.summary && (
        <Card className="rounded-2xl border-border mb-6">
          <CardContent className="p-5">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Summary</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">{tree.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="rounded-2xl card-hover border-border relative overflow-hidden group">
          <CardContent className="p-5">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Signal className="w-10 h-10" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Signal className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nodes</span>
            </div>
            <div className="text-3xl font-black text-foreground">{tree.nodes.length}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl card-hover border-border relative overflow-hidden group">
          <CardContent className="p-5">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <BookOpen className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-1.5 rounded-lg ${tree.dossier ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800/50 text-zinc-500"}`}>
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Dossier</span>
            </div>
            <div className={`text-sm font-bold ${tree.dossier ? "text-emerald-400" : "text-zinc-600"}`}>
              {tree.dossier ? "Ready" : "Not built"}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl card-hover border-border relative overflow-hidden group">
          <CardContent className="p-5">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-10 h-10 text-blue-400" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Content</span>
            </div>
            <div className="text-3xl font-black text-blue-400">{tree.contentPieces.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="nodes" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-white/5 rounded-xl p-1 mb-6">
          <TabsTrigger
            value="nodes"
            className="rounded-lg text-xs font-bold data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-black/20 text-zinc-500 px-4 py-2"
          >
            <Signal className="w-3.5 h-3.5 mr-2" />
            Nodes ({tree.nodes.length})
          </TabsTrigger>
          <TabsTrigger
            value="dossier"
            className="rounded-lg text-xs font-bold data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-black/20 text-zinc-500 px-4 py-2"
          >
            <BookOpen className="w-3.5 h-3.5 mr-2" />
            Dossier
          </TabsTrigger>
          <TabsTrigger
            value="content"
            className="rounded-lg text-xs font-bold data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-black/20 text-zinc-500 px-4 py-2"
          >
            <FileText className="w-3.5 h-3.5 mr-2" />
            Content ({tree.contentPieces.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Nodes Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="nodes">
          {tree.nodes.length === 0 ? (
            <Card className="rounded-2xl border-border">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                    <Signal className="w-7 h-7 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 font-semibold text-sm">No nodes in this tree.</p>
                  <p className="text-zinc-600 text-xs mt-1">Nodes are added when new signals match this narrative cluster.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tree.nodes.map((node, index) => {
                const signalData = node.signalData as Record<string, unknown>;
                return (
                  <Card key={node.id} className="rounded-2xl border-border card-hover group animate-fade-in">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Timeline indicator */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`w-3 h-3 rounded-full ${index === 0 ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-zinc-700"}`} />
                          {index < tree.nodes.length - 1 && (
                            <div className="w-px h-full min-h-[40px] bg-zinc-800 mt-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="text-sm font-bold text-foreground group-hover:text-indigo-300 transition-colors leading-snug">
                              {node.signalTitle}
                            </h4>
                            <div className="flex items-center gap-2 shrink-0">
                              {node.signalScore > 0 && (
                                <Badge variant="outline" className="text-[10px] font-bold border-zinc-700 text-zinc-400">
                                  Score: {node.signalScore}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Signal details */}
                          {typeof signalData.reason === "string" && signalData.reason && (
                            <p className="text-xs text-zinc-500 leading-relaxed mb-2">
                              {signalData.reason}
                            </p>
                          )}

                          {typeof signalData.source === "string" && signalData.source.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 mb-2">
                              <ExternalLink className="w-3 h-3" />
                              <span className="truncate">{signalData.source}</span>
                            </div>
                          )}

                          <span className="text-[10px] font-medium text-zinc-600 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(node.identifiedAt)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Dossier Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="dossier">
          {!tree.dossier ? (
            <Card className="rounded-2xl border-border">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-7 h-7 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 font-semibold text-sm">No dossier built yet.</p>
                  <p className="text-zinc-600 text-xs mt-1.5 max-w-sm mb-6">
                    Build a fact dossier to extract structured data, quotes, and a timeline from all signals in this tree.
                  </p>
                  <Button
                    onClick={buildDossier}
                    disabled={dossierBuilding}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-900/20"
                  >
                    {dossierBuilding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Build Dossier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <DossierView dossier={tree.dossier} />
          )}
        </TabsContent>

        {/* ── Content Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="content">
          {tree.contentPieces.length === 0 ? (
            <Card className="rounded-2xl border-border">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-7 h-7 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 font-semibold text-sm">No content pieces linked to this tree.</p>
                  <p className="text-zinc-600 text-xs mt-1.5 max-w-sm mb-6">
                    Generate content from this narrative tree to create platform-specific deliverables.
                  </p>
                  <Button
                    variant="outline"
                    className="gap-2 border-zinc-700 text-zinc-400 hover:text-foreground"
                    disabled
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Content
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tree.contentPieces.map((piece) => (
                <Card key={piece.id} className="rounded-2xl border-border card-hover group animate-fade-in">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs font-bold bg-zinc-800 text-zinc-300 border-0">
                          {piece.brand.name}
                        </Badge>
                        <Badge className={`text-[10px] font-bold uppercase tracking-wide border ${contentStatusColor(piece.status)}`}>
                          {piece.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 border-zinc-700">
                          {formatPlatform(piece.platform)}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3 mb-3">
                      {piece.bodyText}
                    </p>

                    <div className="flex items-center gap-4 text-[10px] text-zinc-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Created {formatDate(piece.createdAt)}
                      </span>
                      {piece.publishedAt && (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle className="w-3 h-3" />
                          Published {formatDate(piece.publishedAt)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Dossier Sub-Component ──────────────────────────────────────────────────

function DossierView({ dossier }: { dossier: FactDossier }) {
  const data = dossier.structuredData;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          Built {formatDate(dossier.createdAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Updated {formatDate(dossier.lastUpdated)}
        </span>
        {dossier.sources.length > 0 && (
          <span className="flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3" />
            {dossier.sources.length} source{dossier.sources.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Facts */}
      {data.facts && data.facts.length > 0 && (
        <Card className="rounded-2xl border-border">
          <CardContent className="p-5">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Key Facts
            </h3>
            <ul className="space-y-2.5">
              {data.facts.map((fact, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-300 leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                  {fact}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {data.stats && data.stats.length > 0 && (
        <Card className="rounded-2xl border-border">
          <CardContent className="p-5">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              Statistics
            </h3>
            <div className="divide-y divide-white/5">
              {data.stats.map((stat, i) => (
                <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <span className="text-sm text-zinc-400">{stat.label}</span>
                  <span className="text-sm font-bold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quotes */}
      {data.quotes && data.quotes.length > 0 && (
        <Card className="rounded-2xl border-border">
          <CardContent className="p-5">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Quote className="w-3.5 h-3.5 text-violet-400" />
              Quotes
            </h3>
            <div className="space-y-4">
              {data.quotes.map((quote, i) => (
                <div key={i} className="pl-4 border-l-2 border-violet-500/30">
                  <p className="text-sm text-zinc-300 leading-relaxed italic">
                    &ldquo;{quote.text}&rdquo;
                  </p>
                  {quote.source && (
                    <p className="text-xs text-zinc-500 mt-1.5 font-semibold">
                      -- {quote.source}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {data.timeline && data.timeline.length > 0 && (
        <Card className="rounded-2xl border-border">
          <CardContent className="p-5">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Timeline
            </h3>
            <div className="space-y-3">
              {data.timeline.map((entry, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]" : "bg-zinc-700"}`} />
                    {i < data.timeline!.length - 1 && (
                      <div className="w-px h-full min-h-[24px] bg-zinc-800 mt-1" />
                    )}
                  </div>
                  <div className="pb-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{entry.date}</span>
                    <p className="text-sm text-zinc-300 leading-relaxed mt-0.5">{entry.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources */}
      {dossier.sources.length > 0 && (
        <Card className="rounded-2xl border-border">
          <CardContent className="p-5">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              Sources
            </h3>
            <ScrollArea className="max-h-48">
              <ul className="space-y-2">
                {dossier.sources.map((source, i) => (
                  <li key={i} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors truncate">
                    <a href={source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{source}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Raw Research */}
      {dossier.rawResearch && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-wider transition-colors">
            View Raw Research
          </summary>
          <Card className="rounded-2xl border-border mt-3">
            <CardContent className="p-5">
              <ScrollArea className="max-h-96">
                <pre className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap font-mono">
                  {dossier.rawResearch}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </details>
      )}
    </div>
  );
}
