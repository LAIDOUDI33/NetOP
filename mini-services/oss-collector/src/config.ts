// ══════════════════════════════════════════════════════════════════════════════
// NetOP OSS Collector — Vendor Configurations & Runtime Settings
// ══════════════════════════════════════════════════════════════════════════════

import type { VendorType, VendorConfig, CollectorConfig, Technology, Logger } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// LOGGER
// ─────────────────────────────────────────────────────────────────────────────

function createLogger(prefix: string): Logger {
  return {
    info(msg: string, ...args: unknown[]) { console.log(`[${prefix}] ${msg}`, ...args); },
    warn(msg: string, ...args: unknown[]) { console.warn(`[${prefix}] ${msg}`, ...args); },
    error(msg: string, ...args: unknown[]) { console.error(`[${prefix}] ${msg}`, ...args); },
    debug(msg: string, ...args: unknown[]) {
      if (process.env.LOG_LEVEL === 'debug') console.log(`[${prefix}:debug] ${msg}`, ...args);
    },
  };
}

export const logger = createLogger('OSS-Collector');

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export const IS_DEMO_MODE = process.env.OSS_DEMO_MODE === 'true';
export const SERVICE_PORT = parseInt(process.env.OSS_COLLECTOR_PORT || '3005', 10);
export const MAX_CONCURRENT_COLLECTIONS = parseInt(process.env.MAX_CONCURRENT_COLLECTIONS || '3', 10);
export const COLLECTION_TIMEOUT_MS = parseInt(process.env.COLLECTION_TIMEOUT_MS || '30000', 10);
export const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);
export const DB_URL = process.env.DATABASE_URL || 'file:../../db/custom.db';

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR CONFIGURATION TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

