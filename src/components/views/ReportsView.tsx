'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Download, FileText, Cpu, Shield, Activity, AlertTriangle,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle, XCircle, FileBarChart, CalendarClock, History,
  Loader2, Image as ImageIcon, Trash2, Power, LayoutTemplate,
} from 'lucide-react';
import { TECH_COLORS } from '@/lib/constants';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';
import { generatePdfReport } from '@/lib/pdf-generator';
import type { PdfSection } from '@/lib/pdf-generator';
import type { Technology, SonModuleItem, PolicyItem } from '@/types';
import { toast } from 'sonner';

// ==================== CONSTANTS ====================

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  degraded: 'secondary',
  down: 'destructive',
  maintenance: 'outline',
};

const METRICS = [
  { value: 'downloadThroughput', label: 'Download Throughput (Mbps)' },
  { value: 'uploadThroughput', label: 'Upload Throughput (Mbps)' },
  { value: 'latency', label: 'Latency (ms)' },
  { value: 'availability', label: 'Availability (%)' },
  { value: 'dropRate', label: 'Drop Rate (%)' },
  { value: 'sinr', label: 'SINR (dB)' },
  { value: 'handoverSuccessRate', label: 'Handover Success Rate (%)' },
  { value: 'prbUtilization', label: 'PRB Utilization (%)' },
  { value: 'activeUsers', label: 'Active Users' },
];

const BREACH_THRESHOLDS: Record<string, { metric: string; tech?: string; condition: 'lt' | 'gt'; value: number }> = {
  rsrp_breach_4g: { metric: 'rsrp', tech: '4G', condition: 'lt', value: -105 },
  rsrp_breach_5g: { metric: 'rsrp', tech: '5G', condition: 'lt', value: -110 },
  drop_rate_breach: { metric: 'dropRate', condition: 'gt', value: 2 },
  availability_breach: { metric: 'availability', condition: 'lt', value: 97 },
  latency_breach_4g: { metric: 'latency', tech: '4G', condition: 'gt', value: 60 },
  latency_breach_5g: { metric: 'latency', tech: '5G', condition: 'gt', value: 10 },
};

const PERCENT_METRICS = new Set(['availability', 'dropRate', 'handoverSuccessRate', 'prbUtilization']);

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  kpi: TrendingUp,
  son: Cpu,
  policy: Shield,
  sla: CheckCircle,
  qoe: Activity,
  coverage: FileBarChart,
  executive: LayoutTemplate,
  custom: FileText,
};

// ==================== TYPES ====================

interface KpiResponse {
  technologies: Technology[];
  timestamps: string[];
  data: Record<string, { values: number[]; sites: { siteId: string; siteName: string; technology: Technology; status: string; value: number }[] }>;
}

interface SonResponse {
  modules: SonModuleItem[];
}

interface PolicyResponse {
  policies: PolicyItem[];
}

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  type: string;
  technology: string | null;
  isBuiltIn: boolean;
}

interface ScheduleItem {
  id: string;
  name: string;
  template: { name: string; type: string };
  cronExpr: string;
  format: string;
  isEnabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  reportCount: number;
}

interface HistoryItem {
  id: string;
  name: string;
  type: string;
  format: string;
  fileSizeBytes: number;
  status: string;
  createdAt: string;
  template: { name: string; type: string };
  schedule: { name: string } | null;
}

// ==================== HELPERS ====================

