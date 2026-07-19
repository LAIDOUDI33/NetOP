'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip as ShTooltip,
  TooltipContent as ShTooltipContent,
  TooltipProvider as ShTooltipProvider,
  TooltipTrigger as ShTooltipTrigger,
} from '@/components/ui/tooltip';
import { GitBranch, BarChart3, Network, Building2 } from 'lucide-react';
import {
  TECH_COLORS, TECH_BG_CLASSES, TECHNOLOGIES,
} from '@/lib/constants';
import type { Technology, DashboardData, MonitoringData } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────
interface TechMonitoringCache {
  [key: string]: MonitoringData | undefined;
}

interface VendorKpi {
  vendor: string;
  availability: number;
  throughput: number;
  latency: number;
  handoverSuccess: number;
  signalQuality: number;
}

// ─── Radar metric definitions ─────────────────────────────────────────
const RADAR_METRICS = [
  { key: 'throughput', label: 'Throughput', max: 200 },
  { key: 'latency', label: 'Latency (inv.)', max: 100, inverted: true },
  { key: 'availability', label: 'Availability', max: 100 },
  { key: 'handover', label: 'Handover', max: 100 },
  { key: 'signal', label: 'Signal Quality', max: 100 },
] as const;

// Vendor chart colors
const VENDOR_COLORS: Record<string, string> = {
  Ericsson: '#10B981',
  Huawei: '#EF4444',
  Nokia: '#06B6D4',
  ZTE: '#F59E0B',
};

// ─── Loading Skeleton ─────────────────────────────────────────────────
function CorrelationLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
      </div>
      <Card><CardContent className="p-6"><Skeleton className="h-80 w-full" /></CardContent></Card>
      <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
    </div>
  );
}

// ─── Compute correlation score between two tech summaries ─────────────
function computeCorrelation(
  a: { throughput: number; latency: number; availability: number; handover: number; signal: number },
  b: { throughput: number; latency: number; availability: number; handover: number; signal: number },
): number {
  // Normalize and compute a balance score: 100 = perfectly balanced, 0 = completely imbalanced
  const pairs: [number, number][] = [
    [a.throughput, b.throughput],
    [100 - a.latency, 100 - b.latency], // invert latency
    [a.availability, b.availability],
    [a.handover, b.handover],
    [a.signal, b.signal],
  ];
  const maxScore = pairs.length * 100;
  const diffSum = pairs.reduce((sum, [x, y]) => sum + Math.abs(x - y), 0);
  return Number((100 - (diffSum / maxScore) * 100).toFixed(1));
}

function getCorrelationColor(score: number): string {
  if (score >= 85) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
  if (score >= 70) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20';
  return 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20';
}

