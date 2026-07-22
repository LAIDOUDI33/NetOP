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
import { ArrowRightLeft, Layers, MapPin, TrendingUp, DollarSign, CreditCard } from 'lucide-react';
import { TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

type EvolutionStatus = 'planned' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface EvolutionPlan {
  id: string;
  name: string;
  sourceTech: Technology;
  targetTech: Technology;
  region: string;
  siteCount: number;
  sitesCompleted: number;
  estimatedCost: number;
  spentBudget: number;
  startDate: string;
  targetDate: string;
  status: EvolutionStatus;
  spectrumGain: string[];
  capacityGain: Record<string, number>;
  riskLevel: RiskLevel;
  notes: string;
}

interface EvolutionSummary {
  total: number;
  totalSites: number;
  totalCompleted: number;
  totalBudget: number;
  totalSpent: number;
  bySourceTech: Record<string, number>;
  byTargetTech: Record<string, number>;
  byStatus: Record<string, number>;
  avgProgress: number;
}

interface EvolutionResponse {
  plans: EvolutionPlan[];
  summary: EvolutionSummary;
}

// ─── Status Styling ────────────────────────────────────────────────────

const STATUS_COLORS: Record<EvolutionStatus, string> = {
  planned: '#94A3B8',
  in_progress: '#F59E0B',
  completed: '#10B981',
  delayed: '#EF4444',
  cancelled: '#64748B',
};

const STATUS_BG_CLASSES: Record<EvolutionStatus, string> = {
  planned: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  in_progress: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  delayed: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  cancelled: 'bg-muted text-muted-foreground border-muted-foreground/20',
};

const STATUS_VARIANTS: Record<EvolutionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  planned: 'outline',
  in_progress: 'secondary',
  completed: 'default',
  delayed: 'destructive',
  cancelled: 'outline',
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low: 'text-emerald-600 dark:text-emerald-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
  critical: 'text-red-700 dark:text-red-500 font-bold',
};

const RISK_BG_CLASSES: Record<RiskLevel, string> = {
  low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  high: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  critical: 'bg-red-700/10 text-red-800 dark:text-red-200 border-red-700/20',
};

// ─── Helper Functions ──────────────────────────────────────────────────

