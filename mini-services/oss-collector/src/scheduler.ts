/**
 * NetOP OSS Collector — Cron-based Collection Scheduler
 *
 * Manages scheduled and concurrent collections across all vendors.
 * Prevents overload of OSS systems with max concurrency control.
 */

import type { CollectorSchedule, VendorType, Technology } from './types';
import { VENDOR_CONFIGS, intervalToCron, logger, MAX_CONCURRENT_COLLECTIONS } from './config';

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE CRON IMPLEMENTATION (no external dependency at runtime)
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduledJob {
  id: string;
  cronExpr: string;
  intervalMs: number;
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
  fn: () => Promise<void>;
}

/** Parse a simple cron expression and calculate the next run time. */
function parseNextRun(cronExpr: string, from: Date): Date {
  const parts = cronExpr.trim().split(/\s+/);
  const next = new Date(from);

  if (parts.length === 6) {
    // Seconds-level: */N * * * * *
    const secPart = parts[0];
    if (secPart.startsWith('*/')) {
      const interval = parseInt(secPart.slice(2), 10);
      const secs = next.getSeconds();
      next.setSeconds(secs + (interval - (secs % interval)));
      return next;
    }
  }

  if (parts.length >= 5) {
    // Minute-level: */N * * * *
    const minPart = parts[0];
    if (minPart.startsWith('*/')) {
      const interval = parseInt(minPart.slice(2), 10);
      next.setSeconds(0, 0);
      const mins = next.getMinutes();
      next.setMinutes(mins + (interval - (mins % interval)));
      return next;
    }

    // Hour-level: 0 */N * * *
    if (parts[0] === '0' && parts[1]?.startsWith('*/')) {
      const interval = parseInt(parts[1].slice(2), 10);
      next.setSeconds(0, 0);
      next.setMinutes(0, 0);
      const hrs = next.getHours();
      next.setHours(hrs + (interval - (hrs % interval)));
      return next;
    }
  }

  // Fallback: 5 minutes
  next.setMinutes(next.getMinutes() + 5);
  return next;
}

export class CollectionScheduler {
  private jobs = new Map<string, ScheduledJob>();
  private running = false;
  private timer?: ReturnType<typeof setInterval>;
  private activeCollections = 0;
  private _tickIntervalMs = 5000; // Check every 5 seconds

  /** Build default schedules for all vendors and technologies */
  buildSchedules(): CollectorSchedule[] {
    const schedules: CollectorSchedule[] = [];

    for (const vendor of Object.keys(VENDOR_CONFIGS) as VendorType[]) {
      const vc = VENDOR_CONFIGS[vendor];
      for (const tech of vc.supportedTech) {
        const intervalSec = vc.pollingIntervals[tech];
        schedules.push({
          vendor,
          technology: tech as Technology,
          cronExpression: intervalToCron(intervalSec),
          enabled: true,
        });
      }
    }

    return schedules;
  }

  /** Register a collection function for a vendor+technology */
  register(id: string, cronExpr: string, fn: () => Promise<void>): void {
    const intervalMs = this.cronToMs(cronExpr);
    this.jobs.set(id, {
      id,
      cronExpr,
      intervalMs,
      enabled: true,
      nextRun: parseNextRun(cronExpr, new Date()),
      fn,
    });
    logger.info(`Scheduled job registered: ${id} (${cronExpr}, every ${Math.round(intervalMs / 1000)}s)`);
  }

  /** Update a schedule's cron expression */
  updateSchedule(id: string, cronExpr: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    job.cronExpr = cronExpr;
    job.intervalMs = this.cronToMs(cronExpr);
    job.nextRun = parseNextRun(cronExpr, new Date());
    logger.info(`Schedule updated: ${id} → ${cronExpr}`);
    return true;
  }

  /** Toggle a schedule on/off */
  toggleSchedule(id: string, enabled: boolean): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    job.enabled = enabled;
    logger.info(`Schedule ${enabled ? 'enabled' : 'disabled'}: ${id}`);
    return true;
  }

  /** Start the scheduler loop */
  start(): void {
    if (this.running) return;
    this.running = true;
    logger.info(`Scheduler started with ${this.jobs.size} jobs, tick interval ${this._tickIntervalMs}ms`);

    this.timer = setInterval(() => this.tick(), this._tickIntervalMs);
  }

  /** Stop the scheduler loop */
  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    logger.info('Scheduler stopped');
  }

  /** Get all current schedules */
  getSchedules(): CollectorSchedule[] {
    const schedules: CollectorSchedule[] = [];
    for (const [id, job] of this.jobs) {
      const [vendor, tech] = id.split(':') as [VendorType, Technology];
      schedules.push({
        vendor,
        technology: tech,
        cronExpression: job.cronExpr,
        enabled: job.enabled,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
      });
    }
    return schedules;
  }

  /** Check if at max concurrency */
  isAtCapacity(): boolean {
    return this.activeCollections >= MAX_CONCURRENT_COLLECTIONS;
  }

  /** Current number of active collections */
  getActiveCount(): number {
    return this.activeCollections;
  }

  // ───────────────────────────────────────────────────────────────────────
  // PRIVATE
  // ───────────────────────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    const now = new Date();

    for (const [id, job] of this.jobs) {
      if (!job.enabled) continue;
      if (now < job.nextRun) continue;
      if (this.isAtCapacity()) {
        logger.debug(`Skipping ${id} — at max concurrency (${this.activeCollections}/${MAX_CONCURRENT_COLLECTIONS})`);
        continue;
      }

      // Execute the job
      job.lastRun = new Date();
      job.nextRun = parseNextRun(job.cronExpr, new Date(Date.now() + 1000));
      this.activeCollections++;

      // Fire and forget — errors are logged inside the job
      job.fn().finally(() => {
        this.activeCollections--;
      });
    }
  }

  /** Roughly convert cron expression to milliseconds */
  private cronToMs(cronExpr: string): number {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length === 6 && parts[0].startsWith('*/')) {
      return parseInt(parts[0].slice(2), 10) * 1000;
    }
    if (parts[0].startsWith('*/')) {
      return parseInt(parts[0].slice(2), 10) * 60 * 1000;
    }
    if (parts[0] === '0' && parts[1]?.startsWith('*/')) {
      return parseInt(parts[1].slice(2), 10) * 3600 * 1000;
    }
    return 5 * 60 * 1000; // default 5 min
  }
}
