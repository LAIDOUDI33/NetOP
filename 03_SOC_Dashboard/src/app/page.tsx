"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons as simple SVG components
const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ServerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

// Mock data for demonstration
const mockAlerts = [
  {
    id: "ALT-2026-001247",
    title: "Brute Force Attack Detected - Domain Controller",
    severity: "critical",
    source: "SIEM Correlation Engine",
    timestamp: "2 min ago",
    status: "new",
    assignee: "Unassigned",
    category: "Initial Access"
  },
  {
    id: "ALT-2026-001246",
    title: "Suspicious PowerShell Execution - Workstation-0451",
    severity: "high",
    source: "CrowdStrike EDR",
    timestamp: "5 min ago",
    status: "investigating",
    assignee: "A. Benali",
    category: "Execution"
  },
  {
    id: "ALT-2026-001245",
    title: "Phishing Email Reported - Multiple Recipients",
    severity: "high",
    source: "Email Gateway",
    timestamp: "12 min ago",
    status: "investigating",
    assignee: "S. Mansouri",
    category: "Social Engineering"
  },
  {
    id: "ALT-2026-001244",
    title: "DNS Tunneling Detected - Server-Web-012",
    severity: "medium",
    source: "Network IDS",
    timestamp: "18 min ago",
    status: "in_progress",
    assignee: "K. Hadj",
    category: "Command & Control"
  },
  {
    id: "ALT-2026-001243",
    title: "Large Data Transfer to External IP",
    severity: "medium",
    source: "DLP System",
    timestamp: "25 min ago",
    status: "pending_review",
    assignee: "Unassigned",
    category: "Exfiltration"
  },
  {
    id: "ALT-2026-001242",
    title: "Failed VPN Authentication - 50+ Attempts",
    severity: "medium",
    source: "VPN Gateway",
    timestamp: "32 min ago",
    status: "resolved",
    assignee: "M. Zerhouni",
    category: "Credential Access"
  },
  {
    id: "ALT-2026-001241",
    title: "Vulnerability Scan Detected from Internal Network",
    severity: "low",
    source: "Network Sensors",
    timestamp: "45 min ago",
    status: "resolved",
    assignee: "Y. Amrani",
    category: "Discovery"
  }
];

const mockMetrics = {
  totalAlertsToday: 1847,
  criticalAlerts: 23,
  activeIncidents: 12,
  mttD: "3.2 min",
  mttr: "11.5 min",
  automationRate: 87,
  coveragePercent: 94,
  endpointsProtected: 148392,
  epsCurrent: 7843521
};

const mockThreatActors = [
  { name: "APT28 (Fancy Bear)", capability: "Nation-State", activity: "Active", lastSeen: "2 hours ago", targeting: "Government" },
  { name: "LockBit Ransomware", capability: "Cyber Crime", activity: "High", lastSeen: "6 hours ago", targeting: "All Sectors" },
  { name: "APT41 (Double Dragon)", capability: "Nation-State", activity: "Moderate", lastSeen: "1 day ago", targeting: "Technology" },
  { name: "Scattered Spider", capability: "Cyber Crime", activity: "Elevated", lastSeen: "3 hours ago", targeting: "Financial" }
];

const mockSystemHealth = [
  { component: "SIEM Cluster", status: "healthy", uptime: "99.99%", latency: "12ms" },
  { component: "SOAR Platform", status: "healthy", uptime: "99.98%", latency: "45ms" },
  { component: "EDR Cloud", status: "healthy", uptime: "100%", latency: "8ms" },
  { component: "TIP/MISP", status: "degraded", uptime: "98.5%", latency: "120ms" },
  { component: "Data Lake", status: "healthy", uptime: "99.95%", latency: "34ms" },
  { component: "Network NDR", status: "healthy", uptime: "99.97%", latency: "22ms" }
];

