// -------------------------------------------------------------------
// External OSS/NMS Integration Connector Framework
// -------------------------------------------------------------------

// Base types
export interface ConnectorConfig {
  id: string;
  name: string;
  type: string; // 'oss', 'nms', 'ems', 'probe', 'custom'
  baseUrl: string;
  authType: 'none' | 'basic' | 'bearer' | 'api_key' | 'certificate';
  credentials: Record<string, string>;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface ConnectorHealth {
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  latencyMs?: number;
  lastCheckAt: string;
  error?: string;
}

export interface ConnectorData {
  connectorId: string;
  dataType: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface IngestionResult {
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  durationMs: number;
}

// -------------------------------------------------------------------
// Base connector class
// -------------------------------------------------------------------

export abstract class BaseConnector {
  protected config: ConnectorConfig;
  protected health: ConnectorHealth = {
    status: 'unknown',
    lastCheckAt: new Date().toISOString(),
  };

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  abstract testConnection(): Promise<ConnectorHealth>;
  abstract fetchData(
    dataType: string,
    params?: Record<string, unknown>,
  ): Promise<ConnectorData[]>;
  abstract pushData(
    dataType: string,
    payload: Record<string, unknown>,
  ): Promise<boolean>;

  getHealth() {
    return this.health;
  }
  getConfig() {
    return this.config;
  }
  get id() {
    return this.config.id;
  }
  get name() {
    return this.config.name;
  }
  get enabled() {
    return this.config.enabled;
  }

  protected async httpRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.config.authType === 'basic') {
      const { username, password } = this.config.credentials;
      headers['Authorization'] =
        `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    } else if (this.config.authType === 'bearer') {
      headers['Authorization'] = `Bearer ${this.config.credentials.token}`;
    } else if (this.config.authType === 'api_key') {
      const { headerName = 'X-API-Key', apiKey } = this.config.credentials;
      headers[headerName] = apiKey;
    }

    const start = Date.now();
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(30000),
      });
      this.health = {
        status: response.ok ? 'connected' : 'error',
        latencyMs: Date.now() - start,
        lastCheckAt: new Date().toISOString(),
      };
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      this.health = {
        status: 'error',
        latencyMs: Date.now() - start,
        lastCheckAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      throw error;
    }
  }
}

// -------------------------------------------------------------------
// Built-in connector: Generic REST OSS
// -------------------------------------------------------------------

export class RestOssConnector extends BaseConnector {
  async testConnection(): Promise<ConnectorHealth> {
    try {
      await this.httpRequest(`${this.config.baseUrl}/health`, {
        method: 'GET',
      });
      return this.health;
    } catch {
      return this.health;
    }
  }

  async fetchData(
    dataType: string,
    params?: Record<string, unknown>,
  ): Promise<ConnectorData[]> {
    const query = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    const result = await this.httpRequest(
      `${this.config.baseUrl}/api/v1/${dataType}${query}`,
    );
    const data =
      ((result as Record<string, unknown>).data as Record<string, unknown>[]) ||
      [result as Record<string, unknown>];
    return data.map((item) => ({
      connectorId: this.id,
      dataType,
      timestamp: new Date().toISOString(),
      payload: item,
    }));
  }

  async pushData(
    dataType: string,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    await this.httpRequest(`${this.config.baseUrl}/api/v1/${dataType}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return true;
  }
}

// -------------------------------------------------------------------
// Built-in connector: SNMP-based NMS
// -------------------------------------------------------------------

export class SnmpNmsConnector extends BaseConnector {
  async testConnection(): Promise<ConnectorHealth> {
    try {
      await this.httpRequest(`${this.config.baseUrl}/snmp/test`, {
        method: 'POST',
        body: JSON.stringify({
          host: this.config.credentials.host,
          community: this.config.credentials.community,
          version: this.config.settings.snmpVersion || '2c',
        }),
      });
      return this.health;
    } catch {
      return this.health;
    }
  }

  async fetchData(
    dataType: string,
    params?: Record<string, unknown>,
  ): Promise<ConnectorData[]> {
    const oids = this.config.settings.oids as Record<string, string> | undefined;
    const result = await this.httpRequest(`${this.config.baseUrl}/snmp/walk`, {
      method: 'POST',
      body: JSON.stringify({
        host: this.config.credentials.host,
        community: this.config.credentials.community,
        oid: oids?.[dataType] || '1.3.6.1',
        ...params,
      }),
    });
    return [
      {
        connectorId: this.id,
        dataType,
        timestamp: new Date().toISOString(),
        payload: result as Record<string, unknown>,
      },
    ];
  }

