import { db } from '../src/lib/db';
import { subHours, subMinutes } from 'date-fns';

const regions = ['Lagos Mainland', 'Lagos Island', 'Abuja Central', 'Port Harcourt', 'Kano Metro', 'Ibadan', 'Benin City', 'Kaduna'];
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
  { name: 'GSM-LG-001', code: 'LG001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 80, lat: 6.524, lng: 3.379, alt: 45 },
  { name: 'GSM-LG-002', code: 'LG002G', tech: '2G', freq: '1800MHz', bw: 0.2, cap: 120, lat: 6.451, lng: 3.395, alt: 52 },
  { name: 'GSM-AB-001', code: 'AB001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 100, lat: 9.057, lng: 7.495, alt: 55 },
  { name: 'GSM-PH-001', code: 'PH001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 90, lat: 4.815, lng: 7.049, alt: 30 },
  { name: 'GSM-KN-001', code: 'KN001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 85, lat: 12.002, lng: 8.592, alt: 48 },
  { name: 'GSM-IB-001', code: 'IB001G', tech: '2G', freq: '1800MHz', bw: 0.2, cap: 110, lat: 7.377, lng: 3.947, alt: 42 },
  { name: 'GSM-BN-001', code: 'BN001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 90, lat: 6.335, lng: 5.627, alt: 35 },
  { name: 'GSM-KD-001', code: 'KD001G', tech: '2G', freq: '900MHz', bw: 0.2, cap: 80, lat: 10.610, lng: 7.432, alt: 55 },
  // 3G (8 sites)
  { name: 'UMTS-LG-001', code: 'LG001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 6.524, lng: 3.381, alt: 45 },
  { name: 'UMTS-LG-002', code: 'LG002U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 6.451, lng: 3.397, alt: 52 },
  { name: 'UMTS-AB-001', code: 'AB001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 9.057, lng: 7.497, alt: 55 },
  { name: 'UMTS-PH-001', code: 'PH001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 4.815, lng: 7.051, alt: 30 },
  { name: 'UMTS-KN-001', code: 'KN001U', tech: '3G', freq: '900MHz', bw: 5, cap: 256, lat: 12.002, lng: 8.594, alt: 48 },
  { name: 'UMTS-IB-001', code: 'IB001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 7.377, lng: 3.949, alt: 42 },
  { name: 'UMTS-BN-001', code: 'BN001U', tech: '3G', freq: '2100MHz', bw: 5, cap: 384, lat: 6.335, lng: 5.629, alt: 35 },
  { name: 'UMTS-KD-001', code: 'KD001U', tech: '3G', freq: '900MHz', bw: 5, cap: 256, lat: 10.610, lng: 7.434, alt: 55 },
  // 4G (12 sites)
  { name: 'LTE-LG-001', code: 'LG001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 6.524, lng: 3.383, alt: 45 },
  { name: 'LTE-LG-002', code: 'LG002L', tech: '4G', freq: '2600MHz', bw: 20, cap: 200, lat: 6.451, lng: 3.399, alt: 52 },
  { name: 'LTE-LG-003', code: 'LG003L', tech: '4G', freq: '800MHz', bw: 10, cap: 75, lat: 6.595, lng: 3.345, alt: 38 },
  { name: 'LTE-LG-004', code: 'LG004L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 6.470, lng: 3.410, alt: 50 },
  { name: 'LTE-AB-001', code: 'AB001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 9.057, lng: 7.499, alt: 55 },
  { name: 'LTE-AB-002', code: 'AB002L', tech: '4G', freq: '2600MHz', bw: 20, cap: 200, lat: 9.024, lng: 7.485, alt: 60 },
  { name: 'LTE-PH-001', code: 'PH001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 4.815, lng: 7.053, alt: 30 },
  { name: 'LTE-PH-002', code: 'PH002L', tech: '4G', freq: '800MHz', bw: 10, cap: 75, lat: 4.790, lng: 7.030, alt: 25 },
  { name: 'LTE-KN-001', code: 'KN001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 12.002, lng: 8.596, alt: 48 },
  { name: 'LTE-IB-001', code: 'IB001L', tech: '4G', freq: '1800MHz', bw: 20, cap: 150, lat: 7.377, lng: 3.951, alt: 42 },
  { name: 'LTE-IB-002', code: 'IB002L', tech: '4G', freq: '800MHz', bw: 10, cap: 75, lat: 7.390, lng: 3.920, alt: 40 },
  { name: 'LTE-BN-001', code: 'BN001L', tech: '4G', freq: '1800MHz', bw: 15, cap: 120, lat: 6.335, lng: 5.631, alt: 35 },
  // 5G (6 sites)
  { name: 'NR-LG-001', code: 'LG001N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 6.524, lng: 3.385, alt: 45 },
  { name: 'NR-LG-002', code: 'LG002N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 6.451, lng: 3.401, alt: 52 },
  { name: 'NR-LG-003', code: 'LG003N', tech: '5G', freq: '2600MHz', bw: 80, cap: 800, lat: 6.595, lng: 3.347, alt: 38 },
  { name: 'NR-AB-001', code: 'AB001N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 9.057, lng: 7.501, alt: 55 },
  { name: 'NR-AB-002', code: 'AB002N', tech: '5G', freq: '3500MHz', bw: 100, cap: 1000, lat: 9.024, lng: 7.487, alt: 60 },
  { name: 'NR-PH-001', code: 'PH001N', tech: '5G', freq: '3500MHz', bw: 80, cap: 800, lat: 4.815, lng: 7.055, alt: 30 },
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

  // Seed KPI - 6 hours, 30-min intervals = 12 points per site
  console.log('Seeding KPI metrics...');
  const now = new Date();
  let kpiCount = 0;
  for (let i = 0; i < 12; i++) {
    const ts = subMinutes(now, i * 30);
    const batch: any[] = [];
    for (const site of created) {
      batch.push(genKpi(site.id, site.technology, ts));
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
  for (let i = 0; i < 20; i++) {
    const site = pick(created);
    const sev = pick(['critical', 'warning', 'info']);
    alerts.push({
      siteId: site.id, technology: site.technology, metric: pick(['rsrp', 'sinr', 'latency', 'dropRate', 'availability', 'prbUtilization']),
      value: rand(-115, 200), threshold: rand(-105, 90), condition: pick(['lt', 'gt']),
      severity: sev, message: pick(msgs), acknowledged: Math.random() > 0.5,
      resolvedAt: Math.random() > 0.4 ? subHours(now, randInt(1, 48)) : null,
      createdAt: subHours(now, randInt(0, 72)),
    });
  }
  await db.alert.createMany({ data: alerts });
  console.log(`  Alerts: ${alerts.length}`);

  // Seed optimization logs
  console.log('Seeding optimization logs...');
  const optLogs = [
    { tech: '4G', cat: 'coverage', issue: 'Weak RSRP coverage gap in Lagos Mainland', rec: 'Adjust antenna tilt from 6° to 4° and increase RS power by 3dB. Consider adding a small cell.', impact: 'high', status: 'implemented' },
    { tech: '5G', cat: 'interference', issue: 'High interference on 3500MHz in Abuja', rec: 'PCI re-planning to eliminate conflicts. Enable ICIC and adjust power control parameters.', impact: 'high', status: 'pending' },
    { tech: '4G', cat: 'capacity', issue: 'PRB utilization exceeding 85% at peak hours', rec: 'Enable carrier aggregation Band 3 + Band 7. Deploy additional carriers and optimize load balancing.', impact: 'high', status: 'pending' },
    { tech: '3G', cat: 'handover', issue: 'Low handover success rate in Port Harcourt', rec: 'Increase hysteresis to 3dB, adjust time-to-trigger to 320ms. Review neighbor cell list.', impact: 'medium', status: 'implemented' },
    { tech: '2G', cat: 'parameter', issue: 'High call blocking rate in Kano', rec: 'Reduce half-rate threshold for peak hours. Review frequency plan and channel allocation.', impact: 'medium', status: 'dismissed' },
    { tech: '5G', cat: 'coverage', issue: '5G NR coverage limited to 200m from gNB', rec: 'Increase TX power by 2dB and review beamforming. Consider 700MHz for extended coverage.', impact: 'high', status: 'pending' },
    { tech: '4G', cat: 'interference', issue: 'Co-channel interference LTE-LG-002 and LTE-LG-004', rec: 'Implement eICIC with ABS patterns. Adjust antenna azimuth to minimize overlap.', impact: 'medium', status: 'implemented' },
    { tech: '3G', cat: 'capacity', issue: 'HSUPA throughput degradation in Ibadan', rec: 'Increase HSUPA channel allocation. Consider upgrading to DC-HSPA+.', impact: 'medium', status: 'pending' },
    { tech: '4G', cat: 'parameter', issue: 'Suboptimal PCI assignment causing PSS/SSS conflicts', rec: 'Re-plan PCI ensuring adequate modulus-3 and modulus-30 separation.', impact: 'high', status: 'pending' },
    { tech: '5G', cat: 'handover', issue: '5G to 4G inter-RAT handover failures', rec: 'Optimize A2/B2 event thresholds for NR-LTE handover. Review NSA DC config.', impact: 'high', status: 'pending' },
    { tech: '4G', cat: 'coverage', issue: 'Indoor coverage deficiency in Lagos high-rises', rec: 'Deploy indoor DAS or small cells. Configure dedicated indoor carriers.', impact: 'medium', status: 'pending' },
    { tech: '3G', cat: 'interference', issue: 'Pilot pollution in Kaduna city center', rec: 'Reduce pilot power by 3-6dB. Optimize antenna downtilt and azimuth.', impact: 'medium', status: 'implemented' },
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
  for (let i = 0; i < 15; i++) {
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
    // LG001L (idx 0) — 6 neighbors
    { servingIdx: 0, neighborIdx: 1, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 0, neighborIdx: 2, relType: 'intra_freq', hoType: 'manual' },
    { servingIdx: 0, neighborIdx: 3, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 0, neighborIdx: 4, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 0, neighborIdx: 6, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 0, neighborIdx: 9, relType: 'inter_freq', hoType: 'pnp_auto' },
    // LG002L (idx 1) — 5 neighbors
    { servingIdx: 1, neighborIdx: 0, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 1, neighborIdx: 3, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 1, neighborIdx: 5, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 1, neighborIdx: 2, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 1, neighborIdx: 4, relType: 'intra_freq', hoType: 'manual' },
    // LG003L (idx 2) — 4 neighbors
    { servingIdx: 2, neighborIdx: 0, relType: 'intra_freq', hoType: 'manual' },
    { servingIdx: 2, neighborIdx: 1, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 2, neighborIdx: 3, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 2, neighborIdx: 10, relType: 'intra_freq', hoType: 'pnp_auto' },
    // LG004L (idx 3) — 5 neighbors
    { servingIdx: 3, neighborIdx: 0, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 3, neighborIdx: 1, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 3, neighborIdx: 2, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 3, neighborIdx: 4, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 3, neighborIdx: 9, relType: 'intra_freq', hoType: 'anr_auto' },
    // AB001L (idx 4) — 5 neighbors
    { servingIdx: 4, neighborIdx: 0, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 4, neighborIdx: 1, relType: 'intra_freq', hoType: 'manual' },
    { servingIdx: 4, neighborIdx: 3, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 4, neighborIdx: 5, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 4, neighborIdx: 11, relType: 'intra_freq', hoType: 'manual' },
    // AB002L (idx 5) — 4 neighbors
    { servingIdx: 5, neighborIdx: 1, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 5, neighborIdx: 4, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 5, neighborIdx: 8, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 5, neighborIdx: 6, relType: 'intra_freq', hoType: 'pnp_auto' },
    // PH001L (idx 6) — 4 neighbors
    { servingIdx: 6, neighborIdx: 0, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 6, neighborIdx: 5, relType: 'intra_freq', hoType: 'pnp_auto' },
    { servingIdx: 6, neighborIdx: 7, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 6, neighborIdx: 11, relType: 'inter_freq', hoType: 'anr_auto' },
    // PH002L (idx 7) — 4 neighbors
    { servingIdx: 7, neighborIdx: 6, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 7, neighborIdx: 8, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 7, neighborIdx: 10, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 7, neighborIdx: 11, relType: 'intra_freq', hoType: 'anr_auto' },
    // KN001L (idx 8) — 4 neighbors
    { servingIdx: 8, neighborIdx: 5, relType: 'inter_freq', hoType: 'anr_auto' },
    { servingIdx: 8, neighborIdx: 7, relType: 'inter_freq', hoType: 'manual' },
    { servingIdx: 8, neighborIdx: 9, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 8, neighborIdx: 10, relType: 'intra_freq', hoType: 'manual' },
    // IB001L (idx 9) — 5 neighbors
    { servingIdx: 9, neighborIdx: 0, relType: 'inter_freq', hoType: 'pnp_auto' },
    { servingIdx: 9, neighborIdx: 3, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 9, neighborIdx: 8, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 9, neighborIdx: 10, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 9, neighborIdx: 11, relType: 'inter_freq', hoType: 'manual' },
    // IB002L (idx 10) — 4 neighbors
    { servingIdx: 10, neighborIdx: 2, relType: 'intra_freq', hoType: 'pnp_auto' },
    { servingIdx: 10, neighborIdx: 7, relType: 'intra_freq', hoType: 'anr_auto' },
    { servingIdx: 10, neighborIdx: 8, relType: 'intra_freq', hoType: 'manual' },
    { servingIdx: 10, neighborIdx: 9, relType: 'intra_freq', hoType: 'anr_auto' },
    // BN001L (idx 11) — 4 neighbors
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
      triggerConfig: JSON.stringify({ cron: '0 */6 * * *', timezone: 'Africa/Lagos' }),
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
      triggerReason: 'RSRP at LTE-LG-003 dropped to -108.3dBm for 2 consecutive 15-min intervals',
      affectedSites: JSON.stringify(['LG003L']),
      actionsTaken: JSON.stringify(['adjusted antenna tilt 6° → 4°', 'increased RS power 15.2 → 17.0 dBm']),
      kpiImpact: JSON.stringify({ before: { rsrp: -108.3, coverageArea: 82 }, after: { rsrp: -96.1, coverageArea: 91 } }),
      durationMs: 18500,
      createdAt: subHours(now, 2),
      completedAt: subHours(now, 2),
    },
    {
      policyId: policies[1].id, // Load Balancing
      status: 'completed',
      triggerReason: 'PRB utilization at LTE-LG-001 reached 87.2% for 3 consecutive intervals',
      affectedSites: JSON.stringify(['LG001L', 'LG002L']),
      actionsTaken: JSON.stringify(['reduced RS power 15.2 → 13.0 dBm', 'adjusted MLB offset +2dB']),
      kpiImpact: JSON.stringify({ before: { prbUtilization: 87.2, activeUsers: 285 }, after: { prbUtilization: 68.4, activeUsers: 192 } }),
      durationMs: 12300,
      createdAt: subMinutes(now, 45),
      completedAt: subMinutes(now, 45),
    },
    {
      policyId: policies[2].id, // Outage Compensation
      status: 'completed',
      triggerReason: 'Cell LTE-PH-002 availability dropped to 91.3% — suspected RRU failure',
      affectedSites: JSON.stringify(['PH002L', 'PH001L']),
      actionsTaken: JSON.stringify(['boosted PH001L RS power by 3dB', 'reduced PH001L tilt by 1°']),
      kpiImpact: JSON.stringify({ before: { availability: 91.3, affectedUsers: 145 }, after: { availability: 98.7, affectedUsers: 12 } }),
      durationMs: 42000,
      createdAt: subHours(now, 18),
      completedAt: subHours(now, 18),
    },
    {
      policyId: policies[3].id, // Neighbor Optimization
      status: 'completed',
      triggerReason: 'Handover success rate at LTE-AB-001 dropped to 93.8% over 30min window',
      affectedSites: JSON.stringify(['AB001L', 'AB002L']),
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
      affectedSites: JSON.stringify(['LG001L', 'LG002L', 'AB001L', 'KN001L', 'IB001L']),
      actionsTaken: JSON.stringify(['corrected QRXLEVMIN at LG001L', 'corrected hysteresis at KN001L', 'corrected SIntraSearch at AB001L']),
      kpiImpact: JSON.stringify({ before: { inconsistencies: 3, avgHoRate: 95.8 }, after: { inconsistencies: 0, avgHoRate: 97.1 } }),
      durationMs: 95000,
      createdAt: subHours(now, 4),
      completedAt: subHours(now, 4),
    },
    {
      policyId: policies[5].id, // PCI Conflict
      status: 'completed',
      triggerReason: 'PCI conflict detected: modulus-3 collision between LTE-LG-001 (PCI 504) and LTE-LG-004 (PCI 501)',
      affectedSites: JSON.stringify(['LG001L', 'LG004L']),
      actionsTaken: JSON.stringify(['reassigned PCI 504 → 502 at LTE-LG-001']),
      kpiImpact: JSON.stringify({ before: { sinr: 7.2, conflictCount: 1 }, after: { sinr: 11.5, conflictCount: 0 } }),
      durationMs: 28000,
      createdAt: subHours(now, 24),
      completedAt: subHours(now, 24),
    },
    {
      policyId: policies[0].id,
      status: 'completed',
      triggerReason: 'RSRP at NR-LG-002 dropped to -112dBm in 5G coverage area',
      affectedSites: JSON.stringify(['LG002N']),
      actionsTaken: JSON.stringify(['increased SSB power 16 → 18 dBm', 'adjusted beam weight']),
      kpiImpact: JSON.stringify({ before: { rsrp: -112, coverageRadius: 280 }, after: { rsrp: -99, coverageRadius: 410 } }),
      durationMs: 22000,
      createdAt: subHours(now, 8),
      completedAt: subHours(now, 8),
    },
    {
      policyId: policies[1].id,
      status: 'completed',
      triggerReason: 'PRB utilization at LTE-AB-002 sustained 83% for 30min during peak',
      affectedSites: JSON.stringify(['AB002L', 'AB001L']),
      actionsTaken: JSON.stringify(['adjusted MLB threshold', 'reduced AB002L RS power 15.2 → 12.5 dBm']),
      kpiImpact: JSON.stringify({ before: { prbUtilization: 83.1 }, after: { prbUtilization: 71.5 } }),
      durationMs: 15000,
      createdAt: subHours(now, 10),
      completedAt: subHours(now, 10),
    },
    {
      policyId: policies[2].id,
      status: 'failed',
      triggerReason: 'Potential outage at UMTS-IB-001 — availability 94.1%',
      affectedSites: JSON.stringify(['IB001U']),
      actionsTaken: JSON.stringify([]),
      kpiImpact: JSON.stringify({ before: { availability: 94.1 }, after: { availability: 94.1 } }),
      rollbackReason: 'No adjacent cells available for compensation in Ibadan region',
      durationMs: 8500,
      createdAt: subHours(now, 36),
      completedAt: subHours(now, 36),
    },
    {
      policyId: policies[5].id,
      status: 'failed',
      triggerReason: 'PCI conflict detected at LTE-KN-001 but all alternative PCIs occupied',
      affectedSites: JSON.stringify(['KN001L']),
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
      triggerReason: 'HLB triggered for LTE-IB-002 but vendor API timeout',
      affectedSites: JSON.stringify(['IB002L']),
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
      triggerReason: 'RSRP degradation at LTE-BN-001 triggered coverage recovery',
      affectedSites: JSON.stringify(['BN001L']),
      actionsTaken: JSON.stringify(['increased RS power 15.2 → 19.0 dBm', 'reduced tilt 6° → 2°']),
      kpiImpact: JSON.stringify({ before: { rsrp: -107 }, after: { rsrp: -107 } }),
      rollbackReason: 'Compensation caused interference spike at LTE-IB-001 — SINR dropped from 12 to 4 dB',
      durationMs: 120000,
      createdAt: subHours(now, 14),
      completedAt: subHours(now, 14),
    },
    {
      policyId: policies[3].id,
      status: 'rolled_back',
      triggerReason: 'Handover success rate at LTE-IB-001 dropped to 94.5%',
      affectedSites: JSON.stringify(['IB001L', 'IB002L']),
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
      triggerReason: 'RSRP at LTE-LG-004 dropped to -109.7dBm — evaluation in progress',
      affectedSites: JSON.stringify(['LG004L']),
      actionsTaken: JSON.stringify([]),
      kpiImpact: JSON.stringify({}),
      durationMs: null,
      createdAt: subMinutes(now, 3),
      completedAt: null,
    },
    {
      policyId: policies[1].id,
      status: 'triggered',
      triggerReason: 'PRB utilization at NR-LG-001 reached 78% — approaching threshold, monitoring',
      affectedSites: JSON.stringify(['LG001N']),
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
      region: 'Lagos Mainland',
      vendor: 'Ericsson',
      latitude: 6.510,
      longitude: 3.360,
      altitude: 42,
      frequency: '1800MHz',
      bandwidth: 20,
      maxCapacity: 150,
      status: 'completed',
      assignedPci: '502',
      assignedFreq: 'Band 3 (1800MHz)',
      initialNeighbors: JSON.stringify(['LG001L', 'LG002L', 'LG003L']),
      kpiBaseline: JSON.stringify({ rsrp: -88, sinr: 14, downloadThroughput: 85, prbUtilization: 35 }),
      completedAt: subHours(now, 48),
      createdAt: subHours(now, 52),
    },
    {
      siteName: 'NewSite-5G-001',
      siteCode: 'NS5G001',
      technology: '5G',
      region: 'Abuja Central',
      vendor: 'Huawei',
      latitude: 9.045,
      longitude: 7.510,
      altitude: 58,
      frequency: '3500MHz',
      bandwidth: 100,
      maxCapacity: 1000,
      status: 'completed',
      assignedPci: '24',
      assignedFreq: 'n78 (3500MHz)',
      initialNeighbors: JSON.stringify(['AB001N', 'AB002N', 'AB001L']),
      kpiBaseline: JSON.stringify({ rsrp: -82, sinr: 18, downloadThroughput: 450, prbUtilization: 22 }),
      completedAt: subHours(now, 24),
      createdAt: subHours(now, 28),
    },
    {
      siteName: 'NewSite-4G-002',
      siteCode: 'NS4G002',
      technology: '4G',
      region: 'Port Harcourt',
      vendor: 'Nokia',
      latitude: 4.805,
      longitude: 7.060,
      altitude: 28,
      frequency: '1800MHz',
      bandwidth: 20,
      maxCapacity: 150,
      status: 'completed',
      assignedPci: '506',
      assignedFreq: 'Band 3 (1800MHz)',
      initialNeighbors: JSON.stringify(['PH001L', 'PH002L']),
      kpiBaseline: JSON.stringify({ rsrp: -91, sinr: 12, downloadThroughput: 72, prbUtilization: 41 }),
      completedAt: subHours(now, 12),
      createdAt: subHours(now, 16),
    },
    {
      siteName: 'NewSite-4G-003',
      siteCode: 'NS4G003',
      technology: '4G',
      region: 'Ibadan',
      vendor: 'ZTE',
      latitude: 7.385,
      longitude: 3.935,
      altitude: 40,
      frequency: '800MHz',
      bandwidth: 10,
      maxCapacity: 75,
      status: 'completed',
      assignedPci: '510',
      assignedFreq: 'Band 20 (800MHz)',
      initialNeighbors: JSON.stringify(['IB001L', 'IB002L']),
      kpiBaseline: JSON.stringify({ rsrp: -85, sinr: 11, downloadThroughput: 48, prbUtilization: 38 }),
      completedAt: subHours(now, 6),
      createdAt: subHours(now, 10),
    },
    {
      siteName: 'NewSite-5G-002',
      siteCode: 'NS5G002',
      technology: '5G',
      region: 'Lagos Island',
      vendor: 'Samsung',
      latitude: 6.445,
      longitude: 3.405,
      altitude: 55,
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
      region: 'Kano Metro',
      vendor: 'Huawei',
      latitude: 11.995,
      longitude: 8.600,
      altitude: 50,
      frequency: '1800MHz',
      bandwidth: 15,
      maxCapacity: 120,
      status: 'configuring',
      assignedPci: '514',
      assignedFreq: 'Band 3 (1800MHz)',
      initialNeighbors: JSON.stringify(['KN001L']),
      kpiBaseline: JSON.stringify({}),
      completedAt: null,
      createdAt: subHours(now, 4),
    },
    {
      siteName: 'NewSite-4G-005',
      siteCode: 'NS4G005',
      technology: '4G',
      region: 'Benin City',
      vendor: 'Ericsson',
      latitude: 6.340,
      longitude: 5.620,
      altitude: 38,
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
      region: 'Kaduna',
      vendor: 'Nokia',
      latitude: 10.605,
      longitude: 7.440,
      altitude: 52,
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
  const qoeSites4G = site4G.slice(0, 5); // LG001L, LG002L, LG003L, LG004L, AB001L
  const qoeSites5G = site5G.slice(0, 4); // LG001N, LG002N, LG003N, AB001N
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
    { name: 'eMBB-Video-Streaming-LG001', sliceType: 'eMBB', siteIdx: 0, sst: '1', maxBw: 100, guarBw: 30, maxUsers: 200, priority: 3, latTarget: 20, load: 72, users: 145, throughput: 65.3, latency: 12.4, fiveQi: 9 },
    { name: 'eMBB-Broadband-LG002', sliceType: 'eMBB', siteIdx: 1, sst: '1', maxBw: 100, guarBw: 30, maxUsers: 150, priority: 4, latTarget: 20, load: 58, users: 87, throughput: 48.7, latency: 14.1, fiveQi: 9 },
    { name: 'eMBB-Enterprise-AB001', sliceType: 'eMBB', siteIdx: 3, sst: '1', maxBw: 100, guarBw: 50, maxUsers: 100, priority: 2, latTarget: 15, load: 45, users: 42, throughput: 38.2, latency: 10.8, fiveQi: 8 },
    { name: 'eMBB-Public-Safety-PH001', sliceType: 'eMBB', siteIdx: 5, sst: '1', maxBw: 80, guarBw: 40, maxUsers: 80, priority: 1, latTarget: 20, load: 33, users: 26, throughput: 25.1, latency: 11.5, fiveQi: 8 },
    // URLLC (4 slices)
    { name: 'URLLC-Industrial-LG001', sliceType: 'URLLC', siteIdx: 0, sst: '2', maxBw: 50, guarBw: 10, maxUsers: 50, priority: 1, latTarget: 5, load: 28, users: 12, throughput: 8.5, latency: 3.2, fiveQi: 80 },
    { name: 'URLLC-Autonomous-AB002', sliceType: 'URLLC', siteIdx: 4, sst: '2', maxBw: 50, guarBw: 10, maxUsers: 30, priority: 1, latTarget: 5, load: 85, users: 25, throughput: 42.3, latency: 4.1, fiveQi: 80 },
    { name: 'URLLC-AR-VR-LG003', sliceType: 'URLLC', siteIdx: 2, sst: '2', maxBw: 50, guarBw: 10, maxUsers: 100, priority: 2, latTarget: 5, load: 40, users: 38, throughput: 15.6, latency: 3.8, fiveQi: 82 },
    { name: 'URLLC-Remote-Surgery-AB001', sliceType: 'URLLC', siteIdx: 3, sst: '2', maxBw: 50, guarBw: 10, maxUsers: 10, priority: 1, latTarget: 5, load: 20, users: 4, throughput: 5.2, latency: 2.8, fiveQi: 84 },
    // mMTC (4 slices)
    { name: 'mMTC-Smart-Meter-LG001', sliceType: 'mMTC', siteIdx: 0, sst: '3', maxBw: 20, guarBw: 1, maxUsers: 500, priority: 5, latTarget: 100, load: 65, users: 320, throughput: 3.2, latency: 45.6, fiveQi: 2 },
    { name: 'mMTC-Agri-Sensors-KN001', sliceType: 'mMTC', siteIdx: 3, sst: '3', maxBw: 20, guarBw: 1, maxUsers: 400, priority: 6, latTarget: 100, load: 22, users: 88, throughput: 1.1, latency: 62.3, fiveQi: 2 },
    { name: 'mMTC-Tracking-AB001', sliceType: 'mMTC', siteIdx: 3, sst: '3', maxBw: 20, guarBw: 1, maxUsers: 600, priority: 5, latTarget: 100, load: 51, users: 305, throughput: 4.8, latency: 38.9, fiveQi: 2 },
    { name: 'mMTC-Smart-City-LG002', sliceType: 'mMTC', siteIdx: 1, sst: '3', maxBw: 20, guarBw: 1, maxUsers: 500, priority: 4, latTarget: 100, load: 78, users: 390, throughput: 6.1, latency: 42.1, fiveQi: 2 },
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
    { title: 'Major Outage - LTE-LG-001 Complete Service Loss', desc: 'All sectors down on LTE-LG-001 due to power supply unit failure. Affecting approximately 2000 active users in Lagos Mainland.', tech: '4G', siteIdx: 0, sev: 'critical', status: 'resolved', cat: 'power', mttr: 180, assigned: 'Team Alpha', root: 'PSU hardware failure causing complete power loss to RRU and BBU', resolution: 'Emergency PSU replacement completed. All sectors restored and verified.', slaBreach: true, tags: ['outage', 'hardware', 'power'] },
    { title: 'Hardware Failure - NR-LG-001 BBU Crash', desc: 'Baseband Unit experiencing repeated crashes causing 5G service disruption in Lagos Island.', tech: '5G', siteIdx: 1, sev: 'critical', status: 'investigating', cat: 'hardware', mttr: 240, assigned: 'Team Beta', tags: ['hardware', '5g', 'bbu'] },
    { title: 'Fiber Cut - Multiple Sites Port Harcourt', desc: 'Backbone fiber cut affecting 3G/4G backhaul for PH001 and PH002 clusters.', tech: '4G', siteIdx: 8, sev: 'critical', status: 'open', cat: 'network', mttr: 120, assigned: 'NOC Team', tags: ['fiber', 'backhaul', 'outage'] },
    { title: 'Core Network Congestion - Kano Metro', desc: 'SGW/PGW overload causing throughput degradation for all 4G sites in Kano Metro region.', tech: '4G', siteIdx: 10, sev: 'critical', status: 'investigating', cat: 'network', mttr: 90, assigned: 'Core Team', tags: ['congestion', 'core', 'capacity'] },
    // 5 high
    { title: 'Capacity Saturation - LTE-LG-002', desc: 'PRB utilization consistently above 92% during peak hours causing call blocking.', tech: '4G', siteIdx: 1, sev: 'high', status: 'resolved', cat: 'network', mttr: 60, assigned: 'RF Team', root: 'Insufficient capacity for growing user demand in Lagos Island business district', resolution: 'Additional carrier activated and load balancing parameters adjusted.', slaBreach: false, tags: ['capacity', 'prb'] },
    { title: 'Interference Detection - LTE-AB-002', desc: 'High uplink interference detected causing elevated noise floor and degraded UL throughput.', tech: '4G', siteIdx: 5, sev: 'high', status: 'investigating', cat: 'network', mttr: 45, assigned: 'RF Team', tags: ['interference', 'uplink'] },
    { title: 'Transport Link Flapping - NR-AB-001', desc: 'CPRI/OBSAI link to NR-AB-001 experiencing intermittent failures causing 5G service drops.', tech: '5G', siteIdx: 3, sev: 'high', status: 'open', cat: 'network', mttr: 30, assigned: 'Transport Team', tags: ['transport', '5g'] },
    { title: 'High Drop Rate - UMTS-PH-001', desc: 'Call drop rate exceeding 3.5% threshold on UMTS-PH-001 due to poor neighbor relations.', tech: '3G', siteIdx: 13, sev: 'high', status: 'resolved', cat: 'network', mttr: 90, assigned: 'Optimization Team', root: 'Missing inter-frequency neighbor causing calls to drop at cell edge', resolution: 'ANR module added missing neighbors and MRO optimized handover parameters.', slaBreach: true, tags: ['drop_rate', 'handover'] },
    { title: 'Thermal Alert - NR-LG-002 RRU', desc: 'RRU temperature exceeding 65°C threshold, auto-power reduction activated.', tech: '5G', siteIdx: 2, sev: 'high', status: 'resolved', cat: 'environmental', mttr: 30, assigned: 'Field Team', root: 'Cooling fan failure in RRU enclosure', resolution: 'Fan replaced and thermal paste reapplied. Temperature returned to normal.', slaBreach: false, tags: ['thermal', 'hardware'] },
    // 4 medium
    { title: 'Performance Degradation - LTE-IB-001', desc: 'Gradual throughput decline over 48 hours, likely due to interference from new co-located system.', tech: '4G', siteIdx: 11, sev: 'medium', status: 'resolved', cat: 'network', mttr: 60, assigned: 'RF Team', root: 'External interference from newly installed DAS system in adjacent building', resolution: 'Coordination with building management to adjust DAS antenna tilt and power.', slaBreach: false, tags: ['degradation', 'interference'] },
    { title: 'Power Issue - GSM-KN-001', desc: 'Battery backup failing to hold charge, risking service loss during power outages.', tech: '2G', siteIdx: 6, sev: 'medium', status: 'closed', cat: 'power', mttr: 120, assigned: 'Power Team', root: 'Aged battery cells reaching end of life', resolution: 'Full battery string replacement completed and tested.', slaBreach: false, tags: ['power', 'battery'] },
    { title: 'Configuration Drift - LTE-IB-002', desc: 'Parameter values deviating from approved template causing sub-optimal performance.', tech: '4G', siteIdx: 12, sev: 'medium', status: 'open', cat: 'software', mttr: 30, assigned: 'SON Team', tags: ['config', 'parameter'] },
    { title: 'Neighborhood Optimization Needed - UMTS-AB-001', desc: 'Handover success rate dropped below 93% indicating neighbor list issues.', tech: '3G', siteIdx: 10, sev: 'medium', status: 'investigating', cat: 'network', mttr: 60, assigned: 'Optimization Team', tags: ['handover', 'neighbor'] },
    // 2 low
    { title: 'Minor Config Issue - NR-AB-002', desc: 'PCI assignment not following regional plan, potential modulo-3 conflict with planned site.', tech: '5G', siteIdx: 4, sev: 'low', status: 'closed', cat: 'software', mttr: 30, assigned: 'Planning Team', root: 'PCI not updated during last site commissioning', resolution: 'PCI reassigned to conflict-free value per regional plan.', slaBreach: false, tags: ['pci', 'config'] },
    { title: 'Alarm Storm - GSM-LG-001', desc: 'Multiple transient alarms triggered by brief power fluctuation. No service impact.', tech: '2G', siteIdx: 0, sev: 'low', status: 'resolved', cat: 'power', mttr: 30, assigned: 'NOC', root: 'Momentary power grid fluctuation', resolution: 'No action needed. Alarms cleared and monitoring continued.', slaBreach: false, tags: ['alarm', 'power'] },
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

  console.log('\n✅ Seed complete!');
  console.log(`  Total records: Sites(${created.length}) + KPI(${kpiCount}) + Rules(${rules.length}) + Alerts(${alerts.length}) + OptLogs(${optLogs.length}) + Params(${params.length}) + SLA(${slaTargets.length}) + Anomalies(${anomalyData.length}) + Audit(8) + SonModules(${sonModules.length}) + SonActions(${sonActions.length}) + Neighbors(${neighborCount}) + Policies(${policies.length}) + Executions(${execData.length}) + Vendors(${vendorProfilesData.length}) + Onboardings(${onboardingsData.length}) + QoE(${qoeBatch.length}) + CapacityForecast(${capacityBatch.length}) + NetworkSlice(${networkSliceBatch.length}) + EnergyMetric(${energyBatch.length}) + FaultPrediction(${fpBatch.length}) + SubscriberSegment(${subscriberBatch.length}) + Incident(${incidentBatch.length}) + ConfigTemplate(${configTemplates.length})`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());