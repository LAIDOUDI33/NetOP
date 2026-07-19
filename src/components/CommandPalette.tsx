// Command Palette for NetOptima
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
} from 'lucide-react';
import type { ViewType } from '@/types';

const NAV_COMMANDS: { view: ViewType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'monitoring', label: 'Real-Time Monitoring', icon: Activity },
  { view: 'kpi', label: 'KPI Analytics', icon: BarChart3 },
  { view: 'alerts', label: 'Alert Management', icon: Bell },
  { view: 'optimizer', label: 'AI Network Optimizer', icon: Sparkles },
  { view: 'coverage', label: 'Coverage Analysis', icon: MapPin },
  { view: 'reports', label: 'Reports & Analytics', icon: FileText },
  { view: 'settings', label: 'Network Parameters', icon: Settings },
  { view: 'sla', label: 'SLA Dashboard', icon: Shield },
  { view: 'anomaly', label: 'Anomaly Detection', icon: Brain },
  { view: 'correlation', label: 'Correlation Analysis', icon: ArrowLeftRight },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { setCurrentView } = useAppStore();

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
        <DialogTitle>Command Palette</DialogTitle>
        <DialogDescription>Search for views and actions</DialogDescription>
      </DialogHeader>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput placeholder="Search views, actions..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {NAV_COMMANDS.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <CommandItem
                    key={cmd.view}
                    value={cmd.label}
                    onSelect={() => handleSelect(cmd.view)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {cmd.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandGroup heading="Quick Actions">
              <CommandItem
                value="View Critical Alerts"
                onSelect={() => {
                  setCurrentView('alerts');
                  setOpen(false);
                }}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                View Critical Alerts
              </CommandItem>
              <CommandItem
                value="Open AI Optimizer"
                onSelect={() => {
                  setCurrentView('optimizer');
                  setOpen(false);
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Open AI Optimizer
              </CommandItem>
              <CommandItem
                value="Check 4G Health"
                onSelect={() => {
                  setCurrentView('monitoring');
                  setOpen(false);
                }}
              >
                <Activity className="mr-2 h-4 w-4" />
                Check 4G Health
              </CommandItem>
              <CommandItem
                value="Check 5G Health"
                onSelect={() => {
                  setCurrentView('monitoring');
                  setOpen(false);
                }}
              >
                <Activity className="mr-2 h-4 w-4" />
                Check 5G Health
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground text-center">
          NetOptima · Press ESC to close
        </div>
      </DialogContent>
    </Dialog>
  );
}