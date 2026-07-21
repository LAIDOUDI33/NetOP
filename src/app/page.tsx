'use client';

import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signIn, signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NotificationCenter } from '@/components/NotificationCenter';
import { CommandPalette } from '@/components/CommandPalette';
import { MODULE_VIEW_MAP, usePermissions } from '@/lib/auth-client';
import {
  LayoutDashboard, Activity, BarChart3, Bell, Sparkles,
  MapPin, FileText, Settings, ChevronLeft, Sun, Moon, Menu, Radio,
  Shield, Brain, ArrowLeftRight, Search, Cpu, Server, PlusCircle, Plug, HeartPulse,
  Settings2, TrendingUp, Layers, Zap, Users, AlertTriangle,
  Heart, Target, Scale, MapPinOff, GitBranch, PowerOff, BookOpen, MessageSquare,
  FlaskConical, DollarSign, RadioTower, ArrowRightLeft as ArrowSwap, Gauge, Globe, FileSearch, Crown, GitCompare,
  Languages, LogOut, UserCircle, Eye, EyeOff, Loader2,
} from 'lucide-react';
import type { ViewType } from '@/types';
import { useT } from '@/lib/i18n';

import DashboardView from '@/components/views/DashboardView';
import MonitoringView from '@/components/views/MonitoringView';
import KpiAnalyticsView from '@/components/views/KpiAnalyticsView';
import AlertsView from '@/components/views/AlertsView';
import OptimizerView from '@/components/views/OptimizerView';
import CoverageMapView from '@/components/views/CoverageMapView';
import ReportsView from '@/components/views/ReportsView';
import SettingsView from '@/components/views/SettingsView';

// Enterprise views - dynamic import to reduce initial bundle
const SLADashboardView = lazy(() => import('@/components/views/SLADashboardView'));
const AnomalyDetectionView = lazy(() => import('@/components/views/AnomalyDetectionView'));
const CorrelationView = lazy(() => import('@/components/views/CorrelationView'));
const RootCauseAnalysisView = lazy(() => import('@/components/views/RootCauseAnalysisView'));
const SonView = lazy(() => import('@/components/views/SonView'));
const PoliciesView = lazy(() => import('@/components/views/PoliciesView'));
const OnboardingView = lazy(() => import('@/components/views/OnboardingView'));
const VendorsView = lazy(() => import('@/components/views/VendorsView'));
const QoEView = lazy(() => import('@/components/views/QoEView'));
const CapacityView = lazy(() => import('@/components/views/CapacityView'));
const SlicingView = lazy(() => import('@/components/views/SlicingView'));
const EnergyView = lazy(() => import('@/components/views/EnergyView'));
const FaultsView = lazy(() => import('@/components/views/FaultsView'));
const SubscribersView = lazy(() => import('@/components/views/SubscribersView'));
const IncidentsView = lazy(() => import('@/components/views/IncidentsView'));
const ConfigView = lazy(() => import('@/components/views/ConfigView'));
const LiveView = lazy(() => import('@/components/views/LiveView'));
const HealthView = lazy(() => import('@/components/views/HealthView'));
const BenchmarkView = lazy(() => import('@/components/views/BenchmarkView'));
const HandoverView = lazy(() => import('@/components/views/HandoverView'));
const LoadBalancingView = lazy(() => import('@/components/views/LoadBalancingView'));
const InterferenceView = lazy(() => import('@/components/views/InterferenceView'));
const CoverageHolesView = lazy(() => import('@/components/views/CoverageHolesView'));
const ChangesView = lazy(() => import('@/components/views/ChangesView'));
const OutagesView = lazy(() => import('@/components/views/OutagesView'));
const PlaybooksView = lazy(() => import('@/components/views/PlaybooksView'));
const AssistantView = lazy(() => import('@/components/views/AssistantView'));
const SimulationsView = lazy(() => import('@/components/views/SimulationsView'));
const TrendsView = lazy(() => import('@/components/views/TrendsView'));
const RoiView = lazy(() => import('@/components/views/RoiView'));
const SpectrumView = lazy(() => import('@/components/views/SpectrumView'));
const EvolutionView = lazy(() => import('@/components/views/EvolutionView'));
const NpiView = lazy(() => import('@/components/views/NpiView'));
const ServicesView = lazy(() => import('@/components/views/ServicesView'));
const AuditView = lazy(() => import('@/components/views/AuditView'));
const ExecutiveView = lazy(() => import('@/components/views/ExecutiveView'));
const VendorCompareView = lazy(() => import('@/components/views/VendorCompareView'));

