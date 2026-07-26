"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Types
interface SystemComponent {
  name: string;
  type: "siem" | "soar" | "edr" | "tip" | "network" | "storage" | "backup";
  status: "healthy" | "degraded" | "down" | "maintenance";
  uptime: number;
  cpu: number;
  memory: number;
  lastCheck: string;
}

interface DataSource {
  name: string;
  type: string;
  status: "connected" | "error" | "warning" | "disconnected";
  eps: number;
  eventsToday: number;
}

// Mock system components data
const mockComponents: SystemComponent[] = [
  {
    name: "Wazuh SIEM Cluster",
    type: "siem",
    status: "healthy",
    uptime: 99.97,
    cpu: 45,
    memory: 62,
    lastCheck: "2026-07-23T16:40:00Z"
  },
  {
    name: "TheHive SOAR Platform",
    type: "soar",
    status: "healthy",
    uptime: 99.99,
    cpu: 28,
    memory: 45,
    lastCheck: "2026-07-23T16:39:00Z"
  },
  {
    name: "Wazuh EDR Agents",
    type: "edr",
    status: "degraded",
    uptime: 98.5,
    cpu: 72,
    memory: 78,
    lastCheck: "2026-07-23T16:38:00Z"
  },
  {
    name: "MISP Threat Intel",
    type: "tip",
    status: "healthy",
    uptime: 99.95,
    cpu: 35,
    memory: 55,
    lastCheck: "2026-07-23T16:37:00Z"
  },
  {
    name: "Network IDS (Suricata)",
    type: "network",
    status: "healthy",
    uptime: 99.98,
    cpu: 55,
    memory: 48,
    lastCheck: "2026-07-23T16:36:00Z"
  },
  {
    name: "Elasticsearch Storage",
    type: "storage",
    status: "healthy",
    uptime: 99.99,
    cpu: 38,
    memory: 68,
    lastCheck: "2026-07-23T16:35:00Z"
  }
];

// Mock data sources
const mockDataSources: DataSource[] = [
  { name: "Firewall Logs", type: "Palo Alto", status: "connected", eps: 125000, eventsToday: 10800000 },
  { name: "DNS Traffic", type: "BIND/DNS", status: "connected", eps: 89000, eventsToday: 7690000 },
  { name: "Active Directory", type: "Microsoft AD", status: "connected", eps: 45000, eventsToday: 3888000 },
  { name: "Proxy/Web Gateway", type: "Squid", status: "warning", eps: 156000, eventsToday: 13478400 },
  { name: "Email Gateway", type: "Postfix", status: "connected", eps: 32000, eventsToday: 2764800 },
  { name: "Endpoint Agents", type: "Wazuh Agent", status: "error", eps: 285000, eventsToday: 24624000 }
];

// Status configurations
const statusConfig = {
  healthy: { color: "text-green-400 bg-green-500/10 border-green-500/30", dot: "bg-green-500", label: "Healthy" },
  degraded: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", dot: "bg-yellow-500", label: "Degraded" },
  down: { color: "text-red-400 bg-red-500/10 border-red-500/30", dot: "bg-red-500", label: "Down" },
  maintenance: { color: "text-blue-400 bg-blue-500/10 border-blue-500/30", dot: "bg-blue-500", label: "Maintenance" }
};

const dataSourceStatus = {
  connected: { color: "text-green-400", dot: "bg-green-500", label: "Connected" },
  error: { color: "text-red-400", dot: "bg-red-500", label: "Error" },
  warning: { color: "text-yellow-400", dot: "bg-yellow-500", label: "Warning" },
  disconnected: { color: "text-slate-400", dot: "bg-slate-500", label: "Disconnected" }
};

const typeIcons: Record<string, string> = {
  siem: "📊",
  soar: "🤖",
  edr: "💻",
  tip: "🎯",
  network: "🌐",
  storage: "💾",
  backup: "📦"
};

