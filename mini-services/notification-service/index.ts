// ══════════════════════════════════════════════════════════════════════════════
// NetOptima Algérie — Notification Service (Port 3004)
// ════════════════════════════════════════════════════════════════════════════════════════════
//
// Multi-channel notification dispatch for Djezzy NOC (20M+ users)
// Channels: Email (SMTP), SMS (HTTP API), Push (WebSocket), In-App
// Features: Priority queue, template engine, rate limiting, escalation, i18n (EN/FR/AR)
//

import type {
  NotifyRequest,
  BulkNotifyRequest,
  CreateTemplateRequest,
  NotificationChannel,
  NotificationPriority,
  Locale,
} from './types';

import { createNotification, getNotificationStatus, acknowledgeNotification, getQueueStats } from './queue';
import { checkRateLimit, getRateLimitInfo, getRateLimitStats } from './rate-limiter';
import { listTemplates, createTemplate } from './templates';
import { listEscalationRules } from './escalation';
import { getInAppNotifications, getInAppStoreStats } from './channels';
import { isValidLocale } from './i18n';

// ─── Configuration ──────────────────────────────────────────────────────────

const PORT = 3004;
const STARTED_AT = Date.now();

const VALID_CHANNELS: NotificationChannel[] = ['email', 'sms', 'push', 'in_app'];
const VALID_PRIORITIES: NotificationPriority[] = ['critical', 'high', 'medium', 'low'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonRes(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function parseBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  return req.json() as Promise<T>;
}

function validateNotifyRequest(body: Record<string, unknown>): string | null {
  if (!body.channel || !VALID_CHANNELS.includes(body.channel as NotificationChannel)) {
    return `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}`;
  }
  if (!body.recipient || typeof body.recipient !== 'string') {
    return 'recipient is required and must be a string';
  }
  if (!body.body || typeof body.body !== 'string') {
    return 'body is required and must be a string';
  }
  if (!body.priority || !VALID_PRIORITIES.includes(body.priority as NotificationPriority)) {
    return `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.locale && !isValidLocale(body.locale as string)) {
    return 'Invalid locale. Must be one of: en, fr, ar';
  }
  return null;
}

function toNotifyRequest(body: Record<string, unknown>): NotifyRequest {
  return {
    channel: body.channel as NotificationChannel,
    recipient: body.recipient as string,
    subject: (body.subject as string) || undefined,
    body: body.body as string,
    priority: body.priority as NotificationPriority,
    templateId: (body.templateId as string) || undefined,
    locale: (body.locale as Locale) || 'en',
    variables: body.variables as Record<string, string | number> | undefined,
    alertId: (body.alertId as string) || undefined,
    siteId: (body.siteId as string) || undefined,
  };
}

// ─── HTTP Server ────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // ── CORS Preflight ────────────────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // ══════════════════════════════════════════════════════════════════
    // HEALTH CHECK
    // ══════════════════════════════════════════════════════════════════

    if (method === 'GET' && path === '/health') {
      const stats = getQueueStats();
      const rateStats = getRateLimitStats();
      const inAppStats = getInAppStoreStats();

      return jsonRes(200, {
        status: 'ok',
        service: 'netoptima-notification',
        version: '1.0.0',
        uptime: Math.round((Date.now() - STARTED_AT) / 1000),
        timestamp: new Date().toISOString(),
        channels: {
          email: { enabled: true, smtp: process.env.SMTP_HOST || 'default' },
          sms: { enabled: true, gateway: process.env.SMS_API_URL || 'default' },
          push: { enabled: true },
          in_app: { enabled: true },
        },
        queue: {
          pending: stats.queueSize,
          totalProcessed: stats.storeSize,
          byStatus: stats.byStatus,
          byPriority: stats.byPriority,
        },
        rateLimiter: rateStats,
        inApp: inAppStats,
        escalationRules: listEscalationRules().filter(r => r.enabled).length,
        templates: listTemplates().length,
      });
    }

    // ══════════════════════════════════════════════════════════════════
    // SEND NOTIFICATION (single)
    // ══════════════════════════════════════════════════════════════════

    if (method === 'POST' && path === '/notify') {
      try {
        const body = await parseBody(req);

        // Validate
        const validationError = validateNotifyRequest(body);
        if (validationError) {
          return jsonRes(400, { error: validationError });
        }

        const notifyReq = toNotifyRequest(body);

        // Rate limit check
        const rateCheck = checkRateLimit(notifyReq.recipient);
        if (!rateCheck.allowed) {
          return jsonRes(429, {
            error: 'Rate limit exceeded',
            retryAfterMs: rateCheck.retryAfterMs,
            limit: rateCheck.limit,
            remaining: rateCheck.remaining,
          });
        }

        // Create and enqueue
        const record = createNotification(notifyReq);

        return jsonRes(202, {
          id: record.id,
          status: record.status,
          channel: record.channel,
          recipient: record.recipient,
          priority: record.priority,
          locale: record.locale,
          message: 'Notification queued for delivery',
          rateLimit: {
            remaining: rateCheck.remaining,
            limit: rateCheck.limit,
          },
          createdAt: record.createdAt,
        });
      } catch (err) {
        return jsonRes(500, {
          error: 'Failed to process notification',
          details: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // BULK SEND
    // ══════════════════════════════════════════════════════════════════

    if (method === 'POST' && path === '/notify/bulk') {
      try {
        const body = await parseBody<BulkNotifyRequest>(req);

        if (!body.notifications || !Array.isArray(body.notifications) || body.notifications.length === 0) {
          return jsonRes(400, { error: 'notifications array is required and must not be empty' });
        }

        if (body.notifications.length > 500) {
          return jsonRes(400, { error: 'Maximum 500 notifications per bulk request' });
        }

        const results: Array<{
          index: number;
          id?: string;
          status: 'queued' | 'rejected';
          error?: string;
        }> = [];

        let queued = 0;
        let rejected = 0;

        for (let i = 0; i < body.notifications.length; i++) {
          const notif = body.notifications[i];
          const validationError = validateNotifyRequest(notif as Record<string, unknown>);

          if (validationError) {
            results.push({ index: i, status: 'rejected', error: validationError });
            rejected++;
            continue;
          }

          const notifyReq = toNotifyRequest(notif as Record<string, unknown>);

          // Rate limit check
          const rateCheck = checkRateLimit(notifyReq.recipient);
          if (!rateCheck.allowed) {
            results.push({
              index: i,
              status: 'rejected',
              error: `Rate limited for ${notifyReq.recipient}. Retry after ${rateCheck.retryAfterMs}ms`,
            });
            rejected++;
            continue;
          }

          const record = createNotification(notifyReq);
          results.push({ index: i, id: record.id, status: 'queued' });
          queued++;
        }

        return jsonRes(202, {
          processed: body.notifications.length,
          queued,
          rejected,
          results,
        });
      } catch (err) {
        return jsonRes(500, {
          error: 'Failed to process bulk notification',
          details: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // NOTIFICATION STATUS
    // ══════════════════════════════════════════════════════════════════

    // GET /notify/status/:id
    const statusMatch = path.match(/^\/notify\/status\/([a-f0-9\-]+)$/);
    if (method === 'GET' && statusMatch) {
      const id = statusMatch[1];
      const record = getNotificationStatus(id);

      if (!record) {
        return jsonRes(404, { error: 'Notification not found', id });
      }

      // Include rate limit info for the recipient
      const rateInfo = getRateLimitInfo(record.recipient);

      return jsonRes(200, {
        ...record,
        rateLimit: rateInfo,
      });
    }

    // POST /notify/acknowledge/:id
    const ackMatch = path.match(/^\/notify\/acknowledge\/([a-f0-9\-]+)$/);
    if (method === 'POST' && ackMatch) {
      const id = ackMatch[1];
      const success = acknowledgeNotification(id);

      if (!success) {
        return jsonRes(404, { error: 'Notification not found or already acknowledged', id });
      }

      return jsonRes(200, {
        id,
        acknowledged: true,
        message: 'Notification acknowledged successfully',
      });
    }

    // ══════════════════════════════════════════════════════════════════
    // TEMPLATES
    // ══════════════════════════════════════════════════════════════════

    // GET /notify/templates
    if (method === 'GET' && path === '/notify/templates') {
      const templates = listTemplates();
      return jsonRes(200, {
        count: templates.length,
        templates,
      });
    }

    // POST /notify/templates
    if (method === 'POST' && path === '/notify/templates') {
      try {
        const body = await parseBody<CreateTemplateRequest>(req);

        if (!body.name || typeof body.name !== 'string') {
          return jsonRes(400, { error: 'name is required' });
        }
        if (!body.channel || !VALID_CHANNELS.includes(body.channel)) {
          return jsonRes(400, { error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` });
        }
        if (!body.bodyTemplate || typeof body.bodyTemplate !== 'string') {
          return jsonRes(400, { error: 'bodyTemplate is required' });
        }

        const template = createTemplate({
          name: body.name,
          description: body.description,
          channel: body.channel,
          subjectTemplate: body.subjectTemplate,
          bodyTemplate: body.bodyTemplate,
          variables: body.variables,
          localeOverrides: body.localeOverrides,
        });

        return jsonRes(201, {
          id: template.id,
          message: 'Template created successfully',
          template,
        });
      } catch (err) {
        return jsonRes(500, {
          error: 'Failed to create template',
          details: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // IN-APP NOTIFICATIONS (query endpoint)
    // ══════════════════════════════════════════════════════════════════

    // GET /notify/in-app/:recipient
    const inAppMatch = path.match(/^\/notify\/in-app\/([^\/]+)$/);
    if (method === 'GET' && inAppMatch) {
      const recipient = decodeURIComponent(inAppMatch[1]);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      const result = getInAppNotifications(recipient, limit, offset);
      return jsonRes(200, result);
    }

    // ══════════════════════════════════════════════════════════════════
    // QUEUE / ADMIN STATS
    // ══════════════════════════════════════════════════════════════════

    // GET /notify/stats
    if (method === 'GET' && path === '/notify/stats') {
      const stats = getQueueStats();
      return jsonRes(200, stats);
    }

    // GET /notify/escalation-rules
    if (method === 'GET' && path === '/notify/escalation-rules') {
      return jsonRes(200, {
        count: listEscalationRules().length,
        rules: listEscalationRules(),
      });
    }

    // GET /notify/rate-limit/:recipient
    const rateLimitMatch = path.match(/^\/notify\/rate-limit\/([^\/]+)$/);
    if (method === 'GET' && rateLimitMatch) {
      const recipient = decodeURIComponent(rateLimitMatch[1]);
      const info = getRateLimitInfo(recipient);
      return jsonRes(200, info);
    }

    // ══════════════════════════════════════════════════════════════════
    // 404 — Route Not Found
    // ══════════════════════════════════════════════════════════════════

    return jsonRes(404, {
      error: 'Not found',
      availableEndpoints: [
        'GET  /health',
        'POST /notify',
        'POST /notify/bulk',
        'GET  /notify/status/:id',
        'POST /notify/acknowledge/:id',
        'GET  /notify/templates',
        'POST /notify/templates',
        'GET  /notify/in-app/:recipient',
        'GET  /notify/stats',
        'GET  /notify/escalation-rules',
        'GET  /notify/rate-limit/:recipient',
      ],
    });
  },
});

