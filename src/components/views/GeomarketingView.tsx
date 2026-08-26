'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, DollarSign, TrendingDown, Building2,
  Layers, MapPin, AlertTriangle, Target, BarChart3,
  Wifi, WifiOff, ShieldAlert, CircleDollarSign, TrendingUp, Wrench,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RRadar,
} from 'recharts';

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

interface GeoCoverageGapRow {
  id: string;
  gapName: string;
  region: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  populationServed: number;
  coveragePct: number;
  gapSeverity: string;
  currentSites: number;
  requiredSites: number;
  estimatedRevenue: number;
  priorityScore: number;
  technology: string;
  recommendedAction: string;
}

interface RevenueImpactRow {
  id: string;
  zoneName: string;
  region: string;
  latitude: number;
  longitude: number;
  totalSubscribers: number;
  affectedSubscribers: number;
  avgArpu: number;
  churnProbability: number;
  monthlyRevenueAtRisk: number;
  annualRevenueAtRisk: number;
  degradationCause: string;
  severity: string;
  primaryKpi: string;
  kpiBaseline: number;
  kpiCurrent: number;
  kpiDelta: number;
  trendDirection: string;
  recommendedAction: string;
  estimatedFixCost: number;
  priorityScore: number;
  roiRatio: number;
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

const ACTION_BADGE: Record<string, string> = {
  new_site: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  upgrade_site: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  optimize: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  add_carrier: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  pci_replan: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  repair: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
};

const CAUSE_COLORS: Record<string, string> = {
  coverage_gap: '#EF4444',
  capacity_exhaustion: '#F59E0B',
  interference: '#8B5CF6',
  quality_degradation: '#3B82F6',
  outage: '#EC4899',
};

const CHART_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16', '#A855F7', '#E11D48'];

// ==================== HELPERS ====================

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-DZ').format(n);
}

const MAP_CENTER: [number, number] = [28.0, 2.0];
const MAP_ZOOM = 5;

type TFn = (_k: string) => string;

// ==================== REGION FILTER ====================

