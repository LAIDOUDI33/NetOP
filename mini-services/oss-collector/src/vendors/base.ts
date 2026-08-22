// ══════════════════════════════════════════════════════════════════════════════
// NetOP OSS Collector — Abstract BaseVendorCollector
// ══════════════════════════════════════════════════════════════════════════════

import type {
  CollectorConfig,
  CollectorHealth,
  CollectionResult,
  HealthStatus,
  Logger,
  RawFaultData,
  RawKpiData,
  RawPerformanceData,
  RetryConfig,
  TimeRange,
  VendorType,
  FaultSeverity,
} from '../types';

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Abstract base class for all vendor-specific collectors.
 * Each vendor extends this and implements the abstract methods for
 * fetching KPI, fault, and performance data.
 */
export abstract class BaseVendorCollector {
  protected config: CollectorConfig;
  protected logger: Logger;
  protected lastCollectionAt?: Date;
  protected lastSuccessAt?: Date;
  protected lastErrorAt?: Date;
  protected lastErrorMessage?: string;
  protected errorCount = 0;
  protected successCount = 0;
  protected consecutiveErrors = 0;
  protected totalDurationMs = 0;
  protected _authToken?: string;
  protected _tokenExpiresAt?: Date;

  constructor(config: CollectorConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ABSTRACT METHODS — Each vendor must implement these
  // ─────────────────────────────────────────────────────────────────────────

  /** Fetch KPI data for a specific technology and time range */
  abstract fetchKpiData(technology: string, timeRange: TimeRange): Promise<RawKpiData[]>;

  /** Fetch active faults/alarms */
  abstract fetchFaults(timeRange: TimeRange): Promise<RawFaultData[]>;

  /** Fetch performance management counters */
  abstract fetchPerformanceCounters(technology: string, timeRange: TimeRange): Promise<RawPerformanceData[]>;

  /** Test connectivity to the OSS */
  abstract testConnection(): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────────────────
  // COMMON HTTP HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Build authentication headers based on auth type */
  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (this.config.authType) {
      case 'basic':
        headers['Authorization'] = `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`;
        break;
      case 'bearer':
      case 'token':
        if (this._authToken) {
          headers['Authorization'] = `Bearer ${this._authToken}`;
        } else {
          headers['Authorization'] = `Bearer ${this.config.password}`;
        }
        break;
      case 'oauth2':
        if (this._authToken) {
          headers['Authorization'] = `Bearer ${this._authToken}`;
        }
        break;
      case 'none':
        break;
    }

    return headers;
  }

