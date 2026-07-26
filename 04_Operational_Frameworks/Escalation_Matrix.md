# Escalation Matrix & Procedures

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | SOC-OPS-ESC-001 |
| **Version** | 1.0 |
| **Classification** | Internal Use - SOC Personnel |

---

## 1. Escalation Philosophy

### 1.1 Principles
- **When in doubt, escalate** - It's better to over-communicate than miss something critical
- **Escalate with context** - Provide all relevant information, not just "help needed"
- **No blame culture** - Escalation is a tool for getting help, not admitting failure
- **Document everything** - All escalations must be logged and trackable

### 1.2 Escalation Triggers
Escalation should occur when:
- Severity exceeds current tier's authority level
- Required expertise is not available at current tier
- Stakeholder notification is required
- Cross-team coordination is needed
- Timeline is at risk of breach
- Uncertainty exists about appropriate action

---

## 2. Technical Escalation Matrix

### 2.1 Tier-Based Escalation Path

```
TIER 1 (Triage)
    │ Cannot resolve within SLA OR severity exceeds authority
    ▼
TIER 2 (Incident Response)
    │ Complex investigation required OR cross-functional needed
    ▼
TIER 3 (Senior IR / Threat Hunt)
    │ Strategic decisions OR major incident command
    ▼
IR MANAGER / SHIFT LEAD
    │ Resource decisions OR executive communication
    ▼
IR COMMANDER / SOC DIRECTOR
    │ Crisis management OR government-level coordination
    ▼
CISO / STEERING COMMITTEE
```

### 2.2 Authority Levels by Tier

| Decision Type | Tier 1 | Tier 2 | Tier 3 | Manager | Commander | CISO |
|--------------|--------|--------|--------|----------|-----------|------|
| Close alert as FP | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create incident (SEV3-4) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create incident (SEV2) | ⚠️ Consult | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create incident (SEV1) | ❌ Escalate | ⚠️ Consult | ✅ | ✅ | ✅ | ✅ |
| Create incident (SEV0) | ❌ Escalate | ❌ Escalate | ⚠️ Consult | ✅ | ✅ | ✅ |
| Contain endpoint (auto-playbook) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contain endpoint (manual decision) | ❌ Escalate | ✅ | ✅ | ✅ | ✅ | ✅ |
| Block IP at perimeter | ❌ Escalate | ⚠️ Pre-approved | ✅ | ✅ | ✅ | ✅ |
| Notify ministry/agency | ❌ Escalate | ❌ Escalate | ⚠️ Consult | ✅ | ✅ | ✅ |
| Engage law enforcement | ❌ Escalate | ❌ Escalate | ❌ Escalate | ⚠️ Consult | ✅ | ✅ |
| Media/external comms | ❌ Escalate | ❌ Escalate | ❌ Escalate | ❌ Escalate | ⚠️ Consult | ✅ |
| Declare major incident | ❌ Escalate | ❌ Escalate | ❌ Escalate | ⚠️ Consult | ✅ | ✅ |

---

## 3. Management Escalation Matrix

### 3.1 Severity-Based Notification Requirements

| Incident Severity | IR Manager | IR Commander | SOC Director | CISO | Ministry Contact |
|-------------------|:----------:|:------------:|:------------:|:----:|:----------------:|
| **SEV-4 (Low)** | Inform (Daily digest) | - | - | - | - |
| **SEV-3 (Medium)** | Immediate | Inform (Summary) | - | - | - |
| **SEV-2 (High)** | Immediate | Within 30 min | Inform (Hourly) | - | If affected |
| **SEV-1 (Critical)** | Immediate | Immediate | Immediate | Within 30 min | Within 1 hour |
| **SEV-0 (Catastrophic)** | Immediate | Immediate | Immediate | Immediate | Immediate |

### 3.2 Time-Based Escalation (Automatic)

If no progress or acknowledgment within specified timeframes:

| Incident Severity | First Escalation | Second Escalation | Executive Escalation |
|-------------------|------------------|------------------|---------------------|
| **SEV-0** | +15 min to Commander | +30 min to CISO | +60 min to Ministry |
| **SEV-1** | +30 min to Commander | +1 hour to Director | +2 hours to CISO |
| **SEV-2** | +1 hour to Manager | +2 hours to Commander | +4 hours to Director |
| **SEV-3** | +4 hours to Manager | +8 hours to Director | Next business day |

---

## 4. Functional Escalation Contacts

### 4.1 Internal Escalation Contacts

#### Security Operations

| Role | Primary | Backup | Contact Method | Availability |
|------|---------|--------|----------------|--------------|
| Shift Lead (Day) | [Name] | [Name] | Slack @mention / Phone | 07:00-19:00 |
| Shift Lead (Night) | [Name] | [Name] | Slack @mention / Phone | 19:00-07:00 |
| Operations Manager | [Name] | [Name] | Slack + Phone | Business + On-call |
| IR Manager | [Name] | [Name] | PagerDuty + Phone | 24/7 On-call |

#### Incident Response

| Role | Primary | Backup | Contact Method | Availability |
|------|---------|--------|----------------|--------------|
| IR Team Lead (Alpha) | [Name] | [Name] | Slack + Phone | 24/7 Rotation |
| IR Team Lead (Beta) | [Name] | [Name] | Slack + Phone | 24/7 Rotation |
| Senior IR Analyst | [Name] | [Name] | Slack + Phone | Business Hours |
| IR Commander | [Name] | [Name] | PagerDuty + Phone | 24/7 On-call |

#### Threat Intelligence

