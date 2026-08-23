// ══════════════════════════════════════════════════════════════════════════════
// NetOptima Algérie — Notification Template Engine
// ══════════════════════════════════════════════════════════════════════════════

import { v4 as uuidv4 } from 'uuid';
import type { NotificationTemplate, CreateTemplateRequest, Locale } from './types';

// ─── In-Memory Template Store ───────────────────────────────────────────────

const templateStore = new Map<string, NotificationTemplate>();

// ─── Seed Default Templates (Djezzy NOC) ────────────────────────────────────

const DEFAULT_TEMPLATES: Array<Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'Site Down Alert',
    description: 'Critical alert when a network site goes completely down',
    channel: 'email',
    subjectTemplate: '🔴 CRITICAL: Site {{site_name}} ({{site_code}}) is DOWN',
    bodyTemplate: `Network Operations Center — Critical Alert

Site: {{site_name}} ({{site_code}})
Region: {{region}}
Technology: {{technology}}
Severity: {{severity}}
Metric: {{metric}}
Value: {{metric_value}}
Threshold: {{threshold}}
Time: {{timestamp}}

Immediate action required. Site has been unreachable for {{downtime_minutes}} minutes.

— NetOptima Algérie NOC`,
    variables: ['site_name', 'site_code', 'region', 'technology', 'severity', 'metric', 'metric_value', 'threshold', 'timestamp', 'downtime_minutes'],
    localeOverrides: {
      fr: {
        subjectTemplate: '🔴 CRITIQUE : Le site {{site_name}} ({{site_code}}) est HORS SERVICE',
        bodyTemplate: `Centre d\'Opérations Réseau — Alerte Critique

Site : {{site_name}} ({{site_code}})
Région : {{region}}
Technologie : {{technology}}
Sévérité : {{severity}}
Métrique : {{metric}}
Valeur : {{metric_value}}
Seuil : {{threshold}}
Heure : {{timestamp}}

Action immédiate requise. Le site est injoignable depuis {{downtime_minutes}} minutes.

— NetOptima Algérie COR`,
      },
      ar: {
        subjectTemplate: '🔴 حرج: الموقع {{site_name}} ({{site_code}}) خارج الخدمة',
        bodyTemplate: `مركز عمليات الشبكة — تنبيه حرج

الموقع: {{site_name}} ({{site_code}})
الولاية: {{region}}
التقنية: {{technology}}
الخطورة: {{severity}}
المقياس: {{metric}}
القيمة: {{metric_value}}
الحد: {{threshold}}
الوقت: {{timestamp}}

يتطلب تدخلاً فورياً. الموقع غير متاح منذ {{downtime_minutes}} دقائق.

— نتأوبتيما الجزائر مركز العمليات`,
      },
    },
  },
  {
    name: 'KPI Threshold Breach',
    description: 'Warning when a KPI metric crosses its threshold',
    channel: 'email',
    subjectTemplate: '⚠️ WARNING: {{severity}} breach at {{site_name}} — {{metric}}',
    bodyTemplate: `Network Operations Center — KPI Threshold Breach

Site: {{site_name}} ({{site_code}})
Technology: {{technology}}
Metric: {{metric}}
Current Value: {{metric_value}}
Threshold: {{threshold}}
Condition: {{condition}}
Severity: {{severity}}

This alert requires attention within 15 minutes.

— NetOptima Algérie NOC`,
    variables: ['site_name', 'site_code', 'technology', 'metric', 'metric_value', 'threshold', 'condition', 'severity'],
    localeOverrides: {
      fr: {
        subjectTemplate: '⚠️ ATTENTION : Dépassement {{severity}} à {{site_name}} — {{metric}}',
        bodyTemplate: `Centre d\'Opérations Réseau — Dépassement de Seuil KPI

Site : {{site_name}} ({{site_code}})
Technologie : {{technology}}
Métrique : {{metric}}
Valeur Actuelle : {{metric_value}}
Seuil : {{threshold}}
Condition : {{condition}}
Sévérité : {{severity}}

Cette alerte nécessite une attention dans les 15 minutes.

— NetOptima Algérie COR`,
      },
      ar: {
        subjectTemplate: '⚠️ تحذير: تجاوز {{severity}} في {{site_name}} — {{metric}}',
        bodyTemplate: `مركز عمليات الشبكة — تجاوز حد المقياس

الموقع: {{site_name}} ({{site_code}})
التقنية: {{technology}}
المقياس: {{metric}}
القيمة الحالية: {{metric_value}}
الحد: {{threshold}}
الشرط: {{condition}}
الخطورة: {{severity}}

يتطلب هذا التنبيه اهتماماً خلال 15 دقيقة.

— نتأوبتيما الجزائر`,
      },
    },
  },
  {
    name: 'SMS Site Alert',
    description: 'Short SMS alert for field technicians',
    channel: 'sms',
    bodyTemplate: 'NetOptima: {{severity}} @ {{site_code}} - {{metric}} {{condition}} {{threshold}} ({{metric_value}}). Action required.',
    variables: ['severity', 'site_code', 'metric', 'condition', 'threshold', 'metric_value'],
    localeOverrides: {
      fr: {
        bodyTemplate: 'NetOptima: {{severity}} @ {{site_code}} - {{metric}} {{condition}} {{threshold}} ({{metric_value}}). Intervention requise.',
      },
      ar: {
        bodyTemplate: 'نتأوبتيما: {{severity}} @ {{site_code}} - {{metric}} {{condition}} {{threshold}} ({{metric_value}}). تدخل مطلوب.',
      },
    },
  },
  {
    name: 'Push Alert',
    description: 'Push notification for mobile NOC app',
    channel: 'push',
    subjectTemplate: '{{severity}}: {{metric}} at {{site_name}}',
    bodyTemplate: '{{site_name}} ({{site_code}}) — {{metric}} is {{metric_value}}. Threshold: {{threshold}}.',
    variables: ['severity', 'site_name', 'site_code', 'metric', 'metric_value', 'threshold'],
    localeOverrides: {
      fr: {
        subjectTemplate: '{{severity}} : {{metric}} à {{site_name}}',
        bodyTemplate: '{{site_name}} ({{site_code}}) — {{metric}} est à {{metric_value}}. Seuil : {{threshold}}.',
      },
      ar: {
        subjectTemplate: '{{severity}}: {{metric}} في {{site_name}}',
        bodyTemplate: '{{site_name}} ({{site_code}}) — {{metric}} = {{metric_value}}. الحد: {{threshold}}.',
      },
    },
  },
  {
    name: 'Escalation Notice',
    description: 'Notification when an alert is escalated to the next level',
    channel: 'email',
    subjectTemplate: '⬆️ ESCALATED: Unacknowledged {{priority}} alert — {{site_name}}',
    bodyTemplate: `Alert Escalation Notice

The following alert has been escalated due to lack of acknowledgement:

Site: {{site_name}} ({{site_code}})
Original Priority: {{priority}}
Escalation Level: {{escalation_level}}
Unacknowledged for: {{unacked_minutes}} minutes

Please take immediate action.

— NetOptima Algérie NOC`,
    variables: ['site_name', 'site_code', 'priority', 'escalation_level', 'unacked_minutes'],
    localeOverrides: {
      fr: {
        subjectTemplate: '⬆️ ESCALADE : Alerte {{priority}} non acquittée — {{site_name}}',
        bodyTemplate: `Avis d\'Escalade d\'Alerte

L\'alerte suivante a été escaladée faute d\'acquittement :

Site : {{site_name}} ({{site_code}})
Priorité Originale : {{priority}}
Niveau d\'Escalade : {{escalation_level}}
Non acquittée depuis : {{unacked_minutes}} minutes

Veuillez prendre des mesures immédiates.

— NetOptima Algérie COR`,
      },
      ar: {
        subjectTemplate: '⬆️ تصعيد: تنبيه {{priority}} غير معترف به — {{site_name}}',
        bodyTemplate: `إشعار تصعيد التنبيه

تم تصعيد التنبيه التالي بسبب عدم الاعتراف به:

الموقع: {{site_name}} ({{site_code}})
الأولوية الأصلية: {{priority}}
مستوى التصعيد: {{escalation_level}}
غير معترف به منذ: {{unacked_minutes}} دقيقة

يرجى اتخاذ إجراء فوري.

— نتأوبتيما الجزائر`,
      },
    },
  },
];

