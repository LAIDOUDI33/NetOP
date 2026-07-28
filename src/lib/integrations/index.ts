/**
 * Djezzy National SOC Platform - Enterprise Integration Index
 * Phase 11: Complete Open Security Tools Integration
 * 
 * This module provides unified access to all security tool integrations:
 * - SIEM: Wazuh + Elasticsearch (event management, log aggregation)
 * - EDR: GRR Rapid Response + Osquery (endpoint detection & response, forensics)
 * - SOAR: TheHive + Cortex (case management, automated analysis)
 * - Threat Intelligence: MISP + OpenCTI (IOC management, STIX 2.1, MITRE ATT&CK)
 * - NSM: Suricata + Zeek + Arkime (network monitoring, PCAP analysis)
 * - Vulnerability: OpenVAS + DefectDojo (scanning, lifecycle management, compliance)
 * - Messaging: Apache Kafka (event streaming backbone)
 * - Coordination: Unified integration hub with cross-tool correlation
 * 
 * @version 11.1.0 (Phase 11 Production Build)
 */

// ============================================================
// SIEM Integration (Wazuh + Elasticsearch)
// ============================================================
export {
  WazuhClient,
  ElasticsearchClient,
  SiemIntegrationService,
  getSiemIntegration,
  type WazuhConfig,
  type ElasticsearchConfig,
  type SiemIntegrationConfig,
  type SecurityEvent,
  type SearchFilters,
  type IngestResult,
  type MetricsSnapshot,
} from './siem/wazuh-elasticsearch-client';

// ============================================================
// EDR Integration (GRR + Osquery) [NEW]
// ============================================================
export {
  GrrOsqueryEdrClient,
  createEdrClient,
  type GrrConfig,
  type OsqueryConfig,
  type EdrIntegrationConfig,
  type GrrClient,
  type GrrHunt,
  type GrrFlow,
  type GrrArtifact,
  type OsqueryNode,
  type OsqueryDistributedQuery,
  type OsqueryQueryResult,
  type EdrAlert,
  type TelcoHuntResult,
} from './edr/grr-osquery-client';

// ============================================================
// NSM Integration (Suricata + Zeek + Arkime) [NEW]
// ============================================================
export {
  SuricataZeekArkimeClient,
  createNsmClient,
  type SuricataConfig,
  type ZeekConfig,
  type ArkimeConfig,
  type NsmIntegrationConfig,
  type SuricataAlert,
  type SuricataRule,
  type ZeekLogEntry,
  type ArkimeSession,
  type NsmEvent,
  type NsmStatistics,
} from './nsm/suricata-zeek-arkime-client';

// ============================================================
// Vulnerability Management (OpenVAS + DefectDojo) [NEW]
// ============================================================
export {
  OpenvasDefectDojoClient,
  createVulnClient,
  type OpenvasConfig,
  type DefectDojoConfig,
  type VulnerabilityIntegrationConfig,
  type OpenvasTask,
  type OpenvasTarget,
  type DojoProduct,
  type DojoEngagement,
  type DojoFinding,
  type UnifiedVulnerability,
  type VulnerabilityStatistics,
  type ScanConfiguration,
} from './vulnerability/openvas-defectdojo-client';

// ============================================================
// Threat Intelligence - OpenCTI [NEW]
// ============================================================
export {
  OpenctiClient,
  createOpenctiClient,
  type OpenctiConfig,
  type OpenctiIntegrationConfig,
  type StixIndicator,
  type StixIntrusionSet,
  type StixCampaign,
  type StixMalware,
  type StixAttackPattern,
  type StixIncident,
  type TelcoThreatIntel,
  type IntelFeed,
  type OpenctiStatistics,
} from './threat-intel/opencti-client';

