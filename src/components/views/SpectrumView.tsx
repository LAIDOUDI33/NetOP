'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie,
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
import { RadioTower, Frown, Radio, DollarSign, Repeat2, Signal } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber, TECHNOLOGIES } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface SpectrumBlock {
  id: string;
  band: string;
  bandwidth: number;
  technology: string;
  region: string;
  channelCount: number;
  utilizedChannels: number;
  utilizationPct: number;
  avgInterference: number;
  avgRsrp: number;
  refarmCandidate: boolean;
  refarmTargetTech: string | null;
  refarmPotentialSaving: number;
  status: string;
}

interface SpectrumSummary {
  total: number;
  totalBandwidth: number;
  avgUtilization: number;
  avgInterference: number;
  avgRsrp: number;
  byBand: Record<string, number>;
  byTech: Record<string, number>;
  refarmCandidates: number;
  totalRefarmSaving: number;
}

interface SpectrumApiResponse {
  items: SpectrumBlock[];
  summary: {
    total: number;
    byBand: Record<string, number>;
    byTech: Record<string, number>;
    byStatus: Record<string, number>;
    refarmCandidates: number;
    totalBandwidthMhz: number;
    avgUtilizationPct: number;
  };
}

interface SpectrumSummary {
  total: number;
  totalBandwidth: number;
  avgUtilization: number;
  avgInterference: number;
  avgRsrp: number;
  byBand: Record<string, number>;
  byTech: Record<string, number>;
  refarmCandidates: number;
  totalRefarmSaving: number;
}

// ─── Constants ─────────────────────────────────────────────────────────

const BANDS = ['all', '700', '800', '900', '1800', '2100', '2300', '2600', '3500'] as const;

const SPECTRUM_TECH_COLORS: Record<string, string> = {
  '2G': '#94A3B8',
  '3G': '#06B6D4',
  '4G': '#10B981',
  '5G': '#F59E0B',
};

const STATUS_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  degraded: 'secondary',
  down: 'destructive',
  planned: 'outline',
  reserved: 'outline',
};

// ─── Helper Functions ──────────────────────────────────────────────────

