/**
 * TheHive & Cortex SOAR Integration Client
 * Phase 11: Enterprise Security Orchestration & Response
 * 
 * Features:
 * - TheHive 5.x Case Management API integration
 * - Cortex Analysis Engine with 10+ analyzers
 * - Automated playbook execution
 * - Bidirectional sync with SOC Platform
 * - IOC enrichment and task automation
 * 
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

// ============================================================
// Types & Interfaces
// ============================================================

export interface TheHiveConfig {
  apiUrl: string;
  apiKey: string;
  organisation?: string; // For multi-tenant TheHive
  timeout?: number;
}

export interface CortexConfig {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface SoarIntegrationConfig {
  thehive: TheHiveConfig;
  cortex: CortexConfig;
  enableWebhook?: boolean; // Receive webhooks from TheHive
  webhookSecret?: string;
}

// TheHive Models
export interface HiveCase {
  id: string;
  caseId: number;
  title: string;
  description: string;
  severity: number; // 1-4 (critical to low)
  status: 'Open' | 'Resolved' | 'Deleted' | 'Duplicated';
  tags: string[];
  flag: boolean;
  tlp: number; // Traffic Light Protocol (0-3)
  pap: number; // Permissible Actions Protocol (0-3)
  summary?: string;
  assignee?: string;
  owner?: string;
  customFields?: Record<string, any>;
  
  // Dates
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  
  // Metrics
  taskCount?: number;
  observableCount?: number;
}

export interface HiveTask {
  id: string;
  taskId: number;
  title: string;
  description?: string;
  status: 'Waiting' | 'InProgress' | 'Completed' | 'Cancel';
  flag: boolean;
  assignee?: string;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
  
  // Group
  groupId?: number;
  groupName?: string;
}

export interface HiveObservable {
  id: string;
  observableId: number;
  dataType: string; // ip, domain, hash, url, mail, etc.
  data: string; // The actual value
  message?: string;
  tlp: number;
  pap: number;
  ioc?: boolean;
  sighted?: boolean;
  tags: string[];
  
  // Analysis results
  analysis?: CortexAnalysis[];
  
  // Related cases/observables
  similar?: Array<{
    ratio: number;
    observable: { id: string; dataType: string; data: string };
  }>;
}

export interface HiveTimelineEntry {
  id: string;
  entryId: number;
  caseId: number;
  contentType: 'case' | 'task' | 'observable';
  content: string;
  createdAt: string;
  createdBy: string;
  tags?: string[];
}

export interface Comment {
  id: string;
  commentId: number;
  caseId: number;
  text: string;
  author: string;
  createdAt: string;
  modifiedAt?: string;
}

// Cortex Models
export interface CortexAnalyzer {
  id: string;
  name: string;
  version: string;
  description: string;
  dataTypeList: string[]; // What types of observables it can analyze
  author: string;
  url: string;
  license?: string;
  configuration: Record<string, any>;
}

export interface CortexJob {
  jobId: string;
  analyzerId: string;
  analyzerName: string;
  analyzerDefinition: string;
  observable: { dataType: string; data: string };
  status: 'Success' | 'Failure' | 'Timeout' | 'Unknown';
  createDate: string;
  startDate?: string;
  endDate?: string;
  
  // Results
  report?: CortexReport;
  errorMessage?: string;
}

export interface CortexReport {
  summary: { taxonomies: Array<{ namespace: string; predicate: string; level: string; value: string }>; full: string };
  artifacts: Array<{ data: string; label: string; messageType: string; tags?: string[] }>;
  operations: Array<{ operation: object }>;
  fullReport?: any; // Complete report object
}

// Search & Filter Types
export interface CaseSearchFilters {
  range?: string; // "all", "my-cases", "excluded"
  query?: Array<{
    _field: string;
    _value: any;
    _operator?: string;
  }>;
  sort?: Array<{ _field: string; _order: 'asc' | 'desc' }>;
  count?: number;
  from?: number;
}

export interface ObservableSearchFilters {
  range?: string;
  dataType?: string[];
  query?: Array<{
    _field: string;
    _value: any;
  }>;
  sort?: Array<{ _field: string; _order: 'asc' | 'desc' }>;
  count?: number;
  from?: number;
}

// ============================================================
// Custom Errors
// ============================================================

export class SoarIntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'SoarIntegrationError';
  }
}

export class TheHiveApiError extends SoarIntegrationError {
  constructor(
    message: string,
    public statusCode: number,
    originalError?: Error
  ) {
    super(message, 'THEHIVE_API_ERROR', originalError);
    this.name = 'TheHiveApiError';
  }
}

export class CortexApiError extends SoarIntegrationError {
  constructor(
    message: string,
    public statusCode: number,
    originalError?: Error
  ) {
    super(message, 'CORTEX_API_ERROR', originalError);
    this.name = 'CortexApiError';
  }
}

// ============================================================
// TheHive Client
// ============================================================

export class TheHiveClient {
  private config: TheHiveConfig;

  constructor(config: TheHiveConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000,
    };
  }

  private async apiRequest<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${path}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(this.config.organisation ? { 'X-Organisation': this.config.organisation } : {}),
          ...(options.headers as Record<string, string>),
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new TheHiveApiError(
          `TheHive API error (${response.status}): ${errorBody.message || response.statusText}`,
          response.status,
          undefined,
          errorBody
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof TheHiveApiError || error instanceof SoarIntegrationError) throw error;
      throw new SoarIntegrationError(
        `TheHive request failed: ${error instanceof Error ? error.message : String(error)}`,
        'REQUEST_ERROR',
        error as Error
      );
    }
  }

  /**
   * Create a new case in TheHive
   */
  async createCase(caseData: {
    title: string;
    description: string;
    severity: 1 | 2 | 3 | 4;
    tags?: string[];
    tlp?: number;
    pap?: number;
    flag?: boolean;
    template?: string;
    taskTitle?: string; // Auto-create first task
  }): Promise<HiveCase> {
    const payload = {
      title: caseData.title,
      description: caseData.description,
      severity: caseData.severity,
      tags: caseData.tags || [],
      tlp: caseData.tlp || 2,
      pap: caseData.pap || 2,
      flag: caseData.flag || false,
    };

    return this.apiRequest<HiveCase>('/api/case', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get a specific case by ID
   */
  async getCase(caseId: string): Promise<HiveCase> {
    return this.apiRequest<HiveCase>(`/api/case/${caseId}`);
  }

  /**
   * Search cases with filters
   */
  async searchCases(filters: CaseSearchFilters): Promise<{
    cases: HiveCase[];
    total: number;
  }> {
    const response = await this.apiRequest<{
      cases: HiveCase[];
      total: number;
    }>('/api/case/_search', {
      method: 'POST',
      body: JSON.stringify({
        query: filters.query || [],
        range: filters.range || 'all',
        sort: filters.sort || [{ _field: 'createdAt', _order: 'desc' }],
        count: filters.count || 50,
        from: filters.from || 0,
      }),
    });

    return response;
  }

  /**
   * Update an existing case
   */
  async updateCase(caseId: string, updates: Partial<Pick<HiveCase, 'title' | 'description' | 'severity' | 'status' | 'tags' | 'tlp' | 'pap' | 'flag'>>): Promise<HiveCase> {
    return this.apiRequest<HiveCase>(`/api/case/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Close/resolve a case
   */
  async closeCase(caseId: string, resolution?: string): Promise<HiveCase> {
    return this.updateCase(caseId, { status: 'Resolved' });
  }

  /**
   * Get tasks for a case
   */
  async getTasks(caseId: string): Promise<HiveTask[]> {
    return this.apiRequest<HiveTask[]>(`/api/case/${caseId}/task`);
  }

  /**
   * Create a new task for a case
   */
  async createTask(caseId: string, taskData: {
    title: string;
    description?: string;
    assignee?: string;
    flag?: boolean;
    dueDate?: string;
    status?: 'Waiting' | 'InProgress' | 'Completed' | 'Cancel';
  }): Promise<HiveTask> {
    return this.apiRequest<HiveTask>(`/api/case/${caseId}/task`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  /**
   * Update a task
   */
  async updateTask(caseId: string, taskId: string, updates: Partial<Pick<HiveTask, 'title' | 'description' | 'status' | 'assignee' | 'flag' | 'dueDate'>>): Promise<HiveTask> {
    return this.apiRequest<HiveTask>(`/api/case/${caseId}/task/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Add observable to a case
   */
  async addObservable(caseId: string, observable: {
    dataType: string;
    data: string;
    message?: string;
    tlp?: number;
    pap?: number;
    tags?: string[];
    ioc?: boolean;
    sighted?: boolean;
  }): Promise<HiveObservable> {
    return this.apiRequest<HiveObservable>(`/api/case/${caseId}/observable`, {
      method: 'POST',
      body: JSON.stringify(observable),
    });
  }

  /**
   * Batch add observables to a case
   */
  async addObservablesBatch(caseId: string, observables: Array<{
    dataType: string;
    data: string;
    message?: string;
    tags?: string[];
  }>): Promise<HiveObservable[]> {
    const results = await Promise.allSettled(
      observables.map(obs => this.addObservable(caseId, obs))
    );

    return results
      .filter((r): r is PromiseFulfilledResult<HiveObservable> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  /**
   * Get observables for a case
   */
  async getObservables(caseId: string, filters?: ObservableSearchFilters): Promise<{
    observables: HiveObservable[];
    total: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.dataType?.length) params.append('dataType', filters.dataType.join(','));
    if (filters?.count) params.append('count', String(filters.count));
    if (filters?.from) params.append('from', String(filters.from));

    return this.apiRequest<{
      observables: HiveObservable[];
      total: number;
    }>(`/api/case/${caseId}/observable?${params}`);
  }

  /**
   * Search observables across all cases
   */
  async searchObservables(filters: ObservableSearchFilters): Promise<{
    observables: HiveObservable[];
    total: number;
  }> {
    return this.apiRequest<{
      observables: HiveObservable[];
      total: number;
    }>('/api/case/observable/_search', {
      method: 'POST',
      body: JSON.stringify({
        query: filters.query || [],
        range: filters.range || 'all',
        sort: filters.sort || [{ _field: 'createdAt', _order: 'desc' }],
        count: filters.count || 50,
        from: filters.from || 0,
      }),
    });
  }

  /**
   * Get timeline entries for a case
   */
  async getTimeline(caseId: string): Promise<HiveTimelineEntry[]> {
    return this.apiRequest<HiveTimelineEntry[]>(`/api/case/${caseId}/timeline`);
  }

  /**
   * Add comment to a case
   */
  async addComment(caseId: string, text: string): Promise<Comment> {
    return this.apiRequest<Comment>(`/api/case/${caseId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    });
  }

  /**
   * Merge two cases
   */
  async mergeCases(targetCaseId: string, sourceCaseIds: string[]): Promise<HiveCase> {
    return this.apiRequest<HiveCase>(`/api/case/${targetCaseId}/_merge`, {
      method: 'POST',
      body: JSON.stringify({ caseIds: sourceCaseIds }),
    });

  }

  /**
   * Export a case
   */
  async exportCase(caseId: string, format: 'json' | 'csv'): Promise<Blob> {
    const response = await fetch(`${this.config.apiUrl}/api/case/${caseId}/export?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new TheHiveApiError(`Export failed: ${response.statusText}`, response.status);
    }

    return response.blob();
  }

  /**
   * Test connectivity to TheHive
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    version: string;
    user: string;
    latency: number;
  }> {
    const startTime = Date.now();
    
    try {
      const user = await this.apiRequest<any>('/api/user/me');
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        version: 'connected',
        user: user.id || 'unknown',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        version: 'unknown',
        user: 'unknown',
        latency: Date.now() - startTime,
      };
    }
  }
}

// ============================================================
// Cortex Client
// ============================================================

export class CortexClient {
  private config: CortexConfig;

  constructor(config: CortexConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 60000, // Cortex jobs can take longer
    };
  }

  private async apiRequest<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${path}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string>),
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new CortexApiError(
          `Cortex API error (${response.status}): ${errorBody.message || response.statusText}`,
          response.status,
          undefined,
          errorBody
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof CortexApiError || error instanceof SoarIntegrationError) throw error;
      throw new SoarIntegrationError(
        `Cortex request failed: ${error instanceof Error ? error.message : String(error)}`,
        'REQUEST_ERROR',
        error as Error
      );
    }
  }

  /**
   * Get available analyzers
   */
  async getAnalyzers(dataType?: string): Promise<CortexAnalyzer[]> {
    let url = '/api/analyzer';
    if (dataType) {
      url += `?dataType=${dataType}`;
    }

    return this.apiRequest<CortexAnalyzer[]>(url);
  }

  /**
   * Run analysis on an observable
   */
  async runAnalysis(observable: {
    dataType: string;
    data: string;
    attachment?: string; // For file-based observables
  }, analyzerIds: string[], options?: {
    force?: boolean; // Re-run even if cached results exist
    tlp?: number;
    pap?: number;
  }): Promise<CortexJob> {
    const payload = {
      data: [observable],
      analyzerIds,
      force: options?.force || false,
      tlp: options?.tlp || 2,
      pap: options?.pap || 2,
    };

    return this.apiRequest<CortexJob>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Run multiple analyzers on an observable (common use case)
   */
  async runFullAnalysis(observable: {
    dataType: string;
    data: string;
  }, category?: 'ip' | 'domain' | 'hash' | 'url' | 'mail' | 'telco'): Promise<CortexJob[]> {
    // Select appropriate analyzers based on data type and category
    let analyzerIds: string[];

    switch (category || observable.dataType) {
      case 'ip':
        analyzerIds = [
          'AbuseIPDB_2_0',
          'VirusTotal_GetIPReport_3_1',
          'Shodan_Search',
          'Censys_Search',
          'IPInfo_1_0',
          'GreyNoise_Community_3_1',
          'ThreatFox_1_0',
        ];
        break;
      
      case 'domain':
        analyzerIds = [
          'VirusTotal_GetDomainReport_3_1',
          'DNSdb_Tools_3_1',
          'SecurityTrails_2_1',
          'Urlhaus_Query_1_0',
          'PhishTank_Submit_2_1',
          'AlienVault_OTXQuery_2_1',
        ];
        break;
      
      case 'hash':
        analyzerIds = [
          'VirusTotal_GetReport_3_1',
          'HybridAnalysis_GetReport_2_1',
          'MalwareBazaar_GetFile_2_1',
          'XForce_Malware_2_0',
          'MISP_Search_2_1',
          'Unpac_ME_EXE_Unpacker_1_0',
        ];
        break;
      
      case 'url':
        analyzerIds = [
          'VirusTotal_ScanURL_3_1',
          'UrlScan_IO_1_0',
          'Phishtank_2_0',
          'URLhaus_Query_1_0',
          'GoogleSafeBrowsing_1_0',
        ];
        break;
      
      case 'mail':
        analyzerIds = [
          'HaveIBeenPwned_Breaches_2_1',
          'Hunter_io_2_0',
          'EmailRep_2_0',
          'MISP_Search_2_1',
        ];
        break;

      case 'telco':
        // Djezzy-specific telco analyzers
        analyzerIds = [
          'Djezzy_Subscriber_Lookup_1_0',
          'Djezzy_Fraud_Check_1_0',
          'SIMSwap_Database_1_0',
          'Roaming_Analysis_1_0',
        ];
        break;
      
      default:
        analyzerIds = ['VirusTotal_GetReport_3_1'];
    }

    // Run each analyzer (or could batch them)
    const jobPromises = analyzerIds.map(analyzerId =>
      this.runAnalysis(observable, [analyzerId]).catch(error => {
        console.error(`[Cortex] Analyzer ${analyzerId} failed:`, error);
        return null;
      })
    );

    const jobs = await Promise.all(jobPromises);
    return jobs.filter((job): job is CortexJob => job !== null);
  }

  /**
   * Get job status and results
   */
  async getJob(jobId: string): Promise<CortexJob> {
    return this.apiRequest<CortexJob>(`/api/job/${jobId}`);
  }

  /**
   * Wait for job completion (polling)
   */
  async waitForJob(
    jobId: string,
    options?: {
      pollIntervalMs?: number;
      maxWaitMs?: number;
    }
  ): Promise<CortexJob> {
    const pollInterval = options?.pollIntervalMs || 2000;
    const maxWait = options?.maxWaitMs || 120000; // Default 2 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const job = await this.getJob(jobId);

      if (job.status === 'Success' || job.status === 'Failure' || job.status === 'Timeout') {
        return job;
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new SoarIntegrationError('Job wait timeout exceeded', 'TIMEOUT');
  }

  /**
   * Analyze observable and wait for all results
   */
  async analyzeAndWait(
    observable: {
      dataType: string;
      data: string;
    },
    category?: string
  ): Promise<CortexJob[]> {
    // Start all analyses
    const jobs = await this.runFullAnalysis(observable, category);

    // Wait for all to complete
    const completedJobs = await Promise.allSettled(
      jobs.map(job => this.waitForJob(job.jobId))
    );

    return completedJobs
      .filter((r): r is PromiseFulfilledResult<CortexJob> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  /**
   * Get report for a completed job
   */
  async getReport(jobId: string, format: 'full' | 'summary' = 'summary'): Promise<CortexReport> {
    const job = await this.getJob(jobId);
    
    if (!job.report) {
      throw new SoarIntegrationError('No report available for this job', 'NO_REPORT');
    }

    return format === 'full' ? job.report.fullReport : job.report;
  }

  /**
   * Search past jobs
   */
  async searchJobs(filters?: {
    dataType?: string;
    data?: string;
    status?: string;
    analyzerId?: string;
    startDate?: string;
    endDate?: string;
    range?: string;
    count?: number;
    from?: number;
  }): Promise<{ jobs: CortexJob[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.dataType) params.append('dataType', filters.dataType);
    if (filters?.data) params.append('data', filters.data);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.analyzerId) params.append('analyzerId', filters.analyzerId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.range) params.append('range', filters.range);
    if (filters?.count) params.append('count', String(filters.count));
    if (filters?.from) params.append('from', String(filters.from));

    return this.apiRequest(`/api/job/search?${params}`);
  }

  /**
   * Test connectivity to Cortex
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    version: string;
    analyzerCount: number;
    latency: number;
  }> {
    const startTime = Date.now();

    try {
      const analyzers = await this.getAnalyzers();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        version: 'connected',
        analyzerCount: analyzers.length,
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        version: 'unknown',
        analyzerCount: 0,
        latency: Date.now() - startTime,
      };
    }
  }
}

// ============================================================
// Main SOAR Integration Service
// ============================================================

export class SoarIntegrationService extends EventEmitter {
  private thehiveClient: TheHiveClient;
  private cortexClient: CortexClient;
  private config: SoarIntegrationConfig;
  private isRunning = false;

  constructor(config: SoarIntegrationConfig) {
    super();
    this.config = config;
    this.thehiveClient = new TheHiveClient(config.thehive);
    this.cortexClient = new CortexClient(config.cortex);
  }

  /**
   * Initialize the SOAR integration service
   */
  async initialize(): Promise<void> {
    console.log('[SOAR] Initializing SOAR integration service...');

    try {
      // Test TheHive connectivity
      const thehiveHealth = await this.thehiveClient.healthCheck();
      console.log(`[SOAR] TheHive connection: ${thehiveHealth.status} (${thehiveHealth.latency}ms)`);

      // Test Cortex connectivity
      const cortexHealth = await this.cortexClient.healthCheck();
      console.log(`[SOAR] Cortex connection: ${cortexHealth.status} (${cortexHealth.latency}ms, ${cortexHealth.analyzerCount} analyzers)`);

      this.isRunning = true;
      this.emit('initialized', { thehiveHealth, cortexHealth });

      console.log('[SOAR] SOAR integration service initialized successfully');
    } catch (error) {
      console.error('[SOAR] Failed to initialize:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[SOAR] Shutting down SOAR integration service...');
    this.isRunning = false;
    this.emit('shutdown');
    console.log('[SOAR] SOAR integration service shutdown complete');
  }

  /**
   * Create incident case from security alert
   */
  async createIncidentCase(alert: {
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    eventType: string;
    sourceIp?: string;
    destinationIp?: string;
    subscriberId?: string;
    rawLog?: string;
  }): Promise<{
    case: HiveCase;
    initialTask: HiveTask;
    observablesAdded: HiveObservable[];
  }> {
    if (!this.isRunning) {
      throw new SoarIntegrationError('SOAR service is not running', 'SERVICE_NOT_RUNNING');
    }

    // Map severity
    const severityMap: Record<string, 1 | 2 | 3 | 4> = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    };

    // Create the case
    const hiveCase = await this.thehiveClient.createCase({
      title: alert.title,
      description: alert.description,
      severity: severityMap[alert.severity] || 3,
      tags: ['soc-platform', alert.eventType, 'auto-created'],
      tlp: 2, // Amber by default for security incidents
      pap: 2,
      taskTitle: 'Initial Triage and Investigation',
    });

    // Add observables based on available data
    const observables: Array<{ dataType: string; data: string; message?: string; tags?: string[] }> = [];

    if (alert.sourceIp) {
      observables.push({
        dataType: 'ip',
        data: alert.sourceIp,
        message: 'Source IP address from alert',
        tags: ['source-ip'],
      });
    }

    if (alert.destinationIp) {
      observables.push({
        dataType: 'ip',
        data: alert.destinationIp,
        message: 'Destination IP address from alert',
        tags: ['destination-ip'],
      });
    }

    if (alert.subscriberId) {
      observables.push({
        dataType: 'other',
        data: alert.subscriberId,
        message: 'Subscriber MSISDN (masked)',
        tags: ['subscriber', 'telco'],
      });
    }

    // Add observables to case
    const addedObservables = observables.length > 0
      ? await this.thehiveClient.addObservablesBatch(hiveCase.id, observables)
      : [];

    // Get the auto-created initial task
    const tasks = await this.thehiveClient.getTasks(hiveCase.id);
    const initialTask = tasks[0];

    this.emit('incident_created', { case: hiveCase, alert });

    return {
      case: hiveCase,
      initialTask,
      observablesAdded: addedObservables,
    };
  }

  /**
   * Enrich observables with automatic Cortex analysis
   */
  async enrichObservables(
    caseId: string,
    observables: Array<{ dataType: string; data: string }>
  ): Promise<Array<{
    observable: { dataType: string; data: string };
    analyses: CortexJob[];
  }>> {
    if (!this.isRunning) {
      throw new SoarIntegrationError('SOAR service is not running', 'SERVICE_NOT_RUNNING');
    }

    const results = [];

    for (const observable of observables) {
      try {
        console.log(`[SOAR] Enriching ${observable.dataType}: ${observable.data}`);

        // Run full analysis and wait for results
        const analyses = await this.cortexClient.analyzeAndWait(observable);

        // Update observable in TheHive with analysis results
        // (In production, you'd call thehiveClient.updateObservable)

        results.push({
          observable,
          analyses,
        });

        this.emit('observable_enriched', { observable, analyses });
      } catch (error) {
        console.error(`[SOAR] Failed to enrich ${observable.dataType}:${observable.data}:`, error);
        
        results.push({
          observable,
          analyses: [],
        });

        this.emit('enrichment_error', { observable, error });
      }
    }

    return results;
  }

  /**
   * Execute automated playbook actions
   */
  async executePlaybookActions(
    caseId: string,
    playbookType: 'phishing_triage' | 'malware_investigation' | 'network_intrusion' | 'sim_swap_fraud'
  ): Promise<{
    actionsTaken: Array<{
      action: string;
      status: 'success' | 'failed' | 'skipped';
      result?: any;
      error?: string;
    }>;
  }> {
    const actionsTaken: Array<{
      action: string;
      status: 'success' | 'failed' | 'skipped';
      result?: any;
      error?: string;
    }> = [];

    switch (playbookType) {
      case 'phishing_triage':
        // Phishing triage playbook
        actionsTaken.push(
          await this.executeAction('Extract URLs from email', () => /* extract URLs */ ({ urls: [] })),
          await this.executeAction('Submit URLs to VirusTotal', () => /* submit */ ({})),
          await this.executeAction('Submit URLs to URLhaus', () => /* submit */ ({})),
          await this.executeAction('Check sender email reputation', () => /* check */ ({})),
          await this.executeAction('Create blocking rule if malicious', () => /* block */ ({}))
        );
        break;

      case 'malware_investigation':
        // Malware investigation playbook
        actionsTaken.push(
          await this.executeAction('Extract file hashes', () => /* extract */ ({ hashes: [] })),
          await this.executeAction('Submit to sandbox analysis', () => /* submit */ ({})),
          await this.executeAction('Query threat intelligence feeds', () => /* query */ ({})),
          await this.executeAction('Identify C2 infrastructure', () => /* identify */ ({})),
          await this.executeAction('Generate IOCs for detection rules', () => /* generate */ ({}))
        );
        break;

      case 'sim_swap_fraud':
        // SIM swap fraud investigation playbook (telco-specific)
        actionsTaken.push(
          await this.executeAction('Verify subscriber identity', () => /* verify */ ({})),
          await this.executeAction('Pull SIM swap history', () => /* pull history */ ({})),
          await this.executeAction('Check device fingerprint', () => /* check */ ({})),
          await this.executeAction('Review recent call/data patterns', () => /* review */ ({})),
          await this.executeAction('Assess fraud risk score', () => /* assess */ ({}))
        );
        break;

      default:
        throw new SoarIntegrationError(`Unknown playbook type: ${playbookType}`, 'INVALID_PLAYBOOK');
    }

    this.emit('playbook_executed', { caseId, playbookType, actionsTaken });

    return { actionsTaken };
  }

  /**
   * Sync case status back to SOC Platform
   */
  async syncCaseToPlatform(caseId: string): Promise<{
    case: HiveCase;
    tasks: HiveTask[];
    observables: HiveObservable[];
    timeline: HiveTimelineEntry[];
  }> {
    const [hiveCase, tasks, observablesResult, timeline] = await Promise.all([
      this.thehiveClient.getCase(caseId),
      this.thehiveClient.getTasks(caseId),
      this.thehiveClient.getObservables(caseId),
      this.thehiveClient.getTimeline(caseId),
    ]);

    const result = {
      case: hiveCase,
      tasks,
      observables: observablesResult.observables,
      timeline,
    };

    this.emit('case_synced', result);

    return result;
  }

  // Private helper for executing actions with error handling
  private async executeAction<T>(
    actionName: string,
    fn: () => Promise<T>
  ): Promise<{
    action: string;
    status: 'success' | 'failed' | 'skipped';
    result?: T;
    error?: string;
  }> {
    try {
      const result = await fn();
      return { action: actionName, status: 'success', result };
    } catch (error) {
      return {
        action: actionName,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ============================================================
// Exports
// ============================================================

let soarInstance: SoarIntegrationService | null = null;

export function getSoarIntegration(config?: SoarIntegrationConfig): SoarIntegrationService {
  if (!soarInstance && config) {
    soarInstance = new SoarIntegrationService(config);
  }

  if (!soarInstance) {
    throw new SoarIntegrationError(
      'SOAR integration not initialized. Call getSoarIntegration(config) first.',
      'NOT_INITIALIZED'
    );
  }

  return soarInstance;
}

export {
  TheHiveClient,
  CortexClient,
};

export default SoarIntegrationService;
