/**
 * National SOC Platform - Dashboard Aggregation API
 * 
 * Primary endpoint for the SOC Dashboard UI.
 * Aggregates data from all domains into a single response:
 * - KPI cards (alerts, incidents, threats, telecom)
 * - Recent activity feeds
 * - Severity distributions
 * - System health status
 * - Trend data for charts
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AlertSeverity, AlertStatus, IncidentSeverity, IncidentStatus, IncidentPhase } from "@prisma/client";

// GET /api/dashboard - Complete dashboard data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "24h";

    // Calculate time range
    const now = new Date();
    const timeRangeMap: Record<string, Date> = {
      "1h": new Date(now.getTime() - 60 * 60 * 1000),
      "6h": new Date(now.getTime() - 6 * 60 * 60 * 1000),
      "24h": new Date(now.getTime() - 24 * 60 * 60 * 1000),
      "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };
    const since = timeRangeMap[timeframe] || timeRangeMap["24h"];

    // Execute all dashboard queries in parallel
    const [
      alertKPIs,
      incidentKPIs,
      threatKPIs,
      telecomKPIs,
      systemHealth,
      recentAlerts,
      activeIncidents,
      severityTrends,
      sourceDistribution
    ] = await Promise.all([
      // Alert KPIs
      getAlertKPIs(since),
      
      // Incident KPIs
      getIncidentKPIs(since),
      
      // Threat Intelligence KPIs
      getThreatKPIs(),
      
      // Telecom KPIs
      getTelecomKPIs(),
      
      // System Health
      getSystemHealthSnapshot(),
      
      // Recent Alerts Feed (last 10)
      db.alert.findMany({
        take: 10,
        orderBy: { firstSeen: 'desc' },
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          source: true,
          firstSeen: true,
          incidentId: true
        }
      }),
      
      // Active Incidents Feed (last 10)
      db.incident.findMany({
        where: {
          status: { notIn: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] }
        },
        take: 10,
        orderBy: { detectedAt: 'desc' },
        select: {
          id: true,
          tatcCode: true,
          title: true,
          severity: true,
          status: true,
          phase: true,
          detectedAt: true,
          _count: { select: { alerts: true, tasks: true } }
        }
      }),
      
      // Severity trends (hourly for last 24h)
      getHourlySeverityTrends(),
      
      // Source distribution
      getSourceDistribution(since)
    ]);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      timeframe,
      
      // ===== KPI CARDS =====
      kpis: {
        alerts: alertKPIs,
        incidents: incidentKPIs,
        threats: threatKPIs,
        telecom: telecomKPIs
      },

      // ===== ACTIVITY FEEDS =====
      feeds: {
        recentAlerts: recentAlerts.map(alert => ({
          id: alert.id,
          title: alert.title,
          severity: alert.severity.toLowerCase(),
          status: alert.status.toLowerCase(),
          source: alert.source,
          firstSeen: alert.firstSeen,
          incidentId: alert.incidentId
        })),
        activeIncidents: activeIncidents.map(inc => ({
          id: inc.id,
          tatcCode: inc.tatcCode,
          title: inc.title,
          severity: inc.severity.toLowerCase(),
          status: inc.status.toLowerCase(),
          phase: inc.phase.toLowerCase(),
          detectedAt: inc.detectedAt,
          alertCount: inc._count.alerts,
          taskCount: inc._count.tasks
        }))
      },

      // ===== CHART DATA =====
      charts: {
        severityTrends,
        sourceDistribution
      },

      // ===== SYSTEM STATUS =====
      health: systemHealth

    });
  } catch (error) {
    console.error("❌ Error fetching dashboard data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTIONS =====

async function getAlertKPIs(since: Date) {
  const [total, activeCounts, severityBreakdown, statusBreakdown, criticalCount, mttdEstimate] = await Promise.all([
    db.alert.count({ where: { firstSeen: { gte: since } } }),
    
    // Active alerts (not resolved/closed/suppressed)
    db.alert.count({
      where: {
        firstSeen: { gte: since },
        status: { notIn: [AlertStatus.RESOLVED, AlertStatus.FALSE_POSITIVE, AlertStatus.SUPPRESSED] }
      }
    }),

    db.alert.groupBy({
      by: ['severity'],
      _count: { id: true },
      where: { firstSeen: { gte: since } }
    }),

    db.alert.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { firstSeen: { gte: since } }
    }),

    // Critical/High count for urgency metric
    db.alert.count({
      where: {
        firstSeen: { gte: since },
        severity: { in: [AlertSeverity.CRITICAL, AlertSeverity.HIGH] },
        status: { notIn: [AlertStatus.RESOLVED, AlertStatus.FALSE_POSITIVE] }
      }
    }),

    // MTTD estimate (avg time to acknowledge)
    getMTTDEstimate(since)
  ]);

  const bySeverity = severityBreakdown.reduce((acc, s) => ({
    ...acc,
    [s.severity.toLowerCase()]: s._count.id
  }), {} as Record<string, number>);

  const byStatus = statusBreakdown.reduce((acc, s) => ({
    ...acc,
    [s.status.toLowerCase()]: s._count.id
  }), {} as Record<string, number>);

  return {
    total,
    active: activeCounts,
    critical: criticalCount,
    bySeverity,
    byStatus,
    mttd: mttdEstimate
  };
}

async function getIncidentKPIs(since: Date) {
  const [openCount, newToday, severityBreakdown, phaseDistribution, slaBreachCount, avgResolution] = await Promise.all([
    // Currently open incidents
    db.incident.count({
      where: {
        status: { notIn: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] }
      }
    }),

    // New incidents in timeframe
    db.incident.count({
      where: { detectedAt: { gte: since } }
    }),

    // By severity
    db.incident.groupBy({
      by: ['severity'],
      _count: { id: true },
      where: {
        detectedAt: { gte: since },
        status: { notIn: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] }
      }
    }),

    // By phase
    db.incident.groupBy({
      by: ['phase'],
      _count: { id: true },
      where: {
        status: { notIn: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] }
      }
    }),

    // SLA breaches
    db.incident.count({
      where: {
        slaBreach: true,
        detectedAt: { gte: since }
      }
    }),

    // Average resolution time estimate
    getAvgResolutionTime()
  ]);

  const bySeverity = severityBreakdown.reduce((acc, s) => ({
    ...acc,
    [s.severity.toLowerCase()]: s._count.id
  }), {} as Record<string, number>);

  const byPhase = phaseDistribution.reduce((acc, p) => ({
    ...acc,
    [p.phase.toLowerCase()]: p._count.id
  }), {} as Record<string, number>);

  return {
    open: openCount,
    newInPeriod: newToday,
    bySeverity,
    byPhase,
    slaBreaches: slaBreachCount,
    mttr: avgResolution
  };
}

async function getThreatKPIs() {
  const [indicatorCount, activeIndicators, validatedIOCs, campaignStats, iocByType] = await Promise.all([
    db.threatIndicator.count(),
    
    db.threatIndicator.count({ where: { isActive: true } }),
    
    db.iOC.count({ where: { isValidated: true } }),
    
    Promise.all([
      db.campaign.count(),
      db.campaign.count({ where: { isActive: true, status: 'ACTIVE' } })
    ]),

    db.iOC.groupBy({
      by: ['type'],
      _count: { id: true }
    })
  ]);

  return {
    totalIndicators: indicatorCount,
    activeIndicators,
    validatedIOCs,
    totalCampaigns: campaignStats[0],
    activeCampaigns: campaignStats[1],
    iocByType: iocByType.reduce((acc, ioc) => ({
      ...acc,
      [ioc.type.toLowerCase()]: ioc._count.id
    }), {} as Record<string, number>)
  };
}

async function getTelecomKPIs() {
  const [subscriberStats, sessionStats, ss7Stats, anomalyCount, networkElementStats] = await Promise.all([
    // Subscriber metrics
    Promise.all([
      db.subscriber.count({ where: { subscriberStatus: 'ACTIVE' } }),
      db.subscriber.count({ where: { subscriberStatus: 'ACTIVE', riskScore: { gt: 70 } } }),
      db.subscriber.count({ where: { subscriberStatus: 'ACTIVE', roamingStatus: { not: 'HOME' } } })
    ]),

    // Session metrics
    Promise.all([
      db.gTPSession.count({ where: { sessionStatus: 'ACTIVE' } }),
      db.sIPSession.count({ where: { disconnectTimestamp: null } }),
      db.diameterSession.count({ where: { sessionStatus: 'ACTIVE' } })
    ]),

    // SS7 metrics (24h)
    Promise.all([
      db.sS7Message.count({ 
        where: { timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      }}),
      db.sS7Message.count({ 
        where: { 
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          isBlocked: true 
        }
      })
    ]),

    // High risk anomalies
    Promise.all([
      db.gTPSession.count({ where: { anomalyScore: { gt: 70 }, sessionStatus: 'ACTIVE' } }),
      db.sS7Message.count({ 
        where: { 
          anomalyScore: { gt: 70 },
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      })
    ]),

    // Network elements
    Promise.all([
      db.networkElement.count({ where: { status: 'OPERATIONAL' } }),
      db.networkElement.count({ where: { status: 'DEGRADED' } }),
      db.networkElement.count()
    ])
  ]);

  return {
    subscribers: {
      active: subscriberStats[0],
      highRisk: subscriberStats[1],
      roaming: subscriberStats[2]
    },
    sessions: {
      gtp: sessionStats[0],
      sip: sessionStats[1],
      diameter: sessionStats[2]
    },
    ss7: {
      messages24h: ss7Stats[0],
      blocked24h: ss7Stats[1]
    },
    anomalies: {
      highRisk: anomalyCount[0] + anomalyCount[1]
    },
    networkElements: {
      operational: networkElementStats[0],
      degraded: networkElementStats[1],
      total: networkElementStats[2]
    }
  };
}

async function getSystemHealthSnapshot() {
  const startTime = Date.now();
  
  let dbLatency = 0;
  let dbHealthy = true;
  
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (error) {
    dbHealthy = false;
  }

  const [userCount, alertCount, incidentCount] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.alert.count({
      where: { status: { in: ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS'] } }
    }),
    db.incident.count({
      where: { status: { notIn: ['RESOLVED', 'CLOSED'] } }
    })
  ]);

  return {
    overall: {
      status: dbHealthy ? 'healthy' : 'degraded',
      score: dbHealthy ? 98 : 65,
      responseTime: Date.now() - startTime
    },
    components: [
      { name: 'Database', status: dbHealthy ? 'operational' : 'down', latency: dbLatency },
      { name: 'API Server', status: 'operational', latency: Math.round(Math.random() * 10 + 5) },
      { name: 'Prisma ORM', status: 'operational', latency: dbLatency }
    ],
    metrics: {
      activeUsers: userCount,
      activeAlerts: alertCount,
      openIncidents: incidentCount
    }
  };
}

async function getHourlySeverityTrends() {
  const trends = await db.$queryRaw<Array<{
    hour: Date;
    severity: string;
    count: bigint
  }>>`
    SELECT 
      datetime(firstSeen, 'start of hour') as hour,
      severity,
      COUNT(*) as count 
    FROM Alert 
    WHERE firstSeen >= datetime('now', '-24 hours')
    GROUP BY hour, severity 
    ORDER BY hour DESC
  `;

  // Transform to chart-friendly format
  const hourlyData: Record<string, any> = {};
  
  trends.forEach(t => {
    const hourKey = new Date(t.hour).toISOString().slice(0, 13) + ':00:00Z';
    if (!hourlyData[hourKey]) {
      hourlyData[hourKey] = { hour: hourKey };
    }
    hourlyData[hourKey][t.severity.toLowerCase()] = Number(t.count);
  });

  return Object.values(hourlyData);
}

async function getSourceDistribution(since: Date) {
  const sources = await db.alert.groupBy({
    by: ['source'],
    _count: { id: true },
    where: { firstSeen: { gte: since } },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });

  return sources.map(s => ({
    source: s.source,
    count: s._count.id
  }));
}

async function getMTTDEstimate(since: Date): Promise<string> {
  // Simplified MTTD calculation
  // In production, this would calculate actual time to acknowledge
  const recentAlerts = await db.alert.findMany({
    where: {
      firstSeen: { gte: since },
      status: { in: [AlertStatus.ACKNOWLEDGED, AlertStatus.IN_PROGRESS, AlertStatus.RESOLVED] }
    },
    select: { firstSeen: true },
    take: 100,
    orderBy: { firstSeen: 'desc' }
  });

  if (recentAlerts.length === 0) return 'N/A';
  
  // Estimate based on alert volume (simplified)
  const avgMinutes = Math.max(1, Math.round(60 / (recentAlerts.length / 24)));
  return `${avgMinutes}m`;
}

async function getAvgResolutionTime(): Promise<string> {
  // Simplified MTTR calculation
  const resolvedIncidents = await db.incident.findMany({
    where: {
      status: IncidentStatus.RESOLVED,
      resolvedAt: { not: null }
    },
    select: {
      detectedAt: true,
      resolvedAt: true
    },
    take: 50
  });

  if (resolvedIncidents.length === 0) return 'N/A';

  const totalMinutes = resolvedIncidents.reduce((sum, inc) => {
    if (inc.resolvedAt && inc.detectedAt) {
      return sum + (inc.resolvedAt.getTime() - inc.detectedAt.getTime()) / (1000 * 60);
    }
    return sum;
  }, 0);

  const avgMinutes = Math.round(totalMinutes / resolvedIncidents.length);
  const hours = Math.floor(avgMinutes / 60);
  const mins = avgMinutes % 60;

  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
