'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, ZAxis,
  BarChart, Bar, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import {
  Tooltip as ShTooltip,
  TooltipContent as ShTooltipContent,
  TooltipProvider as ShTooltipProvider,
  TooltipTrigger as ShTooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Brain, AlertTriangle, Search, CheckCircle, XCircle, Activity,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  TECH_COLORS, TECH_BG_CLASSES, SEVERITY_BADGE_VARIANT, TECHNOLOGIES, formatNumber,
} from '@/lib/constants';
import type { Technology, AlertSeverity } from '@/types';

// ─── Types matching the API response ───────────────────────────────────
type AnomalySeverity = 'critical' | 'major' | 'minor';
type AnomalyStatus = 'detected' | 'investigating' | 'resolved' | 'false_positive';

interface AnomalyItem {
  id: string;
  siteId?: string;
  siteName?: string;
  siteCode?: string;
  technology: Technology;
  metric: string;
  actualValue: number;
  expectedValue: number;
  zScore: number;
  description: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  createdAt: string;
  resolvedAt?: string;
}

interface AnomalyStats {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byTech: Record<string, number>;
}

interface AnomalyResponse {
  anomalies: AnomalyItem[];
  stats: AnomalyStats;
}

const SEVERITY_SCATTER_COLORS: Record<AnomalySeverity, string> = {
  critical: '#EF4444',
  major: '#F59E0B',
  minor: '#06B6D4',
};

// Map API severity to AlertSeverity for badge styling
function severityToBadgeVariant(sev: AnomalySeverity): 'destructive' | 'secondary' | 'outline' {
  if (sev === 'critical') return 'destructive';
  if (sev === 'major') return 'secondary';
  return 'outline';
}

// ─── Loading Skeleton ─────────────────────────────────────────────────
function AnomalyLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-6"><Skeleton className="h-80 w-full" /></CardContent></Card>
      <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
