# EDR Solution Architecture & Implementation

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | SOC-TECH-EDR-001 |
| **Version** | 1.0 |
| **Component** | Endpoint Detection & Response |
| **Status** | Design Complete |

---

## 1. EDR Strategic Overview

### 1.1 Role in National SOC Architecture

Endpoint Detection and Response (EDR) provides **deep visibility into endpoint activity**, serving as the primary detection mechanism for:
- Advanced persistent threats (APTs)
- Fileless malware and living-off-the-land attacks
- Insider threat activities
- Ransomware (early warning)
- Lateral movement detection

### 1.2 EDR Integration Context

```
┌─────────────────────────────────────────────────────────────┐
│                     NATIONAL SOC                             │
│                                                             │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│   │   SIEM  │◄───►│   EDR   │◄───►│   SOAR  │              │
│   │         │     │ CORE    │     │         │              │
│   └────┬────┘     └────┬────┘     └────┬────┘              │
│        │               │               │                    │
│        ▼               ▼               ▼                    │
│   Event Aggregation  Detection      Response                │
│   & Correlation      & Analysis     Orchestration           │
│                                                             │
│                        │                                    │
│                        ▼                                    │
│              ┌─────────────────┐                            │
│              │  ENDPOINTS      │                            │
│              │  (150,000+)     │                            │
│              │  • Workstations │                            │
│              │  • Servers      │                            │
│              │  • Mobile       │                            │
│              └─────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. EDR Platform Selection

### 2.1 Evaluation Matrix

| Criteria | Weight | CrowdStrike Falcon | SentinelOne | Microsoft Defender for Endpoint | Carbon Black |
|----------|--------|-------------------|-------------|----------------------------------|--------------|
| **Detection Effectiveness** | 25% | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| **Response Capabilities** | 20% | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★☆ |
| **Performance Impact** | 15% | ★★★★☆ | ★★★★★ | ★★★☆☆ | ★★★☆☆ |
| **Cloud Native** | 10% | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ |
| **Integration Ecosystem** | 15% | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| **Local Support (Algeria)** | 10% | ★★★☆☆ | ★★☆☆☆ | ★★★★☆ | ★★★☆☆ |
| **Total Cost of Ownership** | 5% | ★★★☆☆ | ★★★★☆ | ★★★★★ | ★★★☆☆ |

### 2.2 Recommendation: Primary + Secondary Strategy

**Primary Platform: CrowdStrike Falcon Pro (or Falcon Complete)**

| Factor | Justification |
|--------|---------------|
| Market Leadership | #1 in Gartner Magic Quadrant, proven at scale |
| Detection Quality | Industry-leading ML models, extensive telemetry |
| Response Speed | Sub-second containment via RTR |
| Cloud-Native | No on-prem infrastructure, easy deployment |
| Threat Intelligence | Overwatch service for hunting |
| Scalability | Proven at Fortune 500 scale globally |

**Secondary/Complementary: Microsoft Defender for Endpoint**

| Use Case | Rationale |
|----------|-----------|
| Microsoft-heavy environments | Native integration with M365/Azure |
| Cost optimization | Included in certain license agreements |
| Redundancy | Backup if primary has issues |
| Specific features | Some unique capabilities (attack surface reduction) |

---

## 3. EDR Technical Architecture

### 3.1 Agent Deployment Model

```yaml
edr_deployment:
  agent_architecture:
    type: "Lightweight sensor (kernel-level)"
    size: "< 100MB disk footprint"
    memory: "< 150MB RAM typical"
    cpu_impact: "1-3% average"
    network: "< 50MB/day upload (typical workstation)"
    
  deployment_phases:
    phase_1_critical: # Months 1-3
      scope: "~5,000 high-value endpoints"
      targets:
        - "Executive devices"
        - "Domain controllers"
        - "SOC analyst workstations"
        - "Server administrators"
        - "Critical infrastructure servers"
      tier: "Falcon Complete (MDR)"
      
    phase_2_expansion: # Months 4-9
      scope: "~50,000 endpoints"
      targets:
        - "All government workstations"
        - "Remaining servers"
        - "Remote worker laptops"
      tier: "Falcon Pro (in-house monitoring)"
      
    phase_3_complete: # Months 10-18
      scope: "~150,000+ endpoints"
      targets:
        - "All remaining devices"
        - "BYOD (limited visibility)"
        - "Specialized equipment where supported"
      tier: "Mixed based on risk profile"

  deployment_methodology:
    tools:
      - "Microsoft SCCM / Intune"
      - "Group Policy (fallback)"
      - "Ansible playbooks (Linux)"
      - "CrowdStrike API (cloud-managed)"
      
    testing:
      pilot_groups: "500 users per wave"
      rollback_plan: "Automatic uninstall script ready"
      success_criteria: "< 2% failure rate, < 5% performance complaints"
