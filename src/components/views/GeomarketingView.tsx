'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, DollarSign, TrendingDown, Building2,
  Layers, MapPin, AlertTriangle, Target, BarChart3, Radar,
} from 'lucide-react';
import { useT } from '@/lib/i18n';

import 'leaflet/dist/leaflet.css';

// Dynamic imports for all Leaflet components (SSR-safe)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false },
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false },
);

// ==================== TYPES ====================

interface GeoSummary {
  totalPopulation: number;
  avgArpu: number;
  avgChurnRate: number;
  totalCompetitorSites: number;
  avgMarketPenetration: number;
  highTierZones: number;
}

interface GeoDemographicRow {
  id: string;
  region: string;
  wilayaCode: string;
  population: number;
  areaKm2: number;
  density: number;
  urbanPct: number;
  avgIncome: number;
  youthPct: number;
  smartphonePct: number;
  internetPct: number;
  latitude: number;
  longitude: number;
}

interface GeoRevenueZoneRow {
  id: string;
  region: string;
  latitude: number;
  longitude: number;
  totalRevenue: number;
  avgArpu: number;
  subscriberCount: number;
  churnRate: number;
  marketPenetration: number;
  growthRate: number;
  tier: string;
}

interface GeoCompetitorSiteRow {
  id: string;
  competitorName: string;
  technology: string;
  latitude: number;
  longitude: number;
  estimatedRadiusKm: number;
  region: string;
  confidence: number;
  source: string;
  detectedAt: string;
}

interface GeoChurnClusterRow {
  id: string;
  clusterName: string;
  region: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  avgChurnRate: number;
  subscriberCount: number;
  atRiskCount: number;
  severity: string;
  primaryCause: string;
  trendDirection: string;
}

interface GeoSiteAcquisitionRow {
  id: string;
  siteName: string;
  region: string;
  latitude: number;
  longitude: number;
  overallScore: number;
  demandScore: number;
  competitiveScore: number;
  demographicScore: number;
  coverageScore: number;
  financialScore: number;
  estimatedROI: number;
  capexEstimate: number;
  opexAnnual: number;
  paybackMonths: number;
  recommendation: string;
  techPriority: string;
}

// ==================== CONSTANTS ====================

const COMPETITOR_COLORS: Record<string, string> = {
  'Mobilis': '#EF4444',
  'Djezzy': '#F59E0B',
  'Ooredoo': '#EC4899',
};

const TIER_COLORS: Record<string, string> = {
  high: '#10B981',
  medium: '#3B82F6',
  low: '#94A3B8',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#10B981',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  high: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  medium: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
};

const TIER_BADGE_CLASSES: Record<string, string> = {
  high: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  medium: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  low: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

const REC_BADGE: Record<string, string> = {
  deploy: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  review: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  defer: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

const TREND_ICONS: Record<string, string> = {
  worsening: 'text-red-500',
  stable: 'text-amber-500',
  improving: 'text-emerald-500',
};

// ==================== HELPERS ====================

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-DZ').format(n);
}

const MAP_CENTER: [number, number] = [28.0, 2.0];
const MAP_ZOOM = 5;

// ==================== COMPONENTS ====================

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right">{value.toFixed(0)}</span>
    </div>
  );
}

// ==================== MAIN VIEW ====================

