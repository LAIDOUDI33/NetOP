# Incident Response Playbooks Collection

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | SOC-OPS-PB-001 |
| **Version** | 1.0 |
| **Classification** | Internal Use - SOC Personnel |
| **Total Playbooks** | 12 Core Playbooks |

---

## Playbook Index

| ID | Name | Category | Severity Focus | Automation Level |
|----|------|----------|----------------|------------------|
| PB-001 | Ransomware Response | Malware | Critical | Semi-Auto |
| PB-002 | Phishing Investigation | Social Engineering | High | Semi-Auto |
| PB-003 | Compromised Account | Unauthorized Access | High | Semi-Auto |
| PB-004 | Data Exfiltration | Data Breach | Critical | Human Approval |
| PB-005 | DDoS Mitigation | Denial of Service | High | Fully Auto |
| PB-006 | Malware Outbreak | Malware | Critical | Semi-Auto |
| PB-007 | Insider Threat Investigation | Insider Threat | Medium | Human Approval |
| PB-008 | Web Application Attack | Application Security | Medium | Semi-Auto |
| PB-009 | Supply Chain Incident | Supply Chain | Critical | Human Approval |
| PB-010 | Lateral Movement Detection | Unauthorized Access | High | Semi-Auto |
| PB-011 | Zero-Day Vulnerability Response | Vulnerability | Critical | Human Approval |
| PB-012 | Physical Security Incident | Physical | Medium | Manual |

---

# PB-001: Ransomware Response Playbook

## Overview
**Objective:** Rapid containment and recovery from ransomware attacks affecting government systems.

## Trigger Conditions
- EDR detects ransomware behavior (mass encryption, ransom note)
- SIEM correlation rule triggers ransomware pattern
- User reports ransomware note or encrypted files
- SOAR playbook auto-triggered from detection

## Severity Assignment
- **Default:** SEV-0 (Critical)
- **Upgrade if:** Multiple systems affected, critical infrastructure, data exfiltration evidence
- **Downgrade if:** Single workstation, no spread, quick containment

## Response Procedure

### Phase 1: Immediate Response (0-15 minutes)

```yaml
phase_1_immediate:
  timeline: "0-15 minutes"
  objective: "Stop the bleeding"
  
  step_1_isolate:
    action: "Network isolation of affected host(s)"
    method: "EDR network contain OR network switch port disable"
    decision: "Auto-contain if high-confidence; manual if uncertain"
    documentation: "Record exact time of containment"
    
  step_2_preserve_evidence:
    action: "Memory acquisition before anything else"
    tool: "EDR memory capture OR Volatility if Linux"
    priority: "CRITICAL - volatile evidence lost on reboot"
    notes: "Even if planning to reimage, capture memory first"
    
  step_3_alert_stakeholders:
    notifications:
      - target: "IR Commander"
        method: "Phone + PagerDuty + Slack"
        message: "Ransomware declared - [Hostnames] - [Time]"
        
      - target: "CISO"
        method: "Email + Phone (via IR Commander)"
        timing: "Within 15 minutes of confirmation"
        
      - target: "Affected System Owner"
        method: "Email + Phone"
        message: "System isolated due to security incident - await instructions"
        
  step_4_declare_incident:
    action: "Create formal incident record"
    platform: "SOAR Case Management"
    fields:
      title: "RANSOMWARE: [Brief description]"
      severity: "SEV-0"
      category: "Malware > Ransomware"
      affected_assets: "[List isolated hosts]"
```

### Phase 2: Assessment (15-60 minutes)

