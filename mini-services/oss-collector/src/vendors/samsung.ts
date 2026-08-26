// ══════════════════════════════════════════════════════════════════════════════
// NetOP OSS Collector — Samsung 5G RAN Intelligent Controller Collector
// ══════════════════════════════════════════════════════════════════════════════

import { BaseVendorCollector, generateDemoMetrics, pickDemoSeverity, DEMO_FAULT_CATEGORIES, DEMO_FAULT_DESCRIPTIONS } from './base';
import type {
  CollectorConfig,
  RawFaultData,
  RawKpiData,
  RawPerformanceData,
  TimeRange,
  Logger,
} from '../types';
import { IS_DEMO_MODE, generateDemoSites, getVendorConfig, logger } from '../config';

interface SamsungApiResponse<T> {
  status?: number;
  message?: string;
  data?: T;
}

interface SamsungKpiEntry {
  gnbdId?: string;
  gnbdName?: string;
  cellId?: string;
  cellName?: string;
  nrTechnology?: string;
  measurementTime?: string;
  metrics?: Record<string, number>;
}

interface SamsungAlarm {
  alarmSeq?: string;
  gnbdId?: string;
  gnbdName?: string;
  alarmSeverity?: string;
  alarmDescription?: string;
  faultType?: string;
  occurrenceTime?: string;
  ackStatus?: string;
}

interface SamsungPmEntry {
  gnbdId?: string;
  gnbdName?: string;
  cellId?: string;
  nrTechnology?: string;
  endTime?: string;
  granularity?: number;
  counters?: Record<string, number>;
}

export class SamsungCollector extends BaseVendorCollector {
  private demoSites = generateDemoSites('samsung', 12);
  private _accessToken?: string;

  constructor(config: CollectorConfig, log?: Logger) {
    super(config, log || logger);
  }

  async fetchKpiData(technology: string, timeRange: TimeRange): Promise<RawKpiData[]> {
    if (IS_DEMO_MODE) return this.fetchDemoKpiData(technology, timeRange);
    return this.fetchRealKpiData(technology, timeRange);
  }

  async fetchFaults(timeRange: TimeRange): Promise<RawFaultData[]> {
    if (IS_DEMO_MODE) return this.fetchDemoFaults(timeRange);
    return this.fetchRealFaults(timeRange);
  }

  async fetchPerformanceCounters(technology: string, timeRange: TimeRange): Promise<RawPerformanceData[]> {
    if (IS_DEMO_MODE) return this.fetchDemoPmData(technology, timeRange);
    return this.fetchRealPmData(technology, timeRange);
  }

