/**
 * GRR Rapid Response & Osquery EDR Integration Client
 * Phase 11: Enterprise Endpoint Detection & Response
 * 
 * Features:
 * - GRR API v3 integration for remote live forensics
 * - Osquery Fleet management for endpoint visibility
 * - Real-time endpoint telemetry streaming
 * - Hunt management and artifact collection
 * - Telecom-specific endpoint correlation (workstations, servers, network devices)
 * - Automated response actions (isolate, file fetch, process kill)
 * 
 * Scale Targets:
 * - 50,000+ endpoints monitored
 * - 100,000+ queries/day
 * - <5s detection-to-response time
 * 
 * @version 1.0.0
 * @license Proprietary - Djezzy National SOC Platform
 */

import { EventEmitter } from 'events';

// ============================================================
// Types & Interfaces
// ============================================================

export interface GrrConfig {
  apiUrl: string;
  username: string;
  password: string;
  insecure?: boolean; // Allow self-signed certs (dev only)
  timeout?: number;   // Request timeout in ms (default: 60000 for GRR)
}

export interface OsqueryConfig {
  fleetApiUrl: string;
  enrollmentSecret: string;
  apiKey?: string;
  timeout?: number;
}

export interface EdrIntegrationConfig {
  grr: GrrConfig;
  osquery: OsqueryConfig;
  kafka?: {
    brokers: string[];
    topic: string; // e.g., "edr.telemetry"
  };
  enableAutoResponse?: boolean; // Enable automated containment actions
  maxConcurrentHunts?: number;  // Max parallel GRR hunts (default: 10)
}

// GRR Models
export interface GrrClient {
  clientId: string;
  hostname: string;
  os: string;
  osVersion: string;
  ipAddress: string[];
  macAddress?: string[];
  lastSeenAt: string;
  firstSeenAt: string;
  labels: string[];
  installTime: string;
  clientVersion: string;
  ping: number;
  // Telco-specific fields
  assetTag?: string;
  department?: string;
  location?: string;
  owner?: string;
  riskScore?: number; // 0-100 based on endpoint risk
}

export interface GrrHunt {
  huntId: string;
  name: string;
  description: string;
  status: 'STARTED' | 'PAUSED' | 'STOPPED' | 'COMPLETED' | 'ERROR';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  clientLimit?: { count: number }; // Limit to N clients
  clientRate?: number; // Clients per second
  totalClients?: number;
  completedClients?: number;
  resultsCount?: number;
  // Hunt rules
  rules?: Array<{
    ruleType: string;
    match?: Record<string, any>;
  }>;
  // Artifact names to collect
  artifactNames?: string[];
  // Telco-specific
  priority?: 'critical' | 'high' | 'medium' | 'low';
  incidentId?: string; // Link to SOC incident
}

export interface GrrFlow {
  flowId: string;
  clientId: string;
  huntId?: string;
  flowType: string;
  status: 'RUNNING' | 'TERMINATED' | 'ERROR' | 'CLIENT_ERROR';
  createdAt: string;
  startedAt?: string;
  creator: string;
  args?: Record<string, any>;
  resultsCount?: number;
  results?: Array<Record<string, any>>;
}

export interface GrrArtifact {
  name: string;
  documentation?: string;
  supportedOs?: string[]; // ['Linux', 'Windows', 'Darwin']
  sources?: Array<{
    type: string;
    attributes?: Array<{ name: string; value: any }>;
    conditions?: Array<{ attribute: string; operator: string; value: any }>;
    pathSeparator?: string;
    paths?: string[];
    query?: string; // For OSQuery artifacts
    key?: string;
    nestedArtifact?: string;
  }>;
  // Custom artifacts for telecom
  isCustom?: boolean;
  category?: 'Forensic' | 'Telemetry' | 'Custom' | 'Telco';
}

// Osquery Models
export interface OsqueryNode {
  nodeKey: string;
  hostname: string;
  uuid: string;
  platform: string; // darwin, windows, linux
  osVersion: string;
  osBuild?: string;
  cpuType?: string;
  cpuBrand?: string;
  physicalMemory?: number; // bytes
  hardwareSerial?: string;
  hostnameOverride?: string;
  ipAddress?: string;
  primaryMac?: string;
  lastSeenAt: string;
  label: string; // e.g., "Production", "Development"
  user_email?: string;
  detailInterval?: number; // seconds between detailed queries
  activeInterval?: number; // seconds between active queries
  // Telco-specific
  environment?: 'production' | 'staging' | 'development' | 'dmz';
  criticality?: 'critical' | 'high' | 'medium' | 'low';
  businessUnit?: string;
}

export interface OsqueryDistributedQuery {
  id: string;
  name: string;
  query: string;
  createdAt: string;
  creator: string;
  status: 'pending' | 'running' | 'completed' | 'expired';
  // Results summary
  totalTargets?: number;
  completedTargets?: number;
  // SQL query details
  sql: string;
  // Telco context
  category?: 'inventory' | 'security' | 'compliance' | 'troubleshooting';
  scheduled?: boolean;
  interval?: number; // seconds for scheduled queries
}

export interface OsqueryQueryResult {
  nodeKey: string;
  hostname: string;
  columns: Record<string, any>;
  timestamp: number;
}

export interface OsqueryLog {
  timestamp: string;
  severity: number; // 0=info, 1=warning, 2=error
  message: string;
  line?: string;
  file?: string;
  version?: string;
  nodeName?: string;
  hostIdentifier?: string;
}

// EDR Alert Models
export interface EdrAlert {
  alertId: string;
  source: 'grr' | 'osquery' | 'hybrid';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  clientId?: string;
  nodeId?: string;
  hostname: string;
  category: string; // malware, persistence, data_exposure, reconnaissance, etc.
  iocMatch?: string; // Matched IOC if applicable
  timestamp: string;
  // Enrichment
  endpointContext?: Partial<GrrClient | OsqueryNode>;
  artifacts?: Array<{ name: string; url: string }>;
  // Response actions taken
  autoResponse?: {
    action: string;
    executedAt: string;
    result: 'success' | 'failed' | 'partial';
  }[];
  // Incident linkage
  incidentId?: string;
  caseId?: string;
}

// Hunt Result with Telco Context
export interface TelcoHuntResult {
  huntId: string;
  clientId: string;
  hostname: string;
  department?: string;
  location?: string;
  findings: Array<{
    type: 'file' | 'registry' | 'process' | 'network' | 'artifact';
    data: Record<string, any>;
    riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'info';
    iocIndicators?: string[];
  }>;
  collectedAt: string;
  analystNotes?: string;
}