function utilizationColor(pct: number): string {
  if (pct > 80) return 'text-red-600 dark:text-red-400';
  if (pct > 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function utilizationBarColor(pct: number): string {
  if (pct > 80) return 'bg-red-500';
  if (pct > 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function utilizationChartColor(pct: number): string {
  if (pct > 80) return '#EF4444';
  if (pct > 60) return '#F59E0B';
  return '#10B981';
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
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
            <Skeleton className="h-8 w-20 mb-2" />
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

export default function SpectrumView() {
  const [techFilter, setTechFilter] = useState<string>('all');
  const [bandFilter, setBandFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: rawData, isLoading, isError } = useQuery<SpectrumApiResponse>({
    queryKey: ['spectrum', techFilter, bandFilter, regionFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (bandFilter !== 'all') params.set('band', bandFilter);
      if (regionFilter !== 'all') params.set('region', regionFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      return fetch(`/api/spectrum${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const items = rawData?.items ?? [];
  const rawSummary = rawData?.summary;

  // Derive summary with computed fields from items
  const summary: SpectrumSummary | undefined = rawSummary
    ? {
        total: rawSummary.total,
        totalBandwidth: rawSummary.totalBandwidthMhz,
        avgUtilization: rawSummary.avgUtilizationPct,
        avgInterference: items.length > 0 ? Number((items.reduce((s, b) => s + b.avgInterference, 0) / items.length).toFixed(1)) : 0,
        avgRsrp: items.length > 0 ? Number((items.reduce((s, b) => s + b.avgRsrp, 0) / items.length).toFixed(1)) : 0,
        byBand: rawSummary.byBand,
        byTech: rawSummary.byTech,
        refarmCandidates: rawSummary.refarmCandidates,
        totalRefarmSaving: items.reduce((s, b) => s + (b.refarmCandidate ? b.refarmPotentialSaving : 0), 0),
      }
    : undefined;

  // Derive unique regions from data for region filter
  const regions = Array.from(new Set(items.map((b) => b.region))).sort();

  // Band utilization chart data
  const bandUtilData = items.map((b) => ({
    band: `${b.band} MHz`,
    utilization: b.utilizationPct,
    fill: utilizationChartColor(b.utilizationPct),
  }));

  // Spectrum by technology pie data
  const techPieData = summary?.byTech
    ? Object.entries(summary.byTech).map(([tech, count]) => ({
        name: tech,
        value: count,
        fill: SPECTRUM_TECH_COLORS[tech] ?? '#94A3B8',
      }))
    : [];

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
        <p className="text-lg font-medium">Failed to load spectrum data</p>
        <p className="text-sm mt-1">Please try again later.</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!rawData || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <RadioTower className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No Spectrum Data Available</p>
        <p className="text-sm mt-1">
          Spectrum allocation data has not been collected yet.
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
          <RadioTower className="h-6 w-6 text-cyan-500" />
          Spectrum Analysis
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Frequency band utilization, interference analysis, and refarming opportunities
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Bands */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-500" />
              Total Bands
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {summary?.total ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Frequency blocks</p>
          </CardContent>
        </Card>

        {/* Total Bandwidth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Signal className="h-4 w-4 text-emerald-500" />
              Total Bandwidth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary?.totalBandwidth ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">MHz allocated</p>
          </CardContent>
        </Card>

        {/* Avg Utilization */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RadioTower className="h-4 w-4 text-amber-500" />
              Avg Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${utilizationColor(summary?.avgUtilization ?? 0)}`}>
              {formatNumber(summary?.avgUtilization ?? 0, 1)}%
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${utilizationBarColor(summary?.avgUtilization ?? 0)}`}
                style={{ width: `${Math.min(summary?.avgUtilization ?? 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Channel utilization</p>
          </CardContent>
        </Card>

        {/* Refarm Candidates */}
        <Card className="border-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Repeat2 className="h-4 w-4 text-amber-500" />
              Refarm Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {summary?.refarmCandidates ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Bands eligible for refarming</p>
          </CardContent>
        </Card>

        {/* Total Refarm Saving */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Total Refarm Saving
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary?.totalRefarmSaving ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Estimated annual savings</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Band Utilization Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Band Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bandUtilData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="band"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
                          <p className="font-medium mb-1">{label}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Utilization:</span>
                            <span className="font-medium">{formatNumber(payload[0].value, 1)}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="utilization" name="Utilization %" radius={[4, 4, 0, 0]}>
                    {bandUtilData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Spectrum by Technology Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spectrum by Technology</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={techPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  >
                    {techPieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.payload.fill }} />
                            <span className="font-medium">{d.name}:</span>
                            <span>{d.value} blocks</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spectrum Blocks Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Spectrum Blocks</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Technology" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tech</SelectItem>
                {TECHNOLOGIES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bandFilter} onValueChange={setBandFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Band" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bands</SelectItem>
                {BANDS.filter((b) => b !== 'all').map((b) => (
                  <SelectItem key={b} value={b}>{b} MHz</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="degraded">Degraded</SelectItem>
                <SelectItem value="down">Down</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No spectrum blocks match the selected filters.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Band</TableHead>
                    <TableHead className="text-right">Bandwidth</TableHead>
                    <TableHead>Tech</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Channels</TableHead>
                    <TableHead className="text-right">Utilization</TableHead>
                    <TableHead className="text-right">Avg Interference</TableHead>
                    <TableHead className="text-right">Avg RSRP</TableHead>
                    <TableHead className="text-center">Refarm?</TableHead>
                    <TableHead className="text-right">Potential Saving</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell className="font-medium text-xs sticky left-0 bg-background">
                        {block.band} MHz
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {block.bandwidth} MHz
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={TECH_BG_CLASSES[block.technology as Technology] ?? 'bg-muted text-muted-foreground border-muted'}
                        >
                          {block.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{block.region}</TableCell>
                      <TableCell className="text-right text-xs">
                        {block.utilizedChannels}/{block.channelCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className={`font-medium text-xs ${utilizationColor(block.utilizationPct)}`}>
                            {formatNumber(block.utilizationPct, 1)}%
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${utilizationBarColor(block.utilizationPct)}`}
                              style={{ width: `${Math.min(block.utilizationPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(block.avgInterference, 1)} dBm
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(block.avgRsrp, 1)} dBm
                      </TableCell>
                      <TableCell className="text-center">
                        {block.refarmCandidate ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {block.refarmCandidate && block.refarmPotentialSaving > 0
                          ? formatCurrency(block.refarmPotentialSaving)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT_MAP[block.status] ?? 'outline'}>
                          {block.status.charAt(0).toUpperCase() + block.status.slice(1)}
                        </Badge>
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