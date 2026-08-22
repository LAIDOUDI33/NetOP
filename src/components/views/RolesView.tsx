'use client';

import { useState, useCallback, useMemo } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Lock, Shield, Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('API error: ' + r.status); return r.json(); });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-DZ');

function SkeletonRows(n = 5) {
  return <div className="space-y-3">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
}

export default function RolesView() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => fetcher('/api/settings/roles'),
  });
  const roles = data?.roles ?? [];
  const filtered = roles.filter((r: any) => `${r.name} ${r.displayName ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  const { data: permsData } = useQuery({
    queryKey: ['admin-permissions-list'],
    queryFn: () => fetcher('/api/settings/roles'),
  });

  // Group permissions by category from role data
  const permissionCategories = useMemo(() => {
    const cats = new Map<string, Set<string>>();
    roles.forEach((r: any) => {
      if (r._permissions) {
        r._permissions.forEach((p: any) => {
          const cat = (p.category ?? 'general');
          if (!cats.has(cat)) cats.set(cat, new Set());
          cats.get(cat)!.add(p.id);
        });
      }
    });
    return cats;
  }, [roles]);

  const save = useMutation({
    mutationFn: (body: any) => fetch('/api/settings/roles', {
      method: edit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { toast.success(edit ? t('toast.saved') : t('roles.roleCreated')); qc.invalidateQueries({ queryKey: ['admin-roles'] }); setOpen(false); setEdit(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch('/api/settings/roles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.deleted')); qc.invalidateQueries({ queryKey: ['admin-roles'] }); setDelId(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      name: fd.get('name'),
      displayName: fd.get('displayName'),
      description: fd.get('description'),
      permissionIds: fd.getAll('permissions'),
    };
    if (edit) payload.id = edit.id;
    save.mutate(payload);
  };

  const delTarget = roles.find((r: any) => r.id === delId);

  // Build permissions list from all roles' permission counts (we show a summary matrix)
  const permissionModules = ['users', 'roles', 'alerts', 'sites', 'son', 'apikeys', 'webhooks', 'etl', 'reports', 'config'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">{t('roles.title')}</CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.search')} className="h-8 text-xs pl-8 w-44" />
              </div>
              <Button size="sm" className="h-8 text-xs" onClick={() => { setEdit(null); setOpen(true); }}>
                <ShieldCheck className="h-3 w-3 mr-1" />{t('roles.addRole')}
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
                      <TableHead className="text-xs">{t('admin.displayName')}</TableHead>
                      <TableHead className="text-xs">{t('admin.description')}</TableHead>
                      <TableHead className="text-xs">{t('roles.usersCount')}</TableHead>
                      <TableHead className="text-xs">{t('admin.permCount')}</TableHead>
                      <TableHead className="text-xs">{t('admin.systemRole')}</TableHead>
                      <TableHead className="text-xs">{t('roles.created')}</TableHead>
                      <TableHead className="text-xs">{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs font-medium font-mono">{r.name}</TableCell>
                        <TableCell className="text-xs">{r.displayName ?? r.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.description ?? '—'}</TableCell>
                        <TableCell className="text-xs"><Badge variant="secondary" className="text-[10px]">{r.userCount ?? 0}</Badge></TableCell>
                        <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{r.permissionCount ?? 0}</Badge></TableCell>
                        <TableCell className="text-xs">
                          {r.isSystem
                            ? <Badge variant="default" className="text-[10px] gap-1"><Lock className="h-2.5 w-2.5" />{t('admin.systemRole')}</Badge>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.createdAt)}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEdit(r); setOpen(true); }} title={t('admin.edit')}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={r.isSystem} onClick={() => setDelId(r.id)} title={t('admin.delete')}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-xs text-center py-6 text-muted-foreground">{t('admin.noData')}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Permissions Matrix Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t('roles.permMatrix')}</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? SkeletonRows(3) : (
            <ScrollArea className="max-h-[400px] overflow-y-auto">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sticky left-0 bg-background z-10">{t('admin.name')}</TableHead>
                      {permissionModules.map(m => <TableHead key={m} className="text-xs text-center font-mono text-[10px]">{m}</TableHead>)}
                      <TableHead className="text-xs text-center">{t('admin.permCount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs font-medium sticky left-0 bg-background z-10">{r.displayName ?? r.name}</TableCell>
                        {permissionModules.map(m => (
                          <TableCell key={m} className="text-xs text-center">
                            {r.permissionCount > 0 ? (
                              <Badge variant="secondary" className="text-[10px]">{Math.min(r.permissionCount, 12)}</Badge>
                            ) : <span className="text-muted-foreground">0</span>}
                          </TableCell>
                        ))}
                        <TableCell className="text-xs text-center font-medium">{r.permissionCount ?? 0}</TableCell>
                      </TableRow>
                    ))}
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
            <DialogTitle>{edit ? t('roles.editRole') : t('roles.addRole')}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('admin.name')}</Label>
                <Input name="name" defaultValue={edit?.name ?? ''} className="h-8 text-xs font-mono" required disabled={!!edit} />
              </div>
              <div>
                <Label className="text-xs">{t('admin.displayName')}</Label>
                <Input name="displayName" defaultValue={edit?.displayName ?? ''} className="h-8 text-xs" required />
              </div>
            </div>
            <div>
              <Label className="text-xs">{t('admin.description')}</Label>
              <Textarea name="description" defaultValue={edit?.description ?? ''} className="text-xs min-h-[60px]" />
            </div>
            <div>
              <Label className="text-xs">{t('roles.selectPermissions')}</Label>
              <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-1">
                {permissionModules.map(m => (
                  <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox name="permissions" value={m} defaultChecked={edit?.permissionCount > 0} />
                    <span className="font-mono text-[10px]">{m}:*</span>
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
            <AlertDialogDescription>{delTarget?.isSystem ? t('admin.cannotDeleteSystem') : t('admin.confirmDelete')}</AlertDialogDescription>
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
