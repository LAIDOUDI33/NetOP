/**
 * National SOC Platform - Database Seed Data
 * 
 * Generates comprehensive test data for development and testing.
 * Covers all 27 models across 5 domains:
 * - Authentication & Authorization (4 models)
 * - Core SOC - Alerts & Incidents (5 models)
 * - Threat Intelligence (4 models)
 * - Telecom-Specific (7 models)
 * - Compliance & Audit (4 models)
 */

import { PrismaClient, AlertSeverity, AlertStatus, AlertType, IncidentType, IncidentSeverity, IncidentStatus, IncidentPhase, EvidenceType, TaskStatus, IndicatorType, ThreatLevel, TIPLv2Type, TIPSeverity, TLPMarking, DistributionScope, CampaignStatus, IMSIType, SubscriberStatus, RoamingStatus, NetworkElementType, NEStatus, SS7MessageType, GTPSessionType, PDNType, SessionStatus, RATType, DiameterCommand, CCRequestType, NASPortType, FramedProtocol, ServiceName, AuthProtocol, RadiusPacketType, SIPCallType, CallDirection, SIPMethod, AuditSeverity, AuditCategory, AuditOutcome, ReportType, ReportFormat, ReportStatus, ReportSchedule, ConfigCategory, RetentionEntityType, RetentionAction, StorageTier } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// CONFIGURATION
// ============================================================

const SEED_CONFIG = {
  // Auth domain
  users: 15,
  roles: 5,
  permissions: 25,
  sessions: 30,

  // Core SOC domain
  alerts: 150,
  incidents: 25,
  incidentUpdates: 80,
  evidence: 40,
  tasks: 60,

  // Threat Intel domain
  threatIndicators: 200,
  iocs: 100,
  tiplRecords: 50,
  campaigns: 12,

  // Telecom domain
  subscribers: 100,
  networkElements: 20,
  ss7Messages: 300,
  gtpSessions: 80,
  diameterSessions: 60,
  radiusSessions: 50,
  sipSessions: 70,

  // Compliance domain
  auditLogs: 200,
  reports: 20,
  systemConfigs: 15,
  retentionPolicies: 8
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomIP(): string {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

function randomIMSI(): string {
  // Format: MCC (3) + MNC (2-3) + MSIN (10)
  const mccs = ['621', '622', '623', '624', '625']; // African country codes
  const mncs = ['01', '02', '03', '04', '05'];
  let msin = '';
  for (let i = 0; i < 10; i++) msin += Math.floor(Math.random() * 10).toString();
  return randomElement(mccs) + randomElement(mncs) + msin;
}

function randomMSISDN(): string {
  // International format phone number
  const prefixes = ['23480', '23481', '23490', '23491', '255', '254', '27'];
  let suffix = '';
  for (let i = 0; i < 8; i++) suffix += Math.floor(Math.random() * 10).toString();
  return randomElement(prefixes) + suffix;
}

function randomIMEI(): string {
  // IMEI is 15 digits
  let imei = '';
  for (let i = 0; i < 15; i++) imei += Math.floor(Math.random() * 10).toString();
  return imei;
}

function randomHash(): string {
  const chars = 'abcdef0123456789';
  let hash = '';
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * chars.length)];
  return hash;
}

// ============================================================
// SEED DATA GENERATORS
// ============================================================

async function seedAuthDomain() {
  console.log('\n🔐 Seeding Authentication & Authorization data...');

  // Create Roles
  const roles = await Promise.all([
    prisma.role.create({
      data: {
        name: 'soc_admin',
        description: 'Full SOC platform administrator with all permissions'
      }
    }),
    prisma.role.create({
      data: {
        name: 'analyst',
        description: 'SOC analyst with incident and alert management access'
      }
    }),
    prisma.role.create({
      data: {
        name: 'threat_hunter',
        description: 'Threat intelligence specialist'
      }
    }),
    prisma.role.create({
      data: {
        name: 'telecom_engineer',
        description: 'Telecom network security engineer'
      }
    }),
    prisma.role.create({
      data: {
        name: 'compliance_officer',
        description: 'Compliance and audit access only'
      }
    })
  ]);

  console.log(`  ✅ Created ${roles.length} roles`);

  // Create Permissions
  const permissionData = [
    { resource: 'alerts', action: 'read', description: 'View alerts' },
    { resource: 'alerts', action: 'write', description: 'Create and edit alerts' },
    { resource: 'alerts', action: 'delete', description: 'Delete alerts' },
    { resource: 'incidents', action: 'read', description: 'View incidents' },
    { resource: 'incidents', action: 'write', description: 'Create and manage incidents' },
    { resource: 'incidents', action: 'escalate', description: 'Escalate incidents' },
    { resource: 'threat_intel', action: 'read', description: 'View threat intelligence' },
    { resource: 'threat_intel', action: 'write', description: 'Add and edit threat intel' },
    { resource: 'threat_intel', action: 'publish', description: 'Publish to TIP' },
    { resource: 'telecom', action: 'read', description: 'View telecom data' },
    { resource: 'telecom', action: 'analyze', description: 'Analyze telecom sessions' },
    { resource: 'users', action: 'read', description: 'View users' },
    { resource: 'users', action: 'manage', description: 'Manage user accounts' },
    { resource: 'system', action: 'configure', description: 'System configuration' },
    { resource: 'reports', action: 'read', description: 'View reports' },
    { resource: 'reports', action: 'generate', description: 'Generate reports' },
    { resource: 'audit', action: 'read', description: 'View audit logs' },
    { resource: 'evidence', action: 'upload', description: 'Upload evidence files' },
    { resource: 'evidence', action: 'delete', description: 'Delete evidence' },
    { resource: 'playbooks', action: 'execute', description: 'Run playbooks' },
    { resource: 'api', action: 'access', description: 'API access' },
    { resource: 'dashboard', action: 'view', description: 'View dashboard' },
    { resource: 'integrations', action: 'manage', description: 'Manage integrations' },
    { resource: 'backup', action: 'perform', description: 'Perform backups' },
    { resource: 'admin', action: 'full', description: 'Full administrative access' }
  ];

  const permissions = await Promise.all(
    permissionData.map(p => prisma.permission.create({ data: p }))
  );

  console.log(`  ✅ Created ${permissions.length} permissions`);

  // Create Users
  const userNames = [
    { name: 'Admin User', email: 'admin@national-soc.gov', username: 'admin', roleId: roles[0].id },
    { name: 'Sarah Analyst', email: 'sarah.analyst@national-soc.gov', username: 'sarah_a', roleId: roles[1].id },
    { name: 'James Hunter', email: 'james.hunter@national-soc.gov', username: 'james_h', roleId: roles[2].id },
    { name: 'Amara Engineer', email: 'amara.engineer@national-soc.gov', username: 'amara_e', roleId: roles[3].id },
    { name: 'Fatima Compliance', email: 'fatima.compliance@national-soc.gov', username: 'fatima_c', roleId: roles[4].id },
    { name: 'Kofi Security', email: 'kofi.security@national-soc.gov', username: 'kofi_s', roleId: roles[1].id },
    { name: 'Zara Intel', email: 'zara.intel@national-soc.gov', username: 'zara_i', roleId: roles[2].id },
    { name: 'Tunde Network', email: 'tunde.network@national-soc.gov', username: 'tunde_n', roleId: roles[3].id }
  ];

  const users = await Promise.all(
    userNames.map(u => 
      prisma.user.create({
        data: {
          ...u,
          passwordHash: '$2b$10$hashed_password_placeholder_' + randomHash().substring(0, 20),
          isActive: true,
          isMfaEnabled: Math.random() > 0.5,
          lastLoginAt: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date())
        }
      })
    )
  );

  console.log(`  ✅ Created ${users.length} users`);

  // Create Sessions
  const sessions = await Promise.all(
    Array.from({ length: SEED_CONFIG.sessions }, () =>
      prisma.session.create({
        data: {
          userId: randomElement(users).id,
          token: 'sess_' + randomHash(),
          refreshToken: 'refresh_' + randomHash(),
          ipAddress: randomIP(),
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })
    )
  );

  console.log(`  ✅ Created ${sessions.length} sessions`);

  return { users, roles, permissions, sessions };
}