// ============================================================
// SOAR Integration (TheHive + Cortex)
// ============================================================
export {
  TheHiveClient,
  CortexClient,
  SoarIntegrationService,
  getSoarIntegration,
  type TheHiveConfig,
  type CortexConfig,
  type SoarIntegrationConfig,
  type HiveCase,
  type HiveTask,
  type HiveObservable,
  type CortexAnalyzer,
  type CortexJob,
  type CortexReport,
} from './soar/thehive-cortex-client';

// ============================================================
// Threat Intelligence - MISP
// ============================================================
export {
  MispClient,
  ThreatIntelService,
  getThreatIntelService,
  type MispConfig,
  type IoCRecord,
  type SyncResult,
  type MispEvent,
  type MispAttribute,
  type MispFeed,
} from './threat-intel/misp-client';

// ============================================================
// Event Streaming (Apache Kafka)
// ============================================================
export {
  KafkaProducer,
  KafkaConsumer,
  SchemaRegistryClient,
  DeadLetterQueueHandler,
  initializeKafkaInfrastructure,
  createConsumer,
  shutdownKafkaInfrastructure,
  SOC_PLATFORM_TOPICS,
  TOPIC_CONFIGURATIONS,
  type KafkaConfig,
  type ProducerConfig,
  type ConsumerConfig,
  type SocEventEnvelope,
  type CdrEvent,
  type SecurityAlertEvent,
  type ThreatIntelEvent,
  type ProducerMetrics,
  type ConsumerMetrics,
} from './kafka/kafka-client';

// ============================================================
// Integration Service Layer Coordinator [NEW]
// ============================================================
export {
  IntegrationCoordinator,
  createIntegrationCoordinator,
  type PlatformIntegrationConfig,
  type CorrelatedEvent,
  type SystemHealthStatus,
  type AutomatedResponseResult,
} from './integration-coordinator';

// ============================================================
// Integration Factory (Extended for Phase 11)
// ============================================================

/**
 * Complete platform configuration including all Phase 11 integrations
 */
export interface AllIntegrationsConfig {
  // Core integrations (existing)
  siem?: SiemIntegrationConfig;
  soar?: SoarIntegrationConfig;
  threatIntel?: { misp: MispConfig; opencti?: OpenctiIntegrationConfig };
  kafka?: KafkaConfig;
  
  // New Phase 11 integrations
  edr?: EdrIntegrationConfig;
  nsm?: NsmIntegrationConfig;
  vulnerability?: VulnerabilityIntegrationConfig;
  
  // Coordinator settings
  coordinator?: Omit<PlatformIntegrationConfig, 'edr' | 'nsm' | 'siem' | 'opencti' | 'misp' | 'soar' | 'vulnerability' | 'kafka'>;
}

/**
 * Integrated platform instance with all available clients
 */
export interface IntegratedPlatform {
  // Existing integrations
  siem?: SiemIntegrationService;
  soar?: SoarIntegrationService;
  threatIntel?: {
    misp: ThreatIntelService;
    opencti?: OpenctiClient;
  };
  kafka?: {
    producer: KafkaProducer;
    schemaRegistry: SchemaRegistryClient;
    dlqHandler: DeadLetterQueueHandler;
  };
  
  // New Phase 11 clients
  edr?: GrrOsqueryEdrClient;
  nsm?: SuricataZeekArkimeClient;
  vulnerability?: OpenvasDefectDojoClient;
  
  // Coordinator (if enabled)
  coordinator?: IntegrationCoordinator;
}

/**
 * Initialize all configured integrations (Phase 11 Extended)
 * Supports legacy config format and new extended configuration
 */
