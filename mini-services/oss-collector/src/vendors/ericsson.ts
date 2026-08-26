// ══════════════════════════════════════════════════════════════════════════════
// NetOP OSS Collector — Ericsson ENM/OSS-RC Collector
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

interface EricssonKpiResponse {
  kpiRecords?: Array<{
    managedElement?: { id: string; userLabel: string };
    cell?: { id: string; userLabel: string };
    technology?: string;
    measurements?: Array<{
      name: string;
      value: number;
      unit?: string;
    }>;
    timeStamp?: string;
  }>;
}

interface EricssonAlarmResponse {
  alarms?: Array<{
    alarmId?: string;
    managedElement?: { id: string; userLabel: string };
    severity?: string;
    alarmText?: string;
    probableCause?: string;
    eventTime?: string;
    acknowledged?: boolean;
    category?: string;
  }>;
}

interface EricssonPmResponse {
  pmRecords?: Array<{
    managedElement?: { id: string; userLabel: string };
    cell?: { id: string; userLabel: string };
    technology?: string;
    counters?: Array<{
      name: string;
      value: number;
    }>;
    granularity?: number;
    endTime?: string;
  }>;
}

export class EricssonCollector extends BaseVendorCollector {
  private demoSites = generateDemoSites('ericsson', 25);

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
      const healthPath = this.config.apiPaths.health || '/oss/rc/v1/health';
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
    const vc = getVendorConfig('ericsson');
    const body = {
      technology,
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      metricNames: Object.keys(vc.metricMappings),
      granularity: '5min',
    };

    const response = await this.httpPost<EricssonKpiResponse>(this.config.apiPaths.kpi, body);
    const records = response.kpiRecords || [];

    return records.map(r => ({
      neId: r.managedElement?.id || '',
      neName: r.managedElement?.userLabel || '',
      cellId: r.cell?.id,
      cellName: r.cell?.userLabel,
      technology: (r.technology || technology) as RawKpiData['technology'],
      timestamp: r.timeStamp ? new Date(r.timeStamp) : timeRange.end,
      metrics: (r.measurements || []).reduce((acc, m) => {
        acc[m.name] = m.value;
        return acc;
      }, {} as Record<string, number | string | null | undefined>),
    }));
  }

  private async fetchRealFaults(timeRange: TimeRange): Promise<RawFaultData[]> {
    const params = {
      startTime: timeRange.start.toISOString(),
      severity: 'critical,major,minor,warning',
      acknowledged: 'false',
    };

    const response = await this.httpGet<EricssonAlarmResponse>(this.config.apiPaths.faults, params);
    const alarms = response.alarms || [];

    return alarms.map(a => ({
      faultId: a.alarmId || '',
      neId: a.managedElement?.id || '',
      neName: a.managedElement?.userLabel || '',
      severity: this.mapSeverity(a.severity || ''),
      description: a.alarmText || a.probableCause || '',
      category: a.category || 'equipment',
      raisedAt: a.eventTime ? new Date(a.eventTime) : timeRange.end,
      acknowledged: a.acknowledged || false,
    }));
  }

  private async fetchRealPmData(technology: string, timeRange: TimeRange): Promise<RawPerformanceData[]> {
    const body = {
      technology,
      startTime: timeRange.start.toISOString(),
      endTime: timeRange.end.toISOString(),
      granularity: '900',
    };

    const response = await this.httpPost<EricssonPmResponse>(this.config.apiPaths.pm, body);
    const records = response.pmRecords || [];

    return records.map(r => ({
      neId: r.managedElement?.id || '',
      neName: r.managedElement?.userLabel || '',
      cellId: r.cell?.id,
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

    const vc = getVendorConfig('ericsson');
    const reverseMappings = Object.fromEntries(
      Object.entries(vc.metricMappings).map(([k, v]) => [v, k]),
    );

    return sites.map(site => {
      const demoMetrics = generateDemoMetrics(technology);
      const vendorMetrics: Record<string, number | string | null | undefined> = {};
      for (const [normKey, value] of Object.entries(demoMetrics)) {
        const vendorKey = reverseMappings[normKey] || normKey;
        vendorMetrics[vendorKey] = value;
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
    const faultCount = Math.floor(Math.random() * 8) + 2;
    const faults: RawFaultData[] = [];

    for (let i = 0; i < faultCount; i++) {
      const site = this.demoSites[Math.floor(Math.random() * this.demoSites.length)];
      const category = DEMO_FAULT_CATEGORIES[Math.floor(Math.random() * DEMO_FAULT_CATEGORIES.length)];
      const descriptions = DEMO_FAULT_DESCRIPTIONS[category] || DEMO_FAULT_DESCRIPTIONS.equipment;
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      const severity = pickDemoSeverity();

      faults.push({
        faultId: `ERIC-ALM-${Date.now()}-${String(i).padStart(4, '0')}`,
        neId: site.neId,
        neName: site.neName,
        severity,
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
    return sites.map(site => {
      const demoMetrics = generateDemoMetrics(technology);
      // PM counters use slightly different names — add volume-based counters
      return {
        neId: site.neId,
        neName: site.neName,
        cellId: site.cellId,
        technology: technology as RawPerformanceData['technology'],
        timestamp: new Date(timeRange.end.getTime() - Math.random() * 60000),
        counters: {
          ...demoMetrics,
          dlVolumeMB: Math.floor(Math.random() * 10000),
          ulVolumeMB: Math.floor(Math.random() * 3000),
          connReqs: Math.floor(Math.random() * 500),
          connSuccess: Math.floor(Math.random() * 480),
          dropCalls: Math.floor(Math.random() * 5),
          hoAttempts: Math.floor(Math.random() * 200),
          hoSuccess: Math.floor(Math.random() * 195),
        },
        granularitySec: 900,
      };
    });
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
      'A1': 'critical',
      'A2': 'major',
      'A3': 'minor',
      'A4': 'warning',
    };
    return map[severity.toLowerCase()] || 'warning';
  }
}
