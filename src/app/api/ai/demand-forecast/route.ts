import { NextResponse } from 'next/server';

// ── Constants ──────────────────────────────────────────────────────────────

type Metric = 'prbUtilization' | 'activeUsers' | 'throughputDl' | 'throughputUl';
type Technology = '4G-LTE' | '3G-UMTS';
type CapacityRisk = 'low' | 'medium' | 'high' | 'critical';

interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

interface DemandForecast {
  region: string;
  wilayaCode: string;
  metric: Metric;
  technology: Technology;
  currentValue: number;
  peakValue: number;
  avgValue: number;
  forecast7d: number;
  forecast14d: number;
  forecast30d: number;
  forecast90d: number;
  growthRate7d: number;
  growthRate14d: number;
  growthRate30d: number;
  growthRate90d: number;
  capacityLimit: number;
  daysToCapacity: number;
  capacityRisk: CapacityRisk;
  modelVersion: string;
  modelAccuracy: number;
  confidence: number;
  seasonalPattern: string;
  peakHour: string;
  recommendation: string;
  requiredCapex: number;
  forecastPoints: ForecastPoint[];
}

const REGIONS: { name: string; wilayaCode: string; baseLoad: number; isUrban: boolean }[] = [
  { name: 'Adrar-Sud-Ouest', wilayaCode: '01', baseLoad: 0.133, isUrban: false },
  { name: 'Chlef-Nord-Ouest', wilayaCode: '02', baseLoad: 0.334, isUrban: true },
  { name: 'Laghouat-Sud-Ouest', wilayaCode: '03', baseLoad: 0.091, isUrban: false },
  { name: 'Oum El Bouaghi-Sud-Est', wilayaCode: '04', baseLoad: 0.207, isUrban: true },
  { name: 'Batna-Hauts Plateaux', wilayaCode: '05', baseLoad: 0.313, isUrban: true },
  { name: 'Bejaia-Kabylie', wilayaCode: '06', baseLoad: 0.304, isUrban: true },
  { name: 'Biskra-Sud-Est', wilayaCode: '07', baseLoad: 0.226, isUrban: false },
  { name: 'Bechar-Sud-Ouest', wilayaCode: '08', baseLoad: 0.090, isUrban: false },
  { name: 'Blida-Grand Alger', wilayaCode: '09', baseLoad: 0.334, isUrban: true },
  { name: 'Bouira-Kabylie', wilayaCode: '10', baseLoad: 0.232, isUrban: true },
  { name: 'Tamanrasset-Sahara', wilayaCode: '11', baseLoad: 0.059, isUrban: false },
  { name: 'Tebessa-Hauts Plateaux', wilayaCode: '12', baseLoad: 0.183, isUrban: true },
  { name: 'Tlemcen-Nord-Ouest', wilayaCode: '13', baseLoad: 0.306, isUrban: true },
  { name: 'Tiaret-Hauts Plateaux', wilayaCode: '14', baseLoad: 0.282, isUrban: false },
  { name: 'Tizi Ouzou-Kabylie', wilayaCode: '15', baseLoad: 0.376, isUrban: true },
  { name: 'Alger-Grand Alger', wilayaCode: '16', baseLoad: 0.996, isUrban: true },
  { name: 'Djelfa-Hauts Plateaux', wilayaCode: '17', baseLoad: 0.207, isUrban: false },
  { name: 'Jijel-Kabylie', wilayaCode: '18', baseLoad: 0.212, isUrban: true },
  { name: 'Setif-Nord-Est', wilayaCode: '19', baseLoad: 0.497, isUrban: true },
  { name: 'Saida-Hauts Plateaux', wilayaCode: '20', baseLoad: 0.110, isUrban: false },
  { name: 'Skikda-Nord-Est', wilayaCode: '21', baseLoad: 0.300, isUrban: true },
  { name: 'Sidi Bel Abbes-Nord-Ouest', wilayaCode: '22', baseLoad: 0.202, isUrban: true },
  { name: 'Annaba-Nord-Est', wilayaCode: '23', baseLoad: 0.203, isUrban: true },
  { name: 'Guelma-Nord-Est', wilayaCode: '24', baseLoad: 0.161, isUrban: true },
  { name: 'Constantine-Nord-Est', wilayaCode: '25', baseLoad: 0.313, isUrban: true },
  { name: 'Medea-Hauts Plateaux', wilayaCode: '26', baseLoad: 0.188, isUrban: true },
  { name: 'Mostaganem-Nord-Ouest', wilayaCode: '27', baseLoad: 0.246, isUrban: true },
  { name: 'MSila-Hauts Plateaux', wilayaCode: '28', baseLoad: 0.191, isUrban: false },
  { name: 'Mascara-Nord-Ouest', wilayaCode: '29', baseLoad: 0.261, isUrban: true },
  { name: 'Ouargla-Sud-Est', wilayaCode: '30', baseLoad: 0.186, isUrban: false },
  { name: 'Oran-Nord-Ouest', wilayaCode: '31', baseLoad: 0.528, isUrban: true },
  { name: 'El Bayadh-Sud-Ouest', wilayaCode: '32', baseLoad: 0.062, isUrban: false },
  { name: 'Illizi-Sahara', wilayaCode: '33', baseLoad: 0.017, isUrban: false },
  { name: 'Bordj Bou Arreridj-Hauts Plateaux', wilayaCode: '34', baseLoad: 0.209, isUrban: true },
  { name: 'Boumerdes-Grand Alger', wilayaCode: '35', baseLoad: 0.267, isUrban: true },
  { name: 'El Tarf-Nord-Est', wilayaCode: '36', baseLoad: 0.136, isUrban: true },
  { name: 'Tindouf-Sud-Ouest', wilayaCode: '37', baseLoad: 0.016, isUrban: false },
  { name: 'Tissemsilt-Hauts Plateaux', wilayaCode: '38', baseLoad: 0.098, isUrban: true },
  { name: 'El Oued-Sud-Est', wilayaCode: '39', baseLoad: 0.216, isUrban: false },
  { name: 'Khenchela-Hauts Plateaux', wilayaCode: '40', baseLoad: 0.129, isUrban: false },
  { name: 'Souk Ahras-Nord-Est', wilayaCode: '41', baseLoad: 0.146, isUrban: true },
  { name: 'Tipaza-Grand Alger', wilayaCode: '42', baseLoad: 0.197, isUrban: true },
  { name: 'Mila-Nord-Est', wilayaCode: '43', baseLoad: 0.256, isUrban: true },
  { name: 'Ain Defla-Hauts Plateaux', wilayaCode: '44', baseLoad: 0.255, isUrban: true },
  { name: 'Naama-Sud-Ouest', wilayaCode: '45', baseLoad: 0.064, isUrban: false },
  { name: 'Ain Temouchent-Nord-Ouest', wilayaCode: '46', baseLoad: 0.124, isUrban: true },
  { name: 'Ghardaia-Sud-Ouest', wilayaCode: '47', baseLoad: 0.121, isUrban: false },
  { name: 'Relizane-Nord-Ouest', wilayaCode: '48', baseLoad: 0.242, isUrban: true },
  { name: 'Timimoun-Nouvelles 2023 Sud', wilayaCode: '49', baseLoad: 0.041, isUrban: false },
  { name: 'Bordj Badji Mokhtar-Sahara', wilayaCode: '50', baseLoad: 0.005, isUrban: false },
  { name: 'Ouled Djellal-Sud-Est', wilayaCode: '51', baseLoad: 0.058, isUrban: false },
  { name: 'Beni Abbes-Nouvelles 2023 Sud', wilayaCode: '52', baseLoad: 0.017, isUrban: false },
  { name: 'In Salah-Sahara', wilayaCode: '53', baseLoad: 0.017, isUrban: false },
  { name: 'In Guezzam-Sahara', wilayaCode: '54', baseLoad: 0.004, isUrban: false },
  { name: 'Touggourt-Sud-Est', wilayaCode: '55', baseLoad: 0.082, isUrban: false },
  { name: 'Djanet-Sahara', wilayaCode: '56', baseLoad: 0.006, isUrban: false },
  { name: 'El MGhair-Nouvelles 2023 Sud', wilayaCode: '57', baseLoad: 0.054, isUrban: false },
  { name: 'El Meniaa-Nouvelles 2023 Sud', wilayaCode: '58', baseLoad: 0.019, isUrban: false },
  { name: 'Aflou-Nouvelles 2023 Nord', wilayaCode: '59', baseLoad: 0.061, isUrban: false },
  { name: 'Barika-Nouvelles 2023 Nord', wilayaCode: '60', baseLoad: 0.061, isUrban: true },
  { name: 'El Kantara-Nouvelles 2023 Nord', wilayaCode: '61', baseLoad: 0.014, isUrban: false },
  { name: 'Bir El Ater-Nouvelles 2023 Nord', wilayaCode: '62', baseLoad: 0.033, isUrban: false },
  { name: 'El Aricha-Nouvelles 2023 Nord', wilayaCode: '63', baseLoad: 0.010, isUrban: false },
  { name: 'Ksar Chellala-Nouvelles 2023 Nord', wilayaCode: '64', baseLoad: 0.040, isUrban: false },
  { name: 'Ain Ouessara-Nouvelles 2023 Sud', wilayaCode: '65', baseLoad: 0.084, isUrban: false },
  { name: 'Messaad-Nouvelles 2023 Sud', wilayaCode: '66', baseLoad: 0.073, isUrban: false },
  { name: 'Ksar El Boukhari-Nouvelles 2023 Sud', wilayaCode: '67', baseLoad: 0.086, isUrban: true },
  { name: 'Bou Sada-Nouvelles 2023 Sud', wilayaCode: '68', baseLoad: 0.139, isUrban: false },
  { name: 'El Abiodh Sidi Cheikh-Nouvelles 2023 Sud', wilayaCode: '69', baseLoad: 0.014, isUrban: false },
];