// ─── Main Component ───────────────────────────────────────────────────
export default function CorrelationView() {
  const dashboardQuery = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    refetchInterval: 60000,
  });

  const tech2gQuery = useQuery<MonitoringData>({
    queryKey: ['monitoring', '2G'],
    queryFn: () => fetch('/api/monitoring?technology=2G').then(r => r.json()),
    refetchInterval: 60000,
  });

  const tech3gQuery = useQuery<MonitoringData>({
    queryKey: ['monitoring', '3G'],
    queryFn: () => fetch('/api/monitoring?technology=3G').then(r => r.json()),
    refetchInterval: 60000,
  });

  const tech4gQuery = useQuery<MonitoringData>({
    queryKey: ['monitoring', '4G'],
    queryFn: () => fetch('/api/monitoring?technology=4G').then(r => r.json()),
    refetchInterval: 60000,
  });

  const tech5gQuery = useQuery<MonitoringData>({
    queryKey: ['monitoring', '5G'],
    queryFn: () => fetch('/api/monitoring?technology=5G').then(r => r.json()),
    refetchInterval: 60000,
  });

  const isLoading =
    dashboardQuery.isLoading || tech2gQuery.isLoading || tech3gQuery.isLoading ||
    tech4gQuery.isLoading || tech5gQuery.isLoading;

  const dashboard = dashboardQuery.data;
  const monitoringCache: TechMonitoringCache = {
    '2G': tech2gQuery.data,
    '3G': tech3gQuery.data,
    '4G': tech4gQuery.data,
    '5G': tech5gQuery.data,
  };

  // ── Pie chart data (users by technology) ────────────────────────────
  const pieData = useMemo(() => {
    if (!dashboard) return [];
    return TECHNOLOGIES.map(tech => {
      const health = dashboard.techHealth.find(h => h.technology === tech);
      return {
        name: tech,
        value: health?.users ?? 0,
        fill: TECH_COLORS[tech],
      };
    }).filter(d => d.value > 0);
  }, [dashboard]);

  // ── Radar chart data ────────────────────────────────────────────────
  const radarData = useMemo(() => {
    if (!dashboard) return [];
    return RADAR_METRICS.map(metric => {
      const point: Record<string, string | number> = { metric: metric.label };
      TECHNOLOGIES.forEach(tech => {
        const mon = monitoringCache[tech];
        const health = dashboard.techHealth.find(h => h.technology === tech);
        let value = 0;
        switch (metric.key) {
          case 'throughput':
            value = mon?.summary.avgDownload ?? health?.throughput ?? 0;
            break;
          case 'latency':
            // Invert: higher latency = lower score. We map 0-100ms -> 100-0
            value = 100 - Math.min(100, (mon?.summary.avgLatency ?? health?.latency ?? 0));
            break;
          case 'availability':
            value = mon?.summary.avgAvailability ?? health?.availability ?? 0;
            break;
          case 'handover':
            value = mon?.summary.avgAvailability ?? 0; // fallback
            break;
          case 'signal':
            value = Math.min(100, ((mon?.summary.avgRsrp ?? -100) + 140) * (100 / 60));
            break;
        }
        // Normalize to 0-100 for radar
        point[tech] = Number(Math.min(100, Math.max(0, value)).toFixed(1));
      });
      return point;
    });
  }, [monitoringCache, dashboard.techHealth]);

  // ── Performance matrix data ─────────────────────────────────────────
  const techNorms = useMemo(() => {
    const norms: Record<string, { throughput: number; latency: number; availability: number; handover: number; signal: number }> = {};
    TECHNOLOGIES.forEach(tech => {
      const mon = monitoringCache[tech];
      const health = dashboard.techHealth.find(h => h.technology === tech);
      norms[tech] = {
        throughput: Math.min(100, (mon?.summary.avgDownload ?? health?.throughput ?? 0) / 2),
        latency: mon?.summary.avgLatency ?? health?.latency ?? 0,
        availability: mon?.summary.avgAvailability ?? health?.availability ?? 0,
        handover: mon?.summary.avgAvailability ?? 0,
        signal: Math.min(100, Math.max(0, ((mon?.summary.avgRsrp ?? -100) + 140) * (100 / 60))),
      };
    });
    return norms;
  }, [monitoringCache, dashboard.techHealth]);

  const matrixPairs: { a: Technology; b: Technology; score: number }[] = useMemo(() => {
    const pairs: { a: Technology; b: Technology; score: number }[] = [];
    for (let i = 0; i < TECHNOLOGIES.length; i++) {
      for (let j = i; j < TECHNOLOGIES.length; j++) {
        const a = TECHNOLOGIES[i];
        const b = TECHNOLOGIES[j];
        if (a === b) continue;
        const score = computeCorrelation(techNorms[a], techNorms[b]);
        pairs.push({ a, b, score });
      }
    }
    return pairs;
  }, [techNorms]);

  // ── Vendor performance data ─────────────────────────────────────────
  const vendorData: VendorKpi[] = useMemo(() => {
    const vendorMap: Record<string, { avail: number[]; dl: number[]; lat: number[]; sig: number[]; ho: number[] }> = {};

    (Object.values(monitoringCache) as MonitoringData[]).forEach(mon => {
      if (!mon) return;
      mon.sites.forEach(site => {
        const vendor = site.vendor ?? 'Unknown';
        if (!vendorMap[vendor]) {
          vendorMap[vendor] = { avail: [], dl: [], lat: [], sig: [], ho: [] };
        }
        vendorMap[vendor].avail.push(site.avgAvailability);
        vendorMap[vendor].dl.push(site.avgDownloadThroughput);
        vendorMap[vendor].lat.push(site.avgLatency);
        vendorMap[vendor].sig.push(Math.min(100, Math.max(0, ((site.avgRsrp ?? -100) + 140) * (100 / 60))));
        vendorMap[vendor].ho.push(site.avgHandoverSuccessRate);
      });
    });

    return Object.entries(vendorMap).map(([vendor, vals]) => ({
      vendor,
      availability: vals.avail.length > 0 ? vals.avail.reduce((a, b) => a + b, 0) / vals.avail.length : 0,
      throughput: vals.dl.length > 0 ? Math.min(100, (vals.dl.reduce((a, b) => a + b, 0) / vals.dl.length) / 2) : 0,
      latency: vals.lat.length > 0 ? 100 - Math.min(100, vals.lat.reduce((a, b) => a + b, 0) / vals.lat.length) : 0,
      signalQuality: vals.sig.length > 0 ? vals.sig.reduce((a, b) => a + b, 0) / vals.sig.length : 0,
      handoverSuccess: vals.ho.length > 0 ? vals.ho.reduce((a, b) => a + b, 0) / vals.ho.length : 0,
    })).sort((a, b) => b.availability - a.availability);
  }, [monitoringCache]);

  if (isLoading || !dashboard) return <CorrelationLoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* ── Explanation Card ────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Network className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">Cross-Technology Correlation Analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Analyze traffic distribution and performance correlation across 2G/3G/4G/5G technologies.
                This view helps identify imbalances between technology layers, optimize capacity allocation,
                and ensure consistent quality of service across the entire network stack.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Row 1: Pie + Radar ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Distribution Pie */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Traffic Distribution</CardTitle>
            </div>
            <CardDescription className="text-xs">Active users by technology</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number, name: string) => [value.toLocaleString(), `${name} Users`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Technology Comparison Radar */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Technology Comparison</CardTitle>
            </div>
            <CardDescription className="text-xs">Normalized KPI comparison across technologies</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid className="opacity-30" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {TECHNOLOGIES.map(tech => (
                    <Radar
                      key={tech}
                      name={tech}
                      dataKey={tech}
                      stroke={TECH_COLORS[tech]}
                      fill={TECH_COLORS[tech]}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Performance Matrix ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Performance Correlation Matrix</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Balance score between technology pairs. <span className="text-emerald-600 font-medium">Green</span> = balanced,{' '}
            <span className="text-amber-600 font-medium">Amber</span> = imbalance,{' '}
            <span className="text-red-600 font-medium">Red</span> = severe imbalance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              {/* Header row */}
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `80px repeat(${TECHNOLOGIES.length}, 1fr)` }}>
                <div />
                {TECHNOLOGIES.map(tech => (
                  <div key={tech} className="flex justify-center">
                    <Badge className={TECH_BG_CLASSES[tech]}>{tech}</Badge>
                  </div>
                ))}
              </div>

              {/* Matrix rows */}
              {TECHNOLOGIES.map((rowTech, rowIdx) => (
                <div key={rowTech} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `80px repeat(${TECHNOLOGIES.length}, 1fr)` }}>
                  {/* Row label */}
                  <div className="flex items-center justify-center">
                    <Badge className={TECH_BG_CLASSES[rowTech]}>{rowTech}</Badge>
                  </div>
                  {/* Cells */}
                  {TECHNOLOGIES.map((colTech, colIdx) => {
                    if (rowIdx === colIdx) {
                      // Diagonal: self-correlation = 100%
                      return (
                        <ShTooltipProvider key={`${rowTech}-${colTech}`}>
                          <ShTooltip>
                            <ShTooltipTrigger asChild>
                              <div className="h-16 rounded-lg bg-muted/50 flex items-center justify-center border border-border/50">
                                <span className="text-xs font-bold text-muted-foreground">—</span>
                              </div>
                            </ShTooltipTrigger>
                            <ShTooltipContent>Same technology</ShTooltipContent>
                          </ShTooltip>
                        </ShTooltipProvider>
                      );
                    }

                    const pair = matrixPairs.find(p =>
                      (p.a === rowTech && p.b === colTech) || (p.a === colTech && p.b === rowTech)
                    );
                    const score = pair?.score ?? 0;
                    const colorClass = getCorrelationColor(score);

                    return (
                      <ShTooltipProvider key={`${rowTech}-${colTech}`}>
                        <ShTooltip>
                          <ShTooltipTrigger asChild>
                            <div
                              className={`h-16 rounded-lg border flex flex-col items-center justify-center gap-0.5 cursor-help transition-colors hover:opacity-80 ${colorClass}`}
                            >
                              <span className="text-lg font-bold leading-none">{score.toFixed(0)}</span>
                              <span className="text-[9px] opacity-70">balance</span>
                            </div>
                          </ShTooltipTrigger>
                          <ShTooltipContent>
                            <div className="text-xs space-y-1">
                              <p className="font-semibold">{rowTech} ↔ {colTech}</p>
                              <p>Correlation Score: {score}/100</p>
                              <p>{score >= 85 ? 'Well balanced' : score >= 70 ? 'Minor imbalance detected' : 'Significant performance gap'}</p>
                            </div>
                          </ShTooltipContent>
                        </ShTooltip>
                      </ShTooltipProvider>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Vendor Performance ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Vendor Performance Comparison</CardTitle>
          </div>
          <CardDescription className="text-xs">Average KPI scores by equipment vendor (normalized to 0–100)</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {vendorData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Building2 className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">No vendor data available</p>
              <p className="text-xs">Vendor data will appear once monitoring data is loaded for each technology</p>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="vendor" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="availability" fill="#10B981" name="Availability" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="throughput" fill="#06B6D4" name="Throughput" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="latency" fill="#F59E0B" name="Latency (inv.)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="handoverSuccess" fill="#8B5CF6" name="Handover" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="signalQuality" fill="#EC4899" name="Signal" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}