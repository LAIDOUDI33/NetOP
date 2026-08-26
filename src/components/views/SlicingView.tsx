'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Layers, Users, Wifi, Zap, Cpu, ServerOff } from 'lucide-react';
import { formatNumber } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';

// ─── API Response Types ────────────────────────────────────────────────

interface NetworkSlice {
  id: string;
  name: string;
  sliceType: 'eMBB' | 'URLLC' | 'mMTC';
  technology: string;
  status: 'active' | 'suspended' | 'deactivated';
  siteId: string | null;
  siteName: string | null;
  siteCode: string | null;
  sst: string;
  sd: string | null;
  maxBandwidth: number;
  guaranteedBw: number;
  maxUsers: number;
  priorityLevel: number;
  latencyTarget: number;
  reliabilityTarget: number;
  currentLoad: number;
  activeUsers: number;
  avgThroughput: number;
  avgLatency: number;
  qci: string | null;
  fiveQi: number | null;
  parameters: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface SlicingSummary {
  total: number;
  active: number;
  suspended: number;
  deactivated: number;
  byType: Record<string, number>;
  avgLoad: number;
}

interface SlicingResponse {
  slices: NetworkSlice[];
  summary: SlicingSummary;
}

// ─── Constants ─────────────────────────────────────────────────────────

const SLICE_TYPE_COLORS: Record<string, string> = {
  eMBB: '#10B981',
  URLLC: '#F59E0B',
  mMTC: '#06B6D4',
};

const SLICE_TYPE_BG: Record<string, string> = {
  eMBB: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  URLLC: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  mMTC: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
};


const STATUS_BADGE_VARIANT: Record<string, 'default' | 'outline' | 'secondary'> = {
  active: 'default',
  suspended: 'outline',
  deactivated: 'secondary',
};


// ─── Helper Functions ──────────────────────────────────────────────────

function loadBarColor(load: number): string {
  if (load >= 80) return 'bg-red-500';
  if (load >= 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function loadTextColor(load: number): string {
  if (load >= 80) return 'text-red-600 dark:text-red-400';
  if (load >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function loadProgressClass(load: number): string {
  if (load >= 80) return '[&>div]:bg-red-500';
  if (load >= 60) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-emerald-500';
}

function computeTypeStats(slices: NetworkSlice[], type: string) {
  const typed = slices.filter((s) => s.sliceType === type);
  if (typed.length === 0) return { count: 0, avgLoad: 0, totalUsers: 0 };
  const avgLoad = Number((typed.reduce((sum, s) => sum + s.currentLoad, 0) / typed.length).toFixed(1));
  const totalUsers = typed.reduce((sum, s) => sum + s.activeUsers, 0);
  return { count: typed.length, avgLoad, totalUsers };
}

// ─── Custom Chart Tooltip ─────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatNumber(entry.value, 1)}%</span>
        </div>
      ))}
    </div>
  );
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
            <Skeleton className="h-8 w-16 mb-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TypeCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-2 w-full rounded-full" />
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
        <Skeleton className="h-72 w-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5, cols: _cols = 8 }: { rows?: number; cols?: number }) {
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

// ─── Main Component ────────────────────────────────────────────────────

export default function SlicingView() {
  const t = useT();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sliceTypeFilter, setSliceTypeFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<SlicingResponse>({
    queryKey: ['slicing', statusFilter, sliceTypeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sliceTypeFilter !== 'all') params.set('sliceType', sliceTypeFilter);
      const qs = params.toString();
      return fetch(`/api/slicing${qs ? `?${qs}` : ''}`).then((r) => { if (!r.ok) throw new Error('Slicing API error: ' + r.status); return r.json(); });
    },
    refetchInterval: 30000,
  });

  const slices = data?.slices ?? [];
  const summary = data?.summary;

  // Computed KPI values
  const totalActiveUsers = slices.reduce((sum, s) => sum + s.activeUsers, 0);
  const urlccCount = summary?.byType?.URLLC ?? 0;

  // Per-type stats
  const embBStats = computeTypeStats(slices, 'eMBB');
  const urllcStats = computeTypeStats(slices, 'URLLC');
  const mmtcStats = computeTypeStats(slices, 'mMTC');

