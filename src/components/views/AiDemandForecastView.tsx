'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  AreaChart, Area,
  PieChart, Pie,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, AlertTriangle, Activity, Clock, Banknote, Frown, Shield,
} from 'lucide-react';
import { formatNumber } from '@/lib/constants';

// ─── API Response Types ────────────────────────────────────────────────

type Metric = 'prbUtilization' | 'activeUsers' | 'throughputDl' | 'throughputUl';
type Technology = '4G-LTE' | '3G-UMTS';
type CapacityRisk = 'low' | 'medium' | 'high' | 'critical';

interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

interface DemandForecast {
  region: string;
  wilayaCode: string;
  metric: Metric;
  technology: Technology;
  currentValue: number;
  peakValue: number;
  avgValue: number;
  forecast7d: number;
  forecast14d: number;
  forecast30d: number;
  forecast90d: number;
  growthRate7d: number;
  growthRate14d: number;
  growthRate30d: number;
  growthRate90d: number;
  capacityLimit: number;
  daysToCapacity: number;
  capacityRisk: CapacityRisk;
  modelVersion: string;
  modelAccuracy: number;
  confidence: number;
  seasonalPattern: string;
  peakHour: string;
  recommendation: string;
  requiredCapex: number;
  forecastPoints: ForecastPoint[];
}

interface DemandForecastSummary {
  totalForecasts: number;
  criticalCapacityRisks: number;
  avgModelAccuracy: number;
  generatedAt: string;
  forecastHorizon: string;
  modelVersions: string[];
  riskDistribution: { low: number; medium: number; high: number; critical: number };
  totalRequiredCapex: number;
  avgDaysToCapacity: number;
}

interface DemandForecastResponse {
  summary: DemandForecastSummary;
  forecastsByRegion: DemandForecast[];
  forecastsByWilaya: DemandForecast[];
}

// ─── Constants ─────────────────────────────────────────────────────────

const RISK_COLORS: Record<CapacityRisk, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

const RISK_BG_MAP: Record<CapacityRisk, string> = {
  low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
};

const METRIC_LABELS: Record<Metric, string> = {
  prbUtilization: 'PRB Utilization',
  activeUsers: 'Active Users',
  throughputDl: 'Throughput DL',
  throughputUl: 'Throughput UL',
};

const METRIC_UNITS: Record<Metric, string> = {
  prbUtilization: '%',
  activeUsers: '',
  throughputDl: ' Mbps',
  throughputUl: ' Mbps',
};

const RISK_LEVELS: CapacityRisk[] = ['low', 'medium', 'high', 'critical'];

const PIE_COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];

// ─── Helper Functions ──────────────────────────────────────────────────

