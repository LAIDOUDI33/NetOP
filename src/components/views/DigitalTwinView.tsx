'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Minus, Box, Zap, AlertTriangle, Plus, Play, Eye, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

// ==================== TYPES ====================

interface DashboardData {
  totalScenarios: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  avgImpactScore: number;
  recentScenarios: RecentScenario[];
}

interface RecentScenario {
  id: string;
  name: string;
  type: string;
  status: string;
  impactScore: number;
  createdAt: string;
}

interface ScenarioRaw {
  id: string;
  name: string;
  description: string;
  scenarioType: string;
  status: string;
  targetRegion: string;
  parameters: string;
  results: string | null;
  impactScore: number;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  targetSite: { id: string; name: string; code: string; region: string } | null;
  _count: { simulationResults: number };
}

interface ScenarioItem {
  id: string;
  name: string;
  type: string;
  region: string;
  status: string;
  impact: number;
  confidence: number;
  description: string;
  parameters: Record<string, unknown>;
  results: MetricComparison[] | null;
  createdAt: string;
}

interface MetricComparison {
  metricName: string;
  before: number;
  after: number;
  delta: number;
  deltaPercent: number;
}

// ==================== HELPERS ====================

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

const typeBadge = (type: string) => {
  const map: Record<string, string> = {
    what_if: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300',
    disaster: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300',
    capacity_expansion: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300',
    parameter_change: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300',
    new_site: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300',
  };
  return (
    <Badge variant="outline" className={map[type] ?? ''}>
      {type.replace(/_/g, ' ')}
    </Badge>
  );
};

const statusBadge = (status: string, t: (k: string) => string) => {
  const variants: Record<string, 'secondary' | 'outline' | 'default'> = {
    draft: 'secondary',
    simulated: 'outline',
    completed: 'outline',
    archived: 'secondary',
  };
  const cls = status === 'completed' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
    : status === 'simulated' ? 'border-blue-500 text-blue-600 dark:text-blue-400'
    : '';
  return <Badge variant={variants[status] ?? 'secondary'} className={cls}>{t(`status.${status}`)}</Badge>;
};

const impactColor = (v: number) => v > 0 ? 'text-emerald-600 dark:text-emerald-400' : v < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';
const impactIcon = (v: number) => v > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : v < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />;

const typeKeys: Record<string, string> = {
  what_if: 'dt.whatIf', disaster: 'dt.disaster', capacity_expansion: 'dt.capacityExpansion',
  parameter_change: 'dt.parameterChange', new_site: 'dt.newSite',
};

function parseScenarioResults(resultsStr: string | null): MetricComparison[] {
  if (!resultsStr) return [];
  try {
    const data = JSON.parse(resultsStr);
    // Handle both {before, after, delta} and [{metricName, before, after, delta}] formats
    if (Array.isArray(data)) return data;
    if (data?.before && data?.after) {
      const metrics: MetricComparison[] = [];
      const keys = Object.keys(data.before) as (keyof typeof data.before)[];
      for (const k of keys) {
        const b = Number(data.before[k]) || 0;
        const a = Number(data.after[k]) || 0;
        const d = a - b;
        metrics.push({ metricName: String(k), before: b, after: a, delta: d, deltaPercent: b !== 0 ? (d / b) * 100 : 0 });
      }
      return metrics;
    }
  } catch { /* ignore parse errors */ }
  return [];
}

function mapScenario(raw: ScenarioRaw): ScenarioItem {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.scenarioType,
    region: raw.targetRegion || raw.targetSite?.region || '—',
    status: raw.status,
    impact: raw.impactScore,
    confidence: raw.confidence,
    description: raw.description,
    parameters: (() => { try { return JSON.parse(raw.parameters || '{}'); } catch { return {}; } })(),
    results: parseScenarioResults(raw.results),
    createdAt: raw.createdAt,
  };
}

// ==================== SKELETON ====================

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4"><Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-3 w-32" /></div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-4"><Skeleton className="h-48 w-full" /></div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex gap-3 mb-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-9 w-36" />)}</div>
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)}
    </div>
  );
}

// ==================== TAB 1: OVERVIEW ====================

