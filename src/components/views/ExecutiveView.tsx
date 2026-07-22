'use client';
import { useT } from '@/lib/i18n';

import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Crown, Star, XCircle, Zap, Activity, DollarSign, Gauge,
} from 'lucide-react';
import { TECH_COLORS, formatNumber } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface ExecutiveData {
  totalSites: number;
  sitesByTech: Record<string, number>;
  sitesByStatus: Record<string, number>;
  totalAlerts: number;
  activeAlerts: number;
  avgHealth: number;
  totalIncidents: number;
  openIncidents: number;
  totalOutages: number;
  activeOutages: number;
  totalEnergyKw: number;
  avgMos: number;
  sonActionsToday: number;
  avgNpi: number;
  slaBreachCount: number;
  totalRoiSaving: number;
}

// ─── Helper Functions ──────────────────────────────────────────────────

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function healthColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function healthBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function mosColor(score: number): string {
  if (score >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 3) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// ─── Custom Pie Tooltip ────────────────────────────────────────────────

function PieTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
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

// ─── Star Rating Component ─────────────────────────────────────────────

function StarRating({ score, max = 5 }: { score: number; max?: number }) {
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.3;
  const emptyStars = max - fullStars - (hasHalf ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`f${i}`} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
      {hasHalf && (
        <div className="relative h-4 w-4">
          <Star className="absolute inset-0 h-4 w-4 text-muted-foreground/30" />
          <div className="absolute inset-0 overflow-hidden w-[50%]">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </div>
        </div>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`e${i}`} className="h-4 w-4 text-muted-foreground/30" />
      ))}
    </div>
  );
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-6 w-14 mb-1" />
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
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-56 w-full" />
      </CardContent>
    </Card>
  );
}

function GaugeCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function ExecutiveView() {
  const t = useT();
  const { data, isLoading, error } = useQuery<ExecutiveData>({
    queryKey: ['executive'],
    queryFn: () => fetch('/api/executive').then((r) => r.json()),
    refetchInterval: 60000,
  });

  const d = data;

  // Pie chart data: sites by tech
  const techPieData = d
    ? (Object.entries(d.sitesByTech) as [string, number][])
        .filter(([, v]) => v > 0)
        .map(([tech, count]) => ({
          name: tech,
          value: count,
          fill: (TECH_COLORS as Record<string, string>)[tech] ?? '#94A3B8',
        }))
    : [];

  // Pie chart data: sites by status
  const STATUS_COLORS: Record<string, string> = {
    active: '#10B981',
    degraded: '#F59E0B',
    down: '#EF4444',
    maintenance: '#94A3B8',
  };

  const statusPieData = d
    ? (Object.entries(d.sitesByStatus) as [string, number][])
        .filter(([, v]) => v > 0)
        .map(([status, count]) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1),
          value: count,
          fill: STATUS_COLORS[status] ?? '#94A3B8',
        }))
    : [];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('exec.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('exec.subtitle')}
              </p>
            </div>
          </div>
          {d && <ExportButton data={[{ totalSites: d.totalSites, activeAlerts: d.activeAlerts, avgAvailability: d.avgAvailability, avgNpi: d.avgNpi, totalRoiSaving: d.totalRoiSaving, totalEnergyKw: d.totalEnergyKw, avgMos: d.avgMos, sonActionsToday: d.sonActionsToday }]} filenamePrefix="executive" columns={[{ key: 'totalSites', header: 'Total Sites' }, { key: 'activeAlerts', header: 'Active Alerts' }, { key: 'avgAvailability', header: 'Avg Availability (%)' }, { key: 'avgNpi', header: 'Avg NPI' }, { key: 'totalRoiSaving', header: 'ROI Savings ($)' }, { key: 'totalEnergyKw', header: 'Energy (kW)' }, { key: 'avgMos', header: 'Avg MOS' }, { key: 'sonActionsToday', header: 'SON Actions Today' }]} />}
        </div>
        <Separator className="mt-4" />
      </div>

      {/* ── Loading State ───────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-6">
          <KpiCardsSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <GaugeCardsSkeleton />
        </div>
      )}

      {/* ── Error State ─────────────────────────────────────────────── */}
      {error && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <XCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('empty.noDataFor', { entity: t('exec.title') })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Main Content ───────────────────────────────────────────── */}
      {d && !isLoading && (
        <>
          {/* ── TOP ROW: 8 KPI Cards (4×2) ───────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Total Sites */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t('exec.totalSites')}
                </p>
                <p className="text-2xl font-bold mt-1">{formatCompact(d.totalSites)}</p>
                <div className="h-1 w-full bg-muted rounded-full mt-2">
                  <div className="h-1 rounded-full bg-emerald-500" style={{ width: '100%' }} />
                </div>
              </CardContent>
            </Card>

            {/* 2. Active Alerts */}
            <Card className={d.activeAlerts > 0 ? 'border-red-500/30' : ''}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t('exec.openAlerts')}
                </p>
                <p className={`text-2xl font-bold mt-1 ${d.activeAlerts > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {formatCompact(d.activeAlerts)}
                </p>
                <div className="h-1 w-full bg-muted rounded-full mt-2">
                  <div
                    className="h-1 rounded-full bg-red-500"
                    style={{ width: `${Math.min(100, (d.activeAlerts / Math.max(1, d.totalAlerts)) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 3. Avg Health Score */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t('exec.networkHealth')}
                </p>
                <p className={`text-2xl font-bold mt-1 ${healthColor(d.avgHealth)}`}>
                  {formatNumber(d.avgHealth, 1)}%
                </p>
                <div className="h-1 w-full bg-muted rounded-full mt-2">
                  <div
                    className={`h-1 rounded-full ${healthBg(d.avgHealth)}`}
                    style={{ width: `${d.avgHealth}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 4. Avg MOS */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t('exec.avgMos')}
                </p>
                <p className={`text-2xl font-bold mt-1 ${mosColor(d.avgMos)}`}>
                  {formatNumber(d.avgMos, 2)}
                </p>
                <div className="h-1 w-full bg-muted rounded-full mt-2">
                  <div
                    className={`h-1 rounded-full ${d.avgMos >= 4 ? 'bg-emerald-500' : d.avgMos >= 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${(d.avgMos / 5) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 5. Active Incidents */}
            <Card className={d.openIncidents > 0 ? 'border-amber-500/30' : ''}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t('exec.incidentsOpen')}
                </p>
                <p className={`text-2xl font-bold mt-1 ${d.openIncidents > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                  {formatCompact(d.openIncidents)}
                </p>
                <div className="h-1 w-full bg-muted rounded-full mt-2">
                  <div
                    className="h-1 rounded-full bg-amber-500"
                    style={{ width: `${Math.min(100, (d.openIncidents / Math.max(1, d.totalIncidents)) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 6. Active Outages */}
            <Card className={d.activeOutages > 0 ? 'border-red-500/30' : ''}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t('exec.outages')}
                </p>
                <p className={`text-2xl font-bold mt-1 ${d.activeOutages > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {formatCompact(d.activeOutages)}
                </p>
                <div className="h-1 w-full bg-muted rounded-full mt-2">
                  <div
                    className="h-1 rounded-full bg-red-500"
                    style={{ width: `${Math.min(100, (d.activeOutages / Math.max(1, d.totalOutages)) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 7. Energy Consumption */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t('exec.energy')}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCompact(d.totalEnergyKw)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">{t('unit.kw')}</span>
                </p>
                <div className="h-1 w-full bg-muted rounded-full mt-2">
                  <div className="h-1 rounded-full bg-cyan-500" style={{ width: '60%' }} />
                </div>
              </CardContent>
            </Card>

            {/* 8. SLA Breaches */}
            <Card className={d.slaBreachCount > 0 ? 'border-red-500/30' : ''}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t('exec.slaBreaches')}
                </p>
                <p className={`text-2xl font-bold mt-1 ${d.slaBreachCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {formatCompact(d.slaBreachCount)}
                </p>
                <div className="h-1 w-full bg-muted rounded-full mt-2">
                  <div
                    className="h-1 rounded-full bg-red-500"
                    style={{ width: `${d.slaBreachCount > 0 ? Math.min(100, d.slaBreachCount * 10) : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── SECOND ROW: 3 Charts ─────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sites by Technology Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('exec.sitesByTech')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={techPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {techPieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {techPieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sites by Status Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('exec.sitesByStatus')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusPieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {statusPieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SON Actions Today */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-500" />
                  SON Actions Today
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center">
                <p className="text-6xl font-bold">{d.sonActionsToday}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Automated optimizations executed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── THIRD ROW: 4 Metric Cards with Gauges ─────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Network NPI */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  Network NPI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className={`text-3xl font-bold ${healthColor(d.avgNpi)}`}>
                    {formatNumber(d.avgNpi, 1)}
                  </span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Poor</span>
                    <span>Good</span>
                    <span>Excellent</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${healthBg(d.avgNpi)}`}
                      style={{ width: `${d.avgNpi}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>60</span>
                    <span>80</span>
                    <span>100</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. ROI Savings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  {t('exec.costSavings')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${formatCompact(d.totalRoiSaving)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('exec.costAvoidance')}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Savings</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, (d.totalRoiSaving / Math.max(1, d.totalRoiSaving) * 80))}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total savings from network optimizations
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 3. Energy Consumption */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  {t('exec.energyEfficiency')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold">
                    {formatCompact(d.totalEnergyKw)}
                  </span>
                  <span className="text-sm text-muted-foreground">{t('unit.kw')}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('exec.currentDraw')}</span>
                    <span className="font-medium">{d.totalEnergyKw.toLocaleString()} {t('unit.kw')}</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.min(100, (d.totalEnergyKw / (d.totalSites * 5)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{((d.totalEnergyKw ?? 0) / Math.max(1, d.totalSites)).toFixed(1)} kW avg per site
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 4. Customer Experience */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Customer Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className={`text-3xl font-bold ${mosColor(d.avgMos)}`}>
                    {formatNumber(d.avgMos, 2)}
                  </span>
                  <span className="text-sm text-muted-foreground">/5.0</span>
                </div>
                <div className="space-y-2">
                  <StarRating score={d.avgMos} />
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${d.avgMos >= 4 ? 'bg-emerald-500' : d.avgMos >= 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${(d.avgMos / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.avgMos >= 4 ? t('exec.mosExcellent') : d.avgMos >= 3 ? t('exec.mosAcceptable') : t('exec.mosPoor')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}