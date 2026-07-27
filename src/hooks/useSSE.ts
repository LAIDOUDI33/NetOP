/**
 * National SOC Platform - useSSE Hook
 * 
 * React hook for consuming Server-Sent Events (SSE) streams.
 * Provides real-time data updates to dashboard components.
 * 
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Event-based callbacks
 * - Connection status tracking
 * - Memory leak prevention
 * - TypeScript support
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Types
export interface SSEOptions {
  /** URL endpoint for SSE stream */
  url: string;
  /** Channels to subscribe to (for /api/stream) */
  channels?: string[];
  /** Additional query params */
  params?: Record<string, string>;
  /** Callback for new alert events */
  onAlert?: (data: any) => void;
  /** Callback for alert:new events */
  onAlertNew?: (data: any) => void;
  /** Callback for alert:urgent events (critical/high) */
  onAlertUrgent?: (data: any) => void;
  /** Callback for incident updates */
  onIncidentUpdate?: (data: any) => void;
  /** Callback for metrics updates */
  onMetricsUpdate?: (data: any) => void;
  /** Callback for health updates */
  onHealthUpdate?: (data: any) => void;
  /** Callback for threat updates */
  onThreatUpdate?: (data: any) => void;
  /** Callback for telecom anomaly events */
  onTelecomAnomaly?: (data: any) => void;
  /** Callback for connection established */
  onConnect?: () => void;
  /** Callback for disconnection */
  onDisconnect?: () => void;
  /** Callback for errors */
  onError?: (error: Event) => void;
  /** Enable/disable auto-reconnect */
  autoReconnect?: boolean;
  /** Base reconnection delay in ms */
  reconnectDelay?: number;
  /** Maximum reconnection delay in ms */
  maxReconnectDelay?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface SSEState {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastEventTime: Date | null;
  lastEventData: any;
  error: Error | null;
}

interface EventHandlers {
  [key: string]: (data: any) => void;
}

/**
 * Main SSE hook for React components
 */
