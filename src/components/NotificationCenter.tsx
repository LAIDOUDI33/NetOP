'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app';
import { useT, timeAgo } from '@/lib/i18n';
import type { AlertItem } from '@/types';
import { TECH_BG_CLASSES } from '@/lib/constants';

export function NotificationCenter() {
  const queryClient = useQueryClient();
  const { setCurrentView } = useAppStore();
  const t = useT();

  const { data, isLoading } = useQuery<{ alerts: AlertItem[]; stats: { critical: number } }>({
    queryKey: ['alerts', 'critical-notifications'],
    queryFn: () => fetch('/api/alerts?severity=critical&resolved=false').then((r) => r.json()),
    refetchInterval: 30000,
  });

  const { data: allAlertsData } = useQuery<{ alerts: AlertItem[] }>({
    queryKey: ['alerts', 'notification-list'],
    queryFn: () => fetch('/api/alerts?resolved=false').then((r) => r.json()),
    refetchInterval: 30000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const allAlerts = allAlertsData?.alerts?.slice(0, 10) ?? [];
      await Promise.all(
        allAlerts.map((a) =>
          fetch('/api/alerts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alertId: a.id, action: 'acknowledge' }),
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const criticalCount = data?.stats?.critical ?? 0;
  const recentAlerts = (allAlertsData?.alerts ?? [])
    .filter((a) => a.severity === 'critical' || a.severity === 'warning')
    .slice(0, 10);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label={t('notif.title')}>
          <Bell className={`h-4 w-4 ${criticalCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`} />
          {criticalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
              {criticalCount > 99 ? '99+' : criticalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">{t('notif.title')}</h3>
          {recentAlerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {t('notif.markAllRead')}
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : recentAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8" />
              <p className="text-sm">{t('notif.noNewAlerts')}</p>
            </div>
          ) : (
            <ul className="divide-y">
              {recentAlerts.map((alert) => (
                <li key={alert.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                    onClick={() => {
                      setCurrentView('alerts');
                    }}
                  >
                    {/* Severity dot */}
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm leading-snug">{alert.message}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {alert.siteName && (
                          <span className="truncate text-xs text-muted-foreground">{alert.siteName}</span>
                        )}
                        <Badge variant="outline" className={`h-5 text-[10px] px-1.5 ${TECH_BG_CLASSES[alert.technology]}`}>
                          {alert.technology}
                        </Badge>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {timeAgo(alert.createdAt, t)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}