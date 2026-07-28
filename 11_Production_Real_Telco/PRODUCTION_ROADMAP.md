# 🚀 Djezzy National SOC - Production Readiness Roadmap
## From Demo to Real Telecom Operator Platform

**Version:** 1.0  
**Target:** Production deployment handling 50K+ events/second, 500+ concurrent users  
**Timeline:** 12-16 weeks to full production

---

## 📊 EXECUTIVE SUMMARY: Current State vs Production Target

| Metric | Current (Demo) | Production Target | Gap |
|--------|---------------|-------------------|-----|
| **Database** | SQLite (single file) | PostgreSQL Cluster (multi-AZ) | 🔴 Critical |
| **Events/sec** | ~100 (mock data) | 50,000+ | 🔴 Critical |
| **Concurrent Users** | 10-20 | 500+ | 🔴 Critical |
| **Data Retention** | 7 days | 2+ years (hot), 7 years (cold) | 🔴 Critical |
| **Tool Integration** | Mock APIs only | Real SIEM/EDR/TI platforms | 🔴 Critical |
| **Availability** | Single node | 99.99% (4.3 min/month downtime) | 🔴 Critical |
| **Disaster Recovery** | None | RPO < 1h, RTO < 4h | 🔴 Critical |
| **Telecom Integration** | Simulated | Real HLR/VLR/SSM/OSS/BSS | 🟡 Partial |

---

## 🎯 PHASE-BY-PHASE IMPLEMENTATION PLAN

### **PHASE A: Database Architecture (Weeks 1-4)** ⏱️ CRITICAL PATH

#### A1. PostgreSQL Migration & Optimization

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DATABASE ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐         │
│   │   Primary    │◄───│   Replica 1  │◄───│   Replica 2  │         │
│   │  (Read-Write)│     │  (Read-Only)│     │  (Read-Only)│         │
│   │              │     │             │     │             │         │
│   │ • Alerts     │     │ • Dashboards│     │ • Reports    │         │
│   │ • Incidents  │     │ • Analytics │     │ • Backups    │         │
│   │ • Users      │     │             │     │             │         │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘         │
│          │                    │                    │                  │
│          └────────────────────┼────────────────────┘                  │
│                               │                                       │
│                    ┌──────────▼──────────┐                           │
│                    │    PgBouncer Pool    │                          │
│                    │  (Connection Pooling)│                          │
│                    └──────────┬──────────┘                           │
│                               │                                       │
│              ┌────────────────┼────────────────┐                     │
│              ▼                ▼                ▼                     │
│       ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│       │ API Servers │  │ Workers    │  │ Analytics  │               │
│       │ (300 conn) │  │ (200 conn) │  │ (100 conn) │               │
│       └────────────┘  └────────────┘  └────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### A2. Schema Optimization for Heavy Load

**Current Problem:** 
- SQLite cannot handle concurrent writes
- No partitioning for time-series data
- No connection pooling
- Single point of failure

**Production Solution:**