function RegionFilter({ regions, value, onChange, t }: { regions: string[]; value: string; onChange: (_v: string) => void; t: TFn }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{t('th.region')}:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder={t('geo.allRegions')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('geo.allRegions')}</SelectItem>
          {regions.map((r) => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function useRegionFilter<T extends { region: string }>(data: T[], filterRegion: string): T[] {
  return useMemo(() => {
    if (!filterRegion || filterRegion === 'all') return data;
    return data.filter((d) => d.region === filterRegion);
  }, [data, filterRegion]);
}

// ==================== CHART COMPONENTS ====================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | string; color?: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ==================== SCORE BAR ====================

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
  const [regionFilter, setRegionFilter] = useState('all');

  // ---- Data queries ----
  const { data: mainData, isLoading: mainLoading } = useQuery({
    queryKey: ['geomarketing'],
    queryFn: async () => { const r = await fetch('/api/geomarketing'); if (!r.ok) throw new Error('Failed to fetch geomarketing'); return r.json(); },
  });

  const { data: churnData, isLoading: churnLoading } = useQuery({
    queryKey: ['geomarketing-churn'],
    queryFn: async () => { const r = await fetch('/api/geomarketing/churn-map'); if (!r.ok) throw new Error('Failed to fetch churn map'); return r.json(); },
    enabled: activeTab === 'churn',
  });

  const { data: competitorData, isLoading: compLoading } = useQuery({
    queryKey: ['geomarketing-competitor'],
    queryFn: async () => { const r = await fetch('/api/geomarketing/competitor-map'); if (!r.ok) throw new Error('Failed to fetch competitor map'); return r.json(); },
    enabled: activeTab === 'competitor',
  });

  const { data: scorerData, isLoading: scorerLoading } = useQuery({
    queryKey: ['geomarketing-scorer'],
    queryFn: async () => { const r = await fetch('/api/geomarketing/site-scorer'); if (!r.ok) throw new Error('Failed to fetch site scorer'); return r.json(); },
    enabled: activeTab === 'scorer',
  });

  const { data: demoData, isLoading: demoLoading } = useQuery({
    queryKey: ['geomarketing-demographics'],
    queryFn: async () => { const r = await fetch('/api/geomarketing/demographics'); if (!r.ok) throw new Error('Failed to fetch demographics'); return r.json(); },
    enabled: activeTab === 'demographics',
  });

  const { data: gapsData, isLoading: gapsLoading } = useQuery({
    queryKey: ['geomarketing-gaps'],
    queryFn: async () => { const r = await fetch('/api/geomarketing/coverage-gaps'); if (!r.ok) throw new Error('Failed to fetch coverage gaps'); return r.json(); },
    enabled: activeTab === 'gaps',
  });

  const { data: riData, isLoading: riLoading } = useQuery({
    queryKey: ['geomarketing-revenue-impact'],
    queryFn: async () => { const r = await fetch('/api/geomarketing/revenue-impact'); if (!r.ok) throw new Error('Failed to fetch revenue impact'); return r.json(); },
    enabled: activeTab === 'revimpact',
  });

  const summary = mainData?.summary;
  const allDemographics = (demoData?.demographics ?? mainData?.demographics ?? []) as GeoDemographicRow[];
  const allRevenueZones = mainData?.revenueZones ?? [] as GeoRevenueZoneRow[];
  const allCompetitorSites = (competitorData?.sites ?? mainData?.competitorSites ?? []) as GeoCompetitorSiteRow[];
  const allChurnClusters = churnData?.clusters ?? [] as GeoChurnClusterRow[];
  const allCandidateSites = scorerData?.sites ?? [] as GeoSiteAcquisitionRow[];
  const allCoverageGaps = gapsData?.gaps ?? [] as GeoCoverageGapRow[];
  const allRevenueImpacts = riData?.zones ?? [] as RevenueImpactRow[];

  const churnSummary = churnData?.summary;
  const compSummary = competitorData?.summary;
  const scorerSummary = scorerData?.summary;
  const demoSummary = demoData?.summary;
  const gapsSummary = gapsData?.summary;
  const riSummary = riData?.summary;

  // Region filter
  const demographics = useRegionFilter(allDemographics, regionFilter);
  const revenueZones = useRegionFilter(allRevenueZones, regionFilter);
  const competitorSites = useRegionFilter(allCompetitorSites, regionFilter);
  const churnClusters = useRegionFilter(allChurnClusters, regionFilter);
  const candidateSites = useRegionFilter(allCandidateSites, regionFilter);
  const coverageGaps = useRegionFilter(allCoverageGaps, regionFilter);
  const revenueImpacts = useRegionFilter(allRevenueImpacts, regionFilter) as RevenueImpactRow[];

  // All unique regions for filter dropdown
  const allRegions = useMemo(() => {
    const set = new Set<string>();
    [...allDemographics, ...allRevenueZones, ...allChurnClusters, ...allCandidateSites, ...allCoverageGaps, ...allRevenueImpacts].forEach(d => set.add(d.region));
    return Array.from(set).sort();
  }, [allDemographics, allRevenueZones, allChurnClusters, allCandidateSites, allCoverageGaps, allRevenueImpacts]);

  const maxRevenue = useMemo(() => Math.max(...revenueZones.map((z) => z.totalRevenue), 1), [revenueZones]);
  const maxPopulation = useMemo(() => Math.max(...demographics.map((d) => d.population), 1), [demographics]);
  const maxChurn = useMemo(() => Math.max(...churnClusters.map((c) => c.avgChurnRate), 1), [churnClusters]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-emerald-500" />
            {t('geo.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('geo.subtitle')}</p>
        </div>
        <RegionFilter regions={allRegions} value={regionFilter} onChange={setRegionFilter} t={t} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2.5 ${card.bg}`}><Icon className={`h-5 w-5 ${card.color}`} /></div>
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
          <TabsTrigger value="gaps" className="text-xs gap-1.5">
            <WifiOff className="h-3.5 w-3.5" /> {t('geo.tabGaps')}
          </TabsTrigger>
          <TabsTrigger value="revimpact" className="text-xs gap-1.5">
            <CircleDollarSign className="h-3.5 w-3.5" /> {t('geo.tabRevenueImpact')}
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB 1: REVENUE MAP ==================== */}
        <TabsContent value="revenue" className="space-y-4 mt-4">
          <RevenueMapTab
            revenueZones={revenueZones}
            competitorSites={allCompetitorSites}
            demographics={allDemographics}
            maxRevenue={maxRevenue}
            maxPopulation={maxPopulation}
            loading={mainLoading}
            t={t}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RevenueByRegionChart revenueZones={revenueZones} loading={mainLoading} t={t} />
            <TierDistributionChart revenueZones={revenueZones} loading={mainLoading} t={t} />
          </div>
          <RevenueZonesTable revenueZones={revenueZones} loading={mainLoading} t={t} />
        </TabsContent>

        {/* ==================== TAB 2: CHURN GEOGRAPHY ==================== */}
        <TabsContent value="churn" className="space-y-4 mt-4">
          <ChurnSummaryCards summary={churnSummary} loading={churnLoading} t={t} />
          <ChurnMapTab clusters={churnClusters} maxChurn={maxChurn} loading={churnLoading} t={t} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChurnSeverityChart clusters={churnClusters} loading={churnLoading} t={t} />
            <ChurnCauseChart clusters={churnClusters} loading={churnLoading} t={t} />
          </div>
          <ChurnTable clusters={churnClusters} loading={churnLoading} t={t} />
        </TabsContent>

        {/* ==================== TAB 3: COMPETITOR INTELLIGENCE ==================== */}
        <TabsContent value="competitor" className="space-y-4 mt-4">
          <CompetitorSummary summary={compSummary} loading={compLoading} t={t} />
          <CompetitorMapTab sites={competitorSites} loading={compLoading} t={t} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CompetitorShareChart sites={competitorSites} loading={compLoading} t={t} />
            <CompetitorTechChart sites={competitorSites} loading={compLoading} t={t} />
          </div>
          <CompetitorTable sites={competitorSites} loading={compLoading} t={t} />
        </TabsContent>

        {/* ==================== TAB 4: SITE ACQUISITION SCORER ==================== */}
        <TabsContent value="scorer" className="space-y-4 mt-4">
          <ScorerSummary summary={scorerSummary} loading={scorerLoading} t={t} />
          <ScorerMapTab sites={candidateSites} loading={scorerLoading} t={t} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ScorerRadarChart sites={candidateSites} loading={scorerLoading} t={t} />
            <ScorerROIChart sites={candidateSites} loading={scorerLoading} t={t} />
          </div>
          <ScorerTable sites={candidateSites} loading={scorerLoading} t={t} />
        </TabsContent>

        {/* ==================== TAB 5: DEMOGRAPHICS ==================== */}
        <TabsContent value="demographics" className="space-y-4 mt-4">
          <DemographicsSummary summary={demoSummary} loading={demoLoading} t={t} />
          <DemographicsMapTab demographics={demographics} maxPopulation={maxPopulation} loading={demoLoading} t={t} />
          <DemographicsBarChart demographics={demographics} loading={demoLoading} t={t} />
          <DemographicsTable demographics={demographics} loading={demoLoading} t={t} />
        </TabsContent>

        {/* ==================== TAB 6: COVERAGE GAPS ==================== */}
        <TabsContent value="gaps" className="space-y-4 mt-4">
          <GapsSummaryCards summary={gapsSummary} loading={gapsLoading} t={t} />
          <GapsMapTab gaps={coverageGaps} loading={gapsLoading} t={t} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GapsSeverityChart gaps={coverageGaps} loading={gapsLoading} t={t} />
            <GapsActionChart gaps={coverageGaps} loading={gapsLoading} t={t} />
          </div>
          <GapsTable gaps={coverageGaps} loading={gapsLoading} t={t} />
        </TabsContent>

        {/* ==================== TAB 7: REVENUE IMPACT ENGINE ==================== */}
        <TabsContent value="revimpact" className="space-y-4 mt-4">
          <RevenueImpactSummary summary={riSummary} loading={riLoading} t={t} />
          <RevenueImpactMap zones={revenueImpacts} loading={riLoading} t={t} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RevenueImpactByRegionChart zones={revenueImpacts} loading={riLoading} t={t} />
            <RevenueImpactCauseChart zones={revenueImpacts} loading={riLoading} t={t} />
          </div>
          <RevenueImpactTable zones={revenueImpacts} loading={riLoading} t={t} />
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
  t: TFn;
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

function RevenueByRegionChart({ revenueZones, loading, t }: { revenueZones: GeoRevenueZoneRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const z of revenueZones) {
      map.set(z.region, (map.get(z.region) || 0) + z.totalRevenue);
    }
    return Array.from(map.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 12);
  }, [revenueZones]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.revenueByRegion')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[280px] w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatNum(v)} fontSize={11} />
              <YAxis dataKey="name" type="category" width={100} fontSize={11} />
              <RTooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name={t('geo.revenue')} fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function TierDistributionChart({ revenueZones, loading, t }: { revenueZones: GeoRevenueZoneRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const z of revenueZones) {
      map.set(z.tier, (map.get(z.tier) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: t(`geo.tierLabel.${name}`), value, key: name }));
  }, [revenueZones, t]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.tierDistribution')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[280px] w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={TIER_COLORS[entry.key] ?? CHART_COLORS[i]} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <RTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueZonesTable({ revenueZones, loading, t }: { revenueZones: GeoRevenueZoneRow[]; loading: boolean; t: TFn }) {
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

interface ChurnSummary { totalClusters: number; totalAtRisk: number; criticalCount: number; avgChurnRate: number; }

function ChurnSummaryCards({ summary, t }: { summary: ChurnSummary | null | undefined; loading: boolean; t: TFn }) {
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

function ChurnMapTab({ clusters, maxChurn, loading, t }: { clusters: GeoChurnClusterRow[]; maxChurn: number; loading: boolean; t: TFn }) {
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

function ChurnSeverityChart({ clusters, loading, t }: { clusters: GeoChurnClusterRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of clusters) {
      map.set(c.severity, (map.get(c.severity) || 0) + 1);
    }
    return ['critical', 'high', 'medium', 'low']
      .filter((s) => map.has(s))
      .map((s) => ({ name: t(`geo.severityLabel.${s}`), value: map.get(s)!, key: s }));
  }, [clusters, t]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.severityDistribution')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[280px] w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={{ strokeWidth: 1 }}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={SEVERITY_COLORS[entry.key] ?? CHART_COLORS[i]} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <RTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ChurnCauseChart({ clusters, loading, t }: { clusters: GeoChurnClusterRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of clusters) {
      const label = t(`geo.cause.${c.primaryCause}`);
      map.set(label, (map.get(label) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [clusters, t]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.causeBreakdown')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[280px] w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={60} />
              <YAxis fontSize={11} />
              <RTooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name={t('geo.churnClusters')} fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ChurnTable({ clusters, loading, t }: { clusters: GeoChurnClusterRow[]; loading: boolean; t: TFn }) {
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

interface CompetitorSummaryData { totalSites: number; avgConfidence: number; byCompetitor: Record<string, number>; }

function CompetitorSummary({ summary, loading, t }: { summary: CompetitorSummaryData | null; loading: boolean; t: TFn }) {
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

function CompetitorMapTab({ sites, loading, t }: { sites: GeoCompetitorSiteRow[]; loading: boolean; t: TFn }) {
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

function CompetitorShareChart({ sites, loading, t }: { sites: GeoCompetitorSiteRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sites) {
      map.set(s.competitorName, (map.get(s.competitorName) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }));
  }, [sites]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.marketShare')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[280px] w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={COMPETITOR_COLORS[entry.name] ?? CHART_COLORS[i]} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <RTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function CompetitorTechChart({ sites, loading, t }: { sites: GeoCompetitorSiteRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const s of sites) {
      if (!map.has(s.competitorName)) map.set(s.competitorName, {});
      const r = map.get(s.competitorName)!;
      r[s.technology] = (r[s.technology] || 0) + 1;
    }
    return Array.from(map.entries()).map(([name, techs]) => ({ name, ...techs }));
  }, [sites]);

  const techKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of sites) set.add(s.technology);
    return Array.from(set).sort();
  }, [sites]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.techMix')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[280px] w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <RTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              {techKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function CompetitorTable({ sites, loading, t }: { sites: GeoCompetitorSiteRow[]; loading: boolean; t: TFn }) {
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

interface ScorerSummaryData { totalSites: number; avgScore: number; totalCapex: number; avgPayback: number; }

function ScorerSummary({ summary, loading, t }: { summary: ScorerSummaryData | null; loading: boolean; t: TFn }) {
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

function ScorerMapTab({ sites, loading, t }: { sites: GeoSiteAcquisitionRow[]; loading: boolean; t: TFn }) {
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

function ScorerRadarChart({ sites, loading, t }: { sites: GeoSiteAcquisitionRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    if (sites.length === 0) return [];
    const top = sites.slice(0, 5);
    return [
      { metric: t('geo.demandScore'), ...Object.fromEntries(top.map((s, i) => [`site${i + 1}`, s.demandScore])) },
      { metric: t('geo.competitiveScore'), ...Object.fromEntries(top.map((s, i) => [`site${i + 1}`, s.competitiveScore])) },
      { metric: t('geo.demographicScore'), ...Object.fromEntries(top.map((s, i) => [`site${i + 1}`, s.demographicScore])) },
      { metric: t('geo.coverageScore'), ...Object.fromEntries(top.map((s, i) => [`site${i + 1}`, s.coverageScore])) },
      { metric: t('geo.financialScore'), ...Object.fromEntries(top.map((s, i) => [`site${i + 1}`, s.financialScore])) },
    ];
  }, [sites, t]);

  const siteKeys = useMemo(() => {
    const top = sites.slice(0, 5);
    return top.map((s, i) => ({ key: `site${i + 1}`, name: s.siteName.split(' ').slice(-1)[0] }));
  }, [sites]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.scoreDimensions')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[300px] w-full" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData}>
              <PolarGrid strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="metric" fontSize={11} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} />
              {siteKeys.map((s, i) => (
                <RRadar key={s.key} name={s.name} dataKey={s.key} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
              ))}
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <RTooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ScorerROIChart({ sites, loading, t }: { sites: GeoSiteAcquisitionRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    return sites
      .slice(0, 12)
      .map((s) => ({ name: s.siteName.split('-').pop()?.trim() ?? s.siteName, roi: s.estimatedROI, score: s.overallScore }))
      .sort((a, b) => b.roi - a.roi);
  }, [sites]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.roiDistribution')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[300px] w-full" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={10} angle={-25} textAnchor="end" height={60} />
              <YAxis fontSize={11} />
              <RTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="roi" name="ROI %" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="score" name={t('geo.overallScore')} fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ScorerTable({ sites, loading, t }: { sites: GeoSiteAcquisitionRow[]; loading: boolean; t: TFn }) {
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

interface DemographicsSummaryData { totalPopulation: number; avgDensity: number; avgIncome: number; totalAreaKm2: number; }

function DemographicsSummary({ summary, loading, t }: { summary: DemographicsSummaryData | null; loading: boolean; t: TFn }) {
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

function DemographicsMapTab({ demographics, maxPopulation, loading, t }: { demographics: GeoDemographicRow[]; maxPopulation: number; loading: boolean; t: TFn }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          {t('geo.populationMap')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <Skeleton className="h-[420px] w-full rounded-none" />
        ) : (
          <div className="h-[420px]" role="application" aria-label="Demographics map">
            <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="h-full w-full" style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {demographics.map((d) => {
                const radius = Math.max(10, Math.min(40, (d.population / maxPopulation) * 40));
                const popColor = d.population > 800000 ? '#EF4444' : d.population > 400000 ? '#F59E0B' : '#3B82F6';
                return (
                  <CircleMarker key={`demo-${d.id}`} center={[d.latitude, d.longitude]} radius={radius} pathOptions={{ fillColor: popColor, fillOpacity: 0.35, color: popColor, weight: 2 }}>
                    <Popup>
                      <div className="space-y-2 min-w-[220px] text-sm font-sans">
                        <div className="font-semibold" style={{ color: popColor }}>{d.region}</div>
                        <Badge variant="outline" className="text-[10px]">{d.wilayaCode}</Badge>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div><span className="text-gray-500">{t('geo.totalPop')}:</span> <span className="font-mono font-bold">{formatNum(d.population)}</span></div>
                          <div><span className="text-gray-500">{t('geo.area')}:</span> <span className="font-mono">{d.areaKm2.toFixed(0)} km²</span></div>
                          <div><span className="text-gray-500">{t('geo.density')}:</span> <span className="font-mono">{d.density.toFixed(0)}</span></div>
                          <div><span className="text-gray-500">{t('geo.urban')}:</span> <span className="font-mono">{d.urbanPct.toFixed(1)}%</span></div>
                          <div><span className="text-gray-500">{t('geo.youth')}:</span> <span className="font-mono">{d.youthPct.toFixed(1)}%</span></div>
                          <div><span className="text-gray-500">{t('geo.smartphone')}:</span> <span className="font-mono">{d.smartphonePct.toFixed(1)}%</span></div>
                          <div><span className="text-gray-500">{t('geo.internet')}:</span> <span className="font-mono">{d.internetPct.toFixed(1)}%</span></div>
                          <div><span className="text-gray-500">{t('geo.income')}:</span> <span className="font-mono">{formatCurrency(d.avgIncome)}</span></div>
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

function DemographicsBarChart({ demographics, loading, t }: { demographics: GeoDemographicRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    return demographics
      .slice(0, 12)
      .map((d) => ({
        name: d.region,
        population: d.population,
        youth: d.youthPct,
        smartphone: d.smartphonePct,
      }))
      .sort((a, b) => b.population - a.population);
  }, [demographics]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.popVsYouth')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[300px] w-full" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={10} angle={-25} textAnchor="end" height={60} />
              <YAxis fontSize={11} tickFormatter={(v) => formatNum(v)} />
              <RTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="population" name={t('geo.totalPop')} fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function DemographicsTable({ demographics, loading, t }: { demographics: GeoDemographicRow[]; loading: boolean; t: TFn }) {
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

// ==================== COVERAGE GAPS TAB ====================

interface GapsSummaryData { totalGaps: number; totalSitesNeeded: number; totalPopServed: number; totalEstRevenue: number; }

function GapsSummaryCards({ summary, loading, t }: { summary: GapsSummaryData | null; loading: boolean; t: TFn }) {
  if (loading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>)}</div>;
  if (!summary) return null;
  const cards = [
    { label: t('geo.coverageGaps'), value: summary.totalGaps, icon: WifiOff, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: t('geo.popAffected'), value: formatNum(summary.totalPopServed), icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t('geo.sitesNeeded'), value: summary.totalSitesNeeded, icon: Wifi, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('geo.potentialRevenue'), value: formatNum(summary.totalEstRevenue), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
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

function GapsMapTab({ gaps, loading, t }: { gaps: GeoCoverageGapRow[]; loading: boolean; t: TFn }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            {t('geo.gapMap')}
          </CardTitle>
          <div className="flex gap-3 ml-auto text-xs">
            {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
              <span key={sev} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />{t(`geo.severityLabel.${sev}`)}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <Skeleton className="h-[420px] w-full rounded-none" />
        ) : (
          <div className="h-[420px]" role="application" aria-label="Coverage gaps map">
            <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="h-full w-full" style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {gaps.map((g) => {
                const color = SEVERITY_COLORS[g.gapSeverity] ?? '#F59E0B';
                const radius = Math.max(10, Math.min(35, (g.priorityScore / 100) * 35));
                return (
                  <CircleMarker key={`gap-${g.id}`} center={[g.latitude, g.longitude]} radius={radius} pathOptions={{ fillColor: color, fillOpacity: 0.3, color, weight: 2, dashArray: g.gapSeverity === 'critical' ? '8,4' : undefined }}>
                    <Popup>
                      <div className="space-y-2 min-w-[240px] text-sm font-sans">
                        <div className="font-semibold" style={{ color }}>{g.gapName}</div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className={`${SEVERITY_BADGE[g.gapSeverity] ?? ''} text-[10px]`}>{g.gapSeverity.toUpperCase()}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{g.technology}</Badge>
                          <Badge variant="outline" className={ACTION_BADGE[g.recommendedAction] ?? ''}>{t(`geo.action.${g.recommendedAction}`)}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div><span className="text-gray-500">{t('geo.totalPop')}:</span> <span className="font-mono">{formatNum(g.populationServed)}</span></div>
                          <div><span className="text-gray-500">{t('geo.coverage')}:</span> <span className="font-mono font-bold text-red-500">{g.coveragePct.toFixed(0)}%</span></div>
                          <div><span className="text-gray-500">{t('geo.currentSites')}:</span> <span className="font-mono">{g.currentSites}</span></div>
                          <div><span className="text-gray-500">{t('geo.requiredSites')}:</span> <span className="font-mono font-bold">{g.requiredSites}</span></div>
                          <div><span className="text-gray-500">{t('geo.priorityScore')}:</span> <span className="font-mono font-bold">{g.priorityScore.toFixed(1)}</span></div>
                          <div><span className="text-gray-500">{t('geo.revenue')}:</span> <span className="font-mono">{formatNum(g.estimatedRevenue)}</span></div>
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

function GapsSeverityChart({ gaps, loading, t }: { gaps: GeoCoverageGapRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of gaps) {
      map.set(g.gapSeverity, (map.get(g.gapSeverity) || 0) + 1);
    }
    return ['critical', 'high', 'medium', 'low']
      .filter((s) => map.has(s))
      .map((s) => ({ name: t(`geo.severityLabel.${s}`), value: map.get(s)!, key: s }));
  }, [gaps, t]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.gapBySeverity')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[280px] w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={{ strokeWidth: 1 }}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={SEVERITY_COLORS[entry.key] ?? CHART_COLORS[i]} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <RTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function GapsActionChart({ gaps, loading, t }: { gaps: GeoCoverageGapRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of gaps) {
      const label = t(`geo.action.${g.recommendedAction}`);
      map.set(label, (map.get(label) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [gaps, t]);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.gapByAction')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[280px] w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <RTooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name={t('geo.coverageGaps')} fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function GapsTable({ gaps, loading, t }: { gaps: GeoCoverageGapRow[]; loading: boolean; t: TFn }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">{t('geo.coverageGaps')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('geo.gapName')}</TableHead>
                  <TableHead>{t('th.region')}</TableHead>
                  <TableHead className="text-right">{t('geo.coverage')}</TableHead>
                  <TableHead className="text-right">{t('geo.priorityScore')}</TableHead>
                  <TableHead className="text-right">{t('geo.currentSites')}</TableHead>
                  <TableHead className="text-right">{t('geo.requiredSites')}</TableHead>
                  <TableHead>{t('geo.technology')}</TableHead>
                  <TableHead>{t('geo.severity')}</TableHead>
                  <TableHead>{t('geo.recommendedAction')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gaps.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium text-xs">{g.gapName}</TableCell>
                    <TableCell>{g.region}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={g.coveragePct < 35 ? 'text-red-500 font-bold' : g.coveragePct < 50 ? 'text-amber-500' : 'text-emerald-500'}>
                        {g.coveragePct.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono"><ScoreBar value={g.priorityScore} /></TableCell>
                    <TableCell className="text-right font-mono">{g.currentSites}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{g.requiredSites}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{g.technology}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={`${SEVERITY_BADGE[g.gapSeverity] ?? ''} text-[10px]`}>{g.gapSeverity.toUpperCase()}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={ACTION_BADGE[g.recommendedAction] ?? ''}>{t(`geo.action.${g.recommendedAction}`)}</Badge></TableCell>
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

// ==================== REVENUE IMPACT TAB ====================

interface RevenueImpactSummaryData { totalAffected: number; totalAnnualRisk: number; totalMonthlyRisk: number; totalFixCost: number; avgChurnProb: number; avgRoiRatio: number; }

function RevenueImpactSummary({ summary, loading, t }: { summary: RevenueImpactSummaryData | null | undefined; loading: boolean; t: TFn }) {
  const cards = [
    { label: t('geo.totalAnnualRisk'), value: summary ? formatCurrency(summary.totalAnnualRisk) : '—', icon: CircleDollarSign, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: t('geo.totalMonthlyRisk'), value: summary ? formatCurrency(summary.totalMonthlyRisk) : '—', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t('geo.totalAffected'), value: summary ? formatNum(summary.totalAffected) : '—', icon: Users, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: t('geo.avgChurnProb'), value: summary ? `${(summary.avgChurnProb * 100).toFixed(1)}%` : '—', icon: TrendingDown, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: t('geo.totalFixCost'), value: summary ? formatCurrency(summary.totalFixCost) : '—', icon: Wrench, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: t('geo.avgRoi'), value: summary ? `${summary.avgRoiRatio.toFixed(2)}x` : '—', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5">
                <div className={`rounded-lg p-2 ${c.bg}`}><Icon className={`h-4 w-4 ${c.color}`} /></div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{c.label}</p>
                  <p className="text-sm font-bold tracking-tight">{loading ? <Skeleton className="h-4 w-16" /> : c.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RevenueImpactMap({ zones, loading, t }: { zones: RevenueImpactRow[]; loading: boolean; t: TFn }) {
  const maxRisk = Math.max(...zones.map(z => z.annualRevenueAtRisk), 1);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.revenueRiskMap')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {loading ? <Skeleton className="h-[420px] w-full" /> : (
          <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="h-[420px] w-full z-0" style={{ background: 'var(--muted)' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OSM' />
            {zones.map((z) => {
              const ratio = z.annualRevenueAtRisk / maxRisk;
              const radius = 8 + ratio * 28;
              const fillColor = z.severity === 'critical' ? '#EF4444' : z.severity === 'high' ? '#F59E0B' : z.severity === 'medium' ? '#3B82F6' : '#10B981';
              return (
                <CircleMarker key={z.id} center={[z.latitude, z.longitude]} radius={radius} pathOptions={{ fillColor, color: fillColor, weight: 2, opacity: 0.85, fillOpacity: 0.35 }}>
                  <Popup>
                    <div className="text-xs space-y-1.5 min-w-[200px]">
                      <p className="font-bold">{z.zoneName}</p>
                      <p>{t('th.region')}: {z.region}</p>
                      <p>{t('geo.revenueAtRisk')}: <span className="font-mono font-bold text-red-500">{formatCurrency(z.annualRevenueAtRisk)}</span>/an</p>
                      <p>{t('geo.affectedSubscribers')}: {formatNum(z.affectedSubscribers)}</p>
                      <p>{t('geo.churnProb')}: <span className={z.churnProbability > 0.25 ? 'text-red-500 font-bold' : ''}>{(z.churnProbability * 100).toFixed(1)}%</span></p>
                      <p>{t('geo.degradationCause')}: {t(`geo.cause.${z.degradationCause}`)}</p>
                      <p>{t('geo.roiRatio')}: <span className="font-mono">{z.roiRatio.toFixed(2)}x</span></p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueImpactByRegionChart({ zones, loading, t }: { zones: RevenueImpactRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    const map = new Map<string, { annualRisk: number; monthlyRisk: number }>();
    zones.forEach(z => {
      const existing = map.get(z.region) ?? { annualRisk: 0, monthlyRisk: 0 };
      map.set(z.region, { annualRisk: existing.annualRisk + z.annualRevenueAtRisk, monthlyRisk: existing.monthlyRisk + z.monthlyRevenueAtRisk });
    });
    return Array.from(map.entries()).map(([region, data]) => ({
      name: region,
      [t('geo.annualRisk')]: data.annualRisk / 1_000_000,
      [t('geo.monthlyRisk')]: data.monthlyRisk / 1_000_000,
    })).sort((a, b) => b[t('geo.annualRisk')] - a[t('geo.annualRisk')]).slice(0, 10);
  }, [zones, t]);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.riskByRegion')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[300px] w-full" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={10} angle={-30} textAnchor="end" height={50} />
              <YAxis fontSize={11} />
              <RTooltip content={<CustomTooltip />} />
              <Legend fontSize={10} />
              <Bar dataKey={t('geo.annualRisk')} fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey={t('geo.monthlyRisk')} fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueImpactCauseChart({ zones, loading, t }: { zones: RevenueImpactRow[]; loading: boolean; t: TFn }) {
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    zones.forEach(z => {
      map.set(z.degradationCause, (map.get(z.degradationCause) ?? 0) + z.annualRevenueAtRisk);
    });
    return Array.from(map.entries()).map(([cause, risk]) => ({
      name: t(`geo.cause.${cause}`) ?? cause,
      value: risk,
      cause,
    })).sort((a, b) => b.value - a.value);
  }, [zones, t]);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">{t('geo.riskByCause')}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[300px] w-full" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {chartData.map((d) => (
                  <Cell key={d.cause} fill={CAUSE_COLORS[d.cause] ?? '#6B7280'} />
                ))}
              </Pie>
              <RTooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueImpactTable({ zones, loading, t }: { zones: RevenueImpactRow[]; loading: boolean; t: TFn }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">{t('geo.revenueAtRisk')} — {t('geo.impactSummary')}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <ScrollArea className="max-h-[480px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('geo.zoneName')}</TableHead>
                  <TableHead>{t('th.region')}</TableHead>
                  <TableHead className="text-right">{t('geo.affectedSubscribers')}</TableHead>
                  <TableHead className="text-right">{t('geo.churnProb')}</TableHead>
                  <TableHead className="text-right">{t('geo.annualRisk')}</TableHead>
                  <TableHead className="text-right">{t('geo.riskPerSub')}</TableHead>
                  <TableHead>{t('geo.degradationCause')}</TableHead>
                  <TableHead>{t('geo.primaryKpi')}</TableHead>
                  <TableHead>{t('geo.severity')}</TableHead>
                  <TableHead className="text-right">{t('geo.estimatedFixCost')}</TableHead>
                  <TableHead className="text-right">{t('geo.roiRatio')}</TableHead>
                  <TableHead>{t('geo.recommendedAction')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((z) => {
                  const riskPerSub = z.affectedSubscribers > 0 ? z.monthlyRevenueAtRisk / z.affectedSubscribers : 0;
                  return (
                    <TableRow key={z.id}>
                      <TableCell className="font-medium text-xs max-w-[180px] truncate">{z.zoneName}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{z.region}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatNum(z.affectedSubscribers)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className={z.churnProbability >= 0.3 ? 'text-red-500 font-bold' : z.churnProbability >= 0.2 ? 'text-amber-500' : 'text-emerald-500'}>
                          {(z.churnProbability * 100).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-red-500">{formatCurrency(z.annualRevenueAtRisk)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(Math.round(riskPerSub))}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]" style={{ borderColor: CAUSE_COLORS[z.degradationCause] ?? '#6B7280', color: CAUSE_COLORS[z.degradationCause] ?? '#6B7280' }}>{t(`geo.cause.${z.degradationCause}`)}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{z.primaryKpi}</TableCell>
                      <TableCell><Badge variant="outline" className={`${SEVERITY_BADGE[z.severity] ?? ''} text-[10px]`}>{z.severity.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(z.estimatedFixCost)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className={z.roiRatio >= 2 ? 'text-emerald-500 font-bold' : z.roiRatio >= 1 ? 'text-amber-500' : 'text-red-500'}>{z.roiRatio.toFixed(2)}x</span>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`${ACTION_BADGE[z.recommendedAction] ?? ''} text-[10px]`}>{t(`geo.action.${z.recommendedAction}`)}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
