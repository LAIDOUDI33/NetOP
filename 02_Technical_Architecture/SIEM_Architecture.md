# SIEM Architecture & Configuration Guide

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | SOC-TECH-SIEM-001 |
| **Version** | 1.0 |
| **Component** | SIEM Platform |
| **Status** | Design Complete |

---

## 1. SIEM Platform Selection Rationale

### 1.1 Evaluation Criteria

The SIEM platform selection was based on rigorous evaluation against the following weighted criteria:

| Criteria | Weight | Importance to National SOC |
|----------|--------|--------------------------|
| **Scalability** | 20% | Must handle 10M+ EPS for national coverage |
| **Detection Capabilities** | 18% | Core function - threat detection effectiveness |
| **Integration Ecosystem** | 15% | Must connect to diverse government systems |
| **Total Cost of Ownership** | 12% | Long-term budget sustainability |
| **Vendor Stability** | 10% | Strategic partnership reliability |
| **Local Support** | 10% | Language, timezone, compliance needs |
| **Compliance Features** | 8% | Regulatory reporting requirements |
| **Usability** | 7% | Analyst efficiency and training time |

### 1.2 Recommended Platform Options

#### Option A: Splunk Enterprise Security (Primary Recommendation)
| Aspect | Detail |
|--------|--------|
| **Strengths** | Market leader, extensive marketplace, SPL flexibility, strong community |
| **Considerations** | Higher licensing cost, requires skilled SPL developers |
| **Use Case Best For** | Complex environments requiring customization |
| **Estimated Cost** | $8-12M over 5 years (enterprise license) |

#### Option B: Microsoft Sentinel
| Aspect | Detail |
|--------|--------|
| **Strengths** | Cloud-native, Azure integration, pay-per-GB, KQL power |
| **Considerations** | Azure dependency, data egress costs, learning curve |
| **Use Case Best For** | Organizations heavily invested in Microsoft ecosystem |
| **Estimated Cost** | $4-7M over 5 years (consumption-based) |

#### Option C: Elastic Security (ELK Stack)
| Aspect | Detail |
|--------|--------|
| **Strengths** | Open-source core, flexible, strong search, cost-effective |
| **Considerations** | More DIY, enterprise features require paid tier |
| **Use Case Best For** | Budget-conscious organizations with strong engineering |
| **Estimated Cost** | $2-4M over 5 years (with enterprise support) |

**Recommendation:** Hybrid approach using **Splunk Enterprise Security** for core SIEM with **Elastic** for specific use cases requiring cost-effective scaling.

---

## 2. SIEM Cluster Architecture

### 2.1 Physical/Logical Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SIEM DEPLOYMENT ARCHITECTURE                    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │                    SEARCH HEAD CLUSTER                       │    │
│   │                                                               │    │
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │    │
│   │   │ Search Head │    │ Search Head │    │ Search Head │     │    │
│   │   │    #1       │◄──►│    #2       │◄──►│    #3       │     │    │
│   │   │  (Primary)  │    │(Replica)    │    │(Replica)    │     │    │
│   │   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │    │
│   │          │                  │                  │             │    │
│   │          └──────────────────┼──────────────────┘             │    │
│   │                             │                                │    │
│   └─────────────────────────────┼────────────────────────────────┘    │
│                                 │                                     │
│   ┌─────────────────────────────┼────────────────────────────────┐    │
│   │                    INDEXER CLUSTER                          │    │
│   │                                                             │    │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │    │
│   │  │ Indexer │ │ Indexer │ │ Indexer │ │ Indexer │ ...×8     │    │
│   │  │  Node 1 │ │  Node 2 │ │  Node 3 │ │  Node 4 │           │    │
│   │  │  PEER   │ │  PEER   │ │  PEER   │ │  PEER   │           │    │
│   │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │    │
│   │       └───────────┴───────────┴───────────┘                │    │
│   │                         │                                   │    │
│   │              Replication Factor: 3                          │    │
│   └─────────────────────────┼───────────────────────────────────┘    │
│                             │                                        │
│   ┌─────────────────────────┼───────────────────────────────────┐    │
│   │                    FORWARDING LAYER                         │    │
│   │                                                           │    │
│   │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │    │
│   │  │ Heavy Fwd    │    │ Heavy Fwd    │    │ Universal    │  │    │
│   │  │ Cluster (3)  │    │ Intermediate │    │ Forwarders   │  │    │
│   │  │ Load Balance │    │ Aggregation  │    │ (5000+)     │  │    │
│   │  └──────────────┘    └──────────────┘    └──────────────┘  │    │
│   └───────────────────────────────────────────────────────────┘    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Hardware Specifications

