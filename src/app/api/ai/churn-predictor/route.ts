import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

/* ------------------------------------------------------------------ */
/*  Seeded PRNG (mulberry32) — deterministic per wilaya code           */
/* ------------------------------------------------------------------ */
function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Wilaya master data (all 69)                                        */
/* ------------------------------------------------------------------ */
interface WilayaData {
  code: string;
  name: string;
  cluster: string;
  population: number;
  sites: number;
  networkScore: number;
  commercialScore: number;
  compositeScore: number;
  density: number;
}

const WILAYAS: WilayaData[] = [
  { code: '01', name: 'Adrar',                  cluster: 'Sud-Ouest',             population: 399714,   sites: 24,  networkScore: 33,  commercialScore: 38,  compositeScore: 36,   density: 0.94 },
  { code: '02', name: 'Chlef',                  cluster: 'Nord-Ouest',            population: 1002088,  sites: 88,  networkScore: 78,  commercialScore: 76,  compositeScore: 76.6, density: 209 },
  { code: '03', name: 'Laghouat',               cluster: 'Sud-Ouest',             population: 273402,   sites: 14,  networkScore: 40,  commercialScore: 44,  compositeScore: 42.2, density: 15 },
  { code: '04', name: 'Oum El Bouaghi',         cluster: 'Sud-Est',               population: 621612,   sites: 46,  networkScore: 64,  commercialScore: 57,  compositeScore: 61.8, density: 81 },
  { code: '05', name: 'Batna',                  cluster: 'Hauts Plateaux',        population: 938075,   sites: 81,  networkScore: 75,  commercialScore: 75,  compositeScore: 73.5, density: 108 },
  { code: '06', name: 'Bejaia',                 cluster: 'Kabylie',               population: 912577,   sites: 86,  networkScore: 71,  commercialScore: 75,  compositeScore: 72.7, density: 279 },
  { code: '07', name: 'Biskra',                 cluster: 'Sud-Est',               population: 678246,   sites: 48,  networkScore: 66,  commercialScore: 60,  compositeScore: 63.4, density: 35 },
  { code: '08', name: 'Bechar',                 cluster: 'Sud-Ouest',             population: 270061,   sites: 13,  networkScore: 34,  commercialScore: 36,  compositeScore: 33.2, density: 1.7 },
  { code: '09', name: 'Blida',                  cluster: 'Grand Alger',           population: 1002937,  sites: 134, networkScore: 80,  commercialScore: 91,  compositeScore: 83.4, density: 591 },
  { code: '10', name: 'Bouira',                 cluster: 'Kabylie',               population: 695583,   sites: 63,  networkScore: 79,  commercialScore: 77,  compositeScore: 76.1, density: 157 },
  { code: '11', name: 'Tamanrasset',            cluster: 'Sahara',                population: 176637,   sites: 8,   networkScore: 34,  commercialScore: 21,  compositeScore: 29.5, density: 0.32 },
  { code: '12', name: 'Tebessa',                cluster: 'Hauts Plateaux',        population: 550262,   sites: 42,  networkScore: 62,  commercialScore: 62,  compositeScore: 62.3, density: 60 },
  { code: '13', name: 'Tlemcen',                cluster: 'Nord-Ouest',            population: 918521,   sites: 81,  networkScore: 78,  commercialScore: 76,  compositeScore: 76.6, density: 150 },
  { code: '14', name: 'Tiaret',                 cluster: 'Hauts Plateaux',        population: 846823,   sites: 53,  networkScore: 58,  commercialScore: 58,  compositeScore: 60.5, density: 41 },
  { code: '15', name: 'Tizi Ouzou',             cluster: 'Kabylie',               population: 1127608,  sites: 101, networkScore: 77,  commercialScore: 72,  compositeScore: 74.5, density: 316 },
  { code: '16', name: 'Alger',                  cluster: 'Grand Alger',           population: 2988145,  sites: 377, networkScore: 85,  commercialScore: 88,  compositeScore: 86.6, density: 2511 },
  { code: '17', name: 'Djelfa',                 cluster: 'Hauts Plateaux',        population: 621077,   sites: 49,  networkScore: 57,  commercialScore: 62,  compositeScore: 60.8, density: 46 },
  { code: '18', name: 'Jijel',                  cluster: 'Kabylie',               population: 636948,   sites: 59,  networkScore: 80,  commercialScore: 74,  compositeScore: 74.4, density: 247 },
  { code: '19', name: 'Setif',                  cluster: 'Nord-Est',              population: 1489979,  sites: 126, networkScore: 75,  commercialScore: 74,  compositeScore: 73.9, density: 229 },
  { code: '20', name: 'Saida',                  cluster: 'Hauts Plateaux',        population: 330641,   sites: 30,  networkScore: 55,  commercialScore: 61,  compositeScore: 58.1, density: 49 },
  { code: '21', name: 'Skikda',                 cluster: 'Nord-Est',              population: 898680,   sites: 80,  networkScore: 79,  commercialScore: 77,  compositeScore: 76.8, density: 223 },
  { code: '22', name: 'Sidi Bel Abbes',         cluster: 'Nord-Ouest',            population: 604744,  sites: 39,  networkScore: 58,  commercialScore: 59,  compositeScore: 59.9, density: 66 },
  { code: '23', name: 'Annaba',                 cluster: 'Nord-Est',              population: 609499,  sites: 59,  networkScore: 74,  commercialScore: 81,  compositeScore: 74.2, density: 424 },
  { code: '24', name: 'Guelma',                 cluster: 'Nord-Est',              population: 482430,   sites: 44,  networkScore: 78,  commercialScore: 76,  compositeScore: 75.3, density: 118 },
  { code: '25', name: 'Constantine',            cluster: 'Nord-Est',              population: 938475,  sites: 78,  networkScore: 73,  commercialScore: 72,  compositeScore: 72.7, density: 427 },
  { code: '26', name: 'Medea',                  cluster: 'Hauts Plateaux',        population: 563012,   sites: 54,  networkScore: 77,  commercialScore: 72,  compositeScore: 72.8, density: 136 },
  { code: '27', name: 'Mostaganem',             cluster: 'Nord-Ouest',            population: 737118,  sites: 64,  networkScore: 76,  commercialScore: 75,  compositeScore: 73.4, density: 325 },
  { code: '28', name: 'MSila',                  cluster: 'Hauts Plateaux',        population: 574462,   sites: 46,  networkScore: 57,  commercialScore: 62,  compositeScore: 60,   density: 30.69 },
  { code: '29', name: 'Mascara',                cluster: 'Nord-Ouest',            population: 784073,  sites: 71,  networkScore: 80,  commercialScore: 74,  compositeScore: 75.2, density: 132 },
  { code: '30', name: 'Ouargla',                cluster: 'Sud-Est',               population: 558558,  sites: 30,  networkScore: 42,  commercialScore: 41,  compositeScore: 41.2, density: 2.6 },
  { code: '31', name: 'Oran',                   cluster: 'Nord-Ouest',            population: 1584607,  sites: 207, networkScore: 80,  commercialScore: 91,  compositeScore: 84.6, density: 688 },
  { code: '32', name: 'El Bayadh',              cluster: 'Sud-Ouest',             population: 185347,   sites: 14,  networkScore: 47,  commercialScore: 44,  compositeScore: 44.5, density: 4.4 },
  { code: '33', name: 'Illizi',                 cluster: 'Sahara',                population: 52333,    sites: 5,   networkScore: 34,  commercialScore: 21,  compositeScore: 28.7, density: 0.18 },
  { code: '34', name: 'Bordj Bou Arreridj',     cluster: 'Hauts Plateaux',        population: 628475,  sites: 60,  networkScore: 74,  commercialScore: 81,  compositeScore: 74.2, density: 160 },
  { code: '35', name: 'Boumerdes',              cluster: 'Grand Alger',           population: 802083,  sites: 104, networkScore: 86,  commercialScore: 89,  compositeScore: 85.6, density: 504 },
  { code: '36', name: 'El Tarf',                cluster: 'Nord-Est',              population: 408414,   sites: 34,  networkScore: 73,  commercialScore: 72,  compositeScore: 71.4, density: 122 },
  { code: '37', name: 'Tindouf',                cluster: 'Sud-Ouest',             population: 49149,    sites: 9,   networkScore: 35,  commercialScore: 18,  compositeScore: 28.6, density: 0.31 },
  { code: '38', name: 'Tissemsilt',             cluster: 'Hauts Plateaux',        population: 294476,   sites: 21,  networkScore: 61,  commercialScore: 57,  compositeScore: 58.1, density: 93 },
  { code: '39', name: 'El Oued',                cluster: 'Sud-Est',               population: 647548,  sites: 42,  networkScore: 39,  commercialScore: 47,  compositeScore: 44.3, density: 12 },
  { code: '40', name: 'Khenchela',              cluster: 'Hauts Plateaux',        population: 386683,   sites: 30,  networkScore: 66,  commercialScore: 60,  compositeScore: 62.9, density: 40 },
  { code: '41', name: 'Souk Ahras',             cluster: 'Nord-Est',              population: 438127,   sites: 29,  networkScore: 61,  commercialScore: 60,  compositeScore: 59.2, density: 95 },
  { code: '42', name: 'Tipaza',                 cluster: 'Grand Alger',           population: 591010,   sites: 58,  networkScore: 69,  commercialScore: 79,  compositeScore: 71.3, density: 273 },
  { code: '43', name: 'Mila',                   cluster: 'Nord-Est',              population: 766886,  sites: 69,  networkScore: 79,  commercialScore: 77,  compositeScore: 76.1, density: 220 },
  { code: '44', name: 'Ain Defla',              cluster: 'Hauts Plateaux',        population: 766013,  sites: 65,  networkScore: 75,  commercialScore: 73,  compositeScore: 72.8, density: 156 },
  { code: '45', name: 'Naama',                  cluster: 'Sud-Ouest',             population: 192891,   sites: 18,  networkScore: 44,  commercialScore: 47,  compositeScore: 44.1, density: 6.5 },
  { code: '46', name: 'Ain Temouchent',         cluster: 'Nord-Ouest',            population: 371239,   sites: 35,  networkScore: 78,  commercialScore: 76,  compositeScore: 74.6, density: 156 },
  { code: '47', name: 'Ghardaia',               cluster: 'Sud-Ouest',             population: 363598,   sites: 18,  networkScore: 40,  commercialScore: 44,  compositeScore: 42.7, density: 4.2 },
  { code: '48', name: 'Relizane',               cluster: 'Nord-Ouest',            population: 726180,   sites: 68,  networkScore: 77,  commercialScore: 72,  compositeScore: 73.3, density: 152 },
  { code: '49', name: 'Timimoun',               cluster: 'Nouvelles 2023 Sud',     population: 122019,   sites: 8,   networkScore: 33,  commercialScore: 18,  compositeScore: 27,   density: 1.87 },
  { code: '50', name: 'Bordj Badji Mokhtar',    cluster: 'Sahara',                population: 16437,    sites: 11,  networkScore: 31,  commercialScore: 23,  compositeScore: 29.2, density: 0.13 },
  { code: '51', name: 'Ouled Djellal',          cluster: 'Sud-Est',               population: 174219,   sites: 15,  networkScore: 46,  commercialScore: 44,  compositeScore: 43.3, density: 15.26 },
  { code: '52', name: 'Beni Abbes',             cluster: 'Nouvelles 2023 Sud',     population: 50163,    sites: 5,   networkScore: 34,  commercialScore: 21,  compositeScore: 28,   density: 0.49 },
  { code: '53', name: 'In Salah',               cluster: 'Sahara',                population: 50392,    sites: 11,  networkScore: 29,  commercialScore: 22,  compositeScore: 27.8, density: 0.38 },
  { code: '54', name: 'In Guezzam',             cluster: 'Sahara',                population: 11202,    sites: 5,   networkScore: 38,  commercialScore: 19,  compositeScore: 31.1, density: 0.12 },
  { code: '55', name: 'Touggourt',              cluster: 'Sud-Est',               population: 247221,   sites: 13,  networkScore: 41,  commercialScore: 45,  compositeScore: 42.4, density: 14.18 },
  { code: '56', name: 'Djanet',                 cluster: 'Sahara',                population: 17618,    sites: 9,   networkScore: 33,  commercialScore: 23,  compositeScore: 29.5, density: 0.2 },
  { code: '57', name: 'El MGhair',              cluster: 'Nouvelles 2023 Sud',     population: 162267,   sites: 12,  networkScore: 44,  commercialScore: 43,  compositeScore: 43.2, density: 18.36 },
  { code: '58', name: 'El Meniaa',              cluster: 'Nouvelles 2023 Sud',     population: 57276,    sites: 5,   networkScore: 33,  commercialScore: 20,  compositeScore: 28,   density: 0.92 },
  { code: '59', name: 'Aflou',                  cluster: 'Nouvelles 2023 Nord',    population: 182938,   sites: 16,  networkScore: 45,  commercialScore: 42,  compositeScore: 43.7, density: 27 },
  { code: '60', name: 'Barika',                 cluster: 'Nouvelles 2023 Nord',    population: 181716,   sites: 14,  networkScore: 61,  commercialScore: 57,  compositeScore: 57.4, density: 58 },
  { code: '61', name: 'El Kantara',             cluster: 'Nouvelles 2023 Nord',    population: 43110,    sites: 12,  networkScore: 39,  commercialScore: 32,  compositeScore: 37.1, density: 29 },
  { code: '62', name: 'Bir El Ater',            cluster: 'Nouvelles 2023 Nord',    population: 98441,    sites: 11,  networkScore: 46,  commercialScore: 44,  compositeScore: 42.6, density: 19.45 },
  { code: '63', name: 'El Aricha',              cluster: 'Nouvelles 2023 Nord',    population: 30614,    sites: 5,   networkScore: 42,  commercialScore: 26,  compositeScore: 34.7, density: 10.44 },
  { code: '64', name: 'Ksar Chellala',          cluster: 'Nouvelles 2023 Nord',    population: 120000,   sites: 17,  networkScore: 55,  commercialScore: 61,  compositeScore: 57.6, density: 34 },
  { code: '65', name: 'Ain Ouessara',           cluster: 'Nouvelles 2023 Sud',     population: 251038,   sites: 21,  networkScore: 66,  commercialScore: 59,  compositeScore: 62.1, density: 40 },
  { code: '66', name: 'Messaad',                cluster: 'Nouvelles 2023 Sud',     population: 220069,   sites: 12,  networkScore: 41,  commercialScore: 45,  compositeScore: 42.4, density: 14.17 },
  { code: '67', name: 'Ksar El Boukhari',       cluster: 'Nouvelles 2023 Sud',     population: 256920,   sites: 24,  networkScore: 62,  commercialScore: 62,  compositeScore: 61,   density: 54 },
  { code: '68', name: 'Bou Sada',               cluster: 'Nouvelles 2023 Sud',     population: 416129,   sites: 30,  networkScore: 63,  commercialScore: 58,  compositeScore: 61,   density: 49 },
  { code: '69', name: 'El Abiodh Sidi Cheikh',  cluster: 'Nouvelles 2023 Sud',     population: 43277,    sites: 5,   networkScore: 33,  commercialScore: 20,  compositeScore: 28,   density: 1.17 },
];

