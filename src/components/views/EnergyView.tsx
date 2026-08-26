'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
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

import { Zap, Moon, Thermometer, Leaf, Battery } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber, TECHNOLOGIES } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface EnergyMetric {
  id: string;
  siteId: string;
  siteName: string | null;
  siteCode: string | null;
  technology: Technology;
  timestamp: string;
  powerConsumption: number;
  energyConsumed: number;
  activeUsers: number;
  trafficLoad: number;
  temperature: number;
  sleepMode: boolean;
  mode: 'normal' | 'energy_saving' | 'sleep' | 'shutdown';
  co2Emission: number;
  solarGeneration: number | null;
  batteryLevel: number | null;
  createdAt: string;
}

interface EnergySummary {
  totalSites: number;
  totalPowerKw: number;
  totalCO2kg: number;
  avgTemp: number;
  sleepModeCount: number;
  energySavingPct: number;
  byTech: Record<string, number>;
  byMode: Record<string, number>;
}

interface EnergyResponse {
  metrics: EnergyMetric[];
  summary: EnergySummary | null;
}

// ─── Helper Functions ──────────────────────────────────────────────────

function tempColor(temp: number): string {
  if (temp > 45) return 'text-red-600 dark:text-red-400';
  if (temp > 35) return 'text-amber-600 dark:text-amber-400';
  return 'text-foreground';
}

const MODE_LABELS: Record<string, string> = {
  normal: 'Normal',
  energy_saving: 'Energy Saving',
  sleep: 'Sleep',
  shutdown: 'Shutdown',
};

const MODE_BADGE_VARIANT: Record<string, 'outline' | 'secondary' | 'destructive'> = {
  normal: 'outline',
  energy_saving: 'secondary',
  sleep: 'secondary',
  shutdown: 'destructive',
};

const PIE_COLORS: Record<string, string> = {
  normal: '#10B981',
  energy_saving: '#F59E0B',
  sleep: '#94A3B8',
  shutdown: '#EF4444',
};

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

