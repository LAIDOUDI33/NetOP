import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ── Wilaya Data (all 69) ────────────────────────────────────────────────────

interface WilayaData {
  code: string; name: string; cluster: string;
  population: number; sites: number; networkScore: number; compositeScore: number; density: number;
}

const WILAYAS: WilayaData[] = [
  { code:'01', name:'Adrar', cluster:'Sud-Ouest', population:399714, sites:24, networkScore:33, compositeScore:36, density:0.94 },
  { code:'02', name:'Chlef', cluster:'Nord-Ouest', population:1002088, sites:88, networkScore:78, compositeScore:76, density:209 },
  { code:'03', name:'Laghouat', cluster:'Sud-Ouest', population:273402, sites:14, networkScore:40, compositeScore:42, density:15 },
  { code:'04', name:'Oum El Bouaghi', cluster:'Sud-Est', population:621612, sites:46, networkScore:64, compositeScore:61, density:81 },
  { code:'05', name:'Batna', cluster:'Hauts Plateaux', population:938075, sites:81, networkScore:75, compositeScore:73, density:108 },
  { code:'06', name:'Bejaia', cluster:'Kabylie', population:912577, sites:86, networkScore:71, compositeScore:72, density:279 },
  { code:'07', name:'Biskra', cluster:'Sud-Est', population:678246, sites:48, networkScore:66, compositeScore:63, density:35 },
  { code:'08', name:'Bechar', cluster:'Sud-Ouest', population:270061, sites:13, networkScore:34, compositeScore:33, density:1.7 },
  { code:'09', name:'Blida', cluster:'Grand Alger', population:1002937, sites:134, networkScore:80, compositeScore:83, density:591 },
  { code:'10', name:'Bouira', cluster:'Kabylie', population:695583, sites:63, networkScore:79, compositeScore:76, density:157 },
  { code:'11', name:'Tamanrasset', cluster:'Sahara', population:176637, sites:8, networkScore:34, compositeScore:29, density:0.32 },
  { code:'12', name:'Tebessa', cluster:'Hauts Plateaux', population:550262, sites:42, networkScore:62, compositeScore:62, density:60 },
  { code:'13', name:'Tlemcen', cluster:'Nord-Ouest', population:918521, sites:81, networkScore:78, compositeScore:76, density:150 },
  { code:'14', name:'Tiaret', cluster:'Hauts Plateaux', population:846823, sites:53, networkScore:58, compositeScore:60, density:41 },
  { code:'15', name:'Tizi Ouzou', cluster:'Kabylie', population:1127608, sites:101, networkScore:77, compositeScore:74, density:316 },
  { code:'16', name:'Alger', cluster:'Grand Alger', population:2988145, sites:377, networkScore:85, compositeScore:86, density:2511 },
  { code:'17', name:'Djelfa', cluster:'Hauts Plateaux', population:621077, sites:49, networkScore:57, compositeScore:60, density:46 },
  { code:'18', name:'Jijel', cluster:'Kabylie', population:636948, sites:59, networkScore:80, compositeScore:74, density:247 },
  { code:'19', name:'Setif', cluster:'Nord-Est', population:1489979, sites:126, networkScore:75, compositeScore:73, density:229 },
  { code:'20', name:'Saida', cluster:'Hauts Plateaux', population:330641, sites:30, networkScore:55, compositeScore:58, density:49 },
  { code:'21', name:'Skikda', cluster:'Nord-Est', population:898680, sites:80, networkScore:79, compositeScore:76, density:223 },
  { code:'22', name:'Sidi Bel Abbes', cluster:'Nord-Ouest', population:604744, sites:39, networkScore:58, compositeScore:59, density:66 },
  { code:'23', name:'Annaba', cluster:'Nord-Est', population:609499, sites:59, networkScore:74, compositeScore:74, density:424 },
  { code:'24', name:'Guelma', cluster:'Nord-Est', population:482430, sites:44, networkScore:78, compositeScore:75, density:118 },
  { code:'25', name:'Constantine', cluster:'Nord-Est', population:938475, sites:78, networkScore:73, compositeScore:72, density:427 },
  { code:'26', name:'Medea', cluster:'Hauts Plateaux', population:563012, sites:54, networkScore:77, compositeScore:72, density:136 },
  { code:'27', name:'Mostaganem', cluster:'Nord-Ouest', population:737118, sites:64, networkScore:76, compositeScore:73, density:325 },
  { code:'28', name:'MSila', cluster:'Hauts Plateaux', population:574462, sites:46, networkScore:57, compositeScore:60, density:31 },
  { code:'29', name:'Mascara', cluster:'Nord-Ouest', population:784073, sites:71, networkScore:80, compositeScore:75, density:132 },
  { code:'30', name:'Ouargla', cluster:'Sud-Est', population:558558, sites:30, networkScore:42, compositeScore:41, density:2.6 },
  { code:'31', name:'Oran', cluster:'Nord-Ouest', population:1584607, sites:207, networkScore:80, compositeScore:84, density:688 },
  { code:'32', name:'El Bayadh', cluster:'Sud-Ouest', population:185347, sites:14, networkScore:47, compositeScore:44, density:4.4 },
  { code:'33', name:'Illizi', cluster:'Sahara', population:52333, sites:5, networkScore:34, compositeScore:28, density:0.18 },
  { code:'34', name:'Bordj Bou Arreridj', cluster:'Hauts Plateaux', population:628475, sites:60, networkScore:74, compositeScore:74, density:160 },
  { code:'35', name:'Boumerdes', cluster:'Grand Alger', population:802083, sites:104, networkScore:86, compositeScore:85, density:504 },
  { code:'36', name:'El Tarf', cluster:'Nord-Est', population:408414, sites:34, networkScore:73, compositeScore:71, density:122 },
  { code:'37', name:'Tindouf', cluster:'Sud-Ouest', population:49149, sites:9, networkScore:35, compositeScore:28, density:0.31 },
  { code:'38', name:'Tissemsilt', cluster:'Hauts Plateaux', population:294476, sites:21, networkScore:61, compositeScore:58, density:93 },
  { code:'39', name:'El Oued', cluster:'Sud-Est', population:647548, sites:42, networkScore:39, compositeScore:44, density:12 },
  { code:'40', name:'Khenchela', cluster:'Hauts Plateaux', population:386683, sites:30, networkScore:66, compositeScore:62, density:40 },
  { code:'41', name:'Souk Ahras', cluster:'Nord-Est', population:438127, sites:29, networkScore:61, compositeScore:59, density:95 },
  { code:'42', name:'Tipaza', cluster:'Grand Alger', population:591010, sites:58, networkScore:69, compositeScore:71, density:273 },
  { code:'43', name:'Mila', cluster:'Nord-Est', population:766886, sites:69, networkScore:79, compositeScore:76, density:220 },
  { code:'44', name:'Ain Defla', cluster:'Hauts Plateaux', population:766013, sites:65, networkScore:75, compositeScore:72, density:156 },
  { code:'45', name:'Naama', cluster:'Sud-Ouest', population:192891, sites:18, networkScore:44, compositeScore:44, density:6.5 },
  { code:'46', name:'Ain Temouchent', cluster:'Nord-Ouest', population:371239, sites:35, networkScore:78, compositeScore:74, density:156 },
  { code:'47', name:'Ghardaia', cluster:'Sud-Ouest', population:363598, sites:18, networkScore:40, compositeScore:42, density:4.2 },
  { code:'48', name:'Relizane', cluster:'Nord-Ouest', population:726180, sites:68, networkScore:77, compositeScore:73, density:152 },
  { code:'49', name:'Timimoun', cluster:'Nouvelles 2023 Sud', population:122019, sites:8, networkScore:33, compositeScore:27, density:1.87 },
  { code:'50', name:'Bordj Badji Mokhtar', cluster:'Sahara', population:16437, sites:11, networkScore:31, compositeScore:29, density:0.13 },
  { code:'51', name:'Ouled Djellal', cluster:'Sud-Est', population:174219, sites:15, networkScore:46, compositeScore:43, density:15 },
  { code:'52', name:'Beni Abbes', cluster:'Nouvelles 2023 Sud', population:50163, sites:5, networkScore:34, compositeScore:28, density:0.49 },
  { code:'53', name:'In Salah', cluster:'Sahara', population:50392, sites:11, networkScore:29, compositeScore:27, density:0.38 },
  { code:'54', name:'In Guezzam', cluster:'Sahara', population:11202, sites:5, networkScore:38, compositeScore:31, density:0.12 },
  { code:'55', name:'Touggourt', cluster:'Sud-Est', population:247221, sites:13, networkScore:41, compositeScore:42, density:14 },
  { code:'56', name:'Djanet', cluster:'Sahara', population:17618, sites:9, networkScore:33, compositeScore:29, density:0.2 },
  { code:'57', name:'El MGhair', cluster:'Nouvelles 2023 Sud', population:162267, sites:12, networkScore:44, compositeScore:43, density:18 },
  { code:'58', name:'El Meniaa', cluster:'Nouvelles 2023 Sud', population:57276, sites:5, networkScore:33, compositeScore:28, density:0.92 },
  { code:'59', name:'Aflou', cluster:'Nouvelles 2023 Nord', population:182938, sites:16, networkScore:45, compositeScore:43, density:27 },
  { code:'60', name:'Barika', cluster:'Nouvelles 2023 Nord', population:181716, sites:14, networkScore:61, compositeScore:57, density:58 },
  { code:'61', name:'El Kantara', cluster:'Nouvelles 2023 Nord', population:43110, sites:12, networkScore:39, compositeScore:37, density:29 },
  { code:'62', name:'Bir El Ater', cluster:'Nouvelles 2023 Nord', population:98441, sites:11, networkScore:46, compositeScore:42, density:19 },
  { code:'63', name:'El Aricha', cluster:'Nouvelles 2023 Nord', population:30614, sites:5, networkScore:42, compositeScore:34, density:10 },
  { code:'64', name:'Ksar Chellala', cluster:'Nouvelles 2023 Nord', population:120000, sites:17, networkScore:55, compositeScore:57, density:34 },
  { code:'65', name:'Ain Ouessara', cluster:'Nouvelles 2023 Sud', population:251038, sites:21, networkScore:66, compositeScore:62, density:40 },
  { code:'66', name:'Messaad', cluster:'Nouvelles 2023 Sud', population:220069, sites:12, networkScore:41, compositeScore:42, density:14 },
  { code:'67', name:'Ksar El Boukhari', cluster:'Nouvelles 2023 Sud', population:256920, sites:24, networkScore:62, compositeScore:61, density:54 },
  { code:'68', name:'Bou Sada', cluster:'Nouvelles 2023 Sud', population:416129, sites:30, networkScore:63, compositeScore:61, density:49 },
  { code:'69', name:'El Abiodh Sidi Cheikh', cluster:'Nouvelles 2023 Sud', population:43277, sites:5, networkScore:33, compositeScore:28, density:1.17 },
];

