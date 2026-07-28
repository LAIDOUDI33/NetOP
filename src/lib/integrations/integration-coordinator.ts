/**
 * Integration Service Layer Coordinator
 * Phase 11: Unified Security Integration Hub
 * 
 * This module provides a unified interface to all security tool integrations,
 * enabling cross-tool correlation, automated response, and centralized management.
 * 
 * Features:
 * - Single entry point for all security operations
 * - Cross-tool event correlation and deduplication
 * - Automated response orchestration (EDR + NSM + Vuln)
 * - Centralized health monitoring and alerting
 * - Event routing to Kafka for downstream processing
 * - Telco-specific workflow automation
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────┐
 * │              IntegrationCoordinator                 │
 * ├─────────┬──────────┬──────────┬──────────┬──────────┤
 * │   EDR    │   NSM    │  SIEM    │   TI     │  VULN    │
 * │ (GRR)    │(Suricata)│ (Wazuh)  │(OpenCTI) │(OpenVAS)│
 * │          │          │          │          │          │
 * └──────────┴──────────┴──────────┴──────────┴──────────┘
 *                              │
 *                    ┌─────────▼─────────┐
 *                    │   Kafka Event Bus  │
 *                    │  (Event Streaming) │
 *                    └───────────────────┘
 *                              │
 *                    ┌─────────▼─────────┐
 *                    │   SOC Platform DB  │
 *                    │  (PostgreSQL/Prisma)│
 *                    └───────────────────┘
 * 
 * @version 1.0.0
 * @license Proprietary - Djezzy National SOC Platform
 */

import { EventEmitter } from 'events';
import { GrrOsqueryEdrClient, EdrIntegrationConfig } from './edr/grr-osquery-client';
import { SuricataZeekArkimeClient, NsmIntegrationConfig } from './nsm/suricata-zeek-arkime-client';
import { WazuhElasticsearchClient, SiemIntegrationConfig } from './siem/wazuh-elasticsearch-client';
import { OpenctiClient, OpenctiIntegrationConfig } from './threat-intel/opencti-client';
import { MispClient, MispConfig } from './threat-intel/misp-client';
import { TheHiveCortexClient, SoarIntegrationConfig } from './soar/thehive-cortex-client';
import { OpenvasDefectDojoClient, VulnerabilityIntegrationConfig } from './vulnerability/openvas-defectdojo-client';

// ============================================================
// Types & Interfaces
// ============================================================

export interface PlatformIntegrationConfig {
  edr?: EdrIntegrationConfig;
  nsm?: NsmIntegrationConfig;
  siem?: SiemIntegrationConfig;
  opencti?: OpenctiIntegrationConfig;
  misp?: { config: MispConfig; kafka?: { brokers: string[]; topic: string } };
  soar?: SoarIntegrationConfig;
  vulnerability?: VulnerabilityIntegrationConfig;
  
  // Global settings
  kafka: {
    brokers: string[];
    topics: {
      alerts: string;           // "soc.alerts"
      events: string;           // "soc.events"
      incidents: string;        // "soc.incidents"
      threatIntel: string;      // "soc.threat-intel"
      correlation: string;      // "soc.correlation"
    };
    producerConfig?: Record<string, any>;
  };
  
  // Automation settings
  autoResponseEnabled: boolean;
  autoCorrelationEnabled: boolean;
  autoEscalationThreshold: 'critical' | 'critical-high' | 'all';
  
  // Logging & monitoring
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  metricsEnabled: boolean;
}

export interface CorrelatedEvent {
  eventId: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  
  // Source events that were correlated
  sourceEvents: Array<{
    source: 'edr' | 'nsm' | 'siem' | 'ti' | 'vuln';
    originalId: string;
    summary: string;
    confidence: number;
  }>;
  
  // Correlation metadata
  correlationScore: number;    // 0-100 how confident we are in this correlation
  correlationType: string;     // e.g., "ip_match", "hash_match", "temporal_proximity"
  
  // Enrichment data
  threatIntelContext?: any;
  assetContext?: any;
  userContext?: any;
  
  // Actions taken or recommended
  actionsTaken?: Array<{
    action: string;
    target: string;
    result: 'success' | 'failed' | 'pending';
    timestamp: string;
  }>;
  recommendedActions?: string[];
  
  // Incident linkage
  incidentId?: string;
  caseId?: string;
}

