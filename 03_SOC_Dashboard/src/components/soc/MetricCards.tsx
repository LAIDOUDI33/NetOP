"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Types
interface MetricData {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// Mock data for metrics - simulating real SOC data
const metricsData: MetricData[] = [
  {
    title: "Active Alerts",
    value: 147,
    change: 12.5,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    color: "text-red-400",
    bgColor: "bg-red-500/10"
  },
  {
    title: "Threats Blocked",
    value: "2,847",
    change: 8.3,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10"
  },
  {
    title: "EPS Processing",
    value: "847K",
    change: -2.1,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "Endpoints Protected",
    value: "148,293",
    change: 0.8,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h4l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: "text-purple-400",
    bgColor: "bg-purple-500/10"
  },
  {
    title: "Incidents Open",
    value: 23,
    change: -15.2,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: "text-orange-400",
    bgColor: "bg-orange-500/10"
  },
  {
    title: "MTTR (Hours)",
    value: "1.4",
    change: -22.5,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "text-blue-400",
    bgColor: "bg-blue-500/10"
  }
];

// Main Metrics Cards Component
export function MetricCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metricsData.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}

// Individual Metric Card
function MetricCard({ title, value, change, icon, color, bgColor }: MetricData) {
  const isPositive = change > 0;
  
  // For alerts and incidents, positive change is bad (shown in red)
  // For blocked threats and endpoints, positive is good (shown in green)
  const isGoodMetric = ["Threats Blocked", "Endpoints Protected", "MTTR (Hours)"].includes(title);
  const displayColor = isPositive === isGoodMetric ? "text-green-400" : "text-red-400";

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            <span className={color}>{icon}</span>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ${displayColor} border-current/30 bg-current/5`}
          >
            {isPositive ? "+" : ""}{change}%
          </Badge>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-white tracking-tight">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
