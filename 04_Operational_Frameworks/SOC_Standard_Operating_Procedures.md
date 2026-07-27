# National SOC Standard Operating Procedures (SOPs)

## Document Control

| Field | Value |
|-------|-------|
| **Document ID** | SOC-OPS-SOP-001 |
| **Version** | 2.0 |
| **Classification** | Internal Use - SOC Personnel Only |
| **Effective Date** | January 2026 |
| **Review Cycle** | Quarterly |
| **Owner** | SOC Operations Director |

---

## 1. Purpose & Scope

### 1.1 Purpose
This document establishes the **Standard Operating Procedures** for all personnel working in or with Algeria's National Security Operations Center (SOC). It provides standardized processes, procedures, and guidelines to ensure consistent, effective, and efficient security operations.

### 1.2 Scope
These SOPs apply to:
- All SOC analysts (Tier 1, Tier 2, Tier 3)
- Incident Response team members
- Threat Intelligence analysts
- SOC management and leadership
- Contractors and consultants with SOC access
- External parties participating in joint operations

### 1.3 Document Hierarchy

```
National Security Policy
    ↓
SOC Governance Framework
    ↓
Standard Operating Procedures (THIS DOCUMENT)
    ↓
Playbooks & Runbooks
    ↓
Work Instructions & Checklists
```

---

## 2. Organization & Roles

### 2.1 SOC Organizational Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    SOC DIRECTOR                              │
│              (Strategic Leadership)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   IR MANAGER  │  │ THREAT INTEL  │  │ OPS MANAGER   │
│               │  │   MANAGER     │  │               │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  TIER 3 IR    │  │  INTEL        │  │  TIER 1       │
│  (Senior IR)  │  │  ANALYSTS     │  │  ANALYSTS     │
└───────┬───────┘  └───────────────┘  └───────┬───────┘
        │                                  │
        ▼                                  ▼
┌───────────────┐                  ┌───────────────┐
│  TIER 2       │                  │  SHIFT LEAD   │
│  ANALYSTS     │                  │               │
└───────────────┘                  └───────────────┘
```

### 2.2 Role Definitions

#### SOC Director
| Attribute | Description |
|-----------|-------------|
| **Reports To** | CISO / Steering Committee |
| **Overall Responsibility** | Strategic direction, budget, staffing, executive reporting |
| **Key Duties** | Resource planning, stakeholder management, program metrics, strategic initiatives |

#### Shift Lead (Tier 0)
| Attribute | Description |
|-----------|-------------|
| **Reports To** | Operations Manager |
| **Shift Coverage** | Specific shift (Day/Swing/Night) |
| **Key Duties** | Queue management, escalation decisions, quality review, analyst coordination |

#### Tier 1 Analyst (Triage Analyst)
| Attribute | Description |
|-----------|-------------|
| **Reports To** | Shift Lead |
| **Primary Function** | Initial alert triage, first response, basic investigation |
| **Skills Required** | CompTIA Security+, basic SIEM/EDR operation, communication skills |
| **Authority Level** | Execute approved playbooks, escalate to Tier 2 |

#### Tier 2 Analyst (Incident Responder)
| Attribute | Description |
|-----------|-------------|
| **Reports To** | IR Manager / Shift Lead |
| **Primary Function** | Deep investigation, incident handling, threat hunting |
| **Skills Required** | GCIH, GCFA preferred, malware analysis basics, forensic awareness |
| **Authority Level** | Coordinate response, engage external teams, recommend containment |

#### Tier 3 Analyst (Senior IR / Threat Hunter)
| Attribute | Description |
|-----------|-------------|
| **Reports To** | IR Manager |
| **Primary Function** | Complex incidents, proactive hunting, threat research, playbook development |
| **Skills Required** | OSCP/GNFA, deep malware analysis, reverse engineering, threat intelligence |
| **Authority Level** | Major incident command, cross-team coordination, strategic recommendations |

---

## 3. Operational Procedures

### 3.1 Shift Procedures

#### 3.1.1 Shift Start Procedure

```yaml
shift_start_procedure:
  timing: "15 minutes before shift start"
  
  pre_shift_tasks:
    - "Log into all SOC tools (SIEM, SOAR, EDR, TIP, Ticketing)"
    - "Review overnight alerts and status changes"
    - "Check system health dashboards"
    - "Review active incident list and pending actions"
    
  handover_meeting:
    duration: "15 minutes"
    participants: ["Outgoing Shift Lead", "Incoming Shift Lead", "Overlapping Analysts"]
    agenda:
      - "Active incidents summary"
      - "Pending escalations"
      - "System issues or degraded capabilities"
      - "Important threat intelligence updates"
      - "Staffing changes or special assignments"
      
  post_handover:
    - "Acknowledge queue ownership in ticketing system"
    - "Set status to 'Active' in communications channel"
    - "Begin monitoring alert queues"
