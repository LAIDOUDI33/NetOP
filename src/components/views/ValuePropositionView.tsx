'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TrendingUp, TrendingDown, DollarSign, Activity, Users, MapPin, Zap,
  UserMinus, Clock, Unlock, BellOff, Shield, ShieldOff, Check, X, Minus,
  Trophy, Target, BarChart3, Globe, Crown, Brain, ArrowRight, Sparkles,
  Star, Eye, Layers, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  PieChart, Pie,
} from 'recharts';
import { useT } from '@/lib/i18n';

// ===== Types =====
interface VendorFeature {
  name: string;
  huawei: boolean | 'partial';
  ericsson: boolean | 'partial';
  zte: boolean | 'partial';
  ours: boolean;
  oursLabel: string;
  impact: string;
  category: string;
}

interface MaxMinItem {
  label: string;
  description: string;
  metric: string;
  current: string;
  target: string;
  icon: string;
  color: string;
}

interface PillarData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  modules: string[];
  roiPotential: string;
  maturityLevel: 'operational' | 'advanced' | 'unique';
}

interface VendorProfile {
  name: string;
  strengths: string[];
  weaknesses: string[];
  marketShare: string;
  pricingModel: string;
  lockInLevel: string;
  color: string;
}

interface ValuePropData {
  features: VendorFeature[];
  maximize: MaxMinItem[];
  minimize: MaxMinItem[];
  pillars: PillarData[];
  vendors: Record<string, VendorProfile>;
  roiCalculator: any;
  tcoComparison: any[];
  tco3Year: Record<string, number>;
  summary: {
    uniqueFeatures: number;
    totalFeatures: number;
    coveragePercent: number;
    estimatedAnnualValue: string;
    competitiveAdvantage: string;
  };
}

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, TrendingDown, DollarSign, Activity, Users, MapPin, Zap,
  UserMinus, Clock, Unlock, BellOff,
};

const COLOR_MAP: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  sky: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800',
  violet: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800',
  teal: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800',
  rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800',
  red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
  orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800',
  pink: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800',
  slate: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800',
};

const STATUS_ICON = ({ value }: { value: boolean | 'partial' }) => {
  if (value === true) return <Check className="h-4 w-4 text-emerald-500" />;
  if (value === 'partial') return <Minus className="h-4 w-4 text-amber-500" />;
  return <X className="h-4 w-4 text-red-400" />;
};

const formatDZD = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
};

// Default savings values (millions DZD) — used when API data lacks structured numeric fields
const DEFAULT_REVENUE_AT_RISK_M = 469.3;
const DEFAULT_REVENUE_LEAKAGE_M = 296.8;

