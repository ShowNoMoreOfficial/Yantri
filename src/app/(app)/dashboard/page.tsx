import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [trendsToday, narrativesInProgress, publishedThisWeek, recentLogs] =
    await Promise.all([
      prisma.trend.count({ where: { createdAt: { gte: today } } }),
      prisma.narrative.count({
        where: { status: { in: ["planned", "researching", "producing"] } },
      }),
      prisma.narrative.count({
        where: {
          status: "published",
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.editorialLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  return { trendsToday, narrativesInProgress, publishedThisWeek, recentLogs };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-3xl font-bold">{stats.trendsToday}</div>
          <div className="text-sm text-gray-500 mt-1">Trends imported today</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-3xl font-bold">{stats.narrativesInProgress}</div>
          <div className="text-sm text-gray-500 mt-1">Narratives in production</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-3xl font-bold">{stats.publishedThisWeek}</div>
          <div className="text-sm text-gray-500 mt-1">Published this week</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a
              href="/trends/import"
              className="block px-4 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors text-center"
            >
              Import Trends
            </a>
            <a
              href="/brands"
              className="block px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center"
            >
              View Brands
            </a>
            <a
              href="/platform-rules"
              className="block px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center"
            >
              View Platform Rules
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {stats.recentLogs.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet. Import some trends to get started.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      log.action === "selected"
                        ? "bg-green-500"
                        : log.action === "skipped"
                        ? "bg-gray-400"
                        : log.action === "published"
                        ? "bg-blue-500"
                        : "bg-yellow-500"
                    }`}
                  />
                  <div>
                    <span className="font-medium">{log.action}</span>
                    {" — "}
                    <span className="text-gray-600">{log.trendHeadline}</span>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
