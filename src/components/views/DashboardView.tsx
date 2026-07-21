'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Server, Users, TrendingUp, Activity,
  AlertTriangle, WifiOff, CheckCircle,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { DashboardData, Technology } from '@/types';

const TECH_COLORS: Record<Technology, string> = {
  '2G': '#94A3B8',
  '3G': '#06B6D4',
  '4G': '#10B981',
  '5G': '#F59E0B',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-600 dark:text-emerald-400',
  degraded: 'text-amber-600 dark:text-amber-400',
  down: 'text-red-600 dark:text-red-400',
  maintenance: 'text-slate-500',
};

const SEVERITY_VARIANT: Record<string, 'destructive' | 'secondary' | 'default' | 'outline'> = {
  critical: 'destructive',
  warning: 'secondary',
  info: 'default',
};

function formatTimestamp(ts: string) {
  // ts is already formatted as "HH:MM" from the API
  return ts;
}

export default function DashboardView() {
  const t = useT();
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    refetchInterval: 30000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  const healthData = data.techHealth.map(h => ({
    technology: h.technology,
    availability: h.availability,
    throughput: Number((h.throughput / 10).toFixed(1)),
    latency: Number((h.latency / 5).toFixed(1)),
  }));

  const trendData = data.kpiTrends.timestamps.map((ts, i) => ({
    time: formatTimestamp(ts),
    download: data.kpiTrends.download[i],
    upload: data.kpiTrends.upload[i],
    latency: data.kpiTrends.latency[i],
  }));

  const pieData = (Object.entries(data.sitesByTech) as [Technology, number][]).map(([tech, count]) => ({
    name: tech,
    value: count,
  }));

  const healthPercent = Number(data.avgAvailability.toFixed(1));

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('dash.totalSites')}</p>
                <p className="text-2xl font-bold">{data.totalSites}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                    <CheckCircle className="h-3 w-3" />{data.sitesByStatus.active}
                  </span>
                  <span className="text-xs text-amber-600 flex items-center gap-0.5">
                    <AlertTriangle className="h-3 w-3" />{data.sitesByStatus.degraded}
                  </span>
                  <span className="text-xs text-red-600 flex items-center gap-0.5">
                    <WifiOff className="h-3 w-3" />{data.sitesByStatus.down}
                  </span>
                </div>
              </div>
              <Server className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('dash.activeUsers')}</p>
                <p className="text-2xl font-bold">{data.totalActiveUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('dash.acrossAllTech')}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('dash.avgThroughput')}</p>
                <p className="text-2xl font-bold">
                  <span className="text-emerald-600">{data.avgThroughput.download.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground"> / </span>
                  <span className="text-cyan-600">{data.avgThroughput.upload.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground"> Mbps</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('dash.dlUlAvg')}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('dash.networkHealth')}</p>
                <p className={`text-2xl font-bold ${healthPercent >= 95 ? 'text-emerald-600' : healthPercent >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                  {healthPercent}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('dash.activeAlerts', { n: data.activeAlerts })}</p>
              </div>
              <Activity className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technology Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('dash.techHealthComp')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={healthData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="technology" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="availability" fill="#10B981" name={t('dash.availability')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="throughput" fill="#06B6D4" name={t('dash.throughputDiv10')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="latency" fill="#F59E0B" name={t('dash.latencyDiv5')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* KPI Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('dash.kpiTrends')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="download" stroke="#10B981" name="DL (Mbps)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="upload" stroke="#06B6D4" name="UL (Mbps)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="latency" stroke="#F59E0B" name="Latency (ms)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('dash.recentAlerts')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('dash.totalAlerts')}</span>
                <Badge variant="outline" className="font-semibold">{data.recentAlerts}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('dash.activeAlertsLabel')}</span>
                <Badge variant="destructive" className="font-semibold">{data.activeAlerts}</Badge>
              </div>
              <div className="flex gap-2 mt-3">
                <div className="flex-1 bg-red-500/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-red-600">{t('status.critical')}</p>
                </div>
                <div className="flex-1 bg-amber-500/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-amber-600">{t('status.warning')}</p>
                </div>
                <div className="flex-1 bg-cyan-500/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-cyan-600">{t('status.info')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technology Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('dash.techDistribution')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={TECH_COLORS[entry.name as Technology]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Avg Latency & Tech Health Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('dash.techSummary')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {data.techHealth.map((h) => (
                <div key={h.technology} className="flex items-center gap-3">
                  <Badge
                    className="w-10 justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: TECH_COLORS[h.technology], color: '#fff' }}
                  >
                    {h.technology}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{t('dash.sitesActive', { tech: h.technology, n: h.activeSites })}</span>
                      <span className="font-medium">{h.users} {t('unit.users')}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${h.availability}%`,
                          backgroundColor: TECH_COLORS[h.technology],
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium shrink-0">{h.availability.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}