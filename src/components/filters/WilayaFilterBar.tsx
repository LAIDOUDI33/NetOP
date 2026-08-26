'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useWilayaFilter } from '@/lib/filters/WilayaFilterContext';
import type { WilayaItem, ClusterItem, TimeRange } from '@/lib/filters/WilayaFilterContext';
import { useT } from '@/lib/i18n';
import { useAppStore } from '@/store/app';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Filter,
  MapPin,
  X,
  ChevronDown,
  Clock,
  Layers,
  RotateCcw,
} from 'lucide-react';

// ==================== CONSTANTS ====================

const MAX_VISIBLE_CLUSTERS = 3;

const TIME_RANGE_OPTIONS: readonly TimeRange[] = ['7d', '30d', '90d', '6m', '12m'];

// ==================== HELPERS ====================

function getScoreBadgeClasses(score: number): string {
  if (score >= 80) {
    return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20';
  }
  if (score >= 50) {
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20';
  }
  return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20';
}

function formatWilayaCode(code: string): string {
  return code.padStart(3, '0');
}

// ==================== TYPES ====================

interface GroupedWilayaMap {
  readonly [cluster: string]: readonly WilayaItem[];
}

interface ClusterPillProps {
  cluster: ClusterItem;
  isActive: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}

// ==================== SUB-COMPONENTS ====================

/** Single cluster pill / badge button */
function ClusterPill({ cluster, isActive, onClick, fullWidth }: ClusterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1',
        'text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        'select-none cursor-pointer',
        fullWidth && 'w-full justify-center',
        isActive
          ? 'border-primary/50 bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Layers className="size-3 shrink-0" />
      <span>{cluster.name}</span>
      <Badge
        variant={isActive ? 'secondary' : 'outline'}
        className="h-4 min-w-4 px-1 text-[10px] leading-none"
      >
        {cluster.wilayaCount}
      </Badge>
    </button>
  );
}

