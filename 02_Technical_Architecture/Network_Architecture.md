# Network Architecture Design

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | SOC-TECH-NET-001 |
| **Version** | 1.0 |
| **Component** | Network Infrastructure |
| **Status** | Design Complete |

---

## 1. Network Design Philosophy

### 1.1 Core Principles

The National SOC network architecture is designed around these foundational principles:

1. **Defense in Depth** - Multiple security layers, no single point of failure
2. **Zero Trust** - Never trust, always verify; least privilege access
3. **Visibility First** - All traffic observable, logged, and analyzable
4. **Resilience by Design** - Redundancy at every layer, automatic failover
5. **Scalability Ready** - Architecture supports 10x growth without redesign

### 1.2 Network Zones Definition

| Zone | Trust Level | Purpose | Examples |
|------|-------------|---------|----------|
| **Zone 0: External** | Untrusted | Internet-facing services | DMZ, Web proxies |
| **Zone 1: Data Collection** | Semi-trusted | Log collectors, forwarders | Collector VLANs |
| **Zone 2: Analytics** | Trusted | Processing engines | SIEM/SOAR cluster |
| **Zone 3: Storage** | Highly trusted | Data repositories | Data lake, archives |
| **Zone 4: Operations** | Highly trusted | Human analysts | SOC floor network |
| **Zone 5: Admin** | Most trusted | Infrastructure management | Out-of-band mgmt |
| **Zone 6: Investigation** | Isolated | Sensitive investigations | Sandboxes, forensics |

---

## 2. Physical Network Topology

### 2.1 Multi-Site Architecture

```
                         ┌─────────────────────────────────────────┐
                         │           INTERNET                      │
                         └──────────────────┬──────────────────────┘
                                            │
                         ┌──────────────────┴──────────────────────┐
                         │         EDGE ROUTERS (BGP)              │
                         │    ISP-A (Algérie Télécom)              │
                         │    ISP-B (Backup provider)              │
                         └──────────────────┬──────────────────────┘
                                            │
┌───────────────────────────────────────────┼───────────────────────────────────┐
│                                  PRIMARY SITE (ALGIERS)                       │
│  ┌────────────────────────────────────────┼────────────────────────────────┐  │
│  │                          CORE SWITCHES (HSRP/VRRP)                     │  │
│  │   ┌────────────────────────────────────┼────────────────────────────┐  │  │
│  │   │                         FIREWALL CLUSTER                       │  │  │
│  │   │                    (Palo Alto PA-5430 x2 Active-Active)        │  │  │
│  │   └────────────────────────────────────┼────────────────────────────┘  │  │
│  │                                        │                               │  │
│  │   ┌────────────────────────────────────┼────────────────────────────┐  │  │
│  │   │                    DISTRIBUTION SWITCHES                        │  │  │
│  │   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │  │
│  │   │   │ DMZ VLAN │ │Collector │ │Analytics │ │Operations│         │  │  │
│  │   │   │  Zone 0  │ │  Zone 1  │ │  Zone 2  │ │  Zone 4  │         │  │  │
│  │   │   └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │  │
│  │   └────────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                            │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
    ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
    │   DR SITE (ORAN)         │  │   BACKUP SITE            │  │   REMOTE COLLECTORS      │
    │   Hot Standby           │  │   (Constantine)          │  │   (Regional Offices)     │
    │   Mirror of Primary     │  │   Warm Standby           │  │                          │
    └──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘
```

### 2.2 Site Specifications

#### Primary Site - Algiers (Main Data Center)

| Component | Specification | Quantity | Redundancy |
|-----------|--------------|----------|------------|
| **Core Router** | Cisco ASR 9922 or Juniper MX Series | 2 | HSRP/VRRP |
| **Core Switch** | Cisco Catalyst 9500 / Arista 7280R | 4 | StackWise/MC-LAG |
| **Firewall** | Palo Alto PA-5430 | 2 | Active-Active |
| **IDPS** | ExtraHop Reveal(x) 6500 | 2 | High Availability |
| **Load Balancer** | F5 BIG-IP i15800 | 2 | Sync-Failover |
| **Distribution Switches** | Catalyst 9300 | 12 per zone | Stacked pairs |
| **Access Switches** | Catalyst 9200 | As needed | Dual uplink |
| **DNS/DHCP** | Infoblox DDI 1460 | 2 | Grid HA |
| **Proxy/Web Gateway** | Zscaler/ZIA or Blue Coat | Clustered | Geo-redundant |

#### DR Site - Oran (Disaster Recovery)

| Component | Specification | Notes |
|-----------|--------------|-------|
| **Capacity** | 100% of Primary | Full production capability |
| **Data Sync** | Synchronous for critical, async for rest | < 1 min RPO for critical |
| **Activation** | Automatic failover | < 5 minute RTO |
| **Testing** | Monthly failover drills | Quarterly full DR test |

---

## 3. Network Security Architecture

### 3.1 Firewall Rule Framework

