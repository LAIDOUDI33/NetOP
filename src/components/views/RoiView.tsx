'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
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
import { DollarSign, Frown, CheckCircle2 } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import { useT } from '@/lib/i18n';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface RoiRecord {
  id: string;
  title: string;
  category: string;
  technology: Technology;
  siteName: string;
  investmentCost: number;
  annualSaving: number;
  paybackMonths: number;
  roiPercentage: number;
  status: string;
  kpiImpact: string;
  period: string;
  periodValue: number;
  cumulativeSaving: number;
  notes: string;
  createdAt: string;
}

interface RoiSummary {
  total: number;
  totalInvestment: number;
  totalAnnualSaving: number;
  totalCumulativeSaving: number;
  avgRoi: number;
  avgPayback: number;
  byCategory: Record<string, { count: number; totalSaving: number; avgRoi: number }>;
  byStatus: Record<string, number>;
}

interface RoiResponse {
  records: RoiRecord[];
  summary: RoiSummary;
}

// ─── Constants ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  energy_saving: '#10B981',
  capacity_deferred: '#06B6D4',
  churn_reduction: '#F59E0B',
  sla_improvement: '#F43F5E',
  outage_reduction: '#F97316',
};

const CATEGORY_LABELS: Record<string, string> = {
  energy_saving: 'Energy Saving',
  capacity_deferred: 'Capacity Deferred',
  churn_reduction: 'Churn Reduction',
  sla_improvement: 'SLA Improvement',
  outage_reduction: 'Outage Reduction',
};

const CATEGORIES = ['all', 'energy_saving', 'capacity_deferred', 'churn_reduction', 'sla_improvement', 'outage_reduction'];
const STATUSES = ['all', 'realized', 'projected', 'cancelled'];

const STATUS_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  realized: 'default',
  projected: 'secondary',
  cancelled: 'destructive',
};

const STATUS_BG_MAP: Record<string, string> = {
  realized: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  projected: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
};

// ─── Helper Functions ──────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${((value ?? 0) / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${((value ?? 0) / 1_000).toFixed(1)}K`;
  return `$${formatNumber(value, 0)}`;
}

