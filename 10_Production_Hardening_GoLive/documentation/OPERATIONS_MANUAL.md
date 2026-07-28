# Djezzy National SOC Platform
## Production Deployment Guide & Operations Manual

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** 2026-01-28  
**Classification:** Internal - Confidential

---

## 📖 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Deployment Procedure](#3-deployment-procedure)
4. [Configuration Management](#4-configuration-management)
5. [Monitoring & Observability](#5-monitoring--observability)
6. [Security Hardening](#6-security-hardening)
7. [Operational Procedures](#7-operational-procedures)
8. [Troubleshooting Guide](#8-troubleshooting-guide)
9. [Backup & Disaster Recovery](#9-backup--disaster-recovery)
10. [Appendices](#10-appendices)

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INTERNET / DMZ                                  │
│  ┌────────────────┐    ┌─────────────────┐    ┌──────────────────┐ │
│  │   Cloudflare    │    │  WAF (ModSecurity)│   │   DDoS Protection │ │
│  │   (CDN/SSL)     │    │                 │    │                  │ │
│  └────────┬───────┘    └────────┬────────┘    └────────┬─────────┘ │
│           │                      │                       │          │
├───────────┼──────────────────────┼───────────────────────┼──────────┤
│           ▼                      ▼                       ▼          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    KUBERNETES CLUSTER                           │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │              NGINX INGRESS CONTROLLER                   │  │ │
│  │  │         (TLS Termination, Rate Limiting)                │  │ │
│  │  └────────────────────────┬────────────────────────────────┘  │ │
│  │                           │                                   │ │
│  │  ┌────────────────────────┴────────────────────────────────┐  │ │
│  │  │               SOC PRODUCTION NAMESPACE                  │  │ │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  │ │
│  │  │  │   Web    │  │   API    │  │  Worker  │  │  Real-  │ │  │ │
│  │  │  │   App    │  │ Server   │  │  Nodes   │  │  time   │ │  │ │
│  │  │  │ (3 pods) │  │ (3 pods) │  │ (2 pods) │  │ (SSE)   │ │  │ │
│  │  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │  │ │
│  │  │       └──────────────┼────────────┘             │       │  │ │
│  │  │                      │                          │       │  │ │
│  │  │  ┌───────────────────┴──────────────────────────┐      │  │ │
│  │  │  │              DATA LAYER                      │      │  │ │
│  │  │  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │      │  │ │
│  │  │  │  │PostgreSQL│  │  Redis  │  │ Object Store │ │      │  │ │
│  │  │  │  │(Primary +│  │ (Cache) │  │  (MinIO/S3)  │ │      │  │ │
│  │  │  │  │ Replica) │  │         │  │             │ │      │  │ │
│  │  │  │  └─────────┘  └─────────┘  └─────────────┘ │      │  │ │
│  │  │  └─────────────────────────────────────────────┘      │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │              MONITORING NAMESPACE                        │  │ │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐  │  │ │
│  │  │  │Prometheus│  │ Grafana │  │ AlertMgr│  │ Loki/EFK  │  │  │ │
│  │  │  └─────────┘  └─────────┘  └─────────┘  └───────────┘  │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────┤
│                        INTERNAL NETWORK                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │   SIEM     │  │   EDR      │  │  Threat    │  │   LDAP/    │  │
│  │ (Splunk)   │  │ (CrowdStrike)│  │ Intel     │  │   AD       │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Frontend | Next.js 16 | 16.x | React-based UI |
| Runtime | Node.js | 20 LTS | Application runtime |
| Database | PostgreSQL | 16.x | Primary data store |
| Cache | Redis | 7.x | Session caching, pub/sub |
| Container | Kubernetes | 1.28+ | Orchestration |
| Ingress | NGINX | 1.24+ | Reverse proxy, TLS |
| Monitoring | Prometheus | 2.50+ | Metrics collection |
| Visualization | Grafana | 10.x | Dashboards |
| Logging | Loki | 2.9+ | Log aggregation |
| Secrets | HashiCorp Vault | 1.15+ | Secret management |

### 1.3 Environment Details

| Environment | Cluster | Domain | Purpose |
|-------------|---------|--------|---------|
| Development | k8s-dev | soc-dev.djezzy.dz | Development testing |
| Staging | k8s-staging | soc-staging.djezzy.dz | Pre-production validation |
| **Production** | **k8s-prod** | **soc.djezzy.dz** | **Live operations** |

---

## 2. Prerequisites

### 2.1 Infrastructure Requirements

#### Kubernetes Cluster
- **Version:** 1.28 or higher
- **Nodes:** Minimum 3 worker nodes (production: 6+ recommended)
- **Resources per node:**
  - CPU: 8 cores minimum (16 recommended)
  - RAM: 32GB minimum (64GB recommended)
  - Storage: 100GB SSD for system, additional PV for data

#### External Dependencies
- PostgreSQL 16 instance (managed or self-hosted)
- Redis 7 instance (with persistence enabled)
- DNS records configured:
  ```
  soc.djezzy.dz        → A record → Ingress LB IP
  *.soc.djezzy.dz      → CNAME → soc.djezzy.dz
  api.soc.djezzy.dz    → CNAME → soc.djezzy.dz
  ```

### 2.2 Access Requirements

| Role | Access Needed | Tools |
|------|--------------|-------|
| DevOps | Kubernetes admin, Helm, Git | kubectl, helm, git |
| SOC Analyst | Application access only | Browser, API tokens |
| DBA | Database admin | psql, database GUI |
| Security | Audit logs, configs | SIEM integration |

### 2.3 Software Prerequisites

```bash
# Required CLI tools
kubectl version --client  # >= 1.28
helm version            # >= 3.12
git version             # >= 2.40
openssl version         # >= 3.0

# Optional but recommended
cmctl version           # cert-manager CLI
k9s                    # Kubernetes TUI
stern                   # Multi-pod log tailing
```

---

## 3. Deployment Procedure

### 3.1 Standard Deployment

```bash
#!/bin/bash
# Standard deployment procedure for SOC Platform

# 1. Clone repository
git clone https://github.com/LAIDOUDI33/NetOP.git
cd NetOP

# 2. Configure environment
export KUBECONFIG=~/.kube/soc-production.config
export HELM_NAMESPACE=soc-production

# 3. Install/upgrade dependencies
cd helm/soc-platform
helm dependency update

# 4. Deploy (dry-run first)
helm upgrade --install soc-platform . \
  -f values.yaml \
  -f values-production.yaml \
  --namespace $HELM_NAMESPACE \
  --dry-run \
  --debug

# 5. Actual deployment
helm upgrade --install soc-platform . \
  -f values.yaml \
  -f values-production.yaml \
  --namespace $HELM_NAMESPACE \
  --wait \
  --timeout 10m \
  --atomic \
  --cleanup-on-fail

# 6. Verify deployment
kubectl get pods -n $HELM_NAMESPACE -l app=soc-platform
kubectl get ingress -n $HELM_NAMESPACE
```

### 3.2 Rolling Update Strategy

The platform uses a rolling update strategy to ensure zero downtime:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # Add 1 pod at a time
    maxUnavailable: 0  # No pods should be unavailable during update
```

**Update Process:**
1. New pods start with new image version
2. Health checks must pass for new pods
3. Old pods are terminated only after new ones are ready
4. Repeat until all pods updated

### 3.3 Rollback Procedure

```bash
# View deployment history
helm history soc-platform -n soc-production

# Rollback to previous revision
helm rollback soc-platform <REVISION_NUMBER> -n soc-production

# Emergency rollback (if helm not working)
kubectl rollout undo deployment/soc-platform -n soc-production

# Verify rollback success
kubectl rollout status deployment/soc-platform -n soc-production
```

---

## 4. Configuration Management

### 4.1 Configuration Files

All configuration is managed through Helm values files:

```
helm/soc-platform/
├── values.yaml              # Default values (committed to repo)
├── values-production.yaml   # Production overrides (encrypted in repo)
└── values-secrets.yaml      # Sensitive data (NOT in repo, from Vault)
```

### 4.2 Environment Variables

Key environment variables (set via ConfigMap/Secret):

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection URL | `redis://redis-master:6379` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Random 32-char string |
| `ENCRYPTION_KEY` | Data encryption key | AES-256 key |
| `SIEM_ENDPOINT` | SIEM API endpoint | `https://siem.internal/api` |
| `LOG_LEVEL` | Logging verbosity | `info`, `debug`, `error` |

### 4.3 Secret Management

**NEVER commit secrets to the repository!**

Use one of these methods:

1. **HashiCorp Vault (Recommended):**
   ```bash
   vault kv put soc-platform/database password="super-secret"
   ```

2. **Kubernetes Secrets (Encrypted):**
   ```bash
   # Create sealed secret
   kubectl create secret generic soc-secrets \
     --from-literal=db-password='xxx' \
     --dry-run=client -o yaml | kubeseal --format yaml > sealed-secret.yaml
   ```

3. **Helm Secrets:**
   ```bash
   # Encrypt values file
   helm secrets enc values-secrets.yaml
   
   # Deploy with secrets
   helm upgrade soc-platform . --helm-secrets-values values-secrets.yaml
   ```

---

## 5. Monitoring & Observability

### 5.1 Key Metrics to Monitor

#### Application Metrics
```promql
# Request rate
sum(rate(http_requests_total{job="soc-platform"}[5m]))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ sum(rate(http_requests_total[5m])) * 100

# Latency percentiles
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

#### Infrastructure Metrics
```promql
# Pod CPU usage
sum(rate(container_cpu_usage_seconds_total{namespace="soc-production"}[5m])) by (pod)

# Pod memory usage
container_memory_working_set_bytes{namespace="soc-production"} / container_spec_memory_limit_bytes{namespace="soc-production"}

# Database connections
pg_stat_activity_count{datname="soc_platform"}
```

### 5.2 Dashboard URLs

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| SOC Overview | grafana.djezzy.dz/d/soc-overview | Main operational dashboard |
| Infrastructure | grafana.djezzy.dz/d/soc-infra | K8s resources, pods, nodes |
| Database | grafana.djezzy.dz/soc-db | PostgreSQL metrics |
| Alerts | grafana.djezzy.dz/alerting | Active alert history |

### 5.3 Alert Channels

| Severity | Channel | Response Time Target |
|----------|---------|---------------------|
| Critical | PagerDuty + Phone call | < 15 minutes |
| Warning | Slack #soc-alerts + Email | < 1 hour |
| Info | Slack #soc-info only | Next business day |

---

## 6. Security Hardening

### 6.1 Implemented Security Measures

✅ **Network Security**
- Network policies (deny-all default, explicit allow)
- TLS 1.3 only (TLS 1.0-1.2 disabled)
- WAF rules enabled (OWASP Core Rule Set)

✅ **Pod Security**
- Restricted Pod Security Standards (no root, read-only FS)
- Resource limits and requests set
- Service accounts with minimal RBAC

✅ **Application Security**
- CSP headers configured
- CORS restricted to allowed origins
- Rate limiting on all endpoints
- Input validation and sanitization

✅ **Data Protection**
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PII fields encrypted in database
- Audit logging enabled

### 6.2 Security Checklist (Pre-Production)

Run this checklist before every deployment:

```bash
#!/bin/bash
echo "=== Security Pre-Flight Check ==="

# Check TLS certificate validity
echo "Checking TLS certificates..."
curl -vvI https://soc.djezzy.dz 2>&1 | grep "SSL certificate"

# Check security headers
echo "Checking security headers..."
curl -I https://soc.djezzy.dz | grep -E "(X-Frame|X-Content|Strict)"

# Check for exposed debug endpoints
echo "Checking for exposed debug endpoints..."
for endpoint in /debug /metrics /api/debug; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" "https://soc.djezzy.dz$endpoint")
  echo "$endpoint: $code"
done

# Check pod security context
echo "Checking pod security contexts..."
kubectl get pods -n soc-production -o json | jq '.items[].spec.securityContext'

echo "=== Pre-flight complete ==="
```

---

## 7. Operational Procedures

### 7.1 Daily Operations

| Task | Frequency | Command/Action |
|------|-----------|----------------|
| Check pod health | Every hour | `kubectl get pods -n soc-production` |
| Review error logs | Morning | Check Grafana error dashboard |
| Backup verification | Daily | Verify backup completion in logs |
| Certificate expiry check | Weekly | `kubectl get certificates -n soc-production` |
| Capacity planning | Monthly | Review resource utilization trends |

### 7.2 Common Operational Tasks

#### Scaling the Application
```bash
# Scale horizontally (add more replicas)
kubectl scale deployment soc-platform -n soc-production --replicas=5

# Scale vertically (increase resources)
kubectl patch deployment soc-platform -n soc-production -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "app",
          "resources": {
            "limits": {"cpu": "2", "memory": "4Gi"},
            "requests": {"cpu": "500m", "memory": "512Mi"}
          }
        }]
      }
    }
  }
}'
```

#### Viewing Logs
```bash
# All pods logs
kubectl logs -f -n soc-production -l app=soc-platform

# Specific pod logs
kubectl logs -f <pod-name> -n soc-production --tail=100

# Logs with errors only
kubectl logs -n soc-production -l app=soc-platform | grep -i error

# Previous container logs (after restart)
kubectl logs <pod-name> -n soc-production --previous
```

#### Executing Commands in Pods
```bash
# Shell into a pod
kubectl exec -it <pod-name> -n soc-production -- /bin/sh

# Run single command
kubectl exec <pod-name> -n soc-platform -- env | grep DATABASE

# Copy files from/to pod
kubectl cp soc-production/<pod-name>:/app/logs ./local-logs
```

### 7.3 Maintenance Windows

**Scheduled Maintenance:**
- **Weekly:** Sundays 02:00-04:00 AM (Algeria time)
- **Monthly:** First Sunday of month 00:00-06:00 AM (major updates)

**Maintenance Mode Activation:**
```bash
# Enable maintenance mode (show maintenance page)
kubectl annotate ingress soc-platform nginx.ingress.kubernetes.io/maintenance-page="/maintenance.html" --overwrite

# Or scale to zero (if no incoming connections)
kubectl scale deployment soc-platform -n soc-production --replicas=0
```

---

## 8. Troubleshooting Guide

### 8.1 Common Issues & Solutions

#### Issue: Pods stuck in CrashLoopBackOff
```bash
# Diagnose
kubectl describe pod <pod-name> -n soc-production
kubectl logs <pod-name> -n soc-platform --previous

# Common causes:
# 1. Database unreachable → Check DB connectivity
# 2. Missing config/secret → Verify ConfigMaps exist
# 3. OOMKilled → Increase memory limit
```

#### Issue: High Memory Usage
```bash
# Check memory usage
kubectl top pods -n soc-production --sort-by=memory

# If memory leak suspected, restart:
kubectl rollout restart deployment/soc-platform -n soc-production
```

#### Issue: 502 Bad Gateway from Ingress
```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Check backend service endpoints
kubectl get endpoints soc-platform -n soc-production

# Common fix: No healthy backend pods
kubectl describe svc soc-platform -n soc-production
```

#### Issue: Database Connection Errors
```bash
# Test DB connectivity from app pod
kubectl run db-test --image=postgres:16 --rm -it --restart=Never -- \
  psql $DATABASE_URL -c "SELECT 1"

# Check DB pod status
kubectl get pods -n soc-production -l app=postgresql

# Review DB logs
kubectl logs -n soc-production -l app=postgresql
```

### 8.2 Debugging Checklist

When an issue is reported:

1. **Is it reproducible?** Try to reproduce in staging
2. **When did it start?** Check deployment/change history
3. **What changed?** Recent deployments, config changes?
4. **Scope?** All users, specific users, specific features?
5. **Error messages?** Check browser console, application logs
6. **Dependencies?** Is DB/Redis/cache accessible?

---

## 9. Backup & Disaster Recovery

### 9.1 Backup Strategy

| Data Type | Method | Frequency | Retention |
|-----------|--------|-----------|-----------|
| PostgreSQL | pg_dump (full) | Hourly | 30 days |
| PostgreSQL | WAL archiving | Continuous | 7 days |
| Redis | RDB snapshot | Every 6 hours | 7 days |
| Kubernetes manifests | Velero | Daily | 14 days |
| ConfigMaps/Secrets | Manual export | On change | 30 days |

### 9.2 Backup Commands

```bash
# Database backup
kubectl exec postgresql-0 -n soc-production -- pg_dump -U soc_user soc_platform | gzip > backup-$(date +%Y%m%d).sql.gz

# Kubernetes resources backup
velero create backup soc-daily --include-namespaces soc-production

# Secrets backup (encrypt before storing!)
kubectl get secrets -n soc-production -o yaml > secrets-backup-$(date +%Y%m%d).yaml.enc
```

### 9.3 Recovery Procedures

#### Database Recovery
```bash
# Stop application (prevent writes)
kubectl scale deployment soc-platform -n soc-production --replicas=0

# Restore from backup
gunzip -c backup-YYYYMMDD.sql.gz | kubectl exec -i postgresql-0 -n soc-production -- psql -U soc_user soc_platform

# Restart application
kubectl scale deployment soc-platform -n soc-production --replicas=3
```

#### Full DR (Disaster Recovery)
```bash
# Restore entire namespace from Velero backup
velero restore create soc-dr-restore --backup soc-daily

# Verify all components running
kubectl get all -n soc-production

# Test application functionality
curl -sk https://soc.djezzy.dz/api/health
```

### 9.4 DR Testing Schedule

- **Tabletop Exercise:** Quarterly (simulation walkthrough)
- **Restore Test:** Monthly (restore to separate environment)
- **Full DR Drill:** Annually (complete failover test)

---

## 10. Appendices

### A. Useful Commands Reference

```bash
# Quick status overview
alias soc-status='kubectl get all -n soc-production && echo "---" && kubectl top pods -n soc-production'

# Port-forward to local machine
kubectl port-forward svc/soc-platform 3000:80 -n soc-production

# Watch pod events
kubectl get events -n soc-production -w --sort-by='.lastTimestamp'

# Force pod restart without changing deployment
kubectl delete pod -l app=soc-platform -n soc-platform

# Find pods using most CPU
kubectl top pods -n soc-production --sort-by=cpu | head -5
```

### B. File Locations

| Path | Contents |
|------|----------|
| `/home/z/my-project/helm/soc-platform/` | Helm charts and values |
| `/home/z/my-project/k8s/` | Base Kubernetes manifests |
| `/home/z/my-project/10_Production_Hardening_GoLive/` | Production hardening configs |
| `/var/log/soc-platform/` | Application logs (on host) |
| `/backups/soc-platform/` | Backup storage location |

### C. Contact Information

| Team | Contact Method | When to Contact |
|------|---------------|----------------|
| Platform Team | #soc-platform Slack | Bugs, features, deployment issues |
| Security Team | security@djezzy.dz | Vulnerabilities, incidents |
| Infra Team | infra@djezzy.dz | Cluster, network, hardware issues |
| On-Call | PagerDuty rotation | Emergencies outside business hours |

### D. Change Log

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-28 | 1.0 | SOC Team | Initial production release |

---

**END OF DOCUMENT**

*This document is maintained by the Djezzy SOC Platform team. For questions or updates, contact soc-team@djezzy.dz*
