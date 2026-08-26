import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { WILAYA_69 } from '@/lib/wilayas';
import type { WilayaRef } from '@/lib/wilayas';

// ── Types ─────────────────────────────────────────────────────────────
const __TECHNOLOGIES = ['LTE', '5G NR', 'UMTS', 'GSM'] as const;

const CATEGORIES = [
  'capacity_expansion',
  'coverage_improvement',
  'parameter_change',
  'new_site',
  'technology_upgrade',
] as const;

type Category = (typeof CATEGORIES)[number];
type Status = 'draft' | 'running' | 'completed' | 'failed';

type Scenario = {
  id: string;
  scenarioName: string;
  region: string;
  technology: string;
  category: Category;
  baselineConfig: {
    siteCount: number;
    avgRsrp: number;
    avgThroughput: number;
    avgAvailability: number;
    avgDropRate: number;
    prbUtilization: number;
  };
  baselineKpis: {
    rsrp: number;
    sinr: number;
    throughputDl: number;
    throughputUl: number;
    availability: number;
    dropRate: number;
    prbUtilization: number;
    activeUsers: number;
  };
  simulatedConfig: Record<string, unknown>;
  simulatedKpis: {
    rsrp: number;
    sinr: number;
    throughputDl: number;
    throughputUl: number;
    availability: number;
    dropRate: number;
    prbUtilization: number;
    activeUsers: number;
  };
  impactScore: number;
  riskLevel: string;
  confidence: number;
  estimatedCapex: number;
  estimatedOpexChange: number;
  paybackMonths: number;
  roiPercentage: number;
  modelVersion: string;
  simulationEngine: string;
  status: Status;
  recommendation: string;
};

// ── Seeded PRNG (mulberry32) — deterministic per wilaya code ──────────
function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Density normalizer: log-scale 0→1 ────────────────────────────────
// Alger has density 2511 — we use that as the upper bound.
const MAX_LOG_DENSITY = Math.log10(2512);
function densityFactor(density: number): number {
  return Math.log10(density + 1) / MAX_LOG_DENSITY;
}

// ── Helpers ───────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function __r1(rand: () => number, lo: number, hi: number): number {
  return +lerp(lo, hi, rand()).toFixed(1);
}

function rInt(rand: () => number, lo: number, hi: number): number {
  return Math.round(lerp(lo, hi, rand()));
}

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ── Determine if a cluster is "southern / desert" (low density) ─────
const DESERT_CLUSTERS = new Set([
  'Sahara', 'Sud-Ouest', 'Sud-Est', 'Nouvelles 2023 Sud', 'Nouvelles 2023 Nord',
]);
function isDesertLike(cluster: string): boolean {
  return DESERT_CLUSTERS.has(cluster);
}

// ── Scenario name templates per category ──────────────────────────────
const SCENARIO_TEMPLATES: Record<Category, (_w: WilayaRef, _tech: string) => string> = {
  capacity_expansion: (w, tech) => {
    const actions = [
      `Second ${tech} Carrier Addition`,
      `${tech} MIMO Upgrade for High-Density Sites`,
      `${tech} Spectrum Refarming for Capacity Relief`,
      `${tech} Carrier Aggregation Deployment`,
      `${tech} Small Cell Densification`,
    ];
    return `${w.name} — ${pick(actions, seededRandom(w.code.charCodeAt(0) * 7 + 1))}`;
  },
  coverage_improvement: (w, tech) => {
    const actions = [
      `${tech} Coverage Gap Fill-in`,
      `${tech} Indoor DAS Deployment`,
      `Rural ${tech} Coverage Extension`,
      `${tech} Signal Boost in Low-coverage Zones`,
      `${tech} Corridor Coverage Enhancement`,
    ];
    return `${w.name} — ${pick(actions, seededRandom(w.code.charCodeAt(0) * 7 + 2))}`;
  },
  parameter_change: (w, tech) => {
    const actions = [
      `Inter-Site Handover Parameter Tuning`,
      `PCI Confusion Resolution & Interference Mitigation`,
      `Uplink Power Control & Cell Range Optimization`,
      `${tech} Neighbour List Optimization`,
      `${tech} RF Parameter Retuning`,
    ];
    return `${w.name} — ${pick(actions, seededRandom(w.code.charCodeAt(0) * 7 + 3))}`;
  },
  new_site: (w, tech) => {
    const actions = [
      `New Greenfield ${tech} Site Deployment`,
      `Highway Corridor ${tech} Site Construction`,
      `Industrial Zone ${tech} New Site`,
      `${tech} Coverage Gap Site Build`,
      `Urban Infill ${tech} Site Addition`,
    ];
    return `${w.name} — ${pick(actions, seededRandom(w.code.charCodeAt(0) * 7 + 4))}`;
  },
  technology_upgrade: (w, tech) => {
    const actions = [
      `${tech} Overlay Deployment`,
      `${tech} Network Modernization`,
      `4x4 MIMO + Inter-band CA Upgrade`,
      `${tech} Infrastructure Upgrade`,
      `${tech} Core Network Integration`,
    ];
    return `${w.name} — ${pick(actions, seededRandom(w.code.charCodeAt(0) * 7 + 5))}`;
  },
};

