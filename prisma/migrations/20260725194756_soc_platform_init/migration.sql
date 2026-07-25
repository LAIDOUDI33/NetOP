-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "lastLoginAt" DATETIME,
    "passwordChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "alertType" TEXT NOT NULL DEFAULT 'DETECTION',
    "source" TEXT NOT NULL,
    "rawEvent" TEXT,
    "sourceIp" TEXT,
    "destIp" TEXT,
    "sourcePort" INTEGER,
    "destPort" INTEGER,
    "protocol" TEXT,
    "mitreTactics" TEXT,
    "mitreTechniques" TEXT,
    "iocIds" TEXT,
    "incidentId" TEXT,
    "assignedToId" TEXT,
    "escalationCount" INTEGER NOT NULL DEFAULT 0,
    "suppressionRuleId" TEXT,
    "isSuppressed" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Alert_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "incidentType" TEXT NOT NULL DEFAULT 'SECURITY',
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "phase" TEXT NOT NULL DEFAULT 'DETECTION',
    "tatcCode" TEXT,
    "impactScore" REAL NOT NULL DEFAULT 0.0,
    "confidenceScore" REAL NOT NULL DEFAULT 0.0,
    "assignedToId" TEXT,
    "reportedBy" TEXT,
    "rootCauseAnalysis" TEXT,
    "lessonsLearned" TEXT,
    "communicationLog" TEXT,
    "affectedAssets" TEXT,
    "affectedServices" TEXT,
    "blastRadius" TEXT,
    "containmentStrategy" TEXT,
    "eradicationSteps" TEXT,
    "recoverySteps" TEXT,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "targetResolution" DATETIME,
    "slaBreach" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "incident_updates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT,
    "phase" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "incident_updates_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "incident_updates_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'FILE',
    "filePath" TEXT,
    "fileHash" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "collectedBy" TEXT,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "assigneeId" TEXT,
    "incidentId" TEXT,
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "threat_indicators" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 50.0,
    "source" TEXT,
    "threatActor" TEXT,
    "malwareFamily" TEXT,
    "campaignId" TEXT,
    "isFirstSeen" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ttl" DATETIME,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IOC" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iocId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "threatLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "createdBy" TEXT,
    "killChainPhases" TEXT,
    "labels" TEXT,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "falsePositiveRate" REAL NOT NULL DEFAULT 0.0,
    "lastObserved" DATETIME,
    "expiration" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tipl_v2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "confidence" REAL NOT NULL DEFAULT 50.0,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "sourceOrg" TEXT,
    "tlp" TEXT NOT NULL DEFAULT 'AMBER',
    "iocIds" TEXT,
    "indicatorIds" TEXT,
    "productIds" TEXT,
    "affectedCountries" TEXT,
    "affectedSectors" TEXT,
    "telecomSpecific" TEXT,
    "isActionable" BOOLEAN NOT NULL DEFAULT false,
    "actionTaken" TEXT,
    "distributionScope" TEXT NOT NULL DEFAULT 'NATIONAL_SOC',
    "publishedAt" DATETIME,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "description" TEXT,
    "threatActor" TEXT,
    "attributionConfidence" REAL NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "targetSector" TEXT,
    "targetRegion" TEXT,
    "objectives" TEXT,
    "techniques" TEXT,
    "milestones" TEXT,
    "financialImpact" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imsi" TEXT NOT NULL,
    "msisdn" TEXT NOT NULL,
    "imei" TEXT,
    "imsiType" TEXT NOT NULL DEFAULT 'POSTPAID',
    "subscriberStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "roamingStatus" TEXT NOT NULL DEFAULT 'HOME',
    "homeCountry" TEXT,
    "visitedCountry" TEXT,
    "visitedNetwork" TEXT,
    "profile" TEXT,
    "riskScore" REAL NOT NULL DEFAULT 0.0,
    "lastLocationUpdate" DATETIME,
    "lastActivityAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "network_elements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "elementType" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "vendor" TEXT,
    "softwareVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "capacity" REAL,
    "location" TEXT,
    "redundancyGroup" TEXT,
    "protocols" TEXT,
    "securityZone" TEXT,
    "configHash" TEXT,
    "metadata" TEXT,
    "lastHeartbeat" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ss7_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageType" TEXT NOT NULL,
    "opc" INTEGER NOT NULL,
    "dpc" INTEGER NOT NULL,
    "globalTitle" TEXT,
    "imsi" TEXT,
    "msisdn" TEXT,
    "sriResult" TEXT,
    "isRoaming" BOOLEAN NOT NULL DEFAULT false,
    "isInternational" BOOLEAN NOT NULL DEFAULT false,
    "anomalyScore" REAL NOT NULL DEFAULT 0.0,
    "anomalyReason" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "rawMessage" TEXT,
    "protocolDetails" TEXT,
    "sourceNeId" TEXT,
    "destNeId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME
);