/** Searchable wilaya combobox using Popover + Command */
function WilayaCombobox() {
  const { wilayas, selectedWilaya, setWilaya } = useWilayaFilter();
  const t = useT();
  const locale = useAppStore((s) => s.locale);
  const [open, setOpen] = useState(false);

  const groupedWilayas = useMemo<GroupedWilayaMap>(() => {
    const map: Record<string, WilayaItem[]> = {};
    for (const w of wilayas) {
      (map[w.cluster] ??= []).push(w);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true })
      );
    }
    return map;
  }, [wilayas]);

  const handleSelect = useCallback(
    (code: string) => {
      setWilaya(selectedWilaya?.code === code ? null : code);
      setOpen(false);
    },
    [selectedWilaya?.code, setWilaya]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setWilaya(null);
    },
    [setWilaya]
  );

  const handleClearKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        setWilaya(null);
      }
    },
    [setWilaya]
  );

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 ps-2 pe-1.5"
          dir={dir}
          aria-label={t('filter.title')}
        >
          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
          {selectedWilaya ? (
            <>
              <span className="truncate text-sm font-medium">
                {selectedWilaya.name}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {formatWilayaCode(selectedWilaya.code)}
              </span>
              <span
                className="size-1.5 shrink-0 rounded-full bg-primary"
                aria-label={t('filter.active')}
              />
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={handleClearKeyDown}
                className="ms-0.5 rounded-full p-0.5 hover:bg-muted-foreground/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={t('filter.clearAll')}
              >
                <X className="size-3" />
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              {t('filter.allWilayas')}
            </span>
          )}
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        dir={dir}
      >
        <Command>
          <CommandInput
            placeholder={t('filter.wilayaPlaceholder')}
            className="h-9"
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>{t('filter.noResults')}</CommandEmpty>
            {Object.entries(groupedWilayas).map(([cluster, items]) => (
              <CommandGroup key={cluster} heading={cluster}>
                {items.map((w) => (
                  <CommandItem
                    key={w.code}
                    value={`${formatWilayaCode(w.code)} ${w.name}`}
                    onSelect={() => handleSelect(w.code)}
                    className="gap-2 ps-2"
                  >
                    <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                      {formatWilayaCode(w.code)}
                    </span>
                    <span className="flex-1 truncate text-sm">{w.name}</span>
                    <span
                      className={cn(
                        'inline-flex items-center justify-center rounded border px-1.5 py-0.5',
                        'text-[10px] font-semibold leading-none tabular-nums',
                        getScoreBadgeClasses(w.score)
                      )}
                    >
                      {w.score}
                    </span>
                    {selectedWilaya?.code === w.code && (
                      <span className="ms-auto size-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Row of cluster pill buttons with overflow for desktop */
function ClusterPillRow() {
  const { clusters, selectedCluster, setCluster } = useWilayaFilter();
  const locale = useAppStore((s) => s.locale);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const visibleClusters = useMemo(
    () => clusters.slice(0, MAX_VISIBLE_CLUSTERS),
    [clusters]
  );
  const overflowClusters = useMemo(
    () => clusters.slice(MAX_VISIBLE_CLUSTERS),
    [clusters]
  );

  const handleClick = useCallback(
    (name: string) => {
      setCluster(selectedCluster?.name === name ? null : name);
    },
    [selectedCluster?.name, setCluster]
  );

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <>
      {/* Desktop: limited pills with overflow popover */}
      <div className="hidden items-center gap-1.5 md:flex" dir={dir}>
        {visibleClusters.map((c) => (
          <ClusterPill
            key={c.name}
            cluster={c}
            isActive={selectedCluster?.name === c.name}
            onClick={() => handleClick(c.name)}
          />
        ))}
        {overflowClusters.length > 0 && (
          <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 rounded-full px-2 text-xs"
                dir={dir}
              >
                +{overflowClusters.length}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start" dir={dir}>
              <div className="flex flex-col gap-1">
                {overflowClusters.map((c) => (
                  <ClusterPill
                    key={c.name}
                    cluster={c}
                    isActive={selectedCluster?.name === c.name}
                    onClick={() => {
                      handleClick(c.name);
                      setOverflowOpen(false);
                    }}
                    fullWidth
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Mobile: all clusters in a wrapped flex row */}
      <div className="flex flex-wrap gap-1.5 md:hidden" dir={dir}>
        {clusters.map((c) => (
          <ClusterPill
            key={c.name}
            cluster={c}
            isActive={selectedCluster?.name === c.name}
            onClick={() => handleClick(c.name)}
          />
        ))}
      </div>
    </>
  );
}

/** Time range select dropdown */
function TimeRangeSelector() {
  const { filter, setTimeRange } = useWilayaFilter();
  const t = useT();
  const locale = useAppStore((s) => s.locale);

  const handleChange = useCallback(
    (value: string) => {
      setTimeRange(value as TimeRange);
    },
    [setTimeRange]
  );

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <Select value={filter.timeRange} onValueChange={handleChange} dir={dir}>
      <SelectTrigger
        size="sm"
        className="h-8 w-auto gap-1.5 ps-2 pe-2.5"
        dir={dir}
      >
        <Clock className="size-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_RANGE_OPTIONS.map((range) => (
          <SelectItem key={range} value={range}>
            {t(`filter.range.${range}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ==================== MAIN COMPONENT ====================

export default function WilayaFilterBar() {
  const {
    selectedWilaya,
    selectedCluster,
    filter,
    hasActiveFilters,
    clearAll,
  } = useWilayaFilter();
  const t = useT();
  const locale = useAppStore((s) => s.locale);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Build a compact summary for the collapsed state
  const summaryText = useMemo(() => {
    const parts: string[] = [];
    if (selectedWilaya) parts.push(selectedWilaya.name);
    if (selectedCluster) parts.push(selectedCluster.name);
    if (filter.timeRange !== '30d') {
      parts.push(t(`filter.range.${filter.timeRange}`));
    }
    return parts.join(' · ');
  }, [selectedWilaya, selectedCluster, filter.timeRange, t]);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div
      className="border-b bg-muted/50"
      dir={dir}
      role="toolbar"
      aria-label={t('filter.title')}
    >
      {/* ── Toggle row (always visible) ──────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpanded}
          className="h-8 gap-1.5 ps-2 pe-2.5"
          aria-expanded={isExpanded}
        >
          <Filter className="size-3.5" />
          <span className="text-sm font-medium">{t('filter.title')}</span>
          {hasActiveFilters && (
            <span
              className="size-2 rounded-full bg-primary"
              aria-label={t('filter.active')}
            />
          )}
          <ChevronDown
            className={cn(
              'size-3 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </Button>

        {/* Collapsed summary text */}
        {!isExpanded && hasActiveFilters && summaryText && (
          <span className="truncate text-sm text-muted-foreground">
            {summaryText}
          </span>
        )}
      </div>

      {/* ── Expanded filter controls (animated) ───────────────── */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
            {/* Wilaya selector (leftmost, most prominent) */}
            <WilayaCombobox />

            {/* Vertical separator */}
            <Separator
              orientation="vertical"
              className="hidden h-6 sm:block"
            />

            {/* Cluster pill row */}
            <ClusterPillRow />

            {/* Vertical separator */}
            <Separator
              orientation="vertical"
              className="hidden h-6 sm:block"
            />

            {/* Time range selector (right side) */}
            <TimeRangeSelector />

            {/* Flexible spacer to push clear button to the end */}
            <div className="flex-1" />

            {/* Clear all button (only when filters are active) */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="size-3.5" />
                <span className="text-xs">{t('filter.clearAll')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