export default function ValuePropositionView() {
  const t = useT();
  const [data, setData] = useState<ValuePropData | null>(null);
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
  const [activeVendor, setActiveVendor] = useState<string>('huawei');

  useEffect(() => {
    fetch('/api/value-proposition')
      .then(r => { if (!r.ok) throw new Error('Failed to fetch value proposition'); return r.json(); })
      .then(setData)
      .catch(err => console.error(err));
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded mb-3" />
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const uniqueCount = data.summary.uniqueFeatures;
  const totalSavings = DEFAULT_REVENUE_AT_RISK_M + DEFAULT_REVENUE_LEAKAGE_M;

  // TCO chart data
  const tcoChartData = data.tcoComparison.map(row => ({
    name: row.item,
    Huawei: row.huawei / 1e6,
    Ericsson: row.ericsson / 1e6,
    ZTE: row.zte / 1e6,
    [t('vp.ours')]: row.ours / 1e6,
  }));

  // Radar chart for feature coverage
  const radarData = ['AI', 'Revenue', 'Geo', 'Multi-Vendor', 'i18n', 'Automation', '5G', 'Cost'].map(cat => {
    const catFeatures = data.features.filter(f =>
      (cat === 'AI' && f.category === 'ai') ||
      (cat === 'Revenue' && f.category === 'revenue') ||
      (cat === 'Geo' && f.category === 'geomarketing') ||
      (cat === 'Multi-Vendor' && f.category === 'architecture') ||
      (cat === 'i18n' && f.category === 'ux') ||
      (cat === 'Automation' && f.category === 'automation') ||
      (cat === '5G' && f.category === '5g') ||
      (cat === 'Cost' && f.category === 'cost')
    );
    const total = catFeatures.length || 1;
    return {
      category: cat,
      Huawei: Math.round((catFeatures.filter(f => f.huawei === true).length / total) * 100),
      Ericsson: Math.round((catFeatures.filter(f => f.ericsson === true).length / total) * 100),
      ZTE: Math.round((catFeatures.filter(f => f.zte === true).length / total) * 100),
      [t('vp.ours')]: Math.round((catFeatures.filter(f => f.ours).length / total) * 100),
    };
  });

  // Feature score pie
  const featureScoreData = [
    { name: t('vp.unique'), value: uniqueCount, fill: '#10B981' },
    { name: t('vp.parity'), value: data.totalFeatures - uniqueCount, fill: '#94A3B8' },
  ];

  const maturityBadge = (level: string) => {
    if (level === 'unique') return <Badge className="bg-emerald-600 text-white border-0">{t('vp.unique')}</Badge>;
    if (level === 'advanced') return <Badge className="bg-amber-600 text-white border-0">{t('vp.advanced')}</Badge>;
    return <Badge variant="secondary">{t('vp.operational')}</Badge>;
  };

  const currentVendor = data.vendors[activeVendor];

  return (
    <div className="space-y-6">
      {/* ===== HERO SECTION ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-emerald-950 dark:via-slate-900 dark:to-sky-950 p-6 lg:p-8"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-200/20 dark:bg-emerald-800/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <Badge className="bg-emerald-600 text-white border-0 text-xs">{t('vp.competitiveEdge')}</Badge>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">{t('vp.heroTitle')}</h2>
              <p className="text-muted-foreground text-sm lg:text-base max-w-2xl">{t('vp.heroSubtitle')}</p>
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">{uniqueCount} {t('vp.uniqueFeatures')}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">{data.summary.estimatedAnnualValue} {t('vp.annualValue')}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border">
                  <ShieldOff className="h-4 w-4 text-sky-600" />
                  <span className="text-sm font-medium">{t('vp.noLockIn')}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 bg-white/80 dark:bg-slate-800/80 rounded-xl p-4 border shadow-sm min-w-[140px]">
              <span className="text-xs text-muted-foreground">{t('vp.totalSavings')}</span>
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{totalSavings}M</span>
              <span className="text-xs text-muted-foreground">DZD {t('vp.identified')}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== TABS ===== */}
      <Tabs defaultValue="maximize-minimize" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
          <TabsTrigger value="maximize-minimize" className="text-xs sm:text-sm">
            <Target className="h-4 w-4 mr-1" />{t('vp.maxMin')}
          </TabsTrigger>
          <TabsTrigger value="competitive" className="text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4 mr-1" />{t('vp.competitiveMatrix')}
          </TabsTrigger>
          <TabsTrigger value="pillars" className="text-xs sm:text-sm">
            <Layers className="h-4 w-4 mr-1" />{t('vp.diffPillars')}
          </TabsTrigger>
          <TabsTrigger value="vendor-deep" className="text-xs sm:text-sm">
            <Eye className="h-4 w-4 mr-1" />{t('vp.vendorDeepDive')}
          </TabsTrigger>
          <TabsTrigger value="tco" className="text-xs sm:text-sm">
            <DollarSign className="h-4 w-4 mr-1" />{t('vp.tcoAnalysis')}
          </TabsTrigger>
          <TabsTrigger value="roi" className="text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4 mr-1" />{t('vp.roiCalculator')}
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: MAXIMIZE / MINIMIZE ===== */}
        <TabsContent value="maximize-minimize" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* MAXIMIZE */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('vp.weMaximize')}</CardTitle>
                    <CardDescription className="text-xs">{t('vp.maximizeDesc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.maximize.map((item, i) => {
                  const IconComp = ICON_MAP[item.icon] || TrendingUp;
                  const colors = COLOR_MAP[item.color] || COLOR_MAP.emerald;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`rounded-lg border p-3 ${colors}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <IconComp className="h-5 w-5 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">{t(`vp.max.${item.label}` as any) || item.label}</p>
                            <p className="text-xs opacity-75 mt-0.5 line-clamp-2">{t(`vp.maxDesc.${item.label}` as any) || item.description}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold">{item.metric}</p>
                          <p className="text-[10px] opacity-60">{t('vp.current')}: {item.current}</p>
                          <p className="text-[10px] opacity-60">{t('vp.target')}: {item.target}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>

            {/* MINIMIZE */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('vp.weMinimize')}</CardTitle>
                    <CardDescription className="text-xs">{t('vp.minimizeDesc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.minimize.map((item, i) => {
                  const IconComp = ICON_MAP[item.icon] || TrendingDown;
                  const colors = COLOR_MAP[item.color] || COLOR_MAP.red;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`rounded-lg border p-3 ${colors}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <IconComp className="h-5 w-5 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">{t(`vp.min.${item.label}` as any) || item.label}</p>
                            <p className="text-xs opacity-75 mt-0.5 line-clamp-2">{t(`vp.minDesc.${item.label}` as any) || item.description}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold">{item.metric}</p>
                          <p className="text-[10px] opacity-60">{t('vp.current')}: {item.current}</p>
                          <p className="text-[10px] opacity-60">{t('vp.target')}: {item.target}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== TAB 2: COMPETITIVE MATRIX ===== */}
        <TabsContent value="competitive" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('vp.featureMatrix')}</CardTitle>
              <CardDescription>{t('vp.featureMatrixDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-semibold text-xs">{t('vp.feature')}</th>
                      <th className="text-center py-2 px-3 font-semibold text-xs" style={{ color: '#CF0A2C' }}>Huawei</th>
                      <th className="text-center py-2 px-3 font-semibold text-xs" style={{ color: '#002561' }}>Ericsson</th>
                      <th className="text-center py-2 px-3 font-semibold text-xs" style={{ color: '#0066B3' }}>ZTE</th>
                      <th className="text-center py-2 px-3 font-semibold text-xs text-emerald-600">{t('vp.ours')} ✦</th>
                      <th className="text-left py-2 px-3 font-semibold text-xs">{t('vp.impact')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.features.map((f, i) => (
                      <tr key={i} className={`border-b hover:bg-muted/50 transition-colors ${!f.huawei && !f.ericsson && !f.zte && f.ours ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{f.name}</span>
                            {!f.huawei && !f.ericsson && !f.zte && f.ours && (
                              <Badge className="bg-emerald-600 text-white border-0 text-[9px] px-1 py-0">{t('vp.unique')}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="text-center py-2.5 px-3"><STATUS_ICON value={f.huawei} /></td>
                        <td className="text-center py-2.5 px-3"><STATUS_ICON value={f.ericsson} /></td>
                        <td className="text-center py-2.5 px-3"><STATUS_ICON value={f.zte} /></td>
                        <td className="text-center py-2.5 px-3">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger><Check className="h-4 w-4 text-emerald-500 mx-auto" /></TooltipTrigger>
                              <TooltipContent><p className="max-w-[200px] text-xs">{f.oursLabel}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={f.impact === 'HIGH' ? 'destructive' : f.impact === 'STRATEGIC' ? 'default' : 'secondary'} className="text-[10px]">
                            {f.impact}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Radar chart + Pie chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('vp.capabilityRadar')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData}>
                    <PolarGrid strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Huawei" dataKey="Huawei" stroke="#CF0A2C" fill="#CF0A2C" fillOpacity={0.1} />
                    <Radar name="Ericsson" dataKey="Ericsson" stroke="#002561" fill="#002561" fillOpacity={0.1} />
                    <Radar name="ZTE" dataKey="ZTE" stroke="#0066B3" fill="#0066B3" fillOpacity={0.1} />
                    <Radar name={t('vp.ours')} dataKey={t('vp.ours')} stroke="#10B981" fill="#10B981" fillOpacity={0.2} strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('vp.featureUniqueness')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={featureScoreData}
                        cx="50%" cy="50%"
                        innerRadius={80}
                        outerRadius={130}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {featureScoreData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== TAB 3: DIFFERENTIATION PILLARS ===== */}
        <TabsContent value="pillars" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.pillars.map((pillar, i) => (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      {maturityBadge(pillar.maturityLevel)}
                      <Badge variant="outline" className="text-xs">{pillar.roiPotential}</Badge>
                    </div>
                    <CardTitle className="text-base mt-2">{t(`vp.pillar.${pillar.id}` as any) || pillar.name}</CardTitle>
                    <CardDescription className="text-xs italic">{pillar.tagline}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-3">{pillar.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {pillar.modules.map((m, mi) => (
                        <Badge key={mi} variant="secondary" className="text-[10px]">{m}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ===== TAB 4: VENDOR DEEP DIVE ===== */}
        <TabsContent value="vendor-deep" className="space-y-6">
          <div className="flex flex-wrap gap-2 mb-2">
            {(['huawei', 'ericsson', 'zte'] as const).map(v => (
              <button
                key={v}
                onClick={() => setActiveVendor(v)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  activeVendor === v
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground hover:bg-accent border-border'
                }`}
              >
                {data.vendors[v].name}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeVendor}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Vendor Profile Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentVendor.color }} />
                    <div>
                      <CardTitle className="text-lg">{currentVendor.name}</CardTitle>
                      <CardDescription>{t('vp.marketShare')}: {currentVendor.marketShare}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] text-muted-foreground uppercase">{t('vp.pricing')}</p>
                      <p className="text-xs font-medium mt-1">{currentVendor.pricingModel}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] text-muted-foreground uppercase">{t('vp.lockIn')}</p>
                      <div className={`mt-1 font-semibold text-sm ${
                    currentVendor.lockInLevel === 'VERY HIGH' ? 'text-red-600' :
                    currentVendor.lockInLevel === 'HIGH' ? 'text-orange-600' :
                    'text-emerald-600'
                  }`}>
                        {currentVendor.lockInLevel}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-2 text-emerald-600">✓ {t('vp.strengths')}</p>
                    <div className="space-y-1">
                      {currentVendor.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-2 text-red-600">✗ {t('vp.weaknesses')}</p>
                    <div className="space-y-1">
                      {currentVendor.weaknesses.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <X className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Our Advantage Card */}
              <Card className="border-emerald-300 dark:border-emerald-700">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    <div>
                      <CardTitle className="text-lg">{t('vp.ourAdvantage')}</CardTitle>
                      <CardDescription>{t('vp.whyWeWin')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentVendor.weaknesses.slice(0, 6).map((weakness, i) => {
                    const ourStrength = data.vendors.ours.strengths[i];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30"
                      >
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <X className="h-3 w-3 text-red-400" />
                          <ArrowRight className="h-3 w-3 text-emerald-600" />
                          <Check className="h-3 w-3 text-emerald-500" />
                        </div>
                        <div className="text-xs">
                          <p className="text-red-600 line-through">{weakness}</p>
                          {ourStrength && <p className="text-emerald-700 dark:text-emerald-400 font-medium">{ourStrength}</p>}
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ===== TAB 5: TCO ANALYSIS ===== */}
        <TabsContent value="tco" className="space-y-6">
          {/* 3-Year TCO Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(data.tco3Year).map(([vendor, cost]) => {
              const label = vendor === 'ours' ? t('vp.ours') : vendor.charAt(0).toUpperCase() + vendor.slice(1);
              const color = vendor === 'huawei' ? 'border-red-200 dark:border-red-800' :
                vendor === 'ericsson' ? 'border-blue-200 dark:border-blue-800' :
                  vendor === 'zte' ? 'border-sky-200 dark:border-sky-800' :
                    'border-emerald-200 dark:border-emerald-800';
              const minCost = Math.min(...Object.values(data.tco3Year));
              const isBest = cost === minCost;
              return (
                <Card key={vendor} className={`${color} ${isBest ? 'ring-2 ring-emerald-500' : ''}`}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">{label} — 3 {t('vp.years')}</p>
                    <p className="text-2xl font-bold mt-1">{formatDZD(cost)}</p>
                    <p className="text-xs text-muted-foreground">DZD</p>
                    {isBest && <Badge className="mt-2 bg-emerald-600 text-white border-0 text-[10px]">{t('vp.lowest')}</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('vp.tcoBreakdown')}</CardTitle>
              <CardDescription className="text-xs">{t('vp.tcoBreakdownDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={tcoChartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}M`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <RTooltip formatter={(value: number) => `${value}M DZD`} />
                  <Bar dataKey="Huawei" fill="#CF0A2C" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="Ericsson" fill="#002561" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="ZTE" fill="#0066B3" radius={[0, 2, 2, 0]} />
                  <Bar dataKey={t('vp.ours')} fill="#10B981" radius={[0, 2, 2, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB 6: ROI CALCULATOR ===== */}
        <TabsContent value="roi" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ROI Hero Card */}
            <Card className="lg:col-span-1 border-emerald-300 dark:border-emerald-700">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900 mb-4">
                  <Crown className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-xs text-muted-foreground">{t('vp.estimatedROI')}</p>
                <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 my-2">
                  {data.roiCalculator.estimatedROI}x
                </p>
                <p className="text-sm text-muted-foreground">{t('vp.roiReturn')}</p>
                <div className="w-full mt-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('vp.paybackPeriod')}</span>
                    <span className="font-bold">{data.roiCalculator.paybackMonths} {t('vp.months')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('vp.annualSavings')}</span>
                    <span className="font-bold text-emerald-600">{formatDZD(data.roiCalculator.estimatedAnnualSavings)} DZD</span>
                  </div>
                  <Progress value={85} className="h-2" />
                  <p className="text-xs text-muted-foreground">{t('vp.confidenceLevel')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Savings Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('vp.savingsBreakdown')}</CardTitle>
                <CardDescription>{t('vp.savingsBreakdownDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Revenue Leakage */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-sm">{t('vp.revenueLeakage')}</span>
                      </div>
                      <Badge variant="destructive" className="text-xs">296.8M DZD</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{t('vp.revenueLeakageDesc')}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={60} className="h-3 flex-1" />
                      <span className="text-sm font-bold text-emerald-600">~178M DZD {t('vp.recoverable')}</span>
                    </div>
                  </div>

                  {/* Revenue at Risk */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-500" />
                        <span className="font-medium text-sm">{t('vp.revenueAtRisk')}</span>
                      </div>
                      <Badge className="bg-amber-600 text-white border-0 text-xs">469.3M DZD</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{t('vp.revenueAtRiskDesc')}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={35} className="h-3 flex-1" />
                      <span className="text-sm font-bold text-emerald-600">~164M DZD {t('vp.recoverable')}</span>
                    </div>
                  </div>

                  {/* Churn Reduction */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-violet-500" />
                        <span className="font-medium text-sm">{t('vp.churnSavings')}</span>
                      </div>
                      <Badge className="bg-violet-600 text-white border-0 text-xs">~520M DZD</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{t('vp.churnSavingsDesc')}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={40} className="h-3 flex-1" />
                      <span className="text-sm font-bold text-emerald-600">~208M DZD {t('vp.recoverable')}</span>
                    </div>
                  </div>

                  {/* OPEX Savings */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-sky-500" />
                        <span className="font-medium text-sm">{t('vp.opexSavings')}</span>
                      </div>
                      <Badge className="bg-sky-600 text-white border-0 text-xs">~22% {t('vp.reduction')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{t('vp.opexSavingsDesc')}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={22} className="h-3 flex-1" />
                      <span className="text-sm font-bold text-emerald-600">~343M DZD {t('vp.recoverable')}</span>
                    </div>
                  </div>

                  {/* TOTAL */}
                  <div className="rounded-lg border-2 border-emerald-300 dark:border-emerald-700 p-4 bg-emerald-50/50 dark:bg-emerald-950/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                        <span className="text-lg font-bold">{t('vp.totalPotential')}</span>
                      </div>
                      <span className="text-2xl font-bold text-emerald-600">~1.1B DZD/{t('vp.year')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Message */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold mb-1">{t('vp.keyMessageTitle')}</p>
                  <p className="text-sm text-muted-foreground">{t('vp.keyMessageBody')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
