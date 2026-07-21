'use client';
import { useT } from '@/lib/i18n';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
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
import { Target, Frown, Radio } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface BenchmarkItem {
  id: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  technology: Technology;
  region: string;
  metric: string;
  actualValue: number;
  benchmarkValue: number;
  targetValue: number;
  percentileRank: number;
  gap: number;
  status: string;
  timestamp: string;
}

interface BenchmarkSummary {
  total: number;
  byStatus: Record<string, number>;
  byMetric: Record<string, number>;
  avgGap: number;
  aboveTarget: number;
}

interface BenchmarkResponse {
  benchmarks: BenchmarkItem[];
  summary: BenchmarkSummary;
}

// ─── Metric & Status Config ───────────────────────────────────────────

const BENCHMARK_METRICS = [
  { value: 'rsrp', label: 'RSRP' },
  { value: 'rsrq', label: 'RSRQ' },
  { value: 'sinr', label: 'SINR' },
  { value: 'downloadThroughput', label: 'Download Throughput' },
  { value: 'uploadThroughput', label: 'Upload Throughput' },
  { value: 'latency', label: 'Latency' },
  { value: 'availability', label: 'Availability' },
  { value: 'handoverSuccessRate', label: 'Handover Success Rate' },
  { value: 'dropRate', label: 'Drop Rate' },
  { value: 'prbUtilization', label: 'PRB Utilization' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  exceeding: '#10B981',
  on_track: '#F59E0B',
  below_target: '#EF4444',
  critical: '#7F1D1D',
};

const STATUS_BG: Record<string, string> = {
  exceeding: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  on_track: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  below_target: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  critical: 'bg-red-900/10 text-red-700 dark:text-red-300 border-red-900/20',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  exceeding: 'default',
  on_track: 'secondary',
  below_target: 'destructive',
  critical: 'destructive',
};

function gapColor(gap: number): string {
  if (gap < 0) return 'text-emerald-600 dark:text-emerald-400';
  return 'text-red-600 dark:text-red-400';
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
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

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 5 }).map((_, r) => (
            <Skeleton key={r} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

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

// ─── Main Component ───────────────────────────────────────────────────

export default function BenchmarkView() {
  const t = useT();
  const [techFilter, setTechFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [metricFilter, setMetricFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<BenchmarkResponse>({
    queryKey: ['benchmark', techFilter, statusFilter, metricFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (metricFilter !== 'all') params.set('metric', metricFilter);
      const qs = params.toString();
      return fetch(`/api/benchmark${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const benchmarks = data?.benchmarks ?? [];
  const summary = data?.summary;

  // Status label mapping
  const statusLabels: Record<string, string> = {
    exceeding: 'Exceeding',
    on_track: t('status.onTrack'),
    below_target: t('status.belowTarget'),
    critical: t('status.critical'),
  };

  // Status distribution chart data
  const statusOrder = ['exceeding', 'on_track', 'below_target', 'critical'];
  const statusChartData = statusOrder
    .filter((s) => (summary?.byStatus?.[s] ?? 0) > 0)
    .map((s) => ({
      status: statusLabels[s] ?? s,
      count: summary?.byStatus?.[s] ?? 0,
      fill: STATUS_COLORS[s],
    }));

  // Metric gap chart data — avg gap per metric
  const metricGapData = summary?.byMetric
    ? (() => {
        const metricGaps: Record<string, { total: number; count: number }> = {};
        benchmarks.forEach((b) => {
          if (!metricGaps[b.metric]) metricGaps[b.metric] = { total: 0, count: 0 };
          metricGaps[b.metric].total += b.gap;
          metricGaps[b.metric].count += 1;
        });
        return Object.entries(metricGaps)
          .map(([metric, agg]) => ({
            metric: BENCHMARK_METRICS.find((m) => m.value === metric)?.label ?? metric,
            avgGap: Number((agg.total / agg.count).toFixed(2)),
          }))
          .sort((a, b) => a.avgGap - b.avgGap);
      })()
    : [];

  // KPI values
  const totalBenchmarks = summary?.total ?? 0;
  const aboveTarget = summary?.aboveTarget ?? 0;
  const avgGap = summary?.avgGap ?? 0;
  const aboveTargetPct = totalBenchmarks > 0 ? ((aboveTarget / totalBenchmarks) * 100).toFixed(1) : '0.0';

  // ─── Render: Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-72 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: 'Benchmark' })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || benchmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Radio className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('empty.noDataFor', { entity: 'Benchmark' })}</p>
        <p className="text-sm mt-1">
          {t('empty.notYet', { entity: 'Benchmark comparisons' })}
        </p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Target className="h-6 w-6 text-amber-500" />
          {t('title.benchmark')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('bm.subtitle')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Benchmarks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-500" />
              {t('bm.totalBenchmarks')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {totalBenchmarks}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('bm.metricComparisons')}</p>
          </CardContent>
        </Card>

        {/* Above Target */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              Above Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {aboveTarget}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Meeting or exceeding targets</p>
          </CardContent>
        </Card>

        {/* Avg Gap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Avg Gap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${gapColor(avgGap)}`}>
              {avgGap >= 0 ? '+' : ''}{formatNumber(avgGap)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {avgGap < 0 ? t('view.successfullyResolved') : t('view.awaitingResolution')}
            </p>
          </CardContent>
        </Card>

        {/* Above Target % */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              Above Target %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {aboveTargetPct}%
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(Number(aboveTargetPct), 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Compliance rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('bm.statusDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('empty.noData')}</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} barSize={56}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="status"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                      {statusChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metric Gap Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('bm.avgGap')}</CardTitle>
          </CardHeader>
          <CardContent>
            {metricGapData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('empty.noData')}</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricGapData} barSize={28} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="metric"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      width={100}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avgGap" name="Avg Gap" radius={[0, 4, 4, 0]}>
                      {metricGapData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.avgGap < 0 ? '#10B981' : '#EF4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">{t('bm.details')}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('filter.technology')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTechShort')}</SelectItem>
                <SelectItem value="2G">2G</SelectItem>
                <SelectItem value="3G">3G</SelectItem>
                <SelectItem value="4G">4G</SelectItem>
                <SelectItem value="5G">5G</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t('filter.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allStatus')}</SelectItem>
                <SelectItem value="exceeding">Exceeding</SelectItem>
                <SelectItem value="on_track">{t('status.onTrack')}</SelectItem>
                <SelectItem value="below_target">{t('status.belowTarget')}</SelectItem>
                <SelectItem value="critical">{t('status.critical')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={metricFilter} onValueChange={setMetricFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('filter.metric')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allMetrics')}</SelectItem>
                {BENCHMARK_METRICS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {benchmarks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('view.noDataForFilter', { entity: 'benchmarks' })}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">{t('th.site')}</TableHead>
                    <TableHead>{t('th.tech')}</TableHead>
                    <TableHead>{t('th.metric')}</TableHead>
                    <TableHead className="text-right">{t('th.actual')}</TableHead>
                    <TableHead className="text-right">Benchmark</TableHead>
                    <TableHead className="text-right">{t('th.target')}</TableHead>
                    <TableHead className="text-right">Percentile</TableHead>
                    <TableHead className="text-right">Gap</TableHead>
                    <TableHead>{t('th.status')}</TableHead>
                    <TableHead>{t('th.region')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmarks.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-xs max-w-[160px] truncate sticky left-0 bg-background">
                        {item.siteName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TECH_BG_CLASSES[item.technology]}>
                          {item.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {BENCHMARK_METRICS.find((m) => m.value === item.metric)?.label ?? item.metric}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatNumber(item.actualValue)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatNumber(item.benchmarkValue)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatNumber(item.targetValue)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatNumber(item.percentileRank)}%
                      </TableCell>
                      <TableCell className={`text-right text-xs font-medium ${gapColor(item.gap)}`}>
                        {item.gap >= 0 ? '+' : ''}{formatNumber(item.gap)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_VARIANT[item.status] ?? 'outline'}
                          className={STATUS_BG[item.status] ?? ''}
                        >
                          {statusLabels[item.status] ?? item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.region}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}