import { db } from '../src/lib/db';
import { subHours, subMinutes } from 'date-fns';
import { seedRbac } from '../src/lib/rbac';

const regions = ['Alger Centre', 'Oran Métropole', 'Constantine', 'Annaba', 'Sétif', 'Blida', 'Tlemcen', 'Tizi Ouzou', 'Batna', 'Béjaïa', 'Djelfa', 'Skikda', 'Tébessa', 'Ouargla', 'Biskra', 'Ghardaïa', 'Mostaganem', 'M\'sila', 'Médéa', 'Bouira'];
const vendors = ['Ericsson', 'Huawei', 'Nokia', 'ZTE'];

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
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

  // ========== RBAC SEED ==========
  console.log('\n  Seeding RBAC (roles, permissions, users)...');
  await seedRbac();
  console.log('  ✅ RBAC seeded!');

  console.log('\n✅ Seed complete!');
  console.log(`  Total records: Sites(${created.length}) + KPI(${kpiCount}) + Rules(${rules.length}) + Alerts(${alerts.length}) + OptLogs(${optLogs.length}) + Params(${params.length}) + SLA(${slaTargets.length}) + Anomalies(${anomalyData.length}) + Audit(8) + SonModules(${sonModules.length}) + SonActions(${sonActions.length}) + Neighbors(${neighborCount}) + Policies(${policies.length}) + Executions(${execData.length}) + Vendors(${vendorProfilesData.length}) + Onboardings(${onboardingsData.length}) + QoE(${qoeBatch.length}) + CapacityForecast(${capacityBatch.length}) + NetworkSlice(${networkSliceBatch.length}) + EnergyMetric(${energyBatch.length}) + FaultPrediction(${fpBatch.length}) + SubscriberSegment(${subscriberBatch.length}) + Incident(${incidentBatch.length}) + ConfigTemplate(${configTemplates.length}) + HealthScore(${healthScoresData.length}) + BenchmarkRecord(${benchmarkData.length}) + HandoverKpi(${handoverData.length}) + CellLoad(${cellLoadData.length}) + InterferenceEvent(${interferenceData.length}) + CoverageHole(${coverageHoleData.length}) + ChangeRequest(${changeRequestData.length}) + OutageEvent(${outageData.length}) + Playbook(${playbookCount}) + PlaybookStep(${stepCount}) + Simulation(${simulationData.length}) + TrendForecast(${trendData.length}) + RoiRecord(${roiData.length}) + SpectrumBlock(${spectrumData.length}) + EvolutionPlan(${evolutionData.length}) + NpiRecord(${npiData.length}) + ServiceOrchestration(${serviceData.length}) + AuditTrail(${auditData.length})`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());