// ── Constants ────────────────────────────────────────────────────────────────

const ALGORITHMS = ['gradient_boost', 'neural_net', 'reinforcement', 'bayesian'] as const;
type __Algorithm = (typeof ALGORITHMS)[number];

const PARAMETER_CATEGORIES = [
  'power_control', 'tilt_antenna', 'handover',
  'cell_selection', 'interference_management', 'capacity_load',
] as const;
type ParameterCategory = (typeof PARAMETER_CATEGORIES)[number];

const PARAM_TEMPLATES: Record<ParameterCategory, { name: string; previousValue: string; optimizedValue: string; unit: string }[][]> = {
  power_control: [
    [{ name: 'rsPower', previousValue: '15.2', optimizedValue: '18.0', unit: 'dBm' }, { name: 'pMax', previousValue: '23.0', optimizedValue: '23.0', unit: 'dBm' }],
    [{ name: 'rsPower', previousValue: '12.8', optimizedValue: '16.5', unit: 'dBm' }, { name: 'pucchPowerControl', previousValue: '-90', optimizedValue: '-85', unit: 'dBm' }],
  ],
  tilt_antenna: [
    [{ name: 'elecTilt', previousValue: '6', optimizedValue: '4', unit: 'deg' }, { name: 'antennaAzimuth', previousValue: '120', optimizedValue: '125', unit: 'deg' }],
    [{ name: 'elecTilt', previousValue: '8', optimizedValue: '5', unit: 'deg' }, { name: 'antennaHeight', previousValue: '30', optimizedValue: '30', unit: 'm' }],
  ],
  handover: [
    [{ name: 'hysteresis', previousValue: '2', optimizedValue: '1', unit: 'dB' }, { name: 'timeToTrigger', previousValue: '320', optimizedValue: '256', unit: 'ms' }],
    [{ name: 'a3Offset', previousValue: '3', optimizedValue: '1', unit: 'dB' }, { name: 'hysteresis', previousValue: '3', optimizedValue: '2', unit: 'dB' }],
  ],
  cell_selection: [
    [{ name: 'qRxLevMin', previousValue: '-64', optimizedValue: '-70', unit: 'dBm' }, { name: 'sNonIntraSearch', previousValue: '4', optimizedValue: '6', unit: 'dB' }],
    [{ name: 'qRxLevMin', previousValue: '-58', optimizedValue: '-66', unit: 'dBm' }, { name: 'qQualMin', previousValue: '-20', optimizedValue: '-24', unit: 'dB' }],
  ],
  interference_management: [
    [{ name: 'icicThreshold', previousValue: '-105', optimizedValue: '-100', unit: 'dBm' }, { name: 'pdschInterference', previousValue: '-90', optimizedValue: '-85', unit: 'dBm' }],
    [{ name: 'icicThreshold', previousValue: '-108', optimizedValue: '-102', unit: 'dBm' }, { name: 'pucchThreshold', previousValue: '-112', optimizedValue: '-108', unit: 'dBm' }],
  ],
  capacity_load: [
    [{ name: 'prbThreshold', previousValue: '70', optimizedValue: '80', unit: '%' }, { name: 'loadBalancingOffset', previousValue: '3', optimizedValue: '5', unit: 'dB' }],
    [{ name: 'prbThreshold', previousValue: '60', optimizedValue: '75', unit: '%' }, { name: 'bandwidth', previousValue: '20', optimizedValue: '20', unit: 'MHz' }],
  ],
};

