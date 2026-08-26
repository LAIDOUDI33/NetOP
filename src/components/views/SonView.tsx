'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Cpu,
  Zap,
  Activity,
  ArrowRightLeft,
  RotateCcw,
  Play,
  Filter,
  RefreshCw,
  XCircle,
  ArrowRight,
  Radio,
  Settings2,
  ShieldCheck,
  Gauge,
  Layers,
  Network,
} from 'lucide-react';
import { useAppStore } from '@/store/app';
import { TECH_COLORS } from '@/lib/constants';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';
import type {
  Technology,
  SonModuleMode,
  SonActionStatus,
  SonActionType,
  SonModuleItem,
  SonActionItem,
  NeighborRelationItem,
  NeighborRelationType,
  NeighborHoType,
  NeighborStatus,
} from '@/types';

// ─── Constants ───────────────────────────────────────────────────────

const TECH_OPTIONS: Array<Technology | 'ALL'> = ['ALL', '2G', '3G', '4G', '5G'];

const MODE_OPTIONS: Array<SonModuleMode | 'ALL'> = [
  'ALL',
  'open-loop',
  'semi-automated',
  'closed-loop',
];

const MODE_BADGE_CONFIG: Record<
  SonModuleMode,
  { label: string; className: string }
> = {
  'open-loop': {
    label: 'son.mode.openLoop',
    className:
      'border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-950/40',
  },
  'semi-automated': {
    label: 'son.mode.semiAutomated',
    className:
      'border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:bg-amber-950/40',
  },
  'closed-loop': {
    label: 'son.mode.closedLoop',
    className:
      'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-950/40',
  },
};

