'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Sliders, Zap, Cpu, CheckCircle2, Frown } from 'lucide-react';
import { TECH_BG_CLASSES, formatNumber } from '@/lib/constants';

// ─── API Response Types ────────────────────────────────────────────────

interface OptimizerRun {
  id: string;
  siteName: string;
  region: string;
  technology: string;
  parameterCategory: string;
  algorithm: string;
  impactScore: number;
  risk: string;
  status: string;
  confidence: number;
  applied: boolean;
  createdAt: string;
}

interface KpiSummary {
  totalOptimizations: number;
  avgImpactScore: number;
  totalApplied: number;
  avgConfidence: number;
  topAlgorithm: string;
}

interface ImpactBucket {
  range: string;
  count: number;
}

interface AlgorithmDistribution {
  algorithm: string;
  count: number;
}

interface ImpactMatrixCell {
  rsrp: number;
  sinr: number;
  throughputDl: number;
  dropRate: number;
  prbUtilization: number;
}

interface ParameterOptimizerResponse {
  runs: OptimizerRun[];
  summary: KpiSummary;
  impactDistribution: ImpactBucket[];
  algorithmDistribution: AlgorithmDistribution[];
  impactMatrix: Record<string, ImpactMatrixCell>;
}

// ─── Constants ─────────────────────────────────────────────────────────

const ALGORITHM_COLORS: Record<string, string> = {
  gradient_boost: '#10B981',
  neural_net: '#6366F1',
  reinforcement: '#F59E0B',
  bayesian: '#EF4444',
};

const ALGORITHM_LABELS: Record<string, string> = {
  gradient_boost: 'Gradient Boost',
  neural_net: 'Neural Net',
  reinforcement: 'Reinforcement',
  bayesian: 'Bayesian',
};

const KPI_ROWS = ['rsrp', 'sinr', 'throughputDl', 'dropRate', 'prbUtilization'] as const;

const KPI_LABELS: Record<string, string> = {
  rsrp: 'RSRP (dBm)',
  sinr: 'SINR (dB)',
  throughputDl: 'Throughput DL (Mbps)',
  dropRate: 'Drop Rate (%)',
  prbUtilization: 'PRB Util (%)',
};

const IMPACT_BUCKET_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4'];

