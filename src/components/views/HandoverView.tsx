'use client';
import { useT } from '@/lib/i18n';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, PieChart, Pie, XAxis, YAxis, CartesianGrid,
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
import { ArrowRightLeft, Frown } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface HandoverItem {
  id: string;
  servingCellId: string;
  servingCellName: string;
  servingCellCode: string;
  servingCellRegion: string;
  neighborCellName: string;
  neighborCellCode: string;
  technology: Technology;
  relationType: string;
  hoAttempts: number;
  hoSuccess: number;
  hoFailures: number;
  hoSuccessRate: number;
  avgPrepTime: number;
  avgExecTime: number;
  pingPongCount: number;
  tooEarlyCount: number;
  tooLateCount: number;
  status: string;
  recommendation: string;
  timestamp: string;
}

interface HandoverSummary {
  total: number;
  avgSuccessRate: number;
  byStatus: Record<string, number>;
  byRelationType: Record<string, number>;
  totalAttempts: number;
  totalFailures: number;
  pingPongTotal: number;
}

interface HandoverResponse {
  handovers: HandoverItem[];
  summary: HandoverSummary;
}

// ─── Helper Functions ──────────────────────────────────────────────────

function successRateColor(rate: number): string {
  if (rate >= 95) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 90) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function successRateBg(rate: number): string {
  if (rate >= 95) return 'bg-emerald-500';
  if (rate >= 90) return 'bg-amber-500';
  return 'bg-red-500';
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'normal') return 'default';
  if (status === 'degraded') return 'secondary';
  return 'destructive';
}

function statusColor(status: string): string {
  if (status === 'normal') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
  if (status === 'degraded') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
  return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20';
}

function relationTypeColor(type: string): string {
  if (type === 'intra_freq') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
  if (type === 'inter_freq') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
  return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20';
}

function formatK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
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

// ─── PIE Chart Tooltip ────────────────────────────────────────────────

function PieTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.payload.fill }} />
        <span className="font-medium">{d.name}:</span>
        <span>{d.value}</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function HandoverView() {
  const t = useT();
  const [techFilter, setTechFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<HandoverResponse>({
    queryKey: ['handover', techFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      return fetch(`/api/handover${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const handovers = data?.handovers ?? [];
  const summary = data?.summary;

  // Chart data: HO Success Rate Distribution
  const statusDistData = summary?.byStatus
    ? Object.entries(summary.byStatus).map(([status, count]) => {
        const color = status === 'normal' ? '#10B981' : status === 'degraded' ? '#F59E0B' : '#EF4444';
        return { name: status.charAt(0).toUpperCase() + status.slice(1), count, fill: color };
      })
    : [];

  // Chart data: Relation Type Distribution (Pie)
  const relationTypeData = summary?.byRelationType
    ? Object.entries(summary.byRelationType).map(([type, count]) => {
        const color = type === 'intra_freq' ? '#10B981' : type === 'inter_freq' ? '#F59E0B' : '#06B6D4';
        return { name: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), value: count, fill: color };
      })
    : [];

  // Critical pairs count
  const criticalPairs = summary?.byStatus?.critical ?? 0;

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
        <p className="text-lg font-medium">{t('empty.noDataFor', { entity: t('ho.title') })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || handovers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <ArrowRightLeft className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No Handover Data Available</p>
        <p className="text-sm mt-1">
          {techFilter !== 'all' || statusFilter !== 'all'
            ? t('ho.noMatch')
            : t('empty.notYet')}
        </p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('ho.subtitle')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Neighbor-level handover KPI analysis and optimization
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Pairs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
              Total Pairs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {summary?.total ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Serving–Neighbor pairs</p>
          </CardContent>
        </Card>

        {/* Avg Success Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${successRateColor(summary?.avgSuccessRate ?? 0)}`}>
              {formatNumber(summary?.avgSuccessRate ?? 0, 1)}%
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${successRateBg(summary?.avgSuccessRate ?? 0)}`}
                style={{ width: `${Math.min(summary?.avgSuccessRate ?? 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Total Attempts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {formatK(summary?.totalAttempts ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">All HO attempts</p>
          </CardContent>
        </Card>

        {/* Total Failures */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Failures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {formatK(summary?.totalFailures ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Failed handovers</p>
          </CardContent>
        </Card>

        {/* Ping-Pong Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ping-Pong Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {formatK(summary?.pingPongTotal ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Rapid bounce-back HOs</p>
          </CardContent>
        </Card>

        {/* Critical Pairs */}
        <Card className="border-red-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical Pairs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {criticalPairs}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Require immediate action</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Success Rate Distribution + Relation Type Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* HO Success Rate Distribution BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('ho.successRateDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDistData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="Pairs" radius={[4, 4, 0, 0]}>
                    {statusDistData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Relation Type PieChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('ho.relationTypeDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={relationTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {relationTypeData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-1">
                {relationTypeData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
                    {entry.name}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('ho.pairDetails')}</CardTitle>
          <div className="flex items-center gap-2">
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
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('filter.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="degraded">{t('status.degraded')}</SelectItem>
                <SelectItem value="critical">{t('status.critical')}</SelectItem>
              </SelectContent>
            </Select>
            <ExportButton data={handovers} filenamePrefix="handover" columns={[{ key: 'servingCellName', header: 'Serving Cell' }, { key: 'neighborCellName', header: 'Neighbor' }, { key: 'technology', header: 'Technology' }, { key: 'relationType', header: 'Type' }, { key: 'hoSuccessRate', header: 'Success Rate' }, { key: 'hoAttempts', header: 'Attempts' }, { key: 'hoFailures', header: 'Failures' }, { key: 'status', header: 'Status' }]} />
          </div>
        </CardHeader>
        <CardContent>
          {handovers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('ho.noMatch')}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Serving Cell</TableHead>
                    <TableHead className="sticky left-[140px] bg-background z-10">{t('th.code')}</TableHead>
                    <TableHead className="sticky left-[200px] bg-background z-10">Neighbor</TableHead>
                    <TableHead className="sticky left-[340px] bg-background z-10">{t('th.code')}</TableHead>
                    <TableHead>{t('th.tech')}</TableHead>
                    <TableHead>{t('th.type')}</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                    <TableHead className="text-right">Failures</TableHead>
                    <TableHead className="text-right">{t('th.hoSuccessRate')}</TableHead>
                    <TableHead className="text-right">Prep ms</TableHead>
                    <TableHead className="text-right">Exec ms</TableHead>
                    <TableHead className="text-right">Ping-Pong</TableHead>
                    <TableHead>Early/Late</TableHead>
                    <TableHead>{t('th.status')}</TableHead>
                    <TableHead>{t('th.action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {handovers.map((ho) => (
                    <TableRow key={ho.id}>
                      <TableCell className="font-medium text-xs max-w-[140px] truncate sticky left-0 bg-background">
                        {ho.servingCellName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground sticky left-[140px] bg-background">
                        {ho.servingCellCode}
                      </TableCell>
                      <TableCell className="font-medium text-xs max-w-[140px] truncate sticky left-[200px] bg-background">
                        {ho.neighborCellName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground sticky left-[340px] bg-background">
                        {ho.neighborCellCode}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TECH_BG_CLASSES[ho.technology]}>
                          {ho.technology}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={relationTypeColor(ho.relationType)}>
                          {ho.relationType.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {ho.hoAttempts.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {ho.hoSuccess.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs text-red-600 dark:text-red-400 font-medium">
                        {ho.hoFailures.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${successRateBg(ho.hoSuccessRate)}`}
                              style={{ width: `${Math.min(ho.hoSuccessRate, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium min-w-[36px] text-right ${successRateColor(ho.hoSuccessRate)}`}>
                            {formatNumber(ho.hoSuccessRate, 1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(ho.avgPrepTime, 1)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(ho.avgExecTime, 1)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {ho.pingPongCount > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {ho.pingPongCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="text-muted-foreground">
                          {ho.tooEarlyCount}/{ho.tooLateCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(ho.status)} className={statusColor(ho.status)}>
                          {ho.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={ho.recommendation}>
                        {ho.recommendation}
                      </TableCell>
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