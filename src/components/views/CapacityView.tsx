'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp, ShieldAlert, Frown, BarChart3,
} from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber, TECHNOLOGIES } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface CapacityForecast {
  id: string;
  siteId: string;
  siteName: string | null;
  siteCode: string | null;
  technology: Technology;
  region: string;
  metric: string;
  currentValue: number;
  forecastValue: number;
  forecastHorizon: string;
  growthRate: number;
  capacityLimit: number;
  utilizationAtLimit: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  timestamp: string;
  createdAt: string;
}

interface CapacitySummary {
  total: number;
  byRisk: Record<string, number>;
  avgGrowthRate: number;
  sitesAtRisk: number;
}

interface CapacityResponse {
  forecasts: CapacityForecast[];
  summary: CapacitySummary;
}

// ─── Risk Color Helpers ────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#991B1B',
};

const RISK_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'destructive',
  critical: 'destructive',
};

function growthColor(rate: number): string {
  if (rate > 10) return 'text-red-600 dark:text-red-400';
  return 'text-amber-600 dark:text-amber-400';
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
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
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

function TableSkeleton({ rows = 5, cols = 10 }: { rows?: number; cols?: number }) {
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
          <span className="font-medium">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function CapacityView() {
  const t = useT();
  const [techFilter, setTechFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<CapacityResponse>({
    queryKey: ['capacity', { technology: techFilter, riskLevel: riskFilter }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (riskFilter !== 'all') params.set('riskLevel', riskFilter);
      const qs = params.toString();
      return fetch(`/api/capacity${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const forecasts = data?.forecasts ?? [];
  const summary = data?.summary;

  // ─── Derived Data ───────────────────────────────────────────────────

  // Risk distribution chart data
  const riskDistData = summary
    ? [
        { name: 'Low', count: summary.byRisk.low ?? 0, fill: RISK_COLORS.low },
        { name: 'Medium', count: summary.byRisk.medium ?? 0, fill: RISK_COLORS.medium },
        { name: 'High', count: summary.byRisk.high ?? 0, fill: RISK_COLORS.high },
        { name: t('status.critical'), count: summary.byRisk.critical ?? 0, fill: RISK_COLORS.critical },
      ]
    : [];

  // Forecast by technology chart data (avg forecastValue grouped by tech)
  const forecastByTechData = (() => {
    const grouped: Record<string, { sum: number; count: number }> = {};
    for (const f of forecasts) {
      if (!grouped[f.technology]) grouped[f.technology] = { sum: 0, count: 0 };
      grouped[f.technology].sum += f.forecastValue;
      grouped[f.technology].count += 1;
    }
    return TECHNOLOGIES.map((tech) => ({
      tech,
      avgForecast: grouped[tech]
        ? Number((grouped[tech].sum / grouped[tech].count).toFixed(2))
        : 0,
      fill: TECH_COLORS[tech],
    }));
  })();

  // Avg confidence
  const avgConfidence = (() => {
    if (forecasts.length === 0) return 0;
    const sum = forecasts.reduce((s, f) => s + f.confidence, 0);
    return Number(((sum / forecasts.length) * 100).toFixed(1));
  })();

  // ─── Render: Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-80 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton rows={5} cols={10} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: 'capacity' })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || forecasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('empty.noDataFor', { entity: 'Capacity Forecasts' })}</p>
        <p className="text-sm mt-1">
          {techFilter !== 'all' || riskFilter !== 'all'
            ? t('empty.noMatchShort')
            : t('view.noDataYet', { entity: 'Capacity forecasts' })}
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
          Capacity Planning & Forecasting
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Predict resource exhaustion and plan infrastructure upgrades
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={techFilter} onValueChange={setTechFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t('filter.technology')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allTech')}</SelectItem>
            {TECHNOLOGIES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t('filter.riskLevel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allLevels')}</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">{t('status.critical')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Forecasts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              Total Forecasts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-slate-700 dark:text-slate-200">
              {summary?.total ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Across all sites</p>
          </CardContent>
        </Card>

        {/* Sites at Risk */}
        <Card className={summary && summary.sitesAtRisk > 0 ? 'border-red-500/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Sites at Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${summary && summary.sitesAtRisk > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {summary?.sitesAtRisk ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">High & critical risk sites</p>
          </CardContent>
        </Card>

        {/* Avg Growth Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Avg Growth Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${growthColor(summary?.avgGrowthRate ?? 0)}`}>
              {formatNumber(summary?.avgGrowthRate ?? 0)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">Resource consumption trend</p>
          </CardContent>
        </Card>

        {/* Avg Confidence */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(avgConfidence, 1)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">Forecast model accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('cap.riskDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDistData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="count" name="Forecasts" radius={[4, 4, 0, 0]}>
                    {riskDistData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Forecast by Technology Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('cap.avgForecast')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastByTechData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="tech"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="avgForecast" name={t("cap.avgForecast")} radius={[4, 4, 0, 0]}>
                    {forecastByTechData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('cap.forecastDetails')}</CardTitle>
          <ExportButton data={forecasts} filenamePrefix="capacity" columns={[{ key: 'siteName', header: 'Site' }, { key: 'technology', header: 'Technology' }, { key: 'region', header: 'Region' }, { key: 'metric', header: 'Metric' }, { key: 'currentValue', header: 'Current (%)' }, { key: 'forecastValue', header: 'Forecast (%)' }, { key: 'growthRate', header: 'Growth Rate (%)' }, { key: 'riskLevel', header: 'Risk' }, { key: 'confidence', header: 'Confidence' }]} />
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">{t('th.site')}</TableHead>
                  <TableHead>{t('th.tech')}</TableHead>
                  <TableHead>{t('th.region')}</TableHead>
                  <TableHead>{t('th.metric')}</TableHead>
                  <TableHead className="text-right">{t('th.current')}</TableHead>
                  <TableHead className="text-right">{t('th.forecast')}</TableHead>
                  <TableHead className="text-right">{t('th.change')}</TableHead>
                  <TableHead>{t('filter.riskLevel')}</TableHead>
                  <TableHead className="text-right">{t('th.confidence')}</TableHead>
                  <TableHead>{t('th.description')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecasts.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium text-xs sticky left-0 bg-background">
                      <div className="max-w-[140px]">
                        <div className="truncate">{f.siteName ?? f.siteId}</div>
                        {f.siteCode && (
                          <div className="text-muted-foreground text-[10px] truncate">
                            {f.siteCode}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={TECH_BG_CLASSES[f.technology]}
                      >
                        {f.technology}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{f.region}</TableCell>
                    <TableCell className="text-xs font-medium">{f.metric}</TableCell>
                    <TableCell className="text-right text-xs">
                      {formatNumber(f.currentValue)}%
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatNumber(f.forecastValue)}%
                    </TableCell>
                    <TableCell className={`text-right text-xs font-medium ${growthColor(f.growthRate)}`}>
                      {formatNumber(f.growthRate)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={RISK_BADGE_VARIANT[f.riskLevel] ?? 'outline'}>
                        {f.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-emerald-600 dark:text-emerald-400">
                      {formatNumber(f.confidence * 100, 1)}%
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className="block max-w-[200px] truncate"
                        title={f.recommendation}
                      >
                        {f.recommendation || '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
