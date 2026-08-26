'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight, Play, RefreshCw, Database, ShieldCheck, Activity, AlertTriangle,
  Search, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, Zap,
  Loader2, Server, ArrowDownToLine, Layers,
  BarChart3, Filter,
} from 'lucide-react';
import { useT, timeAgo } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ==================== TYPES ====================

interface DashboardData {
  pipelines: { total: number; active: number; failed: number; paused: number; disabled: number };
  executions: { total24h: number; succeeded24h: number; failed24h: number; avgDurationMs: number; totalRecords24h: number };
  quality: { overallPassRate: number; criticalPassRate: number; failingRules: number };
  sources: { total: number; active: number; error: number; maintenance: number };
  recentExecutions: Execution[];
  throughput: ThroughputItem[];
}

interface Execution {
  id: string;
  pipelineId: string;
  pipelineName: string;
  status: string;
  triggerType: string;
  recordsIn: number;
  recordsOut: number;
  recordsError: number;
  errorRate: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  errorMessage?: string;
  retryCount?: number;
  stepResults?: StepResult[];
}

interface StepResult {
  step: string;
  status: string;
  durationMs: number;
  recordsIn: number;
  recordsOut: number;
}

interface ThroughputItem {
  hour: string;
  ingested: number;
  transformed: number;
  errors: number;
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  source: string;
  target: string;
  schedule: string;
  status: string;
  lastRun: string | null;
  nextRun: string | null;
  recordsProcessed: number;
  errorRate: number;
  avgDurationMs: number;
  transformationSteps: string[];
  retryMaxAttempts: number;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  totalRecordsIn: number;
  totalRecordsOut: number;
  totalRecordsErr: number;
  enabled: boolean;
  latestExecution: Execution | null;
  executionCount: number;
}

interface PipelinesResponse {
  pipelines: Pipeline[];
  total: number;
}

interface ExecutionsResponse {
  executions: Execution[];
  total: number;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  protocol: string;
  endpoint: string;
  status: string;
  description: string;
  recordsAvailable: number;
  lastSyncAt: string | null;
  lastSyncRecords: number;
  lastSyncStatus: string;
  freshnessSeconds: number;
  avgLatencyMs: number;
  region: string;
  vendor: string;
}

interface SourcesResponse {
  sources: DataSource[];
}

interface QualityRule {
  id: string;
  name: string;
  description: string;
  targetModel: string;
  ruleType: string;
  ruleConfig: Record<string, unknown>;
  severity: string;
  isEnabled: boolean;
  lastEvaluatedAt: string | null;
  lastPassRate: number;
  totalEvaluations: number;
  totalPasses: number;
  totalFailures: number;
}

interface RulesResponse {
  rules: QualityRule[];
  total: number;
}

interface QualityResult {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleTargetModel: string;
  ruleSeverity: string;
  pipelineId: string | null;
  pipelineName: string | null;
  passed: boolean;
  actualValue: string;
  expectedValue: string;
  evaluatedAt: string;
  details: string;
}

interface QualitySummary {
  totalRules: number;
  enabledRules: number;
  passRate: { overall: number; critical: number; warning: number; info: number };
  recentFailures: QualityResult[];
  rulesByModel: Record<string, { total: number; passRate: number }>;
  trend: { date: string; passRate: number }[];
}

// ==================== STATUS VARIANT MAPS ====================

const PIPELINE_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default', running: 'default', paused: 'secondary', disabled: 'outline', failed: 'destructive', scheduled: 'outline',
};

const EXECUTION_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  succeeded: 'default', running: 'default', failed: 'destructive', cancelled: 'secondary', retrying: 'outline',
};

const SOURCE_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default', inactive: 'secondary', error: 'destructive', maintenance: 'outline',
};

const SEVERITY_VARIANT: Record<string, 'destructive' | 'outline' | 'secondary'> = {
  critical: 'destructive', warning: 'outline', info: 'secondary',
};

const TRIGGER_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  scheduled: 'default', manual: 'secondary', retry: 'outline', webhook: 'outline',
};

// ==================== HELPERS ====================

