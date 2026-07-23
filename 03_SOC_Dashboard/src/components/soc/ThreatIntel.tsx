"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Types
interface ThreatActor {
  name: string;
  country: string;
  capability: "advanced" | "moderate" | "basic";
  activity: "active" | "dormant" | "unknown";
  targetSectors: string[];
  lastSeen: string;
  confidence: number;
}

interface IOC {
  type: "ip" | "domain" | "hash" | "url";
  value: string;
  threatLevel: "critical" | "high" | "medium";
  source: string;
  firstSeen: string;
}

// Mock threat actors - realistic for Algeria context
const mockThreatActors: ThreatActor[] = [
  {
    name: "APT28 (Fancy Bear)",
    country: "Russia",
    capability: "advanced",
    activity: "active",
    targetSectors: ["Government", "Defense", "Diplomatic"],
    lastSeen: "2026-07-22",
    confidence: 95
  },
  {
    name: "APT29 (Cozy Bear)",
    country: "Russia",
    capability: "advanced",
    activity: "active",
    targetSectors: ["Intelligence", "Research", "Energy"],
    lastSeen: "2026-07-20",
    confidence: 92
  },
  {
    name: "Lazarus Group",
    country: "North Korea",
    capability: "advanced",
    activity: "active",
    targetSectors: ["Financial", "Defense", "Cryptocurrency"],
    lastSeen: "2026-07-21",
    confidence: 89
  },
  {
    name: "Silent Librarian",
    country: "Iran",
    capability: "moderate",
    activity: "active",
    targetSectors: ["Academic", "Research", "Government"],
    lastSeen: "2026-07-18",
    confidence: 85
  }
];

// Mock IOCs
const mockIOCs: IOC[] = [
  { type: "ip", value: "185.220.101[.]34", threatLevel: "critical", source: "MISP Community", firstSeen: "2026-07-15" },
  { type: "domain", value: "malicious-cdn[.]tk", threatLevel: "high", source: "AlienVault OTX", firstSeen: "2026-07-18" },
  { type: "hash", value: "a1b2c3d4e5f6...", threatLevel: "high", source: "VirusTotal", firstSeen: "2026-07-20" },
  { type: "url", value: "hxxp://phishing[.]xyz/login", threatLevel: "medium", source: "PhishTank", firstSeen: "2026-07-22" },
  { type: "ip", value: "45.33.32[.]156", threatLevel: "critical", source: "AutoFocus", firstSeen: "2026-07-21" }
];

// Threat level colors
const threatColors = {
  critical: "text-red-400 bg-red-500/10 border-red-500/30",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
};

const capabilityColors = {
  advanced: "bg-red-500/20 text-red-400",
  moderate: "bg-yellow-500/20 text-yellow-400",
  basic: "bg-blue-500/20 text-blue-400"
};

// Main Threat Intelligence Component
export function ThreatIntelDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Threat Actors Panel */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Active Threat Actors
            <Badge variant="outline" className="ml-auto border-purple-500/50 text-purple-400 bg-purple-500/10 text-xs">
              Tracking: {mockThreatActors.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[340px] overflow-y-auto custom-scrollbar divide-y divide-slate-700/50">
            {mockThreatActors.map((actor, index) => (
              <ThreatActorItem key={index} actor={actor} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* IOCs Panel */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Indicators of Compromise (IOCs)
            <Badge variant="outline" className="ml-auto border-cyan-500/50 text-cyan-400 bg-cyan-500/10 text-xs">
              Active: {mockIOCs.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[340px] overflow-y-auto custom-scrollbar divide-y divide-slate-700/50">
            {mockIOCs.map((ioc, index) => (
              <IOCItem key={index} ioc={ioc} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Threat Landscape Summary */}
      <Card className="bg-slate-800/50 border-slate-700/50 lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Threat Landscape Summary — Algeria Region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ThreatMetric 
              label="Critical IOCs" 
              value="47" 
              change="+5 this week"
              color="text-red-400"
            />
            <ThreatMetric 
              label="Active Campaigns" 
              value="12" 
              change="+2 from MENA region"
              color="text-orange-400"
            />
            <ThreatMetric 
              label="Targeted Sectors" 
              value="8" 
              change="Gov & Finance primary"
              color="text-yellow-400"
            />
            <ThreatMetric 
              label="Blocked Threats (24h)" 
              value="2,847" 
              change="+15% vs yesterday"
              color="text-emerald-400"
            />
          </div>
          
          {/* Threat Trend Indicators */}
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
            <h4 className="text-sm font-semibold text-white mb-3">Current Threat Trends</h4>
            <div className="space-y-3">
              <TrendItem label="Ransomware Attacks" percentage={78} color="bg-red-500" />
              <TrendItem label="Phishing Campaigns" percentage={65} color="bg-orange-500" />
              <TrendItem label="APT Reconnaissance" percentage={42} color="bg-yellow-500" />
              <TrendItem label="DDoS Attempts" percentage={28} color="bg-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Threat Actor Item Component
function ThreatActorItem({ actor }: { actor: ThreatActor }) {
  return (
    <div className="p-4 hover:bg-slate-700/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-white">{actor.name}</h4>
          <p className="text-xs text-slate-500">{actor.country}</p>
        </div>
        <Badge variant="outline" className={`text-xs ${capabilityColors[actor.capability]}`}>
          {actor.capability.toUpperCase()}
        </Badge>
      </div>
      
      <div className="flex flex-wrap gap-1 mb-2">
        {actor.targetSectors.map((sector, idx) => (
          <Badge key={idx} variant="outline" className="text-xs border-slate-600 text-slate-400 py-0">
            {sector}
          </Badge>
        ))}
      </div>
      
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Last seen: {actor.lastSeen}</span>
        <span>Confidence: {actor.confidence}%</span>
      </div>
      
      <Progress value={actor.confidence} className="h-1 mt-2 bg-slate-700" />
    </div>
  );
}

// IOC Item Component
function IOCItem({ ioc }: { ioc: IOC }) {
  const typeIcons = {
    ip: "🌐",
    domain: "🔗",
    hash: "🔐",
    url: "📎"
  };

  return (
    <div className="p-4 hover:bg-slate-700/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-lg">{typeIcons[ioc.type]}</span>
          <div className="min-w-0">
            <code className="text-xs font-mono text-white break-all">{ioc.value}</code>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`text-xs ${threatColors[ioc.threatLevel]}`}>
                {ioc.threatLevel.toUpperCase()}
              </Badge>
              <span className="text-xs text-slate-500 uppercase">{ioc.type}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right ml-4">
          <p className="text-xs text-slate-500">{ioc.source}</p>
          <p className="text-xs text-slate-600">{ioc.firstSeen}</p>
        </div>
      </div>
    </div>
  );
}

// Threat Metric Component
function ThreatMetric({ label, value, change, color }: { label: string; value: string; change: string; color: string }) {
  return (
    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{change}</p>
    </div>
  );
}

// Trend Item Component
function TrendItem({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2 bg-slate-700">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </Progress>
    </div>
  );
}
