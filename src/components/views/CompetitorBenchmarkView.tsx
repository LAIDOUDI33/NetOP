'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line, ____PieChart, Pie, __Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/constants';
import { useT } from '@/lib/i18n';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const OPERATOR_COLORS: Record<string, string> = {
  us: '#10B981',
  mobilis: '#F97316',
  djezzy: '#EF4444',
  ooredoo: '#3B82F6',
};

const OPERATOR_LABELS: Record<string, string> = {
  us: 'Nous',
  mobilis: 'Mobilis',
  djezzy: 'Djezzy',
  ooredoo: 'Ooredoo',
};

const TECHNOLOGIES = ['2G', '3G', '4G', '5G'] as const;
type Tech = (typeof TECHNOLOGIES)[number];

const RADAR_AXES = [
  'Disponibilité',
  'RSRP',
  'Débit',
  'Latence',
  'Taux de Chute',
  'Couverture',
] as const;

const RANK_COLORS: Record<number, string> = {
  1: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  3: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  4: 'bg-red-500/20 text-red-400 border-red-500/30',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDZD(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B DZD`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M DZD`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K DZD`;
  return `${formatNumber(value, 0)} DZD`;
}

function __normalizeKPI(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function getRankColor(rank: number): string {
  return RANK_COLORS[rank] ?? RANK_COLORS[4];
}

function operatorColor(key: string): string {
  return OPERATOR_COLORS[key] ?? '#888';
}

/* ------------------------------------------------------------------ */
/*  Mock data generator (fallback when API unavailable)               */
/* ------------------------------------------------------------------ */

function generateMockData(tech: Tech) {
  const operators = ['us', 'mobilis', 'djezzy', 'ooredoo'] as const;
  const baseScores: Record<string, Record<Tech, number>> = {
    us:       { '2G': 72, '3G': 78, '4G': 85, '5G': 68 },
    mobilis:  { '2G': 80, '3G': 82, '4G': 88, '5G': 72 },
    djezzy:   { '2G': 70, '3G': 75, '4G': 80, '5G': 60 },
    ooredoo:  { '2G': 68, '3G': 73, '4G': 76, '5G': 65 },
  };

  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(2024, i, 1).toLocaleDateString('fr-FR', { month: 'short' });
    const entry: Record<string, string | number> = { month };
    operators.forEach((op) => {
      entry[op] = Math.round(baseScores[op][tech] + (Math.random() * 10 - 5));
    });
    return entry;
  });

  const kpiNames = [
    'Disponibilité', 'RSRP (dBm)', 'Débit Down (Mbps)', 'Débit Up (Mbps)',
    'Latence (ms)', 'Taux de Chute (%)', 'Couverture (%)', 'HO SR (%)',
    'CSSR (%)', 'EIRP (dBm)',
  ];

  const kpiComparison = kpiNames.map((name) => {
    const entry: Record<string, string | number> = { kpi: name };
    operators.forEach((op) => {
      entry[op] = Math.round(Math.random() * 40 + 60);
    });
    return entry;
  });

  const wilayas = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Sétif', 'Tizi Ouzou', 'Batna', 'Béjaïa', 'Tlemcen'];

  const regionalScores = wilayas.map((w) => {
    const entry: Record<string, string | number> = { wilaya: w };
    operators.forEach((op) => {
      entry[op] = Math.round(baseScores[op][tech] + (Math.random() * 16 - 8));
    });
    return entry;
  });

  const radarData = RADAR_AXES.map((axis) => {
    const entry: Record<string, string | number> = { axis };
    operators.forEach((op) => {
      entry[op] = Math.round(Math.random() * 30 + 65);
    });
    return entry;
  });

  const profiles: Record<string, Record<string, unknown>> = {};
  operators.forEach((op) => {
    profiles[op] = {
      marketShare: op === 'us' ? 28.5 : op === 'mobilis' ? 35.2 : op === 'djezzy' ? 20.1 : 16.2,
      sites: op === 'us' ? 4200 : op === 'mobilis' ? 5100 : op === 'djezzy' ? 3800 : 3200,
      subscribers: op === 'us' ? 12_800_000 : op === 'mobilis' ? 15_800_000 : op === 'djezzy' ? 9_000_000 : 7_200_000,
      arpu: op === 'us' ? 1800 : op === 'mobilis' ? 1400 : op === 'djezzy' ? 1650 : 1500,
      coverage: op === 'us' ? 91.2 : op === 'mobilis' ? 94.5 : op === 'djezzy' ? 88.7 : 85.3,
      techMix: { '2G': 15, '3G': 25, '4G': 50, '5G': 10 },
      strengths: op === 'us'
        ? ['Couverture urbaine', 'Débit élevé', 'SAE']
        : op === 'mobilis'
          ? ['Part de marché', 'Couverture nationale', 'Prix']
          : op === 'djezzy'
            ? ['ARPU', 'Segment jeunes', 'Marketing']
            : ['5G précurseur', 'International', 'B2B'],
      weaknesses: op === 'us'
        ? ['Couverture rurale', '5G déploiement', 'Prix']
        : op === 'mobilis'
          ? ['ARPU', 'Qualité data', 'SAE']
          : op === 'djezzy'
            ? ['Couverture', 'Sites 4G', 'Latence']
            : ['Part de marché', 'Couverture', 'Subscribers'],
    };
  });

  const kpiRankings = kpiNames.map((name) => {
    const scores: Record<string, number> = {};
    operators.forEach((op) => {
      scores[op] = Math.round(Math.random() * 40 + 60);
    });
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const best = sorted[0][0];
    const ourScore = scores['us'];
    const bestScore = sorted[0][1];
    const ourRank = sorted.findIndex(([k]) => k === 'us') + 1;
    return {
      kpi: name,
      us: ourScore,
      mobilis: scores['mobilis'],
      djezzy: scores['djezzy'],
      ooredoo: scores['ooredoo'],
      best,
      ourRank,
      gap: Math.round((bestScore - ourScore) * 10) / 10,
    };
  });

  const ourRank = Math.random() > 0.5 ? 1 : 2;
  const ourScore = baseScores['us'][tech];

  return {
    overallRank: ourRank,
    compositeScore: ourScore,
    totalSites: profiles['us'].sites as number,
    marketShare: profiles['us'].marketShare as number,
    profiles,
    radarData,
    monthlyTrend,
    kpiComparison,
    regionalScores,
    kpiRankings,
  };
}

/* ------------------------------------------------------------------ */
/*  Loading skeletons                                                   */
/* ------------------------------------------------------------------ */

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="bg-card/60 backdrop-blur border-border/50">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card className="bg-card/60 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[320px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                      */
/* ------------------------------------------------------------------ */

function BenchTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 text-xs">
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{OPERATOR_LABELS[p.name] ?? p.name}:</span>
          <span className="font-medium text-foreground">{formatNumber(p.value, 1)}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export default function CompetitorBenchmarkView() {
  const t = useT();
  const [tech, setTech] = useState<Tech>('4G');

  const { data, isLoading } = useQuery({
    queryKey: ['competitive-benchmark', tech],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/competitive/benchmark?technology=${tech}`);
        if (!res.ok) throw new Error('API unavailable');
        return await res.json();
      } catch {
        return generateMockData(tech);
      }
    },
    staleTime: 60_000,
  });

  const kpiCards = [
    {
      title: t('comp.bench.overallRank') ?? 'Classement Global',
      value: data ? `#${data.overallRank}` : '--',
      sub: data ? `sur ${TECHNOLOGIES.length} opérateurs` : '',
      color: data?.overallRank === 1 ? 'text-emerald-400' : 'text-blue-400',
      icon: '🏆',
    },
    {
      title: t('comp.bench.compositeScore') ?? 'Score Composite',
      value: data ? `${data.compositeScore}` : '--',
      sub: '/ 100',
      color: 'text-emerald-400',
      icon: '🎯',
    },
    {
      title: t('comp.bench.sitesManaged') ?? 'Sites Gérés',
      value: data ? formatNumber(data.totalSites, 0) : '--',
      sub: tech,
      color: 'text-blue-400',
      icon: '📡',
    },
    {
      title: t('comp.bench.marketShare') ?? 'Part de Marché',
      value: data ? `${data.marketShare}%` : '--',
      sub: t('comp.bench.ofMarket') ?? 'du marché',
      color: 'text-amber-400',
      icon: '📊',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('comp.bench.title') ?? 'Benchmark Concurrentiel'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('comp.bench.subtitle') ?? 'Comparaison des performances par opérateur et technologie'}
          </p>
        </div>

        {/* Technology pills */}
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/50">
          {TECHNOLOGIES.map((t2) => (
            <button
              key={t2}
              onClick={() => setTech(t2)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tech === t2
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {t2}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && !data && (
        <div className="space-y-6">
          <KpiCardsSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-card/60 backdrop-blur border-border/50">
                <CardContent className="p-6">
                  <Skeleton className="h-5 w-24 mb-4" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <Card key={card.title} className="bg-card/60 backdrop-blur border-border/50 hover:border-border transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">{card.title}</span>
                    <span className="text-xl">{card.icon}</span>
                  </div>
                  <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Operator Profile Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {(['us', 'mobilis', 'djezzy', 'ooredoo'] as const).map((opKey) => {
              const profile = data.profiles?.[opKey] as Record<string, unknown> | undefined;
              if (!profile) return null;
              const color = operatorColor(opKey);
              const label = OPERATOR_LABELS[opKey];
              const techMix = profile.techMix as Record<string, number> | undefined;

              return (
                <Card
                  key={opKey}
                  className="bg-card/60 backdrop-blur transition-colors"
                  style={{ borderColor: `${color}44`, borderWidth: '1px' }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <CardTitle className="text-base font-semibold">{label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {/* Key metrics */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div className="text-muted-foreground">{t('comp.bench.marketShare') ?? 'Part de marché'}</div>
                      <div className="text-right font-medium text-foreground">{profile.marketShare as number}%</div>
                      <div className="text-muted-foreground">{t('comp.bench.sites') ?? 'Sites'}</div>
                      <div className="text-right font-medium text-foreground">{formatNumber(profile.sites as number, 0)}</div>
                      <div className="text-muted-foreground">{t('comp.bench.subscribers') ?? 'Abonnés'}</div>
                      <div className="text-right font-medium text-foreground">{formatNumber(profile.subscribers as number, 0)}</div>
                      <div className="text-muted-foreground">ARPU</div>
                      <div className="text-right font-medium text-foreground">{formatDZD(profile.arpu as number)}</div>
                      <div className="text-muted-foreground">{t('comp.bench.coverage') ?? 'Couverture'}</div>
                      <div className="text-right font-medium text-foreground">{profile.coverage as number}%</div>
                    </div>

                    {/* Technology mix badges */}
                    {techMix && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Object.entries(techMix).map(([key, val]) => (
                          <Badge
                            key={key}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-5"
                            style={{ borderColor: `${color}55`, color }}
                          >
                            {key} {val}%
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Strengths */}
                    {(profile.strengths as string[])?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {t('comp.bench.strengths') ?? 'Forces'}
                        </p>
                        <ul className="space-y-0.5">
                          {(profile.strengths as string[]).map((s) => (
                            <li key={s} className="flex items-center gap-1.5 text-xs text-emerald-400">
                              <span className="text-emerald-500">✓</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Weaknesses */}
                    {(profile.weaknesses as string[])?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {t('comp.bench.weaknesses') ?? 'Faiblesses'}
                        </p>
                        <ul className="space-y-0.5">
                          {(profile.weaknesses as string[]).map((w) => (
                            <li key={w} className="flex items-center gap-1.5 text-xs text-red-400">
                              <span className="text-red-500">✗</span> {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts Row 1: Radar + Line */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Radar Chart */}
            <Card className="bg-card/60 backdrop-blur border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t('comp.bench.radarTitle') ?? 'Comparaison Multidimensionnelle'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <RadarChart data={data.radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    {(['us', 'mobilis', 'djezzy', 'ooredoo'] as const).map((op) => (
                      <Radar
                        key={op}
                        name={OPERATOR_LABELS[op]}
                        dataKey={op}
                        stroke={operatorColor(op)}
                        fill={operatorColor(op)}
                        fillOpacity={0.12}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value: string) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
                    />
                    <Tooltip content={<BenchTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Line Chart - Monthly Trend */}
            <Card className="bg-card/60 backdrop-blur border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t('comp.bench.trendTitle') ?? 'Évolution Mensuelle du Score Global'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      domain={[50, 100]}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<BenchTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value: string) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
                    />
                    {(['us', 'mobilis', 'djezzy', 'ooredoo'] as const).map((op) => (
                      <Line
                        key={op}
                        type="monotone"
                        dataKey={op}
                        name={OPERATOR_LABELS[op]}
                        stroke={operatorColor(op)}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: KPI Comparison + Regional */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* KPI Comparison Bar Chart */}
            <Card className="bg-card/60 backdrop-blur border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t('comp.bench.kpiCompTitle') ?? 'Comparaison par KPI'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={data.kpiComparison} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="kpi"
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      angle={-35}
                      textAnchor="end"
                      height={70}
                      interval={0}
                    />
                    <YAxis
                      domain={[40, 100]}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<BenchTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value: string) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
                    />
                    {(['us', 'mobilis', 'djezzy', 'ooredoo'] as const).map((op) => (
                      <Bar
                        key={op}
                        dataKey={op}
                        name={OPERATOR_LABELS[op]}
                        fill={operatorColor(op)}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={18}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Regional Scores Bar Chart */}
            <Card className="bg-card/60 backdrop-blur border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t('comp.bench.regionalTitle') ?? 'Top 10 Wilayas - Scores Régionaux'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={data.regionalScores} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="wilaya"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                      interval={0}
                    />
                    <YAxis
                      domain={[50, 100]}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<BenchTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value: string) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
                    />
                    {(['us', 'mobilis', 'djezzy', 'ooredoo'] as const).map((op) => (
                      <Bar
                        key={op}
                        dataKey={op}
                        name={OPERATOR_LABELS[op]}
                        fill={operatorColor(op)}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={18}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* KPI Ranking Table */}
          <Card className="bg-card/60 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t('comp.bench.rankingTitle') ?? 'Classement Détaillé par KPI'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 bg-muted/30">
                      <TableHead className="text-xs font-semibold sticky top-0 bg-muted/90 backdrop-blur z-10">
                        {t('comp.bench.kpi') ?? 'KPI'}
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right sticky top-0 bg-muted/90 backdrop-blur z-10" style={{ color: OPERATOR_COLORS.us }}>
                        {t('comp.bench.ours') ?? 'Nous'}
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right sticky top-0 bg-muted/90 backdrop-blur z-10" style={{ color: OPERATOR_COLORS.mobilis }}>
                        Mobilis
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right sticky top-0 bg-muted/90 backdrop-blur z-10" style={{ color: OPERATOR_COLORS.djezzy }}>
                        Djezzy
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right sticky top-0 bg-muted/90 backdrop-blur z-10" style={{ color: OPERATOR_COLORS.ooredoo }}>
                        Ooredoo
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center sticky top-0 bg-muted/90 backdrop-blur z-10">
                        {t('comp.bench.bestOperator') ?? 'Meilleur'}
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center sticky top-0 bg-muted/90 backdrop-blur z-10">
                        {t('comp.bench.ourRank') ?? 'Notre Rang'}
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right sticky top-0 bg-muted/90 backdrop-blur z-10">
                        {t('comp.bench.gapToBest') ?? 'Écart'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.kpiRankings?.map((row: Record<string, unknown>, idx: number) => {
                      const bestOp = row.best as string;
                      const ourRank = row.ourRank as number;
                      const gap = row.gap as number;
                      return (
                        <TableRow key={idx} className="border-border/30 hover:bg-muted/20 transition-colors">
                          <TableCell className="text-xs font-medium text-foreground py-2.5">
                            {row.kpi as string}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium py-2.5" style={{ color: OPERATOR_COLORS.us }}>
                            {formatNumber(row.us as number, 1)}
                          </TableCell>
                          <TableCell className="text-xs text-right py-2.5" style={{ color: OPERATOR_COLORS.mobilis }}>
                            {formatNumber(row.mobilis as number, 1)}
                          </TableCell>
                          <TableCell className="text-xs text-right py-2.5" style={{ color: OPERATOR_COLORS.djezzy }}>
                            {formatNumber(row.djezzy as number, 1)}
                          </TableCell>
                          <TableCell className="text-xs text-right py-2.5" style={{ color: OPERATOR_COLORS.ooredoo }}>
                            {formatNumber(row.ooredoo as number, 1)}
                          </TableCell>
                          <TableCell className="text-xs text-center py-2.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0 h-5 font-semibold"
                              style={{ borderColor: `${operatorColor(bestOp)}55`, color: operatorColor(bestOp) }}
                            >
                              {OPERATOR_LABELS[bestOp] ?? bestOp}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-center py-2.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0 h-5 font-bold ${getRankColor(ourRank)}`}
                            >
                              #{ourRank}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right py-2.5">
                            <span className={gap <= 0 ? 'text-emerald-400' : gap <= 3 ? 'text-amber-400' : 'text-red-400'}>
                              {gap > 0 ? '+' : ''}{formatNumber(gap, 1)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
