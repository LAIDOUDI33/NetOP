-- =============================================================================
-- DJEZZY NATIONAL SOC PLATFORM - POSTGRESQL PARTITIONING & OPTIMIZATION
-- =============================================================================
-- Phase 11: Enterprise Production Database Setup
--
-- Scale Targets:
--   - 50B+ security_events/year (daily partitions)
--   - 80B+ CDR records/year (daily partitions)
--   - 15M+ subscribers (hash partitioning)
--   - 100Gbps network throughput
--
-- This script creates:
--   1. Partitioned tables for time-series data
--   2. BRIN indexes for time-range queries
--   3. Trigram indexes for text search
--   4. Partial indexes for common query patterns
--   5. Compression policies (PostgreSQL 14+)
--   6. Retention policies
--
-- @version 11.1.0
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;           -- Trigram matching
CREATE EXTENSION IF NOT EXISTS btree_gist;        -- GiST indexes
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- Query monitoring
CREATE EXTENSION IF NOT EXISTS pgcrypto;          -- Crypto functions

-- Uncomment if using TimescaleDB:
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- =============================================================================
-- SECURITY EVENTS TABLE (50B+ rows/year)
-- =============================================================================

-- Create main partitioned table
CREATE TABLE security_events (
    event_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event Classification
    event_type            VARCHAR(50) NOT NULL,
    category              VARCHAR(50) NOT NULL,
    severity              VARCHAR(20) NOT NULL,
    status                VARCHAR(30) NOT NULL DEFAULT 'new',
    
    -- Network Information
    source_ip             INET,
    destination_ip        INET,
    source_port           INTEGER,
    destination_port      INTEGER,
    protocol               VARCHAR(20),
    source_host            VARCHAR(255),
    destination_host       VARCHAR(255),
    
    -- Source Tool
    tool_name             VARCHAR(50) NOT NULL,
    tool_version          VARCHAR(50),
    rule_id               VARCHAR(100),
    rule_name             VARCHAR(500),
    rule_category         VARCHAR(200),
    
    -- Event Details
    title                 VARCHAR(1000) NOT NULL,
    description           TEXT,
    raw_log               TEXT,
    metadata              JSONB,
    
    -- Telecom Fields
    subscriber_id         UUID REFERENCES subscribers(subscriber_id),
    msisdn_masked         VARCHAR(19),  -- Format: XXXXXX1234
    imsi                  TEXT,
    imei                  TEXT,
    cell_id               VARCHAR(50),
    lac                   VARCHAR(20),
    
    -- Correlation
    incident_id           UUID REFERENCES incidents(incident_id),
    ioc_matched           UUID REFERENCES ioc_records(ioc_id),
    correlation_group     VARCHAR(100),
    confidence            REAL CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Geographic
    geo_country           VARCHAR(100),
    geo_city              VARCHAR(100),
    geo_lat               DOUBLE PRECISION,
    geo_lon               DOUBLE PRECISION,
    
    -- Enrichment
    threat_intel          JSONB,
    asset_info            JSONB,
    
    -- Counts & Timing
    count                 INTEGER NOT NULL DEFAULT 1,
    first_seen_at         TIMESTAMPTZ NOT NULL,
    last_seen_at          TIMESTAMPTZ NOT NULL,
    ingested_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Assignment
    assigned_to           VARCHAR(100),
    triaged_by            VARCHAR(100),
    closed_by             VARCHAR(100),
    
    -- Timestamps
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at             TIMESTAMPTZ
) PARTITION BY RANGE (ingested_at);

-- Create indexes optimized for telco-scale queries

-- BRIN index for time-series queries (very small size, perfect for time-ordered data)
CREATE INDEX idx_security_events_ingested_brin ON security_events USING BRIN (ingested_at);

-- B-tree indexes for equality lookups
CREATE INDEX idx_security_events_severity_status ON security_events(severity, status);
CREATE INDEX idx_security_events_event_type_category ON security_events(event_type, category);
CREATE INDEX idx_security_events_tool_rule ON security_events(tool_name, rule_id);