```

#### 3.1.2 Shift End Procedure

```yaml
shift_end_procedure:
  timing: "Last 30 minutes of shift"
  
  preparation:
    - "Complete documentation for all assigned tasks"
    - "Update incident statuses with current information"
    - "Transfer any in-progress investigations properly"
    - "Clear browser sessions (except approved bookmarks)"
    
  handover_documentation:
    required_fields:
      - "Incidents worked (ID, status, next steps)"
      - "Alerts requiring follow-up"
      - "Unusual observations or concerns"
      - "Tool issues encountered"
      - "Intelligence items of interest"
      
  sign_off:
    - "Complete shift handover form"
    - "Verbal briefing to incoming shift lead"
    - "Log out of all systems"
    - "Status change to 'Offline' in comms"
```

### 3.2 Alert Triage Procedure

#### 3.2.1 Alert Reception & Prioritization

```
ALERT RECEIVED
      │
      ▼
┌─────────────────┐
│ INITIAL SCAN    │ ◄── Takes < 60 seconds
│ • Severity?     │
│ • Source?       │
│ • Auto-contained?│
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ CRITICAL/HIGH   │     │ MEDIUM/LOW      │
│ → Immediate     │     │ → Queue for     │
│   attention     │     │   processing    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ QUICK ENRICH    │     │ BATCH PROCESS   │
│ • Asset owner?  │     │ • Group similar │
│ • User context? │     │ • Deduplicate   │
• Intel match?    │     │ • Bulk close FP │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
             ┌─────────────────┐
             │ DECISION POINT  │
             │                 │
             │ True Positive?  │
             │ Known False +? │
             │ Needs Invest.?  │
             └────────┬────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │INVESTIG-│ │  CLOSE  │ │ESCALATE │
    │  GATE   │ │ (with   │ │ TO TIER2 │
    │         │ │ reason) │ │         │
    └─────────┘ └─────────┘ └─────────┘
```

#### 3.2.2 Triage Time Objectives

| Alert Severity | Initial Assessment | Full Triage | Target Total |
|---------------|-------------------|-------------|--------------|
| **Critical** | < 2 minutes | < 10 minutes | < 15 minutes |
| **High** | < 5 minutes | < 20 minutes | < 30 minutes |
| **Medium** | < 15 minutes | < 45 minutes | < 60 minutes |
| **Low** | < 30 minutes | < 2 hours | < 4 hours |

#### 3.2.3 Triage Checklist

```markdown
## Alert Triage Checklist

### Basic Information
- [ ] Alert ID recorded
- [ ] Timestamp noted
- [ ] Severity confirmed
- [ ] Source tool identified

### Context Gathering
- [ ] Affected asset(s) identified
- [ ] User/account involved (if applicable)
- [ ] Business unit/ministry determined
- [ ] Asset criticality verified

### Enrichment
- [ ] Threat intelligence lookup completed
- [ ] Related alerts searched
- [ ] Historical activity reviewed
- [ ] Asset vulnerability check (if relevant)

### Preliminary Assessment
- [ ] Initial classification (TP/FP/Needs Analysis)
- [ ] If TP: Severity validation
- [ ] If FP: Reason documented for tuning
- [ ] MITRE ATT&CK technique identified (if attack)

### Action Taken
- [ ] Containment action (if automated/approved)
- [ ] Incident created (if warranted)
- [ ] Escalation initiated (if needed)
- [ ] Stakeholder notification (if required)

