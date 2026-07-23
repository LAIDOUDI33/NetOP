"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Types
interface Incident {
  id: string;
  title: string;
  severity: "P1" | "P2" | "P3" | "P4";
  status: "open" | "contained" | "eradicated" | "recovered" | "closed";
  category: string;
  assignee: string;
  created: string;
  updated: string;
  description: string;
  actions: number;
}

// Mock incidents data - realistic SOC scenarios
const mockIncidents: Incident[] = [
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
    actions: 8
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
    actions: 12
  },
  {
    id: "INC-2026-0021",
    title: "Data Exfiltration Attempt - Research Lab",
    severity: "P1",
    status: "eradicated",
    category: "Data Breach",
    assignee: "Karim M.",
    created: "2026-07-22T22:40:00Z",
    updated: "2026-07-23T08:00:00Z",
    description: "Unusual large file transfers detected to external IP. Threat actor access revoked. Forensic analysis ongoing.",
    actions: 15
  },
  {
    id: "INC-2026-0020",
    title: "Phishing Campaign - Government Email",
    severity: "P3",
    status: "recovered",
    category: "Social Engineering",
    assignee: "Amina K.",
    created: "2026-07-21T09:30:00Z",
    updated: "2026-07-22T16:00:00Z",
    description: "Spear-phishing campaign targeting executives. Malicious emails quarantined. User awareness training deployed.",
    actions: 6
  },
  {
    id: "INC-2019-0019",
    title: "DDoS Mitigation - Public Services Portal",
    severity: "P2",
    status: "closed",
    category: "Denial of Service",
    assignee: "Omar H.",
    created: "2026-07-20T11:00:00Z",
    updated: "2026-07-21T10:00:00Z",
    description: "Volumetric DDoS attack mitigated via CDN failover. Root cause identified as botnet. Enhanced rate limiting implemented.",
    actions: 9
  }
];

// Severity and Status configurations
const severityConfig = {
  P1: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "P1 - Critical" },
  P2: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "P2 - High" },
  P3: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "P3 - Medium" },
  P4: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "P4 - Low" }
};

const statusConfig = {
  open: { color: "bg-red-500", label: "Open" },
  contained: { color: "bg-orange-500", label: "Contained" },
  eradicated: { color: "bg-yellow-500", label: "Eradicated" },
  recovered: { color: "bg-blue-500", label: "Recovered" },
  closed: { color: "bg-green-500", label: "Closed" }
};

const statusOrder = ["open", "contained", "eradicated", "recovered", "closed"];