// ── SimulatedConfig generators per category ───────────────────────────
function generateSimulatedConfig(
  w: WilayaRef,
  category: Category,
  tech: string,
  rand: () => number,
  baselineSiteCount: number,
): Record<string, unknown> {
  const sitesAffected = Math.max(1, Math.round(baselineSiteCount * lerp(0.3, 0.8, rand())));

  switch (category) {
    case 'capacity_expansion':
      if (tech === '5G NR') {
        return {
          change: `Overlay ${tech} on ${sitesAffected} existing 4G sites using n78 (3.5 GHz) band`,
          bandwidth: `${rInt(rand, 60, 100)} MHz TDD`,
          massiveMimo: pick(['32T32R AAU', '64T64R AAU'], rand),
          coreIntegration: '5G SA with UPF local breakout',
          sitesUpgraded: sitesAffected,
        };
      }
      return {
        change: `Add ${tech} ${pick(['Band 3 (1800 MHz)', 'Band 7 (2600 MHz)', 'Band 20 (800 MHz)'], rand)} second carrier on ${sitesAffected} macro sites`,
        bandwidth: `${rInt(rand, 10, 20)} MHz additional`,
        mimoConfig: pick(['4x4 MIMO on new carrier', '2x2 MIMO', '4T4R RRU'], rand),
        sitesAffected,
      };

    case 'coverage_improvement': {
      const sitesAdded = rInt(rand, 3, 12);
      if (isDesertLike(w.cluster)) {
        return {
          change: `Deploy ${sitesAdded} ${tech} sites along ${w.name} coverage corridors`,
          powerSystem: 'Solar + battery backup (48h autonomy)',
          antenna: 'High-gain 18 dBi panel, 90° beamwidth',
          backhaul: pick(['Satellite backhaul with LTE optimization proxy', 'Microwave ring (N+1 protection)'], rand),
          sitesAdded,
        };
      }
      return {
        change: `Deploy ${sitesAdded} ${tech} micro/small-cell sites in ${w.name} low-coverage zones`,
        antennaHeight: `${rInt(rand, 12, 25)} m`,
        tilt: 'Electrical tilt 6° downward',
        backhaul: pick(['Microwave 1 Gbps links', 'Fiber to site', 'Microwave ring (N+1 protection)'], rand),
        sitesAdded,
      };
    }

    case 'parameter_change':
      return {
        change: `Optimize RF parameters on ${sitesAffected} ${tech} sites in ${w.name}`,
        a3Offset: pick(['2 dB → 1 dB', '3 dB → 1 dB', '2 dB → 0 dB'], rand),
        tttTimer: pick(['320 ms → 128 ms', '256 ms → 64 ms', '480 ms → 128 ms'], rand),
        cioAdjustment: '-3 to +3 dB per neighbor pair',
        neighborListExpansion: `+${rInt(rand, 10, 25)}% additional neighbors`,
        sitesAffected,
      };

    case 'new_site': {
      const sitesAdded = rInt(rand, 2, 6);
      return {
        change: `Construct ${sitesAdded} new ${tech} macro sites in ${w.name}`,
        antennaType: pick(['2T2R panel, 65° beamwidth', '4T4R panel, 65° beamwidth', '8T8R AAU, 65° beamwidth'], rand),
        towerHeight: `${rInt(rand, 25, 40)} m ${pick(['guyed mast', 'monopole', 'self-support tower'], rand)}`,
        power: `${rInt(rand, 20, 40)} W per carrier`,
        backhaul: pick(['Fiber via existing ducts', 'Microwave ring (N+1 protection)', 'Fiber + microwave hybrid'], rand),
        sitesAdded,
      };
    }

    case 'technology_upgrade':
      if (tech === '5G NR') {
        return {
          change: `Upgrade ${sitesAffected} sites from 4G to ${tech} using n78 band`,
          bandwidth: `${rInt(rand, 60, 100)} MHz TDD`,
          massiveMimo: pick(['32T32R AAU', '64T64R AAU'], rand),
          networkSlicing: '2 slices: mMTC + URLLC',
          sitesUpgraded: sitesAffected,
        };
      }
      return {
        change: `Upgrade ${sitesAffected} sites to 4x4 MIMO + inter-band CA (B3+B7)`,
        mimoUpgrade: '2T2R → 4T4R RRU replacement',
        carrierAggregation: 'B3 (20 MHz) + B7 (10 MHz) = 30 MHz aggregated',
        targetZones: `${w.name} urban and peri-urban coverage areas`,
        sitesAffected,
      };
  }
}