```

### 3.2 Sensor Telemetry Configuration

```yaml
telemetry_collection:
  # Core telemetry (always enabled)
  core_telemetry:
    process_events:
      enabled: true
      details: ["create", "terminate", "cross-process", "code injection"]
      
    file_events:
      enabled: true
      details: ["create", "delete", "modify", "rename", "read"]
      
    network_events:
      enabled: true
      details: ["connect", "dns_query", "http_request"]
      
    user_events:
      enabled: true
      details: ["logon", "logoff", "privilege_use"]
      
    registry_events:
      enabled: true  # Windows only
      details: ["create_key", "delete_key", "set_value", "delete_value"]

  # Enhanced telemetry (high-value targets)
  enhanced_telemetry:
    target_tiers: ["tier_1_critical", "tier_3_server"]
    
    additional_events:
      - "driver_loading"
      - "module_load"
      - "image_mapping"
      - "scheduled_task_creation"
      - "service_creation/modification"
      - "wmi_event_creation"
      - "powershell_script_block_logging"
      - "command_line_logging"
      - "dns_resolution_detail"
      - "network_connection_full_payload"  # Sampled
      
    memory_scanning:
      enabled: true
      schedule: "continuous (randomized intervals)"
      techniques: ["pattern_matching", "hook_detection", "heap_analysis"]

  # Custom IOAs (Indicator of Attack)
  custom_detections:
    gov_specific_rules:
      - name: "Unusual After-Hours Bulk Access"
        description: "Mass file access outside normal hours from non-oncall"
        condition: "file_access_count > 100 AND hour NOT IN (8-18) AND role != 'oncall'"
        
      - name: "Sensitive Document Pattern"
        description: "Access to documents matching classification patterns"
        condition: "filename MATCHES '(secret|classified|confidential)' AND export_action = true"
        
      - name: "Unauthorized Admin Tool Usage"
        description: "Use of hacking/admin tools by non-admin personnel"
        condition: "process_name IN (hacking_tools_list) AND user_role != 'administrator'"
```

### 3.3 Detection & Prevention Stack

```
┌─────────────────────────────────────────────────────────────┐
│                  FALCON PREVENTION FUSION                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MACHINE LEARNING (ML)                   │   │
│  │  • Static ML (pre-execution) - File reputation      │   │
│  │  • Behavioral ML (runtime) - Process behavior       │   │
│  │  • Custom ML models (customer-trained)              │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │              INDICATORS OF ATTACK (IOA)             │   │
│  │  • 2300+ built-in behavioral rules                 │   │
│  │  • MITRE ATT&CK mapped                              │   │
│  │  • Real-time response triggering                    │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │              INDICATORS OF COMPROMISE (IOC)         │   │
│  │  • Hash matching (MD5, SHA256)                      │   │
│  │  • IP/domain/URL blocking                           │   │
│  │  • Custom intelligence feeds                        │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │              EXPLOIT PROTECTION                      │   │
│  │  • Kernel-level exploit break                       │   │
│  │  • Memory protection techniques                     │   │
│  │  • Application vulnerability shielding             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              NEXT-GEN AV (NGAV)                      │   │
│  │  • Traditional signature + heuristic                 │   │
│  │  • Sandbox integration for unknown files            │   │
│  │  • Cloud-delivered real-time intelligence          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. EDR-SIEM Integration

### 4.1 Data Flow Architecture

```
EDR AGENTS → CLOUD API → SIEM INGESTION → CORRELATION → ALERTS
                    ↓
              SOAR TRIGGER → RESPONSE ACTIONS
```

### 4.2 Recommended Event Forwarding

| Event Type | Forward to SIEM? | Reason | Volume Estimate |
|------------|------------------|--------|-----------------|
| **Detection Alerts** | ✅ Yes (All) | Core correlation input | 10,000/day |
| **Process Events** | ⚠️ Sampled | High volume, use selectively | 5M+/day (if all) |
| **Network Connections** | ⚠️ Sampled | Very high volume | 20M+/day (if all) |
| **File Write Events** | ❌ No | Too voluminous, query EDR directly | N/A |
| **Authentication Events** | ✅ Yes | Critical for UEBA | 500K/day |
| **Admin Actions** | ✅ Yes (All) | High-value audit trail | 5,000/day |
| **Detection Triage** | ✅ Yes | Enrichment context | Matches alerts |

### 4.3 Integration API Specifications

