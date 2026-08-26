'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Search, Play, Power, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

const PIPELINE_STATUSES = ['all', 'active', 'disabled', 'error', 'idle'] as const;

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('API error: ' + r.status); return r.json(); });
const fmtDateTime = (d: string) => new Date(d).toLocaleString('fr-DZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function SkeletonRows(n = 5) {
  return <div className="space-y-3">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
}

const statusVariant = (s: string) => {
  if (s === 'active' || s === 'running') return 'default';
  if (s === 'error' || s === 'failed') return 'destructive';
  if (s === 'disabled') return 'outline';
  return 'secondary';
};

interface Pipeline { id: string; name: string; source?: string; target?: string; schedule?: string; status?: string; description?: string; enabled?: boolean; lastRun?: string; totalRuns?: number; successRuns?: number; failedRuns?: number; errorRate?: number; retryMaxAttempts?: number; latestExecution?: { status: string }; }

export default function EtlPipelinesView() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Pipeline | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pipelines'],
    queryFn: () => fetcher('/api/etl/pipelines'),
  });
  const pipelines = (data?.pipelines ?? []) as Pipeline[];
  const total = data?.total ?? 0;

  const filtered = pipelines.filter((p) => {
    const matchSearch = `${p.name} ${p.source ?? ''} ${p.target ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/etl/pipelines', {
      method: edit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { toast.success(edit ? t('toast.saved') : t('etlpipelines.pipelineCreated')); qc.invalidateQueries({ queryKey: ['admin-pipelines'] }); setOpen(false); setEdit(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const togglePipeline = useMutation({
    mutationFn: (p: Pipeline) => fetch('/api/etl/pipelines', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, enabled: !p.enabled }),
    }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.saved')); qc.invalidateQueries({ queryKey: ['admin-pipelines'] }); },
    onError: () => toast.error(t('toast.error')),
  });

  const triggerRun = useMutation({
    mutationFn: (p: Pipeline) => fetch('/api/etl/pipelines/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelineId: p.id }),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { toast.success(t('etlpipelines.triggered')); qc.invalidateQueries({ queryKey: ['admin-pipelines'] }); },
    onError: () => toast.error(t('toast.error')),
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/etl/pipelines?id=${id}`, {
      method: 'DELETE',
    }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.deleted')); qc.invalidateQueries({ queryKey: ['admin-pipelines'] }); setDelId(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: fd.get('name'),
      source: fd.get('source') || undefined,
      target: fd.get('target') || undefined,
      schedule: fd.get('schedule') || undefined,
      description: fd.get('description') || undefined,
      retryMaxAttempts: parseInt(fd.get('retryMaxAttempts') as string) || 3,
    };
    if (edit) payload.id = edit.id;
    save.mutate(payload);
  };

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('etlpipelines.totalPipelines')}</p>
          <p className="text-2xl font-bold">{total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('etlpipelines.activePipelines')}</p>
          <p className="text-2xl font-bold text-green-600">{pipelines.filter((p) => p.enabled).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('etlpipelines.totalRuns')}</p>
          <p className="text-2xl font-bold">{pipelines.reduce((a: number, p) => a + (p.totalRuns ?? 0), 0).toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t('etlpipelines.avgErrorRate')}</p>
          <p className="text-2xl font-bold">{pipelines.length > 0 ? (pipelines.reduce((a: number, p) => a + (p.errorRate ?? 0), 0) / pipelines.length).toFixed(1) : '0'}%</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">{t('etlpipelines.title')}</CardTitle>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.search')} className="h-8 text-xs pl-8 w-44" />
              </div>
              <div className="flex gap-1">
                {PIPELINE_STATUSES.map(s => (
                  <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} className="h-7 text-[10px] px-2" onClick={() => setStatusFilter(s)}>
                    {s === 'all' ? t('admin.allStatus') : s}
                  </Button>
                ))}
              </div>
              <Button size="sm" className="h-8 text-xs" onClick={() => { setEdit(null); setOpen(true); }}>
                <FolderTree className="h-3 w-3 mr-1" />{t('etlpipelines.addPipeline')}
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
                      <TableHead className="text-xs">{t('etlpipelines.source')}</TableHead>
                      <TableHead className="text-xs">{t('etlpipelines.destination')}</TableHead>
                      <TableHead className="text-xs">{t('etlpipelines.schedule')}</TableHead>
                      <TableHead className="text-xs">{t('admin.status')}</TableHead>
                      <TableHead className="text-xs">{t('etlpipelines.lastRun')}</TableHead>
                      <TableHead className="text-xs">{t('etlpipelines.totalRunsCol')}</TableHead>
                      <TableHead className="text-xs">{t('etlpipelines.errorRate')}</TableHead>
                      <TableHead className="text-xs">{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-medium">{p.name}</TableCell>
                        <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{p.source ?? '—'}</Badge></TableCell>
                        <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{p.target ?? '—'}</Badge></TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{p.schedule ?? '—'}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={statusVariant(p.status)} className="text-[10px]">
                            {p.status ?? 'idle'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {p.lastRun ? fmtDateTime(p.lastRun) : '—'}
                          {p.latestExecution && (
                            <Badge variant={p.latestExecution.status === 'completed' ? 'default' : 'destructive'} className="text-[10px] ml-1">
                              {p.latestExecution.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-medium">{p.totalRuns ?? 0}</span>
                          <span className="text-muted-foreground"> ({p.successRuns ?? 0}✓ / {p.failedRuns ?? 0}✗)</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={p.errorRate > 5 ? 'text-red-600 font-medium' : ''}>{p.errorRate != null ? `${p.errorRate.toFixed(1)}%` : '—'}</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEdit(p); setOpen(true); }} title={t('admin.edit')}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => triggerRun.mutate(p)} title={t('etlpipelines.triggerRun')}><Play className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => togglePipeline.mutate(p)} title={t('admin.confirmToggle')}><Power className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDelId(p.id)} title={t('admin.delete')}><Trash2 className="h-3 w-3" /></Button>
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
            <DialogTitle>{edit ? t('etlpipelines.editPipeline') : t('etlpipelines.addPipeline')}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label className="text-xs">{t('admin.name')}</Label>
              <Input name="name" defaultValue={edit?.name ?? ''} className="h-8 text-xs" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('etlpipelines.source')}</Label>
                <Input name="source" defaultValue={edit?.source ?? ''} className="h-8 text-xs" placeholder="oss, crm, ..." />
              </div>
              <div>
                <Label className="text-xs">{t('etlpipelines.destination')}</Label>
                <Input name="target" defaultValue={edit?.target ?? ''} className="h-8 text-xs" placeholder="database, api, ..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('etlpipelines.schedule')}</Label>
                <Input name="schedule" defaultValue={edit?.schedule ?? '*/15 * * * *'} className="h-8 text-xs font-mono" placeholder="*/15 * * * *" />
              </div>
              <div>
                <Label className="text-xs">{t('etlpipelines.retryMax')}</Label>
                <Input name="retryMaxAttempts" type="number" min="1" max="10" defaultValue={edit?.retryMaxAttempts ?? 3} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">{t('admin.description')}</Label>
              <Textarea name="description" defaultValue={edit?.description ?? ''} className="text-xs min-h-[60px]" />
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
            <AlertDialogDescription>{t('etlpipelines.deleteDesc')}</AlertDialogDescription>
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
