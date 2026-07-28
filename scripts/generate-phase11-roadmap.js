const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableOfContents, LevelFormat, ExternalHyperlink
} = require("docx");
const fs = require("fs");

// Palette: GO-1 (Government/Official - Telco SOC)
const P = {
  primary: "#0B1220",
  body: "#1C2A3D",
  secondary: "#5B6B7D",
  accent: "#3B82F6",
  surface: "#F1F5F9",
  coverBg: "#0F172A",
  coverAccent: "#3B82F6",
  titleColor: "#FFFFFF",
  subtitleColor: "#94A3B8"
};

const c = (hex) => hex.replace("#", "");

// Helper functions
function heading(text, level = HeadingLevel.HEADING_1) {
  const sizes = { [HeadingLevel.HEADING_1]: 32, [HeadingLevel.HEADING_2]: 28, [HeadingLevel.HEADING_3]: 24 };
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 120, line: 312 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: sizes[level] || 24,
        color: c(P.primary),
        font: { ascii: "Calibri", eastAsia: "SimHei" }
      })
    ]
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312 },
    children: [
      new TextRun({
        text,
        size: 24,
        color: c(P.body),
        font: { ascii: "Times New Roman", eastAsia: "SimSun" }
      })
    ]
  });
}

function bodyBold(label, text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312 },
    children: [
      new TextRun({ text: label, bold: true, size: 24, color: c(P.primary), font: { ascii: "Times New Roman", eastAsia: "SimSun" } }),
      new TextRun({ text: text, size: 24, color: c(P.body), font: { ascii: "Times New Roman", eastAsia: "SimSun" } })
    ]
  });
}

function createTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((text, i) =>
      new TableCell({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, size: 21, color: c(P.titleColor), font: { ascii: "Calibri", eastAsia: "SimHei" } })]
        })],
        shading: { type: ShadingType.CLEAR, fill: c(P.accent) },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        width: { size: colWidths[i], type: WidthType.PERCENTAGE }
      })
    )
  });

  const dataRows = rows.map(row =>
    new TableRow({
      cantSplit: true,
      children: row.map((text, i) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text, size: 21, color: c(P.body), font: { ascii: "Times New Roman", eastAsia: "SimSun" } })]
          })],
          shading: { type: ShadingType.CLEAR, fill: rows.indexOf(row) % 2 === 0 ? c(P.surface) : "FFFFFF" },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          width: { size: colWidths[i], type: WidthType.PERCENTAGE }
        })
      )
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D0D5DD" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" }
    },
    rows: [headerRow, ...dataRows]
  });
}

// Cover Recipe R4 (Top Color Block)
function buildCoverR4() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [
      new TableRow({ height: { value: 4000, rule: "exact" }, children: [
        new TableCell({ shading: { type: ShadingType.CLEAR, fill: c(P.coverBg) }, verticalAlign: "top", children: [
          new Paragraph({ spacing: { before: 1200, after: 0 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "DJEZZY NATIONAL SOC PLATFORM", bold: true, size: 36, color: c(P.titleColor), font: { ascii: "Calibri", eastAsia: "SimHei" } })
          ]}),
          new Paragraph({ spacing: { before: 300, after: 0 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Phase 11: Enterprise Production Roadmap", size: 32, color: c(P.subtitleColor), font: { ascii: "Calibri", eastAsia: "SimHei" } })
          ]}),
          new Paragraph({ spacing: { before: 200, after: 0 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Full Open Security Tools Integration & Production Readiness", size: 26, color: c(P.accent), font: { ascii: "Calibri", eastAsia: "SimHei" } })
          ]})
        ]})
      ]}),
      new TableRow({ height: { value: 11838, rule: "exact" }, children: [
        new TableCell({ shading: { type: ShadingType.CLEAR, fill: "FFFFFF" }, verticalAlign: "top", children: [
          new Paragraph({ spacing: { before: 800, after: 200 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Enterprise-Grade Security Operations Center", bold: true, size: 44, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })
          ]}),
          new Paragraph({ spacing: { before: 100, after: 100 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "for Algerian Telecommunications Operator", size: 28, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "SimHei" } })
          ]}),
          new Paragraph({ spacing: { before: 600, after: 200 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Open-Source Cybersecurity Tools Integration | Heavy-Load Database Schema", size: 22, color: c(P.body), font: { ascii: "Times New Roman", eastAsia: "SimSun" } })
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Telco-Scale Architecture (15M+ Subscribers | 1M+ Events/Hour)", size: 22, color: c(P.body), font: { ascii: "Times New Roman", eastAsia: "SimSun" } })
          ]}),
          new Paragraph({ spacing: { before: 1500, after: 0 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Version 1.0 | Confidential", size: 20, color: c(P.secondary), font: { ascii: "Times New Roman", eastAsia: "SimSun" } })
          ]})
        ]})
      ]})
    ]
  });
}