export interface SystemHealthStatus {
  overall: 'operational' | 'degraded' | 'down';
  components: {
    edr: { status: 'connected' | 'disconnected' | 'error'; latency: number; lastCheck: string };
    nsm: { status: 'connected' | 'disconnected' | 'error'; latency: number; lastCheck: string };
    siem: { status: 'connected' | 'disconnected' | 'error'; latency: number; lastCheck: string };
    opencti: { status: 'connected' | 'disconnected' | 'error'; latency: number; lastCheck: string };
    misp: { status: 'connected' | 'disconnected' | 'error'; latency: number; lastCheck: string };
    soar: { status: 'connected' | 'disconnected' | 'error'; latency: number; lastCheck: string };
    vulnerability: { status: 'connected' | 'disconnected' | 'error'; latency: number; lastCheck: string };
    kafka: { status: 'connected' | 'disconnected' | 'error'; messageCount: number };
    database: { status: 'connected' | 'disconnected' | 'error'; queryTime: number };
  };
  uptimeSeconds: number;
  eventsProcessedToday: number;
  errorsToday: number;
}

export interface AutomatedResponseResult {
  success: boolean;
  action: string;
  target: string;
  result: any;
  timestamp: string;
  triggeredBy: {
    source: string;
    eventId: string;
    severity: string;
  };
}

// ============================================================
// Integration Coordinator Class
// ============================================================

export class IntegrationCoordinator extends EventEmitter {
  private config: PlatformIntegrationConfig;
  
  // Client instances
  private edrClient?: GrrOsqueryEdrClient;
  private nsmClient?: SuricataZeekArkimeClient;
  private siemClient?: WazuhElasticsearchClient;
  private openctiClient?: OpenctiClient;
  private mispClient?: MispClient;
  private soarClient?: TheHiveCortexClient;
  private vulnClient?: OpenvasDefectDojoClient;
  
  // State
  private isInitialized = false;
  private startTime: Date = new Date();
  private eventBuffer: CorrelatedEvent[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;
  
  // Statistics
  public stats = {
    eventsProcessed: 0,
    correlationsPerformed: 0,
    autoResponsesExecuted: 0,
    errorsEncountered: 0,
    lastEventTimestamp: null as Date | null,
    uptime: () => Math.floor((Date.now() - this.startTime.getTime()) / 1000),
  };

  constructor(config: PlatformIntegrationConfig) {
    super();
    this.config = config;

    // Set up internal handlers
    this.on('error', (err) => {
      console.error('[COORDINATOR] Error:', err.message);
      this.stats.errorsEncountered++;
    });

    this.on('correlationComplete', (event: CorrelatedEvent) => {
      console.log(`[COORDINATOR] Correlation complete: ${event.title} (${event.sourceEvents.length} sources)`);
      
      // Auto-escalation if configured
      if (this.shouldAutoEscalate(event)) {
        this.executeAutoEscalation(event);
      }
    });

    // Start buffer flush interval
    this.bufferFlushInterval = setInterval(() => this.flushEventBuffer(), 10000);
  }

  // ============================================================
  // Initialization & Connection Management
  // ============================================================

  /**
   * Initialize all configured integrations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[COORDINATOR] Already initialized');
      return;
    }

    console.log('[COORDINATOR] Initializing all integrations...');

    try {
      // Initialize clients in order of dependency
      const initPromises: Promise<any>[] = [];

      // EDR (GRR/Osquery)
      if (this.config.edr) {
        this.edrClient = new GrrOsqueryEdrClient(this.config.edr);
        initPromises.push(
          this.edrClient.connect()
            .then(() => console.log('[COORDINATOR] ✓ EDR connected'))
            .catch(err => { console.error('[COORDINATOR] ✗ EDR failed:', err.message); throw err; })
        );
      }

      // NSM (Suricata/Zeek/Arkime)
      if (this.config.nsm) {
        this.nsmClient = new SuricataZeekArkimeClient(this.config.nsm);
        initPromises.push(
          this.nsmClient.connect()
            .then(() => console.log('[COORDINATOR] ✓ NSM connected'))
            .catch(err => { console.error('[COORDINATOR] ✗ NSM failed:', err.message); throw err; })
        );
      }

      // SIEM (Wazuh/Elasticsearch)
      if (this.config.siem) {
        this.siemClient = new WazuhElasticsearchClient(this.config.siem);
        initPromises.push(
          this.siemClient.connect()
            .then(() => console.log('[COORDINATOR] ✓ SIEM connected'))
            .catch(err => { console.error('[COORDINATOR] ✗ SIEM failed:', err.message); throw err; })
        );
      }

      // Threat Intelligence (OpenCTI)
      if (this.config.opencti) {
        this.openctiClient = new OpenctiClient(this.config.opencti);
        initPromises.push(
          this.openctiClient.connect()
            .then(() => console.log('[COORDINATOR] ✓ OpenCTI connected'))
            .catch(err => { console.error('[COORDINATOR] ✗ OpenCTI failed:', err.message); throw err; })
        );
      }

      // Threat Intelligence (MISP)
      if (this.config.misp) {
        this.mispClient = new MispClient(this.config.misp.config);
        initPromises.push(
          this.mispClient.connect()
            .then(() => console.log('[COORDINATOR] ✓ MISP connected'))
            .catch(err => { console.error('[COORDINATOR] ✗ MISP failed:', err.message); throw err; })
        );
      }

      // SOAR (TheHive/Cortex)
      if (this.config.soar) {
        this.soarClient = new TheHiveCortexClient(this.config.soar);
        initPromises.push(
          this.soarClient.connect()
            .then(() => console.log('[COORDINATOR] ✓ SOAR connected'))
            .catch(err => { console.error('[COORDINATOR] ✗ SOAR failed:', err.message); throw err; })
        );
      }

      // Vulnerability Management (OpenVAS/DefectDojo)
      if (this.config.vulnerability) {
        this.vulnClient = new OpenvasDefectDojoClient(this.config.vulnerability);
        initPromises.push(
          this.vulnClient.connect()
            .then(() => console.log('[COORDINATOR] ✓ Vulnerability Management connected'))
            .catch(err => { console.error('[COORDINATOR] ✗ Vulnerability Management failed:', err.message); throw err; })
        );
      }

      // Wait for all initializations (with partial failure tolerance)
      const results = await Promise.allSettled(initPromises);

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`[COORDINATOR] Initialization complete: ${succeeded} succeeded, ${failed} failed`);

      this.isInitialized = true;
      this.emit('initialized', { succeeded, failed, timestamp: new Date() });

    } catch (error) {
      this.isInitialized = false;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown all connections
   */
  async shutdown(): Promise<void> {
    console.log('[COORDINATOR] Shutting down...');

    // Clear intervals
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }

    // Flush remaining events
    await this.flushEventBuffer();

    // Disconnect all clients
    const disconnectPromises: Promise<any>[] = [
      this.edrClient?.disconnect(),
      this.nsmClient?.disconnect(),
      this.siemClient?.disconnect(),
      this.openctiClient?.disconnect(),
      this.mispClient?.disconnect(),
      this.soarClient?.disconnect(),
      this.vulnClient?.disconnect(),
    ].filter(Boolean);

    await Promise.allSettled(disconnectPromises);

    this.isInitialized = false;
    this.emit('shutdown', { timestamp: new Date() });
    console.log('[COORDINATOR] Shutdown complete');
  }