```sql
-- ============================================================
-- PARTITIONING STRATEGY FOR TIME-SERIES TABLES
-- ============================================================

-- ALERTS TABLE: Partitioned by month (retains 2 years hot data)
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    severity        VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')),
    status          VARCHAR(30) NOT NULL DEFAULT 'NEW',
    alert_type      VARCHAR(30),
    source          VARCHAR(100) NOT NULL,
    source_ip       INET,
    dest_ip         INET,
    raw_event       JSONB,                    -- Flexible schema for different sources
    ioc_ids         UUID[],
    incident_id     UUID REFERENCES incidents(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Add indexes for common queries
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (automated via script)
CREATE TABLE alerts_2026_01 PARTITION OF alerts
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
    
CREATE TABLE alerts_2026_02 PARTITION OF alerts
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- ... continue for 24 months

-- Indexes optimized for telecom-scale queries
CREATE INDEX idx_alerts_severity_status ON alerts(severity, status)
    WHERE created_at > NOW() - INTERVAL '7 days';
    
CREATE INDEX idx_alerts_source_time ON alerts(source, created_at DESC)
    WHERE status = 'NEW';
    
CREATE INDEX idx_alerts_incident_id ON alerts(incident_id)
    WHERE incident_id IS NOT NULL;

-- GIN index for JSONB queries on raw_event
CREATE INDEX idx_alerts_raw_event ON alerts USING GIN(raw_event);

-- SECURITY EVENTS TABLE: Partitioned by DAY (high volume!)
CREATE TABLE security_events (
    id              BIGSERIAL,
    event_id        VARCHAR(100) UNIQUE,     -- External event ID from SIEM
    timestamp       TIMESTAMPTZ NOT NULL,
    event_type      VARCHAR(50) NOT NULL,    -- auth, network, endpoint, cloud
    severity        VARCHAR(20),
    source_ip       INET,
    dest_ip         INET,
    source_port     INT,
    dest_port       INT,
    protocol        VARCHAR(20),
    user_id         VARCHAR(100),
    asset_id        VARCHAR(100),
    raw_log         TEXT,
    normalized      JSONB,                   -- Parsed and normalized fields
    tags            TEXT[],
    processed       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Daily partitions for security events (expect millions/day)
-- Automated partition creation job runs nightly
CREATE OR REPLACE FUNCTION create_daily_partition(table_name text, partition_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    start_date text;
    end_date text;
BEGIN
    partition_name := table_name || '_' || to_char(partition_date, 'YYYY_MM_DD');
    start_date := to_char(partition_date, 'YYYY-MM-DD');
    end_date := to_char(partition_date + INTERVAL '1 day', 'YYYY-MM-DD');
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
        FOR VALUES FROM (%L) TO (%l)',
        partition_name, table_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;

-- TELECOM-SPECIFIC TABLES
CREATE TABLE cdr_events (
    id                  BIGSERIAL,
    call_id             UUID NOT NULL,
    calling_number      VARCHAR(20) NOT NULL,   -- MSISDN format
    called_number       VARCHAR(20) NOT NULL,
    imsi                VARCHAR(20),
    imei                VARCHAR(20),
    call_type           VARCHAR(10),           -- voice, sms, data, uussd
    start_time          TIMESTAMPTZ NOT NULL,
    duration_seconds    INT,
    cell_id             VARCHAR(20),           -- Cell tower identifier
    lac                 VARCHAR(10),           -- Location Area Code
    switch_id           VARCHAR(50),
    fraud_indicators    JSONB,                 -- ML-detected anomalies
    risk_score          FLOAT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (start_time);

-- Index for fraud detection queries
CREATE INDEX idx_cdr_fraud_risk ON cdr_events(risk_score DESC)
    WHERE risk_score > 70 AND created_at > NOW() - INTERVAL '24 hours';
    
CREATE INDEX idx_cdr_caller_time ON cdr_events(calling_number, start_time DESC);

-- SUBSCRIBER ACTIVITY TABLE (for SIM swap detection)
CREATE TABLE subscriber_activity (
    id                  BIGSERIAL,
    msisdn              VARCHAR(20) NOT NULL,
    imsi                VARCHAR(20),
    activity_type       VARCHAR(50) NOT NULL,  -- sim_swap, location_update, call, sms
    channel             VARCHAR(30),           -- retail, app, ussd, api
    retail_location_id  VARCHAR(20),
    employee_id         VARCHAR(20),
    previous_sim_serial VARCHAR(30),
    new_sim_serial      VARCHAR(30),
    verification_method VARCHAR(30),
    risk_factors        JSONB,
    is_suspicious       BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Composite index for real-time fraud detection
CREATE INDEX idx_subscriber_activity_realtime 
    ON subscriber_activity(msisdn, activity_type, created_at DESC)
    WHERE created_at > NOW() - INTERVAL '1 hour';

-- IOC DATABASE (Threat Intelligence)
CREATE TABLE iocs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    value               VARCHAR(500) NOT NULL,
    type                VARCHAR(20) NOT NULL CHECK (type IN ('ip','domain','url','hash','email','phone','imsi','imei')),
    confidence          INT CHECK (confidence BETWEEN 0 AND 100),
    source              VARCHAR(100) NOT NULL,
    threat_type         VARCHAR(50),
    malware_family      VARCHAR(100),
    first_seen          TIMESTAMPTZ,
    last_seen           TIMESTAMPTZ,
    expiration_date     TIMESTAMPTZ,
    tags                TEXT[],
    context             JSONB,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(value, type)
);

-- GIN index for fast IOC lookups
CREATE INDEX idx_iocs_value_type ON iocs(value, type) WHERE is_active = true;

-- Materialized view for dashboard stats (refreshes every 5 min)
CREATE MATERIALIZED VIEW mv_soc_dashboard_stats AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'NEW') as new_alerts,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND status != 'RESOLVED') as critical_open,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND status = 'NEW') as critical_new,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as alerts_last_hour,
    COUNT(DISTINCT incident_id) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as incidents_24h,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_resolution_time_hours
FROM alerts
WHERE created_at > NOW() - INTERVAL '30 days';

CREATE UNIQUE INDEX mv_dashboard_stats_unique ON mv_dashboard_stats((true));

-- Refresh policy (PostgreSQL 16+)
ALTER MATERIALIZED VIEW mv_soc_dashboard_stats SET (refresh_materialized_view_continuously);
```

