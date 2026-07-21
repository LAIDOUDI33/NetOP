'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Bell,
  Sparkles,
  MapPin,
  FileText,
  Settings,
  Shield,
  Brain,
  ArrowLeftRight,
  AlertTriangle,
  Search,
} from 'lucide-react';
import type { ViewType } from '@/types';
import { useT } from '@/lib/i18n';

const NAV_COMMANDS: { view: ViewType; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { view: 'dashboard', labelKey: 'title.dashboard', icon: LayoutDashboard },
  { view: 'monitoring', labelKey: 'title.monitoring', icon: Activity },
  { view: 'kpi', labelKey: 'title.kpi', icon: BarChart3 },
  { view: 'alerts', labelKey: 'title.alerts', icon: Bell },
  { view: 'optimizer', labelKey: 'title.optimizer', icon: Sparkles },
  { view: 'coverage', labelKey: 'title.coverage', icon: MapPin },
  { view: 'reports', labelKey: 'title.reports', icon: FileText },
  { view: 'settings', labelKey: 'title.settings', icon: Settings },
  { view: 'sla', labelKey: 'title.sla', icon: Shield },
  { view: 'anomaly', labelKey: 'title.anomaly', icon: Brain },
  { view: 'correlation', labelKey: 'title.correlation', icon: ArrowLeftRight },
  { view: 'rca', labelKey: 'title.rca', icon: Search },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { setCurrentView } = useAppStore();
  const t = useT();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (view: ViewType) => {
    setCurrentView(view);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogHeader className="sr-only">
        <DialogTitle>{t('cmd.title')}</DialogTitle>
        <DialogDescription>{t('cmd.description')}</DialogDescription>
      </DialogHeader>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput placeholder={t('cmd.placeholder')} />
          <CommandList>
            <CommandEmpty>{t('cmd.noResults')}</CommandEmpty>
            <CommandGroup heading={t('cmd.navigation')}>
              {NAV_COMMANDS.map((cmd) => {
                const Icon = cmd.icon;
                const label = t(cmd.labelKey);
                return (
                  <CommandItem
                    key={cmd.view}
                    value={label}
                    onSelect={() => handleSelect(cmd.view)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandGroup heading={t('cmd.quickActions')}>
              <CommandItem
                value={t('cmd.viewCriticalAlerts')}
                onSelect={() => {
                  setCurrentView('alerts');
                  setOpen(false);
                }}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                {t('cmd.viewCriticalAlerts')}
              </CommandItem>
              <CommandItem
                value={t('cmd.openOptimizer')}
                onSelect={() => {
                  setCurrentView('optimizer');
                  setOpen(false);
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {t('cmd.openOptimizer')}
              </CommandItem>
              <CommandItem
                value={t('cmd.check4gHealth')}
                onSelect={() => {
                  setCurrentView('monitoring');
                  setOpen(false);
                }}
              >
                <Activity className="mr-2 h-4 w-4" />
                {t('cmd.check4gHealth')}
              </CommandItem>
              <CommandItem
                value={t('cmd.check5gHealth')}
                onSelect={() => {
                  setCurrentView('monitoring');
                  setOpen(false);
                }}
              >
                <Activity className="mr-2 h-4 w-4" />
                {t('cmd.check5gHealth')}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground text-center">
          {t('cmd.pressEsc')}
        </div>
      </DialogContent>
    </Dialog>
  );
}
