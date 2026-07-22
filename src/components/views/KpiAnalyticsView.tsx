'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store/app';
import type { Technology } from '@/types';

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

const METRIC_KEYS: Record<string, string> = {
  downloadThroughput: 'metric.downloadThroughput',
  uploadThroughput: 'metric.uploadThroughput',
  latency: 'metric.latency',
  availability: 'metric.availability',
  dropRate: 'metric.dropRate',
  sinr: 'metric.sinr',
  handoverSuccessRate: 'metric.handoverSuccessRate',
  prbUtilization: 'metric.prbUtilization',
  activeUsers: 'metric.activeUsers',
};

const METRIC_UNITS: Record<string, string> = {
  downloadThroughput: 'unit.mbps',
  uploadThroughput: 'unit.mbps',
  latency: 'unit.ms',
  availability: 'unit.percent',
  dropRate: 'unit.percent',
  sinr: 'unit.db',
  handoverSuccessRate: 'unit.percent',
  prbUtilization: 'unit.percent',
  activeUsers: '',
};

const METRIC_VALUES = ['downloadThroughput', 'uploadThroughput', 'latency', 'availability', 'dropRate', 'sinr', 'handoverSuccessRate', 'prbUtilization', 'activeUsers'] as const;

const TECHNOLOGIES: (Technology | 'all')[] = ['all', '2G', '3G', '4G', '5G'];

interface KpiResponse {
  technologies: Technology[];
  timestamps: string[];
  data: Record<string, { values: number[]; sites: { siteId: string; siteName: string; technology: Technology; status: string; value: number }[] }>;
}

function formatTimestamp(ts: string) {
  // ts is already formatted as "HH:MM" from the API
  return ts;
}

export default function KpiAnalyticsView() {
  const t = useT();
  const { selectedTechnology } = useAppStore();
  const [technology, setTechnology] = useState<Technology | 'all'>('all');
  const [metric, setMetric] = useState('downloadThroughput');

  const techParam = technology === 'all' ? 'all' : technology;

  const { data, isLoading } = useQuery<KpiResponse>({
    queryKey: ['kpi', techParam, metric],
    queryFn: () => fetch(`/api/kpi?technology=${techParam}&metric=${metric}`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.timestamps.map((ts, i) => {
      const point: Record<string, string | number> = { time: formatTimestamp(ts) };
      if (data.data) {
        Object.entries(data.data).forEach(([tech, techData]) => {
          point[tech] = techData.values[i];
        });
      }
      return point;
    });
  }, [data]);

  const allSites = useMemo(() => {
    if (!data?.data) return [];
    return Object.values(data.data).flatMap(d => d.sites);
  }, [data]);

  const formattedSites = useMemo(() => {
    return allSites.map(s => ({
      ...s,
      formattedValue: metric === 'availability' || metric === 'dropRate' || metric === 'handoverSuccessRate' || metric === 'prbUtilization'
        ? `${(s.value ?? 0).toFixed(2)}%`
        : (s.value ?? 0).toFixed(2),
    })).sort((a, b) => b.value - a.value);
  }, [allSites, metric]);

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-56" />
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  const techs = data.technologies || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={technology} onValueChange={(v) => setTechnology(v as Technology | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('filter.technology')} />
          </SelectTrigger>
          <SelectContent>
            {TECHNOLOGIES.map((tech) => (
              <SelectItem key={tech} value={tech}>{tech === 'all' ? t('filter.allTech') : tech}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder={t('filter.metric')} />
          </SelectTrigger>
          <SelectContent>
            {METRIC_VALUES.map((m) => (
              <SelectItem key={m} value={m}>{t(METRIC_KEYS[m])}{METRIC_UNITS[m] ? ` (${t(METRIC_UNITS[m])})` : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {t('kpi.trend', { metric: t(METRIC_KEYS[metric]) + (METRIC_UNITS[metric] ? ` (${t(METRIC_UNITS[metric])})` : '') })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {techs.map((tech) => (
                  <Line
                    key={tech}
                    type="monotone"
                    dataKey={tech}
                    stroke={TECH_COLORS[tech]}
                    name={tech}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Site Comparison Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t('kpi.siteComparison', { metric: t(METRIC_KEYS[metric]) + (METRIC_UNITS[metric] ? ` (${t(METRIC_UNITS[metric])})` : '') })}</CardTitle>
          <ExportButton data={formattedSites} filenamePrefix="kpi" columns={[{ key: 'siteName', header: 'Site' }, { key: 'technology', header: 'Technology' }, { key: 'status', header: 'Status' }, { key: 'value', header: 'Value' }]} />
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="max-h-96">
            <div className="min-w-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">{t('th.site')}</TableHead>
                    <TableHead className="text-xs">{t('th.technology')}</TableHead>
                    <TableHead className="text-xs">{t('th.status')}</TableHead>
                    <TableHead className="text-xs text-right">{t('th.value')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formattedSites.map((site, i) => (
                    <TableRow key={site.siteId}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium">{site.siteName}</TableCell>
                      <TableCell>
                        <Badge
                          className="text-xs"
                          style={{ backgroundColor: TECH_COLORS[site.technology as Technology], color: '#fff' }}
                        >
                          {site.technology}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[site.status]} className="text-xs">
                          {site.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">{site.formattedValue}</TableCell>
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