#### A3. Connection Pooling Configuration

```yaml
# PgBouncer Configuration for Heavy Load
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
max_user_connections = 100

# Timeouts
server_connect_timeout = 5
server_idle_timeout = 300
client_idle_timeout = 0
query_timeout = 30
idle_transaction_timeout = 60

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

---

### **PHASE B: Real Tool Integration (Weeks 5-8)**

#### B1. SIEM Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SIEM INTEGRATION LAYER                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│   │   Splunk    │  │   ELK Stack │  │   QRadar    │             │
│   │  Enterprise │  │  (Elastic)  │  │  (IBM)      │             │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│          │                │                │                      │
│          └────────────────┼────────────────┘                      │
│                           │                                        │
│                    ┌──────▼──────┐                                 │
│                    │  Normalizer │  ← Unified Event Format        │
│                    │   Service   │                                 │
│                    └──────┬──────┘                                 │
│                           │                                        │
│              ┌────────────┼────────────┐                          │
│              ▼            ▼            ▼                          │
│       ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│       │  Kafka   │  │  Redis   │  │ Postgres│                   │
│       │  Queue   │  │  Stream  │  │  Write  │                   │
│       └──────────┘  └──────────┘  └──────────┘                   │
│                                                                     │
│   Supported SIEMs:                                                 │
│   • Splunk Enterprise Security (REST API + HEC)                    │
│   • Elastic Stack (Elasticsearch + Logstash + Kibana)             │
│   • IBM QRadar (API + Ariel)                                      │
│   • Microsoft Sentinel (Azure)                                    │
│   • Open-source: Wazuh, OSSIM, SecurityOnion                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Integration Code Example (Splunk):**

```typescript
// src/lib/integrations/siem/splunk.ts

import SplunkSdk from '@splunk/splunk-sdk';

export class SplunkIntegration {
  private client: any;
  private config: {
    url: string;
    token: string;
    index: string;
  };

  constructor(config: { url: string; token: string; index: string }) {
    this.config = config;
    this.client = new SplunkSdk.Service({
      scheme: 'https',
      host: new URL(config.url).hostname,
      port: 443,
      token: config.token
    });
  }

  /**
   * Fetch alerts from Splunk with real-time streaming
   * Handles 50K+ events per second via HEC (HTTP Event Collector)
   */
  async fetchAlerts(params: {
    searchQuery: string;
    earliestTime: string;
    latestTime: string;
    maxResults?: number;
  }): Promise<NormalizedAlert[]> {
    const service = await this.client.login();
    
    // Use Jobs API for large result sets
    const job = await service.createJob({
      search: `index=${this.config.index} ${params.searchQuery}`,
      earliest_time: params.earliestTime,
      latest_time: params.latestTime,
      exec_mode: 'blocking',
      max_count: params.maxResults || 10000
    });

    const results = await job.results({
      count: params.maxResults || 10000,
      output_mode: 'json'
    });

    // Normalize Splunk events to our schema
    return results.map(event => this.normalizeSplunkEvent(event));
  }

