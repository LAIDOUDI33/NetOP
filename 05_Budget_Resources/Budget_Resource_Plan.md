# National SOC Budget & Resource Plan (2026-2030)

## Document Information

| Field | Value |
|-------|-------|
| **Document ID** | SOC-FIN-BUD-001 |
| **Version** | 1.0 |
| **Classification** | Confidential - Financial |
| **Currency** | Algerian Dinar (DZD) / USD Reference |
| **Planning Horizon** | 5 Years (2026-2030) |

---

## 1. Executive Financial Summary

### 1.1 Total Investment Overview

| Category | 5-Year Total (DZD Millions) | USD Equivalent (Millions) | % of Total |
|----------|---------------------------|---------------------------|------------|
| **Capital Expenditure (CapEx)** | 18,500 | $138 | 42% |
| **Operational Expenditure (OpEx)** | 25,400 | $189 | 58% |
| **TOTAL PROGRAM COST** | **43,900** | **$327** | **100%** |

### 1.2 Annual Investment Profile

| Year | Capex (Bn DZD) | Opex (Bn DZD) | Total (Bn DZD) | Cumulative |
|------|---------------|---------------|-----------------|------------|
| **2026** (Phase 1) | 5.8 | 3.2 | 9.0 | 9.0 |
| **2027** (Phase 2) | 4.2 | 4.1 | 8.3 | 17.3 |
| **2028** (Phase 3) | 3.5 | 5.4 | 8.9 | 26.2 |
| **2029**(Phase 4) | 2.8 | 6.2 | 9.0 | 35.2 |
| **2030** (Phase 5) | 2.2 | 6.5 | 8.7 | 43.9 |

---

## 2. Capital Expenditure (CapEx) Detail

### 2.1 Technology Infrastructure

#### SIEM Platform & Infrastructure

| Item | Specification | Quantity | Unit Cost (DZD K) | Total (DZD M) | Year |
|------|--------------|----------|------------------|--------------|------|
| SIEM Software License | Enterprise Agreement | 1 | 450,000 | 450 | 2026 |
| Search Head Servers | 64-core, 512GB RAM | 3 | 12,000 | 36 | 2026 |
| Indexer Servers | 128-core, 512GB RAM, 50TB NVMe | 12 | 28,000 | 336 | 2026 |
| Storage Arrays (Hot) | All-Flash, 500TB usable | 2 | 85,000 | 170 | 2026 |
| Storage Arrays (Warm/Cold) | Hybrid, 5PB usable | 2 | 120,000 | 240 | 2027 |
| Network Infrastructure | 100GbE switches, cabling | 1 lot | 45,000 | 45 | 2026 |
| **SIEM Subtotal** | | | | **1,277** | |

#### SOAR Platform

| Item | Specification | Quantity | Unit Cost (DZD K) | Total (DZD M) | Year |
|------|--------------|----------|------------------|--------------|------|
| SOAR License (Enterprise) | Unlimited playbooks, integrations | 1 | 180,000 | 180 | 2026 |
| Application Servers | 32-core, 256GB RAM | 4 | 14,000 | 56 | 2026 |
| Database Cluster | PostgreSQL HA | 3 | 8,000 | 24 | 2026 |
| Redis Cache Cluster | In-memory, HA | 3 | 3,500 | 10.5 | 2026 |
| Load Balancers | Enterprise-grade | 2 | 6,000 | 12 | 2026 |
| **SOAR Subtotal** | | | | **282.5** | |

#### EDR Solution

| Item | Specification | Quantity | Unit Cost (DZD K) | Total (DZD M) | Year |
|------|--------------|----------|------------------|--------------|------|
| EDR Licenses (Year 1) | 150,000 endpoints | 150,000 | 2.8 | 420 | 2026-2030* |
| Cloud Management Console | Included | - | - | - | - |
| **EDR Subtotal** | | | | **420** *(annual)* | |

#### Threat Intelligence Platform

