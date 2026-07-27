# National SOC Technical Architecture Specification

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | SOC-TECH-ARCH-001 |
| **Version** | 2.0 |
| **Classification** | Confidential |
| **Status** | Approved for Implementation |

---

## 1. Architecture Overview

### 1.1 Design Principles

The National SOC technical architecture is built on the following foundational principles:

#### Security First
- Zero Trust Architecture (ZTA) as baseline
- Defense-in-depth with multiple security layers
- Encryption at rest and in transit (AES-256, TLS 1.3)
- Hardware Security Modules (HSM) for key management

#### High Availability
- 99.999% uptime target (5.26 minutes downtime/year)
- Active-active multi-site deployment
- Automatic failover < 30 seconds
- No single point of failure

#### Scalability
- Horizontal scaling capability to 10M+ EPS
- Cloud-native design with containerization
- Auto-scaling based on load patterns
- Support for 10x growth without architecture change

#### Interoperability
- Open standards (STIX/TAXII, OpenIOC, YARA)
- RESTful APIs for all integrations
- Support for common log formats (CEF, LEEF, JSON)
- Vendor-neutral data lake approach

### 1.2 Logical Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NATIONAL SOC ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DATA COLLECTION LAYER                             │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ Network │ │ Endpoint│ │ Cloud   │ │ Identity│ │  Third  │       │   │
│  │  │ Sensors │ │ Agents  │ │ APIs    │ │ Systems│ │  Party  │       │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │   │
│  └───────┼──────────┼──────────┼──────────┼──────────┼─────────────────┘   │
│          │          │          │          │          │                     │
│          ▼          ▼          ▼          ▼          ▼                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    INGESTION & NORMALIZATION                         │   │
│  │         ┌───────────────────────────────────────────┐               │   │
│  │         │      Log Collector Cluster (Kafka)        │               │   │
│  │         │   • 50+ TB/day ingestion capacity         │               │   │
│  │         │   • Real-time stream processing           │                 │
│  │         └─────────────────┬─────────────────────────┘               │   │
│  │                           │                                          │   │
│  │         ┌─────────────────▼─────────────────────────┐               │   │
│  │         │     Normalization Engine                  │               │   │
│  │         │   • CEF/LEEF/JSON/Syslog parsing          │               │   │
│  │         │   • Schema enrichment & standardization   │               │   │
│  │         └─────────────────┬─────────────────────────┘               │   │
│  └───────────────────────────┼───────────────────────────────────────────┘   │
│                              │                                              │
│  ┌───────────────────────────▼───────────────────────────────────────────┐   │
│  │                    STORAGE & ANALYTICS LAYER                          │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                    │   │
│  │  │   HOT Storage       │  │   WARM/COLD Storage │                    │   │
│  │  │   (Elasticsearch)   │  │   (Data Lake - S3)  │                    │   │
│  │  │   • 30 days real-time│  │   • 7 years archive│                    │   │
│  │  │  └──────────────────┘  │  └──────────────────┘                    │   │
│  │  └─────────────────────┬──┴─────────────────────┘                    │   │
│  │                       │                                             │   │
│  │  ┌────────────────────▼─────────────────────┐                       │   │
│  │  │        ANALYTICS ENGINES                 │                       │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │                       │   │
│  │  │  │   SIEM   │ │   SOAR   │ │  AI/ML   │ │                       │   │
│  │  │  │ Detection│ │ Response │ │ Analytics│ │                       │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ │                       │   │
│  │  └─────────────────────────────────────────┘                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│  ┌───────────────────────────▼───────────────────────────────────────────┐   │
│  │                    OPERATIONS & PRESENTATION                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │   SOC       │  │  Threat     │  │  Incident   │                   │   │
│  │  │  Dashboard  │  │ Intelligence│  │  Management │                   │   │
│  │  │  (24/7 Ops) │  │  Platform   │  │  System     │                   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

