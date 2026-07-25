/**
 * National SOC Platform - Threat Intelligence API
 * 
 * Provides threat intelligence data including:
 * - Indicators of Compromise (IOCs)
 * - Threat actor tracking
 * - Campaign monitoring
 * - TIP (Threat Intelligence Platform) records
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IndicatorType, ThreatLevel, TLPMarking, DistributionScope, CampaignStatus } from "@prisma/client";

// GET /api/threats - Fetch threat intelligence data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as IndicatorType | null;
    const threatActor = searchParams.get("threatActor");
    const active = searchParams.get("active");
    const tlp = searchParams.get("tlp") as TLPMarking | null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: any = {};
    
    if (type && Object.values(IndicatorType).includes(type)) {
      where.type = type;
    }
    
    if (threatActor) {
      where.threatActor = { contains: threatActor, mode: 'insensitive' };
    }
    
    if (active === "true") {
      where.isActive = true;
    } else if (active === "false") {
      where.isActive = false;
    }

    // Execute queries
    const [indicators, total, campaigns, iocStats] = await Promise.all([
      db.threatIndicator.findMany({
        where,
        orderBy: { lastSeen: "desc" },
        take: limit,
        skip: offset,
      }),
      
      db.threatIndicator.count({ where }),
      
      // Active campaigns
      db.campaign.findMany({
        where: {
          isActive: true,
          status: CampaignStatus.ACTIVE
        },
        take: 10,
        orderBy: { lastSeen: 'desc' }
      }),

      // IOC statistics
      db.iOC.groupBy({
        by: ['type', 'threatLevel', 'isValidated'],
        _count: { id: true }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        indicators: indicators.map(ind => ({
          id: ind.id,
          type: ind.type.toLowerCase(),
          value: ind.value,
          confidence: ind.confidence,
          source: ind.source,
          threatActor: ind.threatActor,
          malwareFamily: ind.malwareFamily,
          isActive: ind.isActive,
          firstSeen: ind.firstSeen,
          lastSeen: ind.lastSeen,
          ttl: ind.ttl,
          tags: ind.tags ? JSON.parse(ind.tags) : []
        })),
        campaigns: campaigns.map(camp => ({
          id: camp.id,
          name: camp.name,
          alias: camp.alias,
          description: camp.description,
          threatActor: camp.threatActor,
          attributionConfidence: camp.attributionConfidence,
          status: camp.status.toLowerCase(),
          targetSector: camp.targetSector,
          targetRegion: camp.targetRegion,
          objectives: camp.objectives ? JSON.parse(camp.objectives) : [],
          lastSeen: camp.lastSeen
        })),
        statistics: {
          totalIndicators: total,
          byType: iocStats.reduce((acc, ioc) => {
            const type = ioc.type.toLowerCase();
            if (!acc[type]) acc[type] = { total: 0, validated: 0 };
            acc[type].total += ioc._count.id;
            if (ioc.isValidated) acc[type].validated += ioc._count.id;
            return acc;
          }, {} as Record<string, { total: number; validated: number }>),
          byThreatLevel: iocStats.reduce((acc, ioc) => {
            const level = ioc.threatLevel.toLowerCase();
            acc[level] = (acc[level] || 0) + ioc._count.id;
            return acc;
          }, {} as Record<string, number>),
          activeCampaigns: campaigns.length
        },
        threatActors: [
          { name: 'APT-GhostShell', activity: 'High', targets: ['Telecom', 'Government'], lastSeen: '2 hours ago' },
          { name: 'FIN11-Africa', activity: 'Medium', targets: ['Finance', 'Banking'], lastSeen: '6 hours ago' },
          { name: 'Lazarus-Telecom', activity: 'High', targets: ['Telecom', 'Infrastructure'], lastSeen: '1 hour ago' },
          { name: 'Tick-SS7', activity: 'Critical', targets: ['Mobile Networks', 'SS7 Infrastructure'], lastSeen: '30 mins ago' }
        ]
      },
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching threat intel:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch threat intelligence", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/threats - Add new threat intelligence
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === "addIndicator") {
      const { type, value, confidence, source, threatActor, tags } = data;

      // Check for existing indicator
      const existing = await db.threatIndicator.findUnique({
        where: { type_value: { type: type.toUpperCase(), value } }
      });

      if (existing) {
        // Update last seen
        await db.threatIndicator.update({
          where: { id: existing.id },
          data: { 
            lastSeen: new Date(),
            confidence: confidence || existing.confidence
          }
        });

        return NextResponse.json({
          success: true,
          message: "Existing indicator updated",
          action: 'updated',
          data: existing
        });
      }

      // Create new indicator
      const indicator = await db.threatIndicator.create({
        data: {
          type: type.toUpperCase(),
          value,
          confidence: confidence || 50.0,
          source: source || 'Manual',
          threatActor,
          tags: tags ? JSON.stringify(tags) : null,
          firstSeen: new Date(),
          lastSeen: new Date(),
          isActive: true
        }
      });

      return NextResponse.json({
        success: true,
        message: "Threat indicator created",
        data: indicator,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "addIOC") {
      const ioc = await db.iOC.create({
        data: {
          iocId: data.iocId || `IOC-${Date.now()}`,
          type: data.type?.toUpperCase() || IndicatorType.IPV4,
          value: data.value,
          threatLevel: data.threatLevel?.toUpperCase() || ThreatLevel.MEDIUM,
          description: data.description,
          source: data.source,
          confidence: data.confidence || 50,
          isValidated: false,
          labels: data.labels ? JSON.stringify(data.labels) : null
        }
      });

      return NextResponse.json({
        success: true,
        message: "IOC created successfully",
        data: ioc,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use addIndicator or addIOC" },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Error creating threat intel:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create threat intelligence" },
      { status: 500 }
    );
  }
}
