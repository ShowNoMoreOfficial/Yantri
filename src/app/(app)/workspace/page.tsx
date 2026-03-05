"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  Inbox,
  RefreshCw,
  Loader2,
  Play,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Narrative {
  id: string;
  angle: string;
  whyThisAngle: string;
  informationGap: string;
  priority: number;
  platform: string;
  secondaryPlatform: string | null;
  format: string;
  urgency: string;
  status: string;
  finalContent: string | null;
  packageData: string | null;
  createdAt: string;
  updatedAt: string;
  brand: {
    id: string;
    name: string;
  };
  trend: {
    id: string;
    headline: string;
  };
}

interface ContentPiece {
  id: string;
  platform: string;
  status: string;
  bodyText: string;
  treeId: string | null;
  createdAt: string;
  updatedAt: string;
  brand: {
    id: string;
    name: string;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function platformColor(platform: string): string {
  const colors: Record<string, string> = {
    youtube: "bg-red-500/10 text-red-400 border-red-500/20",
    x_thread: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    x_single: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    blog: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    linkedin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    meta_reel: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    meta_carousel: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    meta_post: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    tiktok: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    newsletter: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return colors[platform.toLowerCase()] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
}

function formatPlatform(platform: string): string {
  return platform
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  // Legacy narrative approval state
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [selectedNarrative, setSelectedNarrative] = useState<Narrative | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Pipeline state
  const [plannedPieces, setPlannedPieces] = useState<ContentPiece[]>([]);
  const [plannedLoading, setPlannedLoading] = useState(true);
  const [selectedPieceIds, setSelectedPieceIds] = useState<Set<string>>(new Set());
  const [pipelineRunning, setPipelineRunning] = useState(false);

  // ── Fetch narratives (existing approval flow) ───────────────────────────

  const fetchNarratives = useCallback(async () => {
    try {
      const res = await fetch("/api/narratives?status=producing");
      if (!res.ok) throw new Error("Failed to fetch narratives");
      const data = await res.json();
      setNarratives(data);
    } catch {
      toast.error("Failed to load narratives");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch planned content pieces ────────────────────────────────────────

  const fetchPlannedPieces = useCallback(async () => {
    try {
      const res = await fetch("/api/content-pieces?status=PLANNED");
      if (!res.ok) throw new Error("Failed to fetch content pieces");
      const data = await res.json();
      setPlannedPieces(data);
    } catch {
      toast.error("Failed to load planned content pieces");
    } finally {
      setPlannedLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNarratives();
    fetchPlannedPieces();
  }, [fetchNarratives, fetchPlannedPieces]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNarratives();
      fetchPlannedPieces();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNarratives, fetchPlannedPieces]);

  // ── Pipeline controls ───────────────────────────────────────────────────

  function togglePieceSelection(id: string) {
    setSelectedPieceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllPieces() {
    if (selectedPieceIds.size === plannedPieces.length) {
      setSelectedPieceIds(new Set());
    } else {
      setSelectedPieceIds(new Set(plannedPieces.map((p) => p.id)));
    }
  }

  async function runPipeline() {
    if (selectedPieceIds.size === 0) {
      toast.error("Select at least one content piece to run the pipeline");
      return;
    }

    setPipelineRunning(true);
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentPieceIds: Array.from(selectedPieceIds),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to trigger pipeline");
      }

      const data = await res.json();
      toast.success(
        `Pipeline triggered for ${data.triggered} content piece${data.triggered > 1 ? "s" : ""}`
      );

      // Clear selection and refresh
      setSelectedPieceIds(new Set());
      setPlannedLoading(true);
      fetchPlannedPieces();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to trigger pipeline"
      );
    } finally {
      setPipelineRunning(false);
    }
  }

  // ── Narrative approval actions ──────────────────────────────────────────

  async function updateStatus(narrativeId: string, newStatus: string, label: string) {
    setActionLoading((prev) => ({ ...prev, [narrativeId]: newStatus }));
    try {
      const res = await fetch(`/api/narratives/${narrativeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          reason: `Workspace: ${label}`,
        }),
      });

      if (!res.ok) throw new Error("Failed to update narrative");

      // Remove the narrative from the list optimistically
      setNarratives((prev) => prev.filter((n) => n.id !== narrativeId));

      // Close the dialog if it's showing this narrative
      if (selectedNarrative?.id === narrativeId) {
        setDialogOpen(false);
        setSelectedNarrative(null);
      }

      if (newStatus === "published") {
        toast.success("Narrative approved and published");
      } else if (newStatus === "killed") {
        toast.error("Narrative killed");
      } else if (newStatus === "planned") {
        toast.info("Narrative sent back to draft");
      }
    } catch {
      toast.error(`Failed to ${label.toLowerCase()}`);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[narrativeId];
        return next;
      });
    }
  }

  function getContentPreview(narrative: Narrative): string {
    const content = narrative.finalContent || narrative.packageData || "";
    if (!content) return "No content generated yet.";
    return content.length > 200 ? content.slice(0, 200) + "..." : content;
  }

  function getFullContent(narrative: Narrative): string {
    return narrative.finalContent || narrative.packageData || "No content available.";
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Workspace</h1>
          <p className="text-muted-foreground mt-1">Run the pipeline, review, approve, or kill content.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-zinc-400 border-zinc-700 font-semibold px-3 py-1.5">
            {loading ? "..." : narratives.length} pending review
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              setPlannedLoading(true);
              fetchNarratives();
              fetchPlannedPieces();
            }}
            className="gap-2 border-zinc-700 text-zinc-400 hover:text-foreground"
          >
            <RefreshCw className={`w-4 h-4 ${loading || plannedLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Run Pipeline Section ─────────────────────────────────────────── */}
      <Card className="rounded-2xl border-border">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Content Pipeline</h2>
                <p className="text-xs text-zinc-500">
                  Select planned pieces and run the full pipeline: research, generate, visuals, package.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {plannedPieces.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllPieces}
                  className="text-xs text-zinc-400 hover:text-foreground"
                >
                  {selectedPieceIds.size === plannedPieces.length ? "Deselect All" : "Select All"}
                </Button>
              )}
              <Button
                size="sm"
                disabled={selectedPieceIds.size === 0 || pipelineRunning}
                onClick={runPipeline}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-900/20"
              >
                {pipelineRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Run Pipeline{selectedPieceIds.size > 0 ? ` (${selectedPieceIds.size})` : ""}
              </Button>
            </div>
          </div>

          {/* Planned pieces loading */}
          {plannedLoading && plannedPieces.length === 0 && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          )}

          {/* No planned pieces */}
          {!plannedLoading && plannedPieces.length === 0 && (
            <div className="flex items-center justify-center py-8 text-center">
              <p className="text-xs text-zinc-600">
                No planned content pieces. Create content pieces with PLANNED status to run the pipeline.
              </p>
            </div>
          )}

          {/* Planned pieces list */}
          {!plannedLoading && plannedPieces.length > 0 && (
            <div className="space-y-1.5">
              {plannedPieces.map((piece) => (
                <label
                  key={piece.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedPieceIds.has(piece.id)
                      ? "bg-indigo-500/5 border border-indigo-500/20"
                      : "bg-zinc-900/50 border border-transparent hover:bg-zinc-800/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedPieceIds.has(piece.id)}
                    onCheckedChange={() => togglePieceSelection(piece.id)}
                  />
                  <Badge variant="secondary" className="text-[10px] font-bold bg-zinc-800 text-zinc-300 border-0 shrink-0">
                    {piece.brand.name}
                  </Badge>
                  <Badge className={`text-[10px] font-bold uppercase tracking-wide border shrink-0 ${platformColor(piece.platform)}`}>
                    {formatPlatform(piece.platform)}
                  </Badge>
                  <span className="text-xs text-zinc-400 truncate flex-1">
                    {piece.bodyText.length > 120 ? piece.bodyText.slice(0, 120) + "..." : piece.bodyText}
                  </span>
                  {piece.treeId && (
                    <Badge variant="outline" className="text-[9px] text-zinc-600 border-zinc-800 shrink-0">
                      Tree-linked
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Approval Section (existing) ─────────────────────────────────── */}

      {/* Loading State */}
      {loading && narratives.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-2xl border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && narratives.length === 0 && (
        <Card className="rounded-2xl border-border">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-semibold text-sm">Nothing to review right now.</p>
              <p className="text-zinc-600 text-xs mt-1.5 max-w-sm">
                Narratives with &quot;producing&quot; status will appear here for approval. Run the content pipeline to generate new pieces.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Narrative Cards Grid */}
      {!loading && narratives.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {narratives.map((narrative) => {
            const isActioning = !!actionLoading[narrative.id];
            const currentAction = actionLoading[narrative.id];

            return (
              <Card key={narrative.id} className="rounded-2xl border-border card-hover group animate-fade-in">
                <CardContent className="p-5 flex flex-col h-full">
                  {/* Brand + Platform */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="secondary" className="text-xs font-bold bg-zinc-800 text-zinc-300 border-0">
                      {narrative.brand.name}
                    </Badge>
                    <Badge className={`text-[10px] font-bold uppercase tracking-wide border ${platformColor(narrative.platform)}`}>
                      {formatPlatform(narrative.platform)}
                    </Badge>
                    {narrative.urgency === "breaking" && (
                      <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 border text-[10px] font-bold uppercase tracking-wide">
                        Breaking
                      </Badge>
                    )}
                  </div>

                  {/* Trend Headline */}
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    {narrative.trend.headline}
                  </p>

                  {/* Angle as Title */}
                  <h3 className="text-sm font-bold text-foreground mb-3 line-clamp-2 group-hover:text-indigo-300 transition-colors leading-snug">
                    {narrative.angle}
                  </h3>

                  {/* Content Preview */}
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-4 mb-4 flex-1">
                    {getContentPreview(narrative)}
                  </p>

                  {/* View Full Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mb-3 text-xs text-zinc-400 hover:text-foreground hover:bg-zinc-800/50 gap-2"
                    onClick={() => {
                      setSelectedNarrative(narrative);
                      setDialogOpen(true);
                    }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Full Content
                  </Button>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-lg shadow-emerald-900/20"
                      disabled={isActioning}
                      onClick={() => updateStatus(narrative.id, "published", "Approve")}
                    >
                      {currentAction === "published" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 font-semibold text-xs gap-1.5"
                      disabled={isActioning}
                      onClick={() => updateStatus(narrative.id, "killed", "Kill")}
                    >
                      {currentAction === "killed" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      Kill
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 font-semibold text-xs gap-1.5"
                      disabled={isActioning}
                      onClick={() => updateStatus(narrative.id, "planned", "Back to Draft")}
                    >
                      {currentAction === "planned" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      Draft
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Content Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[85vh] bg-zinc-950 border-zinc-800 rounded-2xl">
          {selectedNarrative && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs font-bold bg-zinc-800 text-zinc-300 border-0">
                    {selectedNarrative.brand.name}
                  </Badge>
                  <Badge className={`text-[10px] font-bold uppercase tracking-wide border ${platformColor(selectedNarrative.platform)}`}>
                    {formatPlatform(selectedNarrative.platform)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 border-zinc-700">
                    {selectedNarrative.format}
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground leading-snug">
                  {selectedNarrative.angle}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 mt-1">
                  Trend: {selectedNarrative.trend.headline}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[50vh] pr-4">
                <div className="space-y-4 py-2">
                  {selectedNarrative.whyThisAngle && (
                    <div>
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Why This Angle</h4>
                      <p className="text-sm text-zinc-300 leading-relaxed">{selectedNarrative.whyThisAngle}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Content</h4>
                    <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-[inherit]">
                      {getFullContent(selectedNarrative)}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-zinc-800">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm gap-2 shadow-lg shadow-emerald-900/20"
                  disabled={!!actionLoading[selectedNarrative.id]}
                  onClick={() => updateStatus(selectedNarrative.id, "published", "Approve")}
                >
                  {actionLoading[selectedNarrative.id] === "published" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve & Publish
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 font-semibold text-sm gap-2"
                  disabled={!!actionLoading[selectedNarrative.id]}
                  onClick={() => updateStatus(selectedNarrative.id, "killed", "Kill")}
                >
                  {actionLoading[selectedNarrative.id] === "killed" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Kill
                </Button>
                <Button
                  variant="ghost"
                  className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 font-semibold text-sm gap-2"
                  disabled={!!actionLoading[selectedNarrative.id]}
                  onClick={() => updateStatus(selectedNarrative.id, "planned", "Back to Draft")}
                >
                  {actionLoading[selectedNarrative.id] === "planned" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Draft
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
