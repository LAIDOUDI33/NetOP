// ══════════════════════════════════════════════════════════════════════════════
// NetOptima Algérie — Notification Service Types
// ══════════════════════════════════════════════════════════════════════════════

/** Supported notification channels */
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

/** Priority levels — higher number = higher priority */
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

/** Delivery status lifecycle */
export type DeliveryStatus = 'pending' | 'sending' | 'sent' | 'delivered' | 'failed';

/** Supported locales for Djezzy NOC */
export type Locale = 'en' | 'fr' | 'ar';

/** Escalation level */
export type EscalationLevel = 1 | 2 | 3;

/** Incoming notification request (POST /notify) */
export interface NotifyRequest {
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  priority: NotificationPriority;
  templateId?: string;
  locale?: Locale;
  variables?: Record<string, string | number>;
  /** Optional: associate with an alert in the main DB */
  alertId?: string;
  /** Optional: siteId for contextual notifications */
  siteId?: string;
}

/** Bulk notification request (POST /notify/bulk) */
export interface BulkNotifyRequest {
  notifications: NotifyRequest[];
}

/** Notification template stored in memory */
export interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  channel: NotificationChannel;
  subjectTemplate?: string;
  bodyTemplate: string;
  /** Variable keys expected in the template */
  variables: string[];
  /** Locale-specific overrides */
  localeOverrides?: Partial<Record<Locale, {
    subjectTemplate?: string;
    bodyTemplate: string;
  }>>;
  createdAt: string;
  updatedAt: string;
}

/** Template creation request (POST /notify/templates) */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  channel: NotificationChannel;
  subjectTemplate?: string;
  bodyTemplate: string;
  variables?: string[];
  localeOverrides?: Partial<Record<Locale, {
    subjectTemplate?: string;
    bodyTemplate: string;
  }>>;
}

/** Internal notification record (delivery tracking) */
export interface NotificationRecord {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  priority: NotificationPriority;
  locale: Locale;
  status: DeliveryStatus;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  templateId: string | null;
  alertId: string | null;
  siteId: string | null;
  escalationLevel: EscalationLevel;
  acknowledged: boolean;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  /** The original raw request for debugging */
  metadata: Record<string, unknown>;
}

/** Escalation rule */
export interface EscalationRule {
  id: string;
  name: string;
  /** Source priority that triggers escalation */
  fromPriority: NotificationPriority;
  /** Priority to escalate to */
  toPriority: NotificationPriority;
  /** Minutes before escalation triggers if unacknowledged */
  escalateAfterMinutes: number;
  /** Channel to use for escalation (can differ from original) */
  escalationChannel: NotificationChannel;
  /** Escalation recipients (e.g., supervisor emails) */
  escalationRecipients: string[];
  enabled: boolean;
}

/** Dispatch result from a channel handler */
export interface DispatchResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/** Priority weight mapping for queue ordering */
export const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Default escalation rules for Djezzy NOC */
export const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    id: 'esc-critical-1',
    name: 'Critical Alert Escalation L1→L2',
    fromPriority: 'critical',
    toPriority: 'critical',
    escalateAfterMinutes: 5,
    escalationChannel: 'email',
    escalationRecipients: ['noc-supervisor@djezzy.dz'],
    enabled: true,
  },
  {
    id: 'esc-critical-2',
    name: 'Critical Alert Escalation L2→L3',
    fromPriority: 'critical',
    toPriority: 'critical',
    escalateAfterMinutes: 15,
    escalationChannel: 'sms',
    escalationRecipients: ['noc-manager@djezzy.dz', '+213555000001'],
    enabled: true,
  },
  {
    id: 'esc-high-1',
    name: 'High Alert Escalation',
    fromPriority: 'high',
    toPriority: 'critical',
    escalateAfterMinutes: 15,
    escalationChannel: 'email',
    escalationRecipients: ['noc-supervisor@djezzy.dz'],
    enabled: true,
  },
  {
    id: 'esc-medium-1',
    name: 'Medium Alert Escalation',
    fromPriority: 'medium',
    toPriority: 'high',
    escalateAfterMinutes: 30,
    escalationChannel: 'email',
    escalationRecipients: ['noc-team@djezzy.dz'],
    enabled: true,
  },
];