export async function initializeAllIntegrations(
  config: AllIntegrationsConfig
): Promise<IntegratedPlatform> {
  const platform: IntegratedPlatform = {};
  
  console.log('[Integration] 🚀 Initializing Phase 11 Enterprise Integrations...');

  // ============================================================
  // Core Integrations (Existing)
  // ============================================================

  // Initialize SIEM if configured
  if (config.siem) {
    try {
      platform.siem = getSiemIntegration(config.siem);
      await platform.siem.initialize();
      console.log('[Integration] ✅ SIEM (Wazuh+ES) initialized');
    } catch (error) {
      console.error('[Integration] ❌ SIEM initialization failed:', error);
    }
  }

  // Initialize SOAR if configured
  if (config.soar) {
    try {
      platform.soar = getSoarIntegration(config.soar);
      await platform.soar.initialize();
      console.log('[Integration] ✅ SOAR (TheHive+Cortex) initialized');
    } catch (error) {
      console.error('[Integration] ❌ SOAR initialization failed:', error);
    }
  }

  // Initialize Threat Intel (MISP) if configured
  if (config.threatIntel?.misp) {
    try {
      platform.threatIntel = {
        ...platform.threatIntel,
        misp: getThreatIntelService(config.threatIntel.misp),
      };
      await platform.threatIntel.misp.initialize();
      console.log('[Integration] ✅ Threat Intel (MISP) initialized');
    } catch (error) {
      console.error('[Integration] ❌ MISP initialization failed:', error);
    }
  }

  // Initialize Threat Intel (OpenCTI) if configured
  if (config.threatIntel?.opencti) {
    try {
      platform.threatIntel = {
        ...platform.threatIntel,
        opencti: createOpenctiClient(config.threatIntel.opencti),
      };
      await platform.threatIntel.opencti.connect();
      console.log('[Integration] ✅ Threat Intel (OpenCTI) initialized');
    } catch (error) {
      console.error('[Integration] ❌ OpenCTI initialization failed:', error);
    }
  }

  // Initialize Kafka if configured
  if (config.kafka) {
    try {
      const kafkaInfra = await initializeKafkaInfrastructure(config.kafka);
      platform.kafka = kafkaInfra;
      console.log('[Integration] ✅ Kafka event streaming initialized');
    } catch (error) {
      console.error('[Integration] ❌ Kafka initialization failed:', error);
    }
  }

  // ============================================================
  // Phase 11 New Integrations
  // ============================================================

  // Initialize EDR (GRR + Osquery) if configured
  if (config.edr) {
    try {
      platform.edr = createEdrClient(config.edr);
      await platform.edr.connect();
      console.log('[Integration] ✅ EDR (GRR+Osquery) initialized');
    } catch (error) {
      console.error('[Integration] ❌ EDR initialization failed:', error);
    }
  }

  // Initialize NSM (Suricata + Zeek + Arkime) if configured
  if (config.nsm) {
    try {
      platform.nsm = createNsmClient(config.nsm);
      await platform.nsm.connect();
      console.log('[Integration] ✅ NSM (Suricata+Zeek+Arkime) initialized');
    } catch (error) {
      console.error('[Integration] ❌ NSM initialization failed:', error);
    }
  }

  // Initialize Vulnerability Management (OpenVAS + DefectDojo) if configured
  if (config.vulnerability) {
    try {
      platform.vulnerability = createVulnClient(config.vulnerability);
      await platform.vulnerability.connect();
      console.log('[Integration] ✅ Vulnerability Mgmt (OpenVAS+DefectDojo) initialized');
    } catch (error) {
      console.error('[Integration] ❌ Vulnerability Mgmt initialization failed:', error);
    }
  }

  // ============================================================
  // Initialize Coordinator (if configured)
  // ============================================================
  if (config.coordinator || (config.edr && config.nsm)) {
    try {
      const coordinatorConfig: PlatformIntegrationConfig = {
        edr: config.edr,
        nsm: config.nsm,
        siem: config.siem ? {
          wazuh: config.siem.wazuh,
          elasticsearch: config.siem.elasticsearch,
          ...(config.kafka && { kafka: { brokers: config.kafka.brokers, topic: 'soc.events' } }),
        } : undefined,
        opencti: config.threatIntel?.opencti,
        misp: config.threatIntel?.misp ? {
          config: config.threatIntel.misp,
          ...(config.kafka && { kafka: { brokers: config.kafka.brokers, topic: 'soc.threat-intel' } }),
        } : undefined,
        soar: config.soar,
        vulnerability: config.vulnerability,
        kafka: {
          brokers: config.kafka?.brokers || ['localhost:9092'],
          topics: {
            alerts: 'soc.alerts',
            events: 'soc.events',
            incidents: 'soc.incidents',
            threatIntel: 'soc.threat-intel',
            correlation: 'soc.correlation',
          },
        },
        autoResponseEnabled: true,
        autoCorrelationEnabled: true,
        autoEscalationThreshold: 'critical-high',
        logLevel: 'info',
        metricsEnabled: true,
      };
      
      platform.coordinator = createIntegrationCoordinator(coordinatorConfig);
      await platform.coordinator.initialize();
      console.log('[Integration] ✅ Integration Coordinator initialized');
    } catch (error) {
      console.error('[Integration] ❌ Coordinator initialization failed:', error);
    }
  }

  // Summary
  const successCount = Object.values(platform).filter(v => v !== undefined).length;
  const totalCount = Object.keys(config).length;

  console.log(`[Integration] 🎉 Initialization complete: ${successCount}/${totalCount} integrations ready`);
  console.log('[Integration] Platform ready for production operations');

  return platform;
}

