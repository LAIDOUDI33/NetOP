# Staffing & Organizational Structure Plan

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | SOC-HR-STAFF-001 |
| **Version** | 1.0 |
| **Classification** | Internal Use - HR & Management |

---

## 1. Organizational Design

### 1.1 Reporting Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    MINISTRY OF DEFENSE                       │
│                         (Sponsor)                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    CHIEF INFORMATION SECURITY OFFICER        │
│                         (CISO)                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   NATIONAL SOC DIRECTOR                      │
│              (Reports to CISO, Dotted to Ministry)           │
└──────────────────────────┬──────────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ INCIDENT      │   │ THREAT        │   │ OPERATIONS    │
│ RESPONSE      │   │ INTELLIGENCE  │   │ & ENGINEERING │
│ MANAGER       │   │ MANAGER       │   │ MANAGER       │
│               │   │               │   │               │
├───────────────┤   ├───────────────┤   ├───────────────┤
│ • TIER 3 (Sr) │   │ • Intel       │   │ • SRE Team    │
│ • TIER 2      │   │   Analysts    │   │ • Engineering │
│ • DFIR Team   │   │ • Hunt Team   │   │ • Tool Admin  │
│ • IR Liaison  │   │ • Research    │   │ • Facilities  │
└───────────────┘   └───────────────┘   └───────────────┘
```

### 1.2 Team Composition by Phase

| Role Category | Phase 1 (Yr 1) | Phase 2 (Yr 2) | Phase 3 (Yr 3) | Phase 4 (Yr 4) | Phase 5 (Yr 5) |
|---------------|----------------|----------------|----------------|----------------|----------------|
| **Leadership** | 4 | 5 | 6 | 6 | 6 |
| **Incident Response** | 13 | 22 | 30 | 36 | 38 |
| **Threat Intelligence** | 5 | 8 | 10 | 12 | 12 |
| **Engineering/Ops** | 8 | 12 | 16 | 20 | 20 |
| **Support Functions** | 6 | 9 | 11 | 12 | 12 |
| **Contractors** | 9 | 16 | 22 | 23 | 25 |
| **TOTAL HEADCOUNT** | **45** | **72** | **95** | **109** | **113** |

---

## 2. Job Descriptions

### 2.1 SOC Director

**Job Level:** Executive (P7+)  
**Reports To:** CISO  
**Direct Reports:** 3-4 Managers  

**Position Summary:**
Lead Algeria's National Security Operations Center, providing strategic direction for all security operations, ensuring protection of government critical infrastructure from cyber threats.

**Key Responsibilities:**
- Develop and execute SOC strategy aligned with national cybersecurity objectives
- Manage annual budget of 8-9 Billion DZD
- Represent SOC in governmental and international forums
- Build and develop high-performing cybersecurity team (113 FTEs)
- Ensure compliance with national and international standards
- Report to Steering Committee and Ministry leadership on cyber posture
- Drive continuous improvement in detection and response capabilities

**Required Qualifications:**
- 15+ years cybersecurity experience, 7+ years in leadership role
- Bachelor's degree in CS, IT, or related field (Master's preferred)
- CISSP, CISM, or equivalent certification
- Experience managing teams of 50+
- Fluency in Arabic and French; English preferred
- Experience with government/military operations preferred

**Compensation Range:** 8-10 Million DZD annually (plus benefits)

---

### 2.2 Incident Response Manager

**Job Level:** Senior Manager (P6)  
**Reports To:** SOC Director  
**Direct Reports:** 15-20 Analysts  

**Position Summary:**
Oversee all incident response activities, ensuring rapid, effective response to security incidents affecting government systems.

**Key Responsibilities:**
- Lead incident response for SEV-0 and SEV-1 incidents
- Develop and maintain IR playbooks and procedures
- Coordinate with internal teams, external agencies, and law enforcement
- Conduct post-incident reviews and lessons learned
- Manage IR team scheduling, performance, and development
- Track and report on IR metrics (MTTD, MTTR, etc.)

**Required Qualifications:**
- 10+ years incident response experience, 5+ years management
- GCIH, GCFA, or equivalent certification
- Experience with major IR frameworks (NIST, SANS)
- Strong communication skills (briefing executives)
- Crisis management experience

**Compensation Range:** 5.5-7 Million DZD annually

---

### 2.3 Tier 3 Senior Incident Responder

**Job Level:** Senior Individual Contributor (P5)  
**Reports To:** IR Manager  

**Position Summary:**
Handle complex security investigations, conduct threat hunting, mentor junior analysts, and contribute to capability development.

**Key Responsibilities:**
- Lead complex incident investigations (APT, sophisticated attacks)
- Perform proactive threat hunting across environment
- Develop custom detection rules and playbooks
- Conduct malware analysis and reverse engineering
- Mentor Tier 1 and Tier 2 analysts
- Stay current with threat landscape and TTPs

**Required Qualifications:**
- 7+ years IR/cybersecurity experience
- OSCP, GNFA, or GREM certification
- Strong malware analysis skills
- Scripting ability (Python, PowerShell)
- Threat hunting experience

**Compensation Range:** 3.8-4.8 Million DZD annually

---

### 2.4 Tier 2 Incident Response Analyst

**Job Level:** Mid-Level (P3-P4)  
**Reports To:** IR Manager / Shift Lead  

**Position Summary:**
Investigate security alerts, perform initial forensic analysis, execute response playbooks, and escalate complex cases.

**Key Responsibilities:**
- Investigate escalated alerts from Tier 1
- Execute IR playbooks for common incident types
- Perform endpoint and network forensics
- Coordinate containment and eradication activities
- Document findings and maintain case records
- Participate in on-call rotation

**Required Qualifications:**
- 3-5 years cybersecurity experience
- GCIH, CFCE, or working toward certification
- SIEM experience (Splunk, ELK)
- EDR experience (CrowdStrike, SentinelOne)
- Basic scripting skills

**Compensation Range:** 2.8-3.6 Million DZD annually

---

### 2.5 Tier 1 Security Analyst (Triage)

**Job Level:** Entry-Mid (P1-P3)  
**Reports To:** Shift Lead  

**Position Summary:**
Perform first-line triage of security alerts, execute approved playbooks, and escalate incidents requiring deeper investigation.

**Key Responsibilities:**
- Monitor and triage security alerts from multiple sources
- Execute automated response playbooks
- Perform initial alert enrichment and classification
- Escalate complex or high-severity alerts
- Update ticketing systems with accurate status
- Contribute to false positive reduction efforts

**Required Qualifications:**
- 1-3 years IT/security experience
- CompTIA Security+, CySA+, or equivalent
- Fundamental networking knowledge
- Strong attention to detail
- Willingness to learn and grow

**Compensation Range:** 2.0-2.8 Million DZD annually

---

### 2.6 Threat Intelligence Analyst

**Job Level:** P2-P5 (varies by seniority)  
**Reports To:** Intel Manager  

**Position Summary:**
Collect, analyze, and disseminate threat intelligence to support proactive defense and incident response.

**Key Responsibilities:**
- Monitor threat feeds and intelligence sources
- Produce tactical, operational, and strategic intel products
- Maintain IOC database and ensure timely dissemination
- Conduct threat actor research and profiling
- Support IR with intelligence-based context
- Manage MISP/TIP platform

**Required Qualifications:**
- 2-6 years threat intelligence experience
- CTI certification preferred
- Understanding of MITRE ATT&CK framework
- OSINT techniques
- Strong analytical writing skills

**Compensation Range:** 2.8-4.2 Million DZD annually

---

## 3. Recruitment Strategy

### 3.1 Talent Sources

| Source | Target Roles | % of Hires | Timeline |
|---------|-------------|------------|----------|
| **University Programs** | Tier 1, Entry positions | 25% | Ongoing |
| **International Recruitment** | Senior roles, specialists | 20% | Phased |
| **Government Transfer** | Experienced gov employees | 25% | Phase 1-2 |
| **Private Sector Hire** | Mid-Senior level | 20% | Ongoing |
| **Military Veterans** | All levels | 10% | Ongoing |

### 3.2 University Partnership Program

```yaml
university_program:
  partner_institutions:
    - "USTHB (University of Sciences and Technology Houari Boumediene)"
    - "ESI (École nationale Supérieure d'Informatique)"
    - "USTOMB (University of Oran)"
    - "ENP (École Nationale Polytechnique)"
    
  program_components:
    internship_program:
      duration: "3-6 months"
      participants_per_year: "20-30"
      conversion_rate_target: "60%"
      
    scholarship_program:
      name: "National SOC Scholarship"
      coverage: "Tuition + stipend"
      commitment: "3 years post-graduation"
      annual_awards: "10-15"
      
    curriculum_collaboration:
      input_on: "Cybersecurity course content"
      guest_lectures: "SOC staff participation"
      capstone_projects: "Real SOC challenges"
      
    capture_the_flag:
      frequency: "Annual national competition"
      purpose: "Identify top talent early"
      prizes: "Internship offers + scholarships"