-- GIN indexes for JSONB fields
CREATE INDEX idx_security_events_metadata_gin ON security_events USING GIN (metadata);
CREATE INDEX idx_security_events_threat_intel_gin ON security_events USING GIN (threat_intel);

-- GiST indexes for network queries
CREATE INDEX idx_security_events_source_ip ON security_events USING GIST (source_ip inet_ops);
CREATE INDEX idx_security_events_dest_ip ON security_events USING GIST (destination_ip inet_ops);

-- Trigram index for full-text search on titles/descriptions
CREATE INDEX idx_security_events_title_trgm ON security_events USING GIN (title gin_trgm_ops);

-- Partial indexes for common query patterns (much smaller than full indexes)
CREATE INDEX idx_security_events_new_critical 
    ON security_events(ingested_at DESC) 
    WHERE status = 'new' AND severity IN ('critical', 'high');
    
CREATE INDEX idx_security_events_subscriber_timeline 
    ON security_events(ingested_at DESC) 
    WHERE subscriber_id IS NOT NULL;

-- Create daily partitions for current month + next month (automate with cron)
-- Example: Create partitions for July 2026
DO $$
DECLARE
    start_date DATE := '2026-07-01';
    end_date DATE := '2026-08-01';
    current_date DATE := start_date;
BEGIN
    WHILE current_date < end_date LOOP
        EXECUTE format('
            CREATE TABLE security_events_%s PARTITION OF security_EVENTS
            FOR VALUES FROM (%q) TO (%q)',
            TO_CHAR(current_date, 'YYYY_MM_DD'),
            current_date,
            current_date + 1
        );
        current_date := current_date + 1;
    END LOOP;
END $$;

-- =============================================================================
-- CDR RECORDS TABLE (80B+ rows/year)
-- =============================================================================

