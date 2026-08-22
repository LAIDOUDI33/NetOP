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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

const SOURCE_TYPES = ['oss', 'crm', 'billing', 'kpi', 'probe', 'external_api', 'file', 'database'] as const;
const SOURCE_STATUSES = ['all', 'active', 'inactive', 'error', 'maintenance'] as const;

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('API error: ' + r.status); return r.json(); });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-DZ');
const fmtDateTime = (d: string) => new Date(d).toLocaleString('fr-DZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function SkeletonRows(n = 5) {
  return <div className="space-y-3">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
}

const statusVariant = (s: string) => s === 'active' ? 'default' : s === 'error' ? 'destructive' : s === 'maintenance' ? 'secondary' : 'outline';

const freshnessLabel = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

export default function DataSourcesView() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sources'],
    queryFn: () => fetcher('/api/etl/sources'),
  });
  const sources = data?.sources ?? [];

  const filtered = sources.filter((s: any) => {
    const matchSearch = `${s.name} ${s.type} ${s.vendor ?? ''} ${s.region ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchType = typeFilter === 'all' || s.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const save = useMutation({
    mutationFn: (body: any) => fetch('/api/etl/sources', {
      method: edit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { toast.success(edit ? t('toast.saved') : t('datasources.sourceCreated')); qc.invalidateQueries({ queryKey: ['admin-sources'] }); setOpen(false); setEdit(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/etl/sources?id=${id}`, {
      method: 'DELETE',
    }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.deleted')); qc.invalidateQueries({ queryKey: ['admin-sources'] }); setDelId(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      name: fd.get('name'),
      type: fd.get('type'),
      protocol: fd.get('protocol') || undefined,
      endpoint: fd.get('endpoint') || undefined,
      description: fd.get('description') || undefined,
      region: fd.get('region') || undefined,
      vendor: fd.get('vendor') || undefined,
    };
    if (edit) payload.id = edit.id;
    save.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">{t('datasources.title')}</CardTitle>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.search')} className="h-8 text-xs pl-8 w-44" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">{t('admin.allStatus')}</SelectItem>
                  {SOURCE_TYPES.map(tp => <SelectItem key={tp} value={tp} className="text-xs">{tp}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                {SOURCE_STATUSES.map(s => (
                  <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} className="h-7 text-[10px] px-2" onClick={() => setStatusFilter(s)}>
                    {s === 'all' ? t('admin.allStatus') : t(`admin.${s}` as any)}
                  </Button>
                ))}
              </div>
              <Button size="sm" className="h-8 text-xs" onClick={() => { setEdit(null); setOpen(true); }}>
                <Database className="h-3 w-3 mr-1" />{t('datasources.addSource')}
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
                      <TableHead className="text-xs">{t('admin.type')}</TableHead>
                      <TableHead className="text-xs">{t('admin.protocol')}</TableHead>
                      <TableHead className="text-xs">{t('admin.vendor')}</TableHead>
                      <TableHead className="text-xs">{t('admin.region')}</TableHead>
                      <TableHead className="text-xs">{t('admin.status')}</TableHead>
                      <TableHead className="text-xs">{t('admin.records')}</TableHead>
                      <TableHead className="text-xs">{t('admin.freshness')}</TableHead>
                      <TableHead className="text-xs">{t('admin.lastSync')}</TableHead>
                      <TableHead className="text-xs">{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs font-medium">{s.name}</TableCell>
                        <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{s.type}</Badge></TableCell>
                        <TableCell className="text-xs">{s.protocol ?? '—'}</TableCell>
                        <TableCell className="text-xs">{s.vendor ?? '—'}</TableCell>
                        <TableCell className="text-xs">{s.region ?? '—'}</TableCell>
                        <TableCell className="text-xs"><Badge variant={statusVariant(s.status)} className="text-[10px]">{s.status}</Badge></TableCell>
                        <TableCell className="text-xs">{(s.recordsAvailable ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{s.freshnessSeconds != null ? freshnessLabel(s.freshnessSeconds) : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{s.lastSyncAt ? fmtDateTime(s.lastSyncAt) : '—'}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEdit(s); setOpen(true); }} title={t('admin.edit')}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDelId(s.id)} title={t('admin.delete')}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-xs text-center py-6 text-muted-foreground">{t('admin.noData')}</TableCell></TableRow>
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
            <DialogTitle>{edit ? t('datasources.editSource') : t('datasources.addSource')}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('admin.name')}</Label>
                <Input name="name" defaultValue={edit?.name ?? ''} className="h-8 text-xs" required />
              </div>
              <div>
                <Label className="text-xs">{t('admin.type')}</Label>
                <Select name="type" defaultValue={edit?.type ?? 'oss'}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_TYPES.map(tp => <SelectItem key={tp} value={tp} className="text-xs">{tp}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t('admin.protocol')}</Label>
                <Input name="protocol" defaultValue={edit?.protocol ?? ''} className="h-8 text-xs" placeholder="https, sftp, ..." />
              </div>
              <div>
                <Label className="text-xs">{t('admin.vendor')}</Label>
                <Input name="vendor" defaultValue={edit?.vendor ?? ''} className="h-8 text-xs" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t('admin.endpoint')}</Label>
                <Input name="endpoint" defaultValue={edit?.endpoint ?? ''} className="h-8 text-xs" placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">{t('admin.region')}</Label>
                <Input name="region" defaultValue={edit?.region ?? ''} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">{t('admin.description')}</Label>
                <Input name="description" defaultValue={edit?.description ?? ''} className="h-8 text-xs" />
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
            <AlertDialogDescription>{t('datasources.deleteDesc')}</AlertDialogDescription>
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