  /**
   * Stream events in real-time using HEC (High-performance)
   * For ingesting external alerts into our platform
   */
  async streamEventsToHEC(events: Array<{
    event: Record<string, any>;
    sourcetype?: string;
    source?: string;
    host?: string;
  }>): Promise<{ success: boolean; count: number }> {
    const HEC_URL = `${this.config.url}/services/collector/event`;
    
    const response = await fetch(HEC_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Splunk ${this.config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(events)
    });

    return {
      success: response.ok,
      count: events.length
    };
  }

  private normalizeSplunkEvent(event: any): NormalizedAlert {
    return {
      id: this.generateId(event),
      title: event.title || event.signature || 'Unknown Alert',
      description: event.description || event.search,
      severity: this.mapSeverity(event.severity),
      status: 'NEW',
      alertType: this.mapAlertType(event.eventtype || event.category),
      source: 'splunk',
      sourceIp: event.src_ip || event.src,
      destIp: event.dest_ip || event.dest,
      rawEvent: event._raw || event,
      mitreTactics: event.mitre_tactic,
      mitreTechniques: event.mitre_technique,
      firstSeen: new Date(event._time || event.timestamp),
      lastSeen: new Date(event._time || event.timestamp),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
```

#### B2. EDR Integration (CrowdStrike / SentinelOne)

```typescript
// src/lib/integrations/edr/crowdstrike.ts

interface EDRDetection {
  detection_id: string;
  severity: string; // Critical, High, Medium, Low, Informational
  tactic: string;   // MITRE ATT&CK tactic
  technique: string;
  device_hostname: string;
  device_ip: string;
  filename: string;
  command_line: string;
  user_name: string;
  process_path: string;
  md5: string;
  sha256: string;
  ioc_type: string;
  ioc_value: string;
  timestamp: string;
}

export class CrowdStrikeIntegration {
  private baseUrl: string;
  private apiKey: string;

  async fetchDetections(params: {
    startTime: string;
    endTime: string;
    severity?: string[];
    limit?: number;
  }): Promise<EDRDetection[]> {
    const response = await fetch(
      `${this.baseUrl}/detects/queries/detects/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: this.buildFilter(params),
          limit: params.limit || 1000,
          sort: 'timestamp|desc'
        })
      }
    );

    const data = await response.json();
    return data.resources;
  }

  async isolateHost(deviceId: string): Promise<{ success: boolean; taskId: string }> {
    const response = await fetch(
      `${this.baseUrl}/devices/entities/devices-actions/v2`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action_parameters: [
            {
              name: 'contain_in_isolation',
              value: true
            }
          ],
          ids: [deviceId]
        })
      }
    );

    const data = await response.json();
    return {
      success: data.errors?.length === 0,
      taskId: data.resources?.[0]?.id
    };
  }

  async getFileSandboxAnalysis(sha256: string): Promise<SandboxResult> {
    // Submit file to CrowdStrike Falcon Sandbox for analysis
    const submitResponse = await fetch(
      `${this.baseUrl}/samples/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sandbox: [{
            sha256: sha256,
            environment_id: 200, // Windows 11
            submit_name: 'SOC Analysis',
            action_script: 'default'
          }]
        })
      }
    );

    return submitResponse.json();
  }
}
```

#### B3. Threat Intelligence Platforms

```typescript
// src/lib/integrations/threat-intel/misp.ts

export class MISPIntegration {
  private baseUrl: string;
  private apiKey: string;

