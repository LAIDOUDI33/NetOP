# National SOC Risk Management Framework

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | Jan 2026 | PMO / CISO Office | Approved |

---

## 1. Risk Management Approach

### 1.1 Framework Overview

This Risk Management Framework (RMF) follows **ISO 31000:2018** principles adapted for a major national cybersecurity program. The framework ensures systematic identification, assessment, treatment, monitoring, and communication of risks throughout the 5-year implementation.

### 1.2 Risk Appetite Statement

The National SOC program operates with a **MODERATE-CONSERVATIVE** risk appetite:

- **Strategic Risks**: Low tolerance - National security implications require conservative approach
- **Operational Risks**: Moderate tolerance - Accept calculated risks for operational efficiency
- **Financial Risks**: Moderate tolerance - Budget flexibility within approved limits
- **Technical Risks**: Low tolerance - System reliability and security paramount
- **Reputational Risks**: Low tolerance - Public trust essential for national program

---

## 2. Risk Register - Top Strategic Risks

### 2.1 Critical Risks (Red)

#### RISK-001: Insufficient Skilled Workforce
| Attribute | Details |
|-----------|---------|
| **Description** | Algeria faces acute shortage of qualified cybersecurity professionals (CISSP, GCIH, OSCP). Global competition for talent intensifies challenge. |
| **Probability** | High (80%) |
| **Impact** | Critical - Delays all phases, reduces capability |
| **Root Cause** | Limited local education pipeline, brain drain, salary competitiveness |
| **Mitigation Strategy** | 1. Aggressive recruitment campaign with premium compensation<br>2. Partnership with universities for curriculum development<br>3. International training programs (SANS, Offensive Security)<br>4. Competitive benefits package (housing, relocation)<br>5. Contractor bridge strategy while building internal team |
| **Contingency** | Engage managed security service provider (MSSP) for gap coverage |
| **Owner** | HR Director / CISO |
| **Status** | Active Mitigation |

#### RISK-002: Budget Reduction or Delay
| Attribute | Details |
|-----------|---------|
| **Description** | Economic conditions or political priorities may result in budget cuts, delayed disbursement, or reallocation of funds. |
| **Probability** | Medium (45%) |
| **Impact** | Critical - Project stall, capability gaps |
| **Root Cause** | Oil price volatility, competing national priorities, economic downturn |
| **Mitigation Strategy** | 1. Multi-year budget commitment from highest authority<br>2. Phased approach allows incremental funding<br>3. Maintain 15% contingency reserve<br>4. Identify "must-have" vs "nice-to-have" features<br>5. International donor/partner funding exploration |
| **Contingency** | Reduced scope fallback plan, extended timeline option |
| **Owner** | Program Manager / Finance Officer |
| **Status** | Monitoring |

#### RISK-003: Technology Vendor Failure
| Attribute | Details |
|-----------|---------|
| **Description** | Primary technology vendor fails to deliver, goes out of business, or has critical product vulnerabilities. |
| **Probability** | Medium (30%) |
| **Impact** | High - Major delay, re-procurement required |
| **Root Cause** | Market consolidation, supply chain issues, zero-day discoveries |
| **Mitigation Strategy** | 1. Multi-vendor architecture (no single point of failure)<br>2. Financial health assessment in vendor selection<br>3. Source code escrow for critical components<br>4. Open-source alternatives identified and tested<br>5. Strong SLA with penalties and exit clauses |
| **Contingency** | Pre-qualified backup vendors, 90-day transition plan |
| **Owner** | Technical Architect / Procurement Officer |
| **Status** | Active Mitigation |

### 2.2 High Risks (Orange)

#### RISK-004: Integration Complexity
| Attribute | Details |
|-----------|---------|
| **Description** | Difficulty integrating diverse systems (legacy government IT, multiple vendor products, various data formats). |
| **Probability** | High (70%) |
| **Impact** | High - Cost overruns, timeline delays, reduced functionality |
| **Root Cause** | Poor documentation, proprietary formats, resistance to change |
| **Mitigation Strategy** | 1. Early proof-of-concept integrations<br>2. Dedicated integration team with experienced architects<br>3. API-first architecture requirement<br>4. Legacy modernization parallel track<br>5. Vendor integration support in contracts |
| **Contingency** | Middleware abstraction layer, manual processes as fallback |
| **Owner** | Technical Architect |
| **Status** | Active Mitigation |

#### RISK-005: Political/Legislative Changes
| Attribute | Details |
|-----------|---------|
| **Description** | Changes in government leadership, priorities, or legal framework affecting program mandate or authorities. |
| **Probability** | Medium (40%) |
| **Impact** | High - Mandate changes, reorganization, funding impact |
| **Root Cause** | Electoral cycles, policy evolution, geopolitical events |
| **Mitigation Strategy** | 1. Cross-party political buy-in where possible<br>2. Legislative embedding of program authority<br>3. Demonstrable early wins to build value<br>4. International commitments create external accountability<br>5. Flexible design adaptable to mandate changes |
| **Contingency** | Pause and reassess protocol, scope adjustment framework |
| **Owner** | Program Manager |
| **Status** | Monitoring |