// ============================================================
// EDR Client Class
// ============================================================

export class GrrOsqueryEdrClient extends EventEmitter {
  private config: EdrIntegrationConfig;
  private grrAuthToken?: string;
  private osqueryAuthToken?: string;
  private isConnected: boolean = false;
  private hunts: Map<string, GrrHunt> = new Map();
  private activeFlows: Map<string, GrrFlow> = new Map();
  
  // Statistics
  public stats = {
    endpointsMonitored: 0,
    activeHunts: 0,
    totalHuntsCompleted: 0,
    alertsGenerated: 0,
    artifactsCollected: 0,
    averageResponseTimeMs: 0,
    lastSyncAt: null as Date | null,
  };

  constructor(config: EdrIntegrationConfig) {
    super();
    this.config = config;
    
    // Set up internal event handlers
    this.on('error', (err) => {
      console.error('[EDR] Error:', err.message);
    });
    
    this.on('alert', (alert: EdrAlert) => {
      this.stats.alertsGenerated++;
      console.log(`[EDR] Alert (${alert.severity}): ${alert.title} on ${alert.hostname}`);
    });
  }

  // ============================================================
  // Connection Management
  // ============================================================

  /**
   * Initialize connections to both GRR and Osquery Fleet
   */
  async connect(): Promise<void> {
    try {
      console.log('[EDR] Connecting to GRR at', this.config.grr.apiUrl);
      
      // Authenticate with GRR
      const grrAuthResponse = await this.fetchGrr('/config', {
        method: 'GET',
      });
      
      if (grrAuthResponse.ok) {
        this.isConnected = true;
        console.log('[EDR] GRR authentication successful');
        
        // Get initial stats
        await this.refreshStats();
      } else {
        throw new Error(`GRR auth failed: ${grrAuthResponse.status}`);
      }

      // Test Osquery Fleet connection
      if (this.config.osquery.fleetApiUrl) {
        console.log('[EDR] Testing Osquery Fleet connection...');
        const fleetTest = await this.fetchFleet('/api/v1/version');
        if (fleetTest.ok) {
          console.log('[EDR] Osquery Fleet connected successfully');
        } else {
          console.warn('[EDR] Osquery Fleet connection failed, continuing with GRR only');
        }
      }

      this.emit('connected', { 
        grr: true, 
        osquery: !!this.config.osquery.fleetApiUrl,
        timestamp: new Date()
      });
      
    } catch (error) {
      this.isConnected = false;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from all services
   */
  async disconnect(): Promise<void> {
    this.grrAuthToken = undefined;
    this.osqueryAuthToken = undefined;
    this.isConnected = false;
    this.hunts.clear();
    this.activeFlows.clear();
    
    this.emit('disconnected', { timestamp: new Date() });
    console.log('[EDR] Disconnected from all services');
  }

  get connectionStatus(): boolean {
    return this.isConnected;
  }

  // ============================================================
  // GRR Client Management
  // ============================================================

  /**
   * Search for GRR clients with filtering options
   * Telco-specific: search by department, location, OS, labels
   */
  async searchClients(params: {
    query?: string;       // Search in hostname, IP, username
    limit?: number;       // Max results (default: 100)
    offset?: number;      // Pagination offset
    os?: string;          // Filter by OS (Linux, Windows, Darwin)
    labels?: string[];    // Filter by labels
    onlineThreshold?: number; // Seconds since last ping (default: 3600)
    sortBy?: 'last_seen' | 'first_seen' | 'hostname';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ clients: GrrClient[]; total: number }> {
    const {
      query,
      limit = 100,
      offset = 0,
      os,
      labels,
      onlineThreshold = 3600,
      sortBy = 'last_seen',
      sortOrder = 'desc'
    } = params;

    try {
      const searchParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(query && { query }),
        ...(os && { os }),
        ...(onlineThreshold && { online_threshold: onlineThreshold.toString() }),
      });

      const response = await this.fetchGrr(`/clients?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`GRR client search failed: ${response.status}`);
      }

      const data = await response.json();
      const clients: GrrClient[] = (data.clients || []).map(this.transformGrrClient);
      
      // Apply label filtering locally if needed
      let filteredClients = clients;
      if (labels && labels.length > 0) {
        filteredClients = clients.filter(client =>
          labels.some(label => client.labels.includes(label))
        );
      }

      return {
        clients: filteredClients,
        total: data.total_count || filteredClients.length
      };

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get single client details with full context
   */
  async getClient(clientId: string): Promise<GrrClient> {
    const response = await this.fetchGrr(`/clients/${clientId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get client ${clientId}: ${response.status}`);
    }

    const data = await response.json();
    return this.transformGrrClient(data);
  }

  /**
   * Get client statistics for dashboard
   */
  async getClientStats(): Promise<{
    total: number;
    online: number;
    offline: number;
    byOs: Record<string, number>;
    byDepartment: Record<string, number>;
    byRiskLevel: Record<string, number>;
    avgPing: number;
  }> {
    // In production, this would aggregate from GRR's /clients/stats endpoint
    // For now, return mock stats that would come from GRR
    return {
      total: this.stats.endpointsMonitored || 48723,
      online: Math.floor((this.stats.endpointsMonitored || 48723) * 0.87),
      offline: Math.floor((this.stats.endpointsMonitored || 48723) * 0.13),
      byOs: {
        'Linux': 28456,
        'Windows': 15234,
        'macOS': 5033,
      },
      byDepartment: {
        'NOC': 1234,
        'IT Operations': 3456,
        'Development': 5678,
        'Corporate': 8901,
        'Field Operations': 23456,
        'Data Center': 6998,
      },
      byRiskLevel: {
        'critical': 12,
        'high': 234,
        'medium': 4567,
        'low': 43910,
      },
      avgPing: 245, // ms
    };
  }

  // ============================================================
  // GRR Hunt Management
  // ============================================================

  /**
   * Create a new GRR hunt for forensic artifact collection
   * Telco-specific: supports department/location targeting
   */
  async createHunt(params: {
    name: string;
    description: string;
    artifactNames: string[];     // Artifacts to collect
    huntRunnerArgs?: Record<string, any>; // Additional runner arguments
    clientLimit?: number;       // Max clients to target
    clientRate?: number;        // Clients per second
    priority?: 'critical' | 'high' | 'medium' | 'low';
    incidentId?: string;        // Link to SOC incident
    targetLabels?: string[];    // Target specific client labels
    excludeLabels?: string[];   // Exclude certain clients
  }): Promise<GrrHunt> {
    const {
      name,
      description,
      artifactNames,
      huntRunnerArgs = {},
      clientLimit,
      clientRate = 50,
      priority = 'medium',
      incidentId,
      targetLabels,
      excludeLabels,
    } = params;

    try {
      const huntPayload = {
        hunt_name: name,
        hunt_description: description,
        runner_args: {
          ...huntRunnerArgs,
          ...(clientLimit && { client_limit: { count: clientLimit } }),
          client_rate: clientRate,
        },
        // Use FlowArgs for artifact collection
        flow_args: {
          artifact_list: artifactNames,
        },
        // Telco-specific metadata
        start_hunt: true,
      };

      const response = await this.fetchGrr('/hunts', {
        method: 'POST',
        body: JSON.stringify(huntPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create hunt: ${response.status} - ${errorText}`);
      }

      const huntData = await response.json();
      const hunt: GrrHunt = {
        huntId: huntData.hunt_id || huntData.hunt?.huntId,
        name,
        description,
        status: 'STARTED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'soc-platform',
        clientLimit: clientLimit ? { count: clientLimit } : undefined,
        clientRate,
        artifactNames,
        priority,
        incidentId,
      };

      this.hunts.set(hunt.huntId, hunt);
      this.stats.activeHunts++;

      this.emit('huntCreated', hunt);
      console.log(`[EDR] Hunt created: ${name} (${hunt.huntId})`);

      return hunt;

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get all hunts with optional filtering
   */
  async getHunts(params: {
    status?: GrrHunt['status'];
    limit?: number;
    offset?: number;
  } = {}): Promise<GrrHunt[]> {
    const { status, limit = 50, offset = 0 } = params;

    try {
      const response = await this.fetchGrr(
        `/hunts?limit=${limit}&offset=${offset}${status ? `&status=${status}` : ''}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get hunts: ${response.status}`);
      }

      const data = await response.json();
      return (data.hunts || []).map((h: any) => ({
        huntId: h.hunt_id,
        name: h.hunt_name || h.name,
        description: h.hunt_description || h.description,
        status: h.status || 'UNKNOWN',
        createdAt: h.create_time || h.createdAt,
        updatedAt: h.last_status_time || h.updatedAt,
        createdBy: h.creator || h.createdBy,
        totalClients: h.total_clients || h.totalClients,
        completedClients: h.completed_clients || h.completedClients,
        resultsCount: h.results_count || h.resultsCount,
        ...h,
      }));

    } catch (error) {
      this.emit('error', error);
      // Return cached hunts if API fails
      return Array.from(this.hunts.values());
    }
  }

  /**
   * Pause an active hunt
   */
  async pauseHunt(huntId: string): Promise<void> {
    const response = await this.fetchGrr(`/hunts/${huntId}/pause`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to pause hunt ${huntId}: ${response.status}`);
    }

    const hunt = this.hunts.get(huntId);
    if (hunt) {
      hunt.status = 'PAUSED';
      hunt.updatedAt = new Date().toISOString();
    }

    this.emit('huntUpdated', { huntId, status: 'PAUSED' });
  }

  /**
   * Resume a paused hunt
   */
  async resumeHunt(huntId: string): Promise<void> {
    const response = await this.fetchGrr(`/hunts/${huntId}/resume`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to resume hunt ${huntId}: ${response.status}`);
    }

    const hunt = this.hunts.get(huntId);
    if (hunt) {
      hunt.status = 'STARTED';
      hunt.updatedAt = new Date().toISOString();
    }

    this.emit('huntUpdated', { huntId, status: 'STARTED' });
  }

  /**
   * Stop/cancel a hunt
   */
  async stopHunt(huntId: string): Promise<void> {
    const response = await this.fetchGRR(`/hunts/${huntId}/stop`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to stop hunt ${huntId}: ${response.status}`);
    }

    const hunt = this.hunts.get(huntId);
    if (hunt) {
      hunt.status = 'STOPPED';
      hunt.updatedAt = new Date().toISOString();
      this.stats.activeHunts--;
      this.stats.totalHuntsCompleted++;
    }

    this.emit('huntStopped', huntId);
  }

  /**
   * Get hunt results with analysis
   * Returns structured findings with risk assessment
   */
  async getHuntResults(
    huntId: string,
    params: {
      limit?: number;
      offset?: number;
      includeArtifacts?: boolean;
      riskFilter?: ('critical' | 'high' | 'medium' | 'low')[];
    } = {}
  ): Promise<TelcoHuntResult[]> {
    const { limit = 100, offset = 0, includeArtifacts = true, riskFilter } = params;

    try {
      const response = await this.fetchGrr(
        `/hunts/${huntId}/results?limit=${limit}&offset=${offset}&include_artifacts=${includeArtifacts}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get hunt results: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform raw results into structured TelcoHuntResults
      const results: TelcoHuntResult[] = (data.results || []).map((r: any) => ({
        huntId,
        clientId: r.client_id,
        hostname: r.hostname || 'Unknown',
        department: r.labels?.find((l: string) => 
          ['NOC', 'IT Operations', 'Development', 'Corporate'].includes(l)
        ),
        findings: this.analyzeHuntFindings(r.payload || r),
        collectedAt: r.timestamp || new Date().toISOString(),
      }));

      // Apply risk filter if specified
      let filteredResults = results;
      if (riskFilter && riskFilter.length > 0) {
        filteredResults = results.filter(r =>
          r.findings.some(f => riskFilter.includes(f.riskLevel))
        );
      }

      return filteredResults;

    } catch (error) {
      this.emit('error', error);
      return [];
    }
  }

  // ============================================================
  // GRR Flow Management (Single Client Actions)
  // ============================================================

  /**
   * Start a flow on a single client
   * Common flows: FileFinder, ListDirectory, FetchFile, ExecuteCommand
   */
  async startFlow(clientId: string, params: {
    flowType: string;
    args?: Record<string, any>;
  }): Promise<GrrFlow> {
    const { flowType, args = {} } = params;

    try {
      const response = await this.fetchGrr(`/clients/${clientId}/flows`, {
        method: 'POST',
        body: JSON.stringify({
          flow: { name: flowType, args },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start flow on ${clientId}: ${response.status}`);
      }

      const data = await response.json();
      const flow: GrrFlow = {
        flowId: data.flow_id || data.context?.flow_id,
        clientId,
        flowType,
        status: 'RUNNING',
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        creator: 'soc-platform',
        args,
      };

      this.activeFlows.set(flow.flowId, flow);

      this.emit('flowStarted', flow);
      return flow;

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get flow status and results
   */
  async getFlow(clientId: string, flowId: string): Promise<GrrFlow> {
    const response = await this.fetchGrr(`/clients/${clientId}/flows/${flowId}`);

    if (!response.ok) {
      throw new Error(`Failed to get flow ${flowId}: ${response.status}`);
    }

    const data = await response.json();
    const existingFlow = this.activeFlows.get(flowId) || {};

    return {
      flowId,
      clientId,
      flowType: data.flow?.name || existingFlow.flowType,
      status: data.context?.state || 'UNKNOWN',
      createdAt: data.context?.create_time || existingFlow.createdAt,
      startedAt: data.context?.started_at || existingFlow.startedAt,
      creator: data.context?.creator || existingFlow.creator,
      resultsCount: data.context?.results_count || 0,
      results: data.results || [],
      ...existingFlow,
    };
  }

  /**
   * Collect common forensic artifacts from an endpoint
   * Convenience wrapper around startFlow
   */
  async collectForensics(clientId: string, artifactTypes: Array<
    'recent_files' | 'running_processes' | 'network_connections' | 
    'user_accounts' | 'scheduled_tasks' | 'startup_items' | 'browser_history'
  > = ['running_processes', 'network_connections']): Promise<GrrFlow> {
    
    // Map artifact types to GRR flow names
    const artifactMap: Record<string, string> = {
      recent_files: 'RecentFilesFinder',
      running_processes: 'ProcessListing',
      network_connections: 'NetstatAction',
      user_accounts: 'UserList',
      scheduled_tasks: 'WindowsSchedulerEnumeration',
      startup_items: 'StartupItemsEnumerator',
      browser_history: 'ChromeHistory',
    };

    const flowNames = artifactTypes.map(t => artifactMap[t]).filter(Boolean);
    
    return this.startFlow(clientId, {
      flowType: 'ArtifactCollectorFlow',
      args: { artifact_list: flowNames },
    });
  }

  // ============================================================
  // Osquery Fleet Management
  // ============================================================

  /**
   * Get all enrolled Osquery nodes
   */
  async getNodes(params: {
    status?: 'online' | 'offline' | 'all';
    platform?: string;
    label?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<OsqueryNode[]> {
    const { status = 'all', platform, label, limit = 100, offset = 0 } = params;

    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(status !== 'all' && { status }),
        ...(platform && { platform }),
        ...(label && { label }),
      });

      const response = await this.fetchFleet(`/api/v1/nodes?${queryParams}`);

      if (!response.ok) {
        throw new Error(`Failed to get nodes: ${response.status}`);
      }

      const data = await response.json();
      return (data.nodes || []).map(this.transformOsqueryNode);

    } catch (error) {
      this.emit('error', error);
      return [];
    }
  }

  /**
   * Execute distributed query across nodes
   * Core Osquery functionality for real-time visibility
   */
  async executeDistributedQuery(params: {
    query: string;           // SQL query
    name: string;            // Query name for tracking
    targets?: {              // Target specific nodes
      nodeKeys?: string[];
      labels?: string[];
    };
    timeout?: number;        // Query timeout in seconds (default: 60)
    category?: 'inventory' | 'security' | 'compliance' | 'troubleshooting';
  }): Promise<OsqueryDistributedQuery> {
    const {
      query,
      name,
      targets = {},
      timeout = 60,
      category = 'security',
    } = params;

    try {
      const payload = {
        query,
        name,
        ...(targets.nodeKeys && { selected: targets.nodeKeys }),
        ...(targets.labels && { selected_labels: targets.labels }),
      };

      const response = await this.fetchFleet('/api/v1/distributed/queries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Distributed query failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const distributedQuery: OsqueryDistributedQuery = {
        id: data.distributed_query_id || data.id,
        name,
        query: data.query || query,
        createdAt: new Date().toISOString(),
        creator: 'soc-platform',
        status: 'running',
        sql: query,
        category,
      };

      this.emit('distributedQueryStarted', distributedQuery);
      console.log(`[EDR] Distributed query "${name}" started targeting ${data.count || 'all'} nodes`);

      return distributedQuery;

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get distributed query results
   */
  async getQueryResults(queryId: string): Promise<{
    results: OsqueryQueryResult[];
    total: number;
    completed: number;
    errors: number;
  }> {
    try {
      const response = await this.fetchFleet(`/api/v1/distributed/queries/${queryId}/results`);

      if (!response.ok) {
        throw new Error(`Failed to get query results: ${response.status}`);
      }

      const data = await response.json();

      return {
        results: (data.results || []).map((r: any) => ({
          nodeKey: r.node_key,
          hostname: r.host_display_name || r.hostname,
          columns: r.columns || {},
          timestamp: r.timestamp,
        })),
        total: data.count || 0,
        completed: data.completed || 0,
        errors: data.errors || 0,
      };

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Pre-built security queries for common use cases
   * Telco-specific: includes telecom threat detection queries
   */
  async runSecurityPreset(preset: keyof typeof SecurityPresets, targets?: {
    nodeKeys?: string[];
    labels?: string[];
  }): Promise<OsqueryDistributedQuery> {
    const presetConfig = SecurityPresets[preset];
    if (!presetConfig) {
      throw new Error(`Unknown security preset: ${preset}`);
    }

    return this.executeDistributedQuery({
      query: presetConfig.query,
      name: presetConfig.name,
      category: presetConfig.category,
      targets,
    });
  }

  // ============================================================
  // Automated Response Actions
  // ============================================================

  /**
   * Isolate an endpoint from the network
   * CRITICAL ACTION: Requires elevated permissions
   */
  async isolateEndpoint(clientId: string, reason: string, requestedBy: string): Promise<{
    success: boolean;
    actionId: string;
    isolationStatus: 'isolating' | 'isolated' | 'failed';
  }> {
    if (!this.config.enableAutoResponse) {
      console.warn('[EDR] Auto-response disabled, skipping isolation');
      return { success: false, actionId: '', isolationStatus: 'failed' };
    }

    try {
      // Log the isolation request
      this.emit('actionInitiated', {
        type: 'isolation',
        clientId,
        reason,
        requestedBy,
        timestamp: new Date(),
      });

      // Execute GRR network isolation flow
      const flow = await this.startFlow(clientId, {
        flowType: 'NetworkIsolation',
        args: { reason, requested_by: requestedBy },
      });

      // Create audit record
      this.emit('alert', {
        alertId: `iso-${Date.now()}`,
        source: 'grr',
        severity: 'critical',
        title: `Endpoint Isolated: ${clientId}`,
        description: `Endpoint isolated due to: ${reason}`,
        clientId,
        hostname: '',
        category: 'containment',
        timestamp: new Date().toISOString(),
        autoResponse: [{
          action: 'isolate',
          executedAt: new Date().toISOString(),
          result: 'success',
        }],
      } as EdrAlert);

      return {
        success: true,
        actionId: flow.flowId,
        isolationStatus: 'isolating',
      };

    } catch (error) {
      this.emit('error', error);
      return { success: false, actionId: '', isolationStatus: 'failed' };
    }
  }

  /**
   * Kill a malicious process on an endpoint
   */
  async killProcess(clientId: string, pid: number, reason: string): Promise<{
    success: boolean;
    flowId: string;
  }> {
    if (!this.config.enableAutoResponse) {
      return { success: false, flowId: '' };
    }

    try {
      const flow = await this.startFlow(clientId, {
        flowType: 'KillProcess',
        args: { pid, reason },
      });

      this.emit('actionExecuted', {
        type: 'kill_process',
        clientId,
        pid,
        reason,
        flowId: flow.flowId,
      });

      return { success: true, flowId: flow.flowId };

    } catch (error) {
      this.emit('error', error);
      return { success: false, flowId: '' };
    }
  }

  /**
   * Fetch suspicious file from endpoint for analysis
   */
  async fetchFileForAnalysis(clientId: string, filePath: string): Promise<{
    success: boolean;
    flowId: string;
    downloadUrl?: string;
  }> {
    try {
      const flow = await this.startFlow(clientId, {
        flowType: 'FetchFile',
        args: { path: filePath, max_file_size: 100 * 1024 * 1024 }, // 100MB max
      });

      this.stats.artifactsCollected++;

      // Poll for completion and get download URL
      // In production, this would be async with callback/webhook
      return {
        success: true,
        flowId: flow.flowId,
        downloadUrl: `/api/v1/edr/files/${flow.flowId}`,
      };

    } catch (error) {
      this.emit('error', error);
      return { success: false, flowId: '' };
    }
  }

  // ============================================================
  // Artifact Management
  // ============================================================

  /**
   * Get available GRR artifacts
   */
  async getArtifacts(params: {
    filter?: 'custom' | 'builtin' | 'telco';
    category?: string;
  } = {}): Promise<GrrArtifact[]> {
    const { filter, category } = params;

    try {
      const response = await this.fetchGrr('/artifacts');

      if (!response.ok) {
        throw new Error(`Failed to get artifacts: ${response.status}`);
      }

      const data = await response.json();
      let artifacts: GrrArtifact[] = (data.artifacts || []).map((a: any) => ({
        name: a.name,
        documentation: a.documentation,
        supportedOs: a.supported_os,
        sources: a.sources,
        isCustom: a.is_custom || false,
        category: a.category || 'Forensic',
      }));

      // Apply filters
      if (filter === 'custom') {
        artifacts = artifacts.filter(a => a.isCustom);
      } else if (filter === 'builtin') {
        artifacts = artifacts.filter(a => !a.isCustom);
      } else if (filter === 'telco') {
        artifacts = artifacts.filter(a => a.category === 'Telco');
      }

      if (category) {
        artifacts = artifacts.filter(a => a.category === category);
      }

      return artifacts;

    } catch (error) {
      this.emit('error', error);
      // Return built-in telco artifacts as fallback
      return this.getBuiltinTelcoArtifacts();
    }
  }

  /**
   * Create custom artifact for telecom-specific collection
   */
  async createCustomArtifact(artifact: Omit<GrrArtifact, 'isCustom'>): Promise<GrrArtifact> {
    try {
      const payload = {
        ...artifact,
        isCustom: true,
        category: artifact.category || 'Telco',
      };

      const response = await this.fetchGrr('/artifacts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create artifact: ${response.status}`);
      }

      const created = await response.json();
      this.emit('artifactCreated', created);
      
      return {
        ...artifact,
        isCustom: true,
      };

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // ============================================================
  // Statistics & Health
  // ============================================================

  /**
   * Refresh EDR statistics from both systems
   */
  async refreshStats(): Promise<void> {
    try {
      // Get GRR client count
      const grrStats = await this.getClientStats();
      this.stats.endpointsMonitored = grrStats.total;
      this.stats.lastSyncAt = new Date();

      // Get Osquery node count
      if (this.config.osquery.fleetApiUrl) {
        const nodes = await this.getNodes({ limit: 1 });
        // Total count would come from API headers or separate endpoint
      }

      this.emit('statsUpdated', this.stats);

    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Comprehensive health check for EDR integrations
   */
  async healthCheck(): Promise<{
    grr: { status: 'healthy' | 'degraded' | 'unhealthy'; latency: number; uptime?: string };
    osquery: { status: 'healthy' | 'degraded' | 'unhealthy'; latency: number; nodeCount?: number };
    overall: 'operational' | 'degraded' | 'down';
  }> {
    const startTime = Date.now();

    // Check GRR health
    let grrStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
    let grrLatency = 0;
    try {
      const grrStart = Date.now();
      const grrResponse = await this.fetchGrr('/health');
      grrLatency = Date.now() - grrStart;
      grrStatus = grrResponse.ok ? 'healthy' : 'degraded';
    } catch {
      grrStatus = 'unhealthy';
    }

    // Check Osquery health
    let osqueryStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
    let osqueryLatency = 0;
    let nodeCount = 0;
    try {
      const osqStart = Date.now();
      const osqResponse = await this.fetchFleet('/api/v1/health');
      osqueryLatency = Date.now() - osqStart;
      osqueryStatus = osqResponse.ok ? 'healthy' : 'degraded';
      
      // Try to get node count
      try {
        const nodes = await this.getNodes({ limit: 1 });
        nodeCount = 0; // Would come from pagination header
      } catch {
        // Ignore
      }
    } catch {
      osqueryStatus = 'unhealthy';
    }

    // Determine overall status
    const overall = (grrStatus === 'healthy' || grrStatus === 'degraded') &&
                    (osqueryStatus === 'healthy' || osqueryStatus === 'degraded')
      ? 'operational'
      : grrStatus === 'unhealthy' && osqueryStatus === 'unhealthy'
        ? 'down'
        : 'degraded';

    return {
      grr: { status: grrStatus, latency: grrLatency },
      osquery: { status: osqueryStatus, latency: osqueryLatency, nodeCount },
      overall,
    };
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private async fetchGrr(path: string, init: RequestInit = {}): Promise<Response> {
    const url = `${this.config.grr.apiUrl.replace(/\/$/, '')}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    };

    // Add auth token if available
    if (this.grrAuthToken) {
      headers['Authorization'] = `Bearer ${this.grrAuthToken}`;
    } else {
      // Basic auth for initial login
      const credentials = Buffer.from(
        `${this.config.grr.username}:${this.config.grr.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(this.config.grr.timeout || 60000),
    });
  }

  private async fetchFleet(path: string, init: RequestInit = {}): Promise<Response> {
    if (!this.config.osquery.fleetApiUrl) {
      throw new Error('Osquery Fleet URL not configured');
    }

    const url = `${this.config.osquery.fleetApiUrl.replace(/\/$/, '')}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    };

    if (this.osqueryAuthToken) {
      headers['Authorization'] = `Bearer ${this.osqueryAuthToken}`;
    } else if (this.config.osquery.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.osquery.apiKey}`;
    }

    return fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(this.config.osquery.timeout || 30000),
    });
  }

  private transformGrrClient(raw: any): GrrClient {
    return {
      clientId: raw.client_id || raw.clientId,
      hostname: raw.hostname || raw.host_info?.hostname || 'Unknown',
      os: raw.os || raw.os_info?.system || 'Unknown',
      osVersion: raw.os_version || raw.os_info?.version || '',
      ipAddress: raw.ip_address || raw.host_info?.ip || [],
      macAddress: raw.mac_address || raw.host_info?.mac_addresses,
      lastSeenAt: raw.last_seen_at || raw.lastSeenAt || raw.ping?.timestamp,
      firstSeenAt: raw.first_seen_at || raw.firstSeenAt,
      labels: raw.labels || [],
      installTime: raw.install_time || raw.client_info?.install_time,
      clientVersion: raw.client_version || raw.client_info?.client_version,
      ping: raw.last_ping_ms || raw.ping?.latency || 0,
      // Telco-specific enrichment
      assetTag: raw.asset_tag,
      department: raw.labels?.find((l: string) => 
        ['NOC', 'IT Operations', 'Development', 'Corporate', 'Field'].some(d => l.includes(d))
      ),
      owner: raw.users?.[0]?.username || raw.username,
      riskScore: this.calculateEndpointRisk(raw),
    };
  }

  private transformOsqueryNode(raw: any): OsqueryNode {
    return {
      nodeKey: raw.node_key || raw.nodeKey,
      hostname: raw.hostname || raw.host_display_name || 'Unknown',
      uuid: raw.uuid || raw.hardware_uuid || '',
      platform: raw.platform || 'unknown',
      osVersion: raw.os_version || raw.osversion || '',
      cpuType: raw.cpu_type || raw.cpu_type_name,
      cpuBrand: raw.cpu_brand || raw.cpu_physical_cores,
      physicalMemory: raw.physical_memory || raw.memory,
      hardwareSerial: raw.hardware_serial || raw.serial_number,
      ipAddress: raw.primary_ip || raw.ip_address,
      primaryMac: raw.primary_mac || raw.mac_address,
      lastSeenAt: raw.last_seen_at || raw.last_seen || new Date().toISOString(),
      label: raw.label || 'unknown',
      user_email: raw.user_email || raw.owner_email,
      detailInterval: raw.detail_interval,
      activeInterval: raw.active_interval,
      // Telco-specific
      environment: raw.environment,
      criticality: raw.criticality,
      businessUnit: raw.business_unit || raw.label,
    };
  }

  private calculateEndpointRisk(client: any): number {
    let riskScore = 0;
    
    // Factor 1: Days since last seen (stale = risky)
    const lastSeen = new Date(client.last_seen_at || client.lastSeenAt);
    const daysSinceLastSeen = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSeen > 30) riskScore += 30;
    else if (daysSinceLastSeen > 7) riskScore += 15;

    // Factor 2: OS version (outdated = risky)
    const osVersion = client.os_version || '';
    if (osVersion.includes('Windows 7') || osVersion.includes('Server 2008')) riskScore += 25;
    else if (osVersion.includes('Windows 8') || osVersion.includes('Server 2012')) riskScore += 15;

    // Factor 3: Labels indicating sensitive environments
    const labels = client.labels || [];
    if (labels.some(l => l.includes('DMZ'))) riskScore += 20;
    if (labels.some(l => l.includes('Production'))) riskScore += 10;

    // Factor 4: Ping latency (high = potential issues)
    const ping = client.last_ping_ms || client.ping || 0;
    if (ping > 5000) riskScore += 15;
    else if (ping > 2000) riskScore += 5;

    return Math.min(100, riskScore);
  }

  private analyzeHuntFindings(payload: any): TelcoHuntResult['findings'] {
    const findings: TelcoHuntResult['findings'] = [];

    // Analyze different payload types
    if (payload.files) {
      payload.files.forEach((file: any) => {
        findings.push({
          type: 'file',
          data: file,
          riskLevel: this.assessFileRisk(file),
          iocIndicators: this.extractIocFromFile(file),
        });
      });
    }

    if (payload.processes) {
      payload.processes.forEach((proc: any) => {
        findings.push({
          type: 'process',
          data: proc,
          riskLevel: this.assessProcessRisk(proc),
          iocIndicators: this.extractIocFromProcess(proc),
        });
      });
    }

    if (payload.network_connections) {
      payload.network_connections.forEach((conn: any) => {
        findings.push({
          type: 'network',
          data: conn,
          riskLevel: this.assessConnectionRisk(conn),
          iocIndicators: this.extractIocFromConnection(conn),
        });
      });
    }

    return findings;
  }

  private assessFileRisk(file: any): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const filename = (file.name || '').toLowerCase();
    const path = (file.path || '').toLowerCase();
    
    // Critical indicators
    if (filename.match(/\.(exe|dll|bat|ps1|vbs|js|jar)$/i) && 
        path.includes('temp')) return 'critical';
    if (filename.match(/(mimikatz|cobalt|covenant|sliver|metasploit)/i)) return 'critical';
    
    // High indicators
    if (path.includes('startup') || path.includes('run keys')) return 'high';
    if (file.size && file.size > 100 * 1024 * 1024 && filename.endsWith('.zip')) return 'high'; // Large zip
    
    // Medium indicators
    if (path.includes('downloads') && filename.match(/\.(exe|msi|scr)/i)) return 'medium';
    if (file.hash?.md5 && KNOWN_MALWARE_HASHES.includes(file.hash.md5)) return 'critical';

    return 'info';
  }

  private assessProcessRisk(process: any): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const cmdline = (process.cmdline || process.command_line || '').toLowerCase();
    const name = (process.name || process.process_name || '').toLowerCase();
    
    // Critical process names
    if (name.match(/(mimikatz|psexec|ncat|netcat|plink|putty)/i)) return 'critical';
    
    // Suspicious command lines
    if (cmdline.includes('encodecommand') || cmdline.includes('-encodedcommand')) return 'high';
    if (cmdline.includes('downloadstring') || cmdline.includes('downloadfile')) return 'high';
    if (cmdline.includes('bypass') && cmdline.includes('executionpolicy')) return 'high';
    
    // Unusual parent processes
    if (name === 'cmd.exe' && process.parent?.match(/(word|excel|outlook|winword)/i)) return 'medium';
    if (name === 'powershell.exe' && process.parent?.match(/(chrome|firefox|edge)/i)) return 'high';

    return 'info';
  }

  private assessConnectionRisk(connection: any): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const remoteIp = connection.remote_address || connection.remote_ip || '';
    const remotePort = connection.remote_port || connection.remoteport;
    const protocol = connection.protocol || connection.proto || '';

    // Known bad ports
    const suspiciousPorts = [4444, 5555, 6667, 8888, 4443, 1337, 31337];
    if (suspiciousPorts.includes(remotePort)) return 'critical';

    // Unusual outbound protocols
    if (protocol === 'irc' || protocol === 'torrent') return 'high';
    
    // Connections to known bad countries (simplified check)
    if (this.isSuspiciousGeolocation(remoteIp)) return 'high';

    return 'info';
  }

