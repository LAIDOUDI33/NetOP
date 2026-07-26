# Threat Intelligence Platform Architecture

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | SOC-TECH-TIP-001 |
| **Version** | 1.0 |
| **Component** | Threat Intelligence Platform (TIP) |
| **Status** | Design Complete |

---

## 1. Threat Intelligence Mission

### 1.1 Strategic Objectives

The National SOC Threat Intelligence (TI) function serves as the **knowledge center** for proactive defense:

1. **Early Warning** - Identify threats before they impact Algeria
2. **Contextual Enrichment** - Add actionable context to security events
3. **Threat Actor Profiling** - Understand adversaries targeting Algeria
4. **Strategic Guidance** - Inform leadership decisions with intel assessments
5. **Information Sharing** - Contribute to and benefit from global TI community

### 1.2 Intelligence Requirements (Priority)

| Priority | Requirement | Consumer | Frequency |
|----------|-------------|----------|-----------|
| **P1-Critical** | Nation-state actors targeting North Africa/MENA region | CISO, Ministers | Real-time |
| **P1-Critical** | Ransomware campaigns active against governments | SOC Ops, IT Directors | Real-time |
| **P1-Critical** | Zero-day vulnerabilities in government tech stack | Patch Team, CISO | Immediate |
| **P2-High** | Phishing campaigns targeting .gov.dz domains | Email Sec Team | Hourly |
| **P2-High** | Compromised credentials/breaches involving gov data | IR Team | Daily |
| **P3-Medium** | Cybercrime trends affecting financial sector | Banking Liaison | Weekly |
| **P3-Medium** | Emerging technologies/tactics overview | Architecture Team | Monthly |
| **P4-Low** | Geopolitical developments with cyber implications | Strategic Intel | Monthly |

---

## 2. Intelligence Lifecycle Implementation

### 2.1 The Intelligence Cycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE LIFECYCLE                                │
│                                                                         │
│    ┌───────────┐                                                       │
│    │ PLANNING  │ ◄─────────────────────────────────────────────────┐   │
│    │ (Direction│                                             │   │   │
│    │  & PIRs)  │                                             │   │   │
│    └─────┬─────┘                                             │   │
│          │                                                   │   │
│          ▼                                                   │   │
│    ┌───────────┐       ┌───────────┐       ┌───────────┐    │   │
│    │COLLECTION│──────▶│PROCESSING │──────▶│ ANALYSIS  │    │   │
│    │(Raw Intel│       │(Normalize │       │(Contextual│    │   │
│    │ Sources) │       │ Validate) │       │ Produce)  │    │   │
│    └───────────┘       └───────────┘       └─────┬─────┘    │   │
│                                                │          │   │
│                                                ▼          │   │
│                                          ┌───────────┐    │   │
│                                          │DISSEMINATION│   │   │
│                                          │(Distribute │    │   │
│                                          │ to Cons.)  │    │   │
│                                          └─────┬─────┘    │   │
│                                                │          │   │
│                                                ▼          │   │
│                                          ┌───────────┐    │   │
│                                          │ FEEDBACK   │───────────┘
│                                          │(Evaluate   │
│                                          │ Refine)    │
│                                          └───────────┘
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Collection Plan