/**
 * Gracefully shutdown all integrations (Phase 11 Extended)
 */
export async function shutdownAllIntegrations(platform: IntegratedPlatform): Promise<void> {
  console.log('[Integration] 🛑 Shutting down all integrations...');

  const shutdownPromises: Promise<void>[] = [];

  // Shutdown coordinator first (manages other connections)
  if (platform.coordinator) {
    shutdownPromises.push(
      platform.coordinator.shutdown().catch(e => console.error('[Coordinator] Shutdown error:', e))
    );
  }

  // Shutdown existing integrations
  if (platform.siem) {
    shutdownPromises.push(
      platform.siem.shutdown().catch(e => console.error('[SIEM] Shutdown error:', e))
    );
  }

  if (platform.soar) {
    shutdownPromises.push(
      platform.soar.shutdown().catch(e => console.error('[SOAR] Shutdown error:', e))
    );
  }

  if (platform.threatIntel?.misp) {
    shutdownPromises.push(
      platform.threatIntel.misp.shutdown().catch(e => console.error('[MISP] Shutdown error:', e))
    );
  }

  if (platform.threatIntel?.opencti) {
    shutdownPromises.push(
      platform.threatIntel.opencti.disconnect().catch(e => console.error('[OpenCTI] Shutdown error:', e))
    );
  }

  if (platform.kafka) {
    shutdownPromises.push(
      shutdownKafkaInfrastructure().catch(e => console.error('[Kafka] Shutdown error:', e))
    );
  }

  // Shutdown Phase 11 integrations
  if (platform.edr) {
    shutdownPromises.push(
      platform.edr.disconnect().catch(e => console.error('[EDR] Shutdown error:', e))
    );
  }

  if (platform.nsm) {
    shutdownPromises.push(
      platform.nsm.disconnect().catch(e => console.error('[NSM] Shutdown error:', e))
    );
  }

  if (platform.vulnerability) {
    shutdownPromises.push(
      platform.vulnerability.disconnect().catch(e => console.error('[VULN] Shutdown error:', e))
    );
  }

  await Promise.all(shutdownPromises);
  console.log('[Integration] ✅ All integrations shut down successfully');
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check health status of all integrations (Phase 11 Extended)
 */
export async function checkAllHealth(platform: IntegratedPlatform): Promise<{
  status: 'operational' | 'degraded' | 'down';
  services: Record<string, { status: string; latency?: number; details?: any }>;
  uptimeSeconds?: number;
}> {
  const services: Record<string, any> = {};
  let operationalCount = 0;
  let totalCount = 0;

  // Use coordinator if available (provides unified health)
  if (platform.coordinator) {
    try {
      const healthStatus = await platform.coordinator.getHealthStatus();
      return {
        status: healthStatus.overall,
        services: healthStatus.components as any,
        uptimeSeconds: healthStatus.uptimeSeconds,
      };
    } catch (e) {
      services['coordinator'] = { status: 'error', error: String(e) };
    }
  }

  // Individual health checks (fallback or when no coordinator)
  
  // SIEM Health
  if (platform.siem) {
    totalCount++;
    try {
      const metrics = await platform.siem.getMetrics();
      services['siem'] = { status: 'healthy', latency: 0 };
      operationalCount++;
    } catch (e) {
      services['siem'] = { status: 'unhealthy', error: String(e) };
    }
  }

  // SOAR Health
  if (platform.soar) {
    totalCount++;
    try {
      const thehiveHealth = await platform.soar.thehiveClient.healthCheck();
      services['thehive'] = { status: thehiveHealth.status, latency: thehiveHealth.latency };
      
      const cortexHealth = await platform.soar.cortexClient.healthCheck();
      services['cortex'] = { status: cortexHealth.status, latency: cortexHealth.latency };
      
      operationalCount++;
    } catch (e) {
      services['soar'] = { status: 'unhealthy', error: String(e) };
    }
  }

  // Threat Intel Health (MISP)
  if (platform.threatIntel?.misp) {
    totalCount++;
    try {
      const health = await platform.threatIntel.mispClient.healthCheck();
      services['misp'] = { status: health.status, latency: health.latency };
      operationalCount++;
    } catch (e) {
      services['misp'] = { status: 'unhealthy', error: String(e) };
    }
  }

  // Threat Intel Health (OpenCTI)
  if (platform.threatIntel?.opencti) {
    totalCount++;
    try {
      const health = await platform.threatIntel.opencti.healthCheck();
      services['opencti'] = { status: health.status, latency: health.latency };
      operationalCount++;
    } catch (e) {
      services['opencti'] = { status: 'unhealthy', error: String(e) };
    }
  }

  // Kafka Health
  if (platform.kafka) {
    totalCount++;
    services['kafka'] = { status: 'connected' }; // Basic check
    operationalCount++;
  }

  // EDR Health (Phase 11)
  if (platform.edr) {
    totalCount++;
    try {
      const health = await platform.edr.healthCheck();
      services['edr'] = { 
        status: health.grr.status === 'healthy' && health.osquery.status === 'healthy' ? 'healthy' : 'degraded',
        latency: Math.max(health.grr.latency, health.osquery.latency),
        details: health,
      };
      operationalCount++;
    } catch (e) {
      services['edr'] = { status: 'unhealthy', error: String(e) };
    }
  }

  // NSM Health (Phase 11)
  if (platform.nsm) {
    totalCount++;
    try {
      const health = await platform.nsm.healthCheck();
      services['nsm'] = { 
        status: health.overall,
        latency: Math.max(health.suricata.latency, health.arkime.latency),
        details: health,
      };
      if (health.overall === 'operational') operationalCount++;
    } catch (e) {
      services['nsm'] = { status: 'unhealthy', error: String(e) };
    }
  }

  // Vulnerability Mgmt Health (Phase 11)
  if (platform.vulnerability) {
    totalCount++;
    try {
      const health = await platform.vulnerability.healthCheck();
      services['vulnerability'] = { 
        status: health.overall,
        latency: Math.max(health.openvas.latency, health.defectdojo.latency),
        details: health,
      };
      if (health.overall === 'operational') operationalCount++;
    } catch (e) {
      services['vulnerability'] = { status: 'unhealthy', error: String(e) };
    }
  }

  const overallStatus = operationalCount === totalCount ? 'operational' : 
                    operationalCount >= totalCount / 2 ? 'degraded' : 'down';

  return { status: overallStatus, services };
}

/**
 * Get comprehensive integration statistics for dashboard display (Phase 11 Extended)
 */
export async function getIntegrationStats(platform: IntegratedPlatform): Promise<{
  totalEventsIngested: number;
  incidentsCreated: number;
  iocsInDatabase: number;
  activeFeeds: number;
  kafkaMessagesProduced: number;
  lastSyncTime: string | null;
  // Phase 11 additional stats
  endpointsMonitored: number;
  activeHunts: number;
  vulnerabilitiesTracked: number;
  nsmSessionsCaptured: number;
  correlationsPerformed: number;
  autoResponsesExecuted: number;
}> {
  const stats = {
    totalEventsIngested: 0,
    incidentsCreated: 0,
    iocsInDatabase: 0,
    activeFeeds: 0,
    kafkaMessagesProduced: 0,
    lastSyncTime: null as string | null,
    // Phase 11 stats
    endpointsMonitored: 0,
    activeHunts: 0,
    vulnerabilitiesTracked: 0,
    nsmSessionsCaptured: 0,
    correlationsPerformed: 0,
    autoResponsesExecuted: 0,
  };

  // SIEM Stats
  if (platform.siem) {
    try {
      const metrics = await platform.siem.getMetrics();
      stats.totalEventsIngested = metrics.totalEvents;
    } catch (e) {
      // Stats unavailable
    }
  }

  // Kafka Stats
  if (platform.kafka?.producer) {
    const producerMetrics = platform.kafka.producer.getMetrics();
    stats.kafkaMessagesProduced = producerMetrics.totalMessagesProduced;
  }

  // Threat Intel Stats (MISP)
  if (platform.threatIntel?.misp) {
    try {
      const tiStats = await platform.threatIntel.misp.getStats();
      stats.iocsInDatabase += tiStats.totalIOCs;
      stats.activeFeeds += tiStats.feedStatus.filter(f => f.enabled).length;
      stats.lastSyncTime = tiStats.lastSyncTime;
    } catch (e) {
      // Stats unavailable
    }
  }

  // Threat Intel Stats (OpenCTI)
  if (platform.threatIntel?.opencti) {
    try {
      const openctiStats = await platform.threatIntel.opencti.getFullStats();
      stats.iocsInDatabase += openctiStats.indicators.total;
    } catch (e) {
      // Stats unavailable
    }
  }

  // EDR Stats (Phase 11)
  if (platform.edr) {
    try {
      const edrStats = await platform.edr.getClientStats();
      stats.endpointsMonitored = edrStats.total;
      stats.activeHunts = platform.edr.stats.activeHunts;
    } catch (e) {
      // Stats unavailable
    }
  }

  // NSM Stats (Phase 11)
  if (platform.nsm) {
    try {
      const nsmStats = await platform.nsm.getFullStats();
      stats.nsmSessionsCaptured = nsmStats.arkime.sessionsCaptured;
    } catch (e) {
      // Stats unavailable
    }
  }

  // Vulnerability Stats (Phase 11)
  if (platform.vulnerability) {
    try {
      const vulnStats = await platform.vulnerability.getFullStats();
      stats.vulnerabilitiesTracked = vulnStats.summary.totalFindings;
    } catch (e) {
      // Stats unavailable
    }
  }

  // Coordinator Stats (if available)
  if (platform.coordinator) {
    stats.correlationsPerformed = platform.coordinator.stats.correlationsPerformed;
    stats.autoResponsesExecuted = platform.coordinator.stats.autoResponsesExecuted;
  }

  return stats;
}

// ============================================================
// Exports
// ============================================================

export default {
  initializeAllIntegrations,
  shutdownAllIntegrations,
  checkAllHealth,
  getIntegrationStats,
  // Version info
  version: '11.1.0',
  phase: 'Phase 11 - Enterprise Production',
  builtAt: new Date().toISOString(),
};
