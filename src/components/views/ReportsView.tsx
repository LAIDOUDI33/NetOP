'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

const METRICS = [
  { value: 'downloadThroughput', label: 'Download Throughput (Mbps)' },
  { value: 'uploadThroughput', label: 'Upload Throughput (Mbps)' },
  { value: 'latency', label: 'Latency (ms)' },
  { value: 'availability', label: 'Availability (%)' },
  { value: 'dropRate', label: 'Drop Rate (%)' },
  { value: 'sinr', label: 'SINR (dB)' },
  { value: 'handoverSuccessRate', label: 'Handover Success Rate (%)' },
  { value: 'prbUtilization', label: 'PRB Utilization (%)' },
  { value: 'activeUsers', label: 'Active Users' },
];

interface KpiResponse {
  technologies: Technology[];
  timestamps: string[];
  data: Record<string, { values: number[]; sites: { siteId: string; siteName: string; technology: Technology; status: string; value: number }[] }>;
}

function formatTimestamp(ts: string) {
  // ts is already formatted as "HH:MM" from the API
  return ts;
}

function stdDev(arr: number[]) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squaredDiffs = arr.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

export default function ReportsView() {
  const [metric, setMetric] = useState('downloadThroughput');

  const { data, isLoading } = useQuery<KpiResponse>({
    queryKey: ['kpi-report', metric],
    queryFn: () => fetch(`/api/kpi?technology=all&metric=${metric}`).then(r => r.json()),
    refetchInterval: 60000,
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

  const rankedSites = useMemo(() => {
    if (!data?.data) return [];
    return Object.values(data.data)
      .flatMap(d => d.sites)
      .map(s => ({
        ...s,
        displayValue: metric === 'availability' || metric === 'dropRate' || metric === 'handoverSuccessRate' || metric === 'prbUtilization'
          ? `${s.value.toFixed(2)}%`
          : s.value.toFixed(2),
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, metric]);

  const summaryStats = useMemo(() => {
    if (!data?.data) return { min: 0, max: 0, avg: 0, stddev: 0 };
    const allValues = Object.values(data.data).flatMap(d => d.values);
    if (allValues.length === 0) return { min: 0, max: 0, avg: 0, stddev: 0 };
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const sd = stdDev(allValues);
    const isPercent = metric === 'availability' || metric === 'dropRate' || metric === 'handoverSuccessRate' || metric === 'prbUtilization';
    return {
      min: isPercent ? min.toFixed(2) + '%' : min.toFixed(2),
      max: isPercent ? max.toFixed(2) + '%' : max.toFixed(2),
      avg: isPercent ? avg.toFixed(2) + '%' : avg.toFixed(2),
      stddev: isPercent ? sd.toFixed(2) + '%' : sd.toFixed(2),
    };
  }, [data, metric]);

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 w-56" />
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const techs = data.technologies || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select Metric" />
          </SelectTrigger>
          <SelectContent>
            {METRICS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Combined Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {METRICS.find(m => m.value === metric)?.label} — All Technologies
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3" /> Minimum
                </p>
                <p className="text-xl font-bold mt-1">{summaryStats.min}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> Maximum
                </p>
                <p className="text-xl font-bold mt-1">{summaryStats.max}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Average
                </p>
                <p className="text-xl font-bold mt-1">{summaryStats.avg}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> Std Dev
                </p>
                <p className="text-xl font-bold mt-1">{summaryStats.stddev}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Site Performance Ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Site Performance Ranking — {METRICS.find(m => m.value === metric)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="max-h-96">
            <div className="min-w-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-12">#</TableHead>
                    <TableHead className="text-xs">Site</TableHead>
                    <TableHead className="text-xs">Technology</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankedSites.map((site, i) => (
                    <TableRow key={site.siteId}>
                      <TableCell className="text-xs text-muted-foreground">
                        {i < 3 ? (
                          <Badge variant={i === 0 ? 'default' : 'secondary'} className="w-6 justify-center text-xs font-bold">
                            {i + 1}
                          </Badge>
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </TableCell>
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
                      <TableCell className="text-xs text-right font-medium">{site.displayValue}</TableCell>
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