const RISK_FACTORS = [
  'Poor Coverage (RSRP < -100 dBm)',
  'Frequent Call Drops (>3%)',
  'Low Data Throughput (<5 Mbps)',
  'High Latency (>100ms)',
  'Billing Disputes',
  'Competitor Offers',
  'Network Outage Exposure',
  'Low ARPU Decline',
  'Service Complaints',
  'Roaming Issues',
] as const;

const RETENTION_ACTIONS: Record<string, string[]> = {
  'Poor Coverage (RSRP < -100 dBm)': [
    'Deploy small cells in coverage gaps',
    'Optimize antenna tilt and azimuth',
    'Activate carrier aggregation on weak sectors',
  ],
  'Frequent Call Drops (>3%)': [
    'Investigate and fix handover parameters',
    'Increase neighbor cell list',
    'Deploy capacity overlay in high-traffic zones',
  ],
  'Low Data Throughput (<5 Mbps)': [
    'Refarm 900 MHz spectrum to LTE',
    'Add 4G carriers on congested sites',
    'Offload traffic to Wi-Fi hotspots',
  ],
  'High Latency (>100ms)': [
    'Optimize core network routing',
    'Add edge computing nodes',
    'Review backhaul capacity',
  ],
  'Billing Disputes': [
    'Launch transparent billing campaign',
    'Offer itemized usage reports via app',
    'Proactive credit adjustment for affected users',
  ],
  'Competitor Offers': [
    'Match competitor pricing bundles',
    'Offer loyalty bonus data packs',
    'Provide free value-added services for 3 months',
  ],
  'Network Outage Exposure': [
    'Prioritize backup power for high-risk sites',
    'Implement fault-tolerant fiber backhaul',
    'Accelerate site maintenance schedule',
  ],
  'Low ARPU Decline': [
    'Upsell to higher-tier data plans',
    'Introduce family share plans',
    'Bundle OTT streaming subscriptions',
  ],
  'Service Complaints': [
    'Assign dedicated customer success managers',
    'Fast-track complaint resolution (<24h SLA)',
    'Offer service credits for repeated issues',
  ],
  'Roaming Issues': [
    'Renegotiate roaming agreements with key partners',
    'Deploy VoWiFi for international callers',
    'Offer preferential roaming bundles',
  ],
};