const NAV_ITEMS: { view: ViewType; labelKey: string; icon: typeof LayoutDashboard; group?: string }[] = [
  // Operations
  { view: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, group: 'Operations' },
  { view: 'monitoring', labelKey: 'nav.monitoring', icon: Activity, group: 'Operations' },
  { view: 'son', labelKey: 'nav.son', icon: Cpu, group: 'Operations' },
  { view: 'onboarding', labelKey: 'nav.onboarding', icon: PlusCircle, group: 'Operations' },
  { view: 'live', labelKey: 'nav.live', icon: Activity, group: 'Operations' },
  { view: 'incidents', labelKey: 'nav.incidents', icon: AlertTriangle, group: 'Operations' },
  { view: 'outages', labelKey: 'nav.outages', icon: PowerOff, group: 'Operations' },
  { view: 'spectrum', labelKey: 'nav.spectrum', icon: RadioTower, group: 'Operations' },
  // Analytics
  { view: 'kpi', labelKey: 'nav.kpi', icon: BarChart3, group: 'Analytics' },
  { view: 'alerts', labelKey: 'nav.alerts', icon: Bell, group: 'Analytics' },
  { view: 'coverage', labelKey: 'nav.coverage', icon: MapPin, group: 'Analytics' },
  { view: 'correlation', labelKey: 'nav.correlation', icon: ArrowLeftRight, group: 'Analytics' },
  { view: 'qoe', labelKey: 'nav.qoe', icon: HeartPulse, group: 'Analytics' },
  { view: 'capacity', labelKey: 'nav.capacity', icon: TrendingUp, group: 'Analytics' },
  { view: 'handover', labelKey: 'nav.handover', icon: ArrowSwap, group: 'Analytics' },
  { view: 'load', labelKey: 'nav.load', icon: Scale, group: 'Analytics' },
  { view: 'interference', labelKey: 'nav.interference', icon: Radio, group: 'Analytics' },
  { view: 'coverage-holes', labelKey: 'nav.coverageHoles', icon: MapPinOff, group: 'Analytics' },
  { view: 'vendor-compare', labelKey: 'nav.vendorCompare', icon: GitCompare, group: 'Analytics' },
  { view: 'services', labelKey: 'nav.services', icon: Globe, group: 'Analytics' },
  // Intelligence
  { view: 'slicing', labelKey: 'nav.slicing', icon: Layers, group: 'Intelligence' },
  { view: 'energy', labelKey: 'nav.energy', icon: Zap, group: 'Intelligence' },
  { view: 'faults', labelKey: 'nav.faults', icon: Brain, group: 'Intelligence' },
  { view: 'subscribers', labelKey: 'nav.subscribers', icon: Users, group: 'Intelligence' },
  { view: 'health', labelKey: 'nav.health', icon: Heart, group: 'Intelligence' },
  { view: 'benchmark', labelKey: 'nav.benchmark', icon: Target, group: 'Intelligence' },
  { view: 'playbooks', labelKey: 'nav.playbooks', icon: BookOpen, group: 'Intelligence' },
  { view: 'assistant', labelKey: 'nav.assistant', icon: MessageSquare, group: 'Intelligence' },
  { view: 'npi', labelKey: 'nav.npi', icon: Gauge, group: 'Intelligence' },
  { view: 'trends', labelKey: 'nav.trends', icon: TrendingUp, group: 'Intelligence' },
  { view: 'simulations', labelKey: 'nav.simulations', icon: FlaskConical, group: 'Intelligence' },
  { view: 'roi', labelKey: 'nav.roi', icon: DollarSign, group: 'Intelligence' },
  { view: 'evolution', labelKey: 'nav.evolution', icon: ArrowSwap, group: 'Intelligence' },
  { view: 'audit', labelKey: 'nav.audit', icon: FileSearch, group: 'Intelligence' },
  { view: 'executive', labelKey: 'nav.executive', icon: Crown, group: 'Intelligence' },
  // AI Engine
  { view: 'optimizer', labelKey: 'nav.optimizer', icon: Sparkles, group: 'AI Engine' },
  { view: 'rca', labelKey: 'nav.rca', icon: Search, group: 'AI Engine' },
  { view: 'anomaly', labelKey: 'nav.anomaly', icon: Brain, group: 'AI Engine' },
  // Automation
  { view: 'policies', labelKey: 'nav.policies', icon: Shield, group: 'Automation' },
  { view: 'changes', labelKey: 'nav.changes', icon: GitBranch, group: 'Automation' },
  { view: 'vendors', labelKey: 'nav.vendors', icon: Plug, group: 'Automation' },
  // System
  { view: 'reports', labelKey: 'nav.reports', icon: FileText, group: 'System' },
  { view: 'sla', labelKey: 'nav.sla', icon: Shield, group: 'System' },
  { view: 'config', labelKey: 'nav.config', icon: Settings2, group: 'System' },
  { view: 'settings', labelKey: 'nav.settings', icon: Settings, group: 'System' },
];