  /**
   * Push IOCs extracted from hunting sessions to MISP
   */
  async pushIOCsToMISP(iocs: Array<{
    value: string;
    type: string;
    category: string;
    comment: string;
    tags: string[];
  }>, eventInfo: string): Promise<string> {
    // Create MISP Event
    const eventResponse = await fetch(`${this.baseUrl}/events`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        Event: {
          info: eventInfo,
          distribution: 0, // Organization only
          threat_level_id: 3, // High
          analysis: 2, // Completed
          published: false,
          Attribute: iocs.map(ioc => ({
            value: ioc.value,
            type: ioc.type,
            category: ioc.category,
            comment: ioc.comment,
            Tag: ioc.tags.map(tag => ({ name: tag }))
          }))
        }
      })
    });

    const eventData = await eventResponse.json();
    return eventData.Event.id;
  }

  /**
   * Enrich IOCs with MISP data
   */
  async enrichIOC(iocValue: string, iocType: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/attributes/restSearch`,
      {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          type: [iocType],
          value: iocValue,
          includeContext: true,
          includeCorrelations: true
        })
      }
    );

    return response.json();
  }
}
```

#### B4. Telecom-Specific Integrations

```typescript
// src/lib/integrations/telecom/hlr-vlr-probe.ts

/**
 * HLR/VLR Probe Integration for Real-time Subscriber Tracking
 * Used for SIM swap fraud detection and subscriber validation
 */

interface HLRLookupResult {
  msisdn: string;
  imsi: string;
  currentLocation: {
    mscAddress: string;
    vlrNumber: string;
    lac: string;
    cellId: string;
  };
  subscriptionStatus: 'active' | 'suspended' | 'deactivated' | 'roaming';
  roamingStatus: 'home' | 'international' | 'national';
  lastLocationUpdate: Date;
  simSerialNumber: string;
}

export class HLRVLRProbe {
  private probeConfig: {
    hlrHost: string;
    hlrPort: number;
    protocol: 'MAP' | 'LDAP' | 'REST';
    authentication: {
      username: string;
      password: string;
      accessCode: string;
    };
  };

  /**
   * Real-time subscriber lookup for fraud investigation
   * Response time target: < 500ms
   */
  async lookupSubscriber(msisdn: string): Promise<HLRLookupResult> {
    switch (this.probeConfig.protocol) {
      case 'MAP':
        return this.mapLookup(msisdn);
      case 'REST':
        return this.restApiLookup(msisdn);
      case 'LDAP':
        return this.ldapLookup(msisdn);
      default:
        throw new Error(`Unsupported protocol: ${this.probeConfig.protocol}`);
    }
  }

  /**
   * Get SIM change history for fraud analysis
   */
  async getSIMChangeHistory(
    msisdn: string, 
    daysBack: number = 30
  ): Promise<Array<{
    changeDate: Date;
    oldSimSerial: string;
    newSimSerial: string;
    changeChannel: string;
    retailLocation: string;
    employeeId: string;
    verificationMethod: string;
  }>> {
    // Query SSM (Subscriber Management System) for SIM change audit trail
    const response = await fetch(`${process.env.SSM_API_URL}/subscribers/${msisdn}/sim-history`, {
      headers: { 'Authorization': `Bearer ${await this.getSSMToken()}` }
    });

    if (!response.ok) {
      throw new Error(`SSM API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Validate if current SIM matches expected (fraud check)
   */
  async validateSIMIntegrity(msisdn: string, expectedImSI: string): Promise<{
    isValid: boolean;
    currentIMSI: string;
    lastSwapDate?: Date;
    suspiciousIndicators: string[];
  }> {
    const subscriber = await this.lookupSubscriber(msisdn);
    const isValid = subscriber.imsi === expectedImSI;
    
    // Check recent SIM changes
    const simHistory = await this.getSIMChangeHistory(msisdn, 7);
    const suspiciousIndicators: string[] = [];
    
    if (simHistory.length > 2) {
      suspiciousIndicators.push('Multiple SIM changes in 7 days');
    }
    
    const recentChanges = simHistory.filter(
      s => new Date(s.changeDate) > new Date(Date.now() - 24*60*60*1000)
    );
    if (recentChanges.length > 0) {
      suspiciousIndicators.push('SIM changed within last 24 hours');
    }

    return {
      isValid,
      currentIMSI: subscriber.imsi,
      lastSwapDate: simHistory[0]?.changeDate,
      suspiciousIndicators
    };
  }
}
```

---

### **PHASE C: Microservices Architecture (Weeks 9-12)**

```
┌─────────────────────────────────────────────────────────────────────┐
│                  MICROSERVICES ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                    API Gateway (Kong/Ambassador)             │  │
│   │  • Rate limiting (per user, per IP)                         │  │
│   │  • Authentication (JWT validation)                          │  │
│   │  • Request routing                                          │  │
│   │  • SSL termination                                           │  │
│   └────────────────────────┬────────────────────────────────────┘  │
│                            │                                        │
│   ┌────────────────────────┼────────────────────────────────────┐  │
│   │                    Service Mesh (Istio/Linkerd)              │  │
│   │  • mTLS between services                                   │  │
│   │  • Circuit breakers                                         │  │
│   │  • Retry logic                                              │  │
│   │  • Distributed tracing                                      │  │
│   └────────────────────────┬────────────────────────────────────┘  │
│                            │                                        │
│   ┌──────────┬───────────┼───────────┬──────────┬──────────────┐  │
│   │          │           │           │          │              │  │
│   ▼          ▼           ▼           ▼          ▼              ▼  │
│ ┌──────┐ ┌──────┐  ┌────────┐ ┌────────┐ ┌────────┐  ┌────────┐ │
│ │ Auth │ │ Alert│  │Incident│ │ Threat │ │Telecom │  │Analytics│ │
│ │ Svc  │ │ Svc  │  │  Svc   │ │ Intel  │ │  Svc   │  │  Svc    │ │
│ │      │ │      │  │        │ │  Svc   │ │        │  │         │ │
│ │:3001 │ │:3002 │  │ :3003  │ │ :3004  │ │ :3005  │  │ :3006   │ │
│ │      │ │      │  │        │ │        │ │        │  │         │ │
│ │3 pods│ │5 pods│  │3 pods  │ │2 pods  │ │2 pods  │  │4 pods   │ │
│ └──┬───┘ └──┬───┘  └───┬────┘ └───┬────┘ └───┬────┘  └───┬─────┘ │
│    │        │         │          │          │           │        │
│    └────────┴─────────┴──────────┴──────────┴───────────┘        │
│                              │                                     │
│   ┌───────────────────────────┼───────────────────────────────┐  │
│   │                    DATA LAYER                             │  │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐  │  │
│   │  │PostgreSQL│  │Redis    │  │ Kafka   │  │Elasticsearch│  │  │
│   │  │Cluster  │  │Cluster  │  │Cluster  │  │Cluster      │  │  │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────────┘  │  │
│   └───────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Service Specifications:**

