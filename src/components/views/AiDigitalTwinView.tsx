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
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Box, DollarSign, Zap, Target, Frown, CheckCircle2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatNumber } from '@/lib/constants';

// ─── API Response Types ────────────────────────────────────────────────

type Category =
  | 'capacity_expansion'
  | 'coverage_improvement'
  | 'parameter_change'
  | 'new_site'
  | 'technology_upgrade';

type Status = 'draft' | 'running' | 'completed' | 'failed';

interface BaselineKpis {
  rsrp: number;
  sinr: number;
  throughputDl: number;
  throughputUl: number;
  availability: number;
  dropRate: number;
  prbUtilization: number;
  activeUsers: number;
}

interface Scenario {
  id: string;
  scenarioName: string;
  region: string;
  technology: string;
  category: Category;
  baselineKpis: BaselineKpis;
  simulatedKpis: BaselineKpis;
  impactScore: number;
  riskLevel: string;
  confidence: number;
  estimatedCapex: number;
  estimatedOpexChange: number;
  paybackMonths: number;
  roiPercentage: number;
  modelVersion: string;
  simulationEngine: string;
  status: Status;
  recommendation: string;
}

interface RoiComparisonEntry {
  category: Category;
  avgRoiPercentage: number;
  totalCapex: number;
  avgPaybackMonths: number;
  scenarioCount: number;
}

interface KpiImprovementRow {
  category: Category;
  rsrp: number;
  sinr: number;
  throughputDl: number;
  throughputUl: number;
  availability: number;
  dropRate: number;
  prbUtilization: number;
}

interface TwinSummary {
  totalScenarios: number;
  completedScenarios: number;
  avgImpactScore: number;
  avgConfidence: number;
  totalEstimatedCapex: number;
  avgRoiPercentage: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}

interface DigitalTwinResponse {
  summary: TwinSummary;
  scenarios: Scenario[];
  roiComparison: RoiComparisonEntry[];
  kpiImprovementMatrix: KpiImprovementRow[];
}

// ─── Constants ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<Category, string> = {
  capacity_expansion: 'Capacity Expansion',
  coverage_improvement: 'Coverage Improvement',
  parameter_change: 'Parameter Change',
  new_site: 'New Site',
  technology_upgrade: 'Technology Upgrade',
};

const CATEGORY_COLORS: Record<string, string> = {
  capacity_expansion: '#06B6D4',
  coverage_improvement: '#10B981',
  parameter_change: '#F59E0B',
  new_site: '#8B5CF6',
  technology_upgrade: '#F43F5E',
};

const CATEGORY_BG_MAP: Record<Category, string> = {
  capacity_expansion: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  coverage_improvement: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  parameter_change: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  new_site: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
  technology_upgrade: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
};

const STATUS_BG_MAP: Record<Status, string> = {
  draft: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  running: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
};

const STATUS_VARIANT_MAP: Record<Status, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  running: 'secondary',
  completed: 'default',
  failed: 'destructive',
};

const TECH_BG_CLASSES_DT: Record<string, string> = {
  LTE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  '5G NR': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  UMTS: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  GSM: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

const RISK_BG_MAP: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  high: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
};

const KPI_KEYS = ['rsrp', 'sinr', 'throughputDl', 'throughputUl', 'availability', 'dropRate', 'prbUtilization'] as const;

const KPI_LABELS: Record<string, string> = {
  rsrp: 'RSRP',
  sinr: 'SINR',
  throughputDl: 'Throughput DL',
  throughputUl: 'Throughput UL',
  availability: 'Availability',
  dropRate: 'Drop Rate',
  prbUtilization: 'PRB Util.',
};

const KPI_UNITS: Record<string, string> = {
  rsrp: 'dBm',
  sinr: 'dB',
  throughputDl: 'Mbps',
  throughputUl: 'Mbps',
  availability: '%',
  dropRate: '%',
  prbUtilization: '%',
};

// ─── Helper Functions ──────────────────────────────────────────────────

