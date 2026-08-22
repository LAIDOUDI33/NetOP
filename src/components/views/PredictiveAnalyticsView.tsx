'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, Activity,
  Users, DollarSign, BarChart3, Zap, Radio, Brain, Loader2, Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// ==================== TYPES ====================

interface DashboardData {
  capacity: { total: number; highRisk: number; avgConfidence: number; criticalCount: number };
  churn: { totalAtRisk: number; totalRevenue: number; highRiskWilayas: number };
  fault: { total: number; critical: number; avgProbability: number };
  traffic: { avgGrowth: number; growingRegions: number; decliningRegions: number };
  revenue: { totalMonthly: number; avgGrowth: number; riskCount: number };
}

interface CapacityItem {
  id: string; technology: string; region: string; metric: string;
  currentValue: number; forecastValue: number; forecastHorizon: string;
  growthRate: number; capacityLimit: number; utilizationAtLimit: number;
  confidence: number; riskLevel: string; recommendation: string;
}

interface ChurnItem {
  id: string; wilaya: string; segmentName: string; technology: string;
  totalSubscribers: number; atRiskCount: number; highRiskCount: number;
  churnRate: number; predictedChurnRate: number; churnTrend: string;
  drivers: string[]; confidence: number; revenueAtRisk: number;
}

interface FaultItem {
  id: string; technology: string; component: string; faultType: string;
  probability: number; severity: string; status: string; confidence: number;
  indicators: string[]; recommendedAction: string; estimatedTimeToFail: string;
}

interface TrafficItem {
  id: string; region: string; technology: string; metric: string;
  currentDailyAvg: number; forecastedDailyAvg: number; growthRate: number;
  peakHour: string; peakDay: string; seasonality: string;
  forecastPoints: number[]; horizon: string; confidence: number; trendDirection: string;
}

interface RevenueItem {
  id: string; segment: string; metric: string; currentMonthly: number;
  forecastPoints: number[]; growthRate: number; annualGrowthRate: number;
  confidence: number; riskFactors: string[]; trendDirection: string; seasonalityIndex: number;
}

// ==================== HELPERS ====================

const fmt = (n: number) => n.toLocaleString();
const pct = (n: number) => `${n.toFixed(1)}%`;
const riskBadge = (level: string) => {
  const m: Record<string, { variant: 'destructive' | 'secondary' | 'outline'; cls: string }> = {
    critical: { variant: 'destructive', cls: '' },
    high: { variant: 'destructive', cls: 'border-current text-current' },
    medium: { variant: 'secondary', cls: '' },
    low: { variant: 'outline', cls: '' },
  };
  const c = m[level] ?? m.low;
  return <Badge variant={c.variant} className={c.cls}>{level}</Badge>;
};
const severityBadge = (s: string) => {
  const v = s === 'critical' ? 'destructive' as const : s === 'major' ? 'destructive' as const : s === 'minor' ? 'secondary' as const : 'outline' as const;
  return <Badge variant={v}>{s}</Badge>;
};
const trendIcon = (dir: string) => {
  if (dir === 'increasing' || dir === 'up') return <TrendingUp className="h-4 w-4 text-red-500" />;
  if (dir === 'decreasing' || dir === 'down') return <TrendingDown className="h-4 w-4 text-emerald-500" />;
  return <Minus className="h-4 w-4 text-amber-500" />;
};
const churnTrendIcon = (trend: string) => {
  if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-red-500" />;
  if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-emerald-500" />;
  return <Minus className="h-4 w-4 text-amber-500" />;
};

// ==================== SUB-VIEWS ====================