async function seedCoreSOCDomain(users: any[]) {
  console.log('\n🚨 Seeding Core SOC data (Alerts & Incidents)...');

  // Sample alert data based on real African telecom threats
  const alertTemplates = [
    { title: 'SS7 Location Tracking Attempt Detected', severity: AlertSeverity.HIGH, type: AlertType.DETECTION, source: 'SS7_Monitor' },
    { title: 'Unusual SS7 SendRoutingInfo Request Surge', severity: AlertSeverity.MEDIUM, type: AlertType.ANOMALY, source: 'SS7_Monitor' },
    { title: 'Diameter Attack Pattern Identified', severity: AlertSeverity.CRITICAL, type: AlertType.DETECTION, source: 'Diameter_Analyzer' },
    { title: 'GTP Tunnel Anomaly - Potential Data Exfiltration', severity: AlertSeverity.HIGH, type: AlertType.ANOMALY, source: 'GTP_Inspector' },
    { title: 'SIP Registration Flood Detected', severity: AlertSeverity.HIGH, type: AlertType.DETECTION, source: 'SIPSentry' },
    { title: 'SIM Swap Fraud Indicator', severity: AlertSeverity.CRITICAL, type: AlertType.CORRELATION, source: 'FraudEngine' },
    { title: 'International Revenue Share Fraud Pattern', severity: AlertSeverity.MEDIUM, type: AlertType.THREAT_FEED, source: 'TIF' },
    { title: 'Wangiri Call Pattern Detected', severity: AlertSeverity.LOW, type: AlertType.ANOMALY, source: 'CallAnalyzer' },
    { title: 'APT Activity - C2 Communication Detected', severity: AlertSeverity.CRITICAL, type: AlertType.DETECTION, source: 'EDR' },
    { title: 'Phishing Campaign Targeting Subscribers', severity: AlertSeverity.MEDIUM, type: AlertType.THREAT_FEED, source: 'PhishTank' },
    { title: 'DDoS Attack Against Core Network Element', severity: AlertSeverity.CRITICAL, type: AlertType.DETECTION, source: 'NDR' },
    { title: 'Unauthorized API Access Attempt', severity: AlertSeverity.HIGH, type: AlertType.DETECTION, source: 'SIEM' },
    { title: 'Malware C2 Domain Resolution', severity: AlertSeverity.HIGH, type: AlertType.CORRELATION, source: 'DNS_Sensor' },
    { title: 'Insider Threat - Unusual Data Access Pattern', severity: AlertSeverity.HIGH, type: AlertType.ANOMALY, source: 'UBA' },
    { title: 'Zero-Day Exploit Attempt on HLR/HSS', severity: AlertSeverity.CRITICAL, type: AlertType.DETECTION, source: 'IDS' }
  ];

  const statuses = Object.values(AlertStatus);
  
  const alerts = await Promise.all(
    Array.from({ length: SEED_CONFIG.alerts }, (_, i) => {
      const template = alertTemplates[i % alertTemplates.length];
      return prisma.alert.create({
        data: {
          ...template,
          description: `Detailed analysis of ${template.title.toLowerCase()} detected in the network. Requires immediate investigation.`,
          status: randomElement(statuses),
          sourceIp: randomIP(),
          destIp: randomIP(),
          sourcePort: randomInt(1024, 65535),
          destPort: [80, 443, 22, 53, 3868, 2905, 2915][randomInt(0, 7)],
          protocol: ['TCP', 'UDP', 'SCTP', 'SS7', 'GTP', 'DIAMETER'][randomInt(0, 5)],
          mitreTactics: JSON.stringify([['InitialAccess', 'Discovery', 'Collection'][randomInt(0, 2)]]),
          mitreTechniques: JSON.stringify([['T1046', 'T1018', 'T1003'][randomInt(0, 2)]]),
          assignedToId: randomElement(users).id,
          escalationCount: randomInt(0, 3),
          firstSeen: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
          lastSeen: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
          resolvedAt: template.status === AlertStatus.RESOLVED ? new Date() : null
        }
      });
    })
  );

  console.log(`  ✅ Created ${alerts.length} alerts`);

  // Create Incidents
  const incidentTemplates = [
    { 
      title: 'Coordinated SS7 Attack Campaign Against Mobile Subscribers',
      type: IncidentType.NETWORK_INTRUSION,
      description: 'Multiple threat actors exploiting SS7 protocol vulnerabilities to track subscriber locations and intercept communications.'
    },
    {
      title: 'Large-Scale SIM Swap Fraud Ring Discovered',
      type: IncidentType.TELECOM_FRAUD,
      description: 'Organized crime group performing unauthorized SIM swaps to gain access to victim accounts and banking credentials.'
    },
    {
      title: 'APT Group Targeting National Infrastructure',
      type: IncidentType.APT,
      description: 'Advanced persistent threat group with nation-state backing targeting critical telecommunications infrastructure.'
    },
    {
      title: 'Distributed Denial of Service Attack on Signaling Network',
      type: IncidentType.DDoS,
      description: 'Coordinated DDoS attack overwhelming signaling network elements causing service degradation.'
    },
    {
      title: 'Data Breach - Subscriber Information Exposed',
      type: IncidentType.DATA_BREACH,
      description: 'Unauthorized access to subscriber database exposing personal information of millions of customers.'
    },
    {
      title: 'Interception System Compromise Detected',
      type: IncidentType.INTERCEPTION,
      description: 'Lawful interception system compromised, potentially allowing unauthorized surveillance capabilities.'
    },
    {
      title: 'Ransomware Attack on Operations Center',
      type: IncidentType.MALWARE,
      description: 'Ransomware infection affecting SOC operations systems and incident response capabilities.'
    },
    {
      title: 'Insider Threat - Data Exfiltration Investigation',
      type: IncidentType.INSIDER_THREAT,
      description: 'Employee suspected of exfiltrating sensitive network topology and security configuration data.'
    }
  ];

  const incidentStatuses = Object.values(IncidentStatus);
  const phases = Object.values(IncidentPhase);

  const incidents = await Promise.all(
    Array.from({ length: SEED_CONFIG.incidents }, (_, i) => {
      const template = incidentTemplates[i % incidentTemplates.length];
      return prisma.incident.create({
        data: {
          ...template,
          severity: randomElement(Object.values(IncidentSeverity).slice(0, 3)), // CRITICAL, HIGH, MEDIUM
          status: randomElement(incidentStatuses),
          phase: randomElement(phases),
          tatcCode: `TATC-${2026}${String(i + 1).padStart(4, '0')}`,
          impactScore: parseFloat((Math.random() * 10).toFixed(1)),
          confidenceScore: parseFloat((Math.random() * 100).toFixed(1)),
          assignedToId: randomElement(users).id,
          rootCauseAnalysis: i % 3 === 0 ? 'Initial root cause identified as misconfigured firewall rules allowing unauthorized SS7 traffic.' : null,
          lessonsLearned: i % 4 === 0 ? 'Need enhanced monitoring for SS7 protocol anomalies and automated blocking capabilities.' : null,
          affectedAssets: JSON.stringify(['HLR_01', 'STP_Primary', 'SIGTRAN_GW']),
          affectedServices: JSON.stringify(['LocationServices', 'SMS_Routing', 'Voice_Call_Completion']),
          detectedAt: randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()),
          resolvedAt: template.status === IncidentStatus.RESOLVED || template.status === IncidentStatus.CLOSED ? new Date() : null,
          slaBreach: Math.random() > 0.7
        }
      });
    })
  );

  console.log(`  ✅ Created ${incidents.length} incidents`);

  // Create Incident Updates
  const updateMessages = [
    'Initial triage completed. Severity assessment in progress.',
    'Additional resources allocated to investigation.',
    'Threat intelligence team engaged for actor attribution.',
    'Containment measures implemented successfully.',
    'Communication sent to affected stakeholders.',
    'Root cause analysis initiated.',
    'Forensic evidence collected and preserved.',
    'Coordination with law enforcement established.',
    'Recovery plan developed and approved.',
    'Post-incident review scheduled.'
  ];

  const updates = await Promise.all(
    Array.from({ length: SEED_CONFIG.incidentUpdates }, () => {
      const incident = randomElement(incidents);
      const author = randomElement(users);
      return prisma.incidentUpdate.create({
        data: {
          incidentId: incident.id,
          authorId: author.id,
          message: randomElement(updateMessages),
          status: randomElement(incidentStatuses),
          phase: randomElement(phases),
          isInternal: Math.random() > 0.6
        }
      });
    })
  );

  console.log(`  ✅ Created ${updates.length} incident updates`);

  // Create Evidence
  const evidenceTypes = Object.values(EvidenceType);
  const evidence = await Promise.all(
    Array.from({ length: SEED_CONFIG.evidence }, () => {
      const incident = randomElement(incidents);
      return prisma.evidence.create({
        data: {
          incidentId: incident.id,
          title: `${['PCAP', 'Log', 'Screenshot', 'Memory Dump', 'Configuration'][randomInt(0, 4)]}_Evidence_${randomInt(1000, 9999)}`,
          description: `Evidence collected during investigation of ${incident.title}`,
          type: randomElement(evidenceTypes),
          filePath: `/evidence/${randomHash().substring(0, 16)}.bin`,
          fileHash: randomHash(),
          fileSize: randomInt(1024, 104857600), // 1KB to 100MB
          mimeType: ['application/octet-stream', 'text/plain', 'image/png', 'application/pcap'][randomInt(0, 3)],
          metadata: JSON.stringify({ collector: 'auto', tool: 'SOAR_Platform_v2' })
        }
      });
    })
  );

  console.log(`  ✅ Created ${evidence.length} evidence items`);

  // Create Tasks
  const taskTitles = [
    'Review alert correlation rules',
    'Update firewall blocklist',
    'Interview system administrator',
    'Analyze malware sample',
    'Document containment steps',
    'Prepare stakeholder communication',
    'Coordinate with external CSIRT',
    'Verify patch deployment',
    'Test recovery procedures',
    'Complete incident report'
  ];

  const tasks = await Promise.all(
    Array.from({ length: SEED_CONFIG.tasks }, () => {
      const taskStatuses = Object.values(TaskStatus);
      return prisma.task.create({
        data: {
          title: randomElement(taskTitles),
          description: 'Detailed task requirements and acceptance criteria documented in work item.',
          status: randomElement(taskStatuses),
          priority: randomInt(1, 5),
          assigneeId: randomElement(users).id,
          incidentId: Math.random() > 0.3 ? randomElement(incidents).id : null,
          dueDate: randomDate(new Date(), new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
          completedAt: Math.random() > 0.7 ? new Date() : null
        }
      });
    })
  );

  console.log(`  ✅ Created ${tasks.length} tasks`);

  return { alerts, incidents, updates, evidence, tasks };
}