-- CreateTable
CREATE TABLE "gtp_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionType" TEXT NOT NULL,
    "imsi" TEXT,
    "msisdn" TEXT,
    "imei" TEXT,
    "sourceIp" TEXT NOT NULL,
    "destIp" TEXT NOT NULL,
    "sourceTeid" BIGINT NOT NULL,
    "destTeid" BIGINT NOT NULL,
    "apn" TEXT,
    "rai" TEXT,
    "cellId" TEXT,
    "lac" INTEGER,
    "mcc" TEXT,
    "mnc" TEXT,
    "qosProfile" TEXT,
    "bytesUp" BIGINT NOT NULL DEFAULT 0,
    "bytesDown" BIGINT NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "chargingId" TEXT,
    "pdnType" TEXT NOT NULL DEFAULT 'IPV4',
    "sessionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ratType" TEXT,
    "anomalyScore" REAL NOT NULL DEFAULT 0.0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "diameter_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "commandCode" TEXT NOT NULL,
    "originHost" TEXT NOT NULL,
    "originRealm" TEXT NOT NULL,
    "destinationHost" TEXT,
    "destinationRealm" TEXT,
    "authApplicationId" INTEGER,
    "userName" TEXT,
    "imsi" TEXT,
    "resultCode" INTEGER,
    "isError" BOOLEAN NOT NULL DEFAULT false,
    "errorReason" TEXT,
    "ccRequestType" TEXT,
    "ccRequestNumber" INTEGER NOT NULL DEFAULT 0,
    "serviceInfo" TEXT,
    "subscriptionId" TEXT,
    "ratedUnits" BIGINT NOT NULL DEFAULT 0,
    "currencyCode" TEXT,
    "sessionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "anomalyScore" REAL NOT NULL DEFAULT 0.0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "radius_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userName" TEXT,
    "nasIpAddress" TEXT NOT NULL,
    "nasPort" INTEGER,
    "nasPortType" TEXT,
    "framedProtocol" TEXT,
    "serviceName" TEXT,
    "callingStationId" TEXT,
    "calledStationId" TEXT,
    "authProtocol" TEXT,
    "packetType" TEXT NOT NULL,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "sessionTimeout" INTEGER,
    "idleTimeout" INTEGER,
    "bytesIn" BIGINT NOT NULL DEFAULT 0,
    "bytesOut" BIGINT NOT NULL DEFAULT 0,
    "packetsIn" BIGINT NOT NULL DEFAULT 0,
    "packetsOut" BIGINT NOT NULL DEFAULT 0,
    "imsi" TEXT,
    "apn" TEXT,
    "sessionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "sip_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "fromUri" TEXT NOT NULL,
    "toUri" TEXT NOT NULL,
    "fromUser" TEXT,
    "toUser" TEXT,
    "fromDomain" TEXT,
    "toDomain" TEXT,
    "callType" TEXT NOT NULL DEFAULT 'VOICE',
    "callDirection" TEXT NOT NULL DEFAULT 'INCOMING',
    "inviteTimestamp" DATETIME,
    "tryTimestamp" DATETIME,
    "ringingTimestamp" DATETIME,
    "connectTimestamp" DATETIME,
    "disconnectTimestamp" DATETIME,
    "disconnectReason" TEXT,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "sourceIp" TEXT NOT NULL,
    "destIp" TEXT NOT NULL,
    "sourcePort" INTEGER,
    "destPort" INTEGER,
    "sipMethod" TEXT,
    "responseCode" INTEGER,
    "userAgent" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "srtpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isIntercepted" BOOLEAN NOT NULL DEFAULT false,
    "interceptionType" TEXT,
    "fraudIndicators" TEXT,
    "anomalyScore" REAL NOT NULL DEFAULT 0.0,
    "sourceNeId" TEXT,
    "destNeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reportType" TEXT NOT NULL DEFAULT 'INCIDENT_SUMMARY',
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "generatedBy" TEXT,
    "parameters" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "schedule" TEXT,
    "recipients" TEXT,
    "dateRangeStart" DATETIME,
    "dateRangeEnd" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "validationRule" TEXT,
    "lastModifiedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "data_retention_policies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "retentionPeriodDays" INTEGER NOT NULL DEFAULT 365,
    "actionAfterExpiry" TEXT NOT NULL DEFAULT 'ARCHIVE',
    "storageTier" TEXT NOT NULL DEFAULT 'HOT',
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "complianceRequirements" TEXT,
    "customRules" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" DATETIME,
    "nextRun" DATETIME,
    "recordsAffected" BIGINT NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "Alert_alertType_idx" ON "Alert"("alertType");

