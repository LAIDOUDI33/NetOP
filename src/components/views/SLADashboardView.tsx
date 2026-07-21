'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import {
  Tooltip as ShTooltip,
  TooltipContent as ShTooltipContent,
  TooltipProvider as ShTooltipProvider,
  TooltipTrigger as ShTooltipTrigger,
} from '@/components/ui/tooltip';
import { ShieldCheck, AlertTriangle, Target, TrendingUp } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { TECH_BG_CLASSES, SEVERITY_BADGE_VARIANT, TECHNOLOGIES, formatNumber } from '@/lib/constants';
import type { Technology, AlertSeverity } from '@/types';

// ─── Types for the SLA API response ───────────────────────────────────
// API returns targetValue/actualValue, we derive unit from metric name
const METRIC_UNITS: Record<string, string> = {
  availability: '%',
  dropRate: '%',
  latency: 'ms',
  handoverSuccessRate: '%',
  prbUtilization: '%',
  downloadThroughput: 'Mbps',
};

interface SLATarget {
  id: string;
  technology: Technology;
  metric: string;
  targetValue: number;
  actualValue: number;
  condition: string;
  compliant: boolean;
  breachPercent?: number;
  severity: string;
}

interface SLASummary {
  total: number;
  compliant: number;
  breached: number;
  complianceRate: number;
}

interface SLAResponse {
  targets: SLATarget[];
  summary: SLASummary;
}

interface SLATrendPoint {
  date: string;
  compliance: number;
}

