'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Brain, Zap, Shield, Activity, TrendingUp, AlertTriangle,
  Settings, Play, Pause, RefreshCw, CheckCircle, XCircle,
  Clock, Cpu, Database, Network, Bot, Target, LineChart,
  BarChart3, Wrench, Sparkles, Rocket, Radar
} from 'lucide-react'

// ============================================================
// AI AUTOMATION DASHBOARD COMPONENT
// Complete AI-Powered Security Operations Automation
// ============================================================

interface AIMetrics {
  totalAutomationsRun: number
  successRate: number
  avgResponseTime: number
  mttr: number
  falsePositiveRate: number
  humanInterventionsRequired: number
  costSavings: number
  uptimeImprovement: number
  threatsPrevented: number
  automationsByType: Record<string, number>
}

interface AIModel {
  id: string
  name: string
  version: string
  type: string
  status: string
  accuracy: number
  f1Score: number
  inferenceTime: number
}

interface Playbook {
  id: string
  name: string
  description: string
  status: string
  executionCount: number
  successRate: number
  avgExecutionTime: number
}

export function AIAutomationDashboard() {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null)
  const [models, setModels] = useState<AIModel[]>([])
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [selectedTab, setSelectedTab] = useState<'overview' | 'models' | 'playbooks' | 'self-healing'>('overview')
  const [isRunning, setIsRunning] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAIData()
    const interval = setInterval(fetchAIData, 30000) // Auto-refresh every 30s
    return () => clearInterval(interval)
  }, [selectedTab])

  const fetchAIData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ai-automation?type=${selectedTab === 'overview' ? '' : selectedTab}`)
      const result = await response.json()
      
      if (result.success) {
        if (selectedTab === 'overview' || !result.data.models) {
          setMetrics(result.data.metrics || result.data)
        }
        if (result.data.models) {
          setModels(result.data.models)
        }
        if (result.data.list) {
          setPlaybooks(result.data.list)
        }
      }
    } catch (error) {
      console.error('Failed to fetch AI data:', error)
    } finally {
      setLoading(false)
    }
  }

  const executePlaybook = async (playbookId: string) => {
    try {
      const response = await fetch('/api/ai-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute-playbook',
          playbookId,
          priority: 'high'
        })
      })
      const result = await response.json()
      
      if (result.success) {
        alert(`Playbook execution started! Task ID: ${result.data.taskId}`)
        fetchAIData() // Refresh data
      }
    } catch (error) {
      console.error('Failed to execute playbook:', error)
    }
  }

  const runDetection = async () => {
    try {
      const response = await fetch('/api/ai-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-detection', dataSource: 'network_flow' })
      })
      const result = await response.json()
      
      if (result.success) {
        alert(`Detection scan initiated! Task ID: ${result.data.taskId}`)
      }
    } catch (error) {
      console.error('Failed to run detection:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-7 h-7 text-purple-400" />
            AI Automation Engine
          </h2>
          <p className="text-slate-400 mt-1">
            Complete AI-powered security operations automation & orchestration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`border-green-500 text-green-400 ${isRunning ? 'animate-pulse' : ''}`}>
            <Activity className="w-3 h-3 mr-1" />
            {isRunning ? 'Engine Active' : 'Engine Paused'}
          </Badge>
          <Button
            variant={isRunning ? 'outline' : 'default'}
            size="sm"
            onClick={() => setIsRunning(!isRunning)}
            className={isRunning 
              ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800' 
              : 'bg-purple-600 hover:bg-purple-700'
            }
          >
            {isRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {isRunning ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'models', label: 'ML Models', icon: Cpu },
          { id: 'playbooks', label: 'Playbooks', icon: Zap },
          { id: 'self-healing', label: 'Self-Healing', icon: Wrench }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={selectedTab === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTab(tab.id as any)}
            className={selectedTab === tab.id 
              ? 'bg-purple-600 hover:bg-purple-700' 
              : 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
            }
          >
            <tab.icon className="w-4 h-4 mr-1" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Automation Success Rate</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {metrics?.successRate ? `${(metrics.successRate * 100).toFixed(1)}%` : '94.2%'}
                </p>
                <p className="text-xs text-green-400 mt-1">+2.3% from last month</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Threats Prevented</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">
                  {metrics?.threatsPrevented?.toLocaleString() || '892'}
                </p>
                <p className="text-xs text-cyan-400 mt-1">This month</p>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">
                  {metrics?.avgResponseTime || 185}s
                </p>
                <p className="text-xs text-yellow-400 mt-1">-15s improvement</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Cost Savings</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  ${(metrics?.costSavings || 2450000 / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-emerald-400 mt-1">Estimated annual</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ML Models Status */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                Machine Learning Models
              </CardTitle>
              <CardDescription>Deployed AI models for threat detection and prediction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Telecom Threat Classifier', version: 'v3.2.1', accuracy: 96.4, status: 'deployed', type: 'classification' },
                  { name: 'Network Anomaly Detector', version: 'v4.1.0', accuracy: 97.8, status: 'deployed', type: 'anomaly' },
                  { name: 'Fraud Predictor', version: 'v5.0.3', accuracy: 94.2, status: 'deployed', type: 'regression' },
                  { name: 'Threat Intelligence NLP', version: 'v2.3.0', accuracy: 92.3, status: 'deployed', type: 'nlp' },
                  { name: 'Behavioral Analytics (UBA)', version: 'v3.1.2', accuracy: 91.2, status: 'deployed', type: 'clustering' },
                  { name: 'Predictive Scaling', version: 'v1.4.0', accuracy: 88.7, status: 'deployed', type: 'regression' }
                ].map((model, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Brain className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{model.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{model.version}</span>
                          <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                            {model.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{model.accuracy}%</p>
                        <p className="text-xs text-slate-400">Accuracy</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-green-400">{model.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Rocket className="w-5 h-5 text-orange-400" />
                Quick Actions
              </CardTitle>
              <CardDescription>Execute common automation tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start bg-red-600 hover:bg-red-700" 
                  onClick={runDetection}
                >
                  <Radar className="w-4 h-4 mr-2" />
                  Run Anomaly Detection Scan
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                  onClick={() => executePlaybook('pb-ddos-mitigation')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Execute DDoS Mitigation
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => executePlaybook('pb-sim-swap-response')}
                >
                  <Target className="w-4 h-4 mr-2" />
                  SIM Swap Response
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  onClick={() => executePlaybook('pb-malware-containment')}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Malware Containment
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                  onClick={() => executePlaybook('pb-ss7-attack-block')}
                >
                  <Network className="w-4 h-4 mr-2" />
                  Block SS7 Attack
                </Button>

                <div className="pt-3 border-t border-slate-700">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={fetchAIData}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh All Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Automated Playbooks */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Automated Response Playbooks
          </CardTitle>
          <CardDescription>Pre-configured automation workflows for common scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Playbook</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Executions</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Success Rate</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Avg Time</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'pb-ddos-mitigation', name: 'DDoS Auto-Mitigation', executions: 47, success: 95.7, time: '3m 0s', status: 'active' },
                  { id: 'pb-sim-swap-response', name: 'SIM Swap Fraud Response', executions: 156, success: 98.2, time: '4m 0s', status: 'active' },
                  { id: 'pb-malware-containment', name: 'Malware Auto-Containment', executions: 89, success: 94.3, time: '7m 0s', status: 'active' },
                  { id: 'pb-ss7-attack-block', name: 'SS7 Attack Blocking', executions: 234, success: 99.1, time: '45s', status: 'active' },
                  { id: 'pb-insider-threat', name: 'Insider Threat Response', executions: 12, success: 75.0, time: '10m 0s', status: 'active' }
                ].map((playbook, i) => (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-yellow-400" />
                        <span className="text-white font-medium">{playbook.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="border-green-500 text-green-400">
                        {playbook.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{playbook.executions}</td>
                    <td className="py-3 px-4">
                      <span className={playbook.success > 90 ? 'text-green-400' : 'text-yellow-400'}>
                        {playbook.success}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{playbook.time}</td>
                    <td className="py-3 px-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => executePlaybook(playbook.id)}
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Run
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Self-Healing Capabilities */}
      <Card className="bg-gradient-to-br from-emerald-900/20 to-slate-900 border-emerald-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            Self-Healing Automation
          </CardTitle>
          <CardDescription>AI-driven automatic remediation of infrastructure issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { component: 'Wazuh SIEM', issue: 'High Memory Usage', impact: 'low', status: 'ready' },
              { component: 'Elasticsearch', issue: 'Disk Space Critical', impact: 'medium', status: 'ready' },
              { component: 'Kafka Broker', issue: 'Consumer Lag High', impact: 'medium', status: 'ready' },
              { component: 'PostgreSQL', issue: 'Connection Pool Exhausted', impact: 'high', status: 'ready' }
            ].map((healing, i) => (
              <div key={i} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <Badge variant="outline" className={
                    healing.impact === 'high' ? 'border-red-500/50 text-red-400' :
                    healing.impact === 'medium' ? 'border-yellow-500/50 text-yellow-400' :
                    'border-green-500/50 text-green-400'
                  }>
                    {healing.impact}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-white mt-2">{healing.component}</p>
                <p className="text-xs text-slate-400 mt-1">{healing.issue}</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-3 w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-Fix
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* NLP Processing Demo */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <LineChart className="w-5 h-5 text-blue-400" />
            AI Threat Intelligence Processing
          </CardTitle>
          <CardDescription>Natural Language Processing for automated threat analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                Entity Extraction
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Automatically extract IOCs (IPs, domains, hashes) from unstructured text.
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-slate-300">IP Addresses</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-slate-300">File Hashes</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-slate-300">Domain Names</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Sentiment Analysis
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Analyze tone and urgency of threat intelligence reports.
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-slate-300">Threat Severity</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-slate-300">Urgency Score</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-slate-300">Confidence Level</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Auto-Summarization
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Generate concise summaries of lengthy security reports and alerts.
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-slate-300">Key Points</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-slate-300">Action Items</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-slate-300">Executive Summary</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
