import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  BookOpen,
  Zap,
  ArrowRight,
  TreePine,
} from "lucide-react";
import NarrativeTreeFilters from "./filters";

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
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { nodes: true } },
      dossier: { select: { id: true } },
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Narrative Trees</h1>
          <p className="text-muted-foreground mt-1">
            Semantic clusters of signals forming evolving storylines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-zinc-400 border-zinc-700 font-semibold px-3 py-1.5">
            {trees.length} tree{trees.length !== 1 ? "s" : ""}
          </Badge>
          <Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-lg shadow-indigo-900/20">
            <Link href="/dashboard">
              <Zap className="w-4 h-4" />
              Ingest Signals
            </Link>
          </Button>
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
                  ? `No ${currentFilter.toLowerCase()} narrative trees found.`
                  : "No narrative trees yet."}
              </p>
              <p className="text-zinc-600 text-xs mt-1.5 max-w-sm">
                Trees are created automatically when signals are ingested and clustered by semantic similarity.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tree Cards Grid */}
      {trees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trees.map((tree) => (
            <Link key={tree.id} href={`/narrative-trees/${tree.id}`}>
              <Card className="rounded-2xl card-hover border-border group h-full animate-fade-in">
                <CardContent className="p-5 flex flex-col h-full">
                  {/* Title + Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-indigo-300 transition-colors leading-snug">
                      {tree.rootTrend}
                    </h3>
                    <Badge className={`shrink-0 text-[10px] font-bold uppercase tracking-wide border ${treeStatusColor(tree.status)}`}>
                      {tree.status}
                    </Badge>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span className="font-semibold">
                        {tree._count.nodes} node{tree._count.nodes !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <BookOpen className="w-3.5 h-3.5" />
                      {tree.dossier ? (
                        <span className="text-emerald-400 font-semibold">Dossier ready</span>
                      ) : (
                        <span className="text-zinc-600 font-semibold">No dossier</span>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {tree.summary && (
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-3 flex-1">
                      {tree.summary}
                    </p>
                  )}
                  {!tree.summary && <div className="flex-1" />}

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
