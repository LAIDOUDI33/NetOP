'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { useAppStore } from '@/store/app';
import { ExportButton } from '@/components/ExportButton';
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
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Clock, ShieldAlert, CheckCircle2, Search, BarChart3, ListChecks } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber, TECHNOLOGIES } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────

type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';
type IncidentCategory = 'network' | 'hardware' | 'software' | 'power' | 'environmental' | 'third_party';

interface Incident {
  id: string;
  title: string;
  description: string;
  technology: Technology;
  siteId: string | null;
  siteName: string | null;
  siteCode: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: IncidentCategory;
  priority: number;
  assignedTo: string | null;
  reportedBy: string;
  mttrTarget: number;
  mtbfValue: number;
  rootCause: string | null;
  resolution: string | null;
  affectedSites: string[];
  relatedAlerts: string[];
  tags: string[];
  slaBreach: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface IncidentSummary {
  total: number;
  bySeverity: Partial<Record<IncidentSeverity, number>>;
  byStatus: Partial<Record<IncidentStatus, number>>;
  byCategory: Partial<Record<IncidentCategory, number>>;
  avgMTTR: number;
  slaBreaches: number;
}

interface IncidentsResponse {
  incidents: Incident[];
  summary: IncidentSummary;
}

// ─── Color Constants ──────────────────────────────────────────────────

const STATUS_COLORS: Record<IncidentStatus, string> = {
  open: '#EF4444',
  investigating: '#F59E0B',
  resolved: '#10B981',
  closed: '#64748B',
};

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  low: '#64748B',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#991B1B',
};

const CATEGORY_COLORS: Record<string, string> = {
  network: '#EF4444',
  hardware: '#F59E0B',
  software: '#10B981',
  power: '#8B5CF6',
  environmental: '#06B6D4',
  third_party: '#EC4899',
};

const CATEGORY_LABELS: Record<string, string> = {
  network: 'Network',
  hardware: 'Hardware',
  software: 'Software',
  power: 'Power',
  environmental: 'Environmental',
  third_party: 'Third Party',
};

// ─── Helpers ──────────────────────────────────────────────────────────

function severityBadgeVariant(s: IncidentSeverity): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'critical' || s === 'high') return 'destructive';
  if (s === 'medium') return 'secondary';
  return 'default';
}

function statusBadgeVariant(s: IncidentStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'open') return 'destructive';
  if (s === 'investigating') return 'secondary';
  if (s === 'resolved') return 'outline';
  return 'secondary';
}

