'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Users, AlertTriangle, DollarSign, Target, Shield, Frown, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '@/lib/constants';
import { useT } from '@/lib/i18n';

// ─── API Response Types ────────────────────────────────────────────────

interface RegionPrediction {
  region: string;
  subscriberCount: number;
  atRiskCount: number;
  avgChurnProbability: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  primaryRiskFactor: string;
  riskFactors: { factor: string; impact: number; affectedSubscribers: number }[];
  monthlyRevenueAtRisk: number;
  annualRevenueAtRisk: number;
  avgArpuAtRisk: number;
  networkKpis: { avgRsrp: number; avgThroughput: number; avgDropRate: number; avgAvailability: number };
  modelVersion: string;
  modelAccuracy: number;
  confidence: number;
  recommendedActions: string[];
  retentionPotential: number;
  churnTrend: string;
}

interface RiskFactor {
  factor: string;
  affectedSubscribers: number;
  churnContribution: number;
  avgChurnProbability: number;
  revenueImpact: number;
  trend: string;
  recommendedActions: string[];
}

interface SegmentData {
  segment: string;
  totalSubscribers: number;
  atRiskCount: number;
  avgChurnProbability: number;
  avgArpu: number;
  monthlyRevenueAtRisk: number;
  annualRevenueAtRisk: number;
  churnRate30d: number;
  topRiskFactor: string;
  retentionRate: number;
}

interface TrendPoint {
  month: string;
  totalSubscribers: number;
  atRiskCount: number;
  avgChurnProbability: number;
  actualChurned: number;
  savedByRetention: number;
  revenueAtRisk: number;
  revenueSaved: number;
  modelAccuracy: number;
}

interface RetentionAction {
  action: string;
  impact: string;
  estimatedSavings: number;
  affectedSubscribers: number;
  priority: number;
}

interface ChurnSummary {
  totalSubscribers: number;
  atRiskCount: number;
  avgChurnProbability: number;
  revenueAtRisk: number;
  modelAccuracy: number;
  modelVersion: string;
  lastTrainingDate: string;
  dataPointsUsed: number;
  featureCount: number;
  predictionHorizon: string;
}

interface ChurnPredictorResponse {
  summary: ChurnSummary;
  predictionsByRegion: RegionPrediction[];
  topRiskFactors: RiskFactor[];
  churnBySegment: SegmentData[];
  trendData: TrendPoint[];
  recommendedRetentionActions: RetentionAction[];
}

// ─── Constants ─────────────────────────────────────────────────────────

const PIE_COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981'];

const PRIORITY_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  High: 'destructive',
  Medium: 'secondary',
  Low: 'outline',
};

