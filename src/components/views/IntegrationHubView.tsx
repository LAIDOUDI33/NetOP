'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plug, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Wifi, WifiOff,
  Activity, Clock, Database, ShieldCheck, Zap, Webhook, Key, Plus, Copy, Trash2,
  Send, CalendarIcon, AlertCircle,
} from 'lucide-react';
import { useT, timeAgo } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/* ---------- types ---------- */

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

interface Webhook {
  id: string; name: string; url: string; events: string[]; isEnabled: boolean;
  description: string | null; lastDeliveryAt: string | null;
  successCount: number; failureCount: number; deliveryCount: number; successRate: number;
}

interface Delivery {
  id: string; webhookName: string; event: string; payload: string;
  statusCode: number | null; durationMs: number; success: boolean;
  errorMessage: string | null; attemptCount: number; createdAt: string;
}

interface ApiKey {
  id: string; name: string; keyPrefix: string; permissions: string[];
  isEnabled: boolean; description: string | null; expiresAt: string | null;
  lastUsedAt: string | null; requestCount: number; createdAt: string;
}

/* ---------- constants ---------- */

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  connected: 'default', degraded: 'secondary', disconnected: 'destructive',
};

const WEBHOOK_EVENTS = [
  'alert.created', 'alert.escalated', 'incident.created', 'incident.resolved',
  'incident.critical', 'outage.started', 'change.approved', 'change.implemented',
  'kpi.threshold_breach', 'anomaly.detected', 'report.generated',
];

const KEY_PERMISSIONS = [
  'dashboard', 'monitoring', 'alerts', 'coverage', 'optimizer', 'kpi',
  'qoe', 'son', 'reports', 'config', 'spectrum', 'planning', 'energy',
  'ai', 'integration',
];

/* ---------- helpers ---------- */

function truncateUrl(url: string, max = 40) {
  if (url.length <= max) return url;
  return url.slice(0, max - 3) + '...';
}

/* =====================================================================
   MAIN COMPONENT
   ===================================================================== */