| Item | Specification | Quantity | Unit Cost (DZD K) | Total (DZD M) | Year |
|------|--------------|----------|------------------|--------------|------|
| MISP Implementation | Custom deployment + dev | 1 | 15,000 | 15 | 2026 |
| Commercial TI Feeds Bundle | Recorded Future + Mandiant + others | 1 bundle | 95,000 | 95 | 2026-2030* |
| Intel Server Infrastructure | Dedicated servers | 3 | 10,000 | 30 | 2026 |
| **TIP Subtotal** | | | | **140** | |

#### Network Security

| Item | Specification | Quantity | Unit Cost (DZD K) | Total (DZD M) | Year |
|------|--------------|----------|------------------|--------------|------|
| Next-Gen Firewalls (Core) | PA-5430 HA pair | 2 | 35,000 | 70 | 2026 |
| IDPS/NDR Solution | ExtraHop/Darktrace | 1 enterprise | 125,000 | 125 | 2026 |
| DNS Security | Infoblox ThreatDefend | 1 grid | 42,000 | 42 | 2026 |
| Proxy/Web Gateway | Zscaler/ZIA | 150K users | 1.8/user | 270 | 2026 |
| Network Access Control | Illumio/Core | 1 enterprise | 65,000 | 65 | 2026 |
| **Network Security Subtotal** | | | | **572** | |

#### Physical Facility

| Item | Description | Capacity | Cost (DZD M) | Year |
|------|-------------|----------|--------------|------|
| SOC Operations Center | Build-out, furniture, displays | 50 workstations | 380 | 2026 |
| War Room | Conference/command center | 30 persons | 85 | 2026 |
| Forensics Lab | Isolated investigation environment | 10 workstations | 120 | 2027 |
| Data Center Space | Raised floor, power, cooling | 200m² | 250 | 2026 |
| Physical Security | Biometrics, mantraps, CCTV | Full facility | 145 | 2026 |
| **Facility Subtotal** | | | **980** | |

### 2.2 Technology CapEx Summary by Phase

| Category | Phase 1 (2026) | Phase 2 (2027) | Phase 3 (2028) | Phase 4 (2029) | Phase 5 (2030) | Total |
|----------|---------------|----------------|----------------|----------------|----------------|-------|
| SIEM/Analytics | 1,277 | 240 | 180 | 120 | 80 | 1,897 |
| SOAR/Automation | 282.5 | 45 | 35 | 25 | 20 | 407.5 |
| Endpoint Security | 420 | 462 | 508 | 559 | 615 | 2,564 |
| Threat Intel | 140 | 98 | 102 | 106 | 110 | 556 |
| Network Security | 572 | 85 | 70 | 60 | 50 | 837 |
| Facilities | 980 | 220 | 80 | 40 | 20 | 1,340 |
| **Total CapEx** | **3,671.5** | **1,150** | **975** | **910** | **895** | **7,601.5** |

---

## 3. Operational Expenditure (OpEx) Detail

### 3.1 Personnel Costs

#### Staffing Model

| Role | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Avg Salary (DZD K/year) |
|------|--------|--------|--------|--------|--------|----------------------|
| SOC Director | 1 | 1 | 1 | 1 | 1 | 8,500 |
| IR Manager | 1 | 2 | 2 | 2 | 2 | 6,200 |
| Ops Manager | 1 | 1 | 2 | 2 | 2 | 5,800 |
| Intel Manager | 1 | 1 | 1 | 1 | 1 | 5,500 |
| Tier 3 Analyst (Senior IR) | 4 | 6 | 8 | 10 | 10 | 4,200 |
| Tier 2 Analyst (IR) | 8 | 14 | 20 | 24 | 26 | 3,200 |
| Tier 1 Analyst (Triage) | 16 | 28 | 36 | 40 | 42 | 2,400 |
| Threat Intel Analyst | 4 | 6 | 8 | 10 | 10 | 3,400 |
| Engineer/SRE | 4 | 6 | 8 | 10 | 10 | 3,800 |
| QA/Compliance Analyst | 2 | 3 | 4 | 4 | 4 | 3,000 |
| Administrative Support | 3 | 4 | 5 | 5 | 5 | 1,800 |
| **TOTAL HEADCOUNT** | **45** | **72** | **95** | **109** | **113** | |