#### Search Head Cluster

| Component | Specification | Quantity |
|-----------|--------------|----------|
| **CPU** | AMD EPYC 7763 (64-core) or Intel Xeon Gold 6348 (28-core) | 3 nodes |
| **RAM** | 512GB DDR4-3200 ECC | Per node |
| **Storage** | 2x 960GB NVMe (RAID 1) for OS/apps | Per node |
| **Network** | 25GbE dual-port (bonded) | Per node |
| **OS** | RHEL 8.x / CentOS Stream 8 | All nodes |

#### Indexer Cluster

| Component | Specification | Quantity |
|-----------|--------------|----------|
| **CPU** | Dual AMD EPYC 7763 (128 cores total) | 12 nodes |
| **RAM** | 512GB DDR4-3200 ECC | Per node |
| **Hot Storage** | 25TB NVMe U.2 (RAID 10) | Per node |
| **Warm Storage** | 100TB HDD SAS (RAID 6) | Per node |
| **Network** | 100GbE dual-port (bonded) | Per node |
| **OS** | RHEL 8.x optimized for Splunk | All nodes |

#### License Estimation

| Metric | Daily Volume | Annual Volume |
|--------|-------------|---------------|
| **Average Day** | 15 TB | 5.4 PB |
| **Peak Day** | 45 TB | 16.4 PB |
| **License Required** | ~20 GB/day base + burst | Enterprise agreement recommended |

---

## 3. Data Collection Strategy

### 3.1 Source Categories & Priority

| Priority | Source Type | Examples | EPS Estimate | Collection Method |
|----------|------------|----------|--------------|-------------------|
| **P0 - Critical** | Network Security | Firewalls, IPS, DNS, Proxy | 500,000 | Syslog via HFs |
| **P0 - Critical** | Endpoint Security | EDR, AV, Host IDS | 2,000,000 | Agent-based |
| **P1 - High** | Identity & Access | AD, LDAP, VPN, SSO | 300,000 | WinEvent/Agent |
| **P1 - High** | Servers & Apps | Web servers, DB, middleware | 1,500,000 | UF/Agent |
| **P2 - Medium** | Cloud Services | AWS/Azure/GCP, SaaS | 800,000 | API/Cloud FW |
| **P2 - Medium** | Email Security | Gateway, O365, GSuite | 200,000 | API/Journal |
| **P3 - Low** | Physical Security | Badge access, CCTV logs | 50,000 | Syslog/API |
| **P3 - Low** | Other IT | Printers, IoT, misc | 100,000 | Various |

**Total Estimated EPS: 5.45 Million (average), up to 15M+ peak**

### 3.2 Forwarder Deployment Architecture

```yaml
forwarder_deployment:
  universal_forwarders:
    total_count: "~5,000"
    deployment_method: "SCCM / Ansible / Puppet"
    configuration_management: "Deployment Server (DS)"
    auto_update: "Enabled (maintenance windows)"
    
  heavy_forwarders:
    cluster_size: "6 nodes (load balanced)"
    location: "DMZ / collector zone"
    purpose: "Aggregation point before indexer"
    load_balancing: "Round-robin to indexers"
    
  deployment_server:
    server_class: "3 nodes (clustered)"
    apps_managed: "Configuration apps, TA packages"
    version_control: "Git-backed app repository"
    
  monitoring:
    health_checks: "Every 60 seconds"
    metrics_collected: "Throughput, queue size, errors"
    alerting: "Splunk Monitoring Console + SOAR"
```

---

## 4. Correlation Rule Framework

### 4.1 Rule Taxonomy