### 2.1 SIEM Platform (Security Information & Event Management)

**Primary Function:** Centralized log aggregation, correlation, and alert generation

| Requirement | Specification |
|-------------|---------------|
| **Event Processing Capacity** | 10 Million EPS (Events Per Second) peak |
| **Data Retention** | Hot: 30 days, Warm: 1 year, Cold: 7 years |
| **Search Performance** | < 3 seconds for 90th percentile queries |
| **Correlation Rules** | 5,000+ active rules across all phases |
| **Compliance Reporting** | Automated reports for ISO 27001, NIST, GDPR |

**Architecture Components:**

```yaml
siem_cluster:
  primary_node:
    specs: "64 CPU cores, 512GB RAM, 50TB NVMe storage"
    role: "Indexer + Search Head"
    
  indexer_nodes:
    count: 12
    specs: "32 CPU cores, 256GB RAM, 25TB NVMe each"
    role: "Distributed indexing"
    
  search_head_nodes:
    count: 3
    specs: "32 CPU cores, 256GB RAM"
    role: "Query orchestration"
    
  forwarders:
    type: "Universal Forwarders"
    estimated_count: "5,000+ across government"
    protocol: "TLS encrypted"

correlation_engine:
  real_time_correlation: true
  historical_analysis: true
  risk_scoring: "Dynamic threat-based scoring"
  anomaly_detection: "ML-powered behavioral analysis"
  
integration_points:
  - "Network sensors (NTA)"
  - "Endpoint detection (EDR)"
  - "Identity systems (AD/LDAP/SAML)"
  - "Cloud platforms (AWS/Azure/GCP)"
  - "Email security gateways"
  - "Firewall/IPS/IDS systems"
  - "DNS/DHCP infrastructure"
  - "Database audit logs"
  - "Application logs"
```

### 2.2 SOAR Platform (Security Orchestration, Automation & Response)

**Primary Function:** Automated incident response, playbook execution, case management

| Capability | Details |
|-----------|---------|
| **Playbooks** | 200+ pre-built, customizable playbooks |
| **Automation Rate Target** | 85% of Tier-1 incidents automated |
| **Integration Connectors** | 400+ out-of-box integrations |
| **Case Management** | Full IR lifecycle tracking |
| **Human-in-the-Loop** | Configurable approval gates |

**SOAR Architecture:**

```yaml
soar_platform:
  core_engine:
    automation_type: "Workflow-based with decision trees"
    parallel_execution: true
    error_handling: "Retry logic with escalation"
    
  playbook_categories:
    - name: "Malware Response"
      count: 45
      examples: ["Isolate endpoint", "Snapshot memory", "Submit sandbox"]
      
    - name: "Phishing Response"
      count: 35
      examples: ["Pull headers", "Check URL", "Remove emails"]
      
    - name: "Network Intrusion"
      count: 40
      examples: ["Block IP", "Capture PCAP", "Notify NOC"]
      
    - name: "Data Exfiltration"
      count: 30
      examples: ["Identify source", "Preserve evidence", "Legal hold"]
      
    - name: "Insider Threat"
      count: 25
      examples: ["Access review", "DLP trigger", "HR notification"]
      
    - name: "Vulnerability Response"
      count: 25
      examples: ["Asset inventory", "Patch priority", "Exception process"]

integrations:
  siem: "Bi-directional with primary SIEM"
  edr: "CrowStrike, SentinelOne, Carbon Black"
  ticketing: "ServiceNow, Jira, Remedy"
  messaging: "Slack, Teams, PagerDuty"
  intelligence: "MISP, ThreatConnect, Anomali"
  identity: "Active Directory, Okta, Azure AD"
  network: "Firewall APIs, Router APIs, NAC"
  
governance:
  approval_gates: "Configurable per playbook severity"
  audit_logging: "Complete action trail"
  rbac: "Role-based access to sensitive actions"
  version_control: "Playbook Git integration"
```

