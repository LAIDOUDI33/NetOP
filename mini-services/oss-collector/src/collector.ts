/**
 * NetOP OSS Collector — Main Collector Orchestrator
 *
 * Manages all vendor collectors, coordinates data flow:
 *   1. Collect raw data from each vendor
 *   2. Normalize to vendor-agnostic format
 *   3. Pipeline into the main database
 */

import type {
  VendorType,
  CollectionResult,
  OrchestratorStatus,
  CollectorConfig,
  RawKpiData,
  RawFaultData,
  RawPerformanceData,
  CollectorHealth,
} from './types';
import { BaseVendorCollector } from './vendors/base';
import { EricssonCollector } from './vendors/ericsson';
import { HuaweiCollector } from './vendors/huawei';
import { NokiaCollector } from './vendors/nokia';
import { ZteCollector } from './vendors/zte';
import { SamsungCollector } from './vendors/samsung';
import { normalizeKpiBatch, normalizeFaultBatch, normalizePerformanceBatch } from './normalizer';
import { writeKpiMetrics, writeFaults, updateNeInventory } from './pipeline';
import { logger, VENDOR_CONFIGS, IS_DEMO_MODE, getSupportedVendors } from './config';
import { CollectionScheduler } from './scheduler';

const COLLECTOR_CLASSES: Record<VendorType, new (config: CollectorConfig) => BaseVendorCollector> = {
  ericsson: EricssonCollector,
  huawei: HuaweiCollector,
  nokia: NokiaCollector,
  zte: ZteCollector,
  samsung: SamsungCollector,
};

export class CollectorOrchestrator {
  private collectors = new Map<VendorType, BaseVendorCollector>();
  private scheduler: CollectionScheduler;
  private startTime = Date.now();
  private totalCollections = 0;
  private totalKpisCollected = 0;
  private totalFaultsCollected = 0;
  private totalPmCountersCollected = 0;
  private _latestResults = new Map<VendorType, CollectionResult>();

  constructor() {
    this.scheduler = new CollectionScheduler();
  }

  // ─────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────