```
CORRELATION RULES
├── COMPLIANCE RULES (ISO 27001, NIST, GDPR)
│   ├── Failed authentication patterns
│   ├── Privileged access monitoring
│   ├── Data access auditing
│   └── Change management violations
│
├── THREAT DETECTION RULES
│   ├── MITRE ATT&CK Mapped
│   │   ├── Initial Access (T1189, T1078, T1190...)
│   │   ├── Execution (T1059, T1204, T1059.001...)
│   │   ├── Persistence (T1547, T1050, T1136...)
│   │   ├── Privilege Escalation (T1548, T1068, T1547...)
│   │   ├── Defense Evasion (T1562, T1070, T1112...)
│   │   ├── Credential Access (T1003, T1558, T1110...)
│   │   ├── Discovery (T1083, T1046, T1135...)
│   │   ├── Lateral Movement (T1021, T1021.004, T1570...)
│   │   ├── Collection (T1005, T1113, T1123...)
│   │   ├── Command & Control (T1071, T1095, T1571...)
│   │   └── Exfiltration (T1048, T1041, T1530...)
│   │
│   ├── Known Bad (Signature-based)
│   │   ├── Malware hashes
│   │   ├── Malicious IPs/domains
│   │   ├── Attack tool signatures
│   │   └── Phishing indicators
│   │
│   └── Behavioral Anomaly
│       ├── Impossible travel
│       ├── Unusual volume
│       ├── First-time seen
│       └── Peer group deviation
│
├── OPERATIONAL RULES
│   ├── SOC health monitoring
│   ├── Data pipeline status
│   ├── SLA breaches
│   └── Capacity thresholds
│
└── BUSINESS LOGIC RULES
    ├── Out-of-hours privileged access
    ├── Sensitive data access patterns
    ├── Mass export/download detection
    └── Terminated user activity
```

### 4.2 Sample High-Priority Detection Rules

#### Rule: Brute Force Attack Leading to Success
```xml
<detection_rule id="BRUTE_FORCE_SUCCESS" severity="critical" mitre="T1110">
  <name>Brute Force Attack Followed by Successful Authentication</name>
  <description>
    Detects when multiple failed authentication attempts (>10 in 5 min) 
    from a single source are immediately followed by a successful 
    authentication from the same source.
  </description>
  <condition type="sequence">
    <step count="10" window="5m">
      event_type="auth_failure" AND same(src_ip)
    </step>
    <step count="1" window="2m">
      event_type="auth_success" AND same(src_ip) AND same(user)
    </step>
  </condition>
  <response>
    <action>block_ip</action>
    <action>create_incident</action>
    <action>notify_analyst</action>
  </response>
</detection_rule>
```

#### Rule: Impossible Travel
```xml
<detection_rule id="IMPOSSIBLE_TRAVEL" severity="high" mitre="T1089">
  <name>Impossible Travel - Concurrent Authentications</name>
  <description>
    Detects when the same user authenticates from two geographically 
    impossible locations within a time window that would require 
    faster-than-travel speed.
  </description>
  <condition type="analytics">
    <baseline>user_normal_locations</baseline>
    <anomaly>location_distance > 1000km AND time_diff < 2 hours</anomaly>
    <confidence>threshold > 85%</confidence>
  </condition>
  <context_enrichment>
    <geoip_lookup field="src_ip"/>
    <vpn_check field="src_ip"/>
    <asset_criticality field="destination"/>
  </context_enrichment>
</detection_rule>
```

#### Rule: Ransomware Pattern Detection
```xml
<detection_rule id="RANSOMWARE_PATTERN" severity="critical" mitre="T1486">
  <name>Potential Ransomware Activity - Mass File Encryption</name>
  <description>
    Detects behavioral indicators of ransomware including rapid file 
    modifications, extension changes consistent with encryption, and 
    ransom note creation.
  </description>
  <condition type="pattern">
    <indicator>file_extension_change_rate > 50/min on single host</indicator>
    <indicator>file_entropy_increase > 80%</indicator>
    <indicator>ransom_note_filename_pattern match</indicator>
    <logic>ANY 2 OF 3 within 10 minutes</logic>
  </condition>
  <immediate_response>
    <action>isolate_endpoint</action>
    <action>preserve_memory</action>
    <action>alert_soc_commander</action>
  </immediate_response>
</detection_rule>
```

---

## 5. Dashboard & Visualization Framework

### 5.1 Standard Dashboards

| Dashboard | Audience | Refresh Rate | Key Components |
|-----------|----------|--------------|----------------|
| **Executive Summary** | C-Level, Ministers | Hourly | Risk posture, trends, SLAs, major incidents |
| **SOC Operations** | SOC Analysts | Real-time (30s) | Alert queue, active incidents, threat feed |
| **Threat Intelligence** | Intel Team | 15 minutes | Actor campaigns, IOCs, landscape |
| **Compliance** | Auditors, GRC | Daily | Control status, exceptions, reports |
| **Infrastructure** | Engineering | 5 minutes | Pipeline health, capacity, errors |
| **Incident Review** | IR Team | On-demand | Case timeline, artifacts, actions taken |

