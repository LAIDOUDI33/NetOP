/**
 * National SOC Platform - Real-time Dashboard Component
 * 
 * Example component demonstrating real-time data streaming with SSE.
 * This component can be used as a reference for implementing
 * live updates in dashboard widgets.
 */

'use client';

import React from 'react';
import { useSSE, useAlertStream, useHealthStream } from '@/hooks/useSSE';

interface RealTimeDashboardProps {
  /** Show debug information */
  showDebug?: boolean;
  /** Channels to subscribe to */
  channels?: string[];
}

export function RealTimeDashboard({ 
  showDebug = false, 
  channels = ['alerts', 'metrics', 'health'] 
}: RealTimeDashboardProps) {
  
  // Track real-time state
  const [recentAlerts, setRecentAlerts] = React.useState<any[]>([]);
  const [urgentAlerts, setUrgentAlerts] = React.useState<any[]>([]);
  const [currentMetrics, setCurrentMetrics] = React.useState<any>(null);
  const [healthStatus, setHealthStatus] = React.useState<any>(null);
  const [eventLog, setEventLog] = React.useState<string[]>([]);

  // Add event to log (for debugging)
  const addLog = (message: string) => {
    if (showDebug) {
      setEventLog(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 49)]);
    }
  };

  // Main SSE connection for dashboard updates
  const {
    connected,
    reconnecting,
    reconnectAttempts,
    lastEventTime,
    error
  } = useSSE({
    url: '/api/stream',
    channels,
    onAlertNew: (alert) => {
      setRecentAlerts(prev => [alert, ...prev.slice(0, 9)]);
      addLog(`🚨 New Alert: ${alert.title}`);
    },
    onAlertUrgent: (alert) => {
      setUrgentAlerts(prev => [alert, ...prev.slice(0, 4)]);
      addLog(`⚠️ URGENT: ${alert.title} (${alert.severity})`);
    },
    onMetricsUpdate: (metrics) => {
      setCurrentMetrics(metrics);
      addLog('📊 Metrics updated');
    },
    onHealthUpdate: (health) => {
      setHealthStatus(health);
      if (health.overall) {
        addLog(`❤️ Health: ${health.overall.status} (${health.overall.score})`);
      }
    },
    onConnect: () => {
      addLog('✅ Connected to stream');
    },
    onDisconnect: () => {
      addLog('❌ Disconnected');
    },
    onError: () => {
      addLog('⚠️ Connection error');
    },
    debug: showDebug,
    autoReconnect: true
  });

  return (
    <div className="realtime-dashboard">
      {/* Connection Status Indicator */}
      <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
        <span className="status-dot"></span>
        <span>
          {reconnecting 
            ? `Reconnecting... (${reconnectAttempts})` 
            : connected 
              ? 'Live' 
              : 'Offline'
          }
        </span>
        {lastEventTime && (
          <span className="last-update">
            Last: {new Date(lastEventTime).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="dashboard-grid">
        {/* Urgent Alerts Panel */}
        {urgentAlerts.length > 0 && (
          <div className="panel urgent-alerts">
            <h3>🔴 Urgent Alerts</h3>
            {urgentAlerts.map((alert, i) => (
              <div key={i} className={`alert-item ${alert.severity}`}>
                <strong>{alert.title}</strong>
                <span>{alert.source}</span>
                <small>{new Date(alert.firstSeen).toLocaleTimeString()}</small>
              </div>
            ))}
          </div>
        )}

        {/* Recent Alerts Feed */}
        <div className="panel recent-alerts">
          <h3>📋 Recent Alerts ({recentAlerts.length})</h3>
          {recentAlerts.length === 0 ? (
            <p className="empty-state">Waiting for alerts...</p>
          ) : (
            recentAlerts.map((alert, i) => (
              <div key={i || alert.id} className={`alert-item ${alert.severity}`}>
                <span className={`severity-badge ${alert.severity}`}>
                  {alert.severity}
                </span>
                <span className="alert-title">{alert.title}</span>
                <span className="alert-source">{alert.source}</span>
              </div>
            ))
          )}
        </div>

        {/* Live Metrics */}
        {currentMetrics && (
          <div className="panel metrics">
            <h3>📊 Live Metrics</h3>
            <div className="metric-grid">
              {currentMetrics.alerts && (
                <>
                  <div className="metric">
                    <span className="value">{currentMetrics.alerts.lastHour}</span>
                    <span className="label">Alerts/Hour</span>
                  </div>
                  <div className="metric">
                    <span className="value">{currentMetrics.alerts.bySeverity?.critical || 0}</span>
                    <span className="label">Critical</span>
                  </div>
                  <div className="metric">
                    <span className="value">{currentMetrics.alerts.bySeverity?.high || 0}</span>
                    <span className="label">High</span>
                  </div>
                </>
              )}
              {currentMetrics.incidents && (
                <div className="metric">
                  <span className="value">{currentMetrics.incidents.open}</span>
                  <span className="label">Open Incidents</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Health */}
        {healthStatus?.overall && (
          <div className="panel health">
            <h3>❤️ System Health</h3>
            <div className={`health-score ${healthStatus.overall.status}`}>
              <span className="score-value">{healthStatus.overall.score}%</span>
              <span className="score-label">{healthStatus.overall.status}</span>
            </div>
            {healthStatus.components && (
              <div className="components">
                {healthStatus.components.map((comp: any, i: number) => (
                  <div key={i} className={`component ${comp.status}`}>
                    <span className="name">{comp.name}</span>
                    <span className="latency">{comp.latency}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Debug Event Log */}
        {showDebug && (
          <div className="panel debug-log">
            <h3>🔍 Event Log</h3>
            <pre className="log-content">
              {eventLog.join('\n') || 'No events yet...'}
            </pre>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          ⚠️ Stream error: {error.message}
        </div>
      )}

      {/* Inline styles for standalone usage */}
      <style jsx>{`
        .realtime-dashboard {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 16px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 500;
        }

        .connection-status.connected {
          background: #10b98120;
          color: #059669;
        }

        .connection-status.disconnected {
          background: #ef444420;
          color: #dc2626;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .last-update {
          margin-left: auto;
          opacity: 0.7;
          font-weight: 400;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .panel {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .panel h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .alert-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 4px;
          background: #f9fafb;
        }

        .severity-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .severity-badge.critical { background: #fecaca; color: #991b1b; }
        .severity-badge.high { background: #fed7aa; color: #9a3412; }
        .severity-badge.medium { background: #fef3c7; color: #92400e; }
        .severity-badge.low { background: #d1fae5; color: #065f46; }

        .alert-title { flex: 1; font-size: 13px; }
        .alert-source { font-size: 11px; color: #6b7280; }

        .empty-state {
          text-align: center;
          color: #9ca3af;
          padding: 20px;
          font-size: 13px;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .metric {
          text-align: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .metric .value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }

        .metric .label {
          font-size: 12px;
          color: #6b7280;
        }

        .health-score {
          text-align: center;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .health-score.healthy { background: #d1fae5; }
        .health-score.degraded { background: #fef3c7; }

        .score-value {
          display: block;
          font-size: 36px;
          font-weight: 700;
        }

        .score-label {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .components {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .component {
          display: flex;
          justify-content: space-between;
          padding: 6px 8px;
          font-size: 12px;
          border-radius: 4px;
        }

        .component.operational { background: #f0fdf4; }
        .component.degraded { background: #fffbeb; }
        .component.down { background: #fef2f2; }

        .debug-log {
          max-height: 200px;
          overflow-y: auto;
        }

        .log-content {
          font-family: monospace;
          font-size: 11px;
          line-height: 1.4;
          margin: 0;
          color: #374151;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .error-banner {
          margin-top: 16px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #991b1b;
          font-size: 13px;
        }

        .urgent-alerts {
          border-color: #fecaca;
          background: #fffafa;
        }
      `}</style>
    </div>
  );
}

// Export individual hooks for granular usage
export { useSSE, useAlertStream, useHealthStream } from '@/hooks/useSSE';
export default RealTimeDashboard;
