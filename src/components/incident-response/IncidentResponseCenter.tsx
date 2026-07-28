'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Shield, AlertTriangle, Activity, Clock, Users, Server,
  CheckCircle, XCircle, AlertCircle, ChevronRight, ChevronDown,
  RefreshCw, Zap, Eye, Play, Pause, Square, FileText, Upload,
  Download, MessageSquare, UserCheck, Lock, Globe, Phone,
  Calendar, MapPin, Tag, Link2, ClipboardList, Camera,
  HardDrive, Network, Terminal, Bug, Target, ArrowRight,
  Timer, Bell, Send, Plus, Trash2, Edit3, Filter, Search,
  LayoutGrid, List, MoreVertical, ExternalLink
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// ============================================================
// TYPES & INTERFACES FOR INCIDENT RESPONSE
// ============================================================

type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type IncidentStatus = 'NEW' | 'TRIAGE' | 'IN_PROGRESS' | 'CONTAINED' | 'ERADICATED' | 'RECOVERY' | 'CLOSED' | 'ESCALATED'
type IncidentCategory = 'MALWARE' | 'PHISHING' | 'DDOS' | 'INTRUSION' | 'DATA_BREACH' | 'INSIDER_THREAT' | 'TELECOM_FRAUD' | 'POLICY_VIOLATION' | 'OTHER'

interface IOCItem {
  id: string
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'phone' | 'imsi' | 'imei'
  value: string
  isIndicatorsOfCompromise: boolean
  confidence: number
  source: string
}

interface Task {
  id: string
  title: string
  description: string
  assignee: string
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  dueDate: string
  completedAt?: string
}

interface TimelineEvent {
  id: string
  timestamp: string
  type: 'DETECTION' | 'TRIAGE' | 'CONTAINMENT' | 'ERADICATION' | 'RECOVERY' | 'ESCALATION' | 'NOTIFICATION' | 'EVIDENCE' | 'NOTE'
  title: string
  description: string
  author: string
  attachments?: string[]
}

interface EvidenceItem {
  id: string
  name: string
  type: 'LOG' | 'MEMORY_DUMP' | 'DISK_IMAGE' | 'PCAP' | 'SCREENSHOT' | 'REPORT' | 'OTHER'
  size: string
  hash: string
  collectedBy: string
  collectedAt: string
  description: string
}

interface CommunicationLog {
  id: string
  timestamp: string
  channel: 'INTERNAL' | 'EMAIL' | 'PHONE' | 'TICKET' | 'SLACK' | 'EXTERNAL'
  from: string
  to: string
  subject: string
  content: string
  isEncrypted: boolean
}

interface PlaybookStep {
  id: number
  phase: 'PREPARATION' | 'DETECTION_ANALYSIS' | 'CONTAINMENT' | 'ERADICATION' | 'RECOVERY' | 'LESSONS_LEARNED'
  name: string
  description: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  assignee?: string
  completedAt?: string
  notes?: string
}

