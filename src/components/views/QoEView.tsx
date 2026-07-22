'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Activity, Frown, MessageSquareWarning, Radio,
} from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface QoESiteSummary {
  siteId: string;
  siteName: string;
  siteCode: string;
  technology: Technology;
  region: string;
  mosScore: number | null;
  dataRateExperienced: number | null;
  callSetupTime: number | null;
  callDropRate: number | null;
  webPageLoadTime: number | null;
  videoStartTime: number | null;
  pingLatency: number | null;
  jitterExperience: number | null;
  satisfactionIndex: number | null;
  subscriberCount: number;
  complaintCount: number;
  timestamp: string;
}

interface QoESummary {
  totalSites: number;
  avgMosByTech: Record<string, number>;
  avgSatisfactionByTech: Record<string, number>;
  worstSitesBySatisfaction: QoESiteSummary[];
  totalComplaints: number;
}

interface QoESummaryResponse {
  mode: 'summary';
  sites: QoESiteSummary[];
  summary: QoESummary;
  timestamp: string;
}

interface TimelineBucket {
  bucket: string;
  technology: string;
  sampleCount: number;
  avgMosScore: number | null;
  avgDataRateExperienced: number | null;
  avgCallSetupTime: number | null;
  avgCallDropRate: number | null;
  avgWebPageLoadTime: number | null;
  avgVideoStartTime: number | null;
  avgPingLatency: number | null;
  avgJitterExperience: number | null;
  avgSatisfactionIndex: number | null;
  totalSubscriberCount: number;
  totalComplaintCount: number;
}

interface TimelineSite {
  id: string;
  name: string;
  code: string;
  technology: string;
  region: string;
}

interface QoETimelineResponse {
  mode: 'timeline';
  site: TimelineSite;
  timeline: TimelineBucket[];
  from: string;
  to: string;
}

// ─── Helper Functions ──────────────────────────────────────────────────

