'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useT } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart3, TrendingDown, DollarSign, Users, Activity, TrendingUp, ArrowLeftRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

// ==================== TYPES ====================

interface NCZone {
  id: string;
  zoneName: string;
  region: string;
  avgRsrp: number; avgRsrq: number; avgSinr: number;
  avgThroughputDl: number; avgThroughputUl: number;
  avgAvailability: number; avgDropRate: number;
  avgLatencyMs: number; avgPrbUtilization: number;
  avgArpu: number; totalRevenue: number; subscriberCount: number;
  churnRate: number; marketPenetration: number; satisfactionScore: number;
  rsrpVsChurn: number; throughputVsArpu: number;
  availabilityVsRevenue: number; dropRateVsChurn: number;
  latencyVsSatisfaction: number; prbUtilVsThroughput: number;
  networkScore: number; commercialScore: number; compositeScore: number;
  revenueLeakageEst: number;
}

type TFn = (k: string) => string;

// ==================== HELPERS ====================

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
function formatCurrency(n: number): string { return new Intl.NumberFormat('fr-DZ').format(n); }

function corrColor(r: number): string {
  const abs = Math.abs(r);
  if (r > 0) return abs > 0.8 ? '#059669' : abs > 0.6 ? '#34D399' : abs > 0.4 ? '#6EE7B7' : '#D1FAE5';
  return abs > 0.8 ? '#DC2626' : abs > 0.6 ? '#F87171' : abs > 0.4 ? '#FCA5A5' : '#FEE2E2';
}

function scoreColor(s: number): string {
  if (s >= 75) return '#059669';
  if (s >= 60) return '#F59E0B';
  return '#EF4444';
}

const SCATTER_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6', '#EC4899'];

// ==================== MAIN VIEW ====================

