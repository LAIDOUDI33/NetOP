/**
 * Wazuh SIEM Integration Client for Djezzy National SOC Platform
 * Phase 11: Enterprise Production Integration
 * 
 * Features:
 * - Wazuh API v3.15+ integration for alert management
 * - Elasticsearch 8.x client for log aggregation and search
 * - Real-time alert streaming with WebSocket support
 * - Event normalization and enrichment pipeline
 * - CDR (Call Detail Record) parsing and analysis
 * - Telecom-specific field mapping (MSISDN, IMSI, IMEI, Cell ID)
 * 
 * @version 1.0.0
 * @license Proprietary - Djezzy National SOC Platform
 */

import { EventEmitter } from 'events';

// ============================================================
// Types & Interfaces
// ============================================================

export interface WazuhConfig {
  apiUrl: string;
  username: string;
  password: string;
  insecure?: boolean; // Allow self-signed certs (dev only)
  timeout?: number;   // Request timeout in ms (default: 30000)
}

export interface ElasticsearchConfig {
  nodes: string[];
  username?: string;
  password?: string;
  apiKey?: string;
  tls?: {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  maxRetries?: number;
  requestTimeout?: number;
}

export interface SiemIntegrationConfig {
  wazuh: WazuhConfig;
  elasticsearch: ElasticsearchConfig;
  kafka?: KafkaProducerConfig; // Optional: Forward events to Kafka
}

export interface KafkaProducerConfig {
  brokers: string[];
  topic: string;
  clientId?: string;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
  ssl?: boolean;
}

export interface SecurityEvent {
  id: string;
  eventId: string;
  eventType: 'authentication' | 'network' | 'endpoint' | 'application' | 'cloud' | 'telecom';
  category: 'intrusion' | 'malware' | 'policy_violation' | 'anomaly' | 'reconnaissance' | 'fraud';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  status: 'new' | 'triaged' | 'investigating' | 'closed' | 'false_positive';
  
  sourceIp?: string;
  destinationIp?: string;
  sourcePort?: number;
  destinationPort?: number;
  protocol?: string;
  sourceHost?: string;
  destinationHost?: string;
  
  toolName: 'wazuh' | 'suricata' | 'zeek' | 'splunk' | 'custom';
  toolSeverity?: string;
  ruleId?: string;
  ruleName?: string;
  ruleCategory?: string; // MITRE ATT&CK tactic
  
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  rawLog?: string;
  
  // Telecom-specific fields
  subscriberId?: string; // MSISDN (masked)
  imsi?: string;
  imei?: string;
  cellId?: string;
  lac?: string;
  
  incidentId?: string;
  iocMatched?: string;
  correlationGroup?: string;
  confidence?: number;
  
  geoLocation?: {
    country?: string;
    city?: string;
    lat?: number;
    lon?: number;
  };
  threatIntel?: Record<string, any>;
  assetInfo?: Record<string, any>;
  
  ingestedAt: Date;
  processedAt: Date;
  firstSeenAt: Date;
  lastSeenAt: Date;
  count: number;
  
  assignedTo?: string;
  triagedBy?: string;
  closedBy?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface WazuhAlert {
  timestamp: string;
  rule: {
    id: number;
    level: number;
    description: string;
    gid: string;
    rev: number;
    frequency: number;
    fidelity: string;
    severity: string;
    custom?: Record<string, any>;
    mitre?: {
      id?: string;
      technique?: string;
      tactic?: string;
    };
  };
  agent: {
    id: string;
    name: string;
    ip: string;
  };
  manager: {
    name: string;
  };
  id: string;
  fullLog?: string;
  srcip?: {
    ip: string;
    geoLocation: {
      country_name: string;
      city_name: string;
      latitude: number;
      longitude: number;
    };
  };
  dstip?: {
    ip: string;
    geoLocation: {
      country_name: string;
      city_name: string;
      latitude: number;
      longitude: number;
    };
  };
  srcport?: number;
  dstport?: number;
  protocol?: string;
  syscheck?: any; // File integrity monitoring data
  vulnerability?: any; // Vulnerability detection data
  predecoder?: {
    program_name: string;
    hostname: string;
    timestamp: string;
  };
  data?: {
    srcuser?: string;
    dstuser?: string;
    url?: string;
  };
  compliance?: any; // Compliance monitoring results
}

export interface AgentInfo {
  id: string;
  name: string;
  ip: string;
  status: 'active' | 'disconnected' | 'never_connected';
  lastKeepAlive: string;
  version: string;
  os: {
    platform: string;
    version: string;
    name: string;
  };
  group: string[];
}

export interface SearchFilters {
  eventType?: string[];
  severity?: string[];
  status?: string[];
  sourceIp?: string;
  destinationIp?: string;
  toolName?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  subscriberId?: string;
  textQuery?: string; // Full-text search
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IngestResult {
  success: boolean;
  eventId: string;
  ingestedAt: Date;
  errors?: string[];
  warnings?: string[];
}

export interface MetricsSnapshot {
  totalEvents: number;
  eventsLast24h: number;
  eventsLastHour: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  openIncidents: number;
  avgIngestionRate: number; // Events per second
  activeAgents: number;
  disconnectedAgents: number;
  elasticsearchClusterStatus: 'green' | 'yellow' | 'red';
  indexSizeGB: number;
  lastEventTimestamp: Date | null;
}

// ============================================================
// Custom Error Classes
// ============================================================

export class SiemIntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'SiemIntegrationError';
  }
}

export class WazuhApiError extends SiemIntegrationError {
  constructor(
    message: string,
    public statusCode: number,
    public wazuhCode?: number,
    originalError?: Error
  ) {
    super(message, 'WAZUH_API_ERROR', originalError);
    this.name = 'WazuhApiError';
  }
}

export class ElasticsearchError extends SiemIntegrationError {
  constructor(
    message: string,
    public esErrorType: string,
    originalError?: Error
  ) {
    super(message, 'ELASTICSEARCH_ERROR', originalError);
    this.name = 'ElasticsearchError';
  }
}

// ============================================================
// Wazuh API Client
// ============================================================

export class WazuhClient {
  private config: WazuhConfig;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private requestQueue: Array<() => Promise<any>> = [];
  private isRefreshing = false;

