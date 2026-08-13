'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSocket, type LiveAlertItem } from '@/hooks/useSocket';
import { useAppStore } from '@/store/app';
import { useT } from '@/lib/i18n';
import { AlertTriangle, AlertCircle } from 'lucide-react';

export function RealtimeAlertToasts() {
  const { onLiveAlerts } = useSocket();
  const { setCurrentView } = useAppStore();
  const t = useT();
  const lastAlertIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsub = onLiveAlerts((alerts: LiveAlertItem[]) => {
      // Deduplicate: only show alerts we haven't seen
      const newAlerts = alerts.filter(a => !lastAlertIdsRef.current.has(a.id));
      if (newAlerts.length === 0) return;

      // Track seen IDs (keep last 500 to avoid memory leak)
      newAlerts.forEach(a => lastAlertIdsRef.current.add(a.id));
      if (lastAlertIdsRef.current.size > 500) {
        const arr = Array.from(lastAlertIdsRef.current);
        lastAlertIdsRef.current = new Set(arr.slice(-250));
      }

      // Show toast for each new alert (max 3 at a time to avoid spam)
      const toShow = newAlerts.slice(0, 3);
      for (const alert of toShow) {
        const isCritical = alert.severity === 'critical';
        const Icon = isCritical ? AlertTriangle : AlertCircle;

        toast[isCritical ? 'error' : 'warning'](
          <button
            type="button"
            className="flex items-start gap-2 text-start w-full"
            onClick={() => setCurrentView('alerts')}
          >
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isCritical ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{alert.siteName} {alert.siteCode ? `(${alert.siteCode})` : ''}</p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{alert.message}</p>
            </div>
          </button>,
          {
            id: `alert-${alert.id}`,
            duration: isCritical ? 8000 : 5000,
            description: `${alert.technology} · ${alert.metric}`,
          }
        );
      }
    });

    return unsub;
  }, [onLiveAlerts, setCurrentView, t]);

  // This component has no UI — it only manages toast side effects
  return null;
}
