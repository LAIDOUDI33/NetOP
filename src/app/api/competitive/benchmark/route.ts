import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { WILAYA_69 } from '@/lib/wilayas';

// ─── Competitor Benchmarking Dashboard API ─────────────────────────────────
// Compares KPIs against Mobilis, Djezzy, Ooredoo for the Algerian telecom market

// Seeded PRNG for deterministic mock data on every request
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────
const OPERATORS = ['Us', 'Mobilis', 'Djezzy', 'Ooredoo'] as const;
const VALID_TECHS = ['2G', '3G', '4G', '5G'] as const;
const LOWER_IS_BETTER = new Set(['Avg Latency (ms)', 'Drop Rate (%)']);

const COLORS: Record<string, string> = {
  Us: '#10b981', Mobilis: '#f97316', Djezzy: '#ef4444', Ooredoo: '#3b82f6',
};

const KPI_UNITS: Record<string, string> = {
  'Availability (%)': '%', 'Avg RSRP (dBm)': 'dBm',
  'Avg Throughput DL (Mbps)': 'Mbps', 'Avg Latency (ms)': 'ms',
  'Drop Rate (%)': '%', 'PRB Utilization (%)': '%',
  'Handover Success (%)': '%', 'Customer Satisfaction (NPS)': 'NPS',
  'Network Coverage (%)': '%', 'ARPU (DZD)': 'DZD',
};

// 4G KPI base values (authoritative; other techs derived via TECH_SCALES)
const KPI_BASES_4G: Record<string, Record<string, number>> = {
  'Availability (%)': { Us: 99.5, Mobilis: 98.8, Djezzy: 98.2, Ooredoo: 97.9 },
  'Avg RSRP (dBm)': { Us: -88, Mobilis: -95, Djezzy: -98, Ooredoo: -102 },
  'Avg Throughput DL (Mbps)': { Us: 42, Mobilis: 35, Djezzy: 30, Ooredoo: 25 },
  'Avg Latency (ms)': { Us: 22, Mobilis: 28, Djezzy: 32, Ooredoo: 38 },
  'Drop Rate (%)': { Us: 0.15, Mobilis: 0.25, Djezzy: 0.35, Ooredoo: 0.45 },
  'PRB Utilization (%)': { Us: 68, Mobilis: 72, Djezzy: 75, Ooredoo: 70 },
  'Handover Success (%)': { Us: 98.5, Mobilis: 97.8, Djezzy: 97.2, Ooredoo: 96.8 },
  'Customer Satisfaction (NPS)': { Us: 45, Mobilis: 32, Djezzy: 28, Ooredoo: 22 },
  'Network Coverage (%)': { Us: 92.5, Mobilis: 90, Djezzy: 85, Ooredoo: 82 },
  'ARPU (DZD)': { Us: 5800, Mobilis: 4000, Djezzy: 4400, Ooredoo: 3700 },
};

// Scale factors to derive 2G/3G/5G from 4G baseline: [multiplier, offset]
const TECH_SCALES: Record<string, Record<string, [number, number]>> = {
  '2G': {
    'Availability (%)': [0.995, 0.3], 'Avg RSRP (dBm)': [0.95, 2],
    'Avg Throughput DL (Mbps)': [0.1, 0.5], 'Avg Latency (ms)': [1.5, 5],
    'Drop Rate (%)': [2.5, 0.3], 'PRB Utilization (%)': [0.85, 5],
    'Handover Success (%)': [0.99, 1], 'Customer Satisfaction (NPS)': [0.6, 5],
    'Network Coverage (%)': [1.05, 2], 'ARPU (DZD)': [0.65, 100],
  },
  '3G': {
    'Availability (%)': [0.998, 0.2], 'Avg RSRP (dBm)': [0.97, 1.5],
    'Avg Throughput DL (Mbps)': [0.35, 1], 'Avg Latency (ms)': [1.3, 3],
    'Drop Rate (%)': [1.8, 0.2], 'PRB Utilization (%)': [0.9, 4],
    'Handover Success (%)': [0.995, 0.5], 'Customer Satisfaction (NPS)': [0.8, 4],
    'Network Coverage (%)': [1.02, 1.5], 'ARPU (DZD)': [0.8, 80],
  },
  '5G': {
    'Availability (%)': [0.98, 1], 'Avg RSRP (dBm)': [1.05, 1],
    'Avg Throughput DL (Mbps)': [3.0, 5], 'Avg Latency (ms)': [0.4, 2],
    'Drop Rate (%)': [0.7, 0.05], 'PRB Utilization (%)': [0.5, 5],
    'Handover Success (%)': [1.005, 0.3], 'Customer Satisfaction (NPS)': [1.3, 5],
    'Network Coverage (%)': [0.3, 3], 'ARPU (DZD)': [1.5, 150],
  },
};

