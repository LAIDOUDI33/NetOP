'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/constants';
import { useT } from '@/lib/i18n';
import {
  Users, TrendingUp, DollarSign, Target,
  ArrowUpRight, ArrowDownRight, BarChart3, PieChartIcon,
} from 'lucide-react';

/* ─── Operator color constants ─────────────────────────────── */
const OPERATOR_COLORS: Record<string, string> = {
  Us:      '#10B981', // emerald
  Mobilis: '#F97316', // orange
  Djezzy:  '#EF4444', // red
  Ooredoo: '#3B82F6', // blue
};

const OPERATORS = ['Us', 'Mobilis', 'Djezzy', 'Ooredoo'] as const;

/* ─── Helpers ──────────────────────────────────────────────── */
function formatDZD(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B DZD`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M DZD`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K DZD`;
  return `${formatNumber(value, 0)} DZD`;
}

function pct(v: number): string {
  return `${(v ?? 0).toFixed(1)}%`;
}

/* ─── Skeleton Components ──────────────────────────────────── */
function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <Skeleton className="h-8 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-52" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-72 w-full rounded" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-56" />
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: 10 }).map((_, j) => (
              <Skeleton key={j} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BottomCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-4 pb-4 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-6 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Custom Tooltip ───────────────────────────────────────── */
interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function ShareTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-md text-xs">
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{pct(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function __DZDTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-md text-xs">
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatDZD(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Trend Badge ──────────────────────────────────────────── */
function TrendBadge({ value }: { value: number }) {
  if (value > 0) return (
    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs gap-0.5">
      <ArrowUpRight className="w-3 h-3" />
      +{value.toFixed(1)}%
    </Badge>
  );
  if (value < 0) return (
    <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs gap-0.5">
      <ArrowDownRight className="w-3 h-3" />
      {value.toFixed(1)}%
    </Badge>
  );
  return (
    <Badge variant="secondary" className="text-xs">
      0.0%
    </Badge>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */

export default function MarketShareView() {
  const t = useT();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['competitive', 'market-share'],
    queryFn: () => fetch('/api/competitive/market-share').then(r => r.json()),
  });

  /* ─── Destructure API response ────────────────────────────── */
  const kpi              = data?.kpi ?? {};
  const operatorShare    = data?.operatorShare ?? [];
  const monthlyTrend     = data?.monthlyTrend ?? [];
  const topWilayasShare  = data?.topWilayasShare ?? [];
  const topWilayasRevenue = data?.topWilayasRevenue ?? [];
  const wilayaTable      = data?.wilayaTable ?? [];
  const summary          = data?.summary ?? {};

  /* ─── Loading state ──────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton />
        <BottomCardsSkeleton />
      </div>
    );
  }

  /* ─── Error state ────────────────────────────────────────── */
  if (isError) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-destructive">
          {t('comp.share.error', 'Erreur de chargement des données de part de marché.')}
        </p>
      </div>
    );
  }

  /* ─── KPI card definitions ───────────────────────────────── */
  const kpiCards = [
    {
      title: t('comp.share.kpi.subscribers', 'Total Abonnés'),
      value: formatNumber(kpi.totalSubscribers ?? 0, 0),
      icon: Users,
      color: 'text-emerald-500',
    },
    {
      title: t('comp.share.kpi.marketShare', 'Notre Part de Marché'),
      value: pct(kpi.ourMarketShare ?? 0),
      icon: TrendingUp,
      color: 'text-orange-500',
    },
    {
      title: t('comp.share.kpi.revenue', 'Revenu Total'),
      value: formatDZD(kpi.totalRevenue ?? 0),
      icon: DollarSign,
      color: 'text-red-500',
    },
    {
      title: t('comp.share.kpi.arpu', 'ARPU Premium vs Marché'),
      value: pct(kpi.arpuPremiumVsMarket ?? 0),
      icon: Target,
      color: 'text-blue-500',
    },
  ];

  /* ─── Pie chart data ─────────────────────────────────────── */
  const pieData = OPERATORS.map(op => ({
    name: op === 'Us'
      ? t('comp.share.operator.us', 'Nous')
      : op,
    value: (operatorShare as { operator: string; share: number }[])
      .find(s => s.operator === op)?.share ?? 0,
  }));

  /* ─── Area chart data (6-month stacked trend) ────────────── */
  const trendData = (monthlyTrend as Record<string, unknown>[]).map(m => ({
    month:   m.month as string,
    Us:      (m.Us as number) ?? 0,
    Mobilis: (m.Mobilis as number) ?? 0,
    Djezzy:  (m.Djezzy as number) ?? 0,
    Ooredoo: (m.Ooredoo as number) ?? 0,
  }));

  /* ─── Bar chart data (top 15 wilayas) ────────────────────── */
  const sortedByShare = [...(topWilayasShare as Record<string, unknown>[])]
    .sort((a, b) => (b.share as number) - (a.share as number))
    .slice(0, 15);
  const sortedByRevenue = [...(topWilayasRevenue as Record<string, unknown>[])]
    .sort((a, b) => (b.revenueShare as number) - (a.revenueShare as number))
    .slice(0, 15);

  /* ═══════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 p-6">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">
          {t('comp.share.title', 'Intelligence Part de Marché')}
        </h1>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold mt-2">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts Row 1: Pie + Area ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart – Market Share by Operator */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                {t('comp.share.pie.title', 'Part de Marché par Opérateur')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={110}
                  dataKey="value" nameKey="name"
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name} ${(percent * 100).toFixed(1)}%`
                  }
                  labelLine
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={OPERATOR_COLORS[OPERATORS[idx]]} />
                  ))}
                </Pie>
                <Tooltip content={<ShareTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Area Chart – 6-Month Share Trend (stacked) */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                {t('comp.share.trend.title', 'Évolution sur 6 Mois')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip content={<ShareTooltip />} />
                {OPERATORS.map(op => (
                  <Area
                    key={op}
                    type="monotone"
                    dataKey={op}
                    stackId="1"
                    stroke={OPERATOR_COLORS[op]}
                    fill={OPERATOR_COLORS[op]}
                    fillOpacity={0.4}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Bar + Bar ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart – Top 15 Wilayas by Our Share */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                {t('comp.share.bar.share.title', 'Top 15 Wilayas – Notre Part de Marché')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={sortedByShare} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="wilaya" width={90} tick={{ fontSize: 10 }} />
                <Tooltip content={<ShareTooltip />} />
                <Bar
                  dataKey="share"
                  fill={OPERATOR_COLORS.Us}
                  radius={[0, 4, 4, 0]}
                  name={t('comp.share.operator.us', 'Nous')}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart – Top 15 Wilayas by Revenue Share */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                {t('comp.share.bar.revenue.title', 'Top 15 Wilayas – Part de Revenu')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={sortedByRevenue} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="wilaya" width={90} tick={{ fontSize: 10 }} />
                <Tooltip content={<ShareTooltip />} />
                <Bar
                  dataKey="revenueShare"
                  fill={OPERATOR_COLORS.Ooredoo}
                  radius={[0, 4, 4, 0]}
                  name={t('comp.share.bar.revenue.name', 'Part Revenu')}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Full Wilaya Table ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('comp.share.table.title', 'Détail par Wilaya (58 Wilayas)')}
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background z-10">Wilaya</TableHead>
                <TableHead className="sticky top-0 bg-background z-10">Cluster</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-right">Notre %</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-right">Mobilis %</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-right">Djezzy %</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-right">Ooredoo %</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-right">Revenu (DZD)</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-right">ARPU Notre</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-right">ARPU Marché</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-center">Tendance 3M</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(wilayaTable as Record<string, unknown>[]).map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.wilaya as string}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {row.cluster as string}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">
                    {pct(row.ourShare as number)}
                  </TableCell>
                  <TableCell className="text-right text-orange-500">
                    {pct(row.mobilisShare as number)}
                  </TableCell>
                  <TableCell className="text-right text-red-500">
                    {pct(row.djezzyShare as number)}
                  </TableCell>
                  <TableCell className="text-right text-blue-500">
                    {pct(row.ooredooShare as number)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatDZD(row.ourRevenue as number ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatDZD(row.arpuOur as number ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatDZD(row.arpuMarket as number ?? 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <TrendBadge value={row.trend3m as number ?? 0} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Bottom Summary Mini Cards ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">
              {t('comp.share.summary.growing', 'Wilayas en Croissance')}
            </p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              {summary.growingWilayas ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">
              {t('comp.share.summary.declining', 'Wilayas en Déclin')}
            </p>
            <p className="text-xl font-bold text-red-600 mt-1">
              {summary.decliningWilayas ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">
              {t('comp.share.summary.bestWilaya', 'Meilleure Wilaya')}
            </p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              {summary.bestWilaya ?? '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">
              {t('comp.share.summary.totalRevenue', 'Revenu Total')}
            </p>
            <p className="text-xl font-bold mt-1">
              {formatDZD(summary.totalRevenue ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
