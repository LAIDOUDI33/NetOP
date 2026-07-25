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
  Plug, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Wifi, WifiOff,
  Activity, Clock, Database, ShieldCheck, Zap,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface Integration {
  id: string; name: string; type: string; vendor: string; protocol: string;
  endpoint: string; status: string; lastSync: string; syncIntervalMin: number;
  totalSyncs: number; failedSyncs: number; dataPoints: number;
  latencyMs: number; version: string;
}

interface SyncRecord {
  id: string; integrationId: string; integrationName: string; type: string;
  status: string; recordsProcessed: number; durationMs: number;
  error: string | null; timestamp: string;
}

interface IntegrationHubData {
  integrations: Integration[];
  syncHistory: SyncRecord[];
  healthTimeline: Array<{ label: string; oss: number; crm: number; billing: number; son: number; nms: number }>;
  summary: {
    totalIntegrations: number; connected: number; degraded: number; disconnected: number;
    totalDataPoints: number; totalSyncs24h: number; avgLatency: number;
  };
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  connected: 'default', degraded: 'secondary', disconnected: 'destructive',
};
const TYPE_COLORS: Record<string, string> = {
  oss: '#10B981', crm: '#F59E0B', billing: '#EF4444', son: '#8B5CF6', nms: '#06B6D4', geo: '#EC4899',
};

export default function IntegrationHubView() {
  const t = useT();
  const { data, isLoading, refetch } = useQuery<IntegrationHubData>({
    queryKey: ['integration-hub'],
    queryFn: () => fetch('/api/integration-hub').then(r => { if (!r.ok) throw new Error('API error'); return r.json(); }),
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

  const { integrations, syncHistory, healthTimeline, summary } = data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integration Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">Central management for all system integrations, sync health, and data flow</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Sync All</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Connected</p><p className="text-3xl font-bold mt-1 text-emerald-600">{summary.connected}<span className="text-sm font-normal text-muted-foreground">/{summary.totalIntegrations}</span></p><p className="text-xs text-muted-foreground mt-1">{summary.degraded} degraded</p></div>
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Wifi className="h-6 w-6 text-emerald-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Total Data Points</p><p className="text-3xl font-bold mt-1">{(summary.totalDataPoints / 1000000).toFixed(1)}M</p><p className="text-xs text-muted-foreground mt-1">Across all sources</p></div>
          <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><Database className="h-6 w-6 text-violet-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Avg Latency</p><p className="text-3xl font-bold mt-1">{summary.avgLatency}ms</p><p className="text-xs text-muted-foreground mt-1">Sync response time</p></div>
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Zap className="h-6 w-6 text-amber-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Syncs 24h</p><p className="text-3xl font-bold mt-1">{summary.totalSyncs24h.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">Successful syncs today</p></div>
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Activity className="h-6 w-6 text-slate-600" /></div>
        </div></CardContent></Card>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
          <TabsTrigger value="health">Health Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {integrations.map(int => (
              <Card key={int.id} className={cn('transition-colors', int.status === 'connected' ? 'border-emerald-500/30' : int.status === 'degraded' ? 'border-amber-500/30' : 'border-red-500/30')}>
                <CardHeader className="pb-3"><div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className={cn('h-10 w-10 rounded-full flex items-center justify-center', int.status === 'connected' ? 'bg-emerald-100 dark:bg-emerald-900/30' : int.status === 'degraded' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30')}><Plug className={cn('h-5 w-5', int.status === 'connected' ? 'text-emerald-600' : int.status === 'degraded' ? 'text-amber-600' : 'text-red-600')} /></div><div><CardTitle className="text-sm font-semibold">{int.name}</CardTitle><p className="text-xs text-muted-foreground">{int.vendor} · {int.protocol}</p></div></div>
                  <Badge variant={STATUS_VARIANT[int.status]} className="capitalize text-xs">{int.status}</Badge>
                </div></CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Endpoint</span><span className="font-mono truncate max-w-[180px]" title={int.endpoint}>{int.endpoint.replace(/^https?:\/\/[^/]+/, '…')}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-mono">{int.version}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Interval</span><span className="font-mono">{int.syncIntervalMin}min</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Latency</span><span className={cn('font-mono', int.latencyMs > 3000 ? 'text-red-600' : '')}>{int.latencyMs}ms</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Data Points</span><span className="font-mono">{(int.dataPoints / 1000).toFixed(0)}K</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Success Rate</span><span className="font-mono text-emerald-600">{((1 - int.failedSyncs / int.totalSyncs) * 100).toFixed(2)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Last Sync</span><span className="text-muted-foreground">{new Date(int.lastSync).toLocaleTimeString()}</span></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card><CardHeader><CardTitle className="text-base">Recent Sync Operations ({syncHistory.length})</CardTitle></CardHeader><CardContent>
            <ScrollArea className="h-[480px]"><Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Integration</TableHead><TableHead>Status</TableHead><TableHead>Records</TableHead><TableHead>Duration</TableHead><TableHead>Error</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
              <TableBody>
                {syncHistory.map(s => (
                  <TableRow key={s.id}><TableCell className="font-mono text-xs">{s.id}</TableCell><TableCell className="text-xs font-medium">{s.integrationName}</TableCell><TableCell><Badge variant={s.status === 'success' ? 'default' : 'destructive'} className="text-xs">{s.status === 'success' ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <XCircle className="h-3 w-3 mr-1 inline" />}{s.status}</Badge></TableCell><TableCell className="font-mono text-xs">{s.recordsProcessed.toLocaleString()}</TableCell><TableCell className="font-mono text-xs">{(s.durationMs / 1000).toFixed(1)}s</TableCell><TableCell className="text-xs text-red-600 max-w-[200px] truncate">{s.error || '—'}</TableCell><TableCell className="text-xs text-muted-foreground">{new Date(s.timestamp).toLocaleTimeString()}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table></ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="health">
          <Card><CardHeader><CardTitle className="text-base">Integration Health (48h)</CardTitle><CardDescription>Uptime percentage per integration</CardDescription></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={380}><LineChart data={healthTimeline}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" /><Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} /><Legend />
              <Line type="stepAfter" dataKey="oss" name="OSS" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="stepAfter" dataKey="crm" name="CRM" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="stepAfter" dataKey="billing" name="Billing" stroke="#EF4444" strokeWidth={2} dot={false} />
              <Line type="stepAfter" dataKey="son" name="SON" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              <Line type="stepAfter" dataKey="nms" name="NMS" stroke="#06B6D4" strokeWidth={2} dot={false} />
            </LineChart></ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}