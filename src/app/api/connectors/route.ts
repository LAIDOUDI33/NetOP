import { NextResponse } from 'next/server';
import { checkApiAuth, authError } from '@/lib/api-auth';
import { db } from '@/lib/db';
import {
  type ConnectorConfig,
  createConnector,
  type ConnectorRegistry,
  ConnectorRegistry as ConnectorRegistryClass,
} from '@/lib/integration-connectors';

// Lazy singleton registry (in-memory, resets on server restart)
let _registry: ConnectorRegistry | null = null;
function getRegistry(): ConnectorRegistry {
  if (!_registry) _registry = new ConnectorRegistryClass();
  return _registry;
}

// Seed with demo connectors from ExternalIntegration table
async function ensureDemoConnectors() {
  const registry = getRegistry();
  if (registry.list().length > 0) return;

  const integrations = await db.externalIntegration.findMany({
    where: { status: 'active' },
  });

  for (const integ of integrations) {
    try {
      const config: ConnectorConfig = {
        id: integ.id,
        name: integ.name,
        type: integ.type || 'oss',
        baseUrl: integ.endpoint || '',
        authType: 'api_key',
        credentials: { apiKey: '' },
        enabled: true,
        settings: { protocol: integ.protocol || 'rest' },
      };
      registry.register(createConnector(config));
    } catch {
      // skip invalid configs
    }
  }
}

export async function GET(request: Request) {
  try {
    await checkApiAuth(request);
  } catch {
    return authError();
  }

  await ensureDemoConnectors();
  const connectors = getRegistry().list();
  return NextResponse.json({ connectors });
}

export async function POST(request: Request) {
  try {
    await checkApiAuth(request);
  } catch {
    return authError();
  }

  const body = await request.json();
  const { name, type, baseUrl, authType, credentials, settings } = body;

  if (!name || !type) {
    return NextResponse.json(
      { error: 'name and type required' },
      { status: 400 },
    );
  }

  const config: ConnectorConfig = {
    id: `conn-${Date.now()}`,
    name,
    type: type || 'oss',
    baseUrl: baseUrl || '',
    authType: authType || 'api_key',
    credentials: credentials || {},
    enabled: true,
    settings: settings || {},
  };

  const connector = createConnector(config);
  getRegistry().register(connector);
  return NextResponse.json(
    { success: true, connector: { id: connector.id, name: connector.name } },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  try {
    await checkApiAuth(request);
  } catch {
    return authError();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  // Note: in-memory registry doesn't have unregister, this is a no-op for now
  return NextResponse.json({ success: true });
}
