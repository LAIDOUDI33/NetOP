export type Technology = '2G' | '3G' | '4G' | '5G';
export type SiteStatus = 'active' | 'degraded' | 'down' | 'maintenance';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type OptimizationStatus = 'pending' | 'implemented' | 'dismissed';

export interface NetworkSiteSummary {
  id: string;
  name: string;
  code: string;
  technology: Technology;
  region: string;
  status: SiteStatus;
  frequency: string;
  bandwidth: number;
  maxCapacity: number;
  vendor: string;
}

export interface KpiDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface SiteKpiSummary {
  siteId: string;
  siteName: string;
  technology: Technology;
  status: SiteStatus;
  avgRsrp?: number;
  avgRssi?: number;
  avgSinr?: number;
  avgDownloadThroughput: number;
  avgUploadThroughput: number;
  avgLatency: number;
  avgAvailability: number;
  avgActiveUsers: number;
  avgHandoverSuccessRate: number;
  avgDropRate: number;
  avgPrbUtilization?: number;
}

export interface DashboardData {
  totalSites: number;
  sitesByTech: Record<Technology, number>;
  sitesByStatus: Record<SiteStatus, number>;
  totalActiveUsers: number;
  avgThroughput: { download: number; upload: number };
  avgLatency: number;
  avgAvailability: number;
  recentAlerts: number;
  activeAlerts: number;
  kpiTrends: {
    timestamps: string[];
    download: number[];
    upload: number[];
    latency: number[];
    users: number[];
  };
  techHealth: {
    technology: Technology;
    availability: number;
    throughput: number;
    latency: number;
    users: number;
    sites: number;
    activeSites: number;
  }[];
}

export interface MonitoringData {
  sites: (SiteKpiSummary & { latestKpi: Record<string, number> })[];
  trend: {
    timestamps: string[];
    metrics: Record<string, number[]>;
  };
  summary: {
    totalSites: number;
    activeSites: number;
    avgRsrp?: number;
    avgRssi?: number;
    avgSinr: number;
    avgDownload: number;
    avgUpload: number;
    avgLatency: number;
    avgAvailability: number;
    totalUsers: number;
  };
}

export interface AlertItem {
  id: string;
  siteName?: string;
  siteCode?: string;
  technology: Technology;
  metric: string;
  value: number;
  threshold: number;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  resolvedAt?: string;
  createdAt: string;
}

export interface AlertRuleItem {
  id: string;
  name: string;
  technology: string;
  metric: string;
  condition: string;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
}

export interface OptimizationItem {
  id: string;
  technology: Technology;
  siteName?: string;
  category: string;
  issue: string;
  recommendation: string;
  impact: string;
  status: OptimizationStatus;
  createdAt: string;
}

export interface NetworkParameterItem {
  id: string;
  technology: Technology;
  parameter: string;
  displayName: string;
  currentValue: string;
  unit: string;
  minRange?: string;
  maxRange?: string;
  description: string;
  category: string;
}

export interface CoverageData {
  sites: {
    id: string;
    name: string;
    code: string;
    technology: Technology;
    status: SiteStatus;
    region: string;
    latitude: number;
    longitude: number;
    frequency: string;
    bandwidth: number;
    vendor: string;
    avgSignal: number;
    avgThroughput: number;
    avgUsers: number;
  }[];
  regionStats: {
    region: string;
    totalSites: number;
    avgAvailability: number;
    avgSignal: number;
    techDistribution: Record<Technology, number>;
  }[];
}

export type ViewType = 'dashboard' | 'monitoring' | 'kpi' | 'alerts' | 'optimizer' | 'coverage' | 'reports' | 'settings' | 'sla' | 'anomaly' | 'correlation';