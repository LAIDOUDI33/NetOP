'use client';
import { useT } from '@/lib/i18n';

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
import {
  Globe, Activity, ShieldCheck, Users, AlertTriangle, Zap,
} from 'lucide-react';
import { TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

type ServiceType = 'voip' | 'video_streaming' | 'web_browsing' | 'iot_mqtt' | 'gaming' | 'video_call';

interface ServiceEntry {
  id: string;
  serviceName: string;
  serviceType: ServiceType;
  technology: Technology;
  region: string;
  mosScore: number | null;
  latencyMs: number | null;
  jitterMs: number | null;
  packetLoss: number | null;
  throughputMbps: number | null;
  availabilityPct: number | null;
  userSatisfaction: number | null;
  activeSessions: number;
  kpiViolations: number;
  slaCompliant: boolean;
  issues: string[];
  timestamp: string;
}

interface ServicesSummary {
  total: number;
  avgMos: number;
  avgLatency: number;
  avgThroughput: number;
  avgAvailability: number;
  totalSessions: number;
  totalViolations: number;
  byServiceType: Record<string, number>;
  byTech: Record<string, number>;
  slaComplianceRate: number;
}

interface ServicesResponse {
  services: ServiceEntry[];
  summary: ServicesSummary;
}

// ─── Service Type Styling ──────────────────────────────────────────────

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  voip: 'svc.voip',
  video_streaming: 'svc.videoStreaming',
  web_browsing: 'svc.webBrowsing',
  iot_mqtt: 'svc.iotMqtt',
  gaming: 'svc.gaming',
  video_call: 'svc.videoCall',
};

const SERVICE_TYPE_COLORS: Record<ServiceType, string> = {
  voip: '#10B981',
  video_streaming: '#F59E0B',
  web_browsing: '#06B6D4',
  iot_mqtt: '#F43F5E',
  gaming: '#F97316',
  video_call: '#EC4899',
};

const SERVICE_TYPE_BG_CLASSES: Record<ServiceType, string> = {
  voip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  video_streaming: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  web_browsing: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  iot_mqtt: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  gaming: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  video_call: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20',
};

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'voip', label: 'svc.voip' },
  { value: 'video_streaming', label: 'svc.videoStreaming' },
  { value: 'web_browsing', label: 'svc.webBrowsing' },
  { value: 'iot_mqtt', label: 'svc.iotMqtt' },
  { value: 'gaming', label: 'svc.gaming' },
  { value: 'video_call', label: 'svc.videoCall' },
];

// ─── Helper Functions ──────────────────────────────────────────────────

