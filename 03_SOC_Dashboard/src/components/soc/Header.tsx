"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Header Component for National SOC Dashboard
export function SOCHeader() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-emerald-500/30 px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left Section - Logo & Title */}
        <div className="flex items-center gap-4">
          {/* Shield Icon */}
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              National Security Operations Center
            </h1>
            <p className="text-xs text-emerald-400 font-medium">Algeria — 24/7 Cyber Defense Command</p>
          </div>
        </div>

        {/* Center Section - Status Indicators */}
        <div className="hidden md:flex items-center gap-6">
          <StatusIndicator label="SIEM" status="operational" />
          <StatusIndicator label="SOAR" status="operational" />
          <StatusIndicator label="EDR" status="warning" />
          <StatusIndicator label="TIP" status="operational" />
          <StatusIndicator label="Network" status="operational" />
        </div>

        {/* Right Section - Time & Actions */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-mono text-white font-semibold">
              {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <div className="text-xs text-slate-400">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
          
          <Badge variant="outline" className="border-green-500/50 text-green-400 bg-green-500/10 px-3 py-1">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            LIVE
          </Badge>
          
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700/50">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Button>
        </div>
      </div>
    </header>
  );
}

// Status Indicator Sub-component
function StatusIndicator({ label, status }: { label: string; status: "operational" | "warning" | "critical" }) {
  const colors = {
    operational: "bg-green-500",
    warning: "bg-yellow-500",
    critical: "bg-red-500"
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${colors[status]} ${status === "operational" ? "animate-pulse" : ""}`} />
      <span className="text-xs text-slate-300 font-medium">{label}</span>
    </div>
  );
}
