'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  RefreshCw,
  Shield,
  Calendar,
} from 'lucide-react';
import type {
  PolicyItem,
  PolicyExecutionItem,
  PolicyTriggerType,
  PolicyScope,
  PolicyExecutionStatus,
  Technology,
} from '@/types';
import { useAppStore } from '@/store/app';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';
import { toast } from 'sonner';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const TECH_COLORS: Record<string, string> = {
  '2G': '#94A3B8',
  '3G': '#06B6D4',
  '4G': '#10B981',
  '5G': '#F59E0B',
};

const TRIGGER_CONFIG: Record<PolicyTriggerType, { label: string; color: string; bgClass: string; icon: typeof Zap }> = {
  kpi_breach: { label: 'KPI Breach', color: 'text-red-600 dark:text-red-400', bgClass: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300', icon: AlertTriangle },
  anomaly_detected: { label: 'Anomaly', color: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300', icon: Activity },
  schedule: { label: 'Schedule', color: 'text-sky-600 dark:text-sky-400', bgClass: 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300', icon: Calendar },
  manual: { label: 'Manual', color: 'text-slate-600 dark:text-slate-400', bgClass: 'bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300', icon: Target },
};

const STATUS_CONFIG: Record<PolicyExecutionStatus, { label: string; color: string; bgClass: string; icon: typeof CheckCircle }> = {
  completed: { label: 'Completed', color: 'text-emerald-600', bgClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300', icon: CheckCircle },
  running: { label: 'Running', color: 'text-sky-600', bgClass: 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300', icon: RefreshCw },
  triggered: { label: 'Triggered', color: 'text-amber-600', bgClass: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300', icon: Zap },
  failed: { label: 'Failed', color: 'text-red-600', bgClass: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300', icon: XCircle },
  rolled_back: { label: 'Rolled Back', color: 'text-slate-600', bgClass: 'bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300', icon: RotateCcw },
};

// SCOPE_LABELS moved to component-level to support i18n
const SCOPE_KEYS: Record<PolicyScope, string> = {
  all: 'pol.allSites',
  region: 'pol.region',
  site: 'son.site',
  cluster: 'pol.cluster',
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatTime(ts: string | null | undefined): string {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function getTechBadgeClass(tech: string): string {
  const map: Record<string, string> = {
    '2G': 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    '3G': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    '4G': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    '5G': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  };
  return map[tech] ?? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string;
  value: string | number;
  icon: typeof Shield;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`rounded-lg p-2.5 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const TRIGGER_LABEL_KEYS: Record<PolicyTriggerType, string> = {
  kpi_breach: 'pol.kpiBreach',
  anomaly_detected: 'pol.anomaly',
  schedule: 'pol.schedule',
  manual: 'pol.manual',
};

const STATUS_LABEL_KEYS: Record<PolicyExecutionStatus, string> = {
  completed: 'status.completed',
  running: 'status.running',
  triggered: 'status.triggered',
  failed: 'status.failed',
  rolled_back: 'status.rolledBack',
};

function TriggerTypeBadge({ type }: { type: PolicyTriggerType }) {
  const t = useT();
  const cfg = TRIGGER_CONFIG[type];
  const Icon = cfg.icon;
  const label = t(TRIGGER_LABEL_KEYS[type] ?? 'pol.manual');
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${cfg.bgClass} gap-1 text-xs font-medium`}>
            <Icon className="h-3 w-3" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('pol.triggerLabel', { name: label })}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StatusBadge({ status }: { status: PolicyExecutionStatus }) {
  const t = useT();
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.bgClass} gap-1 text-xs font-medium`}>
      <Icon className="h-3 w-3" />
      {t(STATUS_LABEL_KEYS[status] ?? 'status.unknown')}
    </Badge>
  );
}

function PolicyCard({
  policy,
  onToggle,
  onTrigger,
  isMutating,
}: {
  policy: PolicyItem;
  onToggle: (id: string) => void;
  onTrigger: (id: string) => void;
  isMutating: boolean;
}) {
  const t = useT();
  const [expandedSites, setExpandedSites] = useState(false);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-semibold leading-tight truncate">
                {policy.name}
              </CardTitle>
              <Badge
                variant="outline"
                className={getTechBadgeClass(policy.technology)}
              >
                {policy.technology}
              </Badge>
            </div>
            {policy.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {policy.description}
              </p>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Switch
                    checked={policy.enabled}
                    disabled={isMutating}
                    onCheckedChange={() => onToggle(policy.id)}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{policy.enabled ? t('pol.disablePolicy') : t('pol.enablePolicy')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          <TriggerTypeBadge type={policy.triggerType} />
          <Badge variant="outline" className="text-xs">
            {t(SCOPE_KEYS[policy.scope] ?? 'pol.allSites')}
            {policy.scopeValue ? `: ${policy.scopeValue}` : ''}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${
              policy.priority >= 8
                ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
                : policy.priority >= 5
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                  : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'
            }`}
          >
            P{policy.priority}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  {policy.cooldownMins}m
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('pol.cooldown', { n: policy.cooldownMins })}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Action modules */}
        {policy.actionModules.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground mr-1">{t('pol.actionsLabel')}</span>
            {policy.actionModules.map((mod) => (
              <Badge key={mod} variant="secondary" className="text-[11px] px-1.5 py-0 font-normal">
                {mod}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* Execution stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold">{policy.executionStats.totalRuns}</p>
            <p className="text-[11px] text-muted-foreground">{t('pol.totalRuns')}</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${policy.executionStats.successRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : policy.executionStats.successRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
              {policy.executionStats.successRate}%
            </p>
            <p className="text-[11px] text-muted-foreground">{t('pol.successRate')}</p>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight mt-0.5">
              {formatTime(policy.executionStats.lastRun)}
            </p>
            <p className="text-[11px] text-muted-foreground">{t('pol.lastRun')}</p>
          </div>
        </div>

        {/* Trigger config preview */}
        {policy.triggerConfig && Object.keys(policy.triggerConfig).length > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t('pol.triggerConfig')}</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(policy.triggerConfig).map(([key, val]) => (
                  <Badge key={key} variant="outline" className="text-[11px] px-1.5 py-0 font-normal">
                    {key}: {String(val)}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Recent executions */}
        {policy.recentExecutions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('pol.recentExec')}</p>
              <div className="space-y-1.5">
                {policy.recentExecutions.slice(0, 3).map((exec) => {
                  const cfg = STATUS_CONFIG[exec.status];
                  const ExecIcon = cfg.icon;
                  return (
                    <div
                      key={exec.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ExecIcon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />
                        <span className="truncate">{exec.triggerReason || exec.status}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0">
                        {formatDuration(exec.durationMs)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Trigger button */}
        <div className="mt-auto pt-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                disabled={isMutating || !policy.enabled}
              >
                <Play className="h-3.5 w-3.5" />
                {t('pol.triggerNow')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('pol.triggerPolicy', { name: policy.name })}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {t('pol.triggerConfirm', { name: policy.name })}
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    // Close dialog by finding the closest dialog element
                    const dialog = (e.target as HTMLElement).closest('[data-state]');
                    if (dialog) {
                      const closeBtn = dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');
                      closeBtn?.click();
                    }
                  }}
                >
                  {t('pol.cancel')}
                </Button>
                <Button
                  onClick={() => {
                    onTrigger(policy.id);
                    // Close dialog
                    const dialogEl = document.querySelector('[role="dialog"][data-state="open"]');
                    if (dialogEl) {
                      const closeBtn = dialogEl.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');
                      closeBtn?.click();
                    }
                  }}
                  disabled={isMutating}
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {t('pol.execute')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function ExecutionRow({ execution }: { execution: PolicyExecutionItem }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  const kpiImpactEntries = execution.kpiImpact
    ? Object.entries(execution.kpiImpact)
    : [];

  return (
    <TableRow className="group">
      {/* Time */}
      <TableCell className="whitespace-nowrap text-xs">
        {formatTime(execution.createdAt)}
      </TableCell>

      {/* Policy Name */}
      <TableCell className="font-medium text-sm">{execution.policyName ?? '—'}</TableCell>

      {/* Technology */}
      <TableCell>
        <Badge variant="outline" className={getTechBadgeClass(execution.policyTechnology ?? '')}>
          {execution.policyTechnology ?? '—'}
        </Badge>
      </TableCell>

      {/* Trigger */}
      <TableCell>
        {execution.policyTriggerType && (
          <TriggerTypeBadge type={execution.policyTriggerType as PolicyTriggerType} />
        )}
      </TableCell>

      {/* Status */}
      <TableCell>
        <StatusBadge status={execution.status} />
      </TableCell>

      {/* Sites Affected */}
      <TableCell>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs hover:underline cursor-pointer"
        >
          <Badge variant="secondary" className="text-xs">
            {execution.affectedSites.length} site{execution.affectedSites.length !== 1 ? 's' : ''}
          </Badge>
        </button>
        {expanded && execution.affectedSites.length > 0 && (
          <div className="mt-1.5 rounded-md bg-muted/50 p-2 max-w-[200px]">
            <ScrollArea className="max-h-24">
              <div className="space-y-0.5">
                {execution.affectedSites.map((site) => (
                  <p key={site} className="text-[11px] text-muted-foreground truncate">
                    {site}
                  </p>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </TableCell>

      {/* Actions Taken */}
      <TableCell>
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {execution.actionsTaken.slice(0, 2).map((action) => (
            <Badge key={action} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {action}
            </Badge>
          ))}
          {execution.actionsTaken.length > 2 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 cursor-default">
                    +{execution.actionsTaken.length - 2}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]">
                  <div className="space-y-1">
                    {execution.actionsTaken.slice(2).map((action) => (
                      <p key={action} className="text-xs">{action}</p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>

      {/* Duration */}
      <TableCell className="whitespace-nowrap text-xs">
        {formatDuration(execution.durationMs)}
      </TableCell>

      {/* KPI Impact */}
      <TableCell>
        {kpiImpactEntries.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`text-xs gap-1 cursor-default ${
                    kpiImpactEntries.some(([, v]) => Number(v) > 0)
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : kpiImpactEntries.some(([, v]) => Number(v) < 0)
                        ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
                        : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'
                  }`}
                >
                  <Activity className="h-3 w-3" />
                  {kpiImpactEntries.length} KPI{kpiImpactEntries.length !== 1 ? 's' : ''}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {kpiImpactEntries.map(([k, v]) => (
                    <p key={k} className="text-xs">
                      {k}: <span className={Number(v) > 0 ? 'text-emerald-500' : Number(v) < 0 ? 'text-red-500' : ''}>{String(v)}</span>
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Rollback */}
      <TableCell className="max-w-[150px]">
        {execution.status === 'rolled_back' && execution.rollbackReason ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs gap-1 bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 cursor-default">
                  <RotateCcw className="h-3 w-3" />
                  {t('status.rolledBack')}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p className="text-xs">{execution.rollbackReason}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// ──────────────────────────────────────────────
// Skeletons
// ──────────────────────────────────────────────

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PolicyCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <Skeleton className="mx-auto h-6 w-10" />
            <Skeleton className="mx-auto h-3 w-16" />
          </div>
          <div className="space-y-1">
            <Skeleton className="mx-auto h-6 w-10" />
            <Skeleton className="mx-auto h-3 w-16" />
          </div>
          <div className="space-y-1">
            <Skeleton className="mx-auto h-5 w-20" />
            <Skeleton className="mx-auto h-3 w-12" />
          </div>
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

function ExecutionTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-10 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export default function PoliciesView() {
  const t = useT();
  const queryClient = useQueryClient();
  const { selectedTechnology } = useAppStore();
  const [techFilter, setTechFilter] = useState<string>(selectedTechnology);

  // ── Queries ──

  const { data: policiesData, isLoading: policiesLoading } = useQuery<{
    policies: PolicyItem[];
  }>({
    queryKey: ['policies', techFilter],
    queryFn: () =>
      fetch(`/api/policies?technology=${techFilter}`)
        .then((r) => { if (!r.ok) throw new Error('Policies API error: ' + r.status); return r.json(); }),
    refetchInterval: 15000,
  });

  const { data: executionsData, isLoading: executionsLoading } = useQuery<{
    executions: PolicyExecutionItem[];
  }>({
    queryKey: ['policy-executions', techFilter],
    queryFn: () =>
      fetch(`/api/policies/executions?technology=${techFilter}`)
        .then((r) => { if (!r.ok) throw new Error('Policies API error: ' + r.status); return r.json(); }),
    refetchInterval: 15000,
  });

  // ── Mutations ──

  const patchMutation = useMutation({
    mutationFn: (body: { policyId: string; action: 'toggle' | 'trigger'; triggerReason?: string }) =>
      fetch('/api/policies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => { if (!r.ok) throw new Error('Policies API error: ' + r.status); return r.json(); }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy-executions'] });
      if (variables.action === 'toggle') {
        toast.success(t('toast.policyToggled'));
      } else {
        toast.success(t('toast.policyTriggered'));
      }
    },
    onError: () => {
      toast.error(t('toast.policyActionFailed'));
    },
  });

  const handleToggle = (id: string) => {
    patchMutation.mutate({ policyId: id, action: 'toggle' });
  };

  const handleTrigger = (id: string) => {
    patchMutation.mutate({
      policyId: id,
      action: 'trigger',
      triggerReason: t('pol.manualTrigger'),
    });
  };

  // ── Derived data ──

  const policies = policiesData?.policies ?? [];
  const executions = executionsData?.executions ?? [];

  const filteredPolicies =
    techFilter === 'all' ? policies : policies.filter((p) => p.technology === techFilter);

  const filteredExecutions =
    techFilter === 'all'
      ? executions
      : executions.filter((e) => e.policyTechnology === techFilter);

  const totalPolicies = filteredPolicies.length;
  const activePolicies = filteredPolicies.filter((p) => p.enabled).length;
  const totalExecutions = filteredExecutions.length;
  const avgSuccessRate =
    filteredPolicies.length > 0
      ? (
          filteredPolicies.reduce((sum, p) => sum + p.executionStats.successRate, 0) /
          filteredPolicies.length
        ).toFixed(1)
      : '0.0';

  const isMutating = patchMutation.isPending;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-6 w-6" />
              {t('pol.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('pol.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('pol.filterByTech')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTech')}</SelectItem>
                <SelectItem value="2G">2G</SelectItem>
                <SelectItem value="3G">3G</SelectItem>
                <SelectItem value="4G">4G</SelectItem>
                <SelectItem value="5G">5G</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['policies'] });
                queryClient.invalidateQueries({ queryKey: ['policy-executions'] });
                toast.success(t('pol.dataRefreshed'));
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <ExportButton data={filteredPolicies as unknown as Record<string, any>[]} filenamePrefix="policies" columns={[{ key: 'name', header: t('th.name') }, { key: 'category', header: t('th.category') }, { key: 'technology', header: t('th.technology') }, { key: 'enabled', header: t('th.enabled') }, { key: 'executionStats.totalRuns', header: t('pol.totalRuns') }, { key: 'executionStats.successRate', header: t('pol.successRatePct') }, { key: 'lastExecution.status', header: t('pol.lastStatus') }]} />
          </div>
        </div>

        {/* ── Stats Cards ── */}
        {policiesLoading ? (
          <StatCardsSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              title={t('pol.totalPolicies')}
              value={totalPolicies}
              icon={Shield}
              color="bg-slate-500/10 text-slate-600 dark:text-slate-400"
              sub={t('pol.acrossAllScopes')}
            />
            <StatCard
              title={t('pol.activePolicies')}
              value={activePolicies}
              icon={Play}
              color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              sub={t('pol.enabled', { n: totalPolicies > 0 ? ((activePolicies / totalPolicies) * 100).toFixed(0) : 0 })}
            />
            <StatCard
              title={t('pol.totalExecutions')}
              value={totalExecutions}
              icon={Activity}
              color="bg-sky-500/10 text-sky-600 dark:text-sky-400"
              sub={t('pol.allTime')}
            />
            <StatCard
              title={t('pol.avgSuccessRate')}
              value={`${avgSuccessRate}%`}
              icon={Target}
              color={
                Number(avgSuccessRate) >= 80
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : Number(avgSuccessRate) >= 50
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }
              sub={t('pol.acrossAllPol')}
            />
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="policies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="policies" className="gap-2">
              <Shield className="h-4 w-4" />
              {t('pol.policies')}
              {!policiesLoading && (
                <Badge variant="secondary" className="ml-1 text-[11px] px-1.5">
                  {filteredPolicies.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="executions" className="gap-2">
              <Activity className="h-4 w-4" />
              {t('pol.executionHistory')}
              {!executionsLoading && (
                <Badge variant="secondary" className="ml-1 text-[11px] px-1.5">
                  {filteredExecutions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Policies Tab ── */}
          <TabsContent value="policies" className="space-y-4">
            {policiesLoading ? (
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <PolicyCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredPolicies.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-sm font-medium text-muted-foreground">{t('pol.noPolicies')}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {techFilter !== 'all'
                      ? t('pol.noPoliciesTech', { tech: techFilter })
                      : t('pol.noPoliciesYet')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {filteredPolicies.map((policy) => (
                  <PolicyCard
                    key={policy.id}
                    policy={policy}
                    onToggle={handleToggle}
                    onTrigger={handleTrigger}
                    isMutating={isMutating}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Execution History Tab ── */}
          <TabsContent value="executions" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {executionsLoading ? (
                  <div className="p-6">
                    <ExecutionTableSkeleton />
                  </div>
                ) : filteredExecutions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Activity className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="text-sm font-medium text-muted-foreground">{t('pol.noExec')}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {techFilter !== 'all'
                        ? t('pol.noExecTech', { tech: techFilter })
                        : t('pol.noExecYet')}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">{t('th.time')}</TableHead>
                          <TableHead className="text-xs">{t('th.policyName')}</TableHead>
                          <TableHead className="text-xs">{t('th.technology')}</TableHead>
                          <TableHead className="text-xs">{t('th.trigger')}</TableHead>
                          <TableHead className="text-xs">{t('th.status')}</TableHead>
                          <TableHead className="text-xs">{t('th.sitesAffected')}</TableHead>
                          <TableHead className="text-xs">{t('th.actionsTaken')}</TableHead>
                          <TableHead className="text-xs">{t('th.duration')}</TableHead>
                          <TableHead className="text-xs">{t('pol.kpiImpact')}</TableHead>
                          <TableHead className="text-xs">{t('th.rollback')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExecutions.map((exec) => (
                          <ExecutionRow key={exec.id} execution={exec} />
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}