// ─── Circular Progress Component ──────────────────────────────────────
function CircularProgress({ value, size = 180 }: { value: number; size?: number }) {
  const t = useT();
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 95 ? '#10B981' : value >= 80 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>
          {value.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground mt-1">{t('sla.compliance')}</span>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────
function SLALoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-lg">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Skeleton className="h-[180px] w-[180px] rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
      <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
export default function SLADashboardView() {
  const t = useT();
  const { data, isLoading } = useQuery<SLAResponse>({
    queryKey: ['sla'],
    queryFn: () => fetch('/api/sla').then(r => r.json()),
    refetchInterval: 60000,
  });

  if (isLoading || !data) return <SLALoadingSkeleton />;

  const { summary, targets } = data;

  // Generate mock SLA trend data (slight improvement trend)
  const trendData: SLATrendPoint[] = Array.from({ length: 30 }, (_, i) => {
    const base = summary.complianceRate - 5 + (i / 29) * 8;
    const jitter = (Math.sin(i * 0.7) * 1.5) + (Math.cos(i * 1.3) * 0.8);
    return {
      date: `Day ${i + 1}`, // kept as-is for chart axis; i18n via tickFormatter if needed
      compliance: Number(Math.min(100, Math.max(70, base + jitter)).toFixed(1)),
    };
  });

  // Group targets by technology
  const techGroups = TECHNOLOGIES.map(tech => {
    const techTargets = targets.filter(t => t.technology === tech);
    const compliant = techTargets.filter(t => t.compliant).length;
    const breached = techTargets.filter(t => !t.compliant).length;
    const rate = techTargets.length > 0 ? (compliant / techTargets.length) * 100 : 100;
    return { tech, targets: techTargets, compliant, breached, rate };
  });

  // Breach details for table
  const breaches = targets.filter(t => !t.compliant).sort((a, b) => {
    const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    return (sevOrder[a.severity ?? 'info'] ?? 2) - (sevOrder[b.severity ?? 'info'] ?? 2);
  });

  return (
    <div className="space-y-6">
      {/* ── SLA Score Card ─────────────────────────────────────────── */}
      <Card className="mx-auto max-w-lg">
        <CardContent className="p-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wider">{t('sla.overallScore')}</span>
          </div>
          <CircularProgress value={summary.complianceRate} />
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold">
              {t('sla.targetsMet', { n: summary.compliant, m: summary.total })}
            </p>
            <p className="text-sm text-muted-foreground">
              {summary.breached > 0 ? (
                <span className="text-red-500 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('sla.activeBreaches', { n: summary.breached })}
                </span>
              ) : (
                <span className="text-emerald-600">{t('sla.allTargetsOk')}</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Technology SLA Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {techGroups.map(({ tech, targets: tt, compliant, breached, rate }) => (
          <Card key={tech}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{t('sla.techSla', { tech })}</CardTitle>
                <Badge className={TECH_BG_CLASSES[tech]}>{tech}</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className={`text-2xl font-bold ${rate >= 95 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    {rate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('sla.targets', { compliant, total: tt.length })}
                  </p>
                </div>
                {breached > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {t('sla.breaches', { n: breached })}
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {tt.map(t => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between text-xs px-2 py-1 rounded-md ${
                      t.compliant
                        ? 'bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-500/5 text-red-700 dark:text-red-400'
                    }`}
                  >
                    <span className="truncate font-medium">{t.metric}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span>{formatNumber(t.actualValue)} / {formatNumber(t.targetValue)}</span>
                      <span className="text-[10px] text-muted-foreground">{METRIC_UNITS[t.metric] || ''}</span>
                    </div>
                  </div>
                ))}
                {tt.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">{t('sla.noTargets')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── SLA Trend Chart ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">{t('sla.trend')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval={4}
                />
                <YAxis
                  domain={[70, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value: number) => [`${value}%`, t('sla.compliance')]}
                />
                <ReferenceLine
                  y={95}
                  stroke="#10B981"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{ value: t('sla.targetLine'), position: 'insideTopRight', fill: '#10B981', fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="compliance"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Breach Details Table ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-red-500" />
              <CardTitle className="text-base font-semibold">{t('sla.breachDetails')}</CardTitle>
            </div>
            <Badge variant="destructive" className="font-semibold">
              {t('sla.breaches', { n: breaches.length })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {breaches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mb-2 text-emerald-500" />
              <p className="text-sm font-medium">{t('sla.noBreaches')}</p>
              <p className="text-xs">{t('sla.allWithinThreshold')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">{t('th.technology')}</TableHead>
                    <TableHead>{t('th.metric')}</TableHead>
                    <TableHead className="text-right">{t('th.target')}</TableHead>
                    <TableHead className="text-right">{t('th.actual')}</TableHead>
                    <TableHead className="text-right">{t('th.breach')}</TableHead>
                    <TableHead className="w-[100px]">{t('th.severity')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breaches.map(breach => (
                    <TableRow key={breach.id}>
                      <TableCell>
                        <Badge className={TECH_BG_CLASSES[breach.technology]}>
                          {breach.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{breach.metric}</TableCell>
                      <TableCell className="text-right">
                        <ShTooltipProvider>
                          <ShTooltip>
                            <ShTooltipTrigger className="cursor-help text-emerald-600 dark:text-emerald-400">
                              {formatNumber(breach.targetValue)} {METRIC_UNITS[breach.metric] || ''}
                            </ShTooltipTrigger>
                            <ShTooltipContent>{t('sla.targetValue')}</ShTooltipContent>
                          </ShTooltip>
                        </ShTooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <ShTooltipProvider>
                          <ShTooltip>
                            <ShTooltipTrigger className="cursor-help text-red-600 dark:text-red-400 font-semibold">
                              {formatNumber(breach.actualValue)} {METRIC_UNITS[breach.metric] || ''}
                            </ShTooltipTrigger>
                            <ShTooltipContent>{t('sla.actualValue')}</ShTooltipContent>
                          </ShTooltip>
                        </ShTooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                          {breach.breachPercent !== undefined ? `${breach.breachPercent.toFixed(1)}%` : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={SEVERITY_BADGE_VARIANT[breach.severity as 'critical' | 'warning' | 'info'] ?? 'outline'}>
                          {breach.severity}
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
    </div>
  );
}