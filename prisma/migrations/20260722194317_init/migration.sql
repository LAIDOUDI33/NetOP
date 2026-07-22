-- CreateTable
CREATE TABLE "NetworkSite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "altitude" REAL NOT NULL DEFAULT 0,
    "frequency" TEXT NOT NULL DEFAULT '',
    "bandwidth" REAL NOT NULL DEFAULT 0,
    "maxCapacity" INTEGER NOT NULL DEFAULT 0,
    "vendor" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KpiMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rssi" REAL,
    "rsrp" REAL,
    "rsrq" REAL,
    "sinr" REAL,
    "rscp" REAL,
    "ecno" REAL,
    "rxlev" REAL,
    "cqichannel" REAL,
    "downloadThroughput" REAL,
    "uploadThroughput" REAL,
    "latency" REAL,
    "jitter" REAL,
    "packetLoss" REAL,
    "availability" REAL,
    "activeUsers" INTEGER,
    "handoverSuccessRate" REAL,
    "dropRate" REAL,
    "blockedCallRate" REAL,
    "prbUtilization" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KpiMetric_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "threshold" REAL NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT,
    "siteId" TEXT,
    "technology" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "threshold" REAL NOT NULL,
    "condition" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "correlatedGroupId" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Alert_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptimizationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technology" TEXT NOT NULL,
    "siteId" TEXT,
    "siteName" TEXT,
    "category" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NetworkParameter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technology" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "currentValue" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "minRange" TEXT,
    "maxRange" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SLATarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technology" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "targetValue" REAL NOT NULL,
    "condition" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnomalyEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT,
    "technology" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "actualValue" REAL NOT NULL,
    "expectedValue" REAL NOT NULL,
    "zScore" REAL NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "description" TEXT NOT NULL,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnomalyEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT NOT NULL,
    "technology" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SonModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mode" TEXT NOT NULL DEFAULT 'semi-automated',
    "schedule" TEXT,
    "parameters" TEXT NOT NULL DEFAULT '{}',
    "stats" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SonAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "siteId" TEXT,
    "technology" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "kpiBefore" TEXT NOT NULL DEFAULT '{}',
    "kpiAfter" TEXT,
    "impactScore" REAL,
    "rollbackReason" TEXT,
    "appliedAt" DATETIME,
    "rolledBackAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SonAction_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SonModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SonAction_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NeighborRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servingCellId" TEXT NOT NULL,
    "neighborCellId" TEXT NOT NULL,
    "neighborCellName" TEXT NOT NULL,
    "neighborCellCode" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "hoType" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'active',
    "hoSuccessRate" REAL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NeighborRelation_servingCellId_fkey" FOREIGN KEY ("servingCellId") REFERENCES "NetworkSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" TEXT NOT NULL DEFAULT '{}',
    "actionModules" TEXT NOT NULL DEFAULT '[]',
    "scope" TEXT NOT NULL DEFAULT 'all',
    "scopeValue" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldownMins" INTEGER NOT NULL DEFAULT 30,
    "stats" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PolicyExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'triggered',
    "triggerReason" TEXT NOT NULL,
    "affectedSites" TEXT NOT NULL DEFAULT '[]',
    "actionsTaken" TEXT NOT NULL DEFAULT '[]',
    "kpiImpact" TEXT NOT NULL DEFAULT '{}',
    "rollbackReason" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "PolicyExecution_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QoEMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mosScore" REAL,
    "dataRateExperienced" REAL,
    "callSetupTime" REAL,
    "callDropRate" REAL,
    "webPageLoadTime" REAL,
    "videoStartTime" REAL,
    "pingLatency" REAL,
    "jitterExperience" REAL,
    "satisfactionIndex" REAL,
    "subscriberCount" INTEGER,
    "complaintCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QoEMetric_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendor" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "technologies" TEXT NOT NULL DEFAULT '[]',
    "apiType" TEXT NOT NULL DEFAULT 'rest',
    "apiEndpoint" TEXT,
    "credentials" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSync" DATETIME,
    "stats" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SiteOnboarding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteName" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "altitude" REAL NOT NULL DEFAULT 0,
    "frequency" TEXT NOT NULL DEFAULT '',
    "bandwidth" REAL NOT NULL DEFAULT 0,
    "maxCapacity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedPci" TEXT,
    "assignedFreq" TEXT,
    "initialNeighbors" TEXT NOT NULL DEFAULT '[]',
    "kpiBaseline" TEXT NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CapacityForecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "currentValue" REAL NOT NULL,
    "forecastValue" REAL NOT NULL,
    "forecastHorizon" TEXT NOT NULL DEFAULT '7d',
    "growthRate" REAL NOT NULL,
    "capacityLimit" REAL,
    "utilizationAtLimit" REAL,
    "confidence" REAL NOT NULL DEFAULT 0.85,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "recommendation" TEXT NOT NULL DEFAULT '',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CapacityForecast_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NetworkSlice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sliceType" TEXT NOT NULL,
    "technology" TEXT NOT NULL DEFAULT '5G',
    "status" TEXT NOT NULL DEFAULT 'active',
    "siteId" TEXT,
    "sst" TEXT,
    "sd" TEXT,
    "maxBandwidth" REAL NOT NULL DEFAULT 100,
    "guaranteedBw" REAL NOT NULL DEFAULT 30,
    "maxUsers" INTEGER NOT NULL DEFAULT 100,
    "priorityLevel" INTEGER NOT NULL DEFAULT 5,
    "latencyTarget" REAL,
    "reliabilityTarget" REAL,
    "currentLoad" REAL NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "avgThroughput" REAL,
    "avgLatency" REAL,
    "qci" INTEGER,
    "FiveQi" INTEGER,
    "parameters" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NetworkSlice_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnergyMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "powerConsumption" REAL NOT NULL,
    "energyConsumed" REAL NOT NULL,
    "activeUsers" INTEGER,
    "trafficLoad" REAL,
    "temperature" REAL,
    "sleepMode" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'normal',
    "co2Emission" REAL,
    "solarGeneration" REAL,
    "batteryLevel" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnergyMetric_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FaultPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT,
    "technology" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "faultType" TEXT NOT NULL,
    "probability" REAL NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'predicted',
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "indicators" TEXT NOT NULL DEFAULT '[]',
    "recommendedAction" TEXT NOT NULL DEFAULT '',
    "estimatedTimeToFail" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FaultPrediction_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubscriberSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "segmentName" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "criteria" TEXT NOT NULL DEFAULT '{}',
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "avgDataUsage" REAL NOT NULL DEFAULT 0,
    "avgVoiceMinutes" REAL NOT NULL DEFAULT 0,
    "arpu" REAL NOT NULL DEFAULT 0,
    "churnRisk" REAL NOT NULL DEFAULT 0,
    "satisfactionScore" REAL,
    "topServices" TEXT NOT NULL DEFAULT '[]',
    "peakHour" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "technology" TEXT NOT NULL,
    "siteId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "category" TEXT NOT NULL DEFAULT 'network',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "assignedTo" TEXT,
    "reportedBy" TEXT NOT NULL DEFAULT 'system',
    "mttrTarget" INTEGER,
    "mtbfValue" REAL,
    "rootCause" TEXT,
    "resolution" TEXT,
    "affectedSites" TEXT NOT NULL DEFAULT '[]',
    "relatedAlerts" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "slaBreach" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Incident_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfigTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT NOT NULL DEFAULT '',
    "vendor" TEXT NOT NULL DEFAULT '',
    "parameters" TEXT NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "applyCount" INTEGER NOT NULL DEFAULT 0,
    "lastApplied" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HealthScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "overallScore" REAL NOT NULL,
    "coverageScore" REAL NOT NULL,
    "capacityScore" REAL NOT NULL,
    "qualityScore" REAL NOT NULL,
    "reliabilityScore" REAL NOT NULL,
    "experienceScore" REAL NOT NULL,
    "grade" TEXT NOT NULL DEFAULT 'B',
    "trend" TEXT NOT NULL DEFAULT 'stable',
    "issues" TEXT NOT NULL DEFAULT '[]',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealthScore_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BenchmarkRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "actualValue" REAL NOT NULL,
    "benchmarkValue" REAL NOT NULL,
    "targetValue" REAL NOT NULL,
    "percentileRank" REAL NOT NULL,
    "gap" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'on_track',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BenchmarkRecord_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HandoverKpi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servingCellId" TEXT NOT NULL,
    "neighborCellName" TEXT NOT NULL,
    "neighborCellCode" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "hoAttempts" INTEGER NOT NULL DEFAULT 0,
    "hoSuccess" INTEGER NOT NULL DEFAULT 0,
    "hoFailures" INTEGER NOT NULL DEFAULT 0,
    "hoSuccessRate" REAL NOT NULL,
    "avgPrepTime" REAL,
    "avgExecTime" REAL,
    "pingPongCount" INTEGER NOT NULL DEFAULT 0,
    "tooEarlyCount" INTEGER NOT NULL DEFAULT 0,
    "tooLateCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'normal',
    "recommendation" TEXT NOT NULL DEFAULT '',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HandoverKpi_servingCellId_fkey" FOREIGN KEY ("servingCellId") REFERENCES "NetworkSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CellLoad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "prbUtilDownlink" REAL NOT NULL,
    "prbUtilUplink" REAL NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "userLoadPct" REAL NOT NULL,
    "throughputDown" REAL NOT NULL,
    "throughputUp" REAL NOT NULL,
    "balancedScore" REAL NOT NULL,
    "congestionLevel" TEXT NOT NULL DEFAULT 'low',
    "recommendation" TEXT NOT NULL DEFAULT '',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CellLoad_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterferenceEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT,
    "technology" TEXT NOT NULL,
    "interferenceType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'detected',
    "sourceCell" TEXT,
    "sourceCellName" TEXT,
    "conflictingCell" TEXT,
    "conflictingCellName" TEXT,
    "frequency" TEXT,
    "pci" TEXT,
    "affectedKpis" TEXT NOT NULL DEFAULT '[]',
    "impactScore" REAL NOT NULL DEFAULT 0,
    "recommendation" TEXT NOT NULL DEFAULT '',
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InterferenceEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoverageHole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "radiusMeters" REAL NOT NULL DEFAULT 500,
    "areaKm2" REAL NOT NULL,
    "signalStrength" REAL NOT NULL,
    "expectedSignal" REAL NOT NULL,
    "gapDb" REAL NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "nearestSite" TEXT,
    "nearestSiteName" TEXT,
    "nearestSiteDistKm" REAL,
    "affectedUsers" INTEGER NOT NULL DEFAULT 0,
    "recommendation" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "siteId" TEXT,
    "siteName" TEXT,
    "category" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL,
    "proposedValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "impact" TEXT NOT NULL DEFAULT '',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL DEFAULT 'system',
    "approvedBy" TEXT,
    "implementedAt" DATETIME,
    "rollbackReason" TEXT,
    "kpiImpact" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OutageEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "outageType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedDuration" TEXT,
    "actualDuration" INTEGER,
    "affectedUsers" INTEGER NOT NULL DEFAULT 0,
    "rootCause" TEXT,
    "compensationApplied" TEXT NOT NULL DEFAULT 'none',
    "compensationSites" TEXT NOT NULL DEFAULT '[]',
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OutageEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "technology" TEXT NOT NULL DEFAULT 'ALL',
    "description" TEXT NOT NULL DEFAULT '',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "estimatedTime" TEXT NOT NULL DEFAULT '30min',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" REAL NOT NULL DEFAULT 0.85,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlaybookStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playbookId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "expectedOutcome" TEXT,
    "isBlocking" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlaybookStep_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimulationScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'ALL',
    "siteId" TEXT,
    "category" TEXT NOT NULL,
    "parameters" TEXT NOT NULL DEFAULT '{}',
    "baselineKpis" TEXT NOT NULL DEFAULT '{}',
    "simulatedKpis" TEXT NOT NULL DEFAULT '{}',
    "impactScore" REAL NOT NULL DEFAULT 0,
    "recommendation" TEXT NOT NULL DEFAULT '',
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SimulationScenario_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrendForecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "forecastPoints" TEXT NOT NULL DEFAULT '[]',
    "horizon" TEXT NOT NULL DEFAULT '30d',
    "trendDirection" TEXT NOT NULL DEFAULT 'stable',
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "recommendation" TEXT NOT NULL DEFAULT '',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrendForecast_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoiRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "technology" TEXT NOT NULL DEFAULT 'ALL',
    "siteId" TEXT,
    "siteName" TEXT,
    "investmentCost" REAL NOT NULL,
    "annualSaving" REAL NOT NULL,
    "paybackMonths" INTEGER NOT NULL,
    "roiPercentage" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'projected',
    "kpiImpact" TEXT NOT NULL DEFAULT '{}',
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "periodValue" REAL NOT NULL DEFAULT 0,
    "cumulativeSaving" REAL NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SpectrumBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "band" TEXT NOT NULL,
    "bandwidth" REAL NOT NULL,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "channelCount" INTEGER NOT NULL,
    "utilizedChannels" INTEGER NOT NULL,
    "utilizationPct" REAL NOT NULL,
    "avgInterference" REAL NOT NULL,
    "avgRsrp" REAL NOT NULL,
    "refarmCandidate" BOOLEAN NOT NULL DEFAULT false,
    "refarmTargetTech" TEXT,
    "refarmPotentialSaving" REAL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EvolutionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sourceTech" TEXT NOT NULL,
    "targetTech" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "siteCount" INTEGER NOT NULL,
    "sitesCompleted" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" REAL NOT NULL,
    "spentBudget" REAL NOT NULL DEFAULT 0,
    "startDate" DATETIME,
    "targetDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "spectrumGain" TEXT NOT NULL DEFAULT '[]',
    "capacityGain" TEXT NOT NULL DEFAULT '{}',
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NpiRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "overallNpi" REAL NOT NULL,
    "coverageNpi" REAL NOT NULL,
    "capacityNpi" REAL NOT NULL,
    "qualityNpi" REAL NOT NULL,
    "reliabilityNpi" REAL NOT NULL,
    "costEfficiencyNpi" REAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "totalSites" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NpiRecord_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "NetworkSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceOrchestration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "mosScore" REAL NOT NULL,
    "latencyMs" REAL NOT NULL,
    "jitterMs" REAL NOT NULL,
    "packetLoss" REAL NOT NULL,
    "throughputMbps" REAL NOT NULL,
    "availabilityPct" REAL NOT NULL,
    "userSatisfaction" REAL NOT NULL,
    "activeSessions" INTEGER NOT NULL,
    "kpiViolations" INTEGER NOT NULL DEFAULT 0,
    "slaCompliant" BOOLEAN NOT NULL DEFAULT true,
    "issues" TEXT NOT NULL DEFAULT '[]',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditTrail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityName" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "technology" TEXT,
    "category" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL DEFAULT 'system',
    "approvedBy" TEXT,
    "impact" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatar" TEXT,
    "phone" TEXT,
    "department" TEXT NOT NULL DEFAULT 'NOC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NetworkSite_code_key" ON "NetworkSite"("code");

