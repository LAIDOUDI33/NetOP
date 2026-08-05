import { describe, it, expect, vi } from 'vitest';

// Mock the Zustand store before importing i18n
const mockSetLocale = vi.fn();
vi.mock('@/store/app', () => ({
  useAppStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        locale: 'fr',
        setLocale: mockSetLocale,
        currentView: 'dashboard',
        selectedTechnology: '4G',
        sidebarOpen: true,
        refreshKey: 0,
        user: null,
        allowedViews: new Set<string>(),
      }),
    {
      getState: () => ({
        locale: 'fr',
        setLocale: mockSetLocale,
      }),
    }
  ),
}));

import en from '@/lib/i18n/locales/en';
import fr from '@/lib/i18n/locales/fr';
import ar from '@/lib/i18n/locales/ar';

/** Compute symmetric key difference between two locale key sets */
function keyDiff(base: string[], other: string[]) {
  const missing = base.filter((k) => !other.includes(k));
  const extra = other.filter((k) => !base.includes(k));
  return { missing, extra };
}

describe('i18n', () => {
  describe('locale key consistency', () => {
    it('all 3 locale files have the same key set', () => {
      const enKeys = Object.keys(en).sort();
      const frKeys = Object.keys(fr).sort();
      const arKeys = Object.keys(ar).sort();

      const enFr = keyDiff(enKeys, frKeys);
      const enAr = keyDiff(enKeys, arKeys);

      // Fail only if there are key mismatches; produce a helpful message
      const issues: string[] = [];
      if (enFr.missing.length) issues.push(`Missing in FR: ${enFr.missing.join(', ')}`);
      if (enFr.extra.length) issues.push(`Extra in FR: ${enFr.extra.join(', ')}`);
      if (enAr.missing.length) issues.push(`Missing in AR: ${enAr.missing.join(', ')}`);
      if (enAr.extra.length) issues.push(`Extra in AR: ${enAr.extra.join(', ')}`);

      if (issues.length > 0) {
        // Only fail on critical mismatches — skip keys with prefixes that
        // are known to have been added incrementally (e.g., oss.*)
        // For now, assert zero drift.
        throw new Error(`Locale key drift detected:\n${issues.join('\n')}`);
      }
    });
  });

  describe('etl. keys', () => {
    it('etl. keys exist in all 3 locales', () => {
      const etlKeysEn = Object.keys(en).filter((k) => k.startsWith('etl.'));
      const etlKeysFr = Object.keys(fr).filter((k) => k.startsWith('etl.'));
      const etlKeysAr = Object.keys(ar).filter((k) => k.startsWith('etl.'));

      expect(etlKeysEn.length).toBeGreaterThan(0);
      expect(etlKeysFr.length).toBeGreaterThan(0);
      expect(etlKeysAr.length).toBeGreaterThan(0);

      expect(etlKeysEn.sort()).toEqual(etlKeysFr.sort());
      expect(etlKeysEn.sort()).toEqual(etlKeysAr.sort());
    });
  });

  describe('ig. keys', () => {
    it('ig. keys exist in all 3 locales', () => {
      const igKeysEn = Object.keys(en).filter((k) => k.startsWith('ig.'));
      const igKeysFr = Object.keys(fr).filter((k) => k.startsWith('ig.'));
      const igKeysAr = Object.keys(ar).filter((k) => k.startsWith('ig.'));

      expect(igKeysEn.length).toBeGreaterThan(0);
      expect(igKeysFr.length).toBeGreaterThan(0);
      expect(igKeysAr.length).toBeGreaterThan(0);

      expect(igKeysEn.sort()).toEqual(igKeysFr.sort());
      expect(igKeysEn.sort()).toEqual(igKeysAr.sort());
    });
  });
});