const ACTION_STATUS_BADGE: Record<
  SonActionStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'son.status.pending',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  applied: {
    label: 'son.status.applied',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  failed: {
    label: 'son.status.failed',
    className:
      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  rolled_back: {
    label: 'son.status.rolledBack',
    className:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
};

const ACTION_TYPE_LABEL: Record<SonActionType, string> = {
  add_neighbor: 'son.actionType.addNeighbor',
  remove_neighbor: 'son.actionType.removeNeighbor',
  modify_pci: 'son.actionType.modifyPci',
  adjust_tilt: 'son.actionType.adjustTilt',
  adjust_power: 'son.actionType.adjustPower',
  compensate_outage: 'son.actionType.compensateOutage',
  correct_config: 'son.actionType.correctConfig',
};

const ACTION_TYPE_ICON: Record<SonActionType, React.ReactNode> = {
  add_neighbor: <Network className="h-3.5 w-3.5" />,
  remove_neighbor: <XCircle className="h-3.5 w-3.5" />,
  modify_pci: <Settings2 className="h-3.5 w-3.5" />,
  adjust_tilt: <Radio className="h-3.5 w-3.5" />,
  adjust_power: <Zap className="h-3.5 w-3.5" />,
  compensate_outage: <ShieldCheck className="h-3.5 w-3.5" />,
  correct_config: <Settings2 className="h-3.5 w-3.5" />,
};

const RELATION_TYPE_LABEL: Record<NeighborRelationType, string> = {
  intra_freq: 'son.relation.intraFreq',
  inter_freq: 'son.relation.interFreq',
  inter_tech: 'son.relation.interTech',
};

const HO_TYPE_LABEL: Record<NeighborHoType, string> = {
  manual: 'son.hoType.manual',
  anr_auto: 'son.hoType.anrAuto',
  pnp_auto: 'son.hoType.pnpAuto',
};

const NEIGHBOR_STATUS_BADGE: Record<
  NeighborStatus,
  { className: string }
> = {
  active: {
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  removed: {
    className:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
  blacklisted: {
    className:
      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

// ─── Component ───────────────────────────────────────────────────────

export default function SonView() {
  const t = useT();
  const queryClient = useQueryClient();
  const selectedTechnology = useAppStore((s) => s.selectedTechnology);
  const [modeFilter, setModeFilter] = useState<SonModuleMode | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState('actions');


  // ─── Queries ──────────────────────────────────────────────────────
  // Note: SON modules use compound technology (e.g. "4G,5G"), so we
  // fetch all modules without technology filter.

  const {
    data: modulesData,
    isLoading: modulesLoading,
  } = useQuery<{ modules: SonModuleItem[] }>({
    queryKey: ['son-modules'],
    queryFn: () => fetch('/api/son').then((r) => { if (!r.ok) throw new Error('SON API error: ' + r.status); return r.json(); }),
    refetchInterval: 15000,
  });

  const {
    data: actionsData,
    isLoading: actionsLoading,
  } = useQuery<{ actions: SonActionItem[]; pagination?: Record<string, unknown> }>({
    queryKey: ['son-actions'],
    queryFn: () =>
      fetch('/api/son/actions?limit=50').then((r) => { if (!r.ok) throw new Error('SON Actions API error: ' + r.status); return r.json(); }),
    refetchInterval: 15000,
  });

  const {
    data: neighborsData,
    isLoading: neighborsLoading,
  } = useQuery<{ neighbors: NeighborRelationItem[] }>({
    queryKey: ['son-neighbors'],
    queryFn: () =>
      fetch('/api/son/neighbors').then((r) => { if (!r.ok) throw new Error('SON Neighbors API error: ' + r.status); return r.json(); }),
    refetchInterval: 15000,
  });

  // ─── Mutations ────────────────────────────────────────────────────

  const moduleMutation = useMutation({
    mutationFn: (body: {
      moduleId: string;
      action: 'toggle' | 'execute' | 'rollback';
    }) =>
      fetch('/api/son', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: (_data, variables) => {
      const actionLabel =
        variables.action === 'toggle'
          ? t('son.toggled')
          : variables.action === 'execute'
          ? t('son.executed')
          : t('son.rolledBack');
      toast.success(t('son.moduleToggled', { action: actionLabel }));
      queryClient.invalidateQueries({ queryKey: ['son-modules'] });
      queryClient.invalidateQueries({ queryKey: ['son-actions'] });
    },
    onError: (error: unknown, variables: { moduleId: string; action: string }) => {
      const err = error instanceof Error ? error : (typeof error === 'object' && error !== null ? error as Record<string, unknown> : {});
      toast.error((err.error as string) || t('son.failedToAction', { action: (err.action as string) || variables.action }));
    },
  });

  const rollbackActionMutation = useMutation({
    mutationFn: (actionId: string) =>
      fetch('/api/son/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, action: 'rollback' }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      toast.success(t('son.actionRolledBack'));
      queryClient.invalidateQueries({ queryKey: ['son-actions'] });
      queryClient.invalidateQueries({ queryKey: ['son-modules'] });
    },
    onError: (error: unknown) => {
      const err = error instanceof Error ? error : (typeof error === 'object' && error !== null ? error as Record<string, unknown> : {});
      toast.error((err.error as string) || t('son.failedToRollback'));
    },
  });

  // ─── Derived Data ─────────────────────────────────────────────────

  const modules = modulesData?.modules ?? [];

  const filteredModules = useMemo(() => {
    if (modeFilter === 'ALL') return modules;
    return modules.filter((m) => m.mode === modeFilter);
  }, [modules, modeFilter]);

  const stats = useMemo(() => {
    const totalModules = modules.length;
    const activeModules = modules.filter((m) => m.enabled).length;
    const totalActions = modules.reduce(
      (sum, m) => sum + (m.actionCount ?? 0),
      0
    );
    const allImpactScores = (actionsData?.actions ?? [])
      .map((a) => a.impactScore)
      .filter((s): s is number => s !== null && s !== undefined);
    const avgImpact =
      allImpactScores.length > 0
        ? allImpactScores.reduce((a, b) => a + b, 0) / allImpactScores.length
        : 0;

    return { totalModules, activeModules, totalActions, avgImpact };
  }, [modules, actionsData]);

  const actions = actionsData?.actions ?? [];
  const neighbors = neighborsData?.neighbors ?? [];

  // ─── Handlers ─────────────────────────────────────────────────────

  const handleToggleModule = (moduleId: string) => {
    moduleMutation.mutate({ moduleId, action: 'toggle' });
  };

  const handleExecuteModule = (moduleId: string, displayName: string) => {
    moduleMutation.mutate(
      { moduleId, action: 'execute' },
      {
        onSuccess: () => {
          toast.success(t('son.moduleExecuted', { name: displayName }));
          queryClient.invalidateQueries({ queryKey: ['son-modules'] });
          queryClient.invalidateQueries({ queryKey: ['son-actions'] });
        },
      }
    );
  };

  const handleRollbackAction = (actionId: string) => {
    rollbackActionMutation.mutate(actionId);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['son-modules'] });
    queryClient.invalidateQueries({ queryKey: ['son-actions'] });
    queryClient.invalidateQueries({ queryKey: ['son-neighbors'] });
    toast.success(t('toast.dataRefreshed'));
  };

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('title.sonAutomation', { defaultValue: 'SON Automation' })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('son.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedTechnology}
              onValueChange={(v) =>
                useAppStore.getState().setSelectedTechnology(v as Technology)
              }
            >
              <SelectTrigger size="sm" className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TECH_OPTIONS.map((tech) => (
                  <SelectItem key={tech} value={tech}>
                    {tech}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select
            value={modeFilter}
            onValueChange={(v) =>
              setModeFilter(v as SonModuleMode | 'ALL')
            }
          >
            <SelectTrigger size="sm" className="w-[170px]">
              <SelectValue placeholder={t('son.mode')} />
            </SelectTrigger>
            <SelectContent>
              {MODE_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m === 'ALL'
                    ? t('filter.allModes')
                    : t(MODE_BADGE_CONFIG[m as SonModuleMode].label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            {t('btn.refresh')}
          </Button>
        </div>
      </div>

      {/* ─── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t('son.totalModules')}
          value={stats.totalModules}
          icon={<Layers className="h-5 w-5" />}
          iconColor="text-slate-500"
          iconBg="bg-slate-500/10"
          loading={modulesLoading}
        />
        <StatsCard
          title={t('son.activeModules')}
          value={stats.activeModules}
          subtitle={t('son.ofTotal', { n: stats.totalModules })}
          icon={<Zap className="h-5 w-5" />}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          loading={modulesLoading}
        />
        <StatsCard
          title={t('son.totalActions')}
          value={stats.totalActions}
          icon={<Activity className="h-5 w-5" />}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
          loading={actionsLoading}
        />
        <StatsCard
          title={t('son.avgImpact')}
          value={stats.avgImpact}
          isDecimal
          icon={<Gauge className="h-5 w-5" />}
          iconColor="text-cyan-500"
          iconBg="bg-cyan-500/10"
          loading={actionsLoading}
        />
      </div>

      {/* ─── Module Cards Grid ────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t('son.modules')}</h2>
        {modulesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : filteredModules.length === 0 ? (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center text-center gap-2">
              <Cpu className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {t('son.noModules')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((mod) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                onToggle={handleToggleModule}
                onExecute={handleExecuteModule}
                isMutating={moduleMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Tabs: Actions & Neighbors ────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {t('son.actionHistory')}
            {!actionsLoading && actions.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 px-1.5 text-[10px] font-mono"
              >
                {actions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="neighbors" className="flex items-center gap-2">
            <Network className="h-3.5 w-3.5" />
            {t('son.neighborRelations')}
            {!neighborsLoading && neighbors.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 px-1.5 text-[10px] font-mono"
              >
                {neighbors.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Action History Tab ──────────────────────────────────── */}
        <TabsContent value="actions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                {t('son.recentActions')}
              </CardTitle>
              <ExportButton data={actions} filenamePrefix="son" columns={[{ key: 'createdAt', header: t('th.time') }, { key: 'moduleName', header: t('th.module') }, { key: 'siteName', header: t('th.site') }, { key: 'actionType', header: t('th.actionType') }, { key: 'parameter', header: t('th.parameter') }, { key: 'oldValue', header: t('th.oldValue') }, { key: 'newValue', header: t('th.newValue') }, { key: 'status', header: t('th.status') }]} />
            </CardHeader>
            <CardContent className="p-0">
              {actionsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : actions.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {t('son.noActions')}
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[150px] text-xs">{t('son.time')}</TableHead>
                        <TableHead className="text-xs">{t('son.module')}</TableHead>
                        <TableHead className="text-xs">{t('son.site')}</TableHead>
                        <TableHead className="text-xs">{t('son.actionType')}</TableHead>
                        <TableHead className="text-xs">{t('son.parameter')}</TableHead>
                        <TableHead className="text-xs">{t('son.change')}</TableHead>
                        <TableHead className="text-xs">{t('th.status')}</TableHead>
                        <TableHead className="text-xs text-right">{t('son.impact')}</TableHead>
                        <TableHead className="text-xs text-right w-[80px]">
                          {t('th.rollback')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actions.map((action) => {
                        const statusCfg =
                          ACTION_STATUS_BADGE[action.status];
                        return (
                          <TableRow key={action.id}>
                            <TableCell className="text-xs text-muted-foreground py-3">
                              {formatTime(action.createdAt)}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="text-xs font-medium">
                                {action.moduleDisplayName ||
                                  action.moduleName}
                              </div>
                              <Badge
                                className="text-[9px] px-1 py-0 mt-0.5"
                                style={{
                                  backgroundColor: TECH_COLORS[action.technology as Technology] ?? '#94A3B8',
                                  color: '#fff',
                                }}
                              >
                                {action.technology}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs py-3">
                              <div className="font-medium">
                                {action.siteName || '—'}
                              </div>
                              {action.siteCode && (
                                <div className="text-[10px] text-muted-foreground">
                                  {action.siteCode}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1.5 text-xs">
                                {ACTION_TYPE_ICON[action.actionType]}
                                <span>
                                  {t(ACTION_TYPE_LABEL[action.actionType])}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono py-3">
                              {action.parameter}
                            </TableCell>
                            <TableCell className="text-xs py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-red-600 dark:text-red-400 line-through">
                                  {action.previousValue}
                                </span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  {action.newValue}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge
                                className={`text-[10px] px-1.5 py-0 ${statusCfg.className}`}
                              >
                                {t(statusCfg.label)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right py-3">
                              {action.impactScore !== null &&
                              action.impactScore !== undefined ? (
                                <span
                                  className={
                                    action.impactScore >= 0.7
                                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                      : action.impactScore >= 0.4
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }
                                >
                                  {(action.impactScore * 100).toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              {action.status === 'applied' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                  onClick={() =>
                                    handleRollbackAction(action.id)
                                  }
                                  disabled={
                                    rollbackActionMutation.isPending
                                  }
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Rollback
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Neighbor Relations Tab ──────────────────────────────── */}
        <TabsContent value="neighbors" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                {t('son.neighborRelations')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {neighborsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : neighbors.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {t('son.noNeighbors')}
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">{t('son.servingCell')}</TableHead>
                        <TableHead className="text-xs">{t('son.neighborCell')}</TableHead>
                        <TableHead className="text-xs">{t('th.technology')}</TableHead>
                        <TableHead className="text-xs">
                          {t('son.relationType')}
                        </TableHead>
                        <TableHead className="text-xs">{t('son.hoType')}</TableHead>
                        <TableHead className="text-xs text-right">
                          {t('son.hoSuccessRate')}
                        </TableHead>
                        <TableHead className="text-xs">{t('th.status')}</TableHead>
                        <TableHead className="text-xs text-right">
                          {t('son.lastUpdated')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {neighbors.map((nbr) => {
                        const statusCfg = NEIGHBOR_STATUS_BADGE[nbr.status];
                        return (
                          <TableRow key={nbr.id}>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor:
                                      TECH_COLORS[
                                        nbr.servingCell.technology as Technology
                                      ] ?? '#94A3B8',
                                  }}
                                />
                                <div>
                                  <div className="text-xs font-medium">
                                    {nbr.servingCell.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {nbr.servingCell.code} &middot;{' '}
                                    {nbr.servingCell.region}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2">
                                <ArrowRightLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                                <div>
                                  <div className="text-xs font-medium">
                                    {nbr.neighborCellName}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {nbr.neighborCellCode}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge
                                className="text-[9px] px-1.5 py-0"
                                style={{
                                  backgroundColor:
                                    TECH_COLORS[nbr.technology as Technology] ?? '#94A3B8',
                                  color: '#fff',
                                }}
                              >
                                {nbr.technology}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs py-3">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {t(RELATION_TYPE_LABEL[nbr.relationType])}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs py-3">
                              <span className="text-muted-foreground">
                                {t(HO_TYPE_LABEL[nbr.hoType])}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-right py-3">
                              {nbr.hoSuccessRate !== null &&
                              nbr.hoSuccessRate !== undefined ? (
                                <span
                                  className={
                                    nbr.hoSuccessRate >= 95
                                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                      : nbr.hoSuccessRate >= 85
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }
                                >
                                  {nbr.hoSuccessRate.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge
                                className={`text-[10px] px-1.5 py-0 capitalize ${statusCfg.className}`}
                              >
                                {nbr.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground text-right py-3">
                              {formatTime(nbr.lastUpdated)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────

interface StatsCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  isDecimal?: boolean;
  loading?: boolean;
}

function StatsCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  iconBg,
  isDecimal = false,
  loading = false,
}: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold tracking-tight">
                  {isDecimal ? (value ?? 0).toFixed(1) : value.toLocaleString()}
                  {isDecimal && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      %
                    </span>
                  )}
                </p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </>
            )}
          </div>
          <div
            className={`flex items-center justify-center h-10 w-10 rounded-lg ${iconBg} ${iconColor}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────

interface ModuleCardProps {
  module: SonModuleItem;
  onToggle: (_moduleId: string) => void;
  onExecute: (_moduleId: string, _displayName: string) => void;
  isMutating: boolean;
}

function ModuleCard({ module, onToggle, onExecute, isMutating }: ModuleCardProps) {
  const t = useT();
  const modeCfg = MODE_BADGE_CONFIG[module.mode];
  const successRate = module.stats?.successRate;
  const totalActions = module.stats?.totalActions ?? module.actionCount ?? 0;
  const failCount = module.stats?.failCount ?? 0;

  return (
    <Card
      className={`relative overflow-hidden transition-all hover:shadow-md ${
        !module.enabled ? 'opacity-70' : ''
      }`}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          backgroundColor: TECH_COLORS[module.technology as Technology] ?? '#94A3B8',
        }}
      />
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-semibold truncate">
                {module.displayName}
              </CardTitle>
              <Badge
                className="text-[9px] px-1.5 py-0 shrink-0"
                style={{
                  backgroundColor: TECH_COLORS[module.technology as Technology] ?? '#94A3B8',
                  color: '#fff',
                }}
              >
                {module.technology}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              {module.name}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${modeCfg.className}`}
            >
              {t(modeCfg.label)}
            </Badge>
            <Switch
              checked={module.enabled}
              onCheckedChange={() => onToggle(module.id)}
              disabled={isMutating}
              aria-label={`Toggle ${module.displayName}`}
            />
          </div>
        </div>
        {module.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {module.description}
          </p>
        )}
      </CardHeader>
      <Separator />
      <CardContent className="p-4 space-y-3">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold">{totalActions}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t('son.actions')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">
              {successRate !== undefined
                ? `${successRate.toFixed(0)}%`
                : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t('son.success')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-500">{failCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t('son.failed')}
            </p>
          </div>
        </div>

        {/* Recent Actions */}
        {module.recentActions && module.recentActions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('son.recentActions')}
              </p>
              {module.recentActions.slice(0, 3).map((action) => {
                const statusCfg = ACTION_STATUS_BADGE[action.status];
                return (
                  <div
                    key={action.id}
                    className="flex items-center justify-between gap-2 py-1"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {ACTION_TYPE_ICON[action.actionType]}
                      <span className="text-[11px] truncate">
                        {action.siteName
                          ? `${t(ACTION_TYPE_LABEL[action.actionType])} on ${action.siteName}`
                          : t(ACTION_TYPE_LABEL[action.actionType])}
                      </span>
                    </div>
                    <Badge
                      className={`text-[9px] px-1 py-0 shrink-0 ${statusCfg.className}`}
                    >
                      {t(statusCfg.label)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Execute Button */}
        <Button
          size="sm"
          className="w-full h-8 text-xs"
          disabled={!module.enabled || isMutating}
          onClick={() => onExecute(module.id, module.displayName)}
        >
          <Play className="h-3 w-3 mr-1.5" />
          {t('son.executeModule')}
        </Button>
      </CardContent>
    </Card>
  );
}