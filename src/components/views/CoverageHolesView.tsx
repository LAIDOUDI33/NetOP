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
import { MapPinOff, Frown, Users, AlertTriangle, CircleDot } from 'lucide-react';
import { TECH_BG_CLASSES, TECHNOLOGIES, formatNumber } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── API Response Types ───────────────────────────────────────────

interface CoverageHole {
  id: string;
  technology: Technology;
  region: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  areaKm2: number;
  signalStrength: number;
  expectedSignal: number;
  gapDb: number;
  severity: string;
  nearestSite: string;
  nearestSiteName: string;
  nearestSiteDistKm: number;
  affectedUsers: number;
  recommendation: string;
  status: string;
  createdAt: string;
}

interface CoverageHolesSummary {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byRegion: Record<string, number>;
  totalAffectedUsers: number;
  avgGapDb: number;
}

interface CoverageHolesResponse {
  holes: CoverageHole[];
  summary: CoverageHolesSummary;
}

// ─── Constants ─────────────────────────────────────────────────────

const SEVERITY_COLORS_MAP: Record<string, string> = {
  low: '#94A3B8',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#991B1B',
};

const SEVERITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'destructive',
  critical: 'destructive',
};

const SEVERITY_TEXT_COLOR: Record<string, string> = {
  low: 'text-slate-600 dark:text-slate-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
  critical: 'text-red-700 dark:text-red-300',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  investigating: 'secondary',
  resolved: 'outline',
  mitigated: 'default',
};

const STATUS_TEXT: Record<string, string> = {
  open: 'Open',
  investigating: 'Investigating',
  resolved: 'Resolved',
  mitigated: 'Mitigated',
};

const REGION_COLORS = [
  '#10B981', '#F59E0B', '#06B6D4', '#EF4444', '#8B5CF6',
  '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#84CC16',
];

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severity' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'resolved', label: 'Resolved' },
];

// ─── Helper Functions ──────────────────────────────────────────────

function gapColor(gap: number): string {
  if (gap > 15) return 'bg-red-500';
  if (gap > 10) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function gapTextColor(gap: number): string {
  if (gap > 15) return 'text-red-600 dark:text-red-400';
  if (gap > 10) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function gapBarBg(gap: number): string {
  if (gap > 15) return 'bg-red-500';
  if (gap > 10) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function formatUsers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── Loading Skeletons ─────────────────────────────────────────────

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

// ─── Custom Chart Tooltip ──────────────────────────────────────────

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

// ─── Main Component ────────────────────────────────────────────────

export default function CoverageHolesView() {
  const [techFilter, setTechFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<CoverageHolesResponse>({
    queryKey: ['coverage-holes', techFilter, severityFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      return fetch(`/api/coverage-holes${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const holes = data?.holes ?? [];
  const summary = data?.summary;

  // Chart data
  const severityChartData = summary?.bySeverity
    ? Object.entries(summary.bySeverity).map(([key, value]) => ({
        severity: key.charAt(0).toUpperCase() + key.slice(1),
        count: value,
        fill: SEVERITY_COLORS_MAP[key] ?? '#94A3B8',
      }))
    : [];

  const regionChartData = summary?.byRegion
    ? Object.entries(summary.byRegion).map(([region, count], idx) => ({
        region,
        count,
        fill: REGION_COLORS[idx % REGION_COLORS.length],
      }))
    : [];

  // KPI computations
  const criticalCount = summary?.bySeverity?.critical ?? 0;
  const avgGap = summary?.avgGapDb ?? 0;
  const totalAffectedUsers = summary?.totalAffectedUsers ?? 0;
  const openCount = summary?.byStatus?.open ?? 0;

  // ─── Render: Loading State ───────────────────────────────────────
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
        <TableSkeleton rows={8} cols={12} />
      </div>
    );
  }

  // ─── Render: Error State ─────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Failed to load coverage hole data</p>
        <p className="text-sm mt-1">Please try again later.</p>
      </div>
    );
  }

  // ─── Render: Empty State ─────────────────────────────────────────
  if (!data || holes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <MapPinOff className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No Coverage Holes Detected</p>
        <p className="text-sm mt-1">
          No coverage holes match the current filters.
        </p>
      </div>
    );
  }

  // ─── Render: Main View ──────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MapPinOff className="h-6 w-6 text-rose-500" />
          Coverage Hole Detection
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Identify coverage gaps and signal weakness areas
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Holes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPinOff className="h-4 w-4 text-cyan-500" />
              Total Holes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {summary?.total ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Detected coverage gaps</p>
          </CardContent>
        </Card>

        {/* Critical Holes */}
        <Card className="border-red-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Critical Holes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {criticalCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Require immediate action</p>
          </CardContent>
        </Card>

        {/* Avg Gap (dB) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPinOff className="h-4 w-4 text-amber-500" />
              Avg Gap (dB)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${gapTextColor(avgGap)}`}>
              {formatNumber(avgGap, 1)}
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${gapBarBg(avgGap)}`}
                style={{ width: `${Math.min((avgGap / 25) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {avgGap > 15 ? 'Severe signal weakness' : avgGap > 10 ? 'Moderate gap' : 'Minor gap'}
            </p>
          </CardContent>
        </Card>

        {/* Affected Users */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-500" />
              Affected Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">
              {formatUsers(totalAffectedUsers)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Subscribers impacted</p>
          </CardContent>
        </Card>

        {/* Open Holes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-amber-500" />
              Open Holes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {openCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Awaiting resolution</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Holes by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="severity"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="Holes" radius={[4, 4, 0, 0]}>
                    {severityChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Holes by Region Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Holes by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionChartData} barSize={32} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis
                    type="number"
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
                  <Bar dataKey="count" name="Holes" radius={[0, 4, 4, 0]}>
                    {regionChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Holes Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base">Coverage Hole Details</CardTitle>
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
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {holes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No coverage holes match the selected filters.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tech</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Signal (dBm)</TableHead>
                    <TableHead className="text-right">Expected (dBm)</TableHead>
                    <TableHead className="text-right">Gap (dB)</TableHead>
                    <TableHead className="text-right">Area (km²)</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Nearest Site</TableHead>
                    <TableHead className="text-right">Affected Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[160px]">Recommendation</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holes.map((hole) => (
                    <TableRow key={hole.id}>
                      <TableCell>
                        <Badge variant="outline" className={TECH_BG_CLASSES[hole.technology]}>
                          {hole.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{hole.region}</TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {hole.signalStrength}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {hole.expectedSignal}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-xs font-bold ${gapTextColor(hole.gapDb)}`}>
                            {formatNumber(hole.gapDb, 1)}
                          </span>
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${gapBarBg(hole.gapDb)}`}
                              style={{ width: `${Math.min((hole.gapDb / 25) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(hole.areaKm2, 2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={SEVERITY_VARIANT[hole.severity] ?? 'outline'}>
                          <span className={SEVERITY_TEXT_COLOR[hole.severity] ?? ''}>
                            {hole.severity.charAt(0).toUpperCase() + hole.severity.slice(1)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>
                          <span className="font-medium">{hole.nearestSiteName}</span>
                          <span className="text-muted-foreground ml-1">
                            ({formatNumber(hole.nearestSiteDistKm, 1)} km)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={hole.affectedUsers > 0 ? 'text-rose-600 dark:text-rose-400 font-medium text-xs' : 'text-muted-foreground text-xs'}>
                          {hole.affectedUsers.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[hole.status] ?? 'outline'}>
                          {STATUS_TEXT[hole.status] ?? hole.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={hole.recommendation}>
                        {hole.recommendation}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {hole.createdAt}
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