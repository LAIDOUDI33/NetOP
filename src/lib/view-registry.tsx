'use client';

import { useState, useEffect, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/store/app';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { ViewType } from '@/types';

// ─── View name → file name mapping (zero imports, just strings) ──────────
// Turbopack only creates a lightweight context-module for the template literal.
// Individual view files are compiled ON-DEMAND when the user navigates.
const VIEW_FILES: Record<ViewType, string> = {
  dashboard: 'DashboardView',
  monitoring: 'MonitoringView',
  kpi: 'KpiAnalyticsView',
  alerts: 'AlertsView',
  optimizer: 'OptimizerView',
  rca: 'RootCauseAnalysisView',
  coverage: 'CoverageMapView',
  reports: 'ReportsView',
  settings: 'SettingsView',
  sla: 'SLADashboardView',
  anomaly: 'AnomalyDetectionView',
  correlation: 'CorrelationView',
  son: 'SonView',
  policies: 'PoliciesView',
  onboarding: 'OnboardingView',
  vendors: 'VendorsView',
  qoe: 'QoEView',
  capacity: 'CapacityView',
  slicing: 'SlicingView',
  energy: 'EnergyView',
  faults: 'FaultsView',
  subscribers: 'SubscribersView',
  incidents: 'IncidentsView',
  config: 'ConfigView',
  live: 'LiveView',
  health: 'HealthView',
  benchmark: 'BenchmarkView',
  handover: 'HandoverView',
  load: 'LoadBalancingView',
  interference: 'InterferenceView',
  'coverage-holes': 'CoverageHolesView',
  changes: 'ChangesView',
  outages: 'OutagesView',
  playbooks: 'PlaybooksView',
  assistant: 'AssistantView',
  simulations: 'SimulationsView',
  trends: 'TrendsView',
  roi: 'RoiView',
  spectrum: 'SpectrumView',
  evolution: 'EvolutionView',
  npi: 'NpiView',
  services: 'ServicesView',
  audit: 'AuditView',
  executive: 'ExecutiveView',
  'vendor-compare': 'VendorCompareView',
  'oss-integration': 'OSSIntegrationView',
  'crm-integration': 'CRMIntegrationView',
  'billing-integration': 'BillingIntegrationView',
  'multi-agent': 'MultiAgentView',
  'data-pipeline': 'DataPipelineView',
  'integration-hub': 'IntegrationHubView',
  geomarketing: 'GeomarketingView',
  'network-commercial': 'NetworkCommercialView',
  'wilaya-intelligence': 'WilayaIntelligenceView',
  'value-proposition': 'ValuePropositionView',
  predictive: 'PredictiveAnalyticsView',
  'digital-twin': 'DigitalTwinView',
};

// ─── Fallback skeleton ────────────────────────────────────────────────
function ViewFallback() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-6"><Skeleton className="h-72 w-full" /></div>
        <div className="rounded-lg border bg-card p-6"><Skeleton className="h-72 w-full" /></div>
      </div>
    </div>
  );
}

// ─── ViewRenderer (on-demand dynamic import) ───────────────────────────
export function ViewRenderer() {
  const { currentView } = useAppStore();
  const [ViewComponent, setViewComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  useEffect(() => {
    let cancelled = false;
    setViewComponent(null);
    setError(null);
    setLoading(true);

    const fileName = VIEW_FILES[currentView];
    if (!fileName) {
      setError(`Unknown view: ${currentView}`);
      setLoading(false);
      return () => { cancelled = true; };
    }

    // Dynamic import — Turbopack only compiles this one view
    import(`@/components/views/${fileName}`)
      .then((mod) => {
        if (!cancelled) {
          setViewComponent(() => mod.default);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [currentView]);

  if (error) {
    return <div className="p-8 text-destructive">Error loading view: {error}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2 }}
      >
        {ViewComponent ? (
          <ErrorBoundary>
            <ViewComponent />
          </ErrorBoundary>
        ) : loading ? (
          <ViewFallback />
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
