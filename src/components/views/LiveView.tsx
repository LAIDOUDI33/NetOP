'use client';
import { useT } from '@/lib/i18n';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Users,
  Download,
  Upload,
  Wifi,
  Zap,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Leaf,
  AlertCircle,
  Clock,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import type { Technology, AlertSeverity } from '@/types';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

interface LiveOverview {
  totalUsers: number;
  totalDownloadMbps: number;
  totalUploadMbps: number;
  avgAvailability: number;
  totalPowerW: number;
  activeAlerts: number;
  activeIncidents: number;
}

interface ByTech {
  technology: Technology;
  users: number;
  download: number;
  upload: number;
  availability: number;
  power: number;
  sites: number;
}

interface TopLoadedSite {
  siteId: string;
  siteName: string;
  siteCode: string;
  technology: Technology;
  region: string;
  prbUtilization: number;
  activeUsers: number;
}

interface RecentAlert {
  id: string;
  siteName: string | null;
  siteCode: string | null;
  technology: Technology;
  metric: string;
  value: number;
  threshold: number;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

interface EnergySummary {
  totalPowerKw: number;
  totalCO2kg: number;
  sitesInSleep: number;
}

interface IncidentSummary {
  open: number;
  investigating: number;
  todayResolved: number;
  slaBreaches: number;
}

export default function LiveView() {
  const t = useT();
  const { data, isLoading } = useQuery<{
    overview: LiveOverview;
    byTech: ByTech[];
    topLoadedSites: TopLoadedSite[];
    recentAlerts: RecentAlert[];
    energySummary: EnergySummary;
    incidentSummary: IncidentSummary;
  }>({
    queryKey: ['live'],
    queryFn: () => fetch('/api/live').then(r => r.json()),
    refetchInterval: 5000,
  });

  const overview = data?.overview;
  const byTech = data?.byTech ?? [];
  const topLoaded = data?.topLoadedSites ?? [];
  const recentAlerts = data?.recentAlerts ?? [];
  const energy = data?.energySummary;
  const incidents = data?.incidentSummary;

  const severityVariant: Record<string, 'destructive' | 'secondary' | 'outline'> = {
    critical: 'destructive',
    warning: 'secondary',
    info: 'outline',
  };

  const severityColor: Record<string, string> = {
    critical: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-cyan-600 dark:text-cyan-400',
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-6"><Skeleton className="h-72 w-full" /></div>
          <div className="rounded-lg border bg-card p-6"><Skeleton className="h-72 w-full" /></div>
        </div>
      </div>
    );
  }

  const loadedChartData = topLoaded.map(s => ({
    name: s.siteName.length > 12 ? s.siteName.slice(0, 12) + '…' : s.siteName,
    load: s.prbUtilization,
    fill: TECH_COLORS[s.technology] || '#6B7280',
  }));

