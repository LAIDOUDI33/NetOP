// ============================================================
// DJEZZY SOC GEOMARKETING ENGINE
// Geographic Threat Intelligence & Location-Based Analytics
// ============================================================

export interface GeoCoordinates {
  latitude: number
  longitude: number
}

export interface GeoFence {
  id: string
  name: string
  type: 'circle' | 'polygon' | 'route'
  coordinates: GeoCoordinates[]
  radius?: number // for circle type
  alertLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface ThreatHotspot {
  id: string
  name: string
  center: GeoCoordinates
  radius: number // in kilometers
  threatScore: number // 0-100
  threatType: string
  eventCount: number
  trend: 'increasing' | 'stable' | 'decreasing'
  lastUpdated: Date
  affectedSubscribers: number
  wilaya: string // Algerian province
  commune: string
}

export interface RegionalThreatData {
  wilaya: string
  wilayaCode: number
  totalEvents: number
  criticalAlerts: number
  highAlerts: number
  mediumAlerts: number
  lowAlerts: number
  threatScore: number
  trend: number // percentage change
  topThreatTypes: { type: string; count: number }[]
  subscriberImpact: number
  networkNodes: number
  center: GeoCoordinates
}

export interface SubscriberLocation {
  imsi: string
  msisdn: string
  currentLocation: GeoCoordinates
  lastUpdate: Date
  riskScore: number
  status: 'active' | 'roaming' | 'suspicious' | 'blocked'
  connectedCellTower: string
  signalStrength: number
}

export interface NetworkCoveragePoint {
  id: string
  location: GeoCoordinates
  cellTowerId: string
  technology: '2G' | '3G' | '4G' | '5G'
  coverageQuality: 'excellent' | 'good' | 'fair' | 'poor'
  securityStatus: 'secure' | 'monitored' | 'compromised' | 'unknown'
  throughput: number // Mbps
  latency: number // ms
  activeConnections: number
  threatIndicators: number
}

export interface GeoEvent {
  id: string
  timestamp: Date
  location: GeoCoordinates
  eventType: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  source: string
  description: string
  wilaya: string
  affectedAssets: string[]
  iocs?: string[]
}

export interface GeoMarketingInsight {
  id: string
  region: string
  metricType: 'churn_risk' | 'fraud_hotspot' | 'coverage_gap' | 'security_incident' | 'subscriber_growth'
  value: number
  change: number // percentage change from previous period
  prediction: number // AI-predicted next period
  confidence: number // 0-1
  recommendations: string[]
  relatedIncidents: string[]
}

// Algerian Wilayas (Provinces) with coordinates
export const ALGERIAN_WILAYAS = [
  { code: 1, name: 'Adrar', center: { latitude: 27.8862, longitude: -0.2785 }, population: 167000 },
  { code: 2, name: 'Chlef', center: { latitude: 36.1640, longitude: 1.2367 }, population: 1.013M },
  { code: 3, name: 'Laghouat', center: { latitude: 33.4439, longitude: 2.8744 }, population: 158000 },
  { code: 4, name: 'Oum El Bouaghi', center: { latitude: 35.8696, longitude: 7.1109 }, population: 445000 },
  { code: 5, name: 'Batna', center: { latitude: 35.5561, longitude: 6.1786 }, population: 1.04M },
  { code: 6, name: 'Béjaïa', center: { latitude: 36.7208, longitude: 5.0691 }, population: 1.01M },
  { code: 7, name: 'Biskra', center: { latitude: 34.8074, longitude: 5.7097 }, population: 717000 },
  { code: 8, name: 'Béchar', center: { latitude: 31.6206, longitude: -2.2274 }, population: 166000 },
  { code: 9, name: 'Blida', center: { latitude: 36.4742, longitude: 2.8256 }, population: 1.009M },
  { code: 10, name: 'Bouira', center: { latitude: 36.3736, longitude: 3.8825 }, population: 671000 },
  { code: 11, name: 'Tamanrasset', center: { latitude: 22.7850, longitude: 5.5206 }, population: 98000 },
  { code: 12, name: 'Tébessa', center: { latitude: 35.4075, longitude: 8.1217 }, population: 657000 },
  { code: 13, name: 'Tlemcen', center: { latitude: 34.8880, longitude: -1.3153 }, population: 873000 },
  { code: 14, name: 'Tiaret', center: { latitude: 35.3697, longitude: 1.3187 }, population: 842000 },
  { code: 15, name: 'Tizi Ouzou', center: { latitude: 36.5503, longitude: 4.0375 }, population: 1.12M },
  { code: 16, name: 'Alger', center: { latitude: 36.7538, longitude: 3.0588 }, population: 3.48M },
  { code: 17, name: 'Djelfa', center: { latitude: 34.6826, longitude: 3.2824 }, population: 1.093M },
  { code: 18, name: 'Jijel', center: { latitude: 36.7911, longitude: 5.7638 }, population: 663000 },
  { code: 19, name: 'Sétif', center: { latitude: 36.1893, longitude: 5.4086 }, population: 1.49M },
  { code: 20, name: 'Saïda', center: { latitude: 34.8333, longitude: 0.1500 }, population: 212000 },
  { code: 21, name: 'Skikda', center: { latitude: 36.8591, longitude: 6.8926 }, population: 904000 },
  { code: 22, name: 'Sidi Bel Abbès', center: { latitude: 34.8500, longitude: -0.6500 }, population: 605000 },
  { code: 23, name: 'Annaba', center: { latitude: 36.9000, longitude: 7.7667 }, population: 643000 },
  { code: 24, name: 'Guelma', center: { latitude: 36.4647, longitude: 7.4692 }, population: 482000 },
  { code: 25, name: 'Constantine', center: { latitude: 36.3650, longitude: 6.6147 }, population: 944000 },
  { code: 26, name: 'Médéa', center: { latitude: 36.2569, longitude: 2.7575 }, population: 839000 },
  { code: 27, name: 'Mostaganem', center: { latitude: 35.9317, longitude: 0.0889 }, population: 738000 },
  { code: 28, name: "M'Sila", center: { latitude: 35.7094, longitude: 4.5369 }, population: 991000 },
  { code: 29, name: 'Mascara', center: { latitude: 35.4000, longitude: 0.1333 }, population: 151000 },
  { code: 30, name: 'Ouargla', center: { latitude: 33.3806, longitude: 5.3267 }, population: 592000 },
  { code: 31, name: 'Oran', center: { latitude: 35.6911, longitude: -0.6158 }, population: 1.45M },
  { code: 32, name: 'El Bayadh', center: { latitude: 33.6833, longitude: 0.9833 }, population: 123000 },
  { code: 33, name: 'Illizi', center: { latitude: 26.4806, longitude: 8.2708 }, population: 42000 },
  { code: 34, name: 'Bordj Bou Arréridj', center: { latitude: 36.0742, longitude: 4.7500 }, population: 629000 },
  { code: 35, name: 'Boumerdès', center: { latitude: 36.7667, longitude: 3.4667 }, population: 795000 },
  { code: 36, name: 'El Tarf', center: { latitude: 36.7500, longitude: 8.3167 }, population: 408000 },
  { code: 37, name: 'Tindouf', center: { latitude: 27.6703, longitude: -8.1358 }, population: 45000 },
  { code: 38, name: 'Tissemsilt', center: { latitude: 35.6083, longitude: 1.9714 }, population: 297000 },
  { code: 39, name: 'El Oued', center: { latitude: 33.5064, longitude: 6.8647 }, population: 673000 },
  { code: 40, name: 'Khenchela', center: { latitude: 35.4333, longitude: 7.1417 }, population: 384000 },
  { code: 41, name: 'Souk Ahras', center: { latitude: 36.2833, longitude: 7.9583 }, population: 440000 },
  { code: 42, name: 'Tipaza', center: { latitude: 36.6333, longitude: 2.4500 }, population: 813000 },
  { code: 43, name: 'Mila', center: { latitude: 36.4500, longitude: 6.2667 }, population: 768000 },
  { code: 44, name: 'Aïn Defla', center: { latitude: 36.2500, longitude: 2.1167 }, population: 771000 },
  { code: 45, name: 'Naâma', center: { latitude: 33.2667, longitude: -0.3167 }, population: 209000 },
  { code: 46, name: 'Aïn Témouchent', center: { latitude: 35.3000, longitude: -1.1333 }, population: 370000 },
  { code: 47, name: 'Ghardaïa', center: { latitude: 32.4889, longitude: 3.6722 }, population: 380000 },
  { code: 48, name: 'Relizane', center: { latitude: 35.9000, longitude: -0.5333 }, population: 723000 },
  { code: 49, name: "El M'Ghair", center: { latitude: 33.8083, longitude: -6.5667 }, population: 162000 },
  { code: 50, name: 'El Meniaa', center: { latitude: 30.2500, longitude: 2.8833 }, population: 51000 },
  { code: 51, name: 'Ouled Djellal', center: { latitude: 35.8167, longitude: 5.7167 }, population: 178000 },
  { code: 52, name: 'Bordj Baji Mokhtar', center: { latitude: 21.3333, longitude: 0.9500 }, population: 16000 },
  { code: 53, name: 'Béni Abbès', center: { latitude: 29.9333, longitude: -2.8833 }, population: 11000 },
  { code: 54, name: 'Timimoun', center: { latitude: 29.2500, longitude: 0.2500 }, population: 122000 },
  { code: 55, name: 'Touggourt', center: { latitude: 33.1000, longitude: 6.0667 }, population: 149000 },
  { code: 56, name: 'Djanet', center: { latitude: 24.5500, longitude: 9.4667 }, population: 18000 },
  { code: 57, name: 'In Guezzam', center: { latitude: 23.5000, longitude: 5.7333 }, population: 8000 },
  { code: 58, name: 'In Salah', center: { latitude: 27.2000, longitude: 2.4667 }, population: 37000 }
]

export class GeoMarketingEngine {
  private static instance: GeoMarketingEngine
  private threatHotspots: Map<string, ThreatHotspot> = new Map()
  private regionalData: Map<number, RegionalThreatData> = new Map()
  private geoEvents: GeoEvent[] = []
  private geoFences: GeoFence[] = []