function roiColor(roi: number): string {
  if (roi >= 50) return 'text-emerald-600 dark:text-emerald-400';
  if (roi >= 20) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function roiBarColor(roi: number): string {
  if (roi >= 50) return '#10B981';
  if (roi >= 20) return '#F59E0B';
  return '#EF4444';
}

function paybackColor(months: number): string {
  if (months <= 12) return 'text-emerald-600 dark:text-emerald-400';
  if (months <= 24) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function categoryBadgeClass(category: string): string {
  const color = CATEGORY_COLORS[category] ?? '#94A3B8';
  const map: Record<string, string> = {
    energy_saving: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    capacity_deferred: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    churn_reduction: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    sla_improvement: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    outage_reduction: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  };
  return map[category] ?? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
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
          <span className="font-medium">{typeof entry.value === 'number' && entry.value >= 1000 ? formatCurrency(entry.value) : formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function RoiView() {
  const t = useT();
  const catLabel: Record<string, string> = {
    energy_saving: t('roi.energySaving'),
    capacity_deferred: t('roi.capacityDeferred'),
    churn_reduction: t('roi.churnReduction'),
    sla_improvement: t('roi.slaImprovement'),
    outage_reduction: t('roi.outageReduction'),
  };
  const [techFilter, setTechFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<RoiResponse>({
    queryKey: ['roi', techFilter, categoryFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      return fetch(`/api/roi${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const records = data?.records ?? [];
  const summary = data?.summary;

  // Chart data: Savings by Category
  const savingsByCategoryData = summary?.byCategory
    ? Object.entries(summary.byCategory).map(([cat, info]) => ({
        category: catLabel[cat] ?? cat,
        saving: info.totalSaving,
        fill: CATEGORY_COLORS[cat] ?? '#94A3B8',
      }))
    : [];

  // Chart data: ROI by Category (sorted desc)
  const roiByCategoryData = summary?.byCategory
    ? Object.entries(summary.byCategory)
        .map(([cat, info]) => ({
          category: catLabel[cat] ?? cat,
          roi: info.avgRoi,
          fill: CATEGORY_COLORS[cat] ?? '#94A3B8',
        }))
        .sort((a, b) => b.roi - a.roi)
    : [];

  const realizedCount = summary?.byStatus?.realized ?? 0;

  // ─── Render: Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton rows={8} cols={10} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: 'ROI' })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <DollarSign className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('roi.noData')}</p>
        <p className="text-sm mt-1">
          {t('roi.noDataYet')}
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
          <DollarSign className="h-6 w-6 text-emerald-500" />
          {t('roi.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('roi.subtitle')}
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Investment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-500" />
              {t('roi.totalInvestment')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatCurrency(summary?.totalInvestment ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Across all projects</p>
          </CardContent>
        </Card>

        {/* Annual Savings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              {t('roi.annualSaving')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary?.totalAnnualSaving ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Per year</p>
          </CardContent>
        </Card>

        {/* Cumulative Savings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-cyan-500" />
              {t('roi.cumulativeSaving')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatCurrency(summary?.totalCumulativeSaving ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        {/* Avg ROI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              {t('roi.avgRoi')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold ${roiColor(summary?.avgRoi ?? 0)}`}>
              {formatNumber(summary?.avgRoi ?? 0, 0)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">Average return</p>
          </CardContent>
        </Card>

        {/* Avg Payback */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-rose-500" />
              {t('roi.avgPayback')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold ${paybackColor(summary?.avgPayback ?? 0)}`}>
              {formatNumber(summary?.avgPayback ?? 0, 0)}mo
            </span>
            <p className="text-xs text-muted-foreground mt-1">Break-even period</p>
          </CardContent>
        </Card>

        {/* Realized Projects */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Realized Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {realizedCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Completed actions</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Savings by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('roi.byCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={savingsByCategoryData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="category"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => formatCurrency(v)}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="saving" name={t('roi.saving')} radius={[4, 4, 0, 0]}>
                    {savingsByCategoryData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ROI by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('roi.roiByCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiByCategoryData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="category"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [`${formatNumber(value, 0)}%`, 'Avg ROI']}
                  />
                  <ReferenceLine y={100} stroke="#EF4444" strokeDasharray="6 4" label={{ value: '100%', position: 'right', fill: '#EF4444', fontSize: 11 }} />
                  <Bar dataKey="roi" name={t('roi.roiPct')} radius={[4, 4, 0, 0]}>
                    {roiByCategoryData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">{t('roi.records')}</CardTitle>
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('filter.category')} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? t('filter.allCategories') : (catLabel[cat] ?? cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('filter.status')} />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'all' ? t('filter.allStatus') : (s.charAt(0).toUpperCase() + s.slice(1))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton data={records as unknown as Record<string, any>[]} filenamePrefix="roi" columns={[{ key: 'initiative', header: 'Initiative' }, { key: 'technology', header: 'Technology' }, { key: 'category', header: 'Category' }, { key: 'status', header: 'Status' }, { key: 'investment', header: 'Investment ($)' }, { key: 'projectedReturn', header: 'Projected Return ($)' }, { key: 'roiPercentage', header: 'ROI (%)' }, { key: 'paybackMonths', header: 'Payback (months)' }]} />
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('roi.noRecordsMatch')}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Title</TableHead>
                    <TableHead>{t('filter.category')}</TableHead>
                    <TableHead>{t('filter.tech')}</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead className="text-right">{t('roi.investment')}</TableHead>
                    <TableHead className="text-right">{t('roi.saving')}</TableHead>
                    <TableHead className="text-right">{t('roi.paybackMonths')}</TableHead>
                    <TableHead className="text-right">{t('roi.roiPct')}</TableHead>
                    <TableHead>{t('filter.status')}</TableHead>
                    <TableHead className="text-right">Cumulative</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium text-xs max-w-[180px] truncate sticky left-0 bg-background">
                        {rec.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={categoryBadgeClass(rec.category)}
                        >
                          {catLabel[rec.category] ?? rec.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={TECH_BG_CLASSES[rec.technology]}
                        >
                          {rec.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{rec.siteName}</TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatCurrency(rec.investmentCost)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(rec.annualSaving)}
                      </TableCell>
                      <TableCell className={`text-right text-xs font-medium ${paybackColor(rec.paybackMonths)}`}>
                        {formatNumber(rec.paybackMonths, 0)}mo
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(rec.roiPercentage / 2, 100)}%`,
                                backgroundColor: roiBarColor(rec.roiPercentage),
                              }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${roiColor(rec.roiPercentage)}`}>
                            {formatNumber(rec.roiPercentage, 0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_VARIANT_MAP[rec.status] ?? 'outline'}
                          className={STATUS_BG_MAP[rec.status] ?? ''}
                        >
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatCurrency(rec.cumulativeSaving)}
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