### 5.2 Key Metrics Displayed

```yaml
executive_dashboard:
  kpi_sections:
    security_posture:
      - "Overall Risk Score (0-100)"
      - "MTTD (Mean Time to Detect)"
      - "MTTR (Mean Time to Respond)"
      - "Coverage Percentage"
      
    operational_metrics:
      - "Alerts Processed (24h)"
      - "True Positive Rate"
      - "Automated vs Manual Response"
      - "Analyst Utilization"
      
    trend_visualizations:
      - "Incident Trend (90-day rolling)"
      - "Threat Landscape Heatmap"
      - "Sector Attack Distribution"
      - "Response Effectiveness"
      
  drill_down_capability:
    - "Click any metric → detailed view"
    - "Time range selector (1h to 1y)"
    - "Ministry/Department filter"
    - "Severity breakdown"
```

---

## 6. Integration Points

### 6.1 SIEM Integrations Matrix

| Integration Type | Tool/Platform | Protocol | Data Direction | Priority |
|-----------------|---------------|----------|----------------|----------|
| **EDR** | CrowdStrike Falcon | REST API + Event Stream | Bidirectional | P0 |
| **SOAR** | Splunk SOAR / Phantom | REST API | Bidirectional | P0 |
| **TIP** | MISP / ThreatConnect | TAXII 2.1 + REST | Bidirectional | P0 |
| **Network NTA** | ExtraHop / Darktrace | Syslog + API | Inbound | P0 |
| **Vulnerability** | Qualys / Tenable | API | Inbound | P1 |
| **Identity** | Microsoft AD / Azure AD | WinEvent + API | Inbound | P1 |
| **Cloud** | AWS GuardDuty / Azure Sentinel | Native Integration | Inbound | P1 |
| **Ticketing** | ServiceNow / Jira | REST API | Outbound | P1 |
| **Email** | Mimecast / Proofpoint | API + Journal | Inbound | P2 |
| **DLP** | Symantec DLP / Forcepoint | Syslog | Inbound | P2 |

### 6.2 API Specifications

```yaml
siem_api_endpoints:
  search_api:
    endpoint: "/services/search/jobs"
    method: "POST"
    auth: "Token-based (Splunk token)"
    rate_limit: "50 concurrent searches"
    example_payload:
      search: "index=security src_ip=10.0.0.1 | stats count by signature"
      earliest_time: "-24h"
      latest_time: "now"
      
  alert_action_api:
    endpoint: "/services/alerts/actions"
    method: "POST"
    auth: "Token + RBAC verification"
    supported_actions:
      - "create_incident"
      - "send_email"
      - "invoke_webhook"
      - "update_ticket"
      
  data_ingestion_api:
    endpoint: "/services/receivers/raw"
    method: "POST"
    auth: "HEC token (per-source)"
    throughput: "Up to 1MB/s per token"
    format: "JSON, syslog, raw text"
```

---

## 7. Tuning & Optimization

### 7.1 False Positive Reduction Program

| Phase | Duration | Activities | Target FP Rate |
|-------|----------|------------|----------------|
| **Baseline** | Month 1-2 | Collect initial data, establish norms | Measure current |
| **Rule Tuning** | Month 3-4 | Adjust thresholds, add exceptions | Reduce by 40% |
| **ML Training** | Month 5-6 | Train models on labeled data | Reduce by 60% |
| **Continuous** | Ongoing | Weekly tuning reviews, feedback loops | Maintain <15% |

### 7.2 Performance Optimization Checklist

- [ ] Implement proper data model (CIM - Common Information Model)
- [ ] Use tstats where possible for accelerated searches
- [ ] Create summary indexes for frequent aggregations
- [ ] Optimize search scheduling (off-peak for heavy reports)
- [ ] Monitor and optimize high-cardinality fields
- [ ] Implement proper retention policies
- [ ] Regular index maintenance (defragmentation)
- [ ] Query optimization training for analysts

---

*This SIEM architecture provides the foundation for comprehensive security monitoring across all Algerian government assets.*