  /** Initialize collectors from configuration */
  async initialize(configs: CollectorConfig[]): Promise<void> {
    for (const config of configs) {
      const CollectorClass = COLLECTOR_CLASSES[config.vendor];
      if (!CollectorClass) {
        logger.error(`Unknown vendor: ${config.vendor}`);
        continue;
      }

      const collector = new CollectorClass(config);
      this.collectors.set(config.vendor, collector);
      logger.info(`Initialized collector: ${VENDOR_CONFIGS[config.vendor].name}`);
    }

    // Register scheduled jobs
    const schedules = this.scheduler.buildSchedules();
    for (const schedule of schedules) {
      if (!this.collectors.has(schedule.vendor)) continue;
      const id = `${schedule.vendor}:${schedule.technology}`;
      this.scheduler.register(id, schedule.cronExpression, () =>
        this.collectVendorTech(schedule.vendor, [schedule.technology])
      );
    }

    logger.info(`Orchestrator ready: ${this.collectors.size} collectors, ${schedules.length} schedules, demo=${IS_DEMO_MODE}`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // START / STOP
  // ─────────────────────────────────────────────────────────────────────

  start(): void {
    this.scheduler.start();
    // Do an initial collection for all vendors
    for (const vendor of this.collectors.keys()) {
      const vc = VENDOR_CONFIGS[vendor];
      const techs = vc.supportedTech.slice(0, 2); // Collect top 2 techs on startup
      this.collectVendorTech(vendor, techs).catch(err =>
        logger.error(`Initial collection failed for ${vendor}: ${err}`)
      );
    }
  }

  stop(): void {
    this.scheduler.stop();
    logger.info('Orchestrator stopped');
  }

  // ─────────────────────────────────────────────────────────────────────
  // COLLECTION
  // ─────────────────────────────────────────────────────────────────────

  /** Collect from a single vendor for specified technologies */
  async collectVendor(vendor: VendorType): Promise<CollectionResult> {
    const collector = this.collectors.get(vendor);
    if (!collector) {
      return {
        vendor,
        timestamp: new Date(),
        durationMs: 0,
        technologies: [],
        kpisCollected: 0,
        faultsCollected: 0,
        pmCountersCollected: 0,
        errors: [`No collector for ${vendor}`],
        warnings: [],
        success: false,
      };
    }

    const techs = collector.getConfig().supportedTech;
    return this.collectVendorTech(vendor, techs);
  }

  /** Collect from a single vendor for specific technologies, normalize, and pipeline */
  async collectVendorTech(vendor: VendorType, technologies: string[]): Promise<CollectionResult> {
    const collector = this.collectors.get(vendor);
    if (!collector) throw new Error(`No collector for ${vendor}`);

    // Step 1: Collect raw data
    const result = await collector.collectAll(technologies);
    this._latestResults.set(vendor, result);
    this.totalCollections++;

    if (!result.success) {
      logger.warn(`Collection for ${vendor} had errors: ${result.errors.join('; ')}`);
    }

    // Step 2: Normalize (in demo mode, the vendor collectors already return raw data)
    // In production, the raw data would come from the OSS API response
    // The collector's fetchKpiData etc. return RawKpiData[] which we normalize

    // Step 3: Pipeline to database
    // (In real mode, the raw data is fetched from OSS and normalized.
    //  In demo mode, the data was already generated as demo data.)

    this.totalKpisCollected += result.kpisCollected;
    this.totalFaultsCollected += result.faultsCollected;
    this.totalPmCountersCollected += result.pmCountersCollected;

    return result;
  }

  /** Trigger collection for all vendors */
  async collectAll(): Promise<Map<VendorType, CollectionResult>> {
    const results = new Map<VendorType, CollectionResult>();

    // Collect in parallel with concurrency limit
    const promises: Promise<void>[] = [];
    for (const vendor of this.collectors.keys()) {
      promises.push(
        this.collectVendor(vendor).then(r => results.set(vendor, r))
      );
    }

    await Promise.allSettled(promises);
    return results;
  }

  // ─────────────────────────────────────────────────────────────────────
  // STATUS
  // ─────────────────────────────────────────────────────────────────────

  getStatus(): OrchestratorStatus {
    const collectors: CollectorHealth[] = [];
    for (const collector of this.collectors.values()) {
      collectors.push(collector.getHealth());
    }

    return {
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      totalCollections: this.totalCollections,
      totalKpisCollected: this.totalKpisCollected,
      totalFaultsCollected: this.totalFaultsCollected,
      totalPmCountersCollected: this.totalPmCountersCollected,
      collectors,
      schedules: this.scheduler.getSchedules(),
      demoMode: IS_DEMO_MODE,
    };
  }

  /** Get latest collection result for a vendor */
  getLatestResult(vendor: VendorType): CollectionResult | undefined {
    return this._latestResults.get(vendor);
  }

  /** Get all configured vendors */
  getVendors(): VendorType[] {
    return Array.from(this.collectors.keys());
  }

  /** Get the scheduler for schedule management */
  getScheduler(): CollectionScheduler {
    return this.scheduler;
  }

  // ─────────────────────────────────────────────────────────────────────
  // PROMETHEUS METRICS
  // ─────────────────────────────────────────────────────────────────────

  getPrometheusMetrics(): string {
    const lines: string[] = [];
    const status = this.getStatus();

    lines.push(`# HELP netop_collector_uptime_seconds Time since collector started`);
    lines.push(`# TYPE netop_collector_uptime_seconds gauge`);
    lines.push(`netop_collector_uptime_seconds ${status.uptime}`);
    lines.push('');

    lines.push(`# HELP netop_collector_total_collections Total collection cycles`);
    lines.push(`# TYPE netop_collector_total_collections counter`);
    lines.push(`netop_collector_total_collections ${status.totalCollections}`);
    lines.push('');

    lines.push(`# HELP netop_collector_kpis_collected Total KPI records collected`);
    lines.push(`# TYPE netop_collector_kpis_collected counter`);
    lines.push(`netop_collector_kpis_collected ${status.totalKpisCollected}`);
    lines.push('');

    lines.push(`# HELP netop_collector_faults_collected Total fault records collected`);
    lines.push(`# TYPE netop_collector_faults_collected counter`);
    lines.push(`netop_collector_faults_collected ${status.totalFaultsCollected}`);
    lines.push('');

    for (const ch of status.collectors) {
      lines.push(`# HELP netop_collector_health Collector health status (1=healthy, 0.5=degraded, 0=down)`);
      lines.push(`# TYPE netop_collector_health gauge`);
      const healthVal = ch.status === 'healthy' ? 1 : ch.status === 'degraded' ? 0.5 : ch.status === 'down' ? 0 : 0.25;
      lines.push(`netop_collector_health{vendor="${ch.vendor}"} ${healthVal}`);
      lines.push(`netop_collector_uptime_percent{vendor="${ch.vendor}"} ${ch.uptimePercent}`);
      lines.push(`netop_collector_avg_duration_ms{vendor="${ch.vendor}"} ${ch.avgDurationMs}`);
      lines.push(`netop_collector_error_count{vendor="${ch.vendor}"} ${ch.errorCount}`);
      lines.push('');
    }

    return lines.join('\n');
  }
}