-- CreateIndex
CREATE INDEX "Alert_incidentId_idx" ON "Alert"("incidentId");

-- CreateIndex
CREATE INDEX "Alert_assignedToId_idx" ON "Alert"("assignedToId");

-- CreateIndex
CREATE INDEX "Alert_firstSeen_idx" ON "Alert"("firstSeen");

-- CreateIndex
CREATE INDEX "Alert_isSuppressed_idx" ON "Alert"("isSuppressed");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity");

-- CreateIndex
CREATE INDEX "Incident_incidentType_idx" ON "Incident"("incidentType");

-- CreateIndex
CREATE INDEX "Incident_assignedToId_idx" ON "Incident"("assignedToId");

-- CreateIndex
CREATE INDEX "Incident_detectedAt_idx" ON "Incident"("detectedAt");

-- CreateIndex
CREATE INDEX "Incident_slaBreach_idx" ON "Incident"("slaBreach");

-- CreateIndex
CREATE INDEX "incident_updates_incidentId_idx" ON "incident_updates"("incidentId");

-- CreateIndex
CREATE INDEX "incident_updates_authorId_idx" ON "incident_updates"("authorId");

-- CreateIndex
CREATE INDEX "evidence_incidentId_idx" ON "evidence"("incidentId");

-- CreateIndex
CREATE INDEX "evidence_type_idx" ON "evidence"("type");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "Task_incidentId_idx" ON "Task"("incidentId");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "threat_indicators_type_idx" ON "threat_indicators"("type");

-- CreateIndex
CREATE INDEX "threat_indicators_isActive_idx" ON "threat_indicators"("isActive");

-- CreateIndex
CREATE INDEX "threat_indicators_threatActor_idx" ON "threat_indicators"("threatActor");

-- CreateIndex
CREATE UNIQUE INDEX "threat_indicators_type_value_key" ON "threat_indicators"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "IOC_iocId_key" ON "IOC"("iocId");

-- CreateIndex
CREATE INDEX "IOC_type_idx" ON "IOC"("type");

-- CreateIndex
CREATE INDEX "IOC_threatLevel_idx" ON "IOC"("threatLevel");

-- CreateIndex
CREATE INDEX "IOC_isValidated_idx" ON "IOC"("isValidated");

-- CreateIndex
CREATE UNIQUE INDEX "tipl_v2_tipId_key" ON "tipl_v2"("tipId");

-- CreateIndex
CREATE INDEX "tipl_v2_type_idx" ON "tipl_v2"("type");

-- CreateIndex
CREATE INDEX "tipl_v2_severity_idx" ON "tipl_v2"("severity");

-- CreateIndex
CREATE INDEX "tipl_v2_tlp_idx" ON "tipl_v2"("tlp");

-- CreateIndex
CREATE INDEX "tipl_v2_isActionable_idx" ON "tipl_v2"("isActionable");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_name_key" ON "Campaign"("name");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_threatActor_idx" ON "Campaign"("threatActor");

-- CreateIndex
CREATE INDEX "Campaign_isActive_idx" ON "Campaign"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_imsi_key" ON "Subscriber"("imsi");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_msisdn_key" ON "Subscriber"("msisdn");