// ─── Initialize Default Templates ──────────────────────────────────────────

function seedTemplates() {
  const now = new Date().toISOString();
  for (const tpl of DEFAULT_TEMPLATES) {
    const id = uuidv4();
    templateStore.set(id, {
      ...tpl,
      id,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`[Templates] Seeded ${DEFAULT_TEMPLATES.length} default Djezzy NOC templates`);
}

// ─── Template Variable Substitution ─────────────────────────────────────────

/**
 * Replace {{variable}} placeholders in a template string.
 * Missing variables are left as-is (unresolved).
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number> = {},
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key];
    if (value !== undefined) {
      return String(value);
    }
    return match; // leave unresolved
  });
}

// ─── Template CRUD ──────────────────────────────────────────────────────────

/** Get a template by ID */
export function getTemplate(id: string): NotificationTemplate | undefined {
  return templateStore.get(id);
}

/** List all templates */
export function listTemplates(): NotificationTemplate[] {
  return Array.from(templateStore.values());
}

/** Create a new template */
export function createTemplate(req: CreateTemplateRequest): NotificationTemplate {
  const now = new Date().toISOString();
  const id = uuidv4();

  // Extract variable keys from templates
  const allText = [req.subjectTemplate, req.bodyTemplate].filter(Boolean).join(' ');
  const extractedVars = [...new Set(
    (allText.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/[{}]/g, ''))
  )];

  // Merge user-provided variables with extracted ones
  const variables = [...new Set([...(req.variables || []), ...extractedVars])];

  const template: NotificationTemplate = {
    id,
    name: req.name,
    description: req.description || '',
    channel: req.channel,
    subjectTemplate: req.subjectTemplate,
    bodyTemplate: req.bodyTemplate,
    variables,
    localeOverrides: req.localeOverrides,
    createdAt: now,
    updatedAt: now,
  };

  templateStore.set(id, template);
  console.log(`[Templates] Created template: ${req.name} (${id})`);
  return template;
}

/** Render a template with locale support */
export function renderTemplateWithLocale(
  template: NotificationTemplate,
  locale: Locale = 'en',
  variables: Record<string, string | number> = {},
): { subject: string; body: string } {
  // Check for locale override
  const localeOverride = template.localeOverrides?.[locale];

  const subjectTemplate = localeOverride?.subjectTemplate || template.subjectTemplate || '';
  const bodyTemplate = localeOverride?.bodyTemplate || template.bodyTemplate;

  return {
    subject: renderTemplate(subjectTemplate, variables),
    body: renderTemplate(bodyTemplate, variables),
  };
}

// Seed on module load
seedTemplates();
