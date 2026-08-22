// ══════════════════════════════════════════════════════════════════════════════
// NetOP OSS Collector — Nokia NetAct / NSP Collector
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

interface NokiaGaiaResponse<T> {
 result?: T;
  errorCode?: number;
  errorMessage?: string;
}

interface NokiaKpiRecord {
  managedElementId?: string;
  managedElementName?: string;
  cellId?: string;
  cellName?: string;
  technology?: string;
  measurementTime?: string;
  indicators?: Array<{
    name: string;
    value: number;
    unit?: string;
  }>;
}

interface NokiaAlarm {
  alarmId?: string;
  managedElementId?: string;
  managedElementName?: string;
  perceivedSeverity?: string;
  alarmText?: string;
  specificProblem?: string;
  eventTime?: string;
  ackState?: string;
  alarmType?: string;
}

interface NokiaPmRecord {
  managedElementId?: string;
  managedElementName?: string;
  cellId?: string;
  technology?: string;
  endTime?: string;
  granularity?: number;
  counters?: Array<{
    name: string;
    value: number;
  }>;
}

export class NokiaCollector extends BaseVendorCollector {
  private demoSites = generateDemoSites('nokia', 18);

  constructor(config: CollectorConfig, log?: Logger) {
    super(config, log || logger);
  }

  /** Nokia NSP requires custom Accept headers for mediatype negotiation */
  protected getAuthHeaders(): Record<string, string> {
    const headers = super.getAuthHeaders();
    // Nokia uses mediatype-based content negotiation
    headers['Accept'] = 'application/vnd.nokia.gaia.v1+json';
    headers['Content-Type'] = 'application/vnd.nokia.gaia.v1+json';
    return headers;
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
      const healthPath = this.config.apiPaths.health || '/nsp-gaia/health';
      await this.httpGet(healthPath);
      return true;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REAL API METHODS
  // ─────────────────────────────────────────────────────────────────────────

  private async fetchRealKpiData(technology: string, timeRange: TimeRange): Promise<RawKpiData[]> {
    const vc = getVendorConfig('nokia');
    const body = {
      'kpi-query-input': {
        technology,
        startTime: timeRange.start.toISOString(),
        endTime: timeRange.end.toISOString(),
        indicatorNames: Object.keys(vc.metricMappings),
      },
    };

    const response = await this.httpPost<NokiaGaiaResponse<NokiaKpiRecord[]>>(this.config.apiPaths.kpi, body);
    const records = response.result || [];

    return records.map(r => ({
      neId: r.managedElementId || '',
      neName: r.managedElementName || '',
      cellId: r.cellId,
      cellName: r.cellName,
      technology: (r.technology || technology) as RawKpiData['technology'],
      timestamp: r.measurementTime ? new Date(r.measurementTime) : timeRange.end,
      metrics: (r.indicators || []).reduce((acc, ind) => {
        acc[ind.name] = ind.value;
        return acc;
      }, {} as Record<string, number | string | null | undefined>),
    }));
  }

  private async fetchRealFaults(timeRange: TimeRange): Promise<RawFaultData[]> {
    const params = {
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      ackState: 'UNACKNOWLEDGED',
      limit: '500',
    };

    const response = await this.httpGet<NokiaGaiaResponse<NokiaAlarm[]>>(this.config.apiPaths.faults, params);
    const alarms = response.result || [];

    return alarms.map(a => ({
      faultId: a.alarmId || '',
      neId: a.managedElementId || '',
      neName: a.managedElementName || '',
      severity: this.mapSeverity(a.perceivedSeverity || ''),
      description: a.alarmText || a.specificProblem || '',
      category: a.alarmType || 'equipment',
      raisedAt: a.eventTime ? new Date(a.eventTime) : timeRange.end,
      acknowledged: a.ackState === 'ACKNOWLEDGED',
    }));
  }

  private async fetchRealPmData(technology: string, timeRange: TimeRange): Promise<RawPerformanceData[]> {
    const body = {
      'pm-query-input': {
        technology,
        startTime: timeRange.start.toISOString(),
        endTime: timeRange.end.toISOString(),
        granularity: '900',
      },
    };

    const response = await this.httpPost<NokiaGaiaResponse<NokiaPmRecord[]>>(this.config.apiPaths.pm, body);
    const records = response.result || [];

    return records.map(r => ({
      neId: r.managedElementId || '',
      neName: r.managedElementName || '',
      cellId: r.cellId,
      technology: (r.technology || technology) as RawPerformanceData['technology'],
      timestamp: r.endTime ? new Date(r.endTime) : timeRange.end,
      counters: (r.counters || []).reduce((acc, c) => {
        acc[c.name] = c.value;
        return acc;
      }, {} as Record<string, number | null | undefined>),
      granularitySec: r.granularity || 900,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEMO DATA GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  private fetchDemoKpiData(technology: string, timeRange: TimeRange): RawKpiData[] {
    const sites = this.demoSites.filter(s => s.technology === technology);
    if (sites.length === 0) return [];

    const vc = getVendorConfig('nokia');
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
    const faultCount = Math.floor(Math.random() * 6) + 1;
    const faults: RawFaultData[] = [];

    for (let i = 0; i < faultCount; i++) {
      const site = this.demoSites[Math.floor(Math.random() * this.demoSites.length)];
      const category = DEMO_FAULT_CATEGORIES[Math.floor(Math.random() * DEMO_FAULT_CATEGORIES.length)];
      const descriptions = DEMO_FAULT_DESCRIPTIONS[category] || DEMO_FAULT_DESCRIPTIONS.equipment;
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      faults.push({
        faultId: `NOK-ALM-${Date.now()}-${String(i).padStart(4, '0')}`,
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
        DL_Volume_Mbyte: Math.floor(Math.random() * 11000),
        UL_Volume_Mbyte: Math.floor(Math.random() * 3500),
        RRC_Setup_Att: Math.floor(Math.random() * 550),
        RRC_Setup_Succ: Math.floor(Math.random() * 530),
        E_RAB_Drop: Math.floor(Math.random() * 3),
        HO_Exec_Att: Math.floor(Math.random() * 220),
        HO_Exec_Succ: Math.floor(Math.random() * 215),
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
