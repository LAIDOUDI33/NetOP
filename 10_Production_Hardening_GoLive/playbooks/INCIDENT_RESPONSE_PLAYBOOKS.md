# ============================================================
# Djezzy National SOC - Incident Response Playbooks
# Phase 10: Production Ready Playbooks
# Version: 1.0 - Final
# ============================================================

---

## 📋 TABLE OF CONTENTS

1. [Critical Infrastructure Outage](#1-critical-infrastructure-outage)
2. [Data Breach / Exfiltration](#2-data-breach--exfiltration)
3. [Ransomware Attack](#3-ransomware-attack)
4. [DDoS Attack](#4-ddos-attack)
5. [Insider Threat Detection](#5-insider-threat-detection)
6. [Telecom-Specific: SIM Swap Fraud](#6-telecom-specific-sim-swap-fraud)

---

## 1. CRITICAL INFRASTRUCTURE OUTAGE

### 🎯 Objective
Restore critical SOC platform functionality within SLA targets (MTTR < 15 min detection, < 4h resolution).

### ⚡ Severity: **CRITICAL**

### 🔔 Escalation Path
```
Level 1 (0-15 min):  SOC On-Call Analyst → Auto-escalate if no response
Level 2 (15-30 min): SOC Team Lead + Infra Team
Level 3 (30+ min):   CISO + IT Director + Executive Notification
```

### 📝 Detection Indicators
- Monitoring alerts (Prometheus/Grafana)
- User reports ("I can't access the SOC dashboard")
- Automated health check failures (`/api/health` returning non-200)
- Uptime monitoring alerts (UptimeRobot, Pingdom)

### 🛠️ Response Procedure

#### Phase 1: Triage (0-5 minutes)
```bash
# 1. Verify the outage
curl -sk https://soc.djezzy.dz/api/health
kubectl get pods -n soc-production -o wide

# 2. Check recent events
kubectl get events -n soc-production --sort-by='.lastTimestamp' | tail -20

# 3. Review recent logs
kubectl logs -n soc-platform --tail=100 -l app=soc-platform | grep -i error
```

#### Phase 2: Assessment (5-15 minutes)
- [ ] Determine scope: Full outage vs partial degradation?
- [ ] Identify affected components (App, DB, Cache, Ingress)
- [ ] Check for recent deployments or changes
- [ ] Assess business impact (users affected, critical functions down)

**Assessment Matrix:**
| Component | Impact | Workaround Available |
|-----------|--------|---------------------|
| Application Pods | High | N/A |
| PostgreSQL DB | Critical | Read replicas? |
| Redis Cache | Medium | Will auto-recover |
| NGINX Ingress | High | Direct pod access? |
| TLS Certificate | Medium | Temporary disable? |

#### Phase 3: Containment & Recovery (15 min - 4 hours)

**Scenario A: Pod Crash Loop**
```bash
# Describe the failing pod
kubectl describe pod <pod-name> -n soc-production

# Check resource limits
kubectl top pods -n soc-production

# If OOMKilled, increase memory limit
kubectl patch deployment soc-platform -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"limits":{"memory":"2Gi"}}}]}}}}'

# Restart deployment
kubectl rollout restart deployment/soc-platform -n soc-production
```

**Scenario B: Database Connection Failure**
```bash
# Check database pods
kubectl get pods -n soc-production -l app=postgresql

# Test connectivity from app pod
kubectl exec -it <app-pod> -n soc-production -- nc -zv postgresql-service 5432

# If DB is down, initiate failover to replica
kubectl apply -f postgresql-failover.yaml
```

**Scenario C: Certificate Expiry**
```bash
# Check certificate status
kubectl get certificates -n soc-production

# Force renewal
kubectl delete certificate soc-platform-tls -n soc-production

# Or use cert-manager CLI
cmctl renew soc-platform-tls -n soc-production
```

#### Phase 4: Verification
```bash
# Health check
curl -sk https://soc.djezzy.dz/api/health | jq .

# Smoke test key functions
curl -sk https://soc.djezzy.dz/api/incidents | jq '.[0].id'
curl -sk https://soc.djezzy.dz/api/alerts | jq 'length'
```

### 📊 Post-Incident Actions
- Complete incident report within 24h
- Root cause analysis (RCA) within 48h
- Update runbook with lessons learned
- Implement preventive measures

---

## 2. DATA BREACH / EXFILTRATION

### 🎯 Objective
Contain data breach, prevent further exfiltration, preserve evidence for investigation.

### ⚡ Severity: **CRITICAL** (PII involved) / **HIGH** (non-sensitive data)

### 🔔 Immediate Actions (First 60 Minutes)

#### 0-15 Minutes: Emergency Containment
1. **DO NOT SHUTDOWN SYSTEMS** - Preserve volatile evidence
2. **Isolate affected systems** at network level:
   ```bash
   # Block outbound traffic from compromised host
   kubectl label pod <compromised-pod> isolated=true -n soc-production
   
   # Apply network policy to block egress
   kubectl apply -f emergency-block-egress.yaml
   ```
3. **Enable enhanced logging**
4. **Notify CISO and Legal immediately** (GDPR Article 33: 72h notification requirement)

#### 15-60 Minutes: Evidence Preservation
```bash
# Capture network state
tcpdump -i any -w /evidence/capture-$(date +%s).pcap host <suspicious-ip>

# Memory dump if possible (consult legal first)
# Note: This may require court order in some jurisdictions

# Create forensic image of volumes
kubectl cp soc-production/<pod-name>:/data /evidence/pod-data-copy/
```

### 📋 GDPR Compliance Checklist (Algeria Data Protection Law)
- [ ] Document breach details (what, when, how much)
- [ ] Identify affected data subjects (Djezzy subscribers?)
- [ ] Assess risk to individuals
- [ ] Prepare notification to ARPCE (Autorité de Régulation de la Poste et des Communications Électroniques)
- [ ] Prepare subscriber notification template
- [ ] Document remediation steps taken

### 🔄 Recovery Steps
1. **Credential rotation** - All potentially compromised accounts
2. **System rebuild** - Never trust a compromised system
3. **Security review** - How did this happen?
4. **Monitoring enhancement** - Detect similar patterns

---

## 3. RANSOMWARE ATTACK

### 🎯 Objective
Contain ransomware spread, assess impact, recover from clean backups.

### ⚡ Severity: **CRITICAL**

### 🚨 IMMEDIATE RESPONSE (Zero Trust Mode)

#### First 5 Minutes
```bash
# 1. Activate emergency mode
kubectl annotate namespace soc-production emergency-mode="true" --overwrite

# 2. Isolate all potentially affected systems
# Block lateral movement
kubectl apply -f emergency-network-lockdown.yaml

# 3. Snapshot all volumes (for potential recovery)
for pvc in $(kubectl get pvc -n soc-production -o name); do
  kubectl snapshot $pvc --namespace=soc-production
done
```

#### Decision Tree
```
Is encryption spreading?
├── YES → Pull the plug (literally disconnect from network)
│   ├── Isolate VLAN
│   └── Engage external IR firm (Mandiant, CrowdStrike)
└── NO → Continue with containment
    ├── Identify patient zero
    └── Assess scope of encrypted files
```

### 📁 Ransomware Response Kit
- [ ] Offline backup verification
- [ ] Decryptor availability check (NoMoreRansom.org)
- [ ] Bitcoin wallet readiness (if paying - last resort)
- [ ] Insurance policy activation
- [ ] Law enforcement contact (Gendarmerie Nationale - Cybercrime Unit)

### ♻️ Recovery Process
1. **Never pay** without executive approval + insurance validation
2. **Wipe and rebuild** from known-good backups
3. **Patch entry vector** before reconnecting
4. **Monitor for persistence mechanisms**
5. **User credentials reset** (all users)

---

## 4. DDoS ATTACK

### 🎯 Objective
Maintain service availability during DDoS attack.

### ⚡ Severity: **HIGH** (if service degraded) / **CRITICAL** (if service down)

### 🛡️ Defense Layers

#### Layer 1: Network Edge (ISP Level)
- Contact Djezzy NOC (Network Operations Center) for upstream filtering
- Request blackhole routing of attack sources
- Enable anycast if available

#### Layer 2: Cloudflare/WAF (If configured)
```bash
# Enable "Under Attack" mode via API
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/security_level" \
  -H "Authorization: Bearer $CF_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"value": "under_attack"}'
```

#### Layer 3: Kubernetes Ingress
```yaml
# Rate limiting configuration
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: soc-platform-ingress
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-connections: "50"
    nginx.ingress.kubernetes.io/burst-size: "200"
```

#### Layer 4: Application Level
- Enable CAPTCHA challenges
- Reduce session timeouts
- Disable heavy endpoints temporarily
- Serve static content only

### 📊 During Attack Metrics to Monitor
```promql
# Requests per second by source IP
topk(20, sum by (client_ip) (rate(http_requests_total[1m])))

# Abnormal geographic distribution
sum by (geoip_country_code) (rate(http_requests_total[5m]))

# Error rate spike
sum(rate(http_requests_total{status=~"5.."}[1m])) 
/ sum(rate(http_requests_total[1m]))
```

---

## 5. INSIDER THREAT DETECTION

### 🎯 Objective
Investigate suspected insider threat while preserving privacy rights and following legal procedures.

### ⚡ Severity: **CRITICAL** (active exfiltration) / **MEDIUM** (policy violation)

### 🔍 Detection Scenarios

#### Scenario A: Unusual Data Access Patterns
- Bulk download of sensitive data outside normal role
- Access to resources not related to job function
- After-hours access to PII databases

#### Scenario B: Pre-Resignation Behavior
- Increased data exports before resignation date
- Email forwarding to personal accounts
- USB device connections (if on-prem)

### 📋 Investigation Procedure

**IMPORTANT:** Coordinate with HR and Legal BEFORE taking action

1. **Verify alert legitimacy** (false positive check)
2. **Document initial findings** (preserve chain of custody)
3. **Escalate to CISO + HR Business Partner**
4. **Legal review** before any monitoring escalation
5. **Interview planning** (with HR present)

### 🛠️ Technical Investigation Commands
```sql
-- Database audit query example
SELECT user_id, action, table_name, timestamp, source_ip
FROM audit_log
WHERE user_id = '<suspected-user>'
  AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- File access logs (if integrated with SIEM)
index=soc-audit AND user="<suspected-user>" AND (action="download" OR action="export")
```

### ⚖️ Legal Considerations (Algerian Labor Law)
- Employee privacy rights must be respected
- Works council notification may be required
- Evidence must be collected legally for disciplinary action
- Consult legal before termination proceedings

---

## 6. TELECOM-SPECIFIC: SIM SWAP FRAUD

### 🎯 Objective
Stop ongoing SIM swap fraud campaign, protect affected subscribers, identify vulnerabilities.

### ⚡ Severity: **CRITICAL** (mass fraud) / **HIGH** (individual cases)

### 📱 Djezzy-Specific Context
SIM swap fraud is particularly damaging for:
- **Banking integration** (mobile money)
- **2FA bypass** (subscriber identity theft)
- **Reputation damage** (trust erosion)

### 🔔 Detection Sources
- ML anomaly detection on SSM (Subscriber Management System)
- Retail POS pattern analysis
- Subscriber complaints (unexpected service loss)
- Internal fraud reports

### 🛠️ Response Procedure

#### Immediate Actions (0-2 Hours)
```sql
-- 1. Identify suspicious SIM swaps in last 24h
SELECT swap_id, subscriber_msisdn, retail_location, 
       employee_id, timestamp, verification_method
FROM sim_swap_audit
WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND (risk_score > 70 OR verification_bypass = true);

-- 2. Lock affected accounts
UPDATE subscriber_status 
SET status = 'LOCKED', lock_reason = 'FRAUD_INVESTIGATION'
WHERE msisdn IN (<affected_list>);

-- 3. Revert fraudulent swaps (if within window)
CALL revert_sim_swap(swap_id, reason_code);
```

#### Investigation (2-24 Hours)
- [ ] Interview involved retail staff
- [ ] Review CCTV footage (retail locations)
- [ ] Check for insider involvement
- [ ] Correlate with other fraud patterns
- [ ] Notify affected subscribers proactively

#### Prevention Enhancement
- [ ] Increase verification requirements for SIM swaps
- [ ] Add delay period for high-value accounts
- [ ] Implement additional authentication factors
- [ ] Retail staff retraining

### 📞 Subscriber Communication Template
```
Subject: Important Security Notice Regarding Your Djezzy Account

Dear Valued Subscriber,

We have detected unauthorized activity on your account. As a precautionary measure:
✓ Your SIM has been reverted to its original state
✓ Your account has been temporarily secured
✓ Our team will contact you to verify your identity

If you did NOT request a SIM change, please:
1. Call our security hotline immediately: XXXX
2. Do not provide any personal information to unknown callers
3. Change passwords for linked services (banking, email, social media)

We apologize for any inconvenience and are taking steps to prevent future incidents.

Djezzy Security Team
```

---

## 📎 APPENDICES

### A. Emergency Contact List
| Role | Name | Phone | Availability |
|------|------|-------|--------------|
| CISO | Fatima B. | +213 XX XX XX XX | 24/7 |
| SOC Lead | Ahmed K. | +213 XX XX XX XX | On-call |
| Infra Lead | Karim M. | +213 XX XX XX XX | 08h-18h |
| Legal Counsel | Me. L. | +213 XX XX XX XX | Business hours |
| External IR Firm | Mandiant | +1 XXX XXX XXXXX | 24/7 Contract |
| Press Spokesperson | Communications | +213 XX XX XX XX | On-request |

### B. Command Reference Card (Print and Laminate)
```
╔══════════════════════════════════════════════════════╗
║     DJEZZY SOC - EMERGENCY COMMAND REFERENCE          ║
╠══════════════════════════════════════════════════════╣
║ ISOLATE: kubectl apply -f emergency-lockdown.yaml    ║
║ STATUS:  kubectl get pods -n soc-production          ║
║ LOGS:    kubectl logs -f -n soc-production -l app=*  ║
║ HEALTH:  curl -sk https://soc.djezzy.dz/api/health  ║
║ ESCALATE: PagerDuty → #soc-emergency Slack           ║
╚══════════════════════════════════════════════════════╝
```

### C. Post-Incident Report Template
See `/templates/post-incident-report.md`

---

**Document Classification: CONFIDENTIAL - INTERNAL USE ONLY**
**Last Updated: $(date +%Y-%m-%d)**
**Version: 1.0 - Production Ready**
**Owner: Djezzy CSIRT (Computer Security Incident Response Team)**