#### Personnel Cost Calculation

| Component | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | 5-Year Total |
|-----------|--------|--------|--------|--------|--------|--------------|
| Base Salaries | 142.8 | 236.2 | 320.4 | 372.6 | 387.8 | 1,459.8 |
| Benefits (35%) | 50.0 | 82.7 | 112.1 | 130.4 | 135.7 | 510.9 |
| Training (10%) | 14.3 | 23.6 | 32.0 | 37.3 | 38.8 | 146.0 |
| On-call Premium (5%) | 7.1 | 11.8 | 16.0 | 18.6 | 19.4 | 72.9 |
| **Personnel Subtotal** | **214.2** | **354.3** | **480.5** | **558.9** | **581.7** | **2,189.6** |

*(All figures in millions DZD)*

### 3.2 Software Licensing (Recurring)

| Product | Type | Annual Cost (DZD M) | Notes |
|---------|------|-------------------|-------|
| SIEM (Splunk) | Subscription | 450 | Enterprise license, indexed by volume |
| SOAR (Phantom) | Subscription | 180 | Per-node pricing |
| EDR (CrowdStrike) | Subscription | 420 | Per-endpoint, ~150K seats |
| TIP Commercial Feeds | Subscription | 95 | Bundle of premium feeds |
| Ticketing (ServiceNow SecOps) | Subscription | 45 | Named user + instance |
| Vulnerability Management | Subscription | 35 | Qualys/Tenable |
| Email Security | Subscription | 28 | Mimecast/Proofpoint |
| Cloud Security Tools | Subscription | 42 | CSPM, CWPP |
| **Software Subtotal** | | **1,295** | Annual recurring |

### 3.3 Managed Services & External Support

| Service | Provider Type | Annual Cost (DZD M) | Scope |
|---------|--------------|-------------------|-------|
| MSSP Backup (Nights/Weekends) | Managed Security | 180 | Tier-1 coverage during off-hours |
| Penetration Testing | Consulting Firm | 25 | Annual + ad-hoc |
| Incident Response Retainer | IR Firm | 45 | Expert backup for major incidents |
| Threat Intelligence Consulting | Intel Firm | 35 | Strategic assessments |
| Legal Counsel (Retainer) | Law Firm | 20 | Cyber-specific legal support |
| Training Partners | Multiple | 15 | SANS, Offensive Security, etc. |
| **External Services Subtotal** | | **320** | |

### 3.4 Facilities & Operations

| Category | Annual Cost (DZD M) | Components |
|----------|-------------------|------------|
| Data Center Co-location | 85 | Power, cooling, space rental |
| Utilities (SOC Building) | 25 | Electricity, water, climate control |
| Telecommunications | 45 | Internet, dedicated lines, VPN |
| Insurance (Cyber) | 35 | Cyber liability policy |
| Office Supplies & Equipment | 8 | Consumables, small equipment |
| Travel & Conferences | 12 | Training, conferences, meetings |
| **Facilities Ops Subtotal** | | **210** | |

### 3.5 OpEx Summary by Year

| Category | 2026 | 2027 | 2028 | 2029 | 2030 | 5-Year Total |
|----------|------|------|------|------|------|--------------|
| Personnel | 214.2 | 354.3 | 480.5 | 558.9 | 581.7 | 2,189.6 |
| Software Licensing | 1,295 | 1,295 | 1,295 | 1,295 | 1,295 | 6,475 |
| External Services | 280 | 320 | 340 | 350 | 360 | 1,650 |
| Facilities Operations | 185 | 200 | 210 | 215 | 218 | 1,028 |
| Contingency (10%) | 197.4 | 216.9 | 232.6 | 241.9 | 245.5 | 1,134.3 |
| **Annual OpEx Total** | **2,171.6** | **2,386.2** | **2,558.1** | **2,660.8** | **2,700.2** | **12,476.9** |

---

## 4. Return on Investment Analysis

### 4.1 Cost of Breach Avoidance (Risk-Based ROI)