export function useSSE(options: SSEOptions): SSEState {
  const {
    url,
    channels = ['alerts', 'metrics', 'health'],
    params = {},
    onAlert,
    onAlertNew,
    onAlertUrgent,
    onIncidentUpdate,
    onMetricsUpdate,
    onHealthUpdate,
    onThreatUpdate,
    onTelecomAnomaly,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    debug = false
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const [state, setState] = useState<SSEState>({
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
    lastEventTime: null,
    lastEventData: null,
    error: null
  });

  // Build URL with query params
  const buildUrl = useCallback(() => {
    const urlObj = new URL(url, window.location.origin);
    
    if (channels.length > 0 && url.includes('/api/stream') && !url.includes('/alerts')) {
      urlObj.searchParams.set('channels', channels.join(','));
    }
    
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value);
    });
    
    return urlObj.toString();
  }, [url, channels, params]);

  // Log helper
  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[useSSE]', ...args);
    }
  }, [debug]);

  // Handle incoming SSE events
  const handleEvent = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      setState(prev => ({
        ...prev,
        lastEventTime: new Date(),
        lastEventData: data
      }));

      // Route to specific handlers based on event type
      const handlers: EventHandlers = {
        'alert:new': onAlertNew || onAlert,
        'alert:urgent': onAlertUrgent,
        'alert:updated': onAlert,
        'alert:count_change': onAlert,
        'incident:updated': onIncidentUpdate,
        'incident:counts': onIncidentUpdate,
        'metrics:update': onMetricsUpdate,
        'health:pulse': onHealthUpdate,
        'health:component_change': onHealthUpdate,
        'threats:update': onThreatUpdate,
        'telecom:anomaly': onTelecomAnomaly
      };

      const handler = handlers[event.type];
      if (handler) {
        handler(data);
      }

      log('Event received:', event.type, data);
    } catch (error) {
      console.error('[useSSE] Error parsing event:', error);
    }
  }, [onAlert, onAlertNew, onAlertUrgent, onIncidentUpdate, onMetricsUpdate, onHealthUpdate, onThreatUpdate, onTelecomAnomaly, log]);

  // Connect to SSE stream
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (eventSourceRef.current?.readyState === EventSource.OPEN ||
        eventSourceRef.current?.readyState === EventSource.CONNECTING) {
      return;
    }

    const streamUrl = buildUrl();
    log('Connecting to:', streamUrl);

    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (!mountedRef.current) return;
      
      log('Connected');
      setState(prev => ({
        ...prev,
        connected: true,
        reconnecting: false,
        reconnectAttempts: 0,
        error: null
      }));
      
      onConnect?.();
    };

    eventSource.onmessage = handleEvent;

    eventSource.onerror = (event) => {
      if (!mountedRef.current) return;
      
      const error = new Error('SSE connection error');
      
      setState(prev => ({
        ...prev,
        connected: false,
        error
      }));

      log('Error or disconnected');

      // Clean up
      eventSource.close();
      eventSourceRef.current = null;

      onDisconnect?.();
      onError?.(event);

      // Auto-reconnect
      if (autoReconnect && mountedRef.current) {
        const delay = Math.min(
          reconnectDelay * Math.pow(2, state.reconnectAttempts),
          maxReconnectDelay
        );

        log(`Reconnecting in ${delay}ms (attempt ${state.reconnectAttempts + 1})`);

        setState(prev => ({
          ...prev,
          reconnecting: true,
          reconnectAttempts: prev.reconnectAttempts + 1
        }));

        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect();
          }
        }, delay);
      }
    };

    // Listen for specific named events
    const customEvents = [
      'connected',
      'heartbeat',
      'alert:new',
      'alert:urgent',
      'alert:updated',
      'alert:count_change',
      'alerts:snapshot',
      'incident:updated',
      'incident:counts',
      'metrics:update',
      'health:pulse',
      'health:component_change',
      'threats:update',
      'telecom:anomaly'
    ];

    customEvents.forEach(eventType => {
      eventSource.addEventListener(eventType, handleEvent as EventListener);
    });
  }, [buildUrl, handleEvent, autoReconnect, reconnectDelay, maxReconnectDelay, state.reconnectAttempts, onConnect, onDisconnect, onError, log]);

  // Disconnect manually
  const disconnect = useCallback(() => {
    log('Manual disconnect');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState(prev => ({
      ...prev,
      connected: false,
      reconnecting: false
    }));
  }, [log]);

  // Setup connection on mount, cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, []); // Only run once on mount

  return {
    ...state,
    disconnect
  };
}

/**
 * Simplified hook for alerts-only streaming
 */
export function useAlertStream(options: {
  severity?: string[];
  sources?: string[];
  minSeverity?: string;
  onNewAlert?: (alert: any) => void;
  onUrgentAlert?: (alert: any) => void;
  onCountChange?: (counts: any) => void;
  debug?: boolean;
}) {
  const { severity, sources, minSeverity, onNewAlert, onUrgentAlert, onCountChange, debug = false } = options;

  const params: Record<string, string> = {};
  
  if (severity?.length) {
    params.severity = severity.join(',');
  }
  if (sources?.length) {
    params.source = sources.join(',');
  }
  if (minSeverity) {
    params.minSeverity = minSeverity;
  }

  return useSSE({
    url: '/api/stream/alerts',
    params,
    onAlertNew: onNewAlert,
    onAlertUrgent: onUrgentAlert,
    onAlert: onCountChange,
    debug
  });
}

/**
 * Hook for system health monitoring
 */
export function useHealthStream(options: {
  onHealthPulse?: (health: any) => void;
  onComponentChange?: (component: any) => void;
  interval?: number;
  debug?: boolean;
}) {
  const { onHealthPulse, onComponentChange, debug = false } = options;

  return useSSE({
    url: '/api/stream',
    channels: ['health'],
    onHealthUpdate: (data: any) => {
      if (data.overall) {
        onHealthPulse?.(data);
      } else if (data.name) {
        onComponentChange?.(data);
      }
    },
    debug
  });
}

export default useSSE;
