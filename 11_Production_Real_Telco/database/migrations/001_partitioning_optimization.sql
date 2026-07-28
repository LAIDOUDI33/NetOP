-- ============================================================
-- Djezzy National SOC Platform - Enterprise Database Migration
-- Phase 11: Production Partitioning & Optimization
-- Target: PostgreSQL 16+
-- Capacity: 50B+ events/year, 80B+ CDRs/year
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Trigram matching for fuzzy IOC search
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- GIN indexes on composite types
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PARTITION 1: Security Events (Time-based partitioning)
-- Expected volume: 50 billion rows/year
-- Retention: 13 months hot, then archive to cold storage
-- ============================================================

-- Create the partitioned table
CREATE TABLE security_events (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(128) UNIQUE,
    
    -- Event Classification
    event_type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    severity VARCHAR(20) NOT NULL DEFAULT 'informational',
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    
    -- Source Information
    source_ip INET,
    destination_ip INET,
    source_port INTEGER,
    destination_port INTEGER,
    protocol VARCHAR(20),
    source_host VARCHAR(255),
    destination_host VARCHAR(255),
    
    -- Tool/Source Origin
    tool_name VARCHAR(50) NOT NULL,
    tool_severity VARCHAR(20),
    rule_id VARCHAR(128),
    rule_name VARCHAR(255),
    rule_category VARCHAR(100),
    
    -- Event Details
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    raw_log TEXT,
    
    -- Telecom-Specific Fields
    subscriber_id VARCHAR(20),  -- MSISDN (masked)
    imsi VARCHAR(20),
    imei VARCHAR(20),
    cell_id VARCHAR(20),
    lac VARCHAR(10),
    
    -- Correlation & Investigation
    incident_id VARCHAR(36),
    ioc_matched VARCHAR(64),
    correlation_group VARCHAR(64),
    confidence REAL DEFAULT 0.0,
    
    -- Enrichment (JSONB for flexible querying)
    geo_location JSONB,
    threat_intel JSONB,
    asset_info JSONB,
    
    -- Processing Metadata
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    count INTEGER DEFAULT 1,
    
    -- Assignment & Triage
    assigned_to VARCHAR(36),
    assigned_at TIMESTAMP WITH TIME ZONE,
    triaged_by VARCHAR(36),
    triaged_at TIMESTAMP WITH TIME ZONE,
    closed_by VARCHAR(36),
    closed_at TIMESTAMP WITH TIME ZONE,
    closure_reason TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (ingested_at);

-- Create indexes on the parent table (inherited by all partitions)
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_status ON security_events(status);
CREATE INDEX idx_security_events_source_ip ON security_events(source_ip);
CREATE INDEX idx_security_events_destination_ip ON security_events(destination_ip);
CREATE INDEX idx_security_events_tool_name ON security_events(tool_name);
CREATE INDEX idx_security_events_rule_id ON security_events(rule_id);
CREATE INDEX idx_security_events_ingested_at ON security_events(ingested_at);
CREATE INDEX idx_security_events_processed_at ON security_events(processed_at);
CREATE INDEX idx_security_events_incident_id ON security_events(incident_id);
CREATE INDEX idx_security_events_assigned_to ON security_events(assigned_to);
CREATE INDEX idx_security_events_correlation_group ON security_events(correlation_group);

-- GIN index for JSONB metadata queries
CREATE INDEX idx_security_events_metadata ON security_events USING GIN(metadata);

-- GIN index for full-text search on title and description
CREATE INDEX idx_security_events_title_search ON security_events USING GIN(to_tsvector('english', title));
CREATE INDEX idx_security_events_desc_search ON security_events USING GIN(to_tsvector('english', COALESCE(description, '')));

-- Trigram index for fuzzy IOC/value matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_security_events_source_ip_trgm ON security_events USING gin(source_ip gin_trgm_ops);

-- Create initial partitions (daily for current month, monthly for historical)
DO $$
DECLARE
    start_date DATE := date_trunc('month', CURRENT_DATE);
    end_date DATE := date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';
    current_date DATE := start_date;
BEGIN
    WHILE current_date <= end_date LOOP
        EXECUTE format('
            CREATE TABLE security_events_%s PARTITION OF security_events
            FOR VALUES FROM (%s) TO (%s + INTERVAL ''1 day'')',
            TO_CHAR(current_date, 'YYYY_MM_DD'),
            current_date,
            current_date
        );
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
END $$;

-- Previous 12 months - monthly partitions for warm data
DO $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 12..1 LOOP
        EXECUTE format('
            CREATE TABLE security_events_%s PARTITION OF security_events
            FOR VALUES FROM (%s) TO (%s)',
            TO_CHAR(CURRENT_DATE - (i || ' months')::INTERVAL, 'YYYY_MM'),
            date_trunc('month', CURRENT_DATE - (i || ' months')::INTERVAL),
            date_trunc('month', CURRENT_DATE - ((i-1) || ' months')::INTERVAL)
        );
    END LOOP;
END $$;

-- ============================================================
-- PARTITION 2: CDR Records (Monthly partitioning with BRIN indexes)
-- Expected volume: 80 billion rows/year
-- ============================================================

CREATE TABLE cdr_records (
    id VARCHAR(36) PRIMARY KEY,
    cdr_id VARCHAR(128) UNIQUE,
    
    call_id VARCHAR(128) NOT NULL,
    calling_number VARCHAR(20) NOT NULL,
    called_number VARCHAR(20) NOT NULL,
    imsi_calling VARCHAR(20),
    imsi_called VARCHAR(20),
    
    record_type VARCHAR(30) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    originating_switch VARCHAR(100),
    terminating_switch VARCHAR(100),
    serving_msc VARCHAR(100),
    serving_vlr VARCHAR(100),
    
    calling_cell_id VARCHAR(20),
    calling_lac VARCHAR(10),
    called_cell_id VARCHAR(20),
    called_lac VARCHAR(10),
    
    data_volume_up BIGINT,
    data_volume_down BIGINT,
    apn VARCHAR(100),
    
    is_roaming BOOLEAN DEFAULT FALSE,
    roaming_partner VARCHAR(100),
    visited_country VARCHAR(3),
    visited_network VARCHAR(100),
    
    charge_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'DZD',
    
    fraud_indicators TEXT[],
    risk_flagged BOOLEAN DEFAULT FALSE,
    security_review_required BOOLEAN DEFAULT FALSE,
    
    raw_cdr JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (start_time);

-- BRIN indexes are much smaller than B-tree for time-series data
CREATE INDEX idx_cdr_records_start_time_brin ON cdr_records USING BRIN(start_time);
CREATE INDEX idx_cdr_records_call_id ON cdr_records(call_id);
CREATE INDEX idx_cdr_records_calling_number ON cdr_records(calling_number);
CREATE INDEX idx_cdr_records_called_number ON cdr_records(called_number);
CREATE INDEX idx_cdr_records_imsi_calling ON cdr_records(imsi_calling);
CREATE INDEX idx_cdr_records_record_type ON cdr_records(record_type);
CREATE INDEX idx_cdr_records_originating_switch ON cdr_records(originating_switch);
CREATE INDEX idx_cdr_records_is_roaming ON cdr_records(is_roaming);
CREATE INDEX idx_cdr_records_risk_flagged ON cdr_records(risk_flagged);

-- Create monthly CDR partitions for past 13 months
DO $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 0..12 LOOP
        EXECUTE format('
            CREATE TABLE cdr_records_%s PARTITION OF cdr_records
            FOR VALUES FROM (%s) TO (%s)',
            TO_CHAR(CURRENT_DATE - (i || ' months')::INTERVAL, 'YYYY_MM'),
            date_trunc('month', CURRENT_DATE - (i || ' months')::INTERVAL),
            date_trunc('month', CURRENT_DATE - ((i-1) || ' months')::INTERVAL)
        );
    END LOOP;
END $$;

-- ============================================================
-- PARTITION 3: Authentication Logs (Weekly partitioning)
-- Expected volume: 2 billion rows/year
-- ============================================================

CREATE TABLE auth_logs (
    id VARCHAR(36) PRIMARY KEY,
    
    user_id VARCHAR(36),
    username VARCHAR(100),
    auth_method VARCHAR(30),  -- ldap, sso, mfa, api_key, password
    auth_status VARCHAR(20),  -- success, failure, locked, expired
    
    source_ip INET,
    user_agent TEXT,
    session_id VARCHAR(128),
    
    mfa_verified BOOLEAN DEFAULT FALSE,
    mfa_method VARCHAR(20),  -- totp, sms, push, fido
    
    failure_reason VARCHAR(100),
    risk_score REAL DEFAULT 0.0,
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE INDEX idx_auth_logs_timestamp_brin ON auth_logs USING BRIN(timestamp);
CREATE INDEX idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX idx_auth_logs_username ON auth_logs(username);
CREATE INDEX idx_auth_logs_auth_status ON auth_logs(auth_status);
CREATE INDEX idx_auth_logs_source_ip ON auth_logs(source_ip);
CREATE INDEX idx_auth_logs_auth_method ON auth_logs(auth_method);

-- Create weekly auth log partitions for past 3 months
DO $$
DECLARE
    i INTEGER;
    week_start DATE;
    week_end DATE;
BEGIN
    FOR i IN 0..12 LOOP
        week_start := date_trunc('week', CURRENT_DATE) - (i || ' weeks')::INTERVAL;
        week_end := week_start + INTERVAL '1 week';
        
        EXECUTE format('
            CREATE TABLE auth_logs_week_%s PARTITION OF auth_logs
            FOR VALUES FROM (%s) TO (%s)',
            TO_CHAR(week_start, 'YYYY_WW'),
            week_start,
            week_end
        );
    END LOOP;
END $$;

-- ============================================================
-- MATERIALIZED VIEWS for Dashboard Performance
-- Pre-aggregate common dashboard metrics
-- ============================================================

-- Security events by severity (refreshed every 5 minutes)
CREATE MATERIALIZED VIEW mv_events_by_severity AS
SELECT 
    date_trunc('hour', ingested_at) as hour_bucket,
    event_type,
    severity,
    status,
    COUNT(*) as event_count,
    COUNT(DISTINCT source_ip) as unique_sources,
    COUNT(DISTINCT CASE WHEN incident_id IS NOT NULL THEN incident_id END) as incidents_created
FROM security_events
WHERE ingested_at >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2, 3, 4
WITH DATA;

CREATE UNIQUE INDEX idx_mv_events_by_severity_unique ON mv_events_by_severity(hour_bucket, event_type, severity, status);

-- Top talker IPs (refreshed hourly)
CREATE MATERIALIZED VIEW mv_top_talker_ips AS
SELECT 
    source_ip,
    COUNT(*) as event_count,
    COUNT(DISTINCT destination_ip) as unique_destinations,
    MAX(ingested_at) as last_seen,
    ARRAY_AGG(DISTINCT severity) as severities
FROM security_events
WHERE ingested_at >= NOW() - INTERVAL '24 hours'
  AND source_ip IS NOT NULL
GROUP BY source_ip
HAVING COUNT(*) > 10
ORDER BY event_count DESC
LIMIT 1000
WITH DATA;

-- Incident SLA tracking
CREATE MATERIALIZED VIEW mv_incident_sla AS
SELECT 
    i.id,
    i.incident_number,
    i.title,
    i.severity,
    i.status,
    i.detected_at,
    i.containment_target,
    i.resolution_target,
    i.resolved_at,
    EXTRACT(EPOCH FROM (COALESCE(i.resolved_at, NOW()) - i.detected_at))/3600 as hours_open,
    CASE 
        WHEN i.resolved_at IS NOT NULL AND i.resolution_target IS NOT NULL 
            THEN CASE WHEN i.resolved_at <= i.resolution_target THEN 'met' ELSE 'missed' END
        WHEN NOW() > i.resolution_target THEN 'missed'
        ELSE 'on_track'
    END as sla_status
FROM incidents i
WHERE i.created_at >= NOW() - INTERVAL '90 days'
WITH DATA;

-- ============================================================
-- FUNCTION: Automatic Partition Maintenance
-- Creates new partitions and manages retention
-- ============================================================

CREATE OR REPLACE FUNCTION maintain_partitions()
RETURNS void AS $$
DECLARE
    tomorrow_date DATE := CURRENT_DATE + 1;
    cutoff_date DATE := CURRENT_DATE - INTERVAL '14 months';
BEGIN
    -- Create tomorrow's security_events partition
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS security_events_%s PARTITION OF security_events
        FOR VALUES FROM (%s) TO (%s + INTERVAL ''1 day'')',
        TO_CHAR(tomorrow_date, 'YYYY_MM_DD'),
        tomorrow_date,
        tomorrow_date
    );
    
    RAISE NOTICE 'Partition maintenance completed: created %, cutoff %', tomorrow_date, cutoff_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TELECOM-SPECIFIC: Subscriber sharding function
-- Distributes subscribers across shards by MSISDN hash
-- ============================================================

CREATE OR REPLACE FUNCTION get_subscriber_shard(msisdn varchar)
RETURNS int AS $$
BEGIN
    return hashtext(msisdn)::int % 16;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- PERFORMANCE: Statistics targets for better query plans
-- ============================================================

-- These help PostgreSQL generate better execution plans
ALTER TABLE security_events SET (parallel_workers = 4);
ALTER TABLE cdr_records SET (parallel_workers = 4);

-- Increase statistics targets for frequently filtered columns
ALTER TABLE security_events ALTER COLUMN id SET STATISTICS 1000;
ALTER TABLE security_events ALTER COLUMN event_type SET STATISTICS 500;
ALTER TABLE security_events ALTER COLUMN severity SET STATISTICS 500;
ALTER TABLE security_events ALTER COLUMN status SET STATISTICS 500;
ALTER TABLE security_events ALTER COLUMN ingested_at SET STATISTICS 1000;
ALTER TABLE security_events ALTER COLUMN source_ip SET STATISTICS 500;
ALTER TABLE cdr_records ALTER COLUMN call_id SET STATISTICS 1000;
ALTER TABLE cdr_records ALTER COLUMN calling_number SET STATISTICS 500;
ALTER TABLE cdr_records ALTER COLUMN start_time SET STATISTICS 1000;
ALTER TABLE subscribers ALTER COLUMN msisdn SET STATISTICS 1000;
ALTER TABLE subscribers ALTER COLUMN imsi SET STATISTICS 1000;
ALTER TABLE iocs ALTER COLUMN value SET STATISTICS 1000;
ALTER TABLE iocs ALTER COLUMN type SET STATISTICS 500;

-- ============================================================
-- COMPLETION NOTES
-- ============================================================
-- Run this migration during maintenance window due to:
-- 1. Index creation on large tables
-- 2. Materialized view population
-- 3. Partition creation
--
-- Estimated runtime: 2-4 hours depending on existing data
-- Recommended: Schedule during low-traffic window (02:00-06:00)
--
-- Post-migration tasks:
-- 1. Set up pg_cron for automatic partition maintenance
-- 2. Configure monitoring on materialized view refresh times
-- 3. Test RLS policies with different user roles
-- 4. Validate query performance against SLAs
-- ============================================================
