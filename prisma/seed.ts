/**
 * National SOC Platform - Simplified Database Seed
 * 
 * Generates essential test data for development and testing.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Create Roles
  console.log('📋 Creating roles...');
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'soc_admin' },
      update: {},
      create: { name: 'soc_admin', description: 'Full SOC platform administrator' }
    }),
    prisma.role.upsert({
      where: { name: 'analyst' },
      update: {},
      create: { name: 'analyst', description: 'SOC analyst' }
    }),
    prisma.role.upsert({
      where: { name: 'threat_hunter' },
      update: {},
      create: { name: 'threat_hunter', description: 'Threat intelligence specialist' }
    })
  ]);
  console.log(`   ✅ Created ${roles.length} roles`);

  // Create Users
  console.log('👤 Creating users...');
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@national-soc.gov' },
      update: {},
      create: {
        email: 'admin@national-soc.gov',
        username: 'admin',
        passwordHash: '$2b$10$hashed_password',
        name: 'SOC Administrator',
        roleId: roles[0].id,
        isActive: true,
        isMfaEnabled: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'sarah.analyst@national-soc.gov' },
      update: {},
      create: {
        email: 'sarah.analyst@national-soc.gov',
        username: 'sarah_a',
        passwordHash: '$2b$10$hashed_password',
        name: 'Sarah Analyst',
        roleId: roles[1].id,
        isActive: true,
        isMfaEnabled: false
      }
    }),
    prisma.user.upsert({
      where: { email: 'james.hunter@national-soc.gov' },
      update: {},
      create: {
        email: 'james.hunter@national-soc.gov',
        username: 'james_h',
        passwordHash: '$2b$10$hashed_password',
        name: 'James Hunter',
        roleId: roles[2].id,
        isActive: true,
        isMfaEnabled: true
      }
    })
  ]);
  console.log(`   ✅ Created ${users.length} users`);

  // Create Sample Alerts
  console.log('🚨 Creating alerts...');
  const alertData = [
    {
      title: 'SS7 Location Tracking Attempt Detected',
      severity: 'HIGH' as const,
      status: 'NEW' as const,
      alertType: 'DETECTION' as const,
      source: 'SS7_Monitor',
      description: 'Unauthorized SRI request detected from unknown GT',
      sourceIp: '192.168.1.100',
      destIp: '10.0.0.5',
      protocol: 'SS7'
    },
    {
      title: 'Diameter Attack Pattern Identified',
      severity: 'CRITICAL' as const,
      status: 'IN_PROGRESS' as const,
      alertType: 'DETECTION' as const,
      source: 'Diameter_Analyzer',
      description: 'Multiple CCR anomalies detected indicating potential attack',
      sourceIp: '192.168.2.50',
      protocol: 'DIAMETER'
    },
    {
      title: 'GTP Tunnel Anomaly - Potential Data Exfiltration',
      severity: 'HIGH' as const,
      status: 'ACKNOWLEDGED' as const,
      alertType: 'ANOMALY' as const,
      source: 'GTP_Inspector',
      description: 'Unusual data volume detected in GTP tunnel',
      sourceIp: '10.100.1.1',
      destIp: '203.0.113.50',
      protocol: 'GTP'
    },
    {
      title: 'SIP Registration Flood Detected',
      severity: 'HIGH' as const,
      status: 'NEW' as const,
      alertType: 'DETECTION' as const,
      source: 'SIPSentry',
      description: 'High volume of SIP registrations from single IP',
      sourceIp: '198.51.100.25',
      protocol: 'SIP'
    },
    {
      title: 'SIM Swap Fraud Indicator',
      severity: 'CRITICAL' as const,
      status: 'ESCALATED' as const,
      alertType: 'CORRELATION' as const,
      source: 'FraudEngine',
      description: 'Multiple SIM swap requests for high-value account',
      sourceIp: '172.16.0.15'
    }
  ];

  const alerts = await Promise.all(
    alertData.map(alert => 
      prisma.alert.create({ data: alert })
    )
  );
  console.log(`   ✅ Created ${alerts.length} alerts`);

  // Create Sample Incidents
  console.log('🔥 Creating incidents...');
  const incidents = await Promise.all([
    prisma.incident.create({
      data: {
        title: 'Coordinated SS7 Attack Campaign',
        description: 'Multiple threat actors exploiting SS7 vulnerabilities',
        incidentType: 'NETWORK_INTRUSION',
        severity: 'CRITICAL',
        status: 'OPEN',
        phase: 'CONTAINMENT',
        tatcCode: 'TATC-2026-0001',
        impactScore: 8.5,
        confidenceScore: 85.0,
        assignedToId: users[1].id,
        affectedAssets: JSON.stringify(['HLR_01', 'STP_Primary']),
        slaBreach: false
      }
    }),
    prisma.incident.create({
      data: {
        title: 'Large-Scale SIM Swap Fraud Ring',
        description: 'Organized crime group performing unauthorized SIM swaps',
        incidentType: 'TELECOM_FRAUD',
        severity: 'HIGH',
        status: 'IN_PROGRESS',
        phase: 'ERADICATION',
        tatcCode: 'TATC-2026-0002',
        impactScore: 7.2,
        confidenceScore: 78.0,
        assignedToId: users[2].id,
        affectedServices: JSON.stringify(['Mobile_Banking', 'OTP_Services']),
        slaBreach: true
      }
    }),
    prisma.incident.create({
      data: {
        title: 'APT Group Targeting National Infrastructure',
        description: 'Advanced persistent threat group targeting telecom infrastructure',
        incidentType: 'APT',
        severity: 'CRITICAL',
        status: 'OPEN',
        phase: 'DETECTION',
        tatcCode: 'TATC-2026-0003',
        impactScore: 9.2,
        confidenceScore: 65.0,
        assignedToId: users[0].id,
        blastRadius: 'Potential access to core network elements'
      }
    })
  ]);
  console.log(`   ✅ Created ${incidents.length} incidents`);

  // Link some alerts to incidents
  console.log('🔗 Linking alerts to incidents...');
  await prisma.alert.update({
    where: { id: alerts[0].id },
    data: { incidentId: incidents[0].id, status: 'ESCALATED' }
  });
  await prisma.alert.update({
    where: { id: alerts[4].id },
    data: { incidentId: incidents[1].id, status: 'ESCALATED' }
  });
  console.log('   ✅ Linked alerts');

  // Create Threat Indicators
  console.log('🎯 Creating threat indicators...');
  const indicators = await Promise.all([
    prisma.threatIndicator.create({
      data: {
        type: 'IPV4',
        value: '203.0.113.50',
        confidence: 85.0,
        source: 'AlienVault',
        threatActor: 'APT-GhostShell',
        isActive: true,
        tags: JSON.stringify(['C2', 'malware'])
      }
    }),
    prisma.threatIndicator.create({
      data: {
        type: 'DOMAIN',
        value: 'evil-c2-server.xyz',
        confidence: 92.0,
        source: 'VirusTotal',
        threatActor: 'Lazarus-Telecom',
        isActive: true,
        tags: JSON.stringify(['phishing', 'C2'])
      }
    }),
    prisma.threatIndicator.create({
      data: {
        type: 'FILE_HASH_SHA256',
        value: 'a1b2c3d4e5f6...' + 'x'.repeat(56),
        confidence: 75.0,
        source: 'MISP_Community',
        threatActor: 'FIN11-Africa',
        malwareFamily: 'TrickBot',
        isActive: true
      }
    }),
    prisma.threatIndicator.create({
      data: {
        type: 'IMSI',
        value: '62101123456789012345',
        confidence: 60.0,
        source: 'Internal_Hunting',
        threatActor: 'Unknown',
        isActive: true,
        tags: JSON.stringify(['ss7_attack', 'tracking'])
      }
    })
  ]);
  console.log(`   ✅ Created ${indicators.length} indicators`);

  // Create Campaigns
  console.log('⚔️ Creating campaigns...');
  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        name: 'Operation SilentStorm',
        alias: 'OPSS-2026',
        description: 'Persistent campaign targeting mobile network operators',
        threatActor: 'APT-GhostShell',
        attributionConfidence: 75.0,
        status: 'ACTIVE',
        targetSector: 'Telecommunications',
        targetRegion: 'West Africa',
        objectives: JSON.stringify(['Subscriber tracking', 'Communication interception']),
        financialImpact: 2500000,
        isActive: true
      }
    }),
    prisma.campaign.create({
      data: {
        name: 'TelecomHeist Wave',
        alias: 'THW-Q1',
        description: 'Coordinated fraud campaign leveraging SIM swap attacks',
        threatActor: 'FIN11-Africa',
        attributionConfidence: 85.0,
        status: 'ACTIVE',
        targetSector: 'Banking/Finance',
        objectives: JSON.stringify(['Account takeover', 'Banking credential theft']),
        financialImpact: 5200000,
        isActive: true
      }
    })
  ]);
  console.log(`   ✅ Created ${campaigns.length} campaigns`);

  // Create Network Elements
  console.log('🖥️ Creating network elements...');
  const networkElements = await Promise.all([
    prisma.networkElement.create({
      data: {
        elementType: 'HLR_HSS',
        hostname: 'HLR-NG-Primary',
        ipAddress: '10.0.1.1',
        vendor: 'Huawei',
        softwareVersion: 'v15.0',
        status: 'OPERATIONAL',
        capacity: 45.2,
        location: 'Lagos DC',
        securityZone: 'Core_Zone',
        lastHeartbeat: new Date()
      }
    }),
    prisma.networkElement.create({
      data: {
        elementType: 'STP',
        hostname: 'STP-Primary',
        ipAddress: '10.0.1.5',
        vendor: 'Ericsson',
        softwareVersion: 'v12.3',
        status: 'OPERATIONAL',
        capacity: 32.8,
        location: 'Abuja DC',
        securityZone: 'DMZ',
        lastHeartbeat: new Date()
      }
    }),
    prisma.networkElement.create({
      data: {
        elementType: 'GGSN_PGW',
        hostname: 'GGSN-PGW-01',
        ipAddress: '10.0.2.10',
        vendor: 'Nokia',
        softwareVersion: 'v20.1',
        status: 'DEGRADED',
        capacity: 89.5,
        location: 'Port Harcourt DC',
        securityZone: 'Core_Zone',
        lastHeartbeat: new Date()
      }
    })
  ]);
  console.log(`   ✅ Created ${networkElements.length} network elements`);

  // Create Sample Subscribers
  console.log('📱 Creating subscribers...');
  const subscribers = await Promise.all([
    prisma.subscriber.create({
      data: {
        imsi: '62101123456789012345',
        msisdn: '+2348012345678',
        imei: '351234567890123456',
        imsiType: 'POSTPAID',
        subscriberStatus: 'ACTIVE',
        roamingStatus: 'HOME',
        homeCountry: 'NG',
        riskScore: 15.5,
        lastActivityAt: new Date()
      }
    }),
    prisma.subscriber.create({
      data: {
        imsi: '62101987654321098765',
        msisdn: '+2348098765432',
        imei: '359876543210987654',
        imsiType: 'PREPAID',
        subscriberStatus: 'ACTIVE',
        roamingStatus: 'INTERNATIONAL_ROAMING',
        homeCountry: 'NG',
        visitedCountry: 'GB',
        riskScore: 72.3,
        lastActivityAt: new Date()
      }
    }),
    prisma.subscriber.create({
      data: {
        imsi: '62105555666677788899',
        msisdn: '+2349011223344',
        imei: '355556666777888999',
        imsiType: 'POSTPAID',
        subscriberStatus: 'FRAUD_LOCKED',
        roamingStatus: 'HOME',
        homeCountry: 'NG',
        riskScore: 95.1,
        lastActivityAt: new Date(Date.now() - 3600000)
      }
    })
  ]);
  console.log(`   ✅ Created ${subscribers.length} subscribers`);

  // Create System Config
  console.log('⚙️ Creating system configuration...');
  const configs = await Promise.all([
    prisma.systemConfig.upsert({
      where: { key: 'alert_retention_days' },
      update: {},
      create: { key: 'alert_retention_days', value: '365', description: 'Alert retention period', category: 'GENERAL' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'max_incident_sla_hours' },
      update: {},
      create: { key: 'max_incident_sla_hours', value: '72', description: 'Max SLA time for critical incidents', category: 'COMPLIANCE' }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'ss7_monitoring_enabled' },
      update: {},
      create: { key: 'ss7_monitoring_enabled', value: 'true', description: 'Enable SS7 monitoring', category: 'TELECOM' }
    })
  ]);
  console.log(`   ✅ Created ${configs.length} config entries`);

  console.log('\n════════════════════════════════════════════');
  console.log('          SEEDING COMPLETE! ✅');
  console.log('════════════════════════════════════════════\n');
  
  console.log('📊 Summary:');
  console.log(`   👥 Users: ${users.length}`);
  console.log(`   🚨 Alerts: ${alerts.length}`);
  console.log(`   🔥 Incidents: ${incidents.length}`);
  console.log(`   🎯 Indicators: ${indicators.length}`);
  console.log(`   ⚔️ Campaigns: ${campaigns.length}`);
  console.log(`   🖥️ Network Elements: ${networkElements.length}`);
  console.log(`   📱 Subscribers: ${subscribers.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