-- CreateIndex
CREATE INDEX "KpiMetric_siteId_idx" ON "KpiMetric"("siteId");

-- CreateIndex
CREATE INDEX "KpiMetric_technology_idx" ON "KpiMetric"("technology");

-- CreateIndex
CREATE INDEX "KpiMetric_timestamp_idx" ON "KpiMetric"("timestamp");

-- CreateIndex
CREATE INDEX "Alert_siteId_idx" ON "Alert"("siteId");

-- CreateIndex
CREATE INDEX "Alert_technology_idx" ON "Alert"("technology");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "Alert_correlatedGroupId_idx" ON "Alert"("correlatedGroupId");

-- CreateIndex
CREATE INDEX "OptimizationLog_technology_idx" ON "OptimizationLog"("technology");

-- CreateIndex
CREATE INDEX "OptimizationLog_category_idx" ON "OptimizationLog"("category");

-- CreateIndex
CREATE INDEX "OptimizationLog_status_idx" ON "OptimizationLog"("status");

-- CreateIndex
CREATE INDEX "NetworkParameter_technology_idx" ON "NetworkParameter"("technology");

-- CreateIndex
CREATE INDEX "NetworkParameter_category_idx" ON "NetworkParameter"("category");

-- CreateIndex
CREATE INDEX "AnomalyEvent_siteId_idx" ON "AnomalyEvent"("siteId");