```

### 3.3 Competitive Compensation Philosophy

```yaml
compensation_philosophy:
  positioning:
    vs_market: "75th percentile (above market)"
    rationale: "Attract best talent, reduce turnover"
    comparison_set: "Government + Regional banks + Telecom operators"
    
  total_rewards:
    base_salary: "Competitive per role/level"
    benefits_package: "~35% of base salary value"
      includes:
        - "Health insurance (employee + family)"
        - "Housing allowance or provided housing"
        - "Transportation allowance"
        - "Performance bonus (up to 20%)"
        - "Certification reimbursement"
        - "Training budget ($5K/year)"
        
    non_financial:
      - "Career development path"
      - "Challenging mission-driven work"
      - "International exposure/training"
      - "Flexible scheduling (where possible)"
      - "Modern work environment"
```

---

## 4. Training & Development Framework

### 4.1 Certification Roadmap by Role

| Role | Required Certifications | Desired Certifications | Budget/Person |
|------|------------------------|----------------------|---------------|
| **Tier 1** | Security+, CySA+ | GCIH, Splunk Core | $3,000/year |
| **Tier 2** | GCIH, Splunk Power | GCFA, OSCP | $8,000/year |
| **Tier 3** | GCIH, GCFA, OSCP | GREM, GNFA | $12,000/year |
| **Intel Analyst** | CTI, GIAC | GOSI, GMFA | $6,000/year |
| **Manager** | CISSP, GCIH | CISM, GSLC | $10,000/year |
| **Director** | CISSP, CISM | CRISC, CGEIT | $8,000/year |

### 4.2 Training Delivery Methods

| Method | Content Type | Frequency | Duration |
|--------|-------------|-----------|----------|
| **Vendor Training** | Tool-specific (Splunk, CrowdStrike) | As needed | 2-5 days |
| **Conference Attendance** | Industry trends, networking | Annual | 3-5 days |
| **Online Learning Platforms** | Continuous learning | Ongoing | 2 hrs/week |
| **Internal Workshops** | SOP updates, new procedures | Monthly | 2-4 hours |
| **Tabletop Exercises** | Scenario-based practice | Quarterly | Half-day |
| **Red Team/Blue Team Exercises** | Hands-on skill building | Semi-annual | 1 week |
| **Certification Boot Camp** | Exam preparation | As needed | 5 days |

### 4.3 Career Progression Path

```
ENTRY LEVEL                    MID LEVEL                  SENIOR LEVEL               LEADERSHIP
═════════                     ═════════                   ════════════                ══════════
                                                                                      