console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  NetOptima DZ — Notification Service                                  ║
║  Port: ${PORT}                                                          ║
║  Channels: Email (SMTP) | SMS (HTTP) | Push (WS) | In-App           ║
║  Features: Priority Queue | Templates | Rate Limit | Escalation      ║
║  i18n: English | Français | العربية                                  ║
║                                                                     ║
║  Endpoints:                                                          ║
║    GET  /health                       → Health & stats               ║
║    POST /notify                       → Send notification            ║
║    POST /notify/bulk                  → Bulk send (max 500)         ║
║    GET  /notify/status/:id            → Delivery status              ║
║    POST /notify/acknowledge/:id       → Acknowledge notification     ║
║    GET  /notify/templates             → List templates               ║
║    POST /notify/templates             → Create template              ║
║    GET  /notify/in-app/:recipient     → In-app notifications         ║
║    GET  /notify/stats                 → Queue statistics             ║
║    GET  /notify/escalation-rules      → Escalation rules             ║
║    GET  /notify/rate-limit/:recipient → Rate limit info              ║
╚══════════════════════════════════════════════════════════════════════╝
`);

// ══════════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ══════════════════════════════════════════════════════════════════════════════

const shutdown = async (signal: string) => {
  console.log(`\n[Notification] ${signal} — Shutting down...`);
  server.stop();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