const PRIORITY_BG: Record<string, string> = {
  High: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  Medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  Low: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

// ─── Helper Functions ──────────────────────────────────────────────────

function formatDZD(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B DZD`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M DZD`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K DZD`;
  return `${formatNumber(value, 0)} DZD`;
}

function formatShortDZD(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${formatNumber(value, 0)}`;
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatNumber(value, 0);
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

function TableSkeleton({ rows = 5, cols: _cols = 5 }: { rows?: number; cols?: number }) {
  void _cols;
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

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number | string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function DzdTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number | string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatDZD(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function AiChurnPredictorView() {
  const _t = useT();
  void _t;

  const { data, isLoading, isError } = useQuery<ChurnPredictorResponse>({
    queryKey: ['ai-churn-predictor'],
    queryFn: () =>
      fetch('/api/ai/churn-predictor').then((r) => {
        if (!r.ok) throw new Error('Churn Predictor API error: ' + r.status);
        return r.json();
      }),
    refetchInterval: 30000,
  });

  const summary = data?.summary;
  const predictionsByRegion = data?.predictionsByRegion ?? [];
  const topRiskFactors = data?.topRiskFactors ?? [];
  const churnBySegment = data?.churnBySegment ?? [];
  const trendData = data?.trendData ?? [];
  const recommendedActions = data?.recommendedRetentionActions ?? [];

  // Computed: retention potential average from regions
  const avgRetentionPotential = predictionsByRegion.length > 0
    ? predictionsByRegion.reduce((s, r) => s + r.retentionPotential, 0) / predictionsByRegion.length
    : 0;

  // Chart data: Churn Risk by Region (3 bars: high/medium/low)
  const regionRiskData = predictionsByRegion.map((r) => ({
    region: r.region,
    'High Risk': r.highRiskCount,
    'Medium Risk': r.mediumRiskCount,
    'Low Risk': r.lowRiskCount,
  }));

  // Chart data: Revenue at Risk by Region (sorted desc)
  const revenueRiskData = [...predictionsByRegion]
    .sort((a, b) => b.annualRevenueAtRisk - a.annualRevenueAtRisk)
    .map((r) => ({
      region: r.region,
      revenueAtRisk: r.annualRevenueAtRisk,
    }));

  // Chart data: Risk Factors horizontal bars
  const riskFactorData = topRiskFactors.map((f) => ({
    factor: f.factor,
    churnContribution: +(f.churnContribution * 100).toFixed(1),
  }));

  // Chart data: PieChart segments
  const segmentPieData = churnBySegment.map((s) => ({
    name: s.segment,
    value: s.atRiskCount,
  }));

  // Chart data: 12-month trend
  const trendChartData = trendData.map((t) => ({
    month: t.month.slice(5), // "2024-01" → "01"
    churnRate: +((t.actualChurned / t.totalSubscribers) * 100).toFixed(2),
    savedRate: +((t.savedByRetention / t.totalSubscribers) * 100).toFixed(2),
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
        <ChartSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton rows={7} cols={4} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Failed to load AI Churn Predictor</p>
        <p className="text-sm mt-1">Please try again later.</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Brain className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No churn prediction data available</p>
        <p className="text-sm mt-1">Data will appear once the model generates predictions.</p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-violet-500" />
          AI Churn Predictor
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Machine-learning churn prediction across all regions — {summary?.modelVersion} — trained on {formatCount(summary?.dataPointsUsed ?? 0)} data points
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Subscribers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatCount(summary?.totalSubscribers ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Across all regions</p>
          </CardContent>
        </Card>

        {/* At-Risk Subscribers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              At-Risk Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCount(summary?.atRiskCount ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.totalSubscribers
                ? formatNumber(((summary.atRiskCount / summary.totalSubscribers) * 100), 1)
                : '—'}% of base
            </p>
          </CardContent>
        </Card>

        {/* Avg Churn Probability */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Avg Churn Probability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatNumber((summary?.avgChurnProbability ?? 0) * 100, 1)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">30-day prediction horizon</p>
          </CardContent>
        </Card>

        {/* Monthly Revenue at Risk */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-rose-500" />
              Revenue at Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatDZD(summary?.revenueAtRisk ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Annual estimate</p>
          </CardContent>
        </Card>

        {/* Model Accuracy (F1) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              Model Accuracy (F1)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber((summary?.modelAccuracy ?? 0) * 100, 1)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">{summary?.featureCount ?? 0} features</p>
          </CardContent>
        </Card>

        {/* Retention Potential */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-500" />
              Retention Potential
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              {formatNumber(avgRetentionPotential * 100, 1)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">Recoverable with actions</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Charts Side by Side: Region Risk & Revenue Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Churn Risk by Region */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Churn Risk by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionRiskData} barGap={1} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="region"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => formatCount(v)}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="High Risk" stackId="risk" fill="#EF4444" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Medium Risk" stackId="risk" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Low Risk" stackId="risk" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue at Risk by Region */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue at Risk by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueRiskData} barSize={24} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => formatShortDZD(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="region"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    width={80}
                  />
                  <Tooltip content={<DzdTooltipContent />} />
                  <Bar dataKey="revenueAtRisk" name="Revenue at Risk" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Factors Section: Horizontal Bars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Churn Risk Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {riskFactorData.map((rf, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-56 truncate shrink-0" title={rf.factor}>
                  {rf.factor}
                </span>
                <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${Math.min((rf.churnContribution / Math.max(...riskFactorData.map((r) => r.churnContribution))) * 100, 100)}%`,
                      backgroundColor: rf.churnContribution > 15 ? '#EF4444' : rf.churnContribution > 10 ? '#F59E0B' : '#3B82F6',
                    }}
                  />
                </div>
                <span className="text-xs font-medium w-12 text-right shrink-0">{rf.churnContribution}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Churn by Segment (PieChart) + 12-Month Trend (LineChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Churn by Segment PieChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Churn by Segment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {segmentPieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { name?: string; value?: number; fill?: string } }> }) => {
                      if (!active || !payload?.length) return null;
                      const entry = payload[0];
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
                          <p className="font-medium">{entry.name}</p>
                          <p className="text-muted-foreground">At-risk: {formatCount(entry.value)}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Segment Legend */}
            <div className="flex flex-wrap gap-4 mt-2 justify-center">
              {churnBySegment.map((seg, idx) => (
                <div key={seg.segment} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{seg.segment}:</span>
                  <span className="font-medium">{formatCount(seg.atRiskCount)}</span>
                  <span className="text-muted-foreground">({formatNumber(seg.avgChurnProbability * 100, 1)}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 12-Month Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">12-Month Churn Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number | string }>; label?: string }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
                          <p className="font-medium mb-1">Month {label}</p>
                          {payload.map((entry, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                              <span className="text-muted-foreground">{entry.name}:</span>
                              <span className="font-medium">{formatNumber(entry.value)}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="churnRate"
                    name="Churn Rate"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="savedRate"
                    name="Saved Rate"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Actions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Recommended Retention Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Priority</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-24">Impact</TableHead>
                  <TableHead className="w-28 text-right">Est. Savings</TableHead>
                  <TableHead className="w-28 text-right">Subscribers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendedActions.map((action) => (
                  <TableRow key={action.priority}>
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20">
                        #{action.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[400px]">{action.action}</TableCell>
                    <TableCell>
                      <Badge
                        variant={PRIORITY_VARIANT[action.impact] ?? 'outline'}
                        className={PRIORITY_BG[action.impact] ?? ''}
                      >
                        {action.impact}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {formatDZD(action.estimatedSavings)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatCount(action.affectedSubscribers)}
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