```yaml
phase_2_assessment:
  timeline: "15-60 minutes"
  objective: "Understand scope and nature"
  
  step_1_identify_ransomware_variant:
    actions:
      - "Collect ransom note filename and content"
      - "Check file extension pattern of encrypted files"
      - "Submit sample to sandbox (if safe)"
      - "Search threat intel for matching signatures"
      - "Check ID Ransomware (id-ransomware.malwarehunterteam.com)"
      
    key_questions:
      - "Which ransomware family?"
      - "Is there a known decryptor available?"
      - "What is typical payment demand?"
      - "Does it include data theft (double extortion)?"
      
  step_2_determine_scope:
    assessment_areas:
      network_scope:
        - "How many hosts show signs of infection?"
        - "Any lateral movement indicators?"
        - "Was domain admin compromised?"
        
      data_scope:
        - "What data types were targeted?"
        - "Any evidence of exfiltration before encryption?"
        - "Backup systems affected?"
        
      timeline_scope:
        - "When did infection start (earliest artifact)?"
        - "How long active before detection?"
        - "Patient zero identification?"
        
  step_3_backup_assessment:
    questions:
      - "Are backups available for affected systems?"
      - "Are backups offline/immutable (not encrypted)?"
      - "What is backup RTO/RPO for critical systems?"
      - "When was last successful backup?"
      
  step_4_communications_prep:
    draft_messages:
      executive_briefing: "2-page summary for C-suite"
      internal_notification: "Template for affected staff"
      external_template: "If public disclosure needed (legal review)"
```

### Phase 3: Containment & Eradication (1-4 hours)

```yaml
phase_3_containment:
  timeline: "1-4 hours (varies by scope)"
  objective: "Stop spread and remove threat"
  
  step_1_extended_containment:
    actions:
      - "Block C2 domains/IPs at perimeter"
      - "Disable compromised accounts"
      - "Segment network if widespread"
      - "Suspend automated replication to prevent spread"
      
  step_2_threat_removal:
    options_by_scenario:
      reimaging_required:
        condition: "Most cases"
        process: "Secure wipe + clean image restore"
        verification: "EDR scan + spot checks
        
      cleaning_possible:
        condition: "Limited infection, critical system can't rebuild"
        process: "Specialized removal tools + manual review"
        approval: "Requires IR Lead + System Owner
        
      negotiation_considered:
        condition: "No backups, critical data, last resort"
        process: "Legal + Executive + Law enforcement involvement"
        approval: "Presidential/Cabinet level for government"
        
  step_3 credential_reset:
    scope: "All credentials on/from affected systems"
    actions:
      - "Force password reset for all local accounts"
      - "Reset service accounts"
      - "Revoke and reissue certificates"
      - "Reset API keys and tokens"
      - "Kerberos ticket reset (if domain joined)"
```

### Phase 4: Recovery (4-48+ hours)

```yaml
phase_4_recovery:
  timeline: "4-48+ hours depending on scope"
  objective: "Restore operations securely"
  
  step_1_priority_recovery:
    order:
      1: "Critical services (safety, security, essential operations)"
      2: "High-visibility services (public-facing)"
      3: "Business-essential functions"
      4: "Remaining systems"
      
  step_2_restore_from_backup:
    verification:
      - "Scan backup for indicators before restore"
      - "Verify backup integrity (checksums)"
      - "Test restored system in isolated environment first"
      
  step_3_enhanced_monitoring:
    duration: "Minimum 7 days post-recovery"
    actions:
      - "Increased logging on recovered systems"
      - "EDR enhanced monitoring mode"
      - "Frequent analyst review of telemetry"
      - "Hunt for persistence mechanisms"
      
  step_4_return_to_normal:
    criteria:
      - "All systems cleaned/recovered"
      - "No signs of continued infection"
      - "Enhanced monitoring period complete"
      - "Root cause addressed"
      - "Security controls verified"
```

### Phase 5: Post-Incident (After Recovery)

```yaml
phase_5_post_incident:
  timeline: "1-4 weeks after resolution"
  objective: "Learn and improve"
  
  deliverables:
    lessons_learned_report:
      sections:
        - "Executive summary"
        - "Timeline of events"
        - "What worked well"
        - "What could be improved"
        - "Root cause analysis"
        - "Recommendations (with owners and deadlines)"
        
    improvement_items:
      tracking: "Project tracker with accountability"
      categories:
        - "Technical controls"
        - "Process improvements"
        - "Training needs"
        - "Tool configuration"
        
    playbooks_update:
      trigger: "If new techniques or gaps discovered"
      action: "Update this playbook within 2 weeks"
```

