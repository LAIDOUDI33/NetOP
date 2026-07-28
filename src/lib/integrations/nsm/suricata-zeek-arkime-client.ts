/**
 * Suricata + Zeek + Arkime NSM Integration Client
 * Phase 11: Enterprise Network Security Monitoring
 * 
 * Features:
 * - Suricata IDS/IPS alert management and EVE JSON parsing
 * - Zeek (Bro) network metadata analysis and log ingestion
 * - Arkime (formerly Moloch) PCAP search and full packet capture
 * - Real-time network traffic analysis with protocol decoding
 * - Telco-specific: SS7/Diameter/SIP/GTP protocol monitoring
 * - Network-based IOC detection and threat hunting
 * - PCAP extraction for forensic analysis
 * 
 * Scale Targets:
 * - 100Gbps+ network throughput monitoring
 * - 1M+ alerts/day processing
 * - <1s alert-to-detection latency
 * - 30-day PCAP retention (adjustable)
 * 
 * @version 1.0.0
 * @license Proprietary - Djezzy National SOC Platform
 */

import { EventEmitter } from 'events';

// ============================================================
// Types & Interfaces
// ============================================================

export interface SuricataConfig {
  apiUrl: string;              // Suricata API or socket path
  eveLogPath?: string;        // Path to EVE JSON log file/socket
  rulesPath?: string;         // Path to rules directory
  threshold?: number;         // Alert threshold for escalation
  timeout?: number;
}

export interface ZeekConfig {
  controllerUrl?: string;     // Zeek cluster controller URL
  agentUrls?: string[];       // Individual Zeek agent URLs
  logDirectory?: string;      // Directory for Zeek logs
  scriptsPath?: string;       // Custom Zeek scripts path
  timeout?: number;
}

export interface ArkimeConfig {
  apiUrl: string;             // Arkime viewer/ELK API URL
  apiKey?: string;            // Authentication key
  esNodes?: string[];          // Direct Elasticsearch nodes (optional)
  sessionTimeout?: number;    // Session view timeout in ms
  maxPcapSize?: number;       // Max PCAP download size in bytes
}

export interface NsmIntegrationConfig {
  suricata: SuricataConfig;
  zeek: ZeekConfig;
  arkime: ArkimeConfig;
  kafka?: {
    brokers: string[];
    alertsTopic: string;      // e.g., "nsm.alerts"
    metadataTopic: string;    // e.g., "nsm.metadata"
    pcapsTopic: string;       // e.g., "nsm.pcaps"
  };
  enableAutoEscalation?: boolean;
  telcoProtocols?: {
    ss7Enabled: boolean;
    diameterEnabled: boolean;
    sipEnabled: boolean;
    gtpEnabled: boolean;
  };
}

// Suricata Models
export interface SuricataAlert {
  alertId: string;
  timestamp: string;
  sourceIp: string;
  sourcePort: number;
  destinationIp: string;
  destinationPort: number;
  protocol: string;
  alert: {
    action: string;           // allowed, blocked, alerted
    gid: number;              // Rule group ID
    signature_id: number;     // Signature ID
    rev: number;              // Rule revision
    signature: string;        // Rule name/description
    category: string;         // Alert category
    severity: number;         // 1-7 (1=critical)
    metadata?: Record<string, any>;
  };
  // Extended fields from EVE JSON
  flow?: {
    id: string;               // Flow ID for correlation
    start_time: string;
    end_time?: string;
    app_proto?: string;
    pkts_toserver: number;
    pkts_toclient: number;
    bytes_toserver: number;
    bytes_toclient: number;
  };
  payload?: string;           // Packet payload (if captured)
  packet_info?: {
    linktype: number;
    version: number;
  };
  // Telco enrichment
  subscriberInfo?: {
    msisdn?: string;
    imsi?: string;
    imei?: string;
    cellId?: string;
    lac?: string;
  };
  geoLocation?: {
    srcCountry?: string;
    srcCity?: string;
    dstCountry?: string;
    dstCity?: string;
    srcCoords?: [number, number];
    dstCoords?: [number, number];
  };
  // SOC linkage
  incidentId?: string;
  caseId?: string;
  escalated?: boolean;
  falsePositive?: boolean;
}

export interface SuricataRule {
  sid: number;                // Signature ID
  rev: number;                // Revision
  action: string;             // alert, pass, drop, reject
  protocol: string;           // tcp, udp, icmp, ip, any
  source: {                  // Source address/port
    ip: string;
    port: string | number;
    negated?: boolean;
  };
  destination: {             // Destination address/port
    ip: string;
    port: string | number;
    negated?: boolean;
  };
  options: Array<{
    keyword: string;
    arguments?: string;
  }>;
  // Metadata
  msg: string;                // Rule message
  classtype?: string;         // Classification type
  metadata?: Record<string, any>;
  priority?: number;          // Priority level
  // Status
  enabled: boolean;
  lastModified?: string;
  modifiedBy?: string;
}

// Zeek Models
export interface ZeekLogEntry {
  _path: string;              // Log type: conn, dns, http, ssl, files, etc.
  _time: string;              // ISO timestamp
  _uid: string;               // Unique connection ID
  
  // Common connection fields (conn.log)
  id_orig_h?: string;         // Source IP
  id_orig_p?: number;         // Source port
  id_resp_h?: string;         // Dest IP
  id_resp_p?: number;         // Dest port
  proto?: string;             // tcp, udp, icmp
  service?: string;           // Detected service
  duration?: number;          // Connection duration
  orig_bytes?: number;        // Bytes client->server
  resp_bytes?: number;        // Bytes server->client
  conn_state?: string;        // Connection state
  local_orig?: boolean;       // Local originator
  local_resp?: boolean;       // Local responder
  missed_bytes?: number;      // Missed bytes in capture
  history?: string;           // Connection flags history
  
  // DNS fields (dns.log)
  query?: string;             // Domain queried
  qclass?: number;            // Query class
  qclass_name?: string;       // Query class name
  qtype?: number;             // Query type
  qtype_name?: string;        // Query type name
  rcode?: number;             // Response code
  rcode_name?: string;        // Response code name
  answers?: string[];          // DNS answers
  TTl?: number;               // TTL value
  
  // HTTP fields (http.log)
  method?: string;            // HTTP method
  host?: string;              // Host header
  uri?: string;               // URI
  referrer?: string;          // Referrer
  user_agent?: string;        // User agent
  status_code?: number;       // Status code
  status_msg?: string;        // Status message
  request_body_len?: number;  // Request body size
  response_body_len?: number; // Response body size
  
  // SSL/TLS fields (ssl.log)
  server_name?: string;       // SNI
  cipher?: string;            // Cipher suite
  version?: string;           // TLS version
  cert_chain_fuids?: string[]; // Certificate chain IDs
  subject?: string;           // Certificate subject
  issuer?: string;            // Certificate issuer
  
  // Files fields (files.log)
  fuid?: string;              // File unique ID
  filename?: string;          // File name
  source?: string;            // File source
  mime_type?: string;         // MIME type
  md5?: string;               // MD5 hash
  sha256?: string;            // SHA256 hash
  size?: number;              // File size
  
  // Telco-specific custom fields
  telecom_protocol?: 'ss7' | 'diameter' | 'sip' | 'gtp' | 'none';
  subscriber_msisdn?: string;
  cell_tower_id?: string;
  
  // Enrichment
  threat_intel_match?: {
    iocType: string;
    iocValue: string;
    source: string;
    confidence: number;
  };
}