```yaml
collection_plan:
  sources:
    commercial_intelligence:
      recorded_future:
        type: "Strategic intelligence platform"
        strengths: "Predictive analytics, dark web, brand monitoring"
        use_cases: "Strategic assessments, executive briefings"
        cost_category: "Premium ($150K+ annually)"
        
      mandiant:
        type: "Incident response + intelligence"
        strengths: "APT tracking, adversary simulations, IR support"
        use_cases: "Nation-state actor tracking, IR augmentation"
        cost_category: "Premium ($200K+ annually)"
        
      crowdstrike_falcon_x:
        type: "Operational intelligence"
        strengths: "Real-time IOC feed, actor profiles, immediate relevance"
        use_cases: "IOC enrichment, daily operations"
        cost_category: "Included with EDR"
        
      proofpoint_et_intelligence:
        type: "Email-focused intelligence"
        strengths: "Phishing tracking, email campaign analysis"
        use_cases: "Email security team, phishing response"
        cost_category: "Mid-tier ($50K annually)"
        
    open_source_intelligence:
      alienvault_otx:
        type: "Community threat feed"
        strengths: "Free, large community, diverse indicators"
        use_cases: "Baseline IOC feed, community engagement"
        cost: "Free (Premium available)"
        
      misp_communities:
        type: "Threat sharing platform"
        strengths: "Global sharing, customizable feeds, STIX native"
        use_cases: "International sharing, sector-specific intel"
        cost: "Free (self-hosted)"
        
      abuse_ch:
        type: "Malicious infrastructure tracking"
        strengths: "URLhaus, Feodo Tracker, highly reliable"
        use_cases: "URL/domain blocking lists, malware C2 tracking"
        cost: "Free"
        
      virustotal:
        type: "File/URL analysis engine"
        strengths: "Multi-engine scanning, community ratings"
        use_cases: "File reputation, sandbox results aggregation"
        cost: "Free tier + Premium API ($30K annually)"
        
    government_sharing:
      first:
        type: "Forum of Incident Response Teams"
        strengths: "Trusted community, TLP sharing, exercises"
        use_cases: "Best practices, incident coordination"
        membership: "Required for national CERT"
        
      nato_ccdoe:
        type: "NATO Cooperative Centre of Excellence"
        strengths: "Research, training, exercises"
        use_cases: "Training, exercise participation, research papers"
        relationship: "Observer/partner status"
        
      bilateral_arrangements:
        - country: "France (ANSSI)"
          type: "Formal MoU"
          scope: "Threat sharing, training, exercises"
          
        - country: "United States (CISA)"
          type: "Cooperation agreement"
          scope: "Best practices, capacity building"
          
        - region: "GCC Arab States"
          type: "Regional cooperation"
          scope: "Regional threat landscape, joint exercises"
          
    internal_collection:
      honeypots:
        deployment: "Distributed across network perimeters"
        types: ["medium_interaction", "SSH honeypot", "webhoneypot", "AD decoy"]
        purpose: "Collect attacker TTPs, early warning"
        tools: "T-Pot, Canarytokens, ThinkST Canaries"
        
      dark_web_monitoring:
        scope: "Algeria-related mentions, .gov.dz mentions, credential sales"
        method: "Automated scraping + manual analyst review"
        tools: "Commercial dark web monitoring service"
        
      osint_collection:
        social_media: "Twitter/X, Telegram channels, forums"
        technical: "GitHub repos, paste sites, exploit databases"
        news: "Cybersecurity news outlets, press releases"
```

---

## 3. TIP Platform Architecture

### 3.1 Technology Selection

| Platform | Strengths | Best For | Recommendation |
|----------|-----------|----------|----------------|
| **MISP** | Open-source, STIX-native, strong community | Sharing, basic management | Core platform (primary) |
| **ThreatConnect** | Advanced analytics, task management, scoring | Full lifecycle management | Commercial enhancement |
| **Anomali ThreatStream** | Enterprise scale, integration focus | Large-scale automation | Alternative option |
| **Recorded Future Intelligence Platform** | Predictive analytics, auto-enrichment | Strategic intelligence | Complementary |

**Recommended Architecture:** MISP as core (open-source, flexible) + ThreatConnect for advanced analytics needs

### 3.2 MISP Deployment Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                       MISP DEPLOYMENT ARCHITECTURE                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                    EXTERNAL INTERFACES                         │   │
│   │                                                                │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│   │  │ TAXII 2.1│  │ REST API │  │ MISP Sync│  │ Web UI   │      │   │
│   │  │ Server   │  │ Endpoint │  │ Servers  │  │ Portal   │      │   │
│   │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │   │
│   └───────┼────────────┼────────────┼────────────┼────────────┘   │
│           │            │            │            │                 │
│   ┌───────┴────────────┴────────────┴────────────┴────────────┐   │
│   │                    MISP APPLICATION SERVER                  │   │
│   │                                                            │   │
│   │  ┌────────────────────────────────────────────────────┐   │   │
│   │  │              PHP-FPM Application Layer              │   │   │
│   │  │         (MISP Core + Modules + Customizations)      │   │   │
│   │  └─────────────────────────┬──────────────────────────┘   │   │
│   │                            │                               │   │
│   │  ┌─────────────────────────▼──────────────────────────┐   │   │
│   │  │              DATA LAYER                             │   │   │
│   │  │   ┌─────────────┐  ┌─────────────┐                 │   │   │
│   │  │   │  MySQL      │  │  Redis      │                 │   │   │
│   │  │   │  (Primary)  │  │  (Cache/Jobs)│                 │   │   │
│   │  │   └─────────────┘  └─────────────┘                 │   │   │
│   │  │   ┌─────────────┐  ┌─────────────┐                 │   │   │
│   │  │   │  MySQL      │  │  Elastic    │                 │   │   │
│   │  │   │  (Replica)  │  │  Search     │                 │   │   │
│   │  │   └─────────────┘  └─────────────┘                 │   │   │
│   │  └────────────────────────────────────────────────────┘   │   │
│   └────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                    INTEGRATION LAYER                           │   │
│   │                                                                │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│   │  │   SIEM   │ │   SOAR   │ │   EDR    │ │Firewall  │        │   │
│   │  │  (IOC    │ │  (Playbook│ │  (Intel  │ │  (Block  │        │   │
│   │  │   Push)  │ │ Trigger) │ │  Feed)   │ │  Lists)  │        │   │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.3 MISP Configuration Standards

