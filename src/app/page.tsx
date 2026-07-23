'use client'

import React, { useState, useEffect } from 'react'
import { 
  Shield, AlertTriangle, Activity, Clock, Users, Server, 
  Globe, Lock, Eye, TrendingUp, Bell, Search, Filter,
  CheckCircle, XCircle, AlertCircle, ChevronRight, RefreshCw,
  Wifi, Database, Cpu, HardDrive, Network, Zap
} from 'lucide-react'

// Types
interface Alert {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string
  source: string
  timestamp: Date
  status: 'new' | 'investigating' | 'resolved'
}

interface Metric {
  label: string
  value: string | number
  change: number
  icon: React.ReactNode
}

interface Incident {
  id: string
  title: string
  severity: string
  status: string
  assignee: string
  created: string
  updated: string
}

// Mock Data Generators
const generateAlerts = (): Alert[] => [
  {
    id: '1',
    severity: 'critical',
    title: 'Multiple Failed Login Attempts Detected',
    description: 'Brute force attack detected from IP 192.168.1.100 - 150+ attempts in 5 minutes',
    source: 'Authentication System',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    status: 'new'
  },
  {
    id: '2',
    severity: 'high',
    title: 'Suspicious File Execution on Workstation',
    description: 'Potential malware execution detected on WS-ALG-0456 in Finance Department',
    source: 'EDR Agent',
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    status: 'investigating'
  },
  {
    id: '3',
    severity: 'medium',
    title: 'Unusual Data Transfer to External Location',
    description: 'Large volume data transfer (2.3GB) to external IP detected outside business hours',
    source: 'Network Monitor',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: 'new'
  },
  {
    id: '4',
    severity: 'high',
    title: 'Vulnerability Scan Detected from Unknown Source',
    description: 'Automated vulnerability scanning activity detected from external network segment',
    source: 'IDS/IPS',
    timestamp: new Date(Date.now() - 22 * 60 * 1000),
    status: 'investigating'
  },
  {
    id: '5',
    severity: 'low',
    title: 'Policy Violation: USB Device Connected',
    description: 'Unauthorized USB storage device connected to workstation WS-ALG-0123',
    source: 'DLP System',
    timestamp: new Date(Date.now() - 35 * 60 * 1000),
    status: 'resolved'
  }
]

const generateMetrics = (): Metric[] => [
  { label: 'Events/Second', value: '847K', change: 12.5, icon: <Activity className="w-4 h-4" /> },
  { label: 'Active Alerts', value: 23, change: -5.2, icon: <AlertTriangle className="w-4 h-4" /> },
  { label: 'MTTD', value: '3.2m', change: -18.3, icon: <Clock className="w-4 h-4" /> },
  { label: 'MTTR', value: '12.4m', change: -22.1, icon: <RefreshCw className="w-4 h-4" /> },
  { label: 'Analysts Online', value: 12, change: 0, icon: <Users className="w-4 h-4" /> },
  { label: 'Systems Monitored', value: '2,847', change: 2.1, icon: <Server className="w-4 h-4" /> }
]

const generateIncidents = (): Incident[] => [
  { id: 'INC-2026-001', title: 'Ransomware Detection - HR Department', severity: 'critical', status: 'active', assignee: 'Ahmed M.', created: '2026-07-23 08:30', updated: '2026-07-23 14:15' },
  { id: 'INC-2026-002', title: 'Phishing Campaign Targeting Executives', severity: 'high', status: 'active', assignee: 'Fatima B.', created: '2026-07-23 10:45', updated: '2026-07-23 13:20' },
  { id: 'INC-2026-003', title: 'Unauthorized Access Attempt - Financial Systems', severity: 'high', status: 'monitoring', assignee: 'Karim A.', created: '2026-07-23 11:00', updated: '2026-07-23 12:30' },
  { id: 'INC-2026-004', title: 'Data Exfiltration Prevention', severity: 'medium', status: 'resolved', assignee: 'Sara L.', created: '2026-07-22 16:20', updated: '2026-07-23 09:00' },
  { id: 'INC-2026-005', title: 'Zero-Day Exploit in Legacy System', severity: 'critical', status: 'active', assignee: 'Youssef K.', created: '2026-07-23 06:15', updated: '2026-07-23 14:45' }
]

// Severity Colors
const severityColors = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  info: 'bg-gray-100 text-gray-800 border-gray-200'
}

const severityBadge = (severity: string) => {
  const colors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
    info: 'bg-gray-500'
  }
  return colors[severity] || 'bg-gray-500'
}