export default function AnomalyDetectionView() {
  const t = useT();
  const queryClient = useQueryClient();
  const [techFilter, setTechFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryParams = new URLSearchParams();
  if (techFilter !== 'all') queryParams.set('technology', techFilter);
  if (severityFilter !== 'all') queryParams.set('severity', severityFilter);
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  const qs = queryParams.toString();

  const { data, isLoading } = useQuery<AnomalyResponse>({
    queryKey: ['anomalies', techFilter, severityFilter, statusFilter],
    queryFn: () => fetch(`/api/anomalies${qs ? `?${qs}` : ''}`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: (body: { anomalyId: string; status: AnomalyStatus }) =>
      fetch('/api/anomalies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });

  const handleStatusChange = useCallback(
    (anomalyId: string, newStatus: string) => {
      updateMutation.mutate({ anomalyId, status: newStatus as AnomalyStatus });
    },
    [updateMutation],
  );

  if (isLoading || !data) return <AnomalyLoadingSkeleton />;

  const { anomalies, stats } = data;

  // Derived summary from stats
  const summaryCounts = {
    total: stats.total,
    active: (stats.byStatus?.detected ?? 0) + (stats.byStatus?.investigating ?? 0),
    resolved: stats.byStatus?.resolved ?? 0,
    falsePositive: stats.byStatus?.false_positive ?? 0,
    critical: stats.bySeverity?.critical ?? 0,
    major: stats.bySeverity?.major ?? 0,
    minor: stats.bySeverity?.minor ?? 0,
  };

  // Scatter chart data
  const scatterData = anomalies.map(a => ({
    x: a.createdAt,
    y: a.zScore,
    z: a.severity === 'critical' ? 80 : a.severity === 'major' ? 50 : 30,
    fill: SEVERITY_SCATTER_COLORS[a.severity] ?? '#06B6D4',
    technology: a.technology,
    severity: a.severity,
    site: a.siteName || a.siteCode || t('anomaly.unknown'),
    metric: a.metric,
    description: a.description,
  }));

  const criticalData = scatterData.filter(d => d.severity === 'critical');
  const majorData = scatterData.filter(d => d.severity === 'major');
  const minorData = scatterData.filter(d => d.severity === 'minor');

  // Detection summary: count by technology
  const byTech = TECHNOLOGIES.map(tech => ({
    technology: tech,
    count: anomalies.filter(a => a.technology === tech).length,
    fill: TECH_COLORS[tech],
  }));

  // Detection summary: count by metric (top 8)
  const metricCounts = new Map<string, number>();
  anomalies.forEach(a => {
    metricCounts.set(a.metric, (metricCounts.get(a.metric) ?? 0) + 1);
  });
  const byMetric = Array.from(metricCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ metric: name, count }));

  const METRIC_CHART_COLORS = ['#10B981', '#06B6D4', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6'];

  const severityLabels: Record<string, string> = {
    critical: t('status.critical'),
    major: t('status.major'),
    minor: t('status.minor'),
  };

  const statusLabels: Record<string, string> = {
    detected: t('status.detected'),
    investigating: t('status.investigating'),
    resolved: t('status.resolved'),
    false_positive: t('status.falsePositive'),
  };

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('anomaly.totalDetected')}</p>
                <p className="text-2xl font-bold">{summaryCounts.total}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('anomaly.active')}</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summaryCounts.active}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('anomaly.resolved')}</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summaryCounts.resolved}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('anomaly.falsePositives')}</p>
                <p className="text-2xl font-bold text-slate-500">{summaryCounts.falsePositive}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4" />
              {t('anomaly.filters')}
            </div>
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('filter.technology')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTech')}</SelectItem>
                {TECHNOLOGIES.map(tech => (
                  <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t('filter.severity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allSeverities')}</SelectItem>
                <SelectItem value="critical">{t('status.critical')}</SelectItem>
                <SelectItem value="major">{t('status.major')}</SelectItem>
                <SelectItem value="minor">{t('status.minor')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('filter.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
                <SelectItem value="detected">{t('status.detected')}</SelectItem>
                <SelectItem value="investigating">{t('status.investigating')}</SelectItem>
                <SelectItem value="resolved">{t('status.resolved')}</SelectItem>
                <SelectItem value="false_positive">{t('status.falsePositive')}</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              {t('anomaly.results', { n: anomalies.length })}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Anomaly Timeline (Scatter Chart) ───────────────────────── */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base font-semibold">{t('anomaly.timeline')}</CardTitle>
            <Badge variant="outline" className="text-xs ml-auto">{t('anomaly.zScoreThreshold')}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="x"
                  name="Time"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => {
                    try {
                      const d = new Date(v);
                      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
                    } catch { return ''; }
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  dataKey="y"
                  name="Z-Score"
                  tick={{ fontSize: 11 }}
                  domain={[0, 'auto']}
                />
                <ZAxis dataKey="z" range={[40, 200]} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Z-Score') return [value.toFixed(2), 'Z-Score'];
                    return [value, name];
                  }}
                  labelFormatter={(_label: string, payload) => {
                    const item = payload?.[0]?.payload;
                    if (!item) return '';
                    return `${item.site} — ${item.technology} — ${item.metric}`;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value: string) => {
                    return severityLabels[value] ?? value;
                  }}
                />
                <ReferenceLine
                  y={2.5}
                  stroke="#EF4444"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{ value: t('anomaly.threshold'), position: 'insideTopRight', fill: '#EF4444', fontSize: 11 }}
                />
                {criticalData.length > 0 && (
                  <Scatter name="critical" data={criticalData} fill={SEVERITY_SCATTER_COLORS.critical} />
                )}
                {majorData.length > 0 && (
                  <Scatter name="major" data={majorData} fill={SEVERITY_SCATTER_COLORS.major} />
                )}
                {minorData.length > 0 && (
                  <Scatter name="minor" data={minorData} fill={SEVERITY_SCATTER_COLORS.minor} />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Anomaly Table ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-base font-semibold">{t('anomaly.details')}</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {anomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Brain className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">{t('anomaly.noMatch')}</p>
              <p className="text-xs">{t('anomaly.tryAdjust')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">{t('th.severity')}</TableHead>
                    <TableHead>{t('th.site')}</TableHead>
                    <TableHead className="w-[80px]">{t('th.tech')}</TableHead>
                    <TableHead>{t('th.metric')}</TableHead>
                    <TableHead className="w-[90px] text-right">{t('th.zScore')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('th.description')}</TableHead>
                    <TableHead className="w-[160px]">{t('th.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map(anomaly => (
                    <TableRow key={anomaly.id}>
                      <TableCell>
                        <Badge variant={severityToBadgeVariant(anomaly.severity)}>
                          {anomaly.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{anomaly.siteName || anomaly.siteCode || t('anomaly.unknown')}</TableCell>
                      <TableCell>
                        <Badge className={TECH_BG_CLASSES[anomaly.technology]}>
                          {anomaly.technology}
                        </Badge>
                      </TableCell>
                      <TableCell>{anomaly.metric}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span
                          className={
                            anomaly.zScore >= 4
                              ? 'text-red-600 dark:text-red-400 font-bold'
                              : anomaly.zScore >= 3
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : 'text-cyan-600 dark:text-cyan-400'
                          }
                        >
                          {formatNumber(anomaly.zScore)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        <ShTooltipProvider>
                          <ShTooltip>
                            <ShTooltipTrigger className="cursor-help text-left truncate block">
                              {anomaly.description}
                            </ShTooltipTrigger>
                            <ShTooltipContent className="max-w-xs">{anomaly.description}</ShTooltipContent>
                          </ShTooltip>
                        </ShTooltipProvider>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={anomaly.status}
                          onValueChange={(val) => handleStatusChange(anomaly.id, val)}
                          disabled={updateMutation.isPending}
                        >
                          <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="detected">
                              <span className="flex items-center gap-1.5">
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                                {t('status.detected')}
                              </span>
                            </SelectItem>
                            <SelectItem value="investigating">
                              <span className="flex items-center gap-1.5">
                                <Search className="h-3 w-3 text-amber-500" />
                                {t('status.investigating')}
                              </span>
                            </SelectItem>
                            <SelectItem value="resolved">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle className="h-3 w-3 text-emerald-500" />
                                {t('status.resolved')}
                              </span>
                            </SelectItem>
                            <SelectItem value="false_positive">
                              <span className="flex items-center gap-1.5">
                                <XCircle className="h-3 w-3 text-slate-400" />
                                {t('status.falsePositive')}
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detection Summary Charts ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold">{t('anomaly.byTech')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTech} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="technology" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="count" name={t('anomaly.anomalies')} radius={[4, 4, 0, 0]}>
                    {byTech.map((entry) => (
                      <Cell key={entry.technology} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold">{t('anomaly.byMetric')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byMetric}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="metric"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="count" name={t('anomaly.anomalies')} radius={[0, 4, 4, 0]}>
                    {byMetric.map((_, index) => (
                      <Cell key={`metric-${index}`} fill={METRIC_CHART_COLORS[index % METRIC_CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
