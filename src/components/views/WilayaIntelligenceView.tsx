'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useT } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  BarChart3, Radio, DollarSign, MapPin, Layers, Users, TrendingUp, TrendingDown,
  Zap, Activity, ChevronDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line, Legend, Cell,
} from 'recharts';
import dynamic from 'next/dynamic';
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

// ==================== TYPES ====================

interface WilayaData {
  id: string;
  wilayaCode: string;
  wilayaName: string;
  cluster: string;
 clusterOrder: number;
  latitude: number; longitude: number;
  population: number;
  dairas: number;
  communes: number;
  superficieKm2: number;
  densiteHabKm2: number;
  totalSites: number; activeSites: number;
  avgRsrp: number; avgSinr: number; avgThroughputDl: number;
  avgAvailability: number; avgDropRate: number; avgLatencyMs: number;
  coveragePercent: number;
  tech4gSites: number; tech3gSites: number; tech2gSites: number;
  totalSubscribers: number; avgArpu: number; totalRevenue: number;
  churnRate: number; marketPenetration: number; satisfactionScore: number;
  revenueAtRisk: number;
  competitorSites: number; coverageGaps: number; churnHotspots: number; revenueZones: number;
  youthRatio: number; urbanRatio: number;
  networkScore: number; commercialScore: number; geomarketingScore: number; compositeScore: number;
}

interface ClusterData {
  name: string; wilayaCount: number; totalPopulation: number;
  totalDairas: number;
  totalCommunes: number;
  totalSuperficieKm2: number;
  avgDensite: number;
  totalSites: number; activeSites: number;
  avgRsrp: number; avgSinr: number; avgThroughputDl: number;
  avgAvailability: number; avgDropRate: number; avgLatencyMs: number;
  avgCoverage: number;
  tech4gSites: number; tech3gSites: number; tech2gSites: number;
  totalSubscribers: number; avgArpu: number; totalRevenue: number;
  avgChurnRate: number; avgMarketPenetration: number; avgSatisfaction: number;
  totalRevenueAtRisk: number; totalCompetitorSites: number; totalCoverageGaps: number;
  totalChurnHotspots: number; totalRevenueZones: number;
  avgYouthRatio: number; avgUrbanRatio: number;
  networkScore: number; commercialScore: number; geomarketingScore: number; compositeScore: number;
  wilayas: string[];
}

type TFn = (k: string) => string;

// ==================== HELPERS ====================

function fmtNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtCur(n: number): string { return new Intl.NumberFormat('fr-DZ').format(n); }

function scoreColor(s: number): string {
  if (s >= 80) return '#059669';
  if (s >= 65) return '#F59E0B';
  return '#EF4444';
}

function scoreBg(s: number): string {
  if (s >= 80) return 'bg-emerald-500/10 text-emerald-600';
  if (s >= 65) return 'bg-amber-500/10 text-amber-600';
  return 'bg-red-500/10 text-red-600';
}

const CLUSTER_COLORS: Record<string, string> = {
  'Grand Alger': '#059669',
  'Kabylie': '#06B6D4',
  'Nord-Est': '#8B5CF6',
  'Nord-Ouest': '#F59E0B',
  'Hauts Plateaux': '#EC4899',
  'Sud-Est': '#EF4444',
  'Sud-Ouest': '#F97316',
  'Sahara': '#6B7280',
  'Nouvelles 2023 Nord': '#14B8A6',
  'Nouvelles 2023 Sud': '#A855F7',
};

const DIM_ICONS = { kpis: BarChart3, network: Radio, commercial: DollarSign, geomarketing: MapPin };

// ==================== MAIN VIEW ====================