// ── Recommendation generators per category ────────────────────────────
function generateRecommendation(
  w: WilayaRef,
  category: Category,
  tech: string,
  riskLevel: string,
  rand: () => number,
): string {
  const __density = densityFactor(w.density);
  const templates: Record<Category, string[]> = {
    capacity_expansion: [
      `Proceed — ${w.name} shows ${rInt(rand, 30, 65)}% traffic growth. ${tech} capacity relief will support subscriber demand for the next 24 months.`,
      `Deploy in phases — prioritize ${w.name} city center first, then expand to suburbs. Estimated ${rInt(rand, 12, 24)}-month full rollout.`,
      `Proceed — cost-effective ${tech} capacity expansion. Focus on top ${rInt(rand, 5, 15)} congested cells by PRB utilization for maximum revenue impact.`,
    ],
    coverage_improvement: [
      `Proceed with phased deployment — start with ${w.name} main corridors. Monitor propagation models against actual measurements before expanding to peripheral zones.`,
      `Conditional approval — ${isDesertLike(w.cluster) ? 'pursue ARPT licensing and USF subsidy to improve ROI.' : 'coordinate with local authorities for site acquisition permits.'}`,
      `Proceed — ${w.name} coverage gaps identified affecting ${rInt(rand, 8000, 40000)} subscribers. Target ${rInt(rand, 90, 97)}% population coverage post-deployment.`,
    ],
    parameter_change: [
      `Immediate deployment — pure software optimization. ${tech} parameter tuning identified as primary cause of ${w.name} quality degradation. No CAPEX required.`,
      `Deploy during low-traffic window (02:00–04:00). ${w.name} parameter changes affect ${rInt(rand, 15, 40)} sites. Rollback plan prepared.`,
      `Proceed — simulation shows ${rInt(rand, 15, 40)}% drop rate reduction with optimized ${tech} parameters. Zero CAPEX, OPEX savings from reduced compensation.`,
    ],
    new_site: [
      `Proceed — ${w.name} demand forecast shows ${rInt(rand, 40, 80)}% growth in 12 months. Co-locate with existing infrastructure to reduce CAPEX by ${rInt(rand, 20, 35)}%.`,
      `Defer to H2 pending frequency coordination for ${tech} band. Consider sharing infrastructure with other operators to split costs.`,
      `Approve with conditions — ${w.name} new site deployment addresses critical coverage gap. Ensure environmental impact assessment completed before construction.`,
    ],
    technology_upgrade: [
      `Pilot on ${rInt(rand, 3, 8)} sites near ${w.name} high-demand zones first. Full rollout conditional on pilot KPI validation.`,
      `Partner with ${w.name} local authorities for co-funded deployment. ${tech} upgrade enables new revenue streams from enterprise and IoT segments.`,
      `Proceed — ${tech} upgrade positions ${w.name} for next-generation services. Deploy in phases starting with commercial districts.`,
    ],
  };

  const options = templates[category];
  let rec = pick(options, rand);
  if (riskLevel === 'high') {
    rec += ' High risk — implement comprehensive rollback plan and phased approach.';
  }
  return rec;
}