// Document Content
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimSun" }, size: 24, color: c(P.body) },
        paragraph: { spacing: { line: 312 } }
      },
      heading1: { run: { font: { ascii: "SimHei", eastAsia: "SimHei" }, size: 32, bold: true, color: c(P.primary) }, paragraph: { spacing: { before: 360, after: 160, line: 312 } } },
      heading2: { run: { font: { ascii: "SimHei", eastAsia: "SimHei" }, size: 28, bold: true, color: c(P.primary) }, paragraph: { spacing: { before: 280, after: 140, line: 312 } } },
      heading3: { run: { font: { ascii: "SimHei", eastAsia: "SimHei" }, size: 24, bold: true, color: c(P.primary) }, paragraph: { spacing: { before: 240, after: 120, line: 312 } } }
    }
  },
  numbering: {
    config: [
      { reference: "list-exec", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "list-tools", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "list-siem", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "list-edr", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "list-soar", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "list-ti", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "list-db", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "list-api", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "list-perf", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "list-timeline", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "list-security", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [
    // SECTION 1: COVER
    { properties: { page: { margin: { top: 0, bottom: 0, left: 0, right: 0 } } }, children: [buildCoverR4()] },

    // SECTION 2: TOC + BODY
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Djezzy National SOC Platform - Phase 11 Enterprise Roadmap", size: 18, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "SimHei" } })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: c(P.secondary) })]
          })]
        })
      },
      children: [
        // TOC
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Table of Contents", bold: true })] }),
        new TableOfContents(),
        new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "", children: [new PageBreak()] })] }),

        // 1. EXECUTIVE SUMMARY
        heading("1. Executive Summary"),
        body("This Phase 11 Enterprise Production Roadmap defines the comprehensive strategy for transforming the Djezzy National SOC Platform from a development prototype into a fully operational, production-ready Security Operations Center capable of supporting real-world telecommunications operations at national scale. The roadmap addresses three critical dimensions of enterprise readiness: complete integration of industry-standard open-source cybersecurity tools, database architecture optimized for telco-grade workloads, and production-hardened infrastructure designed for 24/7 mission-critical operations."),
        body("The Algerian telecommunications market presents unique challenges that demand specialized security capabilities. With approximately 15 million mobile subscribers and network infrastructure spanning thousands of cell towers, data centers, and interconnection points across the country, the SOC platform must process millions of security events per hour while maintaining sub-second response times for critical alerts. This roadmap provides the technical blueprint for achieving these requirements through strategic integration of proven open-source security tools and enterprise-grade architectural patterns."),
        body("The implementation strategy prioritizes operational continuity during the transition period, ensuring that existing security monitoring capabilities remain functional while new systems are deployed incrementally. Each integration phase includes comprehensive testing protocols, rollback procedures, and performance validation criteria to minimize risk during the production migration. The total estimated timeline for full enterprise deployment spans approximately 12 months, organized into four major milestones with clear deliverables and acceptance criteria."),

        // Key Objectives Table
        new Paragraph({ spacing: { before: 300, after: 150 }, children: [new TextRun({ text: "Key Strategic Objectives:", bold: true, size: 24, color: c(P.primary) })] }),
        createTable(
          ["Objective", "Target Metric", "Priority"],
          [
            ["Full Open-Source Tool Integration", "10+ security platforms integrated", "Critical"],
            ["Database Scalability", "1M+ events/hour ingestion capacity", "Critical"],
            ["API Backend Implementation", "RESTful APIs replacing all mock data", "High"],
            ["Production Infrastructure", "99.95% uptime SLA achievement", "Critical"],
            ["Security Compliance", "ISO 27001 / NIST alignment", "High"]
          ],
          [40, 35, 25]
        ),

        // 2. OPEN SECURITY TOOLS INTEGRATION ARCHITECTURE
        heading("2. Open Security Tools Integration Architecture"),
        body("The foundation of an effective Security Operations Center lies in the seamless integration of specialized cybersecurity tools, each addressing specific domains of the threat detection and response lifecycle. This section details the comprehensive integration architecture that brings together best-of-breed open-source security platforms into a unified operational framework. The selected tool stack represents the culmination of extensive evaluation against criteria including feature completeness, community support, scalability characteristics, and compatibility with existing Djezzy infrastructure."),
        body("The integration architecture follows a hub-and-spoke model where the Djezzy SOC Platform serves as the central orchestration layer, providing unified dashboards, workflow management, and cross-tool correlation capabilities. Each integrated tool maintains its specialized functionality while contributing data and insights to the central platform through standardized APIs and message queues. This approach preserves the strengths of individual tools while eliminating operational silos that typically plague multi-vendor security environments."),

        // 2.1 SIEM Integration
        heading("2.1 SIEM Platform Integration (Wazuh / ELK Stack)"),
        body("The Security Information and Event Management (SIEM) platform serves as the central nervous system of the SOC, aggregating logs from across the entire technology ecosystem and applying analytics to identify potential security incidents. For the Djezzy National SOC Platform, we recommend a dual-layer SIEM architecture combining Wazuh for host-level security monitoring with the ELK Stack (Elasticsearch, Logstash, Kibana) for network-scale log aggregation and advanced analytics."),
        body("Wazuh provides agent-based security monitoring with built-in capabilities including File Integrity Monitoring (FIM), vulnerability detection, configuration assessment, and compliance monitoring. Its lightweight agent design supports deployment across diverse endpoints including Linux servers, Windows workstations, network devices through syslog integration, and cloud infrastructure through API connectors. The Wazuh server components integrate directly with Elasticsearch for long-term storage and Kibana for visualization, creating a cohesive SIEM solution."),
        
        new Paragraph({ numbering: { reference: "list-siem", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Wazuh Agent Deployment: Deploy agents to all 500+ servers in Djezzy infrastructure including core network elements (HLR, MSC, SGSN/GGSN), IT infrastructure (Active Directory, email servers, DNS), and OT/SCADA systems controlling physical network equipment. Configure agent groups based on system role with tailored rule sets for each environment.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-siem", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Elasticsearch Cluster: Implement a 15-node Elasticsearch cluster with dedicated master nodes (3), data nodes (9), and coordinator nodes (3). Configure index lifecycle policies with hot-warm-cold architecture: 7 days hot storage on NVMe SSDs, 30 days warm storage on SATA SSDs, 1 year cold storage on high-capacity HDDs, with archival to object storage thereafter.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-siem", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Logstash Pipeline: Design multi-stage Logstash pipelines for CDR processing (Call Detail Records from switches), firewall logs (Palo Alto, Fortinet, Check Point), authentication logs (Kerberos, RADIUS, LDAP), and application logs (custom JSON formats from BSS/OSS systems). Implement Grok patterns for proprietary telco log formats.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-siem", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Kibana Dashboards: Develop operator-specific dashboards for NOC teams (network health, traffic anomalies), fraud teams (SIM swap detection, call pattern analysis), and SOC analysts (threat hunting, incident investigation). Embed Kibana visualizations within the Djezzy SOC Platform using iframe integration with SSO passthrough.", size: 24, color: c(P.body) })] }),

        // SIEM Integration Specifications Table
        new Paragraph({ spacing: { before: 300, after: 150 }, children: [new TextRun({ text: "SIEM Component Specifications:", bold: true, size: 24, color: c(P.primary) })] }),
        createTable(
          ["Component", "Specification", "Capacity"],
          [
            ["Wazuh Server", "4x cluster, 16 vCPU, 64GB RAM each", "50,000 EPS aggregate"],
            ["Elasticsearch Data Nodes", "9x cluster, 32 vCPU, 128GB RAM, 2TB NVMe", "2TB/day ingestion"],
            ["Logstash Processors", "6x cluster, 16 vCPU, 32GB RAM each", "100,000 events/sec"],
            ["Kibana Instances", "3x HA pair, 8 vCPU, 16GB RAM each", "200 concurrent users"],
            ["Total Storage (Year 1)", "Hot: 14TB + Warm: 60TB + Cold: 240TB", "365-day retention"]
          ],
          [30, 45, 25]
        ),

        // 2.2 EDR Integration
        heading("2.2 Endpoint Detection & Response (Wazuh + GRR + Osquery)"),
        body("Endpoint Detection and Response capabilities provide visibility into endpoint behavior enabling detection of sophisticated threats that evade traditional perimeter-based defenses. The recommended EDR stack combines Wazuh's host-based monitoring with Google Rapid Response (GRR) for remote live forensics and Osquery for normalized endpoint data collection. This layered approach ensures comprehensive coverage from routine security monitoring to deep-dive incident investigation."),
        body("GRR's client-server architecture enables SOC analysts to execute forensic collections on-demand without disrupting endpoint operations. Common use cases include memory acquisition from compromised systems, timeline reconstruction of attacker activity, and malware sample retrieval for sandbox analysis. Integration with the Djezzy SOC Platform allows analysts to initiate GRR flows directly from incident tickets, with results automatically attached to case files for evidentiary purposes."),
        
        new Paragraph({ numbering: { reference: "list-edr", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Osquery Deployment: Deploy Osquery agents alongside Wazuh on all managed endpoints with scheduled queries running every 5 minutes for security-relevant data points (listening ports, running processes, user accounts, cron jobs, browser extensions, installed software). Use Kolide Fleet or osquery-manager for centralized query distribution and result aggregation.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-edr", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "GRR Server Infrastructure: Deploy a 3-node GRR server cluster with PostgreSQL backend for scalable remote forensics capability. Configure automatic approval workflows for emergency access and maintain detailed audit logs of all forensic actions for compliance reporting. Integrate with Velociraptor as alternative for resource-constrained environments.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-edr", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Behavioral Analytics Engine: Implement Sigma rule conversion pipeline to translate community-contributed detection rules into Wazuh decoders and Osquery queries. Establish baseline behavioral profiles for different endpoint classes (developer workstations vs. call center terminals vs. server infrastructure) to enable anomaly detection.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-edr", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Endpoint Isolation Capability: Configure network isolation procedures through integration with enterprise NAC (Network Access Control) and firewall management APIs. Enable one-click containment from the SOC dashboard when active threats are detected on endpoints, with automatic documentation for post-incident review.", size: 24, color: c(P.body) })] }),

        // 2.3 SOAR Integration
        heading("2.3 Security Orchestration & Automation (TheHive + Cortex)"),
        body("Security Orchestration, Automation and Response (SOAR) capabilities transform reactive security operations into proactive, efficient workflows by automating repetitive tasks, standardizing response procedures, and enabling collaboration across teams. TheHive serves as the case management and collaboration platform while Cortex provides the analysis engine that automates intelligence lookups against numerous external sources."),
        body("The SOAR integration addresses a critical pain point in SOC operations: alert fatigue caused by the volume of security events generated at telco scale. By implementing automated triage and enrichment workflows, the platform can reduce analyst workload by 60-70% while improving response consistency and reducing mean-time-to-response (MTTR) for genuine incidents. The automation rules are designed following Djezzy-specific playbooks developed in Phase 10, ensuring alignment with organizational processes."),
        
        new Paragraph({ numbering: { reference: "list-soar", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "TheHive Case Management: Deploy TheHive 5.x cluster with Elasticsearch backend for scalable case management. Configure custom case templates aligned with Djezzy IR playbooks (Malware Incident, Data Breach, DDoS Attack, Insider Threat, SIM Swap Fraud, APT Investigation). Implement mandatory fields for compliance reporting and SLA tracking.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-soar", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Cortex Analysis Engine: Deploy Cortex with analyzers for VirusTotal, HybridAnalysis, MISP, AbuseIPDB, AlienVault OTX, Shodan, Censys, URLhaus, PhishTank, and internal Djezzy databases (subscriber reputation, known fraud indicators). Configure responder actions for automated blocking in firewalls, SIEM escalation, and ticket creation.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-soar", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Workflow Automation: Design automated playbooks using TheHive's built-in workflow engine for common scenarios: phishing report triage (email analysis, URL extraction, attachment sandboxing, user notification), malware alert enrichment (hash lookup, sandbox execution, IOC extraction, threat intel correlation), and vulnerability alert prioritization (CVSS scoring, asset criticality, exploitability assessment).", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-soar", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "BI Connector Integration: Build bidirectional synchronization between TheHive and the Djezzy SOC Platform dashboard. Cases created in either system automatically mirror to the other, ensuring analysts have consistent view regardless of their primary interface. Implement webhook notifications for case updates, task assignments, and SLA breaches.", size: 24, color: c(P.body) })] }),

        // SOAR Analyzer Configuration Table
        new Paragraph({ spacing: { before: 300, after: 150 }, children: [new TextRun({ text: "Cortex Analyzer Configuration:", bold: true, size: 24, color: c(P.primary) })] }),
        createTable(
          ["Analyzer", "Data Type", "Response Time", "Use Case"],
          [
            ["VirusTotal_v3", "Hash, IP, Domain, URL", "< 5 sec", "Malware detection"],
            ["MISP_2_search", "IOC any type", "< 3 sec", "Threat intel correlation"],
            ["AbuseIPDB_2_0", "IP address", "< 2 sec", "Reputation check"],
            ["HybridAnalysis", "File hash", "< 60 sec", "Sandbox analysis"],
            ["Shodan_Search", "IP address", "< 5 sec", "Service enumeration"],
            ["Djezzy_Subscriber_DB", "MSISDN, IMSI", "< 1 sec", "Fraud investigation"]
          ],
          [25, 25, 20, 30]
        ),

        // 2.4 Threat Intelligence Platform
        heading("2.4 Threat Intelligence Platform (MISP + OpenCTI)"),
        body("Threat Intelligence forms the proactive dimension of security operations, enabling the SOC to anticipate attacks based on indicators observed across the global security community and industry-specific information sharing forums. The recommended architecture deploys MISP (Malware Information Sharing Platform) as the tactical TI store for IOC management and automated sharing, complemented by OpenCTI for strategic intelligence analysis and relationship mapping."),
        body("For telecommunications operators, threat intelligence takes on particular importance due to the sector's attractiveness to nation-state actors, organized crime groups engaged in SIM swapping and toll fraud, and hacktivists targeting communication infrastructure. The TI platform must therefore balance participation in broad communities (sharing general-purpose indicators) with closed-sharing groups focused on telecom-specific threats (SS7/Diameter vulnerabilities, signaling system attacks, roaming fraud patterns)."),
        
        new Paragraph({ numbering: { reference: "list-ti", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "MISP Instance Deployment: Deploy MISP in high-availability configuration with separate instances for production (operational sharing), staging (testing new feeds), and air-gapped (highly sensitive government/intel feeds). Configure synchronization with FIRST.org MISP community, Telecom ISAC, regional CERTs (CERT-DZ, OIC-CERT), and commercial feed providers (Recorded Future, Intel 471 via API).", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-ti", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "OpenCTI Integration: Deploy OpenCTI for advanced threat actor tracking, campaign analysis, and kill chain mapping. Import STIX/TAXII feeds from known APT groups targeting telecom infrastructure (APT28, APT29, Lazarus, Charming Kitten). Build custom telecom-specific attack patterns covering SS7 exploitation, Diameter attacks, and SIM card cloning methodologies.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-ti", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Automated IOC Extraction: Configure automated IOC extraction pipelines from multiple sources: sandbox analysis reports (Cuckoo, Joe Sandbox), dark web monitoring (open-source scrapers, commercial services), mailing list parsing (full-disclosure, bugtraq), and internal incident data (historical IOCs from past investigations). Implement fuzzy matching to handle indicator obfuscation techniques.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-ti", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Bidirectional Feed Sharing: Establish secure sharing relationships with peer telecom operators through Trusted Circles in MISP. Contribute validated IOCs from Djezzy investigations to the broader community while protecting sensitive customer data through proper sanitization workflows. Maintain audit logs of all shared indicators for regulatory compliance.", size: 24, color: c(P.body) })] }),

        // 2.5 Network Security Monitoring
        heading("2.5 Network Security Monitoring (Suricata + Zeek + Arkime)"),
        body("Network Security Monitoring (NSM) provides visibility into network traffic patterns enabling detection of threats that never touch traditional logging systems. The NSM stack combines Suricata for signature and protocol-anomaly-based intrusion detection, Zeek (formerly Bro) for deep application-layer analysis and metadata extraction, and Arkime (formerly Moloch) for full packet capture visualization and retrospective investigation."),
        body("At telco scale, network monitoring presents unique challenges due to the sheer volume of traffic traversing carrier-grade networks. Strategic placement of sensors at key aggregation points (internet borders, data center entrances, interconnect links with other carriers) combined with intelligent filtering ensures comprehensive coverage without overwhelming storage infrastructure. The recommended architecture supports retention of full PCAP data for 30 days with metadata available for 1 year."),
        
        new Paragraph({ spacing: { before: 200, after: 150 }, children: [new TextRun({ text: "NSM Sensor Placement Strategy:", bold: true, size: 24, color: c(P.primary) })] }),
        createTable(
          ["Sensor Location", "Traffic Scope", "Filtering Strategy", "Retention"],
          [
            ["Internet Borders (3x)", "All subscriber internet egress", "Full capture, deduplicated", "PCAP: 7 days, Logs: 90 days"],
            ["Data Center North/South", "Traffic to/from DC applications", "Server VLANs only", "PCAP: 14 days, Logs: 180 days"],
            ["Interconnect Links (5x)", "Roaming partner, voice peering", "Signaling + control plane focus", "PCAP: 30 days, Logs: 1 year"],
            ["Core Network Elements", "Internal management traffic", "Management VLANs only", "PCAP: 30 days, Logs: 1 year"],
            ["DNS/DHCP Infrastructure", "Resolution requests globally", "Anomaly-triggered full capture", "Metadata only: 1 year"]
          ],
          [22, 23, 27, 28]
        ),

        // 2.6 Vulnerability Management
        heading("2.6 Vulnerability Management (OpenVAS + DefectDojo)"),
        body("Vulnerability Management provides systematic identification, prioritization, and remediation tracking for security weaknesses across the Djezzy technology estate. OpenVAS (Open Vulnerability Assessment Scanner) delivers automated vulnerability scanning capability while DefectDojo provides the application security orchestration and correlation layer that aggregates findings from multiple scanner types and tracks remediation progress."),
        body("The vulnerability management program must balance thoroughness with operational safety, particularly when scanning production telecommunication systems where aggressive scanning could potentially disrupt service. The implementation plan includes phased scanning approaches starting with non-intrusive authenticated scans, progressing to unauthenticated external assessments, and culminating in targeted penetration testing of high-value assets by certified security professionals."),

        // 3. ENTERPRISE DATABASE SCHEMA FOR TELCO SCALE
        heading("3. Enterprise Database Schema for Heavy Load"),
        body("Database architecture represents the most critical technical decision for achieving production-ready performance at telco scale. The schema design presented here addresses the unique challenges of telecommunications security operations: extremely high write volumes (millions of CDR records daily), complex analytical queries requiring real-time response, and strict data retention requirements driven by both regulatory compliance and investigative needs."),
        body("The recommended architecture employs PostgreSQL 16 as the primary relational database for transactional workloads, supplemented by TimescaleDB for time-series data optimization, Redis for caching and session management, and ClickHouse for analytical queries on historical data. This polyglot persistence approach ensures optimal performance for each data access pattern while maintaining data consistency through carefully designed synchronization mechanisms."),

        // 3.1 Core Schema Design
        heading("3.1 Core Relational Schema (PostgreSQL 16)"),
        body("The PostgreSQL primary database serves as the system of record for entities requiring ACID guarantees and complex relational queries. The schema is designed around domain-driven principles with clear bounded contexts for each major business area. All tables include standard audit columns (created_at, updated_at, created_by, updated_by) and implement row-level security for multi-tenant access control where applicable."),
        
        new Paragraph({ numbering: { reference: "list-db", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Security Events Partitioning: Implement native PostgreSQL partitioning on the security_events table using RANGE partitioning by created_at timestamp with daily partitions. Each partition inherits indexes from the parent table including b-tree indexes on severity, event_type, source_ip, and GIN indexes on JSONB metadata column. Configure pg_partman for automatic partition creation and retention management (drop partitions older than 13 months).", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-db", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "CDR Storage Optimization: Design denormalized CDR tables optimized for common query patterns (fraud detection, subscriber activity analysis, network quality metrics). Use BRIN (Block Range Index) indexes on time-ordered columns for space efficiency. Consider columnar storage extension (cstore_fdw) for archived CDR data older than 6 months where update frequency is zero.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-db", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Subscriber Data Handling: Implement subscriber tables with horizontal sharding by MSISDN hash across 16 shards for the 15M+ subscriber base. Use Citus extension for distributed query execution if single-instance performance proves insufficient. Maintain lookup tables (IMSI mappings, subscription plans) in replicated form on all shards to avoid cross-shard joins for common queries.", size: 24, color: c(P.body) })] }),
        new Paragraph({ numbering: { reference: "list-db", level: 0 }, spacing: { line: 312 }, children: [new TextRun({ text: "Incident Management Schema: Design normalized schema for incidents, tasks, evidence items, timelines, and communications with foreign key integrity. Implement soft-delete pattern (deleted_at timestamp) for audit trail preservation. Add full-text search indexes on description fields using tsvector columns with English and French dictionaries for bilingual search support.", size: 24, color: c(P.body) })] }),

        // Database Schema Tables
        new Paragraph({ spacing: { before: 300, after: 150 }, children: [new TextRun({ text: "Primary Database Tables Overview:", bold: true, size: 24, color: c(P.primary) })] }),
        createTable(
          ["Table Name", "Est. Rows", "Partitioning", "Index Strategy"],
          [
            ["security_events", "50B+/year", "Daily by created_at", "b-tree + GIN on JSONB"],
            ["cdr_records", "80B+/year", "Monthly by call_date", "BRIN + partial b-tree"],
            ["subscribers", "15M+", "Hash MSISDN (16 shards)", "Unique + lookup indexes"],
            ["incidents", "500K+/year", "None (reference data)", "b-tree + full-text"],
            ["ioc_intelligence", "100M+", "By IOC type", "GIN trigram + btree"],
            ["auth_logs", "2B+/year", "Weekly by timestamp", "Composite b-tree"],
            ["network_flows", "200B+/year", "Hourly by start_time", "BRIN + TimescaleDB hypertable"]
          ],
          [22, 15, 22, 41]
        ),

        // 3.2 Time-Series Optimization
        heading("3.2 Time-Series Data Optimization (TimescaleDB)"),
        body("TimescaleDB extends PostgreSQL with native time-series superpowers through its hypertable abstraction, which automatically partitions data by time intervals while presenting a unified table interface to applications. For the Djezzy SOC Platform, TimescaleDB handles high-volume metric data including network performance measurements, security sensor statistics, and real-time dashboards requiring sub-second query response."),
        body("Continuous aggregates represent a powerful TimescaleDB feature that materializes pre-computed rollups at specified intervals, dramatically accelerating analytical queries that would otherwise need to scan raw data. The implementation plan defines continuous aggregates for common dashboard queries (events per minute by severity, top talker IPs, geographic distribution of threats) refreshed at 1-minute, 1-hour, and 1-day intervals depending on granularity requirements."),

        // 3.3 Connection Pooling
        heading("3.3 Connection Pooling Architecture (PgBouncer)"),
        body("PostgreSQL connection overhead becomes significant at the concurrency levels expected in production (500+ concurrent connections from application servers, background workers, and ad-hoc analysis tools). PgBouncer provides transaction-level connection pooling that reduces effective PostgreSQL connections to approximately 100-200 while supporting thousands of client connections through multiplexing."),
        body("The PgBouncer deployment uses a 3-node cluster behind a virtual IP for high availability, with each node maintaining independent connection pools to the PostgreSQL primary and replicas. Configuration enforces default_pool_size of 25, max_client_conn of 2000, and reserve_pool_size of 10 for burst handling. Application connection strings point to the VIP, enabling transparent failover if the active PgBouncer node fails."),

        // 3.4 Read Replicas
        heading("3.4 Read Replica Strategy for Query Distribution"),
        body("Read-heavy workloads (dashboard queries, report generation, threat hunting searches) are directed to PostgreSQL read replicas to preserve primary database capacity for write operations and transactional queries. The architecture implements cascading replication with 1 primary, 3 synchronous replicas (for HA failover), and 6 asynchronous replicas (for read scaling) distributed across availability zones."),
        body("Application logic uses PgBouncer's routing capabilities to direct read queries to replica pools while ensuring write operations reach the primary. Critical transactions requiring immediate consistency can request synchronous replication confirmation, while bulk operations tolerate eventual consistency with asynchronous propagation. The replication lag monitor triggers alerts when any replica falls behind by more than 5 seconds."),

        // 4. BACKEND API IMPLEMENTATION
        heading("4. Backend API Implementation Plan"),
        body("The current development prototype relies heavily on mock data and placeholder API responses. Transitioning to production requires implementing a complete RESTful API layer backed by the enterprise database and integrated with all security tools. This section defines the API architecture, endpoint specifications, and implementation priorities for building production-ready backend services."),
        body("The API implementation follows a microservices architecture with clearly defined service boundaries: Core API Service (authentication, authorization, user management), Security Events Service (event ingestion, querying, correlation), Incident Management Service (case lifecycle, task assignment, evidence handling), Threat Intelligence Service (IOC management, feed processing, search), and Integration Service (external tool connectors, webhook handlers)."),

        // 4.1 API Architecture
        heading("4.1 API Gateway & Service Mesh"),
        body("All external API traffic passes through Kong API Gateway which handles rate limiting (10,000 requests/minute per API key), authentication (JWT validation, OAuth 2.0 introspection), request routing to backend services, and request/response transformation. Kong plugins enforce security policies including IP whitelisting for internal services, request size limits (max 10MB payload), and SQL injection protection through pattern matching."),
        body("Internal service-to-service communication uses Istio service mesh for mTLS encryption, service discovery, load balancing, and observability. Istio's sidecar proxy pattern ensures all inter-service traffic is encrypted and auditable without requiring application code changes. The mesh configuration defines authorization policies restricting service access based on service identity (e.g., only Incident Management Service may write to Evidence Storage Service)."),

        // 4.2 Core API Endpoints
        heading("4.2 Core API Endpoint Specifications"),
        
        new Paragraph({ spacing: { before: 200, after: 150 }, children: [new TextRun({ text: "Security Events API:", bold: true, size: 24, color: c(P.primary) })] }),
        createTable(
          ["Method", "Endpoint", "Description", "Auth Level"],
          [
            ["POST", "/api/v1/events/ingest", "Batch event ingestion (up to 1000)", "Service Account"],
            ["GET", "/api/v1/events/search", "Full-text search with filters", "Analyst+"],
            ["GET", "/api/v1/events/{id}", "Retrieve single event detail", "Analyst+"],
            ["PUT", "/api/v1/events/{id}/status", "Update event status/triage", "SOC Analyst"],
            ["POST", "/api/v1/events/correlate", "Request correlation analysis", "SOC Analyst"],
            ["GET", "/api/v1/events/stats/aggregated", "Time-series aggregated stats", "Viewer+"]
          ],
          [12, 30, 38, 20]
        ),

        new Paragraph({ spacing: { before: 250, after: 150 }, children: [new TextRun({ text: "Incident Management API:", bold: true, size: 24, color: c(P.primary) })] }),
        createTable(
          ["Method", "Endpoint", "Description", "Auth Level"],
          [
            ["POST", "/api/v1/incidents", "Create new incident case", "SOC Analyst"],
            ["GET", "/api/v1/incidents", "List/filter incidents", "Viewer+"],
            ["GET", "/api/v1/incidents/{id}", "Full incident with timeline", "Assigned User"],
            ["PUT", "/api/v1/incidents/{id}", "Update incident attributes", "Incident Commander"],
            ["POST", "/api/v1/incidents/{id}/tasks", "Add task to incident", "Team Lead"],
            ["POST", "/api/v1/incidents/{id}/evidence", "Upload evidence file", "SOC Analyst"]
          ],
          [12, 30, 38, 20]
        ),

        // 4.3 Authentication & Authorization
        heading("4.3 Authentication & Authorization Framework"),
        body("Authentication integrates with Djezzy corporate identity provider (Microsoft Active Directory Federation Services or equivalent) using OpenID Connect protocol. Users authenticate via SSO flow receiving JWT access tokens (15-minute lifetime) and refresh tokens (7-day lifetime) stored in HTTP-only secure cookies. Multi-factor authentication is mandatory for privileged operations (incident closure, evidence deletion, configuration changes)."),
        body("Authorization implements Role-Based Access Control (RBAC) with hierarchical roles: Viewer (read-only dashboard access), Analyst (create/update assigned incidents), Senior Analyst (all incidents, threat hunting workspace), Team Lead (task assignment, team management), Incident Commander (incident declaration/closure, external coordination), and Administrator (system configuration, user management). Attribute-Based Access Control (ABAC) supplements RBAC for data-sensitive operations (e.g., subscriber PII access requires justification field completion)."),

        // 5. INTEGRATION ARCHITECTURE
        heading("5. Real Integration Architecture"),
        body("Integration architecture defines how the Djezzy SOC Platform connects with external security tools, internal BSS/OSS systems, and third-party data sources. The goal is creating a unified operational picture where data flows seamlessly between systems, analysts work from a single pane of glass, and automated workflows span multiple tools without manual intervention."),

        // 5.1 Message Queue Infrastructure
        heading("5.1 Apache Kafka Event Streaming Backbone"),
        body("Apache Kafka serves as the central nervous system for event streaming between all integrated components. Kafka's durable, partitioned log architecture provides fault tolerance, exactly-once semantics, and the ability to replay historical events for debugging or backfilling scenarios. The Kafka cluster consists of 9 brokers (3 per availability zone) with replication factor of 3 and min.insync.replicas of 2 for durability guarantees."),
        body("Topic design follows domain-event pattern with separate topics for each event source (security-events, cdr-records, auth-logs, network-flows, threat-intel-feeds, incident-updates). Consumers use consumer groups for parallel processing with exactly-once semantics enabled through Kafka transactions. Schema Registry enforces Avro schema compatibility (backward transitive) preventing breaking changes from propagating silently."),

        // 5.2 BSS/OSS Connectors
        heading("5.2 BSS/OSS System Integration Connectors"),
        body("Telecommunications operations depend on Business Support Systems (billing, CRM, subscriber management) and Operational Support Systems (network management, provisioning, fault management). Integration with these systems provides context essential for security investigations: subscriber identity verification, service history examination, and fraud pattern detection."),
        
        new Paragraph({ spacing: { before: 200, after: 150 }, children: [new TextRun({ text: "BSS/OSS Integration Points:", bold: true, size: 24, color: c(P.primary) })] }),
        createTable(
          ["System", "Integration Method", "Data Provided", "Use Case"],
          [
            ["Subscriber DB (HLR/HSS)", "LDAP + SOAP API", "MSISDN, IMSI, status", "Identity verification"],
            ["Billing System", "REST API (custom)", "CDR, payment history", "Fraud investigation"],
            ["CRM System", "SOAP Web Service", "Customer profile, tickets", "Context enrichment"],
            ["Network EMS/NMS", "SNMP traps + REST", "Alarm status, topology", "Infrastructure health"],
            ["Provisioning System", "JMS Queue", "SIM change logs", "SIM swap detection"],
            ["Fraud Management", "Kafka topics", "Alerts, rules fired", "Correlation input"]
          ],
          [20, 22, 25, 33]
        ),

        // 5.3 External Feed Integration
        heading("5.3 External Threat Feed Integration"),
        body("External threat intelligence feeds provide indicators and context from sources beyond Djezzy's direct visibility. The integration architecture normalizes diverse feed formats (STIX/TAXII, CSV, JSON, plain text) into a unified IOC schema stored in the threat intelligence database. Feed quality scoring automatically weights indicator reliability based on source accuracy history."),
        body("Commercial feed providers (Recorded Future, Intel 471, CrowdStrike Falcon X) integrate via their respective APIs with polling intervals ranging from 5 minutes (critical feeds) to hourly (strategic intelligence). Open-source feeds (AlienVault OTX, abuse.ch SSL Blacklist, PhishTank) pull via TAXII servers or direct HTTPS downloads. Community feeds (Telecom ISAC, FIRST) synchronize through MISP's sync mechanism with appropriate filtering for telecom-relevant indicators."),

        // 6. PERFORMANCE OPTIMIZATION STRATEGY
        heading("6. Performance Optimization Strategy"),
        body("Achieving production-ready performance requires systematic optimization across all layers of the technology stack: database query performance, API response times, frontend rendering speed, and inter-system communication latency. This section presents the optimization strategies and target metrics for each layer."),

        // 6.1 Caching Architecture
        heading("6.1 Multi-Layer Caching Architecture"),
        body("Caching reduces database load and improves response times for frequently accessed data. The implementation uses a three-tier caching strategy: browser cache for static assets (CSS, JS, images) with Cache-Control headers specifying 1-year max-age with content-hash filenames, CDN edge cache for API responses at Points of Presence near users (Algiers, Oran, Constantine) with 60-second TTL for dynamic content, and Redis cluster cache for application-level data (user sessions, permission caches, frequently referenced lookup tables) with configurable TTLs per data type."),
        body("Redis Cluster deployment uses 6 nodes (3 masters, 3 replicas) with shard count of 16 for horizontal scaling. Memory allocation prioritizes high-access patterns: active incident data (5-minute TTL), user permission sets (1-hour TTL), threat intel summary (15-minute TTL), and dashboard aggregation results (1-minute TTL). Cache invalidation follows write-through pattern for critical data (incidents, events) with pub/sub notifications across Redis instances."),

        // 6.2 Query Optimization
        heading("6.2 Database Query Optimization"),
        body("Query optimization focuses on the most impactful slow queries identified during load testing. Primary optimization techniques include: materialized views for dashboard aggregation queries refreshed every 5 minutes, partial indexes for common filter combinations (WHERE severity = 'critical' AND status = 'open'), covering indexes for frequent lookup queries eliminating heap fetches, and prepared statements with parameter binding reducing parse overhead."),
        body("The query performance monitoring system captures every query exceeding 100 milliseconds execution time, storing the query text, execution plan, and bind parameters for analysis. Weekly reviews identify optimization opportunities, with target metrics: p50 query latency under 20ms, p99 under 500ms, and no production queries exceeding 5 seconds for interactive operations. Batch reporting queries may exceed these thresholds but must run against read replicas."),

        // 6.3 Frontend Performance
        heading("6.3 Frontend Rendering Optimization"),
        body("Frontend performance targets First Contentful Paint under 1.5 seconds and Time to Interactive under 3 seconds on standard corporate workstation hardware. Optimization techniques include code splitting by route (lazy-loading dashboard pages), React.memo for expensive component trees, virtual scrolling for large lists (event tables showing 10,000+ rows), and WebSocket push updates instead of polling for real-time data."),
        body("Bundle size optimization targets under 200KB initial JavaScript payload (gzipped) through tree shaking unused code, dynamic imports for heavy dependencies (chart libraries, code editors), and SVG icon system replacing icon fonts. Image optimization uses WebP format with JPEG fallback, responsive srcset for device-appropriate sizing, and lazy loading for below-fold images. Performance regression tests run on every commit preventing degradation."),

        // Performance Targets Table
        new Paragraph({ spacing: { before: 300, after: 150 }, children: [new TextRun({ text: "Performance Target Metrics:", bold: true, size: 24, color: c(P.primary) })] }),
        createTable(
          ["Metric", "Target", "Measurement Method"],
          [
            ["API Response Time (p50)", "< 50ms", "APM tracing (Jaeger)"],
            ["API Response Time (p99)", "< 500ms", "APM tracing (Jaeger)"],
            ["Dashboard Load Time", "< 3 seconds", "Synthetic monitoring"],
            ["Event Ingestion Rate", "> 50,000 EPS", "Kafka consumer lag"],
            ["Search Query Response", "< 2 seconds", "Elasticsearch slowlog"],
            ["Concurrent User Support", "> 500 users", "Load testing (k6)"],
            ["System Uptime SLA", "99.95%", "Prometheus availability"]
          ],
          [30, 25, 45]
        ),

        // 7. SECURITY HARDENING
        heading("7. Security Hardening & Compliance"),
        body("As a security operations platform handling sensitive telecommunications data and security intelligence, the Djezzy SOC Platform must exemplify security best practices. This section addresses platform security measures, data protection controls, and compliance considerations relevant to Algerian telecommunications regulations and international security standards."),

        heading("7.1 Network Segmentation & Zero Trust"),
        body("Network architecture implements Zero Trust principles with micro-segmentation between all system components. Kubernetes Network Policies (defined in Phase 10) restrict pod-to-pod communication to explicitly allowed flows. East-west traffic between services requires mTLS authentication via Istio service mesh. North-south traffic from user browsers passes through WAF (Web Application Firewall) rules filtering OWASP Top 10 attack patterns."),
        body("Administrative access follows bastion host pattern with jump servers in dedicated management VLAN. All administrative sessions record for audit replay. SSH access requires key-based authentication with authorized keys rotated quarterly. Privileged access management (PAM) system grants just-in-time elevated permissions with automatic expiration and approval workflow."),

        heading("7.2 Data Protection & Encryption"),
        body("Encryption protects data at rest and in transit using industry-standard algorithms. Database Transparent Data Encryption (TDE) protects storage volumes using AES-256. Application-level encryption applies to highly sensitive fields (subscriber MSISDNs, IMSIs, call detail contents) using envelope encryption with AWS KMS or HashiCorp Vault for key management. TLS 1.3 terminates at Kong API Gateway with certificates from Let's Encrypt or internal CA."),
        body("Data masking applies dynamically based on user role and purpose. Viewer-role users see masked identifiers (213********* instead of full MSISDN). Analysts requesting unmasked access must provide justification recorded in audit log. Data retention policies automate deletion of raw events after 13 months, with aggregated/anonymized data retained longer for trend analysis. Right-to-deletion requests from subscribers trigger purging within 72 hours per privacy regulations."),

        heading("7.3 Audit Logging & Compliance"),
        body("Comprehensive audit logging captures all security-relevant events: user authentication (success/failure), authorization decisions (especially denied requests), data access (especially PII reads), configuration changes, and data export/deletion operations. Audit logs write to immutable storage (WORM-compliant object storage) with 7-year retention meeting regulatory requirements. Tamper-evident logging detects unauthorized modification attempts."),
        body("Compliance frameworks addressed include ISO 27001 (information security management), NIST Cybersecurity Framework (risk-based security program), and telecom-specific regulations from ARPT (Autorite de Regulation de la Poste et des Telecommunications). Quarterly internal audits verify control effectiveness with findings tracked to remediation. Annual third-party assessment validates compliance posture for stakeholder assurance."),

        // 8. IMPLEMENTATION TIMELINE
        heading("8. Implementation Timeline & Milestones"),
        body("The 12-month implementation timeline organizes work into four major phases, each delivering incremental capability improvements. This phased approach manages risk by validating integrations progressively while providing early value through quick wins in each phase."),

        // Timeline Table
        new Paragraph({ spacing: { before: 200, after: 150 }, children: [new TextRun({ text: "Phase Timeline Overview:", bold: true, size: 24, color: c(P.primary) })] }),
        createTable(
          ["Phase", "Duration", "Focus Area", "Key Deliverables"],
          [
            ["Phase 11.1", "Months 1-3", "Core Infrastructure", "PostgreSQL cluster, Kafka, Redis, API Gateway"],
            ["Phase 11.2", "Months 4-6", "Tool Integration", "SIEM, EDR, SOAR deployment and connectivity"],
            ["Phase 11.3", "Months 7-9", "Advanced Features", "TI platform, NSM, Vulnerability Management"],
            ["Phase 11.4", "Months 10-12", "Optimization & Go-Live", "Performance tuning, security hardening, cutover"]
          ],
          [15, 18, 25, 42]
        ),

        heading("8.1 Phase 11.1: Core Infrastructure Foundation (Months 1-3)"),
        body("The initial phase establishes the foundational infrastructure upon which all subsequent integrations build. Primary focus areas include deploying the production database cluster with replication and backup systems, establishing the Kafka event streaming platform, configuring Redis caching clusters, and implementing the API gateway with authentication and rate limiting."),
        body("Month 1 delivers the PostgreSQL primary cluster with PgBouncer connection pooling, basic schema migrations for core tables, and backup configuration with cross-region replication. Month 2 completes the Kafka cluster deployment with initial topic configuration and Schema Registry setup, plus Redis cluster for caching. Month 3 finishes API gateway configuration, implements core authentication flows with corporate IdP integration, and delivers the first set of production API endpoints replacing mock data for user management and basic event queries."),

        heading("8.2 Phase 11.2: Security Tool Integration (Months 4-6)"),
        body("Phase 11.2 focuses on integrating the primary security tools: Wazuh/ELK SIEM stack, Wazuh/GRR EDR platform, and TheHive/Cortex SOAR platform. Each tool integration includes deployment, configuration, connectivity testing, and initial data flow validation."),
        body("Month 4 deploys Wazuh server cluster and begins agent rollout to priority systems (domain controllers, security servers, DMZ infrastructure). Elasticsearch cluster deploys with initial nodes and index templates. Month 5 expands Wazuh coverage to remaining infrastructure, configures Logstash pipelines for major log sources, and deploys TheHive/Cortex with initial analyzer configuration. Month 6 completes EDR integration with GRR server deployment and Osquery fleet management, establishes bi-directional sync between TheHive and SOC Platform, and validates end-to-end alert-to-case workflows."),

        heading("8.3 Phase 11.3: Advanced Capabilities (Months 7-9)"),
        body("Phase 11.3 adds advanced security capabilities including the Threat Intelligence platform (MISP/OpenCTI), Network Security Monitoring suite (Suricata/Zeek/Arkime), and Vulnerability Management (OpenVAS/DefectDojo). These tools require more complex configurations and benefit from the foundational integrations completed in prior phases."),
        body("Month 7 deploys MISP instances (production, staging, air-gapped) with initial feed configuration and Telecom ISAC onboarding. OpenCTI deployment begins with APT group databases and telecom-specific attack pattern definitions. Month 8 deploys NSM sensors at priority locations (internet borders first, then data centers) with Suricata rules tuned for telecom environments. Arkime cluster enables PCAP retention and visualization. Month 9 completes vulnerability management deployment with OpenVAS scanners scheduled for regular assessment cycles and DefectDojo correlating findings from multiple scanner types."),

        heading("8.4 Phase 11.4: Optimization & Production Cutover (Months 10-12)"),
        body("The final phase focuses on performance optimization based on real-world usage data, comprehensive security hardening, and the controlled cutover from legacy systems to the new platform. This phase includes extensive testing, training, and documentation activities essential for successful production operation."),
        body("Month 10 conducts comprehensive load testing identifying bottlenecks, implements caching optimizations, tunes database queries based on actual query patterns, and optimizes frontend bundle sizes. Month 11 completes security hardening (penetration testing, red team exercise, vulnerability remediation), finalizes compliance documentation, conducts tabletop exercises for major incident scenarios, and delivers operator training curriculum. Month 12 executes the production cutover with parallel running period, monitors stability metrics, transitions 24/7 operations to new platform, and decommissions legacy systems."),

        // 9. SUCCESS CRITERIA & ACCEPTANCE
        heading("9. Success Criteria & Acceptance Criteria"),
        body("Each phase concludes with formal acceptance review against predefined criteria. The acceptance process involves stakeholders from Security Operations, IT Infrastructure, Network Operations, and executive leadership. Phase sign-off requires demonstration of all acceptance criteria with documented evidence and sign-off from designated approvers."),

        new Paragraph({ spacing: { before: 200, after: 150 }, children: [new TextRun({ text: "Go-Live Acceptance Criteria:", bold: true, size: 24, color: c(P.primary) })] }),
        createTable(
          ["Criterion", "Metric", "Validation Method"],
          [
            ["Event Ingestion Capacity", ">= 50,000 EPS sustained", "Load test (48 hours)"],
            ["API Availability", ">= 99.95% over 30 days", "Uptime monitoring"],
            ["Mean Time to Detect", "< 15 minutes for critical alerts", "Simulated attack scenarios"],
            ["Mean Time to Respond", "< 1 hour for critical incidents", "Playbook execution drills"],
            ["Tool Integration Coverage", "100% of planned integrations operational", "Connectivity health checks"],
            ["User Adoption", ">= 80% of SOC staff trained and active", "Training records + login stats"],
            ["Documentation Completeness", "100% of runbooks updated", "Documentation audit"],
            ["Security Assessment", "No critical/high findings open", "Penetration test report"]
          ],
          [28, 32, 40]
        ),

        // Conclusion
        heading("10. Conclusion & Next Steps"),
        body("This Phase 11 Enterprise Production Roadmap provides the comprehensive technical blueprint for transforming the Djezzy National SOC Platform into a fully operational, production-ready Security Operations Center. The integration of industry-leading open-source security tools, combined with enterprise-grade database architecture and robust API infrastructure, positions the platform to meet the demanding requirements of telecommunications security operations at national scale."),
        body("Successful execution of this roadmap requires sustained commitment across multiple dimensions: technical expertise for complex integrations, project management discipline for coordinated delivery, organizational change management for user adoption, and executive sponsorship for resource allocation and cross-functional alignment. The phased approach balances urgency for improved security capabilities with prudent risk management through incremental validation."),
        body("Immediate next steps include securing budget approval for infrastructure procurement, establishing the core implementation team with dedicated resources from security operations and IT infrastructure, initiating vendor engagement for any commercial components (support subscriptions, hardware procurement), and scheduling the Phase 11.1 kickoff meeting to align all stakeholders on objectives, timelines, and success criteria. Regular progress reviews at bi-weekly cadence will ensure early identification of blockers and enable course corrections before delays compound.")
      ]
    }
  ]
});

// Generate document
async function main() {
  try {
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync('/home/z/my-project/download/Phase11_Enterprise_Production_Roadmap_Djezzy_SOC.docx', buffer);
    console.log('Document generated successfully: Phase11_Enterprise_Production_Roadmap_Djezzy_SOC.docx');
  } catch (error) {
    console.error('Error generating document:', error);
    process.exit(1);
  }
}

main();
