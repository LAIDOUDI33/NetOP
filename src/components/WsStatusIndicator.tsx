'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSocket } from '@/hooks/useSocket';
import { useT } from '@/lib/i18n';
import { Wifi, WifiOff } from 'lucide-react';

export function WsStatusIndicator({ className = '' }: { className?: string }) {
  const { isConnected } = useSocket();
  const t = useT();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${className}`}>
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
            <span className={`${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {isConnected ? 'LIVE' : 'OFF'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isConnected ? t('ws.connected') : t('ws.disconnected')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function WsStatusCompact({ className = '' }: { className?: string }) {
  const { isConnected } = useSocket();

  return (
    <span className={`relative flex h-1.5 w-1.5 ${className}`} title={isConnected ? 'WebSocket connected' : 'WebSocket disconnected'}>
      {isConnected && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
    </span>
  );
}
