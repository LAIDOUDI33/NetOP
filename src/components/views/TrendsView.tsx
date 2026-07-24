'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie,
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
import { TrendingUp, Frown, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import { useT } from '@/lib/i18n';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

interface TrendRecord {
  id: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  technology: Technology;
  region: string;
  metric: string;
  forecastPoints: string;
  horizon: string;
  trendDirection: string;
  confidence: number;
  recommendation: string;
  timestamp: string;
}

interface TrendSummary {
  total: number;
  byDirection: Record<string, number>;
  byMetric: Record<string, number>;
  byHorizon: Record<string, number>;
  avgConfidence: number;
}

interface TrendsResponse {
  trends: TrendRecord[];
  summary: TrendSummary;
}

// ─── Constants ─────────────────────────────────────────────────────────

const METRIC_OPTIONS = [
  { value: 'all', label: 'All Metrics' },
  { value: 'rsrp', label: 'RSRP' },
  { value: 'downloadThroughput', label: 'Download Throughput' },
  { value: 'uploadThroughput', label: 'Upload Throughput' },
  { value: 'latency', label: 'Latency' },
  { value: 'availability', label: 'Availability' },
  { value: 'handoverSuccessRate', label: 'Handover Success Rate' },
  { value: 'dropRate', label: 'Drop Rate' },
  { value: 'prbUtilization', label: 'PRB Utilization' },
  { value: 'activeUsers', label: 'Active Users' },
];

const HORIZONS = ['7d', '14d', '30d', '90d'];

const HORIZON_BG: Record<string, string> = {
  '7d': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  '14d': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  '30d': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  '90d': 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
};

const DIRECTION_CONFIG: Record<string, { color: string; bg: string; arrow: 'up' | 'right' | 'down'; label: string }> = {
  improving: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20', arrow: 'up', label: 'Improving' },
  stable: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20', arrow: 'right', label: 'Stable' },
  degrading: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20', arrow: 'down', label: 'Degrading' },
};

const DIRECTION_PIE_COLORS: Record<string, string> = {
  improving: '#10B981',
  stable: '#F59E0B',
  degrading: '#EF4444',
};

const HORIZON_BAR_COLORS: Record<string, string> = {
  '7d': TECH_COLORS['4G'],
  '14d': TECH_COLORS['3G'],
  '30d': TECH_COLORS['5G'],
  '90d': TECH_COLORS['2G'],
};

// ─── Helper Functions ──────────────────────────────────────────────────

function DirectionArrow({ direction }: { direction: string }) {
  const config = DIRECTION_CONFIG[direction];
  if (!config) return <span className="text-muted-foreground">—</span>;

  if (config.arrow === 'up') {
    return (
      <span className={`inline-flex items-center gap-0.5 font-medium text-xs ${config.color}`}>
        <ArrowUp className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (config.arrow === 'down') {
    return (
      <span className={`inline-flex items-center gap-0.5 font-medium text-xs ${config.color}`}>
        <ArrowDown className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium text-xs ${config.color}`}>
      <ArrowRight className="h-3.5 w-3.5" />
    </span>
  );
}

function confidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (confidence >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
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

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: rows }).map((_, r) => (
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
          <span className="font-medium">{formatNumber(entry.value, 0)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function TrendsView() {
  const t = useT();
  const dirLabel: Record<string, string> = {
    improving: t('trd.improving'),
    stable: t('trd.stable'),
    degrading: t('trd.degrading'),
  };
  const [techFilter, setTechFilter] = useState<string>('all');
  const [metricFilter, setMetricFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<TrendsResponse>({
    queryKey: ['trends', techFilter, metricFilter, regionFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (metricFilter !== 'all') params.set('metric', metricFilter);
      if (regionFilter !== 'all') params.set('region', regionFilter);
      const qs = params.toString();
      return fetch(`/api/trends${qs ? `?${qs}` : ''}`).then(r => { if (!r.ok) throw new Error('Trends API error: ' + r.status); return r.json(); });
    },
    refetchInterval: 30000,
  });

  const trends = data?.trends ?? [];
  const summary = data?.summary;

  const improvingCount = summary?.byDirection?.improving ?? 0;
  const stableCount = summary?.byDirection?.stable ?? 0;
  const degradingCount = summary?.byDirection?.degrading ?? 0;

  // Pie chart data: Trend Direction
  const directionPieData = [
    { name: t('trd.improving'), value: improvingCount, fill: DIRECTION_PIE_COLORS.improving },
    { name: t('trd.stable'), value: stableCount, fill: DIRECTION_PIE_COLORS.stable },
    { name: t('trd.degrading'), value: degradingCount, fill: DIRECTION_PIE_COLORS.degrading },
  ].filter((d) => d.value > 0);

  // Bar chart data: Forecast by Horizon
  const horizonBarData = HORIZONS.map((h) => ({
    horizon: h,
    count: summary?.byHorizon?.[h] ?? 0,
    fill: HORIZON_BAR_COLORS[h] ?? '#94A3B8',
  }));

  // ─── Render: Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton rows={8} cols={9} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: 'trend' })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || trends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <TrendingUp className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('trd.noData')}</p>
        <p className="text-sm mt-1">
          {t('view.noForecastYet')}
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
          <TrendingUp className="h-6 w-6 text-emerald-500" />
          {t('trd.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('trd.subtitle')}
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Forecasts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-500" />
              {t('trd.totalForecasts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {summary?.total ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('view.activePredictions')}</p>
          </CardContent>
        </Card>

        {/* Improving */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-emerald-500" />
              {t('trd.improving')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {improvingCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('view.upwardTrend')}</p>
          </CardContent>
        </Card>

        {/* Stable */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-amber-500" />
              {t('trd.stable')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stableCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('view.noSignificantChange')}</p>
          </CardContent>
        </Card>

        {/* Degrading */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-red-500" />
              {t('trd.degrading')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {degradingCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('view.needsAttention')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend Direction Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('trd.dirDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {directionPieData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {t('trd.noDataAvailable')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={directionPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {directionPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-2">
              {directionPieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Forecast by Horizon Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('trd.byHorizon')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={horizonBarData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="horizon"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name={t('trd.forecasts')} radius={[4, 4, 0, 0]}>
                    {horizonBarData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">{t('trd.details')}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder={t('filter.tech')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTechShort')}</SelectItem>
                <SelectItem value="2G">2G</SelectItem>
                <SelectItem value="3G">3G</SelectItem>
                <SelectItem value="4G">4G</SelectItem>
                <SelectItem value="5G">5G</SelectItem>
              </SelectContent>
            </Select>
            <Select value={metricFilter} onValueChange={setMetricFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('filter.metric')} />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.value === 'all' ? t('trd.allMetrics') : m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('filter.region')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allRegions')}</SelectItem>
                <SelectItem value="Alger">Alger</SelectItem>
                <SelectItem value="Oran">Oran</SelectItem>
                <SelectItem value="Constantine">Constantine</SelectItem>
                <SelectItem value="Annaba">Annaba</SelectItem>
                <SelectItem value="Tamanrasset">Tamanrasset</SelectItem>
              </SelectContent>
            </Select>
            <ExportButton data={trends as unknown as Record<string, any>[]} filenamePrefix="trends" columns={[{ key: 'siteName', header: t('th.site') }, { key: 'technology', header: t('th.technology') }, { key: 'metric', header: t('th.metric') }, { key: 'region', header: t('filter.region') }, { key: 'horizon', header: t('trd.horizon') }, { key: 'trendDirection', header: t('trd.direction') }, { key: 'confidence', header: t('trd.confidence') }, { key: 'recommendation', header: t('trd.recommendation') }]} />
          </div>
        </CardHeader>
        <CardContent>
          {trends.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('trd.noMatchFilter')}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">{t('th.site')}</TableHead>
                    <TableHead>{t('filter.tech')}</TableHead>
                    <TableHead>{t('filter.metric')}</TableHead>
                    <TableHead>{t('trd.horizon')}</TableHead>
                    <TableHead>{t('trd.direction')}</TableHead>
                    <TableHead className="text-right">{t('trd.confidence')}</TableHead>
                    <TableHead>{t('trd.trend')}</TableHead>
                    <TableHead>{t('trd.recommendation')}</TableHead>
                    <TableHead>{t('filter.region')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trends.map((trend) => {
                    const dirConfig = DIRECTION_CONFIG[trend.trendDirection];
                    return (
                      <TableRow key={trend.id}>
                        <TableCell className="font-medium text-xs max-w-[160px] truncate sticky left-0 bg-background">
                          <div className="flex flex-col">
                            <span>{trend.siteName}</span>
                            <span className="text-muted-foreground text-[10px]">{trend.siteCode}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={TECH_BG_CLASSES[trend.technology]}
                          >
                            {trend.technology}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{trend.metric}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={HORIZON_BG[trend.horizon] ?? ''}
                          >
                            {trend.horizon}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={dirConfig?.bg ?? ''}
                          >
                            {dirConfig ? (
                              <span className="flex items-center gap-1">
                                <DirectionArrow direction={trend.trendDirection} />
                                {dirLabel[trend.trendDirection] ?? trend.trendDirection}
                              </span>
                            ) : (
                              trend.trendDirection
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right text-xs font-medium ${confidenceColor(trend.confidence)}`}>
                          {formatNumber(trend.confidence, 0)}%
                        </TableCell>
                        <TableCell>
                          <DirectionArrow direction={trend.trendDirection} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={trend.recommendation}>
                          {trend.recommendation}
                        </TableCell>
                        <TableCell className="text-xs">{trend.region}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}