import { PrismaClient, AlertSeverity, AlertStatus, IncidentPriority, IncidentStatus, ThreatCapability, ThreatActivity, IOCType, IOCThreatLevel, ComponentStatus, DataSourceStatus, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding National SOC Database - Algeria...\n')

  // ==================== USERS ====================
  console.log('📦 Creating users...')
  
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'ahmed.benali@soc.gov.dz' },
      update: {},
      create: {
        email: 'ahmed.benali@soc.gov.dz',
        name: 'Ahmed Benali',
        passwordHash: '$2b$10$hashed_password_here', // In production, use bcrypt
        role: UserRole.ANALYST,
        department: 'Incident Response Team',
        isActive: true,
      }
    }),
    prisma.user.upsert({
      where: { email: 'fatima.zerhouni@soc.gov.dz' },
      update: {},
      create: {
        email: 'fatima.zerhouni@soc.gov.dz',
        name: 'Fatima Zerhouni',
        passwordHash: '$2b$10$hashed_password_here',
        role: UserRole.SUPERVISOR,
        department: 'Threat Intelligence Unit',
        isActive: true,
      }
    }),
    prisma.user.upsert({
      where: { email: 'karim.mansouri@soc.gov.dz' },
      update: {},
      create: {
        email: 'karim.mansouri@soc.gov.dz',
        name: 'Karim Mansouri',
        passwordHash: '$2b$10$hashed_password_here',
        role: UserRole.ANALYST,
        department: 'Malware Analysis Lab',
        isActive: true,
      }
    }),
    prisma.user.upsert({
      where: { email: 'amina.khaled@soc.gov.dz' },
      update: {},
      create: {
        email: 'amina.khaled@soc.gov.dz',
        name: 'Amina Khaled',
        passwordHash: '$2b$10$hashed_password_here',
        role: UserRole.ANALYST,
        department: 'SOC Operations',
        isActive: true,
      }
    }),
    prisma.user.upsert({
      where: { email: 'omar.hassani@soc.gov.dz' },
      update: {},
      create: {
        email: 'omar.hassani@soc.gov.dz',
        name: 'Omar Hassani',
        passwordHash: '$2b$10$hashed_password_here',
        role: UserRole.ADMIN,
        department: 'SOC Management',
        isActive: true,
      }
    })
  ])

  console.log(`   ✅ Created ${users.length} users`)

  // ==================== SYSTEM COMPONENTS ====================
  console.log('🖥️  Creating system components...')
  
  const components = await Promise.all([
    prisma.systemComponent.upsert({
      where: { name: 'Wazuh SIEM Cluster' },
      update: {},
      create: {
        name: 'Wazuh SIEM Cluster',
        type: 'SIEM',
        status: ComponentStatus.HEALTHY,
        uptime: 99.97,
        cpuUsage: 45,
        memoryUsage: 62,
        diskUsage: 58,
        lastCheck: new Date(),
        responseTimeMs: 45,
        errorRate: 0.01,
        hostname: 'siem-cluster-01.soc.local',
        ipAddress: '192.168.1.10',
        version: '4.7.0'
      }
    }),
    prisma.systemComponent.upsert({
      where: { name: 'TheHive SOAR Platform' },
      update: {},
      create: {
        name: 'TheHive SOAR Platform',
        type: 'SOAR',
        status: ComponentStatus.HEALTHY,
        uptime: 99.99,
        cpuUsage: 28,
        memoryUsage: 45,
        diskUsage: 42,
        lastCheck: new Date(),
        responseTimeMs: 120,
        errorRate: 0.05,
        hostname: 'soar-01.soc.local',
        ipAddress: '192.168.1.11',
        version: '5.3.0'
      }
    }),
    prisma.systemComponent.upsert({
      where: { name: 'Wazuh EDR Agents' },
      update: {},
      create: {
        name: 'Wazuh EDR Agents',
        type: 'EDR',
        status: ComponentStatus.DEGRADED,
        uptime: 98.5,
        cpuUsage: 72,
        memoryUsage: 78,
        diskUsage: 35,
        lastCheck: new Date(),
        responseTimeMs: 250,
        errorRate: 2.5,
        version: '4.7.0',
        incidentCount: 5
      }
    }),
    prisma.systemComponent.upsert({
      where: { name: 'MISP Threat Intel' },
      update: {},
      create: {
        name: 'MISP Threat Intel',
        type: 'TIP',
        status: ComponentStatus.HEALTHY,
        uptime: 99.95,
        cpuUsage: 35,
        memoryUsage: 55,
        diskUsage: 67,
        lastCheck: new Date(),
        responseTimeMs: 85,
        errorRate: 0.1,
        hostname: 'misp-01.soc.local',
        ipAddress: '192.168.1.12',
        version: '2.4.180'
      }
    }),
    prisma.systemComponent.upsert({
      where: { name: 'Suricata IDS' },
      update: {},
      create: {
        name: 'Suricata IDS (Suricata)',
        type: 'IDS',
        status: ComponentStatus.HEALTHY,
        uptime: 99.98,
        cpuUsage: 55,
        memoryUsage: 48,
        diskUsage: 30,
        lastCheck: new Date(),
        responseTimeMs: 15,
        errorRate: 0.02,
        hostname: 'ids-01.soc.local',
        ipAddress: '192.168.1.13',
        version: '7.0.0'
      }
    }),
    prisma.systemComponent.upsert({
      where: { name: 'Elasticsearch Storage' },
      update: {},
      create: {
        name: 'Elasticsearch Storage',
        type: 'STORAGE',
        status: ComponentStatus.HEALTHY,
        uptime: 99.99,
        cpuUsage: 38,
        memoryUsage: 68,
        diskUsage: 75,
        lastCheck: new Date(),
        responseTimeMs: 8,
        errorRate: 0.001,
        hostname: 'es-cluster-01.soc.local',
        ipAddress: '192.168.1.20',
        version: '8.12.0'
      }
    })
  ])

  console.log(`   ✅ Created ${components.length} system components`)

  // ==================== DATA SOURCES ====================
  console.log('📡 Creating data sources...')
  
  const dataSources = await Promise.all([
    prisma.dataSource.upsert({
      where: { name: 'Firewall Logs' },
      update: {},
      create: {
        name: 'Firewall Logs',
        type: 'Palo Alto PA-5060',
        status: DataSourceStatus.CONNECTED,
        eps: 125000,
        eventsToday: BigInt(10800000),
        eventsTotal: BigInt(93312000000),
        retentionDays: 90
      }
    }),
    prisma.dataSource.upsert({
      where: { name: 'DNS Traffic' },
      update: {},
      create: {
        name: 'DNS Traffic',
        type: 'BIND/DNS Server',
        status: DataSourceStatus.CONNECTED,
        eps: 89000,
        eventsToday: BigInt(7690000),
        eventsTotal: BigInt(66441600000),
        retentionDays: 30
      }
    }),
    prisma.dataSource.upsert({
      where: { name: 'Active Directory' },
      update: {},
      create: {
        name: 'Active Directory',
        type: 'Microsoft AD DC',
        status: DataSourceStatus.CONNECTED,
        eps: 45000,
        eventsToday: BigInt(3888000),
        eventsTotal: BigInt(33592320000),
        retentionDays: 180
      }
    }),
    prisma.dataSource.upsert({
      where: { name: 'Proxy/Web Gateway' },
      update: {},
      create: {
        name: 'Proxy/Web Gateway',
        type: 'Squid Proxy',
        status: DataSourceStatus.WARNING,
        eps: 156000,
        eventsToday: BigInt(13478400),
        eventsTotal: BigInt(116450880000),
        retentionDays: 60,
        errorMessage: 'High latency detected on secondary node'
      }
    }),
    prisma.dataSource.upsert({
      where: { name: 'Email Gateway' },
      update: {},
      create: {
        name: 'Email Gateway',
        type: 'Postfix + SpamAssassin',
        status: DataSourceStatus.CONNECTED,
        eps: 32000,
        eventsToday: BigInt(2764800),
        eventsTotal: BigInt(23887872000),
        retentionDays: 90
      }
    }),
    prisma.dataSource.upsert({
      where: { name: 'Endpoint Agents' },
      update: {},
      create: {
        name: 'Endpoint Agents',
        type: 'Wazuh Agent v4.7',
        status: DataSourceStatus.ERROR,
        eps: 285000,
        eventsToday: BigInt(24624000),
        eventsTotal: BigInt(212713280000),
        retentionDays: 30,
        errorMessage: 'Connection timeout on 147 agents (0.1%)',
        errorCount: 147
      }
    })
  ])

  console.log(`   ✅ Created ${dataSources.length} data sources`)

  // ==================== THREAT ACTORS ====================
  console.log('🎭 Creating threat actors...')
  
  const threatActors = await Promise.all([
    prisma.threatActor.upsert({
      where: { name: 'APT28 (Fancy Bear)' },
      update: {},
      create: {
        name: 'APT28 (Fancy Bear)',
        aliases: 'Sofacy, Fancy Bear, STRONTIUM',
        country: 'Russia',
        capability: ThreatCapability.ADVANCED,
        activityStatus: ThreatActivity.ACTIVE,
        targetSectors: JSON.stringify(['Government', 'Defense', 'Diplomatic', 'Energy']),
        targetRegions: JSON.stringify(['NATO countries', 'Eastern Europe', 'MENA']),
        motivation: 'Espionage, Geopolitical intelligence',
        confidence: 95,
        lastSeen: new Date('2026-07-22'),
        firstSeen: new Date('2015-01-01'),
        description: 'Russian GRU-linked APT group specializing in credential harvesting and strategic espionage.',
        ttps: JSON.stringify(['T1566', 'T1059', 'T1078', 'T1027']),
        references: JSON.stringify(['https://www.mitre.org/groups/G0007'])
      }
    }),
    prisma.threatActor.upsert({
      where: { name: 'APT29 (Cozy Bear)' },
      update: {},
      create: {
        name: 'APT29 (Cozy Bear)',
        aliases: 'Cozy Bear, The Dukes, Midnight Blizzard',
        country: 'Russia',
        capability: ThreatCapability.ADVANCED,
        activityStatus: ThreatActivity.ACTIVE,
        targetSectors: JSON.stringify(['Intelligence', 'Research', 'Energy', 'Healthcare']),
        targetRegions: JSON.stringify(['Global', 'Europe', 'North America']),
        motivation: 'Strategic espionage, Supply chain attacks',
        confidence: 92,
        lastSeen: new Date('2026-07-20'),
        firstSeen: new Date('2008-06-01'),
        description: 'SVR-linked group known for sophisticated supply chain and cloud-based operations.',
        ttps: JSON.stringify(['T1195', 'T1565', 'T1534']),
        references: JSON.stringify(['https://www.mitre.org/groups/G0016'])
      }
    }),
    prisma.threatActor.upsert({
      where: { name: 'Lazarus Group' },
      update: {},
      create: {
        name: 'Lazarus Group',
        aliases: 'Hidden Cobra, Zinc, Labyrinth Chollima',
        country: 'North Korea',
        capability: ThreatCapability.ADVANCED,
        activityStatus: ThreatActivity.ACTIVE,
        targetSectors: JSON.stringify(['Financial', 'Defense', 'Cryptocurrency', 'Government']),
        targetRegions: JSON.stringify(['Global', 'Asia-Pacific', 'Southeast Asia']),
        motivation: 'Financial gain, Espionage, Regime funding',
        confidence: 89,
        lastSeen: new Date('2026-07-21'),
        firstSeen: new Date('2009-01-01'),
        description: 'DPRK state-sponsored group focused on financial theft via SWIFT attacks, cryptocurrency heists, and ransomware.',
        ttps: JSON.stringify(['T1119', 'T1003', 'T1078']),
        references: JSON.stringify(['https://www.mitre.org/groups/G0032'])
      }
    }),
    prisma.threatActor.upsert({
      where: { name: 'Silent Librarian' },
      update: {},
      create: {
        name: 'Silent Librarian',
        aliases: 'TA407, Cobalt Illusions',
        country: 'Iran',
        capability: ThreatCapability.MODERATE,
        activityStatus: ThreatActivity.ACTIVE,
        targetSectors: JSON.stringify(['Academic', 'Research', 'Government', 'Travel']),
        targetRegions: JSON.stringify(['US', 'Europe', 'Middle East']),
        motivation: 'Intellectual property theft, Surveillance',
        confidence: 85,
        lastSeen: new Date('2026-07-18'),
        firstSeen: new Date('2013-01-01'),
        description: 'Iranian threat group targeting academic institutions for research data and credentials.',
        ttps: JSON.stringify(['T1566', 'T1110', 'T1078']),
        references: JSON.stringify(['https://www.mitre.org/groups/TA407'])
      }
    })
  ])

  console.log(`   ✅ Created ${threatActors.length} threat actors`)

  // ==================== IOCs ====================
  console.log('🎯 Creating indicators of compromise (IOCs)...')
  
  const iocs = await Promise.all([
    prisma.iOC.create({
      data: {
        type: IOCType.IP,
        value: '185.220.101[.]34',
        threatLevel: IOCThreatLevel.CRITICAL,
        source: 'MISP Community',
        description: 'Known C2 server associated with APT28 operations. Active since 2024.',
        tags: JSON.stringify(['c2', 'apt28', 'russia', 'malicious']),
        campaign: 'Operation GhostEmperor',
        threatActorId: threatActors[0].id, // APT28
        detectionCount: 1247,
        lastDetected: new Date('2026-07-22')
      }
    }),
    prisma.iOC.create({
      data: {
        type: IOCType.DOMAIN,
        value: 'malicious-cdn[.]tk',
        threatLevel: IOCThreatLevel.HIGH,
        source: 'AlienVault OTX',
        description: 'Domain used for malware distribution in phishing campaigns.',
        tags: JSON.stringify(['phishing', 'malware', 'cdn']),
        malwareFamily: 'Emotet',
        detectionCount: 856,
        lastDetected: new Date('2026-07-21')
      }
    }),
    prisma.iOC.create({
      data: {
        type: IOCType.HASH_SHA256,
        value: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
        threatLevel: IOCThreatLevel.HIGH,
        source: 'VirusTotal',
        description: 'BlackCat/ALPHV ransomware payload hash. Detected in recent finance sector attack.',
        tags: JSON.stringify(['ransomware', 'blackcat', 'alphv', 'malware']),
        malwareFamily: 'BlackCat/ALPHV',
        campaign: 'Finance Sector Campaign 2026',
        detectionCount: 234,
        lastDetected: new Date('2026-07-23')
      }
    }),
    prisma.iOC.create({
      data: {
        type: IOCType.URL,
        value: 'hxxp://phishing[.]xyz/login/govdz',
        threatLevel: IOCThreatLevel.MEDIUM,
        source: 'PhishTank',
        description: 'Algerian government portal phishing clone targeting employee credentials.',
        tags: JSON.stringify(['phishing', 'credential-harvesting', 'government']),
        detectionCount: 89,
        lastDetected: new Date('2026-07-22')
      }
    }),
    prisma.iOC.create({
      data: {
        type: IOCType.IP,
        value: '45.33.32[.]156',
        threatLevel: IOCThreatLevel.CRITICAL,
        source: 'AutoFocus (Palo Alto)',
        description: 'Brute force attack origin IP targeting SSH services across MENA region.',
        tags: JSON.stringify(['brute-force', 'ssh', 'scanning']),
        detectionCount: 3421,
        lastDetected: new Date('2026-07-23')
      }
    })
  ])

  console.log(`   ✅ Created ${iocs.length} IOCs`)

  // ==================== ALERTS ====================
  console.log('🚨 Creating security alerts...')
  
  const alerts = await Promise.all([
    prisma.alert.create({
      data: {
        alertId: 'ALT-2026-00147',
        timestamp: new Date('2026-07-23T16:38:22Z'),
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.NEW,
        source: 'Wazuh SIEM',
        title: 'Ransomware Detection Pattern Match',
        description: 'Multiple file encryption events detected on workstation FIN-DEPT-0142. Potential BlackCat/ALPHV ransomware activity. Immediate containment required.',
        endpoint: 'FIN-DEPT-0142',
        category: 'Malware',
        mitreTactic: 'Impact',
        mitreTechnique: 'T1486'
      }
    }),
    prisma.alert.create({
      data: {
        alertId: 'ALT-2026-00146',
        timestamp: new Date('2026-07-23T16:35:10Z'),
        severity: AlertSeverity.HIGH,
        status: AlertStatus.INVESTIGATING,
        source: 'Wazuh EDR',
        title: 'Suspicious PowerShell Execution',
        description: 'Encoded PowerShell command executed with -enc flag on HR server. Possible living-off-the-land technique or lateral movement attempt.',
        endpoint: 'HR-SRV-0089',
        category: 'Execution',
        mitreTactic: 'Execution',
        mitreTechnique: 'T1059.001'
      }
    }),
    prisma.alert.create({
      data: {
        alertId: 'ALT-2026-00145',
        timestamp: new Date('2026-07-23T16:32:45Z'),
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACKNOWLEDGED,
        source: 'MISP TIP',
        title: 'IOC Match: Known APT Indicator',
        description: 'C2 server IP 185.220.101[.]34 detected in outbound traffic from external gateway. IP associated with APT28 operations.',
        endpoint: 'EXT-GW-002',
        category: 'Command & Control',
        mitreTactic: 'Command & Control',
        mitreTechnique: 'T1071.001'
      }
    }),
    prisma.alert.create({
      data: {
        alertId: 'ALT-2026-00144',
        timestamp: new Date('2026-07-23T16:28:33Z'),
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.INVESTIGATING,
        source: 'Suricata IDS',
        title: 'Potential SQL Injection Attempt',
        description: 'Multiple SQL injection patterns (UNION-based, boolean-based) detected against web application portal.gov.dz from IP 203.0.113[.]47.',
        endpoint: 'WEB-PROXY-01',
        category: 'Initial Access',
        mitreTactic: 'Initial Access',
        mitreTechnique: 'T1190'
      }
    }),
    prisma.alert.create({
      data: {
        alertId: 'ALT-2026-00143',
        timestamp: new Date('2026-07-23T16:25:18Z'),
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.ACKNOWLEDGED,
        source: 'Wazuh FIM',
        title: 'Critical File Modification Detected',
        description: '/etc/passwd modification detected on database server DB-MASTER-01. Unauthorized change attempt by non-root user.',
        endpoint: 'DB-MASTER-01',
        category: 'Persistence',
        mitreTactic: 'Persistence',
        mitreTechnique: 'T1098'
      }
    }),
    prisma.alert.create({
      data: {
        alertId: 'ALT-2026-00142',
        timestamp: new Date('2026-07-23T16:20:05Z'),
        severity: AlertSeverity.LOW,
        status: AlertStatus.RESOLVED,
        source: 'Wazuh SIEM',
        title: 'Multiple Failed Login Attempts',
        description: '15 failed SSH login attempts from IP 203.0.113[.]47 within 5 minutes. Brute force indicator. Source IP blocked at firewall.',
        endpoint: 'SSH-BASTION',
        category: 'Credential Access',
        mitreTactic: 'Credential Access',
        mitreTechnique: 'T1110.004',
        resolvedAt: new Date('2026-07-23T16:35:00Z')
      }
    }),
    prisma.alert.create({
      data: {
        alertId: 'ALT-2026-00141',
        timestamp: new Date('2026-07-23T16:15:42Z'),
        severity: AlertSeverity.INFO,
        status: AlertStatus.RESOLVED,
        source: 'TheHive SOAR',
        title: 'Automated Playbook Executed',
        description: 'Phishing analysis playbook completed successfully. Email classified as spam with 98% confidence. No further action required.',
        endpoint: 'MAIL-GW-01',
        category: 'Automation',
        resolvedAt: new Date('2026-07-23T16:18:00Z')
      }
    })
  ])

  console.log(`   ✅ Created ${alerts.length} alerts`)

  // ==================== INCIDENTS ====================
  console.log('📋 Creating incidents...')
  
  const incidents = await Promise.all([
    prisma.incident.create({
      data: {
        incidentId: 'INC-2026-0023',
        title: 'Ransomware Outbreak - Finance Department',
        description: 'BlackCat/ALPHV ransomware detected spreading across finance network. Initial infection on workstation FIN-DEPT-0142, now affecting 12 endpoints. Isolation procedures initiated. Critical files encrypted with .alphv extension.',
        severity: IncidentPriority.P1,
        status: IncidentStatus.OPEN,
        category: 'Malware',
        assigneeId: users[0].id, // Ahmed B.
        detectedAt: new Date('2026-07-23T14:22:00Z'),
        containedAt: null,
        eradicatedAt: null,
        recoveredAt: null,
        closedAt: null,
        mttrHours: null,
        actionsTaken: 8,
        affectedSystems: 12,
        dataBreach: false,
        publicImpact: false
      }
    }),
    prisma.incident.create({
      data: {
        incidentId: 'INC-2026-0022',
        title: 'Credential Stuffing Attack - Portal Login',
        description: 'Large-scale credential stuffing attack against government portal using leaked password database. Over 500 accounts targeted, 23 successful authentications before detection. Password reset forced for all affected accounts.',
        severity: IncidentPriority.P2,
        status: IncidentStatus.CONTAINED,
        category: 'Unauthorized Access',
        assigneeId: users[1].id, // Fatima Z.
        detectedAt: new Date('2026-07-23T10:15:00Z'),
        containedAt: new Date('2026-07-23T11:00:00Z'),
        eradicatedAt: new Date('2026-07-23T13:00:00Z'),
        recoveredAt: null,
        closedAt: null,
        mttrHours: 4.5,
        actionsTaken: 12,
        affectedSystems: 2,
        dataBreach: false,
        publicImpact: false,
        resolution: 'Source IPs blocked. Compromised passwords reset. MFA enforcement accelerated.'
      }
    }),
    prisma.incident.create({
      data: {
        incidentId: 'INC-2026-0021',
        title: 'Data Exfiltration Attempt - Research Lab',
        description: 'Unusual large file transfers (total ~45GB) detected to external IP 91.121.87[.]42 from research lab server. Pattern consistent with data staging prior to exfiltration. Threat actor access revoked during investigation.',
        severity: IncidentPriority.P1,
        status: IncidentStatus.ERADICATED,
        category: 'Data Breach',
        assigneeId: users[2].id, // Karim M.
        detectedAt: new Date('2026-07-22T22:40:00Z'),
        containedAt: new Date('2026-07-22T23:15:00Z'),
        eradicatedAt: new Date('2026-07-23T02:30:00Z'),
        recoveredAt: null,
        closedAt: null,
        mttrHours: 8.2,
        actionsTaken: 15,
        affectedSystems: 3,
        dataBreach: true,
        publicImpact: false,
        lessonsLearned: 'Need improved DLP rules for large file transfers outside business hours.'
      }
    }),
    prisma.incident.create({
      data: {
        incidentId: 'INC-2026-0020',
        title: 'Phishing Campaign - Government Email',
        description: 'Spear-phishing campaign targeting senior executives with fake IT maintenance request emails. Malicious attachments quarantined. User awareness training deployed organization-wide.',
        severity: IncidentPriority.P3,
        status: IncidentStatus.RECOVERED,
        category: 'Social Engineering',
        assigneeId: users[3].id, // Amina K.
        detectedAt: new Date('2026-07-21T09:30:00Z'),
        containedAt: new Date('2026-07-21T10:00:00Z'),
        eradicatedAt: new Date('2026-07-21T14:00:00Z'),
        recoveredAt: new Date('2026-07-22T08:00:00Z'),
        closedAt: null,
        mttrHours: 18.5,
        actionsTaken: 6,
        affectedSystems: 150,
        dataBreach: false,
        publicImpact: false,
        resolution: 'All malicious emails quarantined. 47 users completed additional security training.'
      }
    }),
    prisma.incident.create({
      data: {
        incidentId: 'INC-2019-0019',
        title: 'DDoS Mitigation - Public Services Portal',
        description: 'Volumetric DDoS attack (peak 45Gbps) mitigated via CDN failover and anycast routing. Root cause identified as rented botnet. Enhanced rate limiting implemented across all public-facing services.',
        severity: IncidentPriority.P2,
        status: IncidentStatus.CLOSED,
        category: 'Denial of Service',
        assigneeId: users[4].id, // Omar H.
        detectedAt: new Date('2026-07-20T11:00:00Z'),
        containedAt: new Date('2026-07-20T11:15:00Z'),
        eradicatedAt: new Date('2026-07-20T16:00:00Z'),
        recoveredAt: new Date('2026-07-20T17:00:00Z'),
        closedAt: new Date('2026-07-21T10:00:00Z'),
        mttrHours: 6.0,
        actionsTaken: 9,
        affectedSystems: 5,
        dataBreach: false,
        publicImpact: true,
        resolution: 'CDN configuration hardened. WAF rules updated. Incident report submitted to NCSC.'
      }
    })
  ])

  // Link some alerts to incidents
  await prisma.alert.update({
    where: { id: alerts[0].id },
    data: { incidentId: incidents[0].id } // Ransomware alert → Ransomware incident
  })

  console.log(`   ✅ Created ${incidents.length} incidents`)

  // ==================== DAILY METRICS ====================
  console.log('📊 Creating daily metrics...')
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const dailyMetric = await prisma.dailyMetric.upsert({
    where: { date: today },
    update: {},
    create: {
      date: today,
      totalAlerts: 147,
      criticalAlerts: 12,
      highAlerts: 34,
      mediumAlerts: 67,
      lowAlerts: 34,
      resolvedAlerts: 89,
      totalIncidents: 23,
      p1Incidents: 3,
      p2Incidents: 8,
      p3Incidents: 9,
      p4Incidents: 3,
      closedIncidents: 45,
      avgMTTR: 4.2,
      avgEPS: 847000,
      peakEPS: 1250000,
      totalEvents: BigInt(73100000),
      newIOCs: 347,
      threatsBlocked: 2847,
      endpointsTotal: 148293,
      endpointsOnline: 142847
    }
  })

  console.log(`   ✅ Created daily metrics for ${today.toDateString()}`)

  // ==================== SUMMARY ====================
  console.log('\n✨ Database seeding complete!')
  console.log('\n📊 Summary:')
  console.log(`   Users: ${users.length}`)
  console.log(`   System Components: ${components.length}`)
  console.log(`   Data Sources: ${dataSources.length}`)
  console.log(`   Threat Actors: ${threatActors.length}`)
  console.log(`   IOCs: ${iocs.length}`)
  console.log(`   Alerts: ${alerts.length}`)
  console.log(`   Incidents: ${incidents.length}`)
  console.log(`   Daily Metrics: 1`)
  console.log('\n🎉 National SOC Algeria database is ready for operation!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
