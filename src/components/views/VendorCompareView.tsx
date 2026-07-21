'use client';
import { useT } from '@/lib/i18n';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { GitCompare, Signal, ArrowDownToLine, ArrowUpFromLine, Timer, ShieldCheck, ArrowRightLeft, TrendingDown, Building2 } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber, TECHNOLOGIES } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface VendorComparison {
  technology: Technology;
  vendor: string;
  siteCount: number;
  avgRsrp: number;
  avgDownloadThroughput: number;
  avgUploadThroughput: number;
  avgLatency: number;
  avgAvailability: number;
  avgHandoverSuccessRate: number;
  avgDropRate: number;
}

interface VendorCompareSummary {
  totalVendors: number;
  bestRsrp: { vendor: string; value: number } | null;
  bestThroughput: { vendor: string; value: number } | null;
  bestLatency: { vendor: string; value: number } | null;
  bestAvailability: { vendor: string; value: number } | null;
  bestHoRate: { vendor: string; value: number } | null;
  bestLowestDropRate: { vendor: string; value: number } | null;
}

interface VendorCompareResponse {
  comparisons: VendorComparison[];
  summary: VendorCompareSummary;
}

// ─── Row Definitions ───────────────────────────────────────────────────

interface MatrixRow {
  key: string;
  label: string;
  field: keyof VendorComparison;
  unit: string;
  higherBetter: boolean;
  decimals: number;
  icon: React.ReactNode;
}