### Documentation
- [ ] Notes added to alert/incident
- [ ] Actions taken logged
- [ ] Next steps defined
- [ ] Assignee updated
```

---

## 4. Incident Management Procedures

### 4.1 Incident Classification

#### Severity Levels

| Level | Name | Definition | Example | Response SLA |
|-------|------|------------|---------|--------------|
| **SEV-0** | Critical | Active breach, data exfiltration, ransomware execution | Ransomware encrypting servers, APT confirmed access | Immediate - IR Commander notified |
| **SEV-1** | High | Significant compromise indicator, targeted attack | Credential theft, lateral movement, phishing success on exec | < 15 min initial response |
| **SEV-2** | Medium | Security event requiring investigation | Malware detection, policy violation, suspicious activity | < 1 hour initial response |
| **SEV-3** | Low | Minor security event, informational | Port scan, failed phishing, minor policy issue | < 4 hours initial response |
| **SEV-4** | Informational | No immediate security impact | Intelligence item, general awareness | Next business day |

#### Incident Categories

| Category | Subcategories | Examples |
|----------|--------------|---------|
| **Malware** | Ransomware, Spyware, Trojan, Worm, Fileless | Emotet, LockBit, Cobalt Strike beacon |
| **Phishing** | Credential Harvesting, BEC, Malware Delivery, Vishing | CEO fraud email, fake O365 page |
| **Unauthorized Access** | Compromised Account, Privilege Escalation, Lateral Movement | Pass-the-hash, golden ticket |
| **Data Breach** | Exfiltration, Exposure, Leak | S3 bucket open, data posted online |
| **Denial of Service** | Volumetric, Application Layer, Protocol | DDoS against web server |
| **Insider** | Malicious, Negligent, Compromised | Data theft by departing employee |
| **Supply Chain** | Compromised Software, Vendor Breach | SolarWinds-type attack |
| **Physical** | Theft, Tampering, Unauthorized Access | Server room intrusion |

### 4.2 Incident Lifecycle

```
DETECTION → TRIAGE → CONTAINMENT → ERADICATION → RECOVERY → LESSONS LEARNED
    │          │          │            │           │              │
    ▼          ▼          ▼            ▼           ▼              ▼
  [Alert]   [Assess]   [Isolate]    [Remove]   [Restore]      [Report]
  Received  Severity   Damage      Root Cause  Systems        Improve
            Confirmed  Limited      Eliminated  Normal Ops     Process
```

### 4.3 Incident Response Procedures

#### SEV-0 (Critical) Response Protocol

```yaml
critical_incident_protocol:
  activation_trigger:
    - "Confirmed ransomware execution"
    - "Evidence of active data exfiltration"
    - "Nation-state actor confirmed in network"
    - "Critical infrastructure compromise"
    
  immediate_actions_0_5min:
    - "IR Commander notification (phone + PagerDuty)"
    - "CISO notification (automatic escalation)"
    - "Incident declaration in SOAR"
    - "Initial containment (if safe to do so)"
    
  actions_5_15min:
    - "IR Team assembly (virtual or physical war room)"
    - "Stakeholder identification and notification"
    - "Evidence preservation initiated"
    - "Communication channel setup (#incident-critical)"
    
  actions_15_60min:
    - "Full scope assessment"
    - "Containment strategy execution"
    - "Legal/Law enforcement liaison (if needed)"
    - "Executive briefing preparation"
    
  ongoing:
    - "Hourly status updates to leadership"
    - "Continuous scope refinement"
    - "Coordination with affected parties"
    - "Documentation maintenance
    
  closure_criteria:
    - "Eradication verified"
    - "Recovery complete"
    - "Post-mortem scheduled"
    - "Improvement items identified"
```

---

## 5. Communication Procedures

### 5.1 Internal Communication Channels

| Channel | Purpose | Response Expectation | Examples |
|---------|---------|---------------------|---------|
| **#soc-alerts** | Real-time alert discussion | < 5 min during shift | Alert questions, quick triage help |
| **#incidents-active** | Active incident coordination | Immediate for tagged | Incident updates, resource requests |
| **#intel-sharing** | Threat intelligence dissemination | As available | New IOCs, actor updates, campaign info |
| **#general** | General SOC discussions | < 2 hours | Questions, announcements, social |
| **@mention** | Direct urgent communication | Immediate | Escalations, approvals needed |

### 5.2 External Communication Protocols

#### Ministry Notification Matrix

| Situation | Notify Ministry | Method | Timeline | By Whom |
|-----------|-----------------|--------|----------|---------|
| SEV-0 incident affecting ministry | Yes | Phone + Email | Immediately | IR Commander |
| SEV-1 incident affecting ministry | Yes | Email + Portal | < 1 hour | Shift Lead |
| Scheduled maintenance impact | Yes | Email | 48 hours ahead | Ops Manager |
| Security advisory/threat warning | Yes | Portal | As published | Intel Team |
| Regular reporting | Yes | Dashboard | Per schedule | Auto |

### 5.3 Status Reporting Templates

#### Hourly Status Update (During Major Incidents)

```markdown
## INCIDENT STATUS UPDATE - [INC-ID]
**Time:** [HH:MM] | **Reporter:** [Name]
**Status:** [Active/Contained/Stable]