function OverviewTab({ dashboard, loading }: {
  dashboard: DashboardData | undefined; loading: boolean;
}) {
  const t = useT();
  const S = () => <Skeleton className="h-20 w-full rounded-lg" />;

  const summaryCards = loading
    ? [0, 1, 2, 3].map(i => <S key={i} />)
    : [
        { label: t('pred.totalPredictions'), value: fmt((dashboard?.capacity.total ?? 0) + (dashboard?.fault.total ?? 0)), icon: <BarChart3 className="h-5 w-5" />, color: 'text-blue-600' },
        { label: t('pred.avgConfidence'), value: pct(dashboard?.capacity.avgConfidence ?? 0), icon: <Shield className="h-5 w-5" />, color: 'text-emerald-600' },
        { label: t('pred.highRiskItems'), value: fmt((dashboard?.capacity.highRisk ?? 0) + (dashboard?.churn.highRiskWilayas ?? 0)), icon: <AlertTriangle className="h-5 w-5" />, color: 'text-amber-600' },
        { label: t('pred.criticalAlerts'), value: fmt((dashboard?.capacity.criticalCount ?? 0) + (dashboard?.fault.critical ?? 0)), icon: <Zap className="h-5 w-5" />, color: 'text-red-600' },
      ].map((c, i) => (
        <Card key={i} className="rounded-lg border bg-card p-4">
          <CardContent className="flex items-center gap-4">
            <div className={c.color}>{c.icon}</div>
            <div><p className="text-sm text-muted-foreground">{c.label}</p><p className="text-2xl font-bold">{c.value}</p></div>
          </CardContent>
        </Card>
      ));

  const miniCards = loading
    ? [0, 1, 2, 3].map(i => <S key={i} />)
    : [
        { label: t('pred.sitesAtRisk'), value: fmt(dashboard?.capacity.highRisk ?? 0), color: 'text-red-600' },
        { label: t('pred.atRiskSubscribers'), value: fmt(dashboard?.churn.totalAtRisk ?? 0), color: 'text-amber-600' },
        { label: t('pred.revenueAtRisk'), value: `${fmt(dashboard?.churn.totalRevenue ?? 0)} DZD`, color: 'text-orange-600' },
        { label: t('pred.trafficTrend'), value: pct(dashboard?.traffic.avgGrowth ?? 0), color: 'text-emerald-600' },
      ].map((c, i) => (
        <Card key={i} className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">{c.label}</p>
          <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
        </Card>
      ));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{summaryCards}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{miniCards}</div>
    </div>
  );
}

