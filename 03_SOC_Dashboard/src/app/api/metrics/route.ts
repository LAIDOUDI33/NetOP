import { NextResponse } from "next/server";

// GET /api/metrics - Returns SOC KPI metrics
export async function GET() {
  // Mock metrics data - simulating real SOC data
  const metrics = {
    // Core Security Metrics
    alerts: {
      active: 147,
      critical: 12,
      high: 34,
      medium: 67,
      low: 34,
      resolvedToday: 89,
      mttr: "1.4h",
      change: { value: 12.5, direction: "up" as const }
    },
    threats: {
      blockedToday: 2847,
      blockedWeek: 19847,
      topTypes: ["Ransomware", "Phishing", "Malware", "DDoS", "APT"],
      change: { value: 8.3, direction: "up" as const }
    },
    processing: {
      eps: 847000,
      epsMax: 1000000,
      eventsToday: 73100000,
      storageUsed: "2.4TB",
      storageTotal: "10TB"
    },
    endpoints: {
      total: 148293,
      protected: 148293,
      online: 142847,
      offline: 5446,
      coverage: 99.7
    },
    incidents: {
      open: 23,
      p1: 3,
      p2: 8,
      p3: 9,
      p4: 3,
      resolvedThisWeek: 45
    },
    threatIntel: {
      iocsActive: 47,
      threatActorsTracked: 24,
      feedsConnected: 15,
      lastUpdate: new Date().toISOString()
    }
  };

  return NextResponse.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
    source: "National SOC Algeria - Open Source Stack"
  });
}