-- CreateIndex
CREATE INDEX "Subscriber_imsi_idx" ON "Subscriber"("imsi");

-- CreateIndex
CREATE INDEX "Subscriber_msisdn_idx" ON "Subscriber"("msisdn");

-- CreateIndex
CREATE INDEX "Subscriber_subscriberStatus_idx" ON "Subscriber"("subscriberStatus");

-- CreateIndex
CREATE INDEX "Subscriber_riskScore_idx" ON "Subscriber"("riskScore");

-- CreateIndex
CREATE UNIQUE INDEX "network_elements_ipAddress_key" ON "network_elements"("ipAddress");

-- CreateIndex
CREATE INDEX "network_elements_elementType_idx" ON "network_elements"("elementType");

-- CreateIndex
CREATE INDEX "network_elements_status_idx" ON "network_elements"("status");

-- CreateIndex
CREATE INDEX "network_elements_ipAddress_idx" ON "network_elements"("ipAddress");

-- CreateIndex
CREATE INDEX "ss7_messages_messageType_idx" ON "ss7_messages"("messageType");

-- CreateIndex
CREATE INDEX "ss7_messages_opc_dpc_idx" ON "ss7_messages"("opc", "dpc");

-- CreateIndex
CREATE INDEX "ss7_messages_timestamp_idx" ON "ss7_messages"("timestamp");

-- CreateIndex
CREATE INDEX "ss7_messages_anomalyScore_idx" ON "ss7_messages"("anomalyScore");

-- CreateIndex
CREATE INDEX "ss7_messages_isBlocked_idx" ON "ss7_messages"("isBlocked");

-- CreateIndex
CREATE INDEX "gtp_sessions_imsi_idx" ON "gtp_sessions"("imsi");

-- CreateIndex
CREATE INDEX "gtp_sessions_sessionType_idx" ON "gtp_sessions"("sessionType");

-- CreateIndex
CREATE INDEX "gtp_sessions_sessionStatus_idx" ON "gtp_sessions"("sessionStatus");

-- CreateIndex
CREATE INDEX "gtp_sessions_startedAt_idx" ON "gtp_sessions"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "diameter_sessions_sessionId_key" ON "diameter_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "diameter_sessions_sessionId_idx" ON "diameter_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "diameter_sessions_commandCode_idx" ON "diameter_sessions"("commandCode");

-- CreateIndex
CREATE INDEX "diameter_sessions_userName_idx" ON "diameter_sessions"("userName");

-- CreateIndex
CREATE INDEX "diameter_sessions_sessionStatus_idx" ON "diameter_sessions"("sessionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "radius_sessions_sessionId_key" ON "radius_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "radius_sessions_sessionId_idx" ON "radius_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "radius_sessions_userName_idx" ON "radius_sessions"("userName");

-- CreateIndex
CREATE INDEX "radius_sessions_nasIpAddress_idx" ON "radius_sessions"("nasIpAddress");

-- CreateIndex
CREATE INDEX "radius_sessions_sessionStatus_idx" ON "radius_sessions"("sessionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "sip_sessions_callId_key" ON "sip_sessions"("callId");

-- CreateIndex
CREATE INDEX "sip_sessions_callId_idx" ON "sip_sessions"("callId");

-- CreateIndex
CREATE INDEX "sip_sessions_fromUser_idx" ON "sip_sessions"("fromUser");

-- CreateIndex
CREATE INDEX "sip_sessions_toUser_idx" ON "sip_sessions"("toUser");

-- CreateIndex
CREATE INDEX "sip_sessions_callType_idx" ON "sip_sessions"("callType");

-- CreateIndex
CREATE INDEX "sip_sessions_connectTimestamp_idx" ON "sip_sessions"("connectTimestamp");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_category_idx" ON "audit_logs"("category");

-- CreateIndex
CREATE INDEX "Report_reportType_idx" ON "Report"("reportType");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_generatedBy_idx" ON "Report"("generatedBy");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "system_config_category_idx" ON "system_config"("category");

-- CreateIndex
CREATE INDEX "data_retention_policies_entityType_idx" ON "data_retention_policies"("entityType");

-- CreateIndex
CREATE INDEX "data_retention_policies_isEnabled_idx" ON "data_retention_policies"("isEnabled");
