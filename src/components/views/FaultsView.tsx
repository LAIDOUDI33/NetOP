'use client';
import { useT } from '@/lib/i18n';
import DataExportButton from '@/components/DataExportButton';
import { ExportButton } from '@/components/ExportButton';

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
import { Progress } from '@/components/ui/progress';
import {
  Brain, ShieldAlert, ShieldCheck, Frown, AlertTriangle,
} from 'lucide-react';
import { TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface FaultPrediction {
  id: string;
  siteId: string | null;
  siteName: string | null;
  siteCode: string | null;
  technology: Technology;
  component: string;
  faultType: string;
  probability: number;
  severity: string;
  status: string;
  confidence: number;
  indicators: string[];
  recommendedAction: string;
  estimatedTimeToFail: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FaultSummary {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byComponent: Record<string, number>;
  avgProbability: number;
  highRiskCount: number;
}

interface FaultsResponse {
  predictions: FaultPrediction[];
  summary: FaultSummary;
}

// ─── Constants ─────────────────────────────────────────────────────────

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const COMPONENTS = ['RRU', 'BBU', 'PSU', 'Antenna', 'Fiber', 'Transport'] as const;
const SEVERITY_BAR_COLORS: Record<string, string> = {
  low: '#64748B',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#991B1B',
};

const SEVERITY_HEATMAP_BG: Record<string, string> = {
  low: 'bg-slate-100 dark:bg-slate-800/50',
  medium: 'bg-amber-100 dark:bg-amber-900/30',
  high: 'bg-red-100 dark:bg-red-900/30',
  critical: 'bg-red-200 dark:bg-red-900/50',
};

const COMPONENT_BADGE_CLASSES: Record<string, string> = {
  RRU: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  BBU: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  PSU: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  Antenna: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  Fiber: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  Transport: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
};

const COMPONENT_DOT_COLORS: Record<string, string> = {
  RRU: 'bg-amber-500',
  BBU: 'bg-emerald-500',
  PSU: 'bg-red-500',
  Antenna: 'bg-cyan-500',
  Fiber: 'bg-orange-500',
  Transport: 'bg-rose-500',
};

const SEVERITY_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'default',
  medium: 'secondary',
  high: 'destructive',
  critical: 'destructive',
};

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  predicted: 'default',
  confirmed: 'destructive',
  mitigated: 'outline',
  false_positive: 'secondary',
};

// ─── Helper Functions ──────────────────────────────────────────────────

function probabilityBarColor(pct: number): string {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 60) return 'bg-amber-500';
  if (pct >= 40) return 'bg-amber-400';
  return 'bg-emerald-500';
}

function probabilityProgressClass(pct: number): string {
  if (pct >= 80) return '[&>div]:bg-red-500';
  if (pct >= 60) return '[&>div]:bg-amber-500';
  if (pct >= 40) return '[&>div]:bg-amber-400';
  return '[&>div]:bg-emerald-500';
}

