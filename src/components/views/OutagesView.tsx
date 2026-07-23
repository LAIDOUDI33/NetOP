'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PowerOff, Frown, Users, Clock, CheckCircle2, AlertTriangle, Zap,
} from 'lucide-react';
import { TECH_BG_CLASSES, formatNumber, TECHNOLOGIES } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

type OutageSeverity = 'critical' | 'high' | 'medium' | 'low';
type OutageStatus = 'active' | 'compensating' | 'restored' | 'resolved';
type OutageType = 'full' | 'partial' | 'degradation';

interface OutageItem {
  id: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  technology: Technology;
  region: string;
  outageType: OutageType;
  severity: OutageSeverity;
  status: OutageStatus;
  startedAt: string;
  detectedAt: string;
  estimatedDuration: number | null;
  actualDuration: number | null;
  affectedUsers: number;
  rootCause: string | null;
  compensationApplied: string;
  compensationSites: string[];
  resolvedAt: string | null;
  createdAt: string;
}

interface OutagesSummary {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byOutageType: Record<string, number>;
  activeOutages: number;
  totalAffectedUsers: number;
  avgDuration: number;
}

interface OutagesResponse {
  outages: OutageItem[];
  summary: OutagesSummary;
}

// ─── Color Maps ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<OutageStatus, string> = {
  active: '#EF4444',
  compensating: '#F59E0B',
  restored: '#10B981',
  resolved: '#64748B',
};

const STATUS_LABELS: Record<OutageStatus, string> = {
  active: 'Active',
  compensating: 'Compensating',
  restored: 'Restored',
  resolved: 'Resolved',
};