// Main Incident Management Component
export function IncidentManagement() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidents] = useState(mockIncidents);

  // Calculate statistics
  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === "open").length,
    p1: incidents.filter(i => i.severity === "P1").length,
    mttr: calculateMTTR(incidents)
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Incident List */}
      <Card className="bg-slate-800/50 border-slate-700/50 lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Active Incidents
            </CardTitle>
            
            {/* Quick Stats */}
            <div className="flex gap-2">
              <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10">
                {stats.open} Open
              </Badge>
              <Badge variant="outline" className="border-orange-500/50 text-orange-400 bg-orange-500/10">
                {stats.p1} P1 Critical
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-slate-700/50">
            {incidents.map((incident) => (
              <IncidentRow 
                key={incident.id} 
                incident={incident}
                isSelected={selectedIncident?.id === incident.id}
                onClick={() => setSelectedIncident(incident)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Incident Detail Panel */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Incident Details</CardTitle>
        </CardHeader>
        
        <CardContent>
          {selectedIncident ? (
            <IncidentDetail incident={selectedIncident} />
          ) : (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className="text-sm">Select an incident to view details</p>
            </div>
          )}
          
          {/* Summary Stats */}
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Summary</h4>
            <div className="space-y-2">
              <StatRow label="Total Incidents" value={stats.total.toString()} />
              <StatRow label="Open Cases" value={stats.open.toString()} highlight />
              <StatRow label="Critical (P1)" value={stats.p1.toString()} highlight />
              <StatRow label="Avg MTTR" value={`${stats.mttr}h`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Incident Row Component
function IncidentRow({ incident, isSelected, onClick }: { incident: Incident; isSelected: boolean; onClick: () => void }) {
  const severity = severityConfig[incident.severity];
  const status = statusConfig[incident.status];

  return (
    <div 
      className={`p-4 hover:bg-slate-700/30 transition-colors cursor-pointer ${isSelected ? 'bg-slate-700/50 border-l-2 border-l-emerald-500' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className={`text-xs ${severity.color}`}>
              {severity.label}
            </Badge>
            <span className="text-xs text-slate-500 font-mono">{incident.id}</span>
          </div>
          <h4 className="text-sm font-medium text-white truncate">{incident.title}</h4>
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{incident.description}</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${status.color}`} />
            <span className="text-xs text-slate-400">{status.label}</span>
          </div>
          <span className="text-xs text-slate-600">{formatTimeAgo(incident.updated)}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/30">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{incident.category}</span>
          <span>•</span>
          <span>{incident.assignee}</span>
        </div>
        <span className="text-xs text-slate-600">{incident.actions} actions</span>
      </div>
    </div>
  );
}

// Incident Detail Component
function IncidentDetail({ incident }: { incident: Incident }) {
  const severity = severityConfig[incident.severity];
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Badge variant="outline" className={`text-xs ${severity.color} mb-2`}>
          {severity.label}
        </Badge>
        <h3 className="text-sm font-semibold text-white leading-tight">{incident.title}</h3>
      </div>
      
      {/* Description */}
      <p className="text-xs text-slate-400 leading-relaxed">{incident.description}</p>
      
      {/* Metadata */}
      <div className="space-y-2 text-xs">
        <MetaRow label="Status" value={
          <Badge variant="outline" className={`text-xs ${statusConfig[incident.status].color} bg-current/10 border-current/30`}>
            {statusConfig[incident.status].label}
          </Badge>
        } />
        <MetaRow label="Category" value={incident.category} />
        <MetaRow label="Assignee" value={incident.assignee} />
        <MetaRow label="Created" value={new Date(incident.created).toLocaleString()} />
        <MetaRow label="Last Updated" value={new Date(incident.updated).toLocaleString()} />
      </div>
      
      {/* Timeline Progress */}
      <div className="pt-3 border-t border-slate-700/50">
        <p className="text-xs text-slate-400 mb-2">Response Progress</p>
        <IncidentTimeline currentStatus={incident.status} />
      </div>
      
      {/* Quick Actions */}
      <div className="pt-3 space-y-2">
        <Button size="sm" variant="default" className="w-full bg-emerald-600 hover:bg-emerald-700">
          Take Action
        </Button>
        <Button size="sm" variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
          View Full Timeline
        </Button>
      </div>
    </div>
  );
}

// Incident Timeline Component
function IncidentTimeline({ currentStatus }: { currentStatus: Incident["status"] }) {
  const currentIndex = statusOrder.indexOf(currentStatus);
  
  return (
    <div className="flex items-center justify-between gap-1">
      {statusOrder.map((status, index) => (
        <div key={status} className="flex flex-col items-center flex-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            index <= currentIndex ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500'
          }`}>
            {index + 1}
          </div>
          <span className={`text-[10px] mt-1 ${
            index <= currentIndex ? 'text-emerald-400' : 'text-slate-600'
          }`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Helper Components
function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-white' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <div className="text-slate-300">{value}</div>
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function calculateMTTR(incidents: Incident[]): number {
  const closedIncidents = incidents.filter(i => ["closed", "recovered"].includes(i.status));
  if (closedIncidents.length === 0) return 4.2; // Default mock value
  
  // Simplified MTTR calculation (in hours)
  return Math.round((closedIncidents.reduce((sum, inc) => {
    const diff = new Date(inc.updated).getTime() - new Date(inc.created).getTime();
    return sum + diff / 3600000;
  }, 0) / closedIncidents.length) * 10) / 10;
}