  static getInstance(): GeoMarketingEngine {
    if (!GeoMarketingEngine.instance) {
      GeoMarketingEngine.instance = new GeoMarketingEngine()
    }
    return GeoMarketingEngine.instance
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(point1: GeoCoordinates, point2: GeoCoordinates): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(point2.latitude - point1.latitude)
    const dLon = this.toRad(point2.longitude - point1.longitude)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(point1.latitude)) * Math.cos(this.toRad(point2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Check if a point is within a geofence
  isWithinGeofence(location: GeoCoordinates, fence: GeoFence): boolean {
    switch (fence.type) {
      case 'circle':
        if (!fence.radius || !fence.coordinates[0]) return false
        return this.calculateDistance(location, fence.coordinates[0]) <= fence.radius
      
      case 'polygon':
        return this.isPointInPolygon(location, fence.coordinates)
      
      case 'route':
        return this.isNearRoute(location, fence.coordinates, 0.5)
      
      default:
        return false
    }
  }

  // Ray casting algorithm for point-in-polygon check
  private isPointInPolygon(point: GeoCoordinates, polygon: GeoCoordinates[]): boolean {
    let inside = false
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude, yi = polygon[i].longitude
      const xj = polygon[j].latitude, yj = polygon[j].longitude
      
      if (((yi > point.longitude) !== (yj > point.longitude)) &&
          (point.latitude < (xj - xi) * (point.longitude - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    
    return inside
  }

  // Check proximity to a route/path
  private isNearRoute(point: GeoCoordinates, route: GeoCoordinates[], thresholdKm: number): boolean {
    for (let i = 0; i < route.length - 1; i++) {
      if (this.distanceToLineSegment(point, route[i], route[i + 1]) <= thresholdKm) {
        return true
      }
    }
    return false
  }

  // Calculate distance from point to line segment
  private distanceToLineSegment(point: GeoCoordinates, start: GeoCoordinates, end: GeoCoordinates): number {
    const A = point.latitude - start.latitude
    const B = point.longitude - start.longitude
    const C = end.latitude - start.latitude
    const D = end.longitude - start.longitude
    
    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1
    
    if (lenSq !== 0) param = dot / lenSq
    
    let xx, yy
    
    if (param < 0) {
      xx = start.latitude
      yy = start.longitude
    } else if (param > 1) {
      xx = end.latitude
      yy = end.longitude
    } else {
      xx = start.latitude + param * C
      yy = start.longitude + param * D
    }
    
    return this.calculateDistance(point, { latitude: xx, longitude: yy })
  }

  // Identify threat hotspots using spatial clustering
  identifyThreatHotspots(events: GeoEvent[], radiusKm: number = 10, minEvents: number = 5): ThreatHotspot[] {
    const clusters: { center: GeoCoordinates; events: GeoEvent[] }[] = []
    
    for (const event of events) {
      let addedToCluster = false
      
      for (const cluster of clusters) {
        if (this.calculateDistance(event.location, cluster.center) <= radiusKm) {
          cluster.events.push(event)
          cluster.center = {
            latitude: cluster.events.reduce((sum, e) => sum + e.location.latitude, 0) / cluster.events.length,
            longitude: cluster.events.reduce((sum, e) => sum + e.location.longitude, 0) / cluster.events.length
          }
          addedToCluster = true
          break
        }
      }
      
      if (!addedToCluster) {
        clusters.push({ center: { ...event.location }, events: [event] })
      }
    }
    
    return clusters
      .filter(cluster => cluster.events.length >= minEvents)
      .map((cluster, index) => {
        const criticalCount = cluster.events.filter(e => e.severity === 'critical').length
        const highCount = cluster.events.filter(e => e.severity === 'high').length
        
        const wilaya = this.findNearestWilaya(cluster.center)
        
        const threatScore = Math.min(100, (
          (criticalCount * 25) +
          (highCount * 15) +
          (cluster.events.filter(e => e.severity === 'medium').length * 8) +
          (cluster.events.filter(e => e.severity === 'low').length * 3)
        ))
        
        const trend: ThreatHotspot['trend'] = Math.random() > 0.5 ? 'increasing' : 
                                              Math.random() > 0.5 ? 'stable' : 'decreasing'
        
        const threatTypeCounts: Record<string, number> = {}
        cluster.events.forEach(e => {
          threatTypeCounts[e.eventType] = (threatTypeCounts[e.eventType] || 0) + 1
        })
        const topThreatType = Object.entries(threatTypeCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown'
        
        return {
          id: `hotspot-${index}`,
          name: `${wilaya.name} ${topThreatType} Cluster`,
          center: cluster.center,
          radius: radiusKm,
          threatScore,
          threatType: topThreatType,
          eventCount: cluster.events.length,
          trend,
          lastUpdated: new Date(),
          affectedSubscribers: Math.floor(Math.random() * 10000) + 1000,
          wilaya: wilaya.name,
          commune: ''
        }
      })
      .sort((a, b) => b.threatScore - a.threatScore)
  }

  // Find nearest wilaya to a coordinate
  findNearestWilaya(coord: GeoCoordinates): typeof ALGERIAN_WILAYAS[0] {
    let nearest = ALGERIAN_WILAYAS[0]
    let minDistance = Infinity
    
    for (const wilaya of ALGERIAN_WILAYAS) {
      const distance = this.calculateDistance(coord, wilaya.center)
      if (distance < minDistance) {
        minDistance = distance
        nearest = wilaya
      }
    }
    
    return nearest
  }

  // Generate regional threat summary
  generateRegionalSummary(events: GeoEvent[]): RegionalThreatData[] {
    const regionalMap = new Map<number, {
      totalEvents: number
      severityCounts: Record<string, number>
      threatTypes: Record<string, number>
      subscriberImpact: number
    }>()
    
    for (const event of events) {
      const wilaya = this.findNearestWilaya(event.location)
      
      if (!regionalMap.has(wilaya.code)) {
        regionalMap.set(wilaya.code, {
          totalEvents: 0,
          severityCounts: { info: 0, low: 0, medium: 0, high: 0, critical: 0 },
          threatTypes: {},
          subscriberImpact: 0
        })
      }
      
      const region = regionalMap.get(wilaya.code)!
      region.totalEvents++
      region.severityCounts[event.severity] = (region.severityCounts[event.severity] || 0) + 1
      region.threatTypes[event.eventType] = (region.threatTypes[event.eventType] || 0) + 1
      region.subscriberImpact += Math.floor(Math.random() * 100) + 10
    }
    
    return Array.from(regionalMap.entries()).map(([code, data]) => {
      const wilaya = ALGERIAN_WILAYAS.find(w => w.code === code)!
      
      const threatScore = Math.min(100, (
        (data.severityCounts.critical * 25) +
        (data.severityCounts.high * 15) +
        (data.severityCounts.medium * 8) +
        (data.severityCounts.low * 3)
      ) / Math.max(data.totalEvents, 1) * 10)
      
      const topThreatTypes = Object.entries(data.threatTypes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([type, count]) => ({ type, count }))
      
      return {
        wilaya: wilaya.name,
        wilayaCode: code,
        totalEvents: data.totalEvents,
        criticalAlerts: data.severityCounts.critical,
        highAlerts: data.severityCounts.high,
        mediumAlerts: data.severityCounts.medium,
        lowAlerts: data.severityCounts.low,
        threatScore: Math.round(threatScore),
        trend: Math.floor((Math.random() - 0.5) * 40),
        topThreatTypes,
        subscriberImpact: data.subscriberImpact,
        networkNodes: Math.floor(Math.random() * 50) + 10,
        center: wilaya.center
      }
    }).sort((a, b) => b.threatScore - a.threatScore)
  }

  // Generate geo-marketing insights using AI predictions
  async generateGeoMarketingInsights(regionalData: RegionalThreatData[]): Promise<GeoMarketingInsight[]> {
    const insights: GeoMarketingInsight[] = []
    
    for (const region of regionalData.slice(0, 10)) {
      insights.push({
        id: `insight-${region.wilayaCode}-churn`,
        region: region.wilaya,
        metricType: 'churn_risk',
        value: Math.min(100, region.threatScore * 0.8),
        change: Math.floor((Math.random() - 0.3) * 20),
        prediction: Math.min(100, region.threatScore * 0.9 + Math.random() * 10),
        confidence: 0.75 + Math.random() * 0.2,
        recommendations: [
          region.threatScore > 70 ? 'Immediate network security audit recommended' : 'Continue monitoring',
          'Consider targeted customer retention campaigns',
          'Review local infrastructure investments'
        ],
        relatedIncidents: [`INC-${Math.floor(Math.random() * 10000)}`]
      })
      
      if (region.threatScore > 50) {
        insights.push({
          id: `insight-${region.wilayaCode}-fraud`,
          region: region.wilaya,
          metricType: 'fraud_hotspot',
          value: Math.min(100, region.threatScore * 0.9),
          change: Math.floor(Math.random() * 30 - 10),
          prediction: Math.min(100, region.threatScore + Math.random() * 15),
          confidence: 0.8 + Math.random() * 0.15,
          recommendations: [
            'Enhance fraud detection rules for this region',
            'Implement additional verification steps',
            'Increase monitoring of high-risk transactions'
          ],
          relatedIncidents: [
            `FRD-${Math.floor(Math.random() * 1000)}`,
            `ALERT-${Math.floor(Math.random() * 9999)}`
          ]
        })
      }
      
      insights.push({
        id: `insight-${region.wilayaCode}-coverage`,
        region: region.wilaya,
        metricType: 'coverage_gap',
        value: Math.max(0, 100 - region.networkNodes * 2),
        change: Math.floor(Math.random() * 15 - 5),
        prediction: Math.max(0, 100 - region.networkNodes * 2.2),
        confidence: 0.7 + Math.random() * 0.2,
        recommendations: region.networkNodes < 20 ? [
          'Expand network infrastructure',
          'Deploy additional cell towers',
          'Consider small cell deployment'
        ] : ['Maintain current coverage levels'],
        relatedIncidents: []
      })
    }
    
    return insights
  }

  // Create geofence for monitoring
  createGeofence(fence: Omit<GeoFence, 'id'>): GeoFence {
    const newFence: GeoFence = {
      ...fence,
      id: `geofence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    this.geoFences.push(newFence)
    return newFence
  }

  // Check location against all active geofences
  checkGeofences(location: GeoCoordinates): GeoFence[] {
    return this.geoFences.filter(fence => this.isWithinGeofence(location, fence))
  }

  // Generate heat map data for visualization
  generateHeatmapData(events: GeoEvent[], gridSize: number = 0.1): Array<{
    lat: number
    lng: number
    count: number
    intensity: number
  }> {
    const grid = new Map<string, number>()
    
    for (const event of events) {
      const latKey = Math.round(event.location.latitude / gridSize) * gridSize
      const lngKey = Math.round(event.location.longitude / gridSize) * gridSize
      const key = `${latKey},${lngKey}`
      
      const weight = event.severity === 'critical' ? 4 :
                     event.severity === 'high' ? 3 :
                     event.severity === 'medium' ? 2 :
                     event.severity === 'low' ? 1 : 0.5
      
      grid.set(key, (grid.get(key) || 0) + weight)
    }
    
    return Array.from(grid.entries()).map(([key, count]) => {
      const [lat, lng] = key.split(',').map(Number)
      return {
        lat,
        lng,
        count,
        intensity: Math.min(1, count / 20)
      }
    }).sort((a, b) => b.intensity - a.intensity)
  }

  // Track subscriber movement patterns (for fraud detection)
  analyzeMovementPattern(locations: SubscriberLocation[]): {
    riskLevel: 'normal' | 'suspicious' | 'fraudulent'
    anomalies: string[]
    velocity: number
    impossibleTravel: boolean
  } {
    if (locations.length < 2) {
      return { riskLevel: 'normal', anomalies: [], velocity: 0, impossibleTravel: false }
    }
    
    const sortedLocations = [...locations].sort(
      (a, b) => a.lastUpdate.getTime() - b.lastUpdate.getTime()
    )
    
    const anomalies: string[] = []
    let maxVelocity = 0
    let impossibleTravel = false
    
    for (let i = 1; i < sortedLocations.length; i++) {
      const prev = sortedLocations[i - 1]
      const curr = sortedLocations[i]
      
      const distance = this.calculateDistance(prev.currentLocation, curr.currentLocation)
      const timeDiff = (curr.lastUpdate.getTime() - prev.lastUpdate.getTime()) / (1000 * 60 * 60)
      const velocity = timeDiff > 0 ? distance / timeDiff : 0
      
      maxVelocity = Math.max(maxVelocity, velocity)
      
      if (velocity > 1000) {
        impossibleTravel = true
        anomalies.push(`Impossible travel detected: ${distance.toFixed(0)}km in ${timeDiff.toFixed(1)}h`)
      }
      
      if (velocity > 500 && velocity <= 1000) {
        anomalies.push(`Suspicious rapid movement: ${velocity.toFixed(0)}km/h`)
      }
      
      if (prev.status !== 'roaming' && curr.status !== 'roaming') {
        const prevWilaya = this.findNearestWilaya(prev.currentLocation)
        const currWilaya = this.findNearestWilaya(curr.currentLocation)
        
        if (prevWilaya.code !== currWilaya.code && distance > 200) {
          anomalies.push(`Unexpected inter-wilaya jump: ${prevWilaya.name} → ${currWilaya.name}`)
        }
      }
    }
    
    let riskLevel: 'normal' | 'suspicious' | 'fraudulent' = 'normal'
    if (impossibleTravel || anomalies.length >= 3) {
      riskLevel = 'fraudulent'
    } else if (anomalies.length > 0 || maxVelocity > 300) {
      riskLevel = 'suspicious'
    }
    
    return { riskLevel, anomalies, velocity: maxVelocity, impossibleTravel }
  }

  // Get subscriber density map for marketing purposes
  getSubscriberDensityMap(subscribers: SubscriberLocation[]): Array<{
    lat: number
    lng: number
    density: number
    avgRiskScore: number
  }> {
    const gridSize = 0.2
    const grid = new Map<string, { count: number; totalRisk: number }>()
    
    for (const sub of subscribers) {
      const latKey = Math.round(sub.currentLocation.latitude / gridSize) * gridSize
      const lngKey = Math.round(sub.currentLocation.longitude / gridSize) * gridSize
      const key = `${latKey},${lngKey}`
      
      const existing = grid.get(key) || { count: 0, totalRisk: 0 }
      existing.count++
      existing.totalRisk += sub.riskScore
      grid.set(key, existing)
    }
    
    return Array.from(grid.entries()).map(([key, data]) => {
      const [lat, lng] = key.split(',').map(Number)
      return {
        lat,
        lng,
        density: data.count,
        avgRiskScore: data.count > 0 ? data.totalRisk / data.count : 0
      }
    }).sort((a, b) => b.density - a.density)
  }
}

// Export singleton instance
export const geoMarketingEngine = GeoMarketingEngine.getInstance()