const WILAYAS: { name: string; code: string; baseLoad: number; population: number }[] = [
  { name: 'Adrar', code: '01', baseLoad: 0.133, population: 399_714 },
  { name: 'Chlef', code: '02', baseLoad: 0.334, population: 1_002_088 },
  { name: 'Laghouat', code: '03', baseLoad: 0.091, population: 273_402 },
  { name: 'Oum El Bouaghi', code: '04', baseLoad: 0.207, population: 621_612 },
  { name: 'Batna', code: '05', baseLoad: 0.313, population: 938_075 },
  { name: 'Bejaia', code: '06', baseLoad: 0.304, population: 912_577 },
  { name: 'Biskra', code: '07', baseLoad: 0.226, population: 678_246 },
  { name: 'Bechar', code: '08', baseLoad: 0.090, population: 270_061 },
  { name: 'Blida', code: '09', baseLoad: 0.334, population: 1_002_937 },
  { name: 'Bouira', code: '10', baseLoad: 0.232, population: 695_583 },
  { name: 'Tamanrasset', code: '11', baseLoad: 0.059, population: 176_637 },
  { name: 'Tebessa', code: '12', baseLoad: 0.183, population: 550_262 },
  { name: 'Tlemcen', code: '13', baseLoad: 0.306, population: 918_521 },
  { name: 'Tiaret', code: '14', baseLoad: 0.282, population: 846_823 },
  { name: 'Tizi Ouzou', code: '15', baseLoad: 0.376, population: 1_127_608 },
  { name: 'Alger', code: '16', baseLoad: 0.996, population: 2_988_145 },
  { name: 'Djelfa', code: '17', baseLoad: 0.207, population: 621_077 },
  { name: 'Jijel', code: '18', baseLoad: 0.212, population: 636_948 },
  { name: 'Setif', code: '19', baseLoad: 0.497, population: 1_489_979 },
  { name: 'Saida', code: '20', baseLoad: 0.110, population: 330_641 },
  { name: 'Skikda', code: '21', baseLoad: 0.300, population: 898_680 },
  { name: 'Sidi Bel Abbes', code: '22', baseLoad: 0.202, population: 604_744 },
  { name: 'Annaba', code: '23', baseLoad: 0.203, population: 609_499 },
  { name: 'Guelma', code: '24', baseLoad: 0.161, population: 482_430 },
  { name: 'Constantine', code: '25', baseLoad: 0.313, population: 938_475 },
  { name: 'Medea', code: '26', baseLoad: 0.188, population: 563_012 },
  { name: 'Mostaganem', code: '27', baseLoad: 0.246, population: 737_118 },
  { name: 'MSila', code: '28', baseLoad: 0.191, population: 574_462 },
  { name: 'Mascara', code: '29', baseLoad: 0.261, population: 784_073 },
  { name: 'Ouargla', code: '30', baseLoad: 0.186, population: 558_558 },
  { name: 'Oran', code: '31', baseLoad: 0.528, population: 1_584_607 },
  { name: 'El Bayadh', code: '32', baseLoad: 0.062, population: 185_347 },
  { name: 'Illizi', code: '33', baseLoad: 0.017, population: 52_333 },
  { name: 'Bordj Bou Arreridj', code: '34', baseLoad: 0.209, population: 628_475 },
  { name: 'Boumerdes', code: '35', baseLoad: 0.267, population: 802_083 },
  { name: 'El Tarf', code: '36', baseLoad: 0.136, population: 408_414 },
  { name: 'Tindouf', code: '37', baseLoad: 0.016, population: 49_149 },
  { name: 'Tissemsilt', code: '38', baseLoad: 0.098, population: 294_476 },
  { name: 'El Oued', code: '39', baseLoad: 0.216, population: 647_548 },
  { name: 'Khenchela', code: '40', baseLoad: 0.129, population: 386_683 },
  { name: 'Souk Ahras', code: '41', baseLoad: 0.146, population: 438_127 },
  { name: 'Tipaza', code: '42', baseLoad: 0.197, population: 591_010 },
  { name: 'Mila', code: '43', baseLoad: 0.256, population: 766_886 },
  { name: 'Ain Defla', code: '44', baseLoad: 0.255, population: 766_013 },
  { name: 'Naama', code: '45', baseLoad: 0.064, population: 192_891 },
  { name: 'Ain Temouchent', code: '46', baseLoad: 0.124, population: 371_239 },
  { name: 'Ghardaia', code: '47', baseLoad: 0.121, population: 363_598 },
  { name: 'Relizane', code: '48', baseLoad: 0.242, population: 726_180 },
  { name: 'Timimoun', code: '49', baseLoad: 0.041, population: 122_019 },
  { name: 'Bordj Badji Mokhtar', code: '50', baseLoad: 0.005, population: 16_437 },
  { name: 'Ouled Djellal', code: '51', baseLoad: 0.058, population: 174_219 },
  { name: 'Beni Abbes', code: '52', baseLoad: 0.017, population: 50_163 },
  { name: 'In Salah', code: '53', baseLoad: 0.017, population: 50_392 },
  { name: 'In Guezzam', code: '54', baseLoad: 0.004, population: 11_202 },
  { name: 'Touggourt', code: '55', baseLoad: 0.082, population: 247_221 },
  { name: 'Djanet', code: '56', baseLoad: 0.006, population: 17_618 },
  { name: 'El MGhair', code: '57', baseLoad: 0.054, population: 162_267 },
  { name: 'El Meniaa', code: '58', baseLoad: 0.019, population: 57_276 },
  { name: 'Aflou', code: '59', baseLoad: 0.061, population: 182_938 },
  { name: 'Barika', code: '60', baseLoad: 0.061, population: 181_716 },
  { name: 'El Kantara', code: '61', baseLoad: 0.014, population: 43_110 },
  { name: 'Bir El Ater', code: '62', baseLoad: 0.033, population: 98_441 },
  { name: 'El Aricha', code: '63', baseLoad: 0.010, population: 30_614 },
  { name: 'Ksar Chellala', code: '64', baseLoad: 0.040, population: 120_000 },
  { name: 'Ain Ouessara', code: '65', baseLoad: 0.084, population: 251_038 },
  { name: 'Messaad', code: '66', baseLoad: 0.073, population: 220_069 },
  { name: 'Ksar El Boukhari', code: '67', baseLoad: 0.086, population: 256_920 },
  { name: 'Bou Sada', code: '68', baseLoad: 0.139, population: 416_129 },
  { name: 'El Abiodh Sidi Cheikh', code: '69', baseLoad: 0.014, population: 43_277 },
];