interface Incident {
  id: string
  ticketNumber: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  category: IncidentCategory
  reporter: string
  assignee: string
  team: string
  iocs: IOCItem[]
  tasks: Task[]
  timeline: TimelineEvent[]
  evidence: EvidenceItem[]
  communications: CommunicationLog[]
  playbookSteps: PlaybookStep[]
  createdAt: string
  updatedAt: string
  detectedAt: string
  containmentTarget?: string
  resolutionTarget?: string
  slaBreachRisk: boolean
  tags: string[]
  affectedAssets: string[]
  affectedUsers: number
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

// ============================================================
// MOCK DATA FOR DEMONSTRATION
// ============================================================

const mockIncidents: Incident[] = [
  {
    id: 'INC-2026-001',
    ticketNumber: 'SOC-0847',
    title: 'Ransomware Attack - Core Billing System',
    description: 'Ransomware detected on billing server BIL-PROD-03. Files encrypted with .djezzy_lock extension. Initial access suspected via phishing email opened by finance department.',
    severity: 'CRITICAL',
    status: 'CONTAINED',
    category: 'MALWARE',
    reporter: 'EDR System',
    assignee: 'Ahmed Benali (L1 IR)',
    team: 'CSIRT-Alpha',
    iocs: [
      { id: 'ioc1', type: 'hash', value: 'a1b2c3d4e5f6...', isIndicatorsOfCompromise: true, confidence: 95, source: 'EDR Telemetry' },
      { id: 'ioc2', type: 'ip', value: '185.220.101.45', isIndicatorsOfCompromise: true, confidence: 88, source: 'C2 Communication' },
      { id: 'ioc3', type: 'domain', value: 'evil-c2.ru', isIndicatorsOfCompromise: true, confidence: 92, source: 'DNS Logs' }
    ],
    tasks: [
      { id: 't1', title: 'Isolate affected host', description: 'Network isolation of BIL-PROD-03', assignee: 'Network Team', status: 'COMPLETED', priority: 'CRITICAL', dueDate: '2026-01-15T10:00:00Z', completedAt: '2026-01-15T09:45:00Z' },
      { id: 't2', title: 'Memory acquisition', description: 'Acquire volatile memory from compromised system', assignee: 'DFIR Team', status: 'COMPLETED', priority: 'HIGH', dueDate: '2026-01-15T11:00:00Z', completedAt: '2026-01-15T10:30:00Z' },
      { id: 't3', title: 'Malware analysis', description: 'Static and dynamic analysis of ransomware sample', assignee: 'Malware Lab', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-01-15T16:00:00Z' },
      { id: 't4', title: 'Restore from backup', description: 'Restore encrypted files from clean backup', assignee: 'System Admins', status: 'TODO', priority: 'CRITICAL', dueDate: '2026-01-16T10:00:00Z' }
    ],
    timeline: [
      { id: 'tl1', timestamp: '2026-01-15T06:23:14Z', type: 'DETECTION', title: 'Initial Detection', description: 'EDR detected suspicious process execution on BIL-PROD-03', author: 'EDR System' },
      { id: 'tl2', timestamp: '2026-01-15T06:25:30Z', type: 'DETECTION', title: 'Alert Triggered', description: 'Ransomware behavior pattern matched - SOC Alert #847 created', author: 'SIEM Correlation' },
      { id: 'tl3', timestamp: '2026-01-15T06:30:00Z', type: 'TRIAGE', title: 'Triage Started', description: 'IR Analyst began initial assessment of incident', author: 'Ahmed Benali' },
      { id: 'tl4', timestamp: '2026-01-15T09:45:00Z', type: 'CONTAINMENT', title: 'Host Isolated', description: 'Affected system successfully isolated from network', author: 'Network Team' }
    ],
    evidence: [
      { id: 'ev1', name: 'BIL-PROD-03-memory.dmp', type: 'MEMORY_DUMP', size: '16.4 GB', hash: 'sha256:abc123...', collectedBy: 'DFIR Team', collectedAt: '2026-01-15T10:30:00Z', description: 'Full memory dump before shutdown' },
      { id: 'ev2', name: 'ransomware_sample.exe', type: 'OTHER', size: '2.3 MB', hash: 'sha256:def456...', collectedBy: 'EDR', collectedAt: '2026-01-15T06:24:00Z', description: 'Quarantined malware executable' },
      { id: 'ev3', name: 'network_capture.pcap', type: 'PCAP', size: '847 MB', hash: 'sha256:ghi789...', collectedBy: 'NDR', collectedAt: '2026-01-15T09:50:00Z', description: 'C2 communication capture' }
    ],
    communications: [
      { id: 'com1', timestamp: '2026-01-15T07:00:00Z', channel: 'INTERNAL', from: 'SOC Manager', to: 'CSIRT-Alpha', subject: 'Escalation - Critical Incident', content: 'This incident has been escalated to CRITICAL. All hands on deck.', isEncrypted: false },
      { id: 'com2', timestamp: '2026-01-15T08:00:00Z', channel: 'EMAIL', from: 'IR Lead', to: 'CISO; CTO', subject: 'Executive Briefing - Ransomware Incident', content: 'Executive summary of current ransomware situation attached.', isEncrypted: true }
    ],
    playbookSteps: [
      { id: 1, phase: 'PREPARATION', name: 'Assemble IR Team', description: 'Notify all required personnel', status: 'COMPLETED', assignee: 'SOC Manager', completedAt: '2026-01-15T06:35:00Z' },
      { id: 2, phase: 'DETECTION_ANALYSIS', name: 'Initial Triage', description: 'Assess scope and severity', status: 'COMPLETED', assignee: 'Ahmed Benali', completedAt: '2026-01-15T07:00:00Z' },
      { id: 3, phase: 'DETECTION_ANALYSIS', name: 'Identify IOCs', description: 'Extract all indicators of compromise', status: 'COMPLETED', assignee: 'Threat Intel', completedAt: '2026-01-15T08:30:00Z' },
      { id: 4, phase: 'CONTAINMENT', name: 'Containment Actions', description: 'Isolate affected systems', status: 'COMPLETED', assignee: 'Network Team', completedAt: '2026-01-15T09:45:00Z' },
      { id: 5, phase: 'ERADICATION', name: 'Malware Removal', description: 'Remove malicious artifacts', status: 'IN_PROGRESS', assignee: 'DFIR Team' },
      { id: 6, phase: 'RECOVERY', name: 'System Restoration', description: 'Restore systems from backup', status: 'PENDING' },
      { id: 7, phase: 'LESSONS_LEARNED', name: 'Post-Incident Review', description: 'Document lessons learned', status: 'PENDING' }
    ],
    createdAt: '2026-01-15T06:23:14Z',
    updatedAt: '2026-01-15T11:00:00Z',
    detectedAt: '2026-01-15T06:23:14Z',
    containmentTarget: '2026-01-15T12:00:00Z',
    resolutionTarget: '2026-01-17T18:00:00Z',
    slaBreachRisk: false,
    tags: ['ransomware', 'billing-system', 'critical'],
    affectedAssets: ['BIL-PROD-03', 'BIL-DB-01', 'BIL-APP-02'],
    affectedUsers: 450,
    businessImpact: 'CRITICAL'
  },
  {
    id: 'INC-2026-002',
    ticketNumber: 'SOC-0848',
    title: 'SIM Swap Fraud Campaign - Multiple Subscribers',
    description: 'Coordinated SIM swap attack targeting high-value subscribers. Attackers used social engineering to convince retail staff to perform unauthorized SIM swaps.',
    severity: 'HIGH',
    status: 'IN_PROGRESS',
    category: 'TELECOM_FRAUD',
    reporter: 'Fraud Detection System',
    assignee: 'Fatima Zahra (L2 Fraud)',
    team: 'Fraud Investigation Unit',
    iocs: [
      { id: 'ioc4', type: 'phone', value: '+213 555 01234', isIndicatorsOfCompromise: true, confidence: 90, source: 'Subscriber DB' },
      { id: 'ioc5', type: 'imsi', value: '608020100123456', isIndicatorsOfCompromise: true, confidence: 95, source: 'HLR Records' }
    ],
    tasks: [
      { id: 't5', title: 'Identify all affected subscribers', description: 'Query SSM for all SIM swaps in last 48h', assignee: 'Fraud Analyst', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-01-15T14:00:00Z' },
      { id: 't6', title: 'Block fraudulent accounts', description: 'Suspend accounts involved in fraud', assignee: 'Security Ops', status: 'TODO', priority: 'CRITICAL', dueDate: '2026-01-15T12:00:00Z' }
    ],
    timeline: [
      { id: 'tl5', timestamp: '2026-01-15T09:00:00Z', type: 'DETECTION', title: 'Anomaly Detected', description: 'Unusual spike in SIM swap requests detected', author: 'ML Engine' }
    ],
    evidence: [],
    communications: [],
    playbookSteps: [],
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T11:30:00Z',
    detectedAt: '2026-01-15T08:45:00Z',
    containmentTarget: '2026-01-15T18:00:00Z',
    slaBreachRisk: true,
    tags: ['sim-swap', 'fraud', 'subscriber'],
    affectedAssets: ['SSM Portal', 'Retail POS Systems'],
    affectedUsers: 23,
    businessImpact: 'HIGH'
  },
  {
    id: 'INC-2026-003',
    ticketNumber: 'SOC-0849',
    title: 'Phishing Campaign - Corporate Email',
    description: 'Spear-phishing campaign targeting executive team. Emails contain malicious links to credential harvesting page.',
    severity: 'MEDIUM',
    status: 'NEW',
    category: 'PHISHING',
    reporter: 'Email Gateway',
    assignee: 'Unassigned',
    team: 'SOC Tier 1',
    iocs: [
      { id: 'ioc6', type: 'url', value: 'http://djezzy-login.secure-update.com', isIndicatorsOfCompromise: true, confidence: 85, source: 'Email Gateway' },
      { id: 'ioc7', type: 'email', value: 'ceo-support@secure-dz.com', isIndicatorsOfCompromise: true, confidence: 78, source: 'Email Headers' }
    ],
    tasks: [],
    timeline: [],
    evidence: [],
    communications: [],
    playbookSteps: [],
    createdAt: '2026-01-15T11:00:00Z',
    updatedAt: '2026-01-15T11:00:00Z',
    detectedAt: '2026-01-15T10:55:00Z',
    slaBreachRisk: false,
    tags: ['phishing', 'executive-targeted', 'credential-harvesting'],
    affectedAssets: ['Email Gateway'],
    affectedUsers: 12,
    businessImpact: 'MEDIUM'
  }
]

const mockTeamMembers = [
  { id: 'u1', name: 'Ahmed Benali', role: 'L1 IR Analyst', availability: 'available' },
  { id: 'u2', name: 'Fatima Zahra', role: 'L2 Fraud Specialist', availability: 'busy' },
  { id: 'u3', name: 'Karim Hadj', role: 'Senior DFIR', availability: 'available' },
  { id: 'u4', name: 'Amina Ould', role: 'Threat Intelligence', availability: 'available' },
  { id: 'u5', name: 'Youssef Amrani', role: 'Malware Analyst', availability: 'off-duty' }
]

// ============================================================
// HELPER COMPONENTS
// ============================================================

const SeverityConfig: Record<IncidentSeverity, { color: string; bg: string; icon: React.ReactNode }> = {
  LOW: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: <AlertCircle className="w-4 h-4" /> },
  MEDIUM: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: <AlertTriangle className="w-4 h-4" /> },
  HIGH: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: <Shield className="w-4 h-4" /> },
  CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: <Bug className="w-4 h-4" /> }
}

