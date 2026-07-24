'use client';
import { useT } from '@/lib/i18n';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
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
import { Radio, AlertTriangle, Frown, CheckCircle2, BarChart3 } from 'lucide-react';
import { TECH_BG_CLASSES, TECHNOLOGIES, formatNumber } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface InterferenceEvent {
  id: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  technology: Technology;
  interferenceType: string;
  severity: string;
  status: string;
  sourceCell: string;
  sourceCellName: string;
  conflictingCell: string;
  conflictingCellName: string;
  frequency: string;
  pci: string;
  affectedKpis: string[];
  impactScore: number;
  recommendation: string;
  resolvedAt: string | null;
  createdAt: string;
}

interface InterferenceSummary {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  avgImpact: number;
}

interface InterferenceResponse {
  events: InterferenceEvent[];
  summary: InterferenceSummary;
}

// ─── Constants ─────────────────────────────────────────────────────────

const SEVERITY_COLORS_MAP: Record<string, string> = {
  low: '#94A3B8',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#991B1B',
};

const TYPE_COLORS_MAP: Record<string, string> = {
  pci_conflict: '#EF4444',
  co_channel: '#F59E0B',
  adjacent_channel: '#F97316',
  external: '#06B6D4',
  inter_modulation: '#FB7185',
};

const TYPE_LABELS: Record<string, string> = {
  pci_conflict: 'PCI Conflict',
  co_channel: 'Co-Channel',
  adjacent_channel: 'Adjacent Channel',
  external: 'External',
  inter_modulation: 'Inter-Modulation',
};

const SEVERITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'destructive',
  critical: 'destructive',
};

const SEVERITY_TEXT_COLOR: Record<string, string> = {
  low: 'text-slate-600 dark:text-slate-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
  critical: 'text-red-700 dark:text-red-300',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  resolved: 'outline',
  mitigated: 'secondary',
  pending: 'secondary',
};

const STATUS_TEXT: Record<string, string> = {
  active: 'Active',
  resolved: 'Resolved',
  mitigated: 'Mitigated',
  pending: 'Pending',
};

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severity' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'pci_conflict', label: 'PCI Conflict' },
  { value: 'co_channel', label: 'Co-Channel' },
  { value: 'adjacent_channel', label: 'Adjacent Channel' },
  { value: 'external', label: 'External' },
  { value: 'inter_modulation', label: 'Inter-Modulation' },
];

// ─── Helper Functions ──────────────────────────────────────────────────