function formatDZD(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B DZD`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M DZD`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K DZD`;
  return `${formatNumber(value, 0)} DZD`;
}

function mapeColor(mape: number): string {
  if (mape <= 5) return 'text-emerald-600 dark:text-emerald-400';
  if (mape <= 10) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function metricValue(value: number, metric: Metric): string {
  const unit = METRIC_UNITS[metric];
  if (metric === 'activeUsers') return formatNumber(value, 0) + unit;
  return formatNumber(value, 1) + unit;
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

// ─── Main Component ────────────────────────────────────────────────────

export default function AiDemandForecastView() {
  const { data, isLoading, isError } = useQuery<DemandForecastResponse>({
    queryKey: ['ai-demand-forecast'],
    queryFn: () =>
      fetch('/api/ai/demand-forecast').then((r) => {
        if (!r.ok) throw new Error('Demand Forecast API error: ' + r.status);
        return r.json();
      }),
    refetchInterval: 30000,
  });

  const summary = data?.summary;
  const allForecasts = data
    ? [...data.forecastsByRegion, ...data.forecastsByWilaya]
    : [];

  // Derived KPI values
  const mape = summary ? +((1 - summary.avgModelAccuracy) * 100).toFixed(1) : 0;

  // Area chart data: first forecast entry's 30-point timeline
  const timelineData = data?.forecastsByRegion?.[0]?.forecastPoints?.map((p) => ({
    date: p.date.slice(5), // MM-DD
    predicted: p.predicted,
    lower: p.lower,
    upper: p.upper,
  })) ?? [];

  // Bar chart data: Days to Capacity by Region (sorted desc)
  const daysByRegion = [...data?.forecastsByRegion ?? []]
    .sort((a, b) => b.daysToCapacity - a.daysToCapacity)
    .map((f) => ({
      region: f.region.length > 20 ? f.region.slice(0, 18) + '…' : f.region,
      days: f.daysToCapacity,
      fill: RISK_COLORS[f.capacityRisk],
      risk: f.capacityRisk,
    }));

  // Pie chart data: risk distribution
  const pieData = summary
    ? RISK_LEVELS.map((level, idx) => ({
        name: level.charAt(0).toUpperCase() + level.slice(1),
        value: summary.riskDistribution[level],
        fill: PIE_COLORS[idx],
      }))
    : [];

  // ─── Render: Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <KpiCardsSkeleton />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
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
        <p className="text-lg font-medium">Failed to load Demand Forecast data</p>
        <p className="text-sm mt-1">Please try again later</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || allForecasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <TrendingUp className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No demand forecast data available</p>
        <p className="text-sm mt-1">Data will appear once forecasts are generated</p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-blue-500" />
          AI Demand Forecast
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          90-day capacity demand prediction across {summary?.totalForecasts ?? 0} network regions
        </p>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Forecasts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Total Forecasts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {summary?.totalForecasts ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Region & Wilaya level</p>
          </CardContent>
        </Card>

        {/* Critical Risks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Critical Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {summary?.criticalCapacityRisks ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Capacity saturation imminent</p>
          </CardContent>
        </Card>

        {/* Avg Model Accuracy (MAPE) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Avg Model Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold ${mapeColor(mape)}`}>
              {formatNumber(mape, 1)}%
              <span className="text-xs font-normal text-muted-foreground ml-1">MAPE</span>
            </span>
            <p className="text-xs text-muted-foreground mt-1">Lower is better</p>
          </CardContent>
        </Card>

        {/* Avg Days to Capacity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Avg Days to Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatNumber(summary?.avgDaysToCapacity ?? 0, 0)}d
            </span>
            <p className="text-xs text-muted-foreground mt-1">Until capacity limit reached</p>
          </CardContent>
        </Card>

        {/* Total Required CAPEX */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Banknote className="h-4 w-4 text-cyan-500" />
              Total Required CAPEX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatDZD(summary?.totalRequiredCapex ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Investment to meet demand</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Risk Distribution Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {RISK_LEVELS.map((level) => (
          <Card key={level} className="border-l-4" style={{ borderLeftColor: RISK_COLORS[level] }}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </p>
                  <p className="text-2xl font-bold mt-1" style={{ color: RISK_COLORS[level] }}>
                    {summary?.riskDistribution[level] ?? 0}
                  </p>
                </div>
                <Shield className="h-8 w-8 opacity-20" style={{ color: RISK_COLORS[level] }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4 & 5. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 4. Area Chart: Forecast Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Forecast Timeline — {data.forecastsByRegion[0]?.region ?? 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    interval={4}
                    height={40}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => formatNumber(v, 0)}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    name="Upper Bound"
                    stroke="transparent"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    name="Lower Bound"
                    stroke="transparent"
                    fill="#FFFFFF"
                    fillOpacity={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#predictedGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 5. Bar Chart: Days to Capacity by Region */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Days to Capacity by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daysByRegion} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => `${v}d`}
                  />
                  <YAxis
                    type="category"
                    dataKey="region"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={130}
                  />
                  <Tooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number, _name: string, entry: { payload: { risk: string } }) => [
                      `${value} days`,
                      entry.payload.risk.charAt(0).toUpperCase() + entry.payload.risk.slice(1),
                    ]}
                  />
                  <Bar dataKey="days" name="Days to Capacity" radius={[0, 4, 4, 0]}>
                    {daysByRegion.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6. Forecasts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Demand Forecasts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Region</TableHead>
                  <TableHead>Wilaya</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Technology</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Forecast 30d</TableHead>
                  <TableHead className="text-right">Forecast 90d</TableHead>
                  <TableHead className="text-right">Capacity Limit</TableHead>
                  <TableHead className="text-right">Days to Capacity</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allForecasts.map((f) => (
                  <TableRow key={`${f.region}-${f.metric}-${f.technology}`}>
                    <TableCell className="font-medium text-xs max-w-[180px] truncate sticky left-0 bg-background">
                      {f.region}
                    </TableCell>
                    <TableCell className="text-xs">{f.wilayaCode}</TableCell>
                    <TableCell className="text-xs">{METRIC_LABELS[f.metric]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={f.technology === '4G-LTE' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20'}>
                        {f.technology}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {metricValue(f.currentValue, f.metric)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {metricValue(f.forecast30d, f.metric)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {metricValue(f.forecast90d, f.metric)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {metricValue(f.capacityLimit, f.metric)}
                    </TableCell>
                    <TableCell className={`text-right text-xs font-bold ${f.daysToCapacity <= 10 ? 'text-red-600 dark:text-red-400' : f.daysToCapacity <= 30 ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'}`}>
                      {formatNumber(f.daysToCapacity, 0)}d
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={RISK_BG_MAP[f.capacityRisk]}>
                        {f.capacityRisk.charAt(0).toUpperCase() + f.capacityRisk.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatNumber(f.confidence * 100, 0)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 7. Pie Chart: Capacity Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capacity Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={<ChartTooltipContent />}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {RISK_LEVELS.map((level, idx) => (
              <div key={level} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[idx] }} />
                <span className="text-muted-foreground">
                  {level.charAt(0).toUpperCase() + level.slice(1)} ({summary?.riskDistribution[level] ?? 0})
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