| Service | Replicas | CPU/Memory | Database | Cache | Purpose |
|---------|----------|------------|----------|-------|---------|
| Auth Service | 3 | 500m/512Mi | PostgreSQL | Redis (sessions) | JWT, LDAP, SAML, MFA |
| Alert Service | 5 | 2CPU/4Gi | PostgreSQL (partitioned) | Redis (stream) | Ingestion, correlation, dedup |
| Incident Service | 3 | 1CPU/2Gi | PostgreSQL | - | CRUD, workflow, SLA tracking |
| Threat Intel Service | 2 | 1CPU/2Gi | PostgreSQL | Redis (IOC cache) | TI feeds, enrichment, IOC mgmt |
| Telecom Service | 2 | 1CPU/2Gi | PostgreSQL | Redis (subscriber cache) | HLR/VLR probes, fraud detection |
| Analytics Service | 4 | 4CPU/8Gi | TimescaleDB | - | Aggregations, ML scoring, reports |

---

### **PHASE D: Infrastructure for Heavy Load (Weeks 13-16)**

#### D1. Kubernetes Production Configuration

```yaml
# k8s/production-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: soc-alert-service
  namespace: soc-production
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 0
  selector:
    matchLabels:
      app: soc-alert-service
  template:
    metadata:
      labels:
        app: soc-alert-service
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3002"
        prometheus.io/path: "/metrics"
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: soc-alert-service
                topologyKey: kubernetes.io/hostname
      containers:
        - name: alert-service
          image: registry.djezzy.dz/soc/alert-service:v1.0.0
          ports:
            - containerPort: 3002
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "4Gi"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: soc-secrets
                  key: database-url
            - name: REDIS_URL
              value: "redis-cluster-master:6379"
            - name: KAFKA_BROKERS
              value: "kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3002
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3002
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir:
            sizeLimit: 1Gi
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: soc-alert-service-hpa
  namespace: soc-production
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
    - type: Pods
      pods:
        metric:
          name: kafka_consumer_lag
        target:
          type: AverageValue
          averageValue: "1000"
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
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 2
          periodSeconds: 120
      selectPolicy: Min
```