const METRICS: { key: Metric; unit: string; baseValues: { lte: [number, number]; umts: [number, number] }; capacityLimit: { lte: number; umts: number } }[] = [
  {
    key: 'prbUtilization',
    unit: '%',
    baseValues: { lte: [45, 88], umts: [35, 72] },
    capacityLimit: { lte: 85, umts: 70 },
  },
  {
    key: 'activeUsers',
    unit: 'users',
    baseValues: { lte: [200, 3200], umts: [100, 1800] },
    capacityLimit: { lte: 4000, umts: 2500 },
  },
  {
    key: 'throughputDl',
    unit: 'Mbps',
    baseValues: { lte: [12, 58], umts: [4, 18] },
    capacityLimit: { lte: 75, umts: 21 },
  },
  {
    key: 'throughputUl',
    unit: 'Mbps',
    baseValues: { lte: [3, 16], umts: [1, 6] },
    capacityLimit: { lte: 25, umts: 8 },
  },
];

const SEASONAL_PATTERNS: Record<string, string[]> = {
  prbUtilization: ['Summer peak (Jun-Aug)', 'Ramadan evening surge', 'Academic year cycle', 'Holiday weekend spikes'],
  activeUsers: ['Summer tourism influx', 'Ramadan night activity', 'Back-to-school September', 'Winter indoor usage'],
  throughputDl: ['Evening streaming peak', 'Weekend video consumption', 'Ramadan series streaming', 'Summer download surge'],
  throughputUl: ['Morning upload cycle', 'Social media live events', 'Business hour uploads', 'Evening story posts'],
};

