'use client';

import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/store/app';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { ViewType } from '@/types';

// All 57 views are lazy-loaded to minimize initial compilation
const V = {
  DashboardView: lazy(() => import('@/components/views/DashboardView')),
  MonitoringView: lazy(() => import('@/components/views/MonitoringView')),
  KpiAnalyticsView: lazy(() => import('@/components/views/KpiAnalyticsView')),
  AlertsView: lazy(() => import('@/components/views/AlertsView')),
  OptimizerView: lazy(() => import('@/components/views/OptimizerView')),
  CoverageMapView: lazy(() => import('@/components/views/CoverageMapView')),
  ReportsView: lazy(() => import('@/components/views/ReportsView')),
  SettingsView: lazy(() => import('@/components/views/SettingsView')),
  SLADashboardView: lazy(() => import('@/components/views/SLADashboardView')),
  AnomalyDetectionView: lazy(() => import('@/components/views/AnomalyDetectionView')),
  CorrelationView: lazy(() => import('@/components/views/CorrelationView')),
  RootCauseAnalysisView: lazy(() => import('@/components/views/RootCauseAnalysisView')),
  SonView: lazy(() => import('@/components/views/SonView')),
  PoliciesView: lazy(() => import('@/components/views/PoliciesView')),
  OnboardingView: lazy(() => import('@/components/views/OnboardingView')),
  VendorsView: lazy(() => import('@/components/views/VendorsView')),
  QoEView: lazy(() => import('@/components/views/QoEView')),
  CapacityView: lazy(() => import('@/components/views/CapacityView')),
  SlicingView: lazy(() => import('@/components/views/SlicingView')),
  EnergyView: lazy(() => import('@/components/views/EnergyView')),
  FaultsView: lazy(() => import('@/components/views/FaultsView')),
  SubscribersView: lazy(() => import('@/components/views/SubscribersView')),
  IncidentsView: lazy(() => import('@/components/views/IncidentsView')),
  ConfigView: lazy(() => import('@/components/views/ConfigView')),
  LiveView: lazy(() => import('@/components/views/LiveView')),
  HealthView: lazy(() => import('@/components/views/HealthView')),
  BenchmarkView: lazy(() => import('@/components/views/BenchmarkView')),
  HandoverView: lazy(() => import('@/components/views/HandoverView')),
  LoadBalancingView: lazy(() => import('@/components/views/LoadBalancingView')),
  InterferenceView: lazy(() => import('@/components/views/InterferenceView')),
  CoverageHolesView: lazy(() => import('@/components/views/CoverageHolesView')),
  ChangesView: lazy(() => import('@/components/views/ChangesView')),
  OutagesView: lazy(() => import('@/components/views/OutagesView')),
  PlaybooksView: lazy(() => import('@/components/views/PlaybooksView')),
  AssistantView: lazy(() => import('@/components/views/AssistantView')),
  SimulationsView: lazy(() => import('@/components/views/SimulationsView')),
  TrendsView: lazy(() => import('@/components/views/TrendsView')),
  RoiView: lazy(() => import('@/components/views/RoiView')),
  SpectrumView: lazy(() => import('@/components/views/SpectrumView')),
  EvolutionView: lazy(() => import('@/components/views/EvolutionView')),
  NpiView: lazy(() => import('@/components/views/NpiView')),
  ServicesView: lazy(() => import('@/components/views/ServicesView')),
  AuditView: lazy(() => import('@/components/views/AuditView')),
  ExecutiveView: lazy(() => import('@/components/views/ExecutiveView')),
  VendorCompareView: lazy(() => import('@/components/views/VendorCompareView')),
  OSSIntegrationView: lazy(() => import('@/components/views/OSSIntegrationView')),
  CRMIntegrationView: lazy(() => import('@/components/views/CRMIntegrationView')),
  BillingIntegrationView: lazy(() => import('@/components/views/BillingIntegrationView')),
  MultiAgentView: lazy(() => import('@/components/views/MultiAgentView')),
  DataPipelineView: lazy(() => import('@/components/views/DataPipelineView')),
  IntegrationHubView: lazy(() => import('@/components/views/IntegrationHubView')),
  GeomarketingView: lazy(() => import('@/components/views/GeomarketingView')),
  NetworkCommercialView: lazy(() => import('@/components/views/NetworkCommercialView')),
  WilayaIntelligenceView: lazy(() => import('@/components/views/WilayaIntelligenceView')),
  ValuePropositionView: lazy(() => import('@/components/views/ValuePropositionView')),
  PredictiveAnalyticsView: lazy(() => import('@/components/views/PredictiveAnalyticsView')),
  DigitalTwinView: lazy(() => import('@/components/views/DigitalTwinView')),
};

const VIEW_MAP: Record<ViewType, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: V.DashboardView,
  monitoring: V.MonitoringView,
  kpi: V.KpiAnalyticsView,
  alerts: V.AlertsView,
  optimizer: V.OptimizerView,
  rca: V.RootCauseAnalysisView,
  coverage: V.CoverageMapView,
  reports: V.ReportsView,
  settings: V.SettingsView,
  sla: V.SLADashboardView,
  anomaly: V.AnomalyDetectionView,
  correlation: V.CorrelationView,
  son: V.SonView,
  policies: V.PoliciesView,
  onboarding: V.OnboardingView,
  vendors: V.VendorsView,
  qoe: V.QoEView,
  capacity: V.CapacityView,
  slicing: V.SlicingView,
  energy: V.EnergyView,
  faults: V.FaultsView,
  subscribers: V.SubscribersView,
  incidents: V.IncidentsView,
  config: V.ConfigView,
  live: V.LiveView,
  health: V.HealthView,
  benchmark: V.BenchmarkView,
  handover: V.HandoverView,
  load: V.LoadBalancingView,
  interference: V.InterferenceView,
  'coverage-holes': V.CoverageHolesView,
  changes: V.ChangesView,
  outages: V.OutagesView,
  playbooks: V.PlaybooksView,
  assistant: V.AssistantView,
  simulations: V.SimulationsView,
  trends: V.TrendsView,
  roi: V.RoiView,
  spectrum: V.SpectrumView,
  evolution: V.EvolutionView,
  npi: V.NpiView,
  services: V.ServicesView,
  audit: V.AuditView,
  executive: V.ExecutiveView,
  'vendor-compare': V.VendorCompareView,
  'oss-integration': V.OSSIntegrationView,
  'crm-integration': V.CRMIntegrationView,
  'billing-integration': V.BillingIntegrationView,
  'multi-agent': V.MultiAgentView,
  'data-pipeline': V.DataPipelineView,
  'integration-hub': V.IntegrationHubView,
  geomarketing: V.GeomarketingView,
  'network-commercial': V.NetworkCommercialView,
  'wilaya-intelligence': V.WilayaIntelligenceView,
  'value-proposition': V.ValuePropositionView,
  predictive: V.PredictiveAnalyticsView,
  'digital-twin': V.DigitalTwinView,
};

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

export function ViewRenderer() {
  const { currentView } = useAppStore();
  const variants = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

  const ViewComponent = VIEW_MAP[currentView];
  if (!ViewComponent) return <div className="p-8 text-muted-foreground">Unknown view: {currentView}</div>;

  return (
    <AnimatePresence mode="wait">
      <motion.div key={currentView} variants={variants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
        <Suspense fallback={<ViewFallback />}>
          <ErrorBoundary>
            <ViewComponent />
          </ErrorBoundary>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
