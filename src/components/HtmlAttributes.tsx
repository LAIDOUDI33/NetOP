'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app';

export function HtmlAttributes() {
  const locale = useAppStore((s) => s.locale ?? 'fr');
  const isRtl = locale === 'ar';

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = isRtl ? 'rtl' : 'ltr';
    return () => {
      html.lang = 'fr';
      html.dir = 'ltr';
    };
  }, [locale, isRtl]);

  return null;
}
