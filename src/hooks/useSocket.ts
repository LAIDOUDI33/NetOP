'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface KpiUpdateItem {
  technology: string;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
  availability: number;
  activeUsers: number;
  sinr: number;
  prbUtilization: number;
  sites: number;
}

export interface AlertPulseData {
  unresolvedCritical: number;
  unresolvedWarning: number;
  timestamp: string;
}

export interface LiveAlertItem {
  id: string;
  siteName: string;
  siteCode: string;
  technology: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  createdAt: string;
}

type KpiUpdateCallback = (data: KpiUpdateItem[]) => void;
type AlertPulseCallback = (data: AlertPulseData) => void;
type LiveAlertCallback = (alerts: LiveAlertItem[]) => void;

// ── Singleton socket instance (shared across all hook consumers) ───────────────

let socketInstance: Socket | null = null;
let connectionCount = 0;

function getOrCreateSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  if (!socketInstance) {
    socketInstance = io('/?XTransformPort=3003', {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      transports: ['websocket', 'polling'],
    });
  }

  return socketInstance;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastKpiUpdate, setLastKpiUpdate] = useState<KpiUpdateItem[]>([]);
  const [lastAlertPulse, setLastAlertPulse] = useState<AlertPulseData | null>(null);

  // Store refs so callbacks always see latest data without re-subscribing
  const lastKpiUpdateRef = useRef<KpiUpdateItem[]>([]);
  const lastAlertPulseRef = useRef<AlertPulseData | null>(null);

  // Subscriber refs — stable references for socket event handlers
  const kpiSubsRef = useRef<Set<KpiUpdateCallback>>(new Set());
  const alertSubsRef = useRef<Set<AlertPulseCallback>>(new Set());
  const liveAlertSubsRef = useRef<Set<LiveAlertCallback>>(new Set());
  const criticalCountRef = useRef<number | null>(null);

  useEffect(() => {
    const socket = getOrCreateSocket();
    if (!socket) return;

    connectionCount++;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onKpiUpdate = (data: KpiUpdateItem[]) => {
      lastKpiUpdateRef.current = data;
      setLastKpiUpdate(data);
      // Notify all subscribers
      kpiSubsRef.current.forEach((cb) => cb(data));
    };

    const onAlertPulse = (data: AlertPulseData) => {
      lastAlertPulseRef.current = data;
      setLastAlertPulse(data);

      // If critical count changed, notify subscribers
      if (criticalCountRef.current === null || criticalCountRef.current !== data.unresolvedCritical) {
        criticalCountRef.current = data.unresolvedCritical;
        alertSubsRef.current.forEach((cb) => cb(data));
      }
    };

    const onLiveAlerts = (alerts: LiveAlertItem[]) => {
      liveAlertSubsRef.current.forEach((cb) => cb(alerts));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('kpi-update', onKpiUpdate);
    socket.on('alert-pulse', onAlertPulse);
    socket.on('live-alerts', onLiveAlerts);

    // Sync initial connection state
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('kpi-update', onKpiUpdate);
      socket.off('alert-pulse', onAlertPulse);
      socket.off('live-alerts', onLiveAlerts);

      connectionCount--;
      if (connectionCount <= 0 && socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        connectionCount = 0;
      }
    };
  }, []);

  // ── Subscription methods (stable callbacks via refs) ────────────────────────

  const onKpiUpdate = useCallback((callback: KpiUpdateCallback) => {
    kpiSubsRef.current.add(callback);
    // If we already have data, fire immediately
    if (lastKpiUpdateRef.current.length > 0) {
      callback(lastKpiUpdateRef.current);
    }
    // Return unsubscribe function
    return () => {
      kpiSubsRef.current.delete(callback);
    };
  }, []);

  const onAlertPulse = useCallback((callback: AlertPulseCallback) => {
    alertSubsRef.current.add(callback);
    // If we already have data, fire immediately
    if (lastAlertPulseRef.current) {
      callback(lastAlertPulseRef.current);
    }
    // Return unsubscribe function
    return () => {
      alertSubsRef.current.delete(callback);
    };
  }, []);

  const onLiveAlerts = useCallback((callback: LiveAlertCallback) => {
    liveAlertSubsRef.current.add(callback);
    return () => {
      liveAlertSubsRef.current.delete(callback);
    };
  }, []);

  return {
    socket: socketInstance,
    isConnected,
    lastKpiUpdate,
    lastAlertPulse,
    onKpiUpdate,
    onAlertPulse,
    onLiveAlerts,
  };
}
