import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  BookOpen,
  ArrowRight,
  TreePine,
  FileText,
  Signal,
} from "lucide-react";
import NarrativeTreeFilters from "./filters";
import ClusterButton from "./ClusterButton";

export const dynamic = "force-dynamic";

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

async function getTrees(status?: string) {
  const where: Record<string, unknown> = {};
  if (status && status !== "all") {
    where.status = status;
  }

  const trees = await prisma.narrativeTree.findMany({
    where,
    // Sort by most recently updated (most active) first
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { nodes: true, contentPieces: true } },
      dossier: { select: { id: true } },
      // Fetch the 3 most recent nodes for the mini sub-trend list
      nodes: {
        orderBy: { identifiedAt: "desc" },
        take: 3,
        select: { id: true, signalTitle: true, identifiedAt: true },
      },
    },
  });

  return trees;
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function NarrativeTreesPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const currentFilter = status || "all";
  const trees = await getTrees(currentFilter);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Narrative Clusters</h1>
          <p className="text-muted-foreground mt-1">
            Active narrative trees sorted by signal activity. Hottest narratives first.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-zinc-400 border-zinc-700 font-semibold px-3 py-1.5">
            {trees.length} cluster{trees.length !== 1 ? "s" : ""}
          </Badge>
          <ClusterButton />
        </div>
      </div>

      {/* Filter Tabs */}
      <NarrativeTreeFilters currentFilter={currentFilter} />

      {/* Empty State */}
      {trees.length === 0 && (
        <Card className="rounded-2xl border-border">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                <TreePine className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-semibold text-sm">
                {currentFilter !== "all"
                  ? `No ${currentFilter.toLowerCase()} narrative clusters found.`
                  : "No narrative clusters yet."}
              </p>
              <p className="text-zinc-600 text-xs mt-1.5 max-w-sm">
                Clusters are created automatically when signals are ingested and grouped by semantic similarity.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tree Cluster Cards */}
      {trees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trees.map((tree) => (
            <Link key={tree.id} href={`/narrative-trees/${tree.id}`}>
              <Card className="rounded-2xl card-hover border-border group h-full animate-fade-in">
                <CardContent className="p-5 flex flex-col h-full">
                  {/* Root Trend Title + Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0 mt-0.5">
                        <TreePine className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-indigo-300 transition-colors leading-snug">
                        {tree.rootTrend}
                      </h3>
                    </div>
                    <Badge className={`shrink-0 text-[10px] font-bold uppercase tracking-wide border ${treeStatusColor(tree.status)}`}>
                      {tree.status}
                    </Badge>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Signal className="w-3.5 h-3.5" />
                      <span className="font-semibold">
                        {tree._count.nodes} signal{tree._count.nodes !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <BookOpen className="w-3.5 h-3.5" />
                      {tree.dossier ? (
                        <span className="text-emerald-400 font-semibold">Dossier</span>
                      ) : (
                        <span className="text-zinc-600 font-semibold">No dossier</span>
                      )}
                    </div>
                    {tree._count.contentPieces > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-400">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="font-semibold">
                          {tree._count.contentPieces} piece{tree._count.contentPieces !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Recent Sub-Trends (Nodes) Mini-List */}
                  {tree.nodes.length > 0 && (
                    <div className="mb-3 flex-1">
                      <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">
                        Recent Signals
                      </div>
                      <div className="space-y-1.5">
                        {tree.nodes.map((node) => (
                          <div key={node.id} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1.5 shrink-0" />
                            <span className="text-xs text-zinc-400 line-clamp-1 leading-relaxed">
                              {node.signalTitle}
                            </span>
                          </div>
                        ))}
                        {tree._count.nodes > 3 && (
                          <span className="text-[10px] text-zinc-600 font-medium pl-3.5">
                            +{tree._count.nodes - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {tree.nodes.length === 0 && (
                    <div className="flex-1">
                      {tree.summary && (
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-3">
                          {tree.summary}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] font-medium text-zinc-600">
                      Updated{" "}
                      {new Date(tree.updatedAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