  private extractIocFromFile(file: any): string[] {
    const iocs: string[] = [];
    if (file.hash?.md5) iocs.push(`MD5:${file.hash.md5}`);
    if (file.hash?.sha256) iocs.push(`SHA256:${file.hash.sha256}`);
    if (file.path) iocs.push(`PATH:${file.path}`);
    return iocs;
  }

  private extractIocFromProcess(process: any): string[] {
    const iocs: string[] = [];
    if (process.pid) iocs.push(`PID:${process.pid}`);
    if (process.hash?.md5) iocs.push(`MD5:${process.hash.md5}`);
    if (process.cmdline) iocs.push(`CMDLINE:${process.cmdline.substring(0, 200)}`);
    return iocs;
  }

  private extractIocFromConnection(connection: any): string[] {
    const iocs: string[] = [];
    if (connection.remote_address) iocs.push(`IP:${connection.remote_address}`);
    if (connection.remote_port) iocs.push(`PORT:${connection.remote_port}`);
    if (connection.domain) iocs.push(`DOMAIN:${connection.domain}`);
    return iocs;
  }

  private isSuspiciousGeolocation(ip: string): boolean {
    // Simplified check - in production, use GeoIP database
    // This would check against known high-risk countries/regions
    return false;
  }

  private getBuiltinTelcoArtifacts(): GrrArtifact[] {
    return [
      {
        name: 'TelcoWorkstationForensics',
        documentation: 'Collects forensics artifacts from NOC/SOC workstations',
        supportedOs: ['Linux', 'Windows'],
        sources: [
          { type: 'PATH', paths: ['/tmp', '%TEMP%', '$LOCALAPPDATA\\Temp'] },
          { type: 'REGISTRY_KEY', path: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' },
          { type: 'COMMAND', query: 'SELECT * FROM running_processes;' },
        ],
        isCustom: false,
        category: 'Telco',
      },
      {
        name: 'TelecomServerBaseline',
        documentation: 'Baseline collection for telecom infrastructure servers',
        supportedOs: ['Linux'],
        sources: [
          { type: 'COMMAND', query: 'SELECT * FROM listening_ports;' },
          { type: 'COMMAND', query: 'SELECT * FROM cron;' },
          { type: 'COMMAND', query: 'SELECT * FROM users WHERE uid < 1000;' },
          { type: 'PATH', paths: ['/etc/passwd', '/etc/shadow', '/etc/sudoers'] },
        ],
        isCustom: false,
        category: 'Telco',
      },
      {
        name: 'NetworkDeviceConfiguration',
        documentation: 'Collects configuration from managed network devices',
        supportedOs: ['Linux'],
        sources: [
          { type: 'PATH', paths: ['/etc/network/interfaces', '/etc/sysconfig/network-scripts/'] },
          { type: 'COMMAND', query: 'SELECT * FROM iptables;' },
          { type: 'COMMAND', query: 'SELECT * FROM kernel_modules;' },
        ],
        isCustom: false,
        category: 'Telco',
      },
    ];
  }
}

// ============================================================
// Pre-built Security Query Presets
// ============================================================

const SecurityPresets = {
  // Malware Detection
  suspicious_processes: {
    name: 'Suspicious Process Detection',
    query: `
      SELECT p.name, p.pid, p.parent, p.path, p.cmdline, p.on_disk, p.start_time,
             u.username, h.sha256
      FROM processes p
      LEFT JOIN users u ON p.uid = u.uid
      LEFT JOIN hash h ON p.path = h.path
      WHERE p.name LIKE '%powershell%' AND p.cmdline LIKE '%-encodedcommand%'
         OR p.name LIKE '%certutil%' AND p.cmdline LIKE '%urlcache%'
         OR p.name IN ('mimikatz.exe', 'psexec.exe', 'ncat.exe', 'plink.exe')
         OR p.cmdline LIKE '%downloadstring%'
         OR p.cmdline LIKE '%invoke-expression%'
    `,
    category: 'security' as const,
  },

  // Persistence Mechanisms
  persistence_mechanisms: {
    name: 'Persistence Mechanism Scan',
    query: `
      SELECT * FROM startup_items WHERE status = 'enabled'
        AND (name LIKE '%backdoor%' OR name LIKE '%persistence%' OR 
             target LIKE '%temp%' OR target LIKE '%appdata%');
      
      SELECT * FROM cron WHERE command LIKE '%curl%' OR command LIKE '%wget%'
        OR command LIKE('%bash%-%i%>%%/dev/tcp/%');
      
      SELECT * FROM plist WHERE path LIKE '%LaunchAgents%' OR path LIKE '%LaunchDaemons%'
        AND (key = 'ProgramArguments' AND value LIKE '%/tmp/%');
    `,
    category: 'security' as const,
  },

  // Network Reconnaissance
  network_recon: {
    name: 'Network Reconnaissance Detection',
    query: `
      SELECT DISTINCT p.name, p.pid, p.cmdline, a.local_address, a.remote_address, a.remote_port
      FROM process_open_sockets a
      JOIN processes p ON a.pid = p.pid
      WHERE a.remote_port IN (21, 22, 23, 25, 53, 80, 443, 445, 1433, 3306, 3389, 5432, 8080, 8443)
        AND p.name NOT IN ('chrome.exe', 'firefox.exe', 'msedge.exe', 'ssh', 'curl', 'wget')
        AND a.remote_address NOT LIKE '10.%' 
        AND a.remote_address NOT LIKE '192.168.%'
        AND a.remote_address NOT LIKE '172.16.%'
        AND a.remote_address NOT LIKE '127.%';
    `,
    category: 'security' as const,
  },

  // Data Exfiltration Signs
  data_exfil: {
    name: 'Data Exfiltration Indicators',
    query: `
      SELECT f.filename, f.path, f.size, f.uid, f.atime, f.mtime, f.ctime,
             p.name AS process_name, p.cmdline
      FROM file f
      JOIN processes p ON f.uid = p.uid
      WHERE f.filename LIKE '%.zip' AND f.size > 10485760
        AND p.cmdline LIKE '%archive%' OR p.cmdline LIKE '%compress%'
      
      UNION
      
      SELECT f.filename, f.path, f.size, f.uid, f.atime, f.mtime, f.ctime,
             NULL, NULL
      FROM file
      WHERE (f.filename LIKE '%password%' OR f.filename LIKE '%secret%' 
        OR f.filename LIKE '%credential%' OR f.filename LIKE '%backup%.sql')
        AND f.mtime > (strftime('%s','now') - 86400);
    `,
    category: 'security' as const,
  },

  // Telco-Specific: SIM Box Detection
  simbox_detection: {
    name: 'SIM Box / GSM Gateway Detection',
    query: `
      SELECT * FROM usb_devices WHERE vendor LIKE '%Huawei%' 
        OR vendor LIKE '%Quectel%' OR vendor LIKE '%Simcom%'
        OR product LIKE '%GSM%' OR product LIKE '%modem%';
      
      SELECT * FROM processes WHERE name LIKE '%asterisk%' 
        OR name LIKE '%freeswitch%' OR name LIKE '%kamailio%'
        OR name LIKE '%opensips%' OR cmdLine LIKE '%gsm%';
    `,
    category: 'security' as const,
  },

  // Telco-Specific: SS7/Diameter Tool Detection
  telecom_tool_detection: {
    name: 'Telecom Protocol Tool Detection',
    query: `
      SELECT * FROM listening_ports WHERE port IN (1812, 1813, 3868, 3789, 292, 2222, 5000)
        OR port >= 5600 AND port <= 5699; -- SS7 MTP range
      
      SELECT * FROM deb_packages WHERE name LIKE '%ss7%' OR name LIKE '%diameter%'
        OR name LIKE '%sigtran%' OR name LIKE '%camel%';
      
      SELECT * FROM processes WHERE cmdline LIKE '%ss7%' OR cmdline like '%map%'
        OR cmdline LIKE '%cap%' OR cmdline LIKE '%isinap%';
    `,
    category: 'security' as const,
  },

  // Inventory: All Endpoints Summary
  endpoint_inventory: {
    name: 'Complete Endpoint Inventory',
    query: `
      SELECT hostname, os_version, cpu_brand, physical_memory, 
             (SELECT COUNT(*) FROM users) AS user_count,
             (SELECT COUNT(*) FROM listening_ports) AS open_ports,
             datetime(last_seen, 'unixepoch') AS last_boot
      FROM system_info;
    `,
    category: 'inventory' as const,
  },

  // Compliance: Unpatched Software
  vulnerability_scan: {
    name: 'Vulnerable Software Detection',
    query: `
      SELECT name, version, vendor FROM programs 
        WHERE (name LIKE '%Adobe Reader%' AND CAST(SUBSTR(version, 1, 1) AS INTEGER) < 20)
           OR (name LIKE '%Java%' AND version LIKE '1.8.0_%')
           OR (name LIKE '%Flash%' AND CAST(SUBSTR(version, 1, 2) AS INTEGER) < 32)
           OR (vendor = 'Apache' AND name LIKE '%HTTP Server%' AND version LIKE '2.4.%')
           OR (name LIKE '%OpenSSL%' AND version LIKE '1.1.1%' AND version NOT LIKE '%h%')
      ORDER BY name;
    `,
    category: 'compliance' as const,
  },

  // Recent File Activity (User Space)
  recent_user_activity: {
    name: 'Recent User File Activity (24hr)',
    query: `
      SELECT f.filename, f.path, f.size, f.uid, f.permissions, 
             datetime(f.atime, 'unixepoch') AS accessed,
             datetime(f.mtime, 'unixepoch') AS modified,
             u.username
      FROM file f
      JOIN users u ON f.uid = u.uid
      WHERE f.mtime > (strftime('%s', 'now') - 86400)
        AND f.path NOT LIKE '/sys/%' AND f.path NOT LIKE '/proc/%'
        AND f.path NOT LIKE '/dev/%'
      ORDER BY f.mtime DESC
      LIMIT 100;
    `,
    category: 'troubleshooting' as const,
  },
};

// Constants
const KNOWN_MALWARE_HASHES: string[] = [
  // Example hashes - in production, load from threat intelligence feed
  '44d88612fea8a8f36de82e1278abb02f', // MD5 test hash (not actual malware)
  // Add real malware hashes here
];

// Export singleton factory
let edrInstance: GrrOsqueryEdrClient | null = null;

export function createEdrClient(config: EdrIntegrationConfig): GrrOsqueryEdrClient {
  if (!edrInstance) {
    edrInstance = new GrrOsqueryEdrClient(config);
  }
  return edrInstance;
}

export default GrrOsqueryEdrClient;
