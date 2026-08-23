// ============================================================================
// oss-collector — Scheduled Polling Engine
// Configurable intervals per vendor/source with circuit breaker integration
// ============================================================================

import type { DataSource } from './types';
import { getEnabledSources, insertMetrics, insertCollectionRun, updateSourceLastCollection, getSourceById } from './db';
import { decryptCredentials } from './crypto';
import { getAdapter } from './adapters';
import { type CircuitBreakerMap, getOrCreateBreaker } from './circuit-breaker';

interface SchedulerState {
  active: boolean;
  timers: Map<string, Timer>;
  lastRunAt: Map<string, number>;
  circuitBreakers: CircuitBreakerMap;
}

const state: SchedulerState = {
  active: false,
  timers: new Map(),
  lastRunAt: new Map(),
  circuitBreakers: new Map(),
};

/** Collect metrics from a single data source */
export async function collectFromSource(sourceId: string): Promise<{ metricsCollected: number; status: string; error?: string }> {
  const source = await findSource(sourceId);
  if (!source) return { metricsCollected: 0, status: 'failed', error: `Source ${sourceId} not found` };

  return executeCollection(source);
}

/** Collect from all enabled sources */
export async function collectAll(): Promise<{ total: number; succeeded: number; failed: number; partial: number }> {
  const sources = getEnabledSources();
  let succeeded = 0;
  let failed = 0;
  let partial = 0;

  // Collect from all sources concurrently (each with its own circuit breaker)
  const results = await Promise.allSettled(sources.map((s) => executeCollection(s)));

  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (r.value.status === 'success') succeeded++;
      else if (r.value.status === 'partial') partial++;
      else failed++;
    } else {
      failed++;
    }
  }

  return { total: sources.length, succeeded, failed, partial };
}

async function executeCollection(source: DataSource): Promise<{ metricsCollected: number; status: string; error?: string }> {
  const breaker = getOrCreateBreaker(state.circuitBreakers, source.id);
  const startTime = Date.now();
  const startedAt = new Date().toISOString();

  if (!breaker.canExecute()) {
    const cbState = breaker.getState();
    console.warn(`[scheduler] Skipping ${source.name} — circuit breaker OPEN`);
    updateSourceLastCollection(source.id, `Circuit breaker open since ${cbState.openedAt}`);
    insertCollectionRun({
      sourceId: source.id,
      vendor: source.vendor,
      status: 'skipped',
      startedAt,
      completedAt: new Date().toISOString(),
      metricsCollected: 0,
      errorMessage: `Circuit breaker open since ${cbState.openedAt}`,
      durationMs: 0,
    });
    return { metricsCollected: 0, status: 'skipped' };
  }

  try {
    const creds = await decryptCredentials(source.credentialsEncrypted, getEncryptionKey());
    const adapter = getAdapter(source.vendor);

    const result = await breaker.execute(() =>
      adapter.collect({
        id: source.id,
        host: source.host,
        port: source.port,
        protocol: source.protocol,
        username: creds.username,
        password: creds.password,
        tech: source.tech,
        region: source.region,
        extraConfig: source.extraConfig,
      })
    );

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    // Store metrics
    let storedCount = 0;
    if (result.metrics.length > 0) {
      storedCount = insertMetrics(result.metrics);
    }

    // Log collection run
    insertCollectionRun({
      sourceId: source.id,
      vendor: source.vendor,
      status: result.status,
      startedAt,
      completedAt,
      metricsCollected: storedCount,
      errorMessage: result.error || null,
      durationMs,
    });

    // Update source
    updateSourceLastCollection(source.id, result.error || null);
    state.lastRunAt.set(source.id, Date.now());

    console.log(
      `[scheduler] ${source.vendor.toUpperCase()} ${source.name}: ${result.status}, ` +
      `${storedCount} metrics in ${durationMs}ms`
    );

    return { metricsCollected: storedCount, status: result.status, error: result.error };
  } catch (err) {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    insertCollectionRun({
      sourceId: source.id,
      vendor: source.vendor,
      status: 'failed',
      startedAt,
      completedAt,
      metricsCollected: 0,
      errorMessage: errorMsg,
      durationMs,
    });

    updateSourceLastCollection(source.id, errorMsg);
    state.lastRunAt.set(source.id, Date.now());

    console.error(`[scheduler] ${source.vendor.toUpperCase()} ${source.name} FAILED: ${errorMsg}`);
    return { metricsCollected: 0, status: 'failed', error: errorMsg };
  }
}

/** Start the scheduler — polls each enabled source at its configured interval */
export function startScheduler(encryptionKey: string): void {
  if (state.active) {
    console.log('[scheduler] Already running');
    return;
  }

  setEncryptionKey(encryptionKey);
  state.active = true;

  const sources = getEnabledSources();
  for (const source of sources) {
    scheduleSource(source);
  }

  console.log(`[scheduler] Started with ${sources.length} enabled sources`);

  // Periodically check for new/changed sources every 60s
  setInterval(() => {
    if (!state.active) return;
    const current = getEnabledSources();
    for (const source of current) {
      if (!state.timers.has(source.id)) {
        scheduleSource(source);
        console.log(`[scheduler] New source detected: ${source.name}`);
      }
    }
  }, 60000);
}

function scheduleSource(source: DataSource): void {
  // Clear existing timer if any
  const existing = state.timers.get(source.id);
  if (existing) clearInterval(existing);

  // Initial immediate collection
  setTimeout(() => {
    executeCollection(source).catch((err) => {
      console.error(`[scheduler] Initial collection error for ${source.name}:`, err);
    });
  }, Math.random() * 5000); // Stagger initial collections

  // Schedule recurring collection
  const timer = setInterval(() => {
    executeCollection(source).catch((err) => {
      console.error(`[scheduler] Scheduled collection error for ${source.name}:`, err);
    });
  }, source.pollingIntervalSec * 1000);

  state.timers.set(source.id, timer);
}

/** Stop the scheduler */
export function stopScheduler(): void {
  state.active = false;
  for (const [id, timer] of state.timers) {
    clearInterval(timer);
  }
  state.timers.clear();
  console.log('[scheduler] Stopped');
}

/** Get circuit breaker states for all sources */
export function getCircuitBreakerStates(): CircuitBreakerMap {
  return state.circuitBreakers;
}

/** Reset a specific circuit breaker */
export function resetCircuitBreaker(sourceId: string): boolean {
  const breaker = state.circuitBreakers.get(sourceId);
  if (!breaker) return false;
  breaker.reset();
  return true;
}

/** Check if scheduler is active */
export function isSchedulerActive(): boolean {
  return state.active;
}

// ---- Helpers ----

let _encryptionKey = 'default-enc-key-change-me';
function setEncryptionKey(key: string) { _encryptionKey = key; }
function getEncryptionKey() { return _encryptionKey; }

function findSource(id: string): DataSource | null {
  return getSourceById(id);
}