const VENDOR_CONFIGS: Record<VendorType, VendorConfig> = {
  ericsson: {
    name: 'Ericsson ENM/OSS-RC',
    defaultPort: 8080,
    authType: 'basic',
    supportedTech: ['2G', '3G', '4G', '5G'],
    apiPaths: {
      kpi: '/oss/rc/v1/kpi/query',
      faults: '/oss/rc/v1/alarm/active',
      pm: '/oss/rc/v1/pm/query',
      neInventory: '/oss/rc/v1/ne/inventory',
      cellStatus: '/oss/rc/v1/cell/status',
      health: '/oss/rc/v1/health',
    },
    pollingIntervals: { '2G': 900, '3G': 300, '4G': 300, '5G': 60 },
    metricMappings: {
      dlThroughput: 'downloadThroughput',
      ulThroughput: 'uploadThroughput',
      rsrp: 'rsrp',
      rsrq: 'rsrq',
      sinr: 'sinr',
      rscp: 'rscp',
      ecno: 'ecno',
      rxLev: 'rxlev',
      dlLatency: 'latency',
      jitter: 'jitter',
      packetLoss: 'packetLoss',
      availability: 'availability',
      activeUe: 'activeUsers',
      hoSr: 'handoverSuccessRate',
      dropRate: 'dropRate',
      blcr: 'blockedCallRate',
      prbUtil: 'prbUtilization',
      cpuLoad: 'cpuUsage',
      memLoad: 'memoryUsage',
      powerCons: 'powerConsumption',
      temperature: 'temperature',
    },
    defaultPageSize: 1000,
    responseFormat: 'json',
  },

  huawei: {
    name: 'Huawei U2000 / iManager NETECO',
    defaultPort: 8443,
    authType: 'bearer',
    supportedTech: ['2G', '3G', '4G', '5G'],
    apiPaths: {
      kpi: '/restconf/data/nes/kpi',
      faults: '/restconf/data/nes/alarms/active',
      pm: '/restconf/operations/pm-query',
      neInventory: '/restconf/data/nes/inventory',
      cellStatus: '/restconf/data/nes/cell-status',
      auth: '/restconf/operations/auth/token',
      health: '/restconf/data/nes/health',
    },
    pollingIntervals: { '2G': 900, '3G': 300, '4G': 300, '5G': 60 },
    metricMappings: {
      DL_THROUGHPUT: 'downloadThroughput',
      UL_THROUGHPUT: 'uploadThroughput',
      RSRP: 'rsrp',
      RSRQ: 'rsrq',
      SINR: 'sinr',
      RSCP: 'rscp',
      ECNO: 'ecno',
      RXLEV: 'rxlev',
      DL_LATENCY: 'latency',
      JITTER: 'jitter',
      PACKET_LOSS: 'packetLoss',
      AVAILABILITY: 'availability',
      ACTIVE_UE: 'activeUsers',
      HO_SR: 'handoverSuccessRate',
      DROP_RATE: 'dropRate',
      BLCR: 'blockedCallRate',
      PRB_UTIL: 'prbUtilization',
      CPU_USAGE: 'cpuUsage',
      MEM_USAGE: 'memoryUsage',
      POWER_CONSUMPTION: 'powerConsumption',
      TEMPERATURE: 'temperature',
    },
    defaultPageSize: 500,
    responseFormat: 'json',
  },

  nokia: {
    name: 'Nokia NetAct / NSP',
    defaultPort: 8443,
    authType: 'basic',
    supportedTech: ['2G', '3G', '4G', '5G'],
    apiPaths: {
      kpi: '/restconf/operations/kpi-query',
      faults: '/nsp-gaia/alarms/active',
      pm: '/restconf/operations/pm-query',
      neInventory: '/restconf/data/managed-element-inventory',
      cellStatus: '/nsp-gaia/cell/status',
      health: '/nsp-gaia/health',
    },
    pollingIntervals: { '2G': 900, '3G': 300, '4G': 300, '5G': 60 },
    metricMappings: {
      dlThpKbps: 'downloadThroughput',
      ulThpKbps: 'uploadThroughput',
      rsrp: 'rsrp',
      rsrq: 'rsrq',
      sinr: 'sinr',
      rscp: 'rscp',
      ecNo: 'ecno',
      rxLev: 'rxlev',
      latencyMs: 'latency',
      jitterMs: 'jitter',
      pktLoss: 'packetLoss',
      availPct: 'availability',
      activeUsr: 'activeUsers',
      hoSuccessRate: 'handoverSuccessRate',
      dropRatePct: 'dropRate',
      callBlockRate: 'blockedCallRate',
      prbUtilPct: 'prbUtilization',
      cpuPct: 'cpuUsage',
      memPct: 'memoryUsage',
      pwrConsumption: 'powerConsumption',
      tempCelsius: 'temperature',
    },
    defaultPageSize: 500,
    responseFormat: 'json',
  },

  zte: {
    name: 'ZTE NetNumen U31',
    defaultPort: 8088,
    authType: 'token',
    supportedTech: ['2G', '3G', '4G', '5G'],
    apiPaths: {
      kpi: '/u31/rest/kpi/query',
      faults: '/u31/rest/alarm/active',
      pm: '/u31/rest/pm/query',
      neInventory: '/u31/rest/ne/inventory',
      cellStatus: '/u31/rest/cell/status',
      auth: '/u31/rest/auth/token',
      health: '/u31/rest/health',
    },
    pollingIntervals: { '2G': 900, '3G': 300, '4G': 300, '5G': 60 },
    metricMappings: {
      DL_Tput: 'downloadThroughput',
      UL_Tput: 'uploadThroughput',
      RSRP: 'rsrp',
      RSRQ: 'rsrq',
      SINR: 'sinr',
      RSCP: 'rscp',
      EcNo: 'ecno',
      RxLev: 'rxlev',
      DL_Latency: 'latency',
      Jitter: 'jitter',
      PktLoss: 'packetLoss',
      Avail: 'availability',
      ActiveUE: 'activeUsers',
      HOSR: 'handoverSuccessRate',
      DropRate: 'dropRate',
      BlkCallRate: 'blockedCallRate',
      PRB_Util: 'prbUtilization',
      CPU_Usage: 'cpuUsage',
      MEM_Usage: 'memoryUsage',
      Pwr_Cons: 'powerConsumption',
      Temp: 'temperature',
    },
    defaultPageSize: 500,
    responseFormat: 'json',
  },

  samsung: {
    name: 'Samsung 5G RAN Intelligent Controller',
    defaultPort: 8443,
    authType: 'oauth2',
    supportedTech: ['4G', '5G'],
    apiPaths: {
      kpi: '/api/v1/kpi/query',
      faults: '/api/v1/alarms/active',
      pm: '/api/v1/pm/query',
      neInventory: '/api/v1/ne/inventory',
      cellStatus: '/api/v1/cell/status',
      auth: '/api/v1/oauth/token',
      health: '/api/v1/health',
    },
    pollingIntervals: { '2G': 900, '3G': 300, '4G': 300, '5G': 60 },
    metricMappings: {
      downlinkThroughput: 'downloadThroughput',
      uplinkThroughput: 'uploadThroughput',
      rsrp: 'rsrp',
      rsrq: 'rsrq',
      sinr: 'sinr',
      rscp: 'rscp',
      ecno: 'ecno',
      rxlev: 'rxlev',
      rttLatency: 'latency',
      jitterMs: 'jitter',
      packetLossRate: 'packetLoss',
      availabilityRatio: 'availability',
      connectedUes: 'activeUsers',
      handoverSuccessRatio: 'handoverSuccessRate',
      callDropRatio: 'dropRate',
      callBlockingRatio: 'blockedCallRate',
      prbUsageRatio: 'prbUtilization',
      cpuUtilization: 'cpuUsage',
      memoryUtilization: 'memoryUsage',
      powerWatt: 'powerConsumption',
      temperatureCelsius: 'temperature',
    },
    defaultPageSize: 500,
    responseFormat: 'json',
  },
};