async function seedThreatIntelDomain() {
  console.log('\n🎯 Seeding Threat Intelligence data...');

  // Create Threat Indicators
  const indicatorTypes = Object.values(IndicatorType);
  const threatActors = [
    'APT-GhostShell', 'FIN11-Africa', 'Lazarus-Telecom', 'Tick-SS7',
    'Carbanak-Mobile', 'SilentLiberty', 'DarkHydrus-Telco', 'Kimsuky-MNO'
  ];

  const indicators = await Promise.all(
    Array.from({ length: SEED_CONFIG.threatIndicators }, () => {
      const type = randomElement(indicatorTypes);
      let value: string;

      switch (type) {
        case IndicatorType.IPV4:
          value = randomIP();
          break;
        case IndicatorType.DOMAIN:
          value = `malicious${randomInt(1, 9999)}.evil${['.com', '.net', '.org', '.xyz', '.tk'][randomInt(0, 4)]}`;
          break;
        case IndicatorType.URL:
          value = `http://${randomIP()}/payload/${randomHash().substring(0, 8)}`;
          break;
        case IndicatorType.EMAIL:
          value = `phisher${randomInt(1, 999)}@${['evil.com', 'scam.net', 'fake.org'][randomInt(0, 2)]}`;
          break;
        case IndicatorType.FILE_HASH_SHA256:
          value = randomHash();
          break;
        case IndicatorType.SS7_GT:
          value = `+${randomInt(1, 999)}${randomInt(10000000, 99999999)}`;
          break;
        case IndicatorType.IMSI:
          value = randomIMSI();
          break;
        case IndicatorType.MSISDN:
          value = randomMSISDN();
          break;
        default:
          value = randomHash().substring(0, 32);
      }

      return prisma.threatIndicator.create({
        data: {
          type,
          value,
          confidence: parseFloat((Math.random() * 100).toFixed(1)),
          source: ['AlienVault', 'VirusTotal', 'MISP_Community', 'Internal_Hunting', 'ThreatConnect'][randomInt(0, 4)],
          threatActor: randomElement(threatActors),
          isActive: Math.random() > 0.2,
          ttl: Math.random() > 0.5 ? randomDate(new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) : null,
          tags: JSON.stringify([['C2', 'phishing', 'malware', 'ss7_attack', 'fraud', 'apt'][randomInt(0, 5)]]),
          firstSeen: randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())
        }
      });
    })
  );

  console.log(`  ✅ Created ${indicators.length} threat indicators`);

  // Create IOCs
  const iocs = await Promise.all(
    Array.from({ length: SEED_CONFIG.iocs }, (_, i) => ({
      id: `IOC-${2026}-${String(i + 1).padStart(6, '0')}`,
      ...await prisma.iOC.create({
        data: {
          iocId: `IOC-${2026}-${String(i + 1).padStart(6, '0')}`,
          type: randomElement(indicatorTypes.filter(t => t !== IndicatorType.SS7_GT && t !== IndicatorType.IMSI)),
          value: randomHash().substring(0, 40),
          threatLevel: randomElement(Object.values(ThreatLevel)),
          description: `Intelligence of compromise indicator related to ongoing campaign targeting African telecom infrastructure.`,
          source: ['MISP', 'STIX/TAXII', 'OSINT', 'Commercial_Feed', 'LEA_Sharing'][randomInt(0, 4)],
          confidence: randomInt(30, 99),
          killChainPhases: JSON.stringify([['Reconnaissance', 'Weaponization', 'Delivery', 'Exploitation', 'Installation', 'C2', 'Actions_on_Objectives'].slice(0, randomInt(2, 7))]),
          labels: JSON.stringify([['malicious', 'suspicious', 'benign'][randomInt(0, 2)]]),
          isValidated: Math.random() > 0.4,
          falsePositiveRate: parseFloat((Math.random() * 15).toFixed(1))
        }
      })
    }))
  );

  console.log(`  ✅ Created ${iocs.length} IOCs`);

  // Create TIPLv2 Records (Trusted Intelligence Exchange Platform)
  const tiplRecords = await Promise.all(
    Array.from({ length: SEED_CONFIG.tiplRecords }, (_, i) =>
      prisma.tIPLv2.create({
        data: {
          tipId: `TIP-${Date.now()}-${String(i + 1).padStart(4, '0')}`,
          title: `${['Emerging Threat', 'Active Campaign', 'New Malware Variant', 'Vulnerability Exploit', 'Infrastructure Takeover'][randomInt(0, 5)]} Alert #${i + 1}`,
          type: randomElement(Object.values(TIPLv2Type)),
          description: 'Detailed intelligence product for distribution to authorized stakeholders within the national cybersecurity ecosystem.',
          confidence: parseFloat((Math.random() * 100).toFixed(1)),
          severity: randomElement(Object.values(TIPSeverity)),
          sourceOrg: ['National_CSIRT', 'Sector_CSIRT_Telecom', 'International_Partner', 'Law_Enforcement', 'Intelligence_Agency'][randomInt(0, 4)],
          tlp: randomElement(Object.values(TLPMarking)),
          iocIds: JSON.stringify([iocs[randomInt(0, iocs.length - 1)]?.iocId]),
          affectedCountries: JSON.stringify([['NG', 'ZA', 'KE', 'GH', 'EG', 'ZA'].slice(0, randomInt(1, 5))]),
          affectedSectors: JSON.stringify([['Telecommunications', 'Finance', 'Government', 'Energy', 'Healthcare'].slice(0, randomInt(1, 4))]),
          telecomSpecific: JSON.stringify({ protocols: ['SS7', 'Diameter', 'GTP', 'SIP'].slice(0, randomInt(1, 4)) }),
          isActionable: Math.random() > 0.5,
          distributionScope: randomElement(Object.values(DistributionScope)),
          publishedAt: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
        }
      })
    )
  );

  console.log(`  ✅ Created ${tiplRecords.length} TIPLv2 records`);

  // Create Campaigns
  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        name: 'Operation SilentStorm',
        alias: 'OPSS-2026',
        description: 'Persistent campaign targeting mobile network operators across West Africa using SS7 vulnerabilities.',
        threatActor: 'APT-GhostShell',
        attributionConfidence: 75.0,
        status: CampaignStatus.ACTIVE,
        targetSector: 'Telecommunications',
        targetRegion: 'West Africa',
        objectives: JSON.stringify(['Subscriber tracking', 'Communication interception', 'Financial fraud']),
        techniques: JSON.stringify(['T1046', 'T1018', 'T1114', 'T1003']),
        financialImpact: 2500000,
        firstSeen: new Date('2025-06-15'),
        lastSeen: new Date()
      }
    }),
    prisma.campaign.create({
      data: {
        name: 'TelecomHeist Wave',
        alias: 'THW-Q1',
        description: 'Coordinated fraud campaign leveraging SIM swap attacks against high-value targets.',
        threatActor: 'FIN11-Africa',
        attributionConfidence: 85.0,
        status: CampaignStatus.ACTIVE,
        targetSector: 'Banking/Finance',
        targetRegion: 'Sub-Saharan Africa',
        objectives: JSON.stringify(['Account takeover', 'Banking credential theft', 'Wire fraud']),
        techniques: JSON.stringify(['T1566', 'T1078', 'T1111', 'T1485']),
        financialImpact: 5200000,
        firstSeen: new Date('2025-09-01'),
        lastSeen: new Date()
      }
    }),
    prisma.campaign.create({
      data: {
        name: 'Project CrossWire',
        alias: 'XCW-2025',
        description: 'Supply chain attack targeting telecom infrastructure vendors.',
        threatActor: 'Lazarus-Telecom',
        attributionConfidence: 65.0,
        status: CampaignStatus.DORMANT,
        targetSector: 'Critical Infrastructure',
        targetRegion: 'Global',
        objectives: JSON.stringify(['Persistent access', 'Strategic intelligence collection']),
        techniques: JSON.stringify(['T1195', 'T1072', 'T1057']),
        financialImpact: 0, // Intelligence gathering, not financial
        firstSeen: new Date('2024-03-20'),
        lastSeen: new Date('2025-12-01')
      }
    }),
    ...Array.from({ length: SEED_CONFIG.campaigns - 3 }, (_, i) =>
      prisma.campaign.create({
        data: {
          name: `Campaign ${String.fromCharCode(65 + i)}-${2026}`,
          description: `Threat campaign under active monitoring and analysis.`,
          threatActor: randomElement(threatActors),
          attributionConfidence: parseFloat((Math.random() * 100).toFixed(1)),
          status: randomElement([CampaignStatus.ACTIVE, CampaignStatus.DORMANT, CampaignStatus.ONGOING]),
          targetSector: ['Telecommunications', 'Government', 'Finance', 'Energy'][randomInt(0, 3)],
          isActive: Math.random() > 0.3,
          firstSeen: randomDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())
        }
      })
    )
  ]);

  console.log(`  ✅ Created ${campaigns.length} campaigns`);

  return { indicators, iocs, tiplRecords, campaigns };
}

