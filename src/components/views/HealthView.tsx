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
import { Heart, Frown, Radio } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface HealthScoreItem {
  id: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  technology: Technology;
  region: string;
  overallScore: number;
  coverageScore: number;
  capacityScore: number;
  qualityScore: number;
  reliabilityScore: number;
  experienceScore: number;
  grade: string;
  trend: string;
  issues: string[];
  timestamp: string;
  createdAt: string;
}

interface HealthSummary {
  total: number;
  avgOverall: number;
  byGrade: Record<string, number>;
  byRegion: Record<string, number>;
  byTrend: Record<string, number>;
}

interface HealthResponse {
  healthScores: HealthScoreItem[];
  summary: HealthSummary;
}

// ─── Grade & Trend Colors ─────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  'A+': '#059669',
  'A': '#34D399',
  'B': '#F59E0B',
  'C': '#F97316',
  'D': '#EF4444',
  'F': '#B91C1C',
};

const GRADE_BG: Record<string, string> = {
  'A+': 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border-emerald-600/20',
  'A': 'bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/20',
  'B': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  'C': 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  'D': 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  'F': 'bg-red-700/10 text-red-700 dark:text-red-300 border-red-700/20',
};

const GRADE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'A+': 'default',
  'A': 'default',
  'B': 'secondary',
  'C': 'secondary',
  'D': 'destructive',
  'F': 'destructive',
};

const TREND_COLORS: Record<string, string> = {
  improving: '#10B981',
  stable: '#F59E0B',
  degrading: '#EF4444',
};

const TREND_BG: Record<string, string> = {
  improving: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  stable: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  degrading: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
};

function healthScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function healthBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
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

// ─── Pie Label ─────────────────────────────────────────────────────────

const RADIAN = Math.PI / 180;