// ─── Custom Chart Tooltip ─────────────────────────────────────────────

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}
function ChartTooltipContent({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
}
function PieTooltipContent({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.payload.fill }} />
        <span className="font-medium">{d.name}:</span>
        <span>{d.value} sites</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function EnergyView() {
  const t = useT();
  const [techFilter, setTechFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<EnergyResponse>({
    queryKey: ['energy', { technology: techFilter, mode: modeFilter }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (modeFilter !== 'all') params.set('mode', modeFilter);
      const qs = params.toString();
      return fetch(`/api/energy${qs ? `?${qs}` : ''}`).then((r) => { if (!r.ok) throw new Error('Energy API error: ' + r.status); return r.json(); });
    },
    refetchInterval: 30000,
  });

  const metrics = data?.metrics ?? [];
  const summary = data?.summary;

  // ─── Chart Data ──────────────────────────────────────────────────────

  // Power by Technology: sum powerConsumption/1000 per tech
  const powerByTech = TECHNOLOGIES.map((tech) => {
    const group = metrics.filter((m) => m.technology === tech);
    const totalPowerKw = group.reduce((sum, m) => sum + m.powerConsumption / 1000, 0);
    return {
      tech,
      power: Number(totalPowerKw.toFixed(2)),
      fill: TECH_COLORS[tech],
    };
  }).filter((d) => d.power > 0);

  // CO₂ by Technology: sum co2Emission per tech
  const co2ByTech = TECHNOLOGIES.map((tech) => {
    const group = metrics.filter((m) => m.technology === tech);
    const totalCO2 = group.reduce((sum, m) => sum + (m.co2Emission || 0), 0);
    return {
      tech,
      co2: Number(totalCO2.toFixed(2)),
      fill: TECH_COLORS[tech],
    };
  }).filter((d) => d.co2 > 0);

  // Energy Mode Distribution (donut)
  const modeDistribution = Object.entries(summary?.byMode ?? {}).map(([mode, count]) => ({
    name: MODE_LABELS[mode] ?? mode,
    value: count,
    fill: PIE_COLORS[mode] ?? '#94A3B8',
  }));

  // Sorted table data
  const sortedMetrics = [...metrics].sort((a, b) => b.powerConsumption - a.powerConsumption);

  // ─── Render: Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-72 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Zap className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: 'Energy' })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Battery className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('empty.noEnergyData')}</p>
        <p className="text-sm mt-1">
          {(techFilter !== 'all' || modeFilter !== 'all')
            ? t('empty.noMatchShort')
            : t('view.noDataYet', { entity: 'Energy metrics' })}
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
          <Zap className="h-6 w-6 text-amber-500" />
          {t('en.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Power consumption optimization and carbon footprint monitoring
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Power */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Total Power
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {formatNumber(summary?.totalPowerKw ?? 0, 1)}
              <span className="text-base font-normal text-muted-foreground ml-1">kW</span>
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.totalSites ?? 0} sites
            </p>
          </CardContent>
        </Card>

        {/* CO₂ Emissions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-500" />
              CO₂ Emissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {formatNumber(summary?.totalCO2kg ?? 0, 1)}
              <span className="text-base font-normal text-muted-foreground ml-1">kg</span>
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('en.carbonFootprint')}</p>
          </CardContent>
        </Card>

        {/* Avg Temperature */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-red-500" />
              Avg Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${tempColor(summary?.avgTemp ?? 0)}`}>
              {formatNumber(summary?.avgTemp ?? 0, 1)}
              <span className="text-base font-normal text-muted-foreground ml-1">°C</span>
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('en.acrossAllSites')}</p>
          </CardContent>
        </Card>

        {/* Sites in Sleep Mode */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Moon className="h-4 w-4 text-slate-500" />
              Sites in Sleep Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-slate-600 dark:text-slate-300">
              {summary?.sleepModeCount ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              of {summary?.totalSites ?? 0} sites
            </p>
          </CardContent>
        </Card>

        {/* Energy Saving */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-500" />
              Energy Saving
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(summary?.energySavingPct ?? 0, 1)}
              <span className="text-base font-normal text-muted-foreground ml-1">%</span>
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('en.vsNormal')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Power by Technology */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('eng.powerByTech')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {powerByTech.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={powerByTech} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="tech"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v: number) => `${v} kW`}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="power" name="Power (kW)" radius={[4, 4, 0, 0]}>
                      {powerByTech.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {t('empty.noData')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Energy Mode Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('eng.modeDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {modeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {modeDistribution.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltipContent />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-xs text-muted-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CO₂ Emission by Technology */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('eng.co2ByTech')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {co2ByTech.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={co2ByTech} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="tech"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v: number) => `${v} kg`}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="co2" name="CO₂ (kg)" radius={[4, 4, 0, 0]}>
                      {co2ByTech.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Energy Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('eng.siteDetails')}</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('filter.technology')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTechShort')}</SelectItem>
                {TECHNOLOGIES.map((tech) => (
                  <SelectItem key={tech} value={tech}>
                    {tech}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t('filter.mode')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allModes')}</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="energy_saving">Energy Saving</SelectItem>
                <SelectItem value="sleep">Sleep</SelectItem>
                <SelectItem value="shutdown">Shutdown</SelectItem>
              </SelectContent>
            </Select>
            <ExportButton data={sortedMetrics} filenamePrefix="energy" columns={[{ key: 'siteName', header: 'Site' }, { key: 'technology', header: 'Technology' }, { key: 'powerConsumption', header: 'Power (W)' }, { key: 'energyConsumed', header: 'Energy (Wh)' }, { key: 'activeUsers', header: 'Users' }, { key: 'trafficLoad', header: 'Load %' }, { key: 'temperature', header: 'Temp °C' }, { key: 'mode', header: 'Mode' }, { key: 'co2Emission', header: 'CO₂ (g)' }, { key: 'sleepMode', header: 'Sleep Mode' }]} />
          </div>
        </CardHeader>
        <CardContent>
          {sortedMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No sites match the selected filters.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">{t('th.site')}</TableHead>
                    <TableHead>{t('th.tech')}</TableHead>
                    <TableHead className="text-right">Power (W)</TableHead>
                    <TableHead className="text-right">Energy (Wh)</TableHead>
                    <TableHead className="text-right">{t('en.colUsers')}</TableHead>
                    <TableHead className="text-right">Load %</TableHead>
                    <TableHead className="text-right">Temp °C</TableHead>
                    <TableHead>{t('th.status')}</TableHead>
                    <TableHead className="text-right">CO₂ (g)</TableHead>
                    <TableHead>Sleep?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMetrics.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-xs max-w-[180px] sticky left-0 bg-background">
                        <div>{m.siteName || m.siteId}</div>
                        {m.siteCode && (
                          <div className="text-muted-foreground text-[10px] mt-0.5">{m.siteCode}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={TECH_BG_CLASSES[m.technology]}
                        >
                          {m.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs">
                        {formatNumber(m.powerConsumption, 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(m.energyConsumed, 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {m.activeUsers}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(m.trafficLoad, 1)}
                      </TableCell>
                      <TableCell className={`text-right font-medium text-xs ${tempColor(m.temperature)}`}>
                        {formatNumber(m.temperature, 1)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={MODE_BADGE_VARIANT[m.mode] ?? 'outline'}>
                          {MODE_LABELS[m.mode] ?? m.mode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(m.co2Emission, 2)}
                      </TableCell>
                      <TableCell>
                        {m.sleepMode ? (
                          <Badge variant="secondary">{t('status.yes')}</Badge>
                        ) : (
                          <Badge variant="outline">{t('status.no')}</Badge>
                        )}
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