// ══════════════════════════════════════════════════════════════════════════════
// NetOP OSS Collector — Huawei U2000 / iManager NETECO Collector
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

interface HuaweiApiResponse<T> {
  code?: number;
  data?: T;
  description?: string;
}

interface HuaweiNe {
  neId?: string;
  neName?: string;
  cellId?: string;
  cellName?: string;
  technology?: string;
}

interface HuaweiKpiItem extends HuaweiNe {
  timeStamp?: string;
  kpiValues?: Record<string, number>;
}

interface HuaweiAlarmItem {
  alarmId?: string;
  neId?: string;
  neName?: string;
  severity?: string;
  alarmName?: string;
  probableCause?: string;
  eventTime?: string;
  ackState?: string;
  alarmType?: string;
}

interface HuaweiPmItem extends HuaweiNe {
  endTime?: string;
  granularity?: number;
  pmValues?: Record<string, number>;
}

export class HuaweiCollector extends BaseVendorCollector {
  private demoSites = generateDemoSites('huawei', 22);
  private _bearerToken?: string;

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
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HUAWEI AUTH — Token-based via Northbound Interface
  // ─────────────────────────────────────────────────────────────────────────

  private async authenticate(): Promise<string> {
    if (this._bearerToken) return this._bearerToken;

    const authPath = this.config.apiPaths.auth || '/restconf/operations/auth/token';
    const response = await this.httpPost<HuaweiApiResponse<{ token: string }>>(authPath, {
      userName: this.config.username,
      password: this.config.password,
    });

    if (response.code !== 0 || !response.data?.token) {
      throw new Error(`Huawei auth failed: ${response.description || 'no token returned'}`);
    }

    this._bearerToken = response.data.token;
    this._authToken = this._bearerToken;
    this._tokenExpiresAt = new Date(Date.now() + 3600_000); // 1h expiry
    return this._bearerToken;
  }

  /** Override auth headers to include Huawei-specific headers */
  protected getAuthHeaders(): Record<string, string> {
    const headers = super.getAuthHeaders();
    headers['UserName'] = this.config.username;
    headers['Accept'] = 'application/json';
    return headers;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REAL API METHODS
  // ─────────────────────────────────────────────────────────────────────────

  private async fetchRealKpiData(technology: string, timeRange: TimeRange): Promise<RawKpiData[]> {
    await this.authenticate();
    const vc = getVendorConfig('huawei');

    const body = {
      technology,
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      kpiNames: Object.keys(vc.metricMappings),
      granularity: '300',
    };

    const response = await this.httpPost<HuaweiApiResponse<HuaweiKpiItem[]>>(this.config.apiPaths.kpi, body);
    const items = response.data || [];

    return items.map(item => ({
      neId: item.neId || '',
      neName: item.neName || '',
      cellId: item.cellId,
      cellName: item.cellName,
      technology: (item.technology || technology) as RawKpiData['technology'],
      timestamp: item.timeStamp ? new Date(item.timeStamp) : timeRange.end,
      metrics: (item.kpiValues || {}) as Record<string, number | string | null | undefined>,
    }));
  }

  private async fetchRealFaults(timeRange: TimeRange): Promise<RawFaultData[]> {
    await this.authenticate();

    const params = {
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      ackState: 'unacked',
      perPage: '500',
    };

    const response = await this.httpGet<HuaweiApiResponse<HuaweiAlarmItem[]>>(this.config.apiPaths.faults, params);
    const items = response.data || [];

    return items.map(a => ({
      faultId: a.alarmId || '',
      neId: a.neId || '',
      neName: a.neName || '',
      severity: this.mapSeverity(a.severity || ''),
      description: a.alarmName || a.probableCause || '',
      category: a.alarmType || 'equipment',
      raisedAt: a.eventTime ? new Date(a.eventTime) : timeRange.end,
      acknowledged: a.ackState === 'acked',
    }));
  }

  private async fetchRealPmData(technology: string, timeRange: TimeRange): Promise<RawPerformanceData[]> {
    await this.authenticate();

    const body = {
      technology,
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      granularity: '900',
    };

    const response = await this.httpPost<HuaweiApiResponse<HuaweiPmItem[]>>(this.config.apiPaths.pm, body);
    const items = response.data || [];

    return items.map(item => ({
      neId: item.neId || '',
      neName: item.neName || '',
      cellId: item.cellId,
      technology: (item.technology || technology) as RawPerformanceData['technology'],
      timestamp: item.endTime ? new Date(item.endTime) : timeRange.end,
      counters: (item.pmValues || {}) as Record<string, number | null | undefined>,
      granularitySec: item.granularity || 900,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEMO DATA GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  private fetchDemoKpiData(technology: string, timeRange: TimeRange): RawKpiData[] {
    const sites = this.demoSites.filter(s => s.technology === technology);
    if (sites.length === 0) return [];

    const vc = getVendorConfig('huawei');
    const reverseMappings = Object.fromEntries(
      Object.entries(vc.metricMappings).map(([k, v]) => [v, k]),
    );

    return sites.map(site => {
      const demoMetrics = generateDemoMetrics(technology);
      const vendorMetrics: Record<string, number | string | null | undefined> = {};
      for (const [normKey, value] of Object.entries(demoMetrics)) {
        vendorMetrics[reverseMappings[normKey] || normKey.toUpperCase()] = value;
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
    const faultCount = Math.floor(Math.random() * 7) + 2;
    const faults: RawFaultData[] = [];

    for (let i = 0; i < faultCount; i++) {
      const site = this.demoSites[Math.floor(Math.random() * this.demoSites.length)];
      const category = DEMO_FAULT_CATEGORIES[Math.floor(Math.random() * DEMO_FAULT_CATEGORIES.length)];
      const descriptions = DEMO_FAULT_DESCRIPTIONS[category] || DEMO_FAULT_DESCRIPTIONS.equipment;
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      faults.push({
        faultId: `HW-ALM-${Date.now()}-${String(i).padStart(4, '0')}`,
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
        DL_Volume_MB: Math.floor(Math.random() * 12000),
        UL_Volume_MB: Math.floor(Math.random() * 4000),
        RRC_Conn_Req: Math.floor(Math.random() * 600),
        RRC_Conn_Succ: Math.floor(Math.random() * 580),
        ERAB_Drop: Math.floor(Math.random() * 4),
        HO_Attempt: Math.floor(Math.random() * 250),
        HO_Success: Math.floor(Math.random() * 240),
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