/* ------------------------------------------------------------------ */
/*  Deterministic helpers                                             */
/* ------------------------------------------------------------------ */
function pickSeeded(rng: () => number, arr: readonly string[], count: number): string[] {
  const indices = Array.from({ length: arr.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).map((i) => arr[i]);
}

/* ------------------------------------------------------------------ */
/*  Generate prediction for a single wilaya                           */
/* ------------------------------------------------------------------ */
function generateWilayaPrediction(w: WilayaData) {
  const rng = seededRandom(parseInt(w.code, 10) * 7919);

  // Subscriber count derived from population (~55% penetration)
  const penetration = 0.50 + rng() * 0.12;
  const subscriberCount = Math.floor(w.population * penetration);

  // Churn probability: higher density + lower compositeScore = higher churn
  // compositeScore range: ~27-87, density range: ~0.1-2511
  // Normalize: scoreNorm 0-1 (higher = better), densityNorm 0-1 (log scale)
  const scoreNorm = Math.min(Math.max((w.compositeScore - 27) / (87 - 27), 0), 1);
  const densityNorm = Math.min(Math.max(Math.log10(w.density + 1) / Math.log10(2512), 0), 1);

  // Base churn 0.06-0.10, risk pushes it up for bad score + high density
  const riskMultiplier = (1 - scoreNorm) * 0.5 + densityNorm * 0.3 + rng() * 0.1;
  const avgChurnProb = +Math.min(0.06 + riskMultiplier * 0.30, 0.38).toFixed(3);

  const atRiskCount = Math.floor(subscriberCount * avgChurnProb);
  const highRiskCount = Math.floor(atRiskCount * (0.30 + rng() * 0.10));
  const mediumRiskCount = Math.floor(atRiskCount * (0.35 + rng() * 0.10));
  const lowRiskCount = atRiskCount - highRiskCount - mediumRiskCount;

  // ARPU scales with compositeScore (higher score = more affluent area)
  const avgArpu = Math.floor(800 + scoreNorm * 2200 + rng() * 300);
  const monthlyRevenueAtRisk = atRiskCount * avgArpu;
  const annualRevenueAtRisk = monthlyRevenueAtRisk * 12;

  // Pick 4 risk factors deterministically
  const selectedFactors = pickSeeded(rng, RISK_FACTORS as unknown as string[], 4);
  const riskFactors = selectedFactors.map((f) => ({
    factor: f,
    impact: +(rng() * 0.3 + 0.1).toFixed(2),
    affectedSubscribers: Math.floor(rng() * 5000 + 500),
  }));

  const primaryRiskFactor = riskFactors[0].factor;
  const recommendedActions = (RETENTION_ACTIONS[primaryRiskFactor] ?? ['Review subscriber profile']).slice(0, 3);
  const retentionPotential = +(0.45 + rng() * 0.40).toFixed(2);
  const churnTrend = (['increasing', 'stable', 'decreasing'] as const)[Math.floor(rng() * 3)];

  // Network KPIs scale with compositeScore
  const baseRsrp = -60 - (1 - scoreNorm) * 50;
  const baseThroughput = 8 + scoreNorm * 50;
  const baseDropRate = 5 - scoreNorm * 4;
  const baseAvailability = 90 + scoreNorm * 9;

  return {
    region: w.name,
    wilayaCode: w.code,
    cluster: w.cluster,
    subscriberCount,
    atRiskCount,
    avgChurnProbability: avgChurnProb,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    primaryRiskFactor,
    riskFactors,
    monthlyRevenueAtRisk,
    annualRevenueAtRisk,
    avgArpuAtRisk: avgArpu,
    networkKpis: {
      avgRsrp: +(-baseRsrp - rng() * 6).toFixed(1),
      avgThroughput: +(baseThroughput + rng() * 8 - 4).toFixed(1),
      avgDropRate: +(baseDropRate + rng() * 1.5).toFixed(2),
      avgAvailability: +(baseAvailability + rng() * 3 - 1.5).toFixed(2),
    },
    modelVersion: 'v3.2.1',
    modelAccuracy: +(0.91 + rng() * 0.06).toFixed(3),
    confidence: +(0.80 + rng() * 0.15).toFixed(3),
    recommendedActions,
    retentionPotential,
    churnTrend,
  };
}

/* ------------------------------------------------------------------ */
/*  Trend data (deterministic, seed 42)                               */
/* ------------------------------------------------------------------ */
function generateTrendData() {
  const rng = seededRandom(42);
  const months = [
    '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
    '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
  ];
  let baseSubscribers = 23_000_000;
  let baseAtRisk = 2_800_000;

  return months.map((month) => {
    baseSubscribers += Math.floor(rng() * 40_000 + 10_000);
    baseAtRisk += Math.floor((rng() - 0.4) * 30_000);
    if (baseAtRisk < 2_000_000) baseAtRisk = 2_000_000;
    const avgChurnProb = +(rng() * 0.08 + 0.12).toFixed(3);
    const actualChurned = Math.floor(baseAtRisk * avgChurnProb * (rng() * 0.3 + 0.15));
    const savedByRetention = Math.floor(actualChurned * (rng() * 0.3 + 0.25));

    return {
      month,
      totalSubscribers: baseSubscribers,
      atRiskCount: baseAtRisk,
      avgChurnProbability: avgChurnProb,
      actualChurned,
      savedByRetention,
      revenueAtRisk: baseAtRisk * 1400,
      revenueSaved: savedByRetention * 1400,
      modelAccuracy: +(rng() * 0.05 + 0.92).toFixed(3),
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Segment breakdown (updated totals for 69 wilayas)                 */
/* ------------------------------------------------------------------ */
function generateSegmentBreakdown() {
  return [
    {
      segment: 'Prepaid',
      totalSubscribers: 14_500_000,
      atRiskCount: 2_100_000,
      avgChurnProbability: 0.186,
      avgArpu: 900,
      monthlyRevenueAtRisk: 2_100_000 * 900,
      annualRevenueAtRisk: 2_100_000 * 900 * 12,
      churnRate30d: 0.032,
      topRiskFactor: 'Competitor Offers',
      retentionRate: 0.48,
    },
    {
      segment: 'Postpaid',
      totalSubscribers: 5_200_000,
      atRiskCount: 470_000,
      avgChurnProbability: 0.112,
      avgArpu: 2800,
      monthlyRevenueAtRisk: 470_000 * 2800,
      annualRevenueAtRisk: 470_000 * 2800 * 12,
      churnRate30d: 0.018,
      topRiskFactor: 'Billing Disputes',
      retentionRate: 0.62,
    },
    {
      segment: 'Enterprise',
      totalSubscribers: 180_000,
      atRiskCount: 8200,
      avgChurnProbability: 0.068,
      avgArpu: 18500,
      monthlyRevenueAtRisk: 8200 * 18500,
      annualRevenueAtRisk: 8200 * 18500 * 12,
      churnRate30d: 0.008,
      topRiskFactor: 'Service Complaints',
      retentionRate: 0.78,
    },
    {
      segment: 'Youth',
      totalSubscribers: 3_500_000,
      atRiskCount: 780_000,
      avgChurnProbability: 0.221,
      avgArpu: 650,
      monthlyRevenueAtRisk: 780_000 * 650,
      annualRevenueAtRisk: 780_000 * 650 * 12,
      churnRate30d: 0.041,
      topRiskFactor: 'Low Data Throughput (<5 Mbps)',
      retentionRate: 0.42,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Top risk factors breakdown (deterministic, seed 99)               */
/* ------------------------------------------------------------------ */
function generateRiskFactorsBreakdown() {
  const rng = seededRandom(99);
  return (RISK_FACTORS as unknown as string[]).map((factor) => ({
    factor,
    affectedSubscribers: Math.floor(rng() * 120_000 + 15_000),
    churnContribution: +(rng() * 0.15 + 0.04).toFixed(3),
    avgChurnProbability: +(rng() * 0.2 + 0.15).toFixed(3),
    revenueImpact: Math.floor(rng() * 180_000_000 + 20_000_000),
    trend: (['increasing', 'stable', 'decreasing'] as const)[Math.floor(rng() * 3)],
    recommendedActions: RETENTION_ACTIONS[factor] ?? ['Investigate further'],
  })).sort((a, b) => b.churnContribution - a.churnContribution);
}

/* ------------------------------------------------------------------ */
/*  GET handler                                                       */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const predictions = WILAYAS.map(generateWilayaPrediction);

    const totalSubscribers = predictions.reduce((s, p) => s + p.subscriberCount, 0);
    const totalAtRisk = predictions.reduce((s, p) => s + p.atRiskCount, 0);
    const avgChurnProb = +(
      predictions.reduce((s, p) => s + p.avgChurnProbability, 0) / predictions.length
    ).toFixed(3);
    const totalRevenueAtRisk = predictions.reduce((s, p) => s + p.annualRevenueAtRisk, 0);
    const avgModelAccuracy = +(
      predictions.reduce((s, p) => s + p.modelAccuracy, 0) / predictions.length
    ).toFixed(3);

    // Cluster-level summary
    const clusterMap = new Map<string, { subscribers: number; atRisk: number; churnSum: number; count: number }>();
    for (const p of predictions) {
      const c = p.cluster;
      const entry = clusterMap.get(c) ?? { subscribers: 0, atRisk: 0, churnSum: 0, count: 0 };
      entry.subscribers += p.subscriberCount;
      entry.atRisk += p.atRiskCount;
      entry.churnSum += p.avgChurnProbability;
      entry.count += 1;
      clusterMap.set(c, entry);
    }
    const clusterSummary = Array.from(clusterMap.entries())
      .map(([name, d]) => ({
        name,
        totalSubscribers: d.subscribers,
        atRiskCount: d.atRisk,
        avgChurnProbability: +(d.churnSum / d.count).toFixed(3),
        wilayaCount: d.count,
      }))
      .sort((a, b) => b.atRiskCount - a.atRiskCount);

    const summary = {
      totalSubscribers,
      atRiskCount: totalAtRisk,
      avgChurnProbability: avgChurnProb,
      revenueAtRisk: totalRevenueAtRisk,
      modelAccuracy: avgModelAccuracy,
      modelVersion: 'v3.2.1',
      lastTrainingDate: '2024-12-15T02:00:00Z',
      dataPointsUsed: 48_500_000,
      featureCount: 127,
      predictionHorizon: '30 days',
      wilayaCount: 69,
      currency: 'DZD',
      clusterSummary,
    };

    const trendData = generateTrendData();
    const churnBySegment = generateSegmentBreakdown();
    const topRiskFactors = generateRiskFactorsBreakdown();
    const recommendedRetentionActions = [
      {
        action: 'Deploy targeted network improvements in high-churn wilayas',
        impact: 'High',
        estimatedSavings: 2_450_000_000,
        affectedSubscribers: 320_000,
        priority: 1,
      },
      {
        action: 'Launch competitor-matching loyalty bundles for prepaid segment',
        impact: 'High',
        estimatedSavings: 1_600_000_000,
        affectedSubscribers: 450_000,
        priority: 2,
      },
      {
        action: 'Implement proactive customer outreach for high-risk postpaid users',
        impact: 'Medium',
        estimatedSavings: 920_000_000,
        affectedSubscribers: 160_000,
        priority: 3,
      },
      {
        action: 'Expand 4G coverage in Sahara and Sud wilayas (Adrar, Bechar, Tamanrasset, Illizi, Tindouf)',
        impact: 'High',
        estimatedSavings: 780_000_000,
        affectedSubscribers: 120_000,
        priority: 4,
      },
      {
        action: 'Introduce youth-focused data packs with social media bonuses',
        impact: 'Medium',
        estimatedSavings: 540_000_000,
        affectedSubscribers: 220_000,
        priority: 5,
      },
      {
        action: 'Fast-track billing transparency initiative across all 69 wilayas',
        impact: 'Medium',
        estimatedSavings: 420_000_000,
        affectedSubscribers: 180_000,
        priority: 6,
      },
      {
        action: 'Assign dedicated enterprise account managers for top 500 at-risk accounts',
        impact: 'High',
        estimatedSavings: 380_000_000,
        affectedSubscribers: 5_200,
        priority: 7,
      },
    ];

    return NextResponse.json({
      summary,
      predictionsByRegion: predictions,
      topRiskFactors,
      churnBySegment,
      trendData,
      recommendedRetentionActions,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
