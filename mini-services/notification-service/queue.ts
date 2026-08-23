// ══════════════════════════════════════════════════════════════════════════════
// NetOptima Algérie — Priority Notification Queue
// ══════════════════════════════════════════════════════════════════════════════

import { v4 as uuidv4 } from 'uuid';
import type { NotificationRecord, NotificationPriority, DeliveryStatus, NotifyRequest, EscalationLevel } from './types';
import { PRIORITY_WEIGHT } from './types';
import { dispatchNotification } from './channels';
import { getTemplate, renderTemplateWithLocale } from './templates';
import { checkEscalation, triggerEscalation, setNotificationRecordGetter } from './escalation';

// ─── In-Memory Notification Store ───────────────────────────────────────────

const notificationStore = new Map<string, NotificationRecord>();
const MAX_STORE_SIZE = 50_000;

// ─── Queue Configuration ────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2_000; // 2s, then 4s, then 8s (exponential backoff)
const QUEUE_PROCESS_INTERVAL_MS = 500; // Process queue every 500ms
const ESCALATION_CHECK_INTERVAL_MS = 30_000; // Check escalations every 30s

// ─── Priority Queue (min-heap by priority weight, then by creation time) ────

interface QueueEntry {
  notificationId: string;
  priority: number; // PRIORITY_WEIGHT value
  createdAt: number; // timestamp for FIFO within same priority
  scheduledAt: number; // when to process (for retry backoff)
}

class PriorityQueue {
  private heap: QueueEntry[] = [];

  enqueue(entry: QueueEntry) {
    this.heap.push(entry);
    this._bubbleUp(this.heap.length - 1);
  }

  dequeue(): QueueEntry | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  peek(): QueueEntry | undefined {
    return this.heap[0];
  }

  get size(): number {
    return this.heap.length;
  }

  /** Re-schedule a notification for retry */
  reschedule(notificationId: string, priority: number, delayMs: number) {
    this.enqueue({
      notificationId,
      priority: priority + 0.1, // slightly lower priority for retries
      createdAt: Date.now(),
      scheduledAt: Date.now() + delayMs,
    });
  }

  /** Remove all entries for a given notification ID */
  remove(notificationId: string) {
    this.heap = this.heap.filter(e => e.notificationId !== notificationId);
  }

  /** Get next entry that is ready to process (scheduledAt <= now) */
  dequeueReady(): QueueEntry | undefined {
    const now = Date.now();
    // Peek at top to see if it's ready
    while (this.heap.length > 0) {
      const top = this.heap[0];
      if (top.scheduledAt <= now) {
        return this.dequeue();
      }
      // Not ready yet — nothing below it can be ready either (higher priority = earlier)
      // Actually, this is a min-heap by priority so we need to scan
      // For efficiency, just check if ANY entry is ready
      const readyIdx = this.heap.findIndex(e => e.scheduledAt <= now);
      if (readyIdx === -1) return undefined;
      // Swap to top and dequeue
      const [entry] = this.heap.splice(readyIdx, 1);
      return entry;
    }
    return undefined;
  }

  private _bubbleUp(i: number) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this._compare(i, parent) < 0) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
        i = parent;
      } else break;
    }
  }

  private _sinkDown(i: number) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this._compare(left, smallest) < 0) smallest = left;
      if (right < n && this._compare(right, smallest) < 0) smallest = right;
      if (smallest !== i) {
        [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
        i = smallest;
      } else break;
    }
  }

  /** Compare: higher priority first, then earlier createdAt */
  private _compare(a: number, b: number): number {
    const ea = this.heap[a];
    const eb = this.heap[b];
    // Higher priority value first (negate for min-heap)
    if (ea.priority !== eb.priority) return eb.priority - ea.priority;
    // Earlier createdAt first
    return ea.createdAt - eb.createdAt;
  }
}

const queue = new PriorityQueue();

// ─── Notification Creation ──────────────────────────────────────────────────

/** Create a notification record from a request */
export function createNotification(req: NotifyRequest): NotificationRecord {
  const id = uuidv4();
  const now = new Date().toISOString();

  // Resolve template if provided
  let subject = req.subject || null;
  let body = req.body;
  let templateId: string | null = req.templateId || null;

  if (req.templateId) {
    const template = getTemplate(req.templateId);
    if (template) {
      const rendered = renderTemplateWithLocale(template, req.locale || 'en', req.variables);
      subject = rendered.subject || subject;
      body = rendered.body;
    }
  }

  const record: NotificationRecord = {
    id,
    channel: req.channel,
    recipient: req.recipient,
    subject,
    body,
    priority: req.priority,
    locale: req.locale || 'en',
    status: 'pending',
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    errorMessage: null,
    templateId,
    alertId: req.alertId || null,
    siteId: req.siteId || null,
    escalationLevel: 1 as EscalationLevel,
    acknowledged: false,
    createdAt: now,
    updatedAt: now,
    sentAt: null,
    deliveredAt: null,
    failedAt: null,
    metadata: {
      originalRequest: { ...req },
    },
  };

  // Evict oldest if over cap
  if (notificationStore.size >= MAX_STORE_SIZE) {
    const oldestKey = Array.from(notificationStore.entries())
      .sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt))[0]?.[0];
    if (oldestKey) notificationStore.delete(oldestKey);
  }

  notificationStore.set(id, record);

  // Enqueue for processing
  queue.enqueue({
    notificationId: id,
    priority: PRIORITY_WEIGHT[req.priority],
    createdAt: Date.now(),
    scheduledAt: Date.now(), // process immediately
  });

  console.log(
    `[Queue] Enqueued notification ${id} | ${req.channel} → ${req.recipient} | ` +
    `priority=${req.priority} | queue_size=${queue.size}`,
  );

  return record;
}

