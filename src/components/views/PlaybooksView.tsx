'use client';

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
import { BookOpen, Frown, ListOrdered, TrendingUp, BarChart3, Hash } from 'lucide-react';
import { TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import { useT } from '@/lib/i18n';
import type { Technology, AlertSeverity } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface PlaybookStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  action: string;
  target: string;
  expectedOutcome: string;
  isBlocking: boolean;
}

interface PlaybookItem {
  id: string;
  name: string;
  category: string;
  technology: string;
  description: string;
  severity: AlertSeverity;
  estimatedTime: string;
  steps: PlaybookStep[];
  usageCount: number;
  successRate: number;
  tags: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlaybooksSummary {
  total: number;
  byCategory: Record<string, number>;
  avgSteps: number;
  avgSuccessRate: number;
  totalUsage: number;
}

interface PlaybooksResponse {
  playbooks: PlaybookItem[];
  summary: PlaybooksSummary;
}

// ─── Category Colors ──────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  coverage: '#10B981',
  handover: '#F59E0B',
  interference: '#EF4444',
  capacity: '#06B6D4',
  power: '#F97316',
  hardware: '#F43F5E',
};

const CATEGORY_BG_CLASSES: Record<string, string> = {
  coverage: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  handover: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  interference: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  capacity: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  power: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  hardware: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
};

const CATEGORIES = ['coverage', 'handover', 'interference', 'capacity', 'power', 'hardware'];

// ─── Helper Functions ──────────────────────────────────────────────────

function severityBadgeVariant(severity: AlertSeverity): 'destructive' | 'secondary' | 'outline' {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'warning': return 'secondary';
    case 'info': return 'outline';
  }
}

function successRateColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 60) return 'text-amber-600 dark:text-amber-400';
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
            <Skeleton className="h-8 w-16 mb-2" />
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

function TableSkeleton({ rows = 5, cols = 8 }: { rows?: number; cols?: number }) {
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
  const t = useT();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1 capitalize">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{t('view.playbooksColon')}</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Expanded Steps ───────────────────────────────────────────────────

function PlaybookSteps({ steps }: { steps: PlaybookStep[] }) {
  const t = useT();
  return (
    <tr>
      <td colSpan={8} className="p-0">
        <div className="px-6 py-4 bg-muted/30 border-b">
          <div className="ml-4 border-l-2 border-primary/30 pl-4 space-y-3">
            {steps.map((step) => (
              <div key={step.id} className="relative">
                <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-primary/60 border-2 border-background" />
                <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {t('view.step', { n: step.stepNumber })}
                    </span>
                    <span className="font-medium text-sm">{step.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {step.action}
                    </Badge>
                    {step.isBlocking && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {t('view.blocking')}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                <div className="flex flex-col sm:flex-row gap-3 mt-1.5 text-xs">
                  {step.target && (
                    <span>
                      <span className="text-muted-foreground">{t('view.targetColon')} </span>
                      <span className="font-medium">{step.target}</span>
                    </span>
                  )}
                  {step.expectedOutcome && (
                    <span>
                      <span className="text-muted-foreground">{t('view.expectedColon')} </span>
                      <span className="font-medium">{step.expectedOutcome}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function PlaybooksView() {
  const t = useT();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [techFilter, setTechFilter] = useState<string>('4G');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<PlaybooksResponse>({
    queryKey: ['playbooks', categoryFilter, techFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (techFilter !== 'all') params.set('technology', techFilter);
      const qs = params.toString();
      return fetch(`/api/playbooks${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const playbooks = data?.playbooks ?? [];
  const summary = data?.summary;

  const chartData = summary?.byCategory
    ? Object.entries(summary.byCategory).map(([category, count]) => ({
        category,
        count,
        fill: CATEGORY_COLORS[category] ?? '#94A3B8',
      }))
    : [];

  const handleRowClick = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ─── Render: Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-72 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <KpiCardsSkeleton />
        <ChartSkeleton />
        <TableSkeleton rows={6} cols={8} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: 'playbooks' })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || playbooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <BookOpen className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('pb.noData')}</p>
        <p className="text-sm mt-1">
          {categoryFilter !== 'all' || techFilter !== 'all'
            ? t('pb.noMatchFilter')
            : t('pb.noDataYet')}
        </p>
      </div>
    );
  }

  const categoryCount = summary?.byCategory
    ? Object.keys(summary.byCategory).length
    : 0;

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-emerald-500" />
          {t('pb.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('pb.subtitle')}
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Playbooks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-500" />
              {t('pb.totalPlaybooks')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary?.total ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('pb.activeWorkflows')}</p>
          </CardContent>
        </Card>

        {/* Avg Success Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              {t('pb.avgSuccessRate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${successRateColor(summary?.avgSuccessRate ?? 0)}`}>
              {formatNumber(summary?.avgSuccessRate ?? 0, 1)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('pb.acrossAllPlaybooks')}</p>
          </CardContent>
        </Card>

        {/* Total Executions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-500" />
              {t('pb.totalExecutions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {(summary?.totalUsage ?? 0).toLocaleString()}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('view.allTimeRuns')}</p>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Hash className="h-4 w-4 text-rose-500" />
              {t('pb.categories')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">
              {categoryCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('view.distinctCategories')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Playbooks by Category Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('pb.byCategory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="category"
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
                <Bar dataKey="count" name={t('pb.allPlaybooks')} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Playbooks Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-emerald-500" />
            {t('pb.allPlaybooks')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">{t('pb.name')}</TableHead>
                  <TableHead>{t('filter.category')}</TableHead>
                  <TableHead>{t('filter.tech')}</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="text-right">{t('pb.steps')}</TableHead>
                  <TableHead className="text-right">{t('pb.avgSuccessRate')}</TableHead>
                  <TableHead className="text-right">{t('pb.usage')}</TableHead>
                  <TableHead>{t('pb.tags')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playbooks.map((pb) => (
                  <tbody key={pb.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => handleRowClick(pb.id)}
                    >
                      <TableCell className="font-medium text-sm max-w-[220px] truncate">
                        {pb.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={CATEGORY_BG_CLASSES[pb.category] ?? 'bg-muted border-border'}
                        >
                          {pb.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={TECH_BG_CLASSES[pb.technology as Technology] ?? 'bg-muted border-border'}
                        >
                          {pb.technology}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={severityBadgeVariant(pb.severity)}>
                          {pb.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {pb.steps.length}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${successRateColor(pb.successRate)}`}>
                        {formatNumber(pb.successRate, 1)}%
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {pb.usageCount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {pb.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {pb.tags.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{pb.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === pb.id && <PlaybookSteps steps={pb.steps} />}
                  </tbody>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}