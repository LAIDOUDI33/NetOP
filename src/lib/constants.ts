import type { Technology, SiteStatus, AlertSeverity } from '@/types';

// Technology color palette
export const TECH_COLORS: Record<Technology, string> = {
  '2G': '#94A3B8',
  '3G': '#06B6D4',
  '4G': '#10B981',
  '5G': '#F59E0B',
};

export const TECH_COLORS_LIGHT: Record<Technology, string> = {
  '2G': '#F1F5F9',
  '3G': '#ECFEFF',
  '4G': '#ECFDF5',
  '5G': '#FFFBEB',
};

export const TECH_BG_CLASSES: Record<Technology, string> = {
  '2G': 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  '3G': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  '4G': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  '5G': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
};

// Status styling
export const STATUS_VARIANT: Record<SiteStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  degraded: 'secondary',
  down: 'destructive',
  maintenance: 'outline',
};

export const STATUS_COLORS: Record<SiteStatus, string> = {
  active: 'text-emerald-600 dark:text-emerald-400',
  degraded: 'text-amber-600 dark:text-amber-400',
  down: 'text-red-600 dark:text-red-400',
  maintenance: 'text-slate-500',
};

export const STATUS_DOT_COLORS: Record<SiteStatus, string> = {
  active: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-red-500',
  maintenance: 'bg-slate-400',
};

// Severity styling
export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-cyan-600 dark:text-cyan-400',
};

export const SEVERITY_BG: Record<AlertSeverity, string> = {
  critical: 'bg-red-500/10 border-red-500/20',
  warning: 'bg-amber-500/10 border-amber-500/20',
  info: 'bg-cyan-500/10 border-cyan-500/20',
};

export const SEVERITY_BADGE_VARIANT: Record<AlertSeverity, 'destructive' | 'secondary' | 'default' | 'outline'> = {
  critical: 'destructive',
  warning: 'secondary',
  info: 'outline',
};

// Metrics configuration
export const METRICS = [
  { value: 'downloadThroughput', label: 'Download Throughput', unit: 'Mbps', higher: true },
  { value: 'uploadThroughput', label: 'Upload Throughput', unit: 'Mbps', higher: true },
  { value: 'latency', label: 'Latency', unit: 'ms', higher: false },
  { value: 'availability', label: 'Availability', unit: '%', higher: true },
  { value: 'dropRate', label: 'Drop Rate', unit: '%', higher: false },
  { value: 'sinr', label: 'SINR', unit: 'dB', higher: true },
  { value: 'handoverSuccessRate', label: 'Handover Success Rate', unit: '%', higher: true },
  { value: 'prbUtilization', label: 'PRB Utilization', unit: '%', higher: false },
  { value: 'activeUsers', label: 'Active Users', unit: '', higher: true },
  { value: 'packetLoss', label: 'Packet Loss', unit: '%', higher: false },
  { value: 'jitter', label: 'Jitter', unit: 'ms', higher: false },
  { value: 'blockedCallRate', label: 'Blocked Call Rate', unit: '%', higher: false },
] as const;

export const TECHNOLOGIES: Technology[] = ['2G', '3G', '4G', '5G'];

// Signal quality ranges
export function getSignalQuality(rsrp?: number, rssi?: number, rxlev?: number): { label: string; color: string } {
  const signal = rsrp ?? rssi ?? rxlev ?? 0;
  if (signal >= -80) return { label: 'Excellent', color: 'text-emerald-600' };
  if (signal >= -90) return { label: 'Good', color: 'text-emerald-500' };
  if (signal >= -100) return { label: 'Fair', color: 'text-amber-500' };
  return { label: 'Poor', color: 'text-red-500' };
}

export function getSignalDot(rsrp?: number, rssi?: number, rxlev?: number): string {
  const signal = rsrp ?? rssi ?? rxlev ?? 0;
  if (signal >= -80) return 'bg-emerald-500';
  if (signal >= -90) return 'bg-emerald-400';
  if (signal >= -100) return 'bg-amber-500';
  return 'bg-red-500';
}

export function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(decimals);
}

export function formatTimestamp(ts: string): string {
  return ts; // Already formatted as "HH:MM" from APIs
}