function formatDZD(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B DZD`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M DZD`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K DZD`;
  return `${formatNumber(value, 0)} DZD`;
}

function formatDZDShort(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatNumber(value, 0);
}

function impactColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}

function roiColor(roi: number): string {
  if (roi >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (roi >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function heatmapColor(value: number): string {
  if (Math.abs(value) >= 10) return 'bg-emerald-500/30 text-emerald-800 dark:text-emerald-200';
  if (Math.abs(value) >= 3) return 'bg-amber-500/25 text-amber-800 dark:text-amber-200';
  return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
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

function TableSkeleton({ rows = 5, _cols = 5 }: { rows?: number; _cols?: number }) {
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
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatNumber(entry.value, 1)}</span>
        </div>
      ))}
    </div>
  );
}

function CapexTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatDZD(Number(entry.value))}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function AiDigitalTwinView() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<DigitalTwinResponse>({
    queryKey: ['ai-digital-twin'],
    queryFn: () =>
      fetch('/api/ai/digital-twin').then((r) => {
        if (!r.ok) throw new Error('Digital Twin API error: ' + r.status);
        return r.json();
      }),
    refetchInterval: 30000,
  });

  const scenarios = data?.scenarios ?? [];
  const summary = data?.summary;
  const roiComparison = data?.roiComparison ?? [];
  const kpiImprovementMatrix = data?.kpiImprovementMatrix ?? [];
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? null;

  // Chart data: ROI by Category
  const roiChartData = roiComparison.map((entry) => ({
    category: CATEGORY_LABELS[entry.category] ?? entry.category,
    avgRoiPercentage: entry.avgRoiPercentage,
    fill: CATEGORY_COLORS[entry.category] ?? '#94A3B8',
  }));

  // Chart data: CAPEX by Category
  const capexChartData = roiComparison.map((entry) => ({
    category: CATEGORY_LABELS[entry.category] ?? entry.category,
    totalCapex: entry.totalCapex,
    fill: CATEGORY_COLORS[entry.category] ?? '#94A3B8',
  }));

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
        <TableSkeleton rows={5} cols={7} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Failed to load Digital Twin data</p>
        <p className="text-sm mt-1">Please try again later</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || scenarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Box className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No Digital Twin scenarios found</p>
        <p className="text-sm mt-1">Run simulations to generate scenario data</p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Box className="h-6 w-6 text-violet-500" />
          AI Digital Twin
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Network simulation scenarios with KPI impact analysis and ROI projections
        </p>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Scenarios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Box className="h-4 w-4 text-slate-500" />
              Total Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatNumber(summary?.totalScenarios ?? 0, 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(summary?.completedScenarios ?? 0, 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              of {formatNumber(summary?.totalScenarios ?? 0, 0)} scenarios
            </p>
          </CardContent>
        </Card>

        {/* Avg Impact Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Avg Impact Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatNumber(summary?.avgImpactScore ?? 0, 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Out of 100</p>
          </CardContent>
        </Card>

        {/* Total CAPEX (DZD) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-cyan-500" />
              Total CAPEX (DZD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatDZD(summary?.totalEstimatedCapex ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Estimated investment</p>
          </CardContent>
        </Card>

        {/* Avg ROI % */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-rose-500" />
              Avg ROI %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold ${roiColor(summary?.avgRoiPercentage ?? 0)}`}>
              {formatNumber(summary?.avgRoiPercentage ?? 0, 0)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">Average return on investment</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ROI Comparison by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ROI Comparison by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiChartData} barSize={40}>
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
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgRoiPercentage" name="Avg ROI %" radius={[4, 4, 0, 0]}>
                    {roiChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CAPEX by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CAPEX by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capexChartData} barSize={40}>
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
                    tickFormatter={(v: number) => formatDZDShort(v)}
                  />
                  <Tooltip content={<CapexTooltipContent />} />
                  <Bar dataKey="totalCapex" name="Total CAPEX" radius={[4, 4, 0, 0]}>
                    {capexChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Improvement Matrix (Heatmap) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPI Improvement Matrix</CardTitle>
          <p className="text-xs text-muted-foreground">Average % improvement per KPI by scenario category</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Category</TableHead>
                  {KPI_KEYS.map((kpi) => (
                    <TableHead key={kpi} className="text-center font-medium">{KPI_LABELS[kpi]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiImprovementMatrix.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="font-medium text-xs">
                      <Badge variant="outline" className={CATEGORY_BG_MAP[row.category] ?? ''}>
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </Badge>
                    </TableCell>
                    {KPI_KEYS.map((kpi) => {
                      const value = row[kpi] ?? 0;
                      const isPositive = value > 0;
                      return (
                        <TableCell key={kpi} className={`text-center text-xs font-medium px-2 py-1.5 rounded-sm ${heatmapColor(value)}`}>
                          <span className="flex items-center justify-center gap-0.5">
                            {isPositive ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : value < 0 ? (
                              <ArrowDownRight className="h-3 w-3" />
                            ) : null}
                            {isPositive ? '+' : ''}{formatNumber(value, 1)}%
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Scenarios Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Scenario</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Tech</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Impact Score</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">CAPEX (DZD)</TableHead>
                  <TableHead className="text-right">Payback</TableHead>
                  <TableHead className="text-right">ROI %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((rec) => (
                  <TableRow
                    key={rec.id}
                    className={`cursor-pointer transition-colors ${selectedScenarioId === rec.id ? 'bg-muted/60' : 'hover:bg-muted/30'}`}
                    onClick={() => setSelectedScenarioId(selectedScenarioId === rec.id ? null : rec.id)}
                  >
                    <TableCell className="font-medium text-xs max-w-[200px] truncate sticky left-0 bg-background">
                      {rec.scenarioName}
                    </TableCell>
                    <TableCell className="text-xs">{rec.region}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={TECH_BG_CLASSES_DT[rec.technology] ?? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'}
                      >
                        {rec.technology}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CATEGORY_BG_MAP[rec.category] ?? ''}>
                        {CATEGORY_LABELS[rec.category] ?? rec.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${rec.impactScore}%`,
                              backgroundColor: impactColor(rec.impactScore),
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium">{rec.impactScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={RISK_BG_MAP[rec.riskLevel] ?? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'}
                      >
                        {rec.riskLevel.charAt(0).toUpperCase() + rec.riskLevel.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {formatDZD(rec.estimatedCapex)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {formatNumber(rec.paybackMonths, 0)}mo
                    </TableCell>
                    <TableCell className={`text-right text-xs font-medium ${roiColor(rec.roiPercentage)}`}>
                      {formatNumber(rec.roiPercentage, 0)}%
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANT_MAP[rec.status] ?? 'outline'}
                        className={STATUS_BG_MAP[rec.status] ?? ''}
                      >
                        {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Detail Card */}
      {selectedScenario && (
        <Card className="border-violet-500/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Scenario Details</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{selectedScenario.scenarioName}</p>
            </div>
            <Badge variant="outline" className={CATEGORY_BG_MAP[selectedScenario.category] ?? ''}>
              {CATEGORY_LABELS[selectedScenario.category] ?? selectedScenario.category}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Baseline KPIs */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Box className="h-4 w-4" />
                  Baseline KPIs
                </h4>
                <div className="space-y-2">
                  {KPI_KEYS.map((kpi) => {
                    const baselineVal = selectedScenario.baselineKpis[kpi] as number;
                    const simVal = selectedScenario.simulatedKpis[kpi] as number;
                    const change = baselineVal !== 0 ? ((simVal - baselineVal) / Math.abs(baselineVal)) * 100 : 0;
                    // For dropRate and prbUtilization, improvement is negative (decrease is good)
                    const isImprovement = (kpi === 'dropRate' || kpi === 'prbUtilization') ? change < 0 : change > 0;
                    return (
                      <div key={kpi} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-xs font-medium text-muted-foreground">{KPI_LABELS[kpi]}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{formatNumber(baselineVal, 1)} {KPI_UNITS[kpi]}</span>
                          <span className={`text-xs flex items-center gap-0.5 ${isImprovement ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {change > 0 ? <ArrowUpRight className="h-3 w-3" /> : change < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                            {change > 0 ? '+' : ''}{formatNumber(change, 1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Simulated KPIs */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Zap className="h-4 w-4" />
                  Simulated KPIs
                </h4>
                <div className="space-y-2">
                  {KPI_KEYS.map((kpi) => {
                    const baselineVal = selectedScenario.baselineKpis[kpi] as number;
                    const simVal = selectedScenario.simulatedKpis[kpi] as number;
                    const change = baselineVal !== 0 ? ((simVal - baselineVal) / Math.abs(baselineVal)) * 100 : 0;
                    const isImprovement = (kpi === 'dropRate' || kpi === 'prbUtilization') ? change < 0 : change > 0;
                    return (
                      <div key={kpi} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-xs font-medium text-muted-foreground">{KPI_LABELS[kpi]}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{formatNumber(simVal, 1)} {KPI_UNITS[kpi]}</span>
                          <span className={`text-xs flex items-center gap-0.5 ${isImprovement ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {change > 0 ? <ArrowUpRight className="h-3 w-3" /> : change < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                            {change > 0 ? '+' : ''}{formatNumber(change, 1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
