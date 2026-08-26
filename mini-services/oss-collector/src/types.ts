// ══════════════════════════════════════════════════════════════════════════════
// NetOP OSS Collector — Core Type Definitions
// ══════════════════════════════════════════════════════════════════════════════

/** Supported vendor types */
export type VendorType = 'ericsson' | 'huawei' | 'nokia' | 'zte' | 'samsung';

/** Radio access technology */
export type Technology = '2G' | '3G' | '4G' | '5G';

/** Authentication type for OSS connections */
export type AuthType = 'basic' | 'bearer' | 'token' | 'oauth2' | 'none';

/** Fault severity levels per ITU-T M.3100 / 3GPP */
export type FaultSeverity = 'critical' | 'major' | 'minor' | 'warning' | 'cleared';

/** Collector health status */
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

/** Time range for data queries */
export interface TimeRange {
  start: Date;
  end: Date;
}

/** Configuration for a single vendor collector instance */
export interface CollectorConfig {
  vendor: VendorType;
  baseUrl: string;
  username: string;
  password: string;
  region: string;
  pollingIntervalSec: number;
  enabled: boolean;
  authType: AuthType;
  /** Vendor-specific API paths */
  apiPaths: VendorApiPaths;
  /** Supported technologies for this collector */
  supportedTech: Technology[];
  /** Custom headers to include in every request */
  customHeaders?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Maximum concurrent requests */
  maxConcurrentRequests?: number;
  /** Retry configuration */
  retryConfig?: RetryConfig;
}

/** Vendor-specific API endpoint paths */
export interface VendorApiPaths {
  kpi: string;
  faults: string;
  pm: string;
  neInventory: string;
  cellStatus: string;
  health?: string;
  auth?: string;
}

/** Retry configuration */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW DATA — Vendor-specific format before normalization
// ─────────────────────────────────────────────────────────────────────────────

/** Raw KPI data from a vendor OSS */
export interface RawKpiData {
  /** Unique network element identifier */
  neId: string;
  /** Network element name */
  neName: string;
  /** Cell/site identifier */
  cellId?: string;
  /** Cell name */
  cellName?: string;
  /** Technology (2G/3G/4G/5G) */
  technology: Technology;
  /** Measurement timestamp */
  timestamp: Date;
  /** Raw vendor-specific metric key-value pairs */
  metrics: Record<string, number | string | null | undefined>;
  /** Raw JSON payload from vendor (for debugging) */
  rawPayload?: string;
}

/** Raw fault/alarm data from a vendor OSS */
export interface RawFaultData {
  /** Vendor-specific fault/alarm ID */
  faultId: string;
  /** Network element where fault occurred */
  neId: string;
  /** Network element name */
  neName: string;
  /** Fault severity */
  severity: FaultSeverity;
  /** Fault description / alarm text */
  description: string;
  /** Fault category (e.g., equipment, environment, transmission) */
  category: string;
  /** Time when fault was raised */
  raisedAt: Date;
  /** Time when fault was cleared (if applicable) */
  clearedAt?: Date;
  /** Whether fault is acknowledged */
  acknowledged: boolean;
  /** Additional vendor-specific fields */
  extra?: Record<string, unknown>;
  /** Raw JSON payload */
  rawPayload?: string;
}

/** Raw performance management counter data */
export interface RawPerformanceData {
  /** Network element identifier */
  neId: string;
  /** Network element name */
  neName: string;
  /** Cell identifier */
  cellId?: string;
  /** Technology */
  technology: Technology;
  /** Measurement timestamp */
  timestamp: Date;
  /** Counter name-value pairs */
  counters: Record<string, number | null | undefined>;
  /** Granularity of the PM interval (seconds) */
  granularitySec: number;
  /** Raw JSON payload */
  rawPayload?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZED DATA — Vendor-agnostic unified format
// ─────────────────────────────────────────────────────────────────────────────

/** Normalized KPI metric — vendor-agnostic */
export interface NormalizedKpi {
  siteId: string;
  siteCode: string;
  technology: Technology;
  timestamp: Date;
  metricName: string;
  value: number;
  unit: string;
  vendor: VendorType;
  neId: string;
  neName: string;
}

/** Normalized fault — vendor-agnostic */
export interface NormalizedFault {
  faultId: string;
  neId: string;
  neName: string;
  severity: FaultSeverity;
  description: string;
  category: string;
  timestamp: Date;
  acknowledged: boolean;
  vendor: VendorType;
  technology: Technology;
  region: string;
}

/** Normalized performance counter — vendor-agnostic */
export interface NormalizedPerformance {
  neId: string;
  neName: string;
  siteId: string;
  technology: Technology;
  timestamp: Date;
  metricName: string;
  value: number;
  unit: string;
  vendor: VendorType;
  granularitySec: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION RESULTS & HEALTH
// ─────────────────────────────────────────────────────────────────────────────

/** Result of a single collection cycle for one vendor */
export interface CollectionResult {
  vendor: VendorType;
  timestamp: Date;
  durationMs: number;
  technologies: string[];
  kpisCollected: number;
  faultsCollected: number;
  pmCountersCollected: number;
  errors: string[];
  warnings: string[];
  success: boolean;
}

/** Health status of a single vendor collector */
export interface CollectorHealth {
  vendor: VendorType;
  status: HealthStatus;
  lastCollectionAt?: Date;
  lastSuccessAt?: Date;
  lastErrorAt?: Date;
  lastErrorMessage?: string;
  totalCollections: number;
  successCount: number;
  errorCount: number;
  consecutiveErrors: number;
  avgDurationMs: number;
  uptimePercent: number;
}

/** Schedule configuration for a vendor+technology combination */
export interface CollectorSchedule {
  vendor: VendorType;
  technology: Technology;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

/** Full orchestrator status */
export interface OrchestratorStatus {
  uptime: number;
  totalCollections: number;
  totalKpisCollected: number;
  totalFaultsCollected: number;
  totalPmCountersCollected: number;
  collectors: CollectorHealth[];
  schedules: CollectorSchedule[];
  demoMode: boolean;
}

/** Vendor configuration template */
export interface VendorConfig {
  name: string;
  defaultPort: number;
  authType: AuthType;
  supportedTech: Technology[];
  apiPaths: VendorApiPaths;
  pollingIntervals: Record<Technology, number>;
  /** Known metric name mappings: vendor field → normalized field */
  metricMappings: Record<string, string>;
  /** Default pagination size */
  defaultPageSize: number;
  /** Response format: json, xml, csv */
  responseFormat: 'json' | 'xml' | 'csv';
}

/** Simple logger interface */
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

/** Prometheus-compatible metric sample */
export interface PrometheusMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp?: number;
}
