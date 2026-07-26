# Shift Handover Procedures

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | SOC-OPS-SHIFT-001 |
| **Version** | 1.0 |
| **Classification** | Internal Use - SOC Personnel |

---

## 1. Purpose & Importance

### 1.1 Why Handover Matters
Effective shift handover is **critical to SOC operations** because:
- Incidents don't follow shift schedules
- Context lost = repeated work = delayed response
- Safety-critical decisions may be pending
- Stakeholders expect continuity regardless of shift changes

### 1.2 Handover Goals
- **Zero information loss** between shifts
- **Clear ownership transfer** for all active items
- **Context preservation** for ongoing investigations
- **Issue escalation** of anything blocking resolution
- **Team alignment** on priorities and focus areas

---

## 2. Shift Structure

### 2.1 Shift Schedule

| Shift | Hours (Local) | Coverage | Typical Staffing |
|-------|---------------|----------|------------------|
| **Day Shift (A)** | 07:00 - 19:00 | 12 hours | 8-10 analysts + Shift Lead |
| **Night Shift (B)** | 19:00 - 07:00 | 12 hours | 4-6 analysts + Shift Lead |
| **Weekend** | 24 hours | Reduced | 4-6 analysts total |

### 2.2 Overlap Periods

| Transition | Overlap Duration | Purpose |
|------------|------------------|---------|
| Day → Night | 18:00 - 20:00 (2 hours) | Full handover meeting + overlap coverage |
| Night → Day | 06:00 - 08:00 (2 hours) | Full handover meeting + overlap coverage |
| Day → Day (weekend) | Friday 16:00 - 18:00 | Extended weekend prep handover |

---

## 3. Handover Meeting Format

### 3.1 Standard Agenda (15-20 Minutes)

```yaml
handover_meeting_agenda:
  duration: "15-20 minutes"
  participants: 
    required: ["Outgoing Shift Lead", "Incoming Shift Lead"]
    optional: ["Overlapping analysts", "On-call manager"]
    
  agenda_items:
    1:
      title: "Active Incidents Review"
      duration: "5-7 minutes"
      format: "Go through each open/incident by severity"
      details_per_incident:
        - "ID and brief description"
        - "Current status"
        - "Actions taken this shift"
        - "Pending items / blockers"
        - "Next steps / recommendations"
        - "Ownership assignment"
        
    2:
      title: "Alert Queue Status"
      duration: "2-3 minutes"
      details:
        - "Queue depth (total and by severity)"
        - "Any alerts needing immediate attention"
        - "Backlog situation"
        
    3:
      title: "System Health & Tooling"
      duration: "2-3 minutes"
      details:
        - "Any degraded or down systems"
        - "Known issues affecting operations"
        - "Maintenance windows scheduled"
        
    4:
      title: "Intelligence Highlights"
      duration: "2-3 minutes"
      details:
        - "New threats or campaigns"
        - "IOC updates pushed"
        - "Relevant external news"
        
    5:
      title: "Staffing & Special Items"
      duration: "2-3 minutes"
      details:
        - "Anyone leaving early / arriving late"
        - "Special assignments or projects"
        - "Training or meetings scheduled"
        - "Administrative items"
        
    6:
      title: "Questions & Open Discussion"
      duration: "2 minutes"
      format: "Q&A from incoming team"
```

### 3.2 Meeting Facilitation

**Outgoing Shift Lead Responsibilities:**
- Prepare handover document BEFORE meeting
- Lead the discussion through agenda
- Answer questions fully and honestly
- Don't minimize issues - full transparency
- Stay until incoming lead is comfortable

**Incoming Shift Lead Responsibilities:**
- Arrive prepared (reviewed queue before meeting)
- Ask clarifying questions
- Take notes on action items
- Accept ownership explicitly for each item
- Speak up if overwhelmed or unclear

---

## 4. Handover Documentation

### 4.1 Shift Handover Report Template

