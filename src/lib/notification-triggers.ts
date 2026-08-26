import { notify, notifyBroadcast } from './notify';
import { db } from './db';

// Alert-related triggers
export async function triggerAlertCreated(alertId: string, severity: string, siteName: string, metric: string) {
  await notify({
    title: `Alert: ${severity.toUpperCase()} — ${siteName}`,
    message: `${metric} threshold breached on ${siteName}. Severity: ${severity}`,
    type: 'alert',
    category: 'alert',
    severity,
    source: 'trigger',
    link: 'alerts',
    linkLabel: 'View Alerts',
    metadata: { alertId, severity, siteName, metric },
  });
}

export async function triggerAlertAcknowledged(alertId: string, siteName: string) {
  await notify({
    title: `Alert Acknowledged: ${siteName}`,
    message: `Alert on ${siteName} has been acknowledged by an operator.`,
    type: 'info',
    category: 'alert',
    source: 'trigger',
    link: 'alerts',
    metadata: { alertId },
  });
}

// Incident triggers
export async function triggerIncidentCreated(incidentId: string, title: string, severity: string) {
  await notify({
    title: `New Incident: ${title}`,
    message: `Incident ${severity} created: ${title}`,
    type: 'incident',
    category: 'incident',
    severity,
    source: 'trigger',
    link: 'incidents',
    linkLabel: 'View Incidents',
    metadata: { incidentId },
  });
}

export async function triggerIncidentResolved(incidentId: string, title: string) {
  await notify({
    title: `Incident Resolved: ${title}`,
    message: `Incident has been resolved and closed.`,
    type: 'success',
    category: 'incident',
    source: 'trigger',
    link: 'incidents',
    metadata: { incidentId },
  });
}

// Change request triggers
export async function triggerChangeRequestCreated(changeId: string, title: string, riskLevel: string) {
  await notify({
    title: `Change Request: ${title}`,
    message: `New change request created. Risk level: ${riskLevel}`,
    type: 'change',
    category: 'change',
    severity: riskLevel === 'high' ? 'high' : riskLevel === 'medium' ? 'medium' : 'low',
    source: 'trigger',
    link: 'changes',
    linkLabel: 'View Changes',
    metadata: { changeId, riskLevel },
  });
}

export async function triggerChangeRequestStatusChanged(changeId: string, title: string, newStatus: string) {
  await notify({
    title: `Change Updated: ${title}`,
    message: `Status changed to: ${newStatus}`,
    type: newStatus === 'approved' ? 'success' : newStatus === 'rejected' ? 'error' : 'info',
    category: 'change',
    source: 'trigger',
    link: 'changes',
    metadata: { changeId, newStatus },
  });
}

// Outage triggers
export async function triggerOutageStarted(outageId: string, siteName: string, technology: string) {
  await notifyBroadcast({
    title: `⚠️ Outage: ${siteName} (${technology})`,
    message: `Network outage detected on ${siteName}. Technology: ${technology}`,
    type: 'alert',
    category: 'incident',
    severity: 'critical',
    source: 'trigger',
    link: 'outages',
    linkLabel: 'View Outages',
    metadata: { outageId, siteName, technology },
  });
}

export async function triggerOutageResolved(outageId: string, siteName: string) {
  await notifyBroadcast({
    title: `✅ Outage Resolved: ${siteName}`,
    message: `The outage on ${siteName} has been resolved.`,
    type: 'success',
    category: 'incident',
    source: 'trigger',
    link: 'outages',
    metadata: { outageId },
  });
}

// User triggers
export async function triggerUserCreated(userName: string, roleName: string) {
  await notify({
    title: `New User: ${userName}`,
    message: `User ${userName} created with role: ${roleName}`,
    type: 'info',
    category: 'system',
    source: 'trigger',
    link: 'settings',
    metadata: { userName, roleName },
  });
}

export async function triggerUserStatusChanged(userName: string, newStatus: string) {
  await notify({
    title: `User Status Changed: ${userName}`,
    message: `User ${userName} status changed to: ${newStatus}`,
    type: 'info',
    category: 'system',
    source: 'trigger',
    link: 'settings',
    metadata: { userName, newStatus },
  });
}

// Role triggers
export async function triggerRoleCreated(roleName: string) {
  await notify({
    title: `New Role Created: ${roleName}`,
    message: `Role "${roleName}" has been created.`,
    type: 'info',
    category: 'system',
    source: 'trigger',
    link: 'settings',
    metadata: { roleName },
  });
}

// AI triggers
export async function triggerAiInsightGenerated(reportType: string, summary: string) {
  await notify({
    title: `AI Insight: ${reportType}`,
    message: summary.length > 120 ? summary.slice(0, 120) + '...' : summary,
    type: 'info',
    category: 'ai',
    source: 'ai',
    link: 'assistant',
    linkLabel: 'Open AI Assistant',
    metadata: { reportType },
  });
}

