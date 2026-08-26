'use client';

import { useSocket } from '@/hooks/useSocket';
import { useT } from '@/lib/i18n';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ConnectionStatus() {
  const t = useT();
  const { isConnected, lastUpdateTime } = useSocket();

  const statusText = isConnected ? t('rt.connected') : t('rt.disconnected');
  const updateText = lastUpdateTime
    ? t('rt.lastUpdate') + ': ' + new Date(lastUpdateTime).toLocaleTimeString()
    : '';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium select-none">
          <span className="relative flex h-2 w-2">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
          </span>
          <span className={isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
            {statusText}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>{statusText}</p>
        {updateText && <p className="text-muted-foreground mt-0.5">{updateText}</p>}
      </TooltipContent>
    </Tooltip>
  );
}
