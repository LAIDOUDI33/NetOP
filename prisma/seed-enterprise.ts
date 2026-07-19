import { db } from '../src/lib/db';

async function main() {
  console.log('Seeding enterprise data...');

  // SLA Targets
  const slas = [
    { technology: '2G', metric: 'availability', targetValue: 99.0, condition: 'gte', severity: 'critical' },
    { technology: '2G', metric: 'dropRate', targetValue: 2.0, condition: 'lte', severity: 'warning' },
    { technology: '2G', metric: 'latency', targetValue: 400, condition: 'lte', severity: 'warning' },
    { technology: '2G', metric: 'handoverSuccessRate', targetValue: 95.0, condition: 'gte', severity: 'critical' },
    { technology: '3G', metric: 'availability', targetValue: 99.2, condition: 'gte', severity: 'critical' },
    { technology: '3G', metric: 'dropRate', targetValue: 1.5, condition: 'lte', severity: 'warning' },
    { technology: '3G', metric: 'latency', targetValue: 150, condition: 'lte', severity: 'warning' },
    { technology: '3G', metric: 'handoverSuccessRate', targetValue: 96.0, condition: 'gte', severity: 'critical' },
    { technology: '4G', metric: 'availability', targetValue: 99.5, condition: 'gte', severity: 'critical' },
    { technology: '4G', metric: 'dropRate', targetValue: 1.0, condition: 'lte', severity: 'warning' },
    { technology: '4G', metric: 'latency', targetValue: 50, condition: 'lte', severity: 'warning' },
    { technology: '4G', metric: 'handoverSuccessRate', targetValue: 98.0, condition: 'gte', severity: 'critical' },
    { technology: '4G', metric: 'prbUtilization', targetValue: 80.0, condition: 'lte', severity: 'warning' },
    { technology: '4G', metric: 'downloadThroughput', targetValue: 20, condition: 'gte', severity: 'warning' },
    { technology: '5G', metric: 'availability', targetValue: 99.9, condition: 'gte', severity: 'critical' },
    { technology: '5G', metric: 'dropRate', targetValue: 0.5, condition: 'lte', severity: 'warning' },
    { technology: '5G', metric: 'latency', targetValue: 10, condition: 'lte', severity: 'warning' },
    { technology: '5G', metric: 'handoverSuccessRate', targetValue: 99.0, condition: 'gte', severity: 'critical' },
    { technology: '5G', metric: 'prbUtilization', targetValue: 75.0, condition: 'lte', severity: 'warning' },
    { technology: '5G', metric: 'downloadThroughput', targetValue: 100, condition: 'gte', severity: 'warning' },
  ];
  await db.sLATarget.createMany({ data: slas });
  console.log(`  SLA Targets: ${slas.length}`);

  // Anomaly Events - generate statistically
  const sites = await db.networkSite.findMany({ select: { id: true, technology: true, name: true } });
  const now = new Date();
  const anomalies: any[] = [];
  const anomalyDescriptions = [
    'Sudden throughput drop detected - potential interference or capacity saturation',
    'Signal quality degradation exceeding 2σ from baseline',
    'Latency spike anomaly - possible backhaul congestion',
    'Availability dip below statistical baseline',
    'Unusual traffic pattern deviation detected',
    'Handover success rate below expected statistical range',
    'PRB utilization spike indicating abnormal traffic surge',
    'Packet loss anomaly exceeding 3σ threshold',
  ];

  for (let i = 0; i < 15; i++) {
    const site = sites[Math.floor(Math.random() * sites.length)];
    const metrics = ['downloadThroughput', 'latency', 'availability', 'sinr', 'dropRate', 'prbUtilization'];
    const metric = metrics[Math.floor(Math.random() * metrics.length)];
    const severity = Math.random() > 0.6 ? 'critical' : Math.random() > 0.4 ? 'major' : 'minor';
    const statuses = ['detected', 'investigating', 'resolved', 'false_positive'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    anomalies.push({
      siteId: site.id,
      technology: site.technology,
      metric,
      actualValue: Math.random() * 200 - 50,
      expectedValue: Math.random() * 100,
      zScore: Math.random() * 6 - 1,
      severity,
      status,
      description: anomalyDescriptions[Math.floor(Math.random() * anomalyDescriptions.length)],
      resolvedAt: status === 'resolved' ? new Date(now.getTime() - Math.random() * 48 * 3600000) : null,
      createdAt: new Date(now.getTime() - Math.random() * 72 * 3600000),
    });
  }
  await db.anomalyEvent.createMany({ data: anomalies });
  console.log(`  Anomaly Events: ${anomalies.length}`);

  // Audit Log entries
  const audits = [
    { entityType: 'parameter', action: 'update', oldValue: '15.2', newValue: '16.0', description: 'Updated RS Power from 15.2 to 16.0 dBm (4G)', technology: '4G' },
    { entityType: 'alert', action: 'acknowledge', description: 'Acknowledged critical RSRP alert for LTE-LG-001', technology: '4G' },
    { entityType: 'parameter', action: 'update', oldValue: '4', newValue: '6', description: 'Updated Handover Hysteresis from 4 to 6 dB (2G)', technology: '2G' },
    { entityType: 'alert', action: 'resolve', description: 'Resolved high latency alert for NR-LG-001', technology: '5G' },
    { entityType: 'anomaly', action: 'update', description: 'Changed anomaly status from detected to investigating for UMTS-AB-001', technology: '3G' },
    { entityType: 'parameter', action: 'update', oldValue: '33', newValue: '36', description: 'Updated CPICH Power from 33 to 36 dBm (3G)', technology: '3G' },
    { entityType: 'site', action: 'update', description: 'Changed LTE-PH-001 status from active to maintenance', technology: '4G' },
    { entityType: 'alert', action: 'resolve', description: 'Resolved drop rate breach for GSM-KN-001', technology: '2G' },
  ];
  for (let i = 0; i < audits.length; i++) {
    await db.auditLog.create({
      data: { ...audits[i], createdAt: new Date(now.getTime() - (i + 1) * 3600000) },
    });
  }
  console.log(`  Audit Logs: ${audits.length}`);

  console.log('\n✅ Enterprise data seeded!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());