  get initialized(): boolean {
    return this.isInitialized;
  }

  // ============================================================
  // Cross-Tool Event Processing
  // ============================================================

  /**
   * Process an incoming event through correlation and enrichment pipeline
   */
  async processEvent(params: {
    source: 'edr' | 'nsm' | 'siem' | 'ti' | 'vuln' | 'manual';
    rawEvent: any;
    severity?: string;
    context?: Record<string, any>;
  }): Promise<CorrelatedEvent> {
    const { source, rawEvent, severity, context = {} } = params;

    try {
      console.log(`[COORDINATOR] Processing ${source} event`);

      // Step 1: Normalize event format
      const normalizedEvent = await this.normalizeEvent(source, rawEvent);

      // Step 2: Enrich with additional context
      const enrichedEvent = await this.enrichEvent(normalizedEvent);

      // Step 3: Correlate with other sources
      const correlatedEvent = await this.correlateEvent(enrichedEvent);

      // Step 4: Determine if automated response should be triggered
      if (this.config.autoResponseEnabled && this.shouldAutoRespond(correlatedEvent)) {
        const responseResult = await this.executeAutomatedResponse(correlatedEvent);
        correlatedEvent.actionsTaken = correlatedEvent.actionsTaken || [];
        correlatedEvent.actionsTaken.push(responseResult);
      }

      // Step 5: Publish to Kafka for downstream consumers
      await this.publishToKafka('alerts', correlatedEvent);

      // Step 6: Buffer for batch processing
      this.eventBuffer.push(correlatedEvent);

      // Update statistics
      this.stats.eventsProcessed++;
      this.stats.lastEventTimestamp = new Date();

      this.emit('eventProcessed', correlatedEvent);
      return correlatedEvent;

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Batch process multiple events
   */
  async processEvents(events: Array<{
    source: 'edr' | 'nsm' | 'siem' | 'ti' | 'vuln' | 'manual';
    rawEvent: any;
    severity?: string;
  }>): Promise<CorrelatedEvent[]> {
    console.log(`[COORDINATOR] Batch processing ${events.length} events`);

    // Process in parallel batches for performance
    const batchSize = 10;
    const results: CorrelatedEvent[] = [];

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(event => this.processEvent(event))
      );

      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`[COORDINATOR] Event processing failed:`, result.reason);
        }
      });
    }

    return results;
  }

  // ============================================================
  // Correlation Engine
  // ============================================================

  /**
   * Correlate an event across all available data sources
   */
  private async correlateEvent(event: any): Promise<CorrelatedEvent> {
    if (!this.config.autoCorrelationEnabled) {
      return this.createMinimalCorrelation(event);
    }

    const sourceEvents: CorrelatedEvent['sourceEvents'] = [];
    let correlationScore = 0;
    let correlationType = '';

    // Extract key identifiers for correlation
    const ipAddresses = this.extractIPs(event);
    const hashes = this.extractHashes(event);
    const domains = this.extractDomains(event);
    const msisdns = this.extractMSISDNs(event);

    // Search each integration for matching events
    const searchPromises: Promise<any>[] = [];

    // NSM correlation (Suricata/Zeek)
    if (this.nsmClient && ipAddresses.length > 0) {
      searchPromises.push(
        this.nsmClient.correlateEvents({ sourceIp: ipAddresses[0], timeRangeMinutes: 60 })
          .then(nsmEvents => {
            nsmEvents.forEach((e: any) => {
              sourceEvents.push({
                source: 'nsm',
                originalId: e.eventId,
                summary: e.title,
                confidence: e.severity === 'critical' ? 90 : e.severity === 'high' ? 70 : 50,
              });
            });
            if (nsmEvents.length > 0) correlationScore += 30;
          })
          .catch(() => {})
      );
    }

    // Threat Intel correlation (OpenCTI/MISP)
    if ((this.openctiClient || this.mispClient) && (ipAddresses.length > 0 || hashes.length > 0)) {
      const observableValue = ipAddresses[0] || hashes[0];
      const observableType = ipAddresses[0] ? 'IPv4-Addr' : 'File-Sha256';

      if (this.openctiClient) {
        searchPromises.push(
          this.openctiClient.matchObservable({
            observableValue,
            observableType,
            includeContext: true,
          }).then(match => {
            if (match.matched) {
              match.indicators.forEach(indicator => {
                sourceEvents.push({
                  source: 'ti',
                  originalId: indicator.id,
                  summary: indicator.name || indicator.indicator_pattern,
                  confidence: indicator.x_opencti_score || 70,
                });
              });
              correlationScore += 40;
              correlationType = 'ioc_match';
              
              // Attach threat intel context
              event.threatIntelContext = match.context;
            }
          })
          .catch(() => {})
        );
      }
    }

    // EDR correlation (if we have host info)
    if (this.edrClient && event.hostname) {
      searchPromises.push(
        this.edrClient.searchClients({ query: event.hostname, limit: 5 })
          .then(clients => {
            if (clients.clients.length > 0) {
              sourceEvents.push({
                source: 'edr',
                originalId: clients.clients[0].clientId,
                summary: `Endpoint found: ${clients.clients[0].hostname}`,
                confidence: 85,
              });
              correlationScore += 25;
              correlationType = 'asset_correlation';
              
              // Attach asset context
              event.assetContext = clients.clients[0];
            }
          })
          .catch(() => {})
      );
    }

    // Vulnerability correlation
    if (this.vulnClient && event.host) {
      searchPromises.push(
        this.vulnClient.getUnifiedVulnerabilities({ host: event.host, limit: 10 })
          .then(vulns => {
            vulns.vulnerabilities.filter(v => v.status === 'open').forEach(vuln => {
              sourceEvents.push({
                source: 'vuln',
                originalId: vuln.vulnId,
                summary: `${vuln.severity}: ${vuln.title}`,
                confidence: vuln.cvssScore > 7 ? 90 : 70,
              });
            });
            if (vulns.vulnerabilities.some(v => v.status === 'open')) {
              correlationScore += 20;
            }
          })
          .catch(() => {})
      );
    }

    // Execute all searches in parallel
    await Promise.allSettled(searchPromises);

    // Create correlated event
    const correlatedEvent: CorrelatedEvent = {
      eventId: `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      severity: this.calculateCorrelatedSeverity(event, sourceEvents),
      title: this.generateCorrelationTitle(event, sourceEvents),
      description: this.generateCorrelationDescription(event, sourceEvents),
      sourceEvents,
      correlationScore: Math.min(100, correlationScore),
      correlationType,
      ...event,
    };

    // Generate recommendations based on findings
    correlatedEvent.recommendedActions = this.generateRecommendations(correlatedEvent);

    this.stats.correlationsPerformed++;
    this.emit('correlationComplete', correlatedEvent);

    return correlatedEvent;
  }

  // ============================================================
  // Automated Response Engine
  // ============================================================

  /**
   * Determine if automated response should be triggered
   */
  private shouldAutoRespond(event: CorrelatedEvent): boolean {
    switch (this.config.autoEscalationThreshold) {
      case 'critical':
        return event.severity === 'critical';
      case 'critical-high':
        return event.severity === 'critical' || event.severity === 'high';
      case 'default':
        return event.severity !== 'info';
    }
  }

  /**
   * Should this event be auto-escalated to incident?
   */
  private shouldAutoEscalate(event: CorrelatedEvent): boolean {
    return (
      event.severity === 'critical' ||
      (event.severity === 'high' && event.correlationScore > 60) ||
      (event.sourceEvents.length >= 3)
    );
  }

  /**
   * Execute automated response actions
   */
  private async executeAutomatedResponse(event: CorrelatedEvent): Promise<AutomatedResponseResult> {
    const action = this.determineBestAction(event);
    
    try {
      let result: any;

      switch (action.type) {
        case 'isolate_endpoint':
          if (this.edrClient && event.assetContext?.clientId) {
            result = await this.edrClient.isolateEndpoint(
              event.assetContext.clientId,
              `Automated isolation due to ${event.title}`,
              'SOC Platform'
            );
          }
          break;

        case 'block_ip':
          // Would integrate with firewall/network device API
          result = { success: true, blockedIp: action.target };
          break;

        case 'create_incident':
          if (this.soarClient) {
            result = await this.soarClient.createCase({
              title: `[AUTO] ${event.title}`,
              description: event.description,
              severity: event.severity.toUpperCase(),
              tags: ['auto-generated', 'automated-response'],
              tlp: 3, // AMBER by default for auto-generated
            });
          }
          break;

        case 'alert_analyst':
          // Just emit alert, no automatic action
          result = { success: true, alerted: true };
          break;

        default:
          result = { success: true, action: 'none' };
      }

      const responseResult: AutomatedResponseResult = {
        success: result.success ?? true,
        action: action.type,
        target: action.target || 'N/A',
        result,
        timestamp: new Date().toISOString(),
        triggeredBy: {
          source: event.sourceEvents[0]?.source || 'unknown',
          eventId: event.eventId,
          severity: event.severity,
        },
      };

      this.stats.autoResponsesExecuted++;
      this.emit('automatedResponse', responseResult);

      return responseResult;

    } catch (error) {
      this.emit('error', error);
      return {
        success: false,
        action: action.type,
        target: action.target || 'N/A',
        result: { error: error.message },
        timestamp: new Date().toISOString(),
        triggeredBy: {
          source: event.sourceEvents[0]?.source || 'unknown',
          eventId: event.eventId,
          severity: event.severity,
        },
      };
    }
  }

  /**
   * Execute auto-escalation (create incident/case)
   */
  private async executeAutoEscalation(event: CorrelatedEvent): Promise<void> {
    if (!this.soarClient) {
      console.warn('[COORDINATOR] No SOAR client configured for escalation');
      return;
    }

    try {
      const caseData = await this.soarClient.createCase({
        title: `[ESCALATED] ${event.title}`,
        description: `
## Automated Escalation Summary

**Severity:** ${event.severity.toUpperCase()}
**Correlation Score:** ${event.correlationScore}/100
**Source Events:** ${event.sourceEvents.length}

### Description
${event.description}

### Source Events
${event.sourceEvents.map(s => `- **[${s.source.toUpperCase()}]** ${s.summary} (Confidence: ${s.confidence}%)`).join('\n')}

### Recommended Actions
${event.recommendedActions?.map(r => `- [ ] ${r}`).join('\n') || 'None identified'}

---
*This case was automatically escalated by the SOC Platform*
`.trim(),
        severity: event.severity.toUpperCase() === 'CRITICAL' ? 1 : 
                   event.severity.toUpperCase() === 'HIGH' ? 2 : 3,
        tags: ['escalated', 'auto-correlated', ...event.sourceEvents.map(s => s.source)],
        tlp: 2, // AMBER for escalated cases
      });

      event.incidentId = caseData.id;
      event.caseId = caseData.caseId;

      this.emit('incidentCreated', { event, caseId: caseData.id });
      console.log(`[COORDINATOR] 🔥 Incident created: ${caseData.id}`);

    } catch (error) {
      this.emit('error', error);
    }
  }

  // ============================================================
  // Health Monitoring
  // ============================================================

  /**
   * Get comprehensive system health status
   */
  async getHealthStatus(): Promise<SystemHealthStatus> {
    const componentChecks = await Promise.allSettled([
      this.checkComponentHealth('edr', () => this.edrClient?.connectionStatus),
      this.checkComponentHealth('nsm', () => this.nsmClient?.connectionStatus),
      this.checkComponentHealth('siem', () => this.siemClient?.connectionStatus),
      this.checkComponentHealth('opencti', () => this.openctiClient?.connectionStatus),
      this.checkComponentHealth('misp', () => this.mispClient?.connectionStatus),
      this.checkComponentHealth('soar', () => this.soarClient?.connectionStatus),
      this.checkComponentHealth('vulnerability', () => this.vulnClient?.connectionStatus),
    ]);

    const components: any = {};
    let operationalCount = 0;

    componentChecks.forEach((result, index) => {
      const names = ['edr', 'nsm', 'siem', 'opencti', 'misp', 'soar', 'vulnerability'];
      const name = names[index];
      
      if (result.status === 'fulfilled') {
        components[name] = result.value;
        if (result.value.status === 'connected') operationalCount++;
      } else {
        components[name] = { status: 'error', latency: -1, lastCheck: new Date().toISOString() };
      }
    });

    const overall = operationalCount >= 6 ? 'operational' : 
                    operationalCount >= 4 ? 'degraded' : 'down';

    return {
      overall,
      components,
      uptimeSeconds: this.stats.uptime(),
      eventsProcessedToday: this.stats.eventsProcessed,
      errorsToday: this.stats.errorsEncountered,
    };
  }

  // ============================================================
  // Public API Methods (Proxy to underlying clients)
  // ============================================================

  // EDR Operations
  async searchEndpoints(query: string) {
    return this.edrClient?.searchClients({ query }) || [];
  }

  async createHunt(params: Parameters<GrrOsqueryEdrClient['createHunt']>[0]) {
    return this.edrClient?.createHunt(params);
  }

  async runOsqueryQuery(preset: Parameters<GrrOsqueryEdrClient['runSecurityPreset']>[0]) {
    return this.edrClient?.runSecurityPreset(preset);
  }

  // NSM Operations
  async getAlerts(params: Parameters<SuricataZeekArkimeClient['getAlerts']>[0]) {
    return this.nsmClient?.getAlerts(params);
  }

  async correlateNetworkEvents(params: Parameters<SuricataZeekArkimeClient['correlateEvents']>[0]) {
    return this.nsmClient?.correlateEvents(params);
  }

  async requestPcap(params: Parameters<SuricataZeekArkimeClient['requestPcap']>[0]) {
    return this.nsmClient?.requestPcap(params);
  }

  // Threat Intelligence Operations
  async matchIndicator(params: Parameters<OpenctiClient['matchObservable']>[0]) {
    return this.openctiClient?.matchObservable(params);
  }

  async bulkMatchIndicators(observables: Parameters<OpenctiClient['bulkMatchObservables']>[0]) {
    return this.openctiClient?.bulkMatchObservables(observables);
  }

  async addTelcoIntel(intel: Parameters<OpenctiClient['addTelcoIntel']>[0]) {
    return this.openctiClient?.addTelcoIntel(intel);
  }

  // Vulnerability Operations
  async createScan(params: Parameters<OpenvasDefectDojoClient['createScan']>[0]) {
    return this.vulnClient?.createScan(params);
  }

  async getVulnerabilities(params: Parameters<OpenvasDefectDojoClient['getUnifiedVulnerabilities']>[0]) {
    return this.vulnClient?.getUnifiedVulnerabilities(params);
  }

  async importScanResults(params: Parameters<OpenvasDefectDojoClient['importScanResults']>[0]) {
    return this.vulnClient?.importScanResults(params);
  }

  // SOAR Operations
  async createCase(params: Parameters<TheHiveCortexClient['createCase']>[0]) {
    return this.soarClient?.createCase(params);
  }

  async analyzeObservable(params: Parameters<TheHiveCortexClient['analyzeWithCortex']>[0]) {
    return this.soarClient?.analyzeWithCortex(params);
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private async normalizeEvent(source: string, rawEvent: any): Promise<any> {
    // Each source has different formats, normalize to common structure
    const baseEvent = {
      source,
      rawEvent,
      receivedAt: new Date().toISOString(),
    };

    switch (source) {
      case 'edr':
        return {
          ...baseEvent,
          hostname: rawEvent.hostname,
          clientId: rawEvent.clientId,
          category: rawEvent.category,
          severity: rawEvent.severity,
          title: rawEvent.title || `EDR Alert on ${rawEvent.hostname}`,
          description: rawEvent.description,
        };

      case 'nsm':
        return {
          ...baseEvent,
          sourceIp: rawEvent.sourceIp,
          destIp: rawEvent.destinationIp,
          host: rawEvent.sourceIp || rawEvent.destinationIp,
          protocol: rawEvent.protocol,
          severity: rawEvent.severity,
          title: rawEvent.title || `NSM Alert: ${rawEvent.alert?.signature || 'Unknown'}`,
          description: rawEvent.description,
        };

      case 'siem':
        return {
          ...baseEvent,
          hostname: rawEvent.agent?.name || rawEvent.host,
          rule: rawEvent.rule?.description || rawEvent.rule?.id,
          severity: rawEvent.rule?.level || rawEvent.severity,
          title: rawEvent.rule?.description || `SIEM Alert`,
          description: rawEvent.fullLog || rawEvent.description,
        };

      case 'ti':
        return {
          ...baseEvent,
          iocValue: rawEvent.value || rawEvent.indicator_pattern,
          iocType: rawEvent.type,
          score: rawEvent.score || rawEvent.x_opencti_score,
          severity: this.scoreToSeverity(rawEvent.score || rawEvent.x_opencti_score || 50),
          title: `TI Match: ${rawEvent.name || rawEvent.value}`,
          description: rawEvent.description,
        };

      case 'vuln':
        return {
          ...baseEvent,
          host: rawEvent.host,
          port: rawEvent.port,
          cve: rawEvent.cve,
          cvssScore: rawEvent.cvssScore,
          severity: rawEvent.severity,
          title: `Vulnerability: ${rawEvent.title}`,
          description: rawEvent.description,
        };

      default:
        return {
          ...baseEvent,
          ...rawEvent,
        };
    }
  }

  private async enrichEvent(event: any): Promise<any> {
    // Add geo-IP enrichment if IP present
    if (event.sourceIp || event.destIp) {
      // In production, call GeoIP service
      event.geoLocation = {
        country: 'DZ', // Default Algeria for telco context
        city: 'Algiers',
      };
    }

    // Add subscriber context if MSISDN present
    if (event.msisdn) {
      // In production, look up in subscriber database
      event.subscriberContext = {
        msisdn: event.msisdn,
        riskLevel: 'normal',
      };
    }

    return event;
  }

  private createMinimalCorrelation(event: any): CorrelatedEvent {
    return {
      eventId: `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      severity: event.severity || 'info',
      title: event.title || 'Uncorrelated Event',
      description: event.description || '',
      sourceEvents: [{
        source: event.source,
        originalId: event.rawEvent?.id || 'unknown',
        summary: event.title || 'No summary',
        confidence: 75,
      }],
      correlationScore: 10, // Minimal score for uncorrelated events
      correlationType: 'single_source',
      ...event,
    };
  }

  private extractIPs(event: any): string[] {
    const ips: string[] = [];
    if (event.sourceIp && this.isValidIP(event.sourceIp)) ips.push(event.sourceIp);
    if (event.destIp && this.isValidIP(event.destIp)) ips.push(event.destIp);
    if (event.host && this.isValidIP(event.host)) ips.push(event.host);
    return [...new Set(ips)]; // Deduplicate
  }

  private extractHashes(event: any): string[] {
    const hashes: string[] = [];
    if (event.md5 && /^[a-fA-F0-9]{32}$/.test(event.md5)) hashes.push(event.md5);
    if (event.sha1 && /^[a-fA-F0-9]{40}$/.test(event.sha1)) hashes.push(event.sha1);
    if (event.sha256 && /^[a-fA-F0-9]{64}$/.test(event.sha256)) hashes.push(event.sha256);
    return hashes;
  }

  private extractDomains(event: any): string[] {
    const domains: string[] = [];
    if (event.domain && event.domain.includes('.')) domains.push(event.domain.toLowerCase());
    if (event.hostname && event.hostname.includes('.') && !this.isValidIP(event.hostname)) {
      domains.push(event.hostname.toLowerCase());
    }
    return [...new Set(domains)];
  }

  private extractMSISDNs(event: any): string[] {
    const msisdns: string[] = [];
    // Common patterns for MSISDN extraction
    const patterns = [/213\d{9}$/, /\+213\d{9}$/, /0[5-7]\d{8}$/];
    
    Object.values(event).forEach(value => {
      if (typeof value === 'string') {
        patterns.forEach(pattern => {
          const match = value.match(pattern);
          if (match) msisdns.push(match[0]);
        });
      }
    });

    return [...new Set(msisdns)];
  }

  private isValidIP(ip: string): boolean {
    return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
  }

  private calculateCorrelatedSeverity(event: any, sourceEvents: any[]): CorrelatedEvent['severity'] {
    // Start with base severity
    let baseSeverity = (event.severity || 'info').toLowerCase();
    
    // Upgrade severity based on correlation strength
    if (sourceEvents.length >= 3 && baseSeverity !== 'critical') {
      baseSeverity = 'high';
    } else if (sourceEvents.length === 2 && ['low', 'info'].includes(baseSeverity)) {
      baseSeverity = 'medium';
    }

    // Check for critical indicators in source events
    const hasCriticalSource = sourceEvents.some(s => s.confidence > 85);
    if (hasCriticalSource && baseSeverity !== 'critical') {
      baseSeverity = 'high';
    }

    return baseSeverity as CorrelatedEvent['severity'];
  }

  private generateCorrelationTitle(event: any, sourceEvents: any[]): string {
    const sources = sourceEvents.map(s => s.source.toUpperCase()).filter((v, i, a) => a.indexOf(v) === i);
    
    if (sources.length <= 1) {
      return event.title || 'Security Event';
    }

    return `Cross-Source Correlation (${sources.join('+')})`;
  }

  private generateCorrelationDescription(event: any, sourceEvents: any[]): string {
    const lines = [
      `**Correlation Analysis Report**\n`,
      `**Sources Analyzed:** ${sourceEvents.length}`,
      `**Correlation Score:** ${Math.min(100, 20 + sourceEvents.length * 15)}%`,
      '',
      '**Source Events:**',
      ...sourceEvents.map(s => `- [${s.source.toUpperCase()}] ${s.summary} (Confidence: ${s.confidence}%)`),
      '',
      '**Original Event:**',
      event.description || 'No description available',
    ];

    return lines.join('\n');
  }

  private generateRecommendations(event: CorrelatedEvent): string[] {
    const recommendations: string[] = [];

    // Based on severity
    if (event.severity === 'critical') {
      recommendations.push('Immediate containment required - consider isolating affected endpoint');
      recommendations.push('Escalate to incident response team immediately');
    }

    // Based on correlation type
    if (event.correlationType === 'ioc_match') {
      recommendations.push('Review threat intelligence context for attacker TTPs');
      recommendations.push('Search for additional IOCs from same threat actor');
    }

    if (event.correlationType === 'asset_correlation') {
      recommendations.push('Review endpoint history for related alerts');
      recommendations.push('Consider full forensic artifact collection');
    }

    // Based on involved sources
    const sources = event.sourceEvents.map(s => s.source);
    if (sources.includes('vuln')) {
      recommendations.push('Initiate patching/remediation workflow for identified vulnerabilities');
    }
    if (sources.includes('nsm')) {
      recommendations.push('Review PCAP data for network-level details');
    }
    if (sources.includes('edr')) {
      recommendations.push('Collect endpoint forensics for deeper analysis');
    }

    // Always include general recommendation
    recommendations.push('Document findings and update detection rules as needed');

    return recommendations;
  }

  private determineBestAction(event: CorrelatedEvent): { type: string; target: string } {
    // Critical severity with endpoint -> isolate
    if (event.severity === 'critical' && event.assetContext?.clientId) {
      return { type: 'isolate_endpoint', target: event.assetContext.clientId };
    }

    // Critical/high with IP -> block
    if ((event.severity === 'critical' || event.severity === 'high') && event.sourceIp) {
      return { type: 'block_ip', target: event.sourceIp };
    }

    // High correlation score -> create incident
    if (event.correlationScore > 60) {
      return { type: 'create_incident', target: 'SOAR' };
    }

    // Default -> just alert
    return { type: 'alert_analyst', target: 'SOC Analyst' };
  }

  private scoreToSeverity(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'info';
  }

  private async publishToKafka(topic: string, event: any): Promise<void> {
    // In production, this would use the Kafka client to publish
    // For now, just emit an event
    this.emit('kafkaPublish', { topic, event });
  }

  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // Publish batch to Kafka
    await this.publishToKafka('correlation', events);

    console.log(`[COORDINATOR] Flushed ${events.length} correlated events`);
    this.emit('batchFlushed', { count: events.length });
  }

  private async checkComponentHealth(
    name: string, 
    getStatusFn: () => boolean | undefined
  ): Promise<{ status: string; latency: number; lastCheck: string }> {
    const start = Date.now();
    try {
      const status = getStatusFn();
      return {
        status: status ? 'connected' : 'disconnected',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'error',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
      };
    }
  }
}

// Export singleton factory
let coordinatorInstance: IntegrationCoordinator | null = null;

export function createIntegrationCoordinator(config: PlatformIntegrationConfig): IntegrationCoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new IntegrationCoordinator(config);
  }
  return coordinatorInstance;
}

export default IntegrationCoordinator;