async function seedTelecomDomain() {
  console.log('\n📡 Seeding Telecom-specific data...');

  // Create Subscribers
  const subscribers = await Promise.all(
    Array.from({ length: SEED_CONFIG.subscribers }, () =>
      prisma.subscriber.create({
        data: {
          imsi: randomIMSI(),
          msisdn: randomMSISDN(),
          imei: randomIMEI(),
          imsiType: randomElement(Object.values(IMSIType)),
          subscriberStatus: Math.random() > 0.9 ? randomElement([SubscriberStatus.SUSPENDED, SubscriberStatus.FRAUD_LOCKED]) : SubscriberStatus.ACTIVE,
          roamingStatus: Math.random() > 0.7 ? RoamingStatus.INTERNATIONAL_ROAMING : RoamingStatus.HOME,
          homeCountry: ['NG', 'ZA', 'KE', 'GH', 'EG', 'TZ', 'UG'][randomInt(0, 6)],
          visitedCountry: Math.random() > 0.7 ? ['US', 'GB', 'DE', 'AE', 'FR'][randomInt(0, 4)] : null,
          riskScore: parseFloat((Math.random() * 100).toFixed(1)),
          lastActivityAt: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
        }
      })
    )
  );

  console.log(`  ✅ Created ${subscribers.length} subscribers`);

  // Create Network Elements
  const neHostnames = [
    'HLR-NG-Primary', 'HLR-NG-Secondary', 'MSC-Lagos-Central', 'MSC-Abuja-North',
    'SGSN-West', 'SGSN-East', 'GGSN-PGW-01', 'GGSN-PGW-02',
    'MME-Core-01', 'MME-Core-02', 'SMSC-National', 'STP-Primary',
    'STP-Secondary', 'SIGTRAN-GW-01', 'GTP-Proxy-Edge', 'Diameter-Agent-01',
    'SIP-Proxy-IMS', 'P-CSCF-01', 'I-CSCF-01', 'S-CSCF-01'
  ];

  const networkElements = await Promise.all(
    neHostnames.map((hostname, i) =>
      prisma.networkElement.create({
        data: {
          elementType: Object.values(NetworkElementType)[i % Object.values(NetworkElementType).length],
          hostname,
          ipAddress: `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`,
          vendor: ['Huawei', 'Ericsson', 'Nokia', 'Samsung', 'ZTE'][randomInt(0, 4)],
          softwareVersion: `v${randomInt(10, 20)}.${randomInt(0, 9)}.${randomInt(0, 999)}`,
          status: Math.random() > 0.95 ? NEStatus.DEGRADED : NEStatus.OPERATIONAL,
          capacity: parseFloat((Math.random() * 85).toFixed(1)),
          location: ['Lagos DC', 'Abuja DC', 'Port Harcourt DC', 'Kano DC', 'Ibadan DC'][randomInt(0, 4)],
          redundancyGroup: `HA-Group-${String.fromCharCode(65 + (i % 4))}`,
          securityZone: ['Core_Zone', 'DMZ', 'Internal', 'Management'][randomInt(0, 3)],
          lastHeartbeat: new Date()
        }
      })
    )
  );

  console.log(`  ✅ Created ${networkElements.length} network elements`);

  // Create SS7 Messages
  const ss7Messages = await Promise.all(
    Array.from({ length: SEED_CONFIG.ss7Messages }, () => {
      const messageTypes = Object.values(SS7MessageType);
      const messageType = randomElement(messageTypes);
      
      return prisma.sS7Message.create({
        data: {
          messageType,
          opc: randomInt(1, 255),
          dpc: randomInt(1, 255),
          globalTitle: Math.random() > 0.5 ? randomMSISDN() : null,
          imsi: Math.random() > 0.7 ? randomIMSI() : null,
          msisdn: Math.random() > 0.7 ? randomMSISDN() : null,
          isRoaming: Math.random() > 0.7,
          isInternational: Math.random() > 0.8,
          anomalyScore: parseFloat((Math.random() * 100).toFixed(1)),
          isBlocked: Math.random() > 0.95,
          sourceNeId: randomElement(networkElements).id,
          destNeId: randomElement(networkElements).id,
          timestamp: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
          protocolDetails: JSON.stringify({ tcop: randomInt(1, 15), dialogId: randomInt(1000, 9999) })
        }
      });
    })
  );

  console.log(`  ✅ Created ${ss7Messages.length} SS7 messages`);

  // Create GTP Sessions
  const gtpSessions = await Promise.all(
    Array.from({ length: SEED_CONFIG.gtpSessions }, () => {
      const subscriber = randomElement(subscribers);
      return prisma.gTPSession.create({
        data: {
          sessionType: randomElement(Object.values(GTPSessionType)),
          imsi: subscriber.imsi,
          msisdn: subscriber.msisdn,
          imei: subscriber.imei,
          sourceIp: randomIP(),
          destIp: randomIP(),
          sourceTeid: BigInt(randomInt(100000000, 999999999)),
          destTeid: BigInt(randomInt(100000000, 999999999)),
          apn: ['internet.corp', 'mms.corp', 'iot.corp', 'vpn.corp'][randomInt(0, 3)],
          cellId: `${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
          lac: randomInt(1, 65535),
          mcc: ['621', '622', '623', '624', '625'][randomInt(0, 4)],
          mnc: ['30', '40', '50', '60'][randomInt(0, 3)],
          bytesUp: BigInt(randomInt(1000, 999999999)),
          bytesDown: BigInt(randomInt(1000, 9999999999)),
          durationSeconds: randomInt(60, 86400),
          pdnType: randomElement(Object.values(PDNType)),
          sessionStatus: Math.random() > 0.9 ? SessionStatus.TERMINATED : SessionStatus.ACTIVE,
          ratType: randomElement(Object.values(RATType)),
          anomalyScore: parseFloat((Math.random() * 100).toFixed(1)),
          startedAt: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
          lastActivityAt: randomDate(new Date(Date.now() - 3600000), new Date()),
          terminatedAt: Math.random() > 0.8 ? new Date() : null
        }
      });
    })
  );

  console.log(`  ✅ Created ${gtpSessions.length} GTP sessions`);

  // Create Diameter Sessions
  const diameterSessions = await Promise.all(
    Array.from({ length: SEED_CONFIG.diameterSessions }, () => {
      const subscriber = randomElement(subscribers);
      return prisma.diameterSession.create({
        data: {
          sessionId: `session-${randomHash().substring(0, 16)}`,
          commandCode: randomElement(Object.values(DiameterCommand)),
          originHost: randomElement(networkElements).hostname,
          originRealm: 'national-soc.gov',
          destinationHost: randomElement(networkElements).hostname,
          authApplicationId: randomInt(1, 16777215),
          userName: subscriber.msisdn,
          imsi: subscriber.imsi,
          resultCode: Math.random() > 0.2 ? 2001 : randomInt(4001, 5005),
          isError: Math.random() > 0.9,
          ccRequestType: randomElement(Object.values(CCRequestType)),
          ratedUnits: BigInt(randomInt(0, 999999)),
          currencyCode: ['NGN', 'USD', 'EUR', 'GBP'][randomInt(0, 3)],
          sessionStatus: Math.random() > 0.9 ? SessionStatus.TERMINATED : SessionStatus.ACTIVE,
          anomalyScore: parseFloat((Math.random() * 100).toFixed(1)),
          startedAt: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
          lastActivityAt: randomDate(new Date(Date.now() - 3600000), new Date())
        }
      });
    })
  );

  console.log(`  ✅ Created ${diameterSessions.length} Diameter sessions`);

  // Create Radius Sessions
  const radiusSessions = await Promise.all(
    Array.from({ length: SEED_CONFIG.radiusSessions }, () => {
      const subscriber = randomElement(subscribers);
      return prisma.radiusSession.create({
        data: {
          sessionId: `radius-${randomHash().substring(0, 12)}`,
          userName: subscriber.msisdn,
          nasIpAddress: randomElement(networkElements).ipAddress,
          nasPort: randomInt(1, 65535),
          nasPortType: randomElement(Object.values(NASPortType)),
          framedProtocol: randomElement(Object.values(FramedProtocol)),
          serviceName: randomElement(Object.values(ServiceName)),
          callingStationId: subscriber.msisdn,
          calledStationId: randomMSISDN(),
          authProtocol: randomElement(Object.values(AuthProtocol)),
          packetType: randomElement(Object.values(RadiusPacketType)),
          statusCode: Math.random() > 0.15 ? 0 : 2,
          sessionTimeout: randomInt(300, 86400),
          idleTimeout: randomInt(60, 1800),
          bytesIn: BigInt(randomInt(1000, 99999999)),
          bytesOut: BigInt(randomInt(1000, 999999999)),
 packetsIn: BigInt(randomInt(100, 999999)),
          packetsOut: BigInt(randomInt(100, 9999999)),
          imsi: subscriber.imsi,
          apn: ['internet.corp', 'iot.corp', 'vpn.corp'][randomInt(0, 2)],
          sessionStatus: Math.random() > 0.9 ? SessionStatus.TERMINATED : SessionStatus.ACTIVE,
          startedAt: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
          lastActivityAt: randomDate(new Date(Date.now() - 3600000), new Date()),
          terminatedAt: Math.random() > 0.8 ? new Date() : null
        }
      });
    })
  );

  console.log(`  ✅ Created ${radiusSessions.length} RADIUS sessions`);

  // Create SIP Sessions
  const sipSessions = await Promise.all(
    Array.from({ length: SEED_CONFIG.sipSessions }, () =>
      prisma.sIPSession.create({
        data: {
          callId: `call-${randomHash().substring(0, 16)}`,
          fromUri: `sip:${randomMSISDN()}@national-telco.com`,
          toUri: `sip:${randomMSISDN()}@national-telco.com`,
          fromUser: randomMSISDN(),
          toUser: randomMSISDN(),
          fromDomain: 'national-telco.com',
          toDomain: 'national-telco.com',
          callType: randomElement(Object.values(SIPCallType)),
          callDirection: randomElement(Object.values(CallDirection)),
          inviteTimestamp: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
          connectTimestamp: Math.random() > 0.2 ? randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()) : null,
          disconnectTimestamp: Math.random() > 0.5 ? new Date() : null,
          durationSeconds: randomInt(0, 7200),
          sourceIp: randomIP(),
          destIp: randomIP(),
          sourcePort: randomInt(1024, 65535),
          destPort: 5060,
          sipMethod: randomElement(Object.values(SIPMethod)),
          responseCode: Math.random() > 0.3 ? [200, 180, 183, 487][randomInt(0, 3)] : randomInt(400, 603),
          userAgent: ['Zoiper', 'Linphone', 'MicroSIP', 'X-Lite', 'Bria'][randomInt(0, 4)],
          isEncrypted: Math.random() > 0.6,
          srtpEnabled: Math.random() > 0.7,
          isIntercepted: Math.random() > 0.95,
          fraudIndicators: Math.random() > 0.85 ? JSON.stringify(['irregular_call_pattern', 'high_risk_destination']) : null,
          anomalyScore: parseFloat((Math.random() * 100).toFixed(1)),
          sourceNeId: randomElement(networkElements).id,
          destNeId: randomElement(networkElements).id
        }
      })
    )
  );

  console.log(`  ✅ Created ${sipSessions.length} SIP sessions`);

  return { subscribers, networkElements, ss7Messages, gtpSessions, diameterSessions, radiusSessions, sipSessions };
}

async function seedComplianceDomain(users: any[]) {
  console.log('\n📋 Seeding Compliance & Audit data...');

  // Create Audit Logs
  const auditActions = [
    { action: 'LOGIN_SUCCESS', category: AuditCategory.AUTHENTICATION, outcome: AuditOutcome.SUCCESS },
    { action: 'LOGIN_FAILURE', category: AuditCategory.AUTHENTICATION, outcome: AuditOutcome.FAILURE },
    { action: 'ALERT_CREATED', category: AuditCategory.INCIDENT_MANAGEMENT, outcome: AuditOutcome.SUCCESS },
    { action: 'ALERT_ESCALATED', category: AuditCategory.INCIDENT_MANAGEMENT, outcome: AuditOutcome.SUCCESS },
    { action: 'INCIDENT_OPENED', category: AuditCategory.INCIDENT_MANAGEMENT, outcome: AuditOutcome.SUCCESS },
    { action: 'INCIDENT_UPDATED', category: AuditCategory.INCIDENT_MANAGEMENT, outcome: AuditOutcome.SUCCESS },
    { action: 'DATA_EXPORTED', category: AuditCategory.DATA_ACCESS, outcome: AuditOutcome.SUCCESS },
    { action: 'ACCESS_DENIED', category: AuditCategory.AUTHORIZATION, outcome: AuditOutcome.DENIED },
    { action: 'CONFIG_CHANGED', category: AuditCategory.SYSTEM_CONFIG, outcome: AuditOutcome.SUCCESS },
    { action: 'THREAT_INTEL_ADDED', category: AuditCategory.THREAT_INTEL, outcome: AuditOutcome.SUCCESS },
    { action: 'USER_CREATED', category: AuditCategory.AUTHENTICATION, outcome: AuditOutcome.SUCCESS },
    { action: 'ROLE_MODIFIED', category: AuditCategory.AUTHORIZATION, outcome: AuditOutcome.SUCCESS },
    { action: 'EVIDENCE_UPLOADED', category: AuditCategory.INCIDENT_MANAGEMENT, outcome: AuditOutcome.SUCCESS },
    { action: 'REPORT_GENERATED', category: AuditCategory.COMPLIANCE, outcome: AuditOutcome.SUCCESS },
    { action: 'API_KEY_ROTATED', category: AuditCategory.SECURITY_EVENT, outcome: AuditOutcome.SUCCESS }
  ];

  const auditLogs = await Promise.all(
    Array.from({ length: SEED_CONFIG.auditLogs }, () => {
      const auditTemplate = randomElement(auditActions);
      return prisma.auditLog.create({
        data: {
          userId: randomElement(users).id,
          ...auditTemplate,
          resource: ['Alert', 'Incident', 'User', 'SystemConfig', 'Report', 'ThreatIndicator'][randomInt(0, 5)],
          resourceId: Math.random() > 0.3 ? `res_${randomHash().substring(0, 8)}` : null,
          oldValue: Math.random() > 0.5 ? JSON.stringify({ previous: 'value' }) : null,
          newValue: Math.random() > 0.5 ? JSON.stringify({ updated: 'value' }) : null,
          ipAddress: randomIP(),
          userAgent: ['Mozilla/5.0', 'SOC-API/v2', 'Integration-Script'][randomInt(0, 2)],
          severity: Math.random() > 0.9 ? AuditSeverity.HIGH : AuditSeverity.INFO,
          errorMessage: auditTemplate.outcome !== AuditOutcome.SUCCESS ? 'Authentication failed due to invalid credentials' : null,
          metadata: JSON.stringify({ source: 'auto_seed', version: '2.0' })
        }
      });
    })
  );

  console.log(`  ✅ Created ${auditLogs.length} audit logs`);

  // Create Reports
  const reports = await Promise.all(
    Array.from({ length: SEED_CONFIG.reports }, (_, i) =>
      prisma.report.create({
        data: {
          title: `${['Weekly Security Summary', 'Monthly KPI Dashboard', 'Threat Landscape Analysis', 'SLA Compliance Report', 'Team Performance Review', 'Executive Briefing', 'Incident Trend Analysis', 'Fraud Detection Metrics'][i % 8]} - ${new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
          description: 'Automated report generated by the SOC reporting engine.',
          reportType: randomElement(Object.values(ReportType)),
          format: randomElement(Object.values(ReportFormat)),
          status: Math.random() > 0.1 ? ReportStatus.COMPLETED : ReportStatus.GENERATING,
          generatedBy: randomElement(users).id,
          parameters: JSON.stringify({ dateRange: '30d', includeCharts: true }),
          filePath: Math.random() > 0.3 ? `/reports/report_${randomHash().substring(0, 8)}.pdf` : null,
          fileSize: Math.random() > 0.3 ? randomInt(102400, 10485760) : null,
          schedule: randomElement(Object.values(ReportSchedule)),
          recipients: JSON.stringify([['soc-team@national-soc.gov', 'ciso@gov.ng', 'security-council@african-union.org'].slice(0, randomInt(1, 3))]),
          dateRangeStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          dateRangeEnd: new Date(),
          completedAt: Math.random() > 0.2 ? new Date() : null
        }
      })
    )
  );

  console.log(`  ✅ Created ${reports.length} reports`);

  // Create System Config
  const configData = [
    { key: 'alert_retention_days', value: '365', description: 'Number of days to retain alert data', category: ConfigCategory.GENERAL },
    { key: 'max_incident_sla_hours', value: '72', description: 'Maximum SLA time for critical incidents', category: ConfigCategory.COMPLIANCE },
    { key: 'ss7_monitoring_enabled', value: 'true', description: 'Enable SS7 protocol monitoring', category: ConfigCategory.TELECOM },
    { key: 'gtp_inspection_depth', value: 'full', description: 'GTP tunnel inspection level', category: ConfigCategory.TELECOM },
    { key: 'sip_fraud_detection', value: 'true', description: 'Enable SIP-based fraud detection', category: ConfigCategory.SECURITY },
    { key: 'threat_feed_sources', value: '["alienvault", "virustotal", "misppublic"]', description: 'Active threat feed sources', category: ConfigCategory.THREAT_INTEL },
    { key: 'notification_email', value: 'soc-alerts@national-soc.gov', description: 'Primary notification email address', category: ConfigCategory.NOTIFICATION },
    { key: 'backup_schedule', value: '0 2 * * *', description: 'Cron schedule for database backups', category: ConfigCategory.BACKUP },
    { key: 'session_timeout_minutes', value: '480', description: 'User session timeout duration', category: ConfigCategory.SECURITY },
    { key: 'api_rate_limit', value: '1000', description: 'API requests per minute per user', category: ConfigCategory.PERFORMANCE },
    { key: 'encryption_key_rotation_days', value: '90', description: 'Encryption key rotation interval', category: ConfigCategory.SECURITY },
    { key: 'dashboard_refresh_seconds', value: '30', description: 'Dashboard auto-refresh interval', category: ConfigCategory.UI_SETTINGS },
    { key: 'log_level', value: 'info', description: 'Application logging level', category: ConfigCategory.GENERAL },
    { key: 'mfa_required', value: 'true', description: 'Require MFA for all users', category: ConfigCategory.SECURITY },
    { key: 'integration_webhook_url', value: 'https://hooks.example.com/soc', description: 'Webhook endpoint for integrations', category: ConfigCategory.INTEGRATION }
  ];

  const configs = await Promise.all(
    configData.map(config =>
      prisma.systemConfig.create({
        data: {
          ...config,
          isSensitive: ['api_rate_limit', 'encryption_key_rotation_days', 'notification_email'].includes(config.key),
          validationRule: typeof JSON.parse(config.value) === 'object' ? '{"type": "array"}' : null
        }
      })
    )
  );

  console.log(`  ✅ Created ${configs.length} system configurations`);

  // Create Data Retention Policies
  const retentionPolicies = await Promise.all([
    prisma.dataRetentionPolicy.create({
      data: {
        entityType: RetentionEntityType.ALERTS,
        retentionPeriodDays: 365,
        actionAfterExpiry: RetentionAction.ARCHIVE,
        storageTier: StorageTier.WARM,
        complianceRequirements: JSON.stringify(['NDPR', 'GDPR_Article_5']),
        isEnabled: true
      }
    }),
    prisma.dataRetentionPolicy.create({
      data: {
        entityType: RetentionEntityType.INCIDENTS,
        retentionPeriodDays: 2555, // 7 years
        actionAfterExpiry: RetentionAction.ARCHIVE,
        storageTier: StorageTier.COLD,
        legalHold: true,
        complianceRequirements: JSON.stringify(['NDPR', 'Cybercrime_Act', 'Regulatory_Requirements']),
        isEnabled: true
      }
    }),
    prisma.dataRetentionPolicy.create({
      data: {
        entityType: RetentionEntityType.AUDIT_LOGS,
        retentionPeriodDays: 1825, // 5 years
        actionAfterExpiry: RetentionAction.ARCHIVE,
        storageTier: StorageTier.COLD,
        complianceRequirements: JSON.stringify(['SOX', 'ISO27001', 'NDPR']),
        isEnabled: true
      }
    }),
    prisma.dataRetentionPolicy.create({
      data: {
        entityType: RetentionEntityType.RAW_LOGS,
        retentionPeriodDays: 90,
        actionAfterExpiry: RetentionAction.DELETE,
        storageTier: StorageTier.HOT,
        customRules: JSON.stringify([{ condition: 'security_relevant', overrideRetention: 365 }]),
        isEnabled: true
      }
    }),
    prisma.dataRetentionPolicy.create({
      data: {
        entityType: RetentionEntityType.PCAP_FILES,
        retentionPeriodDays: 30,
        actionAfterExpiry: RetentionAction.DELETE,
        storageTier: StorageTier.HOT,
        isEnabled: true
      }
    }),
    prisma.dataRetentionPolicy.create({
      data: {
        entityType: RetentionEntityType.EVIDENCE,
        retentionPeriodDays: 2555, // 7 years for legal hold
        actionAfterExpiry: RetentionAction.ARCHIVE,
        storageTier: StorageTier.GLACIER,
        legalHold: true,
        complianceRequirements: JSON.stringify(['Legal_Hold_Policy', 'Chain_of_Custody']),
        isEnabled: true
      }
    }),
    prisma.dataRetentionPolicy.create({
      data: {
        entityType: RetentionEntityType.TELECOM_SESSIONS,
        retentionPeriodDays: 180,
        actionAfterExpiry: RetentionAction.AGGREGATE,
        storageTier: StorageTier.WARM,
        complianceRequirements: JSON.stringify(['Telecom_Regulations', 'Privacy_Law']),
        isEnabled: true
      }
    }),
    prisma.dataRetentionPolicy.create({
      data: {
        entityType: RetentionEntityType.SS7_MESSAGES,
        retentionPeriodDays: 365,
        actionAfterExpiry: RetentionAction.ARCHIVE,
        storageTier: StorageTier.WARM,
        customRules: JSON.stringify([{ condition: 'anomaly_score > 80', overrideRetention: 1825 }]),
        isEnabled: true
      }
    })
  );

  console.log(`  ✅ Created ${retentionPolicies.length} data retention policies`);

  return { auditLogs, reports, configs, retentionPolicies };
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main() {
  console.log('════════════════════════════════════════════');
  console.log('   NATIONAL SOC PLATFORM - DATABASE SEEDER   ');
  console.log('════════════════════════════════════════════');
  console.log(`\n⏰ Started at: ${new Date().toISOString()}`);
  console.log(`📊 Configuration:`);
  console.log(`   Users: ${SEED_CONFIG.users}`);
  console.log(`   Alerts: ${SEED_CONFIG.alerts}`);
  console.log(`   Incidents: ${SEED_CONFIG.incidents}`);
  console.log(`   Threat Indicators: ${SEED_CONFIG.threatIndicators}`);
  console.log(`   Telecom Records: ${SEED_CONFIG.subscribers + SEED_CONFIG.ss7Messages + SEED_CONFIG.gtpSessions}`);

  const startTime = Date.now();

  try {
    // Seed each domain
    const authData = await seedAuthDomain();
    const socData = await seedCoreSOCDomain(authData.users);
    const threatIntelData = await seedThreatIntelDomain();
    const telecomData = await seedTelecomDomain();
    const complianceData = await seedComplianceDomain(authData.users);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n════════════════════════════════════════════');
    console.log('              SEEDING COMPLETE               ');
    console.log('════════════════════════════════════════════');
    console.log(`\n✅ All domains seeded successfully!`);
    console.log(`\n📈 Summary:`);
    console.log(`   ⏱️  Duration: ${duration}s`);
    console.log(`   👥 Users: ${authData.users.length}`);
    console.log(`   🚨 Alerts: ${socData.alerts.length}`);
    console.log(`   🔥 Incidents: ${socData.incidents.length}`);
    console.log(`   🎯 Indicators: ${threatIntelData.indicators.length}`);
    console.log(`   📡 Subscribers: ${telecomData.subscribers.length}`);
    console.log(`   📋 Audit Logs: ${complianceData.auditLogs.length}`);
    console.log(`\n💡 Tip: Use "npm run db:reset" to reset and re-seed\n`);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