const STATUS_BADGE_CLASSES: Record<OutageStatus, string> = {
  active: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  compensating: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  restored: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  resolved: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

const OUTAGE_TYPE_COLORS: Record<OutageType, string> = {
  full: '#EF4444',
  partial: '#F59E0B',
  degradation: '#F97316',
};

const OUTAGE_TYPE_LABELS: Record<OutageType, string> = {
  full: 'Full Outage',
  partial: 'Partial Outage',
  degradation: 'Degradation',
};

const OUTAGE_TYPE_BADGE_CLASSES: Record<OutageType, string> = {
  full: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  partial: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  degradation: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
};

const SEVERITY_BADGE_CLASSES: Record<OutageSeverity, string> = {
  critical: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  high: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  low: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

const STATUSES: OutageStatus[] = ['active', 'compensating', 'restored', 'resolved'];
const OUTAGE_TYPES: OutageType[] = ['full', 'partial', 'degradation'];
const SEVERITIES: OutageSeverity[] = ['critical', 'high', 'medium', 'low'];

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDuration(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDateTime(ts: string | null): string {
  if (!ts) return '—';
  return ts;
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: rows }).map((_, r) => (
            <Skeleton key={r} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Chart Tooltip ─────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Pie Label ─────────────────────────────────────────────────────────

const RADIAN = Math.PI / 180;
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.06) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function OutagesView() {
  const t = useT();
  const [techFilter, setTechFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<OutagesResponse>({
    queryKey: ['outages', techFilter, severityFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      return fetch(`/api/outages${qs ? `?${qs}` : ''}`).then((r) => { if (!r.ok) throw new Error('Outages API error: ' + r.status); return r.json(); });
    },
    refetchInterval: 30000,
  });

  const outages = data?.outages ?? [];
  const summary = data?.summary;

  // Chart data: Status Bar
  const statusBarData = STATUSES.map((s) => ({
    status: STATUS_LABELS[s],
    count: summary?.byStatus[s] ?? 0,
    fill: STATUS_COLORS[s],
  }));

  // Chart data: Outage Type Pie
  const outageTypePieData = OUTAGE_TYPES.map((ot) => ({
    name: OUTAGE_TYPE_LABELS[ot],
    value: summary?.byOutageType[ot] ?? 0,
    fill: OUTAGE_TYPE_COLORS[ot],
  })).filter((d) => d.value > 0);

  // ─── Render: Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-72 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: 'outages' })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || outages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <PowerOff className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('out.noData')}</p>
        <p className="text-sm mt-1">
          {t('out.noOutagesMatch')}
        </p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title.outages')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('out.subtitle')}
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Outages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PowerOff className="h-4 w-4 text-slate-500" />
              Total Outages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {summary?.total ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* Active */}
        <Card className="border-red-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary?.activeOutages ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* Compensating */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Compensating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {summary?.byStatus?.compensating ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* Restored */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Restored
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary?.byStatus?.restored ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* Avg Duration */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-500" />
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {formatDuration(summary?.avgDuration ?? null)}
            </span>
          </CardContent>
        </Card>

        {/* Total Affected Users */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              Affected Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {(summary?.totalAffectedUsers ?? 0).toLocaleString()}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Status Bar + Outage Type Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('out.statusDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBarData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="status"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name={t("out.outages")} radius={[4, 4, 0, 0]}>
                    {statusBarData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Outage Type Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('out.typeDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outageTypePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={renderPieLabel}
                    labelLine={false}
                  >
                    {outageTypePieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Outages Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base">{t('out.allOutages')}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder={t('filter.tech')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTechShort')}</SelectItem>
                {TECHNOLOGIES.map((tech) => (
                  <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('filter.severity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allSeveritiesShort')}</SelectItem>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t('filter.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allStatus')}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton data={outages} filenamePrefix="outages" columns={[{ key: 'siteName', header: 'Site' }, { key: 'technology', header: 'Technology' }, { key: 'outageType', header: 'Type' }, { key: 'severity', header: 'Severity' }, { key: 'status', header: 'Status' }, { key: 'startedAt', header: 'Started' }, { key: 'affectedUsers', header: 'Affected Users' }, { key: 'region', header: 'Region' }]} />
          </div>
        </CardHeader>
        <CardContent>
          {outages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No outages match the selected filters.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[160px]">{t('th.site')}</TableHead>
                    <TableHead>{t('th.tech')}</TableHead>
                    <TableHead>{t('th.type')}</TableHead>
                    <TableHead>{t('th.severity')}</TableHead>
                    <TableHead>{t('th.status')}</TableHead>
                    <TableHead>{t('out.started')}</TableHead>
                    <TableHead>{t('th.duration')}</TableHead>
                    <TableHead className="text-right">{t('out.affectedUsers')}</TableHead>
                    <TableHead>{t('out.compensation')}</TableHead>
                    <TableHead>{t('out.rootCauseCol')}</TableHead>
                    <TableHead>{t('th.region')}</TableHead>
                    <TableHead>{t('out.resolvedCol')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outages.map((outage) => (
                    <TableRow key={outage.id}>
                      <TableCell className="font-medium text-xs sticky left-0 bg-background">
                        <div className="max-w-[160px]">
                          <div className="truncate">{outage.siteName}</div>
                          <div className="text-muted-foreground">{outage.siteCode}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TECH_BG_CLASSES[outage.technology]}>
                          {outage.technology}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={OUTAGE_TYPE_BADGE_CLASSES[outage.outageType]}>
                          {OUTAGE_TYPE_LABELS[outage.outageType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SEVERITY_BADGE_CLASSES[outage.severity]}>
                          {outage.severity.charAt(0).toUpperCase() + outage.severity.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE_CLASSES[outage.status]}>
                          {STATUS_LABELS[outage.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(outage.startedAt)}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {formatDuration(outage.actualDuration ?? outage.estimatedDuration)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <span className={outage.affectedUsers > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
                          {outage.affectedUsers.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {outage.compensationApplied && outage.compensationApplied !== 'none' ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                            <Zap className="h-3 w-3 mr-1" />
                            {outage.compensationApplied.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">{t('view.none')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">
                        {outage.rootCause ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {outage.region}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {outage.resolvedAt ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}