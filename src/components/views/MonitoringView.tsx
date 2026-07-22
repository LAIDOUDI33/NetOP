'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Server, Signal, TrendingUp, Clock, Users } from 'lucide-react';
import { useAppStore } from '@/store/app';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';
import type { MonitoringData, Technology } from '@/types';

const TECH_COLORS: Record<Technology, string> = {
  '2G': '#94A3B8',
  '3G': '#06B6D4',
  '4G': '#10B981',
  '5G': '#F59E0B',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  degraded: 'secondary',
  down: 'destructive',
  maintenance: 'outline',
};

function formatTimestamp(ts: string) {
  // ts is already formatted as "HH:MM" from the API
  return ts;
}

export default function MonitoringView() {
  const t = useT();
  const { selectedTechnology, setSelectedTechnology } = useAppStore();

  const { data, isLoading } = useQuery<MonitoringData>({
    queryKey: ['monitoring', selectedTechnology],
    queryFn: () => fetch(`/api/monitoring?technology=${selectedTechnology}`).then(r => r.json()),
    refetchInterval: 15000,
  });

  const trendData = useMemo(() => {
    if (!data?.trend) return [];
    return data.trend.timestamps.map((ts, i) => {
      const point: Record<string, string | number> = { time: formatTimestamp(ts) };
      Object.entries(data.trend.metrics).forEach(([key, values]) => {
        point[key] = values[i];
      });
      return point;
    });
  }, [data]);

  const metricLines = useMemo(() => {
    if (!data?.trend?.metrics) return [];
    const colors = ['#10B981', '#06B6D4', '#F59E0B', '#94A3B8', '#EF4444', '#8B5CF6'];
    return Object.keys(data.trend.metrics).map((key, i) => ({
      dataKey: key,
      color: colors[i % colors.length],
      name: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    }));
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Technology Tabs */}
      <Tabs value={selectedTechnology} onValueChange={(v) => setSelectedTechnology(v as Technology)}>
        <TabsList className="w-full sm:w-auto">
          {(Object.keys(TECH_COLORS) as Technology[]).map((tech) => (
            <TabsTrigger
              key={tech}
              value={tech}
              className="data-[state=active]:text-white"
              style={
                selectedTechnology === tech
                  ? { backgroundColor: TECH_COLORS[tech], color: '#fff' }
                  : undefined
              }
            >
              {tech}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('mon.activeSites')}</p>
            </div>
            <p className="text-xl font-bold mt-1">{data.summary.activeSites} <span className="text-sm text-muted-foreground font-normal">/ {data.summary.totalSites}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Signal className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('mon.avgSignal')}</p>
            </div>
            <p className="text-xl font-bold mt-1">{data.summary.avgSinr?.toFixed(1) || 'N/A'} <span className="text-sm text-muted-foreground font-normal">{t('unit.db')}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('mon.avgThroughput')}</p>
            </div>
            <p className="text-xl font-bold mt-1">{(data.summary.avgDownload ?? 0).toFixed(1)} <span className="text-sm text-muted-foreground font-normal">{t('unit.mbps')}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('mon.avgLatency')}</p>
            </div>
            <p className="text-xl font-bold mt-1">{(data.summary.avgLatency ?? 0).toFixed(1)} <span className="text-sm text-muted-foreground font-normal">{t('unit.ms')}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('mon.totalUsers')}</p>
            </div>
            <p className="text-xl font-bold mt-1">{(data.summary.totalUsers ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t('mon.kpiTrends', { tech: selectedTechnology })}</CardTitle>
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
                {metricLines.map((line) => (
                  <Line
                    key={line.dataKey}
                    type="monotone"
                    dataKey={line.dataKey}
                    stroke={line.color}
                    name={line.name}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sites Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">{t('mon.siteDetails', { tech: selectedTechnology })}</CardTitle>
          <ExportButton data={data.sites} filenamePrefix="monitoring" columns={[{ key: 'siteName', header: 'Site' }, { key: 'status', header: 'Status' }, { key: 'avgDownloadThroughput', header: 'DL (Mbps)' }, { key: 'avgUploadThroughput', header: 'UL (Mbps)' }, { key: 'avgLatency', header: 'Latency (ms)' }, { key: 'avgAvailability', header: 'Availability (%)' }, { key: 'avgActiveUsers', header: 'Users' }, { key: 'avgDropRate', header: 'Drop Rate (%)' }, { key: 'avgSinr', header: 'SINR (dB)' }]} />
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="max-h-96">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t('th.site')}</TableHead>
                    <TableHead className="text-xs">{t('th.status')}</TableHead>
                    <TableHead className="text-xs">{t('th.dl')}</TableHead>
                    <TableHead className="text-xs">{t('th.ul')}</TableHead>
                    <TableHead className="text-xs">{t('th.latency')}</TableHead>
                    <TableHead className="text-xs">{t('th.availability')}</TableHead>
                    <TableHead className="text-xs">{t('th.users')}</TableHead>
                    <TableHead className="text-xs">{t('th.dropRate')}</TableHead>
                    <TableHead className="text-xs">{t('th.sinr')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sites.map((site) => (
                    <TableRow key={site.siteId}>
                      <TableCell className="text-xs font-medium">{site.siteName}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[site.status]} className="text-xs">
                          {site.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{(site.avgDownloadThroughput ?? 0).toFixed(1)}</TableCell>
                      <TableCell className="text-xs">{(site.avgUploadThroughput ?? 0).toFixed(1)}</TableCell>
                      <TableCell className="text-xs">{(site.avgLatency ?? 0).toFixed(1)}</TableCell>
                      <TableCell className="text-xs">{(site.avgAvailability ?? 0).toFixed(1)}%</TableCell>
                      <TableCell className="text-xs">{Math.round(site.avgActiveUsers)}</TableCell>
                      <TableCell className="text-xs">{(site.avgDropRate ?? 0).toFixed(2)}%</TableCell>
                      <TableCell className="text-xs">{site.avgSinr?.toFixed(1) || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}