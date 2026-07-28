'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Crosshair, Search, Play, Pause, Save, Download, Upload,
  Filter, Plus, Trash2, Copy, CheckCircle, AlertTriangle,
  Clock, Target, Brain, Fingerprint, FileText, Globe,
  Shield, Bug, UserCheck, Network, Database, Terminal,
  ChevronRight, ChevronDown, Zap, Eye, EyeOff, RefreshCw,
  Bookmark, Share2, History, LayoutGrid, List, ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ============================================================
// TYPES & INTERFACES FOR THREAT HUNTING
// ============================================================

interface IOC {
  id: string
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'pattern'
  value: string
  confidence: number
  source: string
  firstSeen: string
  lastSeen: string
  tags: string[]
}

interface HuntQuery {
  id: string
  name: string
  queryType: 'SQL' | 'LUCENE' | 'SIGMA' | 'YARA' | 'CUSTOM'
  queryString: string
  dataSource: string
  resultCount: number
  executionTime: number
  executedAt: string
  status: 'pending' | 'running' | 'completed' | 'error'
}

interface HuntFinding {
  id: string
  queryId: string
  title: string
  description: string
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  confidence: number
  status: 'NEW' | 'INVESTIGATING' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'ESCALATED'
  rawEvidence: Record<string, unknown>
  iocs: IOC[]
  timestamp: string
}

interface HuntSession {
  id: string
  name: string
  description: string
  hypothesis: string
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  hunter: string
  queries: HuntQuery[]
  findings: HuntFinding[]
  createdAt: string
  updatedAt: string
}

interface HypothesisTemplate {
  id: string
  name: string
  category: string
  description: string
  templateQuery: string
}

// ============================================================
// MOCK DATA FOR DEMONSTRATION
// ============================================================

const mockHypotheses: HypothesisTemplate[] = [
  {
    id: 'h1',
    name: 'Lateral Movement Detection',
    category: 'Initial Access',
    description: 'Detect potential lateral movement patterns across network segments',
    templateQuery: 'source:* AND event_type:authentication AND (action:failure OR action:success) | stats count by source_ip, dest_ip'
  },
  {
    id: 'h2',
    name: 'Data Exfiltration Patterns',
    category: 'Exfiltration',
    description: 'Identify unusual data transfer volumes to external destinations',
    templateQuery: 'event_type:network_flow AND bytes_out:>10000000 AND (dest_port:443 OR dest_port:80) | stats sum(bytes_out) by dest_ip, user'
  },
  {
    id: 'h3',
    name: 'Credential Dumping',
    category: 'Credential Access',
    description: 'Detect suspicious process executions related to credential access',
    templateQuery: 'process_name:(lsass.exe* OR mimikatz* OR procdump* OR ntdsutil*) OR command_line:*-dump*'
  },
  {
    id: 'h4',
    name: 'Persistence Mechanisms',
    category: 'Persistence',
    description: 'Find registry modifications and scheduled task creations',
    templateQuery: 'event_type:registry AND (key_path:*Run* OR key_path:*Startup*) OR event_type:scheduled_task'
  },
  {
    id: 'h5',
    name: 'Telecom-Specific: SIM Swapping',
    category: 'Telecom Fraud',
    description: 'Detect potential SIM swap activities in subscriber management systems',
    templateQuery: 'system:ssm AND event_type:sim_swap AND (risk_score:>70 OR verification_bypass:true)'
  }
]