export default function GeomarketingView() {
  const t = useT();
  const [activeTab, setActiveTab] = useState('revenue');

  // ---- Data queries ----
  const { data: mainData, isLoading: mainLoading } = useQuery({
    queryKey: ['geomarketing'],
    queryFn: () => fetch('/api/geomarketing').then((r) => r.json()),
  });

  const { data: churnData, isLoading: churnLoading } = useQuery({
    queryKey: ['geomarketing-churn'],
    queryFn: () => fetch('/api/geomarketing/churn-map').then((r) => r.json()),
    enabled: activeTab === 'churn',
  });

  const { data: competitorData, isLoading: compLoading } = useQuery({
    queryKey: ['geomarketing-competitor'],
    queryFn: () => fetch('/api/geomarketing/competitor-map').then((r) => r.json()),
    enabled: activeTab === 'competitor',
  });

  const { data: scorerData, isLoading: scorerLoading } = useQuery({
    queryKey: ['geomarketing-scorer'],
    queryFn: () => fetch('/api/geomarketing/site-scorer').then((r) => r.json()),
    enabled: activeTab === 'scorer',
  });

  const { data: demoData, isLoading: demoLoading } = useQuery({
    queryKey: ['geomarketing-demographics'],
    queryFn: () => fetch('/api/geomarketing/demographics').then((r) => r.json()),
    enabled: activeTab === 'demographics',
  });

  const summary = mainData?.summary;
  const demographics = (demoData?.demographics ?? mainData?.demographics ?? []) as GeoDemographicRow[];
  const revenueZones = mainData?.revenueZones ?? [] as GeoRevenueZoneRow[];
  const competitorSites = (competitorData?.sites ?? mainData?.competitorSites ?? []) as GeoCompetitorSiteRow[];
  const churnClusters = churnData?.clusters ?? [] as GeoChurnClusterRow[];
  const candidateSites = scorerData?.sites ?? [] as GeoSiteAcquisitionRow[];

  const churnSummary = churnData?.summary;
  const compSummary = competitorData?.summary;
  const scorerSummary = scorerData?.summary;
  const demoSummary = demoData?.summary;

  const maxRevenue = useMemo(
    () => Math.max(...revenueZones.map((z) => z.totalRevenue), 1),
    [revenueZones],
  );
  const maxPopulation = useMemo(
    () => Math.max(...demographics.map((d) => d.population), 1),
    [demographics],
  );
  const maxChurn = useMemo(
    () => Math.max(...churnClusters.map((c) => c.avgChurnRate), 1),
    [churnClusters],
  );

  // ---- Summary cards ----
  const summaryCards = [
    { label: t('geo.totalPop'), value: summary ? formatNum(summary.totalPopulation) : '—', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('geo.avgArpu'), value: summary ? formatCurrency(summary.avgArpu) : '—', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t('geo.avgChurn'), value: summary ? `${summary.avgChurnRate.toFixed(1)}%` : '—', icon: TrendingDown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t('geo.competitorSites'), value: summary ? String(summary.totalCompetitorSites) : '—', icon: Building2, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MapPin className="h-6 w-6 text-emerald-500" />
          {t('geo.title')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t('geo.subtitle')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2.5 ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                    <p className="text-xl font-bold tracking-tight">{card.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="revenue" className="text-xs gap-1.5">
            <Layers className="h-3.5 w-3.5" /> {t('geo.tabRevenue')}
          </TabsTrigger>
          <TabsTrigger value="churn" className="text-xs gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {t('geo.tabChurn')}
          </TabsTrigger>
          <TabsTrigger value="competitor" className="text-xs gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> {t('geo.tabCompetitor')}
          </TabsTrigger>
          <TabsTrigger value="scorer" className="text-xs gap-1.5">
            <Target className="h-3.5 w-3.5" /> {t('geo.tabScorer')}
          </TabsTrigger>
          <TabsTrigger value="demographics" className="text-xs gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> {t('geo.tabDemographics')}
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB 1: REVENUE MAP ==================== */}
        <TabsContent value="revenue" className="space-y-4 mt-4">
          <RevenueMapTab
            revenueZones={revenueZones}
            competitorSites={competitorSites}
            demographics={demographics}
            maxRevenue={maxRevenue}
            maxPopulation={maxPopulation}
            loading={mainLoading}
            t={t}
          />
          <RevenueZonesTable revenueZones={revenueZones} loading={mainLoading} t={t} />
        </TabsContent>

        {/* ==================== TAB 2: CHURN GEOGRAPHY ==================== */}
        <TabsContent value="churn" className="space-y-4 mt-4">
          <ChurnSummaryCards summary={churnSummary} loading={churnLoading} t={t} />
          <ChurnMapTab clusters={churnClusters} maxChurn={maxChurn} loading={churnLoading} t={t} />
          <ChurnTable clusters={churnClusters} loading={churnLoading} t={t} />
        </TabsContent>

        {/* ==================== TAB 3: COMPETITOR INTELLIGENCE ==================== */}
        <TabsContent value="competitor" className="space-y-4 mt-4">
          <CompetitorSummary summary={compSummary} loading={compLoading} t={t} />
          <CompetitorMapTab sites={competitorSites} loading={compLoading} t={t} />
          <CompetitorTable sites={competitorSites} loading={compLoading} t={t} />
        </TabsContent>

        {/* ==================== TAB 4: SITE ACQUISITION SCORER ==================== */}
        <TabsContent value="scorer" className="space-y-4 mt-4">
          <ScorerSummary summary={scorerSummary} loading={scorerLoading} t={t} />
          <ScorerMapTab sites={candidateSites} loading={scorerLoading} t={t} />
          <ScorerTable sites={candidateSites} loading={scorerLoading} t={t} />
        </TabsContent>

        {/* ==================== TAB 5: DEMOGRAPHICS ==================== */}
        <TabsContent value="demographics" className="space-y-4 mt-4">
          <DemographicsSummary summary={demoSummary} loading={demoLoading} t={t} />
          <DemographicsTable demographics={demographics} loading={demoLoading} t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== REVENUE TAB ====================

function RevenueMapTab({ revenueZones, competitorSites, demographics, maxRevenue, maxPopulation, loading, t }: {
  revenueZones: GeoRevenueZoneRow[];
  competitorSites: GeoCompetitorSiteRow[];
  demographics: GeoDemographicRow[];
  maxRevenue: number;
  maxPopulation: number;
  loading: boolean;
  t: (k: string) => string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          {t('geo.heatmapRevenue')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <Skeleton className="h-[450px] lg:h-[520px] w-full rounded-none" />
        ) : (
          <div className="h-[450px] lg:h-[520px]" role="application" aria-label="Revenue interactive map">
            <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="h-full w-full" style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {revenueZones.map((z) => {
                const radius = Math.max(6, Math.min(30, (z.totalRevenue / maxRevenue) * 30));
                const color = TIER_COLORS[z.tier] ?? '#3B82F6';
                return (
                  <CircleMarker key={`rev-${z.id}`} center={[z.latitude, z.longitude]} radius={radius} pathOptions={{ fillColor: color, fillOpacity: 0.4, color, weight: 2 }}>
                    <Popup>
                      <div className="space-y-2 min-w-[200px] text-sm font-sans">
                        <div className="font-semibold">{z.region}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div><span className="text-gray-500">{t('geo.revenue')}:</span> <span className="font-mono font-medium">{formatCurrency(z.totalRevenue)}</span></div>
                          <div><span className="text-gray-500">{t('geo.avgArpu')}:</span> <span className="font-mono font-medium">{formatCurrency(z.avgArpu)}</span></div>
                          <div><span className="text-gray-500">{t('geo.subscribers')}:</span> <span className="font-mono font-medium">{formatNum(z.subscriberCount)}</span></div>
                          <div><span className="text-gray-500">{t('geo.growth')}:</span> <span className="font-mono font-medium">{z.growthRate.toFixed(1)}%</span></div>
                          <div><span className="text-gray-500">{t('geo.avgChurn')}:</span> <span className="font-mono font-medium">{z.churnRate.toFixed(1)}%</span></div>
                          <div><span className="text-gray-500">{t('geo.tier')}:</span> <span className="font-mono font-medium capitalize">{z.tier}</span></div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
              {competitorSites.map((c) => {
                const color = COMPETITOR_COLORS[c.competitorName] ?? '#F97316';
                return (
                  <CircleMarker key={`comp-${c.id}`} center={[c.latitude, c.longitude]} radius={6} pathOptions={{ fillColor: color, fillOpacity: 0.7, color, weight: 1.5 }}>
                    <Popup>
                      <div className="space-y-2 min-w-[180px] text-sm font-sans">
                        <div className="font-semibold" style={{ color }}>{c.competitorName}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div><span className="text-gray-500">{t('geo.technology')}:</span> <span className="font-mono">{c.technology}</span></div>
                          <div><span className="text-gray-500">{t('geo.confidence')}:</span> <span className="font-mono">{(c.confidence * 100).toFixed(0)}%</span></div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
              {demographics.map((d) => {
                const radius = Math.max(6, Math.min(28, (d.population / maxPopulation) * 28));
                return (
                  <CircleMarker key={`demo-${d.id}`} center={[d.latitude, d.longitude]} radius={radius} pathOptions={{ fillColor: '#3B82F6', fillOpacity: 0.25, color: '#3B82F6', weight: 1.5 }}>
                    <Popup>
                      <div className="space-y-2 min-w-[200px] text-sm font-sans">
                        <div className="font-semibold text-blue-600">{d.region}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div><span className="text-gray-500">{t('geo.totalPop')}:</span> <span className="font-mono font-medium">{formatNum(d.population)}</span></div>
                          <div><span className="text-gray-500">{t('geo.density')}:</span> <span className="font-mono font-medium">{d.density.toFixed(0)}</span></div>
                          <div><span className="text-gray-500">{t('geo.smartphone')}:</span> <span className="font-mono font-medium">{d.smartphonePct.toFixed(1)}%</span></div>
                          <div><span className="text-gray-500">{t('geo.internet')}:</span> <span className="font-mono font-medium">{d.internetPct.toFixed(1)}%</span></div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueZonesTable({ revenueZones, loading, t }: { revenueZones: GeoRevenueZoneRow[]; loading: boolean; t: (k: string) => string }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">{t('geo.revenueZones')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('th.region')}</TableHead>
                  <TableHead className="text-right">{t('geo.avgArpu')}</TableHead>
                  <TableHead className="text-right">{t('geo.subscribers')}</TableHead>
                  <TableHead className="text-right">{t('geo.revenue')}</TableHead>
                  <TableHead className="text-right">{t('geo.avgChurn')}</TableHead>
                  <TableHead className="text-right">{t('geo.marketPenetration')}</TableHead>
                  <TableHead className="text-right">{t('geo.growth')}</TableHead>
                  <TableHead>{t('geo.tier')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueZones.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell className="font-medium">{z.region}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(z.avgArpu)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNum(z.subscriberCount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(z.totalRevenue)}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={z.churnRate > 5 ? 'text-red-500' : z.churnRate > 3 ? 'text-amber-500' : 'text-emerald-500'}>
                        {z.churnRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{z.marketPenetration.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={z.growthRate >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                        {z.growthRate >= 0 ? '+' : ''}{z.growthRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={TIER_BADGE_CLASSES[z.tier] ?? ''}>{z.tier.charAt(0).toUpperCase() + z.tier.slice(1)}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== CHURN TAB ====================

function ChurnSummaryCards({ summary, loading, t }: { summary: any; loading: boolean; t: (k: string) => string }) {
  const cards = [
    { label: t('geo.churnClusters'), value: summary?.totalClusters ?? '—', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: t('geo.totalAtRisk'), value: summary ? formatNum(summary.totalAtRisk) : '—', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t('geo.criticalClusters'), value: summary?.criticalCount ?? '—', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-600/10' },
    { label: t('geo.avgChurn'), value: summary ? `${summary.avgChurnRate.toFixed(1)}%` : '—', icon: BarChart3, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${c.bg}`}><Icon className={`h-5 w-5 ${c.color}`} /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                  <p className="text-xl font-bold tracking-tight">{c.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ChurnMapTab({ clusters, maxChurn, loading, t }: { clusters: GeoChurnClusterRow[]; maxChurn: number; loading: boolean; t: (k: string) => string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          {t('geo.heatmapChurn')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <Skeleton className="h-[420px] w-full rounded-none" />
        ) : (
          <div className="h-[420px]" role="application" aria-label="Churn risk map">
            <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="h-full w-full" style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {clusters.map((c) => {
                const radius = Math.max(8, Math.min(35, (c.avgChurnRate / maxChurn) * 35));
                const color = SEVERITY_COLORS[c.severity] ?? '#F59E0B';
                return (
                  <CircleMarker key={`churn-${c.id}`} center={[c.latitude, c.longitude]} radius={radius} pathOptions={{ fillColor: color, fillOpacity: 0.35, color, weight: 2, dashArray: c.severity === 'critical' ? '6,4' : undefined }}>
                    <Popup>
                      <div className="space-y-2 min-w-[220px] text-sm font-sans">
                        <div className="font-semibold" style={{ color }}>{c.clusterName}</div>
                        <Badge variant="outline" className={`${SEVERITY_BADGE[c.severity] ?? ''} text-[10px]`}>{c.severity.toUpperCase()}</Badge>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div><span className="text-gray-500">{t('geo.avgChurn')}:</span> <span className="font-mono font-bold">{c.avgChurnRate.toFixed(1)}%</span></div>
                          <div><span className="text-gray-500">{t('geo.atRiskCount')}:</span> <span className="font-mono">{formatNum(c.atRiskCount)}</span></div>
                          <div><span className="text-gray-500">{t('geo.subscribers')}:</span> <span className="font-mono">{formatNum(c.subscriberCount)}</span></div>
                          <div><span className="text-gray-500">{t('geo.radiusKm')}:</span> <span className="font-mono">{c.radiusKm}</span></div>
                          <div><span className="text-gray-500">{t('geo.primaryCause')}:</span> <span className="font-mono">{t(`geo.cause.${c.primaryCause}`)}</span></div>
                          <div><span className="text-gray-500">{t('geo.trendDirection')}:</span> <span className={`font-mono font-medium ${TREND_ICONS[c.trendDirection] ?? ''}`}>{t(`geo.trend.${c.trendDirection}`)}</span></div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChurnTable({ clusters, loading, t }: { clusters: GeoChurnClusterRow[]; loading: boolean; t: (k: string) => string }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">{t('geo.churnClusters')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('geo.clusterName')}</TableHead>
                  <TableHead>{t('th.region')}</TableHead>
                  <TableHead className="text-right">{t('geo.avgChurn')}</TableHead>
                  <TableHead className="text-right">{t('geo.atRiskCount')}</TableHead>
                  <TableHead className="text-right">{t('geo.subscribers')}</TableHead>
                  <TableHead className="text-right">{t('geo.radiusKm')}</TableHead>
                  <TableHead>{t('geo.severity')}</TableHead>
                  <TableHead>{t('geo.primaryCause')}</TableHead>
                  <TableHead>{t('geo.trendDirection')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clusters.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.clusterName}</TableCell>
                    <TableCell>{c.region}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={c.avgChurnRate >= 6 ? 'text-red-500 font-bold' : c.avgChurnRate >= 4 ? 'text-amber-500' : 'text-emerald-500'}>
                        {c.avgChurnRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-500">{formatNum(c.atRiskCount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNum(c.subscriberCount)}</TableCell>
                    <TableCell className="text-right font-mono">{c.radiusKm}</TableCell>
                    <TableCell><Badge variant="outline" className={`${SEVERITY_BADGE[c.severity] ?? ''} text-[10px]`}>{c.severity.toUpperCase()}</Badge></TableCell>
                    <TableCell className="text-xs">{t(`geo.cause.${c.primaryCause}`)}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${TREND_ICONS[c.trendDirection] ?? ''}`}>{t(`geo.trend.${c.trendDirection}`)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== COMPETITOR TAB ====================

function CompetitorSummary({ summary, loading, t }: { summary: any; loading: boolean; t: (k: string) => string }) {
  if (loading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>)}</div>;
  if (!summary) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t('geo.competitorSites')}</p><p className="text-xl font-bold mt-1">{summary.totalSites}</p></CardContent></Card>
      {Object.entries(summary.byCompetitor ?? {}).map(([name, count]) => (
        <Card key={name}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{name}</p><p className="text-xl font-bold mt-1" style={{ color: COMPETITOR_COLORS[name] ?? 'inherit' }}>{count as number}</p></CardContent></Card>
      ))}
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t('geo.avgConfidence')}</p><p className="text-xl font-bold mt-1">{((summary.avgConfidence as number) * 100).toFixed(0)}%</p></CardContent></Card>
    </div>
  );
}

function CompetitorMapTab({ sites, loading, t }: { sites: GeoCompetitorSiteRow[]; loading: boolean; t: (k: string) => string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-rose-500" />
            {t('geo.tabCompetitor')}
          </CardTitle>
          <div className="flex gap-3 ml-auto text-xs">
            {Object.entries(COMPETITOR_COLORS).map(([name, color]) => (
              <span key={name} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />{name}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <Skeleton className="h-[420px] w-full rounded-none" />
        ) : (
          <div className="h-[420px]" role="application" aria-label="Competitor intelligence map">
            <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="h-full w-full" style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {sites.map((c) => {
                const color = COMPETITOR_COLORS[c.competitorName] ?? '#F97316';
                return (
                  <CircleMarker key={`comp-${c.id}`} center={[c.latitude, c.longitude]} radius={7} pathOptions={{ fillColor: color, fillOpacity: 0.7, color, weight: 2 }}>
                    <Popup>
                      <div className="space-y-2 min-w-[200px] text-sm font-sans">
                        <div className="font-semibold" style={{ color }}>{c.competitorName}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div><span className="text-gray-500">{t('geo.technology')}:</span> <span className="font-mono">{c.technology}</span></div>
                          <div><span className="text-gray-500">{t('geo.confidence')}:</span> <span className="font-mono">{(c.confidence * 100).toFixed(0)}%</span></div>
                          <div><span className="text-gray-500">{t('geo.estimatedRadius')}:</span> <span className="font-mono">{c.estimatedRadiusKm}</span></div>
                          <div><span className="text-gray-500">{t('geo.source')}:</span> <span className="font-mono">{c.source}</span></div>
                          <div className="col-span-2"><span className="text-gray-500">{t('th.region')}:</span> <span className="font-mono">{c.region}</span></div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompetitorTable({ sites, loading, t }: { sites: GeoCompetitorSiteRow[]; loading: boolean; t: (k: string) => string }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">{t('geo.competitors')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('geo.competitors')}</TableHead>
                  <TableHead>{t('th.region')}</TableHead>
                  <TableHead>{t('geo.technology')}</TableHead>
                  <TableHead className="text-right">{t('geo.confidence')}</TableHead>
                  <TableHead className="text-right">{t('geo.estimatedRadius')}</TableHead>
                  <TableHead>{t('geo.source')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium" style={{ color: COMPETITOR_COLORS[c.competitorName] }}>{c.competitorName}</TableCell>
                    <TableCell>{c.region}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{c.technology}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{(c.confidence * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right font-mono">{c.estimatedRadiusKm}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== SITE SCORER TAB ====================

function ScorerSummary({ summary, loading, t }: { summary: any; loading: boolean; t: (k: string) => string }) {
  if (loading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>)}</div>;
  if (!summary) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t('geo.candidateSites')}</p><p className="text-xl font-bold mt-1">{summary.totalSites}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t('geo.avgScore')}</p><p className="text-xl font-bold mt-1">{summary.avgScore.toFixed(1)}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t('geo.totalCapex')}</p><p className="text-xl font-bold mt-1">{formatNum(summary.totalCapex)}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t('geo.avgPayback')}</p><p className="text-xl font-bold mt-1">{summary.avgPayback}</p></CardContent></Card>
    </div>
  );
}

function ScorerMapTab({ sites, loading, t }: { sites: GeoSiteAcquisitionRow[]; loading: boolean; t: (k: string) => string }) {
  const recColors: Record<string, string> = { deploy: '#10B981', review: '#F59E0B', defer: '#94A3B8' };
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-500" />
            {t('geo.siteScorer')}
          </CardTitle>
          <div className="flex gap-3 ml-auto text-xs">
            {Object.entries(recColors).map(([rec, color]) => (
              <span key={rec} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />{t(`geo.rec.${rec}`)}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <Skeleton className="h-[420px] w-full rounded-none" />
        ) : (
          <div className="h-[420px]" role="application" aria-label="Site acquisition scorer map">
            <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="h-full w-full" style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {sites.map((s) => {
                const color = recColors[s.recommendation] ?? '#94A3B8';
                const radius = Math.max(8, (s.overallScore / 100) * 22);
                return (
                  <CircleMarker key={`site-${s.id}`} center={[s.latitude, s.longitude]} radius={radius} pathOptions={{ fillColor: color, fillOpacity: 0.5, color, weight: 2 }}>
                    <Popup>
                      <div className="space-y-2 min-w-[240px] text-sm font-sans">
                        <div className="font-semibold">{s.siteName}</div>
                        <div className="flex gap-2"><Badge variant="outline" className={REC_BADGE[s.recommendation] ?? ''}>{t(`geo.rec.${s.recommendation}`)}</Badge><Badge variant="secondary" className="text-[10px]">{s.techPriority}</Badge></div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div><span className="text-gray-500">{t('geo.overallScore')}:</span> <span className="font-mono font-bold">{s.overallScore.toFixed(1)}</span></div>
                          <div><span className="text-gray-500">{t('geo.estimatedROI')}:</span> <span className="font-mono">{s.estimatedROI.toFixed(0)}%</span></div>
                          <div><span className="text-gray-500">{t('geo.capex')}:</span> <span className="font-mono">{formatNum(s.capexEstimate)}</span></div>
                          <div><span className="text-gray-500">{t('geo.paybackMonths')}:</span> <span className="font-mono">{s.paybackMonths}</span></div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScorerTable({ sites, loading, t }: { sites: GeoSiteAcquisitionRow[]; loading: boolean; t: (k: string) => string }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">{t('geo.candidateSites')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('geo.siteName')}</TableHead>
                  <TableHead>{t('th.region')}</TableHead>
                  <TableHead className="text-right">{t('geo.overallScore')}</TableHead>
                  <TableHead className="text-right">{t('geo.estimatedROI')}</TableHead>
                  <TableHead className="text-right">{t('geo.capex')}</TableHead>
                  <TableHead className="text-right">{t('geo.paybackMonths')}</TableHead>
                  <TableHead>{t('geo.techPriority')}</TableHead>
                  <TableHead>{t('geo.recommendation')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-xs">{s.siteName}</TableCell>
                    <TableCell>{s.region}</TableCell>
                    <TableCell className="text-right"><ScoreBar value={s.overallScore} /></TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">{s.estimatedROI.toFixed(0)}%</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatNum(s.capexEstimate)}</TableCell>
                    <TableCell className="text-right font-mono">{s.paybackMonths}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{s.techPriority}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={REC_BADGE[s.recommendation] ?? ''}>{t(`geo.rec.${s.recommendation}`)}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== DEMOGRAPHICS TAB ====================

function DemographicsSummary({ summary, loading, t }: { summary: any; loading: boolean; t: (k: string) => string }) {
  if (loading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>)}</div>;
  if (!summary) return null;
  const cards = [
    { label: t('geo.totalPop'), value: formatNum(summary.totalPopulation) },
    { label: t('geo.totalArea'), value: formatNum(summary.totalAreaKm2) },
    { label: t('geo.avgDensity'), value: summary.avgDensity.toFixed(0) },
    { label: t('geo.avgIncome'), value: formatCurrency(summary.avgIncome) },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{c.label}</p><p className="text-xl font-bold mt-1">{c.value}</p></CardContent></Card>
      ))}
    </div>
  );
}

function DemographicsTable({ demographics, loading, t }: { demographics: GeoDemographicRow[]; loading: boolean; t: (k: string) => string }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">{t('geo.demographics')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('th.region')}</TableHead>
                  <TableHead>{t('geo.wilaya')}</TableHead>
                  <TableHead className="text-right">{t('geo.totalPop')}</TableHead>
                  <TableHead className="text-right">{t('geo.area')}</TableHead>
                  <TableHead className="text-right">{t('geo.density')}</TableHead>
                  <TableHead className="text-right">{t('geo.urban')}</TableHead>
                  <TableHead className="text-right">{t('geo.youth')}</TableHead>
                  <TableHead className="text-right">{t('geo.smartphone')}</TableHead>
                  <TableHead className="text-right">{t('geo.internet')}</TableHead>
                  <TableHead className="text-right">{t('geo.income')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demographics.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.region}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{d.wilayaCode}</TableCell>
                    <TableCell className="text-right font-mono">{formatNum(d.population)}</TableCell>
                    <TableCell className="text-right font-mono">{d.areaKm2.toFixed(0)}</TableCell>
                    <TableCell className="text-right font-mono">{d.density.toFixed(0)}</TableCell>
                    <TableCell className="text-right font-mono">{d.urbanPct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono">{d.youthPct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono">{d.smartphonePct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono">{d.internetPct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(d.avgIncome)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