function progressColor(pct: number): string {
  if (pct < 30) return 'bg-red-500';
  if (pct < 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function progressTextColor(pct: number): string {
  if (pct < 30) return 'text-red-600 dark:text-red-400';
  if (pct < 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${((n ?? 0) / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${((n ?? 0) / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function formatDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 6 }).map((_, r) => (
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
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function EvolutionView() {
  const t = useT();
  const [sourceTechFilter, setSourceTechFilter] = useState<string>('all');
  const [targetTechFilter, setTargetTechFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<EvolutionResponse>({
    queryKey: ['evolution', sourceTechFilter, targetTechFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (sourceTechFilter !== 'all') params.set('sourceTech', sourceTechFilter);
      if (targetTechFilter !== 'all') params.set('targetTech', targetTechFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      return fetch(`/api/evolution${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const plans = data?.plans ?? [];
  const summary = data?.summary;

  // Chart data: Status Distribution
  const statusChartData = summary?.byStatus
    ? (Object.entries(summary.byStatus) as [EvolutionStatus, number][])
        .filter(([, v]) => v > 0)
        .map(([status, count]) => ({
          status: status.replace(/_/g, ' '),
          count,
          fill: STATUS_COLORS[status],
        }))
    : [];

  // Chart data: Migration Paths (source → target combos)
  const migrationPathMap = new Map<string, number>();
  plans.forEach((p) => {
    const key = `${p.sourceTech} → ${p.targetTech}`;
    migrationPathMap.set(key, (migrationPathMap.get(key) ?? 0) + 1);
  });
  const migrationPathData = Array.from(migrationPathMap.entries()).map(([path, count]) => ({
    path,
    count,
    fill: TECH_BG_CLASSES[path.split(' → ')[0] as Technology]
      ? 'var(--color-primary)'
      : '#94A3B8',
  }));

  // Overall progress
  const overallProgress = summary
    ? summary.totalSites > 0
      ? Number(((summary.totalCompleted / summary.totalSites) * 100).toFixed(1))
      : 0
    : 0;

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
        <ArrowRightLeft className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: 'Evolution' })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <ArrowRightLeft className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('evo.noPlans')}</p>
        <p className="text-sm mt-1">
          {sourceTechFilter !== 'all' || targetTechFilter !== 'all' || statusFilter !== 'all'
            ? t('evo.noMatch')
            : t('evo.noDataYet')}
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
          <ArrowRightLeft className="h-6 w-6" />
          {t('evo.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('evo.subtitle')}
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Plans */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-500" />
              {t('evo.totalPlans')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-slate-700 dark:text-slate-200">
              {summary?.total ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Active migration plans</p>
          </CardContent>
        </Card>

        {/* Total Sites */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-500" />
              Total Sites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {(summary?.totalSites ?? 0).toLocaleString()}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('view.acrossAll', { entity: 'plans' })}</p>
          </CardContent>
        </Card>

        {/* Overall Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${progressTextColor(overallProgress)}`}>
              {formatNumber(overallProgress, 1)}%
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor(overallProgress)}`}
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.totalCompleted ?? 0} / {summary?.totalSites ?? 0} {t('unit.sites')}
            </p>
          </CardContent>
        </Card>

        {/* Total Budget */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(summary?.totalBudget ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Estimated total cost</p>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-rose-500" />
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(summary?.totalSpent ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.totalBudget
                ? `${((summary.totalSpent / summary.totalBudget) * 100).toFixed(1)}% of budget`
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('evo.statusDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('empty.noData')}</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} barSize={48}>
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
                    <Bar dataKey="count" name="Plans" radius={[4, 4, 0, 0]}>
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

        {/* Migration Paths */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('evo.migrationPaths')}</CardTitle>
          </CardHeader>
          <CardContent>
            {migrationPathData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('empty.noData')}</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={migrationPathData} barSize={48} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="path"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      width={72}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" name="Plans" radius={[0, 4, 4, 0]} fill="#10B981">
                      {migrationPathData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={
                            idx % 2 === 0 ? '#10B981' : '#F59E0B'
                          }
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

      {/* Plans Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('evo.plans')}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={sourceTechFilter} onValueChange={setSourceTechFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('evo.sourceTech')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allSource')}</SelectItem>
                <SelectItem value="2G">2G</SelectItem>
                <SelectItem value="3G">3G</SelectItem>
                <SelectItem value="4G">4G</SelectItem>
                <SelectItem value="5G">5G</SelectItem>
              </SelectContent>
            </Select>
            <Select value={targetTechFilter} onValueChange={setTargetTechFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('evo.targetTech')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTarget')}</SelectItem>
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
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">{t('status.inProgress')}</SelectItem>
                <SelectItem value="completed">{t('status.completed')}</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <ExportButton data={plans as unknown as Record<string, any>[]} filenamePrefix="evolution" columns={[{ key: 'name', header: 'Name' }, { key: 'sourceTech', header: 'Source Tech' }, { key: 'targetTech', header: 'Target Tech' }, { key: 'region', header: 'Region' }, { key: 'status', header: 'Status' }, { key: 'sitesAffected', header: 'Sites' }, { key: 'budget', header: 'Budget ($)' }, { key: 'progress', header: 'Progress (%)' }]} />
          </div>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('evo.noMatch')}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">{t('th.name')}</TableHead>
                    <TableHead>Migration</TableHead>
                    <TableHead>{t('th.region')}</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Cost %</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>{t('th.startTime')}</TableHead>
                    <TableHead>{t('th.target')}</TableHead>
                    <TableHead>{t('th.status')}</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => {
                    const planProgress =
                      plan.siteCount > 0
                        ? Number(((plan.sitesCompleted / plan.siteCount) * 100).toFixed(1))
                        : 0;
                    const costPct =
                      plan.estimatedCost > 0
                        ? Number(((plan.spentBudget / plan.estimatedCost) * 100).toFixed(1))
                        : 0;

                    return (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium text-xs max-w-[160px] truncate sticky left-0 bg-background">
                          {plan.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className={TECH_BG_CLASSES[plan.sourceTech]}>
                              {plan.sourceTech}
                            </Badge>
                            <span className="text-muted-foreground text-xs">→</span>
                            <Badge variant="outline" className={TECH_BG_CLASSES[plan.targetTech]}>
                              {plan.targetTech}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{plan.region}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${progressColor(planProgress)}`}
                                style={{ width: `${Math.min(planProgress, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${progressTextColor(planProgress)}`}>
                              {formatNumber(planProgress, 1)}%
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground text-right">
                            {plan.sitesCompleted}/{plan.siteCount}
                          </p>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <div>{formatCurrency(plan.spentBudget)} / {formatCurrency(plan.estimatedCost)}</div>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <span className={costPct > 100 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                            {formatNumber(costPct, 1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={RISK_BG_CLASSES[plan.riskLevel]}>
                            {plan.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(plan.startDate)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(plan.targetDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[plan.status]} className={STATUS_BG_CLASSES[plan.status]}>
                            {plan.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                          {plan.notes || '—'}
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