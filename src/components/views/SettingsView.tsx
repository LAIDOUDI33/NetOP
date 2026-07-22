'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, RefreshCw, Users, Shield, FileSearch, HeartPulse, Clock, Settings2, Radio } from 'lucide-react';
import type { NetworkParameterItem, Technology } from '@/types';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';

const TECH_COLORS: Record<Technology, string> = {
  '2G': '#94A3B8',
  '3G': '#06B6D4',
  '4G': '#10B981',
  '5G': '#F59E0B',
};

const CATEGORIES = ['all', 'RF', 'Power', 'Handover', 'Capacity'];

interface ParamsResponse { parameters: NetworkParameterItem[]; }
interface UsersResponse { users: Array<{ id: string; email: string; name: string | null; active: boolean; createdAt: string; roles: string[] }>; }
interface RolesResponse { roles: Array<{ id: string; name: string; description: string; userCount: number; permissionCount: number; createdAt: string }>; }
interface AuditResponse { actions: Array<{ id: string; actionType: string; siteName: string | null; siteCode: string | null; technology: string; parameter: string | null; previousValue: string | null; newValue: string | null; reason: string | null; status: string; createdAt: string }>; total: number; }

export default function SettingsView() {
  const t = useT();
  const [tab, setTab] = useState('parameters');

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="parameters" className="text-xs gap-1.5"><Settings2 className="h-3.5 w-3.5" /> {t('set.params', { tech: '' }).replace(/\s*$/, '') || 'Parameters'}</TabsTrigger>
          <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs gap-1.5"><Shield className="h-3.5 w-3.5" /> Roles</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs gap-1.5"><FileSearch className="h-3.5 w-3.5" /> Audit</TabsTrigger>
          <TabsTrigger value="health" className="text-xs gap-1.5"><HeartPulse className="h-3.5 w-3.5" /> Health</TabsTrigger>
          <TabsTrigger value="retention" className="text-xs gap-1.5"><Clock className="h-3.5 w-3.5" /> Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="parameters" className="mt-4">
          <ParametersTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <RolesTab />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditTab />
        </TabsContent>
        <TabsContent value="health" className="mt-4">
          <HealthTab />
        </TabsContent>
        <TabsContent value="retention" className="mt-4">
          <RetentionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* =================== PARAMETERS TAB (original) =================== */
function ParametersTab() {
  const t = useT();
  const queryClient = useQueryClient();
  const [technology, setTechnology] = useState<Technology>('4G');
  const [category, setCategory] = useState('all');
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<ParamsResponse>({
    queryKey: ['parameters', technology, category],
    queryFn: () => fetch(`/api/parameters?technology=${technology}&category=${category}`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const currentParamIds = useMemo(() => new Set(data?.parameters.map(p => p.id) ?? []), [data]);
  const filteredEdits = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [id, val] of Object.entries(editedValues)) {
      if (currentParamIds.has(id)) result[id] = val;
    }
    return result;
  }, [editedValues, currentParamIds]);

  const handleChange = useCallback((id: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [id]: value }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (changes: Record<string, string>) => {
      return Promise.all(
        Object.entries(changes).map(([paramId, currentValue]) =>
          fetch('/api/parameters', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paramId, currentValue }),
          }).then(r => r.json())
        )
      );
    },
    onSuccess: () => { toast.success(t('toast.saved')); queryClient.invalidateQueries({ queryKey: ['parameters'] }); setEditedValues({}); },
    onError: () => { toast.error(t('toast.saveFailed')); },
  });

  const hasChanges = Object.keys(filteredEdits).length > 0;

  return (
    <div className="space-y-4">
      <Tabs value={technology} onValueChange={(v) => setTechnology(v as Technology)}>
        <TabsList className="w-full sm:w-auto">
          {(Object.keys(TECH_COLORS) as Technology[]).map((tech) => (
            <TabsTrigger key={tech} value={tech} className="data-[state=active]:text-white"
              style={technology === tech ? { backgroundColor: TECH_COLORS[tech], color: '#fff' } : undefined}>
              {tech}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Button key={cat} size="sm" variant={category === cat ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setCategory(cat)}>
            {cat === 'all' ? t('set.allCategories') : t(`set.${cat.toLowerCase()}` as any)}
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {category !== 'all' ? t('set.paramsFor', { tech: technology, category: t(`set.${category.toLowerCase()}` as any) }) : t('set.params', { tech: technology })}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => queryClient.invalidateQueries({ queryKey: ['parameters'] })}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
              <Button size="sm" className="h-8 text-xs" disabled={!hasChanges || saveMutation.isPending} onClick={() => saveMutation.mutate(filteredEdits)}>
                <Save className="h-3 w-3 mr-1" /> Save ({Object.keys(filteredEdits).length})
              </Button>
              <ExportButton data={(data?.parameters ?? []) as unknown as Record<string, any>[]} filenamePrefix="settings" columns={[{ key: 'displayName', header: 'Parameter' }, { key: 'category', header: 'Category' }, { key: 'currentValue', header: 'Current Value' }, { key: 'minRange', header: 'Min' }, { key: 'maxRange', header: 'Max' }, { key: 'unit', header: 'Unit' }]} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading || !data ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="min-w-[900px]">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">{t('th.parameter')}</TableHead>
                    <TableHead className="text-xs">{t('th.currentValue')}</TableHead>
                    <TableHead className="text-xs">{t('th.min')}</TableHead>
                    <TableHead className="text-xs">{t('th.max')}</TableHead>
                    <TableHead className="text-xs">{t('th.unit')}</TableHead>
                    <TableHead className="text-xs">{t('th.description')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {data.parameters.map((param) => {
                      const isEdited = param.id in filteredEdits;
                      const currentVal = filteredEdits[param.id] ?? param.currentValue;
                      return (
                        <TableRow key={param.id} className={isEdited ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                          <TableCell className="text-xs font-medium">{param.displayName}</TableCell>
                          <TableCell><Input value={currentVal} onChange={(e) => handleChange(param.id, e.target.value)} className="h-8 text-xs w-28" /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{param.minRange || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{param.maxRange || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{param.unit}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{param.description}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* =================== USERS TAB =================== */
function UsersTab() {
  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['settings-users'],
    queryFn: () => fetch('/api/settings/users').then(r => r.json()),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">User Management</CardTitle></CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Roles</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Created</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data?.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-xs font-medium">{u.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map(r => <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0">{r}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={u.active ? 'default' : 'outline'} className="text-[10px]">
                        {u.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString('fr-DZ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

/* =================== ROLES TAB =================== */
function RolesTab() {
  const { data, isLoading } = useQuery<RolesResponse>({
    queryKey: ['settings-roles'],
    queryFn: () => fetch('/api/settings/roles').then(r => r.json()),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Role Management</CardTitle></CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Users</TableHead>
                <TableHead className="text-xs">Permissions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data?.roles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{r.description}</TableCell>
                    <TableCell className="text-xs"><Badge variant="secondary" className="text-[10px]">{r.userCount} users</Badge></TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{r.permissionCount} perms</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

/* =================== AUDIT TAB =================== */
function AuditTab() {
  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ['settings-audit'],
    queryFn: () => fetch('/api/settings/audit?limit=50').then(r => r.json()),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Audit Log</CardTitle>
          {data && <p className="text-xs text-muted-foreground">{data.total} total entries</p>}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Site</TableHead>
                <TableHead className="text-xs">Tech</TableHead>
                <TableHead className="text-xs">Change</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data?.actions.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.createdAt).toLocaleString('fr-DZ', { timeZone: 'Africa/Algiers', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell className="text-xs font-medium">{a.actionType?.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-xs">{a.siteName ?? a.siteCode ?? '—'}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{a.technology}</Badge></TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {a.previousValue && a.newValue ? `${a.previousValue} → ${a.newValue}` : a.parameter ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={a.status === 'applied' ? 'default' : a.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {a.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

/* =================== SYSTEM HEALTH TAB =================== */
function HealthTab() {
  const { data: dashboardData } = useQuery({
    queryKey: ['health-dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
  });

  const stats = [
    { label: 'Platform', value: 'NetOptima Algérie v0.2.0', icon: Radio },
    { label: 'Framework', value: 'Next.js 16 + Prisma', icon: Radio },
    { label: 'Database', value: 'SQLite', icon: Radio },
    { label: 'Auth', value: 'NextAuth.js v4', icon: Radio },
    { label: 'Timezone', value: 'Africa/Algiers (CET)', icon: Radio },
    { label: 'Total Sites', value: dashboardData?.totalSites ?? '—', icon: Radio },
    { label: 'Active Users', value: dashboardData?.totalActiveUsers ?? '—', icon: Radio },
    { label: 'Avg Availability', value: dashboardData ? `${(dashboardData.avgAvailability ?? 0).toFixed(1)}%` : '—', icon: Radio },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">System Health</CardTitle></CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{s.label}</p>
              <p className="text-sm font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* =================== DATA RETENTION TAB =================== */
function RetentionTab() {
  const [retention, setRetention] = useState({
    kpiMetrics: 30,
    alerts: 90,
    auditLogs: 180,
    sonActions: 365,
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Data Retention Settings</CardTitle></CardHeader>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-4">Configure how long different types of data are kept in the system.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.entries(retention) as [keyof typeof retention, number][]).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</p>
                <p className="text-xs text-muted-foreground">Days to retain</p>
              </div>
              <Input
                type="number"
                min={1}
                value={value}
                onChange={(e) => setRetention(prev => ({ ...prev, [key]: parseInt(e.target.value) || 1 }))}
                className="w-20 h-8 text-xs text-right"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" className="h-8 text-xs" onClick={() => toast.success('Retention settings saved')}>
            <Save className="h-3 w-3 mr-1" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
