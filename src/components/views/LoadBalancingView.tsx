'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
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
import { Scale, Frown } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface LoadItem {
  id: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  technology: Technology;
  region: string;
  prbUtilDownlink: number;
  prbUtilUplink: number;
  activeUsers: number;
  maxUsers: number;
  userLoadPct: number;
  throughputDown: number;
  throughputUp: number;
  balancedScore: number;
  congestionLevel: string;
  recommendation: string;
  timestamp: string;
}

interface LoadSummary {
  total: number;
  avgPrbDown: number;
  avgPrbUp: number;
  avgUserLoad: number;
  byCongestion: Record<string, number>;
  totalUsers: number;
  congestedSites: number;
}

interface LoadResponse {
  loads: LoadItem[];
  summary: LoadSummary;
}

// ─── Helper Functions ──────────────────────────────────────────────────

function prbColor(pct: number): string {
  if (pct > 80) return 'text-red-600 dark:text-red-400';
  if (pct > 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function prbBg(pct: number): string {
  if (pct > 80) return 'bg-red-500';
  if (pct > 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function congestionVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (level === 'low') return 'default';
  if (level === 'medium') return 'secondary';
  if (level === 'high') return 'destructive';
  return 'destructive';
}

function congestionColor(level: string): string {
  if (level === 'low') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
  if (level === 'medium') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
  if (level === 'high') return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20';
  return 'bg-red-800/10 text-red-900 dark:text-red-200 border-red-800/20';
}

function formatK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
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

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
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
          <span className="font-medium">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function LoadBalancingView() {
  const [techFilter, setTechFilter] = useState<string>('all');
  const [congestionFilter, setCongestionFilter] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<LoadResponse>({
    queryKey: ['load', techFilter, congestionFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (congestionFilter !== 'all') params.set('congestionLevel', congestionFilter);
      const qs = params.toString();
      return fetch(`/api/load${qs ? `?${qs}` : ''}`).then((r) => r.json());
    },
    refetchInterval: 30000,
  });

  const loads = data?.loads ?? [];
  const summary = data?.summary;

  // Chart data: Congestion Distribution
  const congestionLabels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    congested: 'Congested',
  };
  const congestionColors: Record<string, string> = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
    congested: '#991B1B',
  };
  const congestionDistData = summary?.byCongestion
    ? Object.entries(summary.byCongestion).map(([level, count]) => ({
        name: congestionLabels[level] ?? level,
        count,
        fill: congestionColors[level] ?? '#94A3B8',
      }))
    : [];

  // Chart data: Load by Region (avg PRB DL per region)
  const regionMap = new Map<string, { sumPrb: number; count: number; tech: Technology }>();
  for (const item of loads) {
    const existing = regionMap.get(item.region);
    if (existing) {
      existing.sumPrb += item.prbUtilDownlink;
      existing.count += 1;
    } else {
      regionMap.set(item.region, { sumPrb: item.prbUtilDownlink, count: 1, tech: item.technology });
    }
  }
  const regionData = Array.from(regionMap.entries()).map(([region, info]) => ({
    region,
    avgPrb: Number((info.sumPrb / info.count).toFixed(1)),
    fill: TECH_COLORS[info.tech] ?? '#94A3B8',
  }));

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
        <TableSkeleton />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Failed to load load balancing data</p>
        <p className="text-sm mt-1">Please try again later.</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || loads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Scale className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No Load Balancing Data Available</p>
        <p className="text-sm mt-1">
          {techFilter !== 'all' || congestionFilter !== 'all'
            ? 'No cells match the selected filters.'
            : 'Load metrics have not been collected yet.'}
        </p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Load Balancing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cell load distribution and traffic equalization analysis
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Cells */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Scale className="h-4 w-4 text-emerald-500" />
              Total Cells
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {summary?.total ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Cells analyzed</p>
          </CardContent>
        </Card>

        {/* Avg PRB DL */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg PRB DL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${prbColor(summary?.avgPrbDown ?? 0)}`}>
              {formatNumber(summary?.avgPrbDown ?? 0, 1)}%
            </span>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${prbBg(summary?.avgPrbDown ?? 0)}`}
                style={{ width: `${Math.min(summary?.avgPrbDown ?? 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Avg User Load % */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg User Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${prbColor(summary?.avgUserLoad ?? 0)}`}>
              {formatNumber(summary?.avgUserLoad ?? 0, 1)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">User capacity utilization</p>
          </CardContent>
        </Card>

        {/* Congested Sites */}
        <Card className="border-red-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Congested Sites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary?.congestedSites ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Require offloading</p>
          </CardContent>
        </Card>

        {/* Total Active Users */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {formatK(summary?.totalUsers ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Across all cells</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Congestion Distribution + Load by Region */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Congestion Distribution BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Congestion Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={congestionDistData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="Cells" radius={[4, 4, 0, 0]}>
                    {congestionDistData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Load by Region BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avg PRB DL by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData} barSize={32} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="region"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={72}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgPrb" name="Avg PRB DL %" radius={[0, 4, 4, 0]}>
                    {regionData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Cell Load Details</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Technology" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tech</SelectItem>
                <SelectItem value="2G">2G</SelectItem>
                <SelectItem value="3G">3G</SelectItem>
                <SelectItem value="4G">4G</SelectItem>
                <SelectItem value="5G">5G</SelectItem>
              </SelectContent>
            </Select>
            <Select value={congestionFilter} onValueChange={setCongestionFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Congestion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="congested">Congested</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No cells match the selected filters.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Site</TableHead>
                    <TableHead className="sticky left-[140px] bg-background z-10">Code</TableHead>
                    <TableHead>Tech</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">PRB DL %</TableHead>
                    <TableHead className="text-right">PRB UL %</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">User Load %</TableHead>
                    <TableHead className="text-right">DL Mbps</TableHead>
                    <TableHead className="text-right">UL Mbps</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Congestion</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loads.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-xs max-w-[140px] truncate sticky left-0 bg-background">
                        {item.siteName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground sticky left-[140px] bg-background">
                        {item.siteCode}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TECH_BG_CLASSES[item.technology]}>
                          {item.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.region}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${prbBg(item.prbUtilDownlink)}`}
                              style={{ width: `${Math.min(item.prbUtilDownlink, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium min-w-[36px] text-right ${prbColor(item.prbUtilDownlink)}`}>
                            {formatNumber(item.prbUtilDownlink, 1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right text-xs font-medium ${prbColor(item.prbUtilUplink)}`}>
                        {formatNumber(item.prbUtilUplink, 1)}%
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {item.activeUsers}/{item.maxUsers}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${prbBg(item.userLoadPct)}`}
                              style={{ width: `${Math.min(item.userLoadPct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium min-w-[36px] text-right ${prbColor(item.userLoadPct)}`}>
                            {formatNumber(item.userLoadPct, 1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(item.throughputDown, 1)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(item.throughputUp, 1)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatNumber(item.balancedScore, 1)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={congestionVariant(item.congestionLevel)} className={congestionColor(item.congestionLevel)}>
                          {item.congestionLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={item.recommendation}>
                        {item.recommendation}
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