// ── Generate a single scenario for a wilaya ───────────────────────────
function generateScenario(wilayaIndex: number): Scenario {
  const w = WILAYA_69[wilayaIndex];
  const category = CATEGORIES[wilayaIndex % 5];
  const df = densityFactor(w.density);

  // Seed based on wilaya code for deterministic output
  const seed = parseInt(w.code, 10) * 1000 + wilayaIndex;
  const rand = seededRandom(seed);

  // ── Technology selection ───────────────────────────────────────────
  let technology: string;
  switch (category) {
    case 'technology_upgrade':
      technology = df > 0.7 ? '5G NR' : df > 0.4 ? 'LTE' : 'LTE';
      break;
    case 'capacity_expansion':
      technology = df > 0.8 ? pick(['LTE', '5G NR'], rand) : 'LTE';
      break;
    case 'coverage_improvement':
      technology = df > 0.5 ? 'LTE' : df > 0.2 ? pick(['LTE', 'UMTS'], rand) : 'UMTS';
      break;
    case 'parameter_change':
      technology = df > 0.4 ? 'LTE' : pick(['UMTS', 'LTE'], rand);
      break;
    case 'new_site':
      technology = df > 0.6 ? 'LTE' : 'LTE';
      break;
    default:
      technology = 'LTE';
  }

  // ── Baseline KPIs (scale with density) ────────────────────────────
  const siteCount = Math.max(3, Math.round(lerp(5, 400, df) * lerp(0.6, 1.2, rand())));
  const is5G = technology === '5G NR';

  const baseRsrp = lerp(-110, -76, df) + lerp(-3, 3, rand());
  const baseSinr = lerp(1.5, 13, df) + lerp(-1, 1, rand());
  const baseThroughputDl = lerp(2, 42, df) * (is5G ? 1.3 : 1) + lerp(-2, 2, rand());
  const baseThroughputUl = lerp(1, 18, df) * (is5G ? 1.2 : 1) + lerp(-1, 1, rand());
  const baseAvailability = lerp(80, 99.4, df) + lerp(-1, 0.5, rand());
  const baseDropRate = lerp(8, 1.2, df) + lerp(-1, 1, rand());
  const basePrbUtil = lerp(10, 82, df) + lerp(-5, 5, rand());
  const activeUsers = Math.max(200, Math.round(w.population * lerp(0.003, 0.012, df) * lerp(0.8, 1.2, rand())));

  const baselineKpis = {
    rsrp: +baseRsrp.toFixed(1),
    sinr: +clamp(baseSinr, 0, 20).toFixed(1),
    throughputDl: +clamp(baseThroughputDl, 0.5, 200).toFixed(1),
    throughputUl: +clamp(baseThroughputUl, 0.3, 80).toFixed(1),
    availability: +clamp(baseAvailability, 75, 99.9).toFixed(2),
    dropRate: +clamp(baseDropRate, 0.1, 12).toFixed(1),
    prbUtilization: +clamp(basePrbUtil, 5, 95).toFixed(1),
    activeUsers,
  };

  const baselineConfig = {
    siteCount,
    avgRsrp: baselineKpis.rsrp,
    avgThroughput: baselineKpis.throughputDl,
    avgAvailability: baselineKpis.availability,
    avgDropRate: baselineKpis.dropRate,
    prbUtilization: baselineKpis.prbUtilization,
  };

  // ── Simulated KPIs (category-dependent improvement) ────────────────
  let simRsrp: number, simSinr: number, simTxDl: number, simTxUl: number;
  let simAvail: number, simDrop: number, simPrb: number, simUsers: number;

  const improve = lerp(0.85, 1.15, rand()); // random variation ±15%

  switch (category) {
    case 'capacity_expansion': {
      const txFactor = is5G ? lerp(3.5, 5.0, df) : lerp(1.4, 2.0, df);
      simRsrp = baseRsrp + lerp(2, 5, df);
      simSinr = baseSinr + lerp(1.5, 3.5, df);
      simTxDl = baseThroughputDl * txFactor * improve;
      simTxUl = baseThroughputUl * lerp(1.2, 1.6, df) * improve;
      simAvail = baseAvailability + lerp(0.2, 0.8, df);
      simDrop = baseDropRate * lerp(0.4, 0.65, df);
      simPrb = basePrbUtil * lerp(0.55, 0.75, df);
      simUsers = activeUsers * lerp(1.2, 1.6, df);
      break;
    }
    case 'coverage_improvement': {
      simRsrp = baseRsrp + lerp(10, 22, 1 - df); // bigger jump for low-density
      simSinr = baseSinr + lerp(4, 8, 1 - df);
      simTxDl = baseThroughputDl * lerp(1.5, 3.0, 1 - df) * improve;
      simTxUl = baseThroughputUl * lerp(1.5, 2.8, 1 - df) * improve;
      simAvail = baseAvailability + lerp(3, 12, 1 - df);
      simDrop = baseDropRate * lerp(0.3, 0.55, 1 - df);
      simPrb = basePrbUtil * lerp(1.0, 1.3, rand());
      simUsers = activeUsers * lerp(1.3, 2.0, 1 - df);
      break;
    }
    case 'parameter_change': {
      simRsrp = baseRsrp + lerp(1, 4, df);
      simSinr = baseSinr + lerp(2, 5, df);
      simTxDl = baseThroughputDl * lerp(1.08, 1.35, df) * improve;
      simTxUl = baseThroughputUl * lerp(1.05, 1.25, df) * improve;
      simAvail = baseAvailability + lerp(0.5, 2.5, df);
      simDrop = baseDropRate * lerp(0.35, 0.6, df);
      simPrb = basePrbUtil * lerp(0.9, 1.05, rand());
      simUsers = activeUsers * lerp(1.03, 1.12, df);
      break;
    }
    case 'new_site': {
      simRsrp = baseRsrp + lerp(8, 18, 1 - df);
      simSinr = baseSinr + lerp(3, 7, 1 - df);
      simTxDl = baseThroughputDl * lerp(1.8, 3.5, 1 - df) * improve;
      simTxUl = baseThroughputUl * lerp(1.5, 2.5, 1 - df) * improve;
      simAvail = baseAvailability + lerp(4, 10, 1 - df);
      simDrop = baseDropRate * lerp(0.25, 0.45, 1 - df);
      simPrb = basePrbUtil * lerp(0.85, 1.1, rand());
      simUsers = activeUsers * lerp(1.4, 2.2, 1 - df);
      break;
    }
    case 'technology_upgrade': {
      const txFactor = is5G ? lerp(3.0, 5.5, df) : lerp(1.8, 2.8, df);
      simRsrp = baseRsrp + lerp(3, 8, df);
      simSinr = baseSinr + lerp(2.5, 5.0, df);
      simTxDl = baseThroughputDl * txFactor * improve;
      simTxUl = baseThroughputUl * lerp(1.5, 2.8, df) * improve;
      simAvail = baseAvailability + lerp(0.3, 0.7, df);
      simDrop = baseDropRate * lerp(0.2, 0.5, df);
      simPrb = basePrbUtil * lerp(0.35, 0.6, df);
      simUsers = activeUsers * lerp(1.15, 1.5, df);
      break;
    }
  }

  const simulatedKpis = {
    rsrp: +clamp(simRsrp!, -120, -60).toFixed(1),
    sinr: +clamp(simSinr!, 0, 25).toFixed(1),
    throughputDl: +clamp(simTxDl!, 1, 500).toFixed(1),
    throughputUl: +clamp(simTxUl!, 0.5, 120).toFixed(1),
    availability: +clamp(simAvail!, 80, 99.99).toFixed(2),
    dropRate: +clamp(simDrop!, 0.1, 12).toFixed(1),
    prbUtilization: +clamp(simPrb!, 5, 95).toFixed(1),
    activeUsers: Math.round(clamp(simUsers!, 200, 100000)),
  };

  // ── Financial & risk metrics ───────────────────────────────────────
  const hasNoCapex = category === 'parameter_change';
  const isHighDensity = df > 0.65;

  let estimatedCapex: number;
  let estimatedOpexChange: number;
  let paybackMonths: number;
  let roiPercentage: number;
  let riskLevel: string;
  let status: Status;
  let confidence: number;
  let impactScore: number;

  if (hasNoCapex) {
    estimatedCapex = 0;
    estimatedOpexChange = -rInt(rand, 400000, 2400000);
    paybackMonths = 0;
    roiPercentage = rInt(rand, 300, 600);
    riskLevel = 'low';
    status = pick<Status>(['completed', 'completed', 'completed', 'failed'], rand);
    confidence = lerp(0.88, 0.96, rand());
    impactScore = rInt(rand, 55, 75);
  } else if (category === 'technology_upgrade' && is5G) {
    estimatedCapex = Math.round(lerp(250_000_000, 500_000_000, df) * lerp(0.8, 1.2, rand()));
    estimatedOpexChange = rInt(rand, 10_000_000, 25_000_000);
    paybackMonths = rInt(rand, 24, 42);
    roiPercentage = rInt(rand, 120, 200);
    riskLevel = pick(['medium', 'high'], rand);
    status = pick<Status>(['running', 'draft', 'completed'], rand);
    confidence = lerp(0.72, 0.82, rand());
    impactScore = rInt(rand, 85, 97);
  } else if (category === 'new_site' || (category === 'coverage_improvement' && isDesertLike(w.cluster))) {
    estimatedCapex = Math.round(lerp(50_000_000, 150_000_000, df) * lerp(0.8, 1.3, rand()));
    estimatedOpexChange = rInt(rand, 3_000_000, 9_000_000);
    paybackMonths = rInt(rand, 28, 54);
    roiPercentage = rInt(rand, 55, 140);
    riskLevel = pick(['medium', 'high'], rand);
    status = pick<Status>(['draft', 'running', 'completed'], rand);
    confidence = lerp(0.70, 0.88, rand());
    impactScore = rInt(rand, 60, 85);
  } else if (category === 'technology_upgrade') {
    estimatedCapex = Math.round(lerp(40_000_000, 120_000_000, df) * lerp(0.8, 1.2, rand()));
    estimatedOpexChange = rInt(rand, 2_000_000, 6_000_000);
    paybackMonths = rInt(rand, 14, 30);
    roiPercentage = rInt(rand, 120, 220);
    riskLevel = pick(['low', 'medium'], rand);
    status = pick<Status>(['completed', 'running'], rand);
    confidence = lerp(0.82, 0.94, rand());
    impactScore = rInt(rand, 72, 92);
  } else if (category === 'coverage_improvement') {
    estimatedCapex = Math.round(lerp(35_000_000, 110_000_000, df) * lerp(0.8, 1.2, rand()));
    estimatedOpexChange = rInt(rand, 1_500_000, 7_000_000);
    paybackMonths = rInt(rand, 18, 42);
    roiPercentage = rInt(rand, 80, 180);
    riskLevel = pick(['low', 'medium', 'high'], rand);
    status = pick<Status>(['completed', 'draft', 'running'], rand);
    confidence = lerp(0.76, 0.92, rand());
    impactScore = rInt(rand, 65, 88);
  } else {
    // capacity_expansion
    estimatedCapex = Math.round(lerp(30_000_000, 180_000_000, df) * lerp(0.8, 1.2, rand()));
    estimatedOpexChange = rInt(rand, 1_000_000, 8_500_000);
    paybackMonths = rInt(rand, 10, 30);
    roiPercentage = rInt(rand, 140, 280);
    riskLevel = isHighDensity ? pick(['low', 'low', 'medium'], rand) : pick(['low', 'medium'], rand);
    status = pick<Status>(['completed', 'completed', 'running'], rand);
    confidence = lerp(0.84, 0.96, rand());
    impactScore = rInt(rand, 68, 90);
  }

  const scenarioName = SCENARIO_TEMPLATES[category](w, technology);
  const simulatedConfig = generateSimulatedConfig(w, category, technology, rand, siteCount);
  const recommendation = generateRecommendation(w, category, technology, riskLevel, rand);

  return {
    id: `dt-2024-${String(wilayaIndex + 1).padStart(3, '0')}`,
    scenarioName,
    region: w.name,
    technology,
    category,
    baselineConfig,
    baselineKpis,
    simulatedConfig,
    simulatedKpis,
    impactScore,
    riskLevel,
    confidence: +confidence.toFixed(2),
    estimatedCapex,
    estimatedOpexChange,
    paybackMonths,
    roiPercentage,
    modelVersion: is5G && (category === 'technology_upgrade' || category === 'capacity_expansion') ? 'v4.1.0' : 'v4.0.2',
    simulationEngine: is5G && (category === 'technology_upgrade' || category === 'capacity_expansion') ? 'DigitalTwin-5G 1.1' : 'DigitalTwin-Core 2.3',
    status,
    recommendation,
  };
}