```yaml
firewall_policy_framework:
  rule_ordering:
    1: "Explicit deny known-bad (threat feeds)"
    2: "Allow business-critical (documented exceptions)"
    3: "Allow standard operations (base policies)"
    4: "Deny by default (implicit + explicit logging)"
    
  zone_matrix:
    # Source → Destination : Default Policy
    external_to_dmz: "ALLOW (selected ports only)"
    external_to_internal: "DENY"
    dmz_to_analytics: "ALLOW (specific collectors)"
    analytics_to_storage: "ALLOW (specific protocols)"
    operations_to_all: "RESTRICTED (jump servers required)"
    admin_to_all: "HIGHLY RESTRICTED (bastion hosts)"
    
  logging_requirements:
    log_all_denies: true
    log_all_allows_to_sensitive_zones: true
    sample_log_allows_standard: "1:1000"
    log_format: "syslog to SIEM + local buffer"
    retention: "90 days online, 1 year archive"
```

### 3.2 Micro-Segmentation Design

```yaml
microsegmentation:
  technology: "Illumio Core or VMware NSX-T"
  
  workload_labels:
    environment: ["production", "staging", "development"]
    function: ["siem_indexer", "soar_engine", "database", "web_server"]
    sensitivity: ["public", "internal", "confidential", "restricted"]
    location: ["algiers_primary", "oran_dr", "constantine_backup"]
    
  policy_examples:
    # Database protection
    - name: "db-access-control"
      from: "function=soar_engine OR function=siem_indexer"
      to: "function=database"
      action: "ALLOW"
      ports: [5432, 3306, 1521, 27017]
      stateful: true
      logging: "full"
      
    # Analyst workstation restrictions
    - name: "analyst-workstation-policy"
      from: "zone=operations AND function=workstation"
      to: "NOT zone=operations"
      action: "ALLOW"
      ports: [443, 22]  # HTTPS, SSH (to jump boxes)
      blocked_ports: "ALL OTHERS"
      
    # Cross-site replication
    - name: "site-replication"
      from: "location=algiers_primary"
      to: "location=oran_dr"
      action: "ALLOW"
      ports: [8443, 9443]  # Replication ports
      encrypted: true
      authentication: "mutual TLS"
```

### 3.3 Network Detection & Response (NDR)

```yaml
ndr_deployment:
  solution: "ExtraHop Reveal(x) + Darktrace (defense-in-depth)"
  
  sensor_placement:
    # Full packet capture at critical points
    fpc_sensors:
      - location: "Internet perimeter"
        type: "ExtraHop 6500"
        capture: "full_packet"
        retention: "48 hours"
        
      - location: "DMZ internal boundary"
        type: "ExtraHop 5200"
        capture: "full_packet"
        retention: "24 hours"
        
      - location: "Server farm aggregation"
        type: "ExtraHop 5200"
        capture: "metadata + sampled packets"
        retention: "metadata 30 days"
        
    # Metadata-only for broader coverage
    metadata_sensors:
      - location: "Each VLAN gateway"
        type: "Virtual sensor (vSensor)"
        capture: "flow metadata only"
        
  detection_capabilities:
    - "Protocol anomaly detection"
    - "DNS tunneling detection"
    - "Encrypted traffic analysis (ML-based)"
    - "Lateral movement detection"
    - "Data exfiltration signatures"
    - "Behavioral baselines with anomaly alerting"
    - "Device fingerprinting and rogue device detection"
    
  integration:
    siem_forwarding: "All alerts + selected metadata"
    soar_trigger: "High/critical alerts auto-trigger playbooks"
    pcap_export: "On-demand via SOAR playbook"
```

---

## 4. Traffic Flow Analysis

### 4.1 Normal Operational Flows

```
DATA SOURCE → COLLECTOR → PROCESSING → STORAGE → ANALYSIS → ACTION

Example: Firewall Log Flow
┌──────────┐    HTTP(S)    ┌──────────┐    Kafka    ┌──────────┐
│ Firewall │ ────────────▶ │ Forwarder │ ─────────▶ │  Kafka   │
│ Cluster  │   Syslog     │ Cluster  │   Topic    │  Cluster  │
└──────────┘              └──────────┘            └────┬─────┘
                                                     │
                                              ┌──────▼──────┐
                                              │  Logstash    │
                                              │  Parser      │
                                              └──────┬──────┘
                                                     │
                                              ┌──────▼──────┐
                                              │ Elasticsearch│
                                              │  Indexer     │
                                              └──────┬──────┘
                                                     │
                                              ┌──────▼──────┐
                                              │   SIEM       │
                                              │  Correlation │
                                              └──────┬──────┘
                                                     │
                                         ┌────────────┼────────────┐
                                         ▼            ▼            ▼
                                  ┌──────────┐ ┌──────────┐ ┌──────────┐
                                  │  Alert   │ │ Dashboard│ │  SOAR    │
                                  │  Queue   │ │ Display  │ │ Trigger  │
                                  └──────────┘ └──────────┘ └──────────┘
```

### 4.2 Bandwidth Requirements