const PEAK_HOURS: Record<string, string[]> = {
  prbUtilization: ['19:00-22:00', '20:00-23:00', '18:00-21:00', '21:00-00:00'],
  activeUsers: ['20:00-23:00', '19:00-22:00', '18:00-21:00', '12:00-14:00'],
  throughputDl: ['20:00-23:00', '21:00-00:00', '19:00-22:00', '15:00-18:00'],
  throughputUl: ['09:00-11:00', '08:00-10:00', '10:00-12:00', '18:00-20:00'],
};

const RECOMMENDATIONS: Record<CapacityRisk, string[]> = {
  low: [
    'Continue monitoring current demand trends',
    'Maintain existing capacity configuration',
    'Schedule routine parameter optimization review',
  ],
  medium: [
    'Plan capacity upgrade within 60-90 days',
    'Evaluate carrier aggregation feasibility',
    'Consider small cell densification in hotspots',
    'Initiate procurement for additional spectrum assets',
  ],
  high: [
    'Immediate capacity expansion required — prioritize this site',
    'Deploy additional carriers or refarm underutilized spectrum',
    'Accelerate small cell rollout in identified hotspots',
    'Activate load balancing between overlapping sectors',
  ],
  critical: [
    'CRITICAL: Emergency intervention required within 7 days',
    'Implement immediate spectrum refarming from 2G/3G to LTE',
    'Deploy temporary capacity overlay (COW) within 48 hours',
    'Initiate fast-track CAPEX approval for new site deployment',
    'Engage vendor for emergency equipment delivery',
  ],
};