export default function NetworkCommercialView() {
  const t = useT();
  const [activeTab, setActiveTab] = useState('matrix');

  const { data, isLoading } = useQuery({
    queryKey: ['network-commercial'],
    queryFn: async () => { const r = await fetch('/api/network-commercial'); if (!r.ok) throw new Error('Failed to fetch network commercial data'); return r.json(); },
  });

  const zones = (data?.zones ?? []) as NCZone[];
  const summary = data?.summary;

  const cards = [
    { label: t('nc.totalZones'), value: summary ? String(summary.totalZones) : '—', icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('nc.avgComposite'), value: summary ? `${summary.avgCompositeScore.toFixed(1)}` : '—', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t('nc.avgCorrStrength'), value: summary ? `${(summary.avgCorrelationStrength * 100).toFixed(1)}%` : '—', icon: ArrowLeftRight, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: t('nc.totalLeakage'), value: summary ? formatNum(summary.totalRevenueLeakage) : '—', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: t('nc.avgNetwork'), value: summary ? `${summary.avgNetworkScore.toFixed(1)}` : '—', icon: TrendingUp, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: t('nc.avgCommercial'), value: summary ? `${summary.avgCommercialScore.toFixed(1)}` : '—', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-violet-500" />
          {t('title.networkCommercial')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t('nc.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5">
                  <div className={`rounded-lg p-2 ${c.bg}`}><Icon className={`h-4 w-4 ${c.color}`} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground truncate">{c.label}</p>
                    <p className="text-sm font-bold tracking-tight">{isLoading ? <Skeleton className="h-4 w-12" /> : c.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="matrix" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> {t('nc.tabMatrix')}</TabsTrigger>
          <TabsTrigger value="scatter" className="text-xs gap-1.5"><Activity className="h-3.5 w-3.5" /> {t('nc.tabScatter')}</TabsTrigger>
          <TabsTrigger value="zones" className="text-xs gap-1.5"><Users className="h-3.5 w-3.5" /> {t('nc.tabZoneScores')}</TabsTrigger>
          <TabsTrigger value="leakage" className="text-xs gap-1.5"><TrendingDown className="h-3.5 w-3.5" /> {t('nc.tabLeakage')}</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4 mt-4">
          <CorrelationMatrixTab zones={zones} summary={summary} loading={isLoading} t={t} />
        </TabsContent>
        <TabsContent value="scatter" className="space-y-4 mt-4">
          <ScatterAnalysisTab zones={zones} loading={isLoading} t={t} />
        </TabsContent>
        <TabsContent value="zones" className="space-y-4 mt-4">
          <ZoneScoresTab zones={zones} loading={isLoading} t={t} />
        </TabsContent>
        <TabsContent value="leakage" className="space-y-4 mt-4">
          <RevenueLeakageTab zones={zones} loading={isLoading} t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== TAB 1: CORRELATION MATRIX ====================

function CorrelationMatrixTab({ zones, summary, loading, t }: { zones: NCZone[]; summary: any; loading: boolean; t: TFn }) {
  const matrix = useMemo(() => {
    if (!zones.length) return [];
    const pairs = [
      { networkKpi: t('nc.rsrp'), key: 'rsrpVsChurn', commercialKpi: t('nc.churnRate') },
      { networkKpi: t('nc.throughputDl'), key: 'throughputVsArpu', commercialKpi: t('nc.arpu') },
      { networkKpi: t('nc.availability'), key: 'availabilityVsRevenue', commercialKpi: t('nc.revenue') },
      { networkKpi: t('nc.dropRate'), key: 'dropRateVsChurn', commercialKpi: t('nc.churnRate') },
      { networkKpi: t('nc.latency'), key: 'latencyVsSatisfaction', commercialKpi: t('nc.satisfaction') },
      { networkKpi: t('nc.prbUtil'), key: 'prbUtilVsThroughput', commercialKpi: t('nc.throughputDl') },
    ];
    // Compute average R across all zones for each pair
    return pairs.map(p => {
      const avgR = zones.reduce((s, z) => s + (z as any)[p.key], 0) / zones.length;
      return { ...p, r: Number(avgR.toFixed(3)) };
    });
  }, [zones, t]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t('nc.corrMatrix')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('nc.corrMatrixDesc')}</p>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[320px] w-full" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">{t('nc.networkKpi')}</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">{t('nc.commercialKpi')}</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">R</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">|R|</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">R²</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Strength</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-medium">{row.networkKpi}</td>
                      <td className="py-3 px-3">{row.commercialKpi}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold" style={{ color: corrColor(row.r) }}>
                        {row.r > 0 ? '+' : ''}{row.r.toFixed(3)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{Math.abs(row.r).toFixed(3)}</td>
                      <td className="py-3 px-3 text-center font-mono">{(row.r * row.r).toFixed(3)}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.abs(row.r) * 100}%`, backgroundColor: corrColor(row.r) }} />
                          </div>
                          <span className="text-[10px] font-medium" style={{ color: corrColor(row.r) }}>
                            {Math.abs(row.r) >= 0.8 ? 'Strong' : Math.abs(row.r) >= 0.6 ? 'Moderate' : 'Weak'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {summary && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2 bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t('nc.strongestCorr')}</p>
                <p className="text-sm font-bold">{summary.strongestCorrelation?.pair}: <span className="text-emerald-500">{summary.strongestCorrelation?.value}</span></p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2 bg-amber-500/10"><Activity className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t('nc.weakestCorr')}</p>
                <p className="text-sm font-bold">{summary.weakestCorrelation?.pair}: <span className="text-amber-500">{summary.weakestCorrelation?.value}</span></p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2 bg-violet-500/10"><ArrowLeftRight className="h-5 w-5 text-violet-500" /></div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t('nc.avgCorrStrength')}</p>
                <p className="text-sm font-bold"><span className="text-violet-500">{(summary.avgCorrelationStrength * 100).toFixed(1)}%</span> avg |R|</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ==================== TAB 2: SCATTER ANALYSIS ====================

function ScatterAnalysisTab({ zones, loading, t }: { zones: NCZone[]; loading: boolean; t: TFn }) {
  const scatterPlots = useMemo(() => [
    {
      title: t('nc.rsrpChurnScatter'),
      xKey: 'avgRsrp', yKey: 'churnRate',
      xLabel: t('nc.rsrp'), yLabel: t('nc.churnRate'),
      xDomain: [-115, -88], yDomain: [3, 10],
      color: SCATTER_COLORS[0],
      data: zones.map(z => ({ x: z.avgRsrp, y: z.churnRate, z: z.zoneName, r: z.region })),
    },
    {
      title: t('nc.throughputArpuScatter'),
      xKey: 'avgThroughputDl', yKey: 'avgArpu',
      xLabel: t('nc.throughputDl'), yLabel: t('nc.arpu'),
      xDomain: [8, 50], yDomain: [1200, 3800],
      color: SCATTER_COLORS[1],
      data: zones.map(z => ({ x: z.avgThroughputDl, y: z.avgArpu, z: z.zoneName, r: z.region })),
    },
    {
      title: t('nc.availRevenueScatter'),
      xKey: 'avgAvailability', yKey: 'totalRevenue',
      xLabel: t('nc.availability'), yLabel: t('nc.revenue'),
      xDomain: [92, 100], yDomain: [10000000, 130000000],
      color: SCATTER_COLORS[2],
      data: zones.map(z => ({ x: z.avgAvailability, y: z.totalRevenue, z: z.zoneName, r: z.region })),
    },
  ], [zones, t]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('nc.scatterAnalysis')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[600px] w-full" /> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {scatterPlots.map((plot, i) => (
              <div key={i}>
                <p className="text-xs font-semibold mb-2 text-center">{plot.title}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" name={plot.xLabel} type="number" domain={plot.xDomain} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="y" name={plot.yLabel} type="number" domain={plot.yDomain} tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatNum(v)} />
                    <RTooltip
                      formatter={(_v: number, _n: string, p: any) => [p.payload?.z, '']}
                      labelFormatter={(_l: string, p: any) => `${plot.xLabel}: ${p.payload?.x}, ${plot.yLabel}: ${typeof p.payload?.y === 'number' ? formatNum(p.payload.y) : p.payload?.y}`}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Scatter data={plot.data} fill={plot.color}>
                      {plot.data.map((_, idx) => (
                        <Cell key={idx} fill={plot.color} fillOpacity={0.7} stroke={plot.color} strokeWidth={1} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== TAB 3: ZONE SCORES ====================

function ZoneScoresTab({ zones, loading, t }: { zones: NCZone[]; loading: boolean; t: TFn }) {
  const top5 = zones.slice(0, 5);
  const bottom5 = [...zones].reverse().slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Radar for top zone */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('nc.zoneHealth')}</CardTitle></CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[350px] w-full" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={top5.map(z => ({
                zone: z.zoneName.split('-').slice(1).join(' '),
                [t('nc.networkHealth')]: z.networkScore,
                [t('nc.commercialHealth')]: z.commercialScore,
                [t('nc.satisfaction')]: z.satisfactionScore,
                [t('nc.marketPen')]: z.marketPenetration,
                [t('nc.availability')]: z.avgAvailability,
              }))}>
                <PolarGrid />
                <PolarAngleAxis dataKey="zone" tick={{ fontSize: 9 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar name="Top 5" dataKey={t('nc.networkHealth')} stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Top 5" dataKey={t('nc.commercialHealth')} stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} />
                <RTooltip contentStyle={{ fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('nc.compositeHealth')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : (
            <ScrollArea className="max-h-[380px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('nc.zoneName')}</TableHead>
                    <TableHead>{t('nc.region')}</TableHead>
                    <TableHead className="text-right">{t('nc.networkHealth')}</TableHead>
                    <TableHead className="text-right">{t('nc.commercialHealth')}</TableHead>
                    <TableHead className="text-right">{t('nc.compositeHealth')}</TableHead>
                    <TableHead className="text-right">{t('nc.churnRate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map(z => (
                    <TableRow key={z.id}>
                      <TableCell className="font-medium text-xs">{z.zoneName}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{z.region}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs" style={{ color: scoreColor(z.networkScore) }}>{z.networkScore.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono text-xs" style={{ color: scoreColor(z.commercialScore) }}>{z.commercialScore.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold" style={{ color: scoreColor(z.compositeScore) }}>{z.compositeScore.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className={z.churnRate >= 7 ? 'text-red-500 font-bold' : z.churnRate >= 5.5 ? 'text-amber-500' : 'text-emerald-500'}>
                          {z.churnRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== TAB 4: REVENUE LEAKAGE ====================

function RevenueLeakageTab({ zones, loading, t }: { zones: NCZone[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() =>
    [...zones].sort((a, b) => b.revenueLeakageEst - a.revenueLeakageEst).slice(0, 12).map(z => ({
      name: z.zoneName.replace('NCI-', '').split(' ').slice(0, 2).join(' '),
      leakage: z.revenueLeakageEst / 1_000_000,
      churnRate: z.churnRate,
      compositeScore: z.compositeScore,
    })),
  [zones],
  );

  const totalLeakage = zones.reduce((s, z) => s + z.revenueLeakageEst, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t('nc.leakageByZone')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('nc.totalLeakage')}: <span className="text-red-500 font-bold">{formatCurrency(totalLeakage)} DZD</span></p>
        </CardHeader>
        <CardContent className="p-4">
        {loading ? <Skeleton className="h-[400px] w-full" /> : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(0)}M`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
              <RTooltip
                formatter={(v: number) => [`${v.toFixed(1)}M DZD`, t('nc.estimatedLeakage')]}
                contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
              />
              <Bar dataKey="leakage" name={t('nc.estimatedLeakage')} radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => {
                  const pct = chartData[i].compositeScore;
                  return <Cell key={i} fill={pct >= 70 ? '#10B981' : pct >= 55 ? '#F59E0B' : '#EF4444'} fillOpacity={0.85} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>

      {/* Detail table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('nc.leakageByZone')} — Detail</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('nc.zoneName')}</TableHead>
                    <TableHead>{t('nc.region')}</TableHead>
                    <TableHead className="text-right">{t('nc.subscribers')}</TableHead>
                    <TableHead className="text-right">{t('nc.arpu')}</TableHead>
                    <TableHead className="text-right">{t('nc.churnRate')}</TableHead>
                    <TableHead className="text-right">{t('nc.availability')}</TableHead>
                    <TableHead className="text-right">{t('nc.estimatedLeakage')}</TableHead>
                    <TableHead className="text-right">{t('nc.compositeHealth')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...zones].sort((a, b) => b.revenueLeakageEst - a.revenueLeakageEst).map(z => (
                    <TableRow key={z.id}>
                      <TableCell className="font-medium text-xs">{z.zoneName}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{z.region}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatNum(z.subscriberCount)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(z.avgArpu)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className={z.churnRate >= 7 ? 'text-red-500 font-bold' : z.churnRate >= 5.5 ? 'text-amber-500' : 'text-emerald-500'}>
                          {z.churnRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className={z.avgAvailability < 96 ? 'text-red-500' : z.avgAvailability < 98 ? 'text-amber-500' : 'text-emerald-500'}>
                          {z.avgAvailability.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-red-500">{formatCurrency(z.revenueLeakageEst)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold" style={{ color: scoreColor(z.compositeScore) }}>{z.compositeScore.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