function formatDuration(ms: number): string {
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatRecords(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function freshnessColor(seconds: number): string {
  if (seconds < 300) return 'text-emerald-600';
  if (seconds < 1800) return 'text-amber-600';
  return 'text-red-600';
}

function freshnessBg(seconds: number): string {
  if (seconds < 300) return 'bg-emerald-500/10';
  if (seconds < 1800) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

// ==================== KPI CARD (declared outside render) ====================

function KpiCard({ label, value, sub, icon: Icon, iconColor, iconBg }: {
  label: string; value: string; sub?: string; icon: typeof Activity; iconColor: string; iconBg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
          </div>
          <div className={cn('h-11 w-11 rounded-full flex items-center justify-center shrink-0 ml-3', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MAIN COMPONENT ====================

export default function DataPipelineView() {
  const t = useT();
  const queryClient = useQueryClient();

  // ---- Overview Tab ----
  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ['etl-dashboard'],
    queryFn: () => fetch('/api/etl/dashboard').then(r => { if (!r.ok) throw new Error('API error'); return r.json(); }),
    refetchInterval: 15000,
  });

  // ---- Pipelines Tab ----
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState('all');

  const { data: pipelinesData, isLoading: pipelinesLoading, refetch: refetchPipelines } = useQuery<PipelinesResponse>({
    queryKey: ['etl-pipelines', pipelineStatusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (pipelineStatusFilter !== 'all') params.set('status', pipelineStatusFilter);
      return fetch(`/api/etl/pipelines?${params}`).then(r => { if (!r.ok) throw new Error('API error'); return r.json(); });
    },
  });

  const filteredPipelines = (pipelinesData?.pipelines ?? []).filter(p =>
    pipelineSearch === '' || p.name.toLowerCase().includes(pipelineSearch.toLowerCase())
  );

  const runPipelineMutation = useMutation({
    mutationFn: (pipelineId: string) =>
      fetch('/api/etl/pipelines/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId }),
      }).then(r => { if (!r.ok) throw new Error('API error'); return r.json(); }),
    onSuccess: () => {
      toast.success(t('etl.pipelineRunStarted'));
      queryClient.invalidateQueries({ queryKey: ['etl-pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['etl-dashboard'] });
    },
    onError: () => {
      toast.error(t('etl.pipelineRunFailed'));
    },
  });

  const togglePipelineMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      fetch('/api/etl/pipelines', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      }).then(r => { if (!r.ok) throw new Error('API error'); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etl-pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['etl-dashboard'] });
    },
  });

  // ---- Executions Tab ----
  const [execPipelineFilter, setExecPipelineFilter] = useState('all');
  const [execStatusFilter, setExecStatusFilter] = useState('all');
  const [execPage, setExecPage] = useState(0);
  const [expandedExec, setExpandedExec] = useState<string | null>(null);
  const EXEC_PAGE_SIZE = 20;

  const { data: executionsData, isLoading: executionsLoading, refetch: refetchExecutions } = useQuery<ExecutionsResponse>({
    queryKey: ['etl-executions', execPipelineFilter, execStatusFilter, execPage],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(EXEC_PAGE_SIZE), offset: String(execPage * EXEC_PAGE_SIZE) });
      if (execPipelineFilter !== 'all') params.set('pipelineId', execPipelineFilter);
      if (execStatusFilter !== 'all') params.set('status', execStatusFilter);
      return fetch(`/api/etl/executions?${params}`).then(r => { if (!r.ok) throw new Error('API error'); return r.json(); });
    },
  });

  // ---- Data Quality Tab ----
  const { data: qualitySummary, refetch: refetchQuality } = useQuery<QualitySummary>({
    queryKey: ['etl-quality-summary'],
    queryFn: () => fetch('/api/etl/quality/summary').then(r => { if (!r.ok) throw new Error('API error'); return r.json(); }),
    refetchInterval: 30000,
  });

  const { data: qualityRules, isLoading: rulesLoading } = useQuery<RulesResponse>({
    queryKey: ['etl-quality-rules'],
    queryFn: () => fetch('/api/etl/quality/rules').then(r => { if (!r.ok) throw new Error('API error'); return r.json(); }),
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      fetch('/api/etl/quality/rules', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isEnabled }),
      }).then(r => { if (!r.ok) throw new Error('API error'); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etl-quality-rules'] });
      queryClient.invalidateQueries({ queryKey: ['etl-quality-summary'] });
    },
  });

  // ---- Sources Tab ----
  const { data: sourcesData, isLoading: sourcesLoading } = useQuery<SourcesResponse>({
    queryKey: ['etl-sources'],
    queryFn: () => fetch('/api/etl/sources').then(r => { if (!r.ok) throw new Error('API error'); return r.json(); }),
  });

  // ==================== LOADING SKELETON ====================
  if (dashLoading && !dashboard) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  // ==================== RENDER ====================
  const avgErrorRate = dashboard ? ((dashboard.executions.failed24h / Math.max(dashboard.executions.total24h, 1)) * 100) : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm"><BarChart3 className="h-4 w-4 mr-1.5 hidden sm:inline-block" />{t('etl.overview')}</TabsTrigger>
          <TabsTrigger value="pipelines" className="text-xs sm:text-sm"><Layers className="h-4 w-4 mr-1.5 hidden sm:inline-block" />{t('etl.pipelines')}</TabsTrigger>
          <TabsTrigger value="executions" className="text-xs sm:text-sm"><Activity className="h-4 w-4 mr-1.5 hidden sm:inline-block" />{t('etl.executions')}</TabsTrigger>
          <TabsTrigger value="quality" className="text-xs sm:text-sm"><ShieldCheck className="h-4 w-4 mr-1.5 hidden sm:inline-block" />{t('etl.dataQuality')}</TabsTrigger>
          <TabsTrigger value="sources" className="text-xs sm:text-sm"><Server className="h-4 w-4 mr-1.5 hidden sm:inline-block" />{t('etl.sources')}</TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: OVERVIEW ===================== */}
        <TabsContent value="overview" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label={t('etl.activePipelines')}
              value={`${dashboard?.pipelines.active ?? 0}/${dashboard?.pipelines.total ?? 0}`}
              sub={`${dashboard?.pipelines.failed ?? 0} ${t('etl.failed').toLowerCase()}`}
              icon={Layers}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            />
            <KpiCard
              label={t('etl.records24h')}
              value={formatRecords(dashboard?.executions.totalRecords24h ?? 0)}
              sub={`${dashboard?.executions.total24h ?? 0} ${t('etl.executions').toLowerCase()}`}
              icon={Database}
              iconColor="text-violet-600"
              iconBg="bg-violet-100 dark:bg-violet-900/30"
            />
            <KpiCard
              label={t('etl.avgErrorRate')}
              value={`${avgErrorRate.toFixed(2)}%`}
              sub={`${dashboard?.executions.failed24h ?? 0}/${dashboard?.executions.total24h ?? 0}`}
              icon={AlertTriangle}
              iconColor="text-amber-600"
              iconBg="bg-amber-100 dark:bg-amber-900/30"
            />
            <KpiCard
              label={t('etl.qualityScore')}
              value={`${(dashboard?.quality.overallPassRate ?? 0).toFixed(1)}%`}
              sub={`${dashboard?.quality.failingRules ?? 0} ${t('etl.failingRules').toLowerCase()}`}
              icon={ShieldCheck}
              iconColor="text-teal-600"
              iconBg="bg-teal-100 dark:bg-teal-900/30"
            />
          </div>

          {/* Throughput Chart */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t('etl.throughput24h')}</CardTitle></CardHeader>
            <CardContent>
              {dashboard?.throughput && dashboard.throughput.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={dashboard.throughput}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(v: number, name: string) => [v.toLocaleString(), t(`etl.${name}`)]}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend formatter={(value: string) => t(`etl.${value}`)} />
                    <Line type="monotone" dataKey="ingested" stroke="#10B981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="transformed" stroke="#F59E0B" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">{t('etl.noData')}</div>
              )}
            </CardContent>
          </Card>

          {/* Recent Executions */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t('etl.recentExecutions')}</CardTitle></CardHeader>
            <CardContent>
              {dashboard?.recentExecutions && dashboard.recentExecutions.length > 0 ? (
                <ScrollArea className="max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('etl.pipeline')}</TableHead>
                        <TableHead>{t('etl.status')}</TableHead>
                        <TableHead>{t('etl.trigger')}</TableHead>
                        <TableHead className="text-right">{t('etl.recordsIn')}</TableHead>
                        <TableHead className="text-right">{t('etl.recordsOut')}</TableHead>
                        <TableHead className="text-right">{t('etl.recordsError')}</TableHead>
                        <TableHead>{t('etl.duration')}</TableHead>
                        <TableHead>{t('etl.startedAt')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard.recentExecutions.slice(0, 10).map(exec => (
                        <TableRow key={exec.id}>
                          <TableCell className="font-medium text-xs max-w-[140px] truncate">{exec.pipelineName}</TableCell>
                          <TableCell><Badge variant={EXECUTION_STATUS_VARIANT[exec.status] ?? 'secondary'} className="text-[10px]">{t(`etl.${exec.status}`)}</Badge></TableCell>
                          <TableCell><Badge variant={TRIGGER_VARIANT[exec.triggerType] ?? 'outline'} className="text-[10px]">{t(`etl.${exec.triggerType}`)}</Badge></TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatRecords(exec.recordsIn)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatRecords(exec.recordsOut)}</TableCell>
                          <TableCell className={cn('text-right font-mono text-xs', exec.recordsError > 0 ? 'text-red-600' : '')}>{formatRecords(exec.recordsError)}</TableCell>
                          <TableCell className="text-xs font-mono">{formatDuration(exec.durationMs)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{exec.startedAt ? new Date(exec.startedAt).toLocaleString() : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">{t('etl.noData')}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 2: PIPELINES ===================== */}
        <TabsContent value="pipelines" className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('etl.search')}
                value={pipelineSearch}
                onChange={e => setPipelineSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={pipelineStatusFilter} onValueChange={setPipelineStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('etl.all')}</SelectItem>
                <SelectItem value="active">{t('etl.activePipelines')}</SelectItem>
                <SelectItem value="paused">{t('etl.paused')}</SelectItem>
                <SelectItem value="disabled">{t('etl.disabled')}</SelectItem>
                <SelectItem value="failed">{t('etl.failed')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetchPipelines()}>
              <RefreshCw className="h-4 w-4 mr-1.5" />{t('etl.refresh')}
            </Button>
          </div>

          {/* Pipeline Cards Grid */}
          {pipelinesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : filteredPipelines.length === 0 ? (
            <Card><CardContent className="p-8 flex items-center justify-center text-muted-foreground">{t('etl.noData')}</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPipelines.map(pipeline => {
                const successRate = pipeline.totalRuns > 0 ? (pipeline.successRuns / pipeline.totalRuns) * 100 : 100;
                return (
                  <Card key={pipeline.id} className="flex flex-col">
                    <CardContent className="p-4 flex-1 flex flex-col gap-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{pipeline.name}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <span className="truncate">{pipeline.source}</span>
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span className="truncate">{pipeline.target}</span>
                          </div>
                        </div>
                        <Badge variant={PIPELINE_STATUS_VARIANT[pipeline.status] ?? 'secondary'} className="text-[10px] shrink-0">
                          {t(`etl.${pipeline.status}`)}
                        </Badge>
                      </div>

                      {/* Schedule */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-mono">{pipeline.schedule}</span>
                      </div>

                      <Separator />

                      {/* KPIs */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">{t('etl.totalRuns')}</span>
                          <p className="font-semibold mt-0.5">{pipeline.totalRuns}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('etl.avgDuration')}</span>
                          <p className="font-semibold mt-0.5 font-mono">{formatDuration(pipeline.avgDurationMs)}</p>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted-foreground">{t('etl.successRate')}</span>
                            <span className="font-semibold">{successRate.toFixed(1)}%</span>
                          </div>
                          <Progress value={successRate} className="h-1.5" />
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('etl.records')}</span>
                          <p className="font-semibold mt-0.5 font-mono">{formatRecords(pipeline.recordsProcessed)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('etl.lastRun')}</span>
                          <p className="font-semibold mt-0.5">{pipeline.lastRun ? timeAgo(pipeline.lastRun, t) : '—'}</p>
                        </div>
                      </div>

                      <Separator />

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pipeline.enabled}
                            onCheckedChange={(checked) => togglePipelineMutation.mutate({ id: pipeline.id, enabled: checked })}
                            disabled={togglePipelineMutation.isPending}
                          />
                          <span className="text-xs text-muted-foreground">{pipeline.enabled ? t('etl.enabled') : t('etl.disabled')}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => runPipelineMutation.mutate(pipeline.id)}
                          disabled={runPipelineMutation.isPending || !pipeline.enabled}
                        >
                          {runPipelineMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                          {t('etl.runNow')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===================== TAB 3: EXECUTIONS ===================== */}
        <TabsContent value="executions" className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={execPipelineFilter} onValueChange={v => { setExecPipelineFilter(v); setExecPage(0); }}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <Layers className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('etl.pipeline')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('etl.all')} — {t('etl.pipelines')}</SelectItem>
                {(pipelinesData?.pipelines ?? []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={execStatusFilter} onValueChange={v => { setExecStatusFilter(v); setExecPage(0); }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('etl.all')} — {t('etl.status')}</SelectItem>
                <SelectItem value="succeeded">{t('etl.succeeded')}</SelectItem>
                <SelectItem value="failed">{t('etl.failed')}</SelectItem>
                <SelectItem value="running">{t('etl.running')}</SelectItem>
                <SelectItem value="cancelled">{t('etl.cancelled')}</SelectItem>
                <SelectItem value="retrying">{t('etl.retrying')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetchExecutions()}>
              <RefreshCw className="h-4 w-4 mr-1.5" />{t('etl.refresh')}
            </Button>
          </div>

          {/* Executions Table */}
          <Card>
            <CardContent className="p-4">
              {executionsLoading ? (
                <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : !executionsData?.executions || executionsData.executions.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">{t('etl.noData')}</div>
              ) : (
                <>
                  <ScrollArea className="max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8" />
                          <TableHead>ID</TableHead>
                          <TableHead>{t('etl.pipeline')}</TableHead>
                          <TableHead>{t('etl.status')}</TableHead>
                          <TableHead>{t('etl.trigger')}</TableHead>
                          <TableHead className="text-right">{t('etl.recordsIn')}</TableHead>
                          <TableHead className="text-right">{t('etl.recordsOut')}</TableHead>
                          <TableHead className="text-right">{t('etl.errors')}</TableHead>
                          <TableHead>{t('etl.errorRate')}</TableHead>
                          <TableHead>{t('etl.duration')}</TableHead>
                          <TableHead>{t('etl.startedAt')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {executionsData.executions.map(exec => {
                          const isExpanded = expandedExec === exec.id;
                          const steps = exec.stepResults ?? [];
                          return (
                            <>
                              <TableRow
                                key={exec.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setExpandedExec(isExpanded ? null : exec.id)}
                              >
                                <TableCell className="w-8 p-2">
                                  {steps.length > 0 && (isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
                                </TableCell>
                                <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[80px] truncate">{exec.id.slice(0, 8)}…</TableCell>
                                <TableCell className="font-medium text-xs max-w-[140px] truncate">{exec.pipelineName}</TableCell>
                                <TableCell><Badge variant={EXECUTION_STATUS_VARIANT[exec.status] ?? 'secondary'} className="text-[10px]">{t(`etl.${exec.status}`)}</Badge></TableCell>
                                <TableCell><Badge variant={TRIGGER_VARIANT[exec.triggerType] ?? 'outline'} className="text-[10px]">{t(`etl.${exec.triggerType}`)}</Badge></TableCell>
                                <TableCell className="text-right font-mono text-xs">{formatRecords(exec.recordsIn)}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{formatRecords(exec.recordsOut)}</TableCell>
                                <TableCell className={cn('text-right font-mono text-xs', exec.recordsError > 0 ? 'text-red-600' : '')}>{formatRecords(exec.recordsError)}</TableCell>
                                <TableCell className={cn('text-xs font-mono', exec.errorRate > 5 ? 'text-red-600' : '')}>{exec.errorRate.toFixed(1)}%</TableCell>
                                <TableCell className="text-xs font-mono">{formatDuration(exec.durationMs)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{exec.startedAt ? new Date(exec.startedAt).toLocaleString() : '—'}</TableCell>
                              </TableRow>
                              {/* Expanded: Step Results Timeline */}
                              {isExpanded && steps.length > 0 && (
                                <TableRow key={`${exec.id}-steps`}>
                                  <TableCell colSpan={11} className="bg-muted/30 p-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-stretch gap-3 sm:gap-0">
                                      {steps.map((step, idx) => (
                                        <div key={step.step} className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                                          {/* Step card */}
                                          <div className={cn(
                                            'flex-1 rounded-lg border p-3 min-w-0',
                                            step.status === 'succeeded' ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' :
                                            step.status === 'failed' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
                                            'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                                          )}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                              {step.step === 'extract' ? <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" /> :
                                               step.step === 'transform' ? <Zap className="h-3.5 w-3.5 text-amber-600" /> :
                                               <Database className="h-3.5 w-3.5 text-violet-600" />}
                                              <span className="font-medium text-xs capitalize">{t(`etl.${step.step}`)}</span>
                                              {step.status === 'succeeded' ? <CheckCircle2 className="h-3 w-3 text-emerald-600 ml-auto" /> :
                                               step.status === 'failed' ? <XCircle className="h-3 w-3 text-red-600 ml-auto" /> :
                                               <Loader2 className="h-3 w-3 text-amber-600 ml-auto animate-spin" />}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                                              <div><span className="block font-medium text-foreground">{formatRecords(step.recordsIn)}</span>{t('etl.recordsIn')}</div>
                                              <div><span className="block font-medium text-foreground">{formatRecords(step.recordsOut)}</span>{t('etl.recordsOut')}</div>
                                              <div><span className="block font-medium text-foreground">{formatDuration(step.durationMs)}</span>{t('etl.duration')}</div>
                                            </div>
                                          </div>
                                          {/* Arrow connector */}
                                          {idx < steps.length - 1 && (
                                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block mx-1 mt-4" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      {t('etl.total')}: {executionsData.total} · {t('etl.executions')}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm" variant="outline" className="h-8 text-xs"
                        disabled={execPage === 0}
                        onClick={() => setExecPage(p => p - 1)}
                      >← {t('etl.previous') || 'Previous'}</Button>
                      <Button
                        size="sm" variant="outline" className="h-8 text-xs"
                        disabled={(execPage + 1) * EXEC_PAGE_SIZE >= (executionsData.total ?? 0)}
                        onClick={() => setExecPage(p => p + 1)}
                      >{t('etl.next') || 'Next'} →</Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 4: DATA QUALITY ===================== */}
        <TabsContent value="quality" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
                    <circle
                      cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
                      strokeDasharray={`${(qualitySummary?.passRate.overall ?? 0) / 100 * 175.93} 175.93`}
                      strokeLinecap="round"
                      className={cn(
                        (qualitySummary?.passRate.overall ?? 0) >= 95 ? 'text-emerald-500' :
                        (qualitySummary?.passRate.overall ?? 0) >= 90 ? 'text-amber-500' : 'text-red-500'
                      )}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    {(qualitySummary?.passRate.overall ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('etl.passRate')}</p>
                  <p className="text-lg font-bold">{t('etl.dataQuality')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('etl.failingRules')}</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">{qualitySummary?.recentFailures.length ?? 0}</p>
                  </div>
                  <div className="h-11 w-11 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('etl.rulesEvaluated')}</p>
                    <p className="text-2xl font-bold mt-1">{qualitySummary?.totalRules ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{qualitySummary?.enabledRules ?? 0} {t('etl.enabled').toLowerCase()}</p>
                  </div>
                  <div className="h-11 w-11 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pass Rate Trend */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t('etl.passRateTrend')}</CardTitle></CardHeader>
            <CardContent>
              {qualitySummary?.trend && qualitySummary.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={qualitySummary.trend}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="passRate" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">{t('etl.noData')}</div>
              )}
            </CardContent>
          </Card>

          {/* Rules Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('etl.ruleName')}s</CardTitle>
                <Button variant="outline" size="sm" onClick={() => refetchQuality()}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />{t('etl.refresh')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : !qualityRules?.rules || qualityRules.rules.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">{t('etl.noData')}</div>
              ) : (
                <ScrollArea className="max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('etl.ruleName')}</TableHead>
                        <TableHead>{t('etl.targetModel')}</TableHead>
                        <TableHead>{t('etl.ruleType')}</TableHead>
                        <TableHead>{t('etl.severity')}</TableHead>
                        <TableHead>{t('etl.passRate')}</TableHead>
                        <TableHead>{t('etl.lastEvaluated')}</TableHead>
                        <TableHead>{t('etl.enabled')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qualityRules.rules.map(rule => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium text-xs max-w-[160px] truncate" title={rule.name}>{rule.name}</TableCell>
                          <TableCell className="text-xs">{rule.targetModel}</TableCell>
                          <TableCell className="text-xs">{rule.ruleType}</TableCell>
                          <TableCell><Badge variant={SEVERITY_VARIANT[rule.severity] ?? 'secondary'} className="text-[10px]">{t(`etl.${rule.severity}`)}</Badge></TableCell>
                          <TableCell className="w-[140px]">
                            <div className="flex items-center gap-2">
                              <Progress value={rule.lastPassRate} className="h-1.5 flex-1" />
                              <span className="text-[10px] font-mono w-10 text-right">{rule.lastPassRate.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{rule.lastEvaluatedAt ? timeAgo(rule.lastEvaluatedAt, t) : '—'}</TableCell>
                          <TableCell>
                            <Switch
                              checked={rule.isEnabled}
                              onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, isEnabled: checked })}
                              disabled={toggleRuleMutation.isPending}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Recent Failures */}
          {qualitySummary?.recentFailures && qualitySummary.recentFailures.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base text-red-600">{t('etl.recentFailures')}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {qualitySummary.recentFailures.slice(0, 5).map(failure => (
                    <div key={failure.id} className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-xs">{failure.ruleName}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{failure.ruleTargetModel} · {failure.pipelineName ?? '—'}</p>
                        </div>
                        <Badge variant={SEVERITY_VARIANT[failure.ruleSeverity] ?? 'secondary'} className="text-[10px] shrink-0">{t(`etl.${failure.ruleSeverity}`)}</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                        <div><span className="text-foreground font-medium">{t('etl.expected')}:</span> {failure.expectedValue}</div>
                        <div><span className="text-foreground font-medium">{t('etl.actualValue') || 'Actual'}:</span> {failure.actualValue}</div>
                      </div>
                      {failure.details && (
                        <p className="text-[10px] text-red-600 mt-2 bg-red-100 dark:bg-red-900/30 rounded px-2 py-1">{failure.details}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1.5">{failure.evaluatedAt ? timeAgo(failure.evaluatedAt, t) : ''}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===================== TAB 5: SOURCES ===================== */}
        <TabsContent value="sources" className="space-y-4">
          {sourcesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : !sourcesData?.sources || sourcesData.sources.length === 0 ? (
            <Card><CardContent className="p-8 flex items-center justify-center text-muted-foreground">{t('etl.noData')}</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sourcesData.sources.map(source => {
                const freshSec = source.freshnessSeconds ?? 9999;
                return (
                  <Card key={source.id}>
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{source.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{source.description}</p>
                        </div>
                        <Badge variant={SOURCE_STATUS_VARIANT[source.status] ?? 'secondary'} className="text-[10px] shrink-0">
                          {t(`etl.${source.status}`)}
                        </Badge>
                      </div>

                      {/* Type + Protocol + Endpoint */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{source.type}</Badge>
                          <span className="text-muted-foreground">{t('etl.protocol')}: {source.protocol}</span>
                        </div>
                        <p className="text-muted-foreground font-mono truncate" title={source.endpoint}>{source.endpoint}</p>
                      </div>

                      <Separator />

                      {/* Metrics */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">{t('etl.recordsAvailable')}</span>
                          <p className="font-semibold mt-0.5 font-mono">{formatRecords(source.recordsAvailable)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('etl.lastSync')}</span>
                          <p className="font-semibold mt-0.5">{source.lastSyncAt ? timeAgo(source.lastSyncAt, t) : '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('etl.freshness')}</span>
                          <p className={cn('font-semibold mt-0.5', freshnessColor(freshSec))}>
                            {freshSec < 60 ? `${freshSec}s` : `${Math.floor(freshSec / 60)}m`}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('etl.latency')}</span>
                          <p className="font-semibold mt-0.5 font-mono">{source.avgLatencyMs}ms</p>
                        </div>
                      </div>

                      {/* Freshness indicator bar */}
                      <div className={cn('h-1.5 rounded-full', freshnessBg(freshSec))}>
                        <div
                          className={cn('h-full rounded-full transition-all',
                            freshSec < 300 ? 'bg-emerald-500' :
                            freshSec < 1800 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${Math.max(5, 100 - (freshSec / 3600) * 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