const StatusConfig: Record<IncidentStatus, { color: string; label: string }> = {
  NEW: { color: 'bg-purple-500/20 text-purple-300', label: 'New' },
  TRIAGE: { color: 'bg-blue-500/20 text-blue-300', label: 'In Triage' },
  IN_PROGRESS: { color: 'bg-yellow-500/20 text-yellow-300', label: 'In Progress' },
  CONTAINED: { color: 'bg-orange-500/20 text-orange-300', label: 'Contained' },
  ERADICATED: { color: 'bg-green-500/20 text-green-300', label: 'Eradicated' },
  RECOVERY: { color: 'bg-cyan-500/20 text-cyan-300', label: 'Recovery' },
  CLOSED: { color: 'bg-gray-500/20 text-gray-300', label: 'Closed' },
  ESCALATED: { color: 'bg-red-500/20 text-red-300', label: 'Escalated' }
}

const CategoryIcons: Record<IncidentCategory, React.ReactNode> = {
  MALWARE: <Bug className="w-4 h-4" />,
  PHISHING: <Globe className="w-4 h-4" />,
  DDOS: <Zap className="w-4 h-4" />,
  INTRUSION: <Terminal className="w-4 h-4" />,
  DATA_BREACH: <HardDrive className="w-4 h-4" />,
  INSIDER_THREAT: <UserCheck className="w-4 h-4" />,
  TELECOM_FRAUD: <Phone className="w-4 h-4" />,
  POLICY_VIOLATION: <FileText className="w-4 h-4" />,
  OTHER: <AlertCircle className="w-4 h-4" />
}

