import { useAppStore } from '@/store/app';
import en from './locales/en';
import fr from './locales/fr';
import ar from './locales/ar';

export type Locale = 'en' | 'fr' | 'ar';

const locales: Record<Locale, Record<string, string>> = { en, fr, ar };

export function t(key: string, params?: Record<string, string | number>): string {
  const locale = useAppStore.getState().locale ?? 'fr';
  let text = locales[locale]?.[key] ?? locales.fr[key] ?? locales.en[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return text;
}

export function useT() {
  const locale = useAppStore((s) => s.locale ?? 'fr');
  return (key: string, params?: Record<string, string | number>): string => {
    let text = locales[locale]?.[key] ?? locales.fr[key] ?? locales.en[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  };
}

export function timeAgo(dateStr: string, tFn: (_key: string, _params?: Record<string, string | number>) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return tFn('time.justNow');
  if (diffMin < 60) return tFn('time.minutesAgo', { n: diffMin });
  if (diffHr < 24) return tFn('time.hoursAgo', { n: diffHr });
  return tFn('time.daysAgo', { n: diffDay });
}

export function useTranslation() {
  const t = useT();
  const locale = useAppStore((s) => s.locale ?? 'fr');
  const setLocale = useAppStore((s) => s.setLocale);
  return { t, locale, setLocale };
}
