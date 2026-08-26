import { useMemo } from 'react';
import { useAppStore } from '@/store/app';
import { WILAYA_69 } from '@/lib/wilayas';

/**
 * useGlobalFilters
 * Convenience hook that reads the global filter state from zustand
 * and provides:
 * - The current filter values
 * - A query string fragment for API calls
 * - Helper booleans (hasFilters, isFilteredByWilaya, etc.)
 * - The WilayaRef for the selected wilaya (if any)
 */
export function useGlobalFilters() {
  const { globalFilters, setGlobalFilter, clearGlobalFilters } = useAppStore();

  const selectedWilaya = useMemo(() => {
    if (!globalFilters.wilaya) return null;
    return WILAYA_69.find(w => w.code === globalFilters.wilaya) ?? null;
  }, [globalFilters.wilaya]);

  const wilayasInCluster = useMemo(() => {
    if (!globalFilters.cluster) return [];
    return WILAYA_69.filter(w => w.cluster === globalFilters.cluster);
  }, [globalFilters.cluster]);

  /** Build a URL query string from active filters */
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (globalFilters.wilaya) params.set('wilaya', globalFilters.wilaya);
    if (globalFilters.cluster) params.set('cluster', globalFilters.cluster);
    if (globalFilters.technology !== 'all') params.set('technology', globalFilters.technology);
    if (globalFilters.period !== '30d') params.set('period', globalFilters.period);
    const str = params.toString();
    return str ? `?${str}` : '';
  }, [globalFilters.wilaya, globalFilters.cluster, globalFilters.technology, globalFilters.period]);

  /** Append global filter params to an existing URL string */
  const appendFilters = (url: string) => {
    if (!queryString) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${queryString.slice(1)}`;
  };

  const hasFilters = !!(
    globalFilters.wilaya ||
    globalFilters.cluster ||
    globalFilters.technology !== 'all' ||
    globalFilters.period !== '30d'
  );

  const isFilteredByWilaya = !!globalFilters.wilaya;
  const isFilteredByCluster = !!globalFilters.cluster;
  const isFilteredByTech = globalFilters.technology !== 'all';

  const activeFilterCount = [
    globalFilters.wilaya,
    globalFilters.cluster,
    globalFilters.technology !== 'all' ? 'tech' : '',
    globalFilters.period !== '30d' ? 'period' : '',
  ].filter(Boolean).length;

  return {
    filters: globalFilters,
    setFilter: setGlobalFilter,
    clearFilters: clearGlobalFilters,
    selectedWilaya,
    wilayasInCluster,
    queryString,
    appendFilters,
    hasFilters,
    isFilteredByWilaya,
    isFilteredByCluster,
    isFilteredByTech,
    activeFilterCount,
  };
}
