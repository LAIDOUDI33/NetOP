'use client';

import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// ==================== TYPES ====================

export type TimeRange = '7d' | '30d' | '90d' | '6m' | '12m' | 'custom';

export interface WilayaItem {
  code: string;
  name: string;
  cluster: string;
  population: number;
  score: number;
}

export interface ClusterItem {
  name: string;
  wilayaCount: number;
  totalPopulation: number;
}

export interface FilterState {
  wilayaCode: string | null;
  cluster: string | null;
  timeRange: TimeRange;
  customDateFrom: string | null;
  customDateTo: string | null;
}

export interface WilayaFilterContextValue {
  // Data
  wilayas: WilayaItem[];
  clusters: ClusterItem[];
  isLoading: boolean;
  // Current state
  filter: FilterState;
  // Actions
  setWilaya: (_code: string | null) => void;
  setCluster: (_name: string | null) => void;
  setTimeRange: (_range: TimeRange) => void;
  setCus_tomRange: (_from: string, _to: string) => void;
  clearAll: () => void;
  // Derived helpers
  selectedWilaya: WilayaItem | null;
  selectedCluster: ClusterItem | null;
  hasActiveFilters: boolean;
  /** Returns URL search params string (without leading ?) */
  toSearchParams: () => string;
  /** Returns the full URL with query params for an API endpoint */
  buildApiUrl: (_basePath: string, _extra?: Record<string, string>) => string;
}

const DEFAULT_FILTER: FilterState = {
  wilayaCode: null,
  cluster: null,
  timeRange: '30d',
  customDateFrom: null,
  customDateTo: null,
};

// ==================== CONTEXT ====================

const WilayaFilterContext = createContext<WilayaFilterContextValue | null>(null);

export function useWilayaFilter(): WilayaFilterContextValue {
  const ctx = useContext(WilayaFilterContext);
  if (!ctx) {
    return NOOP_VALUE;
  }
  return ctx;
}

// ==================== PROVIDER ====================

export function WilayaFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilter] = useState<FilterState>({ ...DEFAULT_FILTER });

  // Fetch wilaya list
  const { data, isLoading } = useQuery<{
    wilayas: WilayaItem[];
    clusters: ClusterItem[];
  }>({
    queryKey: ['wilaya-list'],
    queryFn: () => fetch('/api/wilayas/list').then(r => r.json()),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const wilayas = data?.wilayas ?? [];
  const clusters = data?.clusters ?? [];

  const setWilaya = useCallback((code: string | null) => {
    setFilter(prev => ({
      ...prev,
      wilayaCode: code,
      cluster: null, // mutual exclusion
    }));
  }, []);

  const setCluster = useCallback((name: string | null) => {
    setFilter(prev => ({
      ...prev,
      cluster: name,
      wilayaCode: null, // mutual exclusion
    }));
  }, []);

  const setTimeRange = useCallback((range: TimeRange) => {
    setFilter(prev => ({ ...prev, timeRange: range }));
  }, []);

  const setCustomRange = useCallback((from: string, to: string) => {
    setFilter(prev => ({
      ...prev,
      timeRange: 'custom',
      customDateFrom: from,
      customDateTo: to,
    }));
  }, []);

  const clearAll = useCallback(() => {
    setFilter({ ...DEFAULT_FILTER });
  }, []);

  // Derived values
  const selectedWilaya = useMemo(
    () => wilayas.find(w => w.code === filter.wilayaCode) ?? null,
    [wilayas, filter.wilayaCode],
  );

  const selectedCluster = useMemo(
    () => clusters.find(c => c.name === filter.cluster) ?? null,
    [clusters, filter.cluster],
  );

  const hasActiveFilters = useMemo(
    () => !!(filter.wilayaCode || filter.cluster || filter.timeRange !== '30d'),
    [filter.wilayaCode, filter.cluster, filter.timeRange],
  );

  const toSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filter.wilayaCode) params.set('wilayaCode', filter.wilayaCode);
    if (filter.cluster) params.set('cluster', filter.cluster);
    if (filter.timeRange === 'custom' && filter.customDateFrom && filter.customDateTo) {
      params.set('dateFrom', filter.customDateFrom);
      params.set('dateTo', filter.customDateTo);
    } else {
      params.set('period', filter.timeRange);
    }
    return params.toString();
  }, [filter.wilayaCode, filter.cluster, filter.timeRange, filter.customDateFrom, filter.customDateTo]);

  const buildApiUrl = useCallback((basePath: string, extra?: Record<string, string>) => {
    const params = new URLSearchParams(toSearchParams());
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => { if (v) params.set(k, v); });
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }, [toSearchParams]);

  const value = useMemo<WilayaFilterContextValue>(() => ({
    wilayas,
    clusters,
    isLoading,
    filter,
    setWilaya,
    setCluster,
    setTimeRange,
    setCustomRange,
    clearAll,
    selectedWilaya,
    selectedCluster,
    hasActiveFilters,
    toSearchParams,
    buildApiUrl,
  }), [
    wilayas, clusters, isLoading, filter, setWilaya, setCluster,
    setTimeRange, setCustomRange, clearAll, selectedWilaya, selectedCluster,
    hasActiveFilters, toSearchParams, buildApiUrl,
  ]);

  return (
    <WilayaFilterContext.Provider value={value}>
      {children}
    </WilayaFilterContext.Provider>
  );
}

// ==================== NOOP FALLBACK ====================

const NOOP_VALUE: WilayaFilterContextValue = {
  wilayas: [],
  clusters: [],
  isLoading: false,
  filter: DEFAULT_FILTER,
  setWilaya: () => {},
  setCluster: () => {},
  setTimeRange: () => {},
  setCustomRange: () => {},
  clearAll: () => {},
  selectedWilaya: null,
  selectedCluster: null,
  hasActiveFilters: false,
  toSearchParams: () => '',
  buildApiUrl: (basePath) => basePath,
};
