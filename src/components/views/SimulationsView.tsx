'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis,
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
import { FlaskConical, Frown, Zap, Target, TrendingUp } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber, TECHNOLOGIES } from '@/lib/constants';
import { useT } from '@/lib/i18n';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface SimulationItem {
  id: string;
  name: string;
  description: string;
  technology: string;
  region: string;
  siteId: string;
  siteName: string;
  category: string;
  parameters: Record<string, any>;
  baselineKpis: Record<string, any>;
  simulatedKpis: Record<string, any>;
  impactScore: number;
  recommendation: string;
  confidence: number;
  status: string;
  createdAt: string;
}

interface SimulationsSummary {
  total: number;
  avgImpact: number;
  avgConfidence: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  byTech: Record<string, number>;
}

interface SimulationsResponse {
  simulations: SimulationItem[];
  summary: SimulationsSummary;
}

// ─── Category Colors ───────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  capacity: '#10B981',
  coverage: '#06B6D4',
  interference: '#EF4444',
  migration: '#F59E0B',
  energy: '#F97316',
};

const CATEGORY_BG_CLASSES: Record<string, string> = {
  capacity: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  coverage: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  interference: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  migration: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  energy: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
};

const STATUS_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  running: 'secondary',
  failed: 'destructive',
  pending: 'outline',
  queued: 'outline',
};

const CATEGORIES = ['capacity', 'coverage', 'interference', 'migration', 'energy'] as const;
const STATUSES = ['all', 'completed', 'running', 'failed', 'pending', 'queued'] as const;

// ─── Helper Functions ──────────────────────────────────────────────────