// ── Generate all 69 scenarios ─────────────────────────────────────────
const SCENARIOS: Scenario[] = WILAYA_69.map((_, i) => generateScenario(i));

// ── Compute summary ───────────────────────────────────────────────────
function computeSummary(scenarios: Scenario[]) {
  const total = scenarios.length;
  const completed = scenarios.filter((s) => s.status === 'completed').length;
  const avgImpact = +(scenarios.reduce((sum, s) => sum + s.impactScore, 0) / total).toFixed(1);
  const avgConf = +(scenarios.reduce((sum, s) => sum + s.confidence, 0) / total).toFixed(2);
  const totalCapex = scenarios.reduce((sum, s) => sum + s.estimatedCapex, 0);
  const avgRoi = +(scenarios.reduce((sum, s) => sum + s.roiPercentage, 0) / total).toFixed(1);

  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const s of scenarios) {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  }

  return {
    totalScenarios: total,
    completedScenarios: completed,
    avgImpactScore: avgImpact,
    avgConfidence: avgConf,
    totalEstimatedCapex: totalCapex,
    avgRoiPercentage: avgRoi,
    byCategory,
    byStatus,
  };
}

// ── ROI comparison by category (bar chart data) ───────────────────────
function computeRoiComparison(scenarios: Scenario[]) {
  return CATEGORIES.map((cat) => {
    const filtered = scenarios.filter((s) => s.category === cat);
    const avgRoi = filtered.length
      ? +(filtered.reduce((sum, s) => sum + s.roiPercentage, 0) / filtered.length).toFixed(1)
      : 0;
    const totalCapex = filtered.reduce((sum, s) => sum + s.estimatedCapex, 0);
    const avgPayback = filtered.length
      ? +(filtered.reduce((sum, s) => sum + s.paybackMonths, 0) / filtered.length).toFixed(0)
      : 0;

    return {
      category: cat,
      avgRoiPercentage: avgRoi,
      totalCapex,
      avgPaybackMonths: avgPayback,
      scenarioCount: filtered.length,
    };
  });
}