function computeMTTR(incident: Incident): string {
  if (!incident.resolvedAt) return '—';
  const created = new Date(incident.createdAt).getTime();
  const resolved = new Date(incident.resolvedAt).getTime();
  const minutes = (resolved - created) / 60000;
  return `${Math.round(minutes)} min`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const locale = useAppStore.getState().locale;
  const dateLocale = locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US';
  return d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Custom Tooltip ──────────────────────────────────────────────────

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

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
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

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 5 }).map((_, r) => (
            <Skeleton key={r} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Pie Label ────────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────

export default function IncidentsView() {
  const t = useT();
  const [technology, setTechnology] = useState<string>('all');
  const [severity, setSeverity] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<IncidentsResponse>({
    queryKey: ['incidents', technology, severity, status, category],
    queryFn: () => {
      const params = new URLSearchParams();
      if (technology !== 'all') params.set('technology', technology);
      if (severity !== 'all') params.set('severity', severity);
      if (status !== 'all') params.set('status', status);
      if (category !== 'all') params.set('category', category);
      const qs = params.toString();
      return fetch(`/api/incidents${qs ? `?${qs}` : ''}`).then((r) => { if (!r.ok) throw new Error('Incidents API error: ' + r.status); return r.json(); });
    },
    refetchInterval: 30000,
  });

  const incidents = data?.incidents ?? [];
  const summary = data?.summary;

  // ─── Chart Data ─────────────────────────────────────────────────────

  const statusChartData = [
    { name: 'Open', value: summary?.byStatus?.open ?? 0, fill: STATUS_COLORS.open },
    { name: 'Investigating', value: summary?.byStatus?.investigating ?? 0, fill: STATUS_COLORS.investigating },
    { name: 'Resolved', value: summary?.byStatus?.resolved ?? 0, fill: STATUS_COLORS.resolved },
    { name: 'Closed', value: summary?.byStatus?.closed ?? 0, fill: STATUS_COLORS.closed },
  ];

  const categoryPieData = Object.entries(summary?.byCategory ?? {}).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] ?? key,
    value: value ?? 0,
    fill: CATEGORY_COLORS[key] ?? '#94A3B8',
  }));

  const allCategories: string[] = ['network', 'hardware', 'software', 'power', 'environmental', 'third_party'];
  const allSeverities: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];

  const severityByCategoryData = allCategories.map((cat) => {
    const row: Record<string, string | number> = { category: CATEGORY_LABELS[cat] ?? cat };
    for (const sev of allSeverities) {
      const count = incidents.filter((inc) => inc.category === cat && inc.severity === sev).length;
      row[sev] = count;
    }
    return row;
  });

  // ─── Loading State ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-72 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{t('view.failedLoad', { entity: "incidents" })}</p>
        <p className="text-sm mt-1">{t('view.tryAgain')}</p>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          Incident Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Network incident tracking, SLA compliance, and resolution workflow
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Open Incidents */}
        <Card className="border-red-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Open Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary?.byStatus?.open ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* Investigating */}
        <Card className="border-amber-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-500" />
              Investigating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {summary?.byStatus?.investigating ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* Resolved Today */}
        <Card className="border-emerald-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Resolved Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary?.byStatus?.resolved ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* SLA Breaches */}
        <Card className="border-red-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              SLA Breaches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary?.slaBreaches ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* Avg MTTR */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-500" />
              Avg MTTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {formatNumber(summary?.avgMTTR ?? 0, 1)}
            </span>
            <span className="text-sm text-muted-foreground ml-1">{t('unit.min')}</span>
          </CardContent>
        </Card>

        {/* Total Incidents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-slate-500" />
              Total Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {summary?.total ?? 0}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* t('inc.statusDist') Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* t('inc.catDist') Pie Chart (Donut) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={renderPieLabel}
                    labelLine={false}
                  >
                    {categoryPieData.map((entry, idx) => (
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

        {/* t('inc.sevByCat') Stacked Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Severity by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityByCategoryData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="category"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="square"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground capitalize">{value}</span>
                    )}
                  />
                  <Bar dataKey="low" stackId="sev" name="Low" fill={SEVERITY_COLORS.low} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="medium" stackId="sev" name="Medium" fill={SEVERITY_COLORS.medium} />
                  <Bar dataKey="high" stackId="sev" name="High" fill={SEVERITY_COLORS.high} />
                  <Bar dataKey="critical" stackId="sev" name="Critical" fill={SEVERITY_COLORS.critical} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={technology} onValueChange={setTechnology}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('filter.technology')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allTech')}</SelectItem>
            {TECHNOLOGIES.map((tech) => (
              <SelectItem key={tech} value={tech}>{tech}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t('filter.severity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allSeverities')}</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">{t('status.critical')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('filter.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
            <SelectItem value="open">{t('status.open')}</SelectItem>
            <SelectItem value="investigating">{t('status.investigating')}</SelectItem>
            <SelectItem value="resolved">{t('status.resolved')}</SelectItem>
            <SelectItem value="closed">{t('status.closed')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('filter.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allCategories')}</SelectItem>
            <SelectItem value="network">Network</SelectItem>
            <SelectItem value="hardware">Hardware</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="power">Power</SelectItem>
            <SelectItem value="environmental">Environmental</SelectItem>
            <SelectItem value="third_party">Third Party</SelectItem>
          </SelectContent>
        </Select>
        <ExportButton data={incidents} filenamePrefix="incidents" columns={[{ key: 'title', header: 'Title' }, { key: 'technology', header: 'Technology' }, { key: 'severity', header: 'Severity' }, { key: 'status', header: 'Status' }, { key: 'category', header: 'Category' }, { key: 'assignedTo', header: 'Assigned To' }, { key: 'reportedBy', header: 'Reported By' }]} />
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            {t('inc.allIncidents')}
            <Badge variant="secondary" className="ml-2">{incidents.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Title</TableHead>
                  <TableHead>Tech</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>MTTR</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      {t('inc.noMatch')}
                    </TableCell>
                  </TableRow>
                )}
                {incidents.map((inc) => (
                  <TableRow key={inc.id}>
                    {/* Title */}
                    <TableCell className="font-medium min-w-[160px] max-w-[220px] truncate">
                      {inc.title}
                    </TableCell>

                    {/* Tech Badge */}
                    <TableCell>
                      <Badge variant="outline" className={TECH_BG_CLASSES[inc.technology]}>
                        {inc.technology}
                      </Badge>
                    </TableCell>

                    {/* Severity Badge */}
                    <TableCell>
                      <Badge variant={severityBadgeVariant(inc.severity)}>
                        {inc.severity.charAt(0).toUpperCase() + inc.severity.slice(1)}
                      </Badge>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <Badge
                        variant={statusBadgeVariant(inc.status)}
                        className={inc.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' : undefined}
                      >
                        {inc.status.charAt(0).toUpperCase() + inc.status.slice(1)}
                      </Badge>
                    </TableCell>

                    {/* Category Badge */}
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORY_LABELS[inc.category] ?? inc.category}
                      </Badge>
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      <span className="text-sm font-medium">{inc.priority}</span>
                    </TableCell>

                    {/* Site */}
                    <TableCell className="text-sm text-muted-foreground">
                      {inc.siteCode ?? '—'}
                    </TableCell>

                    {/* Assigned */}
                    <TableCell className="text-sm">
                      {inc.assignedTo ? (
                        <span>{inc.assignedTo}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>

                    {/* MTTR */}
                    <TableCell className="text-sm">
                      {computeMTTR(inc)}
                    </TableCell>

                    {/* SLA */}
                    <TableCell>
                      {inc.slaBreach ? (
                        <Badge variant="destructive">BREACH</Badge>
                      ) : (
                        <Badge variant="outline">{t('view.none')}</Badge>
                      )}
                    </TableCell>

                    {/* Tags */}
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {inc.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {inc.tags.length > 2 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            +{inc.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Created */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(inc.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
