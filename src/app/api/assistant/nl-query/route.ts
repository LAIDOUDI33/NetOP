import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';

const nlQuerySchema = z.object({
  question: z.string().min(1),
  locale: z.enum(['fr', 'en', 'ar']).default('fr'),
});

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

// ── Intent detection + data fetching ──────────────────────────────────

interface QueryResult {
  intent: string;
  summary: string;
  data: Record<string, unknown>;
  chartConfig?: {
    type: 'bar' | 'pie' | 'line' | 'table';
    title: string;
    dataKey: string;
    labelKey?: string;
  };
}

async function processQuery(question: string, locale: string): Promise<QueryResult> {
  const q = question.toLowerCase();

  // ── 1. Top/Bottom wilayas by score ─────────────────────────────────
  if (/top\s*(\d+).*wilaya|meilleur.*wilaya|best.*wilaya|أفضل.*ولاية/.test(q) ||
      /pire.*wilaya|worst.*wilaya|أسوأ.*ولاية/.test(q)) {
    const isTop = /top|meilleur|best|أفضل/.test(q);
    const match = q.match(/(\d+)/);
    const limit = match ? Math.min(parseInt(match[1]), 20) : 5;

    const wilayas = await db.wilayaProfile.findMany({
      distinct: ['wilayaCode'],
      orderBy: { compositeScore: isTop ? 'desc' : 'asc' },
      take: limit,
    });

    const chartData = wilayas.map(w => ({
      name: w.wilayaName,
      score: Math.round(w.compositeScore),
      network: Math.round(w.networkScore),
      commercial: Math.round(w.commercialScore),
    }));

    return {
      intent: 'ranking',
      summary: locale === 'fr'
        ? `${isTop ? 'Top' : 'Flop'} ${limit} wilayas par score composite`
        : `${isTop ? 'Top' : 'Bottom'} ${limit} wilayas by composite score`,
      data: { wilayas: chartData, count: chartData.length },
      chartConfig: { type: 'bar', title: isTop ? 'Top Wilayas' : 'Bottom Wilayas', dataKey: 'score', labelKey: 'name' },
    };
  }

  // ── 2. Wilaya-specific query ───────────────────────────────────────
  const WILAYA_NAMES = [
    'Alger','Oran','Constantine','Annaba','Sétif','Blida','Batna','Tlemcen',
    'Béjaïa','Tizi Ouzou','Biskra','Djelfa','Médéa','Mostaganem','Mascara',
    'Tiaret','Tébessa','Bordj Bou Arreridj','Boumerdès','El Oued','Skikda',
    'Sidi Bel Abbès','Guelma','Chlef','Jijel','Tipaza','Mila','Aïn Defla',
    'Saïda','Khenchela','Souk Ahras','Laghouat','Ouargla','Tindouf',
    'Tissemsilt','El Bayadh','Ghardaïa','Béchar','Adrar','Naâma','El Tarf',
    'Aïn Témouchent','Relizane','Timimoun','Djanet','In Salah','Tamanrasset',
    'Illizi','Aflou','Barika','El Kantara','Bir El Ater','El Aricha',
    'Ksar Chellala','Béni Abbès','El M\'Ghair','El Meniaa','Aïn Ouessara',
    'Messaad','Ksar El Boukhari','El Abiodh Sidi Cheikh','Touggourt',
    'Ouled Djellal','Bordj Badji Mokhtar','In Guezzam','Bou Saâda',
  ];

  for (const name of WILAYA_NAMES) {
    if (q.includes(name.toLowerCase())) {
      const profile = await db.wilayaProfile.findFirst({
        where: { wilayaName: { contains: name } },
        orderBy: { periodMonth: 'desc' },
      });
      if (!profile) continue;

      const kpiData = [
        { name: 'RSRP (dBm)', value: profile.avgRsrp, threshold: -100, unit: 'dBm' },
        { name: 'SINR (dB)', value: profile.avgSinr, threshold: 5, unit: 'dB' },
        { name: 'Throughput (Mbps)', value: profile.avgThroughputDl, threshold: 15, unit: 'Mbps' },
        { name: 'Availability (%)', value: profile.avgAvailability, threshold: 98, unit: '%' },
        { name: 'Drop Rate (%)', value: profile.avgDropRate, threshold: 2, unit: '%' },
        { name: 'Latency (ms)', value: profile.avgLatencyMs, threshold: 40, unit: 'ms' },
      ];

      return {
        intent: 'wilaya-detail',
        summary: locale === 'fr'
          ? `Profil réseau de ${profile.wilayaName} — Score: ${profile.compositeScore?.toFixed(1)}/100`
          : `Network profile for ${profile.wilayaName} — Score: ${profile.compositeScore?.toFixed(1)}/100`,
        data: {
          wilayaName: profile.wilayaName,
          wilayaCode: profile.wilayaCode,
          cluster: profile.cluster,
          score: profile.compositeScore,
          kpis: kpiData,
          sites: { total: profile.totalSites, active: profile.activeSites, tech4g: profile.tech4gSites, tech3g: profile.tech3gSites, tech2g: profile.tech2gSites },
          commercial: { subscribers: profile.totalSubscribers, arpu: profile.avgArpu, revenue: Number(profile.totalRevenue), churnRate: profile.churnRate, satisfaction: profile.satisfactionScore },
          geomarketing: { population: profile.population, coverageGaps: profile.coverageGaps, churnHotspots: profile.churnHotspots, competitorSites: profile.competitorSites, revenueAtRisk: Number(profile.revenueAtRisk) },
        },
        chartConfig: { type: 'bar', title: `${profile.wilayaName} KPIs`, dataKey: 'value', labelKey: 'name' },
      };
    }
  }

  // ── 3. Cluster comparison ──────────────────────────────────────────
  if (/cluster|compar.*cluster|groupe/.test(q)) {
    const allProfiles = await db.wilayaProfile.findMany({ distinct: ['wilayaCode'] });
    const clusterMap = new Map<string, typeof allProfiles>();
    for (const p of allProfiles) {
      const arr = clusterMap.get(p.cluster) ?? [];
      arr.push(p);
      clusterMap.set(p.cluster, arr);
    }

    const clusterData = Array.from(clusterMap.entries()).map(([name, wilayas]) => ({
      name,
      count: wilayas.length,
      avgScore: Number((wilayas.reduce((s, w) => s + (w.compositeScore ?? 0), 0) / wilayas.length).toFixed(1)),
      avgAvail: Number((wilayas.reduce((s, w) => s + (w.avgAvailability ?? 0), 0) / wilayas.length).toFixed(1)),
      avgChurn: Number((wilayas.reduce((s, w) => s + (w.churnRate ?? 0), 0) / wilayas.length).toFixed(2)),
      totalRevenue: wilayas.reduce((s, w) => s + Number(w.totalRevenue ?? 0), 0),
    })).sort((a, b) => b.avgScore - a.avgScore);

    return {
      intent: 'cluster-comparison',
      summary: locale === 'fr' ? 'Comparaison des 10 clusters' : 'Comparison of 10 clusters',
      data: { clusters: clusterData },
      chartConfig: { type: 'bar', title: 'Cluster Scores', dataKey: 'avgScore', labelKey: 'name' },
    };
  }

  // ── 4. Alert summary ────────────────────────────────────────────────
  if (/alert|alerte|critique|incident/.test(q)) {
    const [critical, warning, info] = await Promise.all([
      db.alert.findMany({ where: { severity: 'critical', resolvedAt: null }, take: 20 }),
      db.alert.findMany({ where: { severity: 'warning', resolvedAt: null }, take: 20 }),
      db.alert.findMany({ where: { severity: 'info', resolvedAt: null }, take: 20 }),
    ]);

    return {
      intent: 'alerts',
      summary: locale === 'fr'
        ? `${critical.length} alertes critiques, ${warning.length} avertissements, ${info.length} infos actives`
        : `${critical.length} critical, ${warning.length} warning, ${info.length} info alerts active`,
      data: {
        critical: critical.map(a => ({ id: a.id, metric: a.metric, value: a.value, threshold: a.threshold, message: a.message, siteId: a.siteId, technology: a.technology, createdAt: a.createdAt.toISOString() })),
        warning: warning.map(a => ({ id: a.id, metric: a.metric, value: a.value, message: a.message, siteId: a.siteId })),
        info: info.map(a => ({ id: a.id, metric: a.metric, message: a.message, siteId: a.siteId })),
      },
      chartConfig: { type: 'pie', title: 'Alerts by Severity', dataKey: 'value', labelKey: 'name' },
    };
  }

  // ── 5. Coverage analysis ────────────────────────────────────────────
  if (/couverture|coverage|trou.*couverture|coverage.*hole/.test(q)) {
    const lowCoverage = await db.wilayaProfile.findMany({
      distinct: ['wilayaCode'],
      where: { coveragePercent: { lt: 85 } },
      orderBy: { coveragePercent: 'asc' },
      take: 15,
    });

    return {
      intent: 'coverage',
      summary: locale === 'fr'
        ? `${lowCoverage.length} wilayas avec couverture < 85%`
        : `${lowCoverage.length} wilayas with coverage < 85%`,
      data: {
        wilayas: lowCoverage.map(w => ({
          name: w.wilayaName,
          coverage: Number(w.coveragePercent?.toFixed(1)),
          gaps: w.coverageGaps,
          score: Number(w.compositeScore?.toFixed(1)),
        })),
      },
      chartConfig: { type: 'bar', title: 'Low Coverage Wilayas', dataKey: 'coverage', labelKey: 'name' },
    };
  }

  // ── 6. Churn / revenue at risk ───────────────────────────────────────
  if (/churn|fuite.*revenu|revenue.*leak|revenue.*risk|risque/.test(q)) {
    const highChurn = await db.wilayaProfile.findMany({
      distinct: ['wilayaCode'],
      where: { churnRate: { gte: 5 } },
      orderBy: { churnRate: 'desc' },
      take: 15,
    });

    return {
      intent: 'churn',
      summary: locale === 'fr'
        ? `${highChurn.length} wilayas avec churn ≥ 5%`
        : `${highChurn.length} wilayas with churn ≥ 5%`,
      data: {
        wilayas: highChurn.map(w => ({
          name: w.wilayaName,
          churnRate: Number(w.churnRate?.toFixed(2)),
          subscribers: w.totalSubscribers,
          revenueAtRisk: Number(w.revenueAtRisk),
          score: Number(w.compositeScore?.toFixed(1)),
        })),
      },
      chartConfig: { type: 'bar', title: 'High Churn Wilayas', dataKey: 'churnRate', labelKey: 'name' },
    };
  }

  // ── 7. Fallback: LLM-powered summary ────────────────────────────────
  const zai = await getZai();
  const prompt = locale === 'fr'
    ? `Question: "${question}"\nTu es un analyste réseau. Réponds brièvement en français avec les métriques clés si possible.`
    : `Question: "${question}"\nYou are a network analyst. Answer briefly with key metrics if possible.`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: 'You are a concise network data analyst. Respond with bullet points. Use DZD for currency.' },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
  });

  return {
    intent: 'general',
    summary: completion.choices?.[0]?.message?.content ?? 'No analysis available.',
    data: {},
  };
}

// ── GET/POST endpoint ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const body = await request.json();
    const parsed = nlQuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { question, locale } = parsed.data;
    const result = await processQuery(question, locale);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