const VIEW_TITLE_KEYS: Record<ViewType, string> = {
  dashboard: 'title.dashboard',
  monitoring: 'title.monitoring',
  son: 'title.son',
  onboarding: 'title.onboarding',
  kpi: 'title.kpi',
  alerts: 'title.alerts',
  optimizer: 'title.optimizer',
  rca: 'title.rca',
  coverage: 'title.coverage',
  reports: 'title.reports',
  settings: 'title.settings',
  sla: 'title.sla',
  anomaly: 'title.anomaly',
  correlation: 'title.correlation',
  policies: 'title.policies',
  vendors: 'title.vendors',
  qoe: 'title.qoe',
  capacity: 'title.capacity',
  slicing: 'title.slicing',
  energy: 'title.energy',
  faults: 'title.faults',
  subscribers: 'title.subscribers',
  incidents: 'title.incidents',
  config: 'title.config',
  live: 'title.live',
  health: 'title.health',
  benchmark: 'title.benchmark',
  handover: 'title.handover',
  load: 'title.load',
  interference: 'title.interference',
  'coverage-holes': 'title.coverageHoles',
  changes: 'title.changes',
  outages: 'title.outages',
  playbooks: 'title.playbooks',
  assistant: 'title.assistant',
  simulations: 'title.simulations',
  trends: 'title.trends',
  roi: 'title.roi',
  spectrum: 'title.spectrum',
  evolution: 'title.evolution',
  npi: 'title.npi',
  services: 'title.services',
  audit: 'title.audit',
  executive: 'title.executive',
  'vendor-compare': 'title.vendorCompare',
};