#### D2. Kafka Configuration for Event Streaming

```yaml
# kafka/kafka-config.yaml
version: '3.7'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
  
  kafka-0:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 0
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-0:9092
      # Performance tuning for heavy load
      KAFKA_NUM_NETWORK_THREADS: 8
      KAFKA_NUM_IO_THREADS: 16
      KAFKA_SOCKET_SEND_BUFFER_BYTES: 1024000
      KAFKA_SOCKET_RECEIVE_BUFFER_BYTES: 1024000
      KAFKA_NUM_PARTITIONS: 50
      KAFKA_NUM_REPLICA_FETCHERS: 4
      KAFKA_LOG_FLUSH_INTERVAL_MS: 1000
      # Retention: 7 days for alerts, 30 days for events
      KAFKA_LOG_RETENTION_HOURS: 168
      KAFKA_LOG_SEGMENT_BYTES: 1073741824  # 1GB segments
  
  kafka-1:
    # ... similar configuration for broker 1
    
  kafka-2:
    # ... similar configuration for broker 2

# Topic configuration
Topics:
  alerts-ingest:
    partitions: 50
    replication-factor: 3
    retention.ms: 604800000  # 7 days
    cleanup.policy: delete
    
  security-events:
    partitions: 100
    replication-factor: 3
    retention.ms: 2592000000  # 30 days
    compression.type: lz4
    
  incidents-updates:
    partitions: 10
    replication-factor: 3
    retention.ms: 31536000000  # 1 year
    
  ioc-enrichment:
    partitions: 20
    replication-factor: 3
    compact: true  # Keep latest state only
```

#### D3. Redis Cluster for Caching