-- CreateIndex
CREATE INDEX "AnomalyEvent_technology_idx" ON "AnomalyEvent"("technology");

-- CreateIndex
CREATE INDEX "AnomalyEvent_severity_idx" ON "AnomalyEvent"("severity");

-- CreateIndex
CREATE INDEX "AnomalyEvent_status_idx" ON "AnomalyEvent"("status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SonAction_moduleId_idx" ON "SonAction"("moduleId");

-- CreateIndex
CREATE INDEX "SonAction_siteId_idx" ON "SonAction"("siteId");

-- CreateIndex
CREATE INDEX "SonAction_technology_idx" ON "SonAction"("technology");

-- CreateIndex
CREATE INDEX "SonAction_status_idx" ON "SonAction"("status");

-- CreateIndex
CREATE INDEX "SonAction_createdAt_idx" ON "SonAction"("createdAt");

-- CreateIndex
CREATE INDEX "NeighborRelation_servingCellId_idx" ON "NeighborRelation"("servingCellId");

-- CreateIndex
CREATE INDEX "NeighborRelation_technology_idx" ON "NeighborRelation"("technology");

-- CreateIndex
CREATE INDEX "PolicyExecution_policyId_idx" ON "PolicyExecution"("policyId");

-- CreateIndex
CREATE INDEX "PolicyExecution_status_idx" ON "PolicyExecution"("status");

-- CreateIndex
CREATE INDEX "PolicyExecution_createdAt_idx" ON "PolicyExecution"("createdAt");

-- CreateIndex
CREATE INDEX "QoEMetric_siteId_idx" ON "QoEMetric"("siteId");

-- CreateIndex
CREATE INDEX "QoEMetric_technology_idx" ON "QoEMetric"("technology");

-- CreateIndex
CREATE INDEX "QoEMetric_timestamp_idx" ON "QoEMetric"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_vendor_key" ON "VendorProfile"("vendor");

-- CreateIndex
CREATE UNIQUE INDEX "SiteOnboarding_siteCode_key" ON "SiteOnboarding"("siteCode");

-- CreateIndex
CREATE INDEX "SiteOnboarding_status_idx" ON "SiteOnboarding"("status");

-- CreateIndex
CREATE INDEX "SiteOnboarding_technology_idx" ON "SiteOnboarding"("technology");

-- CreateIndex
CREATE INDEX "SiteOnboarding_createdAt_idx" ON "SiteOnboarding"("createdAt");

-- CreateIndex
CREATE INDEX "CapacityForecast_siteId_idx" ON "CapacityForecast"("siteId");

-- CreateIndex
CREATE INDEX "CapacityForecast_technology_idx" ON "CapacityForecast"("technology");

-- CreateIndex
CREATE INDEX "CapacityForecast_region_idx" ON "CapacityForecast"("region");

-- CreateIndex
CREATE INDEX "CapacityForecast_riskLevel_idx" ON "CapacityForecast"("riskLevel");

-- CreateIndex
CREATE INDEX "CapacityForecast_timestamp_idx" ON "CapacityForecast"("timestamp");

-- CreateIndex
CREATE INDEX "NetworkSlice_siteId_idx" ON "NetworkSlice"("siteId");

-- CreateIndex
CREATE INDEX "NetworkSlice_technology_idx" ON "NetworkSlice"("technology");

-- CreateIndex
CREATE INDEX "NetworkSlice_status_idx" ON "NetworkSlice"("status");

-- CreateIndex
CREATE INDEX "NetworkSlice_sliceType_idx" ON "NetworkSlice"("sliceType");

-- CreateIndex
CREATE INDEX "EnergyMetric_siteId_idx" ON "EnergyMetric"("siteId");

-- CreateIndex
CREATE INDEX "EnergyMetric_technology_idx" ON "EnergyMetric"("technology");

-- CreateIndex
CREATE INDEX "EnergyMetric_timestamp_idx" ON "EnergyMetric"("timestamp");

-- CreateIndex
CREATE INDEX "EnergyMetric_mode_idx" ON "EnergyMetric"("mode");

-- CreateIndex
CREATE INDEX "FaultPrediction_siteId_idx" ON "FaultPrediction"("siteId");

-- CreateIndex
CREATE INDEX "FaultPrediction_technology_idx" ON "FaultPrediction"("technology");

-- CreateIndex
CREATE INDEX "FaultPrediction_severity_idx" ON "FaultPrediction"("severity");

-- CreateIndex
CREATE INDEX "FaultPrediction_status_idx" ON "FaultPrediction"("status");

-- CreateIndex
CREATE INDEX "FaultPrediction_component_idx" ON "FaultPrediction"("component");

-- CreateIndex
CREATE INDEX "SubscriberSegment_technology_idx" ON "SubscriberSegment"("technology");

-- CreateIndex
CREATE INDEX "Incident_siteId_idx" ON "Incident"("siteId");

-- CreateIndex
CREATE INDEX "Incident_technology_idx" ON "Incident"("technology");

-- CreateIndex
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_category_idx" ON "Incident"("category");

-- CreateIndex
CREATE INDEX "Incident_priority_idx" ON "Incident"("priority");

-- CreateIndex
CREATE INDEX "Incident_createdAt_idx" ON "Incident"("createdAt");

-- CreateIndex
CREATE INDEX "HealthScore_siteId_idx" ON "HealthScore"("siteId");

-- CreateIndex
CREATE INDEX "HealthScore_technology_idx" ON "HealthScore"("technology");

-- CreateIndex
CREATE INDEX "HealthScore_region_idx" ON "HealthScore"("region");

-- CreateIndex
CREATE INDEX "HealthScore_grade_idx" ON "HealthScore"("grade");

-- CreateIndex
CREATE INDEX "BenchmarkRecord_siteId_idx" ON "BenchmarkRecord"("siteId");

-- CreateIndex
CREATE INDEX "BenchmarkRecord_technology_idx" ON "BenchmarkRecord"("technology");

-- CreateIndex
CREATE INDEX "BenchmarkRecord_metric_idx" ON "BenchmarkRecord"("metric");

-- CreateIndex
CREATE INDEX "BenchmarkRecord_status_idx" ON "BenchmarkRecord"("status");

-- CreateIndex
CREATE INDEX "HandoverKpi_servingCellId_idx" ON "HandoverKpi"("servingCellId");

-- CreateIndex
CREATE INDEX "HandoverKpi_technology_idx" ON "HandoverKpi"("technology");

-- CreateIndex
CREATE INDEX "HandoverKpi_status_idx" ON "HandoverKpi"("status");

-- CreateIndex
CREATE INDEX "CellLoad_siteId_idx" ON "CellLoad"("siteId");

-- CreateIndex
CREATE INDEX "CellLoad_technology_idx" ON "CellLoad"("technology");

-- CreateIndex
CREATE INDEX "CellLoad_region_idx" ON "CellLoad"("region");

-- CreateIndex
CREATE INDEX "CellLoad_congestionLevel_idx" ON "CellLoad"("congestionLevel");

-- CreateIndex
CREATE INDEX "InterferenceEvent_siteId_idx" ON "InterferenceEvent"("siteId");

-- CreateIndex
CREATE INDEX "InterferenceEvent_technology_idx" ON "InterferenceEvent"("technology");

-- CreateIndex
CREATE INDEX "InterferenceEvent_severity_idx" ON "InterferenceEvent"("severity");

-- CreateIndex
CREATE INDEX "InterferenceEvent_status_idx" ON "InterferenceEvent"("status");

-- CreateIndex
CREATE INDEX "InterferenceEvent_interferenceType_idx" ON "InterferenceEvent"("interferenceType");

-- CreateIndex
CREATE INDEX "CoverageHole_technology_idx" ON "CoverageHole"("technology");

-- CreateIndex
CREATE INDEX "CoverageHole_region_idx" ON "CoverageHole"("region");

-- CreateIndex
CREATE INDEX "CoverageHole_severity_idx" ON "CoverageHole"("severity");

-- CreateIndex
CREATE INDEX "CoverageHole_status_idx" ON "CoverageHole"("status");

-- CreateIndex
CREATE INDEX "ChangeRequest_technology_idx" ON "ChangeRequest"("technology");

-- CreateIndex
CREATE INDEX "ChangeRequest_category_idx" ON "ChangeRequest"("category");

-- CreateIndex
CREATE INDEX "ChangeRequest_status_idx" ON "ChangeRequest"("status");

-- CreateIndex
CREATE INDEX "ChangeRequest_riskLevel_idx" ON "ChangeRequest"("riskLevel");

-- CreateIndex
CREATE INDEX "ChangeRequest_createdAt_idx" ON "ChangeRequest"("createdAt");

-- CreateIndex
CREATE INDEX "OutageEvent_siteId_idx" ON "OutageEvent"("siteId");

-- CreateIndex
CREATE INDEX "OutageEvent_technology_idx" ON "OutageEvent"("technology");

-- CreateIndex
CREATE INDEX "OutageEvent_region_idx" ON "OutageEvent"("region");

-- CreateIndex
CREATE INDEX "OutageEvent_severity_idx" ON "OutageEvent"("severity");

-- CreateIndex
CREATE INDEX "OutageEvent_status_idx" ON "OutageEvent"("status");

-- CreateIndex
CREATE INDEX "SimulationScenario_technology_idx" ON "SimulationScenario"("technology");

-- CreateIndex
CREATE INDEX "SimulationScenario_category_idx" ON "SimulationScenario"("category");

-- CreateIndex
CREATE INDEX "SimulationScenario_status_idx" ON "SimulationScenario"("status");

-- CreateIndex
CREATE INDEX "TrendForecast_siteId_idx" ON "TrendForecast"("siteId");

-- CreateIndex
CREATE INDEX "TrendForecast_technology_idx" ON "TrendForecast"("technology");

-- CreateIndex
CREATE INDEX "TrendForecast_metric_idx" ON "TrendForecast"("metric");

-- CreateIndex
CREATE INDEX "TrendForecast_region_idx" ON "TrendForecast"("region");

-- CreateIndex
CREATE INDEX "RoiRecord_category_idx" ON "RoiRecord"("category");

-- CreateIndex
CREATE INDEX "RoiRecord_status_idx" ON "RoiRecord"("status");

-- CreateIndex
CREATE INDEX "RoiRecord_technology_idx" ON "RoiRecord"("technology");

-- CreateIndex
CREATE INDEX "SpectrumBlock_technology_idx" ON "SpectrumBlock"("technology");

-- CreateIndex
CREATE INDEX "SpectrumBlock_region_idx" ON "SpectrumBlock"("region");

-- CreateIndex
CREATE INDEX "SpectrumBlock_band_idx" ON "SpectrumBlock"("band");

-- CreateIndex
CREATE INDEX "EvolutionPlan_sourceTech_idx" ON "EvolutionPlan"("sourceTech");

-- CreateIndex
CREATE INDEX "EvolutionPlan_targetTech_idx" ON "EvolutionPlan"("targetTech");

-- CreateIndex
CREATE INDEX "EvolutionPlan_region_idx" ON "EvolutionPlan"("region");

-- CreateIndex
CREATE INDEX "EvolutionPlan_status_idx" ON "EvolutionPlan"("status");

-- CreateIndex
CREATE INDEX "NpiRecord_siteId_idx" ON "NpiRecord"("siteId");

-- CreateIndex
CREATE INDEX "NpiRecord_technology_idx" ON "NpiRecord"("technology");

-- CreateIndex
CREATE INDEX "NpiRecord_region_idx" ON "NpiRecord"("region");

-- CreateIndex
CREATE INDEX "NpiRecord_timestamp_idx" ON "NpiRecord"("timestamp");

-- CreateIndex
CREATE INDEX "ServiceOrchestration_serviceType_idx" ON "ServiceOrchestration"("serviceType");

-- CreateIndex
CREATE INDEX "ServiceOrchestration_technology_idx" ON "ServiceOrchestration"("technology");

-- CreateIndex
CREATE INDEX "ServiceOrchestration_region_idx" ON "ServiceOrchestration"("region");

-- CreateIndex
CREATE INDEX "ServiceOrchestration_timestamp_idx" ON "ServiceOrchestration"("timestamp");

-- CreateIndex
CREATE INDEX "AuditTrail_entityType_idx" ON "AuditTrail"("entityType");

-- CreateIndex
CREATE INDEX "AuditTrail_action_idx" ON "AuditTrail"("action");

-- CreateIndex
CREATE INDEX "AuditTrail_technology_idx" ON "AuditTrail"("technology");

-- CreateIndex
CREATE INDEX "AuditTrail_category_idx" ON "AuditTrail"("category");

-- CreateIndex
CREATE INDEX "AuditTrail_createdAt_idx" ON "AuditTrail"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_module_action_key" ON "Permission"("module", "action");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");