const MODEL_VERSIONS = ['v2.4.0', 'v2.4.1', 'v2.5.0', 'v2.5.1'] as const;

// ── Deterministic random helpers ───────────────────────────────────────────

function seeded(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function seededRange(seed: number, min: number, max: number): number {
  return +(seeded(seed) * (max - min) + min).toFixed(2);
}

function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seeded(seed) * (max - min + 1)) + min;
}

// ── Forecast point generation ──────────────────────────────────────────────

function generateForecastPoints(
  currentValue: number,
  dailyGrowthRate: number,
  confidenceWidth: number,
  baseSeed: number,
): ForecastPoint[] {
  const today = new Date('2025-01-15');
  const points: ForecastPoint[] = [];
  let prev = currentValue;

  for (let i = 1; i <= 30; i++) {
    const daySeed = baseSeed + i * 7;
    const noise = (seeded(daySeed) - 0.5) * confidenceWidth * 0.3;
    const weekdayFactor = [0, 0, 0, 0, 0, -0.03, -0.06][new Date(today.getTime() + i * 86_400_000).getDay()];
    const predicted = +(prev * (1 + dailyGrowthRate + weekdayFactor) + noise).toFixed(2);
    const spread = predicted * (confidenceWidth / 100) * (1 + i * 0.015);
    const lower = +(predicted - spread).toFixed(2);
    const upper = +(predicted + spread).toFixed(2);
    const date = new Date(today.getTime() + i * 86_400_000);
    points.push({
      date: date.toISOString().split('T')[0],
      predicted: Math.max(0, predicted),
      lower: Math.max(0, lower),
      upper: Math.max(0, upper),
    });
    prev = Math.max(0, predicted);
  }
  return points;
}

