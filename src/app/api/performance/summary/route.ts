import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// GET /api/performance/summary
// Aggregate performance analytics for the strategist agent and dashboard.
//
// Query params:
//   brandName  — filter to a single brand (optional)
//   platform   — filter to a single platform (optional)
//   days       — look-back window in days (default 30)
//
// Response: {
//   timeRange: { from, to, days },
//   totals:    { records, impressions, views, avgEngagementRate, avgCtr },
//   byPlatform:    [ { platform, records, impressions, views, avgEngagementRate } ],
//   byBrand:       [ { brandName, records, impressions, views, avgEngagementRate } ],
//   byContentType: [ { contentType, records, impressions, views, avgEngagementRate } ],
//   topPerforming: [ top 5 records by engagement rate ]
// }
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const brandName = searchParams.get("brandName");
  const platform = searchParams.get("platform");
  const daysParam = searchParams.get("days");

  const days = Math.max(1, Math.min(365, Number(daysParam) || 30));
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  // --- Build the common where clause --------------------------------------
  const where: Record<string, unknown> = {
    recordedAt: { gte: fromDate },
  };
  if (brandName) where.brandName = brandName;
  if (platform) where.platform = platform;

  // --- Fetch matching records ---------------------------------------------
  const records = await prisma.performanceData.findMany({
    where,
    orderBy: { recordedAt: "desc" },
  });

  if (records.length === 0) {
    return NextResponse.json({
      timeRange: { from: fromDate.toISOString(), to: new Date().toISOString(), days },
      totals: { records: 0, impressions: 0, views: 0, avgEngagementRate: 0, avgCtr: 0 },
      byPlatform: [],
      byBrand: [],
      byContentType: [],
      topPerforming: [],
    });
  }

  // --- Helper: aggregate a set of records into a summary row --------------
  function aggregate(subset: typeof records) {
    const total = subset.length;
    const impressions = subset.reduce((s, r) => s + (r.impressions ?? 0), 0);
    const views = subset.reduce((s, r) => s + (r.views ?? 0), 0);

    const engRates = subset.filter((r) => r.engagementRate !== null).map((r) => r.engagementRate!);
    const avgEngagementRate =
      engRates.length > 0
        ? Math.round((engRates.reduce((s, v) => s + v, 0) / engRates.length) * 100) / 100
        : 0;

    const ctrs = subset.filter((r) => r.ctr !== null).map((r) => r.ctr!);
    const avgCtr =
      ctrs.length > 0
        ? Math.round((ctrs.reduce((s, v) => s + v, 0) / ctrs.length) * 100) / 100
        : 0;

    return { records: total, impressions, views, avgEngagementRate, avgCtr };
  }

  // --- Totals --------------------------------------------------------------
  const totals = aggregate(records);

  // --- Group by platform ---------------------------------------------------
  const platformMap = new Map<string, typeof records>();
  for (const r of records) {
    const key = r.platform;
    if (!platformMap.has(key)) platformMap.set(key, []);
    platformMap.get(key)!.push(r);
  }
  const byPlatform = [...platformMap.entries()]
    .map(([p, recs]) => ({ platform: p, ...aggregate(recs) }))
    .sort((a, b) => b.impressions - a.impressions);

  // --- Group by brand ------------------------------------------------------
  const brandMap = new Map<string, typeof records>();
  for (const r of records) {
    const key = r.brandName;
    if (!brandMap.has(key)) brandMap.set(key, []);
    brandMap.get(key)!.push(r);
  }
  const byBrand = [...brandMap.entries()]
    .map(([b, recs]) => ({ brandName: b, ...aggregate(recs) }))
    .sort((a, b) => b.impressions - a.impressions);

  // --- Group by content type -----------------------------------------------
  const typeMap = new Map<string, typeof records>();
  for (const r of records) {
    const key = r.contentType;
    if (!typeMap.has(key)) typeMap.set(key, []);
    typeMap.get(key)!.push(r);
  }
  const byContentType = [...typeMap.entries()]
    .map(([t, recs]) => ({ contentType: t, ...aggregate(recs) }))
    .sort((a, b) => b.impressions - a.impressions);

  // --- Top 5 performing records (by engagement rate) -----------------------
  const topPerforming = [...records]
    .filter((r) => r.engagementRate !== null)
    .sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      platform: r.platform,
      brandName: r.brandName,
      contentType: r.contentType,
      impressions: r.impressions,
      views: r.views,
      engagementRate: r.engagementRate,
      recordedAt: r.recordedAt,
    }));

  return NextResponse.json({
    timeRange: {
      from: fromDate.toISOString(),
      to: new Date().toISOString(),
      days,
    },
    totals,
    byPlatform,
    byBrand,
    byContentType,
    topPerforming,
  });
}