  // Bar chart data — sorted by currentLoad desc
  const barChartData = [...slices]
    .sort((a, b) => b.currentLoad - a.currentLoad)
    .map((s) => ({
      name: s.name,
      currentLoad: s.currentLoad,
      sliceType: s.sliceType,
      color: SLICE_TYPE_COLORS[s.sliceType] ?? '#94A3B8',
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
        <TypeCardsSkeleton />
        <ChartSkeleton />
        <TableSkeleton rows={6} cols={13} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <ServerOff className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: 'slicing' })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || slices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Layers className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('empty.noDataFor', { entity: t('sli.networkSlices') })}</p>
        <p className="text-sm mt-1">
          {statusFilter !== 'all' || sliceTypeFilter !== 'all'
            ? t('sli.noMatch')
            : t('sli.noSlices')}
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
          <Layers className="h-6 w-6 text-amber-500" />
          {t('sli.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('sli.subtitle')}
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Slices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('sli.totalSlices')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{summary?.total ?? 0}</span>
            <p className="text-xs text-muted-foreground mt-1">{t('sli.configuredSlices')}</p>
          </CardContent>
        </Card>

        {/* Active Slices */}
        <Card className="border-emerald-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('sli.activeSlices')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary?.active ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('sli.currentlyRunning')}</p>
          </CardContent>
        </Card>

        {/* Avg Load */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('sli.avgLoad')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-bold ${loadTextColor(summary?.avgLoad ?? 0)}`}>
                {formatNumber(summary?.avgLoad ?? 0, 1)}
              </span>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${loadBarColor(summary?.avgLoad ?? 0)}`}
                style={{ width: `${Math.min(summary?.avgLoad ?? 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Total Active Users */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-500" />
              {t('sli.totalActiveUsers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {totalActiveUsers.toLocaleString()}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('sli.acrossAllSlices')}</p>
          </CardContent>
        </Card>

        {/* URLLC Slices */}
        <Card className="border-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              {t('sli.urllcSlices')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {urlccCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('sli.urllcDesc')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Slice Type Distribution Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* eMBB Card */}
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/15">
                <Wifi className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  eMBB
                </p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                  {t('sli.embbDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {embBStats.count}
              </span>
              <span className="text-xs text-muted-foreground">{t('sli.slices')}</span>
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{t('sli.avgLoad')}</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatNumber(embBStats.avgLoad, 1)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-emerald-500/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(embBStats.avgLoad, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <Users className="h-3 w-3 inline mr-1" />
              {embBStats.totalUsers.toLocaleString()} {t('sli.activeUsers')}
            </p>
          </CardContent>
        </Card>

        {/* URLLC Card */}
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-500/15">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  URLLC
                </p>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                  {t('sli.urllcFullDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {urllcStats.count}
              </span>
              <span className="text-xs text-muted-foreground">{t('sli.slices')}</span>
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{t('sli.avgLoad')}</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {formatNumber(urllcStats.avgLoad, 1)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-amber-500/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(urllcStats.avgLoad, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <Users className="h-3 w-3 inline mr-1" />
              {urllcStats.totalUsers.toLocaleString()} {t('sli.activeUsers')}
            </p>
          </CardContent>
        </Card>

        {/* mMTC Card */}
        <Card className="bg-cyan-500/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan-500/15">
                <Cpu className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                  mMTC
                </p>
                <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70">
                  {t('sli.mmtcDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                {mmtcStats.count}
              </span>
              <span className="text-xs text-muted-foreground">{t('sli.slices')}</span>
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{t('sli.avgLoad')}</span>
                <span className="font-medium text-cyan-600 dark:text-cyan-400">
                  {formatNumber(mmtcStats.avgLoad, 1)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-cyan-500/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${Math.min(mmtcStats.avgLoad, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <Users className="h-3 w-3 inline mr-1" />
              {mmtcStats.totalUsers.toLocaleString()} {t('sli.activeUsers')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Slice Load BarChart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('sli.sliceLoadDist')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 8, right: 16, bottom: 60, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="name"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={80}
                />
                <YAxis
                  domain={[0, 100]}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingBottom: '8px' }}
                  formatter={(value: string) => (
                    <span className="text-muted-foreground">{value}</span>
                  )}
                />
                <ReferenceLine
                  y={80}
                  stroke="#EF4444"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: t('sli.threshold80'),
                    position: 'insideTopRight',
                    fill: '#EF4444',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="currentLoad" name={t('sli.currentLoadPct')} radius={[4, 4, 0, 0]} barSize={32}>
                  {barChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend color guide */}
          <div className="flex items-center justify-center gap-6 mt-2">
            {Object.entries(SLICE_TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                <span>{type}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-0.5 border-t-2 border-dashed border-red-500" />
              <span>{t('sli.threshold')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Full Slices Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base">{t('sli.allSlices')}</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t('filter.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allStatus')}</SelectItem>
                <SelectItem value="active">{t('status.active')}</SelectItem>
                <SelectItem value="suspended">{t('status.suspended')}</SelectItem>
                <SelectItem value="deactivated">{t('status.deactivated')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sliceTypeFilter} onValueChange={setSliceTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t('filter.sliceType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTypes')}</SelectItem>
                <SelectItem value="eMBB">eMBB</SelectItem>
                <SelectItem value="URLLC">URLLC</SelectItem>
                <SelectItem value="mMTC">mMTC</SelectItem>
              </SelectContent>
            </Select>
            <ExportButton data={slices} filenamePrefix="slicing" columns={[{ key: 'name', header: t('sli.exportSliceName') }, { key: 'sliceType', header: t('sli.exportType') }, { key: 'status', header: t('sli.exportStatus') }, { key: 'technology', header: t('sli.exportTechnology') }, { key: 'currentLoad', header: t('sli.exportLoad') }, { key: 'activeUsers', header: t('sli.exportUsers') }, { key: 'avgThroughput', header: t('sli.exportAvgThroughput') }, { key: 'avgLatency', header: t('sli.exportLatency') }, { key: 'priorityLevel', header: t('sli.exportPriority') }]} />
          </div>
        </CardHeader>
        <CardContent>
          {slices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('sli.noMatch')}
            </p>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[160px]">{t('th.name')}</TableHead>
                    <TableHead className="min-w-[80px]">{t('th.type')}</TableHead>
                    <TableHead className="min-w-[120px]">{t('th.site')}</TableHead>
                    <TableHead className="min-w-[80px]">{t('th.sstSd')}</TableHead>
                    <TableHead className="text-right min-w-[80px]">{t('th.bandwidth')}</TableHead>
                    <TableHead className="text-right min-w-[100px]">{t('th.guaranteedBw')}</TableHead>
                    <TableHead className="min-w-[70px]">{t('th.priority')}</TableHead>
                    <TableHead className="text-right min-w-[80px]">{t('th.latencyTarget')}</TableHead>
                    <TableHead className="min-w-[140px]">{t('th.currentLoad')}</TableHead>
                    <TableHead className="text-right min-w-[60px]">{t('th.users')}</TableHead>
                    <TableHead className="text-right min-w-[90px]">{t('th.dlThroughput')}</TableHead>
                    <TableHead className="min-w-[90px]">{t('th.status')}</TableHead>
                    <TableHead className="min-w-[70px]">{t('th.qci5qi')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slices.map((slice) => (
                    <TableRow key={slice.id}>
                      {/* Name */}
                      <TableCell className="font-medium text-xs max-w-[160px] truncate sticky left-0 bg-background z-10">
                        {slice.name}
                      </TableCell>
                      {/* Type */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={SLICE_TYPE_BG[slice.sliceType] ?? 'bg-muted border-border'}
                        >
                          {slice.sliceType}
                        </Badge>
                      </TableCell>
                      {/* Site */}
                      <TableCell>
                        {slice.siteName ? (
                          <div>
                            <p className="text-xs font-medium leading-tight">{slice.siteName}</p>
                            {slice.siteCode && (
                              <p className="text-[10px] text-muted-foreground leading-tight">{slice.siteCode}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {/* SST/SD */}
                      <TableCell className="text-xs font-mono">
                        {slice.sd ? `${slice.sst}/${slice.sd}` : slice.sst}
                      </TableCell>
                      {/* Max BW */}
                      <TableCell className="text-right text-xs">
                        {slice.maxBandwidth} {t('sli.unitMbps')}
                      </TableCell>
                      {/* Guaranteed BW */}
                      <TableCell className="text-right text-xs">
                        {slice.guaranteedBw} {t('sli.unitMbps')}
                      </TableCell>
                      {/* Priority */}
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          P{slice.priorityLevel}
                        </Badge>
                      </TableCell>
                      {/* Latency Target */}
                      <TableCell className="text-right text-xs">
                        {formatNumber(slice.latencyTarget, 1)} {t('sli.unitMs')}
                      </TableCell>
                      {/* Current Load */}
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[130px]">
                          <Progress
                            value={slice.currentLoad}
                            className={`h-2 flex-1 ${loadProgressClass(slice.currentLoad)}`}
                          />
                          <span className={`text-xs font-medium w-10 text-right ${loadTextColor(slice.currentLoad)}`}>
                            {formatNumber(slice.currentLoad, 1)}%
                          </span>
                        </div>
                      </TableCell>
                      {/* Users */}
                      <TableCell className="text-right text-xs">
                        {slice.activeUsers}
                      </TableCell>
                      {/* Throughput */}
                      <TableCell className="text-right text-xs">
                        {formatNumber(slice.avgThroughput, 1)} {t('sli.unitMbps')}
                      </TableCell>
                      {/* Status */}
                      <TableCell>
                        <Badge variant={STATUS_BADGE_VARIANT[slice.status]}>
                          {t(`status.${slice.status}`)}
                        </Badge>
                      </TableCell>
                      {/* QCI/FiveQI */}
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {slice.fiveQi != null ? `5QI: ${slice.fiveQi}` : slice.qci != null ? `QCI: ${slice.qci}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}