### 2.3 EDR Platform (Endpoint Detection & Response)

**Primary Function:** Endpoint visibility, threat detection, and response

| Metric | Target |
|--------|--------|
| **Endpoints Managed** | 150,000+ government devices |
| **Detection Coverage** | 99.5% of known threats, 95% unknown |
| **Response Time** | < 1 second for containment actions |
| **Performance Impact** | < 3% CPU, < 5% memory overhead |

**EDR Deployment Model:**

```yaml
edr_solution:
  agent_capabilities:
    prevention: "Next-gen AV, machine learning, exploit protection"
    detection: "Behavioral analysis, IOA/IOC matching, memory scanning"
    response: "Live response, file retrieval, process kill, network isolate"
    forensics: "Full disk imaging, timeline reconstruction, triage data"
    
  deployment_tiers:
    tier_1_critical: # High-value targets
      - "Executive devices"
      - "SOC analyst workstations"
      - "Server administrators"
      - "Domain controllers"
      features: "Full protection + enhanced monitoring + EDR"
      
    tier_2_standard: # General workforce
      - "Standard workstations"
      - "Laptops (remote workers)"
      - "Tablets/mobile devices"
      features: "AV + EDR basic + cloud visibility"
      
    tier_3_server: # Server infrastructure
      - "Application servers"
      - "Database servers"
      - "Web servers"
      - "File servers"
      features: "Server-tuned EDR + integrity monitoring"
      
    tier_4_specialized: # OT/IoT where applicable
      - "SCADA interfaces"
      - "IoT gateways"
      - "Specialized equipment"
      features: "Passive monitoring + network-based detection"

  telemetry_types_collected:
    - "Process creation/termination"
    - "File system activity"
    - "Registry changes"
    - "Network connections (all)"
    - "DLL/module loading"
    - "User logon activity"
    - "Scheduled task modifications"
    - "PowerShell/script execution"
    - "Driver loading"
    - "Memory manipulation attempts"
```

### 2.4 Threat Intelligence Platform (TIP)

**Primary Function:** Aggregation, analysis, and dissemination of threat intelligence

| Capability | Specification |
|-----------|---------------|
| **Intelligence Sources** | 200+ feeds (commercial, open-source, community) |
| **IOC Processing** | 10 million IOCs in active store |
| **Enrichment** | Automatic context from 15+ sources |
| **Sharing** | TAXII 2.1, MISP, STIX 2.1 compliant |

**Intelligence Architecture:**

```yaml
threat_intel_platform:
  collection_layer:
    commercial_feeds:
      - "Recorded Future"
      - "Mandiant (Google)"
      - "CrowdStrike Falcon X"
      - "Palo Alto Unit 42"
      - "Kaspersky TIP"
      
    open_source_feeds:
      - "AlienVault OTX"
      - "MISP communities"
      - "Abuse.ch (URLhaus, Feodo Tracker)"
      - "PhishTank"
      - "VirusTotal (API)"
      
    government_sharing:
      - "FIRST communities"
      - "NATO CCDCOE"
      - "EU CERT cooperation"
      - "Bilateral agreements (France, US, GCC)"
      
    internal_sources:
      - "SOC incident data (anonymized)"
      - "Honeypot/sensor networks"
      - "Dark web monitoring"
      - "OSINT collection team"

  processing_pipeline:
    normalization: "All formats → STIX 2.1"
    deduplication: "Fuzzy matching + exact dedup"
    scoring: "Confidence × Severity matrix"
    enrichment: "Auto-enrichment from 15+ sources"
    aging: "Decay function for IOC relevance"
    
  dissemination:
    automated_feeds:
      - "SIEM integration (real-time IOC push)"
      - "Firewall block lists (automated)"
      - "DNS sinkhole updates"
      - "Email gateway filters"
      - "Proxy block lists"
      
    human_consumption:
      - "Daily intel briefings"
      - "Threat actor profiles"
      - "Campaign analysis reports"
      - "Strategic assessments"
      - "Tactical flash alerts"
```

