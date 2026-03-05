import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  FileText,
  Plus,
  Zap,
  Users,
  Settings,
  ChevronRight,
  GitBranch,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    trendsToday,
    narrativesInProgress,
    publishedThisWeek,
    recentLogs,
    latestBatch,
    totalNarratives,
  ] = await Promise.all([
    prisma.trend.count({ where: { createdAt: { gte: today } } }),
    prisma.narrative.count({
      where: { status: { in: ["planned", "researching", "producing"] } },
    }),
    prisma.narrative.count({
      where: { status: "published", updatedAt: { gte: weekAgo } },
    }),
    prisma.editorialLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.trendBatch.findFirst({
      orderBy: { importedAt: "desc" },
      select: { id: true, importedAt: true, _count: { select: { trends: true } } },
    }),
    prisma.narrative.count(),
  ]);

  return {
    trendsToday,
    narrativesInProgress,
    publishedThisWeek,
    recentLogs,
    latestBatch,
    totalNarratives,
  };
}

async function getNarrativeTrees() {
  const trees = await prisma.narrativeTree.findMany({
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: {
      _count: { select: { nodes: true } },
      dossier: { select: { id: true } },
    },
  });

  return trees;
}

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

export default async function DashboardPage() {
  const [stats, trees] = await Promise.all([getStats(), getNarrativeTrees()]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your narrative intelligence pipeline.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/20">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-dot" />
          System Live
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card className="rounded-2xl card-hover relative overflow-hidden group border-border">
          <CardContent className="p-6">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-12 h-12" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-zinc-800/50 rounded-lg text-zinc-300">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Trends Today</span>
            </div>
            <div className="text-4xl font-black text-foreground">{stats.trendsToday}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl card-hover relative overflow-hidden group border-border">
          <CardContent className="p-6">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-12 h-12 text-amber-400" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">In Production</span>
            </div>
            <div className="text-4xl font-black text-amber-400">{stats.narrativesInProgress}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl card-hover relative overflow-hidden group border-border">
          <CardContent className="p-6">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Published Week</span>
            </div>
            <div className="text-4xl font-black text-emerald-400">{stats.publishedThisWeek}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl card-hover relative overflow-hidden group border-border">
          <CardContent className="p-6">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-12 h-12 text-blue-400" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Output</span>
            </div>
            <div className="text-4xl font-black text-blue-400">{stats.totalNarratives}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Narrative Trees */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Active Narrative Trees</h2>
          </div>
          {trees.length > 0 && (
            <Link href="/trends" className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider transition-colors">
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {trees.length === 0 ? (
          <Card className="rounded-2xl border-border">
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                  <GitBranch className="w-8 h-8 text-zinc-600" />
                </div>
                <p className="text-zinc-500 font-medium text-sm">No narrative trees yet.</p>
                <p className="text-zinc-600 text-xs mt-1">Trees will appear here as signals are clustered into narratives.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trees.map((tree) => (
              <Card key={tree.id} className="rounded-2xl card-hover border-border group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-indigo-300 transition-colors leading-snug">
                      {tree.rootTrend}
                    </h3>
                    <Badge className={`shrink-0 text-[10px] font-bold uppercase tracking-wide border ${treeStatusColor(tree.status)}`}>
                      {tree.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span className="font-semibold">{tree._count.nodes} node{tree._count.nodes !== 1 ? "s" : ""}</span>
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

                  {tree.summary && (
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-3">
                      {tree.summary}
                    </p>
                  )}

                  <div className="text-[10px] font-medium text-zinc-600">
                    Updated {new Date(tree.updatedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-bold text-foreground mb-2">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <Button asChild className="h-auto p-4 rounded-xl font-semibold shadow-lg shadow-black/20 justify-between group">
              <Link href="/trends/import">
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                  Import Trends
                </div>
                <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Link>
            </Button>

            {stats.latestBatch && (
              <Button asChild className="h-auto p-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold shadow-lg shadow-black/20 justify-between group">
                <Link href={`/plan/${stats.latestBatch.id}`}>
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-indigo-300 group-hover:text-white transition-colors" />
                    Latest Batch
                  </div>
                  <span className="bg-indigo-500 text-[10px] px-2 py-0.5 rounded-full">
                    {stats.latestBatch._count.trends} TRENDS
                  </span>
                </Link>
              </Button>
            )}

            <Button asChild variant="outline" className="h-auto p-4 bg-card border-border text-zinc-300 rounded-xl font-semibold hover:bg-zinc-800/50 justify-between group">
              <Link href="/brands">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  View Brands
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 bg-card border-border text-zinc-300 rounded-xl font-semibold hover:bg-zinc-800/50 justify-between group">
              <Link href="/platform-rules">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  Platform Rules
                </div>
              </Link>
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
            <Link href="/history" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider">
              View All History
            </Link>
          </div>
          <Card className="rounded-2xl min-h-[400px] border-border">
            <CardContent className="p-6">
              {stats.recentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-zinc-600" />
                  </div>
                  <p className="text-zinc-500 font-medium text-sm">No recent activity detected.</p>
                  <p className="text-zinc-600 text-xs mt-1">Import some trends to see the editor in action.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-border group animate-fade-in">
                      <div
                        className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform ${log.action === "selected"
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                            : log.action === "skipped"
                              ? "bg-zinc-600"
                              : log.action === "published"
                                ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                                : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                          }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-black uppercase tracking-tight text-zinc-500">{log.action}</span>
                          <span className="text-[10px] font-medium text-zinc-600 group-hover:text-zinc-500 transition-colors">
                            {new Date(log.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-zinc-300 mt-0.5 line-clamp-1 group-hover:text-foreground transition-colors">
                          {log.trendHeadline}
                        </p>
                        {log.reasoning && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2 italic leading-relaxed">
                            {log.reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