```yaml
# redis/redis-cluster.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: soc-redis-cluster
  namespace: soc-production
spec:
  mode: cluster
  masterSize: 6  # 3 masters + 3 replicas
  replicaSize: 3
  
  redisExporter:
    enabled: true
    
  resources:
    limits:
      cpu: "4"
      memory: "16Gi"
    requests:
      cpu: "2"
      memory: "8Gi"

  # Memory policies for different use cases
  redisConfig:
    maxmemory-policy: allkeys-lru
    save: "900 1 300 10 60 10000"
    
  # Persistent storage
  persistence:
    enabled: true
    size: 100Gi
    storageClassName: fast-ssd
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Week 1-2: Database Foundation
- [ ] Set up PostgreSQL 16 cluster (Primary + 2 Replicas)
- [ ] Configure PgBouncer connection pooling
- [ ] Migrate schema from SQLite to PostgreSQL
- [ ] Implement table partitioning (alerts, events)
- [ ] Create indexes optimized for query patterns
- [ ] Set up automated backup (pg_basebackup + WAL archiving)

### Week 3-4: Database Optimization
- [ ] Implement materialized views for dashboards
- [ ] Set up read replicas for analytics
- [ ] Configure connection limits and pooling
- [ ] Performance test with simulated load (50K EPS)
- [ ] Tune PostgreSQL parameters (shared_buffers, work_mem, etc.)

### Week 5-6: Core Integrations
- [ ] Integrate SIEM platform (Splunk/ELK/QRadar)
- [ ] Build normalizer service for unified event format
- [ ] Set up Kafka for event streaming
- [ ] Implement alert ingestion pipeline
- [ ] Test with real SIEM data (not mock)

### Week 7-8: Security Tool Integrations
- [ ] Integrate EDR (CrowdStrike/SentinelOne)
- [ ] Connect Threat Intelligence (MISP/ThreatConnect)
- [ ] Implement IOC enrichment pipeline
- [ ] Set up automated containment actions
- [ ] Test end-to-end alert lifecycle

### Week 9-10: Microservices Migration
- [ ] Split monolith into microservices
- [ ] Deploy API Gateway (Kong)
- [ ] Implement service mesh (Istio)
- [ ] Set up distributed tracing (Jaeger)
- [ ] Configure circuit breakers and retries

### Week 11-12: Telecom-Specific Features
- [ ] Integrate HLR/VLR probes
- [ ] Connect to SSM (Subscriber Management)
- [ ] Implement real-time fraud detection
- [ ] Build SIM swap monitoring dashboard
- [ ] Test with live telecom data (anonymized)

### Week 13-14: Performance & Scaling
- [ ] Load testing at scale (target: 50K EPS)
- [ ] Optimize slow queries
- [ ] Tune auto-scaling policies
- [ ] Implement caching layers (Redis)
- [ ] Stress test all integrations

### Week 15-16: Hardening & Go-Live
- [ ] Security audit and penetration testing
- [ ] Disaster recovery drill
- [ ] Runbook finalization
- [ ] Team training on new tools
- [ ] Production cutover

---

## 💰 ESTIMATED RESOURCES

### Infrastructure Costs (Monthly Estimate)

| Component | Spec | Quantity | Est. Cost (USD) |
|-----------|------|----------|-----------------|
| Kubernetes Nodes | 32CPU/128GB RAM | 6 | $6,000 |
| PostgreSQL | Managed (Cloud SQL) | 1 Primary + 2 Replicas | $3,000 |
| Redis Cluster | 16GB RAM x 6 nodes | $2,400 |
| Kafka | 3 brokers (m5.2xlarge) | $900 |
| Elasticsearch | 3 data nodes | $1,800 |
| Monitoring (Grafana Cloud) | - | $500 |
| CDN/DDoS Protection | Cloudflare Enterprise | $2,000 |
| **Total Monthly** | | | **~$16,600** |

### Team Requirements
- DevOps Engineer (Kubernetes expert): 1 FTE
- Backend Developer (Go/Rust for services): 2 FTE
- Frontend Developer (React optimization): 1 FTE
- DBA (PostgreSQL specialist): 0.5 FTE
- Security Engineer (integrations): 1 FTE
- Telecom Integration Specialist: 1 FTE

---

## ✅ SUCCESS METRICS

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Events Processed/Second | > 50,000 | Prometheus counter |
| Query Latency (P95) | < 2 seconds | APM tracing |
| System Availability | 99.99% | Uptime monitoring |
| Incident MTTR | < 4 hours | Ticketing system |
| False Positive Rate | < 5% | Analyst feedback loop |
| Concurrent Users | > 500 | Application metrics |
| Data Retention (Hot) | 2 years online | Storage metrics |
| Backup RPO | < 1 hour | Backup logs |

---

## 🚨 RISKS & MITIGATIONS

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| SIEM API rate limits | High | Medium | Implement queuing, batch processing |
| Database performance degradation | Critical | Low | Proper indexing, partitioning, read replicas |
| Integration downtime | High | Medium | Circuit breakers, graceful degradation |
| Data volume exceeds estimates | High | Medium | Auto-scaling, archive cold data |
| Vendor lock-in | Medium | Low | Abstraction layer over integrations |

---

**Next Step:** Start with Phase A (Database) - This is the critical path. Everything else depends on having a solid, scalable data foundation.

Would you like me to begin implementing the PostgreSQL production schema or set up the integration scaffolding?