function formatFaultType(ft: string): string {
  return ft.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStatus(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-2 w-full" />
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

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-64" />
        </div>
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

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}
function ChartTooltipContent({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1 capitalize">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function FaultsView() {
  const t = useT();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [componentFilter, setComponentFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<FaultsResponse>({
    queryKey: ['faults', severityFilter, statusFilter, componentFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (componentFilter !== 'all') params.set('component', componentFilter);
      const qs = params.toString();
      return fetch(`/api/faults${qs ? `?${qs}` : ''}`).then((r) => { if (!r.ok) throw new Error('Faults API error: ' + r.status); return r.json(); });
    },
    refetchInterval: 30000,
  });

  const predictions = data?.predictions ?? [];
  const summary = data?.summary;

  const severityChartData = SEVERITIES.map((s) => ({
    severity: s,
    count: summary?.bySeverity[s] ?? 0,
    fill: SEVERITY_BAR_COLORS[s],
  }));

  const avgProbabilityPct = summary ? summary.avgProbability * 100 : 0;

  // Build heatmap data: for each component × severity, count from predictions
  const heatmapData: Record<string, Record<string, number>> = {};
  for (const comp of COMPONENTS) {
    heatmapData[comp] = {};
    for (const sev of SEVERITIES) {
      heatmapData[comp][sev] = 0;
    }
    heatmapData[comp]._total = 0;
  }
  for (const p of predictions) {
    if (p.component in heatmapData && p.severity in heatmapData[p.component]) {
      heatmapData[p.component][p.severity]++;
      heatmapData[p.component]._total++;
    }
  }

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
        <TableSkeleton rows={8} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('empty.noDataFor', { entity: t('flt.title') })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || predictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Brain className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('empty.noDataFor', { entity: t('flt.title') })}</p>
        <p className="text-sm mt-1">
          {t('view.noDataYet', { entity: 'Fault predictions' })}
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
          <Brain className="h-6 w-6 text-amber-500" />
          {t('flt.predictions')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Predictive maintenance and failure forecasting
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Predictions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Brain className="h-4 w-4 text-amber-500" />
              'Total Predictions'
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {summary?.total ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">'AI-generated predictions'</p>
          </CardContent>
        </Card>

        {/* 2. High/Critical Risk */}
        <Card className="border-red-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              'High/Critical Risk'
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary?.highRiskCount ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">'Requires immediate action'</p>
          </CardContent>
        </Card>

        {/* 3. Avg Probability */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              'Avg Probability'
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${avgProbabilityPct >= 80 ? 'text-red-600 dark:text-red-400' : avgProbabilityPct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatNumber(avgProbabilityPct, 0)}%
            </span>
            <Progress
              value={avgProbabilityPct}
              className={`mt-2 h-2 ${probabilityProgressClass(avgProbabilityPct)}`}
            />
          </CardContent>
        </Card>

        {/* 4. Confirmed Faults */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              'Confirmed Faults'
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary?.byStatus?.confirmed ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">'Verified by field team'</p>
          </CardContent>
        </Card>

        {/* 5. Mitigated */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              'Mitigated'
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary?.byStatus?.mitigated ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">'Action completed'</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Severity Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('flt.sevDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="severity"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                    {severityChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. Component Risk Heatmap Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('flt.componentHeatmap')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                {/* Header Row */}
                <div className="grid grid-cols-[100px_repeat(4,1fr)_80px] gap-1 mb-1">
                  <div className="text-xs font-medium text-muted-foreground" />
                  {SEVERITIES.map((sev) => (
                    <div
                      key={sev}
                      className="text-xs font-medium text-center capitalize"
                    >
                      {sev}
                    </div>
                  ))}
                  <div className="text-xs font-medium text-center text-muted-foreground">Total</div>
                </div>

                {/* Data Rows */}
                <div className="space-y-1">
                  {COMPONENTS.map((comp) => (
                    <div key={comp} className="grid grid-cols-[100px_repeat(4,1fr)_80px] gap-1 items-center">
                      {/* Component Label */}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${COMPONENT_DOT_COLORS[comp]}`} />
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${COMPONENT_BADGE_CLASSES[comp]}`}>
                          {comp}
                        </Badge>
                      </div>

                      {/* Severity Cells */}
                      {SEVERITIES.map((sev) => {
                        const count = heatmapData[comp]?.[sev] ?? 0;
                        return (
                          <div
                            key={`${comp}-${sev}`}
                            className={`rounded-md text-center text-xs font-medium py-1.5 ${SEVERITY_HEATMAP_BG[sev]} ${count === 0 ? 'text-muted-foreground/40' : ''}`}
                          >
                            {count}
                          </div>
                        );
                      })}

                      {/* Total Cell */}
                      <div className="text-center text-xs font-bold py-1.5 bg-muted rounded-md">
                        {heatmapData[comp]?._total ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Predictions Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">{t('flt.predictions')}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filter */}
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t('filter.severity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allSeverities')}</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">{t('status.critical')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('filter.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
                <SelectItem value="predicted">Predicted</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="mitigated">Mitigated</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>

            {/* Component Filter */}
            <Select value={componentFilter} onValueChange={setComponentFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t('filter.component')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allComponents')}</SelectItem>
                {COMPONENTS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DataExportButton data={predictions as unknown as Record<string, unknown>[]} filename="faults" />
            <ExportButton data={predictions} filenamePrefix="faults" columns={[{ key: 'siteName', header: 'Site' }, { key: 'technology', header: 'Technology' }, { key: 'component', header: 'Component' }, { key: 'faultType', header: 'Fault Type' }, { key: 'probability', header: 'Probability' }, { key: 'severity', header: 'Severity' }, { key: 'status', header: 'Status' }, { key: 'confidence', header: 'Confidence' }]} />
          </div>
        </CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('empty.noMatch')}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">{t('th.site')}</TableHead>
                    <TableHead>{t('th.tech')}</TableHead>
                    <TableHead>{t('th.component')}</TableHead>
                    <TableHead>{t('th.type')}</TableHead>
                    <TableHead className="text-right">{t('th.probability')}</TableHead>
                    <TableHead>{t('th.severity')}</TableHead>
                    <TableHead>{t('th.status')}</TableHead>
                    <TableHead className="text-right">{t('th.confidence')}</TableHead>
                    <TableHead>{t('ft.timeToFail')}</TableHead>
                    <TableHead>{t('th.action')}</TableHead>
                    <TableHead className="sticky right-0 bg-background z-10">{t('th.createdAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictions.map((p) => {
                    const probPct = p.probability * 100;
                    const confPct = p.confidence * 100;
                    const isCritical = p.severity === 'critical';

                    return (
                      <TableRow key={p.id}>
                        {/* Site */}
                        <TableCell className="font-medium text-xs max-w-[140px] sticky left-0 bg-background">
                          <div>
                            <span className="truncate block max-w-[140px]">
                              {p.siteName ?? '—'}
                            </span>
                            {p.siteCode && (
                              <span className="text-[10px] text-muted-foreground">
                                {p.siteCode}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Tech */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={TECH_BG_CLASSES[p.technology as Technology] ?? 'bg-slate-500/10 text-slate-700 border-slate-500/20'}
                          >
                            {p.technology}
                          </Badge>
                        </TableCell>

                        {/* Component */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${COMPONENT_BADGE_CLASSES[p.component] ?? 'bg-slate-500/10 text-slate-700 border-slate-500/20'}`}
                          >
                            {p.component}
                          </Badge>
                        </TableCell>

                        {/* Fault Type */}
                        <TableCell className="text-xs">
                          {formatFaultType(p.faultType)}
                        </TableCell>

                        {/* Probability */}
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${probabilityBarColor(probPct)}`}
                                style={{ width: `${probPct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${probPct >= 80 ? 'text-red-600 dark:text-red-400' : probPct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {formatNumber(probPct, 0)}%
                            </span>
                          </div>
                        </TableCell>

                        {/* Severity */}
                        <TableCell>
                          {isCritical ? (
                            <Badge
                              variant={SEVERITY_BADGE_VARIANT[p.severity] ?? 'default'}
                              className="bg-red-800 text-white hover:bg-red-900"
                            >
                              {p.severity.charAt(0).toUpperCase() + p.severity.slice(1)}
                            </Badge>
                          ) : (
                            <Badge variant={SEVERITY_BADGE_VARIANT[p.severity] ?? 'default'}>
                              {p.severity.charAt(0).toUpperCase() + p.severity.slice(1)}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant={STATUS_BADGE_VARIANT[p.status] ?? 'default'}>
                            {formatStatus(p.status)}
                          </Badge>
                        </TableCell>

                        {/* Confidence */}
                        <TableCell className="text-right text-xs font-medium">
                          {formatNumber(confPct, 0)}%
                        </TableCell>

                        {/* Time to Fail */}
                        <TableCell className="text-xs">
                          {p.estimatedTimeToFail ?? '—'}
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-xs max-w-[160px]">
                          <span
                            className="truncate block max-w-[160px]"
                            title={p.recommendedAction}
                          >
                            {p.recommendedAction}
                          </span>
                        </TableCell>

                        {/* Created */}
                        <TableCell className="text-xs text-muted-foreground sticky right-0 bg-background">
                          {formatDate(p.createdAt)}
                        </TableCell>
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