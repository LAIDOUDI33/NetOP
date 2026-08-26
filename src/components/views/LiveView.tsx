'use client';
import { useT } from '@/lib/i18n';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSocket, type KpiUpdateItem, type LiveAlertItem, type AlertPulseData } from '@/hooks/useSocket';
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
  Activity, Users, Download, Upload, Wifi, Zap,
  AlertTriangle, TrendingUp, TrendingDown, Minus,
  Leaf, Clock, CheckCircle2, ShieldAlert, Gauge,
} from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES } from '@/lib/constants';
import { ExportButton } from '@/components/ExportButton';
import { CircularGauge } from '@/components/CircularGauge';
import { SparkLine } from '@/components/SparkLine';
import { AnimatePresence, motion } from 'framer-motion';
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

// Keep history for sparklines
const SPARKLINE_HISTORY_LEN = 20;

export default function LiveView() {
  const t = useT();
  const { isConnected, onKpiUpdate, onAlertPulse, onLiveAlerts } = useSocket();
  const { data, isLoading } = useQuery<{
    overview: LiveOverview;
    byTech: ByTech[];
    topLoadedSites: TopLoadedSite[];
    recentAlerts: RecentAlert[];
    energySummary: EnergySummary;
    incidentSummary: IncidentSummary;
  }>({
    queryKey: ['live'],
    queryFn: () => fetch('/api/live').then(r => { if (!r.ok) throw new Error('Live API error: ' + r.status); return r.json(); }),
  });

  // WebSocket KPI data
  const [wsKpiData, setWsKpiData] = useState<KpiUpdateItem[]>([]);
  // Sparkline history
  const [userHistory, setUserHistory] = useState<number[]>([]);
  const [dlHistory, setDlHistory] = useState<number[]>([]);
  const [ulHistory, setUlHistory] = useState<number[]>([]);
  // Live alerts from WebSocket
  const [liveAlerts, setLiveAlerts] = useState<LiveAlertItem[]>([]);
  // Real-time alert pulse
  const [rtAlertPulse, setRtAlertPulse] = useState<AlertPulseData | null>(null);

  // Subscribe to KPI updates
  useEffect(() => {
    const unsub = onKpiUpdate((kpiData) => {
      setWsKpiData(kpiData);
      const totalUsers = kpiData.reduce((s, item) => s + item.activeUsers, 0);
      const totalDl = kpiData.reduce((s, item) => s + item.downloadThroughput, 0);
      const totalUl = kpiData.reduce((s, item) => s + item.uploadThroughput, 0);
      setUserHistory(prev => [...prev.slice(-(SPARKLINE_HISTORY_LEN - 1)), totalUsers]);
      setDlHistory(prev => [...prev.slice(-(SPARKLINE_HISTORY_LEN - 1)), totalDl]);
      setUlHistory(prev => [...prev.slice(-(SPARKLINE_HISTORY_LEN - 1)), totalUl]);
    });
    return unsub;
  }, [onKpiUpdate]);

  // Subscribe to live alerts
  useEffect(() => {
    const unsub = onLiveAlerts((newAlerts) => {
      setLiveAlerts(prev => [...newAlerts, ...prev].slice(0, 30));
    });
    return unsub;
  }, [onLiveAlerts]);

  // Subscribe to alert pulse
  useEffect(() => {
    const unsub = onAlertPulse((pulse) => {
      setRtAlertPulse(pulse);
    });
    return unsub;
  }, [onAlertPulse]);

  // Merge WebSocket KPI data into query data
  const overview = data?.overview;
  const byTech = useMemo(() => {
    const base = data?.byTech ?? [];
    if (wsKpiData.length === 0) return base;
    return base.map((row) => {
      const wsItem = wsKpiData.find((w) => w.technology === row.technology);
      if (!wsItem) return row;
      return {
        ...row,
        users: wsItem.activeUsers,
        download: wsItem.downloadThroughput,
        upload: wsItem.uploadThroughput,
        availability: wsItem.availability,
      };
    });
  }, [data?.byTech, wsKpiData]);

  const mergedOverview = useMemo(() => {
    if (!overview) return overview;
    if (wsKpiData.length === 0) return overview;
    const totalUsers = wsKpiData.reduce((sum, item) => sum + item.activeUsers, 0);
    const totalDl = wsKpiData.reduce((sum, item) => sum + item.downloadThroughput, 0);
    const totalUl = wsKpiData.reduce((sum, item) => sum + item.uploadThroughput, 0);
    const avgAvail = wsKpiData.reduce((sum, item) => sum + item.availability, 0) / wsKpiData.length;
    return {
      ...overview,
      totalUsers,
      totalDownloadMbps: totalDl,
      totalUploadMbps: totalUl,
      avgAvailability: avgAvail,
    };
  }, [overview, wsKpiData]);

  const topLoaded = data?.topLoadedSites ?? [];
  const recentAlerts = data?.recentAlerts ?? [];
  const energy = data?.energySummary;
  const incidents = data?.incidentSummary;

  // Merge API alerts with live WebSocket alerts
  const allRecentAlerts = useMemo(() => {
    const apiAlerts = recentAlerts.map(a => ({
      id: a.id,
      siteName: a.siteName ?? 'Unknown',
      siteCode: a.siteCode ?? '',
      technology: a.technology,
      metric: a.metric,
      value: a.value,
      threshold: a.threshold,
      severity: a.severity,
      message: a.message,
      createdAt: a.createdAt,
    }));
    // Merge live alerts (they come with siteName already)
    const combined = [...liveAlerts, ...apiAlerts];
    // Deduplicate by ID
    const seen = new Set<string>();
    return combined.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    }).slice(0, 20);
  }, [recentAlerts, liveAlerts]);

  const totalAvail = mergedOverview?.avgAvailability ?? 0;
  const totalDlNow = mergedOverview?.totalDownloadMbps ?? 0;
  const totalUlNow = mergedOverview?.totalUploadMbps ?? 0;
  const totalUsersNow = mergedOverview?.totalUsers ?? 0;
  const totalAlertCount = rtAlertPulse
    ? rtAlertPulse.unresolvedCritical + rtAlertPulse.unresolvedWarning
    : (mergedOverview?.activeAlerts ?? 0);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('title.live')}</h2>
            <p className="text-sm text-muted-foreground">{t('live.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            {isConnected ? '● LIVE (WebSocket)' : '● RECONNECTING…'}
          </div>
          <ExportButton data={topLoaded as unknown as Record<string, unknown>[]} filenamePrefix="live" columns={[{ key: 'siteName', header: 'Site' }, { key: 'technology', header: 'Technology' }, { key: 'prbUtilization', header: 'Load (%)' }, { key: 'activeUsers', header: 'Users' }]} />
        </div>
      </div>

      {/* KPI Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiSparkCard
          label={t('live.users')}
          value={totalUsersNow.toLocaleString()}
          icon={Users}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-500/10"
          trend="up"
          sparkData={userHistory}
          sparkColor="#10B981"
          isLive={isConnected}
        />
        <KpiSparkCard
          label={t('live.download')}
          value={`${totalDlNow.toFixed(1)} Mbps`}
          icon={Download}
          color="text-cyan-600 dark:text-cyan-400"
          bg="bg-cyan-500/10"
          trend="up"
          sparkData={dlHistory}
          sparkColor="#06B6D4"
          isLive={isConnected}
        />
        <KpiSparkCard
          label={t('live.upload')}
          value={`${totalUlNow.toFixed(1)} Mbps`}
          icon={Upload}
          color="text-teal-600 dark:text-teal-400"
          bg="bg-teal-500/10"
          trend="up"
          sparkData={ulHistory}
          sparkColor="#14B8A6"
          isLive={isConnected}
        />
        <KpiSparkCard
          label={t('th.availability')}
          value={`${totalAvail.toFixed(1)}%`}
          icon={Wifi}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-500/10"
          trend={totalAvail >= 99 ? 'up' : totalAvail >= 97 ? 'neutral' as const : 'down' as const}
          isLive={isConnected}
        />
        <KpiSparkCard
          label={t('live.power')}
          value={`${((mergedOverview?.totalPowerW ?? 0) / 1000).toFixed(1)} kW`}
          icon={Zap}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-500/10"
          trend="neutral" as const
          isLive={false}
        />
        <KpiSparkCard
          label={t('live.activeAlerts')}
          value={String(totalAlertCount)}
          icon={AlertTriangle}
          color="text-red-600 dark:text-red-400"
          bg="bg-red-500/10"
          trend={totalAlertCount > 5 ? 'down' as const : 'neutral' as const}
          isLive={isConnected}
        />
      </div>

      {/* Circular Gauges Row */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            {t('live.realtimeGauges')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-4">
            <div className="relative flex flex-col items-center">
              <CircularGauge
                value={totalAvail}
                max={100}
                size={110}
                strokeWidth={10}
                label={t('th.availability')}
                unit="%"
              />
            </div>
            <div className="relative flex flex-col items-center">
              <CircularGauge
                value={Math.min((totalDlNow / 500) * 100, 100)}
                max={100}
                size={110}
                strokeWidth={10}
                label={t('live.download')}
                unit="%"
                colorFn={(v) => v > 80 ? 'text-emerald-500' : v > 50 ? 'text-amber-500' : 'text-red-500'}
              />
            </div>
            <div className="relative flex flex-col items-center">
              <CircularGauge
                value={byTech.length > 0
                  ? byTech.reduce((s, t) => s + t.availability, 0) / byTech.length
                  : 0}
                max={100}
                size={110}
                strokeWidth={10}
                label={t('live.avgTechHealth')}
                unit="%"
              />
            </div>
            <div className="relative flex flex-col items-center">
              <CircularGauge
                value={Math.min((totalUsersNow / 15000) * 100, 100)}
                max={100}
                size={110}
                strokeWidth={10}
                label={t('live.users')}
                unit="%"
                colorFn={(v) => v > 70 ? 'text-emerald-500' : v > 40 ? 'text-amber-500' : 'text-red-500'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
                    <TableCell className="text-right text-sm">{(row.download ?? 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right text-sm">{(row.upload ?? 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {(row.availability ?? 0).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right text-sm">{((row.power ?? 0) / 1000).toFixed(1)}</TableCell>
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
                    formatter={(value: number) => [(value ?? 0).toFixed(1), 'Load']}
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

        {/* Live Alert Feed */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{t('live.recentAlerts')}</CardTitle>
              {liveAlerts.length > 0 && (
                <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
                  {t('ws.live')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              <AnimatePresence>
                {allRecentAlerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-3 rounded-md border p-3"
                  >
                    <Badge variant={severityVariant[alert.severity] || 'outline'} className="mt-0.5 shrink-0 text-[10px]">
                      {alert.severity}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs font-medium mb-0.5">
                        <span className="truncate">{alert.siteName}</span>
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
                  </motion.div>
                ))}
              </AnimatePresence>
              {allRecentAlerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-xs">{t('live.noUnresolved')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Cards: Energy + Incidents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-500" />
              {t('live.energyTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('live.power')}</p>
                <p className="text-lg font-bold mt-0.5">{(energy?.totalPowerKw ?? 0).toFixed(1)}<span className="text-xs font-normal text-muted-foreground ml-0.5">{t('unit.kw')}</span></p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('live.co2')}</p>
                <p className="text-lg font-bold mt-0.5">{(energy?.totalCO2kg ?? 0).toFixed(1)}<span className="text-xs font-normal text-muted-foreground ml-0.5">kg</span></p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('live.sleepMode')}</p>
                <p className="text-lg font-bold mt-0.5">{energy?.sitesInSleep ?? 0}<span className="text-xs font-normal text-muted-foreground ml-0.5">{t('unit.sites')}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              {t('live.incidentTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('status.open')}</p>
                <p className="text-lg font-bold mt-0.5 text-red-600 dark:text-red-400">{incidents?.open ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('live.investigating')}</p>
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

// ── Sub-components ──────────────────────────────────────────────────────────────

function KpiSparkCard({
  label, value, icon: Icon, color, bg, trend, sparkData, sparkColor, isLive,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  color: string;
  bg: string;
  trend: 'up' | 'down' | 'neutral';
  sparkData?: number[];
  sparkColor?: string;
  isLive: boolean;
}) {
  const t = useT();
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="flex items-center gap-1">
            {isLive && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
            )}
            <div className={`p-1.5 rounded-md ${bg}`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
          </div>
        </div>
        <p className="text-xl font-bold tabular-nums">{value}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <TrendIcon className={`h-3 w-3 ${trendColor}`} />
            <span className="text-[11px] text-muted-foreground">{isLive ? t('ws.realtime') : t('ws.snapshot')}</span>
          </div>
          {sparkData && sparkData.length >= 2 && (
            <SparkLine data={sparkData} width={60} height={20} color={sparkColor ?? '#10B981'} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