const TECH_MIX: Record<string, Record<string, number>> = {
  '2G': { '2G': 60, '3G': 30, '4G': 10, '5G': 0 },
  '3G': { '2G': 25, '3G': 50, '4G': 24, '5G': 1 },
  '4G': { '2G': 15, '3G': 25, '4G': 55, '5G': 5 },
  '5G': { '2G': 8,  '3G': 17, '4G': 50, '5G': 25 },
};

// Operator profile definitions
interface OperatorDef {
  operator: string; estimatedSites: number; estimatedSubscribers: number;
  marketShare: number; avgArpu: number; coveragePercent: number;
  strengths: string[]; weaknesses: string[];
}

const OPERATOR_DEFS: OperatorDef[] = [
  { operator: 'Us', estimatedSites: 12500, estimatedSubscribers: 18300000,
    marketShare: 35.2, avgArpu: 5800, coveragePercent: 92.5,
    strengths: ['Highest ARPU', 'Best 4G coverage', 'Lowest latency'],
    weaknesses: ['Limited 5G', 'Southern coverage gaps'] },
  { operator: 'Mobilis', estimatedSites: 10200, estimatedSubscribers: 15600000,
    marketShare: 30.0, avgArpu: 4000, coveragePercent: 90.0,
    strengths: ['Largest rural footprint', 'Strong government backing', 'Good 3G reliability'],
    weaknesses: ['Lower ARPU', 'Aging 2G sites'] },
  { operator: 'Djezzy', estimatedSites: 8800, estimatedSubscribers: 12800000,
    marketShare: 24.6, avgArpu: 4400, coveragePercent: 85.0,
    strengths: ['Strong urban presence', 'Competitive pricing', 'Good brand loyalty'],
    weaknesses: ['Coverage gaps in south', 'High drop rate'] },
  { operator: 'Ooredoo', estimatedSites: 7200, estimatedSubscribers: 5800000,
    marketShare: 10.2, avgArpu: 3700, coveragePercent: 82.0,
    strengths: ['Data-focused plans', 'Young demographics', 'Digital innovation'],
    weaknesses: ['Smallest footprint', 'Lowest coverage', 'Highest latency'] },
];

// ─── KPI value generation ───────────────────────────────────────────────────

function getKpiValues(tech: string): Record<string, Record<string, number>> {
  if (tech === '4G') return KPI_BASES_4G;
  const scale = TECH_SCALES[tech] ?? TECH_SCALES['3G'];
  const result: Record<string, Record<string, number>> = {};
  for (const [kpi, vals] of Object.entries(KPI_BASES_4G)) {
    const [mult, offset] = scale[kpi] ?? [1, 0];
    result[kpi] = {};
    for (const op of OPERATORS) {
      result[kpi][op] = Math.round((vals[op] * mult + offset) * 100) / 100;
    }
  }
  return result;
}

// ─── Operator profiles ──────────────────────────────────────────────────────

function buildOperatorProfiles(tech: string) {
  const mix = TECH_MIX[tech] ?? TECH_MIX['4G'];
  return OPERATOR_DEFS.map((d) => ({
    operator: d.operator, estimatedSites: d.estimatedSites,
    estimatedSubscribers: d.estimatedSubscribers, marketShare: d.marketShare,
    avgArpu: d.avgArpu, coveragePercent: d.coveragePercent,
    technologyMix: { ...mix }, strengths: [...d.strengths],
    weaknesses: [...d.weaknesses], color: COLORS[d.operator],
  }));
}

// ─── KPI comparison table ───────────────────────────────────────────────────

function buildKpiComparison(kpiValues: Record<string, Record<string, number>>, kpiFilter?: string) {
  const all = Object.entries(kpiValues);
  const entries = kpiFilter && kpiFilter !== 'all' ? all.filter(([k]) => k === kpiFilter) : all;

  return entries.map(([kpi, vals]) => {
    const isLower = LOWER_IS_BETTER.has(kpi);
    const bestOp = OPERATORS.reduce((a, b) =>
      isLower ? (vals[a] < vals[b] ? a : b) : (vals[a] > vals[b] ? a : b));
    const sorted = [...OPERATORS].sort((a, b) =>
      isLower ? vals[a] - vals[b] : vals[b] - vals[a]);
    const ourRank = sorted.indexOf('Us') + 1;
    const top3avg = sorted.slice(0, 3).reduce((s, op) => s + vals[op], 0) / 3;
    const benchmark = Math.round(top3avg * 100) / 100;
    const ourGap = Math.round((vals.Us - benchmark) * 100) / 100;

    return {
      kpi, unit: KPI_UNITS[kpi] ?? '',
      Us: vals.Us, Mobilis: vals.Mobilis, Djezzy: vals.Djezzy, Ooredoo: vals.Ooredoo,
      bestOperator: bestOp, ourRank, benchmark, ourGap,
    };
  });
}

