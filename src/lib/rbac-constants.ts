// Module-to-sidebar-view mapping
export const MODULE_VIEW_MAP: Record<string, string[]> = {
  dashboard: ['dashboard'],
  monitoring: ['monitoring', 'live', 'health'],
  alerts: ['alerts', 'incidents', 'outages', 'faults'],
  coverage: ['coverage', 'coverage-holes'],
  optimizer: ['optimizer', 'handover', 'interference', 'load'],
  kpi: ['kpi', 'trends', 'correlation'],
  qoe: ['qoe', 'services', 'subscribers', 'sla'],
  son: ['son', 'policies', 'playbooks'],
  reports: ['reports', 'executive', 'roi', 'audit'],
  config: ['config', 'onboarding', 'vendors', 'vendor-compare', 'changes'],
  spectrum: ['spectrum', 'slicing'],
  planning: ['simulations', 'benchmark', 'evolution', 'npi'],
  energy: ['energy'],
  ai: ['assistant', 'anomaly', 'rca', 'multi-agent', 'data-pipeline'],
  integration: ['integration-hub', 'oss-integration', 'crm-integration', 'billing-integration'],
};

// Role definitions
export const ROLES = {
  superadmin: { displayName: 'Super Admin', description: 'Full system access' },
  noc_manager: { displayName: 'NOC Manager', description: 'Full visibility, change approval' },
  rf_engineer: { displayName: 'RF Engineer', description: 'Optimization and coverage tools' },
  nop_engineer: { displayName: 'NOP Engineer', description: 'Configuration and automation' },
  field_tech: { displayName: 'Field Technician', description: 'Site monitoring and basic KPIs' },
  view_only: { displayName: 'View Only', description: 'Read-only dashboard access' },
} as const;

export type RoleName = keyof typeof ROLES;

export const ALL_MODULES = Object.keys(MODULE_VIEW_MAP);
export const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'] as const;

// Default permissions per role
export const ROLE_DEFAULTS: Record<string, string[]> = {
  superadmin: ['*:*'],
  noc_manager: [
    'dashboard:*', 'monitoring:*', 'alerts:*', 'coverage:*', 'optimizer:*',
    'kpi:*', 'qoe:*', 'son:view', 'son:edit', 'reports:*', 'config:*',
    'spectrum:*', 'planning:*', 'energy:*', 'ai:*', 'integration:*',
  ],
  rf_engineer: [
    'dashboard:view', 'monitoring:*', 'alerts:view', 'coverage:*', 'optimizer:*',
    'kpi:*', 'qoe:view', 'son:view', 'reports:view', 'reports:export',
    'config:view', 'spectrum:view', 'planning:*', 'energy:view', 'ai:view', 'integration:view',
  ],
  nop_engineer: [
    'dashboard:view', 'monitoring:*', 'alerts:*', 'coverage:view',
    'optimizer:view', 'kpi:view', 'son:*', 'config:*',
    'reports:view', 'reports:export', 'energy:view', 'ai:view', 'integration:*',
  ],
  field_tech: [
    'dashboard:view', 'monitoring:view', 'alerts:view', 'coverage:view',
    'optimizer:view', 'kpi:view', 'reports:view',
  ],
  view_only: [
    'dashboard:view', 'monitoring:view', 'alerts:view', 'coverage:view',
    'kpi:view', 'reports:view', 'executive:view',
  ],
};