```yaml
misp_configuration:
  server_settings:
    base_url: "https://tip.nat-soc.gov.dz"
    org_name: "National SOC - Algeria"
    org_uuid: "generated-uuid-here"
    
  security:
    enable_orgs: true
    tls: true
    cert_file: "/etc/ssl/certs/misp.crt"
    key_file: "/etc/ssl/private/misp.key"
    password_policy: "min 16 chars, complexity required"
    session_timeout: "30 minutes"
    rate_limit: "API: 100 req/min, Login: 10/min"
    
  taxonomy_usage:
    - name: "admiralty-scale"
      use: "Source reliability assessment"
    - name: "DHS-Agency"
      use: "US DHS classification mapping"
    - name: "estimative-language"
      use: "Confidence wording"
    - name: "mitre-attack"
      use: "ATT&CK technique mapping"
    - name: "tlp"
      use: "Traffic Light Protocol marking"
    - name: "de-vs"
      use: "German classification (international compatibility)"
    - name: "csirt_amun"
      use: "Event classification"
    - name: "gov.dz-classification"
      use: "National classification system (custom)"
      
  warninglists:
    enabled_lists:
      - "List of known public DNS resolvers"
      - "List of IP addresses linked to Zeus botnet"
      - "List of google.com domains"
      - "List of CIDR networks for Internet Scanning"
      - "List of RFC 1918 addresses"
      - "List of TLDs"
      - "List of valid TLDs"
      - "List of Windows executable extension"
      - "List of common file types"
      
  notice_lists:
    enabled_lists:
      - "Valid ISO Country Codes"
      - "Valid ICANN TLDs"
```

---

## 4. Intelligence Production & Dissemination

### 4.1 Intelligence Products Matrix

| Product Name | Audience | Frequency | Format | Classification |
|-------------|----------|-----------|--------|----------------|
| **Daily Threat Brief** | SOC Ops, IT Managers | Daily 06:00 | Email + Portal | Internal Use |
| **Weekly Intel Summary** | Security Leaders | Monday 09:00 | PDF Report | Confidential |
| **Flash Alert** | As needed | Immediate | Email + SMS + Slack | Per event |
| **Strategic Assessment** | CISO, Ministers | Monthly | Executive Briefing | Secret |
| **Actor Profile** | All Analysts | As developed | Wiki Page | Internal Use |
| **Tactical Indicator Feed** | SIEM/SOAR | Continuous | Automated (STIX/TAXII) | Internal Use |
| **Annual Threat Landscape** | Leadership, Board | January | Comprehensive Report | Confidential |

### 4.2 Product Templates

#### Daily Threat Brief Template

```markdown
# NATIONAL SOC THREAT BRIEF
**Date:** [YYYY-MM-DD]
**Classification:** INTERNAL USE
**Prepared By:** Threat Intelligence Team

---

## 📊 Executive Summary
[2-3 sentence overview of current threat landscape relevant to Algeria]

## 🔴 Critical Items Requiring Attention
1. [Item 1 - what it is, why it matters, recommended actions]
2. [Item 2]

## 🟡 Items to Watch
1. [Item 1]
2. [Item 2]

## 📈 Key Statistics (Last 24 Hours)
- Blocked malicious IPs: [X]
- Phishing attempts blocked: [X]
- Malware samples analyzed: [X]
- IOC updates pushed: [X]
- Incidents opened: [X]

## 🌍 Regional Threat Highlights
- [North Africa/MENA specific items]

## 📅 Upcoming
- [Planned exercises, patches, events]

## 🔗 Useful Links
- [Current top IOCs](link)
- [Actor profile updates](link)
- [Detailed reports](link)

---
*For questions, contact: intel@nat-soc.gov.dz*
```

---

## 5. Automation & Integration

### 5.1 Automated Intelligence Pipelines