// ─── Regional comparison (top-10 wilayas by population) ─────────────────────

function buildRegionalComparison(wilayaFilter?: string) {
  const rng = seededRng(42);
  const byPop = [...WILAYA_69].sort((a, b) => b.population - a.population);
  const candidates = wilayaFilter
    ? byPop.filter((w) => w.code === wilayaFilter || w.name.toLowerCase() === wilayaFilter.toLowerCase())
    : byPop.slice(0, 10);

  return candidates.map((w) => {
    const base = w.population > 2_000_000 ? 85 : w.population > 1_000_000 ? 78 : w.population > 600_000 ? 72 : 65;
    const j = () => Math.round((rng() - 0.5) * 10);
    const usS = base + 3 + j(), mobS = base - 5 + j(), djS = base - 12 + j(), ooS = base - 17 + j();
    const total = usS + mobS + djS + ooS;
    const usSh = Math.round((usS / total) * 1000) / 10;
    const mobSh = Math.round((mobS / total) * 1000) / 10;
    const djSh = Math.round((djS / total) * 1000) / 10;
    const ooSh = Math.round((100 - usSh - mobSh - djSh) * 10) / 10;
    return {
      wilayaCode: w.code, wilayaName: w.name, population: w.population,
      usScore: usS, mobilisScore: mobS, djezzyScore: djS, ooredooScore: ooS,
      usShare: usSh, mobilisShare: mobSh, djezzyShare: djSh, ooredooShare: ooSh,
    };
  });
}

// ─── Rankings (overall + per-KPI) ───────────────────────────────────────────

function buildRankings(kpiValues: Record<string, Record<string, number>>) {
  const overall: { operator: string; score: number; rank: number }[] = [];
  const byKpi: Record<string, { operator: string; score: number; rank: number }[]> = {};
  const accum: Record<string, number> = { Us: 0, Mobilis: 0, Djezzy: 0, Ooredoo: 0 };
  const kpiCount = Object.keys(kpiValues).length;

  for (const [kpi, vals] of Object.entries(kpiValues)) {
    const isLower = LOWER_IS_BETTER.has(kpi);
    const maxVal = Math.max(...OPERATORS.map((o) => Math.abs(vals[o]))) || 1;
    const norm: Record<string, number> = {};
    for (const op of OPERATORS) {
      norm[op] = isLower ? (1 - vals[op] / maxVal) * 100 : (vals[op] / maxVal) * 100;
    }
    const sorted = [...OPERATORS].sort((a, b) => norm[b] - norm[a]);
    byKpi[kpi] = sorted.map((op, i) => ({
      operator: op, score: Math.round(norm[op] * 10) / 10, rank: i + 1,
    }));
    for (const op of OPERATORS) accum[op] += norm[op] / kpiCount;
  }

  const sorted = [...OPERATORS].sort((a, b) => accum[b] - accum[a]);
 for (let i = 0; i < sorted.length; i++) {
    overall.push({ operator: sorted[i], score: Math.round(accum[sorted[i]] * 10) / 10, rank: i + 1 });
 }
  return { overall, byKpi };
}

// ─── 12-month trend (2024-08 → 2025-07) ─────────────────────────────────────

function buildTrends() {
  const months: string[] = [];
  for (let y = 2024; y <= 2025; y++) {
    const mStart = y === 2024 ? 8 : 1;
    const mEnd = y === 2025 ? 7 : 12;
    for (let m = mStart; m <= mEnd; m++) months.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  const rng = seededRng(77);
  return months.map((month, i) => {
    const b = 74 + i * 1.5;
    return {
      month,
      usScore: Math.round((b + 18 + (rng() - 0.5) * 3) * 10) / 10,
      mobilisScore: Math.round((b + 11 + (rng() - 0.5) * 4) * 10) / 10,
      djezzyScore: Math.round((b + 4 + (rng() - 0.5) * 4) * 10) / 10,
      ooredooScore: Math.round((b - 0.5 + (rng() - 0.5) * 5) * 10) / 10,
    };
  });
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request);
  if (limited) return rateLimitResponse(resetMs);

  const { searchParams } = new URL(request.url);
  const rawTech = searchParams.get('technology') || '4G';
  const kpiParam = searchParams.get('kpi') || undefined;
  const wilayaParam = searchParams.get('wilaya') || undefined;
  const technology = VALID_TECHS.includes(rawTech as (typeof VALID_TECHS)[number]) ? rawTech : '4G';
  const kpiValues = getKpiValues(technology);

  return NextResponse.json({
    meta: { technology, generatedAt: new Date().toISOString(), operators: [...OPERATORS] },
    operatorProfiles: buildOperatorProfiles(technology),
    kpiComparison: buildKpiComparison(kpiValues, kpiParam),
    regionalComparison: buildRegionalComparison(wilayaParam),
    ranking: buildRankings(kpiValues),
    trends: buildTrends(),
  });
}
