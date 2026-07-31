import { db } from '../src/lib/db';
import { subHours, subMinutes } from 'date-fns';
import { seedRbac } from '../src/lib/rbac';

const regions = ['Alger Centre', 'Oran Métropole', 'Constantine', 'Annaba', 'Sétif', 'Blida', 'Tlemcen', 'Tizi Ouzou', 'Batna', 'Béjaïa', 'Djelfa', 'Skikda', 'Tébessa', 'Ouargla', 'Biskra', 'Ghardaïa', 'Mostaganem', 'M\'sila', 'Médéa', 'Bouira'];
const vendors = ['Ericsson', 'Huawei', 'Nokia', 'ZTE'];

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickWeighted(items: [string, number][]): string {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [item, w] of items) { r -= w; if (r <= 0) return item; }
  return items[0][0];
}
function pickStatus(tech: string): string {
  const r = Math.random();
  if (tech === '5G') return r < 0.1 ? r < 0.03 ? 'down' : 'degraded' : 'active';
  if (tech === '4G') return r < 0.08 ? r < 0.02 ? 'down' : 'degraded' : 'active';
  return r < 0.12 ? r < 0.03 ? 'down' : 'degraded' : 'active';
}

const siteData = [
  // 2G (8 sites)
  { name: 'GSM-AL-001', code: 'AL001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 80, lat: 36.7538, lng: 3.0588, alt: 25 },
  { name: 'GSM-OR-001', code: 'OR001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 100, lat: 35.6971, lng: -0.6334, alt: 80 },
  { name: 'GSM-CN-001', code: 'CN001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 90, lat: 36.3650, lng: 6.6147, alt: 650 },
  { name: 'GSM-AN-001', code: 'AN001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 85, lat: 36.9000, lng: 7.7667, alt: 5 },
  { name: 'GSM-SF-001', code: 'SF001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 85, lat: 36.1891, lng: 5.4082, alt: 1081 },
  { name: 'GSM-BL-001', code: 'BL001G', tech: '2G', freq: '1800MHz', bw: 0.2, cap: 110, lat: 36.4700, lng: 2.8300, alt: 230 },
  { name: 'GSM-TL-001', code: 'TL001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 90, lat: 34.8815, lng: -1.3156, alt: 810 },
  { name: 'GSM-TZ-001', code: 'TZ001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 80, lat: 36.7162, lng: 4.0483, alt: 200 },
  // 3G (8 sites)
  { name: 'UMTS-AL-001', code: 'AL001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 36.7538, lng: 3.0590, alt: 25 },
  { name: 'UMTS-OR-001', code: 'OR001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 35.6971, lng: -0.6332, alt: 80 },
  { name: 'UMTS-CN-001', code: 'CN001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 36.3650, lng: 6.6149, alt: 650 },
  { name: 'UMTS-AN-001', code: 'AN001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 36.9000, lng: 7.7669, alt: 5 },
  { name: 'UMTS-SF-001', code: 'SF001U', tech: '3G', freq: '900MHz', bw: 5, cap: 256, lat: 36.1891, lng: 5.4084, alt: 1081 },
  { name: 'UMTS-BL-001', code: 'BL001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 36.4700, lng: 2.8302, alt: 230 },
  { name: 'UMTS-TL-001', code: 'TL001U', tech: '3G', freq: '900MHz', bw: 5, cap: 256, lat: 34.8815, lng: -1.3154, alt: 810 },
  { name: 'UMTS-TZ-001', code: 'TZ001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 36.7162, lng: 4.0485, alt: 200 },
  // 4G (12 sites)
  { name: 'LTE-AL-001', code: 'AL001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 36.7538, lng: 3.0592, alt: 25 },
  { name: 'LTE-AL-002', code: 'AL002L', tech: '4G', freq: '2600MHz', bw: 20, cap: 200, lat: 36.7500, lng: 3.0650, alt: 28 },
  { name: 'LTE-AL-003', code: 'AL003L', tech: '4G', freq: '800MHz', bw: 10, cap: 75, lat: 36.7600, lng: 3.0500, alt: 22 },
  { name: 'LTE-AL-004', code: 'AL004L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 36.7450, lng: 3.0700, alt: 30 },
  { name: 'LTE-OR-001', code: 'OR001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 35.6971, lng: -0.6330, alt: 80 },
  { name: 'LTE-OR-002', code: 'OR002L', tech: '4G', freq: '2600MHz', bw: 20, cap: 200, lat: 35.7000, lng: -0.6250, alt: 85 },
  { name: 'LTE-CN-001', code: 'CN001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 36.3650, lng: 6.6151, alt: 650 },
  { name: 'LTE-CN-002', code: 'CN002L', tech: '4G', freq: '800MHz', bw: 10, cap: 75, lat: 36.3600, lng: 6.6200, alt: 645 },
  { name: 'LTE-SF-001', code: 'SF001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 36.1891, lng: 5.4086, alt: 1081 },
  { name: 'LTE-BL-001', code: 'BL001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 36.4700, lng: 2.8304, alt: 230 },
  { name: 'LTE-BL-002', code: 'BL002L', tech: '4G', freq: '800MHz', bw: 10, cap: 75, lat: 36.4750, lng: 2.8250, alt: 225 },
  { name: 'LTE-AN-001', code: 'AN001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 36.9000, lng: 7.7671, alt: 5 },
  // 5G (6 sites)
  { name: 'NR-AL-001', code: 'AL001N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 36.7538, lng: 3.0594, alt: 25 },
  { name: 'NR-AL-002', code: 'AL002N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 36.7500, lng: 3.0652, alt: 28 },
  { name: 'NR-AL-003', code: 'AL003N', tech: '5G', freq: '2600MHz', bw: 80, cap: 800, lat: 36.7600, lng: 3.0502, alt: 22 },
  { name: 'NR-OR-001', code: 'OR001N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 35.6971, lng: -0.6328, alt: 80 },
  { name: 'NR-CN-001', code: 'CN001N', tech: '5G', freq: '3500MHz', bw: 80, cap: 800, lat: 36.3650, lng: 6.6153, alt: 650 },
  { name: 'NR-SF-001', code: 'SF001N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 36.1891, lng: 5.4088, alt: 1081 },
  // Additional 4G sites (new regions)
  { name: 'LTE-BT-001', code: 'BT001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 35.5550, lng: 6.1747, alt: 1050 },
  { name: 'LTE-BT-002', code: 'BT002L', tech: '4G', freq: '800MHz', bw: 10, cap: 75, lat: 35.5600, lng: 6.1800, alt: 1060 },
  { name: 'LTE-BJ-001', code: 'BJ001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 36.7500, lng: 5.0800, alt: 2 },
  { name: 'LTE-BJ-002', code: 'BJ002L', tech: '4G', freq: '2600MHz', bw: 20, cap: 200, lat: 36.7550, lng: 5.0850, alt: 5 },
  { name: 'LTE-DJ-001', code: 'DJ001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 36.2625, lng: 2.9100, alt: 680 },
  { name: 'LTE-SK-001', code: 'SK001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 36.8800, lng: 6.9100, alt: 5 },
  { name: 'LTE-SK-002', code: 'SK002L', tech: '4G', freq: '800MHz', bw: 10, cap: 75, lat: 36.8850, lng: 6.9150, alt: 8 },
  { name: 'LTE-TB-001', code: 'TB001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 35.4040, lng: 8.1200, alt: 800 },
  { name: 'LTE-OG-001', code: 'OG001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 31.9500, lng: 5.3300, alt: 140 },
  { name: 'LTE-OG-002', code: 'OG002L', tech: '4G', freq: '800MHz', bw: 10, cap: 75, lat: 31.9550, lng: 5.3350, alt: 145 },
  { name: 'LTE-BK-001', code: 'BK001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 34.8500, lng: 5.7300, alt: 85 },
  { name: 'LTE-GH-001', code: 'GH001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 32.4900, lng: 3.6700, alt: 470 },
  { name: 'LTE-MS-001', code: 'MS001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 35.9350, lng: 0.0800, alt: 85 },
  { name: 'LTE-MS-002', code: 'MS002L', tech: '4G', freq: '2600MHz', bw: 20, cap: 200, lat: 35.9400, lng: 0.0850, alt: 90 },
  { name: 'LTE-MI-001', code: 'MI001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 35.7000, lng: 3.5400, alt: 440 },
  { name: 'LTE-MD-001', code: 'MD001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 36.2600, lng: 2.7500, alt: 530 },
  { name: 'LTE-BR-001', code: 'BR001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 36.3700, lng: 3.9000, alt: 520 },
  { name: 'LTE-BR-002', code: 'BR002L', tech: '4G', freq: '800MHz', bw: 10, cap: 75, lat: 36.3750, lng: 3.9050, alt: 515 },
  // Additional 5G sites (new regions)
  { name: 'NR-OR-002', code: 'OR002N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 35.7000, lng: -0.6252, alt: 82 },
  { name: 'NR-BT-001', code: 'BT001N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 35.5552, lng: 6.1749, alt: 1052 },
  { name: 'NR-BJ-001', code: 'BJ001N', tech: '5G', freq: '3500MHz', bw: 80, cap: 800, lat: 36.7502, lng: 5.0802, alt: 3 },
  { name: 'NR-MS-001', code: 'MS001N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 35.9352, lng: 0.0802, alt: 87 },
  { name: 'NR-TL-001', code: 'TL001N', tech: '5G', freq: '3500MHz', bw: 80, cap: 800, lat: 34.8817, lng: -1.3154, alt: 812 },
  { name: 'NR-BL-001', code: 'BL001N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 36.4702, lng: 2.8306, alt: 232 },
  { name: 'NR-SF-002', code: 'SF002N', tech: '5G', freq: '2600MHz', bw: 80, cap: 800, lat: 36.1910, lng: 5.4090, alt: 1085 },
  { name: 'NR-AN-001', code: 'AN001N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 36.9002, lng: 7.7673, alt: 7 },
  { name: 'NR-CN-002', code: 'CN002N', tech: '5G', freq: '2600MHz', bw: 80, cap: 800, lat: 36.3700, lng: 6.6150, alt: 655 },
  // Additional 3G sites (new regions)
  { name: 'UMTS-BT-001', code: 'BT001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 35.5548, lng: 6.1745, alt: 1048 },
  { name: 'UMTS-BJ-001', code: 'BJ001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 36.7498, lng: 5.0798, alt: 1 },
  { name: 'UMTS-DJ-001', code: 'DJ001U', tech: '3G', freq: '900MHz', bw: 5, cap: 256, lat: 36.2623, lng: 2.9098, alt: 678 },
  { name: 'UMTS-SK-001', code: 'SK001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 36.8798, lng: 6.9098, alt: 3 },
  { name: 'UMTS-TB-001', code: 'TB001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 35.4038, lng: 8.1198, alt: 798 },
  { name: 'UMTS-OG-001', code: 'OG001U', tech: '3G', freq: '900MHz', bw: 5, cap: 256, lat: 31.9498, lng: 5.3298, alt: 138 },
  { name: 'UMTS-BK-001', code: 'BK001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 34.8498, lng: 5.7298, alt: 83 },
  { name: 'UMTS-MS-001', code: 'MS001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 35.9348, lng: 0.0798, alt: 83 },
  { name: 'UMTS-MD-001', code: 'MD001U', tech: '3G', freq: '900MHz', bw: 5, cap: 256, lat: 36.2598, lng: 2.7498, alt: 528 },
  { name: 'UMTS-BR-001', code: 'BR001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 36.3698, lng: 3.8998, alt: 518 },
  // Additional 2G sites (new regions)
  { name: 'GSM-BT-001', code: 'BT001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 85, lat: 35.5546, lng: 6.1743, alt: 1045 },
  { name: 'GSM-BJ-001', code: 'BJ001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 90, lat: 36.7496, lng: 5.0796, alt: -1 },
  { name: 'GSM-DJ-001', code: 'DJ001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 80, lat: 36.2621, lng: 2.9096, alt: 675 },
  { name: 'GSM-SK-001', code: 'SK001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 85, lat: 36.8796, lng: 6.9096, alt: 2 },
  { name: 'GSM-TB-001', code: 'TB001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 80, lat: 35.4036, lng: 8.1196, alt: 796 },
  { name: 'GSM-OG-001', code: 'OG001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 75, lat: 31.9496, lng: 5.3296, alt: 136 },
];

function genKpi(siteId: string, tech: string, timestamp: Date) {
  const base: any = { siteId, technology: tech, timestamp, createdAt: timestamp };
  if (tech === '2G') {
    const rxlev = rand(-85, -55);
    return { ...base, rssi: rxlev, rxlev, sinr: rand(5, 18), downloadThroughput: rand(0.01, 0.24), uploadThroughput: rand(0.01, 0.12), latency: rand(150, 500), jitter: rand(20, 80), packetLoss: rand(0.1, 3), availability: rand(96, 99.9), activeUsers: randInt(5, 60), handoverSuccessRate: rand(88, 99), dropRate: rand(0.1, 3), blockedCallRate: rand(0.5, 5) };
  }
  if (tech === '3G') {
    const rscp = rand(-100, -70);
    return { ...base, rssi: rscp, rscp, ecno: rand(-12, -3), sinr: rand(3, 15), downloadThroughput: rand(0.5, 21), uploadThroughput: rand(0.3, 5.76), latency: rand(50, 200), jitter: rand(10, 50), packetLoss: rand(0.05, 2), availability: rand(97, 99.9), activeUsers: randInt(10, 120), handoverSuccessRate: rand(90, 99), dropRate: rand(0.1, 2.5), blockedCallRate: rand(0.3, 4), prbUtilization: rand(20, 85) };
  }
  if (tech === '4G') {
    const rsrp = rand(-110, -75);
    return { ...base, rsrp, rssi: rsrp + rand(3, 8), rsrq: rand(-15, -5), sinr: rand(-2, 25), cqichannel: rand(4, 15), downloadThroughput: rand(5, 150), uploadThroughput: rand(2, 50), latency: rand(10, 80), jitter: rand(2, 20), packetLoss: rand(0.01, 1), availability: rand(98.5, 99.99), activeUsers: randInt(20, 300), handoverSuccessRate: rand(94, 99.9), dropRate: rand(0.01, 1.5), blockedCallRate: rand(0.1, 3), prbUtilization: rand(25, 90) };
  }
  const rsrp = rand(-115, -80);
  return { ...base, rsrp, rssi: rsrp + rand(3, 10), rsrq: rand(-14, -4), sinr: rand(0, 30), cqichannel: rand(5, 15), downloadThroughput: rand(50, 1200), uploadThroughput: rand(20, 200), latency: rand(1, 15), jitter: rand(0.5, 5), packetLoss: rand(0.001, 0.5), availability: rand(99, 99.999), activeUsers: randInt(10, 500), handoverSuccessRate: rand(96, 99.99), dropRate: rand(0.001, 0.5), blockedCallRate: rand(0.01, 1), prbUtilization: rand(15, 75) };
}

async function main() {
  console.log('Clearing existing data...');
  // Clear standalone / mock route tables
  await db.networkCommercialInsight.deleteMany();
  await db.revenueImpact.deleteMany();
  await db.wilayaProfile.deleteMany();
  await db.geoSiteAcquisition.deleteMany();
  await db.geoCoverageGap.deleteMany();
  await db.geoChurnCluster.deleteMany();
  await db.geoCompetitorSite.deleteMany();
  await db.geoRevenueZone.deleteMany();
  await db.geoDemographic.deleteMany();
  await db.billingInvoice.deleteMany();
  await db.crmCustomer.deleteMany();
  await db.ossFaultEvent.deleteMany();
  await db.ossNetworkElement.deleteMany();
  await db.dataPipeline.deleteMany();
  await db.externalIntegration.deleteMany();
  await db.aiAgent.deleteMany();
  // Clear Phase D tables first (FKs to NetworkSite or standalone)
  await db.auditTrail.deleteMany();
  await db.serviceOrchestration.deleteMany();
  await db.npiRecord.deleteMany();
  await db.evolutionPlan.deleteMany();
  await db.spectrumBlock.deleteMany();
  await db.roiRecord.deleteMany();
  await db.trendForecast.deleteMany();
  await db.simulationScenario.deleteMany();
  // Clear Phase C tables
  await db.playbookStep.deleteMany();
  await db.playbook.deleteMany();
  await db.outageEvent.deleteMany();
  await db.changeRequest.deleteMany();
  await db.coverageHole.deleteMany();
  await db.interferenceEvent.deleteMany();
  await db.cellLoad.deleteMany();
  await db.handoverKpi.deleteMany();
  await db.benchmarkRecord.deleteMany();
  await db.healthScore.deleteMany();
  // Clear Phase B tables first (FKs to NetworkSite)
  await db.incident.deleteMany();
  await db.faultPrediction.deleteMany();
  await db.energyMetric.deleteMany();
  await db.capacityForecast.deleteMany();
  await db.networkSlice.deleteMany();
  await db.configTemplate.deleteMany();
  await db.subscriberSegment.deleteMany();
  // Clear Phase A tables (they have FKs to base tables)
  await db.qoEMetric.deleteMany();
  await db.siteOnboarding.deleteMany();
  await db.policyExecution.deleteMany();
  await db.policy.deleteMany();
  await db.neighborRelation.deleteMany();
  await db.sonAction.deleteMany();
  await db.sonModule.deleteMany();
  await db.vendorProfile.deleteMany();
  // Clear base tables
  await db.alert.deleteMany();
  await db.kpiMetric.deleteMany();
  await db.optimizationLog.deleteMany();
  await db.alertRule.deleteMany();
  await db.networkParameter.deleteMany();
  await db.networkSite.deleteMany();

  // Seed sites
  console.log('Seeding sites...');
  const created = [];
  for (const s of siteData) {
    const site = await db.networkSite.create({
      data: {
        name: s.name, code: s.code, technology: s.tech, region: pick(regions),
        status: pickStatus(s.tech), latitude: s.lat + rand(-0.005, 0.005),
        longitude: s.lng + rand(-0.005, 0.005), altitude: s.alt,
        frequency: s.freq, bandwidth: s.bw, maxCapacity: s.cap, vendor: pick(vendors),
      },
    });
    created.push(site);
  }
  console.log(`  Sites: ${created.length}`);

  // Seed KPI - 24 hours, 1-hour intervals
  console.log('Seeding KPI metrics...');
  const now = new Date();
  let kpiCount = 0;
  for (let h = 0; h < 24; h++) {
    const ts = subHours(now, 23 - h);
    // Simulate daily traffic pattern
    const hourOfDay = ts.getHours();
    const peakFactor = hourOfDay >= 0 && hourOfDay <= 5 ? 0.4
      : hourOfDay >= 6 && hourOfDay <= 8 ? 0.7
      : hourOfDay >= 9 && hourOfDay <= 12 ? 1.0
      : hourOfDay >= 13 && hourOfDay <= 17 ? 0.85
      : hourOfDay >= 18 && hourOfDay <= 21 ? 1.0
      : 0.6;
    const batch: any[] = [];
    for (const site of created) {
      const kpi = genKpi(site.id, site.technology, ts);
      // Scale user counts and throughput by time-of-day
      if (kpi.activeUsers) kpi.activeUsers = Math.round((kpi.activeUsers as number) * peakFactor);
      if (kpi.downloadThroughput) kpi.downloadThroughput = Number(((kpi.downloadThroughput as number) * peakFactor).toFixed(2));
      if (kpi.uploadThroughput) kpi.uploadThroughput = Number(((kpi.uploadThroughput as number) * peakFactor).toFixed(2));
      batch.push(kpi);
    }
    await db.kpiMetric.createMany({ data: batch });
    kpiCount += batch.length;
  }
  console.log(`  KPI records: ${kpiCount}`);

  // Seed alert rules
  console.log('Seeding alert rules...');
  const rules = [
    { name: 'Low RSRP (4G)', technology: '4G', metric: 'rsrp', condition: 'lt', threshold: -105, severity: 'critical' },
    { name: 'Poor SINR (4G)', technology: '4G', metric: 'sinr', condition: 'lt', threshold: 0, severity: 'warning' },
    { name: 'Low RSRP (5G)', technology: '5G', metric: 'rsrp', condition: 'lt', threshold: -110, severity: 'critical' },
    { name: 'High Latency (4G)', technology: '4G', metric: 'latency', condition: 'gt', threshold: 60, severity: 'warning' },
    { name: 'High Latency (5G)', technology: '5G', metric: 'latency', condition: 'gt', threshold: 10, severity: 'warning' },
    { name: 'High Drop Rate', technology: 'ALL', metric: 'dropRate', condition: 'gt', threshold: 2, severity: 'critical' },
    { name: 'Low Availability', technology: 'ALL', metric: 'availability', condition: 'lt', threshold: 97, severity: 'critical' },
    { name: 'High PRB (4G)', technology: '4G', metric: 'prbUtilization', condition: 'gt', threshold: 85, severity: 'warning' },
    { name: 'High PRB (5G)', technology: '5G', metric: 'prbUtilization', condition: 'gt', threshold: 80, severity: 'warning' },
    { name: 'Poor Handover (3G)', technology: '3G', metric: 'handoverSuccessRate', condition: 'lt', threshold: 92, severity: 'warning' },
    { name: 'Low RX Level (2G)', technology: '2G', metric: 'rxlev', condition: 'lt', threshold: -80, severity: 'warning' },
    { name: 'High Packet Loss (4G)', technology: '4G', metric: 'packetLoss', condition: 'gt', threshold: 1, severity: 'warning' },
  ];
  await db.alertRule.createMany({ data: rules });
  console.log(`  Rules: ${rules.length}`);

  // Seed alerts
  console.log('Seeding alerts...');
  const msgs = ['RSRP below threshold', 'SINR degradation', 'High latency detected', 'Drop rate exceeds threshold', 'Availability below SLA', 'PRB utilization high', 'Handover failure increased', 'Packet loss above normal', 'Throughput degraded', 'Signal quality deterioration'];
  const alerts: any[] = [];
  for (let i = 0; i < 60; i++) {
    const site = pick(created);
    const sev = i < 12 ? 'critical' : i < 35 ? 'warning' : 'info';
    const corrGroup = i < 20 ? `CORR-${String(Math.floor(i / 3) + 1).padStart(3, '0')}` : null;
    alerts.push({
      siteId: site.id, technology: site.technology, metric: pick(['rsrp', 'sinr', 'latency', 'dropRate', 'availability', 'prbUtilization', 'handoverSuccessRate', 'packetLoss', 'throughput']),
      value: rand(-115, 200), threshold: rand(-105, 90), condition: pick(['lt', 'gt']),
      severity: sev, message: pick(msgs), acknowledged: Math.random() > 0.5,
      correlatedGroupId: corrGroup,
      resolvedAt: Math.random() > 0.4 ? subHours(now, randInt(1, 48)) : null,
      createdAt: subHours(now, randInt(0, 72)),
    });
  }
  await db.alert.createMany({ data: alerts });
  console.log(`  Alerts: ${alerts.length}`);

  // Seed optimization logs
  console.log('Seeding optimization logs...');
  const optLogs = [
    { tech: '4G', cat: 'coverage', issue: 'Weak RSRP coverage gap in Alger Centre', rec: 'Adjust antenna tilt from 6° to 4° and increase RS power by 3dB. Consider adding a small cell.', impact: 'high', status: 'implemented' },
    { tech: '5G', cat: 'interference', issue: 'High interference on 3500MHz in Oran Métropole', rec: 'PCI re-planning to eliminate conflicts. Enable ICIC and adjust power control parameters.', impact: 'high', status: 'pending' },
    { tech: '4G', cat: 'capacity', issue: 'PRB utilization exceeding 85% at peak hours', rec: 'Enable carrier aggregation Band 3 + Band 7. Deploy additional carriers and optimize load balancing.', impact: 'high', status: 'pending' },
    { tech: '3G', cat: 'handover', issue: 'Low handover success rate in Constantine', rec: 'Increase hysteresis to 3dB, adjust time-to-trigger to 320ms. Review neighbor cell list.', impact: 'medium', status: 'implemented' },
    { tech: '2G', cat: 'parameter', issue: 'High call blocking rate in Sétif', rec: 'Reduce half-rate threshold for peak hours. Review frequency plan and channel allocation.', impact: 'medium', status: 'dismissed' },
    { tech: '5G', cat: 'coverage', issue: '5G NR coverage limited to 200m from gNB', rec: 'Increase TX power by 2dB and review beamforming. Consider 700MHz for extended coverage.', impact: 'high', status: 'pending' },
    { tech: '4G', cat: 'interference', issue: 'Co-channel interference LTE-AL-002 and LTE-AL-004', rec: 'Implement eICIC with ABS patterns. Adjust antenna azimuth to minimize overlap.', impact: 'medium', status: 'implemented' },
    { tech: '3G', cat: 'capacity', issue: 'HSUPA throughput degradation in Blida', rec: 'Increase HSUPA channel allocation. Consider upgrading to DC-HSPA+.', impact: 'medium', status: 'pending' },
    { tech: '4G', cat: 'parameter', issue: 'Suboptimal PCI assignment causing PSS/SSS conflicts', rec: 'Re-plan PCI ensuring adequate modulus-3 and modulus-30 separation.', impact: 'high', status: 'pending' },
    { tech: '5G', cat: 'handover', issue: '5G to 4G inter-RAT handover failures', rec: 'Optimize A2/B2 event thresholds for NR-LTE handover. Review NSA DC config.', impact: 'high', status: 'pending' },
    { tech: '4G', cat: 'coverage', issue: 'Indoor coverage deficiency in Alger high-rises', rec: 'Deploy indoor DAS or small cells. Configure dedicated indoor carriers.', impact: 'medium', status: 'pending' },
    { tech: '3G', cat: 'interference', issue: 'Pilot pollution in Tlemcen city center', rec: 'Reduce pilot power by 3-6dB. Optimize antenna downtilt and azimuth.', impact: 'medium', status: 'implemented' },
  ];
  for (const log of optLogs) {
    await db.optimizationLog.create({
      data: { technology: log.tech, category: log.cat, issue: log.issue, recommendation: log.rec, impact: log.impact, status: log.status, createdAt: subHours(now, randInt(1, 168)) },
    });
  }
  console.log(`  Optimization logs: ${optLogs.length}`);

  // Seed network parameters
  console.log('Seeding network parameters...');
  const params = [
    { tech: '2G', param: 'bsPowerMax', display: 'Max BTS Power', val: '43', unit: 'dBm', min: '30', max: '49', desc: 'Maximum transmit power of the BTS', cat: 'power' },
    { tech: '2G', param: 'rxLevAccessMin', display: 'RX Level Access Min', val: '-110', unit: 'dBm', min: '-120', max: '-80', desc: 'Minimum RX level for mobile access', cat: 'rf' },
    { tech: '2G', param: 'hysteresis', display: 'Handover Hysteresis', val: '4', unit: 'dB', min: '0', max: '14', desc: 'Hysteresis for cell reselection handover', cat: 'handover' },
    { tech: '3G', param: 'cpichPower', display: 'CPICH Power', val: '33', unit: 'dBm', min: '20', max: '40', desc: 'Common Pilot Channel power', cat: 'power' },
    { tech: '3G', param: 'qrxlevmin', display: 'QRXLEVMIN', val: '-115', unit: 'dBm', min: '-125', max: '-90', desc: 'Minimum required RX level', cat: 'rf' },
    { tech: '3G', param: 'hsdpaPower', display: 'HSDPA Power', val: '12', unit: 'dB', min: '0', max: '18', desc: 'Power allocated to HSDPA', cat: 'capacity' },
    { tech: '4G', param: 'rsPower', display: 'RS Power', val: '15.2', unit: 'dBm', min: '-10', max: '22', desc: 'Reference Signal power per port', cat: 'power' },
    { tech: '4G', param: 'qrxlevmin', display: 'QRXLEVMIN', val: '-140', unit: 'dBm', min: '-140', max: '-110', desc: 'Minimum RSRP for cell selection', cat: 'rf' },
    { tech: '4G', param: 'sIntraSearch', display: 'SIntraSearch', val: '4', unit: 'dB', min: '0', max: '31', desc: 'Intra-freq reselection threshold', cat: 'handover' },
    { tech: '4G', param: 'hysteresis', display: 'Handover Hysteresis', val: '2', unit: 'dB', min: '0', max: '15', desc: 'Hysteresis for A3 handover', cat: 'handover' },
    { tech: '4G', param: 'timeToTrigger', display: 'Time to Trigger', val: '256', unit: 'ms', min: '0', max: '5120', desc: 'Time to trigger for handover events', cat: 'handover' },
    { tech: '4G', param: 'pdcchCfi', display: 'PDCCH CFI', val: '2', unit: '', min: '1', max: '3', desc: 'PDCCH symbol configuration', cat: 'capacity' },
    { tech: '5G', param: 'ssbPower', display: 'SSB Power', val: '16', unit: 'dBm', min: '-15', max: '25', desc: 'SSB power per beam', cat: 'power' },
    { tech: '5G', param: 'qrxlevmin', display: 'QRXLEVMIN', val: '-140', unit: 'dBm', min: '-140', max: '-100', desc: 'Min SS-RSRP for cell selection', cat: 'rf' },
    { tech: '5G', param: 'ssbPeriodicity', display: 'SSB Periodicity', val: '20', unit: 'ms', min: '5', max: '160', desc: 'SSB transmission periodicity', cat: 'rf' },
    { tech: '5G', param: 'hysteresis', display: 'Handover Hysteresis', val: '3', unit: 'dB', min: '0', max: '15', desc: 'Hysteresis for NR handover', cat: 'handover' },
    { tech: '5G', param: 'bwpBandwidth', display: 'BWP Bandwidth', val: '100', unit: 'MHz', min: '20', max: '100', desc: 'Bandwidth Part configuration', cat: 'capacity' },
    { tech: '5G', param: 'scs', display: 'Subcarrier Spacing', val: '30', unit: 'kHz', min: '15', max: '240', desc: 'Subcarrier spacing for NR carrier', cat: 'rf' },
  ];
  await db.networkParameter.createMany({ data: params.map(p => ({
    technology: p.tech, parameter: p.param, displayName: p.display, currentValue: p.val,
    unit: p.unit, minRange: p.min, maxRange: p.max, description: p.desc, category: p.cat,
  })) });
  console.log(`  Parameters: ${params.length}`);

  // Seed SLA targets
  console.log('Seeding SLA targets...');
  const slaTargets = [
    { tech: '2G', metric: 'availability', target: 97, condition: 'gte', severity: 'warning' },
    { tech: '2G', metric: 'dropRate', target: 2, condition: 'lte', severity: 'warning' },
    { tech: '2G', metric: 'handoverSuccessRate', target: 95, condition: 'gte', severity: 'warning' },
    { tech: '3G', metric: 'availability', target: 98, condition: 'gte', severity: 'warning' },
    { tech: '3G', metric: 'dropRate', target: 1.5, condition: 'lte', severity: 'warning' },
    { tech: '3G', metric: 'handoverSuccessRate', target: 96, condition: 'gte', severity: 'warning' },
    { tech: '4G', metric: 'availability', target: 99, condition: 'gte', severity: 'critical' },
    { tech: '4G', metric: 'dropRate', target: 1, condition: 'lte', severity: 'critical' },
    { tech: '4G', metric: 'latency', target: 50, condition: 'lte', severity: 'warning' },
    { tech: '4G', metric: 'handoverSuccessRate', target: 98, condition: 'gte', severity: 'critical' },
    { tech: '4G', metric: 'prbUtilization', target: 85, condition: 'lte', severity: 'warning' },
    { tech: '5G', metric: 'availability', target: 99.5, condition: 'gte', severity: 'critical' },
    { tech: '5G', metric: 'latency', target: 10, condition: 'lte', severity: 'critical' },
    { tech: '5G', metric: 'dropRate', target: 0.5, condition: 'lte', severity: 'critical' },
    { tech: '5G', metric: 'handoverSuccessRate', target: 99, condition: 'gte', severity: 'warning' },
    { tech: '5G', metric: 'prbUtilization', target: 80, condition: 'lte', severity: 'warning' },
  ];
  await db.sLATarget.createMany({ data: slaTargets.map(t => ({
    technology: t.tech, metric: t.metric, targetValue: t.target,
    condition: t.condition, severity: t.severity, enabled: true,
  })) });
  console.log(`  SLA targets: ${slaTargets.length}`);

  // Seed anomaly events
  console.log('Seeding anomaly events...');
  const anomalySeverities = ['critical', 'major', 'minor'] as const;
  const anomalyStatuses = ['detected', 'investigating', 'resolved', 'false_positive'] as const;
  const anomalyMetrics = ['downloadThroughput', 'latency', 'availability', 'sinr', 'dropRate', 'prbUtilization'];
  const anomalyData: any[] = [];
  for (let i = 0; i < 50; i++) {
    const site = pick(created);
    const metric = pick(anomalyMetrics);
    const actual = rand(0, 200);
    const expected = rand(0, 200);
    const z = rand(2.6, 6);
    anomalyData.push({
      siteId: site.id, technology: site.technology, metric,
      actualValue: Number(actual.toFixed(2)),
      expectedValue: Number(expected.toFixed(2)),
      zScore: Number(z.toFixed(2)),
      severity: pick(anomalySeverities),
      status: pick(anomalyStatuses),
      description: `${metric} anomaly at ${site.name} (z=${z.toFixed(2)})`,
      createdAt: subHours(now, randInt(0, 6)),
      ...(Math.random() > 0.5 ? { resolvedAt: subHours(now, randInt(0, 2)) } : {}),
    });
  }
  await db.anomalyEvent.createMany({ data: anomalyData });
  console.log(`  Anomaly events: ${anomalyData.length}`);

  // Seed audit logs
  console.log('Seeding audit logs...');
  const auditActions = ['create', 'update', 'acknowledge', 'resolve'];
  const auditEntities = ['parameter', 'alert', 'site', 'anomaly'];
  for (let i = 0; i < 8; i++) {
    await db.auditLog.create({
      data: {
        entityType: pick(auditEntities),
        entityId: pick(created).id,
        action: pick(auditActions),
        oldValue: JSON.stringify({ val: rand(0, 100) }),
        newValue: JSON.stringify({ val: rand(0, 100) }),
        description: `${pick(auditActions)} ${pick(auditEntities)} via platform`,
        technology: pick(['2G', '3G', '4G', '5G']),
        createdAt: subHours(now, randInt(0, 24)),
      },
    });
  }
  console.log('  Audit logs: 8');

  // ================================================================
  // PHASE A: SON & AUTOMATION SEED DATA
  // ================================================================
  console.log('\n--- Seeding Phase A: SON & Automation ---');

  // Fetch all sites for FK lookups
  const allSites = await db.networkSite.findMany();
  const site4G = allSites.filter(s => s.technology === '4G');
  const site5G = allSites.filter(s => s.technology === '5G');
  const site3G = allSites.filter(s => s.technology === '3G');
  const site2G = allSites.filter(s => s.technology === '2G');

  // ------------------------------------------------------------------
  // 1. SonModule (8 records)
  // ------------------------------------------------------------------
  console.log('Seeding SonModules...');
  const sonModulesData = [
    {
      name: 'ANR',
      displayName: 'Auto Neighbor Relations',
      technology: '4G,5G',
      description: 'Automatically detects and adds neighbor cell relations based on UE measurement reports. Supports intra-frequency, inter-frequency, and inter-RAT neighbor discovery.',
      enabled: true,
      mode: 'semi-automated',
      schedule: 'every 15min',
      parameters: JSON.stringify({ maxNeighbors: 32, detectionThreshold: -100, hoTriggerThreshold: -95, noRemovePeriod: 720 }),
      stats: JSON.stringify({ actions24h: 15, successRate: 94.5, avgImpact: 2.3, totalNeighborsAdded: 312, falsePositiveRate: 3.2 }),
    },
    {
      name: 'PCI',
      displayName: 'PCI Optimization',
      technology: '4G,5G',
      description: 'Detects and resolves PCI conflicts and collisions. Ensures adequate modulus-3, modulus-6, and modulus-30 separation for LTE, and handles 5G SSB/CSI-RS PCI allocation.',
      enabled: true,
      mode: 'closed-loop',
      schedule: 'daily',
      parameters: JSON.stringify({ mod3Check: true, mod30Check: true, autoResolve: true, impactThreshold: 5.0 }),
      stats: JSON.stringify({ actions24h: 8, successRate: 97.2, avgImpact: 6.1, conflictsDetected: 3, conflictsResolved: 2 }),
    },
    {
      name: 'MRO',
      displayName: 'Mobility Robustness Optimization',
      technology: 'ALL',
      description: 'Optimizes handover parameters (hysteresis, time-to-trigger, offsets) to minimize too-early, too-late, and ping-pong handovers across all technologies.',
      enabled: true,
      mode: 'semi-automated',
      schedule: 'every 30min',
      parameters: JSON.stringify({ targetHoSuccessRate: 98.5, maxPingPongRate: 2.0, adjustmentStep: 0.5, maxHysteresis: 12 }),
      stats: JSON.stringify({ actions24h: 22, successRate: 91.8, avgImpact: 3.7, hoSuccessImprovement: 1.8 }),
    },
    {
      name: 'CCO',
      displayName: 'Coverage & Capacity Optimization',
      technology: 'ALL',
      description: 'Balances coverage and capacity by adjusting antenna tilt, power, and carrier configuration. Addresses coverage holes and capacity bottlenecks dynamically.',
      enabled: true,
      mode: 'closed-loop',
      schedule: 'every 1h',
      parameters: JSON.stringify({ rsrpTarget: -90, prbTarget: 75, tiltRange: [0, 12], powerRange: [5, 20] }),
      stats: JSON.stringify({ actions24h: 18, successRate: 88.6, avgImpact: 4.5, coverageGain: 2.1, capacityGain: 8.3 }),
    },
    {
      name: 'HLB',
      displayName: 'Hybrid Load Balancing',
      technology: '4G,5G',
      description: 'Distributes user traffic across multiple carriers and layers (4G/5G) using MLB, ULB, and inter-RAT load balancing. Prevents congestion and improves user experience.',
      enabled: true,
      mode: 'semi-automated',
      schedule: 'every 10min',
      parameters: JSON.stringify({ prbHighThreshold: 80, prbLowThreshold: 40, mlbWeight: 0.6, ulbWeight: 0.4 }),
      stats: JSON.stringify({ actions24h: 30, successRate: 93.1, avgImpact: 3.2, usersOffloaded: 458, avgPrbReduction: 12.5 }),
    },
    {
      name: 'CODC',
      displayName: 'Cell Outage Detection & Compensation',
      technology: 'ALL',
      description: 'Detects cell outages autonomously and compensates by adjusting neighboring cell parameters (power, tilt) to cover the affected area until repair.',
      enabled: true,
      mode: 'closed-loop',
      schedule: 'always',
      parameters: JSON.stringify({ detectionWindow: 300, compensationPowerBoost: 3, compensationTiltAdjust: -1, maxCompensationCells: 6 }),
      stats: JSON.stringify({ actions24h: 5, successRate: 100.0, avgImpact: 7.8, outagesDetected: 1, avgCompensationTime: 42 }),
    },
    {
      name: 'AIC',
      displayName: 'Auto Inconsistency Correction',
      technology: 'ALL',
      description: 'Detects and corrects parameter inconsistencies across the network (e.g., mismatched neighbor lists, conflicting handover parameters, CI/PCI mismatches).',
      enabled: true,
      mode: 'open-loop',
      schedule: 'every 6h',
      parameters: JSON.stringify({ checkNeighborConsistency: true, checkParamConsistency: true, autoCorrect: false, reportOnly: true }),
      stats: JSON.stringify({ actions24h: 12, successRate: 96.0, avgImpact: 2.8, inconsistenciesFound: 7, inconsistenciesCorrected: 5 }),
    },
    {
      name: 'PnP',
      displayName: 'Plug & Play',
      technology: '4G,5G',
      description: 'Automates the initial configuration and integration of new cells/eNodeBs/gNBs including PCI assignment, neighbor setup, power calibration, and parameter provisioning.',
      enabled: true,
      mode: 'closed-loop',
      schedule: 'on-demand',
      parameters: JSON.stringify({ autoPciAssign: true, autoNeighborSetup: true, powerCalibration: true, verificationPeriod: 60 }),
      stats: JSON.stringify({ actions24h: 3, successRate: 100.0, avgImpact: 9.2, cellsOnboarded: 1, avgOnboardTime: 340 }),
    },
  ];

  const sonModules: any[] = [];
  for (const m of sonModulesData) {
    const mod = await db.sonModule.create({ data: m });
    sonModules.push(mod);
  }
  console.log(`  SonModules: ${sonModules.length}`);

  // Helper: find module by name
  const moduleMap = new Map(sonModules.map(m => [m.name, m]));

  // ------------------------------------------------------------------
  // 2. SonAction (40 records)
  // ------------------------------------------------------------------
  console.log('Seeding SonActions...');

  // Deterministic status distribution: 70% applied, 15% pending, 10% rolled_back, 5% failed
  function actionStatus(): string {
    const r = Math.random();
    if (r < 0.70) return 'applied';
    if (r < 0.85) return 'pending';
    if (r < 0.95) return 'rolled_back';
    return 'failed';
  }

  const sonActionsData: any[] = [];
  let actionId = 0;

  // ANR actions (8) - add_neighbor for 4G sites
  const anrModule = moduleMap.get('ANR')!;
  for (let i = 0; i < 8; i++) {
    const site = site4G[i % site4G.length];
    const neighbor = site4G[(i + 1) % site4G.length];
    const status = actionStatus();
    sonActionsData.push({
      moduleId: anrModule.id,
      siteId: site.id,
      technology: '4G',
      actionType: 'add_neighbor',
      parameter: 'neighborList',
      previousValue: JSON.stringify({ neighbors: 6 }),
      newValue: JSON.stringify({ neighbors: 7, added: neighbor.code }),
      reason: `ANR detected missing neighbor ${neighbor.code} from UE measurement reports at ${site.name}. Signal strength above detection threshold.`,
      status,
      kpiBefore: JSON.stringify({ handoverSuccessRate: 94.2 + rand(-1, 1), rsrp: -95 + rand(-3, 3) }),
      kpiAfter: status === 'applied' ? JSON.stringify({ handoverSuccessRate: 96.8 + rand(-0.5, 0.5), rsrp: -93 + rand(-2, 2) }) : null,
      impactScore: status === 'applied' ? Number(rand(2, 5).toFixed(1)) : null,
      rollbackReason: status === 'rolled_back' ? 'Neighbor addition caused unexpected handover ping-pong' : null,
      appliedAt: status === 'applied' ? subHours(now, randInt(1, 24)) : null,
      rolledBackAt: status === 'rolled_back' ? subHours(now, randInt(0, 12)) : null,
      createdAt: subHours(now, randInt(1, 48)),
    });
    actionId++;
  }

  // PCI actions (5) - modify_pci for 5G sites
  const pciModule = moduleMap.get('PCI')!;
  const pciValues = [120, 245, 370, 501, 12, 137, 262, 387];
  for (let i = 0; i < 5; i++) {
    const site = site5G[i % site5G.length];
    const oldPci = pciValues[i % pciValues.length];
    const newPci = pciValues[(i + 3) % pciValues.length];
    const status = actionStatus();
    sonActionsData.push({
      moduleId: pciModule.id,
      siteId: site.id,
      technology: '5G',
      actionType: 'modify_pci',
      parameter: 'physicalCellId',
      previousValue: String(oldPci),
      newValue: String(newPci),
      reason: `PCI conflict detected: PCI ${oldPci} at ${site.name} causes modulus-3 collision with neighboring cell. Reassigned to ${newPci}.`,
      status,
      kpiBefore: JSON.stringify({ sinr: 8.5 + rand(-2, 2), rsrq: -10 + rand(-1, 1), conflictCount: 2 }),
      kpiAfter: status === 'applied' ? JSON.stringify({ sinr: 12.3 + rand(-1, 1), rsrq: -7.5 + rand(-0.5, 0.5), conflictCount: 0 }) : null,
      impactScore: status === 'applied' ? Number(rand(5, 9).toFixed(1)) : null,
      rollbackReason: status === 'rolled_back' ? 'New PCI caused CSI-RS collision with adjacent cell' : null,
      appliedAt: status === 'applied' ? subHours(now, randInt(1, 24)) : null,
      rolledBackAt: status === 'rolled_back' ? subHours(now, randInt(0, 12)) : null,
      createdAt: subHours(now, randInt(2, 48)),
    });
    actionId++;
  }

  // MRO actions (6) - adjust_tilt and adjust_power
  const mroModule = moduleMap.get('MRO')!;
  const mroActionTypes = ['adjust_tilt', 'adjust_power', 'adjust_tilt', 'adjust_power', 'adjust_tilt', 'adjust_tilt'];
  const mroTechs = ['4G', '3G', '4G', '2G', '5G', '4G'];
  const mroSites = [...site4G.slice(0, 3), site3G[0], site5G[0], site4G[3]];
  for (let i = 0; i < 6; i++) {
    const site = mroSites[i];
    const aType = mroActionTypes[i];
    const isTilt = aType === 'adjust_tilt';
    const prevVal = isTilt ? '6' : '15.2';
    const newVal = isTilt ? '4' : '17.5';
    const status = actionStatus();
    sonActionsData.push({
      moduleId: mroModule.id,
      siteId: site.id,
      technology: mroTechs[i],
      actionType: aType,
      parameter: isTilt ? 'antennaTilt' : 'rsPower',
      previousValue: prevVal,
      newValue: newVal,
      reason: `MRO detected ${isTilt ? 'too-early handovers due to aggressive tilt' : 'insufficient cell overlap causing too-late handovers'} at ${site.name}. Adjusted ${isTilt ? 'downtilt from 6° to 4°' : 'RS power from 15.2 to 17.5 dBm'}.`,
      status,
      kpiBefore: JSON.stringify({ handoverSuccessRate: 95.1 + rand(-2, 1), pingPongRate: 3.2 + rand(-1, 2) }),
      kpiAfter: status === 'applied' ? JSON.stringify({ handoverSuccessRate: 97.8 + rand(-0.5, 0.5), pingPongRate: 1.1 + rand(-0.3, 0.5) }) : null,
      impactScore: status === 'applied' ? Number(rand(3, 7).toFixed(1)) : null,
      rollbackReason: status === 'rolled_back' ? 'Handover success rate degraded after parameter change' : null,
      appliedAt: status === 'applied' ? subHours(now, randInt(1, 24)) : null,
      rolledBackAt: status === 'rolled_back' ? subHours(now, randInt(0, 12)) : null,
      createdAt: subHours(now, randInt(1, 48)),
    });
    actionId++;
  }

  // CCO actions (6) - adjust_power and adjust_tilt
  const ccoModule = moduleMap.get('CCO')!;
  const ccoSites = [site4G[0], site5G[1], site3G[2], site4G[4], site2G[1], site4G[7]];
  const ccoTechs = ['4G', '5G', '3G', '4G', '2G', '4G'];
  for (let i = 0; i < 6; i++) {
    const site = ccoSites[i];
    const aType = i % 2 === 0 ? 'adjust_power' : 'adjust_tilt';
    const isPower = aType === 'adjust_power';
    const prevVal = isPower ? '15.2' : '6';
    const newVal = isPower ? '18.0' : '4';
    const status = actionStatus();
    sonActionsData.push({
      moduleId: ccoModule.id,
      siteId: site.id,
      technology: ccoTechs[i],
      actionType: aType,
      parameter: isPower ? 'rsPower' : 'antennaTilt',
      previousValue: prevVal,
      newValue: newVal,
      reason: `CCO identified ${isPower ? 'coverage gap' : 'capacity hotspot'} at ${site.name}. ${isPower ? 'Increased RS power by 2.8dB to extend coverage.' : 'Reduced tilt by 2° to reduce overshoot and improve capacity.'}`,
      status,
      kpiBefore: JSON.stringify({ rsrp: -108 + rand(-3, 3), prbUtilization: 82 + rand(-5, 8) }),
      kpiAfter: status === 'applied' ? JSON.stringify({ rsrp: -97 + rand(-2, 2), prbUtilization: 71 + rand(-4, 6) }) : null,
      impactScore: status === 'applied' ? Number(rand(4, 8).toFixed(1)) : null,
      rollbackReason: status === 'rolled_back' ? 'Power increase caused interference to adjacent cell' : null,
      appliedAt: status === 'applied' ? subHours(now, randInt(1, 24)) : null,
      rolledBackAt: status === 'rolled_back' ? subHours(now, randInt(0, 12)) : null,
      createdAt: subHours(now, randInt(1, 48)),
    });
    actionId++;
  }

  // HLB actions (5) - adjust_power for load balancing
  const hlbModule = moduleMap.get('HLB')!;
  for (let i = 0; i < 5; i++) {
    const site = site4G[i % site4G.length];
    const status = actionStatus();
    const oldPower = (15 + rand(0, 3)).toFixed(1);
    const newPower = (12 + rand(0, 2)).toFixed(1);
    sonActionsData.push({
      moduleId: hlbModule.id,
      siteId: site.id,
      technology: '4G',
      actionType: 'adjust_power',
      parameter: 'rsPower',
      previousValue: oldPower,
      newValue: newPower,
      reason: `HLB: PRB utilization at ${site.name} exceeded 80% threshold (${(82 + rand(0, 10)).toFixed(1)}%). Reducing RS power to offload ${randInt(15, 60)} users to neighboring cells.`,
      status,
      kpiBefore: JSON.stringify({ prbUtilization: 84 + rand(0, 10), activeUsers: randInt(180, 300) }),
      kpiAfter: status === 'applied' ? JSON.stringify({ prbUtilization: 68 + rand(0, 8), activeUsers: randInt(100, 180) }) : null,
      impactScore: status === 'applied' ? Number(rand(2, 5).toFixed(1)) : null,
      rollbackReason: status === 'rolled_back' ? 'User throughput dropped below acceptable level after power reduction' : null,
      appliedAt: status === 'applied' ? subHours(now, randInt(0, 24)) : null,
      rolledBackAt: status === 'rolled_back' ? subHours(now, randInt(0, 6)) : null,
      createdAt: subHours(now, randInt(0, 48)),
    });
    actionId++;
  }

  // CODC actions (4) - compensate_outage
  const codcModule = moduleMap.get('CODC')!;
  const codcSites = [site4G[0], site3G[3], site4G[8], site5G[2]];
  const codcTechs = ['4G', '3G', '4G', '5G'];
  for (let i = 0; i < 4; i++) {
    const site = codcSites[i];
    const status = actionStatus();
    sonActionsData.push({
      moduleId: codcModule.id,
      siteId: site.id,
      technology: codcTechs[i],
      actionType: 'compensate_outage',
      parameter: 'rsPower',
      previousValue: '15.2',
      newValue: '18.2',
      reason: `CODC: Adjacent cell outage detected. Compensating by boosting ${site.name} power by 3dB to cover affected area. Estimated coverage fill: ${randInt(60, 90)}%.`,
      status,
      kpiBefore: JSON.stringify({ coverageArea: 85 + rand(-5, 5), rsrp: -95 + rand(-3, 3) }),
      kpiAfter: status === 'applied' ? JSON.stringify({ coverageArea: 93 + rand(-2, 3), rsrp: -89 + rand(-2, 2) }) : null,
      impactScore: status === 'applied' ? Number(rand(6, 10).toFixed(1)) : null,
      rollbackReason: status === 'rolled_back' ? 'Outage resolved; reverting compensation parameters' : null,
      appliedAt: status === 'applied' ? subHours(now, randInt(0, 24)) : null,
      rolledBackAt: status === 'rolled_back' ? subHours(now, randInt(0, 6)) : null,
      createdAt: subHours(now, randInt(0, 48)),
    });
    actionId++;
  }

  // AIC actions (4) - correct_config
  const aicModule = moduleMap.get('AIC')!;
  const aicSites = [site4G[1], site3G[5], site4G[9], site2G[3]];
  const aicTechs = ['4G', '3G', '4G', '2G'];
  const aicParams = ['qrxlevmin', 'hysteresis', 'sIntraSearch', 'rxLevAccessMin'];
  const aicOldVals = ['-130', '2', '8', '-115'];
  const aicNewVals = ['-140', '3', '4', '-110'];
  const aicReasons = [
    'QRXLEVMIN inconsistency: -130dBm differs from regional template (-140dBm). Correcting to match.',
    'Hysteresis value 2dB is inconsistent with neighboring cells (3dB). Updating for handover consistency.',
    'SIntraSearch 8dB is too high for the cell density. Regional template specifies 4dB.',
    'RXLEV_ACCESS_MIN -115dBm is outside expected range. Correcting to -110dBm per network plan.',
  ];
  for (let i = 0; i < 4; i++) {
    const site = aicSites[i];
    const status = actionStatus();
    sonActionsData.push({
      moduleId: aicModule.id,
      siteId: site.id,
      technology: aicTechs[i],
      actionType: 'correct_config',
      parameter: aicParams[i],
      previousValue: aicOldVals[i],
      newValue: aicNewVals[i],
      reason: `AIC: ${aicReasons[i]} Site: ${site.name}.`,
      status,
      kpiBefore: JSON.stringify({ handoverSuccessRate: 96 + rand(-2, 1), reselectionRate: 12 + rand(-3, 5) }),
      kpiAfter: status === 'applied' ? JSON.stringify({ handoverSuccessRate: 97.5 + rand(-0.5, 0.5), reselectionRate: 8 + rand(-2, 3) }) : null,
      impactScore: status === 'applied' ? Number(rand(1, 4).toFixed(1)) : null,
      rollbackReason: status === 'rolled_back' ? 'Correction caused edge users to lose service' : null,
      appliedAt: status === 'applied' ? subHours(now, randInt(1, 24)) : null,
      rolledBackAt: status === 'rolled_back' ? subHours(now, randInt(0, 12)) : null,
      createdAt: subHours(now, randInt(2, 72)),
    });
    actionId++;
  }

  // PnP actions (2) - add_neighbor + adjust_power for newly onboarded 5G
  const pnpModule = moduleMap.get('PnP')!;
  for (let i = 0; i < 2; i++) {
    const site = site5G[i % site5G.length];
    const status = actionStatus();
    sonActionsData.push({
      moduleId: pnpModule.id,
      siteId: site.id,
      technology: '5G',
      actionType: i === 0 ? 'add_neighbor' : 'adjust_power',
      parameter: i === 0 ? 'neighborList' : 'ssbPower',
      previousValue: i === 0 ? JSON.stringify({ neighbors: 0 }) : '16',
      newValue: i === 0 ? JSON.stringify({ neighbors: 3, added: [site5G[(i + 1) % site5G.length].code] }) : '18',
      reason: `PnP: Initial ${i === 0 ? 'neighbor setup' : 'power calibration'} for newly integrated ${site.name}. ${i === 0 ? 'Added 3 initial neighbors based on proximity and frequency.' : 'SSB power adjusted after coverage verification.'}`,
      status,
      kpiBefore: JSON.stringify({ coverageRadius: 200 + rand(-50, 50), handoverSuccessRate: 0 }),
      kpiAfter: status === 'applied' ? JSON.stringify({ coverageRadius: 450 + rand(-50, 80), handoverSuccessRate: 97.5 + rand(-1, 1.5) }) : null,
      impactScore: status === 'applied' ? Number(rand(7, 10).toFixed(1)) : null,
      rollbackReason: null,
      appliedAt: status === 'applied' ? subHours(now, randInt(1, 24)) : null,
      rolledBackAt: null,
      createdAt: subHours(now, randInt(1, 72)),
    });
    actionId++;
  }

  // Insert all SonActions in batches
  const sonActions: any[] = [];
  for (const a of sonActionsData) {
    const action = await db.sonAction.create({ data: a });
    sonActions.push(action);
  }
  console.log(`  SonActions: ${sonActions.length}`);

  // ------------------------------------------------------------------
  // 3. NeighborRelation (60 records)
  // ------------------------------------------------------------------
  console.log('Seeding NeighborRelations...');

  // Build neighbor pairs between 4G sites
  // Each of the 10 selected 4G sites gets 3-8 neighbors
  const neighborPairs: { servingIdx: number; neighborIdx: number; relType: string; hoType: string }[] = [
    // AL001L (idx 0) — 6 neighbors
    { servingIdx: 0, neighborIdx: 1, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 0, neighborIdx: 2, relType: 'intra_freq', hoType: 'manual' },
    { servingIdx: 0, neighborIdx: 3, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 0, neighborIdx: 4, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 0, neighborIdx: 6, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 0, neighborIdx: 9, relType: 'inter_freq', hoType: 'pnp_auto' },
    // AL002L (idx 1) — 5 neighbors
    { servingIdx: 1, neighborIdx: 0, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 1, neighborIdx: 3, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 1, neighborIdx: 5, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 1, neighborIdx: 2, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 1, neighborIdx: 4, relType: 'intra_freq', hoType: 'manual' },
    // AL003L (idx 2) — 4 neighbors
    { servingIdx: 2, neighborIdx: 0, relType: 'intra_freq', hoType: 'manual' },
    { servingIdx: 2, neighborIdx: 1, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 2, neighborIdx: 3, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 2, neighborIdx: 10, relType: 'intra_freq', hoType: 'pnp_auto' },
    // AL004L (idx 3) — 5 neighbors
    { servingIdx: 3, neighborIdx: 0, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 3, neighborIdx: 1, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 3, neighborIdx: 2, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 3, neighborIdx: 4, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 3, neighborIdx: 9, relType: 'intra_freq', hoType: 'anr_auto' },
    // OR001L (idx 4) — 5 neighbors
    { servingIdx: 4, neighborIdx: 0, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 4, neighborIdx: 1, relType: 'intra_freq', hoType: 'manual' },
    { servingIdx: 4, neighborIdx: 3, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 4, neighborIdx: 5, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 4, neighborIdx: 11, relType: 'intra_freq', hoType: 'manual' },
    // OR002L (idx 5) — 4 neighbors
    { servingIdx: 5, neighborIdx: 1, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 5, neighborIdx: 4, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 5, neighborIdx: 8, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 5, neighborIdx: 6, relType: 'intra_freq', hoType: 'pnp_auto' },
    // CN001L (idx 6) — 4 neighbors
    { servingIdx: 6, neighborIdx: 0, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 6, neighborIdx: 5, relType: 'intra_freq', hoType: 'pnp_auto' },
    { servingIdx: 6, neighborIdx: 7, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 6, neighborIdx: 11, relType: 'inter_freq', hoType: 'anr_auto' },
    // CN002L (idx 7) — 4 neighbors
    { servingIdx: 7, neighborIdx: 6, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 7, neighborIdx: 8, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 7, neighborIdx: 10, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 7, neighborIdx: 11, relType: 'intra_freq', hoType: 'anr_auto' },
    // SF001L (idx 8) — 4 neighbors
    { servingIdx: 8, neighborIdx: 5, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 8, neighborIdx: 7, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 8, neighborIdx: 9, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 8, neighborIdx: 10, relType: 'intra_freq', hoType: 'manual' },
    // BL001L (idx 9) — 5 neighbors
    { servingIdx: 9, neighborIdx: 0, relType: 'inter_freq', hoType: 'pnp_auto' },
    { servingIdx: 9, neighborIdx: 3, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 9, neighborIdx: 8, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 9, neighborIdx: 10, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 9, neighborIdx: 11, relType: 'inter_freq', hoType: 'manual' },
    // BL002L (idx 10) — 4 neighbors
    { servingIdx: 10, neighborIdx: 2, relType: 'intra_freq', hoType: 'pnp_auto' },
    { servingIdx: 10, neighborIdx: 7, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 10, neighborIdx: 8, relType: 'intra_freq', hoType: 'manual' },
    { servingIdx: 10, neighborIdx: 9, relType: 'intra_freq', hoType: 'anr_auto' },
    // AN001L (idx 11) — 4 neighbors
    { servingIdx: 11, neighborIdx: 4, relType: 'intra_freq', hoType: 'manual' },
    { servingIdx: 11, neighborIdx: 6, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 11, neighborIdx: 7, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 11, neighborIdx: 9, relType: 'inter_freq', hoType: 'manual' },
    // Add more inter-tech relations (4G -> 3G/2G) to reach ~60
    { servingIdx: 0, neighborIdx: 1, relType: 'inter_tech', hoType: 'manual' },
    { servingIdx: 1, neighborIdx: 0, relType: 'inter_tech', hoType: 'manual' },
    { servingIdx: 4, neighborIdx: 2, relType: 'inter_tech', hoType: 'manual' },
    { servingIdx: 6, neighborIdx: 3, relType: 'inter_tech', hoType: 'anr_auto' },
    { servingIdx: 8, neighborIdx: 4, relType: 'inter_tech', hoType: 'manual' },
    { servingIdx: 9, neighborIdx: 5, relType: 'inter_tech', hoType: 'anr_auto' },
  ];

  let neighborCount = 0;
  for (const pair of neighborPairs) {
    if (pair.servingIdx >= site4G.length || pair.neighborIdx >= allSites.length) continue;
    const serving = site4G[pair.servingIdx];
    const neighbor = allSites[pair.neighborIdx];
    await db.neighborRelation.create({
      data: {
        servingCellId: serving.id,
        neighborCellId: neighbor.id,
        neighborCellName: neighbor.name,
        neighborCellCode: neighbor.code,
        technology: '4G',
        relationType: pair.relType,
        hoType: pair.hoType,
        status: Math.random() > 0.05 ? 'active' : 'removed',
        hoSuccessRate: Number(rand(85, 99.5).toFixed(1)),
        lastUpdated: subHours(now, randInt(0, 48)),
      },
    });
    neighborCount++;
  }
  console.log(`  NeighborRelations: ${neighborCount}`);

  // ------------------------------------------------------------------
  // 4. Policy (6 records)
  // ------------------------------------------------------------------
  console.log('Seeding Policies...');
  const anrMod = moduleMap.get('ANR')!;
  const mroMod = moduleMap.get('MRO')!;
  const ccoMod = moduleMap.get('CCO')!;
  const hlbMod = moduleMap.get('HLB')!;
  const codcMod = moduleMap.get('CODC')!;
  const aicMod = moduleMap.get('AIC')!;
  const pciMod = moduleMap.get('PCI')!;

  const policiesData = [
    {
      name: 'Auto Coverage Recovery',
      description: 'Automatically triggers CCO when RSRP drops below -105dBm. Adjusts antenna tilt and power to restore coverage within the affected cell area.',
      technology: '4G,5G',
      triggerType: 'kpi_breach',
      triggerConfig: JSON.stringify({ metric: 'rsrp', condition: 'lt', threshold: -105, evaluationPeriod: '15min', minBreaches: 2 }),
      actionModules: JSON.stringify([ccoMod.id]),
      scope: 'all',
      priority: 3,
      cooldownMins: 60,
      stats: JSON.stringify({ totalRuns: 47, successRate: 89.4, lastRun: subHours(now, 2).toISOString() }),
    },
    {
      name: 'Load Balancing Policy',
      description: 'Triggers HLB when PRB utilization exceeds 80%. Redistributes traffic across carriers and neighboring cells to prevent congestion.',
      technology: '4G,5G',
      triggerType: 'kpi_breach',
      triggerConfig: JSON.stringify({ metric: 'prbUtilization', condition: 'gt', threshold: 80, evaluationPeriod: '10min', minBreaches: 3 }),
      actionModules: JSON.stringify([hlbMod.id]),
      scope: 'all',
      priority: 5,
      cooldownMins: 30,
      stats: JSON.stringify({ totalRuns: 124, successRate: 93.1, lastRun: subMinutes(now, 45).toISOString() }),
    },
    {
      name: 'Outage Compensation Policy',
      description: 'Detects cell availability drops below 95% and triggers CODC to compensate by boosting neighboring cell parameters.',
      technology: 'ALL',
      triggerType: 'anomaly_detected',
      triggerConfig: JSON.stringify({ metric: 'availability', condition: 'lt', threshold: 95, detectionWindow: '5min', confirmWindow: '10min' }),
      actionModules: JSON.stringify([codcMod.id]),
      scope: 'all',
      priority: 1,
      cooldownMins: 15,
      stats: JSON.stringify({ totalRuns: 8, successRate: 100.0, lastRun: subHours(now, 18).toISOString() }),
    },
    {
      name: 'Neighbor Optimization Policy',
      description: 'Triggers ANR and MRO when handover success rate drops below 95%. Adds missing neighbors and optimizes handover parameters.',
      technology: '4G,5G',
      triggerType: 'kpi_breach',
      triggerConfig: JSON.stringify({ metric: 'handoverSuccessRate', condition: 'lt', threshold: 95, evaluationPeriod: '30min', minSamples: 50 }),
      actionModules: JSON.stringify([anrMod.id, mroMod.id]),
      scope: 'all',
      priority: 4,
      cooldownMins: 45,
      stats: JSON.stringify({ totalRuns: 33, successRate: 91.0, lastRun: subHours(now, 6).toISOString() }),
    },
    {
      name: 'Config Drift Correction',
      description: 'Scheduled policy that runs AIC every 6 hours to detect and correct parameter inconsistencies across the network.',
      technology: 'ALL',
      triggerType: 'schedule',
      triggerConfig: JSON.stringify({ cron: '0 */6 * * *', timezone: 'Africa/Algiers' }),
      actionModules: JSON.stringify([aicMod.id]),
      scope: 'all',
      priority: 7,
      cooldownMins: 360,
      stats: JSON.stringify({ totalRuns: 156, successRate: 96.0, lastRun: subHours(now, 4).toISOString() }),
    },
    {
      name: 'PCI Conflict Resolution',
      description: 'Detects PCI conflicts via anomaly detection and triggers automatic PCI reassignment to eliminate interference.',
      technology: '4G,5G',
      triggerType: 'anomaly_detected',
      triggerConfig: JSON.stringify({ metric: 'pci_conflict', condition: 'eq', threshold: 1, detectionMethod: 'modulus_check', frequency: 'every 1h' }),
      actionModules: JSON.stringify([pciMod.id]),
      scope: 'all',
      priority: 2,
      cooldownMins: 120,
      stats: JSON.stringify({ totalRuns: 12, successRate: 97.2, lastRun: subHours(now, 24).toISOString() }),
    },
  ];

  const policies: any[] = [];
  for (const p of policiesData) {
    const policy = await db.policy.create({ data: p });
    policies.push(policy);
  }
  console.log(`  Policies: ${policies.length}`);

  // ------------------------------------------------------------------
  // 5. PolicyExecution (15 records)
  // ------------------------------------------------------------------
  console.log('Seeding PolicyExecutions...');

  const execStatuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'failed', 'failed', 'failed', 'rolled_back', 'rolled_back', 'triggered', 'triggered'];
  const execData: any[] = [
    {
      policyId: policies[0].id, // Auto Coverage Recovery
      status: 'completed',
      triggerReason: 'RSRP at LTE-AL-003 dropped to -108.3dBm for 2 consecutive 15-min intervals',
      affectedSites: JSON.stringify(['AL003L']),
      actionsTaken: JSON.stringify(['adjusted antenna tilt 6° → 4°', 'increased RS power 15.2 → 17.0 dBm']),
      kpiImpact: JSON.stringify({ before: { rsrp: -108.3, coverageArea: 82 }, after: { rsrp: -96.1, coverageArea: 91 } }),
      durationMs: 18500,
      createdAt: subHours(now, 2),
      completedAt: subHours(now, 2),
    },
    {
      policyId: policies[1].id, // Load Balancing
      status: 'completed',
      triggerReason: 'PRB utilization at LTE-AL-001 reached 87.2% for 3 consecutive intervals',
      affectedSites: JSON.stringify(['AL001L', 'AL002L']),
      actionsTaken: JSON.stringify(['reduced RS power 15.2 → 13.0 dBm', 'adjusted MLB offset +2dB']),
      kpiImpact: JSON.stringify({ before: { prbUtilization: 87.2, activeUsers: 285 }, after: { prbUtilization: 68.4, activeUsers: 192 } }),
      durationMs: 12300,
      createdAt: subMinutes(now, 45),
      completedAt: subMinutes(now, 45),
    },
    {
      policyId: policies[2].id, // Outage Compensation
      status: 'completed',
      triggerReason: 'Cell LTE-CN-002 availability dropped to 91.3% — suspected RRU failure',
      affectedSites: JSON.stringify(['CN002L', 'CN001L']),
      actionsTaken: JSON.stringify(['boosted CN001L RS power by 3dB', 'reduced CN001L tilt by 1°']),
      kpiImpact: JSON.stringify({ before: { availability: 91.3, affectedUsers: 145 }, after: { availability: 98.7, affectedUsers: 12 } }),
      durationMs: 42000,
      createdAt: subHours(now, 18),
      completedAt: subHours(now, 18),
    },
    {
      policyId: policies[3].id, // Neighbor Optimization
      status: 'completed',
      triggerReason: 'Handover success rate at LTE-OR-001 dropped to 93.8% over 30min window',
      affectedSites: JSON.stringify(['OR001L', 'OR002L']),
      actionsTaken: JSON.stringify(['added 2 missing neighbors via ANR', 'increased hysteresis 2dB → 3dB via MRO']),
      kpiImpact: JSON.stringify({ before: { handoverSuccessRate: 93.8, pingPongRate: 4.1 }, after: { handoverSuccessRate: 97.2, pingPongRate: 1.8 } }),
      durationMs: 55000,
      createdAt: subHours(now, 6),
      completedAt: subHours(now, 6),
    },
    {
      policyId: policies[4].id, // Config Drift
      status: 'completed',
      triggerReason: 'Scheduled run — 6h config drift check',
      affectedSites: JSON.stringify(['AL001L', 'AL002L', 'OR001L', 'SF001L', 'BL001L']),
      actionsTaken: JSON.stringify(['corrected QRXLEVMIN at AL001L', 'corrected hysteresis at SF001L', 'corrected SIntraSearch at OR001L']),
      kpiImpact: JSON.stringify({ before: { inconsistencies: 3, avgHoRate: 95.8 }, after: { inconsistencies: 0, avgHoRate: 97.1 } }),
      durationMs: 95000,
      createdAt: subHours(now, 4),
      completedAt: subHours(now, 4),
    },
    {
      policyId: policies[5].id, // PCI Conflict
      status: 'completed',
      triggerReason: 'PCI conflict detected: modulus-3 collision between LTE-AL-001 (PCI 504) and LTE-AL-004 (PCI 501)',
      affectedSites: JSON.stringify(['AL001L', 'AL004L']),
      actionsTaken: JSON.stringify(['reassigned PCI 504 → 502 at LTE-AL-001']),
      kpiImpact: JSON.stringify({ before: { sinr: 7.2, conflictCount: 1 }, after: { sinr: 11.5, conflictCount: 0 } }),
      durationMs: 28000,
      createdAt: subHours(now, 24),
      completedAt: subHours(now, 24),
    },
    {
      policyId: policies[0].id,
      status: 'completed',
      triggerReason: 'RSRP at NR-AL-002 dropped to -112dBm in 5G coverage area',
      affectedSites: JSON.stringify(['AL002N']),
      actionsTaken: JSON.stringify(['increased SSB power 16 → 18 dBm', 'adjusted beam weight']),
      kpiImpact: JSON.stringify({ before: { rsrp: -112, coverageRadius: 280 }, after: { rsrp: -99, coverageRadius: 410 } }),
      durationMs: 22000,
      createdAt: subHours(now, 8),
      completedAt: subHours(now, 8),
    },
    {
      policyId: policies[1].id,
      status: 'completed',
      triggerReason: 'PRB utilization at LTE-OR-002 sustained 83% for 30min during peak',
      affectedSites: JSON.stringify(['OR002L', 'OR001L']),
      actionsTaken: JSON.stringify(['adjusted MLB threshold', 'reduced OR002L RS power 15.2 → 12.5 dBm']),
      kpiImpact: JSON.stringify({ before: { prbUtilization: 83.1 }, after: { prbUtilization: 71.5 } }),
      durationMs: 15000,
      createdAt: subHours(now, 10),
      completedAt: subHours(now, 10),
    },
    {
      policyId: policies[2].id,
      status: 'failed',
      triggerReason: 'Potential outage at UMTS-BL-001 — availability 94.1%',
      affectedSites: JSON.stringify(['BL001U']),
      actionsTaken: JSON.stringify([]),
      kpiImpact: JSON.stringify({ before: { availability: 94.1 }, after: { availability: 94.1 } }),
      rollbackReason: 'No adjacent cells available for compensation in Blida region',
      durationMs: 8500,
      createdAt: subHours(now, 36),
      completedAt: subHours(now, 36),
    },
    {
      policyId: policies[5].id,
      status: 'failed',
      triggerReason: 'PCI conflict detected at LTE-SF-001 but all alternative PCIs occupied',
      affectedSites: JSON.stringify(['SF001L']),
      actionsTaken: JSON.stringify(['attempted PCI reassignment to 128', 'attempted PCI reassignment to 256']),
      kpiImpact: JSON.stringify({ before: { conflictCount: 1 }, after: { conflictCount: 1 } }),
      rollbackReason: 'No available PCI in the neighborhood that satisfies modulus-3, modulus-6, and modulus-30 constraints',
      durationMs: 45000,
      createdAt: subHours(now, 12),
      completedAt: subHours(now, 12),
    },
    {
      policyId: policies[1].id,
      status: 'failed',
      triggerReason: 'HLB triggered for LTE-BL-002 but vendor API timeout',
      affectedSites: JSON.stringify(['BL002L']),
      actionsTaken: JSON.stringify(['API call to Nokia EMS timed out']),
      kpiImpact: JSON.stringify({ before: { prbUtilization: 88.2 }, after: { prbUtilization: 88.2 } }),
      rollbackReason: 'Nokia EMS connection timeout after 30s — no action applied',
      durationMs: 32000,
      createdAt: subHours(now, 5),
      completedAt: subHours(now, 5),
    },
    {
      policyId: policies[0].id,
      status: 'rolled_back',
      triggerReason: 'RSRP degradation at LTE-AN-001 triggered coverage recovery',
      affectedSites: JSON.stringify(['AN001L']),
      actionsTaken: JSON.stringify(['increased RS power 15.2 → 19.0 dBm', 'reduced tilt 6° → 2°']),
      kpiImpact: JSON.stringify({ before: { rsrp: -107 }, after: { rsrp: -107 } }),
      rollbackReason: 'Compensation caused interference spike at LTE-BL-001 — SINR dropped from 12 to 4 dB',
      durationMs: 120000,
      createdAt: subHours(now, 14),
      completedAt: subHours(now, 14),
    },
    {
      policyId: policies[3].id,
      status: 'rolled_back',
      triggerReason: 'Handover success rate at LTE-BL-001 dropped to 94.5%',
      affectedSites: JSON.stringify(['BL001L', 'BL002L']),
      actionsTaken: JSON.stringify(['added 3 neighbors via ANR', 'adjusted timeToTrigger 256ms → 128ms']),
      kpiImpact: JSON.stringify({ before: { handoverSuccessRate: 94.5 }, after: { handoverSuccessRate: 94.5 } }),
      rollbackReason: 'Reduced timeToTrigger caused excessive handover rate — network instability detected',
      durationMs: 67000,
      createdAt: subHours(now, 9),
      completedAt: subHours(now, 9),
    },
    {
      policyId: policies[0].id,
      status: 'triggered',
      triggerReason: 'RSRP at LTE-AL-004 dropped to -109.7dBm — evaluation in progress',
      affectedSites: JSON.stringify(['AL004L']),
      actionsTaken: JSON.stringify([]),
      kpiImpact: JSON.stringify({}),
      durationMs: null,
      createdAt: subMinutes(now, 3),
      completedAt: null,
    },
    {
      policyId: policies[1].id,
      status: 'triggered',
      triggerReason: 'PRB utilization at NR-AL-001 reached 78% — approaching threshold, monitoring',
      affectedSites: JSON.stringify(['AL001N']),
      actionsTaken: JSON.stringify([]),
      kpiImpact: JSON.stringify({}),
      durationMs: null,
      createdAt: subMinutes(now, 8),
      completedAt: null,
    },
  ];

  for (const e of execData) {
    await db.policyExecution.create({ data: e });
  }
  console.log(`  PolicyExecutions: ${execData.length}`);

  // ------------------------------------------------------------------
  // 6. VendorProfile (5 records)
  // ------------------------------------------------------------------
  console.log('Seeding VendorProfiles...');
  const vendorProfilesData = [
    {
      vendor: 'Ericsson',
      displayName: 'Ericsson Radio System',
      technologies: JSON.stringify(['2G', '3G', '4G', '5G']),
      apiType: 'rest',
      apiEndpoint: 'https://ericsson-ems.example.net/api/v2',
      status: 'active',
      lastSync: subMinutes(now, 15),
      stats: JSON.stringify({ sitesManaged: 9, lastActionCount: 12, syncStatus: 'healthy', firmwareVersion: 'BTS 5.3.1' }),
    },
    {
      vendor: 'Huawei',
      displayName: 'Huawei SingleRAN',
      technologies: JSON.stringify(['2G', '3G', '4G', '5G']),
      apiType: 'netconf',
      apiEndpoint: 'https://huawei-ums.example.net:830',
      status: 'active',
      lastSync: subMinutes(now, 8),
      stats: JSON.stringify({ sitesManaged: 12, lastActionCount: 8, syncStatus: 'healthy', firmwareVersion: 'SRAN18.1' }),
    },
    {
      vendor: 'Nokia',
      displayName: 'Nokia AirScale',
      technologies: JSON.stringify(['4G', '5G']),
      apiType: 'rest',
      apiEndpoint: 'https://nokia-netact.example.com/rest/v1',
      status: 'active',
      lastSync: subMinutes(now, 22),
      stats: JSON.stringify({ sitesManaged: 6, lastActionCount: 5, syncStatus: 'degraded', firmwareVersion: 'ASR16.3' }),
    },
    {
      vendor: 'Samsung',
      displayName: 'Samsung 5G Compact',
      technologies: JSON.stringify(['5G']),
      apiType: 'rest',
      apiEndpoint: 'https://samsung-nms.example.net/api/v1',
      status: 'active',
      lastSync: subMinutes(now, 5),
      stats: JSON.stringify({ sitesManaged: 3, lastActionCount: 2, syncStatus: 'healthy', firmwareVersion: 'SNR2.1' }),
    },
    {
      vendor: 'ZTE',
      displayName: 'ZTE UniRAN',
      technologies: JSON.stringify(['2G', '3G', '4G']),
      apiType: 'snmp',
      apiEndpoint: 'udp://zte-oms.example.net:161',
      status: 'active',
      lastSync: subMinutes(now, 30),
      stats: JSON.stringify({ sitesManaged: 4, lastActionCount: 3, syncStatus: 'healthy', firmwareVersion: 'UR12.5' }),
    },
  ];

  for (const v of vendorProfilesData) {
    await db.vendorProfile.create({ data: v });
  }
  console.log(`  VendorProfiles: ${vendorProfilesData.length}`);

  // ------------------------------------------------------------------
  // 7. SiteOnboarding (8 records)
  // ------------------------------------------------------------------
  console.log('Seeding SiteOnboardings...');
  const onboardingsData = [
    {
      siteName: 'NewSite-4G-001',
      siteCode: 'NS4G001',
      technology: '4G',
      region: 'Alger Centre',
      vendor: 'Ericsson',
      latitude: 36.760,
      longitude: 3.050,
      altitude: 22,
      frequency: '1800MHz',
      bandwidth: 20,
      maxCapacity: 150,
      status: 'completed',
      assignedPci: '502',
      assignedFreq: 'Band 3 (1800MHz)',
      initialNeighbors: JSON.stringify(['AL001L', 'AL002L', 'AL003L']),
      kpiBaseline: JSON.stringify({ rsrp: -88, sinr: 14, downloadThroughput: 85, prbUtilization: 35 }),
      completedAt: subHours(now, 48),
      createdAt: subHours(now, 52),
    },
    {
      siteName: 'NewSite-5G-001',
      siteCode: 'NS5G001',
      technology: '5G',
      region: 'Oran Métropole',
      vendor: 'Huawei',
      latitude: 35.700,
      longitude: -0.625,
      altitude: 85,
      frequency: '3500MHz',
      bandwidth: 100,
      maxCapacity: 1000,
      status: 'completed',
      assignedPci: '24',
      assignedFreq: 'n78 (3500MHz)',
      initialNeighbors: JSON.stringify(['OR001N', 'OR001L']),
      kpiBaseline: JSON.stringify({ rsrp: -82, sinr: 18, downloadThroughput: 450, prbUtilization: 22 }),
      completedAt: subHours(now, 24),
      createdAt: subHours(now, 28),
    },
    {
      siteName: 'NewSite-4G-002',
      siteCode: 'NS4G002',
      technology: '4G',
      region: 'Constantine',
      vendor: 'Nokia',
      latitude: 36.370,
      longitude: 6.620,
      altitude: 645,
      frequency: '1800MHz',
      bandwidth: 20,
      maxCapacity: 150,
      status: 'completed',
      assignedPci: '506',
      assignedFreq: 'Band 3 (1800MHz)',
      initialNeighbors: JSON.stringify(['CN001L', 'CN002L']),
      kpiBaseline: JSON.stringify({ rsrp: -91, sinr: 12, downloadThroughput: 72, prbUtilization: 41 }),
      completedAt: subHours(now, 12),
      createdAt: subHours(now, 16),
    },
    {
      siteName: 'NewSite-4G-003',
      siteCode: 'NS4G003',
      technology: '4G',
      region: 'Blida',
      vendor: 'ZTE',
      latitude: 36.475,
      longitude: 2.825,
      altitude: 225,
      frequency: '800MHz',
      bandwidth: 10,
      maxCapacity: 75,
      status: 'completed',
      assignedPci: '510',
      assignedFreq: 'Band 20 (800MHz)',
      initialNeighbors: JSON.stringify(['BL001L', 'BL002L']),
      kpiBaseline: JSON.stringify({ rsrp: -85, sinr: 11, downloadThroughput: 48, prbUtilization: 38 }),
      completedAt: subHours(now, 6),
      createdAt: subHours(now, 10),
    },
    {
      siteName: 'NewSite-5G-002',
      siteCode: 'NS5G002',
      technology: '5G',
      region: 'Oran Métropole',
      vendor: 'Samsung',
      latitude: 35.695,
      longitude: -0.640,
      altitude: 75,
      frequency: '3500MHz',
      bandwidth: 100,
      maxCapacity: 1000,
      status: 'provisioning',
      assignedPci: '36',
      assignedFreq: 'n78 (3500MHz)',
      initialNeighbors: JSON.stringify([]),
      kpiBaseline: JSON.stringify({}),
      completedAt: null,
      createdAt: subHours(now, 2),
    },
    {
      siteName: 'NewSite-4G-004',
      siteCode: 'NS4G004',
      technology: '4G',
      region: 'Sétif',
      vendor: 'Huawei',
      latitude: 36.195,
      longitude: 5.410,
      altitude: 1075,
      frequency: '1800MHz',
      bandwidth: 15,
      maxCapacity: 120,
      status: 'configuring',
      assignedPci: '514',
      assignedFreq: 'Band 3 (1800MHz)',
      initialNeighbors: JSON.stringify(['SF001L']),
      kpiBaseline: JSON.stringify({}),
      completedAt: null,
      createdAt: subHours(now, 4),
    },
    {
      siteName: 'NewSite-4G-005',
      siteCode: 'NS4G005',
      technology: '4G',
      region: 'Annaba',
      vendor: 'Ericsson',
      latitude: 36.905,
      longitude: 7.775,
      altitude: 8,
      frequency: '2600MHz',
      bandwidth: 20,
      maxCapacity: 200,
      status: 'pending',
      assignedPci: null,
      assignedFreq: null,
      initialNeighbors: JSON.stringify([]),
      kpiBaseline: JSON.stringify({}),
      completedAt: null,
      createdAt: subHours(now, 1),
    },
    {
      siteName: 'NewSite-5G-003',
      siteCode: 'NS5G003',
      technology: '5G',
      region: 'Tlemcen',
      vendor: 'Nokia',
      latitude: 34.885,
      longitude: -1.320,
      altitude: 805,
      frequency: '3500MHz',
      bandwidth: 100,
      maxCapacity: 1000,
      status: 'pending',
      assignedPci: null,
      assignedFreq: null,
      initialNeighbors: JSON.stringify([]),
      kpiBaseline: JSON.stringify({}),
      completedAt: null,
      createdAt: subMinutes(now, 30),
    },
  ];

  for (const o of onboardingsData) {
    await db.siteOnboarding.create({ data: o });
  }
  console.log(`  SiteOnboardings: ${onboardingsData.length}`);

  // ------------------------------------------------------------------
  // 8. QoEMetric (120 records)
  // ------------------------------------------------------------------
  console.log('Seeding QoEMetrics...');

  // Select 5 4G sites and 4 5G sites (using first available of each)
  const qoeSites4G = site4G.slice(0, 5); // AL001L, AL002L, AL003L, AL004L, OR001L
  const qoeSites5G = site5G.slice(0, 4); // AL001N, AL002N, AL003N, OR001N
  const qoeSites = [...qoeSites4G, ...qoeSites5G]; // 9 sites

  // 6 hourly points per site = 54 base records
  // Add ~13-14 records per site to reach ~120 (some have extra 15-min interval points)
  const qoeBatch: any[] = [];
  for (const site of qoeSites) {
    const is5G = site.technology === '5G';
    // 6 hourly points
    for (let h = 0; h < 6; h++) {
      const ts = subHours(now, h);
      const peakFactor = (h >= 3 && h <= 5) ? 1.0 : 0.7; // busier in recent hours
      qoeBatch.push({
        siteId: site.id,
        technology: site.technology,
        timestamp: ts,
        createdAt: ts,
        mosScore: Number((is5G ? rand(4.0, 4.8) : rand(3.5, 4.5)).toFixed(2)),
        dataRateExperienced: Number((is5G ? rand(40, 120) : rand(8, 45)).toFixed(1)),
        callSetupTime: Number((is5G ? rand(0.5, 1.5) : rand(1.0, 2.5)).toFixed(2)),
        callDropRate: Number(rand(0, is5G ? 0.5 : 1.5).toFixed(2)),
        webPageLoadTime: Number((is5G ? rand(0.3, 1.5) : rand(0.8, 3.5)).toFixed(2)),
        videoStartTime: Number((is5G ? rand(0.5, 1.5) : rand(1.0, 3.0)).toFixed(2)),
        pingLatency: Number((is5G ? rand(5, 25) : rand(20, 60)).toFixed(1)),
        jitterExperience: Number((is5G ? rand(0.5, 3) : rand(2, 10)).toFixed(1)),
        satisfactionIndex: Number((is5G ? rand(85, 98) : rand(70, 92)).toFixed(1)),
        subscriberCount: Math.floor(rand(50, 500) * peakFactor),
        complaintCount: randInt(0, Math.floor(is5G ? 3 : 6)),
      });
    }
    // Add extra 15-min interval records for some sites to reach ~120
    const extraCount = site === qoeSites[0] ? 8 : site === qoeSites[3] ? 7 : site === qoeSites[6] ? 6 : site === qoeSites[8] ? 5 : 0;
    for (let e = 0; e < extraCount; e++) {
      const ts = subHours(now, e * 0.25 + 0.5);
      const is5G2 = site.technology === '5G';
      qoeBatch.push({
        siteId: site.id,
        technology: site.technology,
        timestamp: ts,
        createdAt: ts,
        mosScore: Number((is5G2 ? rand(3.8, 4.7) : rand(3.0, 4.3)).toFixed(2)),
        dataRateExperienced: Number((is5G2 ? rand(35, 110) : rand(5, 40)).toFixed(1)),
        callSetupTime: Number((is5G2 ? rand(0.5, 2.0) : rand(1.0, 3.0)).toFixed(2)),
        callDropRate: Number(rand(0, is5G2 ? 0.8 : 2.0).toFixed(2)),
        webPageLoadTime: Number((is5G2 ? rand(0.3, 2.0) : rand(0.8, 4.0)).toFixed(2)),
        videoStartTime: Number((is5G2 ? rand(0.5, 2.0) : rand(1.0, 4.0)).toFixed(2)),
        pingLatency: Number((is5G2 ? rand(5, 30) : rand(15, 80)).toFixed(1)),
        jitterExperience: Number((is5G2 ? rand(0.5, 4) : rand(2, 12)).toFixed(1)),
        satisfactionIndex: Number((is5G2 ? rand(82, 97) : rand(60, 90)).toFixed(1)),
        subscriberCount: randInt(50, 500),
        complaintCount: randInt(0, 8),
      });
    }
  }

  // Insert in chunks
  const chunkSize = 50;
  for (let i = 0; i < qoeBatch.length; i += chunkSize) {
    await db.qoEMetric.createMany({ data: qoeBatch.slice(i, i + chunkSize) });
  }
  console.log(`  QoEMetrics: ${qoeBatch.length}`);

  // ==================================================================
  // PHASE B: ADVANCED INTELLIGENCE & OPERATIONS SEED DATA
  // ==================================================================
  console.log('\n--- Seeding Phase B: Advanced Intelligence & Operations ---');

  const bSites = await db.networkSite.findMany();
  const b4G = bSites.filter(s => s.technology === '4G');
  const b5G = bSites.filter(s => s.technology === '5G');
  const b3G = bSites.filter(s => s.technology === '3G');
  const b2G = bSites.filter(s => s.technology === '2G');

  // ------------------------------------------------------------------
  // 1. CapacityForecast (40 records)
  // ------------------------------------------------------------------
  console.log('Seeding CapacityForecasts...');
  const forecastMetrics = ['prbUtilization', 'activeUsers', 'throughput'];
  const forecastHorizons = ['7d', '14d', '30d'];
  const capacityBatch: any[] = [];

  // Use a subset of sites: pick sites from different techs and regions
  const forecastSites = [...b4G.slice(0, 6), ...b5G.slice(0, 4), ...b3G.slice(0, 2), ...b2G.slice(0, 2)];
  let fcCount = 0;
  for (const site of forecastSites) {
    if (fcCount >= 40) break;
    for (const metric of forecastMetrics) {
      if (fcCount >= 40) break;
      const horizon = forecastHorizons[fcCount % 3];
      let currentValue: number;
      let capacityLimit: number | undefined;
      let forecastValue: number;
      let growthRate: number;

      if (metric === 'prbUtilization') {
        currentValue = Number(rand(40, 90).toFixed(1));
        capacityLimit = 100;
        growthRate = Number(rand(-2, 25).toFixed(1));
        forecastValue = Number(Math.min(100, currentValue * (1 + growthRate / 100)).toFixed(1));
      } else if (metric === 'activeUsers') {
        currentValue = Number(rand(50, 400).toFixed(0));
        capacityLimit = Number(rand(300, 1200).toFixed(0));
        growthRate = Number(rand(-3, 20).toFixed(1));
        forecastValue = Number((currentValue * (1 + growthRate / 100)).toFixed(0));
      } else {
        currentValue = Number(rand(20, 200).toFixed(1));
        capacityLimit = Number(rand(100, 500).toFixed(1));
        growthRate = Number(rand(-1, 22).toFixed(1));
        forecastValue = Number((currentValue * (1 + growthRate / 100)).toFixed(1));
      }

      let riskLevel: string;
      let recommendation: string;
      if (growthRate > 15) {
        riskLevel = 'high';
        recommendation = 'Capacity expansion recommended within 30 days';
      } else if (growthRate > 8) {
        riskLevel = 'medium';
        recommendation = 'Monitor closely, consider capacity expansion';
      } else {
        riskLevel = 'low';
        recommendation = 'No action needed';
      }

      capacityBatch.push({
        siteId: site.id,
        technology: site.technology,
        region: site.region,
        metric,
        currentValue,
        forecastValue,
        forecastHorizon: horizon,
        growthRate,
        capacityLimit,
        utilizationAtLimit: capacityLimit && currentValue > 0 ? Number(((forecastValue / capacityLimit) * 100).toFixed(1)) : null,
        confidence: Number(rand(0.7, 0.98).toFixed(2)),
        riskLevel,
        recommendation,
        timestamp: subHours(now, randInt(1, 24)),
      });
      fcCount++;
    }
  }
  const chunkSizeB = 50;
  for (let i = 0; i < capacityBatch.length; i += chunkSizeB) {
    await db.capacityForecast.createMany({ data: capacityBatch.slice(i, i + chunkSizeB) });
  }
  console.log(`  CapacityForecasts: ${capacityBatch.length}`);

  // ------------------------------------------------------------------
  // 2. NetworkSlice (12 records) — 5G NR sites only
  // ------------------------------------------------------------------
  console.log('Seeding NetworkSlices...');
  const sliceData = [
    // eMBB (4 slices)
    { name: 'eMBB-Video-Streaming-AL001', sliceType: 'eMBB', siteIdx: 0, sst: '1', maxBw: 100, guarBw: 30, maxUsers: 200, priority: 3, latTarget: 20, load: 72, users: 145, throughput: 65.3, latency: 12.4, fiveQi: 9 },
    { name: 'eMBB-Broadband-AL002', sliceType: 'eMBB', siteIdx: 1, sst: '1', maxBw: 100, guarBw: 30, maxUsers: 150, priority: 4, latTarget: 20, load: 58, users: 87, throughput: 48.7, latency: 14.1, fiveQi: 9 },
    { name: 'eMBB-Enterprise-OR001', sliceType: 'eMBB', siteIdx: 3, sst: '1', maxBw: 100, guarBw: 50, maxUsers: 100, priority: 2, latTarget: 15, load: 45, users: 42, throughput: 38.2, latency: 10.8, fiveQi: 8 },
    { name: 'eMBB-Public-Safety-CN001', sliceType: 'eMBB', siteIdx: 5, sst: '1', maxBw: 80, guarBw: 40, maxUsers: 80, priority: 1, latTarget: 20, load: 33, users: 26, throughput: 25.1, latency: 11.5, fiveQi: 8 },
    // URLLC (4 slices)
    { name: 'URLLC-Industrial-AL001', sliceType: 'URLLC', siteIdx: 0, sst: '2', maxBw: 50, guarBw: 10, maxUsers: 50, priority: 1, latTarget: 5, load: 28, users: 12, throughput: 8.5, latency: 3.2, fiveQi: 80 },
    { name: 'URLLC-Autonomous-OR002', sliceType: 'URLLC', siteIdx: 4, sst: '2', maxBw: 50, guarBw: 10, maxUsers: 30, priority: 1, latTarget: 5, load: 85, users: 25, throughput: 42.3, latency: 4.1, fiveQi: 80 },
    { name: 'URLLC-AR-VR-AL003', sliceType: 'URLLC', siteIdx: 2, sst: '2', maxBw: 50, guarBw: 10, maxUsers: 100, priority: 2, latTarget: 5, load: 40, users: 38, throughput: 15.6, latency: 3.8, fiveQi: 82 },
    { name: 'URLLC-Remote-Surgery-OR001', sliceType: 'URLLC', siteIdx: 3, sst: '2', maxBw: 50, guarBw: 10, maxUsers: 10, priority: 1, latTarget: 5, load: 20, users: 4, throughput: 5.2, latency: 2.8, fiveQi: 84 },
    // mMTC (4 slices)
    { name: 'mMTC-Smart-Meter-AL001', sliceType: 'mMTC', siteIdx: 0, sst: '3', maxBw: 20, guarBw: 1, maxUsers: 500, priority: 5, latTarget: 100, load: 65, users: 320, throughput: 3.2, latency: 45.6, fiveQi: 2 },
    { name: 'mMTC-Agri-Sensors-SF001', sliceType: 'mMTC', siteIdx: 3, sst: '3', maxBw: 20, guarBw: 1, maxUsers: 400, priority: 6, latTarget: 100, load: 22, users: 88, throughput: 1.1, latency: 62.3, fiveQi: 2 },
    { name: 'mMTC-Tracking-OR001', sliceType: 'mMTC', siteIdx: 3, sst: '3', maxBw: 20, guarBw: 1, maxUsers: 600, priority: 5, latTarget: 100, load: 51, users: 305, throughput: 4.8, latency: 38.9, fiveQi: 2 },
    { name: 'mMTC-Smart-City-AL002', sliceType: 'mMTC', siteIdx: 1, sst: '3', maxBw: 20, guarBw: 1, maxUsers: 500, priority: 4, latTarget: 100, load: 78, users: 390, throughput: 6.1, latency: 42.1, fiveQi: 2 },
  ];

  const networkSliceBatch = sliceData.map(sd => {
    const site = b5G[sd.siteIdx % b5G.length];
    return {
      name: sd.name,
      sliceType: sd.sliceType,
      technology: '5G',
      status: sd.load > 80 ? 'suspended' : 'active',
      siteId: site.id,
      sst: sd.sst,
      maxBandwidth: sd.maxBw,
      guaranteedBw: sd.guarBw,
      maxUsers: sd.maxUsers,
      priorityLevel: sd.priority,
      latencyTarget: sd.latTarget,
      reliabilityTarget: sd.sliceType === 'URLLC' ? 99.999 : sd.sliceType === 'eMBB' ? 99.99 : 99.9,
      currentLoad: sd.load,
      activeUsers: sd.users,
      avgThroughput: sd.throughput,
      avgLatency: sd.latency,
      FiveQi: sd.fiveQi,
      parameters: JSON.stringify({
        sliceType: sd.sliceType,
        description: sd.sliceType === 'eMBB' ? 'Enhanced Mobile Broadband' : sd.sliceType === 'URLLC' ? 'Ultra-Reliable Low Latency' : 'Massive Machine-Type Communications',
      }),
    };
  });
  await db.networkSlice.createMany({ data: networkSliceBatch });
  console.log(`  NetworkSlices: ${networkSliceBatch.length}`);

  // ------------------------------------------------------------------
  // 3. EnergyMetric (120 records) — 3-4 per site across 6 hours
  // ------------------------------------------------------------------
  console.log('Seeding EnergyMetrics...');
  const energyBatch: any[] = [];
  const powerRanges: Record<string, [number, number]> = { '2G': [300, 800], '3G': [500, 1200], '4G': [800, 2000], '5G': [1500, 4000] };
  const modeRoll = () => { const r = Math.random(); return r < 0.80 ? 'normal' : r < 0.92 ? 'energy_saving' : r < 0.97 ? 'sleep' : 'shutdown'; };

  for (const site of bSites) {
    const readingsCount = randInt(3, 4);
    for (let r = 0; r < readingsCount; r++) {
      const ts = subHours(now, r * 2 + rand(0, 1));
      const mode = modeRoll();
      const [pMin, pMax] = powerRanges[site.technology] || [500, 1500];
      const basePower = rand(pMin, pMax);
      // Mode-based power: normal=100%, energy_saving=60%, sleep=30-40% (60-70% reduction), shutdown=0W
      let powerConsumption: number;
      if (mode === 'shutdown') {
        powerConsumption = 0;
      } else if (mode === 'sleep') {
        powerConsumption = Number((basePower * rand(0.30, 0.40)).toFixed(1));
      } else if (mode === 'energy_saving') {
        powerConsumption = Number((basePower * 0.6).toFixed(1));
      } else {
        powerConsumption = Number(basePower.toFixed(1));
      }
      const trafficLoad = mode === 'shutdown' ? 0 : mode === 'sleep' ? Number(rand(0, 5).toFixed(1)) : Number(rand(10, 85).toFixed(1));
      const temperature = Number(rand(25, 45).toFixed(1));
      const co2Emission = Number((powerConsumption * 0.0005).toFixed(4));
      const energyConsumed = Number((powerConsumption * 2).toFixed(1)); // 2-hour interval in Wh

      energyBatch.push({
        siteId: site.id,
        technology: site.technology,
        timestamp: ts,
        powerConsumption,
        energyConsumed,
        activeUsers: mode === 'shutdown' ? 0 : mode === 'sleep' ? randInt(0, 5) : randInt(5, 200),
        trafficLoad,
        temperature,
        sleepMode: mode === 'sleep' || mode === 'shutdown',
        mode,
        co2Emission,
        solarGeneration: Math.random() < 0.3 ? Number(rand(50, 500).toFixed(1)) : null,
        batteryLevel: Math.random() < 0.4 ? Number(rand(60, 100).toFixed(0)) : null,
      });
    }
  }
  for (let i = 0; i < energyBatch.length; i += chunkSizeB) {
    await db.energyMetric.createMany({ data: energyBatch.slice(i, i + chunkSizeB) });
  }
  console.log(`  EnergyMetrics: ${energyBatch.length}`);

  // ------------------------------------------------------------------
  // 4. FaultPrediction (20 records)
  // ------------------------------------------------------------------
  console.log('Seeding FaultPredictions...');
  const fpComponents = ['RRU', 'BBU', 'PSU', 'Antenna', 'Fiber', 'Transport'];
  const fpFaultTypes = ['hardware_failure', 'software_bug', 'degradation', 'power_issue', 'environmental'];
  const fpSeverities = ['low', 'medium', 'high', 'critical'];
  const fpStatuses = ['predicted', 'predicted', 'predicted', 'predicted', 'confirmed', 'confirmed', 'mitigated', 'mitigated', 'false_positive'];
  const fpActions = [
    'Schedule preventive maintenance',
    'Replace PSU unit',
    'Update firmware',
    'Check antenna connections',
    'Inspect fiber optic cable for bends',
    'Monitor BBU temperature closely',
    'Clean RRU filters and check fans',
    'Verify power supply voltage levels',
    'Replace degraded antenna feeder cable',
    'Update transport switch firmware',
    'Schedule immediate hardware replacement',
    'Escalate to vendor support team',
  ];
  const fpTimeToFail = ['24h', '72h', '7d', '14d', '30d'];
  const fpBatch: any[] = [];

  for (let i = 0; i < 20; i++) {
    const site = bSites[i % bSites.length];
    const component = fpComponents[i % fpComponents.length];
    const faultType = fpFaultTypes[i % fpFaultTypes.length];
    const severity = fpSeverities[i % fpSeverities.length];
    const status = fpStatuses[i % fpStatuses.length];
    const probability = Number(rand(0.1, 0.9).toFixed(2));

    fpBatch.push({
      siteId: site.id,
      technology: site.technology,
      component,
      faultType,
      probability,
      severity,
      status,
      confidence: Number(rand(0.6, 0.99).toFixed(2)),
      indicators: JSON.stringify([
        `High ${component} temperature`,
        `${component} error count elevated`,
        `Degraded ${component} performance metrics`,
      ].slice(0, randInt(1, 3))),
      recommendedAction: fpActions[i % fpActions.length],
      estimatedTimeToFail: fpTimeToFail[i % fpTimeToFail.length],
      resolvedAt: (status === 'mitigated' || status === 'false_positive') ? subHours(now, randInt(1, 48)) : null,
      createdAt: subHours(now, randInt(2, 72)),
    });
  }
  await db.faultPrediction.createMany({ data: fpBatch });
  console.log(`  FaultPredictions: ${fpBatch.length}`);

  // ------------------------------------------------------------------
  // 5. SubscriberSegment (8 records)
  // ------------------------------------------------------------------
  console.log('Seeding SubscriberSegments...');
  const segmentData = [
    { name: 'Premium Data Users', tech: '4G,5G', count: 45000, data: 45, voice: 120, arpu: 38, churn: 0.05, satisfaction: 88, services: ['video_streaming', 'web_browsing', 'gaming'], peak: '20:00-23:00' },
    { name: 'Voice-Only', tech: '2G,3G', count: 48000, data: 1, voice: 800, arpu: 8, churn: 0.15, satisfaction: 65, services: ['voip', 'messaging'], peak: '08:00-10:00' },
    { name: 'Heavy Gamers', tech: '4G,5G', count: 12000, data: 50, voice: 30, arpu: 42, churn: 0.08, satisfaction: 82, services: ['gaming', 'social_media', 'web_browsing'], peak: '19:00-01:00' },
    { name: 'IoT/M2M', tech: '4G,5G', count: 50000, data: 2, voice: 0, arpu: 3, churn: 0.03, satisfaction: 92, services: ['iot_data'], peak: '02:00-05:00' },
    { name: 'Roaming Users', tech: '2G,3G,4G,5G', count: 5000, data: 8, voice: 60, arpu: 25, churn: 0.4, satisfaction: 55, services: ['video_streaming', 'voip', 'web_browsing', 'messaging'], peak: '12:00-18:00' },
    { name: 'Enterprise', tech: '4G,5G', count: 3500, data: 35, voice: 200, arpu: 45, churn: 0.02, satisfaction: 90, services: ['enterprise_vpn', 'web_browsing', 'voip'], peak: '08:00-18:00' },
    { name: 'Prepaid Budget', tech: '2G,3G,4G', count: 32000, data: 5, voice: 150, arpu: 2, churn: 0.35, satisfaction: 42, services: ['messaging', 'social_media', 'web_browsing'], peak: '18:00-22:00' },
    { name: 'Social Media Users', tech: '3G,4G', count: 28000, data: 12, voice: 40, arpu: 12, churn: 0.18, satisfaction: 70, services: ['social_media', 'messaging', 'video_streaming'], peak: '19:00-23:00' },
  ];

  const subscriberBatch = segmentData.map(sd => ({
    segmentName: sd.name,
    technology: sd.tech,
    criteria: JSON.stringify({
      dataRange: `${sd.data}GB/month avg`,
      usagePattern: sd.services[0],
      arpuRange: `$${sd.arpu}/month`,
    }),
    subscriberCount: sd.count,
    avgDataUsage: sd.data,
    avgVoiceMinutes: sd.voice,
    arpu: sd.arpu,
    churnRisk: sd.churn,
    satisfactionScore: sd.satisfaction,
    topServices: JSON.stringify(sd.services),
    peakHour: sd.peak,
  }));
  await db.subscriberSegment.createMany({ data: subscriberBatch });
  console.log(`  SubscriberSegments: ${subscriberBatch.length}`);

  // ------------------------------------------------------------------
  // 6. Incident (15 records)
  // ------------------------------------------------------------------
  console.log('Seeding Incidents...');
  const incidentData = [
    // 4 critical
    { title: 'Major Outage - LTE-AL-001 Complete Service Loss', desc: 'All sectors down on LTE-AL-001 due to power supply unit failure. Affecting approximately 2000 active users in Alger Centre.', tech: '4G', siteIdx: 0, sev: 'critical', status: 'resolved', cat: 'power', mttr: 180, assigned: 'Team Alpha', root: 'PSU hardware failure causing complete power loss to RRU and BBU', resolution: 'Emergency PSU replacement completed. All sectors restored and verified.', slaBreach: true, tags: ['outage', 'hardware', 'power'] },
    { title: 'Hardware Failure - NR-AL-001 BBU Crash', desc: 'Baseband Unit experiencing repeated crashes causing 5G service disruption in Oran Métropole.', tech: '5G', siteIdx: 1, sev: 'critical', status: 'investigating', cat: 'hardware', mttr: 240, assigned: 'Team Beta', tags: ['hardware', '5g', 'bbu'] },
    { title: 'Fiber Cut - Multiple Sites Constantine', desc: 'Backbone fiber cut affecting 3G/4G backhaul for CN001 and CN002 clusters.', tech: '4G', siteIdx: 8, sev: 'critical', status: 'open', cat: 'network', mttr: 120, assigned: 'NOC Team', tags: ['fiber', 'backhaul', 'outage'] },
    { title: 'Core Network Congestion - Sétif', desc: 'SGW/PGW overload causing throughput degradation for all 4G sites in Sétif region.', tech: '4G', siteIdx: 10, sev: 'critical', status: 'investigating', cat: 'network', mttr: 90, assigned: 'Core Team', tags: ['congestion', 'core', 'capacity'] },
    // 5 high
    { title: 'Capacity Saturation - LTE-AL-002', desc: 'PRB utilization consistently above 92% during peak hours causing call blocking.', tech: '4G', siteIdx: 1, sev: 'high', status: 'resolved', cat: 'network', mttr: 60, assigned: 'RF Team', root: 'Insufficient capacity for growing user demand in Oran Métropole business district', resolution: 'Additional carrier activated and load balancing parameters adjusted.', slaBreach: false, tags: ['capacity', 'prb'] },
    { title: 'Interference Detection - LTE-OR-002', desc: 'High uplink interference detected causing elevated noise floor and degraded UL throughput.', tech: '4G', siteIdx: 5, sev: 'high', status: 'investigating', cat: 'network', mttr: 45, assigned: 'RF Team', tags: ['interference', 'uplink'] },
    { title: 'Transport Link Flapping - NR-OR-001', desc: 'CPRI/OBSAI link to NR-OR-001 experiencing intermittent failures causing 5G service drops.', tech: '5G', siteIdx: 3, sev: 'high', status: 'open', cat: 'network', mttr: 30, assigned: 'Transport Team', tags: ['transport', '5g'] },
    { title: 'High Drop Rate - UMTS-CN-001', desc: 'Call drop rate exceeding 3.5% threshold on UMTS-CN-001 due to poor neighbor relations.', tech: '3G', siteIdx: 13, sev: 'high', status: 'resolved', cat: 'network', mttr: 90, assigned: 'Optimization Team', root: 'Missing inter-frequency neighbor causing calls to drop at cell edge', resolution: 'ANR module added missing neighbors and MRO optimized handover parameters.', slaBreach: true, tags: ['drop_rate', 'handover'] },
    { title: 'Thermal Alert - NR-AL-002 RRU', desc: 'RRU temperature exceeding 65°C threshold, auto-power reduction activated.', tech: '5G', siteIdx: 2, sev: 'high', status: 'resolved', cat: 'environmental', mttr: 30, assigned: 'Field Team', root: 'Cooling fan failure in RRU enclosure', resolution: 'Fan replaced and thermal paste reapplied. Temperature returned to normal.', slaBreach: false, tags: ['thermal', 'hardware'] },
    // 4 medium
    { title: 'Performance Degradation - LTE-BL-001', desc: 'Gradual throughput decline over 48 hours, likely due to interference from new co-located system.', tech: '4G', siteIdx: 11, sev: 'medium', status: 'resolved', cat: 'network', mttr: 60, assigned: 'RF Team', root: 'External interference from newly installed DAS system in adjacent building', resolution: 'Coordination with building management to adjust DAS antenna tilt and power.', slaBreach: false, tags: ['degradation', 'interference'] },
    { title: 'Power Issue - GSM-SF-001', desc: 'Battery backup failing to hold charge, risking service loss during power outages.', tech: '2G', siteIdx: 6, sev: 'medium', status: 'closed', cat: 'power', mttr: 120, assigned: 'Power Team', root: 'Aged battery cells reaching end of life', resolution: 'Full battery string replacement completed and tested.', slaBreach: false, tags: ['power', 'battery'] },
    { title: 'Configuration Drift - LTE-BL-002', desc: 'Parameter values deviating from approved template causing sub-optimal performance.', tech: '4G', siteIdx: 12, sev: 'medium', status: 'open', cat: 'software', mttr: 30, assigned: 'SON Team', tags: ['config', 'parameter'] },
    { title: 'Neighborhood Optimization Needed - UMTS-OR-001', desc: 'Handover success rate dropped below 93% indicating neighbor list issues.', tech: '3G', siteIdx: 10, sev: 'medium', status: 'investigating', cat: 'network', mttr: 60, assigned: 'Optimization Team', tags: ['handover', 'neighbor'] },
    // 2 low
    { title: 'Minor Config Issue - NR-OR-002', desc: 'PCI assignment not following regional plan, potential modulo-3 conflict with planned site.', tech: '5G', siteIdx: 4, sev: 'low', status: 'closed', cat: 'software', mttr: 30, assigned: 'Planning Team', root: 'PCI not updated during last site commissioning', resolution: 'PCI reassigned to conflict-free value per regional plan.', slaBreach: false, tags: ['pci', 'config'] },
    { title: 'Alarm Storm - GSM-AL-001', desc: 'Multiple transient alarms triggered by brief power fluctuation. No service impact.', tech: '2G', siteIdx: 0, sev: 'low', status: 'resolved', cat: 'power', mttr: 30, assigned: 'NOC', root: 'Momentary power grid fluctuation', resolution: 'No action needed. Alarms cleared and monitoring continued.', slaBreach: false, tags: ['alarm', 'power'] },
  ];

  const incidentBatch = incidentData.map(inc => {
    const site = bSites[inc.siteIdx % bSites.length];
    const createdAt = subHours(now, randInt(2, 168));
    const resolvedAt = ['resolved', 'closed'].includes(inc.status) ? new Date(createdAt.getTime() + inc.mttr * 60 * 1000) : null;
    return {
      title: inc.title,
      description: inc.desc,
      technology: inc.tech,
      siteId: site.id,
      severity: inc.sev,
      status: inc.status,
      category: inc.cat,
      priority: inc.sev === 'critical' ? 1 : inc.sev === 'high' ? 2 : inc.sev === 'medium' ? 4 : 6,
      assignedTo: inc.assigned,
      reportedBy: 'system',
      mttrTarget: inc.mttr,
      rootCause: inc.root || null,
      resolution: inc.resolution || null,
      affectedSites: JSON.stringify([site.id]),
      relatedAlerts: JSON.stringify([]),
      tags: JSON.stringify(inc.tags),
      slaBreach: inc.slaBreach || false,
      resolvedAt,
      createdAt,
    };
  });
  await db.incident.createMany({ data: incidentBatch });
  console.log(`  Incidents: ${incidentBatch.length}`);

  // ------------------------------------------------------------------
  // 7. ConfigTemplate (10 records)
  // ------------------------------------------------------------------
  console.log('Seeding ConfigTemplates...');
  const configTemplates = [
    {
      name: '4G LTE Urban Macro Default', technology: '4G', category: 'radio', vendor: 'Ericsson', isDefault: true, applyCount: 45, lastApplied: subHours(now, 12),
      description: 'Default configuration template for 4G LTE urban macro sites deployed with Ericsson equipment.',
      parameters: JSON.stringify({
        rsPower: { value: '15.2', unit: 'dBm', range: '10-20' },
        electricalTilt: { value: '6', unit: 'degrees', range: '0-12' },
        pci: { value: 'auto', unit: '', range: '0-503' },
        prachConfigIndex: { value: '6', unit: '', range: '0-100' },
        referenceSignalPower: { value: '-90', unit: 'dBm', range: '-120 to -60' },
      }),
    },
    {
      name: '4G LTE Rural Coverage', technology: '4G', category: 'radio', vendor: 'Huawei', isDefault: true, applyCount: 22, lastApplied: subHours(now, 36),
      description: 'Optimized for maximum coverage area with higher power and lower frequency bands.',
      parameters: JSON.stringify({
        rsPower: { value: '18.0', unit: 'dBm', range: '10-20' },
        electricalTilt: { value: '2', unit: 'degrees', range: '0-12' },
        maxTxPower: { value: '46', unit: 'dBm', range: '40-46' },
        cellRadius: { value: '15', unit: 'km', range: '5-30' },
        drxCycleLength: { value: '320', unit: 'ms', range: '10-2560' },
      }),
    },
    {
      name: '5G NR Massive MIMO', technology: '5G', category: 'radio', vendor: 'Nokia', isDefault: true, applyCount: 6, lastApplied: subHours(now, 6),
      description: 'Massive MIMO configuration for 5G NR high-capacity urban deployments with 64T64R antennas.',
      parameters: JSON.stringify({
        ssbPwr: { value: '-8', unit: 'dBm', range: '-20 to 5' },
        beamWidth: { value: '65', unit: 'degrees', range: '45-120' },
        maxTxPower: { value: '43', unit: 'dBm', range: '35-43' },
        tciState: { value: 'auto', unit: '', range: '0-127' },
        numTxPorts: { value: '64', unit: 'ports', range: '16-64' },
      }),
    },
    {
      name: '5G NR Coverage Layer', technology: '5G', category: 'radio', vendor: 'Huawei', isDefault: false, applyCount: 3, lastApplied: subHours(now, 48),
      description: 'Coverage-focused 5G NR template for suburban and rural 5G deployments with 8T8R antennas.',
      parameters: JSON.stringify({
        ssbPwr: { value: '-5', unit: 'dBm', range: '-20 to 5' },
        beamWidth: { value: '90', unit: 'degrees', range: '45-120' },
        maxTxPower: { value: '46', unit: 'dBm', range: '35-46' },
        sacPeriodicity: { value: '20', unit: 'ms', range: '5-160' },
        pciRange: { value: '0-1007', unit: '', range: '0-1007' },
      }),
    },
    {
      name: 'Inter-technology Handover', technology: 'ALL', category: 'handover', vendor: '', isDefault: true, applyCount: 80, lastApplied: subHours(now, 8),
      description: 'Standard inter-technology handover configuration for 2G-3G-4G-5G mobility.',
      parameters: JSON.stringify({
        hoTriggerOffset: { value: '2', unit: 'dB', range: '0-6' },
        hoHysteresis: { value: '1', unit: 'dB', range: '0-4' },
        timeToTrigger: { value: '320', unit: 'ms', range: '40-1024' },
        a2Threshold: { value: '-90', unit: 'dBm', range: '-120 to -60' },
        b2ThresholdOffset: { value: '4', unit: 'dB', range: '0-10' },
      }),
    },
    {
      name: 'Cell Edge Power Optimization', technology: 'ALL', category: 'power', vendor: '', isDefault: false, applyCount: 15, lastApplied: subHours(now, 24),
      description: 'Optimizes transmit power at cell edges to reduce interference and improve handover performance.',
      parameters: JSON.stringify({
        maxPowerReduction: { value: '6', unit: 'dB', range: '0-15' },
        pMax: { value: '23', unit: 'dBm', range: '10-30' },
        pucchPowerOffset: { value: '0', unit: 'dB', range: '-8 to 7' },
        alpha: { value: '0.8', unit: '', range: '0-1' },
      }),
    },
    {
      name: 'Load Balancing Template', technology: 'ALL', category: 'capacity', vendor: '', isDefault: true, applyCount: 34, lastApplied: subHours(now, 3),
      description: 'Automatic load balancing configuration to distribute traffic evenly across cells.',
      parameters: JSON.stringify({
        lbTriggerThreshold: { value: '75', unit: '%', range: '50-90' },
        lbTargetThreshold: { value: '55', unit: '%', range: '30-70' },
        cellIndividualOffset: { value: '3', unit: 'dB', range: '0-15' },
        lbPeriodicity: { value: '30', unit: 'seconds', range: '10-300' },
      }),
    },
    {
      name: '2G GSM Retransmission Optimization', technology: '2G', category: 'radio', vendor: 'Ericsson', isDefault: false, applyCount: 8, lastApplied: subHours(now, 72),
      description: 'Optimizes GSM retransmission parameters for improved voice quality and throughput.',
      parameters: JSON.stringify({
        maxRetrans: { value: '4', unit: 'count', range: '1-7' },
        t3101: { value: '8', unit: 'seconds', range: '4-20' },
        ny1: { value: '10', unit: 'count', range: '4-32' },
        rlTimeout: { value: '16', unit: 'seconds', range: '4-64' },
      }),
    },
    {
      name: '3G HSPA Power Control', technology: '3G', category: 'radio', vendor: 'Nokia', isDefault: false, applyCount: 12, lastApplied: subHours(now, 60),
      description: 'HSPA uplink/downlink power control optimization for WCDMA coverage.',
      parameters: JSON.stringify({
        targetSIR: { value: '4.5', unit: 'dB', range: '0-12' },
        powerStep: { value: '1', unit: 'dB', range: '0.5-3' },
        maxUlpower: { value: '24', unit: 'dBm', range: '10-24' },
        dpchPowerOffset: { value: '-3', unit: 'dB', range: '-6 to 0' },
      }),
    },
    {
      name: 'Neighbor List Management', technology: 'ALL', category: 'neighbor', vendor: '', isDefault: true, applyCount: 90, lastApplied: subHours(now, 1),
      description: 'Automated neighbor list management with ANR-assisted optimization thresholds.',
      parameters: JSON.stringify({
        maxNeighbors: { value: '32', unit: 'count', range: '16-64' },
        anrRemoveThreshold: { value: '3', unit: 'days', range: '1-14' },
        hoSuccessThreshold: { value: '90', unit: '%', range: '80-99' },
        nclUpdateInterval: { value: '60', unit: 'minutes', range: '10-360' },
      }),
    },
  ];

  await db.configTemplate.createMany({ data: configTemplates });
  console.log(`  ConfigTemplates: ${configTemplates.length}`);

  // ================================================================
  // PHASE C: ADVANCED OPERATIONS & OPTIMIZATION SEED DATA
  // ================================================================
  console.log('\n--- Seeding Phase C: Advanced Operations & Optimization ---');

  // Re-fetch all sites for Phase C
  const phaseCSites = await db.networkSite.findMany();
  const pc4G = phaseCSites.filter(s => s.technology === '4G');
  const pc5G = phaseCSites.filter(s => s.technology === '5G');
  const pc3G = phaseCSites.filter(s => s.technology === '3G');
  const pc2G = phaseCSites.filter(s => s.technology === '2G');

  // ------------------------------------------------------------------
  // 1. HealthScore (1 per site = 34 records)
  // ------------------------------------------------------------------
  console.log('Seeding HealthScores...');

  const issuePool = [
    'Low RSRP', 'High PRB utilization', 'Poor SINR', 'High latency',
    'Coverage gap detected', 'Handover failure spike', 'Capacity approaching limit',
    'Interference detected', 'Power instability', 'Throughput degradation',
    'High drop rate', 'Neighbor missing',
  ];

  function computeGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    if (score >= 35) return 'D';
    return 'F';
  }

  function pickTrend(): string {
    const r = Math.random();
    return r < 0.2 ? 'improving' : r < 0.8 ? 'stable' : 'degrading';
  }

  function pickIssues(): string {
    const count = randInt(0, 3);
    const picked: string[] = [];
    const pool = [...issuePool];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = randInt(0, pool.length - 1);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return JSON.stringify(picked);
  }

  const healthScoresData: any[] = [];
  for (const site of phaseCSites) {
    const coverageScore = Number(rand(50, 98).toFixed(1));
    const capacityScore = Number(rand(50, 98).toFixed(1));
    const qualityScore = Number(rand(50, 98).toFixed(1));
    const reliabilityScore = Number(rand(50, 98).toFixed(1));
    const experienceScore = Number(rand(50, 98).toFixed(1));
    const overallScore = Number((coverageScore * 0.25 + capacityScore * 0.2 + qualityScore * 0.25 + reliabilityScore * 0.2 + experienceScore * 0.1).toFixed(1));
    healthScoresData.push({
      siteId: site.id,
      technology: site.technology,
      region: site.region,
      overallScore,
      coverageScore,
      capacityScore,
      qualityScore,
      reliabilityScore,
      experienceScore,
      grade: computeGrade(overallScore),
      trend: pickTrend(),
      issues: pickIssues(),
      timestamp: subHours(now, randInt(0, 6)),
    });
  }
  await db.healthScore.createMany({ data: healthScoresData });
  console.log(`  HealthScores: ${healthScoresData.length}`);

  // ------------------------------------------------------------------
  // 2. BenchmarkRecord (~80 records, 2-3 per site for key metrics)
  // ------------------------------------------------------------------
  console.log('Seeding BenchmarkRecords...');

  const benchmarkMetrics = [
    { metric: 'rsrp', benchmark: -85, target: -82, techs: ['4G', '5G'] },
    { metric: 'downloadThroughput', benchmark: 50, target: 55, techs: ['4G'] },
    { metric: 'downloadThroughput', benchmark: 150, target: 170, techs: ['5G'] },
    { metric: 'latency', benchmark: 20, target: 18, techs: ['4G'] },
    { metric: 'latency', benchmark: 8, target: 7, techs: ['5G'] },
    { metric: 'availability', benchmark: 99.5, target: 99.9, techs: ['4G', '5G', '3G', '2G'] },
  ];

  const benchmarkData: any[] = [];
  for (const site of phaseCSites) {
    const applicableMetrics = benchmarkMetrics.filter(m => m.techs.includes(site.technology));
    const selectedMetrics = applicableMetrics.slice(0, randInt(2, 3));
    for (const bm of selectedMetrics) {
      const variation = 1 + (rand(-0.15, 0.15));
      // For rsrp and latency, lower actual is worse; for throughput and availability, lower is also worse
      // We apply variation differently based on metric sign
      let actualValue: number;
      if (bm.metric === 'rsrp' || bm.metric === 'latency') {
        // Negative metrics: higher abs value is worse. variation > 1 means worse
        actualValue = Number((bm.benchmark * (2 - variation)).toFixed(2)); // invert so variation>1 makes it worse
      } else {
        actualValue = Number((bm.benchmark * variation).toFixed(2));
      }
      const gap = Number((bm.benchmark - actualValue).toFixed(2));

      let status: string;
      if (bm.metric === 'rsrp' || bm.metric === 'latency') {
        // For negative metrics: gap < 0 means better than benchmark
        status = gap < -2 ? 'exceeding' : gap < 2 ? 'on_track' : gap < 8 ? 'below_target' : 'critical';
      } else {
        status = gap < -2 ? 'exceeding' : gap < 2 ? 'on_track' : gap < 8 ? 'below_target' : 'critical';
      }

      const percentileRank = Number(rand(20, 95).toFixed(1));
      benchmarkData.push({
        siteId: site.id,
        technology: site.technology,
        region: site.region,
        metric: bm.metric,
        actualValue,
        benchmarkValue: bm.benchmark,
        targetValue: bm.target,
        percentileRank,
        gap,
        status,
        timestamp: subHours(now, randInt(1, 24)),
      });
    }
  }
  await db.benchmarkRecord.createMany({ data: benchmarkData });
  console.log(`  BenchmarkRecords: ${benchmarkData.length}`);

  // ------------------------------------------------------------------
  // 3. HandoverKpi (60 records for 4G/5G sites with neighbors)
  // ------------------------------------------------------------------
  console.log('Seeding HandoverKpis...');

  const hoSites = [...pc4G, ...pc5G]; // 10 + 6 = 16 sites
  const relationTypes = ['intra_freq', 'inter_freq', 'inter_tech'];
  const hoStatuses: [string, number][] = [['normal', 0.7], ['degraded', 0.2], ['critical', 0.1]];

  function pickHoStatus(): string {
    const r = Math.random();
    let cumulative = 0;
    for (const [status, prob] of hoStatuses) {
      cumulative += prob;
      if (r < cumulative) return status;
    }
    return 'normal';
  }

  function pickRelationType(): string {
    const r = Math.random();
    if (r < 0.5) return 'intra_freq';
    if (r < 0.8) return 'inter_freq';
    return 'inter_tech';
  }

  const handoverData: any[] = [];
  // Distribute 60 records across 4G/5G sites (~3-4 per site)
  let hoIdx = 0;
  for (const site of hoSites) {
    const numRecords = randInt(3, 4);
    for (let j = 0; j < numRecords && hoIdx < 60; j++) {
      const hoAttempts = randInt(100, 5000);
      const hoStatus = pickHoStatus();
      let hoSuccessRate: number;
      if (hoStatus === 'normal') hoSuccessRate = rand(95, 99.5);
      else if (hoStatus === 'degraded') hoSuccessRate = rand(88, 95);
      else hoSuccessRate = rand(85, 88);
      const hoSuccess = Math.floor(hoAttempts * hoSuccessRate / 100);

      const otherSites = hoSites.filter(s => s.id !== site.id);
      const neighbor = pick(otherSites);
      const relType = pickRelationType();

      const avgPrepTime = Number(rand(10, 50).toFixed(1));
      const avgExecTime = Number(rand(5, 30).toFixed(1));

      let recommendation = '';
      if (hoStatus === 'degraded') recommendation = 'Review handover parameters and neighbor cell configuration. Consider adjusting hysteresis and time-to-trigger.';
      if (hoStatus === 'critical') recommendation = 'Immediate action required: Check for PCI conflicts, adjust power levels, and verify neighbor relations. Escalate to RF engineering.';

      handoverData.push({
        servingCellId: site.id,
        neighborCellName: neighbor.name,
        neighborCellCode: neighbor.code,
        technology: site.technology,
        relationType: relType,
        hoAttempts,
        hoSuccess,
        hoFailures: hoAttempts - hoSuccess,
        hoSuccessRate: Number(hoSuccessRate.toFixed(2)),
        avgPrepTime,
        avgExecTime,
        pingPongCount: hoStatus === 'critical' ? randInt(10, 20) : hoStatus === 'degraded' ? randInt(3, 10) : randInt(0, 3),
        tooEarlyCount: randInt(0, hoStatus === 'degraded' ? 12 : 5),
        tooLateCount: randInt(0, hoStatus === 'degraded' ? 15 : 5),
        status: hoStatus,
        recommendation,
        timestamp: subHours(now, randInt(1, 48)),
      });
      hoIdx++;
    }
  }
  await db.handoverKpi.createMany({ data: handoverData });
  console.log(`  HandoverKpis: ${handoverData.length}`);

  // ------------------------------------------------------------------
  // 4. CellLoad (1 per site = 34 records)
  // ------------------------------------------------------------------
  console.log('Seeding CellLoads...');

  const cellLoadData: any[] = [];
  for (const site of phaseCSites) {
    const prbUtilDownlink = Number(rand(20, 95).toFixed(1));
    const prbUtilUplink = Number(rand(15, 80).toFixed(1));
    const activeUsers = randInt(10, site.maxCapacity - 5);
    const maxUsers = site.maxCapacity;
    const userLoadPct = Number((activeUsers / maxUsers * 100).toFixed(1));
    const throughputDown = Number(rand(20, 200).toFixed(1));
    const throughputUp = Number(rand(5, 50).toFixed(1));
    const balancedScore = Number(rand(30, 95).toFixed(1));

    let congestionLevel: string;
    const avgPrb = (prbUtilDownlink + prbUtilUplink) / 2;
    if (avgPrb < 50) congestionLevel = 'low';
    else if (avgPrb < 75) congestionLevel = 'medium';
    else if (avgPrb < 90) congestionLevel = 'high';
    else congestionLevel = 'congested';

    let recommendation = '';
    if (congestionLevel === 'high') {
      recommendation = 'Consider enabling carrier aggregation or load balancing to offload traffic to neighboring cells. Monitor PRB utilization closely during peak hours.';
    } else if (congestionLevel === 'congested') {
      recommendation = 'Critical: Cell is congested. Immediate capacity expansion required. Evaluate small cell deployment, additional carrier activation, and traffic offloading strategies.';
    }

    cellLoadData.push({
      siteId: site.id,
      technology: site.technology,
      region: site.region,
      prbUtilDownlink,
      prbUtilUplink,
      activeUsers,
      maxUsers,
      userLoadPct,
      throughputDown,
      throughputUp,
      balancedScore,
      congestionLevel,
      recommendation,
      timestamp: subHours(now, randInt(0, 6)),
    });
  }
  await db.cellLoad.createMany({ data: cellLoadData });
  console.log(`  CellLoads: ${cellLoadData.length}`);

  // ------------------------------------------------------------------
  // 5. InterferenceEvent (25 records)
  // ------------------------------------------------------------------
  console.log('Seeding InterferenceEvents...');

  const interferenceTypes: [string, number][] = [
    ['pci_conflict', 0.40], ['co_channel', 0.30], ['adjacent_channel', 0.15],
    ['external', 0.10], ['inter_modulation', 0.05],
  ];
  const interferenceSeverities: [string, number][] = [
    ['low', 0.25], ['medium', 0.40], ['high', 0.25], ['critical', 0.10],
  ];
  const interferenceStatuses: [string, number][] = [
    ['detected', 0.20], ['investigating', 0.20], ['mitigating', 0.15],
    ['resolved', 0.30], ['false_positive', 0.15],
  ];

  function pickByWeight<T>(items: [T, number][]): T {
    const r = Math.random();
    let cumulative = 0;
    for (const [item, weight] of items) {
      cumulative += weight;
      if (r < cumulative) return item;
    }
    return items[0][0];
  }

  const interferenceData: any[] = [];
  for (let i = 0; i < 25; i++) {
    const site = pick(phaseCSites);
    const otherSite = pick(phaseCSites.filter(s => s.id !== site.id));
    const intType = pickByWeight<string>(interferenceTypes) as string;
    const severity = pickByWeight<string>(interferenceSeverities) as string;
    const status = pickByWeight<string>(interferenceStatuses) as string;

    const affectedKpis = ['RSRP', 'SINR', 'Throughput', 'Drop Rate'];
    const numKpis = randInt(1, 3);
    const kpis = affectedKpis.sort(() => Math.random() - 0.5).slice(0, numKpis);

    const impactScore = severity === 'critical' ? Number(rand(7, 10).toFixed(1))
      : severity === 'high' ? Number(rand(5, 7).toFixed(1))
      : severity === 'medium' ? Number(rand(3, 5).toFixed(1))
      : Number(rand(1, 3).toFixed(1));

    let recommendation = '';
    if (intType === 'pci_conflict') recommendation = 'Reassign PCI to eliminate conflict. Use PCI planning tool to verify no collision with neighboring cells.';
    else if (intType === 'co_channel') recommendation = 'Adjust frequency allocation or enable ICIC/FFR to mitigate co-channel interference.';
    else if (intType === 'adjacent_channel') recommendation = 'Review guard band settings and filter configurations. Check for misaligned frequency assignments.';
    else if (intType === 'external') recommendation = 'Identify external interference source. Perform drive test and spectrum analysis. Coordinate with spectrum management.';
    else recommendation = 'Investigate inter-modulation products. Check for faulty RF components or non-linear amplifier behavior.';

    interferenceData.push({
      siteId: site.id,
      technology: site.technology,
      interferenceType: intType,
      severity,
      status,
      sourceCell: site.code,
      sourceCellName: site.name,
      conflictingCell: otherSite.code,
      conflictingCellName: otherSite.name,
      frequency: site.frequency,
      pci: randInt(0, 503).toString(),
      affectedKpis: JSON.stringify(kpis),
      impactScore,
      recommendation,
      resolvedAt: status === 'resolved' ? subHours(now, randInt(1, 48)) : null,
      createdAt: subHours(now, randInt(1, 168)),
    });
  }
  await db.interferenceEvent.createMany({ data: interferenceData });
  console.log(`  InterferenceEvents: ${interferenceData.length}`);

  // ------------------------------------------------------------------
  // 6. CoverageHole (20 records)
  // ------------------------------------------------------------------
  console.log('Seeding CoverageHoles...');

  const covTechs = ['2G', '3G', '4G', '5G'];
  const covRegions = ['Alger Centre', 'Oran Métropole', 'Constantine', 'Annaba', 'Sétif', 'Blida', 'Tlemcen', 'Tizi Ouzou'];

  const coverageHoleData: any[] = [];
  for (let i = 0; i < 20; i++) {
    const tech = covTechs[i % 4];
    const region = covRegions[i % covRegions.length];
    const signalStrength = Number(rand(-110, -95).toFixed(1));
    const expectedSignal = Number(rand(-85, -75).toFixed(1));
    const gapDb = Number((expectedSignal - signalStrength).toFixed(1));
    const affectedUsers = randInt(50, 5000);
    const areaKm2 = Number(rand(0.1, 2.5).toFixed(2));
    const radiusMeters = Number(rand(200, 1500).toFixed(0));

    let severity: string;
    if (gapDb >= 20 && affectedUsers > 2000) severity = 'critical';
    else if (gapDb >= 15 || affectedUsers > 3000) severity = 'high';
    else if (gapDb >= 10) severity = 'medium';
    else severity = 'low';

    // Pick nearest site of same tech
    const techSites = phaseCSites.filter(s => s.technology === tech);
    const nearestSite = techSites.length > 0 ? pick(techSites) : pick(phaseCSites);

    let recommendation = '';
    if (severity === 'critical') recommendation = 'Deploy small cell or repeater immediately. Consider temporary COW (Cell on Wheels) for rapid coverage restoration.';
    else if (severity === 'high') recommendation = 'Optimize antenna tilt and azimuth. Evaluate new site acquisition for permanent coverage improvement.';
    else recommendation = 'Fine-tune existing site parameters. Consider power adjustment and antenna optimization.';

    coverageHoleData.push({
      technology: tech,
      region,
      latitude: nearestSite.latitude + rand(-0.02, 0.02),
      longitude: nearestSite.longitude + rand(-0.02, 0.02),
      radiusMeters: Number(radiusMeters),
      areaKm2,
      signalStrength,
      expectedSignal,
      gapDb,
      severity,
      nearestSite: nearestSite.id,
      nearestSiteName: nearestSite.name,
      nearestSiteDistKm: Number(rand(0.3, 3.0).toFixed(1)),
      affectedUsers,
      recommendation,
      status: Math.random() > 0.3 ? 'open' : 'investigating',
    });
  }
  await db.coverageHole.createMany({ data: coverageHoleData });
  console.log(`  CoverageHoles: ${coverageHoleData.length}`);

  // ------------------------------------------------------------------
  // 7. ChangeRequest (25 records)
  // ------------------------------------------------------------------
  console.log('Seeding ChangeRequests...');

  const crCategories: [string, number][] = [
    ['radio', 0.40], ['power', 0.20], ['neighbor', 0.15],
    ['handover', 0.10], ['capacity', 0.10], ['software', 0.05],
  ];
  const crStatuses = ['pending', 'pending', 'pending', 'pending', 'approved', 'approved', 'approved', 'implemented', 'implemented', 'implemented', 'implemented', 'implemented', 'implemented', 'implemented', 'implemented', 'implemented', 'implemented', 'implemented', 'implemented', 'rolled_back', 'rolled_back', 'rolled_back', 'rejected', 'rejected', 'rejected'];
  const crRiskLevels: [string, number][] = [['low', 0.50], ['medium', 0.30], ['high', 0.20]];

  const crParams: Record<string, string[]> = {
    radio: ['antennaTilt', 'antennaAzimuth', 'rsPower', 'pdschPower', 'ssbPower'],
    power: ['maxTxPower', 'referenceSignalPower', 'pA', 'pB'],
    neighbor: ['neighborList', 'blacklistCell', 'cellIndividualOffset'],
    handover: ['hysteresis', 'timeToTrigger', 'a3Offset', 'sIntraSearch'],
    capacity: ['carrierActivation', 'bandwidth', 'carrierAggregation', 'loadBalancingThreshold'],
    software: ['firmwareVersion', 'featureToggle', 'algorithmVersion'],
  };

  const crReasons = [
    'SON-automated optimization based on KPI analysis.',
    'Engineer-initiated change following coverage complaint.',
    'Capacity planning threshold exceeded.',
    'Post-outage restoration and hardening.',
    'Interference mitigation after PCI conflict detection.',
    'Neighbor optimization driven by ANR module.',
    'Scheduled maintenance window parameter update.',
    'Power optimization for energy savings initiative.',
  ];

  const changeRequestData: any[] = [];
  for (let i = 0; i < 25; i++) {
    const category = pickByWeight<string>(crCategories) as string;
    const site = pick(phaseCSites);
    const params = crParams[category];
    const param = pick(params);
    const status = crStatuses[i];
    const riskLevel = pickByWeight<string>(crRiskLevels) as string;

    const previousValue = param.includes('Power') || param === 'pA' || param === 'pB'
      ? rand(10, 20).toFixed(1)
      : param.includes('Tilt') ? rand(2, 8).toFixed(0) + '°'
      : param.includes('Azimuth') ? rand(0, 359).toFixed(0) + '°'
      : param.includes('List') ? JSON.stringify(['cell1', 'cell2'])
      : param.includes('Trigger') ? randInt(64, 640).toString()
      : param.includes('hysteresis') || param.includes('Offset') ? rand(1, 6).toFixed(1)
      : param.includes('Version') ? 'v4.2.1'
      : rand(0, 100).toFixed(0);

    const proposedValue = param.includes('Power') || param === 'pA' || param === 'pB'
      ? (Number(previousValue) + rand(-3, 3)).toFixed(1)
      : param.includes('Tilt') ? (Number(previousValue) + rand(-2, 2)).toFixed(0) + '°'
      : param.includes('Azimuth') ? ((Number(previousValue) + randInt(-30, 30) + 360) % 360).toFixed(0) + '°'
      : param.includes('List') ? JSON.stringify(['cell1', 'cell2', 'cell3'])
      : param.includes('Trigger') ? randInt(64, 640).toString()
      : param.includes('hysteresis') || param.includes('Offset') ? (Number(previousValue) + rand(-1, 1)).toFixed(1)
      : param.includes('Version') ? 'v4.3.0'
      : rand(0, 100).toFixed(0);

    changeRequestData.push({
      title: `${category.charAt(0).toUpperCase() + category.slice(1)}: ${param} adjustment for ${site.name}`,
      technology: site.technology,
      siteId: site.id,
      siteName: site.name,
      category,
      parameter: param,
      previousValue,
      proposedValue,
      reason: pick(crReasons),
      impact: `Expected ${riskLevel} impact on ${site.technology} coverage and performance in ${site.region}.`,
      riskLevel,
      status,
      requestedBy: Math.random() > 0.5 ? 'system' : pick(['engineer_ade', 'engineer_chi', 'engineer_kunle', 'engineer_bola']),
      approvedBy: ['approved', 'implemented', 'rolled_back'].includes(status) ? pick(['tech_lead_a', 'tech_lead_b', 'noc_supervisor']) : null,
      implementedAt: status === 'implemented' ? subHours(now, randInt(1, 120)) : status === 'rolled_back' ? subHours(now, randInt(1, 120)) : null,
      rollbackReason: status === 'rolled_back' ? 'KPI degradation observed post-implementation. Throughput dropped below acceptable threshold.' : null,
      kpiImpact: JSON.stringify({ rsrpChange: rand(-3, 5).toFixed(1), throughputChange: rand(-5, 10).toFixed(1), availabilityChange: rand(-0.5, 0.3).toFixed(2) }),
    });
  }
  await db.changeRequest.createMany({ data: changeRequestData });
  console.log(`  ChangeRequests: ${changeRequestData.length}`);

  // ------------------------------------------------------------------
  // 8. OutageEvent (15 records)
  // ------------------------------------------------------------------
  console.log('Seeding OutageEvents...');

  const outageTypes: [string, number][] = [['partial', 0.50], ['full', 0.30], ['degradation', 0.20]];
  const outageSeverities: [string, number][] = [['critical', 0.20], ['high', 0.33], ['medium', 0.33], ['low', 0.14]];
  const outageStatuses = ['active', 'active', 'compensating', 'compensating', 'restored', 'restored', 'restored', 'restored', 'resolved', 'resolved', 'resolved', 'resolved', 'resolved', 'resolved', 'resolved'];
  const compensationTypes: [string, number][] = [['none', 0.40], ['neighbor_boost', 0.30], ['traffic_reroute', 0.20], ['power_increase', 0.10]];

  const rootCauses = [
    'Fiber cut due to road construction',
    'Power supply failure - battery depleted',
    'Hardware fault in RRU unit',
    'Software crash after firmware upgrade',
    'Transport link failure',
    'Lightning strike damaging antenna system',
    'Vandalism - cable theft',
    'BBU overheating and auto-shutdown',
  ];

  const outageData: any[] = [];
  for (let i = 0; i < 15; i++) {
    const site = pick(phaseCSites);
    const outageType = pickByWeight<string>(outageTypes) as string;
    const severity = pickByWeight<string>(outageSeverities) as string;
    const status = outageStatuses[i];
    const compensation = pickByWeight<string>(compensationTypes) as string;
    const startedAt = subHours(now, randInt(1, 72));
    const affectedUsers = randInt(50, 5000);

    const actualDuration = ['resolved', 'restored'].includes(status) ? randInt(30, 480) : null;

    const compensationSites = compensation !== 'none'
      ? JSON.stringify(phaseCSites.filter(s => s.id !== site.id).slice(0, randInt(1, 3)).map(s => s.id))
      : JSON.stringify([]);

    outageData.push({
      siteId: site.id,
      technology: site.technology,
      region: site.region,
      outageType,
      severity,
      status,
      startedAt,
      detectedAt: new Date(startedAt.getTime() + randInt(1, 15) * 60000),
      estimatedDuration: status === 'active' ? randInt(30, 240) + 'min' : null,
      actualDuration,
      affectedUsers,
      rootCause: ['resolved', 'restored', 'compensating'].includes(status) ? pick(rootCauses) : null,
      compensationApplied: compensation,
      compensationSites,
      resolvedAt: actualDuration ? new Date(startedAt.getTime() + actualDuration * 60000) : null,
    });
  }
  await db.outageEvent.createMany({ data: outageData });
  console.log(`  OutageEvents: ${outageData.length}`);

  // ------------------------------------------------------------------
  // 9. Playbook + PlaybookStep (12 playbooks, 3-6 steps each)
  // ------------------------------------------------------------------
  console.log('Seeding Playbooks & PlaybookSteps...');

  const playbookDefs = [
    {
      name: 'Coverage Hole Remediation', category: 'coverage', technology: 'ALL',
      description: 'Systematic approach to identify, analyze, and resolve coverage gaps across all technologies.',
      severity: 'high', estimatedTime: '2h', tags: ['coverage', 'optimization', 'rf'],
      steps: [
        { title: 'Verify Coverage Hole', description: 'Confirm the coverage hole using drive test data, network metrics, and user complaint correlation.', action: 'check_kpi', target: 'RSRP > -100dBm', expectedOutcome: 'Coverage hole confirmed with geolocation and signal measurements.' },
        { title: 'Analyze Root Cause', description: 'Determine if the gap is due to terrain, equipment, or parameter issues. Review antenna patterns and site configuration.', action: 'verify', target: 'Antenna tilt, azimuth, power', expectedOutcome: 'Root cause identified with recommended corrective action.' },
        { title: 'Adjust Antenna Parameters', description: 'Modify antenna tilt and/or azimuth to extend coverage toward the gap area. Use prediction tool to verify.', action: 'modify_param', target: 'electricalTilt, mechanicalTilt', expectedOutcome: 'Antenna parameters updated; predicted coverage improvement > 5dB in target area.' },
        { title: 'Verify Improvement', description: 'Check KPIs after parameter change to confirm coverage improvement in the affected area.', action: 'check_kpi', target: 'RSRP, RSRQ in coverage area', expectedOutcome: 'Coverage improved by at least 5dB; user complaints reduced.' },
        { title: 'Escalate if Insufficient', description: 'If parameter changes are insufficient, escalate for new site acquisition or small cell deployment.', action: 'escalate', target: 'RF Planning Team', expectedOutcome: 'New site request submitted with business case and coverage analysis.' },
      ],
    },
    {
      name: 'Handover Failure Resolution', category: 'handover', technology: '4G',
      description: 'Diagnose and fix handover failures in LTE networks, focusing on parameter optimization and neighbor verification.',
      severity: 'medium', estimatedTime: '1h', tags: ['handover', 'mobility', '4g'],
      steps: [
        { title: 'Collect Handover KPIs', description: 'Gather handover success rate, preparation time, execution time, and failure causes for the affected cell pair.', action: 'check_kpi', target: 'HOSR > 95%', expectedOutcome: 'Current handover KPIs documented with failure pattern analysis.' },
        { title: 'Verify Neighbor Configuration', description: 'Check that the serving and target cells have proper neighbor relationship defined. Verify no missing neighbors.', action: 'verify', target: 'Neighbor list, ANR status', expectedOutcome: 'Neighbor relation confirmed; missing neighbors identified and added.' },
        { title: 'Optimize Handover Parameters', description: 'Adjust hysteresis, time-to-trigger, and cell offset parameters based on analysis.', action: 'modify_param', target: 'hysteresis, a3Offset, timeToTrigger', expectedOutcome: 'Parameters adjusted to balance handover trigger timing.' },
        { title: 'Run SON Compensation', description: 'Execute SON handover optimization module to fine-tune parameters across the cluster.', action: 'run_command', target: 'SON MLB module', expectedOutcome: 'SON module executed; new parameters applied to cluster.' },
      ],
    },
    {
      name: 'Interference Detection & Mitigation', category: 'interference', technology: '4G',
      description: 'Identify and resolve interference issues including PCI conflicts, co-channel, and external interference sources.',
      severity: 'high', estimatedTime: '3h', tags: ['interference', 'pci', 'optimization'],
      steps: [
        { title: 'Detect Interference Source', description: 'Analyze RSRP/SINR correlation, uplink interference metrics, and spectrum analyzer data to identify interference type and source.', action: 'check_kpi', target: 'SINR > 0dB, UL interference < -110dBm', expectedOutcome: 'Interference type and source cell identified.' },
        { title: 'Resolve PCI Conflict', description: 'If PCI conflict detected, reassign PCI using PCI planning tool. Ensure no collision or confusion with any neighbor.', action: 'modify_param', target: 'PCI assignment', expectedOutcome: 'PCI reassigned with no conflicts within 2-hop neighbor radius.' },
        { title: 'Adjust Power Levels', description: 'Reduce transmit power on interfering cell or increase power on victim cell to improve SINR.', action: 'modify_param', target: 'rsPower, pdschPower', expectedOutcome: 'SINR improved by >3dB at cell edge.' },
        { title: 'Enable ICIC/FFR', description: 'Activate Inter-Cell Interference Coordination or Frequency Reuse to mitigate persistent co-channel interference.', action: 'run_command', target: 'ICIC configuration', expectedOutcome: 'ICIC enabled; cell-edge throughput improved.' },
        { title: 'Verify Resolution', description: 'Monitor interference metrics for 24 hours to confirm resolution. Check that no new issues were introduced.', action: 'verify', target: 'SINR, throughput, drop rate', expectedOutcome: 'Interference resolved; KPIs stable for 24 hours.' },
      ],
    },
    {
      name: 'Capacity Expansion', category: 'capacity', technology: '5G',
      description: 'Handle capacity congestion on 5G NR cells through carrier activation, load balancing, and resource optimization.',
      severity: 'critical', estimatedTime: '4h', tags: ['capacity', '5g', 'congestion'],
      steps: [
        { title: 'Assess Current Load', description: 'Evaluate PRB utilization, active users, and throughput demand. Determine if congestion is peak-time or persistent.', action: 'check_kpi', target: 'PRB util < 80%, user load < 70%', expectedOutcome: 'Load assessment complete with congestion pattern identified.' },
        { title: 'Activate Additional Carrier', description: 'If spare carrier available, activate additional component carrier to increase capacity.', action: 'modify_param', target: 'SCell activation, carrierAggregation', expectedOutcome: 'Additional carrier activated; capacity increased by ~100%.' },
        { title: 'Configure Load Balancing', description: 'Set up inter-frequency and inter-cell load balancing to distribute traffic evenly across available resources.', action: 'modify_param', target: 'loadBalancingThreshold, frequencyPriority', expectedOutcome: 'Load balancing configured; traffic distributed across cells.' },
        { title: 'Verify Capacity Relief', description: 'Monitor PRB utilization and user experience metrics after capacity expansion.', action: 'check_kpi', target: 'PRB util, throughput per user', expectedOutcome: 'PRB utilization reduced below 70%; per-user throughput improved.' },
      ],
    },
    {
      name: 'Power Optimization', category: 'power', technology: 'ALL',
      description: 'Optimize cell power settings to balance coverage, capacity, and energy consumption.',
      severity: 'low', estimatedTime: '30min', tags: ['power', 'energy', 'green'],
      steps: [
        { title: 'Analyze Coverage vs Power', description: 'Evaluate current coverage area against transmit power. Identify over-powered cells where coverage overlaps significantly with neighbors.', action: 'check_kpi', target: 'Coverage radius, neighbor overlap', expectedOutcome: 'Over-powered cells identified with recommended power reduction.' },
        { title: 'Adjust Reference Signal Power', description: 'Reduce RS power on identified cells while maintaining minimum coverage requirements.', action: 'modify_param', target: 'referenceSignalPower, rsPower', expectedOutcome: 'RS power reduced by 1-3dB; energy savings of 5-15%.' },
        { title: 'Verify Coverage Integrity', description: 'Confirm that coverage is maintained after power reduction. Check for new coverage holes.', action: 'verify', target: 'RSRP, coverage area', expectedOutcome: 'No coverage degradation; coverage overlap reduced.' },
      ],
    },
    {
      name: 'Hardware Fault Response', category: 'hardware', technology: 'ALL',
      description: 'Respond to hardware faults in RRU, BBU, or antenna systems with systematic diagnosis and resolution.',
      severity: 'critical', estimatedTime: '6h', tags: ['hardware', 'fault', 'maintenance'],
      steps: [
        { title: 'Identify Faulty Component', description: 'Analyze alarms, fault codes, and performance degradation to pinpoint the faulty component (RRU, BBU, PSU, antenna, fiber).', action: 'check_kpi', target: 'Hardware alarms, error counters', expectedOutcome: 'Faulty component identified with part number and location.' },
        { title: 'Activate Backup/Redundancy', description: 'If redundancy available, switch to backup unit to restore service while planning repair.', action: 'run_command', target: 'Redundancy switch', expectedOutcome: 'Service restored via backup; traffic flowing normally.' },
        { title: 'Coordinate Field Dispatch', description: 'Create maintenance ticket and dispatch field technician with required spare parts.', action: 'escalate', target: 'Field Operations Team', expectedOutcome: 'Maintenance ticket created; technician dispatched within SLA.' },
        { title: 'Replace and Verify', description: 'After hardware replacement, verify all alarms cleared and KPIs returned to normal levels.', action: 'verify', target: 'Alarm status, KPI metrics', expectedOutcome: 'Hardware replaced; all alarms cleared; KPIs normal.' },
        { title: 'Update Fault Records', description: 'Document the fault, root cause, resolution, and any preventive measures for knowledge base.', action: 'check_kpi', target: 'MTBF tracking', expectedOutcome: 'Fault record updated; preventive maintenance schedule adjusted.' },
      ],
    },
    {
      name: '5G NR Coverage Optimization', category: 'coverage', technology: '5G',
      description: 'Optimize 5G NR coverage through SSB beam management, power control, and beamforming adjustments.',
      severity: 'high', estimatedTime: '2h', tags: ['5g', 'coverage', 'beamforming'],
      steps: [
        { title: 'Assess 5G Coverage Footprint', description: 'Evaluate current 5G coverage area, beam configuration, and SSB RSRP distribution across the cell.', action: 'check_kpi', target: 'SSB RSRP > -100dBm, beam coverage', expectedOutcome: 'Coverage footprint documented with beam-level analysis.' },
        { title: 'Optimize SSB Power', description: 'Adjust SSB transmit power to improve coverage while avoiding excessive interference to neighboring gNBs.', action: 'modify_param', target: 'ssbPower, ss-PBCH-BlockPower', expectedOutcome: 'SSB power optimized; coverage extended by 10-15%.' },
        { title: 'Configure Beam Sweeping', description: 'Review and adjust beam sweeping configuration for optimal horizontal and vertical coverage.', action: 'modify_param', target: 'ssb-PeriodicityServingCell, beamCount', expectedOutcome: 'Beam configuration optimized for coverage area.' },
        { title: 'Verify Beam Performance', description: 'Confirm beam-level KPIs meet targets across the coverage area.', action: 'verify', target: 'Beam-level RSRP, SINR', expectedOutcome: 'All beams meeting coverage targets.' },
      ],
    },
    {
      name: 'Emergency Outage Response', category: 'hardware', technology: 'ALL',
      description: 'Rapid response procedure for full or partial outages to minimize downtime and user impact.',
      severity: 'critical', estimatedTime: '1h', tags: ['outage', 'emergency', 'sla'],
      steps: [
        { title: 'Activate Neighbor Compensation', description: 'Immediately boost power on neighboring cells to compensate for the outage area.', action: 'run_command', target: 'CODC power boost on neighbors', expectedOutcome: 'Neighboring cells boosting power; coverage gap reduced.' },
        { title: 'Reroute Traffic', description: 'Activate traffic rerouting to ensure users are handed over to healthy neighboring cells.', action: 'run_command', target: 'Traffic reroute, load balancing', expectedOutcome: 'Traffic successfully rerouted; users connected to neighbor cells.' },
        { title: 'Diagnose Root Cause', description: 'Perform remote diagnostics to identify the cause: power failure, fiber cut, hardware fault, or software issue.', action: 'check_kpi', target: 'System logs, hardware status', expectedOutcome: 'Root cause identified with estimated time to repair.' },
        { title: 'Escalate to Field Team', description: 'If remote resolution not possible, dispatch field team with appropriate equipment.', action: 'escalate', target: 'NOC + Field Operations', expectedOutcome: 'Field team dispatched; SLA clock tracked.' },
        { title: 'Verify Service Restoration', description: 'After repair, verify all services are restored and KPIs are back to normal before standing down.', action: 'verify', target: 'All KPIs, user connectivity', expectedOutcome: 'Full service restored; all KPIs within normal range.' },
      ],
    },
    {
      name: 'Neighbor List Optimization', category: 'neighbor', technology: '4G',
      description: 'Comprehensive neighbor list cleanup and optimization using ANR data and drive test results.',
      severity: 'medium', estimatedTime: '1.5h', tags: ['neighbor', 'anr', '4g'],
      steps: [
        { title: 'Audit Current Neighbor List', description: 'Review existing neighbor relations, identify missing neighbors, and detect ghost/invalid entries.', action: 'check_kpi', target: 'Neighbor list completeness', expectedOutcome: 'Neighbor audit complete; missing and invalid entries documented.' },
        { title: 'Add Missing Neighbors', description: 'Use ANR and geolocation data to add missing neighbor relations that should exist based on proximity and signal strength.', action: 'modify_param', target: 'Neighbor list additions', expectedOutcome: 'All valid missing neighbors added to configuration.' },
        { title: 'Remove Invalid Entries', description: 'Remove ghost neighbors, decommissioned cells, and entries with persistently low handover success rates.', action: 'modify_param', target: 'Neighbor list removals', expectedOutcome: 'Invalid entries removed; neighbor list optimized.' },
        { title: 'Verify Handover Performance', description: 'Monitor handover success rate for all neighbor pairs to confirm optimization was effective.', action: 'verify', target: 'HOSR > 95% for all pairs', expectedOutcome: 'Handover performance verified; no degradation observed.' },
      ],
    },
    {
      name: 'Inter-Technology Handover Fix', category: 'handover', technology: 'ALL',
      description: 'Resolve handover issues between different technology layers (4G-5G, 4G-3G, 3G-2G).',
      severity: 'medium', estimatedTime: '1.5h', tags: ['handover', 'inter-tech', 'irat'],
      steps: [
        { title: 'Identify IRAT Failure Points', description: 'Analyze inter-RAT handover success rates between technology pairs to find problematic cell combinations.', action: 'check_kpi', target: 'IRAT HOSR, redirection rate', expectedOutcome: 'Failing IRAT handover pairs identified.' },
        { title: 'Check Blind/Redirection Config', description: 'Verify blind handover and redirection thresholds between technology layers.', action: 'verify', target: 'Blind HO threshold, redirect threshold', expectedOutcome: 'IRAT threshold configuration verified and documented.' },
        { title: 'Optimize IRAT Parameters', description: 'Adjust inter-RAT handover parameters including threshold offsets and priorities.', action: 'modify_param', target: 'threshServingLow, priorityReselection', expectedOutcome: 'IRAT parameters optimized for smoother handovers.' },
        { title: 'Validate with Test Call', description: 'Perform drive test with test UE to verify inter-technology handover works correctly.', action: 'run_command', target: 'Drive test validation', expectedOutcome: 'Test calls successfully handed over between technologies.' },
      ],
    },
    {
      name: '3G WCDMA Optimization', category: 'coverage', technology: '3G',
      description: 'Optimize 3G WCDMA network performance including coverage, capacity, and handover parameters.',
      severity: 'medium', estimatedTime: '2h', tags: ['3g', 'wcdma', 'coverage'],
      steps: [
        { title: 'Review RSCP and Ec/No', description: 'Analyze RSCP and Ec/No levels to identify coverage and pilot pollution issues.', action: 'check_kpi', target: 'RSCP > -95dBm, Ec/No > -10dB', expectedOutcome: 'Coverage quality map produced with problem areas highlighted.' },
        { title: 'Optimize CPICH Power', description: 'Adjust Common Pilot Channel power to improve coverage while managing pilot pollution.', action: 'modify_param', target: 'primaryCPICHPower', expectedOutcome: 'CPICH power optimized; coverage improved without increasing pollution.' },
        { title: 'Tune Neighbor and Handover', description: 'Review and optimize 3G neighbor list and handover parameters for better mobility.', action: 'modify_param', target: 'Neighbor list, handover parameters', expectedOutcome: 'Handover success rate improved; dropped call rate reduced.' },
        { title: 'Monitor Call Performance', description: 'Track call setup success rate, drop rate, and voice quality after optimization.', action: 'verify', target: 'CSR > 98%, DCR < 1%', expectedOutcome: 'Call performance metrics within target range.' },
      ],
    },
    {
      name: '2G GSM Capacity Management', category: 'capacity', technology: '2G',
      description: 'Manage 2G GSM capacity through channel allocation, half-rate optimization, and traffic load balancing.',
      severity: 'low', estimatedTime: '1h', tags: ['2g', 'gsm', 'capacity'],
      steps: [
        { title: 'Analyze Traffic Load', description: 'Evaluate current Erlang load against available TCH channels. Identify congestion periods.', action: 'check_kpi', target: 'GOS < 2%, channel utilization', expectedOutcome: 'Traffic analysis complete; congestion periods identified.' },
        { title: 'Optimize Channel Allocation', description: 'Rebalance TRX allocation between BCCH and TCH based on current traffic patterns.', action: 'modify_param', target: 'TRX configuration, channel allocation', expectedOutcome: 'Channel allocation optimized; capacity increased by ~15%.' },
        { title: 'Enable Half-Rate', description: 'Enable half-rate vocoder during peak congestion periods to double available voice channels.', action: 'modify_param', target: 'Half-rate threshold', expectedOutcome: 'Half-rate activated during peak hours; blocking reduced.' },
        { title: 'Verify Voice Quality', description: 'Monitor voice quality metrics to ensure half-rate activation does not degrade user experience.', action: 'verify', target: 'Voice quality MOS > 3.5', expectedOutcome: 'Voice quality maintained within acceptable range.' },
      ],
    },
  ];

  const playbookCount = playbookDefs.length;
  let stepCount = 0;
  for (const pb of playbookDefs) {
    const playbook = await db.playbook.create({
      data: {
        name: pb.name,
        category: pb.category,
        technology: pb.technology,
        description: pb.description,
        severity: pb.severity,
        estimatedTime: pb.estimatedTime,
        tags: JSON.stringify(pb.tags),
        usageCount: randInt(0, 50),
        successRate: Number(rand(0.75, 0.98).toFixed(2)),
      },
    });

    for (let si = 0; si < pb.steps.length; si++) {
      const step = pb.steps[si];
      await db.playbookStep.create({
        data: {
          playbookId: playbook.id,
          stepNumber: si + 1,
          title: step.title,
          description: step.description,
          action: step.action,
          target: step.target,
          expectedOutcome: step.expectedOutcome,
          isBlocking: si < pb.steps.length - 1,
        },
      });
      stepCount++;
    }
  }
  console.log(`  Playbooks: ${playbookCount}, PlaybookSteps: ${stepCount}`);

  // ------------------------------------------------------------------
  // PHASE D: STRATEGIC INTELLIGENCE & DIFFERENTIATION
  // ------------------------------------------------------------------

  // 10. SimulationScenario (15 records)
  console.log('Seeding SimulationScenarios...');
  const phaseDSites = await db.networkSite.findMany();
  const simCategories = ['capacity', 'coverage', 'interference', 'migration', 'energy'];
  const simTechs = ['2G', '3G', '4G', '5G'];
  const simStatuses = ['draft', 'running', 'completed', 'failed'];
  const simulationData: any[] = [];
  for (let i = 0; i < 15; i++) {
    const tech = pick(simTechs);
    const cat = pick(simCategories);
    const site = pick(phaseDSites);
    const status = i < 10 ? 'completed' : i < 12 ? 'running' : i < 14 ? 'draft' : 'failed';
    simulationData.push({
      name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Sim ${i + 1}: ${pick(regions).split(' ')[0]}`,
      description: `What-if analysis for ${cat} optimization on ${tech} in ${pick(regions)}`,
      technology: tech,
      region: pick(regions),
      siteId: Math.random() > 0.3 ? site.id : null,
      category: cat,
      parameters: JSON.stringify({ scenarioType: cat, affectedCells: randInt(1, 20), duration: `${randInt(1, 30)}d` }),
      baselineKpis: JSON.stringify({ rsrp: rand(-100, -70), throughput: rand(10, 200), latency: rand(5, 80), availability: rand(98, 99.9) }),
      simulatedKpis: JSON.stringify({ rsrp: rand(-95, -65), throughput: rand(15, 250), latency: rand(3, 60), availability: rand(98.5, 99.99) }),
      impactScore: Number(rand(2, 35).toFixed(1)),
      recommendation: `Apply ${cat} optimization with estimated ${rand(5, 25).toFixed(0)}% improvement`,
      confidence: Number(rand(0.6, 0.95).toFixed(2)),
      status,
      createdAt: subHours(now, randInt(1, 720)),
    });
  }
  await db.simulationScenario.createMany({ data: simulationData });
  console.log(`  SimulationScenarios: ${simulationData.length}`);

  // 11. TrendForecast (40 records)
  console.log('Seeding TrendForecasts...');
  const trendMetrics = ['rsrp', 'throughput', 'latency', 'users', 'prbUtilization'];
  const trendHorizons = ['7d', '14d', '30d', '90d'];
  const trendDirections = ['improving', 'stable', 'degrading'];
  const trendData: any[] = [];
  for (let i = 0; i < 40; i++) {
    const tech = pick(simTechs);
    const metric = pick(trendMetrics);
    const horizon = pick(trendHorizons);
    const site = pick(phaseDSites);
    const direction = pick(trendDirections);
    const days = parseInt(horizon);
    const points = [];
    const baseVal = rand(20, 100);
    for (let d = 0; d < days; d++) {
      const drift = direction === 'improving' ? rand(0.1, 0.5) : direction === 'degrading' ? rand(-0.5, -0.1) : rand(-0.1, 0.1);
      const predicted = baseVal + drift * d;
      points.push({
        date: new Date(Date.now() + d * 86400000).toISOString().split('T')[0],
        predicted: Number(predicted.toFixed(2)),
        lower: Number((predicted - rand(2, 8)).toFixed(2)),
        upper: Number((predicted + rand(2, 8)).toFixed(2)),
      });
    }
    trendData.push({
      siteId: Math.random() > 0.2 ? phaseDSites[randInt(0, phaseDSites.length - 1)].id : null,
      technology: tech,
      region: pick(regions),
      metric,
      forecastPoints: JSON.stringify(points),
      horizon,
      trendDirection: direction,
      confidence: Number(rand(0.7, 0.95).toFixed(2)),
      recommendation: direction === 'degrading' ? `Monitor ${metric} for potential SLA breach` : 'Trend within acceptable bounds',
      createdAt: subHours(now, randInt(1, 48)),
    });
  }
  await db.trendForecast.createMany({ data: trendData });
  console.log(`  TrendForecasts: ${trendData.length}`);

  // 12. RoiRecord (20 records)
  console.log('Seeding RoiRecords...');
  const roiCategories = ['energy_saving', 'capacity_deferred', 'churn_reduction', 'sla_improvement', 'outage_reduction'];
  const roiStatuses = ['projected', 'in_progress', 'realized', 'failed'];
  const roiData: any[] = [];
  for (let i = 0; i < 20; i++) {
    const cat = pick(roiCategories);
    const tech = pick(simTechs);
    const status = i < 8 ? 'realized' : i < 14 ? 'in_progress' : i < 18 ? 'projected' : 'failed';
    const invest = rand(50000, 2000000);
    const annual = rand(10000, 500000);
    const payback = Math.round((invest / annual) * 12);
    roiData.push({
      title: `${cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${tech} ${pick(regions).split(' ')[0]}`,
      category: cat,
      technology: tech,
      siteId: Math.random() > 0.5 ? pick(phaseDSites).id : null,
      siteName: Math.random() > 0.5 ? pick(phaseDSites).name : null,
      investmentCost: Number(invest.toFixed(0)),
      annualSaving: Number(annual.toFixed(0)),
      paybackMonths: payback,
      roiPercentage: Number(((annual / invest) * 100).toFixed(1)),
      status,
      kpiImpact: JSON.stringify({ before: rand(50, 80), after: rand(75, 98) }),
      period: pick(['monthly', 'quarterly', 'yearly']),
      periodValue: Number(rand(5000, 100000).toFixed(0)),
      cumulativeSaving: status === 'realized' ? Number(rand(50000, 500000).toFixed(0)) : 0,
      notes: status === 'realized' ? 'Savings verified and confirmed' : 'Awaiting final validation',
      createdAt: subHours(now, randInt(24, 2160)),
    });
  }
  await db.roiRecord.createMany({ data: roiData });
  console.log(`  RoiRecords: ${roiData.length}`);

  // 13. SpectrumBlock (16 records)
  console.log('Seeding SpectrumBlocks...');
  const specBands = ['700', '800', '900', '1800', '2100', '2300', '2600', '3500'];
  const specTechs = [
    { band: '700', tech: '4G', bw: 10 }, { band: '700', tech: '5G', bw: 10 },
    { band: '800', tech: '4G', bw: 10 }, { band: '800', tech: '5G', bw: 10 },
    { band: '900', tech: '2G', bw: 6 }, { band: '900', tech: '3G', bw: 5 },
    { band: '1800', tech: '2G', bw: 10 }, { band: '1800', tech: '4G', bw: 20 },
    { band: '2100', tech: '3G', bw: 15 }, { band: '2100', tech: '4G', bw: 20 },
    { band: '2300', tech: '4G', bw: 20 }, { band: '2300', tech: '5G', bw: 40 },
    { band: '2600', tech: '4G', bw: 20 }, { band: '2600', tech: '5G', bw: 80 },
    { band: '3500', tech: '5G', bw: 100 }, { band: '3500', tech: '5G', bw: 80 },
  ];
  const spectrumData: any[] = [];
  for (const st of specTechs) {
    const channelCount = Math.round(st.bw / (st.tech === '2G' ? 0.2 : st.tech === '3G' ? 5 : 20));
    const utilized = randInt(Math.floor(channelCount * 0.3), channelCount);
    const isRefarmCandidate = st.tech === '2G' || st.tech === '3G';
    spectrumData.push({
      band: st.band,
      bandwidth: st.bw,
      technology: st.tech,
      region: pick(regions),
      channelCount,
      utilizedChannels: utilized,
      utilizationPct: Number(((utilized / channelCount) * 100).toFixed(1)),
      avgInterference: Number(rand(-115, -95).toFixed(1)),
      avgRsrp: Number(rand(-100, -70).toFixed(1)),
      refarmCandidate: isRefarmCandidate ? Math.random() > 0.5 : false,
      refarmTargetTech: isRefarmCandidate ? (st.tech === '2G' ? '4G' : '5G') : null,
      refarmPotentialSaving: isRefarmCandidate ? Number(rand(100000, 800000).toFixed(0)) : null,
      status: Math.random() > 0.1 ? 'active' : isRefarmCandidate ? 'planned_refarm' : 'active',
    });
  }
  await db.spectrumBlock.createMany({ data: spectrumData });
  console.log(`  SpectrumBlocks: ${spectrumData.length}`);

  // 14. EvolutionPlan (8 records)
  console.log('Seeding EvolutionPlans...');
  const evoPlans = [
    { src: '2G', tgt: '4G', name: '2G to 4G LTE Migration - Alger', region: 'Alger Centre', sites: 4, completed: 2, cost: 2400000, spent: 1200000, status: 'in_progress', risk: 'medium' },
    { src: '2G', tgt: '4G', name: '2G to 4G LTE Migration - Oran', region: 'Oran Métropole', sites: 2, completed: 0, cost: 800000, spent: 0, status: 'planned', risk: 'low' },
    { src: '3G', tgt: '4G', name: '3G WCDMA to 4G - Constantine', region: 'Constantine', sites: 3, completed: 1, cost: 1800000, spent: 600000, status: 'in_progress', risk: 'medium' },
    { src: '3G', tgt: '4G', name: '3G Sunset Plan - Sétif', region: 'Sétif', sites: 2, completed: 0, cost: 600000, spent: 0, status: 'planned', risk: 'high' },
    { src: '4G', tgt: '5G', name: '5G NR Overlay - Alger Core', region: 'Alger Centre', sites: 4, completed: 3, cost: 5000000, spent: 3750000, status: 'in_progress', risk: 'low' },
    { src: '4G', tgt: '5G', name: '5G NR Expansion - Oran', region: 'Oran Métropole', sites: 3, completed: 2, cost: 3750000, spent: 2500000, status: 'in_progress', risk: 'medium' },
    { src: '2G', tgt: '5G', name: 'Direct 2G to 5G Leapfrog - Blida', region: 'Blida', sites: 2, completed: 0, cost: 1500000, spent: 0, status: 'planned', risk: 'high' },
    { src: '3G', tgt: '5G', name: '3G to 5G Direct Migration - Annaba', region: 'Annaba', sites: 2, completed: 0, cost: 1200000, spent: 0, status: 'planned', risk: 'high' },
  ];
  const evolutionData: any[] = [];
  for (const ep of evoPlans) {
    evolutionData.push({
      name: ep.name,
      sourceTech: ep.src,
      targetTech: ep.tgt,
      region: ep.region,
      siteCount: ep.sites,
      sitesCompleted: ep.completed,
      estimatedCost: ep.cost,
      spentBudget: ep.spent,
      startDate: ep.status !== 'planned' ? subHours(now, randInt(168, 2160)) : null,
      targetDate: new Date(Date.now() + randInt(30, 365) * 86400000),
      status: ep.status,
      spectrumGain: JSON.stringify(ep.src === '2G' ? ['900MHz'] : ep.src === '3G' ? ['2100MHz'] : []),
      capacityGain: JSON.stringify({ before: rand(50, 150), after: rand(300, 1200) }),
      riskLevel: ep.risk,
      notes: `${ep.sitesCompleted}/${ep.sites} sites completed`,
    });
  }
  await db.evolutionPlan.createMany({ data: evolutionData });
  console.log(`  EvolutionPlans: ${evolutionData.length}`);

  // 15. NpiRecord (34 records - 1 per site)
  console.log('Seeding NpiRecords...');
  const npiData: any[] = [];
  const npiScores: number[] = [];
  for (let i = 0; i < phaseDSites.length; i++) {
    const site = phaseDSites[i];
    const overall = rand(40, 95);
    npiScores.push(overall);
    npiData.push({
      siteId: site.id,
      technology: site.technology,
      region: site.region,
      overallNpi: Number(overall.toFixed(1)),
      coverageNpi: Number(rand(30, 98).toFixed(1)),
      capacityNpi: Number(rand(25, 95).toFixed(1)),
      qualityNpi: Number(rand(35, 96).toFixed(1)),
      reliabilityNpi: Number(rand(40, 99).toFixed(1)),
      costEfficiencyNpi: Number(rand(30, 90).toFixed(1)),
      rank: 0, // will update below
      totalSites: phaseDSites.length,
    });
  }
  // Sort by overallNpi descending to assign ranks
  const sorted = [...npiData].sort((a, b) => b.overallNpi - a.overallNpi);
  sorted.forEach((r, i) => { r.rank = i + 1; });
  await db.npiRecord.createMany({ data: npiData });
  console.log(`  NpiRecords: ${npiData.length}`);

  // 16. ServiceOrchestration (30 records)
  console.log('Seeding ServiceOrchestrations...');
  const svcTypes = ['voip', 'video_streaming', 'web_browsing', 'iot_mqtt', 'gaming', 'video_call'];
  const svcNames: Record<string, string> = { voip: 'VoIP Service', video_streaming: 'Video Streaming', web_browsing: 'Web Browsing', iot_mqtt: 'IoT MQTT', gaming: 'Cloud Gaming', video_call: 'Video Call' };
  const serviceData: any[] = [];
  for (let i = 0; i < 30; i++) {
    const svcType = pick(svcTypes);
    const tech = pick(['4G', '5G']);
    const region = pick(regions);
    const mos = svcType === 'gaming' ? rand(2.5, 4.8) : svcType === 'voip' ? rand(3.2, 4.9) : svcType === 'video_call' ? rand(2.8, 4.7) : rand(3.0, 4.5);
    const issues: string[] = [];
    if (mos < 3.5) issues.push('High latency impacting user experience');
    if (Math.random() > 0.8) issues.push('Packet loss spike detected');
    if (Math.random() > 0.85) issues.push('Jitter exceeds threshold');
    serviceData.push({
      serviceName: svcNames[svcType],
      serviceType: svcType,
      technology: tech,
      region,
      mosScore: Number(mos.toFixed(2)),
      latencyMs: Number((svcType === 'gaming' ? rand(8, 45) : svcType === 'iot_mqtt' ? rand(15, 80) : rand(10, 120)).toFixed(1)),
      jitterMs: Number(rand(0.5, 25).toFixed(1)),
      packetLoss: Number(rand(0, 3).toFixed(2)),
      throughputMbps: Number((svcType === 'video_streaming' ? rand(5, 50) : svcType === 'gaming' ? rand(2, 30) : rand(0.5, 20)).toFixed(2)),
      availabilityPct: Number(rand(98, 99.99).toFixed(2)),
      userSatisfaction: Number(rand(60, 98).toFixed(1)),
      activeSessions: randInt(50, 5000),
      kpiViolations: issues.length,
      slaCompliant: issues.length === 0,
      issues: JSON.stringify(issues),
    });
  }
  await db.serviceOrchestration.createMany({ data: serviceData });
  console.log(`  ServiceOrchestrations: ${serviceData.length}`);

  // 17. AuditTrail (40 records)
  console.log('Seeding AuditTrails...');
  const entityTypes = ['NetworkSite', 'NetworkParameter', 'SonAction', 'Policy', 'Incident', 'ChangeRequest', 'Playbook', 'EvolutionPlan'];
  const trailActions = ['create', 'update', 'delete', 'approve', 'reject', 'implement', 'rollback'];
  const auditCategories = ['parameter', 'config', 'site', 'policy', 'incident', 'son'];
  const auditData: any[] = [];
  for (let i = 0; i < 40; i++) {
    const eType = pick(entityTypes);
    const action = pick(trailActions);
    const cat = pick(auditCategories);
    auditData.push({
      entityType: eType,
      entityId: pick(phaseDSites).id,
      entityName: `${eType}-${randInt(100, 999)}`,
      action,
      field: Math.random() > 0.4 ? pick(['status', 'power', 'tilt', 'pci', 'bandwidth', 'priority', 'threshold', 'technology']) : null,
      previousValue: Math.random() > 0.3 ? String(rand(-10, 50)) : null,
      newValue: Math.random() > 0.3 ? String(rand(-10, 50)) : null,
      technology: Math.random() > 0.2 ? pick(simTechs) : null,
      category: cat,
      requestedBy: pick(['system', 'admin', 'noc_engineer_1', 'noc_engineer_2', 'auto_son']),
      approvedBy: (action === 'approve' || action === 'reject') ? pick(['admin', 'senior_engineer']) : null,
      impact: Math.random() > 0.5 ? `${rand(1, 30).toFixed(0)}% KPI improvement expected` : '',
      createdAt: subHours(now, randInt(1, 720)),
    });
  }
  await db.auditTrail.createMany({ data: auditData });
  console.log(`  AuditTrails: ${auditData.length}`);

  // ========== NEW MODELS SEED ==========

  // 18. AiAgent (7 records - exact mock data)
  console.log('Seeding AiAgents...');
  const aiAgentData = [
    { id: 'agent-optimizer', name: 'Network Optimizer', type: 'optimization', description: 'Autonomous parameter tuning based on KPI targets', model: 'gpt-4o', status: 'active', tasksCompleted: 1847, tasksFailed: 23, avgLatencyMs: 2340, successRate: 98.8 },
    { id: 'agent-anomaly', name: 'Anomaly Detector', type: 'detection', description: 'Real-time anomaly detection across all KPIs', model: 'gpt-4o', status: 'active', tasksCompleted: 3210, tasksFailed: 45, avgLatencyMs: 1200, successRate: 98.6 },
    { id: 'agent-rca', name: 'Root Cause Analyzer', type: 'analysis', description: 'Multi-layer root cause analysis with evidence chain', model: 'gpt-4o', status: 'active', tasksCompleted: 856, tasksFailed: 12, avgLatencyMs: 4500, successRate: 98.6 },
    { id: 'agent-forecast', name: 'Demand Forecaster', type: 'forecasting', description: 'Capacity and traffic demand forecasting', model: 'gpt-4o-mini', status: 'active', tasksCompleted: 2100, tasksFailed: 8, avgLatencyMs: 890, successRate: 99.6 },
    { id: 'agent-son', name: 'SON Coordinator', type: 'automation', description: 'Self-Organizing Network action orchestration', model: 'gpt-4o', status: 'idle', tasksCompleted: 4320, tasksFailed: 67, avgLatencyMs: 3200, successRate: 98.5 },
    { id: 'agent-slicing', name: 'Slice Manager', type: 'orchestration', description: 'Network slice lifecycle management', model: 'gpt-4o', status: 'active', tasksCompleted: 645, tasksFailed: 3, avgLatencyMs: 1800, successRate: 99.5 },
    { id: 'agent-energy', name: 'Energy Advisor', type: 'optimization', description: 'Energy-saving recommendation engine', model: 'gpt-4o-mini', status: 'idle', tasksCompleted: 1580, tasksFailed: 22, avgLatencyMs: 1500, successRate: 98.6 },
  ];
  await db.aiAgent.createMany({ data: aiAgentData });
  console.log(`  AiAgents: ${aiAgentData.length}`);

  // 19. ExternalIntegration (6 records - exact mock data)
  console.log('Seeding ExternalIntegrations...');
  await db.externalIntegration.createMany({ data: [
    { id: 'int-oss', name: 'OSS Integration', type: 'oss', vendor: 'Ericsson', protocol: 'REST/SOAP', endpoint: 'https://oss.algtelecom.dz/api/v2', status: 'connected', lastSync: subMinutes(now, 3), syncIntervalMin: 5, totalSyncs: 45230, failedSyncs: 12, dataPoints: 2840000, latencyMs: 450, version: 'v2.4.1' },
    { id: 'int-crm', name: 'CRM Integration', type: 'crm', vendor: 'Salesforce', protocol: 'REST', endpoint: 'https://crm.algtelecom.dz/api/v1', status: 'connected', lastSync: subMinutes(now, 10), syncIntervalMin: 30, totalSyncs: 12800, failedSyncs: 5, dataPoints: 1450000, latencyMs: 1200, version: 'v1.8.0' },
    { id: 'int-billing', name: 'Billing Integration', type: 'billing', vendor: 'Amdocs', protocol: 'REST', endpoint: 'https://billing.algtelecom.dz/api/v1', status: 'connected', lastSync: subMinutes(now, 60), syncIntervalMin: 120, totalSyncs: 3200, failedSyncs: 2, dataPoints: 890000, latencyMs: 2300, version: 'v3.1.0' },
    { id: 'int-son', name: 'SON Platform', type: 'son', vendor: 'Huawei', protocol: 'NETCONF', endpoint: 'netconf://son.algtelecom.dz:830', status: 'connected', lastSync: subMinutes(now, 1), syncIntervalMin: 1, totalSyncs: 892000, failedSyncs: 45, dataPoints: 5600000, latencyMs: 180, version: 'v5.2.3' },
    { id: 'int-nms', name: 'NMS Gateway', type: 'nms', vendor: 'Nokia', protocol: 'SNMP/REST', endpoint: 'https://nms.algtelecom.dz:8080', status: 'degraded', lastSync: subMinutes(now, 120), syncIntervalMin: 15, totalSyncs: 23000, failedSyncs: 340, dataPoints: 3200000, latencyMs: 5600, version: 'v4.0.2' },
    { id: 'int-geo', name: 'GIS Platform', type: 'geo', vendor: 'Esri', protocol: 'REST', endpoint: 'https://geo.algtelecom.dz/arcgis', status: 'connected', lastSync: subMinutes(now, 1440), syncIntervalMin: 1440, totalSyncs: 730, failedSyncs: 0, dataPoints: 45000, latencyMs: 890, version: 'v11.2' },
  ] });
  console.log('  ExternalIntegrations: 6');

  // 20. DataPipeline (8 records - exact mock data)
  console.log('Seeding DataPipelines...');
  await db.dataPipeline.createMany({ data: [
    { id: 'pipe-kpi-ingest', name: 'KPI Metrics Ingestion', source: 'OSS Poller', target: 'Time-Series DB', schedule: '*/5 * * * *', status: 'running', lastRun: subMinutes(now, 2), nextRun: subMinutes(now, -3), recordsProcessed: 184200, errorRate: 0.02, avgDurationMs: 2300 },
    { id: 'pipe-alarm-stream', name: 'Alarm Stream Processing', source: 'OSS Alarm Feed', target: 'Alert Engine', schedule: 'realtime', status: 'running', lastRun: subMinutes(now, 1), nextRun: null, recordsProcessed: 45600, errorRate: 0.1, avgDurationMs: 120 },
    { id: 'pipe-crm-sync', name: 'CRM Customer Sync', source: 'CRM API', target: 'Subscriber DB', schedule: '0 */2 * * *', status: 'running', lastRun: subMinutes(now, 60), nextRun: subMinutes(now, -60), recordsProcessed: 32400, errorRate: 0.05, avgDurationMs: 8500 },
    { id: 'pipe-billing-etl', name: 'Billing ETL', source: 'Billing System', target: 'Revenue DW', schedule: '0 2 * * *', status: 'completed', lastRun: subHours(now, 8), nextRun: subMinutes(now, -480), recordsProcessed: 12800, errorRate: 0.0, avgDurationMs: 12000 },
    { id: 'pipe-son-actions', name: 'SON Action Logger', source: 'SON Engine', target: 'Audit Trail', schedule: 'realtime', status: 'running', lastRun: subMinutes(now, 1), nextRun: null, recordsProcessed: 8900, errorRate: 0.0, avgDurationMs: 80 },
    { id: 'pipe-forecast-train', name: 'Forecast Model Training', source: 'KPI History', target: 'ML Models', schedule: '0 3 * * 0', status: 'scheduled', lastRun: subHours(now, 48), nextRun: new Date(now.getTime() + 120 * 60000), recordsProcessed: 500000, errorRate: 0.5, avgDurationMs: 120000 },
    { id: 'pipe-qoe-compute', name: 'QoE Score Computation', source: 'KPI + CEM Data', target: 'QoE Dashboard', schedule: '*/10 * * * *', status: 'running', lastRun: subMinutes(now, 5), nextRun: subMinutes(now, -5), recordsProcessed: 92000, errorRate: 0.03, avgDurationMs: 4500 },
    { id: 'pipe-anomaly-label', name: 'Anomaly Labeling', source: 'Alert Engine', target: 'ML Training Set', schedule: '0 4 * * *', status: 'failed', lastRun: subHours(now, 2), nextRun: subHours(now, -2), recordsProcessed: 1200, errorRate: 3.2, avgDurationMs: 30000 },
  ] });
  console.log('  DataPipelines: 8');

  // 21. OssNetworkElement (50 records)
  console.log('Seeding OssNetworkElements...');
  const ossRegions = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Sétif', 'Blida', 'Tlemcen', 'Tizi Ouzou', 'Batna', 'Béjaïa', 'Biskra', 'Ouargla'];
  const ossVendors = ['Ericsson', 'Huawei', 'Nokia', 'ZTE'];
  const neTypesByTech: Record<string, string[]> = { '5G': ['gNodeB'], '4G': ['eNodeB'], '3G': ['RNC', 'NodeB'], '2G': ['BSC', 'BTS'] };
  const neData: any[] = [];
  let neIdx = 1;
  for (let i = 0; i < 50; i++) {
    const region = ossRegions[i % 12];
    const vendor = ossVendors[i % 4];
    const techRoll = Math.random();
    let technology: string, type: string;
    if (techRoll < 0.45) { technology = '5G'; type = 'gNodeB'; }
    else if (techRoll < 0.80) { technology = '4G'; type = 'eNodeB'; }
    else if (techRoll < 0.93) { technology = '3G'; type = pick(neTypesByTech['3G']); }
    else { technology = '2G'; type = pick(neTypesByTech['2G']); }
    const statusRoll = Math.random();
    const status = statusRoll < 0.82 ? 'active' : statusRoll < 0.90 ? 'degraded' : statusRoll < 0.96 ? 'maintenance' : 'down';
    neData.push({
      neId: `NE-${String(neIdx).padStart(4, '0')}`,
      name: `${region}_${vendor[0]}_${type}_${String(i + 1).padStart(3, '0')}`,
      type, technology, vendor, region,
      siteName: `${region}_SITE_${String(i + 1).padStart(3, '0')}`,
      status,
      lastPoll: subMinutes(now, randInt(0, 5)),
      cpuUsage: randInt(15, 90),
      memoryUsage: randInt(30, 85),
      carriers: randInt(1, 4),
      siteId: Math.random() > 0.5 ? pick(phaseDSites).id : null,
    });
    neIdx++;
  }
  await db.ossNetworkElement.createMany({ data: neData });
  console.log(`  OssNetworkElements: ${neData.length}`);

  // 22. OssFaultEvent (25 records)
  console.log('Seeding OssFaultEvents...');
  const faultTypes = ['Link Down', 'High CPU', 'High Memory', 'Interface Flap', 'Sync Loss', 'Power Alarm', 'Temperature', 'Card Failure'];
  const faultSeverities = ['critical', 'major', 'minor', 'warning'];
  const faultData: any[] = [];
  for (let i = 0; i < 25; i++) {
    const ne = pick(neData);
    const cat = pick(faultTypes);
    faultData.push({
      faultId: `FAULT-${String(i + 1).padStart(5, '0')}`,
      neId: ne.neId,
      neName: ne.name,
      severity: pick(faultSeverities),
      description: `${cat} detected on ${ne.name}`,
      category: cat,
      timestamp: subHours(now, randInt(0, 24)),
      acknowledged: Math.random() > 0.5,
    });
  }
  await db.ossFaultEvent.createMany({ data: faultData });
  console.log(`  OssFaultEvents: ${faultData.length}`);

  // 23. CrmCustomer (120 records)
  console.log('Seeding CrmCustomers...');
  const crmFirst = ['Ahmed', 'Mohamed', 'Youcef', 'Amine', 'Karim', 'Sofiane', 'Rami', 'Walid', 'Nabil', 'Fares', 'Lydia', 'Amina', 'Sarah', 'Nour', 'Imane', 'Lina', 'Yasmine', 'Rania', 'Sara', 'Meriem'];
  const crmLast = ['Benali', 'Haddad', 'Bouzid', 'Kaci', 'Mebarki', 'Djebbar', 'Hamidi', 'Zerrouki', 'Boudiaf', 'Belkacem', 'Ait Ahmed', 'Cherif', 'Mansouri', 'Tlemcani', 'Boumediene', 'Amrani', 'Fekhar', 'Rahmani', 'Mokrani', 'Djamel'];
  const crmSegments = ['prepaid', 'postpaid', 'corporate'];
  const crmTiers = ['bronze', 'silver', 'gold', 'platinum'];
  const crmServices = ['Mobile Data', 'Voice Only', 'Data + Voice', 'Enterprise', 'Family Plan'];
  const crmData: any[] = [];
  const crmIds: string[] = []; // store for linking to invoices
  for (let i = 0; i < 120; i++) {
    const segment = pick(crmSegments);
    const tier = segment === 'corporate' ? pick(['gold', 'platinum']) : pick(crmTiers);
    const arpuByTier: Record<string, [number, number]> = { bronze: [800, 3500], silver: [1500, 6500], gold: [3500, 15000], platinum: [8000, 25000] };
    const [arpuMin, arpuMax] = arpuByTier[tier];
    const arpu = randInt(arpuMin, arpuMax);
    const churnBase: Record<string, number> = { bronze: 0.4, silver: 0.25, gold: 0.12, platinum: 0.05 };
    const churnVal = churnBase[tier] + Math.random() * 0.2 - 0.1;
    const churnRisk = churnVal > 0.5 ? 'critical' : churnVal > 0.3 ? 'high' : churnVal > 0.15 ? 'medium' : 'low';
    const satisfaction = rand(2.5, 5.0);
    const cid = `CRM-${String(i + 1).padStart(6, '0')}`;
    const msisdn = `213${String(50000000 + i * 312457).padStart(9, '0')}`;
    crmIds.push(cid);
    crmData.push({
      customerId: cid,
      msisdn,
      name: `${crmFirst[i % 20]} ${crmLast[i % 20]}`,
      type: segment,
      tier,
      region: ossRegions[i % 12],
      arpu,
      churnRisk,
      satisfactionScore: Number(satisfaction.toFixed(1)),
      tenureMonths: randInt(1, 120),
      dataUsageGb: Number(rand(2, 60).toFixed(1)),
      status: Math.random() > 0.05 ? 'active' : 'suspended',
      complaints: randInt(0, 6),
      joinDate: subHours(now, randInt(720, 70080)),
      serviceType: pick(crmServices),
    });
  }
  await db.crmCustomer.createMany({ data: crmData });
  console.log(`  CrmCustomers: ${crmData.length}`);

  // 24. BillingInvoice (100 records)
  console.log('Seeding BillingInvoices...');
  const billingServices = ['Mobile Data', 'Voice Only', 'Data + Voice', 'Enterprise', 'Family Plan', 'Fixed Line', 'IoT Connectivity'];
  const billingPaymentMethods = ['Carte DZ', 'CCP', 'Edahabia', 'Virement', 'Cash'];
  const billingStatuses: [string, number][] = [['paid', 55], ['pending', 20], ['overdue', 15], ['partial', 10]];
  const billingAmounts: Record<string, [number, number]> = {
    'Mobile Data': [800, 3500], 'Voice Only': [500, 2000], 'Data + Voice': [1200, 5000],
    'Enterprise': [15000, 80000], 'Family Plan': [2500, 8000], 'Fixed Line': [1500, 6000], 'IoT Connectivity': [3000, 12000],
  };
  const billingCycles: string[] = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    billingCycles.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const invoiceData: any[] = [];
  for (let i = 0; i < 100; i++) {
    const status = pickWeighted(billingStatuses);
    const cycle = pick(billingCycles);
    const serviceType = pick(billingServices);
    const [amtMin, amtMax] = billingAmounts[serviceType] ?? [1000, 5000];
    const amount = randInt(amtMin, amtMax);
    const tax = Math.round(amount * 0.19);
    const total = amount + tax;
    const [y, m] = cycle.split('-').map(Number);
    const dueDay = randInt(1, 28);
    const dueDate = new Date(y, m - 1, dueDay);
    const daysOverdue = (status === 'overdue' || status === 'partial') ? randInt(1, 120) : 0;
    const paidDate = status === 'paid' ? new Date(y, m - 1, randInt(1, dueDay)) : null;
    const crmIdx = i % 120;
    invoiceData.push({
      invoiceId: `INV-${String(i + 1).padStart(6, '0')}`,
      customerId: crmIds[crmIdx],
      customerName: `${crmFirst[crmIdx % 20]} ${crmLast[crmIdx % 20]}`,
      msisdn: `213${String(50000000 + crmIdx * 312457).padStart(9, '0')}`,
      region: ossRegions[crmIdx % 12],
      serviceType,
      billingCycle: cycle,
      amount, tax, total,
      status,
      paymentMethod: (status === 'paid' || status === 'partial') ? pick(billingPaymentMethods) : null,
      dueDate,
      paidDate,
      daysOverdue,
    });
  }
  await db.billingInvoice.createMany({ data: invoiceData });
  console.log(`  BillingInvoices: ${invoiceData.length}`);

  // ========== NETWORK-COMMERCIAL INSIGHT SEED ==========
  console.log('\n  Seeding NetworkCommercialInsight...');
  const ncData = [
    { zoneName: 'NCI-ALG-001', region: 'Alger', avgRsrp: -92, avgRsrq: -11, avgSinr: 9.2, avgThroughputDl: 42, avgThroughputUl: 18, avgAvailability: 99.1, avgDropRate: 0.8, avgLatencyMs: 22, avgPrbUtilization: 68, avgArpu: 2800, totalRevenue: 119000000, subscriberCount: 42500, churnRate: 4.2, marketPenetration: 62, satisfactionScore: 78, rsrpVsChurn: -0.82, throughputVsArpu: 0.74, availabilityVsRevenue: 0.88, dropRateVsChurn: 0.71, latencyVsSatisfaction: -0.65, prbUtilVsThroughput: -0.58, networkScore: 82, commercialScore: 85, compositeScore: 83.5, revenueLeakageEst: 15200000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-ALG-002', region: 'Alger', avgRsrp: -98, avgRsrq: -13, avgSinr: 6.8, avgThroughputDl: 28, avgThroughputUl: 12, avgAvailability: 97.5, avgDropRate: 1.5, avgLatencyMs: 35, avgPrbUtilization: 82, avgArpu: 2500, totalRevenue: 95000000, subscriberCount: 38000, churnRate: 5.8, marketPenetration: 55, satisfactionScore: 68, rsrpVsChurn: -0.78, throughputVsArpu: 0.69, availabilityVsRevenue: 0.85, dropRateVsChurn: 0.68, latencyVsSatisfaction: -0.72, prbUtilVsThroughput: -0.62, networkScore: 68, commercialScore: 72, compositeScore: 70, revenueLeakageEst: 22400000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-ORN-001', region: 'Oran', avgRsrp: -94, avgRsrq: -12, avgSinr: 8.5, avgThroughputDl: 38, avgThroughputUl: 16, avgAvailability: 98.8, avgDropRate: 1.0, avgLatencyMs: 25, avgPrbUtilization: 72, avgArpu: 2400, totalRevenue: 86400000, subscriberCount: 36000, churnRate: 4.8, marketPenetration: 58, satisfactionScore: 74, rsrpVsChurn: -0.85, throughputVsArpu: 0.71, availabilityVsRevenue: 0.91, dropRateVsChurn: 0.74, latencyVsSatisfaction: -0.68, prbUtilVsThroughput: -0.55, networkScore: 78, commercialScore: 76, compositeScore: 77, revenueLeakageEst: 18500000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-ORN-002', region: 'Oran', avgRsrp: -105, avgRsrq: -15, avgSinr: 4.2, avgThroughputDl: 15, avgThroughputUl: 6, avgAvailability: 94.8, avgDropRate: 2.8, avgLatencyMs: 52, avgPrbUtilization: 89, avgArpu: 2200, totalRevenue: 61600000, subscriberCount: 28000, churnRate: 7.5, marketPenetration: 45, satisfactionScore: 55, rsrpVsChurn: -0.91, throughputVsArpu: 0.82, availabilityVsRevenue: 0.93, dropRateVsChurn: 0.85, latencyVsSatisfaction: -0.78, prbUtilVsThroughput: -0.72, networkScore: 48, commercialScore: 52, compositeScore: 50, revenueLeakageEst: 28600000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-CST-001', region: 'Constantine', avgRsrp: -96, avgRsrq: -12, avgSinr: 7.8, avgThroughputDl: 32, avgThroughputUl: 14, avgAvailability: 98.2, avgDropRate: 1.2, avgLatencyMs: 28, avgPrbUtilization: 75, avgArpu: 2100, totalRevenue: 67200000, subscriberCount: 32000, churnRate: 5.2, marketPenetration: 52, satisfactionScore: 70, rsrpVsChurn: -0.79, throughputVsArpu: 0.67, availabilityVsRevenue: 0.86, dropRateVsChurn: 0.69, latencyVsSatisfaction: -0.64, prbUtilVsThroughput: -0.59, networkScore: 74, commercialScore: 71, compositeScore: 72.5, revenueLeakageEst: 19800000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-CST-002', region: 'Constantine', avgRsrp: -102, avgRsrq: -14, avgSinr: 5.5, avgThroughputDl: 22, avgThroughputUl: 9, avgAvailability: 96.0, avgDropRate: 1.9, avgLatencyMs: 40, avgPrbUtilization: 84, avgArpu: 1900, totalRevenue: 45600000, subscriberCount: 24000, churnRate: 6.8, marketPenetration: 42, satisfactionScore: 60, rsrpVsChurn: -0.83, throughputVsArpu: 0.73, availabilityVsRevenue: 0.89, dropRateVsChurn: 0.76, latencyVsSatisfaction: -0.71, prbUtilVsThroughput: -0.65, networkScore: 58, commercialScore: 60, compositeScore: 59, revenueLeakageEst: 21500000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-ANB-001', region: 'Annaba', avgRsrp: -95, avgRsrq: -12, avgSinr: 8.0, avgThroughputDl: 35, avgThroughputUl: 15, avgAvailability: 98.5, avgDropRate: 1.1, avgLatencyMs: 26, avgPrbUtilization: 70, avgArpu: 2000, totalRevenue: 42000000, subscriberCount: 21000, churnRate: 5.0, marketPenetration: 50, satisfactionScore: 72, rsrpVsChurn: -0.81, throughputVsArpu: 0.72, availabilityVsRevenue: 0.87, dropRateVsChurn: 0.72, latencyVsSatisfaction: -0.67, prbUtilVsThroughput: -0.56, networkScore: 76, commercialScore: 74, compositeScore: 75, revenueLeakageEst: 14200000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-SET-001', region: 'S\u00e9tif', avgRsrp: -93, avgRsrq: -11, avgSinr: 8.8, avgThroughputDl: 40, avgThroughputUl: 17, avgAvailability: 99.0, avgDropRate: 0.9, avgLatencyMs: 24, avgPrbUtilization: 65, avgArpu: 1900, totalRevenue: 51300000, subscriberCount: 27000, churnRate: 4.5, marketPenetration: 54, satisfactionScore: 76, rsrpVsChurn: -0.84, throughputVsArpu: 0.75, availabilityVsRevenue: 0.90, dropRateVsChurn: 0.73, latencyVsSatisfaction: -0.66, prbUtilVsThroughput: -0.54, networkScore: 80, commercialScore: 78, compositeScore: 79, revenueLeakageEst: 12800000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-TLM-001', region: 'Tlemcen', avgRsrp: -100, avgRsrq: -13, avgSinr: 6.2, avgThroughputDl: 25, avgThroughputUl: 10, avgAvailability: 97.0, avgDropRate: 1.7, avgLatencyMs: 38, avgPrbUtilization: 78, avgArpu: 1600, totalRevenue: 28800000, subscriberCount: 18000, churnRate: 6.2, marketPenetration: 44, satisfactionScore: 64, rsrpVsChurn: -0.80, throughputVsArpu: 0.68, availabilityVsRevenue: 0.84, dropRateVsChurn: 0.70, latencyVsSatisfaction: -0.69, prbUtilVsThroughput: -0.61, networkScore: 64, commercialScore: 62, compositeScore: 63, revenueLeakageEst: 13500000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-TLM-002', region: 'Tlemcen', avgRsrp: -108, avgRsrq: -16, avgSinr: 3.8, avgThroughputDl: 12, avgThroughputUl: 5, avgAvailability: 93.5, avgDropRate: 3.2, avgLatencyMs: 58, avgPrbUtilization: 91, avgArpu: 1700, totalRevenue: 37400000, subscriberCount: 22000, churnRate: 8.2, marketPenetration: 40, satisfactionScore: 48, rsrpVsChurn: -0.92, throughputVsArpu: 0.85, availabilityVsRevenue: 0.95, dropRateVsChurn: 0.88, latencyVsSatisfaction: -0.82, prbUtilVsThroughput: -0.75, networkScore: 42, commercialScore: 46, compositeScore: 44, revenueLeakageEst: 24200000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-TZM-001', region: 'Tizi Ouzou', avgRsrp: -97, avgRsrq: -12, avgSinr: 7.5, avgThroughputDl: 30, avgThroughputUl: 13, avgAvailability: 97.8, avgDropRate: 1.3, avgLatencyMs: 30, avgPrbUtilization: 73, avgArpu: 1800, totalRevenue: 28800000, subscriberCount: 16000, churnRate: 5.5, marketPenetration: 48, satisfactionScore: 68, rsrpVsChurn: -0.77, throughputVsArpu: 0.65, availabilityVsRevenue: 0.83, dropRateVsChurn: 0.67, latencyVsSatisfaction: -0.63, prbUtilVsThroughput: -0.57, networkScore: 72, commercialScore: 70, compositeScore: 71, revenueLeakageEst: 11200000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-BJA-001', region: 'B\u00e9ja\u00efa', avgRsrp: -94, avgRsrq: -11, avgSinr: 8.2, avgThroughputDl: 36, avgThroughputUl: 15, avgAvailability: 98.6, avgDropRate: 1.0, avgLatencyMs: 27, avgPrbUtilization: 68, avgArpu: 1700, totalRevenue: 23800000, subscriberCount: 14000, churnRate: 4.8, marketPenetration: 52, satisfactionScore: 73, rsrpVsChurn: -0.83, throughputVsArpu: 0.73, availabilityVsRevenue: 0.88, dropRateVsChurn: 0.71, latencyVsSatisfaction: -0.66, prbUtilVsThroughput: -0.55, networkScore: 78, commercialScore: 75, compositeScore: 76.5, revenueLeakageEst: 8900000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-BTN-001', region: 'Batna', avgRsrp: -104, avgRsrq: -14, avgSinr: 5.0, avgThroughputDl: 18, avgThroughputUl: 8, avgAvailability: 95.5, avgDropRate: 2.2, avgLatencyMs: 45, avgPrbUtilization: 85, avgArpu: 1400, totalRevenue: 16800000, subscriberCount: 12000, churnRate: 7.0, marketPenetration: 38, satisfactionScore: 56, rsrpVsChurn: -0.86, throughputVsArpu: 0.76, availabilityVsRevenue: 0.90, dropRateVsChurn: 0.78, latencyVsSatisfaction: -0.74, prbUtilVsThroughput: -0.68, networkScore: 52, commercialScore: 55, compositeScore: 53.5, revenueLeakageEst: 11800000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-BSK-001', region: 'Biskra', avgRsrp: -101, avgRsrq: -13, avgSinr: 6.0, avgThroughputDl: 22, avgThroughputUl: 9, avgAvailability: 96.5, avgDropRate: 1.8, avgLatencyMs: 40, avgPrbUtilization: 80, avgArpu: 1500, totalRevenue: 19500000, subscriberCount: 13000, churnRate: 6.5, marketPenetration: 42, satisfactionScore: 62, rsrpVsChurn: -0.82, throughputVsArpu: 0.70, availabilityVsRevenue: 0.87, dropRateVsChurn: 0.74, latencyVsSatisfaction: -0.70, prbUtilVsThroughput: -0.63, networkScore: 62, commercialScore: 60, compositeScore: 61, revenueLeakageEst: 10200000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-WRG-001', region: 'Ouargla', avgRsrp: -99, avgRsrq: -13, avgSinr: 6.8, avgThroughputDl: 28, avgThroughputUl: 12, avgAvailability: 97.2, avgDropRate: 1.5, avgLatencyMs: 35, avgPrbUtilization: 76, avgArpu: 3500, totalRevenue: 66500000, subscriberCount: 19000, churnRate: 5.8, marketPenetration: 48, satisfactionScore: 66, rsrpVsChurn: -0.84, throughputVsArpu: 0.77, availabilityVsRevenue: 0.92, dropRateVsChurn: 0.76, latencyVsSatisfaction: -0.73, prbUtilVsThroughput: -0.60, networkScore: 66, commercialScore: 70, compositeScore: 68, revenueLeakageEst: 25200000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-BLD-001', region: 'Blida', avgRsrp: -93, avgRsrq: -11, avgSinr: 8.6, avgThroughputDl: 38, avgThroughputUl: 16, avgAvailability: 99.0, avgDropRate: 0.8, avgLatencyMs: 23, avgPrbUtilization: 66, avgArpu: 2100, totalRevenue: 52500000, subscriberCount: 25000, churnRate: 4.6, marketPenetration: 56, satisfactionScore: 75, rsrpVsChurn: -0.80, throughputVsArpu: 0.71, availabilityVsRevenue: 0.86, dropRateVsChurn: 0.70, latencyVsSatisfaction: -0.64, prbUtilVsThroughput: -0.53, networkScore: 80, commercialScore: 79, compositeScore: 79.5, revenueLeakageEst: 14800000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-SKD-001', region: 'Skikda', avgRsrp: -96, avgRsrq: -12, avgSinr: 7.6, avgThroughputDl: 32, avgThroughputUl: 14, avgAvailability: 98.0, avgDropRate: 1.2, avgLatencyMs: 29, avgPrbUtilization: 71, avgArpu: 1800, totalRevenue: 30600000, subscriberCount: 17000, churnRate: 5.3, marketPenetration: 50, satisfactionScore: 70, rsrpVsChurn: -0.81, throughputVsArpu: 0.69, availabilityVsRevenue: 0.85, dropRateVsChurn: 0.71, latencyVsSatisfaction: -0.67, prbUtilVsThroughput: -0.58, networkScore: 74, commercialScore: 72, compositeScore: 73, revenueLeakageEst: 11500000, periodMonth: '2025-01', periodYear: 2025 },
    { zoneName: 'NCI-DJF-001', region: 'Djelfa', avgRsrp: -103, avgRsrq: -14, avgSinr: 5.2, avgThroughputDl: 20, avgThroughputUl: 8, avgAvailability: 95.8, avgDropRate: 2.0, avgLatencyMs: 42, avgPrbUtilization: 82, avgArpu: 1500, totalRevenue: 21000000, subscriberCount: 14000, churnRate: 6.8, marketPenetration: 40, satisfactionScore: 58, rsrpVsChurn: -0.85, throughputVsArpu: 0.74, availabilityVsRevenue: 0.89, dropRateVsChurn: 0.77, latencyVsSatisfaction: -0.72, prbUtilVsThroughput: -0.66, networkScore: 56, commercialScore: 58, compositeScore: 57, revenueLeakageEst: 12500000, periodMonth: '2025-01', periodYear: 2025 },
  ];
  await db.networkCommercialInsight.createMany({ data: ncData });
  console.log(`  NetworkCommercialInsight: ${ncData.length}`);

  // ========== WILAYA INTELLIGENCE SEED ==========
  console.log('\n  Seeding Wilaya Intelligence...');
  const wilayaProfileData = [
    // ── Cluster 1: Grand Alger ──
    { wilayaCode: '16', wilayaName: 'Alger', cluster: 'Grand Alger', clusterOrder: 1, latitude: 36.753, longitude: 3.058, population: 3900000, totalSites: 342, activeSites: 328, avgRsrp: -89, avgSinr: 11.2, avgThroughputDl: 42, avgAvailability: 99.2, avgDropRate: 0.5, avgLatencyMs: 18, coveragePercent: 94, tech4gSites: 210, tech3gSites: 98, tech2gSites: 34, totalSubscribers: 185000, avgArpu: 2900, totalRevenue: 642300000, churnRate: 3.8, marketPenetration: 72, satisfactionScore: 82, revenueAtRisk: 28900000, competitorSites: 410, coverageGaps: 3, churnHotspots: 2, revenueZones: 8, youthRatio: 0.32, urbanRatio: 0.95, networkScore: 89, commercialScore: 88, geomarketingScore: 85, compositeScore: 87.3 },
    { wilayaCode: '09', wilayaName: 'Blida', cluster: 'Grand Alger', clusterOrder: 2, latitude: 36.470, longitude: 2.830, population: 1280000, totalSites: 128, activeSites: 122, avgRsrp: -93, avgSinr: 8.6, avgThroughputDl: 38, avgAvailability: 99.0, avgDropRate: 0.8, avgLatencyMs: 23, coveragePercent: 88, tech4gSites: 76, tech3gSites: 38, tech2gSites: 14, totalSubscribers: 62000, avgArpu: 2100, totalRevenue: 156240000, churnRate: 4.6, marketPenetration: 56, satisfactionScore: 75, revenueAtRisk: 14800000, competitorSites: 145, coverageGaps: 2, churnHotspots: 1, revenueZones: 4, youthRatio: 0.35, urbanRatio: 0.72, networkScore: 80, commercialScore: 79, geomarketingScore: 76, compositeScore: 78.3 },
    { wilayaCode: '42', wilayaName: 'Tipaza', cluster: 'Grand Alger', clusterOrder: 3, latitude: 36.590, longitude: 2.450, population: 820000, totalSites: 72, activeSites: 68, avgRsrp: -95, avgSinr: 8.0, avgThroughputDl: 35, avgAvailability: 98.5, avgDropRate: 0.9, avgLatencyMs: 25, coveragePercent: 82, tech4gSites: 42, tech3gSites: 22, tech2gSites: 8, totalSubscribers: 38000, avgArpu: 1900, totalRevenue: 86640000, churnRate: 5.0, marketPenetration: 52, satisfactionScore: 72, revenueAtRisk: 8900000, competitorSites: 88, coverageGaps: 3, churnHotspots: 1, revenueZones: 3, youthRatio: 0.33, urbanRatio: 0.68, networkScore: 76, commercialScore: 74, geomarketingScore: 72, compositeScore: 74.0 },
    { wilayaCode: '35', wilayaName: 'Boumerdès', cluster: 'Grand Alger', clusterOrder: 4, latitude: 36.760, longitude: 3.480, population: 950000, totalSites: 84, activeSites: 80, avgRsrp: -94, avgSinr: 8.3, avgThroughputDl: 36, avgAvailability: 98.8, avgDropRate: 0.7, avgLatencyMs: 24, coveragePercent: 85, tech4gSites: 50, tech3gSites: 26, tech2gSites: 8, totalSubscribers: 45000, avgArpu: 2000, totalRevenue: 108000000, churnRate: 4.8, marketPenetration: 54, satisfactionScore: 73, revenueAtRisk: 10200000, competitorSites: 98, coverageGaps: 2, churnHotspots: 1, revenueZones: 3, youthRatio: 0.34, urbanRatio: 0.70, networkScore: 78, commercialScore: 76, geomarketingScore: 74, compositeScore: 76.0 },
    // ── Cluster 2: Kabylie ──
    { wilayaCode: '15', wilayaName: 'Tizi Ouzou', cluster: 'Kabylie', clusterOrder: 1, latitude: 36.710, longitude: 4.040, population: 1380000, totalSites: 110, activeSites: 104, avgRsrp: -97, avgSinr: 7.8, avgThroughputDl: 33, avgAvailability: 97.5, avgDropRate: 1.1, avgLatencyMs: 27, coveragePercent: 78, tech4gSites: 62, tech3gSites: 34, tech2gSites: 14, totalSubscribers: 58000, avgArpu: 1800, totalRevenue: 125280000, churnRate: 5.2, marketPenetration: 50, satisfactionScore: 70, revenueAtRisk: 12000000, competitorSites: 130, coverageGaps: 4, churnHotspots: 2, revenueZones: 3, youthRatio: 0.30, urbanRatio: 0.62, networkScore: 72, commercialScore: 70, geomarketingScore: 68, compositeScore: 70.0 },
    { wilayaCode: '06', wilayaName: 'Béjaïa', cluster: 'Kabylie', clusterOrder: 2, latitude: 36.750, longitude: 5.080, population: 1040000, totalSites: 86, activeSites: 82, avgRsrp: -96, avgSinr: 8.1, avgThroughputDl: 34, avgAvailability: 98.0, avgDropRate: 1.0, avgLatencyMs: 26, coveragePercent: 80, tech4gSites: 50, tech3gSites: 28, tech2gSites: 8, totalSubscribers: 48000, avgArpu: 1700, totalRevenue: 97920000, churnRate: 5.0, marketPenetration: 52, satisfactionScore: 71, revenueAtRisk: 9800000, competitorSites: 105, coverageGaps: 2, churnHotspots: 1, revenueZones: 3, youthRatio: 0.31, urbanRatio: 0.60, networkScore: 74, commercialScore: 72, geomarketingScore: 70, compositeScore: 72.0 },
    // ── Cluster 3: Est ──
    { wilayaCode: '25', wilayaName: 'Constantine', cluster: 'Est', clusterOrder: 1, latitude: 36.365, longitude: 6.615, population: 1120000, totalSites: 135, activeSites: 128, avgRsrp: -92, avgSinr: 9.4, avgThroughputDl: 39, avgAvailability: 98.6, avgDropRate: 0.7, avgLatencyMs: 21, coveragePercent: 87, tech4gSites: 82, tech3gSites: 40, tech2gSites: 13, totalSubscribers: 78000, avgArpu: 2200, totalRevenue: 205920000, churnRate: 4.2, marketPenetration: 62, satisfactionScore: 78, revenueAtRisk: 18500000, competitorSites: 165, coverageGaps: 3, churnHotspots: 2, revenueZones: 5, youthRatio: 0.29, urbanRatio: 0.78, networkScore: 82, commercialScore: 81, geomarketingScore: 78, compositeScore: 80.3 },
    { wilayaCode: '23', wilayaName: 'Annaba', cluster: 'Est', clusterOrder: 2, latitude: 36.910, longitude: 7.750, population: 640000, totalSites: 82, activeSites: 78, avgRsrp: -94, avgSinr: 8.5, avgThroughputDl: 35, avgAvailability: 98.2, avgDropRate: 0.9, avgLatencyMs: 24, coveragePercent: 83, tech4gSites: 48, tech3gSites: 26, tech2gSites: 8, totalSubscribers: 42000, avgArpu: 2000, totalRevenue: 100800000, churnRate: 5.1, marketPenetration: 55, satisfactionScore: 72, revenueAtRisk: 11200000, competitorSites: 95, coverageGaps: 2, churnHotspots: 2, revenueZones: 3, youthRatio: 0.28, urbanRatio: 0.75, networkScore: 77, commercialScore: 74, geomarketingScore: 72, compositeScore: 74.3 },
    { wilayaCode: '19', wilayaName: 'Sétif', cluster: 'Est', clusterOrder: 3, latitude: 36.190, longitude: 5.410, population: 2050000, totalSites: 156, activeSites: 148, avgRsrp: -93, avgSinr: 8.8, avgThroughputDl: 37, avgAvailability: 98.4, avgDropRate: 0.8, avgLatencyMs: 22, coveragePercent: 85, tech4gSites: 92, tech3gSites: 48, tech2gSites: 16, totalSubscribers: 95000, avgArpu: 1900, totalRevenue: 216600000, churnRate: 4.8, marketPenetration: 53, satisfactionScore: 74, revenueAtRisk: 15800000, competitorSites: 185, coverageGaps: 3, churnHotspots: 2, revenueZones: 4, youthRatio: 0.32, urbanRatio: 0.68, networkScore: 79, commercialScore: 76, geomarketingScore: 74, compositeScore: 76.3 },
    { wilayaCode: '21', wilayaName: 'Skikda', cluster: 'Est', clusterOrder: 4, latitude: 36.880, longitude: 6.910, population: 920000, totalSites: 78, activeSites: 74, avgRsrp: -96, avgSinr: 7.6, avgThroughputDl: 32, avgAvailability: 98.0, avgDropRate: 1.2, avgLatencyMs: 29, coveragePercent: 80, tech4gSites: 45, tech3gSites: 25, tech2gSites: 8, totalSubscribers: 42000, avgArpu: 1800, totalRevenue: 90720000, churnRate: 5.3, marketPenetration: 50, satisfactionScore: 70, revenueAtRisk: 10500000, competitorSites: 90, coverageGaps: 2, churnHotspots: 1, revenueZones: 3, youthRatio: 0.30, urbanRatio: 0.65, networkScore: 74, commercialScore: 72, geomarketingScore: 70, compositeScore: 72.0 },
    { wilayaCode: '05', wilayaName: 'Batna', cluster: 'Est', clusterOrder: 5, latitude: 35.555, longitude: 6.175, population: 1220000, totalSites: 95, activeSites: 88, avgRsrp: -100, avgSinr: 6.4, avgThroughputDl: 26, avgAvailability: 96.5, avgDropRate: 1.6, avgLatencyMs: 34, coveragePercent: 72, tech4gSites: 52, tech3gSites: 30, tech2gSites: 13, totalSubscribers: 55000, avgArpu: 1600, totalRevenue: 105600000, churnRate: 6.2, marketPenetration: 48, satisfactionScore: 64, revenueAtRisk: 14500000, competitorSites: 110, coverageGaps: 4, churnHotspots: 3, revenueZones: 3, youthRatio: 0.34, urbanRatio: 0.58, networkScore: 64, commercialScore: 62, geomarketingScore: 60, compositeScore: 62.0 },
    { wilayaCode: '12', wilayaName: 'Tébessa', cluster: 'Est', clusterOrder: 6, latitude: 35.405, longitude: 8.125, population: 820000, totalSites: 68, activeSites: 62, avgRsrp: -102, avgSinr: 5.8, avgThroughputDl: 22, avgAvailability: 95.5, avgDropRate: 2.0, avgLatencyMs: 38, coveragePercent: 68, tech4gSites: 35, tech3gSites: 24, tech2gSites: 9, totalSubscribers: 35000, avgArpu: 1500, totalRevenue: 63000000, churnRate: 6.8, marketPenetration: 44, satisfactionScore: 60, revenueAtRisk: 11200000, competitorSites: 82, coverageGaps: 5, churnHotspots: 3, revenueZones: 2, youthRatio: 0.35, urbanRatio: 0.52, networkScore: 58, commercialScore: 56, geomarketingScore: 54, compositeScore: 56.0 },
    // ── Cluster 4: Ouest ──
    { wilayaCode: '31', wilayaName: 'Oran', cluster: 'Ouest', clusterOrder: 1, latitude: 35.695, longitude: -0.635, population: 1950000, totalSites: 198, activeSites: 188, avgRsrp: -90, avgSinr: 10.2, avgThroughputDl: 40, avgAvailability: 99.0, avgDropRate: 0.6, avgLatencyMs: 20, coveragePercent: 91, tech4gSites: 118, tech3gSites: 58, tech2gSites: 22, totalSubscribers: 125000, avgArpu: 2400, totalRevenue: 360000000, churnRate: 4.0, marketPenetration: 65, satisfactionScore: 80, revenueAtRisk: 22000000, competitorSites: 240, coverageGaps: 3, churnHotspots: 2, revenueZones: 6, youthRatio: 0.30, urbanRatio: 0.85, networkScore: 85, commercialScore: 84, geomarketingScore: 82, compositeScore: 83.7 },
    { wilayaCode: '13', wilayaName: 'Tlemcen', cluster: 'Ouest', clusterOrder: 2, latitude: 34.880, longitude: -1.320, population: 1050000, totalSites: 82, activeSites: 76, avgRsrp: -98, avgSinr: 7.2, avgThroughputDl: 28, avgAvailability: 97.0, avgDropRate: 1.4, avgLatencyMs: 32, coveragePercent: 75, tech4gSites: 42, tech3gSites: 28, tech2gSites: 12, totalSubscribers: 48000, avgArpu: 1700, totalRevenue: 97920000, churnRate: 5.8, marketPenetration: 48, satisfactionScore: 66, revenueAtRisk: 13500000, competitorSites: 98, coverageGaps: 4, churnHotspots: 2, revenueZones: 3, youthRatio: 0.33, urbanRatio: 0.60, networkScore: 66, commercialScore: 64, geomarketingScore: 62, compositeScore: 64.0 },
    // ── Cluster 5: Sud & Hauts Plateaux ──
    { wilayaCode: '30', wilayaName: 'Ouargla', cluster: 'Sud', clusterOrder: 1, latitude: 31.950, longitude: 5.330, population: 680000, totalSites: 58, activeSites: 52, avgRsrp: -99, avgSinr: 6.8, avgThroughputDl: 28, avgAvailability: 97.2, avgDropRate: 1.5, avgLatencyMs: 35, coveragePercent: 70, tech4gSites: 30, tech3gSites: 20, tech2gSites: 8, totalSubscribers: 32000, avgArpu: 3500, totalRevenue: 134400000, churnRate: 5.8, marketPenetration: 55, satisfactionScore: 66, revenueAtRisk: 18200000, competitorSites: 45, coverageGaps: 5, churnHotspots: 2, revenueZones: 2, youthRatio: 0.28, urbanRatio: 0.65, networkScore: 66, commercialScore: 70, geomarketingScore: 64, compositeScore: 66.7 },
    { wilayaCode: '07', wilayaName: 'Biskra', cluster: 'Sud', clusterOrder: 2, latitude: 34.850, longitude: 5.730, population: 890000, totalSites: 65, activeSites: 60, avgRsrp: -101, avgSinr: 6.0, avgThroughputDl: 22, avgAvailability: 96.5, avgDropRate: 1.8, avgLatencyMs: 40, coveragePercent: 65, tech4gSites: 32, tech3gSites: 24, tech2gSites: 9, totalSubscribers: 38000, avgArpu: 1500, totalRevenue: 68400000, churnRate: 6.5, marketPenetration: 42, satisfactionScore: 62, revenueAtRisk: 12200000, competitorSites: 55, coverageGaps: 4, churnHotspots: 2, revenueZones: 2, youthRatio: 0.30, urbanRatio: 0.55, networkScore: 58, commercialScore: 56, geomarketingScore: 54, compositeScore: 56.0 },
    { wilayaCode: '03', wilayaName: 'Djelfa', cluster: 'Hauts Plateaux', clusterOrder: 1, latitude: 34.670, longitude: 3.250, population: 1420000, totalSites: 78, activeSites: 72, avgRsrp: -103, avgSinr: 5.2, avgThroughputDl: 20, avgAvailability: 95.8, avgDropRate: 2.0, avgLatencyMs: 42, coveragePercent: 62, tech4gSites: 38, tech3gSites: 28, tech2gSites: 12, totalSubscribers: 45000, avgArpu: 1500, totalRevenue: 81000000, churnRate: 6.8, marketPenetration: 40, satisfactionScore: 58, revenueAtRisk: 14000000, competitorSites: 72, coverageGaps: 6, churnHotspots: 3, revenueZones: 2, youthRatio: 0.36, urbanRatio: 0.48, networkScore: 52, commercialScore: 50, geomarketingScore: 48, compositeScore: 50.0 },
    { wilayaCode: '28', wilayaName: "M'Sila", cluster: 'Hauts Plateaux', clusterOrder: 2, latitude: 35.700, longitude: 4.550, population: 1150000, totalSites: 62, activeSites: 56, avgRsrp: -104, avgSinr: 4.8, avgThroughputDl: 18, avgAvailability: 95.2, avgDropRate: 2.2, avgLatencyMs: 45, coveragePercent: 58, tech4gSites: 30, tech3gSites: 22, tech2gSites: 10, totalSubscribers: 38000, avgArpu: 1400, totalRevenue: 63840000, churnRate: 7.2, marketPenetration: 38, satisfactionScore: 55, revenueAtRisk: 12800000, competitorSites: 58, coverageGaps: 5, churnHotspots: 3, revenueZones: 2, youthRatio: 0.37, urbanRatio: 0.45, networkScore: 48, commercialScore: 46, geomarketingScore: 44, compositeScore: 46.0 },
  ];
  await db.wilayaProfile.createMany({ data: wilayaProfileData });
  console.log(`  WilayaProfile: ${wilayaProfileData.length}`);

  // ========== GEOMARKETING SEED ==========
  console.log('\n  Seeding Geomarketing (demographics, revenue zones, competitor sites)...');

  // --- GeoDemographic (12 wilayas) ---
  const geoDemoData = [
    { region: 'Alger Centre', wilayaCode: '16', population: 1200000, areaKm2: 119, density: 10084, urbanPct: 95, avgIncome: 42000, youthPct: 28, smartphonePct: 78, internetPct: 82, latitude: 36.75, longitude: 3.06 },
    { region: 'Oran', wilayaCode: '31', population: 950000, areaKm2: 2121, density: 448, urbanPct: 88, avgIncome: 38000, youthPct: 30, smartphonePct: 72, internetPct: 75, latitude: 35.70, longitude: -0.63 },
    { region: 'Constantine', wilayaCode: '25', population: 750000, areaKm2: 2312, density: 324, urbanPct: 82, avgIncome: 35000, youthPct: 32, smartphonePct: 68, internetPct: 70, latitude: 36.37, longitude: 6.61 },
    { region: 'Annaba', wilayaCode: '23', population: 600000, areaKm2: 1439, density: 417, urbanPct: 85, avgIncome: 36000, youthPct: 29, smartphonePct: 70, internetPct: 72, latitude: 36.91, longitude: 7.75 },
    { region: 'Tlemcen', wilayaCode: '13', population: 500000, areaKm2: 9061, density: 55, urbanPct: 72, avgIncome: 30000, youthPct: 31, smartphonePct: 62, internetPct: 58, latitude: 34.88, longitude: -1.32 },
    { region: 'Sétif', wilayaCode: '19', population: 650000, areaKm2: 6522, density: 100, urbanPct: 75, avgIncome: 32000, youthPct: 33, smartphonePct: 66, internetPct: 65, latitude: 36.19, longitude: 5.41 },
    { region: 'Blida', wilayaCode: '09', population: 800000, areaKm2: 1541, density: 519, urbanPct: 80, avgIncome: 37000, youthPct: 27, smartphonePct: 74, internetPct: 76, latitude: 36.48, longitude: 2.83 },
    { region: 'Batna', wilayaCode: '05', population: 550000, areaKm2: 12193, density: 45, urbanPct: 65, avgIncome: 28000, youthPct: 34, smartphonePct: 58, internetPct: 52, latitude: 35.56, longitude: 6.17 },
    { region: 'Béjaïa', wilayaCode: '06', population: 450000, areaKm2: 3268, density: 138, urbanPct: 70, avgIncome: 31000, youthPct: 30, smartphonePct: 64, internetPct: 62, latitude: 36.75, longitude: 5.08 },
    { region: 'Tizi Ouzou', wilayaCode: '15', population: 500000, areaKm2: 3568, density: 140, urbanPct: 68, avgIncome: 30000, youthPct: 32, smartphonePct: 66, internetPct: 64, latitude: 36.72, longitude: 4.05 },
    { region: 'Biskra', wilayaCode: '07', population: 400000, areaKm2: 20458, density: 20, urbanPct: 58, avgIncome: 26000, youthPct: 35, smartphonePct: 55, internetPct: 48, latitude: 34.85, longitude: 5.73 },
    { region: 'Ouargla', wilayaCode: '30', population: 300000, areaKm2: 211980, density: 1, urbanPct: 82, avgIncome: 34000, youthPct: 26, smartphonePct: 68, internetPct: 70, latitude: 31.95, longitude: 5.32 },
  ];
  await db.geoDemographic.createMany({ data: geoDemoData });
  console.log(`  GeoDemographics: ${geoDemoData.length}`);

  // --- GeoRevenueZone (30 zones across 12 regions) ---
  const revenueZoneData = [
    // Alger Centre (3 zones)
    { region: 'Alger Centre', latitude: 36.753, longitude: 3.058, totalRevenue: 285000000, avgArpu: 3200, subscriberCount: 89000, churnRate: 1.2, marketPenetration: 78, growthRate: 4.5, tier: 'high' },
    { region: 'Alger Centre', latitude: 36.740, longitude: 3.075, totalRevenue: 195000000, avgArpu: 2800, subscriberCount: 69500, churnRate: 1.8, marketPenetration: 65, growthRate: 3.2, tier: 'high' },
    { region: 'Alger Centre', latitude: 36.768, longitude: 3.045, totalRevenue: 142000000, avgArpu: 2400, subscriberCount: 59200, churnRate: 2.5, marketPenetration: 52, growthRate: 2.1, tier: 'medium' },
    // Oran (3 zones)
    { region: 'Oran', latitude: 35.700, longitude: -0.630, totalRevenue: 210000000, avgArpu: 2900, subscriberCount: 72400, churnRate: 1.5, marketPenetration: 72, growthRate: 3.8, tier: 'high' },
    { region: 'Oran', latitude: 35.690, longitude: -0.650, totalRevenue: 148000000, avgArpu: 2500, subscriberCount: 59200, churnRate: 2.1, marketPenetration: 60, growthRate: 2.9, tier: 'medium' },
    { region: 'Oran', latitude: 35.710, longitude: -0.615, totalRevenue: 95000000, avgArpu: 2100, subscriberCount: 45200, churnRate: 3.0, marketPenetration: 45, growthRate: 1.8, tier: 'low' },
    // Constantine (2 zones)
    { region: 'Constantine', latitude: 36.370, longitude: 6.610, totalRevenue: 165000000, avgArpu: 2700, subscriberCount: 61100, churnRate: 1.7, marketPenetration: 68, growthRate: 3.5, tier: 'high' },
    { region: 'Constantine', latitude: 36.360, longitude: 6.625, totalRevenue: 102000000, avgArpu: 2200, subscriberCount: 46300, churnRate: 2.8, marketPenetration: 50, growthRate: 2.0, tier: 'medium' },
    // Annaba (3 zones)
    { region: 'Annaba', latitude: 36.910, longitude: 7.760, totalRevenue: 128000000, avgArpu: 2600, subscriberCount: 49200, churnRate: 1.9, marketPenetration: 64, growthRate: 3.1, tier: 'high' },
    { region: 'Annaba', latitude: 36.900, longitude: 7.780, totalRevenue: 78000000, avgArpu: 2000, subscriberCount: 39000, churnRate: 3.2, marketPenetration: 42, growthRate: 1.5, tier: 'low' },
    { region: 'Annaba', latitude: 36.920, longitude: 7.745, totalRevenue: 95000000, avgArpu: 2200, subscriberCount: 43200, churnRate: 2.4, marketPenetration: 54, growthRate: 2.2, tier: 'medium' },
    // Tlemcen (2 zones)
    { region: 'Tlemcen', latitude: 34.885, longitude: -1.315, totalRevenue: 89000000, avgArpu: 2200, subscriberCount: 40500, churnRate: 2.2, marketPenetration: 55, growthRate: 2.4, tier: 'medium' },
    { region: 'Tlemcen', latitude: 34.870, longitude: -1.330, totalRevenue: 52000000, avgArpu: 1800, subscriberCount: 28900, churnRate: 3.5, marketPenetration: 38, growthRate: 1.2, tier: 'low' },
    // Sétif (3 zones)
    { region: 'Sétif', latitude: 36.195, longitude: 5.405, totalRevenue: 135000000, avgArpu: 2500, subscriberCount: 54000, churnRate: 1.8, marketPenetration: 62, growthRate: 3.3, tier: 'high' },
    { region: 'Sétif', latitude: 36.180, longitude: 5.420, totalRevenue: 92000000, avgArpu: 2100, subscriberCount: 43800, churnRate: 2.6, marketPenetration: 48, growthRate: 2.2, tier: 'medium' },
    { region: 'Sétif', latitude: 36.205, longitude: 5.390, totalRevenue: 65000000, avgArpu: 1900, subscriberCount: 34200, churnRate: 3.1, marketPenetration: 40, growthRate: 1.6, tier: 'low' },
    // Blida (3 zones)
    { region: 'Blida', latitude: 36.485, longitude: 2.825, totalRevenue: 178000000, avgArpu: 2700, subscriberCount: 65900, churnRate: 1.6, marketPenetration: 70, growthRate: 3.7, tier: 'high' },
    { region: 'Blida', latitude: 36.470, longitude: 2.845, totalRevenue: 120000000, avgArpu: 2300, subscriberCount: 52200, churnRate: 2.4, marketPenetration: 56, growthRate: 2.5, tier: 'medium' },
    { region: 'Blida', latitude: 36.495, longitude: 2.810, totalRevenue: 82000000, avgArpu: 2000, subscriberCount: 41000, churnRate: 2.9, marketPenetration: 44, growthRate: 1.9, tier: 'low' },
    // Batna (3 zones)
    { region: 'Batna', latitude: 35.565, longitude: 6.170, totalRevenue: 71000000, avgArpu: 1900, subscriberCount: 37400, churnRate: 2.5, marketPenetration: 48, growthRate: 2.0, tier: 'medium' },
    { region: 'Batna', latitude: 35.550, longitude: 6.185, totalRevenue: 42000000, avgArpu: 1600, subscriberCount: 26300, churnRate: 3.8, marketPenetration: 35, growthRate: 1.0, tier: 'low' },
    { region: 'Batna', latitude: 35.580, longitude: 6.155, totalRevenue: 56000000, avgArpu: 1750, subscriberCount: 32000, churnRate: 3.0, marketPenetration: 41, growthRate: 1.5, tier: 'low' },
    // Béjaïa (2 zones)
    { region: 'Béjaïa', latitude: 36.755, longitude: 5.075, totalRevenue: 82000000, avgArpu: 2100, subscriberCount: 39000, churnRate: 2.3, marketPenetration: 52, growthRate: 2.6, tier: 'medium' },
    { region: 'Béjaïa', latitude: 36.740, longitude: 5.095, totalRevenue: 51000000, avgArpu: 1800, subscriberCount: 28300, churnRate: 3.3, marketPenetration: 38, growthRate: 1.4, tier: 'low' },
    // Tizi Ouzou (2 zones)
    { region: 'Tizi Ouzou', latitude: 36.725, longitude: 4.045, totalRevenue: 88000000, avgArpu: 2000, subscriberCount: 44000, churnRate: 2.1, marketPenetration: 54, growthRate: 2.5, tier: 'medium' },
    { region: 'Tizi Ouzou', latitude: 36.710, longitude: 4.065, totalRevenue: 55000000, avgArpu: 1700, subscriberCount: 32400, churnRate: 3.4, marketPenetration: 40, growthRate: 1.3, tier: 'low' },
    // Biskra (2 zones)
    { region: 'Biskra', latitude: 34.855, longitude: 5.725, totalRevenue: 58000000, avgArpu: 1800, subscriberCount: 32200, churnRate: 2.8, marketPenetration: 42, growthRate: 1.8, tier: 'low' },
    { region: 'Biskra', latitude: 34.840, longitude: 5.745, totalRevenue: 35000000, avgArpu: 1500, subscriberCount: 23300, churnRate: 4.1, marketPenetration: 30, growthRate: 0.8, tier: 'low' },
    // Ouargla (2 zones)
    { region: 'Ouargla', latitude: 31.955, longitude: 5.315, totalRevenue: 95000000, avgArpu: 2600, subscriberCount: 36500, churnRate: 1.9, marketPenetration: 60, growthRate: 2.8, tier: 'high' },
    { region: 'Ouargla', latitude: 31.940, longitude: 5.335, totalRevenue: 62000000, avgArpu: 2200, subscriberCount: 28200, churnRate: 2.7, marketPenetration: 46, growthRate: 1.7, tier: 'medium' },
  ];
  await db.geoRevenueZone.createMany({ data: revenueZoneData });
  console.log(`  GeoRevenueZones: ${revenueZoneData.length}`);

  // --- GeoCompetitorSite (25 sites) ---
  const competitorSitesData = [
    // Djezzy (9 sites)
    { competitorName: 'Djezzy', technology: '4G', latitude: 36.756, longitude: 3.055, estimatedRadiusKm: 2.5, region: 'Alger Centre', confidence: 0.92, source: 'field_survey' },
    { competitorName: 'Djezzy', technology: '4G', latitude: 36.745, longitude: 3.068, estimatedRadiusKm: 2.0, region: 'Alger Centre', confidence: 0.88, source: 'field_survey' },
    { competitorName: 'Djezzy', technology: '3G', latitude: 35.705, longitude: -0.628, estimatedRadiusKm: 3.0, region: 'Oran', confidence: 0.85, source: 'crowdsourced' },
    { competitorName: 'Djezzy', technology: '4G', latitude: 36.375, longitude: 6.615, estimatedRadiusKm: 2.2, region: 'Constantine', confidence: 0.90, source: 'field_survey' },
    { competitorName: 'Djezzy', technology: '4G', latitude: 34.890, longitude: -1.310, estimatedRadiusKm: 2.8, region: 'Tlemcen', confidence: 0.78, source: 'crowdsourced' },
    { competitorName: 'Djezzy', technology: '3G', latitude: 36.200, longitude: 5.410, estimatedRadiusKm: 3.2, region: 'Sétif', confidence: 0.82, source: 'crowdsourced' },
    { competitorName: 'Djezzy', technology: '4G', latitude: 36.490, longitude: 2.820, estimatedRadiusKm: 2.3, region: 'Blida', confidence: 0.87, source: 'field_survey' },
    { competitorName: 'Djezzy', technology: '3G', latitude: 36.730, longitude: 4.050, estimatedRadiusKm: 2.5, region: 'Tizi Ouzou', confidence: 0.80, source: 'crowdsourced' },
    { competitorName: 'Djezzy', technology: '4G', latitude: 31.960, longitude: 5.310, estimatedRadiusKm: 3.5, region: 'Ouargla', confidence: 0.75, source: 'crowdsourced' },
    // Mobilis (9 sites)
    { competitorName: 'Mobilis', technology: '4G', latitude: 36.760, longitude: 3.048, estimatedRadiusKm: 2.8, region: 'Alger Centre', confidence: 0.95, source: 'regulatory_filing' },
    { competitorName: 'Mobilis', technology: '4G', latitude: 35.695, longitude: -0.638, estimatedRadiusKm: 2.5, region: 'Oran', confidence: 0.91, source: 'regulatory_filing' },
    { competitorName: 'Mobilis', technology: '4G', latitude: 36.915, longitude: 7.765, estimatedRadiusKm: 2.3, region: 'Annaba', confidence: 0.89, source: 'regulatory_filing' },
    { competitorName: 'Mobilis', technology: '3G', latitude: 36.365, longitude: 6.620, estimatedRadiusKm: 2.8, region: 'Constantine', confidence: 0.86, source: 'crowdsourced' },
    { competitorName: 'Mobilis', technology: '4G', latitude: 36.480, longitude: 2.835, estimatedRadiusKm: 2.2, region: 'Blida', confidence: 0.93, source: 'field_survey' },
    { competitorName: 'Mobilis', technology: '3G', latitude: 35.570, longitude: 6.175, estimatedRadiusKm: 3.0, region: 'Batna', confidence: 0.77, source: 'crowdsourced' },
    { competitorName: 'Mobilis', technology: '4G', latitude: 36.750, longitude: 5.085, estimatedRadiusKm: 2.4, region: 'Béjaïa', confidence: 0.84, source: 'field_survey' },
    { competitorName: 'Mobilis', technology: '4G', latitude: 34.860, longitude: 5.720, estimatedRadiusKm: 3.8, region: 'Biskra', confidence: 0.72, source: 'crowdsourced' },
    { competitorName: 'Mobilis', technology: '3G', latitude: 36.190, longitude: 5.400, estimatedRadiusKm: 2.6, region: 'Sétif', confidence: 0.81, source: 'crowdsourced' },
    // Ooredoo (7 sites)
    { competitorName: 'Ooredoo', technology: '4G', latitude: 36.748, longitude: 3.063, estimatedRadiusKm: 2.4, region: 'Alger Centre', confidence: 0.94, source: 'field_survey' },
    { competitorName: 'Ooredoo', technology: '4G', latitude: 35.692, longitude: -0.642, estimatedRadiusKm: 2.6, region: 'Oran', confidence: 0.88, source: 'field_survey' },
    { competitorName: 'Ooredoo', technology: '3G', latitude: 36.378, longitude: 6.608, estimatedRadiusKm: 2.9, region: 'Constantine', confidence: 0.83, source: 'crowdsourced' },
    { competitorName: 'Ooredoo', technology: '4G', latitude: 34.875, longitude: -1.325, estimatedRadiusKm: 2.7, region: 'Tlemcen', confidence: 0.80, source: 'crowdsourced' },
    { competitorName: 'Ooredoo', technology: '4G', latitude: 36.210, longitude: 5.395, estimatedRadiusKm: 2.5, region: 'Sétif', confidence: 0.85, source: 'field_survey' },
    { competitorName: 'Ooredoo', technology: '3G', latitude: 36.715, longitude: 4.040, estimatedRadiusKm: 2.3, region: 'Tizi Ouzou', confidence: 0.79, source: 'crowdsourced' },
    { competitorName: 'Ooredoo', technology: '4G', latitude: 31.945, longitude: 5.325, estimatedRadiusKm: 4.0, region: 'Ouargla', confidence: 0.73, source: 'crowdsourced' },
  ];
  await db.geoCompetitorSite.createMany({ data: competitorSitesData });
  console.log(`  GeoCompetitorSites: ${competitorSitesData.length}`);

  // --- GeoChurnCluster (15 clusters) ---
  const churnClusterData = [
    { clusterName: 'Alger Nord-Ouest', region: 'Alger Centre', latitude: 36.770, longitude: 3.035, radiusKm: 4.2, avgChurnRate: 6.8, subscriberCount: 32500, atRiskCount: 2210, severity: 'critical', primaryCause: 'coverage_gap', trendDirection: 'worsening' },
    { clusterName: 'Alger Sud-Est', region: 'Alger Centre', latitude: 36.730, longitude: 3.080, radiusKm: 3.8, avgChurnRate: 4.2, subscriberCount: 28100, atRiskCount: 1180, severity: 'high', primaryCause: 'competitor_pressure', trendDirection: 'stable' },
    { clusterName: 'Oran Centre-Ville', region: 'Oran', latitude: 35.698, longitude: -0.635, radiusKm: 3.5, avgChurnRate: 5.5, subscriberCount: 24600, atRiskCount: 1353, severity: 'high', primaryCause: 'price_sensitivity', trendDirection: 'worsening' },
    { clusterName: 'Oran Est', region: 'Oran', latitude: 35.712, longitude: -0.610, radiusKm: 5.0, avgChurnRate: 3.8, subscriberCount: 19200, atRiskCount: 730, severity: 'medium', primaryCause: 'network_quality', trendDirection: 'improving' },
    { clusterName: 'Constantine Sud', region: 'Constantine', latitude: 36.355, longitude: 6.630, radiusKm: 4.0, avgChurnRate: 5.1, subscriberCount: 21400, atRiskCount: 1091, severity: 'high', primaryCause: 'coverage_gap', trendDirection: 'stable' },
    { clusterName: 'Annaba Industrial', region: 'Annaba', latitude: 36.925, longitude: 7.750, radiusKm: 3.2, avgChurnRate: 7.2, subscriberCount: 15800, atRiskCount: 1138, severity: 'critical', primaryCause: 'network_quality', trendDirection: 'worsening' },
    { clusterName: 'Tlemcen Rural', region: 'Tlemcen', latitude: 34.860, longitude: -1.340, radiusKm: 8.5, avgChurnRate: 4.5, subscriberCount: 12400, atRiskCount: 558, severity: 'medium', primaryCause: 'coverage_gap', trendDirection: 'stable' },
    { clusterName: 'Setif Zone Industriel', region: 'Sétif', latitude: 36.185, longitude: 5.425, radiusKm: 3.8, avgChurnRate: 3.9, subscriberCount: 18600, atRiskCount: 725, severity: 'medium', primaryCause: 'competitor_pressure', trendDirection: 'improving' },
    { clusterName: 'Blida Banlieue', region: 'Blida', latitude: 36.465, longitude: 2.850, radiusKm: 4.5, avgChurnRate: 5.8, subscriberCount: 22100, atRiskCount: 1282, severity: 'high', primaryCause: 'price_sensitivity', trendDirection: 'worsening' },
    { clusterName: 'Batna Peripherie', region: 'Batna', latitude: 35.545, longitude: 6.190, radiusKm: 7.0, avgChurnRate: 6.1, subscriberCount: 14200, atRiskCount: 866, severity: 'critical', primaryCause: 'coverage_gap', trendDirection: 'stable' },
    { clusterName: 'Bejaia Coast', region: 'Béjaïa', latitude: 36.765, longitude: 5.060, radiusKm: 3.0, avgChurnRate: 3.4, subscriberCount: 16800, atRiskCount: 571, severity: 'medium', primaryCause: 'network_quality', trendDirection: 'improving' },
    { clusterName: 'Tizi Ouzou Mountain', region: 'Tizi Ouzou', latitude: 36.700, longitude: 4.070, radiusKm: 6.5, avgChurnRate: 4.8, subscriberCount: 13500, atRiskCount: 648, severity: 'medium', primaryCause: 'coverage_gap', trendDirection: 'stable' },
    { clusterName: 'Biskra Nord', region: 'Biskra', latitude: 34.870, longitude: 5.750, radiusKm: 5.5, avgChurnRate: 5.2, subscriberCount: 11200, atRiskCount: 582, severity: 'high', primaryCause: 'price_sensitivity', trendDirection: 'worsening' },
    { clusterName: 'Ouargla Hassi Messaoud', region: 'Ouargla', latitude: 31.970, longitude: 5.340, radiusKm: 6.0, avgChurnRate: 3.6, subscriberCount: 19500, atRiskCount: 702, severity: 'medium', primaryCause: 'competitor_pressure', trendDirection: 'stable' },
    { clusterName: 'Alger Bab Ezzouar', region: 'Alger Centre', latitude: 36.718, longitude: 3.183, radiusKm: 2.8, avgChurnRate: 2.9, subscriberCount: 28900, atRiskCount: 838, severity: 'low', primaryCause: 'network_quality', trendDirection: 'improving' },
  ];
  await db.geoChurnCluster.createMany({ data: churnClusterData });
  console.log(`  GeoChurnClusters: ${churnClusterData.length}`);

  // --- GeoSiteAcquisition (12 candidate sites) ---
  const siteAcqData = [
    { siteName: 'SA-ALG-001 Hydra', region: 'Alger Centre', latitude: 36.742, longitude: 3.028, overallScore: 92.4, demandScore: 95, competitiveScore: 88, demographicScore: 96, coverageScore: 90, financialScore: 92, estimatedROI: 185, capexEstimate: 45000000, opexAnnual: 3200000, paybackMonths: 14, recommendation: 'deploy', techPriority: '5G' },
    { siteName: 'SA-ALG-002 Kouba', region: 'Alger Centre', latitude: 36.726, longitude: 3.060, overallScore: 87.1, demandScore: 90, competitiveScore: 82, demographicScore: 91, coverageScore: 85, financialScore: 87, estimatedROI: 162, capexEstimate: 42000000, opexAnnual: 2900000, paybackMonths: 16, recommendation: 'deploy', techPriority: '5G' },
    { siteName: 'SA-ORA-001 Bir El Djir', region: 'Oran', latitude: 35.720, longitude: -0.600, overallScore: 83.5, demandScore: 86, competitiveScore: 80, demographicScore: 85, coverageScore: 82, financialScore: 84, estimatedROI: 148, capexEstimate: 38000000, opexAnnual: 2700000, paybackMonths: 18, recommendation: 'deploy', techPriority: '4G' },
    { siteName: 'SA-CST-001 Ali Mendjeli', region: 'Constantine', latitude: 36.345, longitude: 6.650, overallScore: 78.2, demandScore: 80, competitiveScore: 75, demographicScore: 79, coverageScore: 78, financialScore: 79, estimatedROI: 130, capexEstimate: 35000000, opexAnnual: 2500000, paybackMonths: 20, recommendation: 'deploy', techPriority: '4G' },
    { siteName: 'SA-ANB-001 El Bouni', region: 'Annaba', latitude: 36.935, longitude: 7.730, overallScore: 75.8, demandScore: 78, competitiveScore: 72, demographicScore: 76, coverageScore: 76, financialScore: 77, estimatedROI: 122, capexEstimate: 33000000, opexAnnual: 2400000, paybackMonths: 21, recommendation: 'review', techPriority: '4G' },
    { siteName: 'SA-TLM-001 Remchi', region: 'Tlemcen', latitude: 34.850, longitude: -1.280, overallScore: 68.4, demandScore: 70, competitiveScore: 65, demographicScore: 68, coverageScore: 70, financialScore: 69, estimatedROI: 98, capexEstimate: 28000000, opexAnnual: 2100000, paybackMonths: 26, recommendation: 'review', techPriority: '4G' },
    { siteName: 'SA-SET-001 Bouandas', region: 'Sétif', latitude: 36.220, longitude: 5.360, overallScore: 72.6, demandScore: 74, competitiveScore: 70, demographicScore: 72, coverageScore: 74, financialScore: 73, estimatedROI: 112, capexEstimate: 31000000, opexAnnual: 2300000, paybackMonths: 23, recommendation: 'review', techPriority: '4G' },
    { siteName: 'SA-BLD-001 Boufarik', region: 'Blida', latitude: 36.510, longitude: 2.880, overallScore: 80.3, demandScore: 82, competitiveScore: 78, demographicScore: 82, coverageScore: 80, financialScore: 80, estimatedROI: 140, capexEstimate: 36000000, opexAnnual: 2600000, paybackMonths: 19, recommendation: 'deploy', techPriority: '5G' },
    { siteName: "SA-BTN-001 N'Gaous", region: 'Batna', latitude: 35.590, longitude: 6.230, overallScore: 58.2, demandScore: 60, competitiveScore: 55, demographicScore: 58, coverageScore: 60, financialScore: 58, estimatedROI: 72, capexEstimate: 24000000, opexAnnual: 1900000, paybackMonths: 32, recommendation: 'defer', techPriority: '3G' },
    { siteName: 'SA-BJA-001 Kherrata', region: 'Béjaïa', latitude: 36.780, longitude: 5.040, overallScore: 64.1, demandScore: 66, competitiveScore: 62, demographicScore: 64, coverageScore: 66, financialScore: 63, estimatedROI: 88, capexEstimate: 26000000, opexAnnual: 2000000, paybackMonths: 28, recommendation: 'review', techPriority: '4G' },
    { siteName: 'SA-BSK-001 Tolga', region: 'Biskra', latitude: 34.720, longitude: 5.380, overallScore: 52.8, demandScore: 55, competitiveScore: 48, demographicScore: 52, coverageScore: 56, financialScore: 52, estimatedROI: 60, capexEstimate: 22000000, opexAnnual: 1800000, paybackMonths: 36, recommendation: 'defer', techPriority: '3G' },
    { siteName: 'SA-WRG-001 Hassi Messaoud Sud', region: 'Ouargla', latitude: 31.920, longitude: 5.380, overallScore: 76.5, demandScore: 80, competitiveScore: 72, demographicScore: 68, coverageScore: 82, financialScore: 80, estimatedROI: 135, capexEstimate: 40000000, opexAnnual: 3000000, paybackMonths: 22, recommendation: 'deploy', techPriority: '4G' },
  ];
  await db.geoSiteAcquisition.createMany({ data: siteAcqData });
  console.log(`  GeoSiteAcquisitions: ${siteAcqData.length}`);

  // --- RevenueImpact (18 zones) ---
  const revenueImpactData = [
    { zoneName: 'RI-ALG-001 Bab El Oued', region: 'Alger', latitude: 36.793, longitude: 3.062, totalSubscribers: 42500, affectedSubscribers: 8930, avgArpu: 2800, churnProbability: 0.32, monthlyRevenueAtRisk: 8017680, annualRevenueAtRisk: 96212160, degradationCause: 'coverage_gap', severity: 'critical', primaryKpi: 'RSRP', kpiBaseline: -95, kpiCurrent: -118, kpiDelta: -23, trendDirection: 'worsening', recommendedAction: 'new_site', estimatedFixCost: 45000000, priorityScore: 96.5, roiRatio: 2.14 },
    { zoneName: 'RI-ALG-002 Hussein Dey', region: 'Alger', latitude: 36.730, longitude: 3.082, totalSubscribers: 38000, affectedSubscribers: 6460, avgArpu: 2500, churnProbability: 0.24, monthlyRevenueAtRisk: 3876000, annualRevenueAtRisk: 46512000, degradationCause: 'capacity_exhaustion', severity: 'high', primaryKpi: 'PRB Utilization', kpiBaseline: 62, kpiCurrent: 89, kpiDelta: 27, trendDirection: 'worsening', recommendedAction: 'add_carrier', estimatedFixCost: 12000000, priorityScore: 89.2, roiRatio: 3.88 },
    { zoneName: 'RI-ALG-003 Bir Mourad Raïs', region: 'Alger', latitude: 36.748, longitude: 3.038, totalSubscribers: 31000, affectedSubscribers: 3410, avgArpu: 3200, churnProbability: 0.15, monthlyRevenueAtRisk: 1636800, annualRevenueAtRisk: 19641600, degradationCause: 'interference', severity: 'medium', primaryKpi: 'SINR', kpiBaseline: 8.5, kpiCurrent: 2.1, kpiDelta: -6.4, trendDirection: 'stable', recommendedAction: 'optimize', estimatedFixCost: 2500000, priorityScore: 72.8, roiRatio: 7.86 },
    { zoneName: 'RI-ORN-001 Es Senia', region: 'Oran', latitude: 35.685, longitude: -0.615, totalSubscribers: 36000, affectedSubscribers: 7920, avgArpu: 2400, churnProbability: 0.35, monthlyRevenueAtRisk: 6652800, annualRevenueAtRisk: 79833600, degradationCause: 'coverage_gap', severity: 'critical', primaryKpi: 'RSRP', kpiBaseline: -92, kpiCurrent: -115, kpiDelta: -23, trendDirection: 'worsening', recommendedAction: 'new_site', estimatedFixCost: 38000000, priorityScore: 93.1, roiRatio: 2.10 },
    { zoneName: 'RI-ORN-002 Bir El Djir', region: 'Oran', latitude: 35.715, longitude: -0.565, totalSubscribers: 28000, affectedSubscribers: 3920, avgArpu: 2200, churnProbability: 0.22, monthlyRevenueAtRisk: 1892800, annualRevenueAtRisk: 22713600, degradationCause: 'capacity_exhaustion', severity: 'high', primaryKpi: 'Throughput DL', kpiBaseline: 35, kpiCurrent: 8.2, kpiDelta: -26.8, trendDirection: 'stable', recommendedAction: 'add_carrier', estimatedFixCost: 10000000, priorityScore: 82.5, roiRatio: 2.27 },
    { zoneName: 'RI-ORN-003 Arzew', region: 'Oran', latitude: 35.855, longitude: -0.325, totalSubscribers: 15000, affectedSubscribers: 1800, avgArpu: 1800, churnProbability: 0.18, monthlyRevenueAtRisk: 583200, annualRevenueAtRisk: 6998400, degradationCause: 'outage', severity: 'high', primaryKpi: 'Availability', kpiBaseline: 99.5, kpiCurrent: 91.2, kpiDelta: -8.3, trendDirection: 'improving', recommendedAction: 'repair', estimatedFixCost: 3500000, priorityScore: 76.3, roiRatio: 2.00 },
    { zoneName: 'RI-CST-001 Ali Mendjeli', region: 'Constantine', latitude: 36.395, longitude: 6.645, totalSubscribers: 32000, affectedSubscribers: 5440, avgArpu: 2100, churnProbability: 0.28, monthlyRevenueAtRisk: 3199200, annualRevenueAtRisk: 38390400, degradationCause: 'coverage_gap', severity: 'high', primaryKpi: 'RSRP', kpiBaseline: -94, kpiCurrent: -112, kpiDelta: -18, trendDirection: 'worsening', recommendedAction: 'new_site', estimatedFixCost: 35000000, priorityScore: 87.6, roiRatio: 1.10 },
    { zoneName: 'RI-CST-002 Zouaghi', region: 'Constantine', latitude: 36.350, longitude: 6.590, totalSubscribers: 24000, affectedSubscribers: 2640, avgArpu: 1900, churnProbability: 0.20, monthlyRevenueAtRisk: 1003200, annualRevenueAtRisk: 12038400, degradationCause: 'quality_degradation', severity: 'medium', primaryKpi: 'RSRQ', kpiBaseline: -10, kpiCurrent: -17, kpiDelta: -7, trendDirection: 'stable', recommendedAction: 'optimize', estimatedFixCost: 2000000, priorityScore: 71.2, roiRatio: 6.02 },
    { zoneName: 'RI-ANB-001 El Bouni', region: 'Annaba', latitude: 36.940, longitude: 7.780, totalSubscribers: 21000, affectedSubscribers: 3150, avgArpu: 2000, churnProbability: 0.25, monthlyRevenueAtRisk: 1575000, annualRevenueAtRisk: 18900000, degradationCause: 'interference', severity: 'high', primaryKpi: 'SINR', kpiBaseline: 9.0, kpiCurrent: 1.5, kpiDelta: -7.5, trendDirection: 'worsening', recommendedAction: 'pci_replan', estimatedFixCost: 800000, priorityScore: 80.4, roiRatio: 23.63 },
    { zoneName: 'RI-SET-001 Ain Arnat', region: 'Sétif', latitude: 36.175, longitude: 5.410, totalSubscribers: 27000, affectedSubscribers: 2970, avgArpu: 1900, churnProbability: 0.18, monthlyRevenueAtRisk: 1015200, annualRevenueAtRisk: 12182400, degradationCause: 'capacity_exhaustion', severity: 'medium', primaryKpi: 'PRB Utilization', kpiBaseline: 58, kpiCurrent: 84, kpiDelta: 26, trendDirection: 'worsening', recommendedAction: 'add_carrier', estimatedFixCost: 9000000, priorityScore: 74.8, roiRatio: 1.35 },
    { zoneName: 'RI-TLM-001 Remchi', region: 'Tlemcen', latitude: 34.835, longitude: -1.450, totalSubscribers: 18000, affectedSubscribers: 3240, avgArpu: 1600, churnProbability: 0.30, monthlyRevenueAtRisk: 1555200, annualRevenueAtRisk: 18662400, degradationCause: 'coverage_gap', severity: 'high', primaryKpi: 'RSRP', kpiBaseline: -90, kpiCurrent: -113, kpiDelta: -23, trendDirection: 'stable', recommendedAction: 'new_site', estimatedFixCost: 32000000, priorityScore: 81.6, roiRatio: 0.58 },
    { zoneName: 'RI-TLM-002 Maghnia', region: 'Tlemcen', latitude: 34.820, longitude: -1.720, totalSubscribers: 22000, affectedSubscribers: 2860, avgArpu: 1700, churnProbability: 0.22, monthlyRevenueAtRisk: 1070400, annualRevenueAtRisk: 12844800, degradationCause: 'quality_degradation', severity: 'medium', primaryKpi: 'Call Setup SR', kpiBaseline: 98.5, kpiCurrent: 89.2, kpiDelta: -9.3, trendDirection: 'stable', recommendedAction: 'optimize', estimatedFixCost: 3000000, priorityScore: 73.9, roiRatio: 4.28 },
    { zoneName: 'RI-TZM-001 Azazga', region: 'Tizi Ouzou', latitude: 36.710, longitude: 4.120, totalSubscribers: 16000, affectedSubscribers: 2240, avgArpu: 1800, churnProbability: 0.24, monthlyRevenueAtRisk: 966720, annualRevenueAtRisk: 11600640, degradationCause: 'coverage_gap', severity: 'medium', primaryKpi: 'RSRP', kpiBaseline: -93, kpiCurrent: -110, kpiDelta: -17, trendDirection: 'worsening', recommendedAction: 'upgrade_site', estimatedFixCost: 18000000, priorityScore: 75.1, roiRatio: 0.64 },
    { zoneName: 'RI-BJA-001 Tichy', region: 'Béjaïa', latitude: 36.620, longitude: 5.080, totalSubscribers: 14000, affectedSubscribers: 1400, avgArpu: 1700, churnProbability: 0.14, monthlyRevenueAtRisk: 333200, annualRevenueAtRisk: 3998400, degradationCause: 'quality_degradation', severity: 'low', primaryKpi: 'RSRQ', kpiBaseline: -9, kpiCurrent: -14, kpiDelta: -5, trendDirection: 'improving', recommendedAction: 'optimize', estimatedFixCost: 1500000, priorityScore: 58.3, roiRatio: 2.67 },
    { zoneName: 'RI-BTN-001 N\'Gaous', region: 'Batna', latitude: 35.570, longitude: 6.210, totalSubscribers: 12000, affectedSubscribers: 2160, avgArpu: 1400, churnProbability: 0.32, monthlyRevenueAtRisk: 967680, annualRevenueAtRisk: 11612160, degradationCause: 'coverage_gap', severity: 'critical', primaryKpi: 'RSRP', kpiBaseline: -88, kpiCurrent: -120, kpiDelta: -32, trendDirection: 'worsening', recommendedAction: 'new_site', estimatedFixCost: 28000000, priorityScore: 84.2, roiRatio: 0.41 },
    { zoneName: 'RI-BSK-001 Tolga', region: 'Biskra', latitude: 34.720, longitude: 5.380, totalSubscribers: 13000, affectedSubscribers: 1690, avgArpu: 1500, churnProbability: 0.20, monthlyRevenueAtRisk: 507000, annualRevenueAtRisk: 6084000, degradationCause: 'capacity_exhaustion', severity: 'medium', primaryKpi: 'Throughput DL', kpiBaseline: 30, kpiCurrent: 9.5, kpiDelta: -20.5, trendDirection: 'stable', recommendedAction: 'add_carrier', estimatedFixCost: 8000000, priorityScore: 65.7, roiRatio: 0.76 },
    { zoneName: 'RI-WRG-001 Hassi Messaoud', region: 'Ouargla', latitude: 31.920, longitude: 5.380, totalSubscribers: 19000, affectedSubscribers: 3230, avgArpu: 3500, churnProbability: 0.28, monthlyRevenueAtRisk: 3162800, annualRevenueAtRisk: 37953600, degradationCause: 'coverage_gap', severity: 'high', primaryKpi: 'RSRP', kpiBaseline: -91, kpiCurrent: -114, kpiDelta: -23, trendDirection: 'worsening', recommendedAction: 'new_site', estimatedFixCost: 42000000, priorityScore: 90.4, roiRatio: 0.90 },
    { zoneName: 'RI-BLD-001 Boufarik', region: 'Blida', latitude: 36.565, longitude: 2.910, totalSubscribers: 25000, affectedSubscribers: 2750, avgArpu: 2100, churnProbability: 0.19, monthlyRevenueAtRisk: 1097250, annualRevenueAtRisk: 13167000, degradationCause: 'interference', severity: 'medium', primaryKpi: 'SINR', kpiBaseline: 7.8, kpiCurrent: 1.2, kpiDelta: -6.6, trendDirection: 'stable', recommendedAction: 'pci_replan', estimatedFixCost: 1200000, priorityScore: 70.5, roiRatio: 10.97 },
  ];
  await db.revenueImpact.createMany({ data: revenueImpactData });
  console.log(`  RevenueImpact: ${revenueImpactData.length}`);

  // --- GeoCoverageGap (15 coverage gaps) ---
  const coverageGapData = [
    { gapName: 'CG-ALG-001 Bab El Oued Est', region: 'Alger', latitude: 36.793, longitude: 3.062, radiusKm: 3.2, populationServed: 85000, coveragePct: 42, gapSeverity: 'critical', currentSites: 2, requiredSites: 5, estimatedRevenue: 320000000, priorityScore: 94.2, technology: '5G', recommendedAction: 'new_site' },
    { gapName: 'CG-ALG-002 Hussein Dey Sud', region: 'Alger', latitude: 36.730, longitude: 3.082, radiusKm: 2.8, populationServed: 62000, coveragePct: 48, gapSeverity: 'high', currentSites: 3, requiredSites: 5, estimatedRevenue: 240000000, priorityScore: 88.5, technology: '5G', recommendedAction: 'upgrade_site' },
    { gapName: 'CG-ORN-001 Es Senia Ouest', region: 'Oran', latitude: 35.685, longitude: -0.615, radiusKm: 4.5, populationServed: 72000, coveragePct: 38, gapSeverity: 'critical', currentSites: 1, requiredSites: 4, estimatedRevenue: 210000000, priorityScore: 91.8, technology: '4G', recommendedAction: 'new_site' },
    { gapName: 'CG-ORN-002 Bir El Djir', region: 'Oran', latitude: 35.715, longitude: -0.565, radiusKm: 3.8, populationServed: 55000, coveragePct: 52, gapSeverity: 'high', currentSites: 2, requiredSites: 4, estimatedRevenue: 180000000, priorityScore: 82.4, technology: '4G', recommendedAction: 'new_site' },
    { gapName: 'CG-CST-001 Ali Mendjeli Nord', region: 'Constantine', latitude: 36.395, longitude: 6.645, radiusKm: 3.5, populationServed: 48000, coveragePct: 45, gapSeverity: 'high', currentSites: 2, requiredSites: 4, estimatedRevenue: 155000000, priorityScore: 85.1, technology: '4G', recommendedAction: 'new_site' },
    { gapName: 'CG-CST-002 Zouaghi Slimane', region: 'Constantine', latitude: 36.350, longitude: 6.590, radiusKm: 4.0, populationServed: 38000, coveragePct: 55, gapSeverity: 'medium', currentSites: 2, requiredSites: 3, estimatedRevenue: 110000000, priorityScore: 72.3, technology: '3G', recommendedAction: 'upgrade_site' },
    { gapName: 'CG-ANB-001 El Bouni Est', region: 'Annaba', latitude: 36.940, longitude: 7.780, radiusKm: 3.0, populationServed: 42000, coveragePct: 50, gapSeverity: 'medium', currentSites: 2, requiredSites: 3, estimatedRevenue: 130000000, priorityScore: 76.8, technology: '4G', recommendedAction: 'new_site' },
    { gapName: 'CG-TLM-001 Remchi', region: 'Tlemcen', latitude: 34.835, longitude: -1.450, radiusKm: 5.2, populationServed: 35000, coveragePct: 35, gapSeverity: 'high', currentSites: 1, requiredSites: 3, estimatedRevenue: 95000000, priorityScore: 79.6, technology: '3G', recommendedAction: 'new_site' },
    { gapName: 'CG-TLM-002 Maghnia Sud', region: 'Tlemcen', latitude: 34.820, longitude: -1.720, radiusKm: 4.8, populationServed: 52000, coveragePct: 40, gapSeverity: 'high', currentSites: 1, requiredSites: 3, estimatedRevenue: 125000000, priorityScore: 83.2, technology: '4G', recommendedAction: 'new_site' },
    { gapName: 'CG-SET-001 Ain Arnat', region: 'Sétif', latitude: 36.175, longitude: 5.410, radiusKm: 4.0, populationServed: 45000, coveragePct: 47, gapSeverity: 'medium', currentSites: 2, requiredSites: 3, estimatedRevenue: 140000000, priorityScore: 74.5, technology: '4G', recommendedAction: 'upgrade_site' },
    { gapName: 'CG-BJA-001 Tichy', region: 'Béjaïa', latitude: 36.620, longitude: 5.080, radiusKm: 3.5, populationServed: 30000, coveragePct: 58, gapSeverity: 'low', currentSites: 2, requiredSites: 3, estimatedRevenue: 80000000, priorityScore: 62.1, technology: '3G', recommendedAction: 'optimize' },
    { gapName: "CG-BTN-001 N'Gaous Sud", region: 'Batna', latitude: 35.570, longitude: 6.210, radiusKm: 5.5, populationServed: 28000, coveragePct: 32, gapSeverity: 'critical', currentSites: 1, requiredSites: 3, estimatedRevenue: 70000000, priorityScore: 78.4, technology: '3G', recommendedAction: 'new_site' },
    { gapName: 'CG-BSK-001 Tolga Est', region: 'Biskra', latitude: 34.700, longitude: 5.420, radiusKm: 6.0, populationServed: 40000, coveragePct: 36, gapSeverity: 'high', currentSites: 1, requiredSites: 3, estimatedRevenue: 105000000, priorityScore: 81.7, technology: '4G', recommendedAction: 'new_site' },
    { gapName: 'CG-WRG-001 Touggourt', region: 'Ouargla', latitude: 33.100, longitude: 6.060, radiusKm: 7.0, populationServed: 33000, coveragePct: 30, gapSeverity: 'critical', currentSites: 1, requiredSites: 3, estimatedRevenue: 90000000, priorityScore: 80.3, technology: '4G', recommendedAction: 'new_site' },
    { gapName: 'CG-TZM-001 Azazga', region: 'Tizi Ouzou', latitude: 36.710, longitude: 4.120, radiusKm: 3.2, populationServed: 25000, coveragePct: 44, gapSeverity: 'medium', currentSites: 1, requiredSites: 2, estimatedRevenue: 65000000, priorityScore: 68.9, technology: '4G', recommendedAction: 'upgrade_site' },
  ];
  await db.geoCoverageGap.createMany({ data: coverageGapData });
  console.log(`  GeoCoverageGaps: ${coverageGapData.length}`);
  console.log('  ✅ Geomarketing seeded!');

  // ========== RBAC SEED ==========
  console.log('\n  Seeding RBAC (roles, permissions, users)...');
  await seedRbac();
  console.log('  ✅ RBAC seeded!');

  console.log('\n✅ Seed complete!');
  console.log(`  Total records: Sites(${created.length}) + KPI(${kpiCount}) + Rules(${rules.length}) + Alerts(${alerts.length}) + OptLogs(${optLogs.length}) + Params(${params.length}) + SLA(${slaTargets.length}) + Anomalies(${anomalyData.length}) + Audit(8) + SonModules(${sonModules.length}) + SonActions(${sonActions.length}) + Neighbors(${neighborCount}) + Policies(${policies.length}) + Executions(${execData.length}) + Vendors(${vendorProfilesData.length}) + Onboardings(${onboardingsData.length}) + QoE(${qoeBatch.length}) + CapacityForecast(${capacityBatch.length}) + NetworkSlice(${networkSliceBatch.length}) + EnergyMetric(${energyBatch.length}) + FaultPrediction(${fpBatch.length}) + SubscriberSegment(${subscriberBatch.length}) + Incident(${incidentBatch.length}) + ConfigTemplate(${configTemplates.length}) + HealthScore(${healthScoresData.length}) + BenchmarkRecord(${benchmarkData.length}) + HandoverKpi(${handoverData.length}) + CellLoad(${cellLoadData.length}) + InterferenceEvent(${interferenceData.length}) + CoverageHole(${coverageHoleData.length}) + ChangeRequest(${changeRequestData.length}) + OutageEvent(${outageData.length}) + Playbook(${playbookCount}) + PlaybookStep(${stepCount}) + Simulation(${simulationData.length}) + TrendForecast(${trendData.length}) + RoiRecord(${roiData.length}) + SpectrumBlock(${spectrumData.length}) + EvolutionPlan(${evolutionData.length}) + NpiRecord(${npiData.length}) + ServiceOrchestration(${serviceData.length}) + AuditTrail(${auditData.length}) + AiAgent(${aiAgentData.length}) + ExternalIntegration(6) + DataPipeline(8) + OssNetworkElement(${neData.length}) + OssFaultEvent(${faultData.length}) + CrmCustomer(${crmData.length}) + BillingInvoice(${invoiceData.length}) + GeoDemographic(${geoDemoData.length}) + GeoRevenueZone(${revenueZoneData.length}) + GeoCompetitorSite(${competitorSitesData.length}) + GeoChurnCluster(${churnClusterData.length}) + GeoSiteAcquisition(${siteAcqData.length}) + GeoCoverageGap(${coverageGapData.length}) + RevenueImpact(${revenueImpactData.length}) + WilayaProfile(${wilayaProfileData.length})`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());