```yaml
automation_pipelines:
  # Pipeline 1: IOC Enrichment & Distribution
  ioc_pipeline:
    trigger: "New IOC received from any source"
    steps:
      - name: "normalize"
        action: "Convert to STIX 2.1 format"
        
      - name: "deduplicate"
        action: "Check against existing IOCs (fuzzy match)"
        
      - name: "score"
        action: "Calculate confidence score based on:"
          inputs:
            - "Source reliability (Admiralty scale)"
            - "Corroboration (other sources confirming)"
            - "Age (decay function)"
            - "Relevance (targets matching our environment)"
            
      - name: "enrich"
        action: "Auto-enrich from:"
          parallel:
            - "VirusTotal lookup"
            - "WHOIS/Geolocation"
            - "Passive DNS"
            - "Sandbox analysis (if file)"
            
      - name: "store"
        action: "Save to MISP with full context"
        
      - name: "distribute"
        action: "Push to consumers based on score:"
          rules:
            - if: "score >= 85"
              then: ["SIEM", "Firewall", "DNS", "Proxy", "EDR"]
            - if: "score >= 70"
              then: ["SIEM", "DNS", "Proxy"]
            - if: "score >= 50"
              then: ["SIEM (log only)"]
              
  # Pipeline 2: Threat Report Generation
  report_pipeline:
    trigger: "Scheduled (daily 05:00) OR significant event"
    steps:
      - name: "gather_data"
        sources: ["MISP events (24h)", "SIEM alerts", "EDR detections", "OSINT feeds"]
        
      - name: "analyze_trends"
        action: "Identify patterns, anomalies, increases"
        
      - name: "generate_brief"
        template: "daily_threat_brief_template"
        
      - name: "quality_review"
        action: "Senior analyst review (automated queue)"
        
      - name: "distribute"
        channels: ["Email list", "Portal publish", "Slack post"]
        
  # Pipeline 3: Actor Tracking
  actor_tracking_pipeline:
    trigger: "New information about tracked actor"
    steps:
      - name: "identify_actor"
        action: "Match to existing actor profile or create new"
        
      - name: "update_profile"
        action: "Add new TTPs, IOCs, campaigns to profile"
        
      - name: "assess_threat"
        action: "Recalculate actor threat level to Algeria"
        
      - name: "notify_stakeholders"
        condition: "significant_change OR new_algeria_targeting"
        action: "Alert relevant teams"
```

### 5.2 SOAR Integration Points

```yaml
soar_integration:
  triggers_from_tip:
    - name: "new_high_confidence_ioc"
      condition: "New IOC with confidence > 85 AND relevant to env"
      action: "Trigger IOC Blocklist Update playbook"
      
    - name: "active_campaign_detected"
      condition: "Multiple related events indicating campaign"
      action: "Create intelligence-led hunting task"
      
    - name: "zero_day_vulnerability"
      condition: "Critical vuln affecting our software stack"
      action: "Trigger Emergency Vulnerability Response playbook"
      
  data_to_tip:
    - name: "incident_iocs"
      condition: "IOC extracted during investigation"
      action: "Push to MISP for sharing"
      
    - name: "new_attacker_ttps"
      condition: "Novel techniques observed in incident"
      action: "Update actor profile, share with community"
```

---

## 6. Quality Assurance & Metrics

### 6.1 Intelligence Quality Metrics

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| **Actionability Rate** | % of intel products leading to defensive action | > 70% | Feedback tracking |
| **False Positive Rate** | % of shared IOCs that prove benign | < 5% | Revocation tracking |
| **Timeliness** | Time from discovery to dissemination | < 4 hours (tactical) | Timestamp analysis |
| **Relevance** | % of intel applicable to Algeria's environment | > 80% | Environment mapping |
| **Source Diversity** | Number of independent sources per product | > 3 (strategic) | Source counting |
| **Consumer Satisfaction** | Stakeholder rating of products | > 4.0/5.0 | Survey feedback |

### 6.2 Operational Metrics

```yaml
tip_operational_metrics:
  collection_metrics:
    - "IOCs collected per day (target: 10,000+)"
    - "Reports processed per day (target: 50+)"
    - "Sources actively ingesting (target: 50+)"
    - "Collection gaps identified (target: quarterly review)"
    
  processing_metrics:
    - "Average time from collection to available (target: < 30 min)"
    - "Enrichment completion rate (target: 95%)"
    - "Classification accuracy (target: > 98%)"
    
  dissemination_metrics:
    - "Products delivered on time (target: 98%)"
    - "Subscriber engagement rate (target: > 75% open/read)"
    - "IOC distribution latency (target: < 5 min to SIEM)"
    - "Community contributions made (target: 10+ monthly)"
```

---

*The Threat Intelligence Platform transforms raw data into actionable knowledge, enabling the National SOC to shift from reactive response to proactive defense.*