| Role | Primary | Backup | Contact Method | Availability |
|------|---------|--------|----------------|--------------|
| Intel Lead | [Name] | [Name] | Slack + Email | Business Hours |
| Intel Analyst (On-call) | Rotating | - | Slack + Phone | 24/7 |

### 4.2 External Escalation Contacts

#### IT & Infrastructure

| Function | Team | Contact | When to Escalate |
|----------|------|---------|------------------|
| Network Operations | NOC | noc@gov.dz / #noc-slack | Network containment, PCAP requests |
| System Administration | SysAdmin | sysadmin@gov.dz | Server access, reimaging, patches |
| Database Administration | DBA | dba@gov.dz | Database queries, log access |
| Identity Management | IAM | iam@gov.dz | Account actions, access reviews |
| Email Services | Exchange Team | exchange@gov.dz | Mail rules, transport logs |
| Cloud Services | Cloud Ops | cloudops@gov.dz | Cloud instance access, API issues |

#### Legal & Compliance

| Function | Contact | When to Escalate |
|----------|---------|------------------|
| Legal Counsel | legal@gov.dz | Law enforcement involvement, evidence preservation, litigation hold |
| Data Protection Officer | dpo@gov.dz | Personal data breach, GDPR implications |
| Compliance Officer | compliance@gov.dz | Regulatory reporting requirements |
| Physical Security | security@gov.dz | Physical incidents, personnel safety |

#### Executive Leadership

| Position | Office | Mobile | When to Escalate |
|----------|--------|--------|------------------|
| CISO | [Ext] | [Number] | SEV-1+, strategic decisions, board notification |
| CIO | [Ext] | [Number] | Major IT impact, resource conflicts |
| Minister Liaison | [Ext] | [Number] | Ministry-level communication only |

---

## 5. Escalation Procedures

### 5.1 Standard Escalation Procedure

```yaml
escalation_procedure:
  preparation:
    gather_information:
      - "Incident ID and summary"
      - "Current status and timeline"
      - "Actions already taken"
      - "Specific ask or decision needed"
      - "Impact if no response"
      
  communication:
    method_priority:
      1: "Phone call (for urgent)"
      2: "Slack/Direct message with @mention"
      3: "Email (with high priority flag)"
      4: "PagerDuty trigger (for on-call)"
      
    message_template: |
      ESCALATION: [Severity] [Incident ID]
      
      What: [Brief description of issue]
      Impact: [What's affected, business impact]
      Status: [Current state]
      Need: [Specifically what you need from them]
      Timeline: [Why now, what happens if delayed]
      Context: [Relevant background info]
      
      Please acknowledge within [timeframe].
      Contact me at: [Your contact info]
      
  documentation:
    required:
      - "Log escalation in incident record"
      - "Note time and method of escalation"
      - "Record response/acknowledgment"
      - "Track outcome and next steps"
```

### 5.2 Emergency Escalation Procedure

```yaml
emergency_escalation:
  triggers:
    - "Active data exfiltration confirmed"
    - "Ransomware spreading across network"
    - "Nation-state activity confirmed"
    - "Critical infrastructure impact"
    - "Safety/life risk indicated"
    
  procedure:
    step_1_immediate:
      action: "Phone call (not message)"
      sequence: "IR Commander → CISO → Executive Sponsor"
      timeout: "If no answer in 5 minutes, try next in chain + backup"
      
    step_2_mobilize:
      action: "Activate war room"
      participants: "All available IR staff + key stakeholders"
      location: "Physical SOC or virtual bridge line"
      
    step_3_communicate:
      action: "Executive flash briefing"
      content: "Situation, impact, actions underway, immediate needs"
      format: "Verbal + written follow-up within 15 minutes"
      
    step_4_document:
      action: "Continuous logging"
      recorder: "Designated scribe (not commander)"
      output: "Decision log, action log, timeline"
```

### 5.3 After-Hours Escalation

```yaml
after_hours_protocol:
  coverage_model: "Rotating on-call with automatic escalation"
  
  on_call_structure:
    primary: "Shift Lead on duty"
    secondary: "IR Manager on-call"
    tertiary: "IR Commander on-call"
    executive: "CISO (emergency only)"
    
  escalation_timer:
    start: "Time of initial escalation message"
    auto_escalate: "If no response in:"
      tier_1_to_2: "15 minutes"
      tier_2_to_3: "15 minutes"
      tier_3_to_commander: "15 minutes"
      commander_to_ciso: "Immediate (bypass timer for SEV-0/1)"
    
  handoff_requirement:
    condition: "If incident still active at shift change"
    action: "Verbal handoff to incoming on-call + update ticket"
```

---

## 6. De-escalation Procedures

### 6.1 Returning Control to Lower Tier

Conditions for de-escalation:
- Issue resolved or contained
- Routine monitoring required
- Investigation complete, only cleanup remains
- Lower tier has capacity and capability

Process:
1. Document current status and remaining actions
2. Brief receiving team/analyst
3. Transfer ticket ownership formally
4. Remain available for questions (30 min window)
5. Update incident with de-escalation note

### 6.2 Incident Closure Authority

| Severity | Who Can Close | Review Required |
|----------|--------------|-----------------|
| SEV-4 | Tier 1+ | Self-review |
| SEV-3 | Tier 2+ | Peer review |
| SEV-2 | Tier 3+ | Manager review |
| SEV-1 | IR Manager | Commander sign-off |
| SEV-0 | IR Commander | CISO + Steering Committee |

---

*This escalation matrix ensures that the right people are involved at the right time, enabling rapid and effective incident response.*
