import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AlertSeverity, AlertStatus } from "@prisma/client";

// GET /api/alerts - Returns security alerts from database
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity") as AlertSeverity | null;
    const status = searchParams.get("status") as AlertStatus | null;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: any = {};
    if (severity && severity !== "all") {
      where.severity = severity;
    }
    if (status && status !== "all") {
      where.status = status;
    }

    // Query alerts with pagination
    const [alerts, total] = await Promise.all([
      db.alert.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
        include: {
          incident: {
            select: {
              incidentId: true,
              title: true,
              status: true,
            },
          },
        },
      }),
      db.alert.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: alerts.map(alert => ({
        ...alert,
        alertId: alert.alertId,
        severity: alert.severity.toLowerCase(),
        status: alert.status.toLowerCase(),
      })),
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create or update alert
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, alertId, status, ...alertData } = body;

    if (action === "updateStatus" && alertId && status) {
      // Update alert status
      const updateData: any = { 
        status: status.toUpperCase() 
      };
      
      if (status === "ACKNOWLEDGED") {
        updateData.acknowledgedAt = new Date();
      } else if (status === "RESOLVED" || status === "FALSE_POSITIVE") {
        updateData.resolvedAt = new Date();
      }

      const updatedAlert = await db.alert.update({
        where: { alertId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        message: `Alert ${alertId} updated to ${status}`,
        data: updatedAlert,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "create") {
      // Create new alert
      const newAlert = await db.alert.create({
        data: {
          alertId: alertId || `ALT-${Date.now()}`,
          ...alertData,
          severity: alertData.severity?.toUpperCase() || AlertSeverity.MEDIUM,
          status: AlertStatus.NEW,
          timestamp: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Alert created successfully",
        data: newAlert,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'create' or 'updateStatus'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing alert request:", error);
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// DELETE /api/alerts - Delete an alert (admin only)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get("alertId");

    if (!alertId) {
      return NextResponse.json(
        { success: false, error: "alertId parameter required" },
        { status: 400 }
      );
    }

    await db.alert.delete({ where: { alertId } });

    return NextResponse.json({
      success: true,
      message: `Alert ${alertId} deleted`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