function impactColor(score: number): string {
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function impactBarColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function confidenceColor(c: number): string {
  if (c >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (c >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function confidenceBarColor(c: number): string {
  if (c >= 80) return 'bg-emerald-500';
  if (c >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatKpiChange(baseline: Record<string, any>, simulated: Record<string, any>): string {
  if (!baseline || !simulated) return '—';
  const keys = Object.keys(baseline);
  if (keys.length === 0) return '—';
  const firstKey = keys[0];
  const bVal = baseline[firstKey];
  const sVal = simulated[firstKey];
  if (bVal == null || sVal == null) return '—';
  const label = firstKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  return `${label} ${bVal} → ${sVal}`;
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

export default function SimulationsView() {
  const t = useT();
  const [techFilter, setTechFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<SimulationsResponse>({
    queryKey: ['simulations', techFilter, categoryFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      return fetch(`/api/simulations${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const simulations = data?.simulations ?? [];
  const summary = data?.summary;

  const highImpactCount = simulations.filter((s) => s.impactScore >= 70).length;

  // Category distribution chart data
  const categoryData = summary?.byCategory
    ? Object.entries(summary.byCategory).map(([cat, count]) => ({
        category: cat.charAt(0).toUpperCase() + cat.slice(1),
        count,
        fill: CATEGORY_COLORS[cat] ?? '#94A3B8',
      }))
    : [];

  // Impact vs Confidence per category (scatter or grouped bar)
  const impactByCategory = (() => {
    if (!simulations.length) return [];
    const map = new Map<string, { totalImpact: number; totalConf: number; count: number }>();
    simulations.forEach((s) => {
      const existing = map.get(s.category) ?? { totalImpact: 0, totalConf: 0, count: 0 };
      existing.totalImpact += s.impactScore;
      existing.totalConf += s.confidence;
      existing.count += 1;
      map.set(s.category, existing);
    });
    return Array.from(map.entries()).map(([cat, vals]) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      avgImpact: Number((vals.totalImpact / vals.count).toFixed(1)),
      avgConfidence: Number((vals.totalConf / vals.count).toFixed(1)),
      fill: CATEGORY_COLORS[cat] ?? '#94A3B8',
    }));
  })();

  // Scatter data for Impact vs Confidence
  const scatterData = simulations.map((s) => ({
    name: s.name,
    category: s.category,
    impact: s.impactScore,
    confidence: s.confidence,
    fill: CATEGORY_COLORS[s.category] ?? '#94A3B8',
  }));

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
        <TableSkeleton rows={6} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: 'simulation' })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || simulations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <FlaskConical className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('sim.noData')}</p>
        <p className="text-sm mt-1">
          {t('view.noSimRun')}
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
          <FlaskConical className="h-6 w-6 text-emerald-500" />
          {t('sim.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('sim.subtitle')}
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scenarios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-cyan-500" />
              {t('sim.totalScenarios')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {summary?.total ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('view.acrossAllCategories')}</p>
          </CardContent>
        </Card>

        {/* Avg Impact Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              {t('sim.avgImpact')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${impactColor(summary?.avgImpact ?? 0)}`}>
              {formatNumber(summary?.avgImpact ?? 0)}
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${impactBarColor(summary?.avgImpact ?? 0)}`}
                style={{ width: `${Math.min(summary?.avgImpact ?? 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('view.scale0100')}</p>
          </CardContent>
        </Card>

        {/* Avg Confidence */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              {t('sim.avgConfidence')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${confidenceColor(summary?.avgConfidence ?? 0)}`}>
              {formatNumber(summary?.avgConfidence ?? 0, 1)}%
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${confidenceBarColor(summary?.avgConfidence ?? 0)}`}
                style={{ width: `${Math.min(summary?.avgConfidence ?? 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('view.simulationReliability')}</p>
          </CardContent>
        </Card>

        {/* High Impact Scenarios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-500" />
              {t('sim.highImpact')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {highImpactCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {t('view.highImpactGte70')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('sim.catDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="category"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name={t('sim.scenarios')} radius={[4, 4, 0, 0]}>
                    {categoryData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Impact vs Confidence Scatter Plot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('sim.impactConf')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    dataKey="impact"
                    name="Impact"
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: t('sim.avgImpact'), position: 'insideBottom', offset: -2, style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <YAxis
                    type="number"
                    dataKey="confidence"
                    name="Confidence"
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: t('sim.avgConfidence'), angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <ZAxis range={[60, 180]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
                          <p className="font-medium mb-1">{d.name}</p>
                          <p className="text-muted-foreground">Category: {d.category}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-muted-foreground">Impact:</span>
                            <span className="font-medium">{d.impact}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Confidence:</span>
                            <span className="font-medium">{d.confidence}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterData} name="Simulations">
                    {scatterData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simulations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">{t('sim.results')}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder={t('filter.technology')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTechShort')}</SelectItem>
                {TECHNOLOGIES.map((tech) => (
                  <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('filter.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allCategories')}</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
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
          </div>
        </CardHeader>
        <CardContent>
          {simulations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('sim.noMatchFilter')}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">{t('pb.name')}</TableHead>
                    <TableHead>{t('filter.category')}</TableHead>
                    <TableHead>{t('filter.tech')}</TableHead>
                    <TableHead>{t('sim.site')}</TableHead>
                    <TableHead>{t('sim.region')}</TableHead>
                    <TableHead className="text-right">{t('sim.avgImpact')}</TableHead>
                    <TableHead className="text-right">{t('sim.avgConfidence')}</TableHead>
                    <TableHead>{t('filter.status')}</TableHead>
                    <TableHead>{t('sim.kpiChange')}</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulations.map((sim) => (
                    <TableRow key={sim.id}>
                      <TableCell className="font-medium text-xs max-w-[180px] truncate sticky left-0 bg-background">
                        {sim.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={CATEGORY_BG_CLASSES[sim.category] ?? 'bg-muted text-muted-foreground border-muted'}
                        >
                          {sim.category.charAt(0).toUpperCase() + sim.category.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={TECH_BG_CLASSES[sim.technology as Technology] ?? 'bg-muted text-muted-foreground border-muted'}
                        >
                          {sim.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">
                        {sim.siteName || sim.siteId}
                      </TableCell>
                      <TableCell className="text-xs">{sim.region}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className={`font-medium text-xs ${impactColor(sim.impactScore)}`}>
                            {formatNumber(sim.impactScore)}
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${impactBarColor(sim.impactScore)}`}
                              style={{ width: `${Math.min(sim.impactScore, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-medium text-xs ${confidenceColor(sim.confidence)}`}>
                          {formatNumber(sim.confidence, 1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT_MAP[sim.status] ?? 'outline'}>
                          {sim.status.charAt(0).toUpperCase() + sim.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                        {formatKpiChange(sim.baselineKpis, sim.simulatedKpis)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[160px] truncate text-muted-foreground">
                        {sim.recommendation || '—'}
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