// Main System Health Component
export function SystemHealth() {
  // Calculate overall health score
  const healthyCount = mockComponents.filter(c => c.status === "healthy").length;
  const overallScore = Math.round((healthyCount / mockComponents.length) * 100);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Overall Health Score */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative w-32 h-32 mb-4">
              {/* Circular Progress */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" className="text-slate-700" />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="56" 
                  stroke="currentColor" 
                  strokeWidth="12" 
                  fill="none" 
                  strokeLinecap="round"
                  className={overallScore >= 90 ? "text-emerald-500" : overallScore >= 70 ? "text-yellow-500" : "text-red-500"}
                  strokeDasharray={`${(overallScore / 100) * 352} 352`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-bold ${overallScore >= 90 ? 'text-emerald-400' : overallScore >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {overallScore}
                </span>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-1">System Health</h3>
            <p className="text-sm text-slate-400">{healthyCount}/{mockComponents.length} Systems Operational</p>
            
            <div className="mt-4 w-full space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-green-400">● Healthy</span>
                <span>{mockComponents.filter(c => c.status === "healthy").length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-yellow-400">● Degraded</span>
                <span>{mockComponents.filter(c => c.status === "degraded").length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-red-400">● Down</span>
                <span>{mockComponents.filter(c => c.status === "down").length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Status List */}
      <Card className="bg-slate-800/50 border-slate-700/50 lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Infrastructure Components
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-slate-700/50">
            {mockComponents.map((component, index) => (
              <ComponentRow key={index} component={component} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Sources Status */}
      <Card className="bg-slate-800/50 border-slate-700/50 lg:col-span-3">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Data Sources & Log Ingestion
            </CardTitle>
            
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 bg-cyan-500/10">
              Total EPS: {(mockDataSources.reduce((sum, ds) => sum + ds.eps, 0) / 1000).toFixed(0)}K
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockDataSources.map((source, index) => (
              <DataSourceCard key={index} source={source} />
            ))}
          </div>
          
          {/* Summary Stats */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap gap-6 justify-center text-xs text-slate-400">
            <span>Events Today: <strong className="text-white">{(mockDataSources.reduce((sum, ds) => sum + ds.eventsToday, 0) / 1000000).toFixed(1)}M</strong></span>
            <span>Active Sources: <strong className="text-green-400">{mockDataSources.filter(s => s.status === "connected").length}</strong></span>
            <span>Warnings: <strong className="text-yellow-400">{mockDataSources.filter(s => s.status === "warning").length}</strong></span>
            <span>Errors: <strong className="text-red-400">{mockDataSources.filter(s => s.status === "error").length}</strong></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component Row Component
function ComponentRow({ component }: { component: SystemComponent }) {
  const status = statusConfig[component.status];
  
  return (
    <div className="p-4 hover:bg-slate-700/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xl mt-0.5">{typeIcons[component.type]}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-white truncate">{component.name}</h4>
              <Badge variant="outline" className={`text-xs ${status.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot} mr-1`} />
                {status.label}
              </Badge>
            </div>
            
            {/* Resource Usage */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <ResourceBar label="CPU" value={component.cpu} color={component.cpu > 70 ? "text-red-400" : component.cpu > 50 ? "text-yellow-400" : "text-green-400"} />
              <ResourceBar label="Memory" value={component.memory} color={component.memory > 70 ? "text-red-400" : component.memory > 50 ? "text-yellow-400" : "text-green-400"} />
            </div>
          </div>
        </div>
        
        <div className="text-right shrink-0">
          <p className="text-sm font-mono font-semibold text-emerald-400">{component.uptime}%</p>
          <p className="text-xs text-slate-500">uptime</p>
        </div>
      </div>
    </div>
  );
}

// Resource Bar Component
function ResourceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={color}>{value}%</span>
      </div>
      <Progress value={value} className="h-1.5 bg-slate-700">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${
            value > 70 ? 'bg-red-500' : value > 50 ? 'bg-yellow-500' : 'bg-green-500'
          }`} 
          style={{ width: `${value}%` }} 
        />
      </Progress>
    </div>
  );
}

// Data Source Card Component
function DataSourceCard({ source }: { source: DataSource }) {
  const status = dataSourceStatus[source.status];
  
  return (
    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-medium text-white truncate">{source.name}</h4>
          <p className="text-xs text-slate-500">{source.type}</p>
        </div>
        <Badge variant="outline" className={`text-xs ${status.color} border-current/30`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot} mr-1`} />
          {status.label}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-700/50">
        <div>
          <p className="text-[10px] text-slate-500 uppercase">EPS</p>
          <p className="text-sm font-semibold text-cyan-400">{formatNumber(source.eps)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Today</p>
          <p className="text-sm font-semibold text-white">{formatNumber(source.eventsToday)}</p>
        </div>
      </div>
    </div>
  );
}

// Helper function to format numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}