## Key Contacts (Ransomware)

| Role | Name (Example) | Contact | Availability |
|------|----------------|---------|--------------|
| IR Commander | [Name] | [Phone] | 24/7 |
| Digital Forensics Lead | [Name] | [Phone] | Business hours + on-call |
| Legal Counsel | [Name] | [Email] | Business hours + emergency |
| Communications | [Name] | [Email/Phone] | Business hours + on-call |
| Law Enforcement Liaison | [Name] | [Secure Channel] | As needed |

## Decision Tree Summary

```
Ransomware Detected?
       │
       ├── Can auto-contain? ──YES──▶ Isolate + Preserve Evidence
       │                              │
       │                              ├── Single host?
       │                              │    └── YES → Local recovery
       │                              │    └── NO  → Scope assessment
       │                              │
       │                              ├── Backups available?
       │                              │    └── YES → Restore + Monitor
       │                              │    └── NO  → Recovery options eval
       │                              │
       │                              └── Data exfiltrated?
       │                                   └── YES → Breach protocol also
       │
       └── Uncertain? ──────────────▶ Manual investigation first
                                      │
                                      └── Then proceed as above
```

---

# PB-002: Phishing Investigation Playbook

## Overview
**Objective:** Systematic investigation and response to reported or detected phishing attempts targeting government users.

## Trigger Conditions
- User reports suspicious email via report button
- Email gateway blocks/detects phishing email
- SIEM alert from email security tool
- Credential harvesting alert (user clicked link)
- Multiple similar reports (campaign indicator)

## Response Procedure

### Phase 1: Initial Triage (0-10 minutes)

```yaml
phasing_triage:
  step_1_receive_report:
    collection_methods:
      - "User-reported (button/forward)"
      - "Gateway-blocked (automated)"
      - "Credential alert (clicked)"
      - "Campaign detection (multiple reports)"
      
  step_2_quick_assessment:
    questions:
      - "How many recipients affected?"
      - "Anyone click links or enter credentials?"
      - "Internal or external sender?"
      - "Targeted (spear) or mass campaign?"
      
  step_3_severity_assignment:
    matrix:
      clicked_credentials_executive: "SEV-1 (High)"
      clicked_credentials_staff: "SEV-2 (Medium)"
      delivered_not_clicked: "SEV-2 (Medium)"
      blocked_by_gateway: "SEV-3 (Low)"
      campaign_indicated: "Upgrade one level"
```

### Phase 2: Investigation (10-60 minutes)

```yaml
investigation_phase:
  artifact_collection:
    email_headers:
      collect: "Full headers including received chain"
      analyze: "SPF/DKIM/DMARC results, originating IP, hop path"
      
    email_body:
      collect: "HTML source, text version, embedded links"
      analyze: "Link destinations, tracking pixels, attachments"
      
    attachments:
      collect: "All attachments (if present)"
      analyze: "Sandbox execution, hash lookup, static analysis"
      
    landing_page:
      collect: "Screenshot, HTML source (if accessible)"
      analyze: "Credential form targets, hosting infrastructure"
      
  enrichment_checks:
    parallel_investigations:
      - "URL reputation (VT, URLhaus, etc.)"
      - "Domain registration (WHOIS, age)"
      - "IP geolocation and reputation"
      - "Sender address analysis"
      - "Similar campaign search (past incidents)"
      - "Threat actor attribution (if possible)"
```

### Phase 3: Response Actions (Varies)

```yaml
response_actions:
  user_action_taken:
    clicked_link_only:
      actions: "Password reset advisory, monitoring, education moment"
      
    entered_credentials:
      actions: "Immediate password reset, session termination, account review"
      
    downloaded_attachment:
      actions: "EDR scan workstation, potential containment"
      
  organizational_actions:
    block_indicators:
      - "Add URLs to blocklist"
      - "Add domains to blocklist"
      - "Add sender to blocklist"
      - "Add attachment hashes to blocklist"
      
    mass_actions:
      condition: "Multiple recipients / campaign"
      actions:
        - "Delete emails from all mailboxes (if delivered)"
        - "Notify all recipients (template)"
        - "Add rules to prevent variants"
        
  notification:
    reporter_thank_you: "Always acknowledge reporter (encourages future reporting)"
    affected_users: "If credentials entered, individual notification"
    organization: "If campaign, security bulletin"
```

