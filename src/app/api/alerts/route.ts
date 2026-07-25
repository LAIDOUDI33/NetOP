/**
 * National SOC Platform - Alerts API
 * 
 * Provides CRUD operations for security alerts with:
 * - Filtering by severity, status, type, source
 * - Pagination support
 * - Real-time alert statistics
 * - Incident correlation
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AlertSeverity, AlertStatus, AlertType, IncidentSeverity, IncidentStatus, IncidentPhase } from "@prisma/client";

// GET /api/alerts - Fetch alerts with filtering and pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity") as AlertSeverity | null;
    const status = searchParams.get("status") as AlertStatus | null;
    const type = searchParams.get("type") as AlertType | null;
    const source = searchParams.get("source");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const includeIncident = searchParams.get("includeIncident") === "true";

    // Build dynamic where clause
    const where: any = {};
    
    if (severity && Object.values(AlertSeverity).includes(severity)) {
      where.severity = severity;
    }
    
    if (status && Object.values(AlertStatus).includes(status)) {
      where.status = status;
    }
    
    if (type && Object.values(AlertType).includes(type)) {
      where.alertType = type;
    }
    
    if (source) {
      where.source = { contains: source, mode: 'insensitive' };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sourceIp: { contains: search } },
        { destIp: { contains: search } }
      ];
    }

    // Execute parallel queries
    const [alerts, total, stats] = await Promise.all([
      db.alert.findMany({
        where,
        orderBy: { firstSeen: "desc" },
        take: limit,
        skip: offset,
        include: {
          incident: includeIncident ? {
            select: {
              id: true,
              title: true,
              severity: true,
              status: true,
            },
          } : false,
        },
      }),
      db.alert.count({ where }),
      // Get aggregate statistics
      db.alert.groupBy({
        by: ['severity'],
        _count: { id: true },
        where: {
          ...where,
          status: { in: [AlertStatus.NEW, AlertStatus.ACKNOWLEDGED, AlertStatus.IN_PROGRESS] }
        }
      })
    ]);

    // Format response
    return NextResponse.json({
      success: true,
      data: alerts.map(alert => ({
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity.toLowerCase(),
        status: alert.status.toLowerCase(),
        type: alert.alertType.toLowerCase(),
        source: alert.source,
        sourceIp: alert.sourceIp,
        destIp: alert.destIp,
        protocol: alert.protocol,
        firstSeen: alert.firstSeen,
        lastSeen: alert.lastSeen,
        resolvedAt: alert.resolvedAt,
        mitreTechniques: alert.mitreTechniques ? JSON.parse(alert.mitreTechniques) : null,
        incidentId: alert.incidentId,
        incident: alert.incident,
        isSuppressed: alert.isSuppressed,
        escalationCount: alert.escalationCount,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        bySeverity: stats.reduce((acc, s) => ({
          ...acc,
          [s.severity.toLowerCase()]: s._count.id
        }), {} as Record<string, number>),
        totalActive: stats.reduce((sum, s) => sum + s._count.id, 0),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching alerts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch alerts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create or update alerts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, ...alertData } = body;

    // Update alert status
    if (action === "updateStatus" && id) {
      const { status, assigneeId } = alertData;
      
      const updateData: any = { 
        status: status?.toUpperCase(),
      };

      if (status?.toUpperCase() === AlertStatus.ACKNOWLEDGED) {
        // Would set acknowledgedAt if field existed
      } else if ([AlertStatus.RESOLVED, AlertStatus.FALSE_POSITIVE].includes(status?.toUpperCase())) {
        updateData.resolvedAt = new Date();
      }

      const updatedAlert = await db.alert.update({
        where: { id },
        data: updateData,
        include: {
          incident: { select: { id: true, title: true } }
        }
      });

      return NextResponse.json({
        success: true,
        message: `Alert ${id} updated to ${status}`,
        data: updatedAlert,
        timestamp: new Date().toISOString(),
      });
    }

    // Suppress/Unsuppress alert
    if (action === "toggleSuppress" && id) {
      const currentAlert = await db.alert.findUnique({ where: { id } });
      
      const updatedAlert = await db.alert.update({
        where: { id },
        data: { isSuppressed: !currentAlert?.isSuppressed }
      });

      return NextResponse.json({
        success: true,
        message: `Alert ${updatedAlert.isSuppressed ? 'suppressed' : 'unsuppressed'}`,
        data: updatedAlert,
        timestamp: new Date().toISOString(),
      });
    }

    // Escalate alert to incident
    if (action === "escalate" && id) {
      const { title, description, severity } = alertData;
      
      // Create incident from alert
      const incident = await db.incident.create({
        data: {
          title: title || `Escalated from Alert ${id}`,
          description: description || `Auto-generated incident from alert escalation`,
          incidentType: 'SECURITY',
          severity: severity?.toUpperCase() || IncidentSeverity.HIGH,
          status: IncidentStatus.OPEN,
          phase: IncidentPhase.DETECTION,
          alerts: { connect: { id } }
        }
      });

      // Update alert with incident reference
      await db.alert.update({
        where: { id },
        data: {
          incidentId: incident.id,
          status: AlertStatus.ESCALATED,
          escalationCount: { increment: 1 }
        }
      });

      return NextResponse.json({
        success: true,
        message: `Alert escalated to incident ${incident.id}`,
        data: { alertId: id, incidentId: incident.id },
        timestamp: new Date().toISOString(),
      });
    }

    // Create new alert
    if (action === "create") {
      const newAlert = await db.alert.create({
        data: {
          title: alertData.title || 'New Security Alert',
          description: alertData.description,
          severity: alertData.severity?.toUpperCase() || AlertSeverity.MEDIUM,
          alertType: alertData.type?.toUpperCase() || AlertType.DETECTION,
          source: alertData.source || 'Manual',
          sourceIp: alertData.sourceIp,
          destIp: alertData.destIp,
          protocol: alertData.protocol,
          rawEvent: alertData.rawEvent ? JSON.stringify(alertData.rawEvent) : null,
          mitreTactics: alertData.mitreTactics ? JSON.stringify(alertData.mitreTactics) : null,
          mitreTechniques: alertData.mitreTechniques ? JSON.stringify(alertData.mitreTechniques) : null,
        },
        include: {
          incident: { select: { id: true, title: true } }
        }
      });

      return NextResponse.json({
        success: true,
        message: "Alert created successfully",
        data: newAlert,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: "Invalid action. Supported actions: updateStatus, toggleSuppress, escalate, create",
        supportedActions: ['updateStatus', 'toggleSuppress', 'escalate', 'create']
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Error processing alert request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/alerts - Delete an alert (admin only)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Alert ID parameter required" },
        { status: 400 }
      );
    }

    await db.alert.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Alert ${id} deleted successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error deleting alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