  const kpiCards = [
    {
      label: 'Active Users',
      value: overview?.totalUsers.toLocaleString() ?? '0',
      icon: Users,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      trend: 'up' as const,
    },
    {
      label: 'Download',
      value: `${overview?.totalDownloadMbps.toFixed(1) ?? '0'} Mbps`,
      icon: Download,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-500/10',
      trend: 'up' as const,
    },
    {
      label: 'Upload',
      value: `${overview?.totalUploadMbps.toFixed(1) ?? '0'} Mbps`,
      icon: Upload,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-500/10',
      trend: 'up' as const,
    },
    {
      label: 'Availability',
      value: `${(overview?.avgAvailability ?? 0).toFixed(1)}%`,
      icon: Wifi,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      trend: (overview?.avgAvailability ?? 0) >= 99 ? 'up' : (overview?.avgAvailability ?? 0) >= 97 ? 'neutral' as const : 'down' as const,
    },
    {
      label: t('live.power'),
      value: `${((overview?.totalPowerW ?? 0) / 1000).toFixed(1)} kW`,
      icon: Zap,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      trend: 'neutral' as const,
    },
    {
      label: 'Active Alerts',
      value: String(overview?.activeAlerts ?? 0),
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/10',
      trend: (overview?.activeAlerts ?? 0) > 5 ? 'down' as const : 'neutral' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Real-Time Dashboard</h2>
            <p className="text-sm text-muted-foreground">{t('live.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          ● LIVE
        </div>
        <ExportButton data={topLoaded as unknown as Record<string, any>[]} filenamePrefix="live" columns={[{ key: 'siteName', header: 'Site' }, { key: 'technology', header: 'Technology' }, { key: 'loadPercent', header: 'Load (%)' }, { key: 'users', header: 'Users' }]} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
          const trendColor = kpi.trend === 'up' ? 'text-emerald-500' : kpi.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                  <span className="text-[11px] text-muted-foreground">Real-time</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Per-Technology Stats Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t('live.perTechStats')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('th.technology')}</TableHead>
                  <TableHead className="text-xs text-right">{t('th.site')}</TableHead>
                  <TableHead className="text-xs text-right">{t('th.users')}</TableHead>
                  <TableHead className="text-xs text-right">DL ({t('unit.mbps')})</TableHead>
                  <TableHead className="text-xs text-right">UL ({t('unit.mbps')})</TableHead>
                  <TableHead className="text-xs text-right">{t('th.availability')} (%)</TableHead>
                  <TableHead className="text-xs text-right">{t('live.power')} ({t('unit.kw')})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byTech.map((row) => (
                  <TableRow key={row.technology}>
                    <TableCell>
                      <Badge variant="outline" className={TECH_BG_CLASSES[row.technology] || ''}>
                        {row.technology}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{row.sites}</TableCell>
                    <TableCell className="text-right text-sm">{row.users.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">{row.download.toFixed(1)}</TableCell>
                    <TableCell className="text-right text-sm">{row.upload.toFixed(1)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {row.availability.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right text-sm">{(row.power / 1000).toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 Loaded Sites */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('live.top5Loaded')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loadedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Load']}
                  />
                  <Bar dataKey="load" radius={[0, 4, 4, 0]}>
                    {loadedChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <Badge variant={severityVariant[alert.severity] || 'outline'} className="mt-0.5 shrink-0 text-[10px]">
                    {alert.severity}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs font-medium mb-0.5">
                      <span className="truncate">{alert.siteName ?? 'Unknown'}</span>
                      {alert.siteCode && (
                        <span className="text-muted-foreground">({alert.siteCode})</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[11px] font-medium ${severityColor[alert.severity] || ''}`}>
                        {alert.metric}
                      </span>
                      <Separator orientation="vertical" className="h-3" />
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(alert.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {recentAlerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-xs">No unresolved alerts</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Cards: Energy + Incidents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Energy Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-500" />
              Energy Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('live.power')}</p>
                <p className="text-lg font-bold mt-0.5">{energy?.totalPowerKw.toFixed(1) ?? '0'}<span className="text-xs font-normal text-muted-foreground ml-0.5">{t('unit.kw')}</span></p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('live.co2')}</p>
                <p className="text-lg font-bold mt-0.5">{energy?.totalCO2kg.toFixed(1) ?? '0'}<span className="text-xs font-normal text-muted-foreground ml-0.5">kg</span></p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('live.sleepMode')}</p>
                <p className="text-lg font-bold mt-0.5">{energy?.sitesInSleep ?? 0}<span className="text-xs font-normal text-muted-foreground ml-0.5">{t('unit.sites')}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incident Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Incident Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('status.open')}</p>
                <p className="text-lg font-bold mt-0.5 text-red-600 dark:text-red-400">{incidents?.open ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Investigating</p>
                <p className="text-lg font-bold mt-0.5 text-amber-600 dark:text-amber-400">{incidents?.investigating ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('live.todayResolved')}</p>
                <p className="text-lg font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{incidents?.todayResolved ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('live.slaBreaches')}</p>
                <p className="text-lg font-bold mt-0.5 text-red-600 dark:text-red-400">{incidents?.slaBreaches ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