// Arkime Models
export interface ArkimeSession {
  sessionId: string;          // Unique session ID
  firstPacket: string;        // First packet timestamp
  lastPacket: string;         // Last packet timestamp
  sourceIp: string;
  sourcePort: number;
  destinationIp: string;
  destinationPort: number;
  protocol: string;
  packets: number;            // Total packets
  bytes: number;              // Total bytes
  rootNode: string;           // Root node ID
  // Arkime-specific
  hostname?: string;          // Source hostname (if available)
  serverHostname?: string;    // Dest hostname
  tags?: string[];            // Tags applied to session
  // Telco context
  subscriberInfo?: {
    msisdn?: string;
    imsi?: string;
  };
  networkSegment?: string;    // Core, RAN, Transport, etc.
}

export interface PcapRequest {
  sessionId: string;
  startTime?: string;
  endTime?: string;
  maxBytes?: number;
  filters?: {
    sourceIp?: string;
    destIp?: string;
    sourcePort?: number;
    destPort?: number;
    protocol?: string;
    contains?: string;        // Content filter
    bpf?: string;             // BPF filter expression
  };
  format?: 'pcap' | 'pcapng';
  requestedBy: string;
  reason: string;
}

// NSM Unified Models
export interface NsmEvent {
  eventId: string;
  source: 'suricata' | 'zeek' | 'arkime' | 'correlated';
  eventType: 'alert' | 'metadata' | 'anomaly' | 'exfiltration' | 'reconnaissance';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  timestamp: string;
  // Network context
  sourceIp: string;
  sourcePort?: number;
  destinationIp: string;
  destinationPort?: number;
  protocol: string;
  // Raw data references
  suricataAlert?: SuricataAlert;
  zeekLog?: ZeekLogEntry;
  arkimeSession?: ArkimeSession;
  // Enrichment
  threatIntelMatch?: {
    iocType: 'ip' | 'domain' | 'hash' | 'url' | 'email';
    iocValue: string;
    feedName: string;
    confidence: number;
    severity: string;
    firstSeen: string;
    lastSeen: string;
    description: string;
  };
  geoData?: {
    srcCountry: string;
    srcCity: string;
    dstCountry: string;
    dstCity: string;
    asn: number;
    asName: string;
  };
  // Actions taken
  autoBlocked?: boolean;
  escalatedToIncident?: boolean;
  incidentId?: string;
  caseId?: string;
}

// NSM Statistics
export interface NsmStatistics {
  suricata: {
    alertsPerSecond: number;
    totalAlertsToday: number;
    topSignatures: Array<{ sid: number; count: number }>;
    topSourceIps: Array<{ ip: string; count: number }>;
    topDestPorts: Array<{ port: number; count: number }>;
    droppedPackets: number;
    captureStatus: 'running' | 'stopped' | 'error';
  };
  zeek: {
    connectionsTracked: number;
    logsGenerated: {
      conn: number;
      dns: number;
      http: number;
      ssl: number;
      files: number;
    };
    unusualProtocolsDetected: number;
    dataTransferVolume: number; // bytes
  };
  arkime: {
    sessionsCaptured: number;
    pcapSizeGb: number;
    retentionDays: number;
    activeQueries: number;
  };
  overall: {
    eventsProcessedToday: number;
    uniqueSourceIps: number;
    uniqueDestinations: number;
    averageThroughputGbps: number;
    detectionLatencyMs: number;
  };
}

// ============================================================
// NSM Client Class
// ============================================================