---

## 3. Network Architecture

### 3.1 SOC Network Segmentation

```
                         ┌─────────────────────────────────────────┐
                         │            INTERNET ZONE                │
                         │   (DMZ - Perimeter Security)            │
                         └──────────────────┬──────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
         ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
         │   DATA COLLECTOR │  │   EXTERNAL API   │  │   SECURE PORTAL  │
         │      ZONE        │  │      ZONE        │  │      ZONE        │
         └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
                  │                      │                      │
         ─────────┴──────────────────────┴──────────────────────┴────────
                              FIREWALL / IDPS CLUSTER
         ─────────┬──────────────────────┬──────────────────────┬────────
                  │                      │                      │
                  ▼                      ▼                      ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                        INTERNAL TRUST ZONE                          │
    │                                                                      │
    │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
    │   │   SIEM CLUSTER  │  │   SOAR PLATFORM │  │   TIP PLATFORM  │   │
    │   │   (Zone A)      │  │   (Zone B)      │  │   (Zone C)      │   │
    │   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
    │            │                    │                    │             │
    │   ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐   │
    │   │   DATA LAKE     │  │   ANALYTICS     │  │   ADMIN/DEV     │   │
    │   │   (Storage)     │  │   (AI/ML)       │  │   (Management)  │   │
    │   └─────────────────┘  └─────────────────┘  └─────────────────┘   │
    │                                                                      │
    └─────────────────────────────────────────────────────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
         ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
         │   OPERATIONS     │  │   INVESTIGATION  │  │   MANAGEMENT     │
         │   FLOOR NETWORK  │  │   LAB NETWORK    │  │   NETWORK        │
         └──────────────────┘  └──────────────────┘  └──────────────────┘
```

### 3.2 Network Security Controls

| Zone | Control | Implementation |
|------|---------|----------------|
| **Perimeter** | Next-Gen Firewall | Palo Alto PA-5430 cluster (active-active) |
| **Internal Segmentation** | Micro-segmentation | Illumio / VMware NSX |
| **East-West Traffic** | IDPS | ExtraHop Reveal(x) + Darktrace |
| **DNS Security** | Secure DNS | Infoblox with ThreatDefend |
| **Remote Access** | ZTNA | Zscaler Private Access |
| **Encryption** | TLS 1.3 everywhere | Internal CA + PKI hierarchy |

---

## 4. Data Architecture

### 4.1 Data Flow Architecture

```
SOURCES → INGESTION → PARSING → ENRICHMENT → STORAGE → ANALYSIS → ACTION
                                                                              
┌─────────┐    ┌─────────┐   ┌───────┐   ┌─────────┐   ┌──────┐   ┌──────┐
│ Sensors │───▶│ Kafka  │──▶│ Logstash│──▶│ Enrich  │──▶│ ES   │──▶│Alerts│
│ Agents  │    │ Cluster│   │ /Flink │   │ Engine  │   │ S3   │   │Cases │
│ APIs    │    │        │   │        │   │         │   │      │   │      │
└─────────┘    └─────────┘   └───────┘   └─────────┘   └──────┘   └──────┘
```

### 4.2 Data Schema (Common Event Format)

```json
{
  "@timestamp": "2026-01-15T14:32:00.000Z",
  "event": {
    "id": "abc123-def456-...",
    "category": ["network", "authentication"],
    "type": "start",
    "severity": "medium",
    "risk_score": 67
  },
  "source": {
    "ip": "192.168.1.100",
    "port": 52341,
    "hostname": "WORKSTATION-001",
    "user": {
      "name": "jdoe",
      "domain": "GOV.DZ",
      "id": "S-1-5-21-..."
    }
  },
  "destination": {
    "ip": "10.0.0.55",
    "port": 443,
    "hostname": "DC-SERVER-01"
  },
  "network": {
    "protocol": "tls",
    "tls": {
      "version": "1.3",
      "cipher": "TLS_AES_256_GCM_SHA384",
      "ja3_hash": "abc123..."
    }
  },
  "gov_dz": {
    "ministry": "Interior",
    "department": "IT Security",
    "classification": "Internal Use",
    "retention_policy": "standard"
  },
  "tags": ["windows", "kerberos", "domain-auth"]
}
```

