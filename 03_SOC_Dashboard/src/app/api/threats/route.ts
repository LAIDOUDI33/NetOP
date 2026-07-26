import { NextResponse } from "next/server";

// GET /api/threats - Returns threat intelligence data
export async function GET() {
  // Mock threat intelligence data
  const data = {
    // Active Threat Actors
    actors: [
      { id: "APT-001", name: "APT28 (Fancy Bear)", country: "Russia", capability: "advanced", confidence: 95, lastSeen: "2026-07-22" },
      { id: "APT-002", name: "APT29 (Cozy Bear)", country: "Russia", capability: "advanced", confidence: 92, lastSeen: "2026-07-20" },
      { id: "APT-003", name: "Lazarus Group", country: "North Korea", capability: "advanced", confidence: 89, lastSeen: "2026-07-21" },
      { id: "APT-004", name: "Silent Librarian", country: "Iran", capability: "moderate", confidence: 85, lastSeen: "2026-07-18" }
    ],
    
    // Indicators of Compromise
    iocs: [
      { type: "ip", value: "185.220.101[.]34", level: "critical", source: "MISP Community", firstSeen: "2026-07-15" },
      { type: "domain", value: "malicious-cdn[.]tk", level: "high", source: "AlienVault OTX", firstSeen: "2026-07-18" },
      { type: "hash", value: "a1b2c3d4e5f6...", level: "high", source: "VirusTotal", firstSeen: "2026-07-20" },
      { type: "url", value: "hxxp://phishing[.]xyz/login", level: "medium", source: "PhishTank", firstSeen: "2026-07-22" }
    ],
    
    // Threat Landscape Summary
    landscape: {
      criticalIOCs: 47,
      activeCampaigns: 12,
      targetedSectors: ["Government", "Finance", "Defense", "Energy", "Telecommunications"],
      blockedThreats24h: 2847,
      trends: [
        { category: "Ransomware", percentage: 78, trend: "up" },
        { category: "Phishing", percentage: 65, trend: "stable" },
        { category: "APT Reconnaissance", percentage: 42, trend: "up" },
        { category: "DDoS Attempts", percentage: 28, trend: "down" }
      ]
    },
    
    // MISP Statistics
    mispStats: {
      totalAttributes: 152847,
      totalEvents: 12456,
      attributesToday: 347,
      eventsToday: 28,
      feedsActive: 15,
      correlationRules: 234
    }
  };

  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
    source: "MISP + OpenCTI Integration"
  });
}
