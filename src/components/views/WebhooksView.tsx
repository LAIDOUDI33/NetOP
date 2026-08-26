'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Power, Search, Webhook } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

const WEBHOOK_EVENTS = ['alert.created', 'alert.acknowledged', 'incident.created', 'incident.resolved', 'anomaly.detected', 'son.action', 'outage.started', 'outage.resolved'] as const;

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('API error: ' + r.status); return r.json(); });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-DZ');
const fmtDateTime = (d: string) => new Date(d).toLocaleString('fr-DZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function SkeletonRows(n = 5) {
  return <div className="space-y-3">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
}

export default function WebhooksView() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  interface WebhookItem { id: string; name: string; url: string; events?: string[]; isEnabled?: boolean; description?: string; secret?: string; deliveryCount?: number; successCount?: number; failureCount?: number; successRate?: number; lastDeliveryAt?: string; createdAt: string; }
  const [edit, setEdit] = useState<WebhookItem | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-webhooks'],
    queryFn: () => fetcher('/api/webhooks'),
  });
  const webhooks = data?.webhooks ?? [];

  const filtered = webhooks.filter((w: WebhookItem) => {
    const matchSearch = `${w.name} ${w.url}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all'
      || (statusFilter === 'enabled' && w.isEnabled !== false)
      || (statusFilter === 'disabled' && w.isEnabled === false);
    return matchSearch && matchStatus;
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/webhooks', {
      method: edit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { toast.success(edit ? t('toast.saved') : t('webhooks.webhookCreated')); qc.invalidateQueries({ queryKey: ['admin-webhooks'] }); setOpen(false); setEdit(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const toggleWh = useMutation({
    mutationFn: (w: WebhookItem) => fetch('/api/webhooks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: w.id, isEnabled: !w.isEnabled }),
    }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.saved')); qc.invalidateQueries({ queryKey: ['admin-webhooks'] }); },
    onError: () => toast.error(t('toast.error')),
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/webhooks?id=${id}`, {
      method: 'DELETE',
    }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.deleted')); qc.invalidateQueries({ queryKey: ['admin-webhooks'] }); setDelId(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: fd.get('name'),
      url: fd.get('url'),
      events: fd.getAll('events'),
      description: fd.get('description') || undefined,
      secret: fd.get('secret') || undefined,
    };
    if (edit) payload.id = edit.id;
    save.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">{t('webhooks.title')}</CardTitle>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.search')} className="h-8 text-xs pl-8 w-44" />
              </div>
              <div className="flex gap-1">
                {(['all', 'enabled', 'disabled'] as const).map(s => (
                  <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} className="h-7 text-[10px] px-2" onClick={() => setStatusFilter(s)}>
                    {s === 'all' ? t('admin.allStatus') : s === 'enabled' ? t('admin.enabled') : t('admin.disabled')}
                  </Button>
                ))}
              </div>
              <Button size="sm" className="h-8 text-xs" onClick={() => { setEdit(null); setOpen(true); }}>
                <Webhook className="h-3 w-3 mr-1" />{t('webhooks.addWebhook')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? SkeletonRows() : (
            <ScrollArea className="max-h-[600px] overflow-y-auto">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t('admin.name')}</TableHead>
                      <TableHead className="text-xs">{t('admin.url')}</TableHead>
                      <TableHead className="text-xs">{t('admin.events')}</TableHead>
                      <TableHead className="text-xs">{t('admin.status')}</TableHead>
                      <TableHead className="text-xs">{t('webhooks.deliveries')}</TableHead>
                      <TableHead className="text-xs">{t('admin.successRate')}</TableHead>
                      <TableHead className="text-xs">{t('webhooks.lastDelivery')}</TableHead>
                      <TableHead className="text-xs">{t('webhooks.created')}</TableHead>
                      <TableHead className="text-xs">{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((w: WebhookItem) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-xs font-medium">{w.name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[200px] truncate">{w.url}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-wrap gap-1">
                            {(w.events ?? []).map((ev: string) => (
                              <Badge key={ev} variant="secondary" className="text-[10px] px-1.5 py-0">{ev.split('.').pop()}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={w.isEnabled !== false ? 'default' : 'outline'} className="text-[10px]">
                            {w.isEnabled !== false ? t('admin.enabled') : t('admin.disabled')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-[10px]">{w.deliveryCount ?? 0}</Badge>
                            <span className="text-[10px] text-muted-foreground">({w.successCount ?? 0}✓ / {w.failureCount ?? 0}✗)</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{w.successRate != null ? `${w.successRate}%` : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{w.lastDeliveryAt ? fmtDateTime(w.lastDeliveryAt) : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(w.createdAt)}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEdit(w); setOpen(true); }} title={t('admin.edit')}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleWh.mutate(w)} title={t('admin.confirmToggle')}><Power className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDelId(w.id)} title={t('admin.delete')}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-xs text-center py-6 text-muted-foreground">{t('admin.noData')}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEdit(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{edit ? t('webhooks.editWebhook') : t('webhooks.addWebhook')}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label className="text-xs">{t('admin.name')}</Label>
              <Input name="name" defaultValue={edit?.name ?? ''} className="h-8 text-xs" required />
            </div>
            <div>
              <Label className="text-xs">{t('admin.url')}</Label>
              <Input name="url" defaultValue={edit?.url ?? ''} className="h-8 text-xs" required placeholder="https://example.com/webhook" />
            </div>
            <div>
              <Label className="text-xs">{t('admin.description')}</Label>
              <Input name="description" defaultValue={edit?.description ?? ''} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">{t('webhooks.secret')}</Label>
              <Input name="secret" defaultValue={edit?.secret ?? ''} className="h-8 text-xs font-mono" placeholder={edit ? '••••••••' : t('webhooks.secretPlaceholder')} />
            </div>
            <div>
              <Label className="text-xs">{t('admin.events')}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {WEBHOOK_EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox name="events" value={ev} defaultChecked={edit?.events?.includes(ev)} />
                    <span className="font-mono text-[10px]">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>{t('admin.cancel')}</Button>
              <Button type="submit" size="sm" className="h-8 text-xs" disabled={save.isPending}>{t('admin.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!delId} onOpenChange={o => { if (!o) setDelId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('webhooks.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => delId && del.mutate(delId)}>{t('admin.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
