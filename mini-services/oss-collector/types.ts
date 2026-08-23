// ============================================================================
// oss-collector — Type Definitions
// Multi-vendor OSS data collection for Djezzy NOC platform
// ============================================================================

/** Supported telecom equipment vendors used in Algeria */
export type VendorType = 'huawei' | 'nokia' | 'zte' | 'ericsson' | 'samsung';

/** Protocol types used to communicate with vendor OSS systems */
export type ProtocolType = 'ssh' | 'telnet' | 'rest' | 'soap' | 'grpc';

/** Collection status of a single poll cycle */
export type CollectionStatus = 'success' | 'partial' | 'failed' | 'skipped';

/** Circuit breaker states */
export type CircuitState = 'closed' | 'open' | 'half_open';

/** Technology generation for network elements */
export type TechGeneration = '2G' | '3G' | '4G' | '5G';

// ---- Data Source Configuration ----

export interface DataSource {
  id: string;
  name: string;
  vendor: VendorType;
  host: string;
  port: number;
  protocol: ProtocolType;
  credentialsEncrypted: string;
  pollingIntervalSec: number;
  enabled: boolean;
  tech: TechGeneration;
  region: string;
  extraConfig: string; // JSON string for vendor-specific settings
  createdAt: string;
  updatedAt: string;
  lastCollectedAt: string | null;
  lastError: string | null;
}

/** Flat representation for API responses (no encrypted creds) */
export interface DataSourcePublic {
  id: string;
  name: string;
  vendor: VendorType;
  host: string;
  port: number;
  protocol: ProtocolType;
  pollingIntervalSec: number;
  enabled: boolean;
  tech: TechGeneration;
  region: string;
  createdAt: string;
  updatedAt: string;
  lastCollectedAt: string | null;
  lastError: string | null;
}

/** Input for creating a new data source */
export interface CreateSourceInput {
  name: string;
  vendor: VendorType;
  host: string;
  port: number;
  protocol?: ProtocolType;
  username: string;
  password: string;
  pollingIntervalSec?: number;
  enabled?: boolean;
  tech?: TechGeneration;
  region?: string;
  extraConfig?: Record<string, unknown>;
}

// ---- Unified Metric Format ----

/** A single collected metric point in vendor-agnostic format */
export interface CollectedMetric {
  id: string;
  sourceId: string;
  vendor: VendorType;
  timestamp: string;
  metricName: string;
  metricValue: number;
  unit: string;
  dimensions: string; // JSON: { siteId, cellId, technology, region, ... }
  rawPayload: string; // Original vendor response (JSON string)
  collectedAt: string;
}

// ---- Collection Run ----

export interface CollectionRun {
  id: string;
  sourceId: string;
  vendor: VendorType;
  status: CollectionStatus;
  startedAt: string;
  completedAt: string | null;
  metricsCollected: number;
  errorMessage: string | null;
  durationMs: number | null;
}

// ---- Adapter Interface ----

/** Return type from a vendor adapter collection run */
export interface AdapterCollectionResult {
  status: CollectionStatus;
  metrics: Omit<CollectedMetric, 'id'>[];
  error?: string;
  rawResponse?: string;
}

/** What each vendor adapter must implement */
export interface OssAdapter {
  readonly vendor: VendorType;
  readonly displayName: string;
  readonly supportedProtocols: ProtocolType[];
  readonly defaultProtocol: ProtocolType;

  /** Test connectivity to the vendor OSS system */
  probe(source: Omit<DataSource, 'credentialsEncrypted'> & { username: string; password: string }): Promise<boolean>;

  /** Collect metrics from the vendor OSS */
  collect(source: Omit<DataSource, 'credentialsEncrypted'> & { username: string; password: string }): Promise<AdapterCollectionResult>;
}

// ---- Circuit Breaker ----

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

export interface CircuitBreakerState {
  state: CircuitState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  openedAt: string | null;
  totalFailures: number;
  totalSuccesses: number;
}

// ---- API Response Types ----

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  ok: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  vendors: {
    vendor: VendorType;
    status: 'connected' | 'degraded' | 'disconnected' | 'unconfigured';
    circuitBreaker: CircuitBreakerState | null;
    sourcesCount: number;
    lastCollection: string | null;
  }[];
}

export interface CollectorStatusResponse {
  totalSources: number;
  enabledSources: number;
  totalMetricsCollected: number;
  totalErrors: number;
  lastCollectionRun: string | null;
  schedulerActive: boolean;
  uptime: number;
  dbSizeBytes: number;
}

export interface VendorInfo {
  vendor: VendorType;
  displayName: string;
  supportedProtocols: ProtocolType[];
  defaultProtocol: ProtocolType;
  sourcesCount: number;
  circuitBreaker: CircuitBreakerState | null;
  status: 'active' | 'degraded' | 'down' | 'idle';
}

// ---- Constants ----

export const SUPPORTED_VENDORS: VendorType[] = ['huawei', 'nokia', 'zte', 'ericsson', 'samsung'];

export const VENDOR_DISPLAY_NAMES: Record<VendorType, string> = {
  huawei: 'Huawei U2000/MBBM',
  nokia: 'Nokia NetAct',
  zte: 'ZTE NetNumen',
  ericsson: 'Ericsson OSS-RC',
  samsung: 'Samsung 5G RAN',
};

export const VENDOR_DEFAULT_PORTS: Record<VendorType, number> = {
  huawei: 22,
  nokia: 443,
  zte: 8443,
  ericsson: 443,
  samsung: 50051,
};

export const VENDOR_DEFAULT_PROTOCOLS: Record<VendorType, ProtocolType> = {
  huawei: 'ssh',
  nokia: 'rest',
  zte: 'rest',
  ericsson: 'soap',
  samsung: 'grpc',
};

export const CIRCUIT_BREAKER_DEFAULTS: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenMaxAttempts: 2,
};