const STATUS_BG_MAP: Record<string, string> = {
  applied: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  rolled_back: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

const RISK_COLOR_MAP: Record<string, string> = {
  low: 'text-emerald-600 dark:text-emerald-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
};

// ─── Helper Functions ──────────────────────────────────────────────────

function impactBarColor(score: number): string {
  if (score >= 80) return '#06B6D4';
  if (score >= 60) return '#10B981';
  if (score >= 40) return '#F59E0B';
  if (score >= 20) return '#F97316';
  return '#EF4444';
}

function __heatCellStyle(value: number): string {
  if (value > 0) return 'background-color: rgba(16, 185, 129, 0.15); color: #059669;';
  if (value < 0) return 'background-color: rgba(239, 68, 68, 0.15); color: #DC2626;';
  return 'background-color: rgba(148, 163, 184, 0.08); color: #64748B;';
}

function __heatCellDarkStyle(value: number): string {
  if (value > 0) return 'background-color: rgba(16, 185, 129, 0.2); color: #34D399;';
  if (value < 0) return 'background-color: rgba(239, 68, 68, 0.2); color: #F87171;';
  return 'background-color: rgba(148, 163, 184, 0.12); color: #94A3B8;';
}

function getCellStyle(value: number): React.CSSProperties {
  if (value > 0) return { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669' };
  if (value < 0) return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#DC2626' };
  return { backgroundColor: 'rgba(148, 163, 184, 0.08)', color: '#64748B' };
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
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

function TableSkeleton({ rows = 5, _cols = 8 }: { rows?: number; _cols?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
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

interface ChartTooltipPayloadEntry { color?: string; name?: string; value?: number; }
interface ChartTooltipProps { active?: boolean; payload?: ChartTooltipPayloadEntry[]; label?: string; }

function ChartTooltipContent({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, idx) => (
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

export default function AiParameterOptimizerView() {
  const { data, isLoading, isError } = useQuery<ParameterOptimizerResponse>({
    queryKey: ['ai-parameter-optimizer'],
    queryFn: () =>
      fetch('/api/ai/parameter-optimizer').then((r) => {
        if (!r.ok) throw new Error('Parameter Optimizer API error: ' + r.status);
        return r.json();
      }),
    refetchInterval: 30000,
  });

  const runs = data?.runs ?? [];
  const summary = data?.summary;
  const impactDistribution = data?.impactDistribution ?? [];
  const algorithmDistribution = data?.algorithmDistribution ?? [];
  const impactMatrix = data?.impactMatrix ?? {};

  const parameterCategories = Object.keys(impactMatrix);

  // Pie chart data
  const pieData = algorithmDistribution.map((d) => ({
    name: ALGORITHM_LABELS[d.algorithm] ?? d.algorithm,
    value: d.count,
    fill: ALGORITHM_COLORS[d.algorithm] ?? '#94A3B8',
  }));

  // Bar chart data
  const barData = impactDistribution.map((d) => ({
    range: d.range,
    count: d.count,
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
        <ChartSkeleton />
        <TableSkeleton rows={8} cols={8} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Failed to load AI Parameter Optimizer</p>
        <p className="text-sm mt-1">Please try again later</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Sliders className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No optimization data available</p>
        <p className="text-sm mt-1">Run parameter optimizations to see results here</p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sliders className="h-6 w-6 text-violet-500" />
          AI Parameter Optimizer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          ML-driven network parameter tuning and impact analysis
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Optimizations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sliders className="h-4 w-4 text-slate-500" />
              Total Optimizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatNumber(summary?.totalOptimizations ?? 0, 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">All time runs</p>
          </CardContent>
        </Card>

        {/* Avg Impact Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Avg Impact Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatNumber(summary?.avgImpactScore ?? 0, 1)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Out of 100</p>
          </CardContent>
        </Card>

        {/* Total Applied */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Total Applied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(summary?.totalApplied ?? 0, 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Successfully deployed</p>
          </CardContent>
        </Card>

        {/* Avg Confidence */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-500" />
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatNumber(summary?.avgConfidence ?? 0, 1)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">Model certainty</p>
          </CardContent>
        </Card>

        {/* Top Algorithm */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-500" />
              Top Algorithm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {ALGORITHM_LABELS[summary?.topAlgorithm ?? ''] ?? summary?.topAlgorithm ?? '—'}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Most used</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Impact Score Distribution - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Impact Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="range"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    interval={0}
                    height={50}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="Optimizations" radius={[4, 4, 0, 0]}>
                    {barData.map((_, idx) => (
                      <Cell key={idx} fill={IMPACT_BUCKET_COLORS[idx % IMPACT_BUCKET_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Algorithm - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Optimizations by Algorithm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-medium">({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parameter Impact Matrix - Heatmap Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parameter Impact Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Parameter Category</TableHead>
                  {KPI_ROWS.map((kpi) => (
                    <TableHead key={kpi} className="text-center min-w-[120px]">
                      {KPI_LABELS[kpi]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parameterCategories.map((category) => {
                  const row = impactMatrix[category];
                  return (
                    <TableRow key={category}>
                      <TableCell className="font-medium text-xs capitalize">
                        {category.replace(/_/g, ' ')}
                      </TableCell>
                      {KPI_ROWS.map((kpi) => {
                        const val = row?.[kpi] ?? 0;
                        return (
                          <TableCell key={kpi} className="text-center text-xs font-medium">
                            <span
                              className="inline-block px-2 py-1 rounded min-w-[52px]"
                              style={getCellStyle(val)}
                            >
                              {val > 0 ? '+' : ''}{formatNumber(val, 1)}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Optimization Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Tech</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Algorithm</TableHead>
                  <TableHead>Impact Score</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium text-xs max-w-[120px] truncate">
                      {run.siteName}
                    </TableCell>
                    <TableCell className="text-xs max-w-[100px] truncate">
                      {run.region}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={TECH_BG_CLASSES[run.technology as '2G' | '3G' | '4G' | '5G'] ?? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'}
                      >
                        {run.technology}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      {run.parameterCategory.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {ALGORITHM_LABELS[run.algorithm] ?? run.algorithm}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(run.impactScore, 100)}%`,
                              backgroundColor: impactBarColor(run.impactScore),
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium">
                          {formatNumber(run.impactScore, 0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium capitalize ${RISK_COLOR_MAP[run.risk] ?? ''}`}>
                        {run.risk}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_BG_MAP[run.status] ?? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'}
                      >
                        {run.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {run.applied ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
