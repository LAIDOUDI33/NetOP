'use client';
import { useT } from '@/lib/i18n';

import { ExportButton } from '@/components/ExportButton';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Gauge, TrendingUp, TrendingDown } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, formatNumber } from '@/lib/constants';
import type { Technology } from '@/types';

// ─── API Response Types ────────────────────────────────────────────────

interface NpiSiteRecord {
  id: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  technology: string;
  region: string;
  overallNpi: number;
  coverageNpi: number;
  capacityNpi: number;
  qualityNpi: number;
  reliabilityNpi: number;
  costEfficiencyNpi: number;
  rank: number;
  totalSites: number;
  timestamp: string;
}

interface NpiSummary {
  total: number;
  avgOverall: number;
  avgCoverage: number;
  avgCapacity: number;
  avgQuality: number;
  avgReliability: number;
  avgCost: number;
  byRegion: Record<string, number>;
}

interface NpiResponse {
  npis: NpiSiteRecord[];
  summary: NpiSummary;
}

// ─── Constants ─────────────────────────────────────────────────────────

const TECHNOLOGIES: Technology[] = ['2G', '3G', '4G', '5G'];

const DIMENSION_COLORS: Record<string, string> = {
  Coverage: '#10B981',
  Capacity: '#06B6D4',
  Quality: '#F59E0B',
  Reliability: '#8B5CF6',
  'Cost Efficiency': '#EF4444',
};

const BUCKET_GRADIENT = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'];

// ─── Helper Functions ──────────────────────────────────────────────────

function npiColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function npiBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function npiCellBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/10';
  if (score >= 60) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

function getDistributionBuckets(npis: NpiSiteRecord[]) {
  const buckets = [
    { range: '0–20', min: 0, max: 20, count: 0 },
    { range: '20–40', min: 20, max: 40, count: 0 },
    { range: '40–60', min: 40, max: 60, count: 0 },
    { range: '60–80', min: 60, max: 80, count: 0 },
    { range: '80–100', min: 80, max: 100, count: 0 },
  ];
  for (const npi of npis) {
    for (const b of buckets) {
      if (npi.overallNpi >= b.min && npi.overallNpi < b.max) {
        b.count++;
        break;
      }
      // Edge case: score exactly 100
      if (b.min === 80 && npi.overallNpi >= 80 && npi.overallNpi <= 100) {
        b.count++;
        break;
      }
    }
  }
  return buckets;
}

function getDimensionAverages(summary: NpiSummary) {
  return [
    { dimension: 'Coverage', value: summary.avgCoverage },
    { dimension: 'Capacity', value: summary.avgCapacity },
    { dimension: 'Quality', value: summary.avgQuality },
    { dimension: 'Reliability', value: summary.avgReliability },
    { dimension: 'Cost Efficiency', value: summary.avgCost },
  ];
}

