/**
 * Demo-time utility.
 * In demo mode, data may have been seeded hours/days ago.
 * Instead of using real `new Date()`, we look up the most recent KPI
 * timestamp in the database and treat THAT as "now" for all time-windowed
 * queries.  Falls back to real now when the table is empty.
 */
import { db } from '@/lib/db';

let cached: Date | null = null;
let cacheTs = 0;
const TTL = 60_000; // re-query every minute

export async function getDemoNow(): Promise<Date> {
  if (cached && Date.now() - cacheTs < TTL) return cached;
  try {
    const row = await db.kpiMetric.aggregate({
      _max: { timestamp: true },
    });
    if (row._max.timestamp) {
      cached = row._max.timestamp;
      cacheTs = Date.now();
      return cached;
    }
  } catch {
    // DB not available (build time, etc.)
  }
  return new Date();
}

/** Return a Date that is `hours` hours before the demo-now. */
export async function demoHoursAgo(hours: number): Promise<Date> {
  const now = await getDemoNow();
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

/** Return a Date that is `minutes` minutes before the demo-now. */
export async function demoMinutesAgo(minutes: number): Promise<number> {
  const now = await getDemoNow();
  return now.getTime() - minutes * 60 * 1000;
}

/** Return a Date that is `days` days before the demo-now. */
export async function demoDaysAgo(days: number): Promise<Date> {
  const now = await getDemoNow();
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
