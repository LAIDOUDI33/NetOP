// ============================================================================
// oss-collector — Base Adapter Interface & Utilities
// ============================================================================

import type { OssAdapter, AdapterCollectionResult, CollectionStatus, CollectedMetric, VendorType } from '../types';

/** Common metric dimensions used across all vendors */
export interface MetricDimensions {
  siteId?: string;
  cellId?: string;
  technology?: string;
  region?: string;
  vendorSystem?: string;
  [key: string]: string | number | undefined;
}

/** Build a unified metric object */
export function buildMetric(
  sourceId: string,
  vendor: VendorType,
  metricName: string,
  metricValue: number,
  unit: string,
  dimensions: MetricDimensions,
  rawPayload?: string
): Omit<CollectedMetric, 'id'> {
  const now = new Date().toISOString();
  return {
    sourceId,
    vendor,
    timestamp: now,
    metricName,
    metricValue,
    unit,
    dimensions: JSON.stringify(dimensions),
    rawPayload: rawPayload ?? null,
    collectedAt: now,
  };
}

/** Build a success result */
export function successResult(metrics: Omit<CollectedMetric, 'id'>[], rawResponse?: string): AdapterCollectionResult {
  return { status: 'success' as CollectionStatus, metrics, rawResponse };
}

/** Build a partial result (some metrics collected, some failed) */
export function partialResult(metrics: Omit<CollectedMetric, 'id'>[], error: string, rawResponse?: string): AdapterCollectionResult {
  return { status: 'partial' as CollectionStatus, metrics, error, rawResponse };
}

/** Build a failure result */
export function failureResult(error: string): AdapterCollectionResult {
  return { status: 'failed' as CollectionStatus, metrics: [], error };
}

/** Retry with exponential backoff */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[retry] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/** All adapter implementations must extend this */
export abstract class BaseAdapter implements OssAdapter {
  abstract readonly vendor: VendorType;
  abstract readonly displayName: string;
  abstract readonly supportedProtocols: Array<'ssh' | 'telnet' | 'rest' | 'soap' | 'grpc'>;
  abstract readonly defaultProtocol: 'ssh' | 'telnet' | 'rest' | 'soap' | 'grpc';

  abstract probe(source: { host: string; port: number; protocol: string; username: string; password: string; extraConfig?: string }): Promise<boolean>;
  abstract collect(source: { host: string; port: number; protocol: string; username: string; password: string; id: string; tech?: string; region?: string; extraConfig?: string }): Promise<AdapterCollectionResult>;
}