function mosColor(score: number | null): string {
  if (score == null) return 'text-muted-foreground';
  if (score >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 3) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function satisfactionColor(index: number | null): string {
  if (index == null) return 'text-muted-foreground';
  if (index >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (index >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function satisfactionBg(index: number | null): string {
  if (index == null) return 'bg-muted';
  if (index >= 70) return 'bg-emerald-500';
  if (index >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function computeOverallAvgMos(sites: QoESiteSummary[]): number {
  const valid = sites.filter((s) => s.mosScore != null);
  if (valid.length === 0) return 0;
  return Number((valid.reduce((sum, s) => sum + (s.mosScore ?? 0), 0) / valid.length).toFixed(2));
}

function computeOverallAvgSatisfaction(sites: QoESiteSummary[]): number {
  const valid = sites.filter((s) => s.satisfactionIndex != null);
  if (valid.length === 0) return 0;
  return Number((valid.reduce((sum, s) => sum + (s.satisfactionIndex ?? 0), 0) / valid.length).toFixed(1));
}

function formatBucketTime(bucket: string): string {
  const d = new Date(bucket);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

// ─── MOS Gauge Component ──────────────────────────────────────────────

function MosGauge({ value }: { value: number }) {
  const gaugeColor = value >= 4 ? '#10B981' : value >= 3 ? '#F59E0B' : '#EF4444';
  const data = [
    { name: 'MOS', value, fill: gaugeColor },
  ];
  return (
    <div className="w-full h-20">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="100%"
          innerRadius="65%"
          outerRadius="100%"
          startAngle={180}
          endAngle={0}
          barSize={12}
          data={data}
        >
          <RadialBar
            background={{ fill: 'hsl(var(--muted))' }}
            dataKey="value"
            cornerRadius={6}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-16 w-full" />
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

// ─── Timeline Dialog ──────────────────────────────────────────────────

function TimelineDialog({
  siteId,
  siteName,
  open,
  onOpenChange,
}: {
  siteId: string;
  siteName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { data, isLoading, error } = useQuery<QoETimelineResponse>({
    queryKey: ['qoe', 'timeline', siteId],
    queryFn: () => fetch(`/api/qoe?siteId=${siteId}`).then((r) => r.json()),
    enabled: open && !!siteId,
  });

  const timeline = data?.timeline ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            {siteName} — QoE Timeline
          </DialogTitle>
          <DialogDescription>
            Last 6 hours of quality of experience metrics (hourly buckets)
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-muted-foreground">
            {t('view.failedLoad', { entity: 'timeline' })}
          </div>
        )}

        {!isLoading && !error && timeline.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('qoe.noTimeline')}
          </div>
        )}

        {timeline.length > 0 && (
          <div className="space-y-6">
            {/* MOS Timeline */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-emerald-600 dark:text-emerald-400">
                MOS Score Over Time
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="bucket"
                      tickFormatter={formatBucketTime}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      domain={[0, 5]}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="avgMosScore"
                      name="MOS"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: '#10B981', r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <Separator />

            {/* Satisfaction Timeline */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-amber-600 dark:text-amber-400">
                Satisfaction Index Over Time
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="bucket"
                      tickFormatter={formatBucketTime}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="avgSatisfactionIndex"
                      name="Satisfaction"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={{ fill: '#F59E0B', r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <Separator />

            {/* Data Rate Timeline */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-cyan-600 dark:text-cyan-400">
                Data Rate Over Time
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="bucket"
                      tickFormatter={formatBucketTime}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="avgDataRateExperienced"
                      name="Data Rate (Mbps)"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      dot={{ fill: '#06B6D4', r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function QoEView() {
  const t = useT();
  const [techFilter, setTechFilter] = useState<string>('all');
  const [selectedSite, setSelectedSite] = useState<{ id: string; name: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError } = useQuery<QoESummaryResponse>({
    queryKey: ['qoe', techFilter],
    queryFn: () => {
      const params = techFilter !== 'all' ? `?technology=${techFilter}` : '';
      return fetch(`/api/qoe${params}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const sites = data?.sites ?? [];
  const summary = data?.summary;
  const worstSites = summary?.worstSitesBySatisfaction ?? [];
  const mosByTechData = summary?.avgMosByTech
    ? Object.entries(summary.avgMosByTech).map(([tech, value]) => ({
        tech,
        mos: value,
        fill: TECH_COLORS[tech as Technology] ?? '#94A3B8',
      }))
    : [];
  const satByTechData = summary?.avgSatisfactionByTech
    ? Object.entries(summary.avgSatisfactionByTech).map(([tech, value]) => ({
        tech,
        satisfaction: value,
        fill: TECH_COLORS[tech as Technology] ?? '#94A3B8',
      }))
    : [];

  const overallMos = computeOverallAvgMos(sites);
  const overallSatisfaction = computeOverallAvgSatisfaction(sites);

  const filteredSites =
    techFilter === 'all'
      ? sites
      : sites.filter((s) => s.technology === techFilter);

  const handleSiteClick = (siteId: string, siteName: string) => {
    setSelectedSite({ id: siteId, name: siteName });
    setDialogOpen(true);
  };

  // ─── Render: Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-72 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <KpiCardsSkeleton />
        <ChartSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TableSkeleton rows={5} cols={5} />
          <ChartSkeleton />
        </div>
        <TableSkeleton rows={8} cols={14} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: 'QoE' })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Radio className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('empty.noDataFor', { entity: 'QoE' })}</p>
        <p className="text-sm mt-1">
          {techFilter !== 'all'
            ? `No sites found for ${techFilter} technology.`
            : 'QoE metrics have not been collected yet.'}
        </p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title.qoe')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time subscriber quality tracking across all technologies
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Avg MOS Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Avg MOS Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <span className={`text-3xl font-bold ${mosColor(overallMos)}`}>
                  {formatNumber(overallMos)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Scale: 1 – 5</p>
              </div>
              <MosGauge value={overallMos} />
            </div>
          </CardContent>
        </Card>

        {/* Avg Satisfaction Index */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Frown className="h-4 w-4 text-amber-500" />
              Avg Satisfaction Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${satisfactionColor(overallSatisfaction)}`}>
              {formatNumber(overallSatisfaction, 1)}
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${satisfactionBg(overallSatisfaction)}`}
                style={{ width: `${Math.min(overallSatisfaction, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Scale: 0 – 100</p>
          </CardContent>
        </Card>

        {/* Total Complaints */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquareWarning className="h-4 w-4 text-red-500" />
              Total Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary?.totalComplaints ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Across all tracked sites</p>
          </CardContent>
        </Card>

        {/* Sites Tracked */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-500" />
              Sites Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {summary?.totalSites ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {techFilter === 'all' ? 'All technologies' : techFilter + ' technology'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MOS by Technology Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('qoe.mosByTech')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mosByTechData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="tech"
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
                  {mosByTechData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Two-column grid: Worst Sites + Satisfaction by Tech */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Worst Performing Sites */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Frown className="h-4 w-4 text-red-500" />
              Worst Performing Sites
            </CardTitle>
          </CardHeader>
          <CardContent>
            {worstSites.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t('empty.noData')}
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('th.site')}</TableHead>
                      <TableHead>{t('th.tech')}</TableHead>
                      <TableHead className="text-right">{t('svc.mos')}</TableHead>
                      <TableHead className="text-right">{t('svc.satisfaction')}</TableHead>
                      <TableHead className="text-right">Complaints</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worstSites.map((site) => (
                      <TableRow
                        key={site.siteId}
                        className="cursor-pointer"
                        onClick={() => handleSiteClick(site.siteId, site.siteName)}
                      >
                        <TableCell className="font-medium text-xs max-w-[140px] truncate">
                          {site.siteName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={TECH_BG_CLASSES[site.technology]}
                          >
                            {site.technology}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${mosColor(site.mosScore)}`}>
                          {site.mosScore != null ? formatNumber(site.mosScore) : '—'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${satisfactionColor(site.satisfactionIndex)}`}>
                          {site.satisfactionIndex != null ? formatNumber(site.satisfactionIndex, 1) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {site.complaintCount > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {site.complaintCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
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

        {/* Satisfaction by Technology */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('qoe.satisfaction')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={satByTechData} barSize={32} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="tech"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={32}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="satisfaction" name="Satisfaction" radius={[0, 4, 4, 0]}>
                    {satByTechData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Site QoE Details Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('qoe.details')}</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('filter.technology')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.allTechShort')}</SelectItem>
              <SelectItem value="2G">2G</SelectItem>
              <SelectItem value="3G">3G</SelectItem>
              <SelectItem value="4G">4G</SelectItem>
              <SelectItem value="5G">5G</SelectItem>
            </SelectContent>
          </Select>
            <ExportButton data={filteredSites} filenamePrefix="qoe" columns={[{ key: 'siteName', header: 'Site' }, { key: 'technology', header: 'Technology' }, { key: 'region', header: 'Region' }, { key: 'mosScore', header: 'MOS' }, { key: 'satisfactionIndex', header: 'Satisfaction' }, { key: 'dataRateExperienced', header: 'Data Rate' }, { key: 'pingLatency', header: 'Ping Latency' }]} />
          </div>
        </CardHeader>
        <CardContent>
          {filteredSites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('empty.noMatchShort')}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Site</TableHead>
                    <TableHead className="sticky left-[140px] bg-background z-10">{t('th.code')}</TableHead>
                    <TableHead>Tech</TableHead>
                    <TableHead>{t('th.region')}</TableHead>
                    <TableHead className="text-right">MOS</TableHead>
                    <TableHead className="text-right">{t('th.dataRate')}</TableHead>
                    <TableHead className="text-right">{t('th.callSetup')}</TableHead>
                    <TableHead className="text-right">{t('th.pageLoad')}</TableHead>
                    <TableHead className="text-right">{t('th.videoStart')}</TableHead>
                    <TableHead className="text-right">{t('th.latency')}</TableHead>
                    <TableHead className="text-right">{t('svc.jitter')}</TableHead>
                    <TableHead className="text-right">Satisfaction</TableHead>
                    <TableHead className="text-right">{t('th.users')}</TableHead>
                    <TableHead className="text-right">Complaints</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map((site) => (
                    <TableRow
                      key={site.siteId}
                      className="cursor-pointer"
                      onClick={() => handleSiteClick(site.siteId, site.siteName)}
                    >
                      <TableCell className="font-medium text-xs max-w-[140px] truncate sticky left-0 bg-background">
                        {site.siteName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground sticky left-[140px] bg-background">
                        {site.siteCode}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={TECH_BG_CLASSES[site.technology]}
                        >
                          {site.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{site.region}</TableCell>
                      <TableCell className={`text-right font-medium ${mosColor(site.mosScore)}`}>
                        {site.mosScore != null ? formatNumber(site.mosScore) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {site.dataRateExperienced != null
                          ? `${formatNumber(site.dataRateExperienced, 1)} Mbps`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {site.callSetupTime != null
                          ? `${formatNumber(site.callSetupTime, 1)} ms`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {site.webPageLoadTime != null
                          ? `${formatNumber(site.webPageLoadTime, 1)} ms`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {site.videoStartTime != null
                          ? `${formatNumber(site.videoStartTime, 1)} ms`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {site.pingLatency != null
                          ? `${formatNumber(site.pingLatency, 1)} ms`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {site.jitterExperience != null
                          ? `${formatNumber(site.jitterExperience, 1)} ms`
                          : '—'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${satisfactionColor(site.satisfactionIndex)}`}>
                        {site.satisfactionIndex != null ? formatNumber(site.satisfactionIndex, 1) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {site.subscriberCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {site.complaintCount > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium text-xs">
                            {site.complaintCount}
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

      {/* Timeline Dialog */}
      {selectedSite && (
        <TimelineDialog
          siteId={selectedSite.id}
          siteName={selectedSite.name}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}
