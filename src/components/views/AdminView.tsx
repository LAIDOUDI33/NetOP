'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Users, Shield, Key, Webhook, Database, Plus, Pencil, Lock, Copy, Trash2, Power, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

const WEBHOOK_EVENTS = ['alert.created','alert.acknowledged','incident.created','incident.resolved','anomaly.detected','son.action','outage.started','outage.resolved'] as const;
const SOURCE_TYPES = ['oss','crm','billing','kpi','probe','external_api','file','database'] as const;
const SOURCE_STATUSES = ['all','active','inactive','error','maintenance'] as const;

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('API error: ' + r.status); return r.json(); });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-DZ');
const fmtDateTime = (d: string) => new Date(d).toLocaleString('fr-DZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// =================== MAIN COMPONENT ===================
export default function AdminView() {
  const t = useT();
  const [tab, setTab] = useState('users');
  const tabs = [
    { value: 'users', label: t('admin.users'), icon: Users },
    { value: 'roles', label: t('admin.roles'), icon: Shield },
    { value: 'apikeys', label: t('admin.apiKeysTitle'), icon: Key },
    { value: 'webhooks', label: t('admin.webhooksTitle'), icon: Webhook },
    { value: 'sources', label: t('admin.dataSourcesTitle'), icon: Database },
  ];
  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
          {tabs.map(tb => <TabsTrigger key={tb.value} value={tb.value} className="text-xs gap-1.5"><tb.icon className="h-3.5 w-3.5" />{tb.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="roles" className="mt-4"><RolesTab /></TabsContent>
        <TabsContent value="apikeys" className="mt-4"><ApiKeysTab /></TabsContent>
        <TabsContent value="webhooks" className="mt-4"><WebhooksTab /></TabsContent>
        <TabsContent value="sources" className="mt-4"><DataSourcesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// =================== SHARED: SKELETON ROWS ===================
function SkeletonRows(n = 5) { return (<div className="space-y-3">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>); }

// =================== USERS TAB ===================
function UsersTab() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => fetcher('/api/settings/users') });
  const users = data?.users ?? [];
  const filtered = users.filter((u: any) => `${u.name} ${u.email} ${u.department ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  const save = useMutation({
    mutationFn: (body: any) => fetch('/api/settings/users', { method: edit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { toast.success(edit ? t('toast.saved') : t('admin.addUser')); qc.invalidateQueries({ queryKey: ['admin-users'] }); setOpen(false); setEdit(null); },
    onError: () => toast.error(edit ? t('toast.saveFailed') : t('toast.error')),
  });
  const toggle = useMutation({
    mutationFn: (u: any) => fetch('/api/settings/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, isActive: !u.isActive }) }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.saved')); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => toast.error(t('toast.error')),
  });

  const openEdit = useCallback((u: any) => { setEdit(u); setOpen(true); }, []);
  const openAdd = useCallback(() => { setEdit(null); setOpen(true); }, []);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = { name: fd.get('name'), email: fd.get('email'), department: fd.get('department'), phone: fd.get('phone'), roleIds: fd.getAll('roles') };
    if (!edit) payload.password = fd.get('password');
    if (edit) payload.id = edit.id;
    save.mutate(payload);
  };

  return (
    <Card><CardHeader className="pb-2"><div className="flex items-center justify-between flex-wrap gap-2">
      <CardTitle className="text-base font-semibold">{t('admin.usersTitle')}</CardTitle>
      <div className="flex gap-2 items-center"><div className="relative"><Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.search')} className="h-8 text-xs pl-8 w-44" /></div>
      <Button size="sm" className="h-8 text-xs" onClick={openAdd}><Plus className="h-3 w-3 mr-1" />{t('admin.addUser')}</Button></div>
    </div></CardHeader>
    <CardContent className="p-4">{isLoading ? SkeletonRows() : (
      <ScrollArea className="max-h-[600px] overflow-y-auto"><Table><TableHeader><TableRow>
        <TableHead className="text-xs">{t('admin.name')}</TableHead><TableHead className="text-xs">{t('admin.email')}</TableHead>
        <TableHead className="text-xs">{t('admin.department')}</TableHead><TableHead className="text-xs">{t('admin.roles')}</TableHead>
        <TableHead className="text-xs">{t('admin.status')}</TableHead><TableHead className="text-xs">{t('admin.createdBy')}</TableHead><TableHead className="text-xs">{t('admin.actions')}</TableHead>
      </TableRow></TableHeader><TableBody>
        {filtered.map((u: any) => (<TableRow key={u.id}>
          <TableCell className="text-xs font-medium">{u.name ?? '—'}</TableCell>
          <TableCell className="text-xs">{u.email}</TableCell>
          <TableCell className="text-xs">{u.department ?? '—'}</TableCell>
          <TableCell className="text-xs"><div className="flex flex-wrap gap-1">{(u.roles ?? []).map((r: any) => <Badge key={typeof r === 'string' ? r : r.id} variant="secondary" className="text-[10px] px-1.5 py-0">{typeof r === 'string' ? r : r.name}</Badge>)}</div></TableCell>
          <TableCell className="text-xs"><Badge variant={u.isActive !== false ? 'default' : 'outline'} className="text-[10px]">{u.isActive !== false ? t('admin.active') : t('admin.inactive')}</Badge></TableCell>
          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(u.createdAt)}</TableCell>
          <TableCell className="text-xs"><div className="flex gap-1"><Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(u)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggle.mutate(u)}><Power className="h-3 w-3" /></Button></div></TableCell>
        </TableRow>))}
        {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-xs text-center py-6 text-muted-foreground">{t('admin.noData')}</TableCell></TableRow>}
      </TableBody></Table></ScrollArea>
    )}</CardContent>
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEdit(null); }}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{edit ? t('admin.editUser') : t('admin.addUser')}</DialogTitle><DialogDescription /></DialogHeader>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">{t('admin.name')}</Label><Input name="name" defaultValue={edit?.name ?? ''} className="h-8 text-xs" required /></div>
          <div><Label className="text-xs">{t('admin.email')}</Label><Input name="email" type="email" defaultValue={edit?.email ?? ''} className="h-8 text-xs" required /></div>
          <div><Label className="text-xs">{t('admin.password')}</Label><Input name="password" type="password" className="h-8 text-xs" placeholder={edit ? '••••••••' : ''} required={!edit} /></div>
          <div><Label className="text-xs">{t('admin.department')}</Label><Input name="department" defaultValue={edit?.department ?? ''} className="h-8 text-xs" /></div>
          <div className="col-span-2"><Label className="text-xs">{t('admin.phone')}</Label><Input name="phone" defaultValue={edit?.phone ?? ''} className="h-8 text-xs" /></div>
        </div>
        <div><Label className="text-xs">{t('admin.roles')}</Label><div className="flex flex-wrap gap-2 mt-1">{(data?.roles ?? []).map((r: any) => (<label key={r.id} className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox name="roles" value={r.id} defaultChecked={edit?.roles?.some((er: any) => (typeof er === 'string' ? er : er.id) === r.id)} /><span>{r.name}</span></label>))}</div></div>
        <DialogFooter><Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>{t('admin.cancel')}</Button><Button type="submit" size="sm" className="h-8 text-xs" disabled={save.isPending}>{t('admin.save')}</Button></DialogFooter>
      </form></DialogContent>
    </Dialog></Card>
  );
}

// =================== ROLES TAB ===================
function RolesTab() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin-roles'], queryFn: () => fetcher('/api/settings/roles') });
  const roles = data?.roles ?? [];

  const save = useMutation({
    mutationFn: (body: any) => fetch('/api/settings/roles', { method: edit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { toast.success(edit ? t('toast.saved') : t('admin.addRole')); qc.invalidateQueries({ queryKey: ['admin-roles'] }); setOpen(false); setEdit(null); },
    onError: () => toast.error(t('toast.error')),
  });
  const del = useMutation({
    mutationFn: (id: string) => fetch('/api/settings/roles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.deleted')); qc.invalidateQueries({ queryKey: ['admin-roles'] }); setDelId(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const payload: any = { name: fd.get('name'), displayName: fd.get('displayName'), description: fd.get('description') };
    if (edit) payload.id = edit.id;
    save.mutate(payload);
  };

  const delTarget = roles.find((r: any) => r.id === delId);

  return (
    <Card><CardHeader className="pb-2"><div className="flex items-center justify-between">
      <CardTitle className="text-base font-semibold">{t('admin.rolesTitle')}</CardTitle>
      <Button size="sm" className="h-8 text-xs" onClick={() => { setEdit(null); setOpen(true); }}><Plus className="h-3 w-3 mr-1" />{t('admin.addRole')}</Button>
    </div></CardHeader><CardContent className="p-4">{isLoading ? SkeletonRows() : (
      <ScrollArea className="max-h-[600px] overflow-y-auto"><Table><TableHeader><TableRow>
        <TableHead className="text-xs">{t('admin.name')}</TableHead>
        <TableHead className="text-xs">Display Name</TableHead>
        <TableHead className="text-xs">{t('admin.description')}</TableHead><TableHead className="text-xs">{t('admin.users')}</TableHead>
        <TableHead className="text-xs">{t('admin.permissions')}</TableHead><TableHead className="text-xs">{t('admin.systemRole')}</TableHead><TableHead className="text-xs">{t('admin.actions')}</TableHead>
      </TableRow></TableHeader><TableBody>
        {roles.map((r: any) => (<TableRow key={r.id}>
          <TableCell className="text-xs font-medium">{r.name}</TableCell>
          <TableCell className="text-xs">{r.displayName ?? r.name}</TableCell>
          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.description ?? '—'}</TableCell>
          <TableCell className="text-xs"><Badge variant="secondary" className="text-[10px]">{r.userCount ?? 0}</Badge></TableCell>
          <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{r.permissionCount ?? 0}</Badge></TableCell>
          <TableCell className="text-xs">{r.isSystem ? <Badge variant="default" className="text-[10px] gap-1"><Lock className="h-2.5 w-2.5" />System</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
          <TableCell className="text-xs"><div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEdit(r); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={r.isSystem} onClick={() => setDelId(r.id)}><Trash2 className="h-3 w-3" /></Button>
          </div></TableCell>
        </TableRow>))}
      </TableBody></Table></ScrollArea>
    )}</CardContent>
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEdit(null); }}>
      <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{edit ? t('admin.editRole') : t('admin.addRole')}</DialogTitle><DialogDescription /></DialogHeader>
      <form onSubmit={onSubmit} className="space-y-3">
        <div><Label className="text-xs">{t('admin.name')}</Label><Input name="name" defaultValue={edit?.name ?? ''} className="h-8 text-xs" required /></div>
        <div><Label className="text-xs">Display Name</Label><Input name="displayName" defaultValue={edit?.displayName ?? ''} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">{t('admin.description')}</Label><Input name="description" defaultValue={edit?.description ?? ''} className="h-8 text-xs" /></div>
        <DialogFooter><Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>{t('admin.cancel')}</Button><Button type="submit" size="sm" className="h-8 text-xs" disabled={save.isPending}>{t('admin.save')}</Button></DialogFooter>
      </form></DialogContent>
    </Dialog>
    <AlertDialog open={!!delId} onOpenChange={o => { if (!o) setDelId(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle>
        <AlertDialogDescription>{delTarget?.isSystem ? t('admin.cannotDeleteSystem') : t('admin.confirmDelete')}</AlertDialogDescription>
      </AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('admin.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => delId && del.mutate(delId)}>{t('admin.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog></Card>
  );
}

// =================== API KEYS TAB ===================
function ApiKeysTab() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin-apikeys'], queryFn: () => fetcher('/api/api-keys') });
  const keys = data?.keys ?? data ?? [];

  const save = useMutation({
    mutationFn: (body: any) => fetch('/api/api-keys', { method: edit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (d) => { toast.success(edit ? t('toast.saved') : t('admin.keyCreated')); qc.invalidateQueries({ queryKey: ['admin-apikeys'] }); setOpen(false); setEdit(null); if (!edit && d?.key) setRevealedKey(d.key); },
    onError: () => toast.error(t('toast.error')),
  });
  const toggleKey = useMutation({
    mutationFn: (k: any) => fetch('/api/api-keys', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: k.id, isEnabled: !k.isEnabled }) }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.saved')); qc.invalidateQueries({ queryKey: ['admin-apikeys'] }); },
    onError: () => toast.error(t('toast.error')),
  });
  const del = useMutation({
    mutationFn: (id: string) => fetch('/api/api-keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.deleted')); qc.invalidateQueries({ queryKey: ['admin-apikeys'] }); setDelId(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const payload: any = { name: fd.get('name'), description: fd.get('description'), permissions: fd.get('permissions')?.toString().split(',').map((s: string) => s.trim()).filter(Boolean) ?? [], expiresAt: fd.get('expiresAt') || undefined };
    if (edit) payload.id = edit.id;
    save.mutate(payload);
  };

  return (
    <Card><CardHeader className="pb-2"><div className="flex items-center justify-between">
      <CardTitle className="text-base font-semibold">{t('admin.apiKeysTitle')}</CardTitle>
      <Button size="sm" className="h-8 text-xs" onClick={() => { setEdit(null); setOpen(true); }}><Plus className="h-3 w-3 mr-1" />{t('admin.createKey')}</Button>
    </div></CardHeader><CardContent className="p-4">
      {revealedKey && <Alert className="mb-3"><AlertTitle>{t('admin.keyCreated')}</AlertTitle><AlertDescription>
        <p className="text-xs font-mono break-all bg-muted p-2 rounded mt-1">{revealedKey}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{t('admin.keyShownOnce')}</p>
        <Button size="sm" variant="outline" className="h-7 text-xs mt-2" onClick={() => { navigator.clipboard.writeText(revealedKey); toast.success(t('admin.copied')); }}><Copy className="h-3 w-3 mr-1" />{t('admin.copyKey')}</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs mt-2 ml-1" onClick={() => setRevealedKey(null)}>×</Button>
      </AlertDescription></Alert>}
      {isLoading ? SkeletonRows() : (
      <ScrollArea className="max-h-[600px] overflow-y-auto"><Table><TableHeader><TableRow>
        <TableHead className="text-xs">{t('admin.name')}</TableHead><TableHead className="text-xs">{t('admin.keyPrefix')}</TableHead>
        <TableHead className="text-xs">{t('admin.permissions')}</TableHead><TableHead className="text-xs">{t('admin.status')}</TableHead>
        <TableHead className="text-xs">{t('admin.lastUsed')}</TableHead><TableHead className="text-xs">{t('admin.requests')}</TableHead><TableHead className="text-xs">{t('admin.actions')}</TableHead>
      </TableRow></TableHeader><TableBody>
        {keys.map((k: any) => (<TableRow key={k.id}>
          <TableCell className="text-xs font-medium">{k.name}</TableCell>
          <TableCell className="text-xs font-mono text-muted-foreground">{k.prefix ?? k.key?.substring(0, 8) ?? '••••••••'}</TableCell>
          <TableCell className="text-xs"><div className="flex flex-wrap gap-1">{(k.permissions ?? []).map((p: string) => <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">{p}</Badge>)}</div></TableCell>
          <TableCell className="text-xs"><Badge variant={k.isEnabled !== false ? 'default' : 'outline'} className="text-[10px]">{k.isEnabled !== false ? t('admin.enabled') : t('admin.disabled')}</Badge></TableCell>
          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{k.lastUsedAt ? fmtDateTime(k.lastUsedAt) : '—'}</TableCell>
          <TableCell className="text-xs">{k.requestCount ?? 0}</TableCell>
          <TableCell className="text-xs"><div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEdit(k); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleKey.mutate(k)}><Power className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDelId(k.id)}><Trash2 className="h-3 w-3" /></Button>
          </div></TableCell>
        </TableRow>))}
        {keys.length === 0 && <TableRow><TableCell colSpan={7} className="text-xs text-center py-6 text-muted-foreground">{t('admin.noData')}</TableCell></TableRow>}
      </TableBody></Table></ScrollArea>
      )}</CardContent>
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEdit(null); }}>
      <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{edit ? t('admin.editApiKey') : t('admin.createKey')}</DialogTitle><DialogDescription /></DialogHeader>
      <form onSubmit={onSubmit} className="space-y-3">
        <div><Label className="text-xs">{t('admin.name')}</Label><Input name="name" defaultValue={edit?.name ?? ''} className="h-8 text-xs" required /></div>
        <div><Label className="text-xs">{t('admin.description')}</Label><Input name="description" defaultValue={edit?.description ?? ''} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">{t('admin.permissions')}</Label><Input name="permissions" defaultValue={edit?.permissions?.join(', ') ?? ''} className="h-8 text-xs" placeholder="read, write" /></div>
        <div><Label className="text-xs">{t('admin.expiresAt')}</Label><Input name="expiresAt" type="date" defaultValue={edit?.expiresAt ? edit.expiresAt.split('T')[0] : ''} className="h-8 text-xs" /></div>
        <DialogFooter><Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>{t('admin.cancel')}</Button><Button type="submit" size="sm" className="h-8 text-xs" disabled={save.isPending}>{t('admin.save')}</Button></DialogFooter>
      </form></DialogContent>
    </Dialog>
    <AlertDialog open={!!delId} onOpenChange={o => { if (!o) setDelId(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('admin.confirmDelete')}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>{t('admin.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => delId && del.mutate(delId)}>{t('admin.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog></Card>
  );
}

// =================== WEBHOOKS TAB ===================
function WebhooksTab() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin-webhooks'], queryFn: () => fetcher('/api/webhooks') });
  const webhooks = data?.webhooks ?? data ?? [];

  const save = useMutation({
    mutationFn: (body: any) => fetch('/api/webhooks', { method: edit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { toast.success(edit ? t('toast.saved') : t('admin.addWebhook')); qc.invalidateQueries({ queryKey: ['admin-webhooks'] }); setOpen(false); setEdit(null); },
    onError: () => toast.error(t('toast.error')),
  });
  const toggleWh = useMutation({
    mutationFn: (w: any) => fetch('/api/webhooks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: w.id, isEnabled: !w.isEnabled }) }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.saved')); qc.invalidateQueries({ queryKey: ['admin-webhooks'] }); },
    onError: () => toast.error(t('toast.error')),
  });
  const del = useMutation({
    mutationFn: (id: string) => fetch('/api/webhooks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.deleted')); qc.invalidateQueries({ queryKey: ['admin-webhooks'] }); setDelId(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const payload: any = { name: fd.get('name'), url: fd.get('url'), events: fd.getAll('events'), description: fd.get('description') };
    if (edit) payload.id = edit.id;
    save.mutate(payload);
  };

  return (
    <Card><CardHeader className="pb-2"><div className="flex items-center justify-between">
      <CardTitle className="text-base font-semibold">{t('admin.webhooksTitle')}</CardTitle>
      <Button size="sm" className="h-8 text-xs" onClick={() => { setEdit(null); setOpen(true); }}><Plus className="h-3 w-3 mr-1" />{t('admin.addWebhook')}</Button>
    </div></CardHeader><CardContent className="p-4">{isLoading ? SkeletonRows() : (
      <ScrollArea className="max-h-[600px] overflow-y-auto"><Table><TableHeader><TableRow>
        <TableHead className="text-xs">{t('admin.name')}</TableHead><TableHead className="text-xs">{t('admin.url')}</TableHead>
        <TableHead className="text-xs">{t('admin.events')}</TableHead><TableHead className="text-xs">{t('admin.status')}</TableHead>
        <TableHead className="text-xs">{t('admin.successRate')}</TableHead><TableHead className="text-xs">{t('admin.lastSync')}</TableHead><TableHead className="text-xs">{t('admin.actions')}</TableHead>
      </TableRow></TableHeader><TableBody>
        {webhooks.map((w: any) => (<TableRow key={w.id}>
          <TableCell className="text-xs font-medium">{w.name}</TableCell>
          <TableCell className="text-xs font-mono text-muted-foreground max-w-[200px] truncate">{w.url}</TableCell>
          <TableCell className="text-xs"><div className="flex flex-wrap gap-1">{(w.events ?? []).map((ev: string) => <Badge key={ev} variant="secondary" className="text-[10px] px-1.5 py-0">{ev}</Badge>)}</div></TableCell>
          <TableCell className="text-xs"><Badge variant={w.isEnabled !== false ? 'default' : 'outline'} className="text-[10px]">{w.isEnabled !== false ? t('admin.enabled') : t('admin.disabled')}</Badge></TableCell>
          <TableCell className="text-xs">{w.successRate != null ? `${w.successRate}%` : '—'}</TableCell>
          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{w.lastDeliveryAt ? fmtDateTime(w.lastDeliveryAt) : '—'}</TableCell>
          <TableCell className="text-xs"><div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEdit(w); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleWh.mutate(w)}><Power className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDelId(w.id)}><Trash2 className="h-3 w-3" /></Button>
          </div></TableCell>
        </TableRow>))}
        {webhooks.length === 0 && <TableRow><TableCell colSpan={7} className="text-xs text-center py-6 text-muted-foreground">{t('admin.noData')}</TableCell></TableRow>}
      </TableBody></Table></ScrollArea>
    )}</CardContent>
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEdit(null); }}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{edit ? t('admin.editWebhook') : t('admin.addWebhook')}</DialogTitle><DialogDescription /></DialogHeader>
      <form onSubmit={onSubmit} className="space-y-3">
        <div><Label className="text-xs">{t('admin.name')}</Label><Input name="name" defaultValue={edit?.name ?? ''} className="h-8 text-xs" required /></div>
        <div><Label className="text-xs">{t('admin.url')}</Label><Input name="url" defaultValue={edit?.url ?? ''} className="h-8 text-xs" required placeholder="https://..." /></div>
        <div><Label className="text-xs">{t('admin.description')}</Label><Input name="description" defaultValue={edit?.description ?? ''} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">{t('admin.events')}</Label><div className="flex flex-wrap gap-2 mt-1">{WEBHOOK_EVENTS.map(ev => (<label key={ev} className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox name="events" value={ev} defaultChecked={edit?.events?.includes(ev)} /><span className="font-mono text-[10px]">{ev}</span></label>))}</div></div>
        <DialogFooter><Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>{t('admin.cancel')}</Button><Button type="submit" size="sm" className="h-8 text-xs" disabled={save.isPending}>{t('admin.save')}</Button></DialogFooter>
      </form></DialogContent>
    </Dialog>
    <AlertDialog open={!!delId} onOpenChange={o => { if (!o) setDelId(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('admin.confirmDelete')}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>{t('admin.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => delId && del.mutate(delId)}>{t('admin.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog></Card>
  );
}

// =================== DATA SOURCES TAB ===================
function DataSourcesTab() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const { data, isLoading } = useQuery({ queryKey: ['admin-sources'], queryFn: () => fetcher('/api/etl/sources') });
  const sources = data?.sources ?? data ?? [];
  const filtered = statusFilter === 'all' ? sources : sources.filter((s: any) => s.status === statusFilter);

  const save = useMutation({
    mutationFn: (body: any) => fetch('/api/etl/sources', { method: edit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { toast.success(edit ? t('toast.saved') : t('admin.addSource')); qc.invalidateQueries({ queryKey: ['admin-sources'] }); setOpen(false); setEdit(null); },
    onError: () => toast.error(t('toast.error')),
  });
  const del = useMutation({
    mutationFn: (id: string) => fetch('/api/etl/sources', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.deleted')); qc.invalidateQueries({ queryKey: ['admin-sources'] }); setDelId(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const payload: any = { name: fd.get('name'), type: fd.get('type'), protocol: fd.get('protocol'), endpoint: fd.get('endpoint'), description: fd.get('description'), region: fd.get('region'), vendor: fd.get('vendor') };
    if (edit) payload.id = edit.id;
    save.mutate(payload);
  };

  const statusVariant = (s: string) => s === 'active' ? 'default' : s === 'error' ? 'destructive' : s === 'maintenance' ? 'secondary' : 'outline';

  return (
    <Card><CardHeader className="pb-2"><div className="flex items-center justify-between flex-wrap gap-2">
      <CardTitle className="text-base font-semibold">{t('admin.dataSourcesTitle')}</CardTitle>
      <div className="flex gap-2 items-center flex-wrap">
        {SOURCE_STATUSES.map(s => <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} className="h-7 text-[10px] px-2" onClick={() => setStatusFilter(s)}>{s === 'all' ? t('admin.allStatus') : t(`admin.${s}` as any)}</Button>)}
        <Button size="sm" className="h-7 text-xs" onClick={() => { setEdit(null); setOpen(true); }}><Plus className="h-3 w-3 mr-1" />{t('admin.addSource')}</Button>
      </div>
    </div></CardHeader><CardContent className="p-4">{isLoading ? SkeletonRows() : (
      <ScrollArea className="max-h-[600px] overflow-y-auto"><Table><TableHeader><TableRow>
        <TableHead className="text-xs">{t('admin.name')}</TableHead><TableHead className="text-xs">{t('admin.type')}</TableHead>
        <TableHead className="text-xs">{t('admin.protocol')}</TableHead><TableHead className="text-xs">{t('admin.vendor')}</TableHead>
        <TableHead className="text-xs">{t('admin.status')}</TableHead><TableHead className="text-xs">{t('admin.records')}</TableHead><TableHead className="text-xs">{t('admin.freshness')}</TableHead><TableHead className="text-xs">{t('admin.lastSync')}</TableHead><TableHead className="text-xs">{t('admin.actions')}</TableHead>
      </TableRow></TableHeader><TableBody>
        {filtered.map((s: any) => (<TableRow key={s.id}>
          <TableCell className="text-xs font-medium">{s.name}</TableCell>
          <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{s.type}</Badge></TableCell>
          <TableCell className="text-xs">{s.protocol ?? '—'}</TableCell>
          <TableCell className="text-xs">{s.vendor ?? '—'}</TableCell>
          <TableCell className="text-xs"><Badge variant={statusVariant(s.status)} className="text-[10px]">{s.status}</Badge></TableCell>
          <TableCell className="text-xs">{s.recordCount ?? 0}</TableCell>
          <TableCell className="text-xs">{s.freshness ?? '—'}</TableCell>
          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{s.lastSyncAt ? fmtDateTime(s.lastSyncAt) : '—'}</TableCell>
          <TableCell className="text-xs"><div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEdit(s); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDelId(s.id)}><Trash2 className="h-3 w-3" /></Button>
          </div></TableCell>
        </TableRow>))}
        {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-xs text-center py-6 text-muted-foreground">{t('admin.noData')}</TableCell></TableRow>}
      </TableBody></Table></ScrollArea>
    )}</CardContent>
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEdit(null); }}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{edit ? t('admin.editSource') : t('admin.addSource')}</DialogTitle><DialogDescription /></DialogHeader>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">{t('admin.name')}</Label><Input name="name" defaultValue={edit?.name ?? ''} className="h-8 text-xs" required /></div>
          <div><Label className="text-xs">{t('admin.type')}</Label><Select name="type" defaultValue={edit?.type ?? 'oss'}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{SOURCE_TYPES.map(tp => <SelectItem key={tp} value={tp} className="text-xs">{tp}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">{t('admin.protocol')}</Label><Input name="protocol" defaultValue={edit?.protocol ?? ''} className="h-8 text-xs" placeholder="https, sftp, ..." /></div>
          <div><Label className="text-xs">{t('admin.vendor')}</Label><Input name="vendor" defaultValue={edit?.vendor ?? ''} className="h-8 text-xs" /></div>
          <div className="col-span-2"><Label className="text-xs">{t('admin.endpoint')}</Label><Input name="endpoint" defaultValue={edit?.endpoint ?? ''} className="h-8 text-xs" required placeholder="https://..." /></div>
          <div><Label className="text-xs">{t('admin.region')}</Label><Input name="region" defaultValue={edit?.region ?? ''} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">{t('admin.description')}</Label><Input name="description" defaultValue={edit?.description ?? ''} className="h-8 text-xs" /></div>
        </div>
        <DialogFooter><Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>{t('admin.cancel')}</Button><Button type="submit" size="sm" className="h-8 text-xs" disabled={save.isPending}>{t('admin.save')}</Button></DialogFooter>
      </form></DialogContent>
    </Dialog>
    <AlertDialog open={!!delId} onOpenChange={o => { if (!o) setDelId(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('admin.confirmDelete')}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>{t('admin.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => delId && del.mutate(delId)}>{t('admin.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog></Card>
  );
}