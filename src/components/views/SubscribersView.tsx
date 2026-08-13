'use client';

import { useState, useMemo } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber, TECHNOLOGIES } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────

interface Segment {
  id: string;
  segmentName: string;
  technology: Technology;
  criteria: {
    dataRange?: string;
    usagePattern?: string;
    deviceType?: string;
  };
  subscriberCount: number;
  avgDataUsage: number;
  avgVoiceMinutes: number;
  arpu: number;
  churnRisk: number;
  satisfactionScore: number;
  topServices: string[];
  peakHour: string;
  createdAt: string;
  updatedAt: string;
}

interface SubscribersSummary {
  totalSegments: number;
  totalSubscribers: number;
  totalARPU: number;
  avgChurnRisk: number;
  byTech: Record<string, number>;
}

interface SubscribersResponse {
  segments: Segment[];
  summary: SubscribersSummary;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatSubscribers(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

function formatARPU(n: number): string {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + formatNumber(n);
}

function churnColor(risk: number): string {
  if (risk < 0.15) return 'text-emerald-600 dark:text-emerald-400';
  if (risk < 0.3) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function churnBg(risk: number): string {
  if (risk < 0.15) return 'bg-emerald-500';
  if (risk < 0.3) return 'bg-amber-500';
  return 'bg-red-500';
}

function churnBadgeClasses(risk: number): string {
  if (risk < 0.15) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
  if (risk < 0.3) return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
  return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20';
}

function satisfactionColor(score: number): string {
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

const TECH_COLOR_VALUES = Object.values(TECH_COLORS);

function formatServiceName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Loading Skeletons ──────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-36" />
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

// ─── Main Component ──────────────────────────────────────────────────

export default function SubscribersView() {
  const t = useT();
  const [technology, setTechnology] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<SubscribersResponse>({
    queryKey: ['subscribers', technology],
    queryFn: () => {
      const params = technology !== 'all' ? `?technology=${technology}` : '';
      return fetch(`/api/subscribers${params}`).then((r) => { if (!r.ok) throw new Error('Subscribers API error: ' + r.status); return r.json(); });
    },
    refetchInterval: 30000,
  });

  const segments = data?.segments ?? [];
  const summary = data?.summary;

  // ── Computed: Avg satisfaction ──
  const avgSatisfaction = useMemo(() => {
    if (segments.length === 0) return 0;
    const sum = segments.reduce((acc, s) => acc + s.satisfactionScore, 0);
    return Number((sum / segments.length).toFixed(1));
  }, [segments]);

  // ── Computed: Top Services Bar Chart Data ──
  const topServicesData = useMemo(() => {
    const serviceCounts: Record<string, number> = {};
    for (const seg of segments) {
      for (const svc of seg.topServices) {
        serviceCounts[svc] = (serviceCounts[svc] || 0) + 1;
      }
    }
    return Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count], idx) => ({
        name: formatServiceName(name),
        count,
        fill: TECH_COLOR_VALUES[idx % TECH_COLOR_VALUES.length],
      }));
  }, [segments]);

  // ── Computed: ARPU by Segment (sorted desc) ──
  const arpuBySegmentData = useMemo(() => {
    return [...segments]
      .sort((a, b) => b.arpu - a.arpu)
      .map((seg) => ({
        name: seg.segmentName,
        arpu: seg.arpu,
        fill: TECH_COLORS[seg.technology] ?? '#94A3B8',
      }));
  }, [segments]);

  // ── Computed: Churn Risk by Segment ──
  const churnBySegmentData = useMemo(() => {
    return segments.map((seg) => ({
      name: seg.segmentName,
      churnRisk: Number(((seg.churnRisk ?? 0) * 100).toFixed(1)),
    }));
  }, [segments]);

  // ── Render: Loading State ──────────────────────────────────────────
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
        <TableSkeleton />
      </div>
    );
  }

  // ── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Users className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('empty.noDataFor', { entity: t('sub.title') })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ── Render: Empty State ────────────────────────────────────────────
  if (!data || segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Users className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('sub.noData')}</p>
        <p className="text-sm mt-1">
          {technology !== 'all'
            ? t('sub.noSegForTech', { technology })
            : t('view.noDataConfigured', { entity: 'Subscriber segments' })}
        </p>
      </div>
    );
  }

  // ── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" />
            Subscriber Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Customer segmentation, ARPU analysis, and churn prediction
          </p>
        </div>

        {/* Technology Filter */}
        <Select value={technology} onValueChange={setTechnology}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('filter.technology')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allTech')}</SelectItem>
            {TECHNOLOGIES.map((tech) => (
              <SelectItem key={tech} value={tech}>{tech}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Subscribers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              {t('sub.totalSubscribers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {formatSubscribers(summary?.totalSubscribers ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {technology === 'all' ? 'All technologies' : technology + ' technology'}
            </p>
          </CardContent>
        </Card>

        {/* Total ARPU */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="text-base font-semibold text-emerald-500">$</span>
              {t('sub.totalArpu')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatARPU(summary?.totalARPU ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {t('sub.avgRevenuePerUser')}
            </p>
          </CardContent>
        </Card>

        {/* Avg Churn Risk */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-amber-500" />
              {t('sub.churnRate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${churnColor(summary?.avgChurnRisk ?? 0)}`}>
              {((summary?.avgChurnRisk ?? 0) * 100).toFixed(1)}%
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${churnBg(summary?.avgChurnRisk ?? 0)}`}
                style={{ width: `${Math.min((summary?.avgChurnRisk ?? 0) * 100 * 3, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Predicted turnover rate
            </p>
          </CardContent>
        </Card>

        {/* Segments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-cyan-500" />
              {t('sub.segments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {summary?.totalSegments ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              Active customer segments
            </p>
          </CardContent>
        </Card>

        {/* Avg Satisfaction */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500" />
              Avg Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${satisfactionColor(avgSatisfaction)}`}>
              {formatNumber(avgSatisfaction, 1)}/100
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  avgSatisfaction >= 70
                    ? 'bg-emerald-500'
                    : avgSatisfaction >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(avgSatisfaction, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cross-segment average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Services Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('sub.topServices')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topServicesData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="Segments" radius={[4, 4, 0, 0]}>
                    {topServicesData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ARPU by Segment (Horizontal) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('sub.arpuBySeg')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={arpuBySegmentData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
                          <p className="font-medium mb-1">{payload[0].payload.name}</p>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: payload[0].color }} />
                            <span className="text-muted-foreground">ARPU:</span>
                            <span className="font-medium">${formatNumber(payload[0].value as number)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="arpu" name="ARPU" radius={[0, 4, 4, 0]}>
                    {arpuBySegmentData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Churn Risk by Segment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('sub.churnBySeg')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={churnBySegmentData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
                          <p className="font-medium mb-1">{label}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Churn Risk:</span>
                            <span className="font-medium">{formatNumber(payload[0].value as number, 1)}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="churnRisk" name="Churn Risk" radius={[4, 4, 0, 0]}>
                    {churnBySegmentData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          entry.churnRisk < 15
                            ? '#10B981'
                            : entry.churnRisk < 30
                              ? '#F59E0B'
                              : '#EF4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Full Segment Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('sub.segments')}</CardTitle>
          <ExportButton data={segments} filenamePrefix="subscribers" columns={[{ key: 'segmentName', header: t('th.segment') }, { key: 'technology', header: t('th.technology') }, { key: 'subscriberCount', header: t('th.subscribers') }, { key: 'avgDataUsage', header: t('th.avgDataGb') }, { key: 'arpu', header: t('th.arpu') }, { key: 'churnRisk', header: t('th.churnRisk') }, { key: 'satisfactionScore', header: t('th.satisfaction') }, { key: 'peakHour', header: t('th.peakHour') }]} />
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">{t('th.segmentName')}</TableHead>
                  <TableHead>{t('th.tech')}</TableHead>
                  <TableHead className="text-right">{t('th.users')}</TableHead>
                  <TableHead className="text-right">Avg Data (GB)</TableHead>
                  <TableHead className="text-right">Voice (min)</TableHead>
                  <TableHead className="text-right">ARPU ($)</TableHead>
                  <TableHead className="text-center">{t('th.churnRisk')}</TableHead>
                  <TableHead className="text-right">{t('crm.colSatisfaction')}</TableHead>
                  <TableHead>{t('th.peakHour')}</TableHead>
                  <TableHead className="min-w-[180px]">{t('th.topServices')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((seg) => {
                  const visibleServices = seg.topServices.slice(0, 3);
                  const moreCount = seg.topServices.length - 3;

                  return (
                    <TableRow key={seg.id}>
                      {/* Segment Name */}
                      <TableCell className="font-medium">{seg.segmentName}</TableCell>

                      {/* Tech Badge */}
                      <TableCell>
                        <Badge variant="outline" className={TECH_BG_CLASSES[seg.technology]}>
                          {seg.technology}
                        </Badge>
                      </TableCell>

                      {/* Subscribers */}
                      <TableCell className="text-right">
                        {formatSubscribers(seg.subscriberCount)}
                      </TableCell>

                      {/* Avg Data Usage */}
                      <TableCell className="text-right">
                        {formatNumber(seg.avgDataUsage, 1)}
                      </TableCell>

                      {/* Voice Minutes */}
                      <TableCell className="text-right">
                        {formatNumber(seg.avgVoiceMinutes, 0)}
                      </TableCell>

                      {/* ARPU */}
                      <TableCell className="text-right">
                        ${formatNumber(seg.arpu)}
                      </TableCell>

                      {/* Churn Risk Badge */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={churnBadgeClasses(seg.churnRisk)}
                        >
                          {((seg.churnRisk ?? 0) * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>

                      {/* Satisfaction */}
                      <TableCell className={`text-right font-medium ${satisfactionColor(seg.satisfactionScore)}`}>
                        {formatNumber(seg.satisfactionScore, 1)}
                      </TableCell>

                      {/* Peak Hour */}
                      <TableCell className="text-muted-foreground">
                        {seg.peakHour}
                      </TableCell>

                      {/* Top Services Badges */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {visibleServices.map((svc) => (
                            <Badge key={svc} variant="secondary" className="text-xs">
                              {formatServiceName(svc)}
                            </Badge>
                          ))}
                          {moreCount > 0 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              +{moreCount} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