function CapacityTab() {
  const t = useT();
  const { data, isLoading } = useQuery<CapacityItem[]>({
    queryKey: ['pred-capacity'],
    queryFn: async () => { const r = await fetch('/api/predictive/capacity'); if (!r.ok) throw new Error('Failed to fetch capacity predictions'); return r.json(); },
  });
  const items = data ?? [];
  const highRisk = items.filter(i => i.riskLevel === 'critical' || i.riskLevel === 'high').length;
  const avgConf = items.length ? items.reduce((s, i) => s + i.confidence, 0) / items.length : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? [0,1,2].map(i=><Skeleton key={i} className="h-20 rounded-lg" />) : [
          { label: t('pred.forecast'), value: fmt(items.length) },
          { label: t('pred.highRiskItems'), value: fmt(highRisk), color: 'text-red-600' },
          { label: t('pred.avgConfidence'), value: pct(avgConf) },
        ].map((c,i)=>(
          <Card key={i} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-bold ${'color' in c ? (c as {color:string}).color : ''}`}>{c.value}</p>
          </Card>
        ))}
      </div>
      <Card className="rounded-lg border bg-card">
        <CardContent className="p-4 overflow-x-auto">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Table><TableHeader><TableRow>
              <TableHead>{t('th.region')}</TableHead>
              <TableHead>{t('th.technology')}</TableHead>
              <TableHead>{t('th.metric')}</TableHead>
              <TableHead>{t('th.currentValue')}</TableHead>
              <TableHead>{t('th.forecast')}</TableHead>
              <TableHead>{t('pred.growthRate')}</TableHead>
              <TableHead>{t('pred.riskLevel')}</TableHead>
              <TableHead>{t('pred.recommendation')}</TableHead>
            </TableRow></TableHeader><TableBody>
              {items.map(item=>(
                <TableRow key={item.id}>
                  <TableCell>{item.region}</TableCell>
                  <TableCell><Badge variant="outline">{item.technology}</Badge></TableCell>
                  <TableCell>{item.metric}</TableCell>
                  <TableCell className="font-mono">{fmt(item.currentValue)}</TableCell>
                  <TableCell className="font-mono">{fmt(item.forecastValue)}</TableCell>
                  <TableCell className={item.growthRate>0?'text-red-500':'text-emerald-500'}>{pct(item.growthRate)}</TableCell>
                  <TableCell>{riskBadge(item.riskLevel)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs" title={item.recommendation}>{item.recommendation}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChurnTab() {
  const t = useT();
  const [segFilter, setSegFilter] = useState('all');
  const { data, isLoading } = useQuery<ChurnItem[]>({
    queryKey: ['pred-churn'],
    queryFn: async () => { const r = await fetch('/api/predictive/churn'); if (!r.ok) throw new Error('Failed to fetch churn predictions'); return r.json(); },
  });
  const items = data ?? [];
  const segments = ['all', ...Array.from(new Set(items.map(i => i.segmentName)))];
  const filtered = segFilter === 'all' ? items : items.filter(i => i.segmentName === segFilter);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? [0,1,2].map(i=><Skeleton key={i} className="h-20 rounded-lg" />) : [
          { label: t('pred.atRiskSubscribers'), value: fmt(items.reduce((s,i)=>s+i.atRiskCount,0)) },
          { label: t('pred.revenueAtRisk'), value: `${fmt(items.reduce((s,i)=>s+i.revenueAtRisk,0))} DZD` },
          { label: t('pred.highRiskItems'), value: fmt(items.filter(i=>i.churnTrend==='increasing').length) },
        ].map((c,i)=>(
          <Card key={i} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {segments.map(s=>(
          <Badge key={s} variant={segFilter===s?'default':'outline'} className="cursor-pointer" onClick={()=>setSegFilter(s)}>
            {s==='all' ? t('filter.allTypes') : s}
          </Badge>
        ))}
      </div>
      <Card className="rounded-lg border bg-card">
        <CardContent className="p-4 overflow-x-auto">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Table><TableHeader><TableRow>
              <TableHead>{t('pred.wilayaBreakdown').replace(' Breakdown','')}</TableHead>
              <TableHead>{t('th.segmentName')}</TableHead>
              <TableHead>{t('th.users')}</TableHead>
              <TableHead>{t('pred.atRiskSubscribers')}</TableHead>
              <TableHead>{t('th.churnRisk')}</TableHead>
              <TableHead>{t('pred.churnTrend')}</TableHead>
              <TableHead>{t('pred.trend')}</TableHead>
              <TableHead>{t('pred.revenueAtRisk')}</TableHead>
              <TableHead>{t('pred.confidence')}</TableHead>
            </TableRow></TableHeader><TableBody>
              {filtered.map(item=>(
                <TableRow key={item.id}>
                  <TableCell>{item.wilaya}</TableCell>
                  <TableCell><Badge variant="outline">{item.segmentName}</Badge></TableCell>
                  <TableCell className="font-mono">{fmt(item.totalSubscribers)}</TableCell>
                  <TableCell className="font-mono text-red-600">{fmt(item.atRiskCount)}</TableCell>
                  <TableCell className="font-mono">{pct(item.churnRate)}</TableCell>
                  <TableCell className="font-mono">{pct(item.predictedChurnRate)}</TableCell>
                  <TableCell>{churnTrendIcon(item.churnTrend)}</TableCell>
                  <TableCell className="font-mono text-orange-600">{fmt(item.revenueAtRisk)} DZD</TableCell>
                  <TableCell><Progress value={item.confidence} className="w-16 h-2" /><span className="text-xs ml-1 text-muted-foreground">{pct(item.confidence)}</span></TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FaultsTab() {
  const t = useT();
  const { data, isLoading } = useQuery<FaultItem[]>({
    queryKey: ['pred-faults'],
    queryFn: async () => { const r = await fetch('/api/predictive/faults'); if (!r.ok) throw new Error('Failed to fetch fault predictions'); return r.json(); },
  });
  const items = data ?? [];
  const critical = items.filter(i => i.severity === 'critical').length;
  const avgProb = items.length ? items.reduce((s,i)=>s+i.probability,0)/items.length : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? [0,1,2].map(i=><Skeleton key={i} className="h-20 rounded-lg" />) : [
          { label: t('pred.predictedFaults'), value: fmt(items.length) },
          { label: t('pred.criticalAlerts'), value: fmt(critical), color: 'text-red-600' },
          { label: t('pred.faultProbability'), value: pct(avgProb) },
        ].map((c,i)=>(
          <Card key={i} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-bold ${'color' in c ? (c as {color:string}).color : ''}`}>{c.value}</p>
          </Card>
        ))}
      </div>
      <Card className="rounded-lg border bg-card">
        <CardContent className="p-4 overflow-x-auto">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Table><TableHeader><TableRow>
              <TableHead>{t('th.technology')}</TableHead>
              <TableHead>{t('th.component')}</TableHead>
              <TableHead>{t('th.faultType')}</TableHead>
              <TableHead>{t('th.probability')}</TableHead>
              <TableHead>{t('th.severity')}</TableHead>
              <TableHead>{t('th.status')}</TableHead>
              <TableHead>{t('pred.estimatedTTF')}</TableHead>
              <TableHead>{t('pred.recommendation')}</TableHead>
            </TableRow></TableHeader><TableBody>
              {items.map(item=>(
                <TableRow key={item.id}>
                  <TableCell><Badge variant="outline">{item.technology}</Badge></TableCell>
                  <TableCell>{item.component}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{item.faultType}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><Progress value={item.probability*100} className="w-16 h-2" /><span className="text-xs font-mono">{pct(item.probability*100)}</span></div></TableCell>
                  <TableCell>{severityBadge(item.severity)}</TableCell>
                  <TableCell><Badge variant={item.status==='open'?'destructive':'secondary'}>{item.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{item.estimatedTimeToFail}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={item.recommendedAction}>{item.recommendedAction}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrafficTab() {
  const t = useT();
  const [techFilter, setTechFilter] = useState('all');
  const [metricFilter, setMetricFilter] = useState('all');
  const { data, isLoading } = useQuery<TrafficItem[]>({
    queryKey: ['pred-traffic'],
    queryFn: async () => { const r = await fetch('/api/predictive/traffic'); if (!r.ok) throw new Error('Failed to fetch traffic predictions'); return r.json(); },
  });
  const items = data ?? [];
  const techs = ['all', ...Array.from(new Set(items.map(i => i.technology)))];
  const metrics = ['all', ...Array.from(new Set(items.map(i => i.metric)))];
  const filtered = items.filter(i =>
    (techFilter === 'all' || i.technology === techFilter) &&
    (metricFilter === 'all' || i.metric === metricFilter)
  );
  const growing = items.filter(i => i.trendDirection === 'increasing' || i.trendDirection === 'up').length;
  const declining = items.filter(i => i.trendDirection === 'decreasing' || i.trendDirection === 'down').length;
  const avgGrowth = items.length ? items.reduce((s,i)=>s+i.growthRate,0)/items.length : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? [0,1,2].map(i=><Skeleton key={i} className="h-20 rounded-lg" />) : [
          { label: t('pred.growthRate'), value: pct(avgGrowth) },
          { label: t('pred.trafficTrend'), value: fmt(growing), color: 'text-emerald-600' },
          { label: t('pred.dailyTraffic'), value: fmt(declining), color: 'text-red-600' },
        ].map((c,i)=>(
          <Card key={i} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-bold ${'color' in c ? (c as {color:string}).color : ''}`}>{c.value}</p>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {techs.map(s=>(
          <Badge key={s} variant={techFilter===s?'default':'outline'} className="cursor-pointer" onClick={()=>setTechFilter(s)}>
            {s==='all'?t('filter.allTechShort'):s}
          </Badge>
        ))}
        <span className="text-muted-foreground mx-1">|</span>
        {metrics.map(s=>(
          <Badge key={s} variant={metricFilter===s?'default':'outline'} className="cursor-pointer" onClick={()=>setMetricFilter(s)}>
            {s==='all'?t('filter.allMetrics'):s}
          </Badge>
        ))}
      </div>
      <Card className="rounded-lg border bg-card">
        <CardContent className="p-4 overflow-x-auto max-h-96 overflow-y-auto">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Table><TableHeader><TableRow>
              <TableHead>{t('th.region')}</TableHead>
              <TableHead>{t('th.technology')}</TableHead>
              <TableHead>{t('th.metric')}</TableHead>
              <TableHead>{t('th.current')}</TableHead>
              <TableHead>{t('th.forecast')}</TableHead>
              <TableHead>{t('pred.growthRate')}</TableHead>
              <TableHead>{t('pred.peakHour')}</TableHead>
              <TableHead>{t('pred.peakDay')}</TableHead>
              <TableHead>{t('pred.seasonality')}</TableHead>
              <TableHead>{t('pred.confidence')}</TableHead>
              <TableHead>{t('pred.trend')}</TableHead>
            </TableRow></TableHeader><TableBody>
              {filtered.map(item=>(
                <TableRow key={item.id}>
                  <TableCell>{item.region}</TableCell>
                  <TableCell><Badge variant="outline">{item.technology}</Badge></TableCell>
                  <TableCell>{item.metric}</TableCell>
                  <TableCell className="font-mono">{fmt(item.currentDailyAvg)}</TableCell>
                  <TableCell className="font-mono">{fmt(item.forecastedDailyAvg)}</TableCell>
                  <TableCell className={item.growthRate>0?'text-emerald-500':'text-red-500'}>{pct(item.growthRate)}</TableCell>
                  <TableCell>{item.peakHour}</TableCell>
                  <TableCell>{item.peakDay}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.seasonality}</TableCell>
                  <TableCell><Progress value={item.confidence} className="w-16 h-2" /><span className="text-xs ml-1 text-muted-foreground">{pct(item.confidence)}</span></TableCell>
                  <TableCell>{trendIcon(item.trendDirection)}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RevenueTab() {
  const t = useT();
  const { data, isLoading } = useQuery<RevenueItem[]>({
    queryKey: ['pred-revenue'],
    queryFn: async () => { const r = await fetch('/api/predictive/revenue'); if (!r.ok) throw new Error('Failed to fetch revenue predictions'); return r.json(); },
  });
  const items = data ?? [];
  const totalMonthly = items.reduce((s,i)=>s+i.currentMonthly,0);
  const avgGrowth = items.length ? items.reduce((s,i)=>s+i.growthRate,0)/items.length : 0;
  const riskCount = items.reduce((s,i)=>s+i.riskFactors.length,0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? [0,1,2].map(i=><Skeleton key={i} className="h-20 rounded-lg" />) : [
          { label: t('pred.monthlyRevenue'), value: `${fmt(totalMonthly)} DZD` },
          { label: t('pred.growthRate'), value: pct(avgGrowth) },
          { label: t('pred.riskFactors'), value: fmt(riskCount), color: 'text-amber-600' },
        ].map((c,i)=>(
          <Card key={i} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-bold ${'color' in c ? (c as {color:string}).color : ''}`}>{c.value}</p>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? [0,1,2,3,4,5].map(i=><Skeleton key={i} className="h-40 rounded-lg" />) : items.map(item=>(
          <Card key={item.id} className="rounded-lg border bg-card p-6">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                {item.segment}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">{t('th.metric')}</span><p className="font-mono font-medium">{item.metric}</p></div>
                <div><span className="text-muted-foreground">{t('pred.monthlyRevenue')}</span><p className="font-mono font-medium">{fmt(item.currentMonthly)} DZD</p></div>
                <div><span className="text-muted-foreground">{t('pred.growthRate')}</span><p className={`font-mono font-medium ${item.growthRate>=0?'text-emerald-600':'text-red-600'}`}>{pct(item.growthRate)}</p></div>
                <div><span className="text-muted-foreground">{t('pred.annualGrowth')}</span><p className={`font-mono font-medium ${item.annualGrowthRate>=0?'text-emerald-600':'text-red-600'}`}>{pct(item.annualGrowthRate)}</p></div>
                <div><span className="text-muted-foreground">{t('pred.confidence')}</span><div className="flex items-center gap-1"><Progress value={item.confidence} className="w-12 h-2" /><span className="font-mono text-xs">{pct(item.confidence)}</span></div></div>
                <div><span className="text-muted-foreground">{t('pred.seasonality')}</span><p className="font-mono font-medium">{item.seasonalityIndex.toFixed(2)}</p></div>
              </div>
              {item.riskFactors.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.riskFactors.map((rf,ri)=>(
                    <Badge key={ri} variant="outline" className="text-xs text-amber-700 border-amber-300">{rf}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== AI ANALYSIS TAB ====================

type AnalysisFocus = 'all' | 'capacity' | 'churn' | 'faults' | 'traffic' | 'revenue';

const FOCUS_OPTIONS: { value: AnalysisFocus; icon: typeof Brain; label: string }[] = [
  { value: 'all', icon: Activity, label: 'pred.overview' },
  { value: 'capacity', icon: Radio, label: 'pred.capacity' },
  { value: 'churn', icon: Users, label: 'pred.churn' },
  { value: 'faults', icon: Zap, label: 'pred.faults' },
  { value: 'traffic', icon: BarChart3, label: 'pred.traffic' },
  { value: 'revenue', icon: DollarSign, label: 'pred.revenue' },
];

function AiAnalysisTab() {
  const t = useT();
  const queryClient = useQueryClient();
  const [focus, setFocus] = useState<AnalysisFocus>('all');

  const { mutate: generateAnalysis, isPending, data: result } = useMutation({
    mutationFn: async (f: AnalysisFocus) => {
      const r = await fetch('/api/predictive/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus: f }),
      });
      if (!r.ok) throw new Error('Failed to generate analysis');
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pred-ai-analysis'] }); },
  });

  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-semibold text-sm">AI-Powered Predictive Analysis</p>
                <p className="text-xs text-muted-foreground">LLM analyzes all prediction models and generates executive insights with cross-domain correlations</p>
              </div>
            </div>
            <div className="sm:ml-auto flex items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {FOCUS_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <Badge
                      key={opt.value}
                      variant={focus === opt.value ? 'default' : 'outline'}
                      className="cursor-pointer text-xs gap-1"
                      onClick={() => setFocus(opt.value)}
                    >
                      <Icon className="h-3 w-3" />{t(opt.label)}
                    </Badge>
                  );
                })}
              </div>
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => generateAnalysis(focus)}
                className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Brain className="h-4 w-4 mr-1" />}
                {isPending ? 'Analyzing...' : 'Generate Analysis'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isPending && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI is analyzing prediction data across {focus === 'all' ? 'all domains' : focus}...
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      )}

      {result && !isPending && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-600" />
              AI Analysis Report
              <Badge variant="secondary" className="text-xs font-normal ml-auto">
                {new Date(result.generatedAt).toLocaleTimeString()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(result.dataPoints).filter(([,v]) => (v as number) > 0).map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-xs">
                  {k.replace(/([A-Z])/g, ' $1').trim()}: {(v as number)} data points
                </Badge>
              ))}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  ul: ({ children }) => <ul className="text-sm space-y-1 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="text-sm space-y-1 my-2 list-decimal list-inside">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  p: ({ children }) => <p className="text-sm leading-relaxed my-1.5">{children}</p>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>,
                }}
              >
                {result.analysis}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {!result && !isPending && (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Select a focus area and click &quot;Generate Analysis&quot; to get AI-powered insights</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== MAIN VIEW ====================

export default function PredictiveAnalyticsView() {
  const t = useT();

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ['pred-dashboard'],
    queryFn: async () => { const r = await fetch('/api/predictive/dashboard'); if (!r.ok) throw new Error('Failed to fetch predictive dashboard'); return r.json(); },
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><Activity className="h-3.5 w-3.5" />{t('pred.overview')}</TabsTrigger>
          <TabsTrigger value="ai-analysis" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />AI Analysis</TabsTrigger>
          <TabsTrigger value="capacity" className="gap-1.5"><Radio className="h-3.5 w-3.5" />{t('pred.capacity')}</TabsTrigger>
          <TabsTrigger value="churn" className="gap-1.5"><Users className="h-3.5 w-3.5" />{t('pred.churn')}</TabsTrigger>
          <TabsTrigger value="faults" className="gap-1.5"><Zap className="h-3.5 w-3.5" />{t('pred.faults')}</TabsTrigger>
          <TabsTrigger value="traffic" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />{t('pred.traffic')}</TabsTrigger>
          <TabsTrigger value="revenue" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" />{t('pred.revenue')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab dashboard={dashboard} loading={dashLoading} />
        </TabsContent>
        <TabsContent value="ai-analysis" className="mt-4"><AiAnalysisTab /></TabsContent>
        <TabsContent value="capacity" className="mt-4"><CapacityTab /></TabsContent>
        <TabsContent value="churn" className="mt-4"><ChurnTab /></TabsContent>
        <TabsContent value="faults" className="mt-4"><FaultsTab /></TabsContent>
        <TabsContent value="traffic" className="mt-4"><TrafficTab /></TabsContent>
        <TabsContent value="revenue" className="mt-4"><RevenueTab /></TabsContent>
      </Tabs>
    </div>
  );
}
