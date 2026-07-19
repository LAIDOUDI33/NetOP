'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard, Activity, BarChart3, Bell, Sparkles,
  MapPin, FileText, Settings, ChevronLeft, Sun, Moon, Menu, Radio,
} from 'lucide-react';
import DashboardView from '@/components/views/DashboardView';
import MonitoringView from '@/components/views/MonitoringView';
import KpiAnalyticsView from '@/components/views/KpiAnalyticsView';
import AlertsView from '@/components/views/AlertsView';
import OptimizerView from '@/components/views/OptimizerView';
import CoverageView from '@/components/views/CoverageView';
import ReportsView from '@/components/views/ReportsView';
import SettingsView from '@/components/views/SettingsView';
import type { ViewType } from '@/types';

const NAV_ITEMS: { view: ViewType; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'monitoring', label: 'Monitoring', icon: Activity },
  { view: 'kpi', label: 'KPI Analytics', icon: BarChart3 },
  { view: 'alerts', label: 'Alerts', icon: Bell },
  { view: 'optimizer', label: 'AI Optimizer', icon: Sparkles },
  { view: 'coverage', label: 'Coverage', icon: MapPin },
  { view: 'reports', label: 'Reports', icon: FileText },
  { view: 'settings', label: 'Settings', icon: Settings },
];

const VIEW_TITLES: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  monitoring: 'Real-Time Monitoring',
  kpi: 'KPI Analytics',
  alerts: 'Alert Management',
  optimizer: 'AI Network Optimizer',
  coverage: 'Coverage Analysis',
  reports: 'Reports & Analytics',
  settings: 'Network Parameters',
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle dark mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: (view: ViewType) => void }) {
  const { currentView, setCurrentView } = useAppStore();

  const handleClick = (view: ViewType) => {
    setCurrentView(view);
    onNavigate(view);
  };

  return (
    <nav className="flex flex-col gap-1 px-2 py-4" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.view;
        return (
          <TooltipProvider key={item.view} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleClick(item.view)}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                    w-full text-left
                    ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                    ${collapsed ? 'justify-center px-2' : ''}
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </nav>
  );
}

function ViewRenderer() {
  const { currentView } = useAppStore();
  switch (currentView) {
    case 'dashboard': return <DashboardView />;
    case 'monitoring': return <MonitoringView />;
    case 'kpi': return <KpiAnalyticsView />;
    case 'alerts': return <AlertsView />;
    case 'optimizer': return <OptimizerView />;
    case 'coverage': return <CoverageView />;
    case 'reports': return <ReportsView />;
    case 'settings': return <SettingsView />;
    default: return <DashboardView />;
  }
}

export default function Home() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { currentView } = useAppStore();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const handleNavigate = (_view: ViewType) => {
    setMobileSheetOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
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
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside
          className={`
            hidden lg:flex flex-col shrink-0 bg-slate-50 dark:bg-slate-900 border-r
            transition-all duration-200
            ${sidebarOpen ? 'w-56' : 'w-16'}
          `}
          role="complementary"
          aria-label="Sidebar"
        >
          {/* Sidebar Header */}
          <div className={`flex items-center gap-2 px-4 h-14 border-b shrink-0 ${sidebarOpen ? '' : 'justify-center px-2'}`}>
            <Radio className="h-5 w-5 text-primary shrink-0" />
            {sidebarOpen && <span className="font-bold text-sm">NetOptima</span>}
          </div>

          <ScrollArea className="flex-1">
            <SidebarNav collapsed={!sidebarOpen} onNavigate={handleNavigate} />
          </ScrollArea>

          {/* Collapse Toggle */}
          <div className="border-t p-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-8"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between h-14 px-6 border-b shrink-0">
            <div>
              <h1 className="text-lg font-bold leading-tight">{VIEW_TITLES[currentView]}</h1>
              <p className="text-xs text-muted-foreground">Mobile Network Optimization Platform</p>
            </div>
            <ThemeToggle />
          </header>

          {/* Content Area */}
          <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <ViewRenderer />
          </div>

          {/* Footer */}
          <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground mt-auto shrink-0 bg-background">
            © 2025 NetOptima · 2G · 3G · 4G · 5G Network Optimization
          </footer>
        </main>
      </div>
    </div>
  );
}