function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} className="fill-muted-foreground text-xs">
      {name} ({((percent ?? 0) * 100).toFixed(0)}%)
    </text>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export default function HealthView() {
  const t = useT();
  const [techFilter, setTechFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<HealthResponse>({
    queryKey: ['health', techFilter, gradeFilter, regionFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (gradeFilter !== 'all') params.set('grade', gradeFilter);
      if (regionFilter !== 'all') params.set('region', regionFilter);
      const qs = params.toString();
      return fetch(`/api/health${qs ? `?${qs}` : ''}`).then((r) => { if (!r.ok) throw new Error('Health API error: ' + r.status); return r.json(); });
    },
    refetchInterval: 30000,
  });

  const healthScores = data?.healthScores ?? [];
  const summary = data?.summary;

  // Grade distribution chart data
  const gradeOrder = ['A+', 'A', 'B', 'C', 'D', 'F'];
  const gradeChartData = gradeOrder
    .filter((g) => (summary?.byGrade?.[g] ?? 0) > 0)
    .map((g) => ({
      grade: g,
      count: summary?.byGrade?.[g] ?? 0,
      fill: GRADE_COLORS[g],
    }));

  // Trend distribution pie data
  const trendPieData = [
    { name: 'Improving', value: summary?.byTrend?.improving ?? 0, fill: TREND_COLORS.improving },
    { name: 'Stable', value: summary?.byTrend?.stable ?? 0, fill: TREND_COLORS.stable },
    { name: 'Degrading', value: summary?.byTrend?.degrading ?? 0, fill: TREND_COLORS.degrading },
  ].filter((d) => d.value > 0);

  // Region health chart data
  const regionChartData = summary?.byRegion
    ? Object.entries(summary.byRegion).map(([region, avgScore]) => {
        const regionSites = healthScores.filter((s) => s.region === region);
        const overall = regionSites.length > 0
          ? Number((regionSites.reduce((sum, s) => sum + s.overallScore, 0) / regionSites.length).toFixed(2))
          : avgScore as number;
        return { region, score: overall };
      })
    : [];

  // KPI values
  const totalSites = summary?.total ?? 0;
  const avgOverall = summary?.avgOverall ?? 0;
  const aPlusCount = summary?.byGrade?.['A+'] ?? 0;
  const degradingCount = summary?.byTrend?.degrading ?? 0;
  const fCount = summary?.byGrade?.['F'] ?? 0;

  // Unique regions for filter
  const regions = Array.from(new Set(healthScores.map((s) => s.region))).sort();

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
        <ChartSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('empty.noDataFor', { entity: t('helth.title') })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || healthScores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Radio className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('health.noData')}</p>
        <p className="text-sm mt-1">
          Health scores have not been computed yet.
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
          <Heart className="h-6 w-6 text-red-500" />
          {t('exec.networkHealth')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Composite health index across coverage, capacity, quality, reliability, and experience
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Sites */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-500" />
              {t('exec.totalSites')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {totalSites}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Health-scored sites</p>
          </CardContent>
        </Card>

        {/* Avg Health Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              {t('exec.networkHealth')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${healthScoreColor(avgOverall)}`}>
              {formatNumber(avgOverall)}
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${healthBarColor(avgOverall)}`}
                style={{ width: `${Math.min(avgOverall, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Scale: 0 – 100</p>
          </CardContent>
        </Card>

        {/* A+ Grade Sites */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-emerald-500" />
              A+ Grade Sites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {aPlusCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {totalSites > 0 ? `${((aPlusCount / totalSites) * 100).toFixed(1)}%` : '0%'} of total
            </p>
          </CardContent>
        </Card>

        {/* Degrading Sites */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Frown className="h-4 w-4 text-red-500" />
              Degrading Sites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {degradingCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('health.trendingDown')}</p>
          </CardContent>
        </Card>

        {/* F Grade Sites */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Frown className="h-4 w-4 text-red-500" />
              F Grade Sites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {fCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('health.criticalAttention')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Grade Distribution + Trend Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Grade Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('helth.gradeDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            {gradeChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('helth.noGradeData')}</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeChartData} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="grade"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" name="Sites" radius={[4, 4, 0, 0]}>
                      {gradeChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('helth.trendDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            {trendPieData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('helth.noGradeData')}</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trendPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                      nameKey="name"
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {trendPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Region Health Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('helth.regionOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          {regionChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t('helth.noGradeData')}</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionChartData} barSize={36} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="region"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={80}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" name="Avg Overall" radius={[0, 4, 4, 0]}>
                    {regionChartData.map((entry) => {
                      const tech = healthScores.find((s) => s.region === entry.region)?.technology ?? '4G';
                      return <Cell key={entry.region} fill={TECH_COLORS[tech as Technology] ?? '#10B981'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">{t('helth.details')}</CardTitle>
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
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder={t('filter.grade')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allGrades')}</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="F">F</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t('filter.region')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allRegions')}</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton data={healthScores} filenamePrefix="health" columns={[{ key: 'siteName', header: 'Site' }, { key: 'technology', header: 'Technology' }, { key: 'region', header: 'Region' }, { key: 'overallScore', header: 'Overall' }, { key: 'grade', header: 'Grade' }, { key: 'trend', header: 'Trend' }]} />
          </div>
        </CardHeader>
        <CardContent>
          {healthScores.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('helth.noSiteMatch')}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">{t('th.site')}</TableHead>
                    <TableHead>{t('th.tech')}</TableHead>
                    <TableHead>{t('th.region')}</TableHead>
                    <TableHead className="text-right">{t('health.overall')}</TableHead>
                    <TableHead className="text-right">{t('health.coverage')}</TableHead>
                    <TableHead className="text-right">{t('health.capacity')}</TableHead>
                    <TableHead className="text-right">{t('health.quality')}</TableHead>
                    <TableHead className="text-right">{t('health.reliability')}</TableHead>
                    <TableHead className="text-right">{t('health.experience')}</TableHead>
                    <TableHead>{t('th.grade')}</TableHead>
                    <TableHead>{t('th.trend')}</TableHead>
                    <TableHead>{t('health.issues')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthScores.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-xs max-w-[160px] truncate sticky left-0 bg-background">
                        {item.siteName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TECH_BG_CLASSES[item.technology]}>
                          {item.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.region}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${healthBarColor(item.overallScore)}`}
                              style={{ width: `${Math.min(item.overallScore, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${healthScoreColor(item.overallScore)}`}>
                            {formatNumber(item.overallScore)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatNumber(item.coverageScore)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatNumber(item.capacityScore)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatNumber(item.qualityScore)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatNumber(item.reliabilityScore)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatNumber(item.experienceScore)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={GRADE_VARIANT[item.grade] ?? 'outline'} className={GRADE_BG[item.grade] ?? ''}>
                          {item.grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TREND_BG[item.trend] ?? 'bg-muted'}>
                          {item.trend}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {item.issues.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            item.issues.map((issue, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {issue}
                              </Badge>
                            ))
                          )}
                        </div>
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