// ── Seeded PRNG (Mulberry32) ───────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRun(w: WilayaData, index: number) {
  const rng = mulberry32(parseInt(w.code, 10) * 7919 + index);
  const siteName = `${w.code.slice(-2)}_SITE_${String(100 + Math.floor(rng() * 900)).padStart(3, '0')}`;
  const isUrban = w.density > 50;
  const tech = isUrban ? '4G LTE' : '3G UMTS';
  const category = PARAMETER_CATEGORIES[index % PARAMETER_CATEGORIES.length];
  const algorithm = ALGORITHMS[Math.floor(rng() * ALGORITHMS.length)];

  const statusRoll = rng();
  const status = statusRoll < 0.65 ? 'completed' : statusRoll < 0.80 ? 'pending' : statusRoll < 0.90 ? 'rolled_back' : 'failed';
  const appliedToNetwork = status === 'completed';
  const rollbackReason = status === 'rolled_back' ? 'KPI degradation detected after 24h observation window' : null;

  // Impact scaled by networkScore
  const baseImpact = 30 + (w.networkScore / 100) * 55;
  const impactScore = Math.floor(baseImpact + (rng() - 0.5) * 20);
  const confidence = +(0.75 + rng() * 0.20).toFixed(3);
  const trainingSamples = Math.floor(50000 + rng() * 150000);

  const tplIdx = index % PARAM_TEMPLATES[category].length;
  const parameters = PARAM_TEMPLATES[category][tplIdx];

  // KPIs driven by networkScore
  const ns = w.networkScore / 100;
  const kpiBefore = {
    rsrp: +(-82 + ns * 20 + (rng() - 0.5) * 8).toFixed(1),
    sinr: +(3 + ns * 12 + (rng() - 0.5) * 4).toFixed(1),
    throughputDl: +(12 + ns * 40 + (rng() - 0.5) * 10).toFixed(1),
    dropRate: +(4.5 - ns * 3 + (rng() - 0.5) * 1.5).toFixed(2),
    prbUtilization: +(45 + (1 - ns) * 35 + (rng() - 0.5) * 10).toFixed(1),
  };

  const factor = Math.min(impactScore, 95) / 100;
  const kpiPredictedAfter = {
    rsrp: +(kpiBefore.rsrp + factor * (3 + rng() * 5)).toFixed(1),
    sinr: +(kpiBefore.sinr + factor * (2 + rng() * 4)).toFixed(1),
    throughputDl: +(kpiBefore.throughputDl + factor * (8 + rng() * 20)).toFixed(1),
    dropRate: +(Math.max(0, kpiBefore.dropRate - factor * (0.5 + rng() * 2))).toFixed(2),
    prbUtilization: +(Math.min(100, kpiBefore.prbUtilization + factor * (rng() * 8 - 2))).toFixed(1),
  };

  const j = () => (rng() - 0.5) * 1.5;
  const kpiActualAfter = appliedToNetwork ? {
    rsrp: +(kpiPredictedAfter.rsrp + j()).toFixed(1),
    sinr: +(kpiPredictedAfter.sinr + j()).toFixed(1),
    throughputDl: +(kpiPredictedAfter.throughputDl + j() * 3).toFixed(1),
    dropRate: +(Math.max(0, kpiPredictedAfter.dropRate + j() * 0.3)).toFixed(2),
    prbUtilization: +(Math.min(100, kpiPredictedAfter.prbUtilization + j())).toFixed(1),
  } : null;

  const riskLevel = impactScore > 75 ? 'high' : impactScore > 50 ? 'medium' : 'low';
  const modelVersion = algorithm === 'neural_net' ? 'v2.4.0' : algorithm === 'reinforcement' ? 'v1.8.3' : algorithm === 'bayesian' ? 'v3.1.0' : 'v2.7.2';
  const appliedAt = appliedToNetwork ? new Date(Date.now() - Math.floor(rng() * 7 * 86400000)).toISOString() : null;

  const recs = [
    `Apply optimized ${category.replace('_', ' ')} parameters during low-traffic window (02:00-04:00)`,
    `Monitor KPIs for 48h post-application; auto-rollback if RSRP degrades >3 dBm`,
    `Correlate with neighbor cell adjustments for ${w.name}`,
    `Schedule follow-up optimization cycle in 7 days for ${w.name} cluster`,
  ];

  return {
    id: `opt-${String(2025000 + index + 1).padStart(8, '0')}`,
    siteName,
    region: w.cluster,
    technology: tech,
    parameterCategory: category,
    parameters,
    kpiBefore,
    kpiPredictedAfter,
    kpiActualAfter,
    impactScore: Math.max(0, Math.min(100, impactScore)),
    riskLevel,
    confidence,
    modelVersion,
    algorithm,
    trainingSamples,
    status,
    appliedToNetwork,
    rollbackReason,
    appliedAt,
    recommendation: recs[index % recs.length],
  };
}

