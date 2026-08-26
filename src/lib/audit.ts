/**
 * audit.ts — Centralized audit trail logging utility
 *
 * Fire-and-forget audit entry creation. All methods are non-blocking.
 * Every mutation (POST/PATCH/DELETE) in API routes should call logAudit()
 * to create a tamper-evident record of who did what and when.
 */

import { db } from '@/lib/db';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AuditParams {
  /** What type of entity was affected (e.g. 'site', 'parameter', 'incident', 'alert') */
  entityType: string;
  /** The entity's database ID */
  entityId?: string;
  /** Human-readable name of the entity */
  entityName?: string;
  /** The action performed: create, update, delete, approve, reject, implement, rollback, login, login_failed */
  action: string;
  /** The specific field that changed (for updates) */
  field?: string;
  /** The value before the change */
  previousValue?: string;
  /** The value after the change */
  newValue?: string;
  /** Technology affected (2G, 3G, 4G, 5G) */
  technology?: string;
  /** Category for grouping: parameter, config, site, policy, incident, son, security, user, report, system */
  category?: string;
  /** Who performed the action */
  requestedBy?: string;
  /** Who approved the action (if applicable) */
  approvedBy?: string;
  /** Impact description */
  impact?: string;
}

// ── Core: create audit entry ───────────────────────────────────────────────────

/**
 * Create an audit trail entry in the database.
 * Fire-and-forget — call without await in API routes.
 */
export async function createAuditEntry(params: AuditParams): Promise<void> {
  try {
    await db.auditTrail.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId || null,
        entityName: params.entityName || null,
        action: params.action,
        field: params.field || null,
        previousValue: params.previousValue || null,
        newValue: params.newValue || null,
        technology: params.technology || null,
        category: params.category || 'system',
        requestedBy: params.requestedBy || 'system',
        approvedBy: params.approvedBy || null,
        impact: params.impact || '',
      },
    });
  } catch (error) {
    // Never throw — this is fire-and-forget
    console.error('[Audit] Error creating audit entry:', error);
  }
}

// ── Convenience wrappers ───────────────────────────────────────────────────────

/** Log an audit entry (fire-and-forget) */
export function logAudit(params: AuditParams): void {
  createAuditEntry(params).catch(() => {});
}

/** Extract user name from request headers (x-user-email → lookup) */
export async function getActorFromRequest(request: Request): Promise<string> {
  try {
    const email = request.headers.get('x-user-email');
    if (!email) return 'system';
    const user = await db.user.findUnique({ where: { email }, select: { name: true } });
    return user?.name || email;
  } catch {
    return 'system';
  }
}
