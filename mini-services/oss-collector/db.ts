// ============================================================================
// oss-collector — SQLite Database Layer
// Local buffer for collected metrics before forwarding to main API
// Uses bun:sqlite (Bun's built-in SQLite) for zero native-dep compatibility
// ============================================================================

import { Database } from 'bun:sqlite';
import type {
  DataSource,
  DataSourcePublic,
  CreateSourceInput,
  CollectedMetric,
  CollectionRun,
  VendorType,
  ProtocolType,
  TechGeneration,
} from './types';
import { VENDOR_DEFAULT_PROTOCOLS, VENDOR_DEFAULT_PORTS } from './types';
import { encryptCredentials } from './crypto';

let db: Database;
let encryptionKey: string;

export function initDb(dbPath: string, encKey: string): Database {
  encryptionKey = encKey;
  db = new Database(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA foreign_keys = ON");
  createTables();
  return db;
}

/** Must be called after initDb — async because of credential encryption */
export async function seedDefaultSourcesAsync(): Promise<void> {
  const row = db.query('SELECT COUNT(*) as cnt FROM data_sources').get() as { cnt: number } | undefined;
  if (row && row.cnt > 0) return;

  const defaults = [
    {
      name: 'Huawei 4G - Main OSS (Algiers DC)',
      vendor: 'huawei' as const,
      host: '10.200.1.10',
      port: 22,
      protocol: 'ssh' as const,
      username: 'noc_huawei_ro',
      password: 'Huawei_SSH_2024!',
      pollingIntervalSec: 120,
      enabled: true,
      tech: '4G' as const,
      region: 'Algiers',
      extraConfig: { subsystem: 'MBBM', version: 'U2000 V10R018', mmlTimeout: 30000 },
    },
    {
      name: 'Nokia 3G - NetAct (Oran Hub)',
      vendor: 'nokia' as const,
      host: '10.200.2.20',
      port: 443,
      protocol: 'rest' as const,
      username: 'netact_reader',
      password: 'Nokia_REST_2024!',
      pollingIntervalSec: 300,
      enabled: true,
      tech: '3G' as const,
      region: 'Oran',
      extraConfig: { apiVersion: 'v3', verifySsl: false },
    },
    {
      name: 'ZTE 2G - NetNumen (Constantine)',
      vendor: 'zte' as const,
      host: '10.200.3.15',
      port: 8443,
      protocol: 'rest' as const,
      username: 'zte_ro_user',
      password: 'ZTE_REST_2024!',
      pollingIntervalSec: 600,
      enabled: true,
      tech: '2G' as const,
      region: 'Constantine',
      extraConfig: { responseType: 'json', apiPath: '/netnumen/api/v1' },
    },
  ];

  const insert = db.prepare(`
    INSERT INTO data_sources (id, name, vendor, host, port, protocol, credentials, polling_interval_sec, enabled, tech, region, extra_config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: typeof defaults) => {
    for (const d of items) {
      const creds = btoa(JSON.stringify({ username: d.username, password: d.password }));
      insert.run(
        crypto.randomUUID(), d.name, d.vendor, d.host, d.port, d.protocol, creds,
        d.pollingIntervalSec, d.enabled ? 1 : 0, d.tech, d.region,
        JSON.stringify(d.extraConfig)
      );
    }
  });

  insertMany(defaults);
  console.log(`[oss-collector] Seeded ${defaults.length} default Djezzy data sources`);
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS data_sources (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      vendor        TEXT NOT NULL CHECK(vendor IN ('huawei','nokia','zte','ericsson','samsung')),
      host          TEXT NOT NULL,
      port          INTEGER NOT NULL DEFAULT 80,
      protocol      TEXT NOT NULL DEFAULT 'rest' CHECK(protocol IN ('ssh','telnet','rest','soap','grpc')),
      credentials   TEXT NOT NULL,
      polling_interval_sec INTEGER NOT NULL DEFAULT 300,
      enabled       INTEGER NOT NULL DEFAULT 1,
      tech          TEXT NOT NULL DEFAULT '4G' CHECK(tech IN ('2G','3G','4G','5G')),
      region        TEXT NOT NULL DEFAULT 'Algiers',
      extra_config  TEXT NOT NULL DEFAULT '{}',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      last_collected_at TEXT,
      last_error    TEXT
    );

    CREATE TABLE IF NOT EXISTS collected_metrics (
      id            TEXT PRIMARY KEY,
      source_id     TEXT NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
      vendor        TEXT NOT NULL,
      timestamp     TEXT NOT NULL,
      metric_name   TEXT NOT NULL,
      metric_value  REAL NOT NULL,
      unit          TEXT NOT NULL DEFAULT '',
      dimensions    TEXT NOT NULL DEFAULT '{}',
      raw_payload   TEXT,
      collected_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS collection_runs (
      id                  TEXT PRIMARY KEY,
      source_id           TEXT NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
      vendor              TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('success','partial','failed','skipped')),
      started_at          TEXT NOT NULL,
      completed_at        TEXT,
      metrics_collected   INTEGER NOT NULL DEFAULT 0,
      error_message       TEXT,
      duration_ms         INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_metrics_source   ON collected_metrics(source_id);
    CREATE INDEX IF NOT EXISTS idx_metrics_vendor    ON collected_metrics(vendor);
    CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON collected_metrics(timestamp);
    CREATE INDEX IF NOT EXISTS idx_metrics_name     ON collected_metrics(metric_name);
    CREATE INDEX IF NOT EXISTS idx_runs_source      ON collection_runs(source_id);
    CREATE INDEX IF NOT EXISTS idx_runs_status      ON collection_runs(status);
    CREATE INDEX IF NOT EXISTS idx_runs_started     ON collection_runs(started_at);
  `);
}

// ---- Data Source CRUD ----

interface SourceRow {
  id: string;
  name: string;
  vendor: string;
  host: string;
  port: number;
  protocol: string;
  credentials: string;
  polling_interval_sec: number;
  enabled: number;
  tech: string;
  region: string;
  extra_config: string;
  created_at: string;
  updated_at: string;
  last_collected_at: string | null;
  last_error: string | null;
}

function rowToSource(r: SourceRow): DataSource {
  return {
    id: r.id,
    name: r.name,
    vendor: r.vendor as VendorType,
    host: r.host,
    port: r.port,
    protocol: r.protocol as ProtocolType,
    credentialsEncrypted: r.credentials,
    pollingIntervalSec: r.polling_interval_sec,
    enabled: r.enabled === 1,
    tech: r.tech as TechGeneration,
    region: r.region,
    extraConfig: r.extra_config || '{}',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lastCollectedAt: r.last_collected_at,
    lastError: r.last_error,
  };
}

function sourceToPublic(s: DataSource): DataSourcePublic {
  return {
    id: s.id,
    name: s.name,
    vendor: s.vendor,
    host: s.host,
    port: s.port,
    protocol: s.protocol,
    pollingIntervalSec: s.pollingIntervalSec,
    enabled: s.enabled,
    tech: s.tech,
    region: s.region,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    lastCollectedAt: s.lastCollectedAt,
    lastError: s.lastError,
  };
}

export function getAllSources(): DataSourcePublic[] {
  const rows = db.query('SELECT * FROM data_sources ORDER BY created_at').all() as SourceRow[];
  return rows.map((r) => sourceToPublic(rowToSource(r)));
}

export function getSourceById(id: string): DataSource | null {
  const row = db.query('SELECT * FROM data_sources WHERE id = ?').get(id) as SourceRow | undefined;
  return row ? rowToSource(row) : null;
}

export function getEnabledSources(): DataSource[] {
  const rows = db.query('SELECT * FROM data_sources WHERE enabled = 1 ORDER BY polling_interval_sec').all() as SourceRow[];
  return rows.map((r) => rowToSource(r));
}

export async function createSource(input: CreateSourceInput): Promise<DataSourcePublic> {
  const id = crypto.randomUUID();
  const protocol = input.protocol || VENDOR_DEFAULT_PROTOCOLS[input.vendor];
  const port = input.port || VENDOR_DEFAULT_PORTS[input.vendor];
  const credentials = await encryptCredentials(input.username, input.password, encryptionKey);
  const extraConfig = input.extraConfig ? JSON.stringify(input.extraConfig) : '{}';

  db.prepare(`
    INSERT INTO data_sources (id, name, vendor, host, port, protocol, credentials, polling_interval_sec, enabled, tech, region, extra_config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.name, input.vendor, input.host, port, protocol, credentials,
    input.pollingIntervalSec ?? 300, input.enabled !== false ? 1 : 0, input.tech ?? '4G',
    input.region ?? 'Algiers', extraConfig
  );

  const source = getSourceById(id)!;
  return sourceToPublic(source);
}

export function deleteSource(id: string): boolean {
  const result = db.prepare('DELETE FROM data_sources WHERE id = ?').run(id);
  return result.changes > 0;
}

export function updateSourceLastCollection(id: string, error: string | null): void {
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE data_sources SET last_collected_at = ?, last_error = ?, updated_at = ? WHERE id = ?'
  ).run(now, error, now, id);
}

export function getSourceCountByVendor(): Record<VendorType, number> {
  const rows = db.query('SELECT vendor, COUNT(*) as cnt FROM data_sources GROUP BY vendor').all() as { vendor: string; cnt: number }[];
  const result: Record<string, number> = { huawei: 0, nokia: 0, zte: 0, ericsson: 0, samsung: 0 };
  for (const r of rows) {
    result[r.vendor] = r.cnt;
  }
  return result as Record<VendorType, number>;
}

// ---- Metrics ----

export function insertMetrics(metrics: Omit<CollectedMetric, 'id'>[]): number {
  const stmt = db.prepare(`
    INSERT INTO collected_metrics (id, source_id, vendor, timestamp, metric_name, metric_value, unit, dimensions, raw_payload, collected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: Omit<CollectedMetric, 'id'>[]) => {
    let count = 0;
    for (const m of items) {
      stmt.run(
        crypto.randomUUID(), m.sourceId, m.vendor, m.timestamp,
        m.metricName, m.metricValue, m.unit, m.dimensions,
        m.rawPayload, m.collectedAt
      );
      count++;
    }
    return count;
  });

  return insertMany(metrics);
}

interface MetricRow {
  id: string;
  source_id: string;
  vendor: string;
  timestamp: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  dimensions: string;
  raw_payload: string | null;
  collected_at: string;
}

export function getMetrics(page: number, pageSize: number): { metrics: CollectedMetric[]; total: number } {
  const totalRow = db.query('SELECT COUNT(*) as cnt FROM collected_metrics').get() as { cnt: number } | undefined;
  const total = totalRow?.cnt ?? 0;
  const offset = (page - 1) * pageSize;
  const rows = db.query('SELECT * FROM collected_metrics ORDER BY collected_at DESC LIMIT ? OFFSET ?').all(pageSize, offset) as MetricRow[];

  const metrics: CollectedMetric[] = rows.map((r) => ({
    id: r.id,
    sourceId: r.source_id,
    vendor: r.vendor as VendorType,
    timestamp: r.timestamp,
    metricName: r.metric_name,
    metricValue: r.metric_value,
    unit: r.unit || '',
    dimensions: r.dimensions || '{}',
    rawPayload: r.raw_payload,
    collectedAt: r.collected_at,
  }));

  return { metrics, total };
}

export function getTotalMetricsCount(): number {
  const row = db.query('SELECT COUNT(*) as cnt FROM collected_metrics').get() as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}

// ---- Collection Runs ----

export function insertCollectionRun(run: Omit<CollectionRun, 'id'>): string {
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO collection_runs (id, source_id, vendor, status, started_at, completed_at, metrics_collected, error_message, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, run.sourceId, run.vendor, run.status, run.startedAt, run.completedAt,
    run.metricsCollected, run.errorMessage, run.durationMs
  );
  return id;
}

export function getTotalErrorCount(): number {
  const row = db.query(`SELECT COUNT(*) as cnt FROM collection_runs WHERE status = 'failed'`).get() as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}

export function getLastCollectionRun(): { startedAt: string; status: string } | null {
  const row = db.query(
    'SELECT started_at, status FROM collection_runs ORDER BY started_at DESC LIMIT 1'
  ).get() as { started_at: string; status: string } | undefined;
  return row ? { startedAt: row.started_at, status: row.status } : null;
}

// ---- Database Stats ----

export function getDbSizeBytes(): number {
  try {
    const row = db.query(
      'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()'
    ).get() as { size: number } | undefined;
    return row?.size ?? 0;
  } catch {
    return 0;
  }
}

export function getLastCollectionByVendor(vendor: VendorType): string | null {
  const row = db.query(`SELECT started_at FROM collection_runs WHERE vendor = ? AND status != 'skipped' ORDER BY started_at DESC LIMIT 1`).get(vendor) as { started_at: string } | undefined;
  return row?.started_at ?? null;
}

export function getDb(): Database {
  return db;
}
