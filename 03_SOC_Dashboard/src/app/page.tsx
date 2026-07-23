"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SOCHeader } from "@/components/soc/Header";
import { MetricCards } from "@/components/soc/MetricCards";
import { AlertsFeed } from "@/components/soc/AlertsFeed";
import { ThreatIntelDashboard } from "@/components/soc/ThreatIntel";
import { IncidentManagement } from "@/components/soc/IncidentManagement";
import { SystemHealth } from "@/components/soc/SystemHealth";

// Main National SOC Dashboard Page
export default function SOCDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <SOCHeader />
      
      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* KPI Metrics - Always Visible */}
        <MetricCards />
        
        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-slate-700/50 w-full justify-start flex-wrap h-auto gap-2 p-2">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              Overview
            </TabsTrigger>
            
            <TabsTrigger 
              value="alerts" 
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Alerts
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">147</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="threats" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Threat Intel
            </TabsTrigger>
            
            <TabsTrigger 
              value="incidents" 
              className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Incidents
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded-full">23</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="systems" 
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              Systems
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alerts Summary (Compact) */}
              <AlertsFeed />
              
              {/* Threat Landscape Quick View */}
              <ThreatIntelDashboard />
            </div>
            
            {/* Incident & System Health Row */}
            <IncidentManagement />
            
            {/* System Health */}
            <SystemHealth />
          </TabsContent>

          {/* Alerts Tab - Full Screen */}
          <TabsContent value="alerts" className="mt-4">
            <AlertsFeed />
          </TabsContent>

          {/* Threat Intelligence Tab */}
          <TabsContent value="threats" className="mt-4 space-y-6">
            <ThreatIntelDashboard />
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="mt-4">
            <IncidentManagement />
          </TabsContent>

          {/* Systems Tab */}
          <TabsContent value="systems" className="mt-4">
            <SystemHealth />
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-4 mt-8">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>National Security Operations Center — Algeria</span>
            <span>•</span>
            <span>Open Source Stack v2.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              All Systems Operational
            </span>
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