const mockSession: HuntSession = {
  id: 'session-001',
  name: 'APT Investigation - Djezzy Network',
  description: 'Investigating suspected APT activity targeting core network infrastructure',
  hypothesis: 'Adversary has established persistence via compromised service accounts and is performing lateral movement between BTS and BSC systems',
  status: 'ACTIVE',
  hunter: 'SOC Analyst Ahmed',
  queries: [
    {
      id: 'q1',
      name: 'Authentication Failures - Last 24h',
      queryType: 'LUCENE',
      queryString: 'event_type:auth AND status:failure AND timestamp:[now-24h TO now]',
      dataSource: 'SIEM - Security Events',
      resultCount: 1247,
      executionTime: 2340,
      executedAt: '2026-01-15T10:30:00Z',
      status: 'completed'
    },
    {
      id: 'q2',
      name: 'Lateral Movement Detection',
      queryType: 'SQL',
      queryString: 'SELECT source_ip, dest_ip, COUNT(*) as attempts FROM auth_logs WHERE status = \'failure\' GROUP BY source_ip, dest_ip HAVING COUNT(*) > 50 ORDER BY attempts DESC',
      dataSource: 'PostgreSQL - Auth Logs',
      resultCount: 23,
      executionTime: 1856,
      executedAt: '2026-01-15T10:35:00Z',
      status: 'completed'
    },
    {
      id: 'q3',
      name: 'Process Anomaly Scan (Sigma)',
      queryType: 'SIGMA',
      queryString: 'detection:\n  selection:\n    Image|contains: \'powershell\'\n    CommandLine|contains:\n      - \'EncodedCommand\'\n      - \'DownloadString\'\n  condition: selection',
      dataSource: 'EDR - Endpoint Telemetry',
      resultCount: 0,
      executionTime: 0,
      executedAt: '',
      status: 'pending'
    }
  ],
  findings: [
    {
      id: 'f1',
      queryId: 'q2',
      title: 'Suspicious Lateral Movement Pattern Detected',
      description: 'Multiple authentication failures observed from 10.50.12.87 attempting to access 15 different hosts in the BSC segment within 2 hours',
      severity: 'HIGH',
      confidence: 87,
      status: 'INVESTIGATING',
      rawEvidence: {
        sourceIp: '10.50.12.87',
        destHosts: ['bsc-01.djezzy.dz', 'bsc-03.djezzy.dz', 'bsc-05.djezzy.dz'],
        attemptCount: 847,
        timeWindow: '2h 14m',
        protocols: ['SMB', 'RDP', 'WinRM']
      },
      iocs: [
        { id: 'ioc1', type: 'ip', value: '10.50.12.87', confidence: 92, source: 'SIEM Correlation', firstSeen: '2026-01-15T08:00:00Z', lastSeen: '2026-01-15T10:14:00Z', tags: ['suspicious', 'internal'] }
      ],
      timestamp: '2026-01-15T10:32:00Z'
    },
    {
      id: 'f2',
      queryId: 'q1',
      title: 'Brute Force Attack Against Subscriber Portal',
      description: 'Coordinated brute force attack detected against the subscriber self-care portal with 1247 failed attempts from 34 unique IPs',
      severity: 'MEDIUM',
      confidence: 94,
      status: 'NEW',
      rawEvidence: {
        targetSystem: 'subscriber-portal.djezzy.dz',
        uniqueSourceIPs: 34,
        totalAttempts: 1247,
        targetedAccounts: ['admin', 'support', 'operator']
      },
      iocs: [],
      timestamp: '2026-01-15T10:30:00Z'
    },
    {
      id: 'f3',
      queryId: 'q2',
      title: 'Potential Credential Stuffing - OSS Interface',
      description: 'Pattern consistent with credential stuffing observed against Operations Support Systems interface',
      severity: 'CRITICAL',
      confidence: 78,
      status: 'ESCALATED',
      rawEvidence: {
        targetSystem: 'oss-interface.internal.djezzy.dz',
        pattern: 'credential_stuffing',
        automationIndicators: ['constant_time_interval', 'user_agent_rotation']
      },
      iocs: [
        { id: 'ioc2', type: 'ip', value: '91.121.87.45', confidence: 88, source: 'WAF Logs', firstSeen: '2026-01-15T09:00:00Z', lastSeen: '2026-01-15T10:30:00Z', tags: ['external', 'known-bad'] },
        { id: 'ioc3', type: 'ip', value: '185.220.101.0/24', confidence: 75, source: 'Threat Intel Feed', firstSeen: '2026-01-14T00:00:00Z', lastSeen: '2026-01-15T10:30:00Z', tags: ['tor-exit', 'reputation-bad'] }
      ],
      timestamp: '2026-01-15T10:28:00Z'
    }
  ],
  createdAt: '2026-01-15T08:00:00Z',
  updatedAt: '2026-01-15T10:35:00Z'
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

const SeverityBadge: React.FC<{ severity: HuntFinding['severity'] }> = ({ severity }) => {
  const config = {
    INFO: { variant: 'secondary' as const, label: 'Info', icon: <Eye className="w-3 h-3" /> },
    LOW: { variant: 'outline' as const, label: 'Low', icon: <AlertTriangle className="w-3 h-3" /> },
    MEDIUM: { variant: 'default' as const, label: 'Medium', icon: <AlertTriangle className="w-3 h-3" /> },
    HIGH: { variant: 'destructive' as const, label: 'High', icon: <Shield className="w-3 h-3" /> },
    CRITICAL: { variant: 'destructive' as const, label: 'Critical', icon: <Bug className="w-3 h-3" /> }
  }
  
  return (
    <Badge variant={config[severity].variant} className="gap-1">
      {config[severity].icon}
      {config[severity].label}
    </Badge>
  )
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    ACTIVE: 'bg-green-100 text-green-700',
    PAUSED: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700',
    NEW: 'bg-purple-100 text-purple-700',
    INVESTIGATING: 'bg-orange-100 text-orange-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    FALSE_POSITIVE: 'bg-gray-100 text-gray-500',
    ESCALATED: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-600',
    running: 'bg-blue-100 text-blue-600 animate-pulse',
    completed: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600'
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

const ConfidenceIndicator: React.FC<{ value: number }> = ({ value }) => {
  const getColor = (v: number) => {
    if (v >= 80) return 'text-green-600'
    if (v >= 60) return 'text-yellow-600'
    if (v >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="flex items-center gap-2">
      <Progress value={value} className="w-16 h-2" />
      <span className={`text-sm font-medium ${getColor(value)}`}>{value}%</span>
    </div>
  )
}

// ============================================================
// MAIN HUNT WORKSPACE COMPONENT
// ============================================================

export const HuntWorkspace: React.FC = () => {
  // State Management
  const [session, setSession] = useState<HuntSession>(mockSession)
  const [selectedFinding, setSelectedFinding] = useState<HuntFinding | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [queryInput, setQueryInput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showHypotheses, setShowHypotheses] = useState(false)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  // Computed Values
  const filteredFindings = useMemo(() => {
    if (filterSeverity === 'all') return session.findings
    return session.findings.filter(f => f.severity === filterSeverity)
  }, [session.findings, filterSeverity])

  const stats = useMemo(() => ({
    totalFindings: session.findings.length,
    criticalCount: session.findings.filter(f => f.severity === 'CRITICAL').length,
    highCount: session.findings.filter(f => f.severity === 'HIGH').length,
    investigatingCount: session.findings.filter(f => f.status === 'INVESTIGATING').length,
    totalIOCs: session.findings.reduce((acc, f) => acc + f.iocs.length, 0),
    avgConfidence: Math.round(session.findings.reduce((acc, f) => acc + f.confidence, 0) / session.findings.length || 0)
  }), [session.findings])

  // Handlers
  const handleExecuteQuery = useCallback(async () => {
    if (!queryInput.trim()) return
    
    setIsExecuting(true)
    // Simulate query execution
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const newQuery: HuntQuery = {
      id: `q${session.queries.length + 1}`,
      name: `Custom Query ${session.queries.length + 1}`,
      queryType: 'LUCENE',
      queryString: queryInput,
      dataSource: 'SIEM - All Events',
      resultCount: Math.floor(Math.random() * 500),
      executionTime: Math.floor(Math.random() * 3000),
      executedAt: new Date().toISOString(),
      status: 'completed'
    }
    
    setSession(prev => ({
      ...prev,
      queries: [...prev.queries, newQuery],
      updatedAt: new Date().toISOString()
    }))
    setQueryInput('')
    setIsExecuting(false)
  }, [queryInput, session.queries.length])

  const handleApplyHypothesis = useCallback((hypothesis: HypothesisTemplate) => {
    setQueryInput(hypothesis.templateQuery)
    setShowHypotheses(false)
  }, [])

  const handleExportSession = useCallback(() => {
    const dataStr = JSON.stringify(session, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hunt-session-${session.id}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [session])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      {/* Header */}
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl shadow-lg shadow-red-500/20">
              <Crosshair className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Threat Hunting Workspace
              </h1>
              <p className="text-gray-400 mt-1">Djezzy National SOC - Advanced Threat Detection</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <StatusBadge status={session.status} />
            <Button variant="outline" size="sm" onClick={() => setShowHypotheses(!showHypotheses)}>
              <Brain className="w-4 h-4 mr-2" />
              Hypotheses
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportSession}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600">
              <Save className="w-4 h-4 mr-2" />
              Save Session
            </Button>
          </div>
        </div>

        {/* Session Info Bar */}
        <Card className="mb-6 border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Session</span>
                  <h2 className="font-semibold text-white">{session.name}</h2>
                </div>
                <Separator orientation="vertical" className="h-8 bg-slate-600" />
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Hunter</span>
                  <p className="text-sm text-gray-200 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />{session.hunter}
                  </p>
                </div>
                <Separator orientation="vertical" className="h-8 bg-slate-600" />
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Duration</span>
                  <p className="text-sm text-gray-200 flex items-center gap-2">
                    <Clock className="w-4 h-4" />2h 35m
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Database className="w-4 h-4" />
                <span>Last updated: {new Date(session.updatedAt).toLocaleString()}</span>
              </div>
            </div>
            
            {/* Hypothesis Display */}
            <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs text-orange-400 font-medium uppercase tracking-wider">Active Hypothesis</span>
                  <p className="text-sm text-gray-300 mt-1">{session.hypothesis}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Target className="w-5 h-5 mx-auto text-blue-400 mb-2" />
              <div className="text-2xl font-bold text-white">{stats.totalFindings}</div>
              <div className="text-xs text-gray-400">Total Findings</div>
            </CardContent>
          </Card>
          <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Bug className="w-5 h-5 mx-auto text-red-400 mb-2" />
              <div className="text-2xl font-bold text-red-400">{stats.criticalCount}</div>
              <div className="text-xs text-gray-400">Critical</div>
            </CardContent>
          </Card>
          <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto text-orange-400 mb-2" />
              <div className="text-2xl font-bold text-orange-400">{stats.highCount}</div>
              <div className="text-xs text-gray-400">High Severity</div>
            </CardContent>
          </Card>
          <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Search className="w-5 h-5 mx-auto text-yellow-400 mb-2" />
              <div className="text-2xl font-bold text-yellow-400">{stats.investigatingCount}</div>
              <div className="text-xs text-gray-400">Investigating</div>
            </CardContent>
          </Card>
          <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Fingerprint className="w-5 h-5 mx-auto text-green-400 mb-2" />
              <div className="text-2xl font-bold text-green-400">{stats.totalIOCs}</div>
              <div className="text-xs text-gray-400">IOCs Extracted</div>
            </CardContent>
          </Card>
          <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Brain className="w-5 h-5 mx-auto text-purple-400 mb-2" />
              <div className="text-2xl font-bold text-purple-400">{stats.avgConfidence}%</div>
              <div className="text-xs text-gray-400">Avg Confidence</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Query Builder & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Query Builder */}
            <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-green-400" />
                    Query Builder
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="LUCENE">
                      <SelectTrigger className="w-28 h-8 text-xs bg-slate-900/50 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LUCENE">Lucene</SelectItem>
                        <SelectItem value="SQL">SQL</SelectItem>
                        <SelectItem value="SIGMA">Sigma</SelectItem>
                        <SelectItem value="YARA">YARA</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select defaultValue="siem-all">
                      <SelectTrigger className="w-40 h-8 text-xs bg-slate-900/50 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="siem-all">SIEM - All Events</SelectItem>
                        <SelectItem value="siem-auth">SIEM - Auth Events</SelectItem>
                        <SelectItem value="edr">EDR - Endpoints</SelectItem>
                        <SelectItem value="network">Network Flows</SelectItem>
                        <SelectItem value="telecom">Telecom Systems</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hypothesis Templates Panel */}
                {showHypotheses && (
                  <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-600 mb-4">
                    <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      Hypothesis Templates
                    </h4>
                    <div className="grid gap-2 max-h-48 overflow-y-auto">
                      {mockHypotheses.map(h => (
                        <button
                          key={h.id}
                          onClick={() => handleApplyHypothesis(h)}
                          className="text-left p-3 rounded-md bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{h.name}</span>
                            <Badge variant="outline" className="text-xs">{h.category}</Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{h.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Textarea
                  placeholder="Enter your hunting query... (Supports Lucene, SQL, Sigma, YARA syntax)"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  className="min-h-[120px] bg-slate-900/50 border-slate-600 text-white placeholder:text-gray-500 font-mono text-sm"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleExecuteQuery}
                      disabled={!queryInput.trim() || isExecuting}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      {isExecuting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Execute Query
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Button variant="ghost" size="sm" className="text-gray-400">
                      <History className="w-4 h-4 mr-1" />
                      History
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400">
                      <Bookmark className="w-4 h-4 mr-1" />
                      Save Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Query History */}
            <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  Query History
                  <Badge variant="secondary" className="ml-2">{session.queries.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700/50 hover:bg-transparent">
                        <TableHead className="text-gray-400">Name</TableHead>
                        <TableHead className="text-gray-400">Type</TableHead>
                        <TableHead className="text-gray-400">Results</TableHead>
                        <TableHead className="text-gray-400">Time</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {session.queries.map(query => (
                        <TableRow key={query.id} className="border-slate-700/50 cursor-pointer hover:bg-slate-700/30">
                          <TableCell className="font-medium text-white">{query.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{query.queryType}</Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {query.resultCount.toLocaleString()} results
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {(query.executionTime / 1000).toFixed(2)}s
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={query.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Findings */}
          <div className="space-y-6">
            {/* Findings List */}
            <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crosshair className="w-5 h-5 text-red-400" />
                    Findings
                    <Badge variant="destructive" className="ml-2">{filteredFindings.length}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                      <SelectTrigger className="w-24 h-8 text-xs bg-slate-900/50 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex border border-slate-600 rounded">
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewMode('grid')}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px]">
                  <div className="space-y-3">
                    {filteredFindings.map(finding => (
                      <div
                        key={finding.id}
                        onClick={() => setSelectedFinding(finding)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedFinding?.id === finding.id
                            ? 'bg-slate-700/50 border-red-500/50 shadow-lg shadow-red-500/10'
                            : 'bg-slate-900/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium text-white line-clamp-2">{finding.title}</h4>
                          <SeverityBadge severity={finding.severity} />
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2">{finding.description}</p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <StatusBadge status={finding.status} />
                          <ConfidenceIndicator value={finding.confidence} />
                        </div>
                        
                        {finding.iocs.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Fingerprint className="w-3 h-3" />
                              <span>{finding.iocs.length} IOCs extracted</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Finding Detail Modal */}
        {selectedFinding && (
          <Dialog open={!!selectedFinding} onOpenChange={() => setSelectedFinding(null)}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <SeverityBadge severity={selectedFinding.severity} />
                  {selectedFinding.title}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Finding ID: {selectedFinding.id} | Created: {new Date(selectedFinding.timestamp).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="bg-slate-800">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="evidence">Raw Evidence</TabsTrigger>
                  <TabsTrigger value="iocs">IOCs ({selectedFinding.iocs.length})</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Description</span>
                      <p className="text-sm text-gray-200 mt-1">{selectedFinding.description}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Confidence</span>
                        <ConfidenceIndicator value={selectedFinding.confidence} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Status</span>
                        <StatusBadge status={selectedFinding.status} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="evidence" className="mt-4">
                  <pre className="p-4 rounded-lg bg-slate-950 border border-slate-700 overflow-x-auto text-sm text-green-400 font-mono">
                    {JSON.stringify(selectedFinding.rawEvidence, null, 2)}
                  </pre>
                </TabsContent>

                <TabsContent value="iocs" className="mt-4">
                  {selectedFinding.iocs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-gray-400">Type</TableHead>
                          <TableHead className="text-gray-400">Value</TableHead>
                          <TableHead className="text-gray-400">Confidence</TableHead>
                          <TableHead className="text-gray-400">Source</TableHead>
                          <TableHead className="text-gray-400">Tags</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedFinding.iocs.map(ioc => (
                          <TableRow key={ioc.id} className="border-slate-700/50">
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{ioc.type.toUpperCase()}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-white">{ioc.value}</TableCell>
                            <TableCell>{ioc.confidence}%</TableCell>
                            <TableCell className="text-gray-400 text-sm">{ioc.source}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {ioc.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Fingerprint className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No IOCs extracted for this finding</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                      <Share2 className="w-4 h-4" />
                      <div className="text-left">
                        <div className="font-medium text-sm">Escalate to IR</div>
                        <div className="text-xs text-gray-400">Create incident from this finding</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                      <Bookmark className="w-4 h-4" />
                      <div className="text-left">
                        <div className="font-medium text-sm">Add to Threat Intel</div>
                        <div className="text-xs text-gray-400">Push IOCs to TI platform</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                      <Copy className="w-4 h-4" />
                      <div className="text-left">
                        <div className="font-medium text-sm">Clone Query</div>
                        <div className="text-xs text-gray-400">Use this query as template</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                      <FileText className="w-4 h-4" />
                      <div className="text-left">
                        <div className="font-medium text-sm">Generate Report</div>
                        <div className="text-xs text-gray-400">Export finding details</div>
                      </div>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

// Export default for easy importing
export default HuntWorkspace