const SeverityBadge: React.FC<{ severity: IncidentSeverity }> = ({ severity }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${SeverityConfig[severity].bg} ${SeverityConfig[severity].color}`}>
    {SeverityConfig[severity].icon}
    {severity}
  </span>
)

const StatusBadge: React.FC<{ status: IncidentStatus }> = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${StatusConfig[status].color}`}>
    {StatusConfig[status].label}
  </span>
)

const TimelineIcon: React.FC<{ type: TimelineEvent['type'] }> = ({ type }) => {
  const icons: Record<TimelineEvent['type'], string> = {
    DETECTION: 'text-red-400 bg-red-500/20',
    TRIAGE: 'text-blue-400 bg-blue-500/20',
    CONTAINMENT: 'text-orange-400 bg-orange-500/20',
    ERADICATION: 'text-yellow-400 bg-yellow-500/20',
    RECOVERY: 'text-green-400 bg-green-500/20',
    ESCALATION: 'text-purple-400 bg-purple-500/20',
    NOTIFICATION: 'text-cyan-400 bg-cyan-500/20',
    EVIDENCE: 'text-pink-400 bg-pink-500/20',
    NOTE: 'text-gray-400 bg-gray-500/20'
  }
  
  const iconMap: Record<TimelineEvent['type'], React.ReactNode> = {
    DETECTION: <AlertTriangle className="w-4 h-4" />,
    TRIAGE: <Search className="w-4 h-4" />,
    CONTAINMENT: <Shield className="w-4 h-4" />,
    ERADICATION: <Trash2 className="w-4 h-4" />,
    RECOVERY: <RefreshCw className="w-4 h-4" />,
    ESCALATION: <ArrowRight className="w-4 h-4" />,
    NOTIFICATION: <Bell className="w-4 h-4" />,
    EVIDENCE: <Camera className="w-4 h-4" />,
    NOTE: <FileText className="w-4 h-4" />
  }

  return (
    <div className={`p-2 rounded-lg ${icons[type]}`}>
      {iconMap[type]}
    </div>
  )
}