```markdown
# SHIFT HANDOVER REPORT

## Metadata
- **Date:** [YYYY-MM-DD]
- **Outgoing Shift:** [A/B] ([Lead Name])
- **Incoming Shift:** [A/B] ([Lead Name])
- **Handover Time:** [HH:MM] - [HH:MM]
- **Meeting Location/Virtual Room:** [Location/Link]

---

## 1. ACTIVE INCIDENTS SUMMARY

### SEV-0 / SEV-1 Incidents
| ID | Title | Status | Owner This Shift | Owner Next Shift | Key Action Needed |
|----|-------|--------|------------------|------------------|-------------------|
| INC-xxx | ... | ... | ... | ... | ... |

### SEV-2 Incidents
[Same format as above]

### SEV-3 / SEV-4 Incidents
[Brief summary only unless specific action needed]

---

## 2. ALERT QUEUE SNAPSHOT

**Queue Depth at Handover:** [X] alerts
**Breakdown:** Critical: [X] | High: [X] | Medium: [X] | Low: [X]

**Items Requiring Immediate Attention:**
- [Alert ID] - [Reason for urgency]

**Notable Patterns Observed:**
- [Any trends, spikes, unusual patterns]

---

## 3. SYSTEM STATUS

| System | Status | Issues | Notes |
|--------|--------|--------|-------|
| SIEM | 🟢/🟡/🔴 | [None/Description] | [Details] |
| SOAR | 🟢/🟡/🔴 | [None/Description] | [Details] |
| EDR | 🟢/🟡/🔴 | [None/Description] | [Details] |
| TIP | 🟢/🟡/🔴 | [None/Description] | [Details] |
| Ticketing | 🟢/🟡/🔴 | [None/Description] | [Details] |

---

## 4. INTELLIGENCE HIGHLIGHTS

### New Threats/Campaigns
- [Description and relevance]

### IOCs Pushed This Shift
- Count: [X] new IOCs
- Notable additions: [List significant ones]

### External Developments
- [News, advisories, geopolitical factors]

---

## 5. STAFFING NOTES

### Outgoing Shift
- Present: [Names]
- Absent: [Names + Reason]
- Early Departures: [Names + Time + Reason]

### Incoming Shift
- Expected: [Names]
- Known Absences: [Names + Reason]
- Late Arrivals: [Names + Expected Time]

### Special Assignments
- [Person]: [Assignment] - [Status/Notes]

---

## 6. OPEN ITEMS & ACTION LIST

| # | Item | Priority | Owner | Due | Status |
|---|------|----------|-------|-----|--------|
| 1 | [Description] | P1/P2/P3 | [Name] | [Time] | [Status] |

---

## 7. NOTES & COMMENTS

[Free text for additional context, concerns, praise, etc.]

---

## ACKNOWLEDGMENT

**Outgoing Lead Signature:** _________________ **Time:** _______
**Incoming Lead Signature:** _________________ **Time:** _______

*By signing, outgoing confirms completeness of information; incoming confirms understanding and acceptance of ownership.*
```

### 4.2 Quick Reference Card (Verbal Handover)

For situations where full documentation isn't possible:

```
┌─────────────────────────────────────────────────────────────┐
│                  QUICK HANDOVER CARD                         │
├─────────────────────────────────────────────────────────────┤
│ Date/Shift: ________  Outgoing: ________  Incoming: ______│
│                                                             │
│ 🔴 CRITICAL (Drop everything):                              │
│ 1.                                                           │
│ 2.                                                           │
│                                                             │
│ 🟠 HIGH (Watch closely):                                    │
│ 1.                                                           │
│ 2.                                                           │
│                                                             │
│ 🟡 SYSTEMS (Known issues):                                  │
│ •                                                            │
│                                                             │
│ 👥 STAFFING (Who's where):                                  │
│ •                                                            │
│                                                             │
│ 📝 OTHER (Anything else):                                   │
│ •                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Special Handover Scenarios

### 5.1 Major Incident in Progress

When a SEV-0/SEV-1 incident is active during shift change:

```yaml
major_incident_handover:
  principles:
    - "Incident Commander does NOT change without explicit handoff"
    - "Full incident briefing required (extended meeting)"
    - "Outgoing IR stays until incoming is fully briefed"
    - "All context transferred, not just status"
    
  extended_handover_agenda:
    standard_items: "All items from normal handover PLUS:"
    incident_specific:
      - "Full timeline walkthrough"
      - "Evidence collected and location"
      - "Decisions made and rationale"
      - "Stakeholder communications status"
      - "Next steps in detail"
      - "Risks and concerns"
      - "Resource needs"
      
  documentation:
    requirement: "Full incident narrative updated before handover"
    attachment: "Evidence log, decision log, communication log"
    
  attendance:
    minimum: "Both shift leads + incident lead (both shifts)"
    recommended: "All incident team members"
```

### 5.2 Incomplete Investigation Handover

When an analyst has an ongoing investigation that won't complete before shift end:

```yaml
investigation_handover:
  documentation_requirement: "Investigation notes MUST be written"
  
  minimum_content:
    - "What was being investigated"
    - "Why it was opened"
    - "What has been done so far"
    - "What was found (preliminary conclusions)"
    - "What remains to be done"
    - "Relevant artifacts and their locations"
    - "Hypotheses being tested"
    - "Questions remaining"
    
  verbal_briefing:
    duration: "10-15 minutes"
    format: "Screen share + explain thought process"
    goal: "Receiving analyst can continue without starting over"
    
  availability:
    departing_analyst: "Remain available (phone/Slack) for 30 min after shift"
    exception: "Can leave immediately if emergency handoff completed"
```

### 5.3 Problem Handover (Difficult Situations)

When there are interpersonal issues, disagreements, or concerns:

```yaml
difficult_handover:
  principles:
    - "Professionalism first"
    - "Focus on the work, not personalities"
    - "Document facts, not opinions"
    - "Involve manager if needed"
    
  handling_disagreements:
    approach: "Document both positions, let incoming decide or escalate"
    avoid: "Trying to 'win' the argument during handover"
    
  raising_concerns:
    appropriate: "Performance issues, safety concerns, ethical issues"
    method: "Private conversation with manager, not in group handover"
    timing: "Before or after handover meeting, not during"
```

---

## 6. Quality Assurance for Handovers

### 6.1 Handover Quality Checklist

```markdown
## Handover Quality Checklist

### Completeness
- [ ] All active incidents covered
- [ ] Queue status discussed
- [ ] System health reviewed
- [ ] Intelligence highlights shared
- [ ] Staffing clarified
- [ ] Open items documented

### Clarity
- [ ] Recipient can explain back what they're owning
- [ ] Acronyms explained
- [ ] Next steps are actionable
- [ ] Priorities are clear

### Documentation
- [ ] Written report completed
- [ ] Tickets updated with new ownership
- [ ] Signatures obtained

### Follow-up
- [ ] Outgoing remained available for questions
- [ ] Incoming raised clarifying questions
- [ ] No surprises in first hour of new shift
```

### 6.2 Common Handover Failures & Prevention

| Failure Mode | Why It Happens | Prevention |
|-------------|---------------|------------|
| Rushed handover | Running late, want to leave | Start 10 min early, pad timeline |
| Missing context | Assumed knowledge | Explain reasoning, not just conclusions |
| Forgotten items | No checklist used | Use standard template every time |
| Inaccurate status | Didn't verify before reporting | Check actual system, don't rely on memory |
| Ownership gaps | Assumed someone else would take it | Explicit assignment for every item |
| Information overload | Too much detail | Summarize, offer detail on request |

---

*Effective shift handover is a hallmark of a mature SOC operation. Invest the time to do it well - it pays dividends in incident response quality and team cohesion.*