export default function IntegrationHubView() {
  const t = useT();
  const queryClient = useQueryClient();

  /* ---- state ---- */
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ key: string; name: string } | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);

  // webhook form
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>([]);
  const [whDesc, setWhDesc] = useState('');

  // key form
  const [akName, setAkName] = useState('');
  const [akPerms, setAkPerms] = useState<string[]>([]);
  const [akDesc, setAkDesc] = useState('');
  const [akExpiry, setAkExpiry] = useState<Date | undefined>(undefined);

  /* ---- queries ---- */
  const { data, isLoading, refetch } = useQuery<IntegrationHubData>({
    queryKey: ['integration-hub'],
    queryFn: () => fetch('/api/integration-hub').then(r => { if (!r.ok) throw new Error('API error'); return r.json(); }),
    refetchInterval: 15000,
  });

  const { data: webhooksData } = useQuery<{ webhooks: Webhook[]; total: number }>({
    queryKey: ['webhooks'],
    queryFn: () => fetch('/api/webhooks').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
  });

  const { data: deliveriesData } = useQuery<{ deliveries: Delivery[]; total: number }>({
    queryKey: ['webhook-deliveries'],
    queryFn: () => fetch('/api/webhooks/deliveries?limit=10').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
  });

  const { data: apiKeysData } = useQuery<{ keys: ApiKey[] }>({
    queryKey: ['api-keys'],
    queryFn: () => fetch('/api/api-keys').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
  });

  /* ---- mutations ---- */
  const createWebhook = useMutation({
    mutationFn: (body: { name: string; url: string; events: string[]; description?: string }) =>
      fetch('/api/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success(t('ig.webhookCreated'));
      resetWebhookForm();
      setWebhookDialogOpen(false);
    },
  });

  const toggleWebhook = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      fetch('/api/webhooks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isEnabled }) }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const testWebhook = useMutation({
    mutationFn: (webhookId: string) =>
      fetch('/api/webhooks/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webhookId }) }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => {
      toast.success(t('ig.webhookTested'));
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const deleteApiKey = useMutation({
    mutationFn: (id: string) => fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setDeleteKeyId(null);
      toast.success(t('ig.keyCreated').replace('created', 'deleted'));
    },
  });

  const createApiKey = useMutation({
    mutationFn: (body: { name: string; permissions: string[]; description?: string; expiresAt?: string | null }) =>
      fetch('/api/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setCreatedKey({ key: res.key, name: res.name });
      resetKeyForm();
      setKeyDialogOpen(false);
    },
  });

  /* ---- form helpers ---- */
  function resetWebhookForm() { setWhName(''); setWhUrl(''); setWhEvents([]); setWhDesc(''); }
  function resetKeyForm() { setAkName(''); setAkPerms([]); setAkDesc(''); setAkExpiry(undefined); }

  function toggleWhEvent(ev: string) {
    setWhEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  }
  function toggleAkPerm(p: string) {
    setAkPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  /* ---- derived ---- */
  const webhooks = webhooksData?.webhooks ?? [];
  const deliveries = deliveriesData?.deliveries ?? [];
  const apiKeys = apiKeysData?.keys ?? [];
  const activeWebhooks = webhooks.filter(w => w.isEnabled).length;
  const activeKeys = apiKeys.filter(k => k.isEnabled).length;
  const avgDeliverySuccess = webhooks.length > 0
    ? webhooks.reduce((s, w) => s + w.successRate, 0) / webhooks.length
    : 0;

  /* ---- loading ---- */
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('ih.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('ih.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />{t('ih.syncAll')}</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">{t('ih.connected')}</p><p className="text-3xl font-bold mt-1 text-emerald-600">{summary.connected}<span className="text-sm font-normal text-muted-foreground">/{summary.totalIntegrations}</span></p><p className="text-xs text-muted-foreground mt-1">{summary.degraded} {t('ih.degraded')}</p></div>
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Wifi className="h-6 w-6 text-emerald-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">{t('ih.totalDataPoints')}</p><p className="text-3xl font-bold mt-1">{(summary.totalDataPoints / 1000000).toFixed(1)}M</p><p className="text-xs text-muted-foreground mt-1">{t('ih.acrossAllSources')}</p></div>
          <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><Database className="h-6 w-6 text-violet-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">{t('ih.avgLatency')}</p><p className="text-3xl font-bold mt-1">{summary.avgLatency}ms</p><p className="text-xs text-muted-foreground mt-1">{t('ih.syncResponseTime')}</p></div>
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Zap className="h-6 w-6 text-amber-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">{t('ih.syncs24h')}</p><p className="text-3xl font-bold mt-1">{summary.totalSyncs24h.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">{t('ih.successfulSyncs')}</p></div>
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Activity className="h-6 w-6 text-slate-600" /></div>
        </div></CardContent></Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">{t('ih.integrations')}</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="h-4 w-4 mr-1.5 inline" />{t('ig.webhooks')}</TabsTrigger>
          <TabsTrigger value="apikeys"><Key className="h-4 w-4 mr-1.5 inline" />{t('ig.apiKeys')}</TabsTrigger>
          <TabsTrigger value="history">{t('ih.syncHistory')}</TabsTrigger>
          <TabsTrigger value="health">{t('ih.healthTimeline')}</TabsTrigger>
        </TabsList>

        {/* ============ TAB 1: OVERVIEW ============ */}
        <TabsContent value="overview">
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

        {/* ============ TAB 2: WEBHOOKS ============ */}
        <TabsContent value="webhooks" className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card><CardContent className="p-4"><div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-muted-foreground">{t('ig.activeWebhooks')}</p><p className="text-3xl font-bold mt-1 text-emerald-600">{activeWebhooks}<span className="text-sm font-normal text-muted-foreground">/{webhooks.length}</span></p></div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Webhook className="h-6 w-6 text-emerald-600" /></div>
            </div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-muted-foreground">{t('ig.deliverySuccessRate')}</p><p className="text-3xl font-bold mt-1">{avgDeliverySuccess.toFixed(1)}%</p></div>
              <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><Activity className="h-6 w-6 text-violet-600" /></div>
            </div></CardContent></Card>
          </div>

          {/* Action bar */}
          <div className="flex justify-end">
            <Button onClick={() => { resetWebhookForm(); setWebhookDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />{t('ig.createWebhook')}</Button>
          </div>

          {/* Webhook Table */}
          <Card>
            <CardContent className="p-0">
              {webhooks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">{t('ig.noWebhooks')}</div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{t('ig.webhookName')}</TableHead>
                      <TableHead>{t('ig.url')}</TableHead>
                      <TableHead>{t('ig.events')}</TableHead>
                      <TableHead>{t('ig.successRate')}</TableHead>
                      <TableHead>{t('ig.deliveries')}</TableHead>
                      <TableHead>{t('th.status')}</TableHead>
                      <TableHead>{t('ig.lastDelivery')}</TableHead>
                      <TableHead>{t('th.actions')}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {webhooks.map(wh => (
                        <TableRow key={wh.id}>
                          <TableCell className="text-sm font-medium">{wh.name}</TableCell>
                          <TableCell className="font-mono text-xs" title={wh.url}>{truncateUrl(wh.url)}</TableCell>
                          <TableCell><div className="flex flex-wrap gap-1">
                            {wh.events.slice(0, 3).map(ev => <Badge key={ev} variant="outline" className="text-[10px] px-1.5 py-0">{ev}</Badge>)}
                            {wh.events.length > 3 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{wh.events.length - 3} more</Badge>}
                          </div></TableCell>
                          <TableCell><div className="flex items-center gap-2 w-24"><Progress value={wh.successRate} className="h-2" /><span className="text-xs font-mono">{wh.successRate.toFixed(0)}%</span></div></TableCell>
                          <TableCell className="font-mono text-xs">{wh.deliveryCount}</TableCell>
                          <TableCell><Badge variant={wh.isEnabled ? 'default' : 'secondary'} className="text-xs">{wh.isEnabled ? t('ig.enabled') : t('ig.disabled')}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{wh.lastDeliveryAt ? timeAgo(wh.lastDeliveryAt, t) : '—'}</TableCell>
                          <TableCell><div className="flex items-center gap-2">
                            <Switch checked={wh.isEnabled} disabled={toggleWebhook.isPending} onCheckedChange={(checked) => toggleWebhook.mutate({ id: wh.id, isEnabled: checked })} />
                            <Button size="sm" variant="ghost" disabled={testWebhook.isPending} onClick={() => testWebhook.mutate(wh.id)} title={t('ig.testWebhook')}><Send className="h-3.5 w-3.5" /></Button>
                          </div></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Deliveries */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t('ig.recentDeliveries')}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {deliveries.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">{t('ig.noDeliveries')}</div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{t('ig.webhookName')}</TableHead>
                      <TableHead>{t('ig.event')}</TableHead>
                      <TableHead>{t('ig.statusCode')}</TableHead>
                      <TableHead>{t('th.duration')}</TableHead>
                      <TableHead>{t('ig.attempts')}</TableHead>
                      <TableHead>{t('th.status')}</TableHead>
                      <TableHead>{t('th.createdAt')}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {deliveries.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="text-xs font-medium">{d.webhookName}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] px-1.5 py-0">{d.event}</Badge></TableCell>
                          <TableCell><Badge variant={d.statusCode && d.statusCode < 400 ? 'default' : 'destructive'} className="text-xs font-mono">{d.statusCode ?? '—'}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{d.durationMs}ms</TableCell>
                          <TableCell className="font-mono text-xs">{d.attemptCount}</TableCell>
                          <TableCell>{d.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{timeAgo(d.createdAt, t)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Webhook Dialog */}
          <Dialog open={webhookDialogOpen} onOpenChange={(open) => { if (!open) resetWebhookForm(); setWebhookDialogOpen(open); }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t('ig.createWebhook')}</DialogTitle><DialogDescription>Configure a new webhook endpoint.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label htmlFor="wh-name">{t('ig.webhookName')}</Label><Input id="wh-name" value={whName} onChange={e => setWhName(e.target.value)} placeholder={t('ig.placeholderWebhook')} /></div>
                <div className="space-y-2"><Label htmlFor="wh-url">{t('ig.url')}</Label><Input id="wh-url" value={whUrl} onChange={e => setWhUrl(e.target.value)} placeholder="https://example.com/webhook" /></div>
                <div className="space-y-2">
                  <Label>{t('ig.events')}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border p-3">
                    {WEBHOOK_EVENTS.map(ev => (
                      <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={whEvents.includes(ev)} onCheckedChange={() => toggleWhEvent(ev)} />
                        <span className="font-mono text-xs">{ev}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2"><Label htmlFor="wh-desc">{t('th.description')}</Label><Textarea id="wh-desc" value={whDesc} onChange={e => setWhDesc(e.target.value)} rows={2} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetWebhookForm(); setWebhookDialogOpen(false); }}>Cancel</Button>
                <Button disabled={createWebhook.isPending || !whName || !whUrl || whEvents.length === 0} onClick={() => createWebhook.mutate({ name: whName, url: whUrl, events: whEvents, description: whDesc || undefined })}>{createWebhook.isPending ? '...' : t('ig.createWebhook')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ============ TAB 3: API KEYS ============ */}
        <TabsContent value="apikeys" className="space-y-4">
          {/* KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-muted-foreground">{t('ig.apiKeys')}</p><p className="text-3xl font-bold mt-1 text-emerald-600">{activeKeys}<span className="text-sm font-normal text-muted-foreground">/{apiKeys.length}</span></p></div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><ShieldCheck className="h-6 w-6 text-emerald-600" /></div>
            </div></CardContent></Card>
          </div>

          {/* Action bar */}
          <div className="flex justify-end">
            <Button onClick={() => { resetKeyForm(); setKeyDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />{t('ig.createKey')}</Button>
          </div>

          {/* Keys Table */}
          <Card>
            <CardContent className="p-0">
              {apiKeys.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">{t('ig.noApiKeys')}</div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{t('ig.keyName')}</TableHead>
                      <TableHead>{t('ig.keyPrefix')}</TableHead>
                      <TableHead>{t('ig.permissions')}</TableHead>
                      <TableHead>{t('ig.requestCount')}</TableHead>
                      <TableHead>{t('ig.lastUsed')}</TableHead>
                      <TableHead>{t('th.status')}</TableHead>
                      <TableHead>{t('ig.expiresAt')}</TableHead>
                      <TableHead>{t('th.actions')}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {apiKeys.map(k => (
                        <TableRow key={k.id}>
                          <TableCell className="text-sm font-medium">{k.name}</TableCell>
                          <TableCell><div className="flex items-center gap-1.5"><code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{k.keyPrefix}...</code><Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(k.keyPrefix); toast.success(t('ig.copied')); }}><Copy className="h-3 w-3" /></Button></div></TableCell>
                          <TableCell><div className="flex flex-wrap gap-1">
                            {k.permissions.slice(0, 3).map(p => <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">{p}</Badge>)}
                            {k.permissions.length > 3 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{k.permissions.length - 3} more</Badge>}
                          </div></TableCell>
                          <TableCell className="font-mono text-xs">{k.requestCount.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{k.lastUsedAt ? timeAgo(k.lastUsedAt, t) : '—'}</TableCell>
                          <TableCell><Badge variant={k.isEnabled ? 'default' : 'secondary'} className="text-xs">{k.isEnabled ? t('ig.enabled') : t('ig.disabled')}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : t('ig.never')}</TableCell>
                          <TableCell><Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setDeleteKeyId(k.id)}><Trash2 className="h-3.5 w-3.5 mr-1" />{t('ig.deleteKey')}</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Key Dialog */}
          <Dialog open={keyDialogOpen} onOpenChange={(open) => { if (!open) resetKeyForm(); setKeyDialogOpen(open); }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t('ig.createKey')}</DialogTitle><DialogDescription>Generate a new API key with specific permissions.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label htmlFor="ak-name">{t('ig.keyName')}</Label><Input id="ak-name" value={akName} onChange={e => setAkName(e.target.value)} placeholder={t('ig.placeholderApiKey')} /></div>
                <div className="space-y-2">
                  <Label>{t('ig.permissions')}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto rounded-md border p-3">
                    {KEY_PERMISSIONS.map(p => (
                      <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={akPerms.includes(p)} onCheckedChange={() => toggleAkPerm(p)} />
                        <span className="text-xs">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2"><Label htmlFor="ak-desc">{t('th.description')}</Label><Textarea id="ak-desc" value={akDesc} onChange={e => setAkDesc(e.target.value)} rows={2} /></div>
                <div className="space-y-2">
                  <Label>{t('ig.expiresAt')}</Label>
                  <Popover><PopoverTrigger asChild><Button variant="outline" className={cn('w-full justify-start text-left font-normal', !akExpiry && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{akExpiry ? akExpiry.toLocaleDateString() : t('ig.never')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={akExpiry} onSelect={setAkExpiry} disabled={(date) => date < new Date()} /></PopoverContent></Popover>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetKeyForm(); setKeyDialogOpen(false); }}>Cancel</Button>
                <Button disabled={createApiKey.isPending || !akName || akPerms.length === 0} onClick={() => createApiKey.mutate({ name: akName, permissions: akPerms, description: akDesc || undefined, expiresAt: akExpiry ? akExpiry.toISOString() : null })}>{createApiKey.isPending ? '...' : t('ig.createKey')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Created Key Dialog */}
          <Dialog open={!!createdKey} onOpenChange={(open) => { if (!open) setCreatedKey(null); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{t('ig.keyCreated')}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{t('ig.saveKeyWarning')}</AlertDescription></Alert>
                {createdKey && (
                  <div className="space-y-2">
                    <Label>{createdKey.name}</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-xs bg-muted p-3 rounded-md break-all select-all">{createdKey.key}</code>
                      <Button size="sm" onClick={() => { navigator.clipboard.writeText(createdKey.key); toast.success(t('ig.copied')); }}><Copy className="h-4 w-4 mr-1" />{t('ig.copyKey')}</Button>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter><Button onClick={() => setCreatedKey(null)}>Done</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog open={!!deleteKeyId} onOpenChange={(open) => { if (!open) setDeleteKeyId(null); }}>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('ig.deleteKey')}</AlertDialogTitle><AlertDialogDescription>{t('ig.deleteKeyConfirm')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('ig.disabled')}</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteKeyId && deleteApiKey.mutate(deleteKeyId)}>{t('ig.deleteKey')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* ============ TAB 4: SYNC HISTORY ============ */}
        <TabsContent value="history">
          <Card><CardHeader><CardTitle className="text-base">{t('ih.recentSyncOps')} ({syncHistory.length})</CardTitle></CardHeader><CardContent>
            <ScrollArea className="h-[480px]"><Table>
              <TableHeader><TableRow><TableHead>{t('ih.colId')}</TableHead><TableHead>{t('ih.colIntegration')}</TableHead><TableHead>{t('th.status')}</TableHead><TableHead>{t('ih.colRecords')}</TableHead><TableHead>{t('ih.colDuration')}</TableHead><TableHead>{t('ih.colError')}</TableHead><TableHead>{t('th.timestamp')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {syncHistory.map(s => (
                  <TableRow key={s.id}><TableCell className="font-mono text-xs">{s.id}</TableCell><TableCell className="text-xs font-medium">{s.integrationName}</TableCell><TableCell><Badge variant={s.status === 'success' ? 'default' : 'destructive'} className="text-xs">{s.status === 'success' ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <XCircle className="h-3 w-3 mr-1 inline" />}{s.status}</Badge></TableCell><TableCell className="font-mono text-xs">{s.recordsProcessed.toLocaleString()}</TableCell><TableCell className="font-mono text-xs">{(s.durationMs / 1000).toFixed(1)}s</TableCell><TableCell className="text-xs text-red-600 max-w-[200px] truncate">{s.error || '—'}</TableCell><TableCell className="text-xs text-muted-foreground">{new Date(s.timestamp).toLocaleTimeString()}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table></ScrollArea>
          </CardContent></Card>
        </TabsContent>

        {/* ============ TAB 5: HEALTH ============ */}
        <TabsContent value="health">
          <Card><CardHeader><CardTitle className="text-base">{t('ih.integrationHealth')}</CardTitle><CardDescription>{t('ih.uptimeDesc')}</CardDescription></CardHeader><CardContent>
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
