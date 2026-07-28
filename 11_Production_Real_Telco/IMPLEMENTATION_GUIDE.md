# 🚀 PRODUCTION IMPLEMENTATION GUIDE
## From Demo to Real Telecom Operator Platform - Complete Technical Reference

---

## 📋 QUICK START: What You Need to Do

### Immediate Actions (This Week)

#### 1. **Database Migration** (CRITICAL PATH)
```bash
# Current: SQLite (demo only)
# Target: PostgreSQL 16 Cluster (production)

# Step 1: Set up PostgreSQL
kubectl apply -f k8s/postgresql-cluster.yaml  # Primary + 2 Replicas

# Step 2: Migrate schema
cd /home/z/my-project/11_Production_Real_Telco/database
prisma migrate deploy --name init-production --url "$DATABASE_URL"

# Step 3: Enable extensions
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Step 4: Create partitions (automated)
psql $DATABASE_URL -f scripts/create-partitions.sql
```

#### 2. **Infrastructure Setup**
```bash
# Deploy to Kubernetes
cd /home/z/my-project/10_Production_Hardening_GoLive/deployment
chmod +x deploy-production.sh
./deploy-production.sh deploy
```

#### 3. **Configure Real Integrations**
```bash
# Edit environment variables
cat > .env.production << 'EOF'
# Database
DATABASE_URL="postgresql://soc_user:PASSWORD@postgresql-primary:5432/soc_platform?schema=public"

# Redis (Session cache, pub/sub)
REDIS_URL="redis://redis-master:6379"

# Kafka (Event streaming)
KAFKA_BROKERS="kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"

# SIEM Integration (Splunk)
SPLUNK_URL="https://splunk.djezzy.dz:8089"
SPLUNK_API_KEY="your-splunk-api-key"
SPLUNK_INDEX="soc_events"
SPLUNK_HEC_TOKEN="your-hec-token"

# EDR (CrowdStrike)
CROWDSTRIKE_CLIENT_ID="your-client-id"
CROWDSTRIKE_CLIENT_SECRET="your-secret"

# Threat Intelligence (MISP)
MISP_URL="https://misp.djezzy.dz"
MISP_API_KEY="your-misp-key"

# Telecom Systems
HLR_PROBE_HOST="hlr-probe.internal.djezzy.dz"
SSM_API_URL="https://ssm-api.internal.djezzy.dz"
EOF
```

---

## 🏗️ ARCHITECTURE DIAGRAMS

### Production Deployment Topology

