'use client';

import { useEffect, useState } from 'react';
import { useSocket, type KpiUpdateItem, type AlertPulseData } from '@/hooks/useSocket';
import { useT } from '@/lib/i18n';
import { Users, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function RealtimeSidebarStats() {
  const t = useT();
  const { isConnected, onKpiUpdate, onAlertPulse } = useSocket();
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [alertCount, setAlertCount] = useState<number | null>(null);

  useEffect(() => {
    const unsubKpi = onKpiUpdate((data: KpiUpdateItem[]) => {
      const sum = data.reduce((s, item) => s + item.activeUsers, 0);
      setTotalUsers(sum);
    });
    const unsubAlert = onAlertPulse((data: AlertPulseData) => {
      setAlertCount(data.unresolvedCritical);
    });
    return () => { unsubKpi(); unsubAlert(); };
  }, [onKpiUpdate, onAlertPulse]);

  if (!isConnected) return null;

  return (
    <div className="px-2 py-1.5 space-y-1 border-t">
      <AnimatePresence mode="wait">
        <motion.div
          key={totalUsers ?? 'loading'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
        >
          <Users className="h-3 w-3 text-emerald-500" />
          <span>{t('ws.liveUsers')}: </span>
          <span className="font-semibold text-foreground tabular-nums">
            {totalUsers != null ? totalUsers.toLocaleString() : '—'}
          </span>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div
          key={alertCount ?? 'loading'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
        >
          <AlertTriangle className={`h-3 w-3 ${alertCount && alertCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          <span>{t('ws.criticalAlerts')}: </span>
          <span className={`font-semibold tabular-nums ${alertCount && alertCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
            {alertCount != null ? alertCount : '—'}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
