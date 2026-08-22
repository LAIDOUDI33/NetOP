/**
 * NetOP OSS Collector — Data Pipeline
 *
 * Writes normalized data to the main NetOP database via Prisma.
 * Handles batch inserts, deduplication, and error reporting.
 */

import type { NormalizedKpi, NormalizedFault, NormalizedPerformance, FlatKpiRecord, VendorType } from './types';
import { flattenKpiRecords } from './normalizer';
import { DB_URL, BATCH_SIZE, logger, IS_DEMO_MODE } from './config';

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE CLIENT (lazy init, works with SQLite dev or PostgreSQL prod)
// ─────────────────────────────────────────────────────────────────────────────

let prismaClient: any = null;

async function getDb() {
  if (!prismaClient) {
    if (IS_DEMO_MODE) {
      // In demo mode, we don't write to the database — just count
      logger.info('Pipeline running in demo mode — data collection only, no DB writes');
      return null;
    }
    try {
      const { PrismaClient } = await import('@prisma/client');
      prismaClient = new PrismaClient({
        datasourceUrl: DB_URL,
        log: ['error'],
      });
      logger.info('Database client initialized');
    } catch (err) {
      logger.error(`Failed to initialize database: ${err}`);
      return null;
    }
  }
  return prismaClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

export async function writeKpiMetrics(normalizedKpis: NormalizedKpi[]): Promise<{ written: number; errors: number }> {
  if (normalizedKpis.length === 0) return { written: 0, errors: 0 };

  const db = await getDb();
  if (!db) {
    logger.info(`[Pipeline] Demo mode: would write ${normalizedKpis.length} KPI records`);
    return { written: normalizedKpis.length, errors: 0 };
  }

  // Flatten to Prisma-compatible records (aggregate by siteId+technology+timestamp)
  const flatRecords = flattenKpiRecords(normalizedKpis);
  let written = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < flatRecords.length; i += BATCH_SIZE) {
    const batch = flatRecords.slice(i, i + BATCH_SIZE);
    try {
      // Upsert to handle duplicate timestamps from overlapping collections
      await Promise.all(batch.map(async (record) => {
        try {
          await db.kpiMetric.upsert({
            where: {
              siteId_timestamp: {
                siteId: record.siteId,
                timestamp: record.timestamp,
              },
            },
            update: {
              rsrp: record.rsrp,
              rsrq: record.rsrq,
              sinr: record.sinr,
              rscp: record.rscp,
              ecno: record.ecno,
              rxlev: record.rxlev,
              downloadThroughput: record.downloadThroughput,
              uploadThroughput: record.uploadThroughput,
              latency: record.latency,
              jitter: record.jitter,
              packetLoss: record.packetLoss,
              availability: record.availability,
              activeUsers: record.activeUsers,
              handoverSuccessRate: record.handoverSuccessRate,
              dropRate: record.dropRate,
              blockedCallRate: record.blockedCallRate,
              prbUtilization: record.prbUtilization,
              technology: record.technology,
            },
            create: {
              siteId: record.siteId,
              technology: record.technology,
              timestamp: record.timestamp,
              rsrp: record.rsrp ?? null,
              rsrq: record.rsrq ?? null,
              sinr: record.sinr ?? null,
              rscp: record.rscp ?? null,
              ecno: record.ecno ?? null,
              rxlev: record.rxlev ?? null,
              downloadThroughput: record.downloadThroughput ?? null,
              uploadThroughput: record.uploadThroughput ?? null,
              latency: record.latency ?? null,
              jitter: record.jitter ?? null,
              packetLoss: record.packetLoss ?? null,
              availability: record.availability ?? null,
              activeUsers: record.activeUsers ?? null,
              handoverSuccessRate: record.handoverSuccessRate ?? null,
              dropRate: record.dropRate ?? null,
              blockedCallRate: record.blockedCallRate ?? null,
              prbUtilization: record.prbUtilization ?? null,
            },
          });
          written++;
        } catch (err) {
          errors++;
          logger.debug(`KPI upsert failed for ${record.siteId}: ${err}`);
        }
      }));
    } catch (err) {
      errors += batch.length;
      logger.error(`Batch KPI write failed (batch ${Math.floor(i / BATCH_SIZE)}): ${err}`);
    }
  }

  logger.info(`[Pipeline] KPIs written: ${written}, errors: ${errors}`);
  return { written, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// FAULT PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

export async function writeFaults(normalizedFaults: NormalizedFault[], vendor: VendorType): Promise<{ written: number; errors: number }> {
  if (normalizedFaults.length === 0) return { written: 0, errors: 0 };

  const db = await getDb();
  if (!db) {
    logger.info(`[Pipeline] Demo mode: would write ${normalizedFaults.length} fault records`);
    return { written: normalizedFaults.length, errors: 0 };
  }

  let written = 0;
  let errors = 0;

  for (let i = 0; i < normalizedFaults.length; i += BATCH_SIZE) {
    const batch = normalizedFaults.slice(i, i + BATCH_SIZE);
    try {
      await db.ossFaultEvent.createMany({
        data: batch.map(f => ({
          faultId: `${vendor.toUpperCase()}-${f.faultId}`,
          neId: f.neId,
          neName: f.neName,
          severity: f.severity,
          description: f.description,
          category: f.category,
          timestamp: f.timestamp,
          acknowledged: f.acknowledged,
        })),
        skipDuplicates: true,
      });
      written += batch.length;
    } catch (err) {
      errors += batch.length;
      logger.error(`Batch fault write failed: ${err}`);
    }
  }

  logger.info(`[Pipeline] Faults written: ${written}, errors: ${errors}`);
  return { written, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// NE INVENTORY UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export async function updateNeInventory(records: Array<{ neId: string; neName: string; technology: string; vendor: string; region: string; siteId?: string }>, vendor: VendorType): Promise<number> {
  if (records.length === 0) return 0;

  const db = await getDb();
  if (!db) {
    logger.info(`[Pipeline] Demo mode: would update ${records.length} NE records`);
    return records.length;
  }

  let updated = 0;
  for (const ne of records) {
    try {
      await db.ossNetworkElement.upsert({
        where: { neId: ne.neId },
        update: {
          name: ne.neName,
          technology: ne.technology,
          vendor: vendor,
          region: ne.region,
          siteName: ne.neName,
          status: 'active',
          lastPoll: new Date(),
          siteId: ne.siteId || null,
        },
        create: {
          neId: ne.neId,
          name: ne.neName,
          type: 'BTS',
          technology: ne.technology,
          vendor: vendor,
          region: ne.region,
          siteName: ne.neName,
          status: 'active',
          lastPoll: new Date(),
          siteId: ne.siteId || null,
        },
      });
      updated++;
    } catch (err) {
      logger.debug(`NE upsert failed for ${ne.neId}: ${err}`);
    }
  }

  logger.info(`[Pipeline] NE inventory updated: ${updated} records`);
  return updated;
}
