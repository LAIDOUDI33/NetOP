'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app';
import { useT, timeAgo } from '@/lib/i18n';
import { useSocket } from '@/hooks/useSocket';
import { useEffect, useRef } from 'react';
import type { AlertItem, ViewType } from '@/types';
import { TECH_BG_CLASSES } from '@/lib/constants';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  severity: string;
  isRead: boolean;
  link?: string;
  linkLabel?: string;
  createdAt: string;
};

function getNotifDotColor(category: string): string {
  switch (category) {
    case 'alert':
    case 'incident':
      return 'bg-red-500';
    case 'change':
    case 'system':
      return 'bg-blue-500';
    case 'ai':
      return 'bg-emerald-500';
    case 'collaboration':
      return 'bg-amber-500';
    default:
      return 'bg-gray-400';
  }
}

export function NotificationCenter() {
  const queryClient = useQueryClient();
  const { setCurrentView } = useAppStore();
  const t = useT();

  const { isConnected, onAlertPulse } = useSocket();
  const criticalCountRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = onAlertPulse((pulseData) => {
      // Invalidate alerts query when critical count changes
      if (criticalCountRef.current !== pulseData.unresolvedCritical) {
        criticalCountRef.current = pulseData.unresolvedCritical;
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
      }
    });
    return unsub;
  }, [onAlertPulse, queryClient]);

  // Fetch real notifications
  const { data: notifData, isLoading: notifLoading } = useQuery<{
    notifications: NotificationItem[];
  }>({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications?limit=20').then((r) => r.json()),
    refetchInterval: 30000,
  });

  // Fetch unread notification count
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ['notifications', 'count'],
    queryFn: () => fetch('/api/notifications?count=true').then((r) => r.json()),
    refetchInterval: 15000,
  });

  // Fetch critical alerts for badge
  const { data, isLoading } = useQuery<{
    alerts: AlertItem[];
    stats: { critical: number };
  }>({
    queryKey: ['alerts', 'critical-notifications'],
    queryFn: () =>
      fetch('/api/alerts?severity=critical&resolved=false').then((r) => r.json()),
  });

  // Fetch recent alerts for the "Recent Alerts" section
  const { data: allAlertsData } = useQuery<{ alerts: AlertItem[] }>({
    queryKey: ['alerts', 'notification-list'],
    queryFn: () => fetch('/api/alerts?resolved=false').then((r) => r.json()),
  });

  // Mark all notifications read via PATCH /api/notifications
  const markAllRead = useMutation({
    mutationFn: () =>
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const criticalAlertCount = data?.stats?.critical ?? 0;
  const notifUnreadCount = countData?.count ?? 0;
  // Badge: whichever is higher
  const displayCount = Math.max(criticalAlertCount, notifUnreadCount);

  const notifications = (notifData?.notifications ?? []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const recentAlerts = (allAlertsData?.alerts ?? [])
    .filter((a) => a.severity === 'critical' || a.severity === 'warning')
    .slice(0, 10);

  const hasContent = notifications.length > 0 || recentAlerts.length > 0;
  const loading = isLoading || notifLoading;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={t('notif.title')}
        >
          <Bell
            className={`h-4 w-4 ${displayCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}
          />
          {isConnected && (
            <span className="absolute -bottom-0.5 -left-0.5 rounded-[3px] bg-emerald-500/80 px-[3px] text-[7px] font-bold uppercase leading-none text-white">
              ws
            </span>
          )}
          {displayCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
              {displayCount > 99 ? '99+' : displayCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0"
        role="dialog"
        aria-label={t('notif.title')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">{t('notif.title')}</h3>
          {hasContent && (
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : !hasContent ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8" />
              <p className="text-sm">{t('notif.noNewAlerts')}</p>
            </div>
          ) : (
            <>
              {/* Notifications section */}
              {notifications.length > 0 && (
                <ul className="divide-y">
                  {notifications.map((notif) => (
                    <li key={notif.id}>
                      <button
                        type="button"
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                          !notif.isRead ? 'bg-accent/20' : ''
                        }`}
                        onClick={() => {
                          if (notif.link) {
                            setCurrentView(notif.link as ViewType);
                          }
                        }}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${getNotifDotColor(notif.category)}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-snug">
                            {notif.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {notif.message}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {timeAgo(notif.createdAt, t)}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Recent Alerts section */}
              {recentAlerts.length > 0 && (
                <>
                  {notifications.length > 0 && (
                    <div className="flex items-center gap-2 border-t px-4 py-2">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Recent Alerts
                      </span>
                    </div>
                  )}
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
                              alert.severity === 'critical'
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm leading-snug">
                              {alert.message}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              {alert.siteName && (
                                <span className="truncate text-xs text-muted-foreground">
                                  {alert.siteName}
                                </span>
                              )}
                              <Badge
                                variant="outline"
                                className={`h-5 text-[10px] px-1.5 ${TECH_BG_CLASSES[alert.technology]}`}
                              >
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
                </>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