export default function SOCDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedTab, setSelectedTab] = useState<'overview' | 'alerts' | 'incidents'>('overview')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Initialize data
  useEffect(() => {
    setAlerts(generateAlerts())
    setMetrics(generateMetrics())
    setIncidents(generateIncidents())
  }, [])

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Simulate refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setAlerts(generateAlerts())
      setMetrics(generateMetrics())
      setIsRefreshing(false)
    }, 1000)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatRelativeTime = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              <div>
                <h1 className="text-xl font-bold">National SOC</h1>
                <p className="text-xs text-slate-400">Security Operations Center - Algeria</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Status Indicators */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-slate-300">Operational</span>
              </div>
              <div className="text-slate-400">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div className="font-mono text-cyan-400">{formatTime(currentTime)}</div>
            </div>

            {/* Actions */}
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-slate-900/50 border-b border-slate-800 px-6">
        <div className="flex gap-8">
          {(['overview', 'alerts', 'incidents'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`py-4 px-2 border-b-2 transition-colors capitalize ${
                selectedTab === tab 
                  ? 'border-cyan-400 text-cyan-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {metrics.map((metric, index) => (
                <div key={index} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-400 text-sm">{metric.label}</span>
                    <div className="text-cyan-400">{metric.icon}</div>
                  </div>
                  <div className="text-2xl font-bold mb-1">{metric.value}</div>
                  <div className={`flex items-center text-sm ${metric.change > 0 ? 'text-red-400' : metric.change < 0 ? 'text-green-400' : 'text-slate-400'}`}>
                    {metric.change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : null}
                    {Math.abs(metric.change)}% {metric.change > 0 ? 'increase' : metric.change < 0 ? 'decrease' : ''}
                  </div>
                </div>
              ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Alerts Feed */}
              <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Live Alert Feed
                  </h2>
                  <span className="text-sm text-slate-400">{alerts.length} new alerts</span>
                </div>
                <div className="divide-y divide-slate-800 max-h-[480px] overflow-y-auto">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full ${severityBadge(alert.severity)}`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[alert.severity]}`}>
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-400">{formatRelativeTime(alert.timestamp)}</span>
                          </div>
                          <h3 className="font-medium text-sm mb-1 truncate">{alert.title}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2">{alert.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>{alert.source}</span>
                            <span className={`capitalize px-2 py-0.5 rounded ${
                              alert.status === 'new' ? 'bg-blue-900/30 text-blue-400' :
                              alert.status === 'investigating' ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-green-900/30 text-green-400'
                            }`}>
                              {alert.status}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* SOC Status */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-cyan-400" />
                    SOC Status
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Shift Status</span>
                      <span className="text-green-400 font-medium">Active - Day Shift</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Team Lead</span>
                      <span className="text-white font-medium">Karim A.</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Coverage</span>
                      <span className="text-cyan-400 font-medium">24/7 Operational</span>
                    </div>
                    <div className="pt-4 border-t border-slate-800">
                      <div className="text-sm text-slate-400 mb-2">System Health</div>
                      <div className="space-y-2">
                        {[
                          { name: 'SIEM Platform', status: 'operational' },
                          { name: 'EDR Agents', status: 'operational' },
                          { name: 'Network Sensors', status: 'degraded' },
                          { name: 'Threat Intel', status: 'operational' }
                        ].map((system) => (
                          <div key={system.name} className="flex items-center justify-between text-sm">
                            <span className="text-slate-300">{system.name}</span>
                            <span className={`flex items-center gap-1 ${
                              system.status === 'operational' ? 'text-green-400' : 'text-yellow-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                system.status === 'operational' ? 'bg-green-400' : 'bg-yellow-400'
                              }`}></span>
                              {system.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Today's Summary
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Total Events Processed</span>
                      <span className="font-mono text-white">73.2M</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Alerts Generated</span>
                      <span className="font-mono text-white">1,247</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Incidents Created</span>
                      <span className="font-mono text-white">5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Auto-Resolved</span>
                      <span className="font-mono text-green-400">892 (71%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Threat Intelligence Feeds</span>
                      <span className="font-mono text-white">47 Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Threat Map Placeholder */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                Global Threat Activity
              </h2>
              <div className="h-64 bg-slate-800/50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Network className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Threat Map Visualization</p>
                  <p className="text-slate-500 text-xs">Real-time global attack visualization</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {selectedTab === 'alerts' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold">All Alerts Management</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search alerts..."
                    className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500 w-64"
                  />
                </div>
                <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-sm transition-colors">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Alert</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[alert.severity]}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{alert.title}</div>
                        <div className="text-sm text-slate-400 truncate max-w-md">{alert.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{alert.source}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`capitalize px-2 py-1 rounded text-xs ${
                          alert.status === 'new' ? 'bg-blue-900/30 text-blue-400' :
                          alert.status === 'investigating' ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-green-900/30 text-green-400'
                        }`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {formatRelativeTime(alert.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="text-cyan-400 hover:text-cyan-300 text-sm">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Incidents Tab */}
        {selectedTab === 'incidents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Active Incidents</h2>
              <button className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                + New Incident
              </button>
            </div>
            
            <div className="grid gap-4">
              {incidents.map((incident) => (
                <div key={incident.id} className="bg-slate-900 rounded-xl border border-slate-800 p-6 hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        incident.severity === 'critical' ? 'bg-red-900/30' :
                        incident.severity === 'high' ? 'bg-orange-900/30' : 'bg-yellow-900/30'
                      }`}>
                        <AlertTriangle className={`w-5 h-5 ${
                          incident.severity === 'critical' ? 'text-red-400' :
                          incident.severity === 'high' ? 'text-orange-400' : 'text-yellow-400'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold">{incident.title}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColors[incident.severity as keyof typeof severityColors] || ''}`}>
                            {incident.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                            incident.status === 'active' ? 'bg-red-900/30 text-red-400' :
                            incident.status === 'monitoring' ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-green-900/30 text-green-400'
                          }`}>
                            {incident.status}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400 mb-2">{incident.id}</div>
                        <div className="flex items-center gap-6 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {incident.assignee}
                          </span>
                          <span>Created: {incident.created}</span>
                          <span>Updated: {incident.updated}</span>
                        </div>
                      </div>
                    </div>
                    <button className="text-cyan-400 hover:text-cyan-300">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 px-6 py-4 bg-slate-900">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div>National SOC Dashboard v1.0.0 | Algeria 2026-2030</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Lock className="w-4 h-4" />
              Classification: Official Use Only
            </span>
            <span>Session: SOC-2026-{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