| Traffic Type | Average Bandwidth | Peak Bandwidth | Daily Volume |
|-------------|-------------------|-----------------|--------------|
| **Log Ingestion** | 5 Gbps | 25 Gbps | 50 TB |
| **Replication (to DR)** | 10 Gbps | 40 Gbps | 80 TB |
| **Inter-cluster** | 2 Gbps | 10 Gbps | 15 TB |
| **Analyst Queries** | 500 Mbps | 5 Gbps | N/A |
| **Backup Traffic** | 20 Gbps | 40 Gbps | 200 TB |
| **Management/Admin** | 100 Mbps | 1 Gbps | 1 TB |

---

## 5. Remote Access & VPN Architecture

### 5.1 Secure Remote Access Design

```yaml
remote_access:
  primary_solution: "Zscaler Private Access (ZPA)"
  
  access_principles:
    - "Never direct VPN to internal network"
    - "Application-specific access (not network-level)"
    - "Device posture check before access"
    - "Just-in-time access with expiration"
    - "Full session recording for privileged"
    
  user_categories:
    soc_analyst_remote:
      allowed_apps: ["soc_dashboard", "siem_console", "email"]
      auth_factors: ["password", "push_mfa", "device_cert"]
      session_timeout: "8 hours"
      access_hours: "per shift schedule"
      
    administrator_remote:
      allowed_apps: ["admin_console", "jump_server_ssh", "monitoring"]
      auth_factors: ["hardware_token", "biometric", "device_cert"]
      session_timeout: "4 hours"
      approval_required: true
      
    executive_readonly:
      allowed_apps: ["executive_dashboard", "reporting_portal"]
      auth_factors: ["password", "push_mfa"]
      session_timeout: "2 hours"
      
  legacy_vpn:
    status: "Being phased out"
    remaining_use_cases: ["Infrastructure emergency access"]
    technology: "Pulse Secure / Citrix ADC VPN"
    mfa_required: yes
    network_access: "Jump server network ONLY"
```

---

## 6. DNS Security Architecture

### 6.1 Secure DNS Implementation

```yaml
dns_security:
  platform: "Infoblox DDI with ThreatDefend"
  
  deployment:
    primary_servers: "2x Infoblox 1460 (HA pair)"
    secondary_servers: "2x Infoblox 1060 (regional)"
    cloud_service: "Infoblox BloxOne Threat Defense"
    
  security_features:
    dns_firewall:
      enabled: true
      feed_sources: ["Infoblox", "Cisco Talos", "custom"]
      action_for_malicious: "Block + Alert + Redirect to sinkhole"
      action_for_suspicious: "Monitor + Alert"
      
    dns_tunneling_detection:
      enabled: true
      algorithms: ["payload_length", "entropy", "frequency", "timing"]
      threshold: "95th percentile baseline deviation"
      response: "Alert to SIEM + block after confirmation"
      
    domain_generation_algorithm_dga:
      enabled: true
      ml_models: "LSTM + Random Forest ensemble"
      update_frequency: "Daily model refresh"
      preemptive_blocking: "High confidence only (>98%)"
      
    dns_analytics:
      query_logging: "All queries (for security analysis)"
      retention: "90 days hot, 1 year warm"
      integration: "SIEM + UEBA + SOAR"
      
  resolver_hierarchy:
    level_1_cache: "Local resolver (client subnet)"
    level_2_cache: "Site recursive (Infoblox grid)"
    level_3_authoritative: "Government zones (.gov.dz)"
    level_4_root: "Root hints (standard)"
    level_5_recursive_fallback: "ISP DNS (with monitoring)"
```

---

## 7. Monitoring & Observability

### 7.1 Network Monitoring Stack

| Tool | Purpose | Scope | Alerting |
|------|---------|-------|----------|
| **SolarWinds NPM** | Infrastructure health | All network devices | SNMP traps + thresholds |
| **Grafana + Prometheus** | Metrics visualization | KPI dashboards | Custom alerts |
| **Elastic APM** | Application performance | Web applications | Latency/error rates |
| **Splunk Infrastructure** | Log aggregation | Device logs | Correlation rules |
| **ExtraHop** | Network performance | Traffic analysis | Anomaly detection |
| **PagerDuty** | Incident notification | On-call escalation | Multi-channel |

### 7.2 Key Network Metrics

```yaml
network_kpis:
  availability:
    - "Uptime percentage (target: 99.999%)"
    - "Link utilization (alert at 80%)"
    - "Device health status"
    
  performance:
    - "Latency (inter-site < 5ms, intra-site < 1ms)"
    - "Packet loss (< 0.01%)"
    - "Jitter (< 2ms for VoIP/video)"
    
  security:
    - "Blocked threats count"
    - "IDS/IPS alert volume"
    - "DNS query anomalies"
    - "Failed authentication attempts"
    
  capacity:
    - "Bandwidth trend (30/90/365 day)"
    - "Table utilization (CAM, ARP, routing)"
    - "Storage capacity (logs, PCAP)"
```

---

*The network architecture provides the secure, resilient foundation upon which all National SOC capabilities are built.*