// Severity badge component
function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border border-blue-500/30"
  };
  
  return (
    <Badge className={`${styles[severity] || styles.low} capitalize`}>
      {severity}
    </Badge>
  );
}

// Status indicator component
function StatusIndicator({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-emerald-500",
    degraded: "bg-yellow-500",
    down: "bg-red-500"
  };
  
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || colors.down} pulse-dot`} />
  );
}

// Metric card component
function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = "blue",
  subtitle 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ComponentType; 
  trend?: string;
  color?: string;
  subtitle?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
    green: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
    red: "from-red-500/20 to-red-600/5 border-red-500/30",
    yellow: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/30",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/30"
  };

  return (
    <Card className={`soc-card bg-gradient-to-br ${colorClasses[color]} overflow-hidden`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="metric-value gradient-text">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-${color}-500/10`}>
            <Icon />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1 text-xs text-gray-400">
            <TrendingUpIcon />
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mini chart component (CSS-based)
function MiniChart({ data, color = "#3b82f6" }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="w-full h-12" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function SOCDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate mock chart data
  const alertTrendData = Array.from({ length: 24 }, (_, i) => 
    Math.floor(Math.random() * 100) + 50 + (i > 12 ? 30 : 0)
  );
  const epsTrendData = Array.from({ length: 24 }, (_, i) => 
    Math.floor(Math.random() * 2000000) + 6000000
  );

  return (
    <div className="min-h-screen grid-pattern">
      {/* Animated Background */}
      <div className="animated-bg" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-gray-800/50">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                  <ShieldIcon />
                </div>
                <div>
                  <h1 className="text-xl font-bold gradient-text">National SOC</h1>
                  <p className="text-xs text-gray-500">Algeria Security Operations Center</p>
                </div>
              </div>
              <div className="hidden md:block h-8 w-px bg-gray-700" />
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                <StatusIndicator status="healthy" />
                <span>All Systems Operational</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden lg:block text-right">
                <p className="text-sm font-medium">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-2xl font-mono font-bold text-blue-400">
                  {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                </p>
              </div>
              
              <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-800">
                <AlertIcon />
                <span className="ml-2">3 New Critical</span>
              </Button>
              
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold cursor-pointer">
                OP
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-6 py-6 space-y-6">
        
        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <MetricCard
            title="Total Alerts (24h)"
            value={mockMetrics.totalAlertsToday.toLocaleString()}
            icon={AlertIcon}
            trend="+12% vs yesterday"
            color="blue"
            subtitle="Last hour: +47"
          />
          <MetricCard
            title="Critical Alerts"
            value={mockMetrics.criticalAlerts}
            icon={ActivityIcon}
            trend="Requires attention"
            color="red"
            subtitle="3 new in last hour"
          />
          <MetricCard
            title="Active Incidents"
            value={mockMetrics.activeIncidents}
            icon={ShieldIcon}
            trend="2 escalated today"
            color="yellow"
            subtitle="4 under investigation"
          />
          <MetricCard
            title="MTTD"
            value={mockMetrics.mttD}
            icon={ClockIcon}
            target="< 5 min"
            color="green"
            subtitle="Target achieved ✓"
          />
          <MetricCard
            title="MTTR"
            value={mockMetrics.mttr}
            icon={ClockIcon}
            trend="-18% improvement"
            color="purple"
            subtitle="Target: < 15 min"
          />
          <MetricCard
            title="Automation Rate"
            value={`${mockMetrics.automationRate}%`}
            icon={ActivityIcon}
            trend="+5% this month"
            color="blue"
            subtitle="Target: 85%"
          />
          <MetricCard
            title="Endpoints Protected"
            value={(mockMetrics.endpointsProtected / 1000).toFixed(1)}K"
            icon={ServerIcon}
            trend="+2,340 this week"
            color="green"
            subtitle="Coverage: 94%"
          />
        </div>

        {/* Main Grid */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-gray-800 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">Overview</TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-blue-600">Live Alerts</TabsTrigger>
            <TabsTrigger value="threats" className="data-[state=active]:bg-blue-600">Threat Intel</TabsTrigger>
            <TabsTrigger value="incidents" className="data-[state=active]:bg-blue-600">Incidents</TabsTrigger>
            <TabsTrigger value="systems" className="data-[state=active]:bg-blue-600">Systems</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Alert Feed */}
              <Card className="soc-card lg:col-span-2">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertIcon />
                      Live Alert Feed
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-2 h-2 rounded-full bg-green-500 pulse-dot" />
                      Live
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Alert ID</th>
                          <th>Title</th>
                          <th>Severity</th>
                          <th>Time</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockAlerts.slice(0, 6).map((alert) => (
                          <tr key={alert.id} className="cursor-pointer hover:bg-blue-500/5">
                            <td className="font-mono text-xs text-blue-400">{alert.id}</td>
                            <td className="max-w-xs truncate">{alert.title}</td>
                            <td><SeverityBadge severity={alert.severity} /></td>
                            <td className="text-gray-400">{alert.timestamp}</td>
                            <td>
                              <Badge variant="outline" className={
                                alert.status === "new" ? "border-red-500/50 text-red-400" :
                                alert.status === "investigating" ? "border-yellow-500/50 text-yellow-400" :
                                "border-gray-500/50 text-gray-400"
                              }>
                                {alert.status.replace("_", " ")}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats & Chart */}
              <div className="space-y-6">
                {/* EPS Counter */}
                <Card className="soc-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-400">Events Per Second</span>
                      <GlobeIcon />
                    </div>
                    <p className="text-3xl font-bold font-mono text-blue-400">
                      {(mockMetrics.epsCurrent / 1000000).toFixed(2)}M
                    </p>
                    <div className="mt-4">
                      <MiniChart data={epsTrendData} color="#3b82f6" />
                    </div>
                  </CardContent>
                </Card>

                {/* Threat Level Indicator */}
                <Card className="soc-card border-yellow-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium">National Threat Level</span>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        ELEVATED
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Global Cyber Threat Index</span>
                        <span>72/100</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill bg-gradient-to-r from-yellow-500 to-orange-500" style={{ width: "72%" }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Increased APT activity targeting MENA region detected
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* On-Call Team */}
                <Card className="soc-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium">On-Call Analysts</span>
                      <UsersIcon />
                    </div>
                    <div className="space-y-3">
                      {["A. Benali (Lead)", "S. Mansouri", "K. Hadj", "M. Zerhouni"].map((name, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xs font-medium">
                            {name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{name}</p>
                            <p className="text-xs text-gray-500">{idx === 0 ? "Shift Lead" : "Tier-1 Analyst"}</p>
                          </div>
                          <StatusIndicator status="healthy" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom Row - Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alert Trend Chart */}
              <Card className="soc-card">
                <CardHeader>
                  <CardTitle className="text-base">Alert Volume Trend (24 Hours)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end gap-1">
                    {alertTrendData.map((value, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400/50 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${value}%` }}
                        title={`${value} alerts at ${idx}:00`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                  </div>
                </CardContent>
              </Card>

              {/* Severity Distribution */}
              <Card className="soc-card">
                <CardHeader>
                  <CardTitle className="text-base">Alert Distribution by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Critical", count: 23, percent: 1.2, color: "bg-red-500" },
                      { label: "High", count: 342, percent: 18.5, color: "bg-orange-500" },
                      { label: "Medium", count: 892, percent: 48.3, color: "bg-yellow-500" },
                      { label: "Low", count: 590, percent: 32, color: "bg-blue-500" }
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span className="text-gray-400">{item.count.toLocaleString()} ({item.percent}%)</span>
                        </div>
                        <div className="progress-bar">
                          <div className={`progress-bar-fill ${item.color}`} style={{ width: `${item.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card className="soc-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>All Active Alerts</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-gray-700">Export</Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">+ Create Alert Rule</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Alert ID</th>
                        <th>Title</th>
                        <th>Severity</th>
                        <th>Category</th>
                        <th>Source</th>
                        <th>Timestamp</th>
                        <th>Status</th>
                        <th>Assignee</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockAlerts.map((alert) => (
                        <tr key={alert.id}>
                          <td className="font-mono text-xs text-blue-400">{alert.id}</td>
                          <td className="max-w-md">{alert.title}</td>
                          <td><SeverityBadge severity={alert.severity} /></td>
                          <td className="text-gray-400">{alert.category}</td>
                          <td className="text-gray-400">{alert.source}</td>
                          <td className="text-gray-400">{alert.timestamp}</td>
                          <td>
                            <Badge variant="outline" className={
                              alert.status === "new" ? "border-red-500/50 text-red-400" :
                              alert.status === "investigating" ? "border-yellow-500/50 text-yellow-400" :
                              alert.status === "in_progress" ? "border-blue-500/50 text-blue-400" :
                              "border-gray-500/50 text-gray-400"
                            }>
                              {alert.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="text-gray-300">{alert.assignee}</td>
                          <td>
                            <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                              View →
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Threat Intelligence Tab */}
          <TabsContent value="threats" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Threat Actors */}
              <Card className="soc-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GlobeIcon />
                    Active Threat Actors Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockThreatActors.map((actor, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">{actor.name}</h4>
                          <Badge className={
                            actor.activity === "Active" ? "bg-red-500/20 text-red-400" :
                            actor.activity === "High" || actor.activity === "Elevated" ? "bg-orange-500/20 text-orange-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }>
                            {actor.activity}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                          <div>Capability: <span className="text-gray-200">{actor.capability}</span></div>
                          <div>Last Seen: <span className="text-gray-200">{actor.lastSeen}</span></div>
                          <div className="col-span-2">Targeting: <span className="text-gray-200">{actor.targeting}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* IOC Statistics */}
              <Card className="soc-card">
                <CardHeader>
                  <CardTitle className="text-base">IOC Database Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Total IOCs", value: "2,847,293", icon: "🔢" },
                      { label: "IP Addresses", value: "1,234,567", icon: "🌐" },
                      { label: "Domains", value: "892,341", icon: "📝" },
                      { label: "File Hashes", value: "567,890", icon: "📄" },
                      { label: "URLs", value: "123,456", icon: "🔗" },
                      { label: "Updated Today", value: "+12,456", icon: "🔄" }
                    ].map((stat, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <p className="text-2xl font-bold text-blue-400">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <h4 className="font-semibold text-sm">Top Feeds (Last 24h)</h4>
                    {[
                      { name: "AlienVault OTX", count: 45231 },
                      { name: "Abuse.ch URLhaus", count: 28456 },
                      { name: "CrowdStrike Intel", count: 18923 },
                      { name: "MISP Community", count: 12456 },
                      { name: "Internal Honeypots", count: 8234 }
                    ].map((feed, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{feed.name}</span>
                        <span className="font-mono text-blue-400">+{feed.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents">
            <Card className="soc-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Active Incidents</CardTitle>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">+ New Incident</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      id: "INC-2026-00089",
                      title: "Targeted Phishing Campaign Against Ministry of Finance",
                      severity: "critical",
                      status: "open",
                      created: "2 hours ago",
                      assignee: "IR Team Alpha",
                      tasksCompleted: 4,
                      tasksTotal: 8
                    },
                    {
                      id: "INC-2026-00088",
                      title: "Suspected APT Activity on Research Network",
                      severity: "high",
                      status: "in_progress",
                      created: "6 hours ago",
                      assignee: "IR Team Beta",
                      tasksCompleted: 6,
                      tasksTotal: 10
                    },
                    {
                      id: "INC-2026-00087",
                      title: "Ransomware Containment - Department of Health",
                      severity: "high",
                      status: "contained",
                      created: "1 day ago",
                      assignee: "IR Team Alpha",
                      tasksCompleted: 12,
                      tasksTotal: 15
                    },
                    {
                      id: "INC-2026-00086",
                      title: "Data Exfiltration Attempt - External IP Block",
                      severity: "medium",
                      status: "resolved",
                      created: "2 days ago",
                      assignee: "M. Zerhouni",
                      tasksCompleted: 5,
                      tasksTotal: 5
                    }
                  ].map((incident) => (
                    <div key={incident.id} className="p-4 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono text-sm text-blue-400">{incident.id}</span>
                            <SeverityBadge severity={incident.severity} />
                            <Badge variant="outline" className={
                              incident.status === "open" ? "border-red-500/50 text-red-400" :
                              incident.status === "in_progress" ? "border-yellow-500/50 text-yellow-400" :
                              incident.status === "contained" ? "border-orange-500/50 text-orange-400" :
                              "border-green-500/50 text-green-400"
                            }>
                              {incident.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <h4 className="font-semibold">{incident.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <div className="flex items-center gap-4">
                          <span>Created: {incident.created}</span>
                          <span>Assigned: {incident.assignee}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Progress:</span>
                          <div className="w-24 progress-bar">
                            <div 
                              className="progress-bar-fill bg-blue-500" 
                              style={{ width: `${(incident.tasksCompleted / incident.tasksTotal) * 100}%` }}
                            />
                          </div>
                          <span>{incident.tasksCompleted}/{incident.tasksTotal}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Systems Tab */}
          <TabsContent value="systems">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Health */}
              <Card className="soc-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ServerIcon />
                    Infrastructure Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockSystemHealth.map((system, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
                        <div className="flex items-center gap-3">
                          <StatusIndicator status={system.status} />
                          <div>
                            <p className="font-medium text-sm">{system.component}</p>
                            <p className="text-xs text-gray-500">Latency: {system.latency}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-300">{system.status === "healthy" ? "Healthy" : system.status === "degraded" ? "Degraded" : "Down"}</p>
                          <p className="text-xs text-gray-500">Uptime: {system.uptime}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Data Pipeline Status */}
              <Card className="soc-card">
                <CardHeader>
                  <CardTitle className="text-base">Data Pipeline Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { pipeline: "Log Ingestion (Kafka)", status: "running", throughput: "5.2 GB/min", lag: "0.3s" },
                      { pipeline: "SIEM Indexing", status: "running", throughput: "4.8 GB/min", lag: "1.2s" },
                      { pipeline: "SOAR Processing", status: "running", throughput: "847 events/min", lag: "0.1s" },
                      { pipeline: "TIP Enrichment", status: "warning", throughput: "12.4k IOC/hr", lag: "5.4s" },
                      { pipeline: "Backup Replication", status: "running", throughput: "1.1 GB/min", lag: "2.1s" },
                      { pipeline: "Archive Storage", status: "running", throughput: "890 MB/min", lag: "0.8s" }
                    ].map((pipeline, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-gray-900/50 border border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <StatusIndicator status={pipeline.status === "running" ? "healthy" : "degraded"} />
                            <span className="font-medium text-sm">{pipeline.pipeline}</span>
                          </div>
                          <Badge variant="outline" className={
                            pipeline.status === "running" ? "border-green-500/50 text-green-400" :
                            "border-yellow-500/50 text-yellow-400"
                          }>
                            {pipeline.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Throughput: {pipeline.throughput}</span>
                          <span>Lag: {pipeline.lag}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 mt-12 py-6">
        <div className="max-w-[1920px] mx-auto px-6 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <ShieldIcon />
            <span>National SOC Algeria © 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <span>v2.1.0</span>
            <span>|</span>
            <span>Classification: Internal Use</span>
            <span>|</span>
            <span>Last Updated: {currentTime.toLocaleTimeString()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
