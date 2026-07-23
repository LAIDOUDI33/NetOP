import { NextResponse } from "next/server";

// GET /api/alerts - Returns security alerts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const severity = searchParams.get("severity");
  const limit = parseInt(searchParams.get("limit") || "20");
  
  // Mock alerts data
  const allAlerts = [
    {
      id: "ALT-2026-00147",
      timestamp: "2026-07-23T16:38:22Z",
      severity: "critical",
      source: "Wazuh SIEM",
      title: "Ransomware Detection Pattern Match",
      description: "Multiple file encryption events detected on workstation FIN-DEPT-0142. Potential BlackCat/ALPHV ransomware activity.",
      endpoint: "FIN-DEPT-0142",
      status: "new"
    },
    {
      id: "ALT-2026-00146",
      timestamp: "2026-07-23T16:35:10Z",
      severity: "high",
      source: "Wazuh EDR",
      title: "Suspicious PowerShell Execution",
      description: "Encoded PowerShell command executed with -enc flag. Possible living-off-the-land technique.",
      endpoint: "HR-SRV-0089",
      status: "investigating"
    },
    {
      id: "ALT-2026-00145",
      timestamp: "2026-07-23T16:32:45Z",
      severity: "high",
      source: "MISP TIP",
      title: "IOC Match: Known APT Indicator",
      description: "C2 server IP 185.220.101[.]34 detected in outbound traffic. Associated with APT28 activity.",
      endpoint: "EXT-GW-002",
      status: "acknowledged"
    }
  ];
  
  let filteredAlerts = allAlerts;
  if (severity && severity !== "all") {
    filteredAlerts = allAlerts.filter(alert => alert.severity === severity);
  }
  
  filteredAlerts = filteredAlerts.slice(0, limit);
  
  return NextResponse.json({
    success: true,
    data: filteredAlerts,
    total: filteredAlerts.length,
    timestamp: new Date().toISOString()
  });
}

// POST /api/alerts - Update alert status
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { alertId, status } = body;
    
    console.log(`Updating alert ${alertId} to status: ${status}`);
    
    return NextResponse.json({
      success: true,
      message: `Alert ${alertId} updated to ${status}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