const MATRIX_ROWS: MatrixRow[] = [
  { key: 'rsrp', label: 'vc.rsrp', field: 'avgRsrp', unit: 'unit.dbm', higherBetter: true, decimals: 1, icon: <Signal className="h-3.5 w-3.5" /> },
  { key: 'dl', label: 'vc.dl', field: 'avgDownloadThroughput', unit: 'unit.mbps', higherBetter: true, decimals: 2, icon: <ArrowDownToLine className="h-3.5 w-3.5" /> },
  { key: 'ul', label: 'vc.ul', field: 'avgUploadThroughput', unit: 'unit.mbps', higherBetter: true, decimals: 2, icon: <ArrowUpFromLine className="h-3.5 w-3.5" /> },
  { key: 'latency', label: 'vc.latency', field: 'avgLatency', unit: 'unit.ms', higherBetter: false, decimals: 1, icon: <Timer className="h-3.5 w-3.5" /> },
  { key: 'availability', label: 'vc.availability', field: 'avgAvailability', unit: 'unit.percent', higherBetter: true, decimals: 2, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { key: 'ho', label: 'vc.hoRate', field: 'avgHandoverSuccessRate', unit: 'unit.percent', higherBetter: true, decimals: 2, icon: <ArrowRightLeft className="h-3.5 w-3.5" /> },
  { key: 'drop', label: 'vc.dropRate', field: 'avgDropRate', unit: 'unit.percent', higherBetter: false, decimals: 2, icon: <TrendingDown className="h-3.5 w-3.5" /> },
  { key: 'sites', label: 'vc.siteCount', field: 'siteCount', unit: '', higherBetter: true, decimals: 0, icon: <Building2 className="h-3.5 w-3.5" /> },
];

// ─── Vendor Color Palette (when multiple vendors) ─────────────────────

const VENDOR_PALETTE = [
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#F59E0B', // amber
  '#F97316', // orange
  '#F43F5E', // rose
];

// ─── Custom Chart Tooltip ─────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-1">
            <Skeleton className="h-3 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-3 w-16 mt-1" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────

function findBestVendorIdx(comparisons: VendorComparison[], field: keyof VendorComparison, higherBetter: boolean): number {
  if (comparisons.length === 0) return -1;
  let bestIdx = 0;
  let bestVal = comparisons[0][field] as number;
  for (let i = 1; i < comparisons.length; i++) {
    const val = comparisons[i][field] as number;
    if (higherBetter ? val > bestVal : val < bestVal) {
      bestVal = val;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// ─── Main Component ───────────────────────────────────────────────────

export default function VendorCompareView() {
  const t = useT();
  const [technology, setTechnology] = useState<string>('4G');

  const { data, isLoading, error } = useQuery<VendorCompareResponse>({
    queryKey: ['vendor-compare', technology],
    queryFn: () => fetch(`/api/vendor-compare?technology=${technology}`).then((r) => r.json()),
    refetchInterval: 60000,
  });

  const rawMatches = (data as any)?.matches ?? [];
  const comparisons = rawMatches;

  // Compute best-vendor summary from comparisons
  const summary = useMemo(() => {
    if (comparisons.length === 0) return null;
    const best = (field: keyof VendorComparison, higherBetter: boolean) => {
      let best: VendorComparison | null = null;
      for (const c of comparisons) {
        const val = c[field] as number;
        if (val == null) continue;
        if (!best) { best = c; continue; }
        const bval = best[field] as number;
        if (bval == null) { best = c; continue; }
        if (higherBetter ? val > bval : val < bval) best = c;
      }
      return best ? { vendor: best.vendor, value: best[field] as number } : null;
    };
    return {
      totalVendors: new Set(comparisons.map(c => c.vendor)).size,
      bestRsrp: best('avgRsrp', true),
      bestThroughput: best('avgDownloadThroughput', true),
      bestLatency: best('avgLatency', false),
      bestAvailability: best('avgAvailability', true),
      bestHoRate: best('avgHandoverSuccessRate', true),
      bestLowestDropRate: best('avgDropRate', false),
    };
  }, [comparisons]);

  // Build a map: vendor -> color
  const vendorColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    comparisons.forEach((c, i) => {
      // Use TECH_COLORS if the vendor name matches a technology, else use palette
      if (TECH_COLORS[c.vendor as Technology]) {
        map[c.vendor] = TECH_COLORS[c.vendor as Technology];
      } else {
        map[c.vendor] = VENDOR_PALETTE[i % VENDOR_PALETTE.length];
      }
    });
    return map;
  }, [comparisons]);

  // Precompute best index per row
  const bestIdxByRow = useMemo(() => {
    const map: Record<string, number> = {};
    MATRIX_ROWS.forEach((row) => {
      map[row.key] = findBestVendorIdx(comparisons, row.field, row.higherBetter);
    });
    return map;
  }, [comparisons]);

  // Bar chart data
  const throughputChartData = useMemo(() => {
    return comparisons.map((c) => ({
      name: c.vendor,
      download: c.avgDownloadThroughput,
      upload: c.avgUploadThroughput,
    }));
  }, [comparisons]);

  // KPI card definitions
  const kpiCards = [
    {
      label: 'vc.bestRsrp',
      value: summary?.bestRsrp?.value,
      vendor: summary?.bestRsrp?.vendor,
      unit: 'unit.dbm',
      decimals: 1,
    },
    {
      label: 'vc.bestDl',
      value: summary?.bestThroughput?.value,
      vendor: summary?.bestThroughput?.vendor,
      unit: 'unit.mbps',
      decimals: 2,
    },
    {
      label: 'vc.bestUl',
      value: null,
      vendor: null,
      unit: 'unit.mbps',
      decimals: 2,
      computed: true,
    },
    {
      label: 'vc.bestLatency',
      value: summary?.bestLatency?.value,
      vendor: summary?.bestLatency?.vendor,
      unit: 'unit.ms',
      decimals: 1,
    },
    {
      label: 'vc.bestAvail',
      value: summary?.bestAvailability?.value,
      vendor: summary?.bestAvailability?.vendor,
      unit: 'unit.percent',
      decimals: 2,
    },
    {
      label: 'vc.bestHo',
      value: summary?.bestHoRate?.value,
      vendor: summary?.bestHoRate?.vendor,
      unit: 'unit.percent',
      decimals: 2,
    },
    {
      label: 'vc.lowestDrop',
      value: summary?.bestLowestDropRate?.value,
      vendor: summary?.bestLowestDropRate?.vendor,
      unit: 'unit.percent',
      decimals: 2,
    },
  ];

  // Compute best UL throughput from comparisons
  const bestUl = useMemo(() => {
    if (comparisons.length === 0) return null;
    let best = comparisons[0];
    for (const c of comparisons) {
      if (c.avgUploadThroughput > best.avgUploadThroughput) best = c;
    }
    return { vendor: best.vendor, value: best.avgUploadThroughput };
  }, [comparisons]);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-emerald-500" />
            {t('vc.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('vc.subtitle')}
          </p>
        </div>

        {/* Filter */}
        <Select value={technology} onValueChange={setTechnology}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TECHNOLOGIES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      {isLoading && <KpiCardsSkeleton />}

      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {kpiCards.map((kpi, idx) => {
            const displayValue = kpi.computed
              ? bestUl?.value
              : kpi.value;
            const displayVendor = kpi.computed
              ? bestUl?.vendor
              : kpi.vendor;

            return (
              <Card key={idx}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-[11px] font-medium text-muted-foreground leading-tight">
                    {t(kpi.label)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {displayValue != null
                      ? `${formatNumber(displayValue, kpi.decimals)}${kpi.unit ? ` ${t(kpi.unit)}` : ''}`
                      : '—'}
                  </div>
                  {displayVendor && (
                    <div
                      className="text-[11px] font-medium mt-0.5"
                      style={{ color: vendorColorMap[displayVendor] ?? 'hsl(var(--muted-foreground))' }}
                    >
                      {displayVendor}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Comparison Matrix Table ────────────────────────────────── */}
      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {t('empty.noData')}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && comparisons.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {t('vc.noData', { technology })}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && comparisons.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('vc.matrix')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs whitespace-nowrap min-w-[160px]">
                      {t('th.metric')}
                    </TableHead>
                    {comparisons.map((c) => (
                      <TableHead key={c.vendor} className="text-xs whitespace-nowrap text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold">{c.vendor}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {c.siteCount} {t('unit.sites')}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MATRIX_ROWS.map((row) => {
                    const bestIdx = bestIdxByRow[row.key];
                    return (
                      <TableRow key={row.key}>
                        <TableCell className="text-xs font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {row.icon}
                            {t(row.label)}
                            {row.unit && (
                              <span className="text-[10px]">({t(row.unit)})</span>
                            )}
                          </div>
                        </TableCell>
                        {comparisons.map((c, colIdx) => {
                          const val = c[row.field] as number;
                          const isBest = colIdx === bestIdx;
                          return (
                            <TableCell
                              key={c.vendor}
                              className={`text-center text-xs font-mono ${
                                isBest
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                                  : ''
                              }`}
                            >
                              {formatNumber(val, row.decimals)}
                              {row.unit ? ` ${t(row.unit)}` : ''}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Throughput Bar Chart ───────────────────────────────────── */}
      {isLoading && <ChartSkeleton />}

      {!isLoading && !error && comparisons.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t('vc.comparison')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={throughputChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: t('unit.mbps'), angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="download" name="Download" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="upload" name="Upload" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}