'use client';

import { useState } from 'react';
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
import { GitBranch, Frown, CheckCircle2, AlertTriangle, RotateCcw, Clock } from 'lucide-react';
import { TECH_BG_CLASSES, formatNumber, TECHNOLOGIES } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

type ChangeStatus = 'pending' | 'approved' | 'implemented' | 'rolled_back' | 'rejected';
type ChangeCategory = 'radio' | 'power' | 'neighbor' | 'handover' | 'capacity' | 'software';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface ChangeItem {
  id: string;
  title: string;
  technology: Technology;
  siteId: string;
  siteName: string;
  category: ChangeCategory;
  parameter: string;
  previousValue: string;
  proposedValue: string;
  reason: string;
  impact: string;
  riskLevel: RiskLevel;
  status: ChangeStatus;
  requestedBy: string;
  approvedBy: string | null;
  implementedAt: string | null;
  rollbackReason: string | null;
  kpiImpact: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

interface ChangesSummary {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byRisk: Record<string, number>;
  avgRiskLevel: number;
  implementedThisWeek: number;
}

interface ChangesResponse {
  changes: ChangeItem[];
  summary: ChangesSummary;
}

// ─── Color Maps ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<ChangeStatus, string> = {
  pending: '#F59E0B',
  approved: '#06B6D4',
  implemented: '#10B981',
  rolled_back: '#EF4444',
  rejected: '#64748B',
};

const STATUS_LABELS: Record<ChangeStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  implemented: 'Implemented',
  rolled_back: 'Rolled Back',
  rejected: 'Rejected',
};

const STATUS_BADGE_CLASSES: Record<ChangeStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  approved: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  implemented: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  rolled_back: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  rejected: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

const CATEGORY_COLORS: Record<ChangeCategory, string> = {
  radio: '#10B981',
  power: '#F59E0B',
  neighbor: '#06B6D4',
  handover: '#F97316',
  capacity: '#F43F5E',
  software: '#64748B',
};

const CATEGORY_LABELS: Record<ChangeCategory, string> = {
  radio: 'Radio',
  power: 'Power',
  neighbor: 'Neighbor',
  handover: 'Handover',
  capacity: 'Capacity',
  software: 'Software',
};

const CATEGORY_BADGE_CLASSES: Record<ChangeCategory, string> = {
  radio: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  power: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  neighbor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  handover: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  capacity: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  software: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
};

const STATUSES: ChangeStatus[] = ['pending', 'approved', 'implemented', 'rolled_back', 'rejected'];
const CATEGORIES: ChangeCategory[] = ['radio', 'power', 'neighbor', 'handover', 'capacity', 'software'];

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDateTime(ts: string | null): string {
  if (!ts) return '—';
  return ts;
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
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function ChangesView() {
  const [techFilter, setTechFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<ChangesResponse>({
    queryKey: ['changes', techFilter, statusFilter, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const qs = params.toString();
      return fetch(`/api/changes${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const changes = data?.changes ?? [];
  const summary = data?.summary;

  // Chart data: Status Distribution
  const statusBarData = STATUSES.map((s) => ({
    status: STATUS_LABELS[s],
    count: summary?.byStatus[s] ?? 0,
    fill: STATUS_COLORS[s],
  }));

  // Chart data: Category Distribution
  const categoryPieData = CATEGORIES.map((c) => ({
    name: CATEGORY_LABELS[c],
    value: summary?.byCategory[c] ?? 0,
    fill: CATEGORY_COLORS[c],
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
        <p className="text-lg font-medium">Failed to load change data</p>
        <p className="text-sm mt-1">Please try again later.</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || changes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <GitBranch className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No Changes Available</p>
        <p className="text-sm mt-1">
          No parameter changes match the selected filters.
        </p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Change Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Parameter change tracking, approval workflow, and audit trail
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Changes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-slate-500" />
              Total Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {summary?.total ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* Implemented */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Implemented
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary?.byStatus?.implemented ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {summary?.byStatus?.pending ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* Rolled Back */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-red-500" />
              Rolled Back
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary?.byStatus?.rolled_back ?? 0}
            </span>
          </CardContent>
        </Card>

        {/* This Week */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-cyan-500" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {summary?.implementedThisWeek ?? 0}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Status Distribution + Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
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
                  <Bar dataKey="count" name="Changes" radius={[4, 4, 0, 0]}>
                    {statusBarData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
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
      </div>

      {/* Full Changes Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base">All Changes</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Tech" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tech</SelectItem>
                {TECHNOLOGIES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {changes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No changes match the selected filters.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Title</TableHead>
                    <TableHead>Tech</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Previous → Proposed</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Implemented</TableHead>
                    <TableHead>Rollback Reason</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.map((change) => (
                    <TableRow key={change.id}>
                      <TableCell className="font-medium text-xs max-w-[220px] truncate sticky left-0 bg-background">
                        {change.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TECH_BG_CLASSES[change.technology]}>
                          {change.technology}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={CATEGORY_BADGE_CLASSES[change.category]}>
                          {CATEGORY_LABELS[change.category]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">
                        {change.siteName}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {change.parameter}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <span className="text-red-600 dark:text-red-400">{change.previousValue}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{change.proposedValue}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={RISK_BADGE_CLASSES[change.riskLevel]}>
                          {change.riskLevel.charAt(0).toUpperCase() + change.riskLevel.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE_CLASSES[change.status]}>
                          {STATUS_LABELS[change.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {change.requestedBy}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(change.implementedAt)}
                      </TableCell>
                      <TableCell className="text-xs text-red-600 dark:text-red-400 max-w-[150px] truncate">
                        {change.rollbackReason ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(change.createdAt)}
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