// ============================================================
// MAIN INCIDENT RESPONSE CENTER COMPONENT
// ============================================================

export const IncidentResponseCenter: React.FC = () => {
  // State Management
  const [incidents, setIncidents] = useState<Incident[]>(mockIncidents)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showNewIncidentDialog, setShowNewIncidentDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')

  // Computed Values
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchesSearch = searchQuery === '' || 
        inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesSeverity = filterSeverity === 'all' || inc.severity === filterSeverity
      const matchesStatus = filterStatus === 'all' || inc.status === filterStatus
      
      return matchesSearch && matchesSeverity && matchesStatus
    })
  }, [incidents, searchQuery, filterSeverity, filterStatus])

  const stats = useMemo(() => ({
    total: incidents.length,
    newCount: incidents.filter(i => i.status === 'NEW').length,
    activeCount: incidents.filter(i => ['IN_PROGRESS', 'TRIAGE'].includes(i.status)).length,
    criticalCount: incidents.filter(i => i.severity === 'CRITICAL').length,
    containedCount: incidents.filter(i => i.status === 'CONTAINED').length,
    avgResolutionTime: '4h 23m' // Mock value
  }), [incidents])

  // Handlers
  const handleUpdateIncidentStatus = useCallback((incidentId: string, newStatus: IncidentStatus) => {
    setIncidents(prev => prev.map(inc => 
      inc.id === incidentId ? { ...inc, status: newStatus, updatedAt: new Date().toISOString() } : inc
    ))
    if (selectedIncident?.id === incidentId) {
      setSelectedIncident(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null)
    }
  }, [selectedIncident])

  const handleAssignIncident = useCallback((incidentId: string, assignee: string) => {
    setIncidents(prev => prev.map(inc => 
      inc.id === incidentId ? { ...inc, assignee, updatedAt: new Date().toISOString() } : inc
    ))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      {/* Header */}
      <div className="max-w-[1920px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-500/20">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Incident Response Center
              </h1>
              <p className="text-gray-400 mt-1">Djezzy National SOC - DFIR Operations</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Dialog open={showNewIncidentDialog} onOpenChange={setShowNewIncidentDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                  <Plus className="w-4 h-4 mr-2" />
                  New Incident
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Incident</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Log a new security incident for investigation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Title</label>
                      <Input placeholder="Incident title..." className="bg-slate-800 border-slate-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Category</label>
                      <Select>
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(CategoryIcons).map(cat => (
                            <SelectItem key={cat} value={cat}>{cat.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Description</label>
                    <Textarea placeholder="Detailed description of the incident..." className="min-h-[100px] bg-slate-800 border-slate-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Severity</label>
                      <Select defaultValue="MEDIUM">
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Assign To</label>
                      <Select>
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                          <SelectValue placeholder="Select analyst" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockTeamMembers.map(member => (
                            <SelectItem key={member.id} value={member.name}>{member.name} - {member.role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setShowNewIncidentDialog(false)}>Cancel</Button>
                  <Button onClick={() => setShowNewIncidentDialog(false)} className="bg-blue-500 hover:bg-blue-600">Create Incident</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto text-blue-400 mb-2" />
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-400">Total Incidents</div>
            </CardContent>
          </Card>
          <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Zap className="w-5 h-5 mx-auto text-purple-400 mb-2" />
              <div className="text-2xl font-bold text-purple-400">{stats.newCount}</div>
              <div className="text-xs text-gray-400">New</div>
            </CardContent>
          </Card>
          <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Activity className="w-5 h-5 mx-auto text-yellow-400 mb-2" />
              <div className="text-2xl font-bold text-yellow-400">{stats.activeCount}</div>
              <div className="text-xs text-gray-400">Active</div>
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
              <Shield className="w-5 h-5 mx-auto text-orange-400 mb-2" />
              <div className="text-2xl font-bold text-orange-400">{stats.containedCount}</div>
              <div className="text-xs text-gray-400">Contained</div>
            </CardContent>
          </Card>
          <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto text-green-400 mb-2" />
              <div className="text-2xl font-bold text-green-400">{stats.avgResolutionTime}</div>
              <div className="text-xs text-gray-400">Avg Resolution</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incident List */}
          <div className="lg:col-span-2">
            <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-400" />
                    Active Incidents
                    <Badge variant="secondary" className="ml-2">{filteredIncidents.length}</Badge>
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
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
                        variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewMode('kanban')}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search incidents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-slate-900/50 border-slate-600"
                    />
                  </div>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-32 bg-slate-900/50 border-slate-600">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-36 bg-slate-900/50 border-slate-600">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="CONTAINED">Contained</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === 'list' ? (
                  <ScrollArea className="h-[550px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700/50 hover:bg-transparent">
                          <TableHead className="text-gray-400">Ticket</TableHead>
                          <TableHead className="text-gray-400">Title</TableHead>
                          <TableHead className="text-gray-400">Severity</TableHead>
                          <TableHead className="text-gray-400">Status</TableHead>
                          <TableHead className="text-gray-400">Assignee</TableHead>
                          <TableHead className="text-gray-400">Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIncidents.map(incident => (
                          <TableRow
                            key={incident.id}
                            onClick={() => setSelectedIncident(incident)}
                            className={`border-slate-700/50 cursor-pointer transition-colors ${
                              selectedIncident?.id === incident.id ? 'bg-slate-700/50' : 'hover:bg-slate-800/50'
                            }`}
                          >
                            <TableCell className="font-mono text-sm text-blue-400">{incident.ticketNumber}</TableCell>
                            <TableCell>
                              <div className="max-w-[250px]">
                                <p className="font-medium text-white truncate">{incident.title}</p>
                                <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                                  {CategoryIcons[incident.category]}
                                  {incident.category.replace('_', ' ')}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell><SeverityBadge severity={incident.severity} /></TableCell>
                            <TableCell><StatusBadge status={incident.status} /></TableCell>
                            <TableCell className="text-sm text-gray-300">{incident.assignee.split(' ')[0]}</TableCell>
                            <TableCell className="text-sm text-gray-400">
                              {new Date(incident.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  /* Kanban View */
                  <div className="grid grid-cols-4 gap-3 h-[550px] overflow-x-auto">
                    {(['NEW', 'TRIAGE', 'IN_PROGRESS', 'CONTAINED'] as IncidentStatus[]).map(status => (
                      <div key={status} className="bg-slate-900/50 rounded-lg p-3 min-w-[240px]">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-300">{StatusConfig[status].label}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {filteredIncidents.filter(i => i.status === status).length}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {filteredIncidents.filter(i => i.status === status).map(incident => (
                            <div
                              key={incident.id}
                              onClick={() => setSelectedIncident(incident)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                incident.slaBreachRisk ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700/50 bg-slate-800/50'
                              } hover:border-slate-600`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-xs font-mono text-blue-400">{incident.ticketNumber}</span>
                                <SeverityBadge severity={incident.severity} />
                              </div>
                              <p className="text-sm font-medium text-white mt-1 line-clamp-2">{incident.title}</p>
                              <p className="text-xs text-gray-400 mt-2">{incident.assignee.split(' ')[0]}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Info Panel */}
          <div className="space-y-6">
            {/* Team Availability */}
            <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-400" />
                  IR Team Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockTeamMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/30">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-slate-700 text-white">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-white">{member.name}</p>
                          <p className="text-xs text-gray-400">{member.role}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={member.availability === 'available' ? 'default' : member.availability === 'busy' ? 'secondary' : 'outline'} 
                        className="text-xs"
                      >
                        {member.availability}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SLA Alerts */}
            <Card className="border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Timer className="w-4 h-4 text-red-400" />
                  SLA Warnings
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {incidents.filter(i => i.slaBreachRisk).length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incidents.filter(i => i.slaBreachRisk).map(incident => (
                    <div key={incident.id} className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-red-400">{incident.ticketNumber}</span>
                        <Badge variant="destructive" className="text-xs">At Risk</Badge>
                      </div>
                      <p className="text-xs text-gray-300 mt-1 line-clamp-1">{incident.title}</p>
                    </div>
                  ))}
                  {incidents.filter(i => i.slaBreachRisk).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No SLA warnings</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Incident Detail Modal */}
        {selectedIncident && (
          <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-3 text-xl">
                      <span className="font-mono text-blue-400">{selectedIncident.ticketNumber}</span>
                      {selectedIncident.title}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400 mt-1 flex items-center gap-3">
                      <SeverityBadge severity={selectedIncident.severity} />
                      <StatusBadge status={selectedIncident.status} />
                      <span>| Created: {new Date(selectedIncident.createdAt).toLocaleString()}</span>
                    </DialogDescription>
                  </div>
                  {selectedIncident.slaBreachRisk && (
                    <Badge variant="destructive" className="animate-pulse">
                      ⚠️ SLA at Risk
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="bg-slate-800 flex-wrap h-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="playbook">Playbook</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks ({selectedIncident.tasks.length})</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="iocs">IOCs ({selectedIncident.iocs.length})</TabsTrigger>
                  <TabsTrigger value="evidence">Evidence ({selectedIncident.evidence.length})</TabsTrigger>
                  <TabsTrigger value="communications">Comms</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Description</h4>
                      <p className="text-sm text-gray-200">{selectedIncident.description}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Category</span>
                        <span className="text-sm text-white flex items-center gap-1">
                          {CategoryIcons[selectedIncident.category]}
                          {selectedIncident.category.replace('_', ' ')}
                        </span>
                      </div>
                      <Separator className="bg-slate-700" />
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Assigned To</span>
                        <span className="text-sm text-white">{selectedIncident.assignee}</span>
                      </div>
                      <Separator className="bg-slate-700" />
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Team</span>
                        <span className="text-sm text-white">{selectedIncident.team}</span>
                      </div>
                      <Separator className="bg-slate-700" />
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Business Impact</span>
                        <SeverityBadge severity={selectedIncident.businessImpact as IncidentSeverity} />
                      </div>
                    </div>
                  </div>

                  {/* Affected Assets & Users */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                        <Server className="w-4 h-4" /> Affected Assets
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedIncident.affectedAssets.map(asset => (
                          <Badge key={asset} variant="outline" className="text-xs">{asset}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Affected Users
                      </h4>
                      <div className="text-2xl font-bold text-white">{selectedIncident.affectedUsers.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                      <Tag className="w-4 h-4" /> Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedIncident.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-3">
                    <Select value={selectedIncident.status} onValueChange={(v) => handleUpdateIncidentStatus(selectedIncident.id, v as IncidentStatus)}>
                      <SelectTrigger className="flex-1 bg-slate-800 border-slate-600">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(StatusConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Add Note
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Send className="w-4 h-4" />
                      Escalate
                    </Button>
                  </div>
                </TabsContent>

                {/* Playbook Tab */}
                <TabsContent value="playbook" className="mt-4">
                  {selectedIncident.playbookSteps.length > 0 ? (
                    <div className="space-y-3">
                      {['PREPARATION', 'DETECTION_ANALYSIS', 'CONTAINMENT', 'ERADICATION', 'RECOVERY', 'LESSONS_LEARNED'].map(phase => {
                        const phaseSteps = selectedIncident.playbookSteps.filter(s => s.phase === phase)
                        if (phaseSteps.length === 0) return null
                        
                        return (
                          <div key={phase} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">{phase.replace('_', ' ')}</h4>
                            <div className="space-y-2">
                              {phaseSteps.map(step => (
                                <div key={step.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                                  step.status === 'COMPLETED' ? 'bg-green-500/10 border-green-500/30' :
                                  step.status === 'IN_PROGRESS' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                  'bg-slate-900/50 border-slate-700'
                                }`}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    step.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                                    step.status === 'IN_PROGRESS' ? 'bg-yellow-500 text-black' :
                                    'bg-slate-700 text-gray-400'
                                  }`}>
                                    {step.status === 'COMPLETED' ? '✓' : step.id}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-white">{step.name}</p>
                                    <p className="text-xs text-gray-400">{step.description}</p>
                                  </div>
                                  <StatusBadge status={step.status} />
                                  {step.assignee && (
                                    <span className="text-xs text-gray-400">{step.assignee.split(' ')[0]}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No playbook steps defined yet</p>
                      <Button variant="outline" className="mt-3">Attach Playbook</Button>
                    </div>
                  )}
                </TabsContent>

                {/* Tasks Tab */}
                <TabsContent value="tasks" className="mt-4">
                  {selectedIncident.tasks.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-gray-400">Task</TableHead>
                          <TableHead className="text-gray-400">Assignee</TableHead>
                          <TableHead className="text-gray-400">Priority</TableHead>
                          <TableHead className="text-gray-400">Due Date</TableHead>
                          <TableHead className="text-gray-400">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedIncident.tasks.map(task => (
                          <TableRow key={task.id} className="border-slate-700/50">
                            <TableCell>
                              <div>
                                <p className="font-medium text-white text-sm">{task.title}</p>
                                <p className="text-xs text-gray-400">{task.description}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-300">{task.assignee}</TableCell>
                            <TableCell>
                              <Badge variant={task.priority === 'CRITICAL' ? 'destructive' : task.priority === 'HIGH' ? 'default' : 'secondary'} className="text-xs">
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-400">
                              {new Date(task.dueDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={task.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No tasks assigned yet</p>
                    </div>
                  )}
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="mt-4">
                  <div className="relative space-y-4">
                    {selectedIncident.timeline.map((event, idx) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <TimelineIcon type={event.type} />
                          {idx < selectedIncident.timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-slate-700 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white">{event.title}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300">{event.description}</p>
                          <p className="text-xs text-gray-500 mt-1">by {event.author}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* IOCs Tab */}
                <TabsContent value="iocs" className="mt-4">
                  {selectedIncident.iocs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-gray-400">Type</TableHead>
                          <TableHead className="text-gray-400">Value</TableHead>
                          <TableHead className="text-gray-400">Confidence</TableHead>
                          <TableHead className="text-gray-400">Source</TableHead>
                          <TableHead className="text-gray-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedIncident.iocs.map(ioc => (
                          <TableRow key={ioc.id} className="border-slate-700/50">
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{ioc.type.toUpperCase()}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-white">{ioc.value}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={ioc.confidence} className="w-16 h-2" />
                                <span className="text-xs text-gray-400">{ioc.confidence}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-300">{ioc.source}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="text-xs">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Enrich
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Fingerprint className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No IOCs extracted yet</p>
                    </div>
                  )}
                </TabsContent>

                {/* Evidence Tab */}
                <TabsContent value="evidence" className="mt-4">
                  {selectedIncident.evidence.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedIncident.evidence.map(ev => (
                        <div key={ev.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-slate-700">
                                {ev.type === 'PCAP' && <Network className="w-5 h-5 text-blue-400" />}
                                {ev.type === 'MEMORY_DUMP' && <HardDrive className="w-5 h-5 text-purple-400" />}
                                {ev.type === 'LOG' && <FileText className="w-5 h-5 text-green-400" />}
                                {ev.type === 'OTHER' && <Camera className="w-5 h-5 text-orange-400" />}
                              </div>
                              <div>
                                <p className="font-medium text-white text-sm">{ev.name}</p>
                                <p className="text-xs text-gray-400">{ev.size}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">{ev.type}</Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-3">{ev.description}</p>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                            <span className="text-xs text-gray-500">Collected by {ev.collectedBy}</span>
                            <Button variant="outline" size="sm" className="text-xs h-7">Download</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No evidence collected yet</p>
                      <Button variant="outline" className="mt-3">Upload Evidence</Button>
                    </div>
                  )}
                </TabsContent>

                {/* Communications Tab */}
                <TabsContent value="communications" className="mt-4">
                  {selectedIncident.communications.length > 0 ? (
                    <div className="space-y-3">
                      {selectedIncident.communications.map(com => (
                        <div key={com.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{com.channel}</Badge>
                              <span className="text-sm font-medium text-white">{com.subject}</span>
                            </div>
                            <span className="text-xs text-gray-400">{new Date(com.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-300">{com.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>From: {com.from}</span>
                            <span>To: {com.to}</span>
                            {com.isEncrypted && <Badge variant="secondary" className="text-xs">🔒 Encrypted</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No communications logged</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

// Import Fingerprint for use in empty state
import { Fingerprint } from 'lucide-react'

export default IncidentResponseCenter
