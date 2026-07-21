'use client';

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
  { key: 'rsrp', label: 'RSRP', field: 'avgRsrp', unit: 'dBm', higherBetter: true, decimals: 1, icon: <Signal className="h-3.5 w-3.5" /> },
  { key: 'dl', label: 'DL Throughput', field: 'avgDownloadThroughput', unit: 'Mbps', higherBetter: true, decimals: 2, icon: <ArrowDownToLine className="h-3.5 w-3.5" /> },
  { key: 'ul', label: 'UL Throughput', field: 'avgUploadThroughput', unit: 'Mbps', higherBetter: true, decimals: 2, icon: <ArrowUpFromLine className="h-3.5 w-3.5" /> },
  { key: 'latency', label: 'Latency', field: 'avgLatency', unit: 'ms', higherBetter: false, decimals: 1, icon: <Timer className="h-3.5 w-3.5" /> },
  { key: 'availability', label: 'Availability', field: 'avgAvailability', unit: '%', higherBetter: true, decimals: 2, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { key: 'ho', label: 'HO Success Rate', field: 'avgHandoverSuccessRate', unit: '%', higherBetter: true, decimals: 2, icon: <ArrowRightLeft className="h-3.5 w-3.5" /> },
  { key: 'drop', label: 'Drop Rate', field: 'avgDropRate', unit: '%', higherBetter: false, decimals: 2, icon: <TrendingDown className="h-3.5 w-3.5" /> },
  { key: 'sites', label: 'Site Count', field: 'siteCount', unit: '', higherBetter: true, decimals: 0, icon: <Building2 className="h-3.5 w-3.5" /> },
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
  const [technology, setTechnology] = useState<string>('4G');

  const { data, isLoading, error } = useQuery<VendorCompareResponse>({
    queryKey: ['vendor-compare', technology],
    queryFn: () => fetch(`/api/vendor-compare?technology=${technology}`).then((r) => r.json()),
    refetchInterval: 60000,
  });

  const comparisons = data?.comparisons ?? [];
  const summary = data?.summary;

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
      label: 'Best RSRP',
      value: summary?.bestRsrp?.value,
      vendor: summary?.bestRsrp?.vendor,
      unit: 'dBm',
      decimals: 1,
    },
    {
      label: 'Best DL Throughput',
      value: summary?.bestThroughput?.value,
      vendor: summary?.bestThroughput?.vendor,
      unit: 'Mbps',
      decimals: 2,
    },
    {
      label: 'Best UL Throughput',
      value: null,
      vendor: null,
      unit: 'Mbps',
      decimals: 2,
      computed: true,
    },
    {
      label: 'Best Latency',
      value: summary?.bestLatency?.value,
      vendor: summary?.bestLatency?.vendor,
      unit: 'ms',
      decimals: 1,
    },
    {
      label: 'Best Availability',
      value: summary?.bestAvailability?.value,
      vendor: summary?.bestAvailability?.vendor,
      unit: '%',
      decimals: 2,
    },
    {
      label: 'Best HO Rate',
      value: summary?.bestHoRate?.value,
      vendor: summary?.bestHoRate?.vendor,
      unit: '%',
      decimals: 2,
    },
    {
      label: 'Lowest Drop Rate',
      value: summary?.bestLowestDropRate?.value,
      vendor: summary?.bestLowestDropRate?.vendor,
      unit: '%',
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
            Vendor Comparison
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cross-vendor KPI benchmarking — Ericsson vs Huawei vs Nokia vs Samsung vs ZTE
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
                    {kpi.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {displayValue != null
                      ? `${formatNumber(displayValue, kpi.decimals)}${kpi.unit ? ` ${kpi.unit}` : ''}`
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
            Failed to load vendor comparison data.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && comparisons.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            No vendor data available for {technology}.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && comparisons.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              KPI Comparison Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs whitespace-nowrap min-w-[160px]">
                      KPI
                    </TableHead>
                    {comparisons.map((c) => (
                      <TableHead key={c.vendor} className="text-xs whitespace-nowrap text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold">{c.vendor}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {c.siteCount} sites
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
                            {row.label}
                            {row.unit && (
                              <span className="text-[10px]">({row.unit})</span>
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
                              {row.unit ? ` ${row.unit}` : ''}
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
              Average Throughput by Vendor
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
                    label={{ value: 'Mbps', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
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