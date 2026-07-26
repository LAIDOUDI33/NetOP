import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IncidentPriority, IncidentStatus } from "@prisma/client";

// GET /api/incidents - Returns active incidents from database
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as IncidentStatus | null;
    const severity = searchParams.get("severity") as IncidentPriority | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (severity && severity !== "all") {
      where.severity = severity;
    }

    // Query incidents with relations
    const [incidents, total] = await Promise.all([
      db.incident.findMany({
        where,
        orderBy: { detectedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          alerts: {
            take: 5,
            orderBy: { timestamp: "desc" },
            select: {
              id: true,
              alertId: true,
              title: true,
              severity: true,
              status: true,
              timestamp: true,
            },
          },
          _count: {
            select: { alerts: true },
          },
        },
      }),
      db.incident.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: incidents.map(incident => ({
        ...incident,
        incidentId: incident.incidentId,
        severity: incident.severity.toLowerCase(),
        status: incident.status.toLowerCase(),
        assignee: incident.assignee?.name || "Unassigned",
        alertCount: incident._count.alerts,
        timeline: getIncidentTimeline(incident),
      })),
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      stats: await getIncidentStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

// POST /api/incidents - Create or update incident
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, incidentId, ...incidentData } = body;

    if (action === "updateStatus" && incidentId) {
      // Update incident status and timestamps
      const statusUpdate: any = { 
        status: (incidentData.status as IncidentStatus).toUpperCase() 
      };
      
      const now = new Date();
      switch (statusUpdate.status) {
        case "CONTAINED":
          statusUpdate.containedAt = now;
          break;
        case "ERADICATED":
          statusUpdate.eradicatedAt = now;
          break;
        case "RECOVERED":
          statusUpdate.recoveredAt = now;
          break;
        case "CLOSED":
          statusUpdate.closedAt = now;
          // Calculate MTTR
          const existingIncident = await db.incident.findUnique({
            where: { incidentId }
          });
          if (existingIncident) {
            const diffMs = now.getTime() - existingIncident.detectedAt.getTime();
            statusUpdate.mttrHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
          }
          break;
      }

      statusUpdate.actionsTaken = { increment: 1 };

      const updatedIncident = await db.incident.update({
        where: { incidentId },
        data: statusUpdate,
      });

      return NextResponse.json({
        success: true,
        message: `Incident ${incidentId} updated to ${statusUpdate.status}`,
        data: updatedIncident,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "create") {
      // Create new incident
      const newIncident = await db.incident.create({
        data: {
          incidentId: incidentData.incidentId || `INC-${Date.now()}`,
          title: incidentData.title,
          description: incidentData.description,
          severity: (incidentData.severity || "P3").toUpperCase(),
          category: incidentData.category || "Unclassified",
          assigneeId: incidentData.assigneeId,
          detectedAt: new Date(),
          ...incidentData,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Incident created successfully",
        data: newIncident,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'create' or 'updateStatus'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing incident request:", error);
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// Helper function to generate incident timeline
function getIncidentTimeline(incident: any) {
  const phases = [
    { phase: "Detection", completed: !!incident.detectedAt, time: incident.detectedAt?.toISOString() },
    { phase: "Containment", completed: !!incident.containedAt, time: incident.containedAt?.toISOString() },
    { phase: "Eradication", completed: !!incident.eradicatedAt, time: incident.eradicatedAt?.toISOString() },
    { phase: "Recovery", completed: !!incident.recoveredAt, time: incident.recoveredAt?.toISOString() },
    { phase: "Lessons Learned", completed: !!incident.closedAt, time: incident.closedAt?.toISOString() },
  ];
  
  return phases;
}

// Helper function to get overall incident statistics
async function getIncidentStats() {
  const [
    totalOpen,
    p1Count,
    p2Count,
    avgMTTR,
    closedThisWeek,
    closedThisMonth
  ] = await Promise.all([
    db.incident.count({ where: { status: "OPEN" } }),
    db.incident.count({ where: { status: "OPEN", severity: "P1" } }),
    db.incident.count({ where: { status: "OPEN", severity: "P2" } }),
    db.incident.aggregate({
      _avg: { mttrHours: true },
      where: { status: "CLOSED", mttrHours: { not: null } }
    }),
    db.incident.count({
      where: {
        closedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    }),
    db.incident.count({
      where: {
        closedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    })
  ]);

  return {
    open: totalOpen,
    critical: p1Count,
    high: p2Count,
    avgMTTR: avgMTTR._avg.mttrHours?.toFixed(1) || "N/A",
    resolvedThisWeek: closedThisWeek,
    resolvedThisMonth: closedThisMonth,
  };
}