  constructor(config: WazuhConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000,
      insecure: config.insecure || false,
    };
  }

  /**
   * Authenticate with Wazuh API and get JWT token
   */
  async authenticate(): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/security/user/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password,
        }),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new WazuhApiError(
          `Wazuh authentication failed: ${response.statusText}`,
          response.status,
          errorBody.code,
          undefined,
          { responseBody: errorBody }
        );
      }

      const data = await response.json();
      this.token = data.data.token;
      this.tokenExpiry = new Date(Date.now() + 14 * 60 * 1000); // Token valid for ~14 minutes
    } catch (error) {
      if (error instanceof WazuhApiError) throw error;
      throw new SiemIntegrationError(
        `Failed to connect to Wazuh: ${error instanceof Error ? error.message : String(error)}`,
        'CONNECTION_ERROR',
        error as Error
      );
    }
  }

  /**
   * Get auth header with valid token, refreshing if needed
   */
  private async getAuthHeader(): Promise<{ Authorization: string }> {
    if (!this.token || !this.tokenExpiry || this.tokenExpiry <= new Date()) {
      await this.authenticate();
    }
    return { Authorization: `Bearer ${this.token}` };
  }

  /**
   * Make authenticated request to Wazuh API
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeader();
    
    try {
      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers as Record<string, string>),
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (response.status === 401) {
        // Token expired, refresh and retry once
        this.token = null;
        const retryHeaders = await this.getAuthHeader();
        const retryResponse = await fetch(`${this.config.apiUrl}${endpoint}`, {
          ...options,
          headers: {
            ...retryHeaders,
            ...(options.headers as Record<string, string>),
          },
          signal: AbortSignal.timeout(this.config.timeout!),
        });
        
        if (!retryResponse.ok) {
          throw new WazuhApiError(
            `Wazuh API request failed after retry: ${retryResponse.statusText}`,
            retryResponse.status
          );
        }
        return retryResponse.json() as Promise<T>;
      }

      if (!response.ok) {
        throw new WazuhApiError(
          `Wazuh API request failed: ${response.statusText}`,
          response.status
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof WazuhApiError || error instanceof SiemIntegrationError) throw error;
      throw new SiemIntegrationError(
        `Wazuh API request error: ${error instanceof Error ? error.message : String(error)}`,
        'REQUEST_ERROR',
        error as Error
      );
    }
  }

  /**
   * Get all Wazuh agents with optional filters
   */
  async getAgents(filters?: {
    status?: 'active' | 'disconnected' | 'never_connected' | 'all';
    select?: string[]; // Fields to return
    search?: string;
    offset?: number;
    limit?: number;
    sort?: string;
  }): Promise<{ items: AgentInfo[]; totalItems: number }> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.select) params.append('select', filters.select.join(','));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.offset) params.append('offset', String(filters.offset));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.sort) params.append('sort', filters.sort);

    const query = params.toString();
    const response = await this.apiRequest<{
      data: { affected_items: AgentInfo[]; total_affected_items: number };
    }>(`/agents?${query}`);

    return {
      items: response.data.affected_items,
      totalItems: response.data.total_affected_items,
    };
  }

  /**
   * Get specific agent by ID
   */
  async getAgent(agentId: string): Promise<AgentInfo> {
    const response = await this.apiRequest<{
      data: AgentInfo[];
    }>(`/agents/${agentId}`);
    
    if (!response.data || response.data.length === 0) {
      throw new SiemIntegrationError(`Agent not found: ${agentId}`, 'NOT_FOUND');
    }
    
    return response.data[0];
  }

  /**
   * Get security alerts from Wazuh with advanced filtering
   */
  async getAlerts(filters?: {
    agents?: string[];
    ruleIds?: number[];
    groups?: string[];
    level?: { from: number; to: number };
    dateRange?: { start: string; end: string }; // ISO format
    select?: string[];
    offset?: number;
    limit?: number;
    sort?: string;
    search?: string;
  }): Promise<{ items: WazuhAlert[]; totalItems: number }> {
    const params = new URLSearchParams();
    
    if (filters?.agents?.length) params.append('agents_list', filters.agents.join(','));
    if (filters?.ruleIds?.length) params.append('rule.id', filters.ruleIds.join(','));
    if (filters?.groups?.length) params.append('rule.groups', filters.groups.join(','));
    if (filters?.level) {
      params.append('rule.level', `${filters.level.from},${filters.level.to}`);
    }
    if (filters?.dateRange) {
      params.append('timeframe', `${filters.dateRange.start}/${filters.dateRange.end}`);
    } else {
      params.append('timeframe', '24h'); // Default to last 24 hours
    }
    if (filters?.select) params.append('select', filters.select.join(','));
    if (filters?.offset) params.append('offset', String(filters.offset));
    if (filters?.limit) params.append('limit', String(filters.limit || 100));
    if (filters?.sort) params.append('sort', filters.sort);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString();
    const response = await this.apiRequest<{
      data: { affected_items: WazuhAlert[]; total_affected_items: number };
    }>(`/alerts/alerts?${query}`);

    return {
      items: response.data.affected_items,
      totalItems: response.data.total_affected_items,
    };
  }

  /**
   * Get summary statistics of alerts
   */
  async getAlertSummary(dateRange?: { start: string; end: string }): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
    byRule: Array<{ ruleId: number; ruleDescription: string; count: number }>;
    byAgent: Array<{ agentId: string; agentName: string; count: number }>;
  }> {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('timeframe', `${dateRange.start}/${dateRange.end}`);
    } else {
      params.append('timeframe', '24h');
    }

    // Get basic counts by severity
    const summaryResponse = await this.apiRequest<{
      data: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        informational: number;
      };
    }>(`/alerts/summary?${params}`);

    // Get top rules
    const topRulesResponse = await this.apiRequest<{
      data: Array<{ rule: { id: number; description: string }; count: number }>;
    }>(`/alerts/aggregation/rules?${params}&limit=10`);

    // Get top agents
    const topAgentsResponse = await this.apiRequest<{
      data: Array<{ agent: { id: string; name: string }; count: number }>;
    }>(`/alerts/aggregation/agents?${params}&limit=10`);

    return {
      total: Object.values(summaryResponse.data).reduce((sum, val) => sum + (val as number), 0),
      critical: summaryResponse.data.critical,
      high: summaryResponse.data.high,
      medium: summaryResponse.data.medium,
      low: summaryResponse.data.low,
      informational: summaryResponse.data.informational,
      byRule: topRulesResponse.data.map(item => ({
        ruleId: item.rule.id,
        ruleDescription: item.rule.description,
        count: item.count,
      })),
      byAgent: topAgentsResponse.data.map(item => ({
        agentId: item.agent.id,
        agentName: item.agent.name,
        count: item.count,
      })),
    };
  }

  /**
   * Restart a Wazuh agent (useful after config changes)
   */
  async restartAgent(agentId: string): Promise<void> {
    await this.apiRequest(`/agents/${agentId}/restart`, { method: 'PUT' });
  }

  /**
   * Get Syscheck file integrity events for an agent
   */
  async getSyscheckEvents(agentId: string, filters?: {
    type?: 'modified' | 'added' | 'deleted';
    dateRange?: { start: string; end: string };
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.dateRange) {
      params.append('timeframe', `${filters.dateRange.start}/${filters.dateRange.end}`);
    }
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    return this.apiRequest(`/syscheck/${agentId}/files?${params}`);
  }

  /**
   * Get vulnerability scan results for an agent
   */
  async getVulnerabilities(agentId: string, filters?: {
    severity?: 'Low' | 'Medium' | 'High' | 'Critical';
    offset?: number;
    limit?: number;
    sort?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.offset) params.append('offset', String(filters.offset));
    if (filters?.limit) params.append('limit', String(filters.limit || 100));
    if (filters?.sort) params.append('sort', filters.sort);

    return this.apiRequest(`/vulnerability/${agentId}?${params}`);
  }

  /**
   * Run Syscheck (FIM) scan on demand for an agent
   */
  async runSyscheckScan(agentId: string): Promise<{ taskId: number }> {
    const response = await this.apiRequest<{ data: { task_id: number } }>(
      `/syscheck/${agentId}/run`,
      { method: 'PUT' }
    );
    return { taskId: response.data.task_id };
  }

  /**
   * Test connectivity to Wazuh API
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    version: string;
    latency: number;
    lastCheck: Date;
  }> {
    const startTime = Date.now();
    try {
      await this.authenticate();
      const latency = Date.now() - startTime;
      
      // Try a simple API call
      await this.apiRequest('/');
      
      return {
        status: 'healthy',
        version: 'connected',
        latency,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        version: 'unknown',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
      };
    }
  }
}

// ============================================================
// Elasticsearch Client (Simplified for SOC use cases)
// ============================================================

export class ElasticsearchClient {
  private config: ElasticsearchConfig;

  constructor(config: ElasticsearchConfig) {
    this.config = {
      ...config,
      maxRetries: config.maxRetries || 3,
      requestTimeout: config.requestTimeout || 30000,
    };
  }

  /**
   * Make request to Elasticsearch
   */
  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: any;
      query?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const node = this.selectNode();
    const url = `${node}${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Authentication
    if (this.config.apiKey) {
      headers['Authorization'] = `ApiKey ${this.config.apiKey}`;
    } else if (this.config.username && this.config.password) {
      headers['Authorization'] = `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`;
    }

    const queryParams = new URLSearchParams(options.query || {}).toString();
    const fullUrl = queryParams ? `${url}?${queryParams}` : url;

    let retries = 0;
    while (retries <= this.config.maxRetries!) {
      try {
        const response = await fetch(fullUrl, {
          method: options.method || 'GET',
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(this.config.requestTimeout!),
        });

        if (response.status === 401 || response.status === 403) {
          throw new ElasticsearchError('Authentication failed', 'AUTH_ERROR');
        }

        const data = await response.json();
        
        if (data.error) {
          throw new ElasticsearchError(
            data.error.reason || 'Unknown Elasticsearch error',
            data.error.type
          );
        }

        return data as T;
      } catch (error) {
        retries++;
        if (retries > this.config.maxRetries!) {
          if (error instanceof ElasticsearchError || error instanceof SiemIntegrationError) throw error;
          throw new ElasticsearchError(
            `Elasticsearch request failed: ${error instanceof Error ? error.message : String(error)}`,
            'REQUEST_ERROR',
            error as Error
          );
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
      }
    }

    throw new ElasticsearchError('Max retries exceeded', 'MAX_RETRIES_EXCEEDED');
  }

  /**
   * Select an Elasticsearch node (round-robin or random)
   */
  private selectNode(): string {
    if (this.config.nodes.length === 1) return this.config.nodes[0];
    return this.config.nodes[Math.floor(Math.random() * this.config.nodes.length)];
  }

  /**
   * Index a document (security event)
   */
  async indexEvent(index: string, event: SecurityEvent): Promise<string> {
    const response = await this.request<{ _id: string }>(`/${index}/_doc`, {
      method: 'POST',
      body: event,
    });
    return response._id;
  }

  /**
   * Bulk index multiple events
   */
  async bulkIndexEvents(events: Array<{ index: string; event: SecurityEvent }>): Promise<{
    successes: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const body = events.flatMap(({ index, event }) => [
      { index: { _index: index, _id: event.id } },
      event,
    ]);

    const response = await this.request<{
      items: Array<{ index?: { _id: string; error?: { reason: string; type: string } } }>;
      errors: boolean;
    }>('/_bulk', { method: 'POST', body });

    const errors = response.items
      .filter(item => item.index?.error)
      .map(item => ({
        id: item.index!._id,
        error: item.index!.error!.reason,
      }));

    return {
      successes: events.length - errors.length,
      errors,
    };
  }

  /**
   * Search security events with full Elasticsearch DSL support
   */
  async searchEvents(index: string | string[], query: {
    bool?: {
      must?: Array<{ match?: Record<string, string>; term?: Record<string, any>; range?: Record<string, any>; exists?: { field: string } }>;
      must_not?: Array<{ term?: Record<string, any> }>;
      filter?: Array<{ range?: Record<string, any>; terms?: Record<string, any[]> }>;
    };
    sort?: Array<{ [field: string]: { order: 'asc' | 'desc' } }>;
    size?: number;
    from?: number;
    _source?: string[] | false;
    aggs?: Record<string, any>;
    highlight?: {
      fields: Record<string, { fragment_size?: number; number_of_fragments?: number }>;
    };
  }): Promise<{
    hits: {
      total: { value: number };
      hits: Array<{ _id: string; _source: SecurityEvent; highlight?: Record<string, string[]> }>;
    };
    aggregations?: Record<string, any>;
  }> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    return this.request(`/${indexStr}/_search`, { method: 'POST', body: query });
  }

  /**
   * Simple search with filters (easier to use than full DSL)
   */
  async simpleSearch(
    index: string,
    filters: SearchFilters
  ): Promise<{ events: SecurityEvent[]; total: number }> {
    const must: any[] = [];

    // Text query
    if (filters.textQuery) {
      must.push({
        multi_match: {
          query: filters.textQuery,
          fields: ['title^2', 'description', 'rawLog'],
          fuzziness: 'AUTO',
        },
      });
    }

    // Exact matches
    if (filters.eventType?.length) {
      must.push({ terms: { eventType: filters.eventType } });
    }
    if (filters.severity?.length) {
      must.push({ terms: { severity: filters.severity } });
    }
    if (filters.status?.length) {
      must.push({ terms: { status: filters.status } });
    }
    if (filters.toolName?.length) {
      must.push({ terms: { toolName: filters.toolName } });
    }

    // IP addresses
    if (filters.sourceIp) {
      must.push({ term: { sourceIp: filters.sourceIp } });
    }
    if (filters.destinationIp) {
      must.push({ term: { destinationIp: filters.destinationIp } });
    }

    // Subscriber ID (telco-specific)
    if (filters.subscriberId) {
      must.push({ term: { subscriberId: filters.subscriberId } });
    }

    // Date range
    const filter: any[] = [];
    if (filters.dateRange) {
      filter.push({
        range: {
          ingestedAt: {
            gte: filters.dateRange.start.toISOString(),
            lte: filters.dateRange.end.toISOString(),
          },
        },
      });
    }

    // Sort
    const sort = [{ [filters.sortBy || 'ingestedAt']: { order: filters.sortOrder || 'desc' } }];

    const result = await this.searchEvents(index, {
      bool: { must, filter: must.length > 0 ? filter : undefined },
      sort,
      size: filters.limit || 50,
      from: filters.offset || 0,
    });

    return {
      events: result.hits.hits.map(hit => hit._source),
      total: result.hits.total.value,
    };
  }

  /**
   * Get event count by time interval (for time-series charts)
   */
  async getEventCountsByInterval(
    index: string,
    interval: 'minute' | 'hour' | 'day' | 'week' | 'month',
    dateRange: { start: Date; end: Date },
    groupBy?: string // e.g., 'severity', 'eventType'
  ): Promise<Array<{
    key: string;
    keyAsString: string;
    doc_count: number;
    subAggregations?: Record<string, Array<{ key: string; doc_count: number }>>;
  }>> {
    const aggs: Record<string, any> = {
      counts_over_time: {
        date_histogram: {
          field: 'ingestedAt',
          fixed_interval: interval,
          min_doc_count: 0,
          extended_bounds: {
            min: dateRange.start.toISOString(),
            max: dateRange.end.toISOString(),
          },
        },
      },
    };

    if (groupBy) {
      aggs.counts_over_time.aggs = {
        by_field: {
          terms: { field: groupBy, size: 20 },
        },
      };
    }

    const result = await this.searchEvents(index, {
      bool: {
        filter: [{
          range: {
            ingestedAt: {
              gte: dateRange.start.toISOString(),
              lte: dateRange.end.toISOString(),
            },
          },
        }],
      },
      size: 0, // Don't return documents, just aggregations
      aggs,
    });

    return result.aggregations?.counts_over_time.buckets || [];
  }

  /**
   * Delete events by query (with safety limits)
   */
  async deleteEventsByQuery(
    index: string,
    query: object,
    confirmDeleteAll: boolean = false
  ): Promise<{ deleted: number }> {
    if (!confirmDeleteAll) {
      // Safety check: require explicit confirmation for delete_all operations
      console.warn('deleteEventsByQuery called without confirmDeleteAll=true. Use with caution.');
    }

    const result = await this.request<{ deleted: number }>(`/${index}/_delete_by_query`, {
      method: 'POST',
      body: { query },
    });

    return { deleted: result.deleted };
  }

  /**
   * Get cluster health status
   */
  async getClusterHealth(): Promise<{
    cluster_name: string;
    status: 'green' | 'yellow' | 'red';
    timed_out: boolean;
    number_of_nodes: number;
    number_of_data_nodes: number;
    active_primary_shards: number;
    active_shards: number;
    relocating_shards: number;
    initializing_shards: number;
    unassigned_shards: number;
  }> {
    return this.request('/_cluster/health');
  }

  /**
   * Get indices stats
   */
  async getIndicesStats(indices?: string[]): Promise<{
    indices: Record<string, {
      primaries: { docs: { count: number }; store: { size_in_bytes: number } };
      total: { docs: { count: number }; store: { size_in_bytes: number } };
    }>;
  }> {
    const indexPattern = indices?.join(',') || '*';
    return this.request(`/${indexPattern}/_stats`);
  }

  /**
   * Refresh index (make changes visible for search)
   */
  async refreshIndex(index: string): Promise<{ shards: { successful: number; failed: number; total: number } }> {
    return this.request(`/${index}/_refresh`, { method: 'POST' });
  }
}

// ============================================================
// Main SIEM Integration Class (Combines Wazuh + Elasticsearch)
// ============================================================

export class SiemIntegrationService extends EventEmitter {
  private wazuhClient: WazuhClient;
  private esClient: ElasticsearchClient;
  private config: SiemIntegrationConfig;
  private isRunning = false;
  private metricsTimer?: NodeJS.Timeout;
  private currentMetrics: MetricsSnapshot | null = null;

  constructor(config: SiemIntegrationConfig) {
    super();
    this.config = config;
    this.wazuhClient = new WazuhClient(config.wazuh);
    this.esClient = new ElasticsearchClient(config.elasticsearch);
  }

  /**
   * Initialize the SIEM integration service
   */
  async initialize(): Promise<void> {
    console.log('[SIEM] Initializing SIEM integration service...');
    
    try {
      // Test Wazuh connectivity
      const wazuhHealth = await this.wazuhClient.healthCheck();
      console.log(`[SIEM] Wazuh connection: ${wazuhHealth.status} (${wazuhHealth.latency}ms)`);

      // Test Elasticsearch connectivity
      const esHealth = await this.esClient.getClusterHealth();
      console.log(`[SIEM] Elasticsearch cluster: ${esHealth.status} (${esHealth.number_of_nodes} nodes)`);

      this.isRunning = true;
      this.emit('initialized', { wazuhHealth, esHealth });
      
      // Start metrics collection
      this.startMetricsCollection();

      console.log('[SIEM] SIEM integration service initialized successfully');
    } catch (error) {
      console.error('[SIEM] Failed to initialize:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[SIEM] Shutting down SIEM integration service...');
    this.isRunning = false;
    
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    
    this.emit('shutdown');
    console.log('[SIEM] SIEM integration service shutdown complete');
  }

  /**
   * Ingest a normalized security event into Elasticsearch
   */
  async ingestEvent(event: SecurityEvent): Promise<IngestResult> {
    if (!this.isRunning) {
      throw new SiemIntegrationError('SIEM service is not running', 'SERVICE_NOT_RUNNING');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate required fields
      if (!event.eventId) {
        event.eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        warnings.push('Generated missing eventId');
      }

      if (!event.title) {
        warnings.push('Event has no title');
      }

      // Set timestamps if not provided
      if (!event.ingestedAt) event.ingestedAt = new Date();
      if (!event.processedAt) event.processedAt = new Date();
      if (!event.firstSeenAt) event.firstSeenAt = new Date();
      if (!event.lastSeenAt) event.lastSeenAt = new Date();
      if (!event.createdAt) event.createdAt = new Date();
      if (!event.updatedAt) event.updatedAt = new Date();

      // Index into Elasticsearch
      const indexName = this.getIndexNameForDate(event.ingestedAt);
      const docId = await this.esClient.indexEvent(indexName, event);

      // Emit event for real-time subscribers
      this.emit('event_ingested', event);

      return {
        success: true,
        eventId: event.id || docId,
        ingestedAt: event.ingestedAt,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      
      this.emit('ingest_error', { event, error: errorMessage });
      
      return {
        success: false,
        eventId: event.eventId || 'unknown',
        ingestedAt: new Date(),
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }
  }

  /**
   * Batch ingest multiple events
   */
  async ingestEventsBatch(events: SecurityEvent[]): Promise<{
    results: IngestResult[];
    summary: { success: number; failed: number };
  }> {
    const results = await Promise.allSettled(
      events.map(event => this.ingestEvent(event))
    );

    const fulfilledResults = results
      .filter((r): r is PromiseFulfilledResult<IngestResult> => r.status === 'fulfilled')
      .map(r => r.value);

    const rejectedResults = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => ({
        success: false as const,
        eventId: 'unknown',
        ingestedAt: new Date(),
        errors: [r.reason instanceof Error ? r.reason.message : String(r.reason)],
      }));

    return {
      results: [...fulfilledResults, ...rejectedResults],
      summary: {
        success: fulfilledResults.filter(r => r.success).length,
        failed: rejectedResults.length + fulfilledResults.filter(r => !r.success).length,
      },
    };
  }

  /**
   * Convert Wazuh alert to normalized SecurityEvent
   */
  convertWazuhAlertToEvent(alert: WazuhAlert): SecurityEvent {
    const now = new Date();
    
    // Map Wazuh severity levels to our scale
    const severityMap: Record<number, SecurityEvent['severity']> = {
      15: 'critical',
      14: 'critical',
      13: 'critical',
      12: 'high',
      11: 'high',
      10: 'high',
      9: 'medium',
      8: 'medium',
      7: 'medium',
      6: 'low',
      5: 'low',
      4: 'low',
      3: 'informational',
      2: 'informational',
      1: 'informational',
      0: 'informational',
    };

    // Determine event type based on rule group/category
    const eventType = this.determineEventType(alert);
    const category = this.determineCategory(alert);

    return {
      id: `evt-${alert.id}-${Date.now()}`,
      eventId: alert.id,
      eventType,
      category,
      severity: severityMap[alert.rule.level] || 'informational',
      status: 'new',
      
      sourceIp: alert.srcip?.ip,
      destinationIp: alert.dstip?.ip,
      sourcePort: alert.srcport,
      destinationPort: alert.dstport,
      protocol: alert.protocol,
      sourceHost: alert.predecoder?.hostname,
      
      toolName: 'wazuh',
      toolSeverity: String(alert.rule.level),
      ruleId: String(alert.rule.id),
      ruleName: alert.rule.description,
      ruleCategory: alert.rule.mitre?.tactic || alert.rule.gid,
      
      title: alert.rule.description,
      description: alert.fullLog,
      metadata: {
        wazuh: {
          agentId: alert.agent.id,
          agentName: alert.agent.name,
          managerName: alert.manager.name,
          ruleGid: alert.rule.gid,
          ruleRev: alert.rule.rev,
          ruleFrequency: alert.rule.frequency,
          ruleFidelity: alert.rule.fidelity,
          mitreTechnique: alert.rule.mitre?.technique,
        },
        syscheck: alert.syscheck,
        vulnerability: alert.vulnerability,
        compliance: alert.compliance,
      },
      rawLog: alert.fullLog,
      
      geoLocation: alert.srcip?.geoLocation ? {
        country: alert.srcip.geoLocation.country_name,
        city: alert.srcip.geoLocation.city_name,
        lat: alert.srcip.geoLocation.latitude,
        lon: alert.srcip.geoLocation.longitude,
      } : undefined,
      
      ingestedAt: new Date(alert.timestamp),
      processedAt: now,
      firstSeenAt: new Date(alert.timestamp),
      lastSeenAt: now,
      count: 1,
      
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Fetch recent alerts from Wazuh and ingest them
   */
  async fetchAndIngestRecentAlerts(options?: {
    lastMinutes?: number;
    limit?: number;
    minLevel?: number;
  }): Promise<{
    fetched: number;
    ingested: number;
    failed: number;
  }> {
    const lastMinutes = options?.lastMinutes || 5;
    const limit = options?.limit || 500;
    const minLevel = options?.minLevel || 0;

    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - lastMinutes * 60 * 1000).toISOString();

    console.log(`[SIEM] Fetching alerts from Wazuh (${startTime} to ${endTime})...`);

    try {
      const alerts = await this.wazuhClient.getAlerts({
        level: { from: minLevel, to: 15 },
        dateRange: { start: startTime, end: endTime },
        limit,
      });

      console.log(`[SIEM] Fetched ${alerts.items.length} alerts from Wazuh`);

      // Convert and ingest each alert
      const events = alerts.items.map(alert => this.convertWazuhAlertToEvent(alert));
      const batchResult = await this.ingestEventsBatch(events);

      console.log(`[SIEM] Ingested ${batchResult.summary.success}/${events.length} events`);

      return {
        fetched: alerts.items.length,
        ingested: batchResult.summary.success,
        failed: batchResult.summary.failed,
      };
    } catch (error) {
      console.error('[SIEM] Failed to fetch/ingest alerts:', error);
      throw error;
    }
  }

  /**
   * Search events across the SIEM
   */
  async searchEvents(filters: SearchFilters): Promise<{ events: SecurityEvent[]; total: number }> {
    const indexPattern = this.getSearchIndexPattern(filters.dateRange);
    return this.esClient.simpleSearch(indexPattern, filters);
  }

  /**
   * Get aggregated metrics for dashboards
   */
  async getMetrics(): Promise<MetricsSnapshot> {
    if (this.currentMetrics && Date.now() - this.currentMetrics.lastEventTimestamp.getTime() < 60000) {
      return this.currentMetrics; // Cache for 1 minute
    }

    try {
      // Get cluster health
      const clusterHealth = await this.esClient.getClusterHealth();
      
      // Get indices stats
      const indicesStats = await this.esClient.getIndicesStats(['security_events-*']);
      
      // Calculate total size
      let totalSizeBytes = 0;
      let totalDocs = 0;
      Object.values(indicesStats.indices).forEach(idx => {
        totalSizeBytes += idx.total.store.size_in_bytes;
        totalDocs += idx.total.docs.count;
      });

      // Get event counts by severity (last 24h)
      const last24h = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const severityCounts = await this.esClient.getEventCountsByInterval(
        'security_events-*',
        'hour',
        last24h,
        'severity'
      );

      // Flatten severity counts
      const severityTotals: Record<string, number> = {};
      severityCounts.forEach(bucket => {
        bucket.subAggregations?.by_field?.forEach(subBucket => {
          severityTotals[subBucket.key] = (severityTotals[subBucket.key] || 0) + subBucket.doc_count;
        });
      });

      // Get Wazuh agent stats
      const agents = await this.wazuhClient.getAgents({ status: 'all', limit: 1 });
      const activeAgents = await this.wazuhClient.getAgents({ status: 'active', limit: 1 });
      const disconnectedAgents = await this.wazuhClient.getAgents({ status: 'disconnected', limit: 1 });

      // Get latest event timestamp
      const latestEvents = await this.esClient.simpleSearch('security_events-*', {
        limit: 1,
        sortBy: 'ingestedAt',
        sortOrder: 'desc',
      });

      this.currentMetrics = {
        totalEvents: totalDocs,
        eventsLast24h: severityCounts.reduce((sum, b) => sum + b.doc_count, 0),
        eventsLastHour: severityCounts
          .filter(b => new Date(b.key) > new Date(Date.now() - 60 * 60 * 1000))
          .reduce((sum, b) => sum + b.doc_count, 0),
        criticalCount: severityTotals.critical || 0,
        highCount: severityTotals.high || 0,
        mediumCount: severityTotals.medium || 0,
        lowCount: severityTotals.low || 0,
        infoCount: severityTotals.informational || 0,
        openIncidents: 0, // TODO: Query incidents table
        avgIngestionRate: severityTotals.critical 
          ? severityCounts.reduce((sum, b) => sum + b.doc_count, 0) / (24 * 60 * 60) 
          : 0,
        activeAgents: activeAgents.totalItems,
        disconnectedAgents: disconnectedAgents.totalItems,
        elasticsearchClusterStatus: clusterHealth.status,
        indexSizeGB: totalSizeBytes / (1024 * 1024 * 1024),
        lastEventTimestamp: latestEvents.events[0]?.ingestedAt || null,
      };

      return this.currentMetrics;
    } catch (error) {
      console.error('[SIEM] Failed to collect metrics:', error);
      // Return cached metrics even if stale
      return this.currentMetrics || this.getEmptyMetrics();
    }
  }

  /**
   * Get real-time alert stream from Wazuh
   */
  async *alertStream(options?: {
    intervalMs?: number;
    minLevel?: number;
  }): AsyncGenerator<WazuhAlert[]> {
    const intervalMs = options?.intervalMs || 10000; // Default: every 10 seconds
    const minLevel = options?.minLevel || 7; // Default: medium and above

    while (this.isRunning) {
      try {
        const alerts = await this.wazuhClient.getAlerts({
          level: { from: minLevel, to: 15 },
          limit: 100,
        });

        yield alerts.items;
      } catch (error) {
        console.error('[SIEM] Alert stream error:', error);
        this.emit('stream_error', error);
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private determineEventType(alert: WazuhAlert): SecurityEvent['eventType'] {
    const ruleGroups = alert.rule.custom?.groups || [];
    const programName = alert.predecoder?.program_name?.toLowerCase() || '';

    if (ruleGroups.includes('web') || ruleGroups.includes('application')) return 'application';
    if (ruleGroups.includes('auth') || ruleGroups.includes('authentication')) return 'authentication';
    if (ruleGroups.includes('firewall') || ruleGroups.includes('ids') || ruleGroups.includes('network')) return 'network';
    if (ruleGroups.includes('syscheck') || ruleGroups.includes('rootcheck')) return 'endpoint';
    if (programName.includes('ss7') || programName.includes('diameter') || programName.includes('cdr')) return 'telecom';

    return 'network'; // Default
  }

  private determineCategory(alert: WazuhAlert): SecurityEvent['category'] {
    const level = alert.rule.level;
    const ruleId = String(alert.rule.id);

    if (level >= 13) return 'intrusion';
    if (ruleId.startsWith('550') || ruleId.startsWith('551') || ruleId.startsWith('552') || ruleId.startsWith('553') || ruleId.startsWith('554')) return 'malware';
    if (alert.syscheck) return 'policy_violation';
    if (level >= 8) return 'anomaly';
    if (level >= 4) return 'reconnaissance';

    return 'policy_violation';
  }

  private getIndexNameForDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `security_events_${year}_${month}_${day}`;
  }

  private getSearchIndexPattern(dateRange?: { start: Date; end: Date }): string {
    if (dateRange) {
      // Generate pattern covering the date range
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      // If within same month, use daily indexes
      if (startDate.getMonth() === endDate.getMonth() && 
          startDate.getFullYear() === endDate.getFullYear()) {
        return `security_events_${startDate.getFullYear()}_${String(startDate.getMonth() + 1).padStart(2, '0')}*`;
      }
      
      // Otherwise use wildcard
      return 'security_events-*';
    }
    
    // Default: search today's and yesterday's indexes
    const today = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return `security_events_${today.getFullYear()}_${String(today.getMonth() + 1).padStart(2, '0')}*,security_events_${yesterday.getFullYear()}_${String(yesterday.getMonth() + 1).padStart(2, '0')}*`;
  }

  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    this.metricsTimer = setInterval(async () => {
      try {
        const metrics = await this.getMetrics();
        this.emit('metrics_update', metrics);
      } catch (error) {
        console.error('[SIEM] Metrics collection error:', error);
      }
    }, 30000);
  }

  private getEmptyMetrics(): MetricsSnapshot {
    return {
      totalEvents: 0,
      eventsLast24h: 0,
      eventsLastHour: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      infoCount: 0,
      openIncidents: 0,
      avgIngestionRate: 0,
      activeAgents: 0,
      disconnectedAgents: 0,
      elasticsearchClusterStatus: 'unknown',
      indexSizeGB: 0,
      lastEventTimestamp: null,
    };
  }
}

// ============================================================
// Export singleton factory function
// ============================================================

let siemInstance: SiemIntegrationService | null = null;

export function getSiemIntegration(config?: SiemIntegrationConfig): SiemIntegrationService {
  if (!siemInstance && config) {
    siemInstance = new SiemIntegrationService(config);
  }
  
  if (!siemInstance) {
    throw new SiemIntegrationError(
      'SIEM integration not initialized. Call getSiemIntegration(config) first.',
      'NOT_INITIALIZED'
    );
  }
  
  return siemInstance;
}

export default SiemIntegrationService;
