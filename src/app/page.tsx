'use client';

import { useState, lazy, Suspense } from 'react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationCenter } from '@/components/NotificationCenter';
import { CommandPalette } from '@/components/CommandPalette';
import {
  LayoutDashboard, Activity, BarChart3, Bell, Sparkles,
  MapPin, FileText, Settings, ChevronLeft, Sun, Moon, Menu, Radio,
  Shield, Brain, ArrowLeftRight, Search,
} from 'lucide-react';
import type { ViewType } from '@/types';

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

const NAV_ITEMS: { view: ViewType; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'core' },
  { view: 'monitoring', label: 'Monitoring', icon: Activity, group: 'core' },
  { view: 'kpi', label: 'KPI Analytics', icon: BarChart3, group: 'core' },
  { view: 'alerts', label: 'Alerts', icon: Bell, group: 'core' },
  { view: 'optimizer', label: 'AI Optimizer', icon: Sparkles, group: 'ai' },
  { view: 'rca', label: 'Root Cause Analysis', icon: Search, group: 'ai' },
  { view: 'coverage', label: 'Coverage Map', icon: MapPin, group: 'analysis' },
  { view: 'sla', label: 'SLA Dashboard', icon: Shield, group: 'analysis' },
  { view: 'anomaly', label: 'Anomaly Detection', icon: Brain, group: 'analysis' },
  { view: 'correlation', label: 'Correlation', icon: ArrowLeftRight, group: 'analysis' },
  { view: 'reports', label: 'Reports', icon: FileText, group: 'system' },
  { view: 'settings', label: 'Parameters', icon: Settings, group: 'system' },
];

const VIEW_TITLES: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  monitoring: 'Real-Time Monitoring',
  kpi: 'KPI Analytics',
  alerts: 'Alert Management',
  optimizer: 'AI Network Optimizer',
  rca: 'Root Cause Analysis',
  coverage: 'Coverage Analysis',
  reports: 'Reports & Analytics',
  settings: 'Network Parameters',
  sla: 'SLA Compliance',
  anomaly: 'Anomaly Detection',
  correlation: 'Cross-Tech Correlation',
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
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Toggle theme</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: (view: ViewType) => void }) {
  const { currentView, setCurrentView } = useAppStore();
  const core = NAV_ITEMS.filter(n => n.group === 'core');
  const ai = NAV_ITEMS.filter(n => n.group === 'ai');
  const analysis = NAV_ITEMS.filter(n => n.group === 'analysis');
  const system = NAV_ITEMS.filter(n => n.group === 'system');

  const renderGroup = (items: typeof NAV_ITEMS, label: string) => (
    <div className="space-y-0.5">
      {!collapsed && <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.view;
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
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );

  return (
    <nav className="flex flex-col gap-3 px-2 py-4" role="navigation" aria-label="Main navigation">
      {renderGroup(core, 'Operations')}
      {renderGroup(ai, 'AI Engine')}
      {renderGroup(analysis, 'Analytics')}
      {renderGroup(system, 'System')}
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
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Home() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { currentView } = useAppStore();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const handleNavigate = (_view: ViewType) => setMobileSheetOpen(false);

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
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex items-center gap-2 px-4 py-3 border-b">
                  <Radio className="h-5 w-5 text-primary" />
                  <span className="font-bold text-sm">NetOptima</span>
                </div>
                <SidebarNav collapsed={false} onNavigate={handleNavigate} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              <span className="font-bold">NetOptima</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className={`hidden lg:flex flex-col shrink-0 bg-slate-50 dark:bg-slate-900 border-r transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-16'}`} role="complementary" aria-label="Sidebar">
          <div className={`flex items-center gap-2 px-4 h-14 border-b shrink-0 ${sidebarOpen ? '' : 'justify-center px-2'}`}>
            <Radio className="h-5 w-5 text-primary shrink-0" />
            {sidebarOpen && <span className="font-bold text-sm">NetOptima</span>}
          </div>
          <ScrollArea className="flex-1">
            <SidebarNav collapsed={!sidebarOpen} onNavigate={handleNavigate} />
          </ScrollArea>
          <div className="border-t p-2 shrink-0">
            <Button variant="ghost" size="icon" className="w-full h-8" onClick={toggleSidebar} aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
              <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="hidden lg:flex items-center justify-between h-14 px-6 border-b shrink-0">
            <div>
              <h1 className="text-lg font-bold leading-tight">{VIEW_TITLES[currentView]}</h1>
              <p className="text-xs text-muted-foreground">Mobile Network Optimization Platform</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <ThemeToggle />
            </div>
          </header>

          <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <ViewRenderer />
          </div>

          <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground mt-auto shrink-0 bg-background">
            © 2025 NetOptima · 2G · 3G · 4G · 5G Network Optimization · <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">⌘K</kbd>
          </footer>
        </main>
      </div>
    </div>
  );
}