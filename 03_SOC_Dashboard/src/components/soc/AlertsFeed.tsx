"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Types
interface Alert {
  id: string;
  timestamp: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  source: string;
  title: string;
  description: string;
  endpoint?: string;
  status: "new" | "acknowledged" | "investigating" | "resolved";
}

// Mock alerts data - realistic SOC scenarios
const mockAlerts: Alert[] = [
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
  },
  {
    id: "ALT-2026-00144",
    timestamp: "2026-07-23T16:28:33Z",
    severity: "medium",
    source: "Suricata IDS",
    title: "Potential SQL Injection Attempt",
    description: "Multiple SQL injection patterns detected against web application portal.gov.dz.",
    endpoint: "WEB-PROXY-01",
    status: "investigating"
  },
  {
    id: "ALT-2026-00143",
    timestamp: "2026-07-23T16:25:18Z",
    severity: "medium",
    source: "Wazuh FIM",
    title: "Critical File Modification Detected",
    description: "/etc/passwd modification detected on database server. Unauthorized change attempt.",
    endpoint: "DB-MASTER-01",
    status: "acknowledged"
  },
  {
    id: "ALT-2026-00142",
    timestamp: "2026-07-23T16:20:05Z",
    severity: "low",
    source: "Wazuh SIEM",
    title: "Multiple Failed Login Attempts",
    description: "15 failed SSH login attempts from IP 203.0.113[.]47 within 5 minutes. Brute force indicator.",
    endpoint: "SSH-BASTION",
    status: "resolved"
  },
  {
    id: "ALT-2026-00141",
    timestamp: "2026-07-23T16:15:42Z",
    severity: "info",
    source: "TheHive SOAR",
    title: "Automated Playbook Executed",
    description: "Phishing analysis playbook completed. Email classified as spam with 98% confidence.",
    endpoint: "MAIL-GW-01",
    status: "resolved"
  }
];

// Severity configuration
const severityConfig = {
  critical: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "CRITICAL", dot: "bg-red-500" },
  high: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "HIGH", dot: "bg-orange-500" },
  medium: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "MEDIUM", dot: "bg-yellow-500" },
  low: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "LOW", dot: "bg-blue-500" },
  info: { color: "bg-slate-500/20 text-slate-400 border-slate-500/30", label: "INFO", dot: "bg-slate-500" }
};

const statusConfig = {
  new: { color: "bg-emerald-500/20 text-emerald-400", label: "New" },
  acknowledged: { color: "bg-cyan-500/20 text-cyan-400", label: "Acknowledged" },
  investigating: { color: "bg-yellow-500/20 text-yellow-400", label: "Investigating" },
  resolved: { color: "bg-slate-500/20 text-slate-400", label: "Resolved" }
};

// Main Alerts Feed Component
export function AlertsFeed() {
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [alerts, setAlerts] = useState(mockAlerts);

  // Filter alerts based on selected filters
  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity;
    const matchesSearch = alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  // Update alert status
  const updateAlertStatus = (alertId: string, newStatus: Alert["status"]) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, status: newStatus } : alert
    ));
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Live Security Alerts
            <Badge variant="outline" className="ml-2 border-red-500/50 text-red-400 bg-red-500/10">
              {filteredAlerts.filter(a => a.status === "new").length} New
            </Badge>
          </CardTitle>
          
          {/* Search and Filter Controls */}
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 text-sm"
            />
            
            <div className="flex gap-1">
              {["all", "critical", "high", "medium", "low"].map(severity => (
                <Button
                  key={severity}
                  variant={filterSeverity === severity ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterSeverity(severity)}
                  className={`text-xs capitalize ${
                    filterSeverity === severity 
                      ? "bg-slate-600 text-white" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {severity === "all" ? "All" : severity}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No alerts match your current filters
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {filteredAlerts.map((alert) => (
                <AlertItem 
                  key={alert.id} 
                  alert={alert} 
                  onStatusChange={updateAlertStatus}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Individual Alert Item
function AlertItem({ alert, onStatusChange }: { alert: Alert; onStatusChange: (id: string, status: Alert["status"]) => void }) {
  const severity = severityConfig[alert.severity];
  const status = statusConfig[alert.status];
  
  return (
    <div className="p-4 hover:bg-slate-700/30 transition-colors duration-200 group">
      <div className="flex items-start justify-between gap-4">
        {/* Left Content */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Severity Indicator */}
          <div className={`w-1 h-full min-h-[60px] rounded-full ${severity.dot} mt-1`} />
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className={`text-xs ${severity.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${severity.dot} mr-1.5`} />
                {severity.label}
              </Badge>
              
              <span className="text-xs text-slate-500 font-mono">{alert.id}</span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs text-slate-500">{formatTimeAgo(alert.timestamp)}</span>
            </div>
            
            <h4 className="text-sm font-semibold text-white mb-1 truncate">{alert.title}</h4>
            <p className="text-xs text-slate-400 line-clamp-2">{alert.description}</p>
            
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                {alert.source}
              </span>
              {alert.endpoint && (
                <span className="text-xs text-slate-500 font-mono">{alert.endpoint}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Badge className={`text-xs ${status.color} cursor-pointer`} variant="outline">
            {status.label}
          </Badge>
          
          {alert.status !== "resolved" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => onStatusChange(alert.id, "resolved")}
            >
              Resolve
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
