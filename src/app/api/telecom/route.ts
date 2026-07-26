/**
 * National SOC Platform - Telecom Security API
 * 
 * Provides telecom-specific security data:
 * - SS7 message monitoring and analysis
 * - GTP session tracking
 * - Diameter session management
 * - SIP call analysis
 * - Subscriber risk scoring
 * - Network element status
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SessionStatus, SubscriberStatus, RoamingStatus, SIPCallType, CallDirection } from "@prisma/client";

// GET /api/telecom - Fetch telecom security data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "overview"; // overview, ss7, gtp, sip, diameter, subscribers
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const highRiskOnly = searchParams.get("highRisk") === "true";

    switch (category) {
      case "ss7":
        return await getSS7Data(limit, offset, highRiskOnly);
      
      case "gtp":
        return await getGTPData(limit, offset, highRiskOnly);
      
      case "sip":
        return await getSIPData(limit, offset, highRiskOnly);
      
      case "diameter":
        return await getDiameterData(limit, offset);
      
      case "subscribers":
        return await getSubscriberData(limit, offset, highRiskOnly);
      
      case "network":
        return await getNetworkData();
      
      default:
        return await getTelecomOverview();
    }
  } catch (error) {
    console.error("❌ Error fetching telecom data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch telecom data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Overview of all telecom metrics
async function getTelecomOverview() {
  const [
    ss7Stats,
    gtpStats,
    sipStats,
    diameterStats,
    subscriberStats,
    networkStats,
    recentAnomalies
  ] = await Promise.all([
    // SS7 statistics for last 24h
    Promise.all([
      db.sS7Message.count({ 
        where: { timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      }),
      db.sS7Message.count({ 
        where: { 
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          anomalyScore: { gt: 70 }
        }
      }),
      db.sS7Message.count({ 
        where: { 
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          isBlocked: true
        }
      })
    ]),
    
    // GTP session statistics
    Promise.all([
      db.gTPSession.count({ where: { sessionStatus: 'ACTIVE' } }),
      db.gTPSession.count({ 
        where: { 
          sessionStatus: 'ACTIVE',
          anomalyScore: { gt: 70 }
        }
      })
    ]),
    
    // SIP session statistics
    Promise.all([
      db.sIPSession.count({ 
        where: { disconnectTimestamp: null }
      }),
      db.sIPSession.count({ 
        where: { 
          disconnectTimestamp: null,
          fraudIndicators: { not: null }
        }
      })
    ]),
    
    // Diameter statistics
    Promise.all([
      db.diameterSession.count({ where: { sessionStatus: 'ACTIVE' } }),
      db.diameterSession.count({ 
        where: { 
          sessionStatus: 'ACTIVE',
          isError: true
        }
      })
    ]),
    
    // Subscriber statistics
    Promise.all([
      db.subscriber.count({ where: { subscriberStatus: 'ACTIVE' } }),
      db.subscriber.count({ 
        where: { 
          subscriberStatus: 'ACTIVE',
          riskScore: { gt: 70 }
        }
      }),
      db.subscriber.count({ 
        where: { 
          subscriberStatus: 'ACTIVE',
          roamingStatus: { not: 'HOME' }
        }
      })
    ]),
    
    // Network elements
    Promise.all([
      db.networkElement.count({ where: { status: 'OPERATIONAL' } }),
      db.networkElement.count({ where: { status: 'DEGRADED' } }),
      db.networkElement.count()
    ]),

    // Recent anomalies (last 10)
    db.sS7Message.findMany({
      where: { anomalyScore: { gt: 80 } },
      orderBy: { anomalyScore: 'desc' },
      take: 10
    })
  ]);

  return NextResponse.json({
    success: true,
    category: 'overview',
    data: {
      summary: {
        ss7: {
          totalMessages24h: ss7Stats[0],
          highAnomalies: ss7Stats[1],
          blockedMessages: ss7Stats[2]
        },
        gtp: {
          activeSessions: gtpStats[0],
          highRiskSessions: gtpStats[1]
        },
        sip: {
          activeCalls: sipStats[0],
          suspiciousCalls: sipStats[1]
        },
        diameter: {
          activeSessions: diameterStats[0],
          errorSessions: diameterStats[1]
        },
        subscribers: {
          activeTotal: subscriberStats[0],
          highRisk: subscriberStats[1],
          roaming: subscriberStats[2]
        },
        network: {
          operational: networkStats[0],
          degraded: networkStats[1],
          total: networkStats[2]
        }
      },
      recentAnomalies: recentAnomalies.map(msg => ({
        id: msg.id,
        messageType: msg.messageType,
        opc: msg.opc,
        dpc: msg.dpc,
        globalTitle: msg.globalTitle,
        imsi: msg.imsi,
        anomalyScore: msg.anomalyScore,
        isBlocked: msg.isBlocked,
        timestamp: msg.timestamp,
        sourceNeId: msg.sourceNeId
      }))
    },
    timestamp: new Date().toISOString()
  });
}

// SS7-specific data
async function getSS7Data(limit: number, offset: number, highRiskOnly: boolean) {
  const where: any = {};
  
  if (highRiskOnly) {
    where.anomalyScore = { gt: 70 };
  }

  const [messages, total, byMessageType] = await Promise.all([
    db.sS7Message.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.sS7Message.count({ where }),
    db.sS7Message.groupBy({
      by: ['messageType'],
      _count: { id: true },
      where: {
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })
  ]);

  return NextResponse.json({
    success: true,
    category: 'ss7',
    data: {
      messages: messages.map(msg => ({
        id: msg.id,
        messageType: msg.messageType,
        opc: msg.opc,
        dpc: msg.dpc,
        globalTitle: msg.globalTitle,
        imsi: msg.imsi,
        msisdn: msg.msisdn,
        isRoaming: msg.isRoaming,
        isInternational: msg.isInternational,
        anomalyScore: msg.anomalyScore,
        anomalyReason: msg.anomalyReason,
        isBlocked: msg.isBlocked,
        timestamp: msg.timestamp,
        sourceNeId: msg.sourceNeId,
        destNeId: msg.destNeId
      })),
      statistics: {
        byMessageType: byMessageType.reduce((acc, m) => ({
          ...acc,
          [m.messageType]: m._count.id
        }), {} as Record<string, number>)
      },
      pagination: { total, limit, offset, hasMore: offset + limit < total }
    },
    timestamp: new Date().toISOString()
  });
}

// GTP session data
async function getGTPData(limit: number, offset: number, highRiskOnly: boolean) {
  const where: any = { sessionStatus: 'ACTIVE' };
  
  if (highRiskOnly) {
    where.anomalyScore = { gt: 70 };
  }

  const [sessions, total] = await Promise.all([
    db.gTPSession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.gTPSession.count({ where })
  ]);

  return NextResponse.json({
    success: true,
    category: 'gtp',
    data: {
      sessions: sessions.map(session => ({
        id: session.id,
        sessionType: session.sessionType.toLowerCase(),
        imsi: session.imsi,
        msisdn: session.msisdn,
        apn: session.apn,
        sourceIp: session.sourceIp,
        destIp: session.destIp,
        bytesUp: Number(session.bytesUp),
        bytesDown: Number(session.bytesDown),
        durationSeconds: session.durationSeconds,
        ratType: session.ratType?.toLowerCase(),
        anomalyScore: session.anomalyScore,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt
      })),
      pagination: { total, limit, offset, hasMore: offset + limit < total }
    },
    timestamp: new Date().toISOString()
  });
}

// SIP session/call data
async function getSIPData(limit: number, offset: number, highRiskOnly: boolean) {
  const where: any = {};
  
  if (highRiskOnly) {
    where.OR = [
      { fraudIndicators: { not: null } },
      { anomalyScore: { gt: 70 } },
      { isIntercepted: true }
    ];
  }

  const [calls, total, byCallType] = await Promise.all([
    db.sIPSession.findMany({
      where,
      orderBy: { connectTimestamp: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.sIPSession.count({ where }),
    db.sIPSession.groupBy({
      by: ['callType', 'callDirection'],
      _count: { id: true },
      where: {
        connectTimestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
  ]);

  return NextResponse.json({
    success: true,
    category: 'sip',
    data: {
      calls: calls.map(call => ({
        id: call.id,
        callId: call.callId,
        callType: call.callType.toLowerCase(),
        callDirection: call.callDirection.toLowerCase(),
        fromUser: call.fromUser,
        toUser: call.toUser,
        fromDomain: call.fromDomain,
        toDomain: call.toDomain,
        durationSeconds: call.durationSeconds,
        sourceIp: call.sourceIp,
        destIp: call.destIp,
        userAgent: call.userAgent,
        isEncrypted: call.isEncrypted,
        srtpEnabled: call.srtpEnabled,
        isIntercepted: call.isIntercepted,
        fraudIndicators: call.fraudIndicators ? JSON.parse(call.fraudIndicators) : [],
        anomalyScore: call.anomalyScore,
        connectTimestamp: call.connectTimestamp,
        disconnectTimestamp: call.disconnectTimestamp
      })),
      statistics: {
        byCallType: byCallType.reduce((acc, c) => ({
          ...acc,
          [`${c.callType}_${c.callDirection}`]: c._count.id
        }), {} as Record<string, number>)
      },
      pagination: { total, limit, offset, hasMore: offset + limit < total }
    },
    timestamp: new Date().toISOString()
  });
}

// Diameter session data
async function getDiameterData(limit: number, offset: number) {
  const [sessions, total] = await Promise.all([
    db.diameterSession.findMany({
      where: { sessionStatus: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.diameterSession.count({ where: { sessionStatus: 'ACTIVE' } })
  ]);

  return NextResponse.json({
    success: true,
    category: 'diameter',
    data: {
      sessions: sessions.map(session => ({
        id: session.id,
        sessionId: session.sessionId,
        commandCode: session.commandCode,
        originHost: session.originHost,
        userName: session.userName,
        imsi: session.imsi,
        resultCode: session.resultCode,
        isError: session.isError,
        ratedUnits: Number(session.ratedUnits),
        anomalyScore: session.anomalyScore,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt
      })),
      pagination: { total, limit, offset, hasMore: offset + limit < total }
    },
    timestamp: new Date().toISOString()
  });
}

// Subscriber data with risk scoring
async function getSubscriberData(limit: number, offset: number, highRiskOnly: boolean) {
  const where: any = { subscriberStatus: 'ACTIVE' };
  
  if (highRiskOnly) {
    where.riskScore = { gt: 70 };
  }

  const [subscribers, total, riskDistribution] = await Promise.all([
    db.subscriber.findMany({
      where,
      orderBy: { riskScore: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.subscriber.count({ where }),
    // Risk distribution
    Promise.all([
      db.subscriber.count({ where: { riskScore: { lt: 20 }, subscriberStatus: 'ACTIVE' } }),
      db.subscriber.count({ where: { riskScore: { gte: 20, lt: 40 }, subscriberStatus: 'ACTIVE' } }),
      db.subscriber.count({ where: { riskScore: { gte: 40, lt: 60 }, subscriberStatus: 'ACTIVE' } }),
      db.subscriber.count({ where: { riskScore: { gte: 60, lt: 80 }, subscriberStatus: 'ACTIVE' } }),
      db.subscriber.count({ where: { riskScore: { gte: 80 }, subscriberStatus: 'ACTIVE' } })
    ])
  ]);

  return NextResponse.json({
    success: true,
    category: 'subscribers',
    data: {
      subscribers: subscribers.map(sub => ({
        imsi: sub.imsi,
        msisdn: sub.msisdn,
        imei: sub.imei,
        imsiType: sub.imsiType.toLowerCase(),
        roamingStatus: sub.roamingStatus.toLowerCase(),
        homeCountry: sub.homeCountry,
        visitedCountry: sub.visitedCountry,
        riskScore: sub.riskScore,
        lastActivityAt: sub.lastActivityAt
      })),
      statistics: {
        riskDistribution: {
          low: riskDistribution[0],       // 0-20
          moderate: riskDistribution[1],   // 20-40
          medium: riskDistribution[2],     // 40-60
          high: riskDistribution[3],       // 60-80
          critical: riskDistribution[4]    // 80+
        }
      },
      pagination: { total, limit, offset, hasMore: offset + limit < total }
    },
    timestamp: new Date().toISOString()
  });
}

// Network elements status
async function getNetworkData() {
  const elements = await db.networkElement.findMany({
    orderBy: { hostname: 'asc' }
  });

  return NextResponse.json({
    success: true,
    category: 'network',
    data: {
      elements: elements.map(el => ({
        id: el.id,
        hostname: el.hostname,
        elementType: el.elementType.toLowerCase(),
        ipAddress: el.ipAddress,
        vendor: el.vendor,
        softwareVersion: el.softwareVersion,
        status: el.status.toLowerCase(),
        capacity: el.capacity,
        location: el.location,
        redundancyGroup: el.redundancyGroup,
        securityZone: el.securityZone,
        lastHeartbeat: el.lastHeartbeat
      }))
    },
    timestamp: new Date().toISOString()
  });
}
