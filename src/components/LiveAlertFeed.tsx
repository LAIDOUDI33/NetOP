'use client';

import { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSocket, type LiveAlertItem } from '@/hooks/useSocket';
import { useT, timeAgo } from '@/lib/i18n';
import { AlertTriangle, Radio, Wifi, Zap, Gauge, Activity } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const METRIC_ICONS: Record<string, typeof AlertTriangle> = {
  rsrp: Wifi, rsrq: Wifi, sinr: Wifi, rssi: Wifi,
  availability: Activity, dropRate: AlertTriangle,
  latency: Gauge, prbUtilization: Zap, handoverSuccessRate: Radio,
};

function getMetricIcon(metric: string) {
  return METRIC_ICONS[metric] ?? AlertTriangle;
}

const MAX_FEED_ITEMS = 50;

export function LiveAlertFeed() {
  const t = useT();
  const { isConnected, onLiveAlerts } = useSocket();
  const [feed, setFeed] = useState<LiveAlertItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onLiveAlerts((newAlerts) => {
      setFeed((prev) => {
        const updated = [...newAlerts, ...prev].slice(0, MAX_FEED_ITEMS);
        return updated;
      });
    });
    return unsub;
  }, [onLiveAlerts]);

  return (
    <div className="relative">
      {/* Connection indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-xs text-muted-foreground">
          {isConnected ? t('ws.liveFeed') : t('ws.disconnected')}
        </span>
        {feed.length > 0 && (
          <Badge variant="outline" className="text-[10px] h-5 ml-auto">
            {feed.length}
          </Badge>
        )}
      </div>

      {/* Feed list */}
      <ScrollArea className="h-[280px] lg:h-[340px]" ref={scrollRef}>
        {feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
            <Activity className="h-8 w-8 opacity-30" />
            <p className="text-sm">{isConnected ? t('ws.waitingForAlerts') : t('ws.connecting')}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {feed.map((alert, i) => {
              const Icon = getMetricIcon(alert.metric);
              const isCritical = alert.severity === 'critical';
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-start gap-2.5 px-3 py-2.5 border-b last:border-b-0 ${
                    isCritical ? 'bg-red-500/5' : 'bg-amber-500/5'
                  } ${i === 0 ? 'ring-1 ring-inset ring-primary/20' : ''}`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${
                    isCritical ? 'bg-red-100 dark:bg-red-950/50' : 'bg-amber-100 dark:bg-amber-950/50'
                  }`}>
                    <Icon className={`h-3.5 w-3.5 ${isCritical ? 'text-red-600' : 'text-amber-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold truncate">{alert.siteName}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 h-4 ${
                          alert.technology === '5G' ? 'border-amber-400 text-amber-600' :
                          alert.technology === '4G' ? 'border-emerald-400 text-emerald-600' :
                          alert.technology === '3G' ? 'border-cyan-400 text-cyan-600' :
                          'border-slate-400 text-slate-500'
                        }`}
                      >
                        {alert.technology}
                      </Badge>
                      <Badge
                        variant={isCritical ? 'destructive' : 'secondary'}
                        className="text-[9px] px-1 h-4"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {alert.metric}: {alert.value.toFixed(1)} (threshold: {alert.threshold})
                    </p>
                    <span className="text-[10px] text-muted-foreground/60 mt-0.5 block">
                      {timeAgo(alert.createdAt, t)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </ScrollArea>
    </div>
  );
}