### Summary
[2-3 sentence current state]

### Key Developments Since Last Update
- [Development 1]
- [Development 2]

### Current Activities
- [Activity 1] - [Owner] - [ETA if known]
- [Activity 2] - [Owner] - [ETA if known]

### Blockers/Needs
- [Any blockers or support needed]

### Next Update
[Scheduled time or as-needed]
```

---

## 6. Tool Usage Guidelines

### 6.1 Primary Tools & Access Levels

| Tool | Tier 1 | Tier 2 | Tier 3 | Manager |
|------|--------|--------|--------|---------|
| **SIEM (Splunk)** | Read/Search | Read/Search/Edit | Full Admin | Full Admin |
| **SOAR (Phantom)** | Execute Playbooks | Create/Edit Playbooks | Admin + API | Full Admin |
| **EDR (CrowdStrike)** | View/Basic Response | Full Response | API Access | Full Admin |
| **TIP (MISP)** | View/Query | Edit/Create | Admin | Full Admin |
| **Ticketing (ServiceNow)** | Create/Update | Full Access | Admin | Full Admin |

### 6.2 Search Best Practices

#### SIEM Search Guidelines

```yaml
siem_search_guidelines:
  time_range_principles:
    default: "Last 24 hours"
    investigation: "Start broad, narrow down"
    reporting: "Exact period required"
    
  performance_considerations:
    avoid_wildcard_leading: "*term" # Very slow
    prefer_indexed_fields: "Use indexed fields first"
    limit_initial_search: "head 100 until refined"
    use_tstats: "For accelerated searches"
    
  documentation_requirements:
    save_meaningful_searches: "Yes - for reproducibility"
    note_search_purpose: "In comments"
    share_useful_queries: "Team knowledge base"
```

---

## 7. Quality Assurance

### 7.1 Quality Metrics

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| **Triage Accuracy** | Correct TP/FP classification | > 95% | Weekly sampling |
| **SLA Compliance** | Alerts handled within SLA | > 98% | Automated |
| **Documentation Quality** | Complete, accurate notes | > 90% score | Weekly audit |
| **Escalation Appropriateness** | Correct severity assignment | > 95% | Review process |
| **Playbook Adherence** | Following established procedures | > 90% | Sampling |

### 7.2 Feedback & Coaching

```yaml
quality_program:
  daily_feedback:
    method: "Shift lead real-time coaching"
    focus: "Immediate correction opportunities"
    tone: "Constructive, educational"
    
  weekly_review:
    method: "Team meeting - anonymized examples"
    focus: "Learning from interesting cases"
    duration: "30 minutes"
    
  monthly_quality_report:
    method: "Individual metrics review"
    content: "Accuracy, SLA, documentation scores"
    outcome: "Coaching plan if needed"
    
  recognition:
    top_performer: "Monthly acknowledgment"
    improvement: "Progress celebration"
    innovation: "Process improvement rewards"
```

---

## 8. Continuous Improvement

### 8.2 Procedure Update Process

```
Issue Identified → Change Request → Impact Assessment → Approval → 
Update Implementation → Training → Monitoring → Closure
```

### 8.3 Feedback Mechanisms

| Mechanism | Frequency | Owner | Output |
|-----------|-----------|-------|--------|
| Retrospective Meetings | Post major incident | IR Lead | Lessons Learned |
| Procedure Effectiveness Review | Quarterly | Ops Manager | Update Recommendations |
| Staff Suggestion Program | Continuous | Any Staff | Innovation Ideas |
| Metric Trend Analysis | Monthly | QA Analyst | Process Improvements |

---

*These Standard Operating Procedures are living documents that evolve with our capabilities and the threat landscape. Every SOC member is responsible for knowing and following these procedures, and for contributing to their continuous improvement.*
