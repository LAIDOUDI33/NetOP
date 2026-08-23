// ══════════════════════════════════════════════════════════════════════════════
// NetOptima Algérie — Escalation Engine
// ══════════════════════════════════════════════════════════════════════════════

import type { NotificationRecord, EscalationRule, EscalationLevel } from './types';
import { DEFAULT_ESCALATION_RULES } from './types';
import { createNotification } from './queue';

// ─── Escalation Rule Store ──────────────────────────────────────────────────

const escalationRules = new Map<string, EscalationRule>();

/** Track which notifications have already been escalated by which rule */
const escalatedTrack = new Map<string, Set<string>>(); // notificationId -> Set<ruleId>

// ─── Initialize Default Rules ──────────────────────────────────────────────

function seedEscalationRules() {
  for (const rule of DEFAULT_ESCALATION_RULES) {
    escalationRules.set(rule.id, rule);
  }
  console.log(`[Escalation] Loaded ${DEFAULT_ESCALATION_RULES.length} default escalation rules`);
}

// ─── Escalation Check ──────────────────────────────────────────────────────

/**
 * Check all notifications against escalation rules.
 * Returns notifications that should be escalated along with the matching rule.
 */
export function checkEscalation(
  notifications: NotificationRecord[],
  now: Date,
): Array<{ record: NotificationRecord; rule: EscalationRule }> {
  const results: Array<{ record: NotificationRecord; rule: EscalationRule }> = [];

  for (const record of notifications) {
    // Only check unacknowledged, non-failed notifications
    if (record.acknowledged || record.status === 'failed') continue;
    // Only check delivered/sent notifications (not pending/sending)
    if (record.status !== 'delivered' && record.status !== 'sent') continue;

    const createdAt = new Date(record.createdAt);
    const minutesUnacked = (now.getTime() - createdAt.getTime()) / 60_000;

    const alreadyEscalated = escalatedTrack.get(record.id) || new Set();

    for (const rule of escalationRules.values()) {
      if (!rule.enabled) continue;
      if (rule.fromPriority !== record.priority) continue;
      if (alreadyEscalated.has(rule.id)) continue;
      if (minutesUnacked < rule.escalateAfterMinutes) continue;

      results.push({ record, rule });

      // Mark as escalated for this rule
      alreadyEscalated.add(rule.id);
      escalatedTrack.set(record.id, alreadyEscalated);
    }
  }

  return results;
}

// ─── Escalation Trigger ────────────────────────────────────────────────────

/**
 * Trigger an escalation: create a new notification to the escalation recipients.
 */
export function triggerEscalation(record: NotificationRecord, rule: EscalationRule): void {
  const nextLevel = Math.min(record.escalationLevel + 1, 3) as EscalationLevel;

  // Build variable context for escalation template
  const variables = {
    site_name: record.metadata?.originalRequest?.variables?.site_name || 'Unknown',
    site_code: record.metadata?.originalRequest?.variables?.site_code || record.siteId || 'N/A',
    priority: record.priority,
    escalation_level: String(nextLevel),
    unacked_minutes: String(Math.round((Date.now() - new Date(record.createdAt).getTime()) / 60_000)),
  };

  for (const recipient of rule.escalationRecipients) {
    const escalationNotif = createNotification({
      channel: rule.escalationChannel,
      recipient,
      subject: `⬆️ ESCALATED: Unacknowledged ${record.priority} alert — ${variables.site_name}`,
      body: `Alert Escalation Notice\n\n` +
        `The following alert has been escalated due to lack of acknowledgement:\n\n` +
        `Site: ${variables.site_name} (${variables.site_code})\n` +
        `Original Priority: ${record.priority}\n` +
        `Escalation Level: ${nextLevel}\n` +
        `Unacknowledged for: ${variables.unacked_minutes} minutes\n\n` +
        `Original notification ID: ${record.id}\n\n` +
        `Please take immediate action.\n\n` +
        `— NetOptima Algérie NOC`,
      priority: rule.toPriority,
      locale: record.locale,
      variables,
      alertId: record.alertId || undefined,
      siteId: record.siteId || undefined,
    });

    // Mark escalation notification with higher level
    const storedRecord = getNotificationRecord(escalationNotif.id);
    if (storedRecord) {
      storedRecord.escalationLevel = nextLevel;
      storedRecord.metadata.escalatedFrom = record.id;
      storedRecord.metadata.escalationRule = rule.id;
    }
  }

  // Update original record
  record.escalationLevel = nextLevel;
  record.updatedAt = new Date().toISOString();

  console.log(
    `[Escalation] Triggered L${nextLevel} for ${record.id} | ` +
    `rule: ${rule.name} | to ${rule.escalationRecipients.length} recipient(s)`,
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Get a notification record (imported from queue to avoid circular dep) */
function getNotificationRecord(id: string) {
  // Dynamically access the store from queue module
  // We use a simple approach: export a getter from queue
  return getNotificationRecordFromQueue(id);
}

// This will be set by queue.ts to break the circular dependency
let _getRecordFn: ((id: string) => NotificationRecord | undefined) | null = null;

export function setNotificationRecordGetter(fn: (id: string) => NotificationRecord | undefined) {
  _getRecordFn = fn;
}

function getNotificationRecordFromQueue(id: string): NotificationRecord | undefined {
  return _getRecordFn ? _getRecordFn(id) : undefined;
}

// ─── Rule Management ───────────────────────────────────────────────────────

export function listEscalationRules(): EscalationRule[] {
  return Array.from(escalationRules.values());
}

export function getEscalationRule(id: string): EscalationRule | undefined {
  return escalationRules.get(id);
}

export function updateEscalationRule(id: string, updates: Partial<EscalationRule>): EscalationRule | undefined {
  const existing = escalationRules.get(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...updates, id: existing.id };
  escalationRules.set(id, updated);
  return updated;
}

// Initialize
seedEscalationRules();
