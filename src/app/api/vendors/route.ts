import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const vendors = await db.vendorProfile.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      vendors: vendors.map((v) => ({
        id: v.id,
        vendor: v.vendor,
        displayName: v.displayName,
        technologies: typeof v.technologies === 'string' ? JSON.parse(v.technologies) : v.technologies,
        apiType: v.apiType,
        apiEndpoint: v.apiEndpoint,
        status: v.status,
        lastSync: v.lastSync?.toISOString(),
        stats: typeof v.stats === 'string' ? JSON.parse(v.stats) : v.stats,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendor, displayName, technologies, apiType, apiEndpoint, credentials, status } = body;

    if (!vendor || !displayName) {
      return NextResponse.json({ error: 'Missing required fields: vendor, displayName' }, { status: 400 });
    }

    const validApiTypes = ['rest', 'netconf', 'snmp', 'cli'];
    if (apiType && !validApiTypes.includes(apiType)) {
      return NextResponse.json(
        { error: `Invalid apiType. Must be one of: ${validApiTypes.join(', ')}` },
        { status: 400 },
      );
    }

    const profile = await db.vendorProfile.create({
      data: {
        vendor,
        displayName,
        technologies: technologies ? JSON.stringify(technologies) : '[]',
        apiType: apiType || 'rest',
        apiEndpoint: apiEndpoint || null,
        credentials: credentials || null,
        status: status || 'active',
        stats: '{}',
      },
    });

    await db.auditLog.create({
      data: {
        entityType: 'vendor_profile',
        entityId: profile.id,
        action: 'create',
        newValue: profile.vendor,
        description: `Vendor profile "${profile.displayName}" (${profile.vendor}) registered — API type: ${profile.apiType}`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        profile: {
          ...profile,
          technologies: JSON.parse(profile.technologies),
          stats: JSON.parse(profile.stats),
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendorId, action, status: newStatus, ...rest } = body;

    if (!vendorId || !action) {
      return NextResponse.json({ error: 'Missing required fields: vendorId, action' }, { status: 400 });
    }

    const existing = await db.vendorProfile.findUnique({ where: { id: vendorId } });

    if (!existing) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    if (action === 'update_status') {
      if (!newStatus) {
        return NextResponse.json({ error: 'Missing required field: status for update_status action' }, { status: 400 });
      }

      const validStatuses = ['active', 'disconnected', 'error'];
      if (!validStatuses.includes(newStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 },
        );
      }

      const updated = await db.vendorProfile.update({
        where: { id: vendorId },
        data: { status: newStatus },
      });

      await db.auditLog.create({
        data: {
          entityType: 'vendor_profile',
          entityId: vendorId,
          action: 'update_status',
          oldValue: existing.status,
          newValue: newStatus,
          description: `Vendor "${existing.displayName}" (${existing.vendor}) status changed from ${existing.status} to ${newStatus}`,
        },
      });

      return NextResponse.json({
        success: true,
        profile: {
          ...updated,
          technologies: JSON.parse(updated.technologies),
          stats: JSON.parse(updated.stats),
          lastSync: updated.lastSync?.toISOString(),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    if (action === 'sync') {
      const now = new Date();
      const currentStats: Record<string, any> =
        typeof existing.stats === 'string' ? JSON.parse(existing.stats) : existing.stats;

      const updatedStats = {
        ...currentStats,
        lastSync: now.toISOString(),
        syncStatus: 'completed',
      };

      const updated = await db.vendorProfile.update({
        where: { id: vendorId },
        data: {
          lastSync: now,
          status: 'active',
          stats: JSON.stringify(updatedStats),
        },
      });

      await db.auditLog.create({
        data: {
          entityType: 'vendor_profile',
          entityId: vendorId,
          action: 'sync',
          oldValue: existing.lastSync?.toISOString() || 'never',
          newValue: now.toISOString(),
          description: `Sync triggered for vendor "${existing.displayName}" (${existing.vendor})`,
        },
      });

      return NextResponse.json({
        success: true,
        profile: {
          ...updated,
          technologies: JSON.parse(updated.technologies),
          stats: JSON.parse(updated.stats),
          lastSync: updated.lastSync?.toISOString(),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    return NextResponse.json({ error: `Invalid action: ${action}. Must be "update_status" or "sync"` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}