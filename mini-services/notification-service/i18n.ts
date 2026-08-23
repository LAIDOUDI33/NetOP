// ══════════════════════════════════════════════════════════════════
// NetOptima Algérie — i18n Support (English / French / Arabic)
// ══════════════════════════════════════════════════════════════════

import type { Locale } from './types';

/** Human-readable locale names */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
};

/** Status labels per locale */
export const STATUS_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    pending: 'Pending',
    sending: 'Sending',
    sent: 'Sent',
    delivered: 'Delivered',
    failed: 'Failed',
  },
  fr: {
    pending: 'En attente',
    sending: 'Envoi en cours',
    sent: 'Envoyé',
    delivered: 'Livré',
    failed: 'Échoué',
  },
  ar: {
    pending: 'قيد الانتظار',
    sending: 'جارٍ الإرسال',
    sent: 'تم الإرسال',
    delivered: 'تم التسليم',
    failed: 'فشل',
  },
};

/** Priority labels per locale */
export const PRIORITY_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  },
  fr: {
    critical: 'Critique',
    high: 'Élevée',
    medium: 'Moyenne',
    low: 'Faible',
  },
  ar: {
    critical: 'حرج',
    high: 'عالي',
    medium: 'متوسط',
    low: 'منخفض',
  },
};

/** Channel labels per locale */
export const CHANNEL_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    email: 'Email',
    sms: 'SMS',
    push: 'Push Notification',
    in_app: 'In-App',
  },
  fr: {
    email: 'Courriel',
    sms: 'SMS',
    push: 'Notification Push',
    in_app: 'Dans l\'application',
  },
  ar: {
    email: 'بريد إلكتروني',
    sms: 'رسالة نصية',
    push: 'إشعار دفع',
    in_app: 'داخل التطبيق',
  },
};

/** Common UI/error messages per locale */
export const MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    notification_sent: 'Notification sent successfully',
    notification_queued: 'Notification queued for delivery',
    rate_limited: 'Rate limit exceeded. Please retry after {{retryAfterMs}}ms.',
    not_found: 'Notification not found',
    acknowledged: 'Notification acknowledged',
    template_created: 'Template created successfully',
    invalid_email: 'Invalid email address',
    invalid_phone: 'Invalid phone number (Algerian format expected)',
    missing_fields: 'Missing required fields',
    bulk_sent: '{{count}} notification(s) processed',
    health_ok: 'Service is healthy',
  },
  fr: {
    notification_sent: 'Notification envoyée avec succès',
    notification_queued: 'Notification mise en file d\'attente',
    rate_limited: 'Limite de taux dépassée. Veuillez réessayer après {{retryAfterMs}}ms.',
    not_found: 'Notification introuvable',
    acknowledged: 'Notification acquittée',
    template_created: 'Modèle créé avec succès',
    invalid_email: 'Adresse e-mail invalide',
    invalid_phone: 'Numéro de téléphone invalide (format algérien attendu)',
    missing_fields: 'Champs obligatoires manquants',
    bulk_sent: '{{count}} notification(s) traitée(s)',
    health_ok: 'Le service est en bonne santé',
  },
  ar: {
    notification_sent: 'تم إرسال الإشعار بنجاح',
    notification_queued: 'تم وضع الإشعار في قائمة الانتظار',
    rate_limited: 'تم تجاوز حد المعدل. يرجى إعادة المحاولة بعد {{retryAfterMs}} مللي ثانية.',
    not_found: 'الإشعار غير موجود',
    acknowledged: 'تم الاعتراف بالإشعار',
    template_created: 'تم إنشاء القالب بنجاح',
    invalid_email: 'عنوان بريد إلكتروني غير صالح',
    invalid_phone: 'رقم هاتف غير صالح (التنسيق الجزائري مطلوب)',
    missing_fields: 'حقول مطلوبة مفقودة',
    bulk_sent: 'تمت معالجة {{count}} إشعار(ات)',
    health_ok: 'الخدمة تعمل بشكل جيد',
  },
};

/** Render a localized message with variable substitution */
export function t(
  locale: Locale,
  key: string,
  variables?: Record<string, string | number>,
): string {
  const template = MESSAGES[locale]?.[key] || MESSAGES.en[key] || key;
  if (!variables) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, varKey: string) => {
    return variables[varKey] !== undefined ? String(variables[varKey]) : _match;
  });
}

/** Get localized label for a status/priority/channel value */
export function getLocalizedLabel(
  type: 'status' | 'priority' | 'channel',
  locale: Locale,
  value: string,
): string {
  const maps = {
    status: STATUS_LABELS,
    priority: PRIORITY_LABELS,
    channel: CHANNEL_LABELS,
  } as const;
  return maps[type][locale]?.[value] || maps[type].en[value] || value;
}

/** Validate locale string */
export function isValidLocale(locale: string): locale is Locale {
  return ['en', 'fr', 'ar'].includes(locale);
}