function OverviewTab() {
  const t = useT();
  const { data, isLoading } = useQuery<DashboardData>({ queryKey: ['dt-dashboard'], queryFn: () => fetch('/api/digital-twin/dashboard').then(r => r.json()) });

  if (isLoading || !data) return <OverviewSkeleton />;

  const completedCount = data.byStatus.completed ?? 0;
  const simulatedCount = data.byStatus.simulated ?? 0;
  const typeDistribution = data.byType;

  const summaryCards = [
    { label: t('dt.totalScenarios'), value: data.totalScenarios, icon: Box, color: 'text-blue-600' },
    { label: t('dt.avgImpact'), value: fmt(data.avgImpactScore), icon: BarChart3, color: impactColor(data.avgImpactScore) },
    { label: t('status.completed'), value: completedCount, icon: TrendingUp, color: 'text-emerald-600' },
    { label: t('dt.simulating'), value: simulatedCount, icon: Zap, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={i} className="rounded-lg border bg-card p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                  <Icon className={`h-4 w-4 ${c.color}`} />
                </div>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Type distribution */}
      <Card className="rounded-lg border bg-card p-4">
        <CardHeader className="p-0 pb-3"><CardTitle className="text-sm font-semibold">{t('dt.type')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(typeDistribution).map(([type, count]) => (
              <div key={type} className="rounded-lg border p-3 text-center bg-muted/30">
                <p className="text-lg font-bold">{count}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t(typeKeys[type] ?? type)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent scenarios */}
      <Card className="rounded-lg border bg-card p-4">
        <CardHeader className="p-0 pb-3"><CardTitle className="text-sm font-semibold">{t('dt.scenarios')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table><TableHeader><TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">{t('dt.type')}</TableHead>
              <TableHead className="text-xs">{t('status.status')}</TableHead>
              <TableHead className="text-xs">{t('dt.impactScore')}</TableHead>
              <TableHead className="text-xs">Date</TableHead>
            </TableRow></TableHeader><TableBody>
              {data.recentScenarios.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm font-medium">{s.name}</TableCell>
                  <TableCell>{typeBadge(s.type)}</TableCell>
                  <TableCell>{statusBadge(s.status, t)}</TableCell>
                  <TableCell className={impactColor(s.impactScore)}>{fmt(s.impactScore)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== TAB 2: SCENARIOS ====================

function ScenariosTab() {
  const t = useT();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ scenarios: ScenarioRaw[]; total: number }>({
    queryKey: ['dt-scenarios', typeFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      return fetch(`/api/digital-twin/scenarios${qs ? '?' + qs : ''}`).then(r => r.json());
    },
    select: (d) => ({ ...d, scenarios: d.scenarios.map(mapScenario) }),
  });

  const selectedScenario = detailId ? data?.scenarios.find(s => s.id === detailId) : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-9 text-xs"><SelectValue placeholder={t('dt.type')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="what_if">{t('dt.whatIf')}</SelectItem>
            <SelectItem value="disaster">{t('dt.disaster')}</SelectItem>
            <SelectItem value="capacity_expansion">{t('dt.capacityExpansion')}</SelectItem>
            <SelectItem value="parameter_change">{t('dt.parameterChange')}</SelectItem>
            <SelectItem value="new_site">{t('dt.newSite')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 text-xs"><SelectValue placeholder={t('status.status')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">{t('status.draft')}</SelectItem>
            <SelectItem value="simulated">{t('status.simulated')}</SelectItem>
            <SelectItem value="completed">{t('status.completed')}</SelectItem>
            <SelectItem value="archived">{t('status.archived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <TableSkeleton /> : !data?.scenarios?.length ? (
        <Card className="rounded-lg border bg-card p-4"><CardContent className="p-6 text-center text-muted-foreground text-sm">{t('dt.noScenarios')}</CardContent></Card>
      ) : (
        <Card className="rounded-lg border bg-card p-4">
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table><TableHeader><TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">{t('dt.type')}</TableHead>
                <TableHead className="text-xs">{t('dt.region')}</TableHead>
                <TableHead className="text-xs">{t('status.status')}</TableHead>
                <TableHead className="text-xs">{t('dt.impactScore')}</TableHead>
                <TableHead className="text-xs">{t('dt.confidence')}</TableHead>
                <TableHead className="text-xs">Created</TableHead>
              </TableRow></TableHeader><TableBody>
                {data.scenarios.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailId(s.id)}>
                    <TableCell className="text-sm font-medium">{s.name}</TableCell>
                    <TableCell>{typeBadge(s.type)}</TableCell>
                    <TableCell className="text-xs">{s.region}</TableCell>
                    <TableCell>{statusBadge(s.status, t)}</TableCell>
                    <TableCell className={`text-sm font-medium ${impactColor(s.impact)}`}>{fmt(s.impact)}</TableCell>
                    <TableCell className="text-xs">{fmt(s.confidence * 100)}%</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedScenario} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" />{selectedScenario?.name}</DialogTitle></DialogHeader>
          {selectedScenario && <ScenarioDetail scenario={selectedScenario} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== TAB 3: SCENARIO DETAIL ====================

function ScenarioDetail({ scenario }: { scenario: ScenarioItem }) {
  const t = useT();

  return (
    <div className="space-y-4 mt-2">
      {/* Info card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3 bg-muted/30"><p className="text-[10px] text-muted-foreground uppercase">{t('dt.type')}</p><p className="text-sm font-medium mt-1">{typeBadge(scenario.type)}</p></div>
        <div className="rounded-lg border p-3 bg-muted/30"><p className="text-[10px] text-muted-foreground uppercase">{t('dt.region')}</p><p className="text-sm font-medium mt-1">{scenario.region}</p></div>
        <div className="rounded-lg border p-3 bg-muted/30"><p className="text-[10px] text-muted-foreground uppercase">{t('status.status')}</p><p className="text-sm font-medium mt-1">{statusBadge(scenario.status, t)}</p></div>
        <div className="rounded-lg border p-3 bg-muted/30"><p className="text-[10px] text-muted-foreground uppercase">{t('dt.confidence')}</p><p className="text-sm font-medium mt-1">{fmt(scenario.confidence * 100)}%</p></div>
      </div>

      {scenario.description && <p className="text-sm text-muted-foreground">{scenario.description}</p>}

      {scenario.parameters && Object.keys(scenario.parameters).length > 0 && (
        <div><p className="text-xs font-semibold mb-1">{t('dt.parameters')}</p>
        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-32">{JSON.stringify(scenario.parameters, null, 2)}</pre></div>
      )}

      {/* Before/After comparison */}
      {scenario.results && scenario.results.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2">{t('dt.results')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {scenario.results.map((m, i) => (
              <div key={i} className="rounded-lg border p-3 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">{m.metricName}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium ${impactColor(m.delta)}`}>
                    {impactIcon(m.delta)} {m.delta > 0 ? '+' : ''}{fmt(m.delta)} ({m.deltaPercent > 0 ? '+' : ''}{fmt(m.deltaPercent)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{t('dt.before')}</span>
                  <span className="font-mono font-medium">{fmt(m.before)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">{t('dt.after')}</span>
                  <span className="font-mono font-medium">{fmt(m.after)}</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, 50 + m.deltaPercent))} className="h-1.5 mt-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {(!scenario.results || scenario.results.length === 0) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><AlertTriangle className="h-4 w-4" />{t('dt.noResults')}</div>
      )}
    </div>
  );
}

// ==================== TAB 4: NEW SCENARIO ====================

function NewScenarioTab() {
  const t = useT();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [region, setRegion] = useState('');
  const [params, setParams] = useState('{\n  "key": "value"\n}');

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/digital-twin/scenarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dt-scenarios'] }); queryClient.invalidateQueries({ queryKey: ['dt-dashboard'] }); setName(''); setDescription(''); setType(''); setRegion(''); setParams('{\n  "key": "value"\n}'); toast.success(t('dt.createSuccess')); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedParams: Record<string, unknown> = {};
    try { parsedParams = JSON.parse(params); } catch { toast.error('Invalid JSON parameters'); return; }
    mutation.mutate({ name, description, scenarioType: type, targetRegion: region, parameters: parsedParams });
  };

  return (
    <Card className="rounded-lg border bg-card p-6 max-w-2xl">
      <CardHeader className="p-0 pb-4"><CardTitle className="text-base font-semibold flex items-center gap-2"><Plus className="h-4 w-4" />{t('dt.newScenario')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-xs font-medium text-muted-foreground">Name</label><Input value={name} onChange={e => setName(e.target.value)} required className="mt-1 h-9 text-sm" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">{t('dt.region')}</label><Input value={region} onChange={e => setRegion(e.target.value)} required className="mt-1 h-9 text-sm" placeholder="e.g. Algiers" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">{t('dt.type')}</label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="what_if">{t('dt.whatIf')}</SelectItem>
                <SelectItem value="disaster">{t('dt.disaster')}</SelectItem>
                <SelectItem value="capacity_expansion">{t('dt.capacityExpansion')}</SelectItem>
                <SelectItem value="parameter_change">{t('dt.parameterChange')}</SelectItem>
                <SelectItem value="new_site">{t('dt.newSite')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Description</label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 text-sm" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">{t('dt.parameters')} (JSON)</label><Textarea value={params} onChange={e => setParams(e.target.value)} rows={5} className="mt-1 text-sm font-mono" /></div>
          <Button type="submit" disabled={mutation.isPending} className="h-9 text-sm">
            {mutation.isPending ? <><Zap className="h-3.5 w-3.5 mr-1.5 animate-spin" />{t('dt.simulating')}</> : <><Play className="h-3.5 w-3.5 mr-1.5" />{t('dt.simulate')}</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ==================== MAIN VIEW ====================

export default function DigitalTwinView() {
  const t = useT();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Box className="h-5 w-5 text-primary" />{t('dt.title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('dt.overview')}</p>
        </div>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs px-3 h-7">{t('dt.overview')}</TabsTrigger>
          <TabsTrigger value="scenarios" className="text-xs px-3 h-7">{t('dt.scenarios')}</TabsTrigger>
          <TabsTrigger value="new" className="text-xs px-3 h-7">{t('dt.newScenario')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="scenarios" className="mt-4"><ScenariosTab /></TabsContent>
        <TabsContent value="new" className="mt-4"><NewScenarioTab /></TabsContent>
      </Tabs>
    </div>
  );
}
