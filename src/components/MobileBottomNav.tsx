'use client';

import { useAppStore } from '@/store/app';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LayoutDashboard, Bell, MapPin, MessageSquare, Settings } from 'lucide-react';
import type { ViewType } from '@/types';
import { useT } from '@/lib/i18n';

interface NavItem {
  view: ViewType;
  labelKey: string;
  icon: typeof LayoutDashboard;
}

const ITEMS: NavItem[] = [
  { view: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { view: 'alerts', labelKey: 'nav.alerts', icon: Bell },
  { view: 'coverage', labelKey: 'nav.coverage', icon: MapPin },
  { view: 'assistant', labelKey: 'nav.assistant', icon: MessageSquare },
  { view: 'settings', labelKey: 'nav.settings', icon: Settings },
];

export function MobileBottomNav() {
  const { currentView, setCurrentView } = useAppStore();
  const t = useT();

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        role="navigation"
        aria-label={t('app.mainNav')}
      >
        <div className="flex items-center justify-around">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            const label = t(item.labelKey);
            return (
              <Tooltip key={item.view}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCurrentView(item.view)}
                    className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] flex-1 py-1 text-[10px] font-medium transition-colors
                      ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                    <span className="leading-none">{label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </nav>
    </TooltipProvider>
  );
}
