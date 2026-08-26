'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Pencil, Trash2, Power, Copy, Search, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('API error: ' + r.status); return r.json(); });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-DZ');
const fmtDateTime = (d: string) => new Date(d).toLocaleString('fr-DZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function SkeletonRows(n = 5) {
  return <div className="space-y-3">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
}

export default function ApiKeysView() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-apikeys'],
    queryFn: () => fetcher('/api/api-keys'),
  });
  const keys = data?.keys ?? [];

  const filtered = keys.filter((k: any) => {
    const matchSearch = `${k.name} ${k.keyPrefix ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || (statusFilter === 'enabled' && k.isEnabled !== false) || (statusFilter === 'disabled' && k.isEnabled === false);
    return matchSearch && matchStatus;
  });

  const save = useMutation({
    mutationFn: (body: any) => fetch('/api/api-keys', {
      method: edit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: (d) => { toast.success(edit ? t('toast.saved') : t('apikeys.keyCreated')); qc.invalidateQueries({ queryKey: ['admin-apikeys'] }); setOpen(false); setEdit(null); if (!edit && d?.key) setRevealedKey(d.key); },
    onError: () => toast.error(t('toast.error')),
  });

  const toggleKey = useMutation({
    mutationFn: (k: any) => fetch('/api/api-keys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: k.id, isEnabled: !k.isEnabled }),
    }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.saved')); qc.invalidateQueries({ queryKey: ['admin-apikeys'] }); },
    onError: () => toast.error(t('toast.error')),
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/api-keys?id=${id}`, {
      method: 'DELETE',
    }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.deleted')); qc.invalidateQueries({ queryKey: ['admin-apikeys'] }); setDelId(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      name: fd.get('name'),
      description: fd.get('description') || undefined,
      permissions: fd.get('permissions')?.toString().split(',').map((s: string) => s.trim()).filter(Boolean) ?? [],
      expiresAt: fd.get('expiresAt') ? new Date(fd.get('expiresAt') as string).toISOString() : undefined,
    };
    if (edit) payload.id = edit.id;
    save.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">{t('apikeys.title')}</CardTitle>
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
                <KeyRound className="h-3 w-3 mr-1" />{t('apikeys.createKey')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {revealedKey && (
            <Alert className="mb-3">
              <AlertTitle>{t('apikeys.keyCreated')}</AlertTitle>
              <AlertDescription>
                <p className="text-xs font-mono break-all bg-muted p-2 rounded mt-1">{revealedKey}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t('admin.keyShownOnce')}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(revealedKey); toast.success(t('admin.copied')); }}>
                    <Copy className="h-3 w-3 mr-1" />{t('apikeys.copyKey')}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRevealedKey(null)}>×</Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {isLoading ? SkeletonRows() : (
            <ScrollArea className="max-h-[600px] overflow-y-auto">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t('admin.name')}</TableHead>
                      <TableHead className="text-xs">{t('admin.keyPrefix')}</TableHead>
                      <TableHead className="text-xs">{t('admin.permissions')}</TableHead>
                      <TableHead className="text-xs">{t('admin.status')}</TableHead>
                      <TableHead className="text-xs">{t('apikeys.created')}</TableHead>
                      <TableHead className="text-xs">{t('admin.lastUsed')}</TableHead>
                      <TableHead className="text-xs">{t('admin.expiresAt')}</TableHead>
                      <TableHead className="text-xs">{t('admin.requests')}</TableHead>
                      <TableHead className="text-xs">{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((k: any) => (
                      <TableRow key={k.id}>
                        <TableCell className="text-xs font-medium">{k.name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{k.keyPrefix ?? '••••••••'}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-wrap gap-1">
                            {(k.permissions ?? []).map((p: string) => <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">{p}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={k.isEnabled !== false ? 'default' : 'outline'} className="text-[10px]">
                            {k.isEnabled !== false ? t('admin.enabled') : t('admin.disabled')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(k.createdAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{k.lastUsedAt ? fmtDateTime(k.lastUsedAt) : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{k.expiresAt ? fmtDate(k.expiresAt) : '—'}</TableCell>
                        <TableCell className="text-xs">{k.requestCount ?? 0}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEdit(k); setOpen(true); }} title={t('admin.edit')}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleKey.mutate(k)} title={t('admin.confirmToggle')}><Power className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDelId(k.id)} title={t('apikeys.revoke')}><Trash2 className="h-3 w-3" /></Button>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{edit ? t('apikeys.editKey') : t('apikeys.createKey')}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label className="text-xs">{t('admin.name')}</Label>
              <Input name="name" defaultValue={edit?.name ?? ''} className="h-8 text-xs" required />
            </div>
            <div>
              <Label className="text-xs">{t('admin.description')}</Label>
              <Input name="description" defaultValue={edit?.description ?? ''} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">{t('admin.permissions')}</Label>
              <Input name="permissions" defaultValue={edit?.permissions?.join(', ') ?? ''} className="h-8 text-xs" placeholder="read, write, admin" />
            </div>
            <div>
              <Label className="text-xs">{t('admin.expiresAt')}</Label>
              <Input name="expiresAt" type="date" defaultValue={edit?.expiresAt ? edit.expiresAt.split('T')[0] : ''} className="h-8 text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>{t('admin.cancel')}</Button>
              <Button type="submit" size="sm" className="h-8 text-xs" disabled={save.isPending}>{t('admin.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!delId} onOpenChange={o => { if (!o) setDelId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('apikeys.confirmRevoke')}</AlertDialogTitle>
            <AlertDialogDescription>{t('apikeys.revokeDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => delId && del.mutate(delId)}>{t('apikeys.revoke')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