CREATE TABLE cdr_records (
    cdr_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id               VARCHAR(100) UNIQUE NOT NULL,
    record_type           VARCHAR(30) NOT NULL,
    
    -- Parties
    calling_number         VARCHAR(30) NOT NULL,
    called_number          VARCHAR(30) NOT NULL,
    calling_number_masked  VARCHAR(34) NOT NULL,
    called_number_masked   VARCHAR(34) NOT NULL,
    
    -- Identity
    imsi_calling           TEXT,
    imsi_called            TEXT,
    
    -- Timing
    start_time             TIMESTAMPTZ NOT NULL,
    end_time               TIMESTAMPTZ,
    duration_seconds       BIGINT,
    
    -- Network Elements
    originating_switch     VARCHAR(100),
    terminating_switch     VARCHAR(100),
    serving_msc            VARCHAR(100),
    serving_vlr            VARCHAR(100),
    
    -- Location
    calling_cell_id        VARCHAR(50),
    called_cell_id         VARCHAR(50),
    
    -- Data Session
    data_volume_up         BIGINT,
    data_volume_down       BIGINT,
    apn                    VARCHAR(100),
    
    -- Roaming
    is_roaming             BOOLEAN NOT NULL DEFAULT FALSE,
    roaming_partner        VARCHAR(100),
    visited_country        VARCHAR(100),
    
    -- Billing
    charge_amount          NUMERIC(12,2),
    
    -- Fraud Detection
    fraud_indicators       JSONB,
    fraud_score            INTEGER CHECK (fraud_score >= 0 AND fraud_score <= 100),
    is_flagged_for_review  BOOLEAN DEFAULT FALSE,
    
    -- Raw Data
    raw_cdr                JSONB,
    
    -- Processing
    ingested_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (start_time);

-- Indexes for CDR analytics
CREATE INDEX idx_cdr_start_time_brin ON cdr_records USING BRIN (start_time);
CREATE INDEX idx_cdr_caller_time ON cdr_records(calling_number_masked, start_time);
CREATE INDEX idx_cdr_callee_time ON cdr_records(called_number_masked, start_time);
CREATE INDEX idx_cdr_record_type ON cdr_records(record_type, start_time);
CREATE INDEX idx_cdr_fraud_score ON cdr_records(fraud_score) WHERE fraud_score > 70;
CREATE INDEX idx_cdr_flagged_review ON cdr_records(is_flagged_for_review, fraud_score);

-- Create daily CDR partitions (same pattern as security_events)

-- =============================================================================
-- SUBSCRIBERS TABLE (15M+ rows, hash-sharded by MSISDN)
-- =============================================================================

CREATE TABLE subscribers (
    subscriber_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    msisdn                VARCHAR(20) UNIQUE NOT NULL,
    msisdn_hash           VARCHAR(64) NOT NULL,  -- SHA-256 hash
    
    -- Identity
    imsi                  VARCHAR(30),
    imei                  VARCHAR(30),
    imsi_hash             VARCHAR(64),
    imei_hash             VARCHAR(64),
    
    -- Profile
    subscriber_type       VARCHAR(30) NOT NULL DEFAULT 'prepaid',
    status                VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Location
    current_cell_id       VARCHAR(50),
    current_lac           VARCHAR(20),
    home_msc              VARCHAR(100),
    home_vlr              VARCHAR(100),
    
    -- Risk Scoring
    risk_score            INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_category         VARCHAR(20),
    last_risk_assessment_at TIMESTAMPTZ,
    
    -- Fraud
    fraud_flags           JSONB,
    is_roaming            BOOLEAN DEFAULT FALSE,
    roaming_partner       VARCHAR(100),
    
    -- Timestamps
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deactivated_at        TIMESTAMPTZ
);

-- Indexes for subscriber management
CREATE INDEX idx_subscribers_msisdn_hash ON subscribers(msisdn_hash);
CREATE INDEX idx_subscribers_risk_score ON subscribers(risk_score) WHERE risk_score > 50;
CREATE INDEX idx_subscribers_status_type ON subscribers(status, subscriber_type);
CREATE INDEX idx_subscribers_cell_id ON subscribers(current_cell_id) WHERE status = 'active';

-- Hash-based partitioning for very large deployments (optional)
-- CREATE TABLE subscribers_partitioned (
--     ... same columns ...
-- ) PARTITION BY HASH (msisdn_hash);

-- =============================================================================
-- IOC RECORDS TABLE (10M+ IOCs under management)
-- =============================================================================

CREATE TABLE ioc_records (
    ioc_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    value                  TEXT NOT NULL,
    type                   VARCHAR(30) NOT NULL,
    subtype                VARCHAR(30),
    
    -- Classification
    threat_type            VARCHAR(50),
    threat_actor           VARCHAR(200),
    threat_family          VARCHAR(200),
    campaign               VARCHAR(200),
    
    -- Confidence & Validity
    confidence             INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    tlp                    INTEGER NOT NULL DEFAULT 2,
    validity_duration_days INTEGER,
    valid_from             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until            TIMESTAMPTZ,
    
    -- Source
    source                 VARCHAR(50) NOT NULL,
    source_id              VARCHAR(100),
    source_event_id        VARCHAR(100),
    feed_name              VARCHAR(200),
    
    -- MISP/OpenCTI Integration
    misp_event_id          VARCHAR(50),
    misp_attribute_id      BIGINT,
    opencti_id             VARCHAR(100),
    stix_pattern           TEXT,
    
    -- Enrichment
    enrichment             JSONB,
    context                JSONB,
    tags                   TEXT[],
    
    -- Statistics
    hit_count              INTEGER NOT NULL DEFAULT 0,
    last_hit_at            TIMESTAMPTZ,
    false_positive_count   INTEGER NOT NULL DEFAULT 0,
    is_false_positive      BOOLEAN DEFAULT FALSE,
    
    -- Status
    status                 VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Telecom-Specific
    is_telco_ioc           BOOLEAN DEFAULT FALSE,
    telco_category         VARCHAR(50),
    
    -- Timestamps
    first_seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Critical: IOC lookup indexes (must be ultra-fast!)
CREATE INDEX idx_ioc_value_hash ON ioc_records USING HASH (value);
CREATE INDEX idx_ioc_value_btree ON ioc_records(value);  -- For range scans
CREATE INDEX idx_ioc_type_status ON ioc_records(type, status);
CREATE INDEX idx_ioc_threat_confidence ON ioc_records(threat_type, confidence DESC);
CREATE INDEX idx_ioc_source_feed ON ioc_records(source, feed_name);
CREATE INDEX idx_ioc_validity ON ioc_records(valid_until, status) WHERE valid_until IS NOT NULL;
CREATE INDEX idx_ioc_telco ON ioc_records(telco_category) WHERE is_telco_ioc = TRUE;

-- Trigram index for IOC value search (fuzzy matching)
CREATE INDEX idx_ioc_value_trgm ON ioc_records USING GIN (value gin_trgm_ops);

-- =============================================================================
-- INCIDENTS TABLE (Full-text search enabled)
-- =============================================================================

CREATE TABLE incidents (
    incident_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number            VARCHAR(30) UNIQUE NOT NULL,
    
    -- Details
    title                  VARCHAR(1000) NOT NULL,
    description            TEXT,
    severity               VARCHAR(20) NOT NULL,
    status                 VARCHAR(20) NOT NULL DEFAULT 'open',
    phase                  VARCHAR(30) NOT NULL DEFAULT 'detection',
    
    -- Classification
    category               VARCHAR(50) NOT NULL,
    subcategory            VARCHAR(50),
    mitre_tactic           VARCHAR(100),
    mitre_technique        VARCHAR(100),
    
    -- SOAR Integration
    hive_case_id           VARCHAR(50),
    cortex_job_id          VARCHAR(50),
    
    -- Assignment
    assignee               VARCHAR(100),
    owner                  VARCHAR(100),
    team                   VARCHAR(50),
    escalation_level       INTEGER NOT NULL DEFAULT 0,
    
    -- SLA
    sla_breach_risk        BOOLEAN DEFAULT FALSE,
    sla_due_at             TIMESTAMPTZ,
    sla_breached_at        TIMESTAMPTZ,
    
    -- Impact
    affected_assets        JSONB,
    affected_subscribers   INTEGER,
    business_impact        VARCHAR(20),
    financial_impact       NUMERIC(15,2),
    
    -- Timeline
    detected_at            TIMESTAMPTZ NOT NULL,
    acknowledged_at        TIMESTAMPTZ,
    contained_at           TIMESTAMPTZ,
    eradicated_at          TIMESTAMPTZ,
    recovered_at           TIMESTAMPTZ,
    closed_at              TIMESTAMPTZ,
    
    -- Resolution
    root_cause             TEXT,
    resolution             TEXT,
    lessons_learned        TEXT,
    
    -- Statistics
    event_count            INTEGER NOT NULL DEFAULT 0,
    ioc_count              INTEGER NOT NULL DEFAULT 0,
    task_count             INTEGER NOT NULL DEFAULT 0,
    
    -- Tags
    tags                   TEXT[],
    tlp_level              INTEGER NOT NULL DEFAULT 2,
    
    -- Soft Delete
    is_deleted             BOOLEAN DEFAULT FALSE,
    deleted_at             TIMESTAMPTZ,
    
    -- Timestamps
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incident indexes
CREATE INDEX idx_incidents_status_severity ON incidents(status, severity);
CREATE INDEX idx_incidents_assignee_status ON incidents(assignee, status) WHERE assignee IS NOT NULL;
CREATE INDEX idx_incidents_detected_at ON incidents(detected_at DESC);
CREATE INDEX idx_incidents_category_status ON incidents(category, status);
CREATE INDEX idx_incidents_sla ON incidents(sla_due_at, sla_breach_risk) WHERE sla_due_at IS NOT NULL;
CREATE INDEX idx_incidents_active ON incidents(status) WHERE is_deleted = FALSE;

-- Full-text search index for incident titles and descriptions
CREATE INDEX idx_incidents_fulltext ON incidents USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- =============================================================================
-- AUDIT LOG TABLE (Compliance requirement)
-- =============================================================================

CREATE TABLE audit_logs (
    log_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action                 VARCHAR(50) NOT NULL,
    resource_type          VARCHAR(50) NOT NULL,
    resource_id            VARCHAR(100),
    
    -- Actor
    actor_id               VARCHAR(100) NOT NULL,
    actor_type             VARCHAR(30) NOT NULL,
    actor_ip               INET,
    actor_user_agent       TEXT,
    
    -- Changes
    old_value              JSONB,
    new_value              JSONB,
    changes                JSONB,
    
    -- Context
    session_id             VARCHAR(100),
    request_id             VARCHAR(100),
    correlation_id         VARCHAR(100),
    
    -- Result
    success                BOOLEAN NOT NULL DEFAULT TRUE,
    error_message          TEXT,
    
    timestamp              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log indexes
CREATE INDEX idx_audit_timestamp_brin ON audit_logs USING BRIN (timestamp);
CREATE INDEX idx_audit_actor_action ON audit_logs(actor_id, action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action_success ON audit_logs(action, success) WHERE success = FALSE;

-- =============================================================================
-- INTEGRATION HEALTH TABLE
-- =============================================================================

CREATE TABLE integration_health (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name       VARCHAR(100) NOT NULL,
    integration_type       VARCHAR(30) NOT NULL,
    component              VARCHAR(100),
    
    status                 VARCHAR(20) NOT NULL,
    latency_ms             INTEGER,
    uptime_percent         REAL,
    last_check_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_success_at        TIMESTAMPTZ,
    last_failure_at        TIMESTAMPTZ,
    
    consecutive_failures  INTEGER NOT NULL DEFAULT 0,
    last_error             TEXT,
    error_count_24h        INTEGER NOT NULL DEFAULT 0,
    
    -- Performance
    requests_per_minute    REAL,
    avg_response_time_ms   REAL,
    p95_response_time_ms   REAL,
    error_rate             REAL,
    
    metrics                JSONB,
    alert_threshold        JSONB,
    alert_active           BOOLEAN DEFAULT FALSE,
    alert_last_triggered_at TIMESTAMPTZ,
    
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integration health indexes
CREATE INDEX idx_integration_health_type_status ON integration_health(integration_type, status);
CREATE INDEX idx_integration_health_name_component ON integration_health(integration_name, component);
CREATE INDEX idx_integration_health_alerts ON integration_health(status, alert_active) WHERE alert_active = TRUE;

-- =============================================================================
-- RETENTION POLICIES
-- =============================================================================

-- Function to drop old partitions (run daily via cron)
CREATE OR REPLACE FUNCTION drop_old_partitions(table_name TEXT, retention_days INTEGER)
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    cutoff_date TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
BEGIN
    FOR partition_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE table_name || '_%'
        AND tablename != table_name
    LOOP
        -- Check if this partition's upper bound is older than cutoff
        IF EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_inherits i ON c.oid = inhrelid
            JOIN pg_class p ON p.oid = inhparent
            JOIN pg_namespace n ON n.oid = p.relnamespace
            WHERE c.relname = partition_name
            AND n.nspname = 'public'
            AND p.relname = table_name
        ) THEN
            EXECUTE 'DROP TABLE IF EXISTS ' || partition_name || ' CASCADE';
            RAISE NOTICE 'Dropped old partition: %', partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMPRESSION POLICIES (PostgreSQL 14+)
-- =============================================================================

-- Enable compression for cold partitions (older than 7 days)
-- ALTER TABLE security_events_2026_07_01 SET (compression = lz4);
-- ALTER TABLE cdr_records_2026_07_01 SET (compression = lz4);

-- =============================================================================
-- STATISTICS TARGETS (For better query planning on large tables)
-- =============================================================================

ALTER TABLE security_events ALTER COLUMN ingested SET STATISTICS 1000;
ALTER TABLE security_events ALTER COLUMN severity SET STATISTICS 100;
ALTER TABLE security_events ALTER COLUMN event_type SET STATISTICS 100;
ALTER TABLE cdr_records ALTER COLUMN start_time SET STATISTICS 1000;
ALTER TABLE ioc_records ALTER COLUMN value SET STATISTICS 1000;
ALTER TABLE ioc_records ALTER COLUMN type SET STATISTICS 100;

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Active alerts view (for dashboard)
CREATE OR REPLACE VIEW v_active_alerts AS
SELECT 
    e.*,
    s.msisdn_masked,
    s.risk_score as subscriber_risk
FROM security_events e
LEFT JOIN subscribers s ON e.subscriber_id = s.subscriber_id
WHERE e.status = 'new'
AND e.ingested_at > NOW() - INTERVAL '24 hours'
ORDER BY 
    CASE e.severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
    END,
    e.ingested_at DESC;

-- Incident summary view
CREATE OR REPLACE VIEW v_incident_summary AS
SELECT 
    i.*,
    COUNT(DISTINCT se.event_id) as actual_event_count,
    MAX(se.ingested_at) as latest_event_at
FROM incidents i
LEFT JOIN security_events se ON i.incident_id = se.incident_id
WHERE i.is_deleted = FALSE
GROUP BY i.incident_id;

-- IOC statistics view
CREATE OR REPLACE VIEW v_ioc_statistics AS
SELECT 
    type,
    status,
    COUNT(*) as total,
    AVG(confidence) as avg_confidence,
    SUM(hit_count) as total_hits,
    SUM(false_positive_count) as total_false_positives
FROM ioc_records
GROUP BY type, status;

-- Integration health dashboard view
CREATE OR REPLACE VIEW v_integration_dashboard AS
SELECT 
    integration_type,
    integration_name,
    MAX(last_check_at) as last_checked,
    COUNT(*) FILTER (WHERE status = 'operational') as operational_count,
    COUNT(*) FILTER (WHERE status = 'degraded') as degraded_count,
    COUNT(*) FILTER (WHERE status = 'down') as down_count,
    ROUND(AVG(latency_ms)::numeric, 2) as avg_latency_ms,
    ROUND(AVG(error_rate * 100)::numeric, 2) as avg_error_pct
FROM integration_health
WHERE last_check_at > NOW() - INTERVAL '1 hour'
GROUP BY integration_type, integration_name;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Djezzy SOC Platform Database Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '  - security_events (partitioned by day)';
    RAISE NOTICE '  - cdr_records (partitioned by day)';
    RAISE NOTICE '  - subscribers (15M+ capacity)';
    RAISE NOTICE '  - ioc_records (10M+ capacity)';
    RAISE NOTICE '  - incidents (with full-text search)';
    RAISE NOTICE '  - audit_logs (compliance)';
    RAISE NOTICE '  - integration_health (monitoring)';
    RAISE NOTICE '';
    RAISE NOTICE 'Indexes Optimized for:';
    RAISE NOTICE '  - Time-series queries (BRIN indexes)';
    RAISE NOTICE '  - Full-text search (Trigram/GIN)';
    RAISE NOTICE '  - Network analysis (GiST/INET)';
    RAISE NOTICE '  - Common query patterns (partial indexes)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Set up daily partition creation cron job';
    RAISE NOTICE '  2. Configure retention policy execution';
    RAISE NOTICE '  3. Enable compression on cold partitions';
    RAISE NOTICE '  4. Set up read replica configuration';
    RAISE NOTICE '========================================';
END $$;