export { VENDOR_CONFIGS };

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT VARIABLE LOADING
// ─────────────────────────────────────────────────────────────────────────────

const VENDOR_ENV_MAP: Record<VendorType, { url: string; user: string; pass: string; region: string }> = {
  ericsson: {
    url: 'ERICSSON_OSS_URL',
    user: 'ERICSSON_OSS_USER',
    pass: 'ERICSSON_OSS_PASS',
    region: 'ERICSSON_REGION',
  },
  huawei: {
    url: 'HUAWEI_OSS_URL',
    user: 'HUAWEI_OSS_USER',
    pass: 'HUAWEI_OSS_PASS',
    region: 'HUAWEI_REGION',
  },
  nokia: {
    url: 'NOKIA_OSS_URL',
    user: 'NOKIA_OSS_USER',
    pass: 'NOKIA_OSS_PASS',
    region: 'NOKIA_REGION',
  },
  zte: {
    url: 'ZTE_OSS_URL',
    user: 'ZTE_OSS_USER',
    pass: 'ZTE_OSS_PASS',
    region: 'ZTE_REGION',
  },
  samsung: {
    url: 'SAMSUNG_OSS_URL',
    user: 'SAMSUNG_OSS_USER',
    pass: 'SAMSUNG_OSS_PASS',
    region: 'SAMSUNG_REGION',
  },
};

/** Build collector configs from environment variables, falling back to demo defaults */
export function buildCollectorConfigs(): CollectorConfig[] {
  const configs: CollectorConfig[] = [];
  const defaultRetry = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2 };

  for (const vendor of Object.keys(VENDOR_CONFIGS) as VendorType[]) {
    const vc = VENDOR_CONFIGS[vendor];
    const envMap = VENDOR_ENV_MAP[vendor];

    const baseUrl = process.env[envMap.url];
    const username = process.env[envMap.user];
    const password = process.env[envMap.pass];
    const region = process.env[envMap.region] || 'default';

    // If no URL is configured and we're in demo mode, still create the config
    const hasRealConfig = !!(baseUrl && username && password);

    if (!hasRealConfig && !IS_DEMO_MODE) {
      logger.info(`Skipping ${vc.name} — no credentials configured (set ${envMap.url})`);
      continue;
    }

    // Default interval: use the shortest supported tech interval
    const defaultInterval = Math.min(...Object.values(vc.pollingIntervals));

    configs.push({
      vendor,
      baseUrl: baseUrl || `http://localhost:${vc.defaultPort}`,
      username: username || 'demo',
      password: password || 'demo',
      region,
      pollingIntervalSec: defaultInterval,
      enabled: true,
      authType: vc.authType,
      apiPaths: vc.apiPaths,
      supportedTech: vc.supportedTech,
      timeoutMs: COLLECTION_TIMEOUT_MS,
      maxConcurrentRequests: 2,
      retryConfig: defaultRetry,
    });
  }

  return configs;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGION / SITE DATA FOR DEMO MODE
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_REGIONS = ['Alger-Centre', 'Oran', 'Constantine', 'Annaba', 'Setif', 'Blida', 'Tlemcen', 'Batna'] as const;