// ── KPI improvement matrix (category × KPI improvement %) ─────────────
function computeKpiImprovementMatrix(scenarios: Scenario[]) {
  const kpiKeys = ['rsrp', 'sinr', 'throughputDl', 'throughputUl', 'availability', 'dropRate', 'prbUtilization'] as const;

  return CATEGORIES.map((cat) => {
    const filtered = scenarios.filter((s) => s.category === cat);
    const improvements: Record<string, number> = {};

    for (const kpi of kpiKeys) {
      if (filtered.length === 0) {
        improvements[kpi] = 0;
        continue;
      }
      const avgBaseline = filtered.reduce((sum, s) => sum + (s.baselineKpis as Record<string, number>)[kpi], 0) / filtered.length;
      const avgSimulated = filtered.reduce((sum, s) => sum + (s.simulatedKpis as Record<string, number>)[kpi], 0) / filtered.length;

      if (avgBaseline === 0) {
        improvements[kpi] = 0;
      } else {
        improvements[kpi] = +(((avgSimulated - avgBaseline) / Math.abs(avgBaseline)) * 100).toFixed(1);
      }
    }

    return { category: cat, ...improvements };
  });
}

// ── GET handler ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const summary = computeSummary(SCENARIOS);
    const roiComparison = computeRoiComparison(SCENARIOS);
    const kpiImprovementMatrix = computeKpiImprovementMatrix(SCENARIOS);

    return NextResponse.json({
      summary,
      scenarios: SCENARIOS,
      roiComparison,
      kpiImprovementMatrix,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
