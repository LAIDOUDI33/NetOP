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
import {
  TECH_COLORS, TECH_BG_CLASSES, SEVERITY_BADGE_VARIANT, TECHNOLOGIES, formatNumber,
} from '@/lib/constants';
import type { Technology, AlertSeverity } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────
type AnomalyStatus = 'investigating' | 'resolved' | 'false_positive';

interface AnomalyItem {
  id: string;
  site: string;
  technology: Technology;
  metric: string;
  zScore: number;
  description: string;
  status: AnomalyStatus;
  severity: AlertSeverity;
  timestamp: string;
}

interface AnomalySummary {
  total: number;
  investigating: number;
  resolved: number;
  falsePositive: number;
}

interface AnomalyResponse {
  anomalies: AnomalyItem[];
  summary: AnomalySummary;
}

const SEVERITY_SCATTER_COLORS: Record<AlertSeverity, string> = {
  critical: '#EF4444',
  warning: '#F59E0B',
  info: '#06B6D4',
};

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

  const { anomalies, summary } = data;

  // Scatter chart data
  const scatterData = anomalies.map(a => ({
    x: a.timestamp,
    y: a.zScore,
    z: a.severity === 'critical' ? 80 : a.severity === 'warning' ? 50 : 30,
    fill: SEVERITY_SCATTER_COLORS[a.severity],
    technology: a.technology,
    severity: a.severity,
    site: a.site,
    metric: a.metric,
    description: a.description,
  }));

  // Chart colors per severity
  const criticalData = scatterData.filter(d => d.severity === 'critical');
  const warningData = scatterData.filter(d => d.severity === 'warning');
  const infoData = scatterData.filter(d => d.severity === 'info');

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

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Detected</p>
                <p className="text-2xl font-bold">{summary.total}</p>
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
                <p className="text-sm text-muted-foreground">Active / Investigating</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.investigating}</p>
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
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.resolved}</p>
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
                <p className="text-sm text-muted-foreground">False Positives</p>
                <p className="text-2xl font-bold text-slate-500">{summary.falsePositive}</p>
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
              Filters:
            </div>
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Technology" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technologies</SelectItem>
                {TECHNOLOGIES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              {anomalies.length} result{anomalies.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Anomaly Timeline (Scatter Chart) ───────────────────────── */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base font-semibold">Anomaly Timeline</CardTitle>
            <Badge variant="outline" className="text-xs ml-auto">Z-Score threshold: 2.5</Badge>
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
                    const labels: Record<string, string> = {
                      critical: 'Critical',
                      warning: 'Warning',
                      info: 'Info',
                    };
                    return labels[value] ?? value;
                  }}
                />
                <ReferenceLine
                  y={2.5}
                  stroke="#EF4444"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{ value: 'Threshold', position: 'insideTopRight', fill: '#EF4444', fontSize: 11 }}
                />
                {criticalData.length > 0 && (
                  <Scatter name="critical" data={criticalData} fill={SEVERITY_SCATTER_COLORS.critical} />
                )}
                {warningData.length > 0 && (
                  <Scatter name="warning" data={warningData} fill={SEVERITY_SCATTER_COLORS.warning} />
                )}
                {infoData.length > 0 && (
                  <Scatter name="info" data={infoData} fill={SEVERITY_SCATTER_COLORS.info} />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Anomaly Table ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-base font-semibold">Anomaly Details</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {anomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Brain className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">No anomalies match current filters</p>
              <p className="text-xs">Try adjusting the filter criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Severity</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead className="w-[80px]">Tech</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead className="w-[90px] text-right">Z-Score</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="w-[160px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map(anomaly => (
                    <TableRow key={anomaly.id}>
                      <TableCell>
                        <Badge variant={SEVERITY_BADGE_VARIANT[anomaly.severity]}>
                          {anomaly.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{anomaly.site}</TableCell>
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
                            <SelectItem value="investigating">
                              <span className="flex items-center gap-1.5">
                                <Search className="h-3 w-3 text-amber-500" />
                                Investigating
                              </span>
                            </SelectItem>
                            <SelectItem value="resolved">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle className="h-3 w-3 text-emerald-500" />
                                Resolved
                              </span>
                            </SelectItem>
                            <SelectItem value="false_positive">
                              <span className="flex items-center gap-1.5">
                                <XCircle className="h-3 w-3 text-slate-400" />
                                False Positive
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
            <CardTitle className="text-base font-semibold">Anomalies by Technology</CardTitle>
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
                  <Bar dataKey="count" name="Anomalies" radius={[4, 4, 0, 0]}>
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
            <CardTitle className="text-base font-semibold">Anomalies by Metric</CardTitle>
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
                  <Bar dataKey="count" name="Anomalies" radius={[0, 4, 4, 0]}>
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