export const DEMO_SITE_PREFIXES: Record<VendorType, string> = {
  ericsson: 'ERI',
  huawei: 'HW',
  nokia: 'NOK',
  zte: 'ZTE',
  samsung: 'SAM',
};

/** Generate a pool of demo site IDs for a vendor */
export function generateDemoSites(vendor: VendorType, count: number = 20): Array<{
  neId: string;
  neName: string;
  cellId: string;
  cellName: string;
  technology: Technology;
  region: string;
  siteCode: string;
}> {
  const prefix = DEMO_SITE_PREFIXES[vendor];
  const vc = VENDOR_CONFIGS[vendor];
  const sites: Array<{ neId: string; neName: string; cellId: string; cellName: string; technology: Technology; region: string; siteCode: string }> = [];

  for (let i = 0; i < count; i++) {
    const region = DEMO_REGIONS[i % DEMO_REGIONS.length];
    const tech = vc.supportedTech[i % vc.supportedTech.length];
    const siteNum = String(i + 1).padStart(3, '0');
    const cellNum = String((i % 3) + 1);

    sites.push({
      neId: `${prefix}-NE-${region.slice(0, 3).toUpperCase()}-${siteNum}`,
      neName: `${region}_${prefix}_BTS_${siteNum}`,
      cellId: `${prefix}-CELL-${region.slice(0, 3).toUpperCase()}-${siteNum}-${cellNum}`,
      cellName: `${region}_${prefix}_CELL_${siteNum}_${cellNum}`,
      technology: tech as Technology,
      region,
      siteCode: `${prefix}${siteNum}_${region.slice(0, 3).toUpperCase()}`,
    });
  }

  return sites;
}

/** Get vendor config template */
export function getVendorConfig(vendor: VendorType): VendorConfig {
  return VENDOR_CONFIGS[vendor];
}

/** Get all supported vendor types */
export function getSupportedVendors(): VendorType[] {
  return Object.keys(VENDOR_CONFIGS) as VendorType[];
}

/** Build cron expression from polling interval in seconds */
export function intervalToCron(intervalSec: number): string {
  if (intervalSec < 60) return `*/${Math.max(1, Math.floor(intervalSec))} * * * * *`;
  if (intervalSec < 3600) return `*/${Math.max(1, Math.floor(intervalSec / 60))} * * * *`;
  const hours = Math.max(1, Math.floor(intervalSec / 3600));
  return `0 */${hours} * * *`;
}

/** Unit mapping for normalized metrics */
export const METRIC_UNITS: Record<string, string> = {
  rsrp: 'dBm',
  rsrq: 'dB',
  sinr: 'dB',
  rscp: 'dBm',
  ecno: 'dB',
  rxlev: 'dBm',
  downloadThroughput: 'Mbps',
  uploadThroughput: 'Mbps',
  latency: 'ms',
  jitter: 'ms',
  packetLoss: '%',
  availability: '%',
  activeUsers: 'count',
  handoverSuccessRate: '%',
  dropRate: '%',
  blockedCallRate: '%',
  prbUtilization: '%',
  cpuUsage: '%',
  memoryUsage: '%',
  powerConsumption: 'W',
  temperature: '°C',
};
