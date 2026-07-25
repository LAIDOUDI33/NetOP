/**
 * National SOC Platform - Real-time Demo Page
 * 
 * Demonstrates SSE real-time streaming capabilities.
 * Access at: /demo/realtime
 */

'use client';

import React from 'react';
import { RealTimeDashboard } from '@/components/RealTimeDashboard';

export default function RealtimeDemoPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f3f4f6',
      padding: '20px'
    }}>
      <header style={{
        maxWidth: '1200px',
        margin: '0 auto 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            color: '#111827',
            margin: 0
          }}>
            🔴 National SOC Platform - Real-time Demo
          </h1>
          <p style={{ 
            color: '#6b7280', 
            margin: '4px 0 0 0',
            fontSize: '14px'
          }}>
            Server-Sent Events (SSE) Live Dashboard Streaming
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <a 
            href="/api/stream?channels=alerts,metrics,health"
            target="_blank"
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '13px'
            }}
          >
            View Raw Stream →
          </a>
          <a 
            href="/api/stream/alerts?severity=critical,high"
            target="_blank"
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '13px'
          }}
          >
            Alerts Stream →
          </a>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Info Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <InfoCard 
            title="📡 Main Stream" 
            endpoint="/api/stream"
            description="Aggregated stream for all dashboard data types"
            channels={['alerts', 'incidents', 'metrics', 'health', 'threats', 'telecom']}
          />
          <InfoCard 
            title="🚨 Alerts Stream" 
            endpoint="/api/stream/alerts"
            description="Dedicated alert streaming with filtering"
            channels={['severity', 'source', 'minSeverity']}
          />
          <InfoCard 
            title="❤️ Health Monitor" 
            endpoint="/api/stream?channels=health"
            description="System health and component status updates"
            channels={['health:pulse', 'health:component_change']}
          />
        </div>

        {/* Live Dashboard */}
        <RealTimeDashboard 
          showDebug={true}
          channels={['alerts', 'metrics', 'health']}
        />

        {/* Usage Examples */}
        <section style={{
          marginTop: '32px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '24px'
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600,
            marginBottom: '16px',
            color: '#111827'
          }}>
            📝 Integration Examples
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '20px'
          }}>
            <CodeExample 
              title="Basic Hook Usage"
              code={`import { useSSE } from '@/hooks/useSSE';

function MyComponent() {
  const { connected } = useSSE({
    url: '/api/stream',
    channels: ['alerts', 'metrics'],
    onAlertNew: (alert) => {
      console.log('New alert:', alert);
    },
    onMetricsUpdate: (metrics) => {
      setMetrics(metrics);
    }
  });

  return (
    <div className={connected ? 'live' : 'offline'}>
      Status: {connected ? '🟢 Connected' : '🔴 Offline'}
    </div>
  );
}`}
            />
            
            <CodeExample 
              title="Alert-Specific Stream"
              code={`import { useAlertStream } from '@/hooks/useSSE';

function AlertWidget() {
  const { connected } = useAlertStream({
    severity: ['critical', 'high'],
    sources: ['SIEM', 'EDR'],
    minSeverity: 'high',
    onNewAlert: (alert) => {
      showNotification(alert);
    },
    onUrgentAlert: (alert) => {
      playSound();
      highlightRed(alert);
    }
  });

  // Auto-filters and notifies
  return <AlertFeed />;
}`}
            />

<CodeExample 
              title="Health Monitoring"
              code={`import { useHealthStream } from '@/hooks/useSSE';

function StatusBar() {
  const { connected } = useHealthStream({
    onHealthPulse: (health) => {
      updateGauge(health.overall.score);
    },
    onComponentChange: (comp) => {
      if (comp.status === 'down') {
        triggerIncident(comp.name);
      }
    }
  });

  return <SystemStatus />;
}`}
            />
          </div>
        </section>

        {/* Event Reference */}
        <section style={{
          marginTop: '24px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '24px'
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600,
            marginBottom: '16px',
            color: '#111827'
          }}>
            📋 Event Reference
          </h2>
          
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '13px'
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Event</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Channel</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Data Shape</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['connected', '-', 'Initial connection established', '{ connectionId, channels }'],
                ['heartbeat', '-', 'Keep-alive ping (15s interval)', '{ timestamp, serverTime }'],
                ['alert:new', 'alerts', 'New security alert detected', '{ id, title, severity, source, ... }'],
                ['alert:urgent', 'alerts', 'Critical/high priority alert', '{ ...alert, urgency }'],
                ['incident:updated', 'incidents', 'Incident status/phase change', '{ id, status, phase, ... }'],
                ['metrics:update', 'metrics', 'KPI counts updated', '{ alerts, incidents, timestamp }'],
                ['health:pulse', 'health', 'System health snapshot', '{ overall, components[] }'],
                ['telecom:anomaly', 'telecom', 'SS7/GTP/SIP anomaly detected', '{ ss7, gtp, sip }']
              ].map(([event, channel, desc, data], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace', color: '#3b82f6' }}>{event}</td>
                  <td style={{ padding: '8px' }}><code>{channel}</code></td>
                  <td style={{ padding: '8px', color: '#4b5563' }}>{desc}</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '11px', color: '#6b7280' }}>{data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

// Sub-components
function InfoCard({ title, endpoint, description, channels }: { 
  title: string; 
  endpoint: string; 
  description: string;
  channels: string[];
}) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>{title}</h3>
      <code style={{ 
        display: 'block', 
        padding: '6px 10px', 
        background: '#f9fafb', 
        borderRadius: '4px',
        fontSize: '12px',
        color: '#3b82f6',
        marginBottom: '8px'
      }}>
        GET {endpoint}
      </code>
      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280' }}>{description}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {channels.map(ch => (
          <span key={ch} style={{
            padding: '2px 8px',
            background: '#dbeafe',
            color: '#1d4ed8',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 500
          }}>
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}

function CodeExample({ title, code }: { title: string; code: string }) {
  return (
    <div style={{
      background: '#1f2937',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '8px 12px',
        background: '#374151',
        fontSize: '12px',
        fontWeight: 500,
        color: '#9ca3af'
      }}>
        {title}
      </div>
      <pre style={{
        margin: 0,
        padding: '16px',
        overflow: 'auto',
        fontSize: '12px',
        lineHeight: 1.5,
        color: '#e5e7eb'
      }}>
        {code}
      </pre>
    </div>
  );
}