| Breach Scenario | Probability (5yr) | Estimated Cost (DZD M) | Risk-Adjusted Cost |
|-----------------|-------------------|----------------------|-------------------|
| Ransomware (Major) | 25% | 8,500 | 2,125 |
| Data Breach (Large Scale) | 20% | 12,000 | 2,400 |
| Nation-State Espionage | 15% | 25,000 | 3,750 |
| Service Disruption (Critical) | 35% | 3,200 | 1,120 |
| Supply Chain Compromise | 20% | 6,800 | 1,360 |
| **Total Risk Exposure** | | | **10,755** |

**ROI Calculation:**
- Program Investment: 43,900 M DZD
- Risk Mitigation Value: 10,755 M DZD (expected value)
- Additional Value: Reputation, sovereignty, capability building
- **Qualitative ROI:** Positive when considering full risk spectrum

### 4.2 Operational Efficiency Gains

| Metric | Without SOC | With SOC (Year 3) | Improvement |
|--------|-------------|------------------|-------------|
| Mean Time to Detect (MTTD) | Weeks/Days | < 5 minutes | 99%+ faster |
| Mean Time to Respond (MTTR) | Days/Weeks | < 15 minutes | 97%+ faster |
| Incidents Handled/Analyst/Day | 2-3 | 20+ | 700% increase |
| False Positive Rate | > 70% | < 15% | 78% reduction |
| Automation Rate | < 10% | > 85% | Significant |

---

## 5. Funding Strategy

### 5.1 Recommended Funding Approach

```yaml
funding_strategy:
  primary_source: "National Budget Allocation"
    allocation_method: "5-year commitment with annual appropriations"
    budget_line: "Ministry of Defense / National Security"
    
  supplementary_sources:
    international_assistance:
      - "World Bank Cybersecurity Program"
      - "EU Digital Transformation Fund"
      - "UNDP Capacity Building Grants"
      
    cost_recovery:
      model: "Charge-back to ministries for services"
      estimated_recovery: "15-20% of OpEx by Year 5"
      
  contingency_reserve:
    amount: "15% of total budget"
    purpose: "Unforeseen costs, currency fluctuation, scope changes"
    access: "Steering Committee approval required"
```

### 5.2 Phased Funding Requirements

| Phase | Duration | Total Funding Needed | Funding Source Priority |
|-------|----------|---------------------|------------------------|
| Phase 1 | 2026 | 9.0 Bn DZD | National budget + Int'l grants |
| Phase 2 | 2027 | 8.3 Bn DZD | National budget established |
| Phase 3 | 2028 | 8.9 Bn DZD | National budget + partial recovery |
| Phase 4 | 2029 | 9.0 Bn DZD | National budget + recovery revenue |
| Phase 5 | 2030 | 8.7 Bn DZD | National budget + recovery revenue |

---

## 6. Budget Monitoring & Control

### 6.1 Financial Governance

| Control Mechanism | Frequency | Owner | Output |
|-------------------|-----------|-------|--------|
| Budget vs Actual Review | Monthly | Finance Officer | Variance report |
| Forecast Update | Quarterly | PMO + Finance | Revised forecast |
| Capital Approval | Per procurement | Procurement Committee | Authorization |
| Audit | Annual | External Auditor | Opinion letter |
| Cost-Benefit Review | Annually | Steering Committee | Continuation decision |

### 6.2 Key Performance Indicators (Financial)

| KPI | Target | Measurement |
|-----|--------|-------------|
| Budget Variance | ±5% | Monthly actual vs budgeted |
| Cost per Event Analyzed | Decreasing Y/Y | OpEx / alerts processed |
| Cost per Incident Resolved | Stable/decreasing | OpEx / incidents closed |
| ROI on Technology Investments | Positive within 3 years | Benefit realization tracking |
| Personnel Cost as % of Total | 45-55% | Efficiency indicator |

---

*This budget plan provides a comprehensive financial framework for establishing and operating a world-class National SOC. Regular review and adjustment will ensure continued alignment with program objectives and fiscal responsibility.*
