import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { WILAYA_69 } from '@/lib/wilayas';

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function hashSeed(month: string, code: string): number {
  let h = 0;
  for (let i = 0; i < month.length; i++) h = (h * 31 + month.charCodeAt(i)) | 0;
  for (let i = 0; i < code.length; i++) h = (h * 37 + code.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

const NORTH_CLUSTERS = ['Grand Alger', 'Nord-Ouest', 'Nord-Est', 'Kabylie'];
const __SOUTH_CLUSTERS = ['Sahara', 'Sud-Ouest', 'Sud-Est', 'Nouvelles 2023 Sud', 'Nouvelles 2023 Nord'];

function isNorthern(cluster: string): boolean {
  return NORTH_CLUSTERS.includes(cluster);
}

function generateSnapshot(w: typeof WILAYA_69[0], rng: () => number, __monthSeed: number) {
  const northern = isNorthern(w.cluster);
  const basePenetration = northern ? 0.88 + rng() * 0.12 : 0.58 + rng() * 0.17;
  const totalSubscribers = Math.round(w.population * basePenetration);

  // "Our" share: stronger in north (35-40%), weaker in south (28-34%)
  const ourBase = northern ? 35 + rng() * 5 : 28 + rng() * 6;
  const ourShare = Math.round(ourBase * 10) / 10;

  // Mobilis: relatively stable, slightly stronger in south
  const mobilisBase = northern ? 28 + rng() * 3 : 29 + rng() * 4;
  const mobilisShare = Math.round(mobilisBase * 10) / 10;

  // Remainder split between Djezzy (~60%) and Ooredoo (~40%)
  const remainder = 100 - ourShare - mobilisShare;
  const djezzyShare = Math.round(remainder * 0.6 * 10) / 10;
  const ooredooShare = Math.round((100 - ourShare - mobilisShare - djezzyShare) * 10) / 10;

  const ourSubscribers = Math.round(totalSubscribers * ourShare / 100);
  const mobilisSubscribers = Math.round(totalSubscribers * mobilisShare / 100);
  const djezzySubscribers = Math.round(totalSubscribers * djezzyShare / 100);
  const ooredooSubscribers = totalSubscribers - ourSubscribers - mobilisSubscribers - djezzySubscribers;

  // ARPU: our operator highest (5000-7000 DZD), market avg ~4500-5500
  const arpuOur = Math.round(5000 + rng() * 2000);
  const arpuMobilis = Math.round(3500 + rng() * 1000);
  const arpuDjezzy = Math.round(3800 + rng() * 1200);
  const arpuOoredoo = Math.round(3200 + rng() * 1000);
  const arpuMarket = Math.round(
    (arpuOur * ourSubscribers + arpuMobilis * mobilisSubscribers +
     arpuDjezzy * djezzySubscribers + arpuOoredoo * ooredooSubscribers) / totalSubscribers
  );

  const totalRevenue = totalSubscribers * arpuMarket * 12;
  const ourRevenue = ourSubscribers * arpuOur * 12;
  const ourRevenueShare = Math.round((ourRevenue / totalRevenue) * 1000) / 10;

  const shareTrend3m = Math.round((-2 + rng() * 5) * 10) / 10;
  const subscriberGrowthRate = Math.round((-1 + rng() * 6) * 10) / 10;

  return {
    wilayaCode: w.code,
    wilayaName: w.name,
    wilayaNameAr: w.nameAr,
    cluster: w.cluster,
    population: w.population,
    totalSubscribers,
    ourSubscribers,
    ourShare,
    mobilisSubscribers,
    mobilisShare,
    djezzySubscribers,
    djezzyShare,
    ooredooSubscribers,
    ooredooShare,
    totalRevenue,
    ourRevenue,
    ourRevenueShare,
    shareTrend3m,
    subscriberGrowthRate,
    arpuOur,
    arpuMarket,
    rank: 0,
  };
}

function generateTrends(periodMonth: string): TrendPoint[] {
  const [year, monthNum] = periodMonth.split('-').map(Number);
  const trends: TrendPoint[] = [];
  const baseRng = seededRandom(hashSeed(periodMonth, 'TRENDS'));

  for (let i = 5; i >= 0; i--) {
    let m = monthNum - i;
    let y = year;
    if (m <= 0) { m += 12; y -= 1; }
    const month = `${y}-${String(m).padStart(2, '0')}`;
    const __drift = i * 0.3;
    trends.push({
      month,
      ourShare: Math.round((33 + baseRng() * 2 + (5 - i) * 0.3) * 10) / 10,
      mobilisShare: Math.round((31 - baseRng() * 2 - (5 - i) * 0.1) * 10) / 10,
      djezzyShare: Math.round((21.5 - baseRng() * 0.5) * 10) / 10,
      ooredooShare: Math.round((14 - baseRng() * 0.5) * 10) / 10,
      totalSubscribers: Math.round(50_000_000 + baseRng() * 4_000_000 + (5 - i) * 300_000),
    });
  }
  return trends;
}

interface TrendPoint {
  month: string;
  ourShare: number;
  mobilisShare: number;
  djezzyShare: number;
  ooredooShare: number;
  totalSubscribers: number;
}

export async function GET(request: Request) {
  if (!rateLimit(request)) return rateLimitResponse();

  const { searchParams } = new URL(request.url);
  const periodMonth = searchParams.get('periodMonth') || '2025-07';

  const globalRng = seededRandom(hashSeed(periodMonth, 'GLOBAL'));

  // Generate per-wilaya snapshots
  const snapshots = WILAYA_69.map((w) => {
    const rng = seededRandom(hashSeed(periodMonth, w.code));
    return generateSnapshot(w, rng, hashSeed(periodMonth, w.code));
  });

  // Rank by ourShare descending
  const ranked = [...snapshots].sort((a, b) => b.ourShare - a.ourShare);
  ranked.forEach((s, i) => { s.rank = i + 1; });
  const rankMap = new Map(ranked.map((s) => [s.wilayaCode, s.rank]));
  snapshots.forEach((s) => { s.rank = rankMap.get(s.wilayaCode)!; });

  // Compute national totals
  let totalSubscribers = 0;
  let totalOur = 0;
  let totalMobilis = 0;
  let totalDjezzy = 0;
  const _totalOoredoo = 0;
  let totalRevenue = 0;
  let totalOurRevenue = 0;
  let growing = 0;
  let declining = 0;

  for (const s of snapshots) {
    totalSubscribers += s.totalSubscribers;
    totalOur += s.ourSubscribers;
    totalMobilis += s.mobilisSubscribers;
    totalDjezzy += s.djezzySubscribers;
    __totalOoredoo += s.ooredooSubscribers;
    totalRevenue += s.totalRevenue;
    totalOurRevenue += s.ourRevenue;
    if (s.shareTrend3m > 0.3) growing++;
    else if (s.shareTrend3m < -0.3) declining++;
  }

  const ourShare = Math.round((totalOur / totalSubscribers) * 1000) / 10;
  const mobilisShare = Math.round((totalMobilis / totalSubscribers) * 1000) / 10;
  const djezzyShare = Math.round((totalDjezzy / totalSubscribers) * 1000) / 10;
  const ooredooShare = Math.round((100 - ourShare - mobilisShare - djezzyShare) * 10) / 10;

  const arpuOurNational = Math.round(totalOurRevenue / totalOur / 12);
  const arpuMarketNational = Math.round(totalRevenue / totalSubscribers / 12);
  const ourArpuPremium = Math.round(((arpuOurNational / arpuMarketNational) - 1) * 1000) / 10;

  const topWilaya = ranked[0];
  const subscriberGrowthNational = Math.round((1.5 + globalRng() * 1.5) * 10) / 10;

  const trends = generateTrends(periodMonth);

  return NextResponse.json({
    period: periodMonth,
    generatedAt: new Date().toISOString(),
    snapshots,
    trends,
    summary: {
      totalSubscribers,
      totalRevenue,
      ourShare,
      mobilisShare,
      djezzyShare,
      ooredooShare,
      ourArpuPremium,
      topWilaya: { name: topWilaya.wilayaName, share: topWilaya.ourShare },
      growingWilayas: growing,
      decliningWilayas: declining,
      subscriberGrowthNational,
    },
  });
}