// ─── Queue Processor ────────────────────────────────────────────────────────

async function processQueue() {
  const maxBatch = 20; // process up to 20 per tick
  let processed = 0;

  while (processed < maxBatch) {
    const entry = queue.dequeueReady();
    if (!entry) break;

    const record = notificationStore.get(entry.notificationId);
    if (!record) {
      // Record was evicted or doesn't exist
      processed++;
      continue;
    }

    // Skip if already delivered or permanently failed
    if (record.status === 'delivered' || (record.status === 'failed' && record.retryCount >= record.maxRetries)) {
      processed++;
      continue;
    }

    // Update status to sending
    record.status = 'sending';
    record.updatedAt = new Date().toISOString();

    // Dispatch to channel
    const result = await dispatchNotification(
      record.channel,
      record.recipient,
      record.subject || undefined,
      record.body,
      record.id,
    );

    const now = new Date().toISOString();

    if (result.success) {
      record.status = 'sent';
      record.sentAt = now;
      record.updatedAt = now;

      // For in_app and push, mark as delivered immediately
      if (record.channel === 'in_app' || record.channel === 'push') {
        record.status = 'delivered';
        record.deliveredAt = now;
      }

      console.log(
        `[Queue] ✓ Sent ${record.id} | ${record.channel} → ${record.recipient} | ` +
        `msgId=${result.messageId}`,
      );
    } else {
      record.retryCount++;
      record.errorMessage = result.errorMessage || 'Unknown dispatch error';

      if (record.retryCount >= record.maxRetries) {
        record.status = 'failed';
        record.failedAt = now;
        record.updatedAt = now;
        console.error(
          `[Queue] ✗ FAILED ${record.id} after ${record.maxRetries} retries | ` +
          `error: ${record.errorMessage}`,
        );
      } else {
        record.status = 'pending';
        record.updatedAt = now;

        // Exponential backoff: 2s, 4s, 8s
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, record.retryCount - 1);
        queue.reschedule(
          record.id,
          PRIORITY_WEIGHT[record.priority],
          delayMs,
        );

        console.log(
          `[Queue] ↻ Retrying ${record.id} in ${delayMs}ms | ` +
          `attempt ${record.retryCount}/${record.maxRetries} | error: ${record.errorMessage}`,
        );
      }
    }

    processed++;
  }
}

// ─── Status Query ───────────────────────────────────────────────────────────

export function getNotificationStatus(id: string): NotificationRecord | undefined {
  return notificationStore.get(id);
}

/** Acknowledge a notification (stops escalation) */
export function acknowledgeNotification(id: string): boolean {
  const record = notificationStore.get(id);
  if (record) {
    record.acknowledged = true;
    record.updatedAt = new Date().toISOString();
    queue.remove(id); // remove from queue if pending
    console.log(`[Queue] Notification ${id} acknowledged by recipient`);
    return true;
  }
  return false;
}

/** Get queue stats */
export function getQueueStats(): {
  queueSize: number;
  storeSize: number;
  byStatus: Record<DeliveryStatus, number>;
  byPriority: Record<NotificationPriority, number>;
  byChannel: Record<string, number>;
  totalSent: number;
  totalFailed: number;
} {
  const byStatus: Record<DeliveryStatus, number> = {
    pending: 0, sending: 0, sent: 0, delivered: 0, failed: 0,
  };
  const byPriority: Record<NotificationPriority, number> = {
    critical: 0, high: 0, medium: 0, low: 0,
  };
  const byChannel: Record<string, number> = {};
  let totalSent = 0;
  let totalFailed = 0;

  for (const record of notificationStore.values()) {
    byStatus[record.status]++;
    byPriority[record.priority]++;
    byChannel[record.channel] = (byChannel[record.channel] || 0) + 1;
    if (record.status === 'sent' || record.status === 'delivered') totalSent++;
    if (record.status === 'failed') totalFailed++;
  }

  return {
    queueSize: queue.size,
    storeSize: notificationStore.size,
    byStatus,
    byPriority,
    byChannel,
    totalSent,
    totalFailed,
  };
}

// ─── Escalation Checker ─────────────────────────────────────────────────────

function runEscalationCheck() {
 const now = new Date();
  const toEscalate = checkEscalation(Array.from(notificationStore.values()), now);

  for (const { record, rule } of toEscalate) {
    triggerEscalation(record, rule);
  }

  if (toEscalate.length > 0) {
    console.log(`[Escalation] ${toEscalate.length} notification(s) escalated`);
  }
}

// ─── Start Background Workers ──────────────────────────────────────────────

console.log(`[Queue] Starting queue processor (every ${QUEUE_PROCESS_INTERVAL_MS}ms)`);
setInterval(processQueue, QUEUE_PROCESS_INTERVAL_MS);

console.log(`[Escalation] Starting escalation checker (every ${ESCALATION_CHECK_INTERVAL_MS}ms)`);
setInterval(runEscalationCheck, ESCALATION_CHECK_INTERVAL_MS);

// Process any immediately available items after a brief startup delay
setTimeout(processQueue, 1_000);

// Wire up escalation module's access to our store (breaks circular dep)
setNotificationRecordGetter((id: string) => notificationStore.get(id));
