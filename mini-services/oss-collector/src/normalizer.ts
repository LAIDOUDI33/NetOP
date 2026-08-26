/**
 * NetOP OSS Collector — Data Normalizer
 *
 * Transforms vendor-specific raw data into a unified vendor-agnostic format.
 * Each vendor has different field names for the same metrics.
 */

import type { VendorType, NormalizedKpi, NormalizedFault, NormalizedPerformance, RawKpiData, RawFaultData, RawPerformanceData, Technology, FaultSeverity } from './types';
import { VENDOR_CONFIGS, METRIC_UNITS, logger } from './config';

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_MAPS: Record<VendorType, Record<string, FaultSeverity>> = {
  ericsson: {
    critical: 'critical', major: 'major', minor: 'minor', warning: 'warning',
    indeterminate: 'warning', cleared: 'cleared',
  },
  huawei: {
    CRITICAL: 'critical', MAJOR: 'major', MINOR: 'minor', WARNING: 'warning',
    INDETERMINATE: 'warning', CLEARED: 'cleared',
  },
  nokia: {
    CRITICAL: 'critical', MAJOR: 'major', MINOR: 'minor', WARNING: 'warning',
    NORMAL: 'cleared', CLEARED: 'cleared',
  },
  zte: {
    critical: 'critical', major: 'major', minor: 'minor', warning: 'warning',
    info: 'warning', cleared: 'cleared',
  },
  samsung: {
    CRITICAL: 'critical', MAJOR: 'major', MINOR: 'minor', WARNING: 'warning',
    INFO: 'warning', CLEARED: 'cleared',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// KPI NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/** Normalize a raw KPI record from any vendor into vendor-agnostic format */
export function normalizeKpi(raw: RawKpiData, vendor: VendorType, region: string): NormalizedKpi[] {
  const mapping = VENDOR_CONFIGS[vendor].metricMappings;
  const results: NormalizedKpi[] = [];

  for (const [vendorKey, rawValue] of Object.entries(raw.metrics)) {
    if (rawValue === null || rawValue === undefined) continue;

    // Map vendor field name to normalized name
    const normalizedKey = mapping[vendorKey] || vendorKey.toLowerCase();
    const unit = METRIC_UNITS[normalizedKey] || '';

    const numericValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
    if (isNaN(numericValue)) continue;

    results.push({
      siteId: raw.cellId || raw.neId,
      siteCode: raw.cellName || raw.neName,
      technology: raw.technology as Technology,
      timestamp: raw.timestamp,
      metricName: normalizedKey,
      value: numericValue,
      unit,
      vendor,
      neId: raw.neId,
      neName: raw.neName,
    });
  }

  return results;
}

/** Normalize a batch of raw KPI records */
export function normalizeKpiBatch(records: RawKpiData[], vendor: VendorType, region: string): NormalizedKpi[] {
  const results: NormalizedKpi[] = [];
  for (const record of records) {
    try {
      results.push(...normalizeKpi(record, vendor, region));
    } catch (err) {
      logger.warn(`Failed to normalize KPI record for ${record.neId}: ${err}`);
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// FAULT NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/** Normalize severity string from vendor to standard */
export function normalizeSeverity(vendor: VendorType, rawSeverity: string): FaultSeverity {
  const vendorMap = SEVERITY_MAPS[vendor];
  const normalized = vendorMap[rawSeverity] || vendorMap[rawSeverity.toLowerCase()] || 'warning' as FaultSeverity;
  return normalized;
}

/** Normalize a raw fault record from any vendor */
export function normalizeFault(raw: RawFaultData, vendor: VendorType, region: string): NormalizedFault {
  return {
    faultId: raw.faultId,
    neId: raw.neId,
    neName: raw.neName,
    severity: normalizeSeverity(vendor, raw.severity),
    description: raw.description,
    category: raw.category,
    timestamp: raw.raisedAt,
    acknowledged: raw.acknowledged,
    vendor,
    technology: '4G' as Technology, // Default, will be enriched by pipeline from NE inventory
    region,
  };
}

/** Normalize a batch of fault records */
export function normalizeFaultBatch(records: RawFaultData[], vendor: VendorType, region: string): NormalizedFault[] {
  return records.map(r => normalizeFault(r, vendor, region));
}

// ─────────────────────────────────────────────────────────────────────────────
// PM COUNTER NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/** Normalize a raw PM counter record */
export function normalizePerformance(raw: RawPerformanceData, vendor: VendorType): NormalizedPerformance[] {
  const mapping = VENDOR_CONFIGS[vendor].metricMappings;
  const results: NormalizedPerformance[] = [];

  for (const [counterName, rawValue] of Object.entries(raw.counters)) {
    if (rawValue === null || rawValue === undefined) continue;

    const normalizedKey = mapping[counterName] || counterName.toLowerCase();
    const unit = METRIC_UNITS[normalizedKey] || '';
    const numericValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
    if (isNaN(numericValue)) continue;

    results.push({
      neId: raw.neId,
      neName: raw.neName,
      siteId: raw.cellId || raw.neId,
      technology: raw.technology as Technology,
      timestamp: raw.timestamp,
      metricName: normalizedKey,
      value: numericValue,
      unit,
      vendor,
      granularitySec: raw.granularitySec,
    });
  }

  return results;
}

/** Normalize a batch of PM counter records */
export function normalizePerformanceBatch(records: RawPerformanceData[], vendor: VendorType): NormalizedPerformance[] {
  const results: NormalizedPerformance[] = [];
  for (const record of records) {
    try {
      results.push(...normalizePerformance(record, vendor));
    } catch (err) {
      logger.warn(`Failed to normalize PM record for ${record.neId}: ${err}`);
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// FLATTEN TO PRISMA-COMPATIBLE KPI RECORDS
// ─────────────────────────────────────────────────────────────────────────────

/** Convert normalized KPIs into flat Prisma KpiMetric-compatible records */
export interface FlatKpiRecord {
  siteId: string;
  technology: string;
  timestamp: Date;
  rsrp?: number | null;
  rsrq?: number | null;
  sinr?: number | null;
  rscp?: number | null;
  ecno?: number | null;
  rxlev?: number | null;
  downloadThroughput?: number | null;
  uploadThroughput?: number | null;
  latency?: number | null;
  jitter?: number | null;
  packetLoss?: number | null;
  availability?: number | null;
  activeUsers?: number | null;
  handoverSuccessRate?: number | null;
  dropRate?: number | null;
  blockedCallRate?: number | null;
  prbUtilization?: number | null;
  cpuUsage?: number | null;
  memoryUsage?: number | null;
  powerConsumption?: number | null;
  temperature?: number | null;
}

const KPI_FIELD_MAP: Record<string, keyof FlatKpiRecord> = {
  rsrp: 'rsrp',
  rsrq: 'rsrq',
  sinr: 'sinr',
  rscp: 'rscp',
  ecno: 'ecno',
  rxlev: 'rxlev',
  downloadThroughput: 'downloadThroughput',
  uploadThroughput: 'uploadThroughput',
  latency: 'latency',
  jitter: 'jitter',
  packetLoss: 'packetLoss',
  availability: 'availability',
  activeUsers: 'activeUsers',
  handoverSuccessRate: 'handoverSuccessRate',
  dropRate: 'dropRate',
  blockedCallRate: 'blockedCallRate',
  prbUtilization: 'prbUtilization',
  cpuUsage: 'cpuUsage',
  memoryUsage: 'memoryUsage',
  powerConsumption: 'powerConsumption',
  temperature: 'temperature',
};

/** Aggregate normalized KPIs per siteId+technology+timestamp into flat records */
export function flattenKpiRecords(normalized: NormalizedKpi[]): FlatKpiRecord[] {
  const grouped = new Map<string, FlatKpiRecord>();

  for (const nkp of normalized) {
    const key = `${nkp.siteId}|${nkp.technology}|${nkp.timestamp.toISOString()}`;
    let record = grouped.get(key);

    if (!record) {
      record = {
        siteId: nkp.siteId,
        technology: nkp.technology,
        timestamp: nkp.timestamp,
      };
      grouped.set(key, record);
    }

    const field = KPI_FIELD_MAP[nkp.metricName];
    if (field) {
      (record as Record<string, unknown>)[field] = nkp.value;
    }
  }

  return Array.from(grouped.values());
}
