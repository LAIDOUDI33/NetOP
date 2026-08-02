'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MapPin, Globe, Radar, AlertTriangle, TrendingUp, Users,
  Activity, Shield, Satellite, Navigation, Zap,
  BarChart3, PieChart, Eye, Crosshair, Layers
} from 'lucide-react'

// ============================================================
// GEOMARKETING DASHBOARD COMPONENT
// Geographic Threat Intelligence & Location-Based Analytics
// ============================================================

interface GeoData {
  totalWilayas: number
  activeHotspots: number
  criticalHotspots: number
  regionsAtRisk: number
  topThreatenedRegion: string
  avgThreatScore: number
  insightsCount: number
  recentEvents: any[]
  topHotspots: any[]
}

interface RegionalData {
  wilaya: string
  wilayaCode: number
  totalEvents: number
  threatScore: number
  trend: number
  subscriberImpact: number
}

export function GeomarketingDashboard() {
  const [geoData, setGeoData] = useState<GeoData | null>(null)
  const [regionalData, setRegionalData] = useState<RegionalData[]>([])
  const [selectedView, setSelectedView] = useState<'overview' | 'hotspots' | 'regional' | 'insights'>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGeoData()
  }, [selectedView])

  const fetchGeoData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/geomarketing?type=${selectedView === 'overview' ? '' : selectedView}`)
      const result = await response.json()
      
      if (result.success) {
        if (selectedView === 'overview') {
          setGeoData(result.data)
        } else if (selectedView === 'regional') {
          setRegionalData(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch geo data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mock map visualization (would use real map library in production)
  const AlgeriaMapVisualization = () => (
    <div className="relative w-full h-[400px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748b" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Simulated Algeria outline with hotspots */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[300px] h-[350px]">
          {/* Hotspot indicators */}
          {[...Array(8)].map((_, i) => {
            const positions = [
              { top: '20%', left: '45%', size: 'large', severity: 'critical' },
              { top: '35%', left: '30%', size: 'medium', severity: 'high' },
              { top: '50%', left: '60%', size: 'large', severity: 'high' },
              { top: '65%', left: '40%', size: 'small', severity: 'medium' },
              { top: '40%', left: '70%', size: 'medium', severity: 'warning' },
              { top: '75%', left: '55%', size: 'small', severity: 'low' },
              { top: '25%', left: '55%', size: 'medium', severity: 'high' },
              { top: '55%', left: '25%', size: 'small', severity: 'info' }
            ]
            const pos = positions[i]
            
            return (
              <div
                key={i}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 animate-pulse`}
                style={{ top: pos.top, left: pos.left }}
              >
                <div 
                  className={`rounded-full ${
                    pos.severity === 'critical' ? 'bg-red-500' :
                    pos.severity === 'high' ? 'bg-orange-500' :
                    pos.severity === 'medium' ? 'bg-yellow-500' :
                    pos.severity === 'warning' ? 'bg-blue-500' : 'bg-green-500'
                  } opacity-80`}
                  style={{
                    width: pos.size === 'large' ? '24px' : pos.size === 'medium' ? '18px' : '12px',
                    height: pos.size === 'large' ? '24px' : pos.size === 'medium' ? '18px' : '12px'
                  }}
                />
                {(pos.size === 'large' || pos.size === 'medium') && (
                  <div 
                    className={`absolute inset-0 rounded-full animate-ping ${
                      pos.severity === 'critical' ? 'bg-red-400' :
                      pos.severity === 'high' ? 'bg-orange-400' : 'bg-yellow-400'
                    } opacity-30`}
                    style={{
                      width: pos.size === 'large' ? '36px' : '28px',
                      height: pos.size === 'large' ? '36px' : '28px',
                      marginLeft: pos.size === 'large' ? '-6px' : '-5px',
                      marginTop: pos.size === 'large' ? '-6px' : '-5px'
                    }}
                  />
                )}
              </div>
            )
          })}

          {/* Center label */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <MapPin className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <span className="text-sm text-slate-300 font-medium">Algeria</span>
            <span className="text-xs text-slate-500 block">58 Wilayas Monitored</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 p-3 rounded-lg border border-slate-700">
        <p className="text-xs font-medium text-slate-300 mb-2">Threat Level</p>
        <div className="space-y-1">
          {[
            { color: 'bg-red-500', label: 'Critical (>70)' },
            { color: 'bg-orange-500', label: 'High (50-70)' },
            { color: 'bg-yellow-500', label: 'Medium (30-50)' },
            { color: 'bg-blue-500', label: 'Low (<30)' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 bg-slate-900/90 p-3 rounded-lg border border-slate-700">
        <div className="text-right space-y-1">
          <div className="text-lg font-bold text-white">{geoData?.activeHotspots || 12}</div>
          <div className="text-xs text-slate-400">Active Hotspots</div>
          <div className="text-sm font-medium text-red-400 mt-2">
            {geoData?.criticalHotspots || 3} Critical
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-7 h-7 text-cyan-400" />
            Geomarketing Intelligence
          </h2>
          <p className="text-slate-400 mt-1">
            Geographic threat visualization & location-based security analytics
          </p>
        </div>
        <Badge variant="outline" className="border-cyan-500 text-cyan-400">
          <Satellite className="w-3 h-3 mr-1" />
          Live Monitoring
        </Badge>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'hotspots', label: 'Threat Hotspots', icon: Radar },
          { id: 'regional', label: 'Regional Analysis', icon: MapPin },
          { id: 'insights', label: 'AI Insights', icon: BrainIcon }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={selectedView === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView(tab.id as any)}
            className={selectedView === tab.id 
              ? 'bg-cyan-600 hover:bg-cyan-700' 
              : 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
            }
          >
            <tab.icon className="w-4 h-4 mr-1" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Regions Monitored</p>
                <p className="text-2xl font-bold text-white mt-1">{geoData?.totalWilayas || 58}</p>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <Globe className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Hotspots</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">{geoData?.activeHotspots || 12}</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Radar className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{geoData?.criticalHotspots || 3}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Threat Score</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{geoData?.avgThreatScore || 42}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Visualization */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Navigation className="w-5 h-5 text-cyan-400" />
                Threat Geography - Algeria
              </CardTitle>
              <CardDescription>Real-time geographic distribution of security events</CardDescription>
            </CardHeader>
            <CardContent>
              <AlgeriaMapVisualization />
            </CardContent>
          </Card>
        </div>

        {/* Top Hotspots */}
        <div>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-orange-400" />
                Top Threat Hotspots
              </CardTitle>
              <CardDescription>Highest risk areas requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Alger Centre', score: 87, trend: 'up', events: 234 },
                  { name: 'Oran Region', score: 72, trend: 'up', events: 156 },
                  { name: 'Constantine', score: 64, trend: 'down', events: 98 },
                  { name: 'Sétif Area', score: 58, trend: 'stable', events: 87 },
                  { name: 'Béjaïa Coast', score: 51, trend: 'up', events: 76 }
                ].map((hotspot, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${
                        hotspot.score > 70 ? 'bg-red-500' :
                        hotspot.score > 50 ? 'bg-orange-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-white">{hotspot.name}</p>
                        <p className="text-xs text-slate-400">{hotspot.events} events</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{hotspot.score}</p>
                      <p className={`text-xs flex items-center gap-1 ${
                        hotspot.trend === 'up' ? 'text-red-400' :
                        hotspot.trend === 'down' ? 'text-green-400' : 'text-slate-400'
                      }`}>
                        {hotspot.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                        {hotspot.score > 70 ? 'Critical' : 'Warning'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Regional Breakdown Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            Regional Security Overview
          </CardTitle>
          <CardDescription>Threat analysis by Algerian province (Wilaya)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Wilaya</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Events</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Threat Score</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Trend</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Impact</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Alger', code: 16, events: 456, score: 87, trend: 12, impact: 'High', status: 'critical' },
                  { name: 'Oran', code: 31, events: 342, score: 72, trend: 8, impact: 'High', status: 'high' },
                  { name: 'Constantine', code: 25, events: 289, score: 64, trend: -5, impact: 'Medium', status: 'medium' },
                  { name: 'Sétif', code: 19, events: 234, score: 58, trend: 15, impact: 'Medium', status: 'medium' },
                  { name: 'Béjaïa', code: 6, events: 198, score: 51, trend: 22, impact: 'Low', status: 'low' },
                  { name: 'Tizi Ouzou', code: 15, events: 176, score: 47, trend: -3, impact: 'Low', status: 'low' }
                ].map((region, i) => (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-white font-medium">{region.name}</span>
                        <span className="text-xs text-slate-500">({region.code})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{region.events}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              region.score > 70 ? 'bg-red-500' :
                              region.score > 50 ? 'bg-orange-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${region.score}%` }}
                          />
                        </div>
                        <span className="text-white font-medium">{region.score}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`flex items-center gap-1 ${
                        region.trend > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {region.trend > 0 ? '+' : ''}{region.trend}%
                        {region.trend > 0 && <TrendingUp className="w-3 h-3" />}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{region.impact}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={
                        region.status === 'critical' ? 'border-red-500 text-red-400' :
                        region.status === 'high' ? 'border-orange-500 text-orange-400' :
                        region.status === 'medium' ? 'border-yellow-500 text-yellow-400' :
                        'border-green-500 text-green-400'
                      }>
                        {region.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI-Powered Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-900/30 to-slate-900 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Churn Risk Prediction</p>
                <p className="text-xs text-slate-400 mt-1">
                  AI predicts 15% churn increase in high-threat regions. Recommend proactive retention campaigns.
                </p>
                <Badge variant="outline" className="mt-2 border-purple-500 text-purple-400 text-xs">
                  ML Prediction • 94% Confidence
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-900/30 to-slate-900 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Fraud Hotspot Detected</p>
                <p className="text-xs text-slate-400 mt-1">
                  Oran region shows 340% increase in SIM swap attempts. Auto-playbook activated.
                </p>
                <Badge variant="outline" className="mt-2 border-orange-500 text-orange-400 text-xs">
                  Auto-Response Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-900/30 to-slate-900 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Coverage Gap Analysis</p>
                <p className="text-xs text-slate-400 mt-1">
                  Southern regions show coverage gaps correlating with increased fraud incidents.
                </p>
                <Badge variant="outline" className="mt-2 border-cyan-500 text-cyan-400 text-xs">
                  Infrastructure Insight
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Brain Icon Component
function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )
}