function mosColor(score: number | null): string {
  if (score == null) return 'text-muted-foreground';
  if (score >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 3) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function mosBg(score: number | null): string {
  if (score == null) return 'bg-muted';
  if (score >= 4) return 'bg-emerald-500';
  if (score >= 3) return 'bg-amber-500';
  return 'bg-red-500';
}

function slaColor(rate: number): string {
  if (rate >= 95) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 80) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function slaBg(rate: number): string {
  if (rate >= 95) return 'bg-emerald-500';
  if (rate >= 80) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatSessions(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
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

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 6 }).map((_, r) => (
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

export default function ServicesView() {
  const t = useT();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [techFilter, setTechFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<ServicesResponse>({
    queryKey: ['services', serviceTypeFilter, techFilter, regionFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (serviceTypeFilter !== 'all') params.set('serviceType', serviceTypeFilter);
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (regionFilter !== 'all') params.set('region', regionFilter);
      const qs = params.toString();
      return fetch(`/api/services${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const services = data?.services ?? [];
  const summary = data?.summary;

  // Chart data: MOS by Service Type
  const mosByServiceTypeData = summary?.byServiceType
    ? Object.entries(summary.byServiceType)
        .map(([type, avgMos]) => ({
          type: t(SERVICE_TYPE_LABELS[type as ServiceType] ?? type),
          mos: avgMos,
          fill: SERVICE_TYPE_COLORS[type as ServiceType] ?? '#94A3B8',
        }))
        .filter((d) => d.mos > 0)
    : [];

  // Chart data: SLA Compliance PieChart
  const slaRate = summary?.slaComplianceRate ?? 0;
  const nonCompliantRate = Number((100 - slaRate).toFixed(1));
  const slaPieData = [
    { name: t('svc.slaCompliant'), value: Number(slaRate.toFixed(1)), fill: '#10B981' },
    { name: t('svc.nonCompliant'), value: nonCompliantRate, fill: '#EF4444' },
  ];

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
        <TableSkeleton />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Globe className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('empty.noDataFor', { entity: t('svc.title') })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Globe className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('svc.noData')}</p>
        <p className="text-sm mt-1">
          {serviceTypeFilter !== 'all' || techFilter !== 'all' || regionFilter !== 'all'
            ? t('svc.noMatchFilter')
            : t('svc.noDataYet')}
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
          <Globe className="h-6 w-6" />
          {t('svc.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('svc.subtitle')}
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Services */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-500" />
              {t('svc.totalServices')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {summary?.total ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.byServiceType ? Object.keys(summary.byServiceType).length : 0} unique types
            </p>
          </CardContent>
        </Card>

        {/* Avg MOS */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              {t('svc.avgMos')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${mosColor(summary?.avgMos ?? null)}`}>
              {formatNumber(summary?.avgMos ?? 0)}
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${mosBg(summary?.avgMos ?? null)}`}
                style={{ width: `${Math.min(((summary?.avgMos ?? 0) / 5) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Scale: 1 – 5</p>
          </CardContent>
        </Card>

        {/* SLA Compliance Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              {t('svc.complianceRate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${slaColor(slaRate)}`}>
              {formatNumber(slaRate, 1)}%
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${slaBg(slaRate)}`}
                style={{ width: `${Math.min(slaRate, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Target: 95%</p>
          </CardContent>
        </Card>

        {/* Total Active Sessions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {formatSessions(summary?.totalSessions ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>

        {/* Total KPI Violations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              KPI Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {(summary?.totalViolations ?? 0).toLocaleString()}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Across all services</p>
          </CardContent>
        </Card>

        {/* Avg Throughput */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-rose-500" />
              Avg Throughput
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">
              {formatNumber(summary?.avgThroughput ?? 0, 1)}
              <span className="text-base font-normal ml-1">{t('unit.mbps')}</span>
            </span>
            <p className="text-xs text-muted-foreground mt-1">Average download</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MOS by Service Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('svc.mosByType')}</CardTitle>
          </CardHeader>
          <CardContent>
            {mosByServiceTypeData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('empty.noData')}</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mosByServiceTypeData} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="type"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      domain={[0, 5]}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="mos" name="MOS" radius={[4, 4, 0, 0]}>
                      {mosByServiceTypeData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SLA Compliance PieChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('svc.slaDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slaPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {slaPieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('svc.details')}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('svc.serviceType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTypes')}</SelectItem>
                {SERVICE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('filter.technology')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTech')}</SelectItem>
                <SelectItem value="2G">2G</SelectItem>
                <SelectItem value="3G">3G</SelectItem>
                <SelectItem value="4G">4G</SelectItem>
                <SelectItem value="5G">5G</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('filter.region')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allRegions')}</SelectItem>
                <SelectItem value="Lagos">Lagos</SelectItem>
                <SelectItem value="Abuja">Abuja</SelectItem>
                <SelectItem value="Port Harcourt">Port Harcourt</SelectItem>
                <SelectItem value="Kano">Kano</SelectItem>
                <SelectItem value="Ibadan">Ibadan</SelectItem>
              </SelectContent>
            </Select>
            <ExportButton data={services as unknown as Record<string, any>[]} filenamePrefix="services" columns={[{ key: 'serviceName', header: 'Service Name' }, { key: 'serviceType', header: 'Type' }, { key: 'technology', header: 'Technology' }, { key: 'region', header: 'Region' }, { key: 'status', header: 'Status' }, { key: 'qoeScore', header: 'QoE Score' }, { key: 'activeSessions', header: 'Sessions' }, { key: 'avgLatency', header: 'Avg Latency (ms)' }]} />
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('svc.noMatchFilter')}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">{t('th.name')}</TableHead>
                    <TableHead>{t('th.type')}</TableHead>
                    <TableHead>{t('th.tech')}</TableHead>
                    <TableHead>{t('th.region')}</TableHead>
                    <TableHead className="text-right">{t('svc.mos')}</TableHead>
                    <TableHead className="text-right">{t('th.latency')}</TableHead>
                    <TableHead className="text-right">{t('svc.jitter')}</TableHead>
                    <TableHead className="text-right">{t('svc.pktLoss')}</TableHead>
                    <TableHead className="text-right">{t('th.throughput')}</TableHead>
                    <TableHead className="text-right">{t('th.users')}</TableHead>
                    <TableHead>{t('th.sla')}</TableHead>
                    <TableHead className="text-right">{t('th.impactScore')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((svc) => (
                    <TableRow key={svc.id}>
                      <TableCell className="font-medium text-xs max-w-[160px] truncate sticky left-0 bg-background">
                        {svc.serviceName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={SERVICE_TYPE_BG_CLASSES[svc.serviceType]}
                        >
                          {t(SERVICE_TYPE_LABELS[svc.serviceType])}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={TECH_BG_CLASSES[svc.technology]}
                        >
                          {svc.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{svc.region}</TableCell>
                      <TableCell className={`text-right font-medium ${mosColor(svc.mosScore)}`}>
                        {svc.mosScore != null ? formatNumber(svc.mosScore) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {svc.latencyMs != null ? `${formatNumber(svc.latencyMs, 1)} ${t('unit.ms')}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {svc.jitterMs != null ? `${formatNumber(svc.jitterMs, 1)} ${t('unit.ms')}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {svc.packetLoss != null ? `${formatNumber(svc.packetLoss, 2)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {svc.throughputMbps != null ? `${formatNumber(svc.throughputMbps, 1)} ${t('unit.mbps')}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {svc.activeSessions.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={svc.slaCompliant ? 'default' : 'destructive'}
                          className={svc.slaCompliant ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' : ''}
                        >
                          {svc.slaCompliant ? t('svc.slaCompliant') : t('svc.nonCompliant')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {svc.kpiViolations > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium text-xs">
                            {svc.kpiViolations}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
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