export class SuricataZeekArkimeClient extends EventEmitter {
  private config: NsmIntegrationConfig;
  private isConnected: boolean = false;
  private eventBuffer: NsmEvent[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;
  
  // Statistics
  public stats: NsmStatistics = this.initializeStats();

  constructor(config: NsmIntegrationConfig) {
    super();
    this.config = config;

    // Set up internal event handlers
    this.on('error', (err) => {
      console.error('[NSM] Error:', err.message);
    });

    this.on('alert', (event: NsmEvent) => {
      console.log(`[NSM] Alert (${event.severity}): ${event.title}`);
      
      // Auto-escalation logic
      if (this.config.enableAutoEscalation && event.severity === 'critical') {
        this.escalateEvent(event);
      }
    });

    // Start buffer flush interval (every 5 seconds)
    this.bufferFlushInterval = setInterval(() => this.flushEventBuffer(), 5000);
  }

  // ============================================================
  // Connection Management
  // ============================================================

  /**
   * Initialize connections to all NSM components
   */
  async connect(): Promise<void> {
    try {
      console.log('[NSM] Initializing NSM integrations...');

      // Test Suricata connection
      console.log('[NSM] Connecting to Suricata at', this.config.suricata.apiUrl);
      const suricataHealth = await this.fetchSuricata('/health');
      if (suricataHealth.ok) {
        console.log('[NSM] Suricata connected successfully');
      } else {
        console.warn('[NSM] Suricata health check returned:', suricataHealth.status);
      }

      // Test Zeek controller (if configured)
      if (this.config.zeek.controllerUrl) {
        console.log('[NSM] Testing Zeek controller...');
        const zeekHealth = await this.fetchZeek('/health');
        if (zeekHealth.ok) {
          console.log('[NSM] Zeek controller connected');
        } else {
          console.warn('[NSM] Zeek controller unavailable, using log-based mode');
        }
      }

      // Test Arkime connection
      console.log('[NSM] Connecting to Arkime at', this.config.arkime.apiUrl);
      const arkimeHealth = await this.fetchArkime('/api/session?startDate=2024-01-01&stopDate=2024-01-02&length=1');
      if (arkimeHealth.ok || arkimeHealth.status === 401) { // 401 means auth required but service is up
        console.log('[NSM] Arkime connected successfully');
      } else {
        console.warn('[NSM] Arkime health check returned:', arkimeHealth.status);
      }

      this.isConnected = true;

      // Start real-time event streams if configured
      if (this.config.suricata.eveLogPath) {
        this.startEveJsonStream();
      }

      this.emit('connected', {
        suricata: true,
        zeek: !!this.config.zeek.controllerUrl,
        arkime: true,
        timestamp: new Date(),
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
    this.isConnected = false;
    
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
      this.bufferFlushInterval = null;
    }

    // Flush remaining events
    await this.flushEventBuffer();

    this.emit('disconnected', { timestamp: new Date() });
    console.log('[NSM] Disconnected from all NSM services');
  }

  get connectionStatus(): boolean {
    return this.isConnected;
  }

  // ============================================================
  // Suricata Operations
  // ============================================================

  /**
   * Get Suricata alerts with filtering and pagination
   */
  async getAlerts(params: {
    startTime?: string;
    endTime?: string;
    severity?: number[];       // 1-7 (1 is most severe)
    signatureId?: number[];
    sourceIp?: string;
    destIp?: string;
    destPort?: number[];
    protocol?: string[];
    action?: ('alerted' | 'blocked')[];
    limit?: number;
    offset?: number;
    sortBy?: 'timestamp' | 'severity' | 'source_ip';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ alerts: SuricataAlert[]; total: number }> {
    const {
      startTime,
      endTime,
      severity,
      signatureId,
      sourceIp,
      destIp,
      destPort,
      protocol,
      action,
      limit = 100,
      offset = 0,
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = params;

    try {
      // Build query parameters for Elasticsearch/EVE JSON query
      const queryParams: Record<string, any> = {
        size: limit,
        from: offset,
        sort: [{ [sortBy]: { order: sortOrder } }],
        _source: ['*'], // Return all fields
      };

      // Build bool query for filtering
      const must: any[] = [];
      const filter: any[] = [];

      // Time range
      if (startTime || endTime) {
        filter.push({
          range: {
            timestamp: {
              ...(startTime && { gte: startTime }),
              ...(endTime && { lte: endTime }),
            },
          },
        });
      }

      // Severity filter
      if (severity && severity.length > 0) {
        must.push({ terms: { 'alert.severity': severity } });
      }

      // Signature ID filter
      if (signatureId && signatureId.length > 0) {
        must.push({ terms: { 'alert.signature_id': signatureId } });
      }

      // IP filters
      if (sourceIp) {
        must.push({ term: { 'src_ip': sourceIp } });
      }
      if (destIp) {
        must.push({ term: { 'dest_ip': destIp } });
      }

      // Port filter
      if (destPort && destPort.length > 0) {
        must.push({ terms: { 'dest_port': destPort } });
      }

      // Protocol filter
      if (protocol && protocol.length > 0) {
        must.push({ terms: { 'proto': protocol.map(p => p.toLowerCase()) } });
      }

      // Action filter
      if (action && action.length > 0) {
        must.push({ terms: { 'alert.action': action } });
      }

      // Combine into query
      if (must.length > 0 || filter.length > 0) {
        queryParams.query = { bool: { must, filter } };
      }

      const response = await this.fetchSuricata('/alerts/search', {
        method: 'POST',
        body: JSON.stringify(queryParams),
      });

      if (!response.ok) {
        throw new Error(`Suricata alert search failed: ${response.status}`);
      }

      const data = await response.json();
      const alerts: SuricataAlert[] = (data.hits?.hits || []).map((hit: any) =>
        this.transformSuricataAlert(hit._source)
      );

      return {
        alerts,
        total: data.hits?.total?.value || alerts.length,
      };

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get Suricata statistics for dashboard
   */
  async getSuricataStats(): Promise<NsmStatistics['suricata']> {
    try {
      const response = await this.fetchSuricata('/stats');

      if (!response.ok) {
        throw new Error(`Failed to get Suricata stats: ${response.status}`);
      }

      const data = await response.json();

      return {
        alertsPerSecond: data.max_alert_threshold || 0,
        totalAlertsToday: data.total_alerts_today || 0,
        topSignatures: data.top_signatures || [],
        topSourceIps: data.top_src_ips || [],
        topDestPorts: data.top_dst_ports || [],
        droppedPackets: data.dropped_packets || 0,
        captureStatus: data.capture_status || 'running',
      };

    } catch (error) {
      this.emit('error', error);
      return this.stats.suricata;
    }
  }

  /**
   * Manage Suricata rules
   */
  async getRules(params: {
    enabled?: boolean;
    category?: string;
    search?: string;
    limit?: number;
  } = {}): Promise<SuricataRule[]> {
    const { enabled, category, search, limit = 500 } = params;

    try {
      const response = await this.fetchSuricata(
        `/rules?limit=${limit}${enabled !== undefined ? `&enabled=${enabled}` : ''}` +
        `${category ? `&category=${category}` : ''}` +
        `${search ? `&search=${encodeURIComponent(search)}` : ''}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get rules: ${response.status}`);
      }

      const data = await response.json();
      return (data.rules || []).map((r: any) => this.transformSuricataRule(r));

    } catch (error) {
      this.emit('error', error);
      return [];
    }
  }

  /**
   * Add/update a Suricata rule
   */
  async updateRule(rule: Partial<SuricataRule> & Pick<SuricataRule, 'sid'>): Promise<SuricataRule> {
    try {
      const response = await this.fetchSuricata(`/rules/${rule.sid}`, {
        method: 'PUT',
        body: JSON.stringify(rule),
      });

      if (!response.ok) {
        throw new Error(`Failed to update rule ${rule.sid}: ${response.status}`);
      }

      const updated = await response.json();
      this.emit('ruleUpdated', rule.sid);

      return this.transformSuricataRule(updated);

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Toggle rule enable/disable
   */
  async toggleRule(sid: number, enabled: boolean): Promise<void> {
    try {
      const response = await this.fetchSuricata(`/rules/${sid}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle rule ${sid}: ${response.status}`);
      }

      this.emit('ruleToggled', { sid, enabled });

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // ============================================================
  // Zeek Operations
  // ============================================================

  /**
   * Query Zeek logs with flexible filtering
   */
  async queryZeekLogs<T extends ZeekLogEntry>(params: {
    logType: '_path';         // conn, dns, http, ssl, files, etc.
    startTime?: string;
    endTime?: string;
    filters?: Array<{
      field: keyof T;
      operator: 'eq' | 'neq' | 'contains' | 'in' | 'gt' | 'lt' | 'exists';
      value: any;
    }>;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: T[]; total: number }> {
    const {
      logType,
      startTime,
      endTime,
      filters = [],
      limit = 100,
      offset = 0,
    } = params;

    try {
      // Build Zeek query (using Zeek's JSON API or direct log search)
      const query: Record<string, any> = {
        log_type: logType,
        from: offset,
        count: limit,
        time_range: {
          ...(startTime && { from: startTime }),
          ...(endTime && { to: endTime }),
        },
        where: filters.map(f => ({
          field: f.field,
          op: f.operator,
          value: f.value,
        })),
      };

      const response = await this.fetchZeek('/logs/query', {
        method: 'POST',
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error(`Zeek log query failed: ${response.status}`);
      }

      const data = await response.json();
      const logs: T[] = (data.logs || []).map((log: any) => ({
        ...log,
        _time: new Date(log._time * 1000).toISOString(), // Convert Unix epoch to ISO
      }));

      return {
        logs,
        total: data.total || logs.length,
      };

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get Zeek connection summary with anomaly detection
   */
  async getConnectionSummary(params: {
    sourceIp?: string;
    destIp?: string;
    timeRangeMinutes?: number;
  } = {}): Promise<{
    totalConnections: number;
    uniqueDestinations: number;
    protocols: Record<string, number>;
    topTalkers: Array<{ ip: string; bytes: number; connections: number }>;
    anomalies: Array<{
      type: string;
      description: string;
      severity: string;
      evidence: Record<string, any>;
    }>;
  }> {
    const { sourceIp, destIp, timeRangeMinutes = 60 } = params;

    try {
      // Query connection logs
      const { logs } = await this.queryZeekLogs<ZeekLogEntry>({
        logType: 'conn',
        startTime: new Date(Date.now() - timeRangeMinutes * 60000).toISOString(),
        filters: [
          ...(sourceIp ? [{ field: 'id_orig_h' as const, operator: 'eq' as const, value: sourceIp }] : []),
          ...(destIp ? [{ field: 'id_resp_h' as const, operator: 'eq' as const, value: destIp }] : []),
        ],
        limit: 10000,
      });

      // Analyze connections
      const protocols: Record<string, number> = {};
      const talkerMap = new Map<string, { bytes: number; connections: number }>();
      const anomalies: Array<{
        type: string;
        description: string;
        severity: string;
        evidence: Record<string, any>;
      }> = [];

      for (const conn of logs) {
        // Protocol distribution
        const proto = conn.proto || 'unknown';
        protocols[proto] = (protocols[proto] || 0) + 1;

        // Top talkers
        const srcIp = conn.id_orig_h!;
        const existing = talkerMap.get(srcIp) || { bytes: 0, connections: 0 };
        existing.bytes += (conn.resp_bytes || 0) + (conn.orig_bytes || 0);
        existing.connections += 1;
        talkerMap.set(srcIp, existing);

        // Anomaly detection
        this.detectConnectionAnomalies(conn, anomalies);
      }

      // Sort talkers by bytes
      const topTalkers = Array.from(talkerMap.entries())
        .map(([ip, stats]) => ({ ip, ...stats }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 20);

      return {
        totalConnections: logs.length,
        uniqueDestinations: new Set(logs.map(l => l.id_resp_h)).size,
        protocols,
        topTalkers,
        anomalies,
      };

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get DNS query analytics
   */
  async getDnsAnalytics(params: {
    timeRangeHours?: number;
    domainFilter?: string;
    excludeInternal?: boolean;
  } = {}): Promise<{
    totalQueries: number;
    uniqueDomains: number;
    topDomains: Array<{ domain: string; queries: number; uniqueIps: number }>;
    suspiciousDomains: Array<{
      domain: string;
      queries: number;
      ips: string[];
      reason: string;
    }>;
    queryTypes: Record<string, number>;
  }> {
    const { timeRangeHours = 24, domainFilter, excludeInternal = true } = params;

    try {
      const { logs } = await this.queryZeekLogs<ZeekLogEntry>({
        logType: 'dns',
        startTime: new Date(Date.now() - timeRangeHours * 3600000).toISOString(),
        filters: [
          ...(domainFilter ? [{ field: 'query' as const, operator: 'contains' as const, value: domainFilter }] : []),
        ],
        limit: 50000,
      });

      const domainMap = new Map<string, { count: number; ips: Set<string> }>();
      const queryTypes: Record<string, number> = {};
      const suspiciousDomains: Array<{
        domain: string;
        queries: number;
        ips: string[];
        reason: string;
      }> = [];

      for (const entry of logs) {
        const domain = entry.query?.toLowerCase() || '';
        if (!domain) continue;

        // Skip internal domains if requested
        if (excludeInternal && (domain.endsWith('.local') || domain.endsWith('.internal'))) {
          continue;
        }

        const existing = domainMap.get(domain) || { count: 0, ips: new Set() };
        existing.count += 1;
        if (entry.id_resp_h) existing.ips.add(entry.id_resp_h);
        domainMap.set(domain, existing);

        // Query types
        const qt = entry.qtype_name || `type-${entry.qtype}`;
        queryTypes[qt] = (queryTypes[qt] || 0) + 1;

        // Suspicious domain detection
        this.analyzeDnsDomain(entry, domain, suspiciousDomains);
      }

      // Sort by query count
      const topDomains = Array.from(domainMap.entries())
        .map(([domain, data]) => ({ domain, queries: data.count, uniqueIps: data.ips.size }))
        .sort((a, b) => b.queries - a.queries)
        .slice(0, 50);

      return {
        totalQueries: logs.length,
        uniqueDomains: domainMap.size,
        topDomains,
        suspiciousDomains: suspiciousDomains.slice(0, 20),
        queryTypes,
      };

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get file transfer analytics
   */
  async getFileTransfers(params: {
    timeRangeHours?: number;
    minSizeMb?: number;
    mimeTypes?: string[];
  } = {}): Promise<{
    totalFiles: number;
    totalSizeBytes: number;
    fileTypes: Record<string, number>;
    largeFiles: Array<ZeekLogEntry>;
    suspiciousFiles: Array<{
      file: ZeekLogEntry;
      reason: string;
      riskLevel: string;
    }>;
  }> {
    const { timeRangeHours = 24, minSizeMb = 10, mimeTypes } = params;

    try {
      const { logs } = await this.queryZeekLogs<ZeekLogEntry>({
        logType: 'files',
        startTime: new Date(Date.now() - timeRangeHours * 3600000).toISOString(),
        limit: 10000,
      });

      let totalSizeBytes = 0;
      const fileTypes: Record<string, number> = {};
      const largeFiles: ZeekLogEntry[] = [];
      const suspiciousFiles: Array<{
        file: ZeekLogEntry;
        reason: string;
        riskLevel: string;
      }> = [];

      for (const file of logs) {
        const size = file.size || 0;
        const mime = file.mime_type || 'unknown';
        
        totalSizeBytes += size;
        fileTypes[mime] = (fileTypes[mime] || 0) + 1;

        // Large file detection
        if (size >= minSizeMb * 1024 * 1024) {
          largeFiles.push(file);
        }

        // Suspicious file detection
        this.analyzeFile(file, suspiciousFiles);
      }

      // Filter by MIME type if specified
      let filteredLogs = logs;
      if (mimeTypes && mimeTypes.length > 0) {
        filteredLogs = logs.filter(f => 
          f.mime_type && mimeTypes.some(m => f.mime_type!.includes(m))
        );
      }

      return {
        totalFiles: filteredLogs.length,
        totalSizeBytes,
        fileTypes,
        largeFiles: largeFiles.sort((a, b) => (b.size || 0) - (a.size || 0)).slice(0, 50),
        suspiciousFiles: suspiciousFiles.slice(0, 20),
      };

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // ============================================================
  // Arkime (PCAP) Operations
  // ============================================================

  /**
   * Search sessions in Arkime for PCAP retrieval
   */
  async searchSessions(params: {
    startTime: string;
    endTime: string;
    searchString?: string;    // Full-text search across packets
    sourceIp?: string;
    destIp?: string;
    sourcePort?: number;
    destPort?: number;
    protocol?: string;
    minPackets?: number;
    minBytes?: number;
    tags?: string[];
    length?: number;         // Max results (default: 100)
    start?: number;          // Pagination offset
  }): Promise<{ sessions: ArkimeSession[]; totalRecords: number; graphHisto?: any[] }> {
    const {
      startTime,
      endTime,
      searchString,
      sourceIp,
      destIp,
      sourcePort,
      destPort,
      protocol,
      minPackets,
      minBytes,
      tags,
      length = 100,
      start = 0,
    } = params;

    try {
      // Build Arkime session search expression
      const expressions: string[] = [];
      
      if (searchString) expressions.push(searchString);
      if (sourceIp) expressions.push(`ip == ${sourceIp}`);
      if (destIp) expressions.push(`ip == ${destIp}`);
      if (sourcePort) expressions.push(`port == ${sourcePort}`);
      if (destPort) expressions.push(`port == ${destPort}`);
      if (protocol) expressions.push(`protocol == ${protocol}`);
      if (minPackets) expressions.push(`packets >= ${minPackets}`);
      if (minBytes) expressions.push(`bytes >= ${minBytes}`);
      if (tags && tags.length > 0) {
        expressions.push(`tags == ${tags.join(',')}`);
      }

      const expression = expressions.join(' && ') || 'exists: ip';

      const queryParams = new URLSearchParams({
        startDate: startTime.split('T')[0],
        stopDate: endTime.split('T')[0],
        expression,
        length: length.toString(),
        start: start.toString(),
        fields: 'id,firstPacket,lastPacket,sourceIp,sourcePort,destinationIp,destinationPort,protocol,packets,bytes,rootId,tags,hostname,serverHostname',
      });

      const response = await this.fetchArkime(`/api/sessions?${queryParams}`);

      if (!response.ok) {
        throw new Error(`Arkime session search failed: ${response.status}`);
      }

      const data = await response.json();
      const sessions: ArkimeSession[] = (data.data || []).map(this.transformArkimeSession);

      return {
        sessions,
        totalRecords: data.total || data.recordsFiltered || sessions.length,
        graphHisto: data.graphHisto || data.map,
      };

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Request PCAP download for a session
   */
  async requestPcap(request: PcapRequest): Promise<{
    success: boolean;
    downloadUrl?: string;
    fileSize?: number;
    expiresAt?: string;
  }> {
    try {
      const queryParams = new URLSearchParams({
        sessionId: request.sessionId,
        ...(request.startTime && { startTime: request.startTime }),
        ...(request.endTime && { endTime: request.endTime }),
        format: request.format || 'pcap',
        maxBytes: (request.maxBytes || 100 * 1024 * 1024).toString(), // 100MB default
      });

      // Build BPF filter if provided
      if (request.filters) {
        const bpfParts: string[] = [];
        if (request.filters.sourceIp) bpfParts.push(`host ${request.filters.sourceIp}`);
        if (request.filters.destIp) bpfParts.push(`host ${request.filters.destIp}`);
        if (request.filters.sourcePort) bpfParts.push(`port ${request.filters.sourcePort}`);
        if (request.filters.destPort) bpfParts.push(`port ${request.filters.destPort}`);
        if (request.filters.protocol) bpfParts.push(`${request.filters.protocol}`);
        if (request.filters.bpf) bpfParts.push(request.filters.bpf);
        
        if (bpfParts.length > 0) {
          queryParams.set('bpf', bpfParts.join(' and '));
        }
      }

      const response = await this.fetchArkime(`/api/pcap?${queryParams}`);

      if (!response.ok) {
        throw new Error(`PCAP request failed: ${response.status}`);
      }

      // Generate download URL
      const downloadUrl = `/api/v1/nsm/pcap/${request.sessionId}?${queryParams}`;

      // Log the PCAP access
      this.emit('pcapRequested', {
        sessionId: request.sessionId,
        requestedBy: request.requestedBy,
        reason: request.reason,
        timestamp: new Date(),
      });

      return {
        success: true,
        downloadUrl,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour expiry
      };

    } catch (error) {
      this.emit('error', error);
      return { success: false };
    }
  }

  /**
   * Get session detail with packet-level information
   */
  async getSessionDetail(sessionId: string): Promise<{
    session: ArkimeSession;
    packets: Array<{
      number: number;
      timestamp: string;
      sourceIp: string;
      sourcePort: number;
      destIp: string;
      destPort: number;
      protocol: string;
      length: number;
      flags?: string;
      info?: string;
    }>;
    SPIGraph?: any;           // Session Packet Info graph data
  }> {
    try {
      // Get session details
      const sessionResponse = await this.fetchArkime(`/api/session/${sessionId}`);
      if (!sessionResponse.ok) {
        throw new Error(`Failed to get session: ${sessionResponse.status}`);
      }
      const sessionData = await sessionResponse.json();

      // Get packets for this session
      const packetsResponse = await this.fetchArkime(
        `/api/session/${sessionId}/packets?length=10000`
      );
      if (!packetsResponse.ok) {
        throw new Error(`Failed to get packets: ${packetsResponse.status}`);
      }
      const packetsData = await packetsResponse.json();

      return {
        session: this.transformArkimeSession(sessionData),
        packets: (packetsData.packets || packetsData || []).map((p: any) => ({
          number: p.num || p.number,
          timestamp: p.timestamp || p.ts,
          sourceIp: p.src_ip || p.sourceIp,
          sourcePort: p.src_port || p.sourcePort,
          destIp: p.dst_ip || p.destIp,
          destPort: p.dst_port || p.destPort,
          protocol: p.proto || p.protocol,
          length: p.len || p.length,
          flags: p.flags,
          info: p.info,
        })),
        SPIGraph: sessionData.spiGraph || sessionData.spigraph,
      };

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // ============================================================
  // Correlation & Threat Hunting
  // ============================================================

  /**
   * Correlate events across all NSM sources for unified view
   */
  async correlateEvents(params: {
    sourceIp?: string;
    destIp?: string;
    domain?: string;
    hash?: string;
    timeRangeMinutes?: number;
  }): Promise<NsmEvent[]> {
    const { sourceIp, destIp, domain, hash, timeRangeMinutes = 60 } = params;
    const correlatedEvents: NsmEvent[] = [];
    const startTime = new Date(Date.now() - timeRangeMinutes * 60000).toISOString();

    // Search Suricata alerts
    if (sourceIp || destIp) {
      try {
        const { alerts } = await this.getAlerts({
          startTime,
          sourceIp,
          destIp,
          limit: 50,
        });

        for (const alert of alerts) {
          correlatedEvents.push({
            eventId: `sur-${alert.alertId}`,
            source: 'suricata',
            eventType: 'alert',
            severity: this.mapSeverity(alert.alert.severity),
            title: alert.alert.signature,
            description: alert.alert.category,
            timestamp: alert.timestamp,
            sourceIp: alert.sourceIp,
            sourcePort: alert.sourcePort,
            destinationIp: alert.destinationIp,
            destinationPort: alert.destinationPort,
            protocol: alert.protocol,
            suricataAlert: alert,
          });
        }
      } catch (e) {
        console.warn('[NSM] Suricata correlation error:', e.message);
      }
    }

    // Search Zeek logs for DNS/HTTP/SSL context
    if (domain || sourceIp || destIp) {
      try {
        // DNS lookups
        if (domain) {
          const { logs: dnsLogs } = await this.queryZeekLogs<ZeekLogEntry>({
            logType: 'dns',
            startTime,
            filters: [{
              field: 'query' as const,
              operator: 'contains' as const,
              value: domain,
            }],
            limit: 50,
          });

          for (const log of dnsLogs) {
            correlatedEvents.push({
              eventId: `dns-${log._uid}`,
              source: 'zeek',
              eventType: 'metadata',
              severity: 'info',
              title: `DNS Query: ${log.query}`,
              description: `DNS ${log.qtype_name} query for ${log.query}`,
              timestamp: log._time,
              sourceIp: log.id_orig_h!,
              sourcePort: log.id_orig_p,
              destinationIp: log.id_resp_h!,
              destinationPort: log.id_resp_p,
              protocol: log.proto || 'udp',
              zeekLog: log,
            });
          }
        }

        // HTTP connections
        if (sourceIp || destIp) {
          const { logs: httpLogs } = await this.queryZeekLogs<ZeekLogEntry>({
            logType: 'http',
            startTime,
            filters: [
              ...(sourceIp ? [{ field: 'id_orig_h' as const, operator: 'eq' as const, value: sourceIp }] : []),
              ...(destIp ? [{ field: 'id_resp_h' as const, operator: 'eq' as const, value: destIp }] : []),
            ],
            limit: 50,
          });

          for (const log of httpLogs) {
            correlatedEvents.push({
              eventId: `http-${log._uid}`,
              source: 'zeek',
              eventType: log.status_code && log.status_code >= 400 ? 'anomaly' : 'metadata',
              severity: log.status_code && log.status_code >= 500 ? 'medium' : 'info',
              title: `HTTP ${log.method} ${log.host}${log.uri}`,
              description: `${log.method} ${log.uri} -> ${log.status_code} ${log.status_msg}`,
              timestamp: log._time,
              sourceIp: log.id_orig_h!,
              sourcePort: log.id_orig_p,
              destinationIp: log.id_resp_h!,
              destinationPort: log.id_resp_p,
              protocol: 'tcp',
              zeekLog: log,
            });
          }
        }
      } catch (e) {
        console.warn('[NSM] Zeek correlation error:', e.message);
      }
    }

    // Search Arkime for PCAP sessions
    if (sourceIp || destIp) {
      try {
        const { sessions } = await this.searchSessions({
          startTime,
          endTime: new Date().toISOString(),
          sourceIp,
          destIp,
          length: 20,
        });

        for (const session of sessions) {
          correlatedEvents.push({
            eventId: `ark-${session.sessionId}`,
            source: 'arkime',
            eventType: 'metadata',
            severity: 'info',
            title: `PCAP Session: ${session.sourceIp}:${session.sourcePort} → ${session.destinationIp}:${session.destinationPort}`,
            description: `${session.packets} packets, ${session.bytes} bytes`,
            timestamp: session.firstPacket,
            sourceIp: session.sourceIp,
            sourcePort: session.sourcePort,
            destinationIp: session.destinationIp,
            destinationPort: session.destinationPort,
            protocol: session.protocol,
            arkimeSession: session,
          });
        }
      } catch (e) {
        console.warn('[NSM] Arkime correlation error:', e.message);
      }
    }

    // Sort by timestamp descending
    correlatedEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return correlatedEvents;
  }

  /**
   * Execute pre-built threat hunt queries
   */
  async runThreatHunt(huntType: keyof typeof ThreatHuntPresets, targetIp?: string): Promise<{
    huntName: string;
    findings: NsmEvent[];
    riskScore: number;
    recommendations: string[];
  }> {
    const preset = ThreatHuntPresets[huntType];
    if (!preset) {
      throw new Error(`Unknown hunt type: ${huntType}`);
    }

    const findings: NsmEvent[] = [];

    // Execute each query in the preset
    for (const query of preset.queries) {
      switch (query.type) {
        case 'suricata':
          try {
            const { alerts } = await this.getAlerts({
              startTime: new Date(Date.now() - preset.timeRangeHours * 3600000).toISOString(),
              ...(targetIp && { sourceIp: targetIp }),
              signatureId: query.signatureIds,
              limit: 100,
            });
            
            findings.push(...alerts.map(a => ({
              eventId: `hunt-sur-${a.alertId}`,
              source: 'suricata' as const,
              eventType: 'alert' as const,
              severity: this.mapSeverity(a.alert.severity),
              title: `[Hunt] ${a.alert.signature}`,
              description: preset.description,
              timestamp: a.timestamp,
              sourceIp: a.sourceIp,
              sourcePort: a.sourcePort,
              destinationIp: a.destinationIp,
              destinationPort: a.destinationPort,
              protocol: a.protocol,
              suricataAlert: a,
            })));
          } catch (e) {
            console.error(`[NSM] Hunt query error (${query.type}):`, e.message);
          }
          break;

        case 'zeek-dns':
          try {
            const { logs } = await this.queryZeekLogs<ZeekLogEntry>({
              logType: 'dns',
              startTime: new Date(Date.now() - preset.timeRangeHours * 3600000).toISOString(),
              filters: targetIp ? [{
                field: 'id_orig_h' as const,
                operator: 'eq' as const,
                value: targetIp,
              }] : [],
              limit: 200,
            });

            findings.push(...logs.filter(l => 
              this.matchesDnsPattern(l, query.patterns || [])
            ).map(l => ({
              eventId: `hunt-dns-${l._uid}`,
              source: 'zeek' as const,
              eventType: 'reconnaissance' as const,
              severity: 'medium',
              title: `[Hunt] Suspicious DNS: ${l.query}`,
              description: preset.description,
              timestamp: l._time,
              sourceIp: l.id_orig_h!,
              sourcePort: l.id_orig_p,
              destinationIp: l.id_resp_h!,
              destinationPort: l.id_resp_p,
              protocol: 'udp',
              zeekLog: l,
            })));
          } catch (e) {
            console.error(`[NSM] Hunt query error (${query.type}):`, e.message);
          }
          break;

        case 'zeek-files':
          try {
            const { logs } = await this.queryZeekLogs<ZeekLogEntry>({
              logType: 'files',
              startTime: new Date(Date.now() - preset.timeRangeHours * 3600000).toISOString(),
              limit: 100,
            });

            findings.push(...logs.filter(l => 
              (l.size || 0) > (query.minSizeMb || 10) * 1024 * 1024 ||
              query.mimeTypes?.includes(l.mime_type || '')
            ).map(l => ({
              eventId: `hunt-file-${l.fuid}`,
              source: 'zeek' as const,
              eventType: 'exfiltration' as const,
              severity: 'high',
              title: `[Hunt] Large/Suspicious File: ${l.filename}`,
              description: `${l.filename} (${l.mime_type}, ${(l.size || 0) / 1024 / 1024} MB)`,
              timestamp: l._time,
              sourceIp: '', // Files don't always have IP context
              protocol: 'tcp',
              zeekLog: l,
            })));
          } catch (e) {
            console.error(`[NSM] Hunt query error (${query.type}):`, e.message);
          }
          break;

        case 'arkime':
          if (targetIp) {
            try {
              const { sessions } = await this.searchSessions({
                startTime: new Date(Date.now() - preset.timeRangeHours * 3600000).toISOString(),
                endTime: new Date().toISOString(),
                sourceIp: targetIp,
                minBytes: query.minBytes || 1048576, // 1MB default
                length: 30,
              });

              findings.push(...sessions.map(s => ({
                eventId: `hunt-ark-${s.sessionId}`,
                source: 'arkime' as const,
                eventType: 'exfiltration' as const,
                severity: s.bytes > 104857600 ? 'critical' : 'high', // >100MB = critical
                title: `[Hunt] High-volume Session: ${s.bytes} bytes`,
                description: `${s.sourceIp} → ${s.destinationIp}, ${s.packets} packets`,
                timestamp: s.firstPacket,
                sourceIp: s.sourceIp,
                sourcePort: s.sourcePort,
                destinationIp: s.destinationIp,
                destinationPort: s.destinationPort,
                protocol: s.protocol,
                arkimeSession: s,
              })));
            } catch (e) {
              console.error(`[NSM] Hunt query error (${query.type}):`, e.message);
            }
          }
          break;
      }
    }

    // Calculate risk score based on findings
    const riskScore = Math.min(100, findings.reduce((score, f) => {
      switch (f.severity) {
        case 'critical': return score + 25;
        case 'high': return score + 15;
        case 'medium': return score + 8;
        case 'low': return score + 3;
        default: return score + 1;
      }
    }, 0));

    return {
      huntName: preset.name,
      findings,
      riskScore,
      recommendations: preset.recommendations,
    };
  }

  // ============================================================
  // Statistics & Health
  // ============================================================

  /**
   * Comprehensive NSM statistics
   */
  async getFullStats(): Promise<NsmStatistics> {
    try {
      // Gather stats from all sources in parallel
      const [suricataStats] = await Promise.all([
        this.getSuricataStats(),
        // Zeek and Arkime stats would be fetched similarly
      ]);

      this.stats.suricata = suricataStats;
      this.stats.overall.eventsProcessedToday = suricataStats.totalAlertsToday;

      return this.stats;

    } catch (error) {
      this.emit('error', error);
      return this.stats;
    }
  }

  /**
   * Health check for all NSM components
   */
  async healthCheck(): Promise<{
    suricata: { status: 'healthy' | 'degraded' | 'unhealthy'; latency: number; alertsPerSec: number };
    zeek: { status: 'healthy' | 'degraded' | 'unhealthy'; latency: number; logsPerSec: number };
    arkime: { status: 'healthy' | 'degraded' | 'unhealthy'; latency: number; captureRunning: boolean };
    overall: 'operational' | 'degraded' | 'down';
  }> {
    const checks = await Promise.allSettled([
      this.checkSuricataHealth(),
      this.checkZeekHealth(),
      this.checkArkimeHealth(),
    ]);

    const suricata = checks[0].status === 'fulfilled' ? checks[0].value : { status: 'unhealthy' as const, latency: -1, alertsPerSec: 0 };
    const zeek = checks[1].status === 'fulfilled' ? checks[1].value : { status: 'unhealthy' as const, latency: -1, logsPerSec: 0 };
    const arkime = checks[2].status === 'fulfilled' ? checks[2].value : { status: 'unhealthy' as const, latency: -1, captureRunning: false };

    const healthyCount = [suricata, zeek, arkime].filter(c => c.status === 'healthy').length;
    
    return {
      suricata,
      zeek,
      arkime,
      overall: healthyCount === 3 ? 'operational' : healthyCount >= 2 ? 'degraded' : 'down',
    };
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private async fetchSuricata(path: string, init: RequestInit = {}): Promise<Response> {
    const url = `${this.config.suricata.apiUrl.replace(/\/$/, '')}${path}`;
    return fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string>),
      },
      signal: AbortSignal.timeout(this.config.suricata.timeout || 30000),
    });
  }

  private async fetchZeek(path: string, init: RequestInit = {}): Promise<Response> {
    if (!this.config.zeek.controllerUrl) {
      throw new Error('Zeek controller not configured');
    }
    const url = `${this.config.zeek.controllerUrl.replace(/\/$/, '')}${path}`;
    return fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string>),
      },
      signal: AbortSignal.timeout(this.config.zeek.timeout || 30000),
    });
  }

  private async fetchArkime(path: string, init: RequestInit = {}): Promise<Response> {
    const url = `${this.config.arkime.apiUrl.replace(/\/$/, '')}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    };

    if (this.config.arkime.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.arkime.apiKey}`;
    }

    return fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(this.config.arkime.sessionTimeout || 60000),
    });
  }

  private transformSuricataAlert(raw: any): SuricataAlert {
    return {
      alertId: raw._id || raw.alert_id || `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: raw.timestamp || raw.@timestamp,
      sourceIp: raw.src_ip || raw.sourceIp,
      sourcePort: raw.src_port || raw.sourcePort,
      destinationIp: raw.dest_ip || raw.destinationIp,
      destinationPort: raw.dest_port || raw.destinationPort,
      protocol: raw.proto || raw.protocol,
      alert: raw.alert || {},
      flow: raw.flow,
      payload: raw.payload,
      packet_info: raw.packet,
      geoLocation: raw.geoip_data || raw.geo_data,
    };
  }

  private transformSuricataRule(raw: any): SuricataRule {
    return {
      sid: raw.sid,
      rev: raw.rev || 1,
      action: raw.action || 'alert',
      protocol: raw.protocol || 'any',
      source: raw.source || { ip: 'any', port: 'any' },
      destination: raw.destination || { ip: 'any', port: 'any' },
      options: raw.options || [],
      msg: raw.msg || raw.signature || '',
      classtype: raw.classtype,
      metadata: raw.metadata,
      priority: raw.priority,
      enabled: raw.enabled !== false,
      lastModified: raw.last_modified,
      modifiedBy: raw.modified_by,
    };
  }

  private transformArkimeSession(raw: any): ArkimeSession {
    return {
      sessionId: raw.id || raw.sessionId,
      firstPacket: raw.firstPacket || raw.firstpacket,
      lastPacket: raw.lastPacket || raw.lastpacket,
      sourceIp: raw.sourceIp || raw.src_ip,
      sourcePort: raw.sourcePort || raw.src_port,
      destinationIp: raw.destinationIp || raw.dst_ip,
      destinationPort: raw.destinationPort || raw.dst_port,
      protocol: raw.protocol || raw.proto,
      packets: raw.packets || raw.packetCount || 0,
      bytes: raw.bytes || raw.byteCount || 0,
      rootNode: raw.rootId || raw.rootnode,
      hostname: raw.hostname,
      serverHostname: raw.serverHostname || raw.serverhostname,
      tags: raw.tags || [],
    };
  }

  private mapSeverity(suricataSeverity: number): NsmEvent['severity'] {
    if (suricataSeverity <= 1) return 'critical';
    if (suricataSeverity <= 2) return 'high';
    if (suricataSeverity <= 4) return 'medium';
    if (suricataSeverity <= 6) return 'low';
    return 'info';
  }

  private initializeStats(): NsmStatistics {
    return {
      suricata: {
        alertsPerSecond: 0,
        totalAlertsToday: 0,
        topSignatures: [],
        topSourceIps: [],
        topDestPorts: [],
        droppedPackets: 0,
        captureStatus: 'running',
      },
      zeek: {
        connectionsTracked: 0,
        logsGenerated: {
          conn: 0,
          dns: 0,
          http: 0,
          ssl: 0,
          files: 0,
        },
        unusualProtocolsDetected: 0,
        dataTransferVolume: 0,
      },
      arkime: {
        sessionsCaptured: 0,
        pcapSizeGb: 0,
        retentionDays: 30,
        activeQueries: 0,
      },
      overall: {
        eventsProcessedToday: 0,
        uniqueSourceIps: 0,
        uniqueDestinations: 0,
        averageThroughputGbps: 0,
        detectionLatencyMs: 0,
      },
    };
  }

  private detectConnectionAnomalies(conn: ZeekLogEntry, anomalies: any[]): void {
    // Data exfiltration indicators
    if ((conn.resp_bytes || 0) > 104857600) { // >100MB upload
      anomalies.push({
        type: 'data_exfil',
        description: `Large data transfer detected: ${(conn.resp_bytes! / 1024 / 1024).toFixed(2)} MB to ${conn.id_resp_h}`,
        severity: 'high',
        evidence: conn,
      });
    }

    // Port scanning indicators
    if (conn.conn_state === 'S0') { // SYN only - potential scan
      anomalies.push({
        type: 'port_scan',
        description: `Potential SYN scan from ${conn.id_orig_h} to ${conn.id_resp_h}:${conn.id_resp_p}`,
        severity: 'medium',
        evidence: conn,
      });
    }

    // Long-lived connection (potential tunnel/C2)
    if ((conn.duration || 0) > 86400) { // >24 hours
      anomalies.push({
        type: 'persistent_connection',
        description: `Long-lived connection: ${conn.duration}s duration to ${conn.id_resp_h}`,
        severity: 'medium',
        evidence: conn,
      });
    }

    // Unusual protocol combinations
    if (conn.service && !['http', 'dns', 'ssl', 'ssh', 'ftp', 'smtp'].includes(conn.service)) {
      anomalies.push({
        type: 'unusual_protocol',
        description: `Unusual service detected: ${conn.service} on ${conn.id_resp_h}:${conn.id_resp_p}`,
        severity: 'low',
        evidence: conn,
      });
    }
  }

  private analyzeDnsDomain(entry: ZeekLogEntry, domain: string, results: any[]): void {
    // DGA (Domain Generation Algorithm) indicators
    const dgaPatterns = /^[a-z]{12,20}\.(com|net|org|ru|tk|ml|ga|cf)$/i;
    if (dgaPatterns.test(domain)) {
      results.push({
        domain,
        queries: 1,
        ips: entry.answers || [entry.id_resp_h].filter(Boolean),
        reason: 'Possible DGA domain (random-looking TLD)',
      });
    }

    // Newly registered / uncommon TLDs
    const riskyTlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.pw', '.top', '.xyz'];
    if (riskyTlds.some(tld => domain.endsWith(tld))) {
      results.push({
        domain,
        queries: 1,
        ips: entry.answers || [entry.id_resp_h].filter(Boolean),
        reason: `Risky TLD used: ${domain.split('.').pop()}`,
      });
    }

    // High query frequency would be tracked at aggregation level
  }

  private analyzeFile(file: ZeekLogEntry, results: any[]): void {
    const filename = (file.filename || '').toLowerCase();
    const mime = (file.mime_type || '').toLowerCase();

    // Executable files over web
    if (mime.includes('executable') || filename.match(/\.(exe|dll|bat|ps1|vbs|scr|msi)$/)) {
      results.push({
        file,
        reason: 'Executable file transferred',
        riskLevel: 'high',
      });
    }

    // Archive files with passwords (potential ransomware)
    if (mime.includes('archive') || filename.match(/\.(zip|rar|7z|tar)/)) {
      results.push({
        file,
        reason: 'Archive file transferred (check contents)',
        riskLevel: 'medium',
      });
    }

    // Sensitive file patterns
    if (filename.match(/(password|credential|secret|private\.key|backup)/)) {
      results.push({
        file,
        reason: 'Sensitive filename pattern detected',
        riskLevel: 'critical',
      });
    }
  }

  private matchesDnsPattern(entry: ZeekLogEntry, patterns: string[]): boolean {
    const domain = (entry.query || '').toLowerCase();
    return patterns.some(p => domain.includes(p.toLowerCase()));
  }

  private escalateEvent(event: NsmEvent): void {
    event.escalatedToIncident = true;
    this.emit('escalationRequired', event);
    console.log(`[NSM] 🔥 CRITICAL EVENT ESCALATED: ${event.title}`);
  }

  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToSend = [...this.eventBuffer];
    this.eventBuffer = [];

    // In production, send to Kafka or directly to database
    if (this.config.kafka) {
      // Send to Kafka topic
      this.emit('eventsFlushed', { count: eventsToSend.length, topic: this.config.kafka.alertsTopic });
    }

    console.log(`[NSM] Flushed ${eventsToSend.length} events`);
  }

  private startEveJsonStream(): void {
    console.log('[NSM] EVE JSON streaming not implemented in browser environment');
    // In Node.js, this would use fs.watch or tail -f on the EVE JSON file/socket
  }

  private async checkSuricataHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latency: number; alertsPerSec: number }> {
    const start = Date.now();
    try {
      const res = await this.fetchSuricata('/health');
      const latency = Date.now() - start;
      const data = await res.json();
      return {
        status: res.ok ? 'healthy' : 'degraded',
        latency,
        alertsPerSec: data.alerts_per_sec || 0,
      };
    } catch {
      return { status: 'unhealthy', latency: Date.now() - start, alertsPerSec: 0 };
    }
  }

  private async checkZeekHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latency: number; logsPerSec: number }> {
    const start = Date.now();
    try {
      const res = await this.fetchZeek('/health');
      const latency = Date.now() - start;
      return {
        status: res.ok ? 'healthy' : 'degraded',
        latency,
        logsPerSec: 0, // Would come from actual metrics endpoint
      };
    } catch {
      return { status: 'unhealthy', latency: Date.now() - start, logsPerSec: 0 };
    }
  }

  private async checkArkimeHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latency: number; captureRunning: boolean }> {
    const start = Date.now();
    try {
      const res = await this.fetchArkime('/api/status');
      const latency = Date.now() - start;
      const data = await res.json();
      return {
        status: res.ok ? 'healthy' : 'degraded',
        latency,
        captureRunning: data.running || data.capture?.status === 'running',
      };
    } catch {
      return { status: 'unhealthy', latency: Date.now() - start, captureRunning: false };
    }
  }
}

// ============================================================
// Pre-built Threat Hunt Presets
// ============================================================

const ThreatHuntPresets = {
  data_exfiltration: {
    name: 'Data Exfiltration Detection',
    description: 'Hunt for signs of data leaving the network',
    timeRangeHours: 24,
    queries: [
      { type: 'suricata', signatureIds: [2013025, 2020433] }, // Known exfil signatures
      { type: 'zeek-files', minSizeMb: 50, mimeTypes: ['archive', 'application/x-zip-compressed'] },
      { type: 'arkime', minBytes: 52428800 }, // >50MB sessions
    ],
    recommendations: [
      'Review large file transfers for business justification',
      'Check if endpoints involved have EDR alerts',
      'Investigate destination IPs against threat intel feeds',
      'Consider implementing DLP controls if not already in place',
    ],
  },

  command_and_control: {
    name: 'Command & Control Communication',
    description: 'Detect C2 beaconing and callback activity',
    timeRangeHours: 48,
    queries: [
      { type: 'suricata', signatureIds: [2830119, 2830120] }, // C2 signatures
      { type: 'zeek-dns', patterns: ['.tk', '.ml', '.ga', 'beacon.', 'c2.'] },
      { type: 'arkime', minBytes: 0 }, // All sessions for pattern analysis
    ],
    recommendations: [
      'Analyze DNS query patterns for algorithmic generation (DGA)',
      'Check for consistent timing intervals (beaconing)',
      'Correlate source IPs with known compromised hosts',
      'Block identified C2 domains at firewall/proxy',
    ],
  },

  lateral_movement: {
    name: 'Lateral Movement Detection',
    description: 'Identify potential lateral movement within the network',
    timeRangeHours: 72,
    queries: [
      { type: 'suricata', signatureIds: [2825121, 2825122] }, // SMB/WinRM exploitation
      { type: 'arkime', minBytes: 0 }, // Internal high-port scanning
    ],
    recommendations: [
      'Review authentication logs for affected systems',
      'Check for credential dumping tools via EDR',
      'Isolate affected segments until investigation complete',
      'Review network segmentation effectiveness',
    ],
  },

  initial_access: {
    name: 'Initial Access & Phishing',
    description: 'Detect initial compromise vectors including phishing',
    timeRangeHours: 168, // 7 days
    queries: [
      { type: 'suricata', signatureIds: [2010944, 2011528] }, // Phishing kit signatures
      { type: 'zeek-dns', patterns: ['phishing', 'malware', 'exploit'] },
      { type: 'zeek-files', mimeTypes: ['application/pdf', 'office', 'executable'] },
    ],
    recommendations: [
      'Quarantine suspicious email attachments',
      'Review email gateway logs for delivery details',
      'Check user training records for phishing awareness',
      'Update email filtering rules based on IOCs found',
    ],
  },

  telco_fraud: {
    name: 'Telecom Fraud Indicators',
    description: 'Detect SIM swapping, IRSF, Wangiri fraud patterns',
    timeRangeHours: 24,
    queries: [
      { type: 'suricata', signatureIds: [] }, // Custom telco fraud signatures
      { type: 'zeek-dns', patterns: ['voip', 'sip', 'ss7', 'diameter'] },
      { type: 'arkime', minBytes: 0 },
    ],
    recommendations: [
      'Cross-reference with fraud management system alerts',
      'Check for abnormal call patterns (IRSF indicators)',
      'Review SIM provisioning audit logs',
      'Coordinate with revenue assurance team',
    ],
  },
};

// Export singleton factory
let nsmInstance: SuricataZeekArkimeClient | null = null;

export function createNsmClient(config: NsmIntegrationConfig): SuricataZeekArkimeClient {
  if (!nsmInstance) {
    nsmInstance = new SuricataZeekArkimeClient(config);
  }
  return nsmInstance;
}

export default SuricataZeekArkimeClient;
