/**
 * Djezzy National SOC Platform - Enterprise Integration Index
 * Phase 11: Complete Open Security Tools Integration
 * 
 * This module provides unified access to all security tool integrations:
 * - SIEM: Wazuh + Elasticsearch (event management, log aggregation)
 * - EDR: Wazuh + GRR + Osquery (endpoint detection & response)
 * - SOAR: TheHive + Cortex (case management, automated analysis)
 * - Threat Intelligence: MISP + OpenCTI (IOC management, feed synchronization)
 * - NSM: Suricata + Zeek + Arkime (network monitoring)
 * - Messaging: Apache Kafka (event streaming backbone)
 * 
 * @version 11.0.0
 */

// SIEM Integration
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

// SOAR Integration
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

// Threat Intelligence
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

// Event Streaming
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
// Integration Factory
// ============================================================

export interface AllIntegrationsConfig {
  siem?: SiemIntegrationConfig;
  soar?: SoarIntegrationConfig;
  threatIntel?: MispConfig;
  kafka?: KafkaConfig;
}

export interface IntegratedPlatform {
  siem?: SiemIntegrationService;
  soar?: SoarIntegrationService;
  threatIntel?: ThreatIntelService;
  kafka?: {
    producer: KafkaProducer;
    schemaRegistry: SchemaRegistryClient;
    dlqHandler: DeadLetterQueueHandler;
  };
}

/**
 * Initialize all configured integrations
 */
export async function initializeAllIntegrations(
  config: AllIntegrationsConfig
): Promise<IntegratedPlatform> {
  const platform: IntegratedPlatform = {};
  
  console.log('[Integration] Initializing all security tool integrations...');

  // Initialize SIEM if configured
  if (config.siem) {
    try {
      platform.siem = getSiemIntegration(config.siem);
      await platform.siem.initialize();
      console.log('[Integration] ✓ SIEM integration initialized');
    } catch (error) {
      console.error('[Integration] ✗ SIEM initialization failed:', error);
    }
  }

  // Initialize SOAR if configured
  if (config.soar) {
    try {
      platform.soar = getSoarIntegration(config.soar);
      await platform.soar.initialize();
      console.log('[Integration] ✓ SOAR integration initialized');
    } catch (error) {
      console.error('[Integration] ✗ SOAR initialization failed:', error);
    }
  }

  // Initialize Threat Intel if configured
  if (config.threatIntel) {
    try {
      platform.threatIntel = getThreatIntelService(config.threatIntel);
      await platform.threatIntel.initialize();
      console.log('[Integration] ✓ Threat Intelligence integration initialized');
    } catch (error) {
      console.error('[Integration] ✗ Threat Intel initialization failed:', error);
    }
  }

  // Initialize Kafka if configured
  if (config.kafka) {
    try {
      const kafkaInfra = await initializeKafkaInfrastructure(config.kafka);
      platform.kafka = kafkaInfra;
      console.log('[Integration] ✓ Kafka event streaming initialized');
    } catch (error) {
      console.error('[Integration] ✗ Kafka initialization failed:', error);
    }
  }

  const successCount = Object.values(platform).filter(v => v !== undefined).length;
  const totalCount = Object.keys(config).length;

  console.log(`[Integration] Initialization complete: ${successCount}/${totalCount} integrations ready`);

  return platform;
}

/**
 * Gracefully shutdown all integrations
 */
export async function shutdownAllIntegrations(platform: IntegratedPlatform): Promise<void> {
  console.log('[Integration] Shutting down all integrations...');

  const shutdownPromises: Promise<void>[] = [];

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

  if (platform.threatIntel) {
    shutdownPromises.push(
      platform.threatIntel.shutdown().catch(e => console.error('[TI] Shutdown error:', e))
    );
  }

  if (platform.kafka) {
    shutdownPromises.push(
      shutdownKafkaInfrastructure().catch(e => console.error('[Kafka] Shutdown error:', e))
    );
  }

  await Promise.all(shutdownPromises);
  console.log('[Integration] All integrations shut down');
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check health status of all integrations
 */
export async function checkAllHealth(platform: IntegratedPlatform): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, { status: string; latency?: number; details?: any }>;
}> {
  const services: Record<string, any> = {};
  let healthyCount = 0;
  let totalCount = 0;

  if (platform.siem) {
    totalCount++;
    try {
      const metrics = await platform.siem.getMetrics();
      services['siem'] = { status: 'healthy', latency: 0 };
      healthyCount++;
    } catch (e) {
      services['siem'] = { status: 'unhealthy', error: String(e) };
    }
  }

  if (platform.soar) {
    totalCount++;
    try {
      const thehiveHealth = await platform.soar.thehiveClient.healthCheck();
      services['thehive'] = { status: thehiveHealth.status, latency: thehiveHealth.latency };
      
      const cortexHealth = await platform.soar.cortexClient.healthCheck();
      services['cortex'] = { status: cortexHealth.status, latency: cortexHealth.latency };
      
      healthyCount++;
    } catch (e) {
      services['soar'] = { status: 'unhealthy', error: String(e) };
    }
  }

  if (platform.threatIntel) {
    totalCount++;
    try {
      const health = await platform.threatIntel.mispClient.healthCheck();
      services['misp'] = { status: health.status, latency: health.latency };
      healthyCount++;
    } catch (e) {
      services['threatIntel'] = { status: 'unhealthy', error: String(e) };
    }
  }

  if (platform.kafka) {
    totalCount++;
    services['kafka'] = { status: 'connected' }; // Basic check
    healthyCount++;
  }

  const overallStatus = healthyCount === totalCount ? 'healthy' : healthyCount > 0 ? 'degraded' : 'unhealthy';

  return { status: overallStatus, services };
}

/**
 * Get integration statistics for dashboard display
 */
export async function getIntegrationStats(platform: IntegratedPlatform): Promise<{
  totalEventsIngested: number;
  incidentsCreated: number;
  iocsInDatabase: number;
  activeFeeds: number;
  kafkaMessagesProduced: number;
  lastSyncTime: string | null;
}> {
  const stats = {
    totalEventsIngested: 0,
    incidentsCreated: 0,
    iocsInDatabase: 0,
    activeFeeds: 0,
    kafkaMessagesProduced: 0,
    lastSyncTime: null as string | null,
  };

  if (platform.siem) {
    try {
      const metrics = await platform.siem.getMetrics();
      stats.totalEventsIngested = metrics.totalEvents;
    } catch (e) {
      // Stats unavailable
    }
  }

  if (platform.kafka?.producer) {
    const producerMetrics = platform.kafka.producer.getMetrics();
    stats.kafkaMessagesProduced = producerMetrics.totalMessagesProduced;
  }

  if (platform.threatIntel) {
    try {
      const tiStats = await platform.threatIntel.getStats();
      stats.iocsInDatabase = tiStats.totalIOCs;
      stats.activeFeeds = tiStats.feedStatus.filter(f => f.enabled).length;
    } catch (e) {
      // Stats unavailable
    }
  }

  return stats;
}

export default {
  initializeAllIntegrations,
  shutdownAllIntegrations,
  checkAllHealth,
  getIntegrationStats,
};
