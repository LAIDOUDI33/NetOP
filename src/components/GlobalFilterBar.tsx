'use client';

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useAppStore, type TimePeriod } from '@/store/app';
import { WILAYA_69, CLUSTERS, type WilayaRef } from '@/lib/wilayas';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Filter, X, ChevronDown, ChevronUp, MapPin, Layers, Radio, Clock, RotateCcw,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { Technology } from '@/types';

const TECH_OPTIONS: Array<{ value: Technology | 'all'; labelKey: string }> = [
  { value: 'all', labelKey: 'filter.allTech' },
  { value: '2G', labelKey: '2G' },
  { value: '3G', labelKey: '3G' },
  { value: '4G', labelKey: '4G' },
  { value: '5G', labelKey: '5G' },
];

const PERIOD_OPTIONS: Array<{ value: TimePeriod; labelKey: string }> = [
  { value: '7d', labelKey: 'gfilter.period.7d' },
  { value: '30d', labelKey: 'gfilter.period.30d' },
  { value: '90d', labelKey: 'gfilter.period.90d' },
  { value: '6m', labelKey: 'gfilter.period.6m' },
  { value: '1y', labelKey: 'gfilter.period.1y' },
];

export function GlobalFilterBar() {
  const t = useT();
  const {
    globalFilters, setGlobalFilter, clearGlobalFilters,
    filterBarOpen, setFilterBarOpen,
  } = useAppStore();

  const [wilayaSearch, setWilayaSearch] = useState('');
  const [wilayaDropdownOpen, setWilayaDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWilayaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredWilayas = useMemo(() => {
    if (!wilayaSearch) return WILAYA_69;
    const q = wilayaSearch.toLowerCase();
    return WILAYA_69.filter(
      w =>
        w.name.toLowerCase().includes(q) ||
        w.nameAr.includes(q) ||
        w.code.includes(q) ||
        w.cluster.toLowerCase().includes(q),
    );
  }, [wilayaSearch]);

  const filteredClusters = useMemo(() => {
    if (!globalFilters.wilaya) return CLUSTERS;
    const w = WILAYA_69.find(w => w.code === globalFilters.wilaya);
    return w ? [w.cluster] : CLUSTERS;
  }, [globalFilters.wilaya]);

  const activeCount = [
    globalFilters.wilaya,
    globalFilters.cluster,
    globalFilters.technology !== 'all' ? 't' : '',
    globalFilters.period !== '30d' ? 'p' : '',
  ].filter(Boolean).length;

  const handleWilayaSelect = useCallback(
    (w: WilayaRef) => {
      setGlobalFilter('wilaya', w.code);
      setGlobalFilter('wilayaName', w.name);
      setGlobalFilter('cluster', w.cluster);
      setWilayaDropdownOpen(false);
      setWilayaSearch('');
    },
    [setGlobalFilter],
  );

  const handleClearWilaya = useCallback(() => {
    setGlobalFilter('wilaya', '');
    setGlobalFilter('wilayaName', '');
    setGlobalFilter('cluster', '');
  }, [setGlobalFilter]);

  const selectClassName =
    'rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="border-b bg-muted/30">
      {/* Toggle bar */}
      <div className="flex items-center gap-2 px-4 lg:px-6 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs font-medium"
          onClick={() => setFilterBarOpen(!filterBarOpen)}
        >
          <Filter className="h-3.5 w-3.5" />
          {t('gfilter.title', 'Filtres Globaux')}
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          )}
          {filterBarOpen ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>

        {/* Active filter pills when collapsed */}
        {!filterBarOpen && activeCount > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1">
            {globalFilters.wilayaName && (
              <FilterPill
                label={globalFilters.wilayaName}
                onRemove={handleClearWilaya}
              />
            )}
            {globalFilters.cluster && (
              <FilterPill
                label={globalFilters.cluster}
                onRemove={() => setGlobalFilter('cluster', '')}
              />
            )}
            {globalFilters.technology !== 'all' && (
              <FilterPill
                label={String(globalFilters.technology)}
                onRemove={() => setGlobalFilter('technology', 'all')}
              />
            )}
            {globalFilters.period !== '30d' && (
              <FilterPill
                label={t(`gfilter.period.${globalFilters.period}`, globalFilters.period)}
                onRemove={() => setGlobalFilter('period', '30d')}
              />
            )}
          </div>
        )}

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground ms-auto"
            onClick={clearGlobalFilters}
          >
            <RotateCcw className="h-3 w-3" />
            {t('gfilter.clear', 'Réinitialiser')}
          </Button>
        )}
      </div>

      {/* Expanded filter bar */}
      {filterBarOpen && (
        <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6 pb-3">
          {/* Wilaya Searchable Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              <MapPin className="h-3 w-3" />
              {t('gfilter.wilaya', 'Wilaya')}
            </label>
            <button
              type="button"
              className={`${selectClassName} flex items-center gap-2 min-w-[180px] text-start`}
              onClick={() => setWilayaDropdownOpen(!wilayaDropdownOpen)}
            >
              <span className={globalFilters.wilayaName ? '' : 'text-muted-foreground'}>
                {globalFilters.wilayaName || t('gfilter.allWilayas', 'Toutes les wilayas')}
              </span>
              {globalFilters.wilayaName && (
                <X
                  className="h-3 w-3 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearWilaya();
                  }}
                />
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground ms-auto" />
            </button>
            {wilayaDropdownOpen && (
              <div className="absolute top-full mt-1 z-50 w-72 rounded-lg border bg-popover shadow-lg">
                <div className="p-2 border-b">
                  <input
                    type="text"
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder={t('gfilter.searchWilaya', 'Rechercher une wilaya...')}
                    value={wilayaSearch}
                    onChange={(e) => setWilayaSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    className={`w-full text-start px-3 py-2 text-sm hover:bg-accent transition-colors ${
                      !globalFilters.wilaya ? 'bg-accent' : ''
                    }`}
                    onClick={() => {
                      handleClearWilaya();
                      setWilayaDropdownOpen(false);
                    }}
                  >
                    {t('gfilter.allWilayas', 'Toutes les wilayas')}
                  </button>
                  {filteredWilayas.map(w => (
                    <button
                      key={w.code}
                      type="button"
                      className={`w-full text-start px-3 py-2 text-sm hover:bg-accent transition-colors ${
                        globalFilters.wilaya === w.code ? 'bg-accent font-medium' : ''
                      }`}
                      onClick={() => handleWilayaSelect(w)}
                    >
                      <span>{w.code} - {w.name}</span>
                      <span className="text-muted-foreground ms-2 text-xs">{w.cluster}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cluster Select */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              <Layers className="h-3 w-3" />
              {t('gfilter.cluster', 'Cluster')}
            </label>
            <div className="flex items-center gap-1">
              <select
                className={`${selectClassName} min-w-[160px]`}
                value={globalFilters.cluster}
                onChange={(e) => setGlobalFilter('cluster', e.target.value)}
              >
                <option value="">{t('gfilter.allClusters', 'Tous les clusters')}</option>
                {filteredClusters.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {globalFilters.cluster && (
                <button
                  type="button"
                  className="p-1 hover:bg-accent rounded"
                  onClick={() => setGlobalFilter('cluster', '')}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Technology Select */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              <Radio className="h-3 w-3" />
              {t('gfilter.technology', 'Technologie')}
            </label>
            <div className="flex items-center gap-1">
              <select
                className={`${selectClassName} min-w-[120px]`}
                value={globalFilters.technology}
                onChange={(e) => setGlobalFilter('technology', e.target.value as Technology | 'all')}
              >
                {TECH_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey, opt.labelKey === 'filter.allTech' ? undefined : opt.value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Period Select */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              <Clock className="h-3 w-3" />
              {t('gfilter.period', 'Période')}
            </label>
            <select
              className={`${selectClassName} min-w-[100px]`}
              value={globalFilters.period}
              onChange={(e) => setGlobalFilter('period', e.target.value as TimePeriod)}
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey, opt.value)}
                </option>
              ))}
            </select>
          </div>

          {/* Clear button in expanded */}
          {activeCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs mt-4"
              onClick={clearGlobalFilters}
            >
              <RotateCcw className="h-3 w-3" />
              {t('gfilter.clear', 'Réinitialiser')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge
      variant="secondary"
      className="h-5 gap-1 px-1.5 text-[10px] shrink-0"
    >
      <span className="max-w-[100px] truncate">{label}</span>
      <button
        type="button"
        className="hover:bg-foreground/10 rounded p-0.5"
        onClick={onRemove}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </Badge>
  );
}

export default GlobalFilterBar;