Security Analyst              IR Analyst                  Sr. IR Analyst              Team Lead
(P1-P2)                       (P3)                        (P4-P5)                     (P6)
↓ 1-2 years                   ↓ 2-3 years                ↓ 3-4 years                ↓ 2+ years
                                                                                      
├─→ Senior Analyst            ├─→ Sr. IR Analyst          ├─→ Principal IR            ├─→ Manager
├─→ Threat Intel Track        ├─→ Intel Analyst           ├─→ Threat Hunter           ├─→ Director
├─→ Engineering Track         ├─→ Security Engineer       ├─→ Architect               └─→ CISO Path
└─→ GRC Track                 └─→ Compliance Analyst      └─→ Domain Expert           
```

---

## 5. Performance Management

### 5.1 Key Performance Indicators by Role

**Tier 1 Analyst KPIs:**
| Metric | Target | Weight |
|--------|--------|--------|
| Alerts Triaged Per Day | > 50 | 25% |
| Triage Accuracy Rate | > 95% | 25% |
| SLA Compliance | > 98% | 20% |
| Documentation Quality | > 90% score | 15% |
| Training Completion | 100% assigned | 15% |

**Tier 2/3 Analyst KPIs:**
| Metric | Target | Weight |
|--------|--------|--------|
| Incidents Resolved | > 15/month | 20% |
| Mean Time to Contain | < 30 min | 20% |
| Detection Quality (True Positives) | > 90% | 20% |
| Playbook/Rule Development | > 2/month | 15% |
| Mentoring Contribution | Measured | 10% |
| Complex Investigation Success | > 85% | 15% |

**Manager KPIs:**
| Metric | Target | Weight |
|--------|--------|--------|
| Team Metrics Achievement | Team meets targets | 25% |
| Budget Adherence | ±5% | 15% |
| Staff Development | Promotions, certifications | 20% |
| Process Improvements | Implemented changes | 15% |
| Stakeholder Satisfaction | > 4.0/5.0 | 15% |
| Team Engagement/Retention | < 15% turnover | 10% |

### 5.2 Review Cycle

| Review Type | Frequency | Participants | Purpose |
|-------------|-----------|---------------|---------|
| Weekly 1:1 | Weekly | Employee + Manager | Feedback, blockers, priorities |
| Quarterly Review | Quarterly | Employee + Manager | Goal progress, development |
| Annual Performance | Annually | Employee + Manager + Skip | Rating, compensation, promotion |
| 360 Feedback | Annually | Peers, reports, stakeholders | Leadership development |

---

*This staffing plan ensures the National SOC has the right people, with the right skills, in the right roles, at the right time to protect Algeria's digital infrastructure.*
