// ══════════════════════════════════════════════════════════════════════════════
// NetOP OSS Collector — ZTE NetNumen U31 Collector
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

interface ZteApiResponse<T> {
  code?: number;
  msg?: string;
  data?: T;
}

interface ZteKpiItem {
  neId?: string;
  neName?: string;
  cellId?: string;
  cellName?: string;
  techType?: string;
  kpiTime?: string;
  kpiData?: Array<{
    kpiName: string;
    kpiValue: number;
  }>;
}

interface ZteAlarmItem {
  alarmSn?: string;
  neId?: string;
  neName?: string;
  alarmLevel?: string;
  alarmTitle?: string;
  alarmDetail?: string;
  occurTime?: string;
  ackFlag?: string;
  alarmSource?: string;
}

interface ZtePmItem {
  neId?: string;
  neName?: string;
  cellId?: string;
  techType?: string;
  pmTime?: string;
  granularity?: number;
  pmData?: Array<{
    counterName: string;
    counterValue: number;
  }>;
}

export class ZteCollector extends BaseVendorCollector {
  private demoSites = generateDemoSites('zte', 15);
  private _token?: string;

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
      await this.getToken();
      return true;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ZTE TOKEN AUTH
  // ─────────────────────────────────────────────────────────────────────────

  private async getToken(): Promise<string> {
    if (this._token) return this._token;

    const authPath = this.config.apiPaths.auth || '/u31/rest/auth/token';
    const response = await this.httpPost<ZteApiResponse<{ token: string }>>(authPath, {
      username: this.config.username,
      password: this.config.password,
    });

    if (response.code !== 0 || !response.data?.token) {
      throw new Error(`ZTE auth failed: ${response.msg || 'no token returned'}`);
    }

    this._token = response.data.token;
    this._authToken = this._token;
    this._tokenExpiresAt = new Date(Date.now() + 7200_000); // 2h expiry
    return this._token;
  }

  /** Override to add ZTE-specific token header */
  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (this._token) {
      headers['X-Auth-Token'] = this._token;
    }
    return headers;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REAL API METHODS
  // ─────────────────────────────────────────────────────────────────────────

  private async fetchRealKpiData(technology: string, timeRange: TimeRange): Promise<RawKpiData[]> {
    await this.getToken();
    const vc = getVendorConfig('zte');

    const body = {
      techType: technology,
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      kpiNames: Object.keys(vc.metricMappings),
    };

    const response = await this.httpPost<ZteApiResponse<ZteKpiItem[]>>(this.config.apiPaths.kpi, body);
    const items = response.data || [];

    return items.map(item => ({
      neId: item.neId || '',
      neName: item.neName || '',
      cellId: item.cellId,
      cellName: item.cellName,
      technology: (item.techType || technology) as RawKpiData['technology'],
      timestamp: item.kpiTime ? new Date(item.kpiTime) : timeRange.end,
      metrics: (item.kpiData || []).reduce((acc, kpi) => {
        acc[kpi.kpiName] = kpi.kpiValue;
        return acc;
      }, {} as Record<string, number | string | null | undefined>),
    }));
  }

  private async fetchRealFaults(timeRange: TimeRange): Promise<RawFaultData[]> {
    await this.getToken();

    const params = {
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      ackFlag: '0', // unacknowledged
      pageSize: '500',
    };

    const response = await this.httpGet<ZteApiResponse<ZteAlarmItem[]>>(this.config.apiPaths.faults, params);
    const items = response.data || [];

    return items.map(a => ({
      faultId: a.alarmSn || '',
      neId: a.neId || '',
      neName: a.neName || '',
      severity: this.mapSeverity(a.alarmLevel || ''),
      description: a.alarmTitle || a.alarmDetail || '',
      category: a.alarmSource || 'equipment',
      raisedAt: a.occurTime ? new Date(a.occurTime) : timeRange.end,
      acknowledged: a.ackFlag === '1',
    }));
  }

  private async fetchRealPmData(technology: string, timeRange: TimeRange): Promise<RawPerformanceData[]> {
    await this.getToken();

    const body = {
      techType: technology,
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      granularity: '900',
    };

    const response = await this.httpPost<ZteApiResponse<ZtePmItem[]>>(this.config.apiPaths.pm, body);
    const items = response.data || [];

    return items.map(item => ({
      neId: item.neId || '',
      neName: item.neName || '',
      cellId: item.cellId,
      technology: (item.techType || technology) as RawPerformanceData['technology'],
      timestamp: item.pmTime ? new Date(item.pmTime) : timeRange.end,
      counters: (item.pmData || []).reduce((acc, c) => {
        acc[c.counterName] = c.counterValue;
        return acc;
      }, {} as Record<string, number | null | undefined>),
      granularitySec: item.granularity || 900,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEMO DATA GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  private fetchDemoKpiData(technology: string, timeRange: TimeRange): RawKpiData[] {
    const sites = this.demoSites.filter(s => s.technology === technology);
    if (sites.length === 0) return [];

    const vc = getVendorConfig('zte');
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
    const faultCount = Math.floor(Math.random() * 5) + 1;
    const faults: RawFaultData[] = [];

    for (let i = 0; i < faultCount; i++) {
      const site = this.demoSites[Math.floor(Math.random() * this.demoSites.length)];
      const category = DEMO_FAULT_CATEGORIES[Math.floor(Math.random() * DEMO_FAULT_CATEGORIES.length)];
      const descriptions = DEMO_FAULT_DESCRIPTIONS[category] || DEMO_FAULT_DESCRIPTIONS.equipment;
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      faults.push({
        faultId: `ZTE-ALM-${Date.now()}-${String(i).padStart(4, '0')}`,
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
        DL_Vol_MByte: Math.floor(Math.random() * 9000),
        UL_Vol_MByte: Math.floor(Math.random() * 2500),
        RRC_Conn_Att: Math.floor(Math.random() * 400),
        RRC_Conn_Succ: Math.floor(Math.random() * 390),
        E_RAB_Drop_Num: Math.floor(Math.random() * 3),
        HO_Exec_Att_N: Math.floor(Math.random() * 180),
        HO_Exec_Succ_N: Math.floor(Math.random() * 175),
      },
      granularitySec: 900,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private mapSeverity(level: string): RawFaultData['severity'] {
    const map: Record<string, RawFaultData['severity']> = {
      '1': 'critical',
      '2': 'major',
      '3': 'minor',
      '4': 'warning',
      'critical': 'critical',
      'major': 'major',
      'minor': 'minor',
      'warning': 'warning',
      'cleared': 'cleared',
    };
    return map[level.toLowerCase()] || 'warning';
  }
}