---

# PB-003: Compromised Account Playbook

## Overview
**Objective:** Rapid response to indicators of compromised user accounts, including credential theft, unauthorized access, and account takeover.

## Trigger Conditions
- Impossible travel alert (simultaneous logins from distant locations)
- Brute force success after failures
- Authentication from Tor/VPN/proxy when unusual
- User reports suspicious activity on account
- Alert from UEBA (anomalous behavior)
- Credentials found in dump matched to user

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│           COMPROMISED ACCOUNT - QUICK RESPONSE              │
├─────────────────────────────────────────────────────────────┤
│ 1. DISABLE ACCOUNT (or force password reset + MFA)          │
│ 2. REVIEW RECENT SESSIONS (terminate suspicious)            │
│ 3. CHECK MAIL FORWARDING/RULES                             │
│ 4. REVIEW SENT ITEMS (data exfil?)                         │
│ 5. CHECK ACCESS TO SENSITIVE SYSTEMS                       │
│ 6. ESCALATE IF ADMIN/PRIVILEGED OR DATA ACCESSED           │
│ 7. DOCUMENT ALL FINDINGS AND ACTIONS                       │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Procedure

### Immediate Actions (First 5 Minutes)

```yaml
immediate_actions:
  account_lockdown:
    options:
      option_1_disable: "Disable account (most secure, user impact)"
      option_2_password_reset: "Force password reset + MFA prompt (faster recovery)"
      option_3_session_terminate: "Kill all sessions, keep account (monitoring)"
      
    selection_criteria:
      evidence_strength_high: "Option 1 (disable)"
      privileged_account: "Option 1 (disable)"
      standard_account_moderate: "Option 2 (reset)"
      monitoring_situation: "Option 3 (watch)"
      
  session_termination:
    actions:
      - "Terminate all active OAuth tokens"
      - "Kill all application sessions"
      - "Revoke refresh tokens"
      - "Note: User will need to re-authenticate everywhere"
```

### Investigation (5-60 Minutes)

```yaml
investigation_timeline:
  access_review:
    timeframe: "Minimum 7 days, extend if suspicious"
    data_points:
      - "Login times and locations (geoIP)"
      - "VPN connections (source IP, duration)"
      - "MFA prompts (success/failure)"
      - "Resource accesses (what was viewed/downloaded)"
      - "Email sent (rules created, forwarding set up)"
      - "File accesses (especially bulk/mass)"
      
  privilege_review:
    checks:
      - "Group memberships (any new additions?)"
      - "Local admin rights (on which machines?)"
      - "Application roles (any privilege escalation?)"
      - "API keys/tokens (any created?)"
      - "Service account access (using compromised creds?)"
      
  data_exposure_check:
    focus_areas:
      - "Email sent externally (especially bulk)"
      - "Cloud storage uploads/downloads"
      - "Database queries (especially large results)"
      - "File share accesses (especially sensitive folders)"
      - "Print jobs (documents printed remotely)"
```

### Recovery Actions

```yaml
recovery_process:
  credential_reset:
    scope: "Not just password - full credential refresh"
    items:
      - "Password (new, strong, not used before)"
      - "MFA re-enrollment (verify identity first!)"
      - "API keys rotation"
      - "Personal access tokens revocation"
      - "SSH keys (if applicable)"
      
  access_cleanup:
    items:
      - "Remove any unauthorized group additions"
      - "Delete any forwarding rules created"
      - "Revoke application consents granted during compromise"
      - "Review and remove suspicious API permissions"
      
  monitoring_post_recovery:
    duration: "14 days minimum"
    enhanced_logging: "All access, all authentication"
    alerting: "Any anomaly triggers immediate review"
```

---

*Additional playbooks (PB-004 through PB-012) follow similar detailed structures and are maintained in the operational documentation system.*