```
                          ┌─────────────────────────────────────┐
                          │         INTERNET / DMZ              │
                          │                                     │
  Users ──────────────────┼──► Cloudflare (DDoS/WAF)        │
                          │       │                            │
                          │       ▼                            │
                          │  ┌─────────────────────────────────┐   │
                          │  │     NGINX Ingress Controller      │   │
                          │  │  • TLS Termination (1.3)        │   │
                          │  │  • Rate Limiting               │   │
                          │  │  • Path-based Routing          │   │
                          │  └────────────┬──────────────────┘   │
                          │               │                      │
          ┌───────────────┼───────────────┤                      │
          ▼               ▼               ▼                      │
   ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
   │ API GW   │  │ Web App  │  │ Realtime │                 │
   │ (Kong)   │  │ (Next.js) │  │ (SSE)    │                 │
   └─────┬────┘  └─────┬────┘  └─────┬────┘                 │
         │             │            │                        │
         └──────────────┼────────────┘                        │
                        ▼                                     │
           ┌────────────────────────────────┐              │
           │     KUBERNETES CLUSTER           │              │
           │     Namespace: soc-production     │              │
           │                                  │              │
           │  ┌─────────────────────────────┐│              │
           │  │   Application Services       ││              │
           │  │                             ││              │
           │  │  ┌─────┐ ┌─────┐ ┌─────┐   ││              │
           │  │  │Auth │ │Alert│ │Inc. │   ││              │
           │  │  │Svc  │ │Svc  │ │Svc  │   ││              │
           │  │  │3 pod│ │5 pod│ │3 pod│   ││              │
           │  │  └─────┘ └─────┘ └─────┘   ││              │
           │  └─────────────────────────────┘│              │
           │                │                  │              │
           │  ┌─────────────┴─────────────┐  │              │
           │  │       DATA LAYER         │  │              │
           │  │                         │  │              │
           │  │  ┌──────────┐ ┌────────┐  │  │              │
           │  │  │PostgreSQL│ │ Redis  │  │  │              │
           │  │  │Primary+  │ │Cluster │  │  │              │
           │  │  │Replicas  │ │(Cache) │  │  │              │
           │  │  └──────────┘ └────────┘  │  │              │
           │  │                         │  │              │
           │  │  ┌──────────┐ ┌────────┐  │  │              │
           │  │  │   Kafka  │ │Elastic │  │  │              │
           │  │  │ (Events) │ │(Logs)  │  │  │              │
           │  │  └──────────┘ └────────┘  │  │              │
           │  └─────────────────────────────┘  │              │
           └──────────────────────────────────┘              │
                                                    │
External Systems:                                   │
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
  │   Splunk    │  │ CrowdStrike│  │    MISP     │   │
  │   (SIEM)     │  │    (EDR)    │  │  (Threat Intel)│   │
  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
         │                │                │           │
  ┌─────────────┐  ┌──────┴──────┐  ┌──────┴──────┐   │
  │   HLR/VLR   │  │    SSM      │  │ ServiceNow  │   │
  │   Probe     │  │  (Subscribers│  │  (Ticketing) │   │
  └─────────────┘  └─────────────┘  └─────────────┘   │
```

---

## 🔧 CONFIGURATION FILES

### PostgreSQL Production Config
```sql
-- postgresql.conf optimizations for heavy load
-- Apply to primary AND replicas

# Memory (adjust based on server RAM)
shared_buffers = 4GB                    # 25% of RAM
effective_cache_size = 12GB           # 75% of RAM
work_mem = 64MB                       # Per query sort/hash
maintenance_work_mem = 512MB           # VACUUM, CREATE INDEX

# Connections
max_connections = 500
superuser_reserved_connections = 5

# WAL (for replication)
wal_level = replica
max_wal_senders = 3
wal_keep_size = 10GB
checkpoint_completion_target = 0.9

# Query Planner
random_page_cost = 1.1                 # Favor index scans
effective_io_concurrency = 200        # For SSD storage

# Logging
log_min_duration_statement = 1000      # Log slow queries > 1s
log_checkpoints = on
```

### PgBouncer Configuration
```
[databases]
soc_platform = host=postgresql-primary port=5432 dbname=soc_platform

[pgbouncer]
pool_mode = transaction
max_client_conn = 2000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 50
reserve_pool_timeout = 3
max_db_connections = 100
query_timeout = 30
idle_transaction_timeout = 60
client_idle_timeout = 0
```

### Kubernetes HPA Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: soc-alert-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: soc-alert-service
  minReplicas: 5
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 5
          periodSeconds: 60
        - type: Percent
          value: 100
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 2
          periodSeconds: 120
```

---

## 📊 PERFORMANCE BENCHMARKS

### Target Metrics (Production)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Ingestion Rate** | 50,000 events/sec | Prometheus counter |
| **Query Latency (P95)** | < 2 seconds | APM tracing |
| **Concurrent Users** | 500+ active users | Application metrics |
| **Database QPS** | 10,000+ queries/sec | pg_stat_statements |
| **Alert Correlation** | < 5 sec from ingestion to alert | End-to-end timing |
| **Dashboard Load** | < 3 seconds | Browser performance API |

### Scaling Guidelines

```
Users        Alert Service Pods    DB Connections    Redis Memory
──────       ─────────────────     ───────────────    ────────────
100          3 pods               75 conn            2 GB
500          5 pods               150 conn           4 GB
1,000        10 pods              300 conn           8 GB
5,000        25 pods              750 conn           16 GB
10,000       50 pods              1,500 conn         32 GB
```

---

## 🔌 INTEGRATION SETUP GUIDES

### Splunk Setup
```bash
# 1. Create HEC token in Splunk Web UI
# Settings > Data Inputs > HTTP Event Collector > New Token