```yaml
crowdstrike_integration:
  authentication:
    method: "OAuth2 Client Credentials"
    token_endpoint: "https://api.crowdstrike.com/oauth2/token"
    scopes: ["detection-read", "host-read", "real-response"]
    
  key_endpoints:
    detections:
      endpoint: "/detects/queries/detects/v1"
      method: "GET"
      params: ["filter", "limit", "sort"]
      rate_limit: "requests per minute"
      
    host_details:
      endpoint: "/devices/entities/devices/v2"
      method: "GET"
      params: ["ids"]
      includes: ["hostname", "os_version", "local_ip", "mac_address"]
      
    realtime_response:
      endpoint: "/real-time-response/entities/sessions/v1"
      method: "POST"
      capabilities: ["cmd", "get", "put", "runscript", "filelist"]
      
    incident_export:
      endpoint: "/incidents/queries/incidents/v1"
      method: "GET"
      supports: ["filter by date", "filter by severity", "pagination"]
      
  siem_connector_config:
    poll_interval: "60 seconds"
    batch_size: "100 detections per request"
    retry_policy: "exponential backoff, max 5 attempts"
    error_handling: "queue failed requests for later processing"
```

---

## 5. Response & Containment Procedures

### 5.1 Response Capability Matrix

| Action | Description | Approval Required | Reversible |
|--------|-------------|------------------|------------|
| **Network Contain** | Isolate host from network | Auto (critical) / Tier1 (others) | Yes |
| **Process Kill** | Terminate malicious process | Auto for known bad | No needed |
| **File Quarantine** | Move suspicious file to quarantine | Auto / Tier1 | Yes |
| **File Delete** | Permanently remove malicious file | Tier2 approval | No |
| **Registry Restore** | Rollback registry change | Tier1 | Yes |
| **Memory Dump** | Capture process memory for analysis | Tier1 approval | N/A |
| **Full Disk Image** | Acquire forensic image | IR Lead approval | N/A |
| **Command Execution** | Run arbitrary command on host | Tier2 + approval form | Varies |

### 5.2 Automated Response Playbooks

#### Playbook: Critical Malware Auto-Containment

```yaml
playbook: edr_auto_contain
trigger:
  source: "crowdstrike_falcon"
  conditions:
    - "severity IN ('Critical', 'High')"
    - "confidence >= 90"
    - "detection_type IN ('malware', 'ransomware', 'apt')"

immediate_actions: # Execute within seconds
  - action: "network_contain"
    target: "{{host_id}}"
    reason: "Critical malware detected - automatic containment"
    
  - action: "create_incident"
    source: "SOAR"
    priority: "P1"
    title: "Auto-contained: {{detection_name}} on {{hostname}}"
    
  - action: "notify"
    channels: ["slack_soc_channel", "pagerduty_ir_oncall"]
    message: "🚨 AUTO-CONTAIN: {{hostname}} contained for {{detection_name}}"

follow_up_actions: # Execute within minutes
  - action: "enrich_intelligence"
    checks: ["hash_lookup", "domain_reputation", "related_alerts"]
    
  - action: "scope_identification"
    queries: [
      "same_user_other_hosts",
      "same_hash_other_hosts",
      "network_connections_from_host",
      "files_dropped_before_containment"
    ]
    
  - action: "assign_case"
    criteria: "next_available_tier2_analyst"
    sla: "15 minutes first look"

human_decision_point: # If automated scope unclear
  - question: "Contain additional hosts?"
    trigger: "related_hosts_with_indicators > 0"
    options: ["Yes, contain all", "Contain critical only", "Analyst review first"]
    timeout: "10 minutes"
    default: "Analyst review first"
```

---

## 6. Performance & Operations

### 6.1 Resource Planning

| Metric | Phase 1 (5K) | Phase 2 (50K) | Phase 3 (150K) |
|--------|--------------|---------------|----------------|
| **Daily Data Ingestion** | ~50 GB | ~500 GB | ~1.5 TB |
| **API Calls/Day** | ~500K | ~5M | ~15M |
| **Alerts/Day** | ~500 | ~5,000 | ~15,000 |
| **Storage Required** | 2 TB/month | 20 TB/month | 60 TB/month |
| **Analysts Needed** | 2 FTE | 8 FTE | 20 FTE |

### 6.2 Operational Dashboards

```yaml
edr_dashboards:
  executive_view:
    widgets:
      - "Endpoints Protected (total / coverage %)"
      - "Detection Trend (7/30/90 day)"
      - "Mean Time to Detect (by severity)"
      - "Top Threat Categories"
      - "Exposure Score (overall risk)"
      - "Patch Status Overview"
      
  analyst_operations:
    widgets:
      - "Real-time Alert Feed"
      - "My Queue (assigned to me)"
      - "Active Containments"
      - "Pending Approvals"
      - "Detection Accuracy (FP feedback)"
      - "Response Time Leaderboard"
      
  threat_hunting:
    widgets:
      - "Hunting Session Manager"
      - "Custom Query Builder Results"
      - "Saved Hunt Templates"
      - "Recent Detections (for hunt ideas)"
      - "Actor-Based Hunt Suggestions"
      - "Host Risk Scores (top 50)"
```

---

*The EDR platform provides the eyes and hands of the National SOC on every endpoint, enabling rapid detection and response to the most sophisticated threats.*
