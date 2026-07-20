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

export type ViewType = 'dashboard' | 'monitoring' | 'kpi' | 'alerts' | 'optimizer' | 'coverage' | 'reports' | 'settings' | 'sla' | 'anomaly' | 'correlation' | 'son' | 'policies' | 'onboarding' | 'vendors' | 'qoe' | 'capacity' | 'slicing' | 'energy' | 'faults' | 'subscribers' | 'incidents' | 'config';

// ========== PHASE A: SON & Automation Types ==========

export type SonModuleMode = 'open-loop' | 'semi-automated' | 'closed-loop';
export type SonActionStatus = 'pending' | 'applied' | 'rolled_back' | 'failed';
export type SonActionType = 'add_neighbor' | 'remove_neighbor' | 'modify_pci' | 'adjust_tilt' | 'adjust_power' | 'compensate_outage' | 'correct_config';
export type NeighborRelationType = 'intra_freq' | 'inter_freq' | 'inter_tech';
export type NeighborHoType = 'manual' | 'anr_auto' | 'pnp_auto';
export type NeighborStatus = 'active' | 'removed' | 'blacklisted';

export interface SonModuleItem {
  id: string;
  name: string;
  displayName: string;
  technology: string;
  description: string;
  enabled: boolean;
  mode: SonModuleMode;
  schedule: string | null;
  parameters: Record<string, any>;
  stats: Record<string, number>;
  actionCount: number;
  recentActions: SonActionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SonActionItem {
  id: string;
  moduleId?: string;
  moduleName?: string;
  moduleDisplayName?: string;
  siteId?: string;
  siteName?: string;
  siteCode?: string;
  technology: string;
  actionType: SonActionType;
  parameter: string;
  previousValue: string;
  newValue: string;
  reason: string;
  status: SonActionStatus;
  kpiBefore: Record<string, number>;
  kpiAfter: Record<string, number> | null;
  impactScore: number | null;
  rollbackReason?: string;
  appliedAt?: string;
  rolledBackAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NeighborRelationItem {
  id: string;
  servingCellId: string;
  servingCell: {
    id: string;
    name: string;
    code: string;
    technology: string;
    region: string;
    status: string;
    vendor: string;
    latitude: number;
    longitude: number;
  };
  neighborCellId: string;
  neighborCellName: string;
  neighborCellCode: string;
  technology: string;
  relationType: NeighborRelationType;
  hoType: NeighborHoType;
  status: NeighborStatus;
  hoSuccessRate: number | null;
  lastUpdated: string;
}

// ========== PHASE A: Policy Types ==========

export type PolicyTriggerType = 'kpi_breach' | 'anomaly_detected' | 'schedule' | 'manual';
export type PolicyScope = 'all' | 'region' | 'site' | 'cluster';
export type PolicyExecutionStatus = 'triggered' | 'running' | 'completed' | 'failed' | 'rolled_back';

export interface PolicyItem {
  id: string;
  name: string;
  description: string;
  technology: string;
  triggerType: PolicyTriggerType;
  triggerConfig: Record<string, any>;
  actionModules: string[];
  scope: PolicyScope;
  scopeValue: string | null;
  priority: number;
  enabled: boolean;
  cooldownMins: number;
  stats: Record<string, any>;
  executionStats: {
    totalRuns: number;
    successRate: number;
    lastRun: string | null;
  };
  recentExecutions: PolicyExecutionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PolicyExecutionItem {
  id: string;
  policyId: string;
  policyName?: string;
  policyTechnology?: string;
  policyTriggerType?: string;
  status: PolicyExecutionStatus;
  triggerReason: string;
  affectedSites: string[];
  actionsTaken: string[];
  kpiImpact: Record<string, any>;
  rollbackReason?: string;
  durationMs: number | null;
  createdAt: string;
  completedAt?: string;
}

// ========== PHASE A: Onboarding Types ==========

export type OnboardingStatus = 'pending' | 'provisioning' | 'configuring' | 'verifying' | 'completed' | 'failed';

export interface SiteOnboardingItem {
  id: string;
  siteName: string;
  siteCode: string;
  technology: string;
  region: string;
  vendor: string;
  latitude: number;
  longitude: number;
  altitude: number;
  frequency: string;
  bandwidth: number;
  maxCapacity: number;
  status: OnboardingStatus;
  assignedPci?: string;
  assignedFreq?: string;
  initialNeighbors: string[];
  kpiBaseline: Record<string, any>;
  errorMessage?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== PHASE A: Vendor Types ==========

export type VendorApiType = 'rest' | 'netconf' | 'snmp' | 'cli';
export type VendorStatus = 'active' | 'disconnected' | 'error';

export interface VendorProfileItem {
  id: string;
  vendor: string;
  displayName: string;
  technologies: string[];
  apiType: VendorApiType;
  apiEndpoint?: string;
  status: VendorStatus;
  lastSync?: string;
  stats: {
    sitesManaged?: number;
    lastActionCount?: number;
    syncStatus?: string;
    lastSync?: string;
  };
  createdAt: string;
  updatedAt: string;
}