export default function WilayaIntelligenceView() {
  const t = useT();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['wilaya-intelligence', selectedCluster],
    queryFn: async () => {
      const params = selectedCluster !== 'all' ? `?cluster=${encodeURIComponent(selectedCluster)}` : '';
      const r = await fetch(`/api/wilaya-intelligence${params}`); if (!r.ok) throw new Error('Failed to fetch wilaya intelligence'); return r.json();
    },
  });

  const wilayas = (data?.wilayas ?? []) as WilayaData[];
  const clusters = (data?.clusters ?? []) as ClusterData[];
  const summary = data?.summary;

  const clusterOptions = useMemo(() =>
    ['all', ...new Set(clusters.map(c => c.name))],
    [clusters],
  );

  useEffect(() => {
    if (typeof document !== 'undefined' && !document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  const filteredWilayas = useMemo(() => {
    if (!searchQuery) return wilayas;
    const q = searchQuery.toLowerCase();
    return wilayas.filter(w =>
      w.wilayaName.toLowerCase().includes(q) ||
      w.wilayaCode.includes(q) ||
      w.cluster.toLowerCase().includes(q)
    );
  }, [wilayas, searchQuery]);
  const pagedWilayas = useMemo(() =>
    filteredWilayas.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredWilayas, page]
  );
  const totalPages = Math.ceil(filteredWilayas.length / PAGE_SIZE);

  const cards = [
    { label: t('wi.totalWilayas'), value: summary ? String(summary.totalWilayas) : '—', icon: Layers, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: t('wi.totalSites'), value: summary ? fmtNum(summary.totalSites) : '—', icon: Radio, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: t('wi.totalSubscribers'), value: summary ? fmtNum(summary.totalSubscribers) : '—', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t('wi.totalRevenue'), value: summary ? `${fmtNum(summary.totalRevenue)} DZD` : '—', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t('wi.avgComposite'), value: summary ? `${summary.avgCompositeScore}` : '—', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: t('wi.revenueAtRisk'), value: summary ? `${fmtNum(summary.totalRevenueAtRisk)} DZD` : '—', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-violet-500" />
            {t('title.wilayaIntelligence')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('wi.subtitle')}</p>
        </div>
        {/* Cluster selector */}
        <div className="relative">
          <select
            value={selectedCluster}
            onChange={(e) => setSelectedCluster(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {clusterOptions.map(c => (
              <option key={c} value={c}>{c === 'all' ? t('wi.allClusters') : c}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <input
          type="text"
          placeholder={t('wi.searchWilaya')}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Summary cards */}
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

      {/* Best / Worst badges */}
      {summary && !isLoading && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-emerald-500/5">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs"><span className="font-semibold">{t('wi.bestWilaya')}:</span> {summary.bestWilaya?.name} ({summary.bestWilaya?.score})</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-red-500/5">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-xs"><span className="font-semibold">{t('wi.worstWilaya')}:</span> {summary.worstWilaya?.name} ({summary.worstWilaya?.score})</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-amber-500/5">
            <Users className="h-4 w-4 text-amber-500" />
            <span className="text-xs"><span className="font-semibold">{t('wi.population')}:</span> {fmtNum(summary.totalPopulation)}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs gap-1.5"><Layers className="h-3.5 w-3.5" /> {t('wi.tabOverview')}</TabsTrigger>
          <TabsTrigger value="kpis" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> {t('wi.tabKpis')}</TabsTrigger>
          <TabsTrigger value="network" className="text-xs gap-1.5"><Radio className="h-3.5 w-3.5" /> {t('wi.tabNetwork')}</TabsTrigger>
          <TabsTrigger value="commercial" className="text-xs gap-1.5"><DollarSign className="h-3.5 w-3.5" /> {t('wi.tabCommercial')}</TabsTrigger>
          <TabsTrigger value="geomarketing" className="text-xs gap-1.5"><MapPin className="h-3.5 w-3.5" /> {t('wi.tabGeomarketing')}</TabsTrigger>
          <TabsTrigger value="clusters" className="text-xs gap-1.5"><Zap className="h-3.5 w-3.5" /> {t('wi.tabClusters')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <OverviewTab wilayas={wilayas} filteredWilayas={filteredWilayas} pagedWilayas={pagedWilayas} page={page} totalPages={totalPages} setPage={setPage} clusters={clusters} loading={isLoading} t={t} />
        </TabsContent>
        <TabsContent value="kpis" className="space-y-4 mt-4">
          <KpiDimensionTab wilayas={wilayas} filteredWilayas={filteredWilayas} clusters={clusters} loading={isLoading} t={t} />
        </TabsContent>
        <TabsContent value="network" className="space-y-4 mt-4">
          <NetworkDimensionTab wilayas={wilayas} filteredWilayas={filteredWilayas} clusters={clusters} loading={isLoading} t={t} />
        </TabsContent>
        <TabsContent value="commercial" className="space-y-4 mt-4">
          <CommercialDimensionTab wilayas={wilayas} filteredWilayas={filteredWilayas} clusters={clusters} loading={isLoading} t={t} />
        </TabsContent>
        <TabsContent value="geomarketing" className="space-y-4 mt-4">
          <GeomarketingDimensionTab wilayas={wilayas} filteredWilayas={filteredWilayas} clusters={clusters} loading={isLoading} t={t} />
        </TabsContent>
        <TabsContent value="clusters" className="space-y-4 mt-4">
          <ClusterComparisonTab clusters={clusters} wilayas={wilayas} loading={isLoading} t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== TAB: OVERVIEW ====================

function OverviewTab({ wilayas, filteredWilayas, pagedWilayas, page, totalPages, setPage, clusters, loading, t }: { wilayas: WilayaData[]; filteredWilayas: WilayaData[]; pagedWilayas: WilayaData[]; page: number; totalPages: number; setPage: (p: (prev: number) => number) => void; clusters: ClusterData[]; loading: boolean; t: TFn }) {
  const sorted = [...filteredWilayas].sort((a, b) => b.compositeScore - a.compositeScore);

  // Radar data for top 5
  const radarData = sorted.slice(0, 5).map(w => ({
    name: w.wilayaName,
    [t('wi.networkScore')]: w.networkScore,
    [t('wi.commercialScore')]: w.commercialScore,
    [t('wi.geoScore')]: w.geomarketingScore,
    [t('wi.coverage')]: w.coveragePercent,
    [t('wi.satisfaction')]: w.satisfactionScore,
  }));

  // Cluster summary bar chart
  const clusterBarData = clusters.map(c => ({
    name: c.name,
    [t('wi.networkScore')]: c.networkScore,
    [t('wi.commercialScore')]: c.commercialScore,
    [t('wi.geoScore')]: c.geomarketingScore,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.wilayaMap')}</CardTitle></CardHeader>
          <CardContent className="p-2">
            {loading ? <Skeleton className="h-[350px] w-full" /> : (
              <MapContainer center={[28.5, 2.5]} zoom={5} className="h-[350px] w-full rounded-lg z-0" style={{ zIndex: 0 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                {wilayas.map(w => (
                  <CircleMarker
                    key={w.id}
                    center={[w.latitude, w.longitude]}
                    radius={Math.max(4, Math.min(20, w.population / 200000))}
                    pathOptions={{
                      fillColor: CLUSTER_COLORS[w.cluster] ?? '#6B7280',
                      color: CLUSTER_COLORS[w.cluster] ?? '#6B7280',
                      weight: 1,
                      fillOpacity: 0.7,
                    }}
                  >
                    <Popup>
                      <div className="text-xs">
                        <b>{w.wilayaName}</b> ({w.wilayaCode})<br />
                        {t('wi.cluster')}: {w.cluster}<br />
                        {t('wi.population')}: {w.population.toLocaleString()}<br />
                        {t('wi.compositeScore')}: {w.compositeScore}<br />
                        {t('wi.sites')}: {w.totalSites} | {t('wi.coverage')}: {w.coveragePercent}%
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.topWilayasRadar')}</CardTitle></CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[350px] w-full" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar name={t('wi.networkScore')} dataKey={t('wi.networkScore')} stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.15} strokeWidth={2} />
                <Radar name={t('wi.commercialScore')} dataKey={t('wi.commercialScore')} stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} />
                <Radar name={t('wi.geoScore')} dataKey={t('wi.geoScore')} stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} strokeWidth={2} />
                <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.clusterScores')}</CardTitle></CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[350px] w-full" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={clusterBarData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey={t('wi.networkScore')} fill="#06B6D4" radius={[4, 4, 0, 0]} />
                <Bar dataKey={t('wi.commercialScore')} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey={t('wi.geoScore')} fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Wilaya ranking table */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.wilayaRanking')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>{t('wi.wilayaName')}</TableHead>
                  <TableHead>{t('wi.cluster')}</TableHead>
                  <TableHead className="text-right">{t('wi.population')}</TableHead>
                  <TableHead className="text-right">Daïras</TableHead>
                  <TableHead className="text-right">Communes</TableHead>
                  <TableHead className="text-right">Superficie (km²)</TableHead>
                  <TableHead className="text-right">{t('wi.sites')}</TableHead>
                  <TableHead className="text-right">{t('wi.subscribers')}</TableHead>
                  <TableHead className="text-right">{t('wi.networkScore')}</TableHead>
                  <TableHead className="text-right">{t('wi.commercialScore')}</TableHead>
                  <TableHead className="text-right">{t('wi.geoScore')}</TableHead>
                  <TableHead className="text-right">{t('wi.compositeScore')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedWilayas.map((w, i) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-muted-foreground text-xs font-mono">{page * 20 + i + 1}</TableCell>
                    <TableCell className="font-medium text-xs">{w.wilayaName}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: `${CLUSTER_COLORS[w.cluster] ?? '#6B7280'}20`, color: CLUSTER_COLORS[w.cluster] ?? '#6B7280' }}>{w.cluster}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtNum(w.population)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.dairas}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.communes}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.superficieKm2.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.totalSites}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtNum(w.totalSubscribers)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold" style={{ color: scoreColor(w.networkScore) }}>{w.networkScore}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold" style={{ color: scoreColor(w.commercialScore) }}>{w.commercialScore}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold" style={{ color: scoreColor(w.geomarketingScore) }}>{w.geomarketingScore}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold" style={{ color: scoreColor(w.compositeScore) }}>{w.compositeScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="flex items-center justify-between px-4 py-2 border-t">
            <span className="text-xs text-muted-foreground">{filteredWilayas.length} wilayas</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</Button>
              <span className="text-xs px-2">{page + 1}/{totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>→</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== TAB: KPIs ====================

function KpiDimensionTab({ wilayas, filteredWilayas, clusters, loading, t }: { wilayas: WilayaData[]; filteredWilayas: WilayaData[]; clusters: ClusterData[]; loading: boolean; t: TFn }) {
  const sorted = [...filteredWilayas].sort((a, b) => a.avgRsrp - b.avgRsrp);

  const rsrpChart = [...wilayas].sort((a, b) => a.avgRsrp - b.avgRsrp).map(w => ({ name: w.wilayaName, rsrp: w.avgRsrp, sinr: w.avgSinr, throughput: w.avgThroughputDl, fill: CLUSTER_COLORS[w.cluster] ?? '#6B7280' }));

  const dropLatencyChart = [...wilayas].sort((a, b) => b.avgDropRate - a.avgDropRate).map(w => ({ name: w.wilayaName, dropRate: w.avgDropRate, latency: w.avgLatencyMs, fill: CLUSTER_COLORS[w.cluster] ?? '#6B7280' }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* RSRP, SINR, Throughput per wilaya */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.rsrpSinrThroughput')}</CardTitle></CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[350px] w-full" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={rsrpChart} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                <YAxis yAxisId="left" domain={[-115, -85]} tick={{ fontSize: 10 }} label={{ value: 'RSRP (dBm)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 50]} tick={{ fontSize: 10 }} label={{ value: 'SINR / Thr (Mbps)', angle: 90, position: 'insideRight', fontSize: 10 }} />
                <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar yAxisId="left" dataKey="rsrp" name="RSRP" fill="#06B6D4" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="sinr" name="SINR" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="throughput" name={t('wi.throughputDl')} stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Drop Rate & Latency */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.dropRateLatency')}</CardTitle></CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[300px] w-full" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dropLatencyChart} margin={{ left: 0, right: 10, top: 5, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={90} />
                <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="dropRate" name={t('wi.dropRate')} fill="#EF4444" radius={[0, 4, 4, 0]} />
                <Bar dataKey="latency" name={t('wi.latency')} fill="#F59E0B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* KPI Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.kpiTable')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('wi.wilayaName')}</TableHead>
                  <TableHead className="text-right">RSRP</TableHead>
                  <TableHead className="text-right">SINR</TableHead>
                  <TableHead className="text-right">{t('wi.throughputDl')}</TableHead>
                  <TableHead className="text-right">{t('wi.availability')}</TableHead>
                  <TableHead className="text-right">{t('wi.dropRate')}</TableHead>
                  <TableHead className="text-right">{t('wi.latency')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium text-xs">{w.wilayaName}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.avgRsrp} dBm</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.avgSinr} dB</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.avgThroughputDl} Mbps</TableCell>
                    <TableCell className="text-right font-mono text-xs" style={{ color: w.avgAvailability >= 98 ? '#059669' : w.avgAvailability >= 96 ? '#F59E0B' : '#EF4444' }}>{w.avgAvailability}%</TableCell>
                    <TableCell className="text-right font-mono text-xs" style={{ color: w.avgDropRate <= 1 ? '#059669' : w.avgDropRate <= 1.5 ? '#F59E0B' : '#EF4444' }}>{w.avgDropRate}%</TableCell>
                    <TableCell className="text-right font-mono text-xs" style={{ color: w.avgLatencyMs <= 25 ? '#059669' : w.avgLatencyMs <= 35 ? '#F59E0B' : '#EF4444' }}>{w.avgLatencyMs} ms</TableCell>
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

// ==================== TAB: NETWORK ====================

function NetworkDimensionTab({ wilayas, filteredWilayas, clusters, loading, t }: { wilayas: WilayaData[]; filteredWilayas: WilayaData[]; clusters: ClusterData[]; loading: boolean; t: TFn }) {
  const techChart = [...wilayas].sort((a, b) => b.totalSites - a.totalSites).map(w => ({
    name: w.wilayaName,
    '4G': w.tech4gSites,
    '3G': w.tech3gSites,
    '2G': w.tech2gSites,
    total: w.totalSites,
    active: w.activeSites,
    fill: CLUSTER_COLORS[w.cluster] ?? '#6B7280',
  }));

  const coverageChart = [...wilayas].sort((a, b) => a.coveragePercent - b.coveragePercent).map(w => ({
    name: w.wilayaName,
    coverage: w.coveragePercent,
    fill: CLUSTER_COLORS[w.cluster] ?? '#6B7280',
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.techDistribution')}</CardTitle></CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[350px] w-full" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={techChart} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="4G" stackId="tech" fill="#06B6D4" radius={[0, 0, 0, 0]} />
                <Bar dataKey="3G" stackId="tech" fill="#F59E0B" />
                <Bar dataKey="2G" stackId="tech" fill="#6B7280" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.coverageByWilaya')}</CardTitle></CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[350px] w-full" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={coverageChart} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={90} />
                <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="coverage" name={t('wi.coverage')} radius={[0, 4, 4, 0]}>
                  {coverageChart.map((entry, idx) => (
                    <Cell key={idx} fill={entry.coverage >= 85 ? '#059669' : entry.coverage >= 70 ? '#F59E0B' : '#EF4444'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Network detail table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.networkDetail')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('wi.wilayaName')}</TableHead>
                  <TableHead className="text-right">{t('wi.sites')}</TableHead>
                  <TableHead className="text-right">4G</TableHead>
                  <TableHead className="text-right">3G</TableHead>
                  <TableHead className="text-right">2G</TableHead>
                  <TableHead className="text-right">{t('wi.active')}</TableHead>
                  <TableHead className="text-right">{t('wi.coverage')}</TableHead>
                  <TableHead className="text-right">{t('wi.networkScore')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWilayas.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium text-xs">{w.wilayaName}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.totalSites}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.tech4gSites}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.tech3gSites}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.tech2gSites}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.activeSites}</TableCell>
                    <TableCell className="text-right font-mono text-xs" style={{ color: w.coveragePercent >= 85 ? '#059669' : w.coveragePercent >= 70 ? '#F59E0B' : '#EF4444' }}>{w.coveragePercent}%</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold" style={{ color: scoreColor(w.networkScore) }}>{w.networkScore}</TableCell>
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

// ==================== TAB: COMMERCIAL ====================

function CommercialDimensionTab({ wilayas, filteredWilayas, clusters, loading, t }: { wilayas: WilayaData[]; filteredWilayas: WilayaData[]; clusters: ClusterData[]; loading: boolean; t: TFn }) {
  const revenueChart = [...wilayas].sort((a, b) => b.totalRevenue - a.totalRevenue).map(w => ({
    name: w.wilayaName,
    revenue: w.totalRevenue / 1_000_000,
    atRisk: w.revenueAtRisk / 1_000_000,
    fill: CLUSTER_COLORS[w.cluster] ?? '#6B7280',
  }));

  const arpuChurnChart = [...wilayas].sort((a, b) => b.avgArpu - a.avgArpu).map(w => ({
    name: w.wilayaName,
    arpu: w.avgArpu,
    churn: w.churnRate,
    fill: CLUSTER_COLORS[w.cluster] ?? '#6B7280',
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.revenueVsRisk')}</CardTitle></CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[350px] w-full" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={revenueChart} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}M`} />
                <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} formatter={(v: number) => [`${v.toFixed(1)}M DZD`, '']} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="revenue" name={t('wi.revenue')} fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="atRisk" name={t('wi.revenueAtRisk')} fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.arpuVsChurn')}</CardTitle></CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[350px] w-full" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={arpuChurnChart} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: 'ARPU', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" domain={[2, 9]} tick={{ fontSize: 10 }} label={{ value: 'Churn %', angle: 90, position: 'insideRight', fontSize: 10 }} />
                <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar yAxisId="left" dataKey="arpu" name="ARPU" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="churn" name={t('wi.churnRate')} stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Commercial detail table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.commercialDetail')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('wi.wilayaName')}</TableHead>
                  <TableHead className="text-right">{t('wi.subscribers')}</TableHead>
                  <TableHead className="text-right">ARPU</TableHead>
                  <TableHead className="text-right">{t('wi.revenue')}</TableHead>
                  <TableHead className="text-right">{t('wi.churnRate')}</TableHead>
                  <TableHead className="text-right">{t('wi.marketPen')}</TableHead>
                  <TableHead className="text-right">{t('wi.satisfaction')}</TableHead>
                  <TableHead className="text-right">{t('wi.commercialScore')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...filteredWilayas].sort((a, b) => b.totalRevenue - a.totalRevenue).map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium text-xs">{w.wilayaName}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtNum(w.totalSubscribers)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtCur(w.avgArpu)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtNum(w.totalRevenue)}</TableCell>
                    <TableCell className="text-right font-mono text-xs" style={{ color: w.churnRate <= 4.5 ? '#059669' : w.churnRate <= 6 ? '#F59E0B' : '#EF4444' }}>{w.churnRate}%</TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.marketPenetration}%</TableCell>
                    <TableCell className="text-right font-mono text-xs" style={{ color: w.satisfactionScore >= 75 ? '#059669' : w.satisfactionScore >= 65 ? '#F59E0B' : '#EF4444' }}>{w.satisfactionScore}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold" style={{ color: scoreColor(w.commercialScore) }}>{w.commercialScore}</TableCell>
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

// ==================== TAB: GEOMARKETING ====================

function GeomarketingDimensionTab({ wilayas, filteredWilayas, clusters, loading, t }: { wilayas: WilayaData[]; filteredWilayas: WilayaData[]; clusters: ClusterData[]; loading: boolean; t: TFn }) {
  const competitorChart = [...wilayas].sort((a, b) => b.competitorSites - a.competitorSites).map(w => ({
    name: w.wilayaName,
    competitors: w.competitorSites,
    ownSites: w.totalSites,
    fill: CLUSTER_COLORS[w.cluster] ?? '#6B7280',
  }));

  const gapHotspotChart = [...wilayas].sort((a, b) => (b.coverageGaps + b.churnHotspots) - (a.coverageGaps + a.churnHotspots)).map(w => ({
    name: w.wilayaName,
    [t('wi.coverageGaps')]: w.coverageGaps,
    [t('wi.churnHotspots')]: w.churnHotspots,
    [t('wi.revenueZones')]: w.revenueZones,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.ownVsCompetitor')}</CardTitle></CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[350px] w-full" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={competitorChart} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="ownSites" name={t('wi.ownSites')} fill="#06B6D4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="competitors" name={t('wi.competitorSites')} fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.gapsHotspotsZones')}</CardTitle></CardHeader>
        <CardContent className="p-4">
          {loading ? <Skeleton className="h-[350px] w-full" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={gapHotspotChart} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey={t('wi.coverageGaps')} fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey={t('wi.churnHotspots')} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey={t('wi.revenueZones')} fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Demographics table */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.geomarketingDetail')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('wi.wilayaName')}</TableHead>
                  <TableHead>{t('wi.cluster')}</TableHead>
                  <TableHead className="text-right">{t('wi.competitorSites')}</TableHead>
                  <TableHead className="text-right">{t('wi.coverageGaps')}</TableHead>
                  <TableHead className="text-right">{t('wi.churnHotspots')}</TableHead>
                  <TableHead className="text-right">{t('wi.revenueZones')}</TableHead>
                  <TableHead className="text-right">{t('wi.youthRatio')}</TableHead>
                  <TableHead className="text-right">{t('wi.urbanRatio')}</TableHead>
                  <TableHead className="text-right">{t('wi.geoScore')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWilayas.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium text-xs">{w.wilayaName}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: `${CLUSTER_COLORS[w.cluster] ?? '#6B7280'}20`, color: CLUSTER_COLORS[w.cluster] ?? '#6B7280' }}>{w.cluster}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs">{w.competitorSites}</TableCell>
                    <TableCell className="text-right font-mono text-xs" style={{ color: w.coverageGaps >= 4 ? '#EF4444' : w.coverageGaps >= 2 ? '#F59E0B' : '#059669' }}>{w.coverageGaps}</TableCell>
                    <TableCell className="text-right font-mono text-xs" style={{ color: w.churnHotspots >= 3 ? '#EF4444' : w.churnHotspots >= 2 ? '#F59E0B' : '#059669' }}>{w.churnHotspots}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600">{w.revenueZones}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{(w.youthRatio * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs">{(w.urbanRatio * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold" style={{ color: scoreColor(w.geomarketingScore) }}>{w.geomarketingScore}</TableCell>
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

// ==================== TAB: CLUSTER COMPARISON ====================

function ClusterComparisonTab({ clusters, wilayas, loading, t }: { clusters: ClusterData[]; wilayas: WilayaData[]; loading: boolean; t: TFn }) {
  const radarData = clusters.map(c => ({
    name: c.name,
    [t('wi.networkScore')]: c.networkScore,
    [t('wi.commercialScore')]: c.commercialScore,
    [t('wi.geoScore')]: c.geomarketingScore,
    [t('wi.avgCoverage')]: c.avgCoverage,
    [t('wi.avgSatisfaction')]: c.avgSatisfaction,
  }));

  const clusterSizeData = clusters.map(c => ({
    name: c.name,
    [t('wi.sites')]: c.totalSites,
    [t('wi.subscribers')]: c.totalSubscribers,
    [t('wi.revenue')]: c.totalRevenue / 1_000_000,
  }));

  return (
    <div className="space-y-4">
      {/* Cluster summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {clusters.map(c => (
          <Card key={c.name}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[c.name] ?? '#6B7280' }} />
                <span className="text-xs font-bold truncate">{c.name}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{t('wi.wilayas')}</span>
                  <span className="font-mono font-semibold">{c.wilayaCount}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{t('wi.sites')}</span>
                  <span className="font-mono">{c.totalSites}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{t('wi.compositeScore')}</span>
                  <span className="font-mono font-bold" style={{ color: scoreColor(c.compositeScore) }}>{c.compositeScore}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{t('wi.churnRate')}</span>
                  <span className="font-mono" style={{ color: c.avgChurnRate <= 5 ? '#059669' : c.avgChurnRate <= 6 ? '#F59E0B' : '#EF4444' }}>{c.avgChurnRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cluster radar */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.clusterRadar')}</CardTitle></CardHeader>
          <CardContent className="p-4">
            {loading ? <Skeleton className="h-[350px] w-full" /> : (
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name={t('wi.networkScore')} dataKey={t('wi.networkScore')} stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.1} strokeWidth={2} />
                  <Radar name={t('wi.commercialScore')} dataKey={t('wi.commercialScore')} stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} />
                  <Radar name={t('wi.geoScore')} dataKey={t('wi.geoScore')} stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} strokeWidth={2} />
                  <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cluster size comparison */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.clusterSizeComparison')}</CardTitle></CardHeader>
          <CardContent className="p-4">
            {loading ? <Skeleton className="h-[350px] w-full" /> : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={clusterSizeData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtNum(v)} />
                  <RTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} formatter={(v: number, n: string) => [n === t('wi.revenue') ? `${v.toFixed(0)}M DZD` : fmtNum(v), n]} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey={t('wi.sites')} fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t('wi.subscribers')} fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t('wi.revenue')} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cluster detail table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('wi.clusterDetail')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('wi.cluster')}</TableHead>
                  <TableHead>{t('wi.wilayas')}</TableHead>
                  <TableHead className="text-right">{t('wi.population')}</TableHead>
                  <TableHead className="text-right">{t('wi.sites')}</TableHead>
                  <TableHead className="text-right">{t('wi.subscribers')}</TableHead>
                  <TableHead className="text-right">ARPU</TableHead>
                  <TableHead className="text-right">{t('wi.churnRate')}</TableHead>
                  <TableHead className="text-right">{t('wi.networkScore')}</TableHead>
                  <TableHead className="text-right">{t('wi.commercialScore')}</TableHead>
                  <TableHead className="text-right">{t('wi.geoScore')}</TableHead>
                  <TableHead className="text-right">{t('wi.compositeScore')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clusters.map(c => (
                  <TableRow key={c.name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[c.name] ?? '#6B7280' }} />
                        <span className="font-medium text-xs">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{c.wilayas.join(', ')}</span></TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtNum(c.totalPopulation)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{c.totalSites}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtNum(c.totalSubscribers)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtCur(Math.round(c.avgArpu))}</TableCell>
                    <TableCell className="text-right font-mono text-xs" style={{ color: c.avgChurnRate <= 5 ? '#059669' : c.avgChurnRate <= 6 ? '#F59E0B' : '#EF4444' }}>{c.avgChurnRate}%</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold" style={{ color: scoreColor(c.networkScore) }}>{c.networkScore}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold" style={{ color: scoreColor(c.commercialScore) }}>{c.commercialScore}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold" style={{ color: scoreColor(c.geomarketingScore) }}>{c.geomarketingScore}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold" style={{ color: scoreColor(c.compositeScore) }}>{c.compositeScore}</TableCell>
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