  /** Perform an HTTP GET with retry logic */
  protected async httpGet<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.config.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    return this.executeWithRetry(async () => {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...this.getAuthHeaders(),
        ...this.config.customHeaders,
      };

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this.config.timeoutMs || 30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} from ${url.toString()}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json') || contentType.includes('text/json')) {
        return (await response.json()) as T;
      }
      return (await response.text()) as unknown as T;
    });
  }

  /** Perform an HTTP POST with retry logic */
  protected async httpPost<T = unknown>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, this.config.baseUrl);

    return this.executeWithRetry(async () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...this.getAuthHeaders(),
        ...this.config.customHeaders,
      };

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeoutMs || 30000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} from ${url.toString()}: ${text}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json') || contentType.includes('text/json')) {
        return (await response.json()) as T;
      }
      return (await response.text()) as unknown as T;
    });
  }

  /** Execute an async operation with exponential backoff retry */
  protected async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const retry = this.config.retryConfig || DEFAULT_RETRY;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retry.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(`Attempt ${attempt + 1}/${retry.maxRetries + 1} failed: ${lastError.message}`);

        if (attempt === retry.maxRetries) break;

        const delay = Math.min(
          retry.baseDelayMs * Math.pow(retry.backoffMultiplier, attempt),
          retry.maxDelayMs,
        );
        // Add jitter (±25%)
        const jitter = delay * (0.75 + Math.random() * 0.5);
        this.logger.debug(`Retrying in ${Math.round(jitter)}ms...`);
        await new Promise(resolve => setTimeout(resolve, jitter));
      }
    }

    throw lastError!;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESPONSE PARSERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Simple XML tag value extraction — not a full XML parser, but sufficient for OSS responses */
  protected parseXmlResponse(xml: string): Record<string, string> {
    const result: Record<string, string> = {};
    const tagRegex = /<(\w+)(?:\s[^>]*)?>([^<]*)<\/\1>/g;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(xml)) !== null) {
      result[match[1]] = match[2].trim();
    }
    return result;
  }

  /** Parse a simple CSV response into an array of objects */
  protected parseCsvResponse(csv: string, delimiter = ','): Record<string, string>[] {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] ?? '';
      }
      rows.push(row);
    }

    return rows;
  }

  /** Parse paginated vendor response that uses offset/limit */
  protected async fetchPaginated<T>(
    path: string,
    parseItems: (data: unknown) => T[],
    pageSize: number = 500,
  ): Promise<T[]> {
    const allItems: T[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const data = await this.httpGet<unknown>(path, {
        offset: String(offset),
        limit: String(pageSize),
      });

      const items = parseItems(data);
      allItems.push(...items);

      if (items.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    }

    return allItems;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN COLLECTION METHOD
  // ─────────────────────────────────────────────────────────────────────────

  /** Execute a full collection cycle for all configured technologies */
  async collectAll(technologies: string[]): Promise<CollectionResult> {
    const startTime = Date.now();
    const now = new Date();
    const errors: string[] = [];
    const warnings: string[] = [];
    let kpisCollected = 0;
    let faultsCollected = 0;
    let pmCountersCollected = 0;
    let success = true;

    const timeRange: TimeRange = {
      start: new Date(now.getTime() - (this.config.pollingIntervalSec * 1000 * 2)),
      end: now,
    };

    this.logger.info(`Starting collection for ${this.config.vendor} (${technologies.join(', ')})`);

    for (const tech of technologies) {
      // KPIs
      try {
        const kpis = await this.fetchKpiData(tech, timeRange);
        kpisCollected += kpis.length;
        this.logger.debug(`[${tech}] Fetched ${kpis.length} KPI records`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`KPI [${tech}]: ${msg}`);
        success = false;
        this.logger.error(`Failed to fetch KPIs for ${tech}: ${msg}`);
      }

      // PM Counters
      try {
        const pm = await this.fetchPerformanceCounters(tech, timeRange);
        pmCountersCollected += pm.length;
        this.logger.debug(`[${tech}] Fetched ${pm.length} PM counter records`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`PM [${tech}]: ${msg}`);
        this.logger.warn(`Failed to fetch PM counters for ${tech}: ${msg}`);
      }
    }

    // Faults (technology-agnostic)
    try {
      const faults = await this.fetchFaults(timeRange);
      faultsCollected = faults.length;
      this.logger.debug(`Fetched ${faults.length} fault records`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Faults: ${msg}`);
      success = false;
      this.logger.error(`Failed to fetch faults: ${msg}`);
    }

    const durationMs = Date.now() - startTime;
    this.lastCollectionAt = now;

    if (success) {
      this.successCount++;
      this.lastSuccessAt = now;
      this.consecutiveErrors = 0;
    } else {
      this.errorCount++;
      this.lastErrorAt = now;
      this.lastErrorMessage = errors.join('; ');
      this.consecutiveErrors++;
    }
    this.totalDurationMs += durationMs;

    this.logger.info(
      `Collection complete: ${kpisCollected} KPIs, ${faultsCollected} faults, ${pmCountersCollected} PM counters in ${durationMs}ms` +
      (errors.length ? ` (${errors.length} errors)` : ''),
    );

    return {
      vendor: this.config.vendor,
      timestamp: now,
      durationMs,
      technologies,
      kpisCollected,
      faultsCollected,
      pmCountersCollected,
      errors,
      warnings,
      success,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HEALTH CHECK
  // ─────────────────────────────────────────────────────────────────────────

  getHealth(): CollectorHealth {
    const totalCollections = this.successCount + this.errorCount;
    const uptimePercent = totalCollections > 0
      ? Math.round((this.successCount / totalCollections) * 10000) / 100
      : 100;
    const avgDurationMs = totalCollections > 0
      ? Math.round(this.totalDurationMs / totalCollections)
      : 0;

    let status: HealthStatus = 'unknown';
    if (totalCollections === 0) {
      status = 'unknown';
    } else if (this.consecutiveErrors >= 5) {
      status = 'down';
    } else if (this.consecutiveErrors >= 2) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      vendor: this.config.vendor,
      status,
      lastCollectionAt: this.lastCollectionAt,
      lastSuccessAt: this.lastSuccessAt,
      lastErrorAt: this.lastErrorAt,
      lastErrorMessage: this.lastErrorMessage,
      totalCollections,
      successCount: this.successCount,
      errorCount: this.errorCount,
      consecutiveErrors: this.consecutiveErrors,
      avgDurationMs,
      uptimePercent,
    };
  }

  getVendor(): VendorType {
    return this.config.vendor;
  }

  getConfig(): CollectorConfig {
    return this.config;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA GENERATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a realistic random value within a range */
export function randRange(min: number, max: number, decimals = 1): number {
  return Math.round((Math.random() * (max - min) + min) * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/** Generate realistic KPI metric values */
export function generateDemoMetrics(technology: string): Record<string, number> {
  const metrics: Record<string, number> = {};

  // RF metrics — vary by technology
  if (['4G', '5G'].includes(technology)) {
    metrics.rsrp = randRange(-120, -60, 1);
    metrics.rsrq = randRange(-20, -3, 1);
    metrics.sinr = randRange(-5, 30, 1);
  }
  if (['3G', '4G'].includes(technology)) {
    metrics.rscp = randRange(-120, -60, 1);
    metrics.ecno = randRange(-25, -5, 1);
  }
  if (['2G', '3G'].includes(technology)) {
    metrics.rxlev = randRange(-110, -40, 1);
  }

  // Throughput — 5G is higher
  const dlBase = technology === '5G' ? 500 : technology === '4G' ? 150 : technology === '3G' ? 10 : 0.1;
  const ulBase = technology === '5G' ? 150 : technology === '4G' ? 50 : technology === '3G' ? 3 : 0.05;
  metrics.downloadThroughput = randRange(dlBase * 0.1, dlBase * 1.5, 2);
  metrics.uploadThroughput = randRange(ulBase * 0.1, ulBase * 1.5, 2);

  // Quality metrics
  metrics.latency = randRange(5, 80, 1);
  metrics.jitter = randRange(0.5, 20, 1);
  metrics.packetLoss = randRange(0, 2, 2);
  metrics.availability = randRange(95, 99.99, 2);
  metrics.activeUsers = Math.floor(randRange(10, 500, 0));
  metrics.handoverSuccessRate = randRange(92, 99.9, 2);
  metrics.dropRate = randRange(0, 3, 2);
  metrics.blockedCallRate = randRange(0, 1.5, 2);
  metrics.prbUtilization = randRange(15, 85, 1);
  metrics.cpuUsage = randRange(20, 80, 1);
  metrics.memoryUsage = randRange(30, 75, 1);
  metrics.powerConsumption = randRange(800, 3000, 0);
  metrics.temperature = randRange(25, 55, 1);

  return metrics;
}

/** Generate a list of demo fault severities */
export function pickDemoSeverity(): FaultSeverity {
  const r = Math.random();
  if (r < 0.05) return 'critical';
  if (r < 0.15) return 'major';
  if (r < 0.40) return 'minor';
  if (r < 0.80) return 'warning';
  return 'cleared';
}

/** Demo fault categories */
export const DEMO_FAULT_CATEGORIES = [
  'equipment', 'environment', 'transmission', 'power', 'antenna', 'radio',
  'processing', 'clock_sync', 'backhaul', 'software', 'configuration',
] as const;

/** Demo fault descriptions per category */
export const DEMO_FAULT_DESCRIPTIONS: Record<string, string[]> = {
  equipment: [
    'RRU unit failure detected',
    'BBU board temperature exceeded threshold',
    'Fiber optic module degradation',
    'Power amplifier fault',
  ],
  environment: [
    'Cabinet temperature above critical threshold',
    'Humidity sensor out of range',
    'Door open alarm',
    'Battery voltage low',
  ],
  transmission: [
    'E1/T1 link loss',
    'Optical signal degradation',
    'S1/X2 link failure',
    'CPRI interface error rate high',
  ],
  power: [
    'AC power failure — running on battery',
    'Rectifier module failure',
    'Power supply voltage out of range',
    'Generator fuel level low',
  ],
  antenna: [
    'VSWR exceeds threshold',
    'RET motor malfunction',
    'Antenna tilt angle out of range',
    'TMA noise figure degraded',
  ],
  radio: [
    'UL interference detected',
    'PUSCH power imbalance',
    'PDCCH CCE utilization high',
    'Carrier frequency offset detected',
  ],
  processing: [
    'CPU utilization above 90%',
    'Memory pool exhausted',
    'Process restart detected',
    'Task scheduling delay',
  ],
  clock_sync: [
    'GPS signal lost',
    'PTP synchronization failure',
    'Clock drift exceeds tolerance',
    'SyncE link quality degraded',
  ],
  backhaul: [
    'Backhaul link utilization > 90%',
    'MPLS LSP failover',
    'IPsec tunnel renegotiation',
    'Bandwidth allocation exceeded',
  ],
  software: [
    'Software upgrade pending',
    'License expiration warning',
    'Configuration inconsistency detected',
    'Feature license missing',
  ],
  configuration: [
    'PCI collision detected',
    'Neighbor relation mismatch',
    'Parameter out of recommended range',
    'Frequency refarming required',
  ],
};
