'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, PieChart, Pie, XAxis, YAxis, CartesianGrid,
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
import { FileSearch, Users, Tag, BarChart3, Clock } from 'lucide-react';
import { TECH_BG_CLASSES, formatNumber, TECHNOLOGIES } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface AuditTrail {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  field: string;
  previousValue: string;
  newValue: string;
  technology: Technology;
  category: string;
  requestedBy: string;
  approvedBy: string | null;
  impact: string;
  createdAt: string;
}

interface AuditSummary {
  total: number;
  byAction: Record<string, number>;
  byCategory: Record<string, number>;
  byEntityType: Record<string, number>;
  todayCount: number;
}

interface AuditResponse {
  trails: AuditTrail[];
  summary: AuditSummary;
}

// ─── Color Maps ───────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  create: '#10B981',
  update: '#F59E0B',
  delete: '#EF4444',
  approve: '#06B6D4',
  reject: '#F43F5E',
  implement: '#F97316',
  rollback: '#64748B',
};

const ACTION_BADGE_CLASSES: Record<string, string> = {
  create: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  update: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  delete: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  approve: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  reject: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  implement: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  rollback: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

const CATEGORY_COLORS: Record<string, string> = {
  parameter: '#10B981',
  config: '#06B6D4',
  site: '#F59E0B',
  policy: '#F43F5E',
  incident: '#EF4444',
  son: '#F97316',
};

const ENTITY_TYPE_BADGE_CLASSES: Record<string, string> = {
  parameter: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  config: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  site: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  policy: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  incident: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  son: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
};

const ENTITY_TYPE_OPTIONS = ['all', 'parameter', 'config', 'site', 'policy', 'incident', 'son'];
const ACTION_OPTIONS = ['all', 'create', 'update', 'delete', 'approve', 'reject', 'implement', 'rollback'];
const CATEGORY_OPTIONS = ['all', 'parameter', 'config', 'site', 'policy', 'incident', 'son'];

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

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
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

function TableSkeleton({ rows = 6, cols = 8 }: { rows?: number; cols?: number }) {
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

// ─── Helper ───────────────────────────────────────────────────────────

function truncate(str: string, maxLen = 24): string {
  if (!str) return '—';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

// ─── Main Component ───────────────────────────────────────────────────

export default function AuditView() {
  const [entityType, setEntityType] = useState<string>('all');
  const [action, setAction] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [technology, setTechnology] = useState<string>('all');

  const params = new URLSearchParams();
  if (entityType !== 'all') params.set('entityType', entityType);
  if (action !== 'all') params.set('action', action);
  if (category !== 'all') params.set('category', category);
  if (technology !== 'all') params.set('technology', technology);

  const { data, isLoading, error } = useQuery<AuditResponse>({
    queryKey: ['audit', entityType, action, category, technology],
    queryFn: () => fetch(`/api/audit?${params.toString()}`).then((r) => r.json()),
    refetchInterval: 30000,
  });

  const trails = data?.trails ?? [];
  const summary = data?.summary;

  // Count distinct requestedBy
  const uniqueActors = useMemo(() => {
    const set = new Set(trails.map((t) => t.requestedBy));
    return set.size;
  }, [trails]);

  const categoriesCount = summary
    ? Object.keys(summary.byCategory).length
    : 0;

  // Chart data: actions
  const actionChartData = useMemo(() => {
    if (!summary?.byAction) return [];
    return Object.entries(summary.byAction).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: ACTION_COLORS[key] ?? '#64748B',
    }));
  }, [summary]);

  // Chart data: categories
  const categoryChartData = useMemo(() => {
    if (!summary?.byCategory) return [];
    return Object.entries(summary.byCategory).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: CATEGORY_COLORS[key] ?? '#64748B',
    }));
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSearch className="h-6 w-6 text-emerald-500" />
            Audit Trail
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete change history with parameter diff tracking
          </p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === 'all' ? 'All Entity Types' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === 'all' ? 'All Actions' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === 'all' ? 'All Categories' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={technology} onValueChange={setTechnology}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Technology" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technologies</SelectItem>
            {TECHNOLOGIES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      {isLoading && <KpiCardsSkeleton />}

      {!isLoading && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Today&apos;s Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.todayCount.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Unique Actors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueActors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categoriesCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Charts ─────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Actions Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Actions by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actionChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                      {actionChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Categories Pie Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Entries by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {categoryChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────── */}
      {isLoading && <TableSkeleton />}

      {error && (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Failed to load audit data.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Audit Entries ({trails.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trails.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No audit entries found for the selected filters.
              </div>
            ) : (
              <div className="max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap text-xs">Timestamp</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Entity Type</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Entity Name</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Action</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Field</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Previous → New</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Requested By</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Approved By</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Impact</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Tech</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trails.map((trail) => (
                      <TableRow key={trail.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatTimestamp(trail.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${ENTITY_TYPE_BADGE_CLASSES[trail.entityType] ?? 'bg-muted text-muted-foreground'}`}
                          >
                            {trail.entityType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium max-w-[140px] truncate">
                          {trail.entityName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${ACTION_BADGE_CLASSES[trail.action] ?? 'bg-muted text-muted-foreground'}`}
                          >
                            {trail.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {trail.field || '—'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[220px]">
                          <span className="text-muted-foreground line-through mr-1">
                            {truncate(trail.previousValue, 16)}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {truncate(trail.newValue, 16)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {trail.requestedBy}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {trail.approvedBy ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {trail.impact || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${TECH_BG_CLASSES[trail.technology] ?? ''}`}
                          >
                            {trail.technology}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}