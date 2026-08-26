// ========== TYPES ==========

export interface ReportTemplateConfig {
  id: string;
  name: string;
  description: string;
  type: string; // kpi, son, policy, sla, qoe, coverage, executive
  technology?: string;
  sections: Array<{
    title: string;
    dataSource: string; // API endpoint path
    columns?: { header: string; key: string }[];
    chartElementId?: string; // DOM element ID to capture as chart image
    summaryKeys?: string[]; // which fields to show as KPI summary
  }>;
}

// ========== BUILT-IN TEMPLATES ==========

export const BUILT_IN_TEMPLATES: ReportTemplateConfig[] = [
  // ─── 1. Daily KPI Report ───
  {
    id: 'daily-kpi',
    name: 'Rapport KPI Quotidien',
    description: 'Rapport quotidien des indicateurs de performance réseau par technologie',
    type: 'kpi',
    sections: [
      {
        title: 'Débit Téléchargement',
        dataSource: '/api/kpi?metric=downloadThroughput',
        summaryKeys: ['avgDownload', 'maxDownload', 'minDownload', 'siteCount'],
        chartElementId: 'chart-kpi-download',
        columns: [
          { header: 'Site', key: 'siteName' },
          { header: 'Code', key: 'code' },
          { header: 'Technologie', key: 'technology' },
          { header: 'Débit (Mbps)', key: 'value' },
          { header: 'Région', key: 'region' },
        ],
      },
      {
        title: 'Latence',
        dataSource: '/api/kpi?metric=latency',
        summaryKeys: ['avgLatency', 'maxLatency', 'p95Latency'],
        chartElementId: 'chart-kpi-latency',
        columns: [
          { header: 'Site', key: 'siteName' },
          { header: 'Code', key: 'code' },
          { header: 'Technologie', key: 'technology' },
          { header: 'Latence (ms)', key: 'value' },
          { header: 'Statut', key: 'status' },
        ],
      },
      {
        title: 'Disponibilité',
        dataSource: '/api/kpi?metric=availability',
        summaryKeys: ['avgAvailability', 'minAvailability', 'siteCount'],
        chartElementId: 'chart-kpi-availability',
        columns: [
          { header: 'Site', key: 'siteName' },
          { header: 'Code', key: 'code' },
          { header: 'Technologie', key: 'technology' },
          { header: 'Disponibilité (%)', key: 'value' },
          { header: 'Région', key: 'region' },
        ],
      },
    ],
  },

  // ─── 2. Weekly Performance Summary ───
  {
    id: 'weekly-performance',
    name: 'Résumé Hebdomadaire des Performances',
    description: 'Synthèse hebdomadaire des performances réseau avec tendances',
    type: 'kpi',
    sections: [
      {
        title: 'Tendances Débit (Semaine)',
        dataSource: '/api/trends',
        summaryKeys: ['avgThroughput', 'trendDirection', 'changePercent'],
        chartElementId: 'chart-weekly-throughput',
      },
      {
        title: 'Débit par Site',
        dataSource: '/api/kpi?metric=downloadThroughput',
        columns: [
          { header: 'Site', key: 'siteName' },
          { header: 'Code', key: 'code' },
          { header: 'Technologie', key: 'technology' },
          { header: 'Débit Moyen (Mbps)', key: 'value' },
          { header: 'Région', key: 'region' },
        ],
      },
      {
        title: 'Utilisation PRB',
        dataSource: '/api/kpi?metric=prbUtilization',
        summaryKeys: ['avgPrbUtil', 'maxPrbUtil', 'overloadedSites'],
        chartElementId: 'chart-weekly-prb',
        columns: [
          { header: 'Site', key: 'siteName' },
          { header: 'Technologie', key: 'technology' },
          { header: 'Utilisation PRB (%)', key: 'value' },
        ],
      },
    ],
  },

  // ─── 3. SLA Compliance Report ───
  {
    id: 'sla-compliance',
    name: 'Rapport Conformité SLA',
    description: 'Analyse de conformité aux objectifs de niveau de service',
    type: 'sla',
    sections: [
      {
        title: 'Conformité SLA par Métrique',
        dataSource: '/api/sla',
        summaryKeys: ['complianceRate', 'totalTargets', 'breachCount', 'avgBreachPercent'],
        chartElementId: 'chart-sla-compliance',
        columns: [
          { header: 'Technologie', key: 'technology' },
          { header: 'Métrique', key: 'metric' },
          { header: 'Cible', key: 'targetValue' },
          { header: 'Réel', key: 'actualValue' },
          { header: 'Condition', key: 'condition' },
          { header: 'Conforme', key: 'compliant' },
          { header: 'Écart (%)', key: 'breachPercent' },
          { header: 'Sévérité', key: 'severity' },
        ],
      },
    ],
  },

  // ─── 4. SON Activity Report ───
  {
    id: 'son-activity',
    name: 'Rapport Activité SON',
    description: 'Activité des modules Self-Organizing Network et historique des actions',
    type: 'son',
    sections: [
      {
        title: 'Modules SON',
        dataSource: '/api/son',
        summaryKeys: ['totalModules', 'enabledModules', 'totalActions', 'successRate'],
        chartElementId: 'chart-son-modules',
        columns: [
          { header: 'Module', key: 'displayName' },
          { header: 'Technologie', key: 'technology' },
          { header: 'Mode', key: 'mode' },
          { header: 'Statut', key: 'enabled' },
          { header: 'Actions', key: 'actionCount' },
          { header: 'Dernière Action', key: 'lastActionAt' },
        ],
      },
      {
        title: 'Actions SON Récentes',
        dataSource: '/api/son/actions',
        columns: [
          { header: 'Module', key: 'moduleName' },
          { header: 'Site', key: 'siteName' },
          { header: 'Action', key: 'actionType' },
          { header: 'Statut', key: 'status' },
          { header: 'Valeur Avant', key: 'previousValue' },
          { header: 'Valeur Après', key: 'newValue' },
          { header: 'Date', key: 'createdAt' },
        ],
      },
    ],
  },

  // ─── 5. Policy Execution Report ───
  {
    id: 'policy-execution',
    name: 'Rapport Exécution des Politiques',
    description: 'Exécution et performance des politiques de gestion réseau',
    type: 'policy',
    sections: [
      {
        title: 'Politiques Réseau',
        dataSource: '/api/policies',
        summaryKeys: ['totalPolicies', 'enabledPolicies', 'successRate', 'totalExecutions'],
        chartElementId: 'chart-policies-overview',
        columns: [
          { header: 'Politique', key: 'name' },
          { header: 'Technologie', key: 'technology' },
          { header: 'Déclencheur', key: 'triggerType' },
          { header: 'Priorité', key: 'priority' },
          { header: 'Exécutions', key: 'totalCount' },
          { header: 'Succès', key: 'successCount' },
          { header: 'Statut', key: 'enabled' },
        ],
      },
      {
        title: 'Historique des Exécutions',
        dataSource: '/api/policies/executions',
        columns: [
          { header: 'Politique', key: 'policyName' },
          { header: 'Statut', key: 'status' },
          { header: 'Déclenché Par', key: 'triggeredBy' },
          { header: 'Raison', key: 'triggerReason' },
          { header: 'Site', key: 'siteId' },
          { header: 'Date', key: 'createdAt' },
        ],
      },
    ],
  },

  // ─── 6. QoE Report ───
  {
    id: 'qoe-report',
    name: 'Rapport Qualité d\'Expérience',
    description: 'Indicateurs de qualité d\'expérience utilisateur',
    type: 'qoe',
    sections: [
      {
        title: 'Scores QoE Globaux',
        dataSource: '/api/qoe',
        summaryKeys: ['avgMosScore', 'avgDataRate', 'avgCallSetupTime', 'avgCallDropRate', 'sampleCount'],
        chartElementId: 'chart-qoe-scores',
        columns: [
          { header: 'Site', key: 'siteName' },
          { header: 'Technologie', key: 'technology' },
          { header: 'MOS Score', key: 'avgMosScore' },
          { header: 'Débit (Mbps)', key: 'avgDataRateExperienced' },
          { header: 'Temps d\'Appel (ms)', key: 'avgCallSetupTime' },
          { header: 'Taux de Coupure (%)', key: 'avgCallDropRate' },
        ],
      },
    ],
  },

  // ─── 7. Coverage Analysis ───
  {
    id: 'coverage-analysis',
    name: 'Analyse de Couverture',
    description: 'Analyse de la couverture réseau par région et technologie',
    type: 'coverage',
    sections: [
      {
        title: 'Statistiques de Couverture par Région',
        dataSource: '/api/coverage',
        summaryKeys: ['totalSites', 'avgAvailability', 'avgSignal', 'regionCount'],
        chartElementId: 'chart-coverage-regions',
        columns: [
          { header: 'Région', key: 'region' },
          { header: 'Sites', key: 'totalSites' },
          { header: 'Disponibilité (%)', key: 'avgAvailability' },
          { header: 'Signal Moyen (dBm)', key: 'avgSignal' },
          { header: '2G', key: 'techDistribution.2G' },
          { header: '3G', key: 'techDistribution.3G' },
          { header: '4G', key: 'techDistribution.4G' },
          { header: '5G', key: 'techDistribution.5G' },
        ],
      },
    ],
  },

  // ─── 8. Executive Summary ───
  {
    id: 'executive-summary',
    name: 'Résumé Exécutif',
    description: 'Vue d\'ensemble stratégique pour la direction',
    type: 'executive',
    sections: [
      {
        title: 'Indicateurs Clés du Réseau',
        dataSource: '/api/executive',
        summaryKeys: [
          'totalSites', 'activeAlerts', 'openIncidents',
          'avgHealthScore', 'avgMosScore', 'totalEnergyKw',
        ],
        chartElementId: 'chart-executive-overview',
      },
      {
        title: 'Tableau de Bord Opérationnel',
        dataSource: '/api/dashboard',
        summaryKeys: ['healthySites', 'degradedSites', 'criticalSites', 'overallAvailability'],
        chartElementId: 'chart-executive-dashboard',
      },
    ],
  },
];

// ========== HELPERS ==========

export function getTemplateById(id: string): ReportTemplateConfig | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.id === id);
}

/**
 * Returns templates filtered by type.
 */
export function getTemplatesByType(type: string): ReportTemplateConfig[] {
  return BUILT_IN_TEMPLATES.filter(t => t.type === type);
}

/**
 * Returns all distinct template types.
 */
export function getTemplateTypes(): string[] {
  return [...new Set(BUILT_IN_TEMPLATES.map(t => t.type))];
}
