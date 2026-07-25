'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowDownToLine, Database, RefreshCw, ShieldCheck, Brain, Server, Users, CreditCard,
  CheckCircle2, XCircle, Clock, AlertTriangle, Activity, Zap, Play, Square, RotateCcw,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface Pipeline {
  id: string; name: string; source: string; target: string; schedule: string;
  status: string; lastRun: string; nextRun: string | null; recordsProcessed: number;
  errorRate: number; avgDurationMs: number;
}

interface FlowNode { id: string; name: string; type: string; icon: string; x: number; y: number; status: string; }
interface FlowEdge { from: string; to: string; throughput: string; }

interface PipelineData {
  pipelines: Pipeline[];
  flowNodes: FlowNode[];
  flowEdges: FlowEdge[];
  throughput: Array<{ hour: string; ingested: number; transformed: number; errors: number }>;
  summary: { totalPipelines: number; running: number; failed: number; scheduled: number; totalRecords24h: number; avgErrorRate: number };
}

const PIPELINE_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  running: 'default', completed: 'secondary', failed: 'destructive', scheduled: 'outline',
};
const ICON_MAP: Record<string, typeof Server> = {
  Server, Users, CreditCard, ArrowDownToLine, RefreshCw, ShieldCheck, Database, Brain,
};
const NODE_COLORS: Record<string, string> = {
  source: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  process: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
  target: 'border-violet-500 bg-violet-50 dark:bg-violet-900/20',
};

export default function DataPipelineView() {
  const t = useT();
  const { data, isLoading, refetch } = useQuery<PipelineData>({
    queryKey: ['data-pipeline'],
    queryFn: () => fetch('/api/data-pipeline').then(r => { if (!r.ok) throw new Error('API error'); return r.json(); }),
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (<Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  const { pipelines, flowNodes, flowEdges, throughput, summary } = data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">ETL orchestration, data flow monitoring, and ingestion management</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Running Pipelines</p><p className="text-3xl font-bold mt-1 text-emerald-600">{summary.running}<span className="text-sm font-normal text-muted-foreground">/{summary.totalPipelines}</span></p><p className="text-xs text-muted-foreground mt-1">{summary.scheduled} scheduled</p></div>
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Play className="h-6 w-6 text-emerald-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Records 24h</p><p className="text-3xl font-bold mt-1">{(summary.totalRecords24h / 1000000).toFixed(1)}M</p><p className="text-xs text-muted-foreground mt-1">Across all pipelines</p></div>
          <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><Database className="h-6 w-6 text-violet-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Error Rate</p><p className="text-3xl font-bold mt-1">{summary.avgErrorRate}%</p><Progress value={100 - summary.avgErrorRate} className="mt-2 h-2" /></div>
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><ShieldCheck className="h-6 w-6 text-amber-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Failed Pipelines</p><p className="text-3xl font-bold mt-1 text-red-600">{summary.failed}</p><p className="text-xs text-red-600 mt-1">Requires attention</p></div>
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
        </div></CardContent></Card>
      </div>

      <Tabs defaultValue="pipelines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="flow">Data Flow</TabsTrigger>
          <TabsTrigger value="throughput">Throughput</TabsTrigger>
        </TabsList>

        <TabsContent value="pipelines">
          <Card><CardHeader><CardTitle className="text-base">Pipeline Registry ({pipelines.length})</CardTitle></CardHeader><CardContent>
            <ScrollArea className="h-[480px]"><Table>
              <TableHeader><TableRow><TableHead>Pipeline</TableHead><TableHead>Source</TableHead><TableHead>Target</TableHead><TableHead>Schedule</TableHead><TableHead>Status</TableHead><TableHead>Records</TableHead><TableHead>Errors</TableHead><TableHead>Duration</TableHead><TableHead>Last Run</TableHead></TableRow></TableHeader>
              <TableBody>
                {pipelines.map(p => (
                  <TableRow key={p.id}><TableCell className="font-medium text-xs">{p.name}</TableCell><TableCell className="text-xs">{p.source}</TableCell><TableCell className="text-xs">{p.target}</TableCell><TableCell className="font-mono text-xs">{p.schedule}</TableCell><TableCell><Badge variant={PIPELINE_STATUS_VARIANT[p.status]} className="capitalize text-xs">{p.status}</Badge></TableCell><TableCell className="font-mono text-xs">{p.recordsProcessed.toLocaleString()}</TableCell><TableCell className={cn('font-mono text-xs', p.errorRate > 1 ? 'text-red-600' : '')}>{p.errorRate}%</TableCell><TableCell className="font-mono text-xs">{p.avgDurationMs >= 60000 ? `${(p.avgDurationMs / 60000).toFixed(1)}m` : `${p.avgDurationMs}ms`}</TableCell><TableCell className="text-xs text-muted-foreground">{new Date(p.lastRun).toLocaleTimeString()}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table></ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="flow">
          <Card><CardHeader><CardTitle className="text-base">Data Flow Architecture</CardTitle><CardDescription>Source → Ingestion → Transform → Storage</CardDescription></CardHeader><CardContent>
            <div className="relative h-[500px] bg-muted/30 rounded-lg border overflow-hidden">
              {/* SVG Edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {flowEdges.map((edge, i) => {
                  const from = flowNodes.find(n => n.id === edge.from);
                  const to = flowNodes.find(n => n.id === edge.to);
                  if (!from || !to) return null;
                  return (
                    <g key={i}>
                      <line x1={from.x + 70} y1={from.y + 20} x2={to.x} y2={to.y + 20} stroke="#94A3B8" strokeWidth="2" strokeDasharray="6 3" />
                      <text x={(from.x + to.x) / 2 + 35} y={(from.y + to.y) / 2 + 5} className="text-[10px] fill-muted-foreground" textAnchor="middle">{edge.throughput}</text>
                    </g>
                  );
                })}
              </svg>
              {/* Nodes */}
              {flowNodes.map(node => {
                const Icon = ICON_MAP[node.icon] || Server;
                return (
                  <div key={node.id} className={cn('absolute flex flex-col items-center gap-1 rounded-lg border-2 px-4 py-3 w-[140px]', NODE_COLORS[node.type] || 'border-slate-300')} style={{ left: node.x, top: node.y }}>
                    <Icon className="h-5 w-5" />
                    <span className="text-[11px] font-semibold text-center leading-tight">{node.name}</span>
                    <Badge variant={node.status === 'connected' || node.status === 'running' ? 'default' : 'destructive'} className="text-[9px] h-4">{node.status}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="throughput">
          <Card><CardHeader><CardTitle className="text-base">24h Throughput</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={380}><LineChart data={throughput}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" /><XAxis dataKey="hour" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} /><Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} /><Legend />
              <Line type="monotone" dataKey="ingested" name="Ingested" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="transformed" name="Transformed" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="errors" name="Errors" stroke="#EF4444" strokeWidth={1} dot={false} />
            </LineChart></ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}