// ─── Custom Chart Tooltip ──────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatNumber(entry.value, 1)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-20" />
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
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 6 }).map((_, r) => (
            <Skeleton key={r} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function NpiView() {
  const t = useT();
  const [technology, setTechnology] = useState<string>('4G');
  const [region, setRegion] = useState<string>('Lagos');

  const { data, isLoading, error } = useQuery<NpiResponse>({
    queryKey: ['npi', technology, region],
    queryFn: () =>
      fetch(`/api/npi?technology=${technology}&region=${region}`).then((r) => { if (!r.ok) throw new Error('NPI API error: ' + r.status); return r.json(); }),
    refetchInterval: 30000,
  });

  const npis = data?.npis ?? [];
  const summary = data?.summary ?? null;

  // Derived data for charts
  const distributionBuckets = npis.length > 0 ? getDistributionBuckets(npis) : [];
  const dimensionAverages = summary ? getDimensionAverages(summary) : [];

  // Regions from data for filter
  const regions = data
    ? [...new Set(npis.map((n) => n.region))].sort()
    : [region];

  // KPI derivations
  const topPerformer = npis.length > 0 ? npis.find((n) => n.rank === 1) : null;
  const bottomPerformer = npis.length > 0 ? npis.find((n) => n.rank === (npis[0]?.totalSites ?? 0)) : null;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Gauge className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('npi.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('npi.subtitle')}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select value={technology} onValueChange={setTechnology}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t('filter.technology')} />
              </SelectTrigger>
              <SelectContent>
                {TECHNOLOGIES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('filter.region')} />
              </SelectTrigger>
              <SelectContent>
                {regions.length > 0
                  ? regions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))
                  : [{ value: region, label: region }].map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
            <ExportButton data={npis as unknown as Record<string, any>[]} filenamePrefix="npi" columns={[{ key: 'networkElement', header: 'Network Element' }, { key: 'technology', header: 'Technology' }, { key: 'region', header: 'Region' }, { key: 'siteName', header: 'Site' }, { key: 'npiScore', header: 'NPI Score' }, { key: 'category', header: 'Category' }, { key: 'trend', header: 'Trend' }]} />
          </div>
        </div>
        <Separator className="mt-4" />
      </div>

      {/* ── Loading State ───────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-6">
          <KpiCardsSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <TableSkeleton />
        </div>
      )}

      {/* ── Error State ─────────────────────────────────────────────── */}
      {error && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-muted-foreground">
              {t('empty.noDataFor', { entity: 'NPI' })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Main Content ───────────────────────────────────────────── */}
      {data && !isLoading && (
        <>
          {/* ── 4 KPI Cards ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sites */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('npi.totalSites')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{summary?.total ?? 0}</p>
              </CardContent>
            </Card>

            {/* Avg NPI */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('npi.avgScore')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${npiColor(summary?.avgOverall ?? 0)}`}>
                  {formatNumber(summary?.avgOverall ?? 0, 1)}
                </p>
                <div className="h-1.5 w-full bg-muted rounded-full mt-2">
                  <div
                    className={`h-1.5 rounded-full ${npiBg(summary?.avgOverall ?? 0)}`}
                    style={{ width: `${summary?.avgOverall ?? 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Top Performer */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  Top Performer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topPerformer ? (
                  <>
                    <p className="text-lg font-semibold truncate">{topPerformer.siteName}</p>
                    <p className="text-sm text-muted-foreground">{topPerformer.siteCode}</p>
                    <Badge variant="default" className="mt-2 bg-emerald-600 hover:bg-emerald-600">
                      NPI {formatNumber(topPerformer.overallNpi, 1)}
                    </Badge>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('empty.noData')}</p>
                )}
              </CardContent>
            </Card>

            {/* Bottom Performer */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  Bottom Performer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bottomPerformer ? (
                  <>
                    <p className="text-lg font-semibold truncate">{bottomPerformer.siteName}</p>
                    <p className="text-sm text-muted-foreground">{bottomPerformer.siteCode}</p>
                    <Badge variant="destructive" className="mt-2">
                      NPI {formatNumber(bottomPerformer.overallNpi, 1)}
                    </Badge>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('empty.noData')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── 2 Charts ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* NPI Distribution Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('npi.dist')}</CardTitle>
              </CardHeader>
              <CardContent>
                {distributionBuckets.some((b) => b.count > 0) ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionBuckets}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="range"
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <YAxis
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          allowDecimals={false}
                        />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" name="Sites" radius={[4, 4, 0, 0]}>
                          {distributionBuckets.map((_, idx) => (
                            <Cell key={idx} fill={BUCKET_GRADIENT[idx]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                    {t('npi.noDistData')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dimension Averages Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('npi.dimAvg')}</CardTitle>
              </CardHeader>
              <CardContent>
                {dimensionAverages.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dimensionAverages} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="dimension"
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          width={100}
                        />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" name="Score" radius={[0, 4, 4, 0]}>
                          {dimensionAverages.map((entry) => (
                            <Cell key={entry.dimension} fill={DIMENSION_COLORS[entry.dimension]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                    {t('npi.noDimData')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Full Table ─────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Site NPI Details
                <span className="text-muted-foreground font-normal ml-2">
                  ({npis.length} {t('unit.sites')})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {npis.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>{t('th.site')}</TableHead>
                        <TableHead className="w-20">{t('th.tech')}</TableHead>
                        <TableHead className="w-48">{t('npi.overallScore')}</TableHead>
                        <TableHead className="w-20 text-right">{t('npi.coverage')}</TableHead>
                        <TableHead className="w-20 text-right">{t('npi.capacity')}</TableHead>
                        <TableHead className="w-20 text-right">{t('npi.quality')}</TableHead>
                        <TableHead className="w-24 text-right">{t('npi.reliability')}</TableHead>
                        <TableHead className="w-24 text-right">{t('npi.costEfficiency')}</TableHead>
                        <TableHead className="w-28">{t('th.region')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {npis.map((site) => (
                        <TableRow key={site.id}>
                          <TableCell className="font-medium">
                            <span className={`text-xs font-bold ${site.rank <= 3 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                              #{site.rank}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium truncate max-w-[180px]">
                                {site.siteName}
                              </p>
                              <p className="text-xs text-muted-foreground">{site.siteCode}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={TECH_BG_CLASSES[site.technology as Technology] ?? ''}
                            >
                              {site.technology}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold w-10 text-right ${npiColor(site.overallNpi)}`}>
                                {formatNumber(site.overallNpi, 1)}
                              </span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${npiBg(site.overallNpi)}`}
                                  style={{ width: `${site.overallNpi}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className={npiCellBg(site.coverageNpi) + ' px-2 py-0.5 rounded'}>
                              {formatNumber(site.coverageNpi, 1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className={npiCellBg(site.capacityNpi) + ' px-2 py-0.5 rounded'}>
                              {formatNumber(site.capacityNpi, 1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className={npiCellBg(site.qualityNpi) + ' px-2 py-0.5 rounded'}>
                              {formatNumber(site.qualityNpi, 1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className={npiCellBg(site.reliabilityNpi) + ' px-2 py-0.5 rounded'}>
                              {formatNumber(site.reliabilityNpi, 1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className={npiCellBg(site.costEfficiencyNpi) + ' px-2 py-0.5 rounded'}>
                              {formatNumber(site.costEfficiencyNpi, 1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {site.region}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {t('npi.noMatch')}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}