function stdDev(arr: number[]) {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squaredDiffs = arr.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

function formatValue(value: number, metric: string): string {
  return PERCENT_METRICS.has(metric) ? `${value.toFixed(2)}%` : value.toFixed(2);
}

function isBreach(value: number, metric: string, tech: string): boolean {
  for (const threshold of Object.values(BREACH_THRESHOLDS)) {
    if (threshold.metric !== metric) continue;
    if (threshold.tech && threshold.tech !== tech) continue;
    if (threshold.condition === 'lt' && value < threshold.value) return true;
    if (threshold.condition === 'gt' && value > threshold.value) return true;
  }
  return false;
}

function countBreaches(sites: { technology: Technology; value: number }[], metric: string): number {
  let count = 0;
  for (const site of sites) {
    if (isBreach(site.value, metric, site.technology)) count++;
  }
  return count;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ==================== SUB-COMPONENTS ====================

function StatCard({ icon: Icon, label, value, variant = 'default' }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  variant?: 'default' | 'warning';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs flex items-center gap-1 ${variant === 'warning' ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
              <Icon className="h-3 w-3" /> {label}
            </p>
            <p className={`text-xl font-bold mt-1 ${variant === 'warning' ? 'text-red-600' : ''}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>;
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== KPI REPORT TAB ====================

function KpiReportTab() {
  const t = useT();
  const [metric, setMetric] = useState('downloadThroughput');

  const { data, isLoading } = useQuery<KpiResponse>({
    queryKey: ['kpi-report', metric],
    queryFn: () => fetch(`/api/kpi?technology=all&metric=${metric}`).then(r => { if (!r.ok) throw new Error('Reports API error: ' + r.status); return r.json(); }),
    refetchInterval: 60000,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.timestamps.map((ts, i) => {
      const point: Record<string, string | number> = { time: ts };
      if (data.data) {
        Object.entries(data.data).forEach(([tech, techData]) => {
          point[tech] = techData.values[i];
        });
      }
      return point;
    });
  }, [data]);

  const rankedSites = useMemo(() => {
    if (!data?.data) return [];
    return Object.values(data.data)
      .flatMap(d => d.sites)
      .map(s => ({
        ...s,
        displayValue: formatValue(s.value, metric),
        breached: isBreach(s.value, metric, s.technology),
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, metric]);

  const summaryStats = useMemo(() => {
    if (!data?.data) return { min: '0', max: '0', avg: '0', stddev: '0', breaches: 0 };
    const allValues = Object.values(data.data).flatMap(d => d.values);
    const allSites = Object.values(data.data).flatMap(d => d.sites);
    if (allValues.length === 0) return { min: '0', max: '0', avg: '0', stddev: '0', breaches: 0 };

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const sd = stdDev(allValues);
    const breaches = countBreaches(allSites, metric);

    return {
      min: formatValue(min, metric),
      max: formatValue(max, metric),
      avg: formatValue(avg, metric),
      stddev: formatValue(sd, metric),
      breaches,
    };
  }, [data, metric]);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="no-print flex flex-wrap gap-4 items-center">
          <Skeleton className="h-10 w-56" />
        </div>
        <ChartSkeleton />
        <SummarySkeleton />
        <TableSkeleton />
      </div>
    );
  }

  const techs = data.technologies || [];

  return (
    <div className="space-y-4">
      {/* Metric Filter + Export */}
      <div className="no-print flex flex-wrap gap-4 items-center justify-between">
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder={t('rpt.selectMetric')} />
          </SelectTrigger>
          <SelectContent>
            {METRICS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline" size="sm"
          onClick={async () => {
            const { downloadChartImage } = await import('@/lib/chart-export');
            await downloadChartImage('kpi-trend-chart', 'kpi_trend', 'png');
          }}
        >
          <ImageIcon className="h-4 w-4 mr-1.5" /> {t('rpt.exportChart')}
        </Button>
      </div>

      {/* Combined Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {t('rpt.allTechTrend', { metric: METRICS.find(m => m.value === metric)?.label || metric })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-72" id="kpi-trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {techs.map((tech) => (
                  <Line
                    key={tech}
                    type="monotone"
                    dataKey={tech}
                    stroke={TECH_COLORS[tech]}
                    name={tech}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <StatCard icon={ArrowDownRight} label={t('rpt.minimum')} value={summaryStats.min} />
        <StatCard icon={ArrowUpRight} label={t('rpt.maximum')} value={summaryStats.max} />
        <StatCard icon={TrendingUp} label={t('rpt.average')} value={summaryStats.avg} />
        <StatCard icon={TrendingDown} label={t('rpt.stdDev')} value={summaryStats.stddev} />
        <StatCard icon={AlertTriangle} label={t('rpt.breachCount')} value={summaryStats.breaches} variant={summaryStats.breaches > 0 ? 'warning' : 'default'} />
      </div>

      {/* Site Performance Ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {t('rpt.siteRanking', { metric: METRICS.find(m => m.value === metric)?.label || metric })}
          </CardTitle>
          <ExportButton data={rankedSites} filenamePrefix="reports" columns={[{ key: 'siteName', header: t('th.site') }, { key: 'technology', header: t('th.technology') }, { key: 'status', header: t('th.status') }, { key: 'displayValue', header: t('th.value') }]} />
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="max-h-96">
            <div className="min-w-[540px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-12">#</TableHead>
                    <TableHead className="text-xs">{t('th.site')}</TableHead>
                    <TableHead className="text-xs">{t('th.technology')}</TableHead>
                    <TableHead className="text-xs">{t('th.status')}</TableHead>
                    <TableHead className="text-xs text-right">{t('th.value')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankedSites.map((site, i) => (
                    <TableRow key={site.siteId}>
                      <TableCell className="text-xs text-muted-foreground">
                        {i < 3 ? (
                          <Badge variant={i === 0 ? 'default' : 'secondary'} className="w-6 justify-center text-xs font-bold">
                            {i + 1}
                          </Badge>
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{site.siteName}</TableCell>
                      <TableCell>
                        <Badge
                          className="text-xs"
                          style={{ backgroundColor: TECH_COLORS[site.technology as Technology], color: '#fff' }}
                        >
                          {site.technology}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[site.status]} className="text-xs">
                          {site.status}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-xs text-right font-medium ${
                          site.breached ? 'text-red-600 bg-red-50 dark:bg-red-950/30 rounded px-1' : ''
                        }`}
                      >
                        {site.displayValue}
                        {site.breached && <AlertTriangle className="inline h-3 w-3 ml-1 text-red-500" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== SON ACTIVITY TAB ====================

function SonActivityTab() {
  const t = useT();
  const { data, isLoading } = useQuery<SonResponse>({
    queryKey: ['son-report'],
    queryFn: () => fetch('/api/son').then(r => { if (!r.ok) throw new Error('Reports API error: ' + r.status); return r.json(); }),
    refetchInterval: 60000,
  });

  const modules = data?.modules || [];

  const summaryCards = useMemo(() => {
    const totalModules = modules.length;
    let actions24h = 0;
    let successCount = 0;
    let totalImpact = 0;
    let impactCount = 0;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const mod of modules) {
      for (const action of mod.recentActions) {
        const actionDate = new Date(action.createdAt);
        if (actionDate >= oneDayAgo) {
          actions24h++;
          if (action.status === 'applied') successCount++;
          if (action.impactScore !== null && action.impactScore !== undefined) {
            totalImpact += action.impactScore;
            impactCount++;
          }
        }
      }
    }

    const successRate = actions24h > 0 ? ((successCount / actions24h) * 100).toFixed(1) : '—';
    const avgImpact = impactCount > 0 ? (totalImpact / impactCount).toFixed(2) : '—';

    return { totalModules, actions24h, successRate, avgImpact };
  }, [modules]);

  const allActions = useMemo(() => {
    return modules
      .flatMap(m => m.recentActions.map(a => ({ ...a, moduleName: m.displayName, moduleTechnology: m.technology })))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [modules]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SummarySkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <Cpu className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('rpt.noSonModules')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Cpu} label={t('rpt.totalModules')} value={summaryCards.totalModules} />
        <StatCard icon={Activity} label={t('rpt.actions24h')} value={summaryCards.actions24h} />
        <StatCard icon={CheckCircle} label={t('rpt.successRate')} value={`${summaryCards.successRate}%`} />
        <StatCard icon={TrendingUp} label={t('rpt.avgImpact')} value={summaryCards.avgImpact} />
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t('rpt.recentSonActions')}</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="max-h-96">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t('rpt.time')}</TableHead>
                    <TableHead className="text-xs">{t('rpt.module')}</TableHead>
                    <TableHead className="text-xs">{t('th.site')}</TableHead>
                    <TableHead className="text-xs">{t('rpt.actionType')}</TableHead>
                    <TableHead className="text-xs">{t('th.parameter')}</TableHead>
                    <TableHead className="text-xs">{t('rpt.beforeAfter')}</TableHead>
                    <TableHead className="text-xs text-right">{t('rpt.impact')}</TableHead>
                    <TableHead className="text-xs">{t('th.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allActions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground text-xs py-8">
                        {t('rpt.noActions')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    allActions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(action.createdAt)}</span>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{action.moduleName}</TableCell>
                        <TableCell className="text-xs">{action.siteName || '—'}{action.siteCode ? ` (${action.siteCode})` : ''}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-xs font-mono">{action.actionType}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{action.parameter}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <span className="text-muted-foreground">{action.previousValue}</span>
                          <span className="mx-1.5 text-muted-foreground">→</span>
                          <span className="font-medium">{action.newValue}</span>
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {action.impactScore !== null && action.impactScore !== undefined
                            ? (action.impactScore >= 0.7
                                ? <span className="text-emerald-600">{(action.impactScore * 100).toFixed(0)}%</span>
                                : action.impactScore >= 0.4
                                  ? <span className="text-amber-600">{(action.impactScore * 100).toFixed(0)}%</span>
                                  : <span className="text-red-600">{(action.impactScore * 100).toFixed(0)}%</span>)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {action.status === 'applied' && (
                            <Badge variant="default" className="text-xs gap-1"><CheckCircle className="h-3 w-3" />{t('status.applied')}</Badge>
                          )}
                          {action.status === 'pending' && (
                            <Badge variant="secondary" className="text-xs gap-1"><Clock className="h-3 w-3" />{t('status.pending')}</Badge>
                          )}
                          {action.status === 'rolled_back' && (
                            <Badge variant="outline" className="text-xs gap-1">{t('status.rolledBack')}</Badge>
                          )}
                          {action.status === 'failed' && (
                            <Badge variant="destructive" className="text-xs gap-1"><XCircle className="h-3 w-3" />{t('status.failed')}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== POLICY REPORT TAB ====================

function PolicyReportTab() {
  const t = useT();
  const { data, isLoading } = useQuery<PolicyResponse>({
    queryKey: ['policy-report'],
    queryFn: () => fetch('/api/policies').then(r => { if (!r.ok) throw new Error('Reports API error: ' + r.status); return r.json(); }),
    refetchInterval: 60000,
  });

  const policies = data?.policies || [];

  const summaryCards = useMemo(() => {
    const totalPolicies = policies.length;
    const activePolicies = policies.filter(p => p.enabled).length;
    const totalExecutions = policies.reduce((sum, p) => sum + p.executionStats.totalRuns, 0);
    const rates = policies.filter(p => p.executionStats.totalRuns > 0).map(p => p.executionStats.successRate);
    const avgSuccessRate = rates.length > 0
      ? (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)
      : '—';

    return { totalPolicies, activePolicies, totalExecutions, avgSuccessRate };
  }, [policies]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SummarySkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <Shield className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('rpt.noPolicies')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Shield} label={t('rpt.totalPolicies')} value={summaryCards.totalPolicies} />
        <StatCard icon={Activity} label={t('rpt.activePolicies')} value={summaryCards.activePolicies} />
        <StatCard icon={Cpu} label={t('rpt.totalExecutions')} value={summaryCards.totalExecutions} />
        <StatCard icon={TrendingUp} label={t('rpt.avgSuccessRate')} value={`${summaryCards.avgSuccessRate}%`} />
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t('rpt.policyExecSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="max-h-96">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t('th.name')}</TableHead>
                    <TableHead className="text-xs">{t('th.tech')}</TableHead>
                    <TableHead className="text-xs">{t('th.trigger')}</TableHead>
                    <TableHead className="text-xs">{t('rpt.scope')}</TableHead>
                    <TableHead className="text-xs text-center">{t('th.priority')}</TableHead>
                    <TableHead className="text-xs text-center">{t('rpt.enabled')}</TableHead>
                    <TableHead className="text-xs text-right">{t('rpt.totalRuns')}</TableHead>
                    <TableHead className="text-xs text-right">{t('rpt.successRate')}</TableHead>
                    <TableHead className="text-xs">{t('rpt.lastRun')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="text-xs font-medium">{policy.name}</TableCell>
                      <TableCell>
                        <Badge
                          className="text-xs"
                          style={{ backgroundColor: TECH_COLORS[policy.technology as Technology] || '#94A3B8', color: '#fff' }}
                        >
                          {policy.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-xs font-mono">{policy.triggerType}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{policy.scope}{policy.scopeValue ? ` (${policy.scopeValue})` : ''}</TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge variant={policy.priority <= 3 ? 'destructive' : policy.priority <= 7 ? 'secondary' : 'outline'} className="text-xs">
                          {policy.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        {policy.enabled ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">{policy.executionStats.totalRuns}</TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {policy.executionStats.totalRuns > 0 ? (
                          <span className={policy.executionStats.successRate >= 80 ? 'text-emerald-600' : policy.executionStats.successRate >= 50 ? 'text-amber-600' : 'text-red-600'}>
                            {policy.executionStats.successRate}%
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(policy.executionStats.lastRun)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== TEMPLATES TAB ====================

function TemplatesTab() {
  const t = useT();
  const queryClient = useQueryClient();
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const { data: templatesData, isLoading } = useQuery<{ templates: TemplateItem[] }>({
    queryKey: ['report-templates'],
    queryFn: async () => { const r = await fetch('/api/reports/templates'); if (!r.ok) throw new Error('Failed to fetch report templates'); return r.json(); },
    refetchInterval: 60000,
  });

  const generateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, format: 'pdf' }),
      });
      if (!res.ok) throw new Error('Generation failed');
      return res.json() as Promise<{ reportId: string; templateName: string; type: string; data: Record<string, unknown>; format: string; generatedAt: string }>;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['report-history'] });
      toast.success(t('rpt.reportGenerated'));

      // Transform server data into PdfSection format
      const sections = transformToPdfSections(result.type, result.data);
      generatePdfReport(sections, {
        title: result.templateName,
        subtitle: new Date(result.generatedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' }),
      });
    },
    onError: () => {
      toast.error(t('rpt.genFailed'));
    },
    onSettled: () => {
      setGeneratingId(null);
    },
  });

  const templates = templatesData?.templates ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-28 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {templates.map((tpl) => {
          const Icon = TEMPLATE_ICONS[tpl.type] || FileText;
          const isGenerating = generatingId === tpl.id;
          return (
            <Card key={tpl.id} className="flex flex-col">
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <Badge variant={tpl.isBuiltIn ? 'secondary' : 'outline'} className="text-xs">
                    {tpl.isBuiltIn ? t('rpt.builtIn') : t('rpt.custom')}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold mb-1">{tpl.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{tpl.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-xs font-mono">{tpl.type}</Badge>
                  {tpl.technology && (
                    <Badge variant="outline" className="text-xs">{tpl.technology}</Badge>
                  )}
                </div>
              </CardContent>
              <div className="px-4 pb-4">
                <Button
                  className="w-full"
                  size="sm"
                  disabled={isGenerating}
                  onClick={() => {
                    setGeneratingId(tpl.id);
                    generateMutation.mutate(tpl.id);
                  }}
                >
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> {t('rpt.generating')}</>
                  ) : (
                    <><Download className="h-4 w-4 mr-1.5" /> {t('rpt.generatePdf')}</>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ==================== SCHEDULES TAB ====================

function SchedulesTab() {
  const t = useT();
  const queryClient = useQueryClient();

  const { data: schedulesData, isLoading } = useQuery<{ schedules: ScheduleItem[] }>({
    queryKey: ['report-schedules'],
    queryFn: async () => { const r = await fetch('/api/reports/schedules'); if (!r.ok) throw new Error('Failed to fetch report schedules'); return r.json(); },
    refetchInterval: 30000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const res = await fetch('/api/reports/schedules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report-schedules'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const res = await fetch('/api/reports/schedules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report-schedules'] }),
  });

  const schedules = schedulesData?.schedules ?? [];

  if (isLoading) return <TableSkeleton />;
  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('rpt.noSchedules')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
      <ScrollArea className="max-h-96">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t('rpt.scheduleName')}</TableHead>
                <TableHead className="text-xs">{t('rpt.templateName')}</TableHead>
                <TableHead className="text-xs">{t('rpt.cronExpr')}</TableHead>
                <TableHead className="text-xs">{t('rpt.nextRun')}</TableHead>
                <TableHead className="text-xs">{t('rpt.lastRun')}</TableHead>
                <TableHead className="text-xs text-center">{t('rpt.runCount')}</TableHead>
                <TableHead className="text-xs text-center">{t('rpt.reportCount')}</TableHead>
                <TableHead className="text-xs text-center">{t('rpt.enabled')}</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs font-medium">{s.name}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-xs">{s.template?.name || '—'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{s.cronExpr}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(s.nextRunAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(s.lastRunAt)}</TableCell>
                  <TableCell className="text-xs text-center">{s.runCount}</TableCell>
                  <TableCell className="text-xs text-center">{s.reportCount}</TableCell>
                  <TableCell className="text-xs text-center">
                    <Button
                      variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => toggleMutation.mutate(s.id)}
                    >
                      <Power className={`h-3.5 w-3.5 ${s.isEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                    </Button>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Button
                      variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                      onClick={() => deleteMutation.mutate(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </CardContent>
    </Card>
  );
}

// ==================== HISTORY TAB ====================

function HistoryTab() {
  const t = useT();

  const { data: historyData, isLoading } = useQuery<{ reports: HistoryItem[]; total: number }>({
    queryKey: ['report-history'],
    queryFn: async () => { const r = await fetch('/api/reports/history?limit=50'); if (!r.ok) throw new Error('Failed to fetch report history'); return r.json(); },
    refetchInterval: 30000,
  });

  const reports = historyData?.reports ?? [];

  if (isLoading) return <TableSkeleton />;
  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('rpt.noHistory')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
      <ScrollArea className="max-h-96">
        <div className="min-w-[700px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t('rpt.reportName')}</TableHead>
                <TableHead className="text-xs">{t('rpt.templateName')}</TableHead>
                <TableHead className="text-xs">{t('rpt.reportFormat')}</TableHead>
                <TableHead className="text-xs">{t('rpt.reportStatus')}</TableHead>
                <TableHead className="text-xs">{t('rpt.reportDate')}</TableHead>
                <TableHead className="text-xs">{t('rpt.reportSize')}</TableHead>
                <TableHead className="text-xs">{t('rpt.scheduleSource')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-xs">{r.template?.name || '—'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs uppercase">{r.format}</TableCell>
                  <TableCell className="text-xs">
                    {r.status === 'completed' && <Badge variant="default" className="text-xs">{t('rpt.statusCompleted')}</Badge>}
                    {r.status === 'failed' && <Badge variant="destructive" className="text-xs">{t('rpt.statusFailed')}</Badge>}
                    {r.status === 'generating' && <Badge variant="secondary" className="text-xs">{t('rpt.statusGenerating')}</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatFileSize(r.fileSizeBytes)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.schedule?.name || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </CardContent>
    </Card>
  );
}

// ==================== PDF SECTION TRANSFORMER ====================

function transformToPdfSections(type: string, data: Record<string, unknown>): PdfSection[] {
  const sections: PdfSection[] = [];

  switch (type) {
    case 'kpi': {
      const technologies = data.technologies as Array<Record<string, unknown>>;
      const summary: Record<string, string | number> = {
        dataPoints: (data.totalDataPoints as number) ?? 0,
        period: ((data.period as Record<string, string>)?.label) ?? '24h',
      };
      sections.push({
        title: 'Indicateurs KPI par Technologie',
        summary,
        data: technologies?.map(t => ({
          Technology: (t.technology as string) ?? '',
          'Data Points': (t.dataPoints as number) ?? 0,
          'Avg DL (Mbps)': (t.avgDownload as number) ?? 0,
          'Max DL (Mbps)': (t.maxDownload as number) ?? 0,
          'Avg UL (Mbps)': (t.avgUpload as number) ?? 0,
          'Avg Latency (ms)': (t.avgLatency as number) ?? 0,
          'P95 Latency (ms)': (t.p95Latency as number) ?? 0,
          'Avg Availability (%)': (t.avgAvailability as number) ?? 0,
          'Avg PRB Util (%)': (t.avgPrbUtil as number) ?? 0,
        })) ?? [],
        columns: [
          { header: 'Technology', key: 'Technology', width: 22 },
          { header: 'Points', key: 'Data Points', width: 18 },
          { header: 'Avg DL', key: 'Avg DL (Mbps)' },
          { header: 'Max DL', key: 'Max DL (Mbps)' },
          { header: 'Avg UL', key: 'Avg UL (Mbps)' },
          { header: 'Avg Latency', key: 'Avg Latency (ms)' },
          { header: 'P95 Latency', key: 'P95 Latency (ms)' },
          { header: 'Availability', key: 'Avg Availability (%)' },
          { header: 'PRB Util', key: 'Avg PRB Util (%)' },
        ],
      });
      break;
    }
    case 'son': {
      const modules = data.modules as Array<Record<string, unknown>>;
      sections.push({
        title: 'Modules SON',
        summary: {
          totalModules: (data.totalModules as number) ?? 0,
          enabledModules: (data.enabledModules as number) ?? 0,
          totalActions: (data.totalActions as number) ?? 0,
          successRate: `${(data.successRate as number) ?? 0}%`,
        },
        data: modules?.map(m => ({
          Module: (m.displayName as string) ?? (m.name as string) ?? '',
          Technology: (m.technology as string) ?? '',
          Mode: (m.mode as string) ?? '',
          Enabled: (m.enabled as boolean) ? 'Oui' : 'Non',
          Actions: (m.actionCount as number) ?? 0,
          'Success Rate': `${(m.successRate as number) ?? 0}%`,
        })) ?? [],
        columns: [
          { header: 'Module', key: 'Module', width: 35 },
          { header: 'Tech', key: 'Technology', width: 18 },
          { header: 'Mode', key: 'Mode', width: 28 },
          { header: 'Active', key: 'Enabled', width: 18 },
          { header: 'Actions', key: 'Actions', width: 18 },
          { header: 'Succès', key: 'Success Rate', width: 20 },
        ],
      });
      break;
    }
    case 'policy': {
      const policies = data.policies as Array<Record<string, unknown>>;
      sections.push({
        title: 'Politiques Réseau',
        summary: {
          totalPolicies: (data.totalPolicies as number) ?? 0,
          enabledPolicies: (data.enabledPolicies as number) ?? 0,
          totalExecutions: (data.totalExecutions as number) ?? 0,
          successRate: `${(data.successRate as number) ?? 0}%`,
        },
        data: policies?.map(p => ({
          Policy: (p.name as string) ?? '',
          Technology: (p.technology as string) ?? '',
          Trigger: (p.triggerType as string) ?? '',
          Priority: (p.priority as number) ?? 0,
          Created: p.createdAt ? new Date(p.createdAt as string).toLocaleDateString('fr-FR') : '',
        })) ?? [],
        columns: [
          { header: 'Politique', key: 'Policy', width: 45 },
          { header: 'Tech', key: 'Technology', width: 18 },
          { header: 'Déclencheur', key: 'Trigger', width: 28 },
          { header: 'Priorité', key: 'Priority', width: 18 },
          { header: 'Créé le', key: 'Created' },
        ],
      });
      break;
    }
    case 'sla': {
      const targets = data.targets as Array<Record<string, unknown>>;
      sections.push({
        title: 'Conformité SLA',
        summary: {
          totalTargets: (data.totalTargets as number) ?? 0,
          compliant: (data.compliantCount as number) ?? 0,
          breaches: (data.breachCount as number) ?? 0,
          complianceRate: `${(data.complianceRate as number) ?? 0}%`,
        },
        data: targets?.map(t => ({
          Technology: (t.technology as string) ?? '',
          Metric: (t.metric as string) ?? '',
          Target: (t.targetValue as number) ?? 0,
          Actual: (t.actualValue as number) ?? 0,
          Condition: (t.condition as string) ?? '',
          Compliant: (t.compliant as boolean) ? 'Oui' : 'Non',
          Severity: (t.severity as string) ?? '',
        })) ?? [],
        columns: [
          { header: 'Tech', key: 'Technology', width: 18 },
          { header: 'Métrique', key: 'Metric', width: 35 },
          { header: 'Cible', key: 'Target', width: 22 },
          { header: 'Réel', key: 'Actual', width: 22 },
          { header: 'Conforme', key: 'Compliant', width: 20 },
          { header: 'Sévérité', key: 'Severity', width: 20 },
        ],
      });
      break;
    }
    case 'qoe': {
      const byTechnology = data.byTechnology as Array<Record<string, unknown>>;
      sections.push({
        title: 'Qualité d\'Expérience (QoE)',
        summary: {
          samples: (data.sampleCount as number) ?? 0,
          avgMOS: (data.avgMosScore as number) ?? 0,
          avgDataRate: `${(data.avgDataRate as number) ?? 0} Mbps`,
          avgCallSetup: `${(data.avgCallSetupTime as number) ?? 0} ms`,
          avgDropRate: `${(data.avgCallDropRate as number) ?? 0}%`,
        },
        data: byTechnology?.map(t => ({
          Technology: (t.technology as string) ?? '',
          Sites: (t.siteCount as number) ?? 0,
          'MOS Score': (t.avgMosScore as number) ?? 0,
          'Data Rate (Mbps)': (t.avgDataRate as number) ?? 0,
          'Call Setup (ms)': (t.avgCallSetupTime as number) ?? 0,
          'Drop Rate (%)': (t.avgCallDropRate as number) ?? 0,
        })) ?? [],
        columns: [
          { header: 'Tech', key: 'Technology', width: 18 },
          { header: 'Sites', key: 'Sites', width: 18 },
          { header: 'MOS', key: 'MOS Score', width: 20 },
          { header: 'Débit', key: 'Data Rate (Mbps)' },
          { header: 'Appel (ms)', key: 'Call Setup (ms)' },
          { header: 'Coupure %', key: 'Drop Rate (%)' },
        ],
      });
      break;
    }
    case 'coverage': {
      const regions = data.regions as Array<Record<string, unknown>>;
      const byTech = data.byTechnology as Array<Record<string, unknown>>;
      sections.push({
        title: 'Analyse de Couverture par Région',
        summary: {
          totalSites: (data.totalSites as number) ?? 0,
          activeSites: (data.activeSites as number) ?? 0,
          regions: (data.regionCount as number) ?? 0,
        },
        data: regions?.map(r => ({
          Region: (r.region as string) ?? '',
          'Total Sites': (r.totalSites as number) ?? 0,
          'Active Sites': (r.activeSites as number) ?? 0,
          Technologies: Array.isArray(r.technologies) ? (r.technologies as string[]).join(', ') : '',
        })) ?? [],
        columns: [
          { header: 'Région', key: 'Region', width: 35 },
          { header: 'Sites Total', key: 'Total Sites' },
          { header: 'Sites Actifs', key: 'Active Sites' },
          { header: 'Technologies', key: 'Technologies', width: 55 },
        ],
      });
      if (byTech && byTech.length > 0) {
        sections.push({
          title: 'Distribution par Technologie',
          data: byTech.map(t => ({
            Technology: (t.technology as string) ?? '',
            Sites: (t.count as number) ?? 0,
          })),
          columns: [
            { header: 'Technologie', key: 'Technology', width: 40 },
            { header: 'Nombre de Sites', key: 'Sites' },
          ],
        });
      }
      break;
    }
    case 'executive': {
      sections.push({
        title: 'Indicateurs Clés — Résumé Exécutif',
        summary: {
          totalSites: (data.totalSites as number) ?? 0,
          activeAlerts: (data.activeAlerts as number) ?? 0,
          openIncidents: (data.openIncidents as number) ?? 0,
          healthScore: `${(data.avgHealthScore as number) ?? 0}/100`,
          availability: `${(data.overallAvailability as number) ?? 0}%`,
          healthySites: (data.healthySites as number) ?? 0,
          degradedSites: (data.degradedSites as number) ?? 0,
          criticalSites: (data.criticalSites as number) ?? 0,
        },
      });
      break;
    }
    default:
      sections.push({
        title: 'Données du Rapport',
        data: [{ Message: JSON.stringify(data).slice(0, 500) }],
        columns: [{ header: 'Donnée', key: 'Message' }],
      });
  }

  return sections;
}

// ==================== MAIN COMPONENT ====================

export default function ReportsView() {
  const t = useT();
  const [activeTab, setActiveTab] = useState('quick');
  const [quickSubTab, setQuickSubTab] = useState('kpi');

  const reportTimestamp = useMemo(() => {
    return new Date().toLocaleString([], {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }, []);

  return (
    <>
      {/* Print-specific CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          main { padding: 0 !important; }
          .print-break { page-break-before: always; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      ` }} />

      <div className="space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('rpt.subtitle')}
            </p>
          </div>
        </div>

        {/* Print-only header */}
        <div className="print-only hidden">
          <div className="border-b-2 border-primary pb-3 mb-4">
            <h1 className="text-2xl font-bold">{t('rpt.printTitle')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('rpt.generated')} {reportTimestamp}
            </p>
          </div>
        </div>

        {/* Top-Level Report Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="no-print">
          <TabsList className="grid w-full grid-cols-4 sm:w-[520px]">
            <TabsTrigger value="quick" className="text-xs sm:text-sm">
              <FileBarChart className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              {t('rpt.tabQuick')}
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs sm:text-sm">
              <LayoutTemplate className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              {t('rpt.tabTemplates')}
            </TabsTrigger>
            <TabsTrigger value="schedules" className="text-xs sm:text-sm">
              <CalendarClock className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              {t('rpt.tabSchedules')}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <History className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              {t('rpt.tabHistory')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="mt-4">
            {/* Quick Reports sub-tabs */}
            <Tabs value={quickSubTab} onValueChange={setQuickSubTab}>
              <TabsList className="grid w-full grid-cols-3 sm:w-[400px]">
                <TabsTrigger value="kpi" className="text-xs sm:text-sm">
                  <TrendingUp className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
                  {t('rpt.kpiReport')}
                </TabsTrigger>
                <TabsTrigger value="son" className="text-xs sm:text-sm">
                  <Cpu className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
                  {t('rpt.sonActivity')}
                </TabsTrigger>
                <TabsTrigger value="policy" className="text-xs sm:text-sm">
                  <Shield className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
                  {t('rpt.policyReport')}
                </TabsTrigger>
              </TabsList>
              {quickSubTab === 'kpi' && <KpiReportTab />}
              {quickSubTab === 'son' && <SonActivityTab />}
              {quickSubTab === 'policy' && <PolicyReportTab />}
            </Tabs>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{t('rpt.tabTemplates')}</h2>
              <p className="text-sm text-muted-foreground">{t('rpt.templatesDesc')}</p>
            </div>
            <TemplatesTab />
          </TabsContent>

          <TabsContent value="schedules" className="mt-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{t('rpt.tabSchedules')}</h2>
              <p className="text-sm text-muted-foreground">{t('rpt.schedulesDesc')}</p>
            </div>
            <SchedulesTab />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{t('rpt.tabHistory')}</h2>
              <p className="text-sm text-muted-foreground">{t('rpt.historyDesc')}</p>
            </div>
            <HistoryTab />
          </TabsContent>
        </Tabs>

        {/* Print-only footer */}
        <div className="print-only hidden">
          <div className="border-t-2 border-primary pt-3 mt-8 text-xs text-muted-foreground flex justify-between">
            <span>{t('rpt.printPlatform')}</span>
            <span>{t('rpt.confidential')}</span>
          </div>
        </div>
      </div>
    </>
  );
}