  async pushData(): Promise<boolean> {
    throw new Error('SNMP connector does not support push');
  }
}

// -------------------------------------------------------------------
// Built-in connector: Prometheus/VictoriaMetrics
// -------------------------------------------------------------------

export class MetricsConnector extends BaseConnector {
  async testConnection(): Promise<ConnectorHealth> {
    try {
      await this.httpRequest(`${this.config.baseUrl}/api/v1/query`, {
        method: 'POST',
        body: JSON.stringify({ query: 'up' }),
      });
      return this.health;
    } catch {
      return this.health;
    }
  }

  async fetchData(
    dataType: string,
    params?: Record<string, unknown>,
  ): Promise<ConnectorData[]> {
    const queries = this.config.settings.queries as
      | Record<string, string>
      | undefined;
    const query = queries?.[dataType] || dataType;
    const time = (params?.time as string) || new Date().toISOString();
    const result = await this.httpRequest(`${this.config.baseUrl}/api/v1/query`, {
      method: 'POST',
      body: JSON.stringify({ query, time }),
    });
    const items =
      ((result as Record<string, unknown>).data?.result as Record<string, unknown>[]) ||
      [];
    return items.map((item) => ({
      connectorId: this.id,
      dataType,
      timestamp: new Date().toISOString(),
      payload: item,
    }));
  }

  async pushData(): Promise<boolean> {
    throw new Error('Metrics connector is read-only');
  }
}

// -------------------------------------------------------------------
// Built-in connector: File/FTP/SFTP based
// -------------------------------------------------------------------

export class FileConnector extends BaseConnector {
  async testConnection(): Promise<ConnectorHealth> {
    try {
      await this.httpRequest(`${this.config.baseUrl}/files/test`, {
        method: 'POST',
        body: JSON.stringify({
          path: this.config.settings.remotePath || '/',
        }),
      });
      return this.health;
    } catch {
      return this.health;
    }
  }

  async fetchData(
    dataType: string,
    params?: Record<string, unknown>,
  ): Promise<ConnectorData[]> {
    const result = await this.httpRequest(`${this.config.baseUrl}/files/read`, {
      method: 'POST',
      body: JSON.stringify({
        path: `${this.config.settings.remotePath || '/'}/${dataType}.csv`,
        ...params,
      }),
    });
    return [
      {
        connectorId: this.id,
        dataType,
        timestamp: new Date().toISOString(),
        payload: result as Record<string, unknown>,
      },
    ];
  }

  async pushData(
    dataType: string,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    await this.httpRequest(`${this.config.baseUrl}/files/write`, {
      method: 'POST',
      body: JSON.stringify({
        path: `${this.config.settings.remotePath || '/'}/${dataType}.json`,
        content: payload,
      }),
    });
    return true;
  }
}

// -------------------------------------------------------------------
// Connector Registry
// -------------------------------------------------------------------

export class ConnectorRegistry {
  private connectors: Map<string, BaseConnector> = new Map();

  register(connector: BaseConnector): void {
    this.connectors.set(connector.id, connector);
  }

  get(id: string): BaseConnector | undefined {
    return this.connectors.get(id);
  }

  list(): {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    health: ConnectorHealth;
  }[] {
    return Array.from(this.connectors.values()).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.config.type,
      enabled: c.enabled,
      health: c.getHealth(),
    }));
  }

  async testAll(): Promise<Record<string, ConnectorHealth>> {
    const results: Record<string, ConnectorHealth> = {};
    const promises = Array.from(this.connectors.entries()).map(
      async ([id, c]) => {
        if (c.enabled) {
          try {
            results[id] = await c.testConnection();
          } catch {
            results[id] = c.getHealth();
          }
        }
      },
    );
    await Promise.all(promises);
    return results;
  }

  async ingestAll(dataType: string): Promise<IngestionResult> {
    const start = Date.now();
    let totalRecords = 0;
    const errors: string[] = [];

    for (const [id, connector] of this.connectors) {
      if (!connector.enabled) continue;
      try {
        const data = await connector.fetchData(dataType);
        totalRecords += data.length;
      } catch (e) {
        errors.push(
          `${id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return {
      success: errors.length === 0,
      recordsProcessed: totalRecords,
      errors,
      durationMs: Date.now() - start,
    };
  }
}

// -------------------------------------------------------------------
// Factory function
// -------------------------------------------------------------------

export function createConnector(config: ConnectorConfig): BaseConnector {
  switch (config.type) {
    case 'oss':
      return new RestOssConnector(config);
    case 'nms':
      return config.settings.protocol === 'snmp'
        ? new SnmpNmsConnector(config)
        : new RestOssConnector(config);
    case 'ems':
      return new RestOssConnector(config);
    case 'probe':
      return new MetricsConnector(config);
    case 'custom':
      return new FileConnector(config);
    default:
      return new RestOssConnector(config);
  }
}