#### RISK-006: Insider Threat / Sabotage
| Attribute | Details |
|-----------|---------|
| **Description** | Malicious insider within SOC or contractor organization causing damage, data theft, or sabotage. |
| **Probability** | Low-Medium (25%) |
| **Impact** | Critical - National security compromise, trust erosion |
| **Root Cause** | Inadequate vetting, privileged access, coercion potential |
| **Mitigation Strategy** | 1. Rigorous background investigations (military-grade)<br>2. Zero-trust architecture with least privilege<br>3. Comprehensive logging and monitoring of admin actions<br>4. Mandatory vacation and job rotation policies<br>5. Security awareness and culture program<br>6. Anomaly detection on user behavior analytics (UEBA) |
| **Contingency** | Rapid revocation protocols, forensic investigation capability |
| **Owner** | CISO / Security Operations Director |
| **Status** | Active Mitigation |

### 2.3 Medium Risks (Yellow)

| ID | Risk | Probability | Impact | Mitigation Summary | Owner |
|----|------|-------------|--------|-------------------|-------|
| RISK-007 | Scope creep from stakeholders | High (65%) | Medium | Strict change control, baseline documentation | Program Manager |
| RISK-008 | Data quality issues from sources | Medium (55%) | Medium | Data validation rules, source SLAs | Data Engineer |
| RISK-009 | Vendor lock-in | Medium (50%) | Medium | Open standards, multi-vendor strategy | Tech Architect |
| RISK-010 | Training effectiveness gaps | Medium (50%) | Medium | Hands-on labs, certification requirements | Training Lead |
| RISK-011 | Physical facility delays | Low (30%) | Medium | Alternative site identified, modular construction | Facilities Manager |
| RISK-012 | International cooperation barriers | Medium (40%) | Low | Multiple partner options, bilateral agreements | International Liaison |

---

## 3. Risk Treatment Strategies

### 3.1 Treatment Options Applied

| Strategy | Application | Example |
|----------|-------------|---------|
| **Avoid** | Eliminate risk by not undertaking activity | Decline integration with unvetted systems |
| **Mitigate** | Reduce probability or impact | Redundant systems, training, controls |
| **Transfer** | Shift risk to third party | Insurance, vendor SLAs, MSSP backup |
| **Accept** | Acknowledge and monitor | Low-impact risks within tolerance |

### 3.2 Residual Risk Assessment

After mitigation implementation:

| Risk ID | Initial Risk Level | Residual Risk Level | Treatment Effectiveness |
|---------|-------------------|--------------------|----------------------|
| RISK-001 | Critical | Medium | 60% reduction via multi-pronged approach |
| RISK-002 | Critical | Medium-Low | 55% reduction via contingency planning |
| RISK-003 | High | Low | 75% reduction via multi-vendor strategy |
| RISK-004 | High | Medium | 50% reduction via dedicated resources |
| RISK-005 | High | Medium | 45% reduction via political embedding |
| RISK-006 | Critical | Low | 80% reduction via comprehensive controls |

---

## 4. Risk Monitoring & Reporting

### 4.1 Monitoring Mechanisms

| Mechanism | Frequency | Trigger | Action |
|-----------|-----------|---------|--------|
| **Risk Dashboard Review** | Weekly | Any red status | Immediate mitigation activation |
| **PMO Risk Meeting** | Weekly | New high/critical risk | Enhanced monitoring plan |
| **Steering Committee Report** | Monthly | Portfolio-level view | Strategic decisions |
| **Quarterly Risk Reassessment** | Quarterly | All risks | Update probability/impact |
| **Annual Risk Workshop** | Annually | Complete register | Strategic refresh |

### 4.2 Risk Reporting Template

```markdown
## Risk Report - [Period]

### Executive Summary
- Total Active Risks: [X]
- Critical: [X] | High: [X] | Medium: [X] | Low: [X]
- Trends: 📈 Improving / 📉 Worsening / ➡️ Stable

### Top 5 Risks Requiring Attention
1. [Risk Name] - [Status] - [Action Required]
2. ...

### Newly Identified Risks
- [Risk Name] - [Date Identified]

### Closed/Mitigated Risks
- [Risk Name] - [Closure Reason]

### Recommendations
- [Strategic recommendation]
```

---

## 5. Crisis & Emergency Protocols

### 5.1 Risk Event Classification

| Level | Definition | Response Protocol |
|-------|-----------|-------------------|
| **Level 1 - Watch** | Risk indicator detected | Enhanced monitoring, contingency prep |
| **Level 2 - Warning** | Risk materializing | Activation of mitigation plan |
| **Level 3 - Crisis** | Risk event occurred | Crisis team activation, emergency procedures |
| **Level 4 - Disaster** | Severe impact realized | Business continuity, recovery mode |

### 5.2 Crisis Response Team

| Role | Responsibility | Activation Trigger |
|------|---------------|-------------------|
| **Crisis Director** | Overall crisis authority | Level 3+ declared |
| **Communications Lead** | Internal/external messaging | Any public exposure |
| **Technical Lead** | Technical response coordination | Technical crisis |
| **Legal Counsel** | Legal implications | Legal/regulatory exposure |
| **HR Lead** | People/safety matters | Personnel involved |

---

## 6. Lessons Learned & Continuous Improvement

### 6.1 Post-Risk Review Process

After each significant risk event:
1. **Timeline Reconstruction** - What happened, when
2. **Root Cause Analysis** - Five Whys technique
3. **Response Evaluation** - What worked, what didn't
4. **Improvement Identification** - Specific actionable items
5. **Knowledge Capture** - Document and share learnings

### 6.2 Risk Culture Development

Initiatives to build risk-aware culture:
- **Risk Awareness Training** - All project staff
- **Near-Miss Reporting** - Encourage without blame
- **Risk Champions** - Designated advocates per workstream
- **Recognition Program** - Reward proactive risk management

---

*Risk management is an ongoing process, not a one-time activity. This framework will be continuously updated as the program evolves and new risks emerge.*
