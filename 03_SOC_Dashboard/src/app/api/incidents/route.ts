import { NextResponse } from "next/server";

// GET /api/incidents - Returns active incidents
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  
  // Mock incidents data
  const allIncidents = [
    {
      id: "INC-2026-0023",
      title: "Ransomware Outbreak - Finance Department",
      severity: "P1",
      status: "open",
      category: "Malware",
      assignee: "Ahmed B.",
      created: "2026-07-23T14:22:00Z",
      updated: "2026-07-23T16:45:00Z",
      description: "BlackCat ransomware detected spreading across finance network. 12 endpoints affected. Isolation in progress.",
      actions: 8,
      timeline: [
        { phase: "Detection", completed: true, time: "2026-07-23T14:22" },
        { phase: "Containment", completed: true, time: "2026-07-23T14:35" },
        { phase: "Eradication", completed: false, time: null },
        { phase: "Recovery", completed: false, time: null },
        { phase: "Lessons Learned", completed: false, time: null }
      ]
    },
    {
      id: "INC-2026-0022",
      title: "Credential Stuffing Attack - Portal Login",
      severity: "P2",
      status: "contained",
      category: "Unauthorized Access",
      assignee: "Fatima Z.",
      created: "2026-07-23T10:15:00Z",
      updated: "2026-07-23T15:30:00Z",
      description: "Large-scale credential stuffing attack against government portal. Source IPs blocked. Password reset initiated for compromised accounts.",
      actions: 12,
      timeline: [
        { phase: "Detection", completed: true, time: "2026-07-23T10:15" },
        { phase: "Containment", completed: true, time: "2026-07-23T11:00" },
        { phase: "Eradication", completed: true, time: "2026-07-23T13:00" },
        { phase: "Recovery", completed: false, time: null },
        { phase: "Lessons Learned", completed: false, time: null }
      ]
    }
  ];
  
  let filtered = allIncidents;
  if (status) filtered = filtered.filter(inc => inc.status === status);
  if (severity) filtered = filtered.filter(inc => inc.severity === severity);
  
  return NextResponse.json({
    success: true,
    data: filtered,
    total: filtered.length,
    timestamp: new Date().toISOString()
  });
}