// ── Single forecast generator ──────────────────────────────────────────────

function generateForecast(
  regionName: string,
  wilayaCode: string,
  loadFactor: number,
  metricIndex: number,
  techIndex: number,
  seed: number,
): DemandForecast {
  const tech = techIndex === 0 ? ('4G-LTE' as Technology) : ('3G-UMTS' as Technology);
  const metric = METRICS[metricIndex];
  const techKey = techIndex === 0 ? 'lte' : 'umts';
  const [minVal, maxVal] = metric.baseValues[techKey];
  const capLimit = metric.capacityLimit[techKey];

  const currentValue = +(seededRange(seed, minVal, maxVal) * loadFactor).toFixed(2);
  const peakMultiplier = seededRange(seed + 1, 1.12, 1.35);
  const avgMultiplier = seededRange(seed + 2, 0.72, 0.88);
  const peakValue = +(currentValue * peakMultiplier).toFixed(2);
  const avgValue = +(currentValue * avgMultiplier).toFixed(2);

  const dailyGrowthRate = seededRange(seed + 3, 0.001, 0.008);
  const growthRate7d = +((1 + dailyGrowthRate) ** 7 - 1).toFixed(4);
  const growthRate14d = +((1 + dailyGrowthRate) ** 14 - 1).toFixed(4);
  const growthRate30d = +((1 + dailyGrowthRate) ** 30 - 1).toFixed(4);
  const growthRate90d = +((1 + dailyGrowthRate * 1.15) ** 90 - 1).toFixed(4);

  const forecast7d = +(currentValue * (1 + growthRate7d)).toFixed(2);
  const forecast14d = +(currentValue * (1 + growthRate14d)).toFixed(2);
  const forecast30d = +(currentValue * (1 + growthRate30d)).toFixed(2);
  const forecast90d = +(currentValue * (1 + growthRate90d)).toFixed(2);

  const utilizationPct = currentValue / capLimit;
  let capacityRisk: CapacityRisk;
  let daysToCapacity: number;

  if (utilizationPct >= 0.92) {
    capacityRisk = 'critical';
    daysToCapacity = seededInt(seed + 4, 3, 10);
  } else if (utilizationPct >= 0.78) {
    capacityRisk = 'high';
    daysToCapacity = seededInt(seed + 4, 10, 35);
  } else if (utilizationPct >= 0.60) {
    capacityRisk = 'medium';
    daysToCapacity = seededInt(seed + 4, 30, 90);
  } else {
    capacityRisk = 'low';
    daysToCapacity = seededInt(seed + 4, 90, 365);
  }

  const modelVersion = MODEL_VERSIONS[seededInt(seed + 5, 0, MODEL_VERSIONS.length - 1)];
  const modelAccuracy = +seededRange(seed + 6, 0.88, 0.97).toFixed(3);
  const confidence = +seededRange(seed + 7, 0.75, 0.96).toFixed(3);
  const confidenceWidth = seededRange(seed + 8, 8, 22);

  const seasonalOpts = SEASONAL_PATTERNS[metric.key];
  const seasonalPattern = seasonalOpts[seededInt(seed + 9, 0, seasonalOpts.length - 1)];
  const peakOpts = PEAK_HOURS[metric.key];
  const peakHour = peakOpts[seededInt(seed + 10, 0, peakOpts.length - 1)];

  const recOpts = RECOMMENDATIONS[capacityRisk];
  const recommendation = recOpts[seededInt(seed + 11, 0, recOpts.length - 1)];

  // CAPEX in DZD: critical > high > medium > low, scaled by load factor
  const capexBase: Record<CapacityRisk, number> = {
    critical: 450_000_000,
    high: 220_000_000,
    medium: 95_000_000,
    low: 25_000_000,
  };
  const requiredCapex = Math.round(capexBase[capacityRisk] * loadFactor * seededRange(seed + 12, 0.7, 1.3));

  const forecastPoints = generateForecastPoints(currentValue, dailyGrowthRate, confidenceWidth, seed + 100);

  return {
    region: regionName,
    wilayaCode,
    metric: metric.key,
    technology: tech,
    currentValue,
    peakValue,
    avgValue,
    forecast7d,
    forecast14d,
    forecast30d,
    forecast90d,
    growthRate7d,
    growthRate14d,
    growthRate30d,
    growthRate90d,
    capacityLimit: capLimit,
    daysToCapacity,
    capacityRisk,
    modelVersion,
    modelAccuracy,
    confidence,
    seasonalPattern,
    peakHour,
    recommendation,
    requiredCapex,
    forecastPoints,
  };
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    // ── Generate 69 region-level forecasts (rotate metric + technology) ──
    const forecastsByRegion: DemandForecast[] = REGIONS.map((region, i) => {
      const metricIndex = i % 4; // 0=prbUtilization, 1=activeUsers, 2=throughputDl, 3=throughputUl
      const techIndex = i % 2 === 0 ? 0 : 1; // 0=4G-LTE, 1=3G-UMTS
      return generateForecast(region.name, region.wilayaCode, region.baseLoad, metricIndex, techIndex, 1000 + i * 13);
    });

    // ── Generate 69 wilaya-level forecasts (all 4 metrics, mix of techs) ──
    const forecastsByWilaya: DemandForecast[] = WILAYAS.flatMap((wilaya, i) => {
      // Each wilaya gets one primary metric (rotating), with 4G-LTE
      const metricIndex = i % 4;
      const primary = generateForecast(wilaya.name, wilaya.code, wilaya.baseLoad, metricIndex, 0, 2000 + i * 17);
      return [primary];
    });

    // ── Summary ──
    const allForecasts = [...forecastsByRegion, ...forecastsByWilaya];
    const totalForecasts = allForecasts.length;
    const criticalCapacityRisks = allForecasts.filter((f) => f.capacityRisk === 'critical').length;
    const avgModelAccuracy = +(
      allForecasts.reduce((sum, f) => sum + f.modelAccuracy, 0) / totalForecasts
    ).toFixed(3);

    const summary = {
      totalForecasts,
      criticalCapacityRisks,
      avgModelAccuracy,
      generatedAt: new Date().toISOString(),
      forecastHorizon: '90 days',
      modelVersions: [...new Set(allForecasts.map((f) => f.modelVersion))],
      riskDistribution: {
        low: allForecasts.filter((f) => f.capacityRisk === 'low').length,
        medium: allForecasts.filter((f) => f.capacityRisk === 'medium').length,
        high: allForecasts.filter((f) => f.capacityRisk === 'high').length,
        critical: allForecasts.filter((f) => f.capacityRisk === 'critical').length,
      },
      totalRequiredCapex: allForecasts.reduce((sum, f) => sum + f.requiredCapex, 0),
      avgDaysToCapacity: +(
        allForecasts.reduce((sum, f) => sum + f.daysToCapacity, 0) / totalForecasts
      ).toFixed(1),
    };

    return NextResponse.json({
      summary,
      forecastsByRegion,
      forecastsByWilaya,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