function ViewFallback() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-6"><Skeleton className="h-72 w-full" /></div>
        <div className="rounded-lg border bg-card p-6"><Skeleton className="h-72 w-full" /></div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useT();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{t('app.toggleTheme')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>{t('app.toggleTheme')}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function LocaleToggle() {
  const { locale, setLocale } = useAppStore();
  const t = useT();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocale(locale === 'en' ? 'fr' : 'en')}>
            <Languages className="h-4 w-4" />
            <span className="sr-only">{locale === 'en' ? t('lang.fr') : t('lang.en')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>{locale === 'en' ? t('lang.fr') : t('lang.en')}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const NAV_GROUP_KEYS: Record<string, string> = {
  'Operations': 'nav.group.operations',
  'Analytics': 'nav.group.analytics',
  'Intelligence': 'nav.group.intelligence',
  'AI Engine': 'nav.group.aiEngine',
  'Automation': 'nav.group.automation',
  'System': 'nav.group.system',
};

function SidebarNav({ collapsed, onNavigate, allowedViews }: { collapsed: boolean; onNavigate: (view: ViewType) => void; allowedViews: Set<string> }) {
  const { currentView, setCurrentView } = useAppStore();
  const t = useT();
  const groups = ['Operations', 'Analytics', 'Intelligence', 'AI Engine', 'Automation', 'System'] as const;

  const renderGroup = (items: typeof NAV_ITEMS, label: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-0.5">
        {!collapsed && <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t(NAV_GROUP_KEYS[label] ?? label)}</p>}
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;
          const label = t(item.labelKey);
          return (
            <TooltipProvider key={item.view} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { setCurrentView(item.view); onNavigate(item.view); }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all w-full text-left
                      ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}
                      ${collapsed ? 'justify-center px-2' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right"><p>{label}</p></TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  };

  return (
    <nav className="flex flex-col gap-3 px-2 py-4" role="navigation" aria-label={t('app.mainNav')}>
      {groups.map(g => {
        const items = NAV_ITEMS.filter(n => n.group === g && allowedViews.has(n.view));
        return items.length > 0 ? <div key={g}>{renderGroup(items, g)}</div> : null;
      })}
    </nav>
  );
}

function ViewRenderer() {
  const { currentView } = useAppStore();
  const variants = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

  return (
    <AnimatePresence mode="wait">
      <motion.div key={currentView} variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
        <Suspense fallback={<ViewFallback />}>
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'monitoring' && <MonitoringView />}
          {currentView === 'kpi' && <KpiAnalyticsView />}
          {currentView === 'alerts' && <AlertsView />}
          {currentView === 'optimizer' && <OptimizerView />}
          {currentView === 'rca' && <RootCauseAnalysisView />}
          {currentView === 'coverage' && <CoverageMapView />}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'settings' && <SettingsView />}
          {currentView === 'sla' && <SLADashboardView />}
          {currentView === 'anomaly' && <AnomalyDetectionView />}
          {currentView === 'correlation' && <CorrelationView />}
          {currentView === 'son' && <SonView />}
          {currentView === 'policies' && <PoliciesView />}
          {currentView === 'onboarding' && <OnboardingView />}
          {currentView === 'vendors' && <VendorsView />}
          {currentView === 'qoe' && <QoEView />}
          {currentView === 'capacity' && <CapacityView />}
          {currentView === 'slicing' && <SlicingView />}
          {currentView === 'energy' && <EnergyView />}
          {currentView === 'faults' && <FaultsView />}
          {currentView === 'subscribers' && <SubscribersView />}
          {currentView === 'incidents' && <IncidentsView />}
          {currentView === 'config' && <ConfigView />}
          {currentView === 'live' && <LiveView />}
          {currentView === 'health' && <HealthView />}
          {currentView === 'benchmark' && <BenchmarkView />}
          {currentView === 'handover' && <HandoverView />}
          {currentView === 'load' && <LoadBalancingView />}
          {currentView === 'interference' && <InterferenceView />}
          {currentView === 'coverage-holes' && <CoverageHolesView />}
          {currentView === 'changes' && <ChangesView />}
          {currentView === 'outages' && <OutagesView />}
          {currentView === 'playbooks' && <PlaybooksView />}
          {currentView === 'assistant' && <AssistantView />}
          {currentView === 'simulations' && <SimulationsView />}
          {currentView === 'trends' && <TrendsView />}
          {currentView === 'roi' && <RoiView />}
          {currentView === 'spectrum' && <SpectrumView />}
          {currentView === 'evolution' && <EvolutionView />}
          {currentView === 'npi' && <NpiView />}
          {currentView === 'services' && <ServicesView />}
          {currentView === 'audit' && <AuditView />}
          {currentView === 'executive' && <ExecutiveView />}
          {currentView === 'vendor-compare' && <VendorCompareView />}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError(t('auth.invalidCredentials'));
      }
    } catch {
      setError(t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>
      <div className="w-full max-w-md relative z-10 rounded-xl border border-slate-700 bg-slate-800/90 backdrop-blur-xl shadow-2xl p-8">
        <div className="text-center space-y-3 mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Shield className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">NetOptima</h1>
            <p className="text-slate-400 mt-1">{t('auth.subtitle')}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</div>}
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-sm text-slate-300">{t('auth.email')}</label>
            <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@netoptima.local" required className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500" autoComplete="email" />
          </div>
          <div className="space-y-2">
            <label htmlFor="login-password" className="text-sm text-slate-300">{t('auth.password')}</label>
            <div className="relative">
              <Input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 pr-10" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading || !email || !password} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-11">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('auth.signingIn')}</> : t('auth.signIn')}
          </Button>
        </form>
        <div className="mt-6 p-3 rounded-lg bg-slate-700/30 border border-slate-600/50">
          <p className="text-xs text-slate-400 font-medium mb-2">{t('auth.demoAccounts')}</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500">
            <div><span className="text-emerald-400 font-medium">admin</span>@netoptima.local</div><div className="text-slate-600">admin123</div>
            <div><span className="text-cyan-400 font-medium">noc</span>@netoptima.local</div><div className="text-slate-600">demo123</div>
            <div><span className="text-amber-400 font-medium">rf</span>@netoptima.local</div><div className="text-slate-600">demo123</div>
            <div><span className="text-violet-400 font-medium">viewer</span>@netoptima.local</div><div className="text-slate-600">demo123</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserMenu() {
  const { data: session } = useSession();
  const { isSuperAdmin, roles } = usePermissions();
  const t = useT();
  const user = session?.user;

  if (!user) return null;

  const initials = ((user as any).name ?? user.email ?? 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-56" align="end" forceMount>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium">{(user as any).name ?? user.email}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {roles.map((r: string) => (
                <Badge key={r} variant={isSuperAdmin ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">{r}</Badge>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })} className="text-red-600 focus:text-red-600 cursor-pointer">
        <LogOut className="mr-2 h-4 w-4" />
        {t('auth.signOut')}
      </DropdownMenuItem>
    </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Home() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { currentView } = useAppStore();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const { data: session, status } = useSession();
  const { permissions, hasPermission } = usePermissions();
  const t = useT();

  // Compute allowed views from permissions (reactive)
  const allowedViews = useMemo(() => {
    const views = new Set<string>();
    const perms = permissions;
    for (const [mod, viewList] of Object.entries(MODULE_VIEW_MAP)) {
      if (perms.includes('*:*') || perms.includes(`${mod}:*`) || perms.includes(`${mod}:view`)) {
        viewList.forEach(v => views.add(v));
      }
    }
    // Always allow settings for authenticated users
    views.add('settings');
    return views;
  }, [permissions]);

  const handleNavigate = (_view: ViewType) => setMobileSheetOpen(false);

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Radio className="h-10 w-10 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!session) {
    // Dynamically render login page inline
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <CommandPalette />

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-slate-50 dark:bg-slate-900">
                <SheetTitle className="sr-only">{t('app.navigation')}</SheetTitle>
                <div className="flex items-center gap-2 px-4 py-3 border-b">
                  <Radio className="h-5 w-5 text-primary" />
                  <span className="font-bold text-sm">{t('app.brand')}</span>
                </div>
                <SidebarNav collapsed={false} onNavigate={handleNavigate} allowedViews={allowedViews} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              <span className="font-bold">{t('app.brand')}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <LocaleToggle />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className={`hidden lg:flex flex-col shrink-0 bg-slate-50 dark:bg-slate-900 border-r transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-16'}`} role="complementary" aria-label={t('app.sidebar')}>
          <div className={`flex items-center gap-2 px-4 h-14 border-b shrink-0 ${sidebarOpen ? '' : 'justify-center px-2'}`}>
            <Radio className="h-5 w-5 text-primary shrink-0" />
            {sidebarOpen && <span className="font-bold text-sm">{t('app.brand')}</span>}
          </div>
          <ScrollArea className="flex-1">
            <SidebarNav collapsed={!sidebarOpen} onNavigate={handleNavigate} allowedViews={allowedViews} />
          </ScrollArea>
          <div className="border-t p-2 shrink-0 flex items-center gap-1">
            {sidebarOpen && <UserMenu />}
            <Button variant="ghost" size="icon" className={`h-8 ${sidebarOpen ? 'w-8 ml-auto' : 'w-full'}`} onClick={toggleSidebar} aria-label={sidebarOpen ? t('app.collapseSidebar') : t('app.expandSidebar')}>
              <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="hidden lg:flex items-center justify-between h-14 px-6 border-b shrink-0">
            <div>
              <h1 className="text-lg font-bold leading-tight">{t(VIEW_TITLE_KEYS[currentView])}</h1>
              <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <LocaleToggle />
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>

          <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <ViewRenderer />
          </div>

          <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground mt-auto shrink-0 bg-background" dangerouslySetInnerHTML={{ __html: t('app.footer') }} />
        </main>
      </div>
    </div>
  );
}