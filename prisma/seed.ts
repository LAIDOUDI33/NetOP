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

  console.log('\n✅ Seed complete!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());