# 2. Configure index
# Settings > Indexes > Create index: soc_events
# Retention: 365 days (or per compliance requirements)

# 3. Add SOC platform as forwarder
# Settings > Forwarding > Add Forwarder

# 4. Test integration
curl -k https://your-splunk:8088/services/collector/event \
  -H "Authorization: Splunk YOUR_HEC_TOKEN" \
  -d '{"event": "test", "source": "soc-platform-test"}'
```

### CrowdStrike Falcon Setup
```bash
# 1. Create API client in Falcon Console
# Customers > API Clients & Keys > Create API Client

# 2. Configure cloud region
export CROWDSTRIKE_CLOUD_REGION="us-1"  # or eu-1, govcloud-1

# 3. Test connectivity
curl -X GET "https://api.crowdstrike.com/sensors/queries/detects/v1" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### MISP Setup
```bash
# 1. Generate automation key
# Event Actions > Automation > New Key

# 2. Configure sync settings
# Set up synchronization rules for IOC types needed

# 3. Test with sample IOC
curl -X POST "$MISP_URL/attributes/restSearch" \
  -H "Authorization: $MISP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": ["ip", "domain"], "value": "91.121.87.45"}'
```

### HLR/VLR Probe Setup
```bash
# This is telecom-specific - work with network team

# 1. Get probe credentials from NOC
# Usually MAP protocol access to HLR

# 2. Configure firewall rules
# Allow from SOC platform subnet to HLR (port 1812/MAP)

# 3. Test subscriber lookup
telnet hlr-probe.internal.djezzy.dz 1812
# Send MAP message: sendRoutingInfoForSMSC
```

---

## 🚨 MONITORING & ALERTING

### Critical Alerts to Configure

| Alert | Condition | Notification |
|-------|-----------|-------------|
| **Database Down** | PostgreSQL unreachable | PagerDuty P1 + Phone call |
| **Ingestion Lag** | Kafka consumer lag > 10K | Slack #soc-alerts |
| **High Error Rate** | 5xx rate > 5% | Email to team |
| **Memory Pressure** | Pod OOM kills > 1/hour | Auto-scale trigger |
| **Certificate Expiry** | TLS cert < 7 days | Security team email |
| **Integration Failure** | SIEM/EDR down > 5 min | On-call rotation |

### Grafana Dashboards to Import

Located in: `/home/z/my-project/10_Production_Hardening_GoLive/monitoring/grafana-dashboards/`

1. `soc-platform-overview.json` - Main operations dashboard
2. Custom dashboards you should create:
   - Database Performance
   - Integration Health
   - Alert Volume Trends
   - User Activity

---

## ✅ PRE-PRODUCTION CHECKLIST

### Week Before Go-Live
- [ ] All integrations tested with real data (not mock)
- [ ] Load test completed at 50% of expected volume
- [ ] Backup and restore tested
- [ ] Runbooks reviewed by team
- [ ] Security audit completed
- [ ] SSL certificates valid for 1+ year
- [ ] Monitoring dashboards configured
- [ ] On-call rotation established
- [ ] Stakeholder communication sent

### Day of Go-Live
- [ ] Final backup taken
- [ ] Team briefing completed
- [ ] Rollback plan documented
- [ ] Hypercare support scheduled (48h)
- [ ] Executive notification ready

---

## 📞 SUPPORT & ESCALATION

| Issue Type | First Response | Escalation |
|-----------|---------------|------------|
| Platform Down | < 15 min | Immediately to CISO |
| Integration Issue | < 1 hour | Vendor support if needed |
| Performance Degradation | < 4 hours | Infra team |
| Security Incident | Per playbook | Per severity |

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-28  
**Maintained By:** Djezzy SOC Platform Team
