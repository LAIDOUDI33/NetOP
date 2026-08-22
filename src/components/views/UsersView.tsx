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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Power, Search, UserPlus, Mail, Building, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('API error: ' + r.status); return r.json(); });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-DZ');
const fmtDateTime = (d: string) => new Date(d).toLocaleString('fr-DZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function SkeletonRows(n = 5) {
  return <div className="space-y-3">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
}

export default function UsersView() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetcher('/api/settings/users'),
  });
  const users = data?.users ?? [];

  const filtered = users.filter((u: any) => {
    const matchSearch = `${u.name} ${u.email} ${u.department ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' && u.isActive !== false) || (statusFilter === 'inactive' && u.isActive === false);
    return matchSearch && matchStatus;
  });

  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles-list'],
    queryFn: () => fetcher('/api/settings/roles'),
  });
  const allRoles = rolesData?.roles ?? [];

  const save = useMutation({
    mutationFn: (body: any) => fetch('/api/settings/users', {
      method: edit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    onSuccess: () => { toast.success(edit ? t('toast.saved') : t('users.userCreated')); qc.invalidateQueries({ queryKey: ['admin-users'] }); setOpen(false); setEdit(null); },
    onError: () => toast.error(edit ? t('toast.saveFailed') : t('toast.error')),
  });

  const toggle = useMutation({
    mutationFn: (u: any) => fetch('/api/settings/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, isActive: !u.isActive }),
    }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { toast.success(t('toast.saved')); qc.invalidateQueries({ queryKey: ['admin-users'] }); setDeactivateId(null); },
    onError: () => toast.error(t('toast.error')),
  });

  const openEdit = useCallback((u: any) => { setEdit(u); setOpen(true); }, []);
  const openAdd = useCallback(() => { setEdit(null); setOpen(true); }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      name: fd.get('name'),
      email: fd.get('email'),
      department: fd.get('department') || undefined,
      phone: fd.get('phone') || undefined,
      roleNames: fd.getAll('roles'),
    };
    if (!edit) payload.password = fd.get('password');
    if (edit) payload.id = edit.id;
    save.mutate(payload);
  };

  const statusVariant = (s: string) => s === 'active' ? 'default' : 'outline';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">{t('users.title')}</CardTitle>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.search')} className="h-8 text-xs pl-8 w-44" />
              </div>
              <div className="flex gap-1">
                {(['all', 'active', 'inactive'] as const).map(s => (
                  <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} className="h-7 text-[10px] px-2" onClick={() => setStatusFilter(s)}>
                    {s === 'all' ? t('admin.allStatus') : s === 'active' ? t('admin.active') : t('admin.inactive')}
                  </Button>
                ))}
              </div>
              <Button size="sm" className="h-8 text-xs" onClick={openAdd}>
                <UserPlus className="h-3 w-3 mr-1" />{t('users.addUser')}
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
                      <TableHead className="text-xs">{t('admin.email')}</TableHead>
                      <TableHead className="text-xs">{t('admin.department')}</TableHead>
                      <TableHead className="text-xs">{t('admin.roles')}</TableHead>
                      <TableHead className="text-xs">{t('admin.status')}</TableHead>
                      <TableHead className="text-xs">{t('users.lastLogin')}</TableHead>
                      <TableHead className="text-xs">{t('admin.createdBy')}</TableHead>
                      <TableHead className="text-xs">{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs font-medium">{u.name ?? '—'}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-muted-foreground" />{u.email}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5"><Building className="h-3 w-3 text-muted-foreground" />{u.department ?? '—'}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-wrap gap-1">
                            {(u.roles ?? []).length > 0
                              ? (u.roles as string[]).map((r: any) => <Badge key={typeof r === 'string' ? r : r.id} variant="secondary" className="text-[10px] px-1.5 py-0">{typeof r === 'string' ? r : r.name}</Badge>)
                              : <span className="text-muted-foreground text-[10px]">{t('admin.noRoles')}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={u.isActive !== false ? 'default' : 'outline'} className="text-[10px]">
                            {u.isActive !== false ? t('admin.active') : t('admin.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {u.updatedAt ? fmtDateTime(u.updatedAt) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(u.createdAt)}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(u)} title={t('admin.edit')}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDeactivateId(u.id)} title={t('admin.confirmToggle')}><Power className="h-3 w-3" /></Button>
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

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEdit(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{edit ? t('users.editUser') : t('users.addUser')}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('admin.name')}</Label>
                <Input name="name" defaultValue={edit?.name ?? ''} className="h-8 text-xs" required />
              </div>
              <div>
                <Label className="text-xs">{t('admin.email')}</Label>
                <Input name="email" type="email" defaultValue={edit?.email ?? ''} className="h-8 text-xs" required />
              </div>
              <div>
                <Label className="text-xs">{t('admin.password')}</Label>
                <Input name="password" type="password" className="h-8 text-xs" placeholder={edit ? '••••••••' : ''} required={!edit} />
              </div>
              <div>
                <Label className="text-xs">{t('admin.department')}</Label>
                <Input name="department" defaultValue={edit?.department ?? ''} className="h-8 text-xs" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t('admin.phone')}</Label>
                <Input name="phone" defaultValue={edit?.phone ?? ''} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">{t('admin.roles')}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {allRoles.map((r: any) => (
                  <label key={r.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      name="roles"
                      value={r.name}
                      defaultChecked={edit?.roles?.includes(r.name)}
                    />
                    <span>{r.displayName ?? r.name}</span>
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

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateId} onOpenChange={o => { if (!o) setDeactivateId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.confirmToggleTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.confirmToggle')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const u = users.find((u: any) => u.id === deactivateId);
              if (u) toggle.mutate(u);
            }}>{t('admin.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