  async testConnection(): Promise<boolean> {
    if (IS_DEMO_MODE) return true;
    try {
      await this.getOAuthToken();
      return true;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SAMSUNG OAUTH2 AUTH
  // ─────────────────────────────────────────────────────────────────────────

  private async getOAuthToken(): Promise<string> {
    if (this._accessToken) return this._accessToken;

    const authPath = this.config.apiPaths.auth || '/api/v1/oauth/token';
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

    const response = await this.executeWithRetry(async () => {
      const res = await fetch(new URL(authPath, this.config.baseUrl).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(this.config.timeoutMs || 30000),
      });

      if (!res.ok) {
        throw new Error(`Samsung OAuth failed: HTTP ${res.status}`);
      }
      return res.json() as Promise<{ access_token?: string; expires_in?: number }>;
    });

    if (!response.access_token) {
      throw new Error('Samsung OAuth failed: no access_token in response');
    }

    this._accessToken = response.access_token;
    this._authToken = this._accessToken;
    this._tokenExpiresAt = new Date(Date.now() + (response.expires_in || 3600) * 1000);
    return this._accessToken;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REAL API METHODS
  // ─────────────────────────────────────────────────────────────────────────

  private async fetchRealKpiData(technology: string, timeRange: TimeRange): Promise<RawKpiData[]> {
    await this.getOAuthToken();
    const vc = getVendorConfig('samsung');

    const body = {
      technology,
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      metricNames: Object.keys(vc.metricMappings),
      interval: '60',
    };

    const response = await this.httpPost<SamsungApiResponse<SamsungKpiEntry[]>>(this.config.apiPaths.kpi, body);
    const items = response.data || [];

    return items.map(item => ({
      neId: item.gnbdId || '',
      neName: item.gnbdName || '',
      cellId: item.cellId,
      cellName: item.cellName,
      technology: (item.nrTechnology || technology) as RawKpiData['technology'],
      timestamp: item.measurementTime ? new Date(item.measurementTime) : timeRange.end,
      metrics: (item.metrics || {}) as Record<string, number | string | null | undefined>,
    }));
  }

  private async fetchRealFaults(timeRange: TimeRange): Promise<RawFaultData[]> {
    await this.getOAuthToken();

    const params = {
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      ackStatus: 'UNACKNOWLEDGED',
      limit: '500',
    };

    const response = await this.httpGet<SamsungApiResponse<SamsungAlarm[]>>(this.config.apiPaths.faults, params);
    const items = response.data || [];

    return items.map(a => ({
      faultId: a.alarmSeq || '',
      neId: a.gnbdId || '',
      neName: a.gnbdName || '',
      severity: this.mapSeverity(a.alarmSeverity || ''),
      description: a.alarmDescription || '',
      category: a.faultType || 'equipment',
      raisedAt: a.occurrenceTime ? new Date(a.occurrenceTime) : timeRange.end,
      acknowledged: a.ackStatus === 'ACKNOWLEDGED',
    }));
  }

  private async fetchRealPmData(technology: string, timeRange: TimeRange): Promise<RawPerformanceData[]> {
    await this.getOAuthToken();

    const body = {
      technology,
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      granularity: '900',
    };

    const response = await this.httpPost<SamsungApiResponse<SamsungPmEntry[]>>(this.config.apiPaths.pm, body);
    const items = response.data || [];

    return items.map(item => ({
      neId: item.gnbdId || '',
      neName: item.gnbdName || '',
      cellId: item.cellId,
      technology: (item.nrTechnology || technology) as RawPerformanceData['technology'],
      timestamp: item.endTime ? new Date(item.endTime) : timeRange.end,
      counters: (item.counters || {}) as Record<string, number | null | undefined>,
      granularitySec: item.granularity || 900,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEMO DATA GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  private fetchDemoKpiData(technology: string, timeRange: TimeRange): RawKpiData[] {
    const sites = this.demoSites.filter(s => s.technology === technology);
    if (sites.length === 0) return [];

    const vc = getVendorConfig('samsung');
    const reverseMappings = Object.fromEntries(
      Object.entries(vc.metricMappings).map(([k, v]) => [v, k]),
    );

    return sites.map(site => {
      const demoMetrics = generateDemoMetrics(technology);
      const vendorMetrics: Record<string, number | string | null | undefined> = {};
      for (const [normKey, value] of Object.entries(demoMetrics)) {
        vendorMetrics[reverseMappings[normKey] || normKey] = value;
      }

      return {
        neId: site.neId,
        neName: site.neName,
        cellId: site.cellId,
        cellName: site.cellName,
        technology: technology as RawKpiData['technology'],
        timestamp: new Date(timeRange.end.getTime() - Math.random() * 60000),
        metrics: vendorMetrics,
      };
    });
  }

  private fetchDemoFaults(timeRange: TimeRange): RawFaultData[] {
    const faultCount = Math.floor(Math.random() * 4) + 1;
    const faults: RawFaultData[] = [];

    for (let i = 0; i < faultCount; i++) {
      const site = this.demoSites[Math.floor(Math.random() * this.demoSites.length)];
      const category = DEMO_FAULT_CATEGORIES[Math.floor(Math.random() * DEMO_FAULT_CATEGORIES.length)];
      const descriptions = DEMO_FAULT_DESCRIPTIONS[category] || DEMO_FAULT_DESCRIPTIONS.equipment;
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      faults.push({
        faultId: `SAM-ALM-${Date.now()}-${String(i).padStart(4, '0')}`,
        neId: site.neId,
        neName: site.neName,
        severity: pickDemoSeverity(),
        description: `[${category.toUpperCase()}] ${description}`,
        category,
        raisedAt: new Date(timeRange.start.getTime() + Math.random() * (timeRange.end.getTime() - timeRange.start.getTime())),
        acknowledged: Math.random() < 0.3,
      });
    }

    return faults;
  }

  private fetchDemoPmData(technology: string, timeRange: TimeRange): RawPerformanceData[] {
    const sites = this.demoSites.filter(s => s.technology === technology);
    return sites.map(site => ({
      neId: site.neId,
      neName: site.neName,
      cellId: site.cellId,
      technology: technology as RawPerformanceData['technology'],
      timestamp: new Date(timeRange.end.getTime() - Math.random() * 60000),
      counters: {
        ...generateDemoMetrics(technology),
        DL_DATA_VOL_MB: Math.floor(Math.random() * 15000),
        UL_DATA_VOL_MB: Math.floor(Math.random() * 5000),
        RRC_SETUP_ATT: Math.floor(Math.random() * 700),
        RRC_SETUP_SUCC: Math.floor(Math.random() * 685),
        DRB_DROP_NUM: Math.floor(Math.random() * 2),
        HO_ATTEMPT_NUM: Math.floor(Math.random() * 280),
        HO_SUCCESS_NUM: Math.floor(Math.random() * 275),
      },
      granularitySec: 900,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private mapSeverity(severity: string): RawFaultData['severity'] {
    const map: Record<string, RawFaultData['severity']> = {
      'critical': 'critical',
      'major': 'major',
      'minor': 'minor',
      'warning': 'warning',
      'cleared': 'cleared',
      'CRITICAL': 'critical',
      'MAJOR': 'major',
      'MINOR': 'minor',
      'WARNING': 'warning',
    };
    return map[severity] || 'warning';
  }
}