### 4.3 Data Retention Policy

| Data Type | Hot Storage | Warm Storage | Cold Storage | Archive |
|-----------|-------------|--------------|--------------|---------|
| **Security Events** | 30 days | 365 days | 7 years | Destroy |
| **Full Packet Capture** | 48 hours | 30 days | 1 year | Destroy |
| **Incident Records** | Forever | Forever | Forever | Preserve |
| **Intel Data** | 90 days | 3 years | 7 years | Review |
| **Audit Logs** | 90 days | 3 years | 7 years | Preserve |
| **Analyst Notes** | Forever | Forever | Forever | Preserve |

---

## 5. High Availability & Disaster Recovery

### 5.1 Site Architecture

| Site | Location | Role | Capacity |
|------|----------|------|----------|
| **Primary** | Algiers (Main DC) | Active | 100% capacity |
| **Secondary** | Oran (DR Site) | Hot Standby | 100% capacity |
| **Tertiary** | Constantine (Backup) | Warm Standby | 50% capacity |

### 5.2 RPO/RTO Targets

| System Category | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) |
|-----------------|-------------------------------|-------------------------------|
| **Real-time Detection (SIEM)** | 0 seconds | < 1 minute |
| **Automation (SOAR)** | < 1 minute | < 5 minutes |
| **Investigation Tools** | < 15 minutes | < 1 hour |
| **Reporting/Analytics** | < 1 hour | < 4 hours |
| **Administrative Systems** | < 24 hours | < 8 hours |

### 5.3 Backup Strategy

```yaml
backup_strategy:
  siem_data:
    frequency: "Continuous replication"
    method: "Cross-site synchronous for critical, async for rest"
    encryption: "AES-256 at rest and in transit"
    
  configuration:
    frequency: "Every 6 hours"
    method: "Git-backed IaC repository"
    retention: "365 days"
    
  incident_data:
    frequency: "Real-time sync"
    method: "Multi-region database replication"
    retention: "Permanent"
    
  testing:
    dr_drill_frequency: "Quarterly"
    restore_test_frequency: "Monthly"
    success_criteria: ">99% data integrity"
```

---

## 6. Security Controls for SOC Infrastructure

### 6.1 Defense-in-Depth Layers

| Layer | Control | Purpose |
|-------|---------|---------|
| **Physical** | Biometric access, mantraps, CCTV | Prevent unauthorized physical access |
| **Network** | Segmentation, encryption, monitoring | Protect data in transit |
| **Host** | Hardening, EDR, application control | Protect endpoints |
| **Application** | WAF, input validation, secure coding | Protect applications |
| **Data** | Classification, DLP, encryption | Protect data at rest |
| **Identity** | MFA, RBAC, PAM | Ensure proper access control |

### 6.2 Privileged Access Management

```yaml
privileged_access:
  principles:
    - "Just-in-time access (JIT)"
    - "Just-enough access (JEA)"
    - "Zero standing privileges"
    - "Full session recording"
    
  implementation:
    pam_solution: "CyberArk or BeyondTrust"
    password_vault: "Automatic rotation (24h cycle)"
    session_recording: "100% of privileged sessions"
    mfa_requirement: "Hardware token + biometric"
    
  approval_workflow:
    emergency_access: "Break-glass procedure (2-person rule)"
    standard_access: "Ticket-based approval"
    duration_limits: "Max 8 hours per session"
```

---

*This Technical Architecture specification provides the blueprint for building a world-class National SOC capable of defending Algeria's critical digital infrastructure.*