function impactColor(score: number): string {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function impactTextColor(score: number): string {
  if (score >= 80) return 'text-red-600 dark:text-red-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-2 w-full" />
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

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
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

function PieTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
        <span className="font-medium">{entry.name}</span>
      </div>
      <p className="text-muted-foreground mt-1">Count: <span className="font-medium text-foreground">{entry.value}</span></p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function InterferenceView() {
  const t = useT();
  const typeLabels: Record<string, string> = {
    pci_conflict: t('intf.pciConflict'),
    co_channel: t('intf.coChannel'),
    adjacent_channel: t('intf.adjacentChannel'),
    external: t('intf.external'),
    inter_modulation: t('intf.interModulation'),
  };
  const statusTextMap: Record<string, string> = {
    active: t('status.active'),
    resolved: t('status.resolved'),
    pending: t('status.pending'),
  };
  const [techFilter, setTechFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<InterferenceResponse>({
    queryKey: ['interference', techFilter, severityFilter, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (typeFilter !== 'all') params.set('interferenceType', typeFilter);
      const qs = params.toString();
      return fetch(`/api/interference${qs ? `?${qs}` : ''}`).then((r) => { if (!r.ok) throw new Error('Interference API error: ' + r.status); return r.json(); });
    },
    refetchInterval: 30000,
  });

  const events = data?.events ?? [];
  const summary = data?.summary;

  // Chart data
  const severityChartData = summary?.bySeverity
    ? Object.entries(summary.bySeverity).map(([key, value]) => ({
        severity: key.charAt(0).toUpperCase() + key.slice(1),
        count: value,
        fill: SEVERITY_COLORS_MAP[key] ?? '#94A3B8',
      }))
    : [];

  const typeChartData = summary?.byType
    ? Object.entries(summary.byType).map(([key, value]) => ({
        name: typeLabels[key] ?? key,
        value,
        fill: TYPE_COLORS_MAP[key] ?? '#94A3B8',
      }))
    : [];

  // KPI computations
  const highCriticalCount =
    (summary?.bySeverity?.high ?? 0) + (summary?.bySeverity?.critical ?? 0);
  const activeCount = summary?.byStatus?.active ?? 0;
  const resolvedCount = summary?.byStatus?.resolved ?? 0;
  const avgImpact = summary?.avgImpact ?? 0;

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
        <TableSkeleton rows={8} cols={13} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('empty.noDataFor', { entity: t('intf.title') })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Radio className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('intf.noEvents')}</p>
        <p className="text-sm mt-1">
          {t('intf.noMatch')}
        </p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Radio className="h-6 w-6 text-amber-500" />
          {t('intf.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('intf.subtitle')}
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-500" />
              {t('intf.totalEvents')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {summary?.total ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* High/Critical */}
        <Card className="border-red-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              {t('intf.highCritical')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {highCriticalCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
          </CardContent>
        </Card>

        {/* Avg Impact Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              {t('intf.avgImpactScore')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${impactTextColor(avgImpact)}`}>
              {formatNumber(avgImpact, 1)}
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${impactColor(avgImpact)}`}
                style={{ width: `${Math.min(avgImpact, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Scale: 0 – 100</p>
          </CardContent>
        </Card>

        {/* Active Detections */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t('intf.activeDetections')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {activeCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Currently unresolved</p>
          </CardContent>
        </Card>

        {/* Resolved */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {t('intf.resolved')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {resolvedCount}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Successfully resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('intf.eventsBySev')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="severity"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="Events" radius={[4, 4, 0, 0]}>
                    {severityChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Type Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('intf.typeDist')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {typeChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {typeChartData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Events Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base">{t('intf.events')}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder={t('filter.technology')} />
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
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.value === 'all' ? t('filter.allSeverities') : s.value === 'critical' ? t('status.critical') : s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('filter.type')} />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.value === 'all' ? t('filter.allTypes') : (typeLabels[opt.value] ?? opt.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton data={events} filenamePrefix="interference" columns={[{ key: 'siteName', header: 'Site' }, { key: 'technology', header: 'Technology' }, { key: 'interferenceType', header: 'Type' }, { key: 'severity', header: 'Severity' }, { key: 'status', header: 'Status' }, { key: 'impactScore', header: 'Impact' }, { key: 'sourceCellName', header: 'Source Cell' }, { key: 'conflictingCellName', header: 'Conflicting Cell' }]} />
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('intf.noEventsFilter')}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">{t('th.site')}</TableHead>
                    <TableHead>{t('th.tech')}</TableHead>
                    <TableHead>{t('th.type')}</TableHead>
                    <TableHead>{t('th.riskLevel')}</TableHead>
                    <TableHead>{t('th.status')}</TableHead>
                    <TableHead>{t('th.servingCell')}</TableHead>
                    <TableHead>{t('th.conflictingCell')}</TableHead>
                    <TableHead>{t('th.frequency')}</TableHead>
                    <TableHead>PCI</TableHead>
                    <TableHead className="text-right">{t('th.impactScore')}</TableHead>
                    <TableHead>{t('intf.affectedKpis')}</TableHead>
                    <TableHead className="min-w-[160px]">{t('th.description')}</TableHead>
                    <TableHead>{t('th.createdAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((evt) => (
                    <TableRow key={evt.id}>
                      <TableCell className="font-medium text-xs max-w-[120px] truncate sticky left-0 bg-background">
                        {evt.siteName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TECH_BG_CLASSES[evt.technology]}>
                          {evt.technology}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: TYPE_COLORS_MAP[evt.interferenceType] ?? '#94A3B8',
                            color: TYPE_COLORS_MAP[evt.interferenceType] ?? '#94A3B8',
                          }}
                        >
                          {typeLabels[evt.interferenceType] ?? evt.interferenceType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={SEVERITY_VARIANT[evt.severity] ?? 'outline'}>
                          <span className={SEVERITY_TEXT_COLOR[evt.severity] ?? ''}>
                            {evt.severity.charAt(0).toUpperCase() + evt.severity.slice(1)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[evt.status] ?? 'outline'}>
                          {statusTextMap[evt.status] ?? STATUS_TEXT[evt.status] ?? evt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate" title={evt.sourceCellName}>
                        {evt.sourceCellName}
                      </TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate" title={evt.conflictingCellName}>
                        {evt.conflictingCellName}
                      </TableCell>
                      <TableCell className="text-xs">{evt.frequency}</TableCell>
                      <TableCell className="text-xs font-mono">{evt.pci}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-xs font-medium ${impactTextColor(evt.impactScore)}`}>
                            {evt.impactScore}
                          </span>
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${impactColor(evt.impactScore)}`}
                              style={{ width: `${Math.min(evt.impactScore, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                          {evt.affectedKpis.map((kpi) => (
                            <Badge key={kpi} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {kpi}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={evt.recommendation}>
                        {evt.recommendation}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {evt.createdAt}
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