export async function triggerAiAutoRemediation(changeId: string, siteName: string, action: string) {
  await notify({
    title: `🤖 AI Auto-Remediation: ${siteName}`,
    message: `AI generated change request: ${action}`,
    type: 'info',
    category: 'ai',
    source: 'ai',
    link: 'changes',
    linkLabel: 'Review Change',
    metadata: { changeId, siteName, action },
  });
}

// Report triggers
export async function triggerReportGenerated(reportName: string, format: string) {
  await notify({
    title: `Report Generated: ${reportName}`,
    message: `Report is ready in ${format.toUpperCase()} format.`,
    type: 'success',
    category: 'report',
    source: 'system',
    link: 'reports',
    linkLabel: 'View Reports',
    metadata: { reportName, format },
  });
}

// Collaboration triggers
export async function triggerCommentAdded(entityType: string, entityId: string, authorName: string, preview: string) {
  await notify({
    title: `Comment by ${authorName}`,
    message: preview.length > 100 ? preview.slice(0, 100) + '...' : preview,
    type: 'info',
    category: 'collaboration',
    source: 'collaboration',
    link: entityType === 'alert' ? 'alerts' : entityType === 'incident' ? 'incidents' : entityType === 'change' ? 'changes' : 'dashboard',
    metadata: { entityType, entityId, authorName },
  });
}

// SLA triggers
export async function triggerSlaBreached(slaName: string, metric: string, actual: number, target: number) {
  await notify({
    title: `SLA Breach: ${slaName}`,
    message: `${metric}: ${actual} vs target ${target}`,
    type: 'warning',
    category: 'alert',
    severity: 'high',
    source: 'trigger',
    link: 'sla',
    linkLabel: 'View SLAs',
    metadata: { slaName, metric, actual, target },
  });
}

// Energy triggers
export async function triggerEnergyAnomaly(siteName: string, pue: number) {
  await notify({
    title: `Energy Anomaly: ${siteName}`,
    message: `PUE ${pue.toFixed(2)} is abnormally high. Investigation recommended.`,
    type: 'warning',
    category: 'alert',
    severity: 'medium',
    source: 'trigger',
    link: 'energy',
    linkLabel: 'View Energy',
    metadata: { siteName, pue },
  });
}

// Scanner functions that check for conditions and create notifications
export async function scanCriticalAlerts() {
  const count = await db.alert.count({
    where: { severity: 'critical', acknowledged: false, resolvedAt: null },
  });
  if (count > 0) {
    await notifyBroadcast({
      title: `${count} Unacknowledged Critical Alerts`,
      message: `There are ${count} critical alerts requiring immediate attention.`,
      type: 'alert',
      category: 'alert',
      severity: 'critical',
      source: 'trigger',
      link: 'alerts',
      linkLabel: 'View Critical Alerts',
      metadata: { count, scanType: 'critical_alerts' },
    });
  }
  return count;
}

export async function scanActiveOutages() {
  const outages = await db.outageEvent.findMany({
    where: { status: 'active' },
  });
  if (outages.length > 0) {
    await notifyBroadcast({
      title: `${outages.length} Active Outages`,
      message: `Currently ${outages.length} outages affecting the network.`,
      type: 'alert',
      category: 'incident',
      severity: 'high',
      source: 'trigger',
      link: 'outages',
      linkLabel: 'View Outages',
      metadata: { count: outages.length, scanType: 'active_outages' },
    });
  }
  return outages.length;
}

export async function scanPendingChanges() {
  const count = await db.changeRequest.count({
    where: { status: 'pending' },
  });
  if (count > 0) {
    await notify({
      title: `${count} Pending Change Requests`,
      message: `There are ${count} change requests awaiting approval.`,
      type: 'info',
      category: 'change',
      source: 'trigger',
      link: 'changes',
      linkLabel: 'Review Changes',
      metadata: { count, scanType: 'pending_changes' },
    });
  }
  return count;
}

export async function scanSlaCompliance() {
  // Check for health scores below 70
  const poorSites = await db.healthScore.count({
    where: { overallScore: { lt: 70 } },
  });
  if (poorSites > 0) {
    await notifyBroadcast({
      title: `SLA Risk: ${poorSites} Sites Below Threshold`,
      message: `${poorSites} sites have health scores below 70, risking SLA breach.`,
      type: 'warning',
      category: 'alert',
      severity: 'high',
      source: 'trigger',
      link: 'health',
      linkLabel: 'View Health Scores',
      metadata: { count: poorSites, scanType: 'sla_compliance' },
    });
  }
  return poorSites;
}