// ── Parameter impact matrix ───────────────────────────────────────────────

function buildParameterImpactMatrix(runs: ReturnType<typeof generateRun>[]) {
  const kpiKeys = ['rsrp', 'sinr', 'throughputDl', 'dropRate', 'prbUtilization'] as const;
  return PARAMETER_CATEGORIES.map((cat) => {
    const catRuns = runs.filter((r) => r.parameterCategory === cat && r.appliedToNetwork && r.kpiActualAfter);
    const avgImprovements: Record<string, number> = {};
    for (const key of kpiKeys) {
      if (catRuns.length === 0) { avgImprovements[key] = 0; continue; }
      const total = catRuns.reduce((sum, r) => {
        const before = r.kpiBefore[key];
        const after = (r.kpiActualAfter as Record<string, number>)[key];
        return sum + (key === 'dropRate' ? before - after : after - before);
      }, 0);
      avgImprovements[key] = +(total / catRuns.length).toFixed(2);
    }
    return { category: cat, sampleSize: catRuns.length, avgImprovement: avgImprovements };
  });
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const optimizationRuns = WILAYAS.map((w, i) => generateRun(w, i));
    const totalOptimizations = optimizationRuns.length;
    const avgImpactScore = +(optimizationRuns.reduce((s, r) => s + r.impactScore, 0) / totalOptimizations).toFixed(1);
    const totalApplied = optimizationRuns.filter((r) => r.appliedToNetwork).length;
    const avgConfidence = +(optimizationRuns.reduce((s, r) => s + r.confidence, 0) / totalOptimizations).toFixed(3);

    const byAlgorithm = ALGORITHMS.map((alg) => {
      const filtered = optimizationRuns.filter((r) => r.algorithm === alg);
      return { algorithm: alg, count: filtered.length, avgImpactScore: +((filtered.reduce((s, r) => s + r.impactScore, 0)) / Math.max(1, filtered.length)).toFixed(1) };
    });

    const byParameterCategory = PARAMETER_CATEGORIES.map((cat) => {
      const filtered = optimizationRuns.filter((r) => r.parameterCategory === cat);
      return { category: cat, count: filtered.length, avgImpactScore: +((filtered.reduce((s, r) => s + r.impactScore, 0)) / Math.max(1, filtered.length)).toFixed(1) };
    });

    return NextResponse.json({
      summary: { totalOptimizations, avgImpactScore, totalApplied, avgConfidence, byAlgorithm, byParameterCategory },
      optimizationRuns,
      parameterImpact: buildParameterImpactMatrix(optimizationRuns),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
