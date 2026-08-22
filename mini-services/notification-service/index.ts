'use strict';

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'major' | 'minor' | 'warning' | 'info';
type Channel = 'email' | 'sms' | 'webhook' | 'in-app';

type NotificationRequest = {
  type: Channel;
  recipient: string;
  subject?: string;
  message: string;
  severity?: Severity;
  alertId?: string;
  channels?: Channel[];
};

type BulkNotifyRequest = {
  notifications: NotificationRequest[];
};

type NotificationRule = {
  id: string;
  name: string;
  severityFilter: Severity[];
  technologyFilter: string[]; // e.g. ['2G','3G','4G','Core','Transmission']
  channel: Channel;
  recipients: string[];
  enabled: boolean;
  createdAt: string;
};

type NotificationHistoryEntry = {
  id: string;
  alertId: string | null;
  channel: Channel;
  recipient: string;
  subject: string;
  message: string;
  severity: Severity | null;
  status: 'sent' | 'failed' | 'rate-limited';
  errorMessage?: string;
  createdAt: string;
};

type AlertEvent = {
  alertId: string;
  severity: Severity;
  technology: string;
  title: string;
  message: string;
  site?: string;
  region?: string;
};

// ─── Structured Logger ───────────────────────────────────────────────────────

function log(level: string, message: string, meta?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'notification-service',
    ...meta,
    message,
  };
  console.log(JSON.stringify(entry));
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 100; // per recipient per window

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(recipient: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(recipient);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(recipient, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

// ─── In-Memory Stores ────────────────────────────────────────────────────────

let rules: NotificationRule[] = [];
const history: NotificationHistoryEntry[] = [];

// Webhook endpoints registry
const webhookEndpoints: string[] = [];

// ─── Nodemailer Transport ────────────────────────────────────────────────────

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpPort) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });
    log('info', 'SMTP transport configured', { host: smtpHost, port: smtpPort });
  } else {
    log('warn', 'No SMTP configuration found — emails will be logged only');
    // Create a test account / dummy transport for dev
    transporter = nodemailer.createTransport({
      jsonTransport: true, // outputs JSON instead of sending
    });
  }

  return transporter;
}

// ─── Channel Implementations ─────────────────────────────────────────────────

async function sendEmail(recipient: string, subject: string, message: string, alertId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = getTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || 'netop-noc@djezzy.dz',
      to: recipient,
      subject: `[NetOP NOC] ${subject}`,
      text: message,
      html: `<div style="font-family: monospace; white-space: pre-wrap;">${escapeHtml(message)}</div>`,
    };

    const info = await transport.sendMail(mailOptions);

    log('info', 'Email notification sent', {
      channel: 'email',
      alertId,
      recipient,
      subject,
      messageId: info.messageId,
    });

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log('error', 'Failed to send email', {
      channel: 'email',
      alertId,
      recipient,
      subject,
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}

// TODO: Integrate with a real SMS provider (Twilio / Infobip / Mobilis Algeria API)
// For production, replace this stub with actual API calls to the SMS gateway.
// Mobilis Algeria or Djezzy's bulk SMS API should be used for local compliance.
async function sendSMS(recipient: string, message: string, alertId?: string): Promise<{ success: boolean; error?: string }> {
  // Stub implementation — logs the SMS content
  log('info', 'SMS notification (stub — not actually sent)', {
    channel: 'sms',
    alertId,
    recipient,
    message: message.substring(0, 160), // SMS length limit
  });

  // TODO: Real SMS integration
  // Example with Twilio:
  // const client = new Twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  // await client.messages.create({
  //   body: message,
  //   from: process.env.TWILIO_FROM_NUMBER,
  //   to: recipient,
  // });

  return { success: true };
}

async function sendWebhook(url: string, payload: Record<string, unknown>, alertId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId,
        timestamp: new Date().toISOString(),
        service: 'NetOP NOC',
        ...payload,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    log('info', 'Webhook notification sent', {
      channel: 'webhook',
      alertId,
      url,
    });

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log('error', 'Failed to send webhook', {
      channel: 'webhook',
      alertId,
      url,
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}

function sendInApp(recipient: string, subject: string, message: string, severity: Severity | null, alertId?: string): NotificationHistoryEntry {
  const entry: NotificationHistoryEntry = {
    id: randomUUID(),
    alertId: alertId ?? null,
    channel: 'in-app',
    recipient,
    subject,
    message,
    severity,
    status: 'sent',
    createdAt: new Date().toISOString(),
  };

  history.unshift(entry);

  log('info', 'In-app notification stored', {
    channel: 'in-app',
    alertId,
    recipient,
    subject,
  });

  return entry;
}

// ─── Dispatch Engine ─────────────────────────────────────────────────────────

async function dispatchNotification(req: NotificationRequest): Promise<NotificationHistoryEntry> {
  const { type, recipient, subject = '', message, severity = null, alertId } = req;
  const id = randomUUID();
  const now = new Date().toISOString();

  // Rate limiting check
  if (isRateLimited(recipient)) {
    log('warn', 'Notification rate-limited', {
      channel: type,
      alertId,
      recipient,
    });
    return {
      id,
      alertId: alertId ?? null,
      channel: type,
      recipient,
      subject,
      message,
      severity,
      status: 'rate-limited',
      errorMessage: `Rate limit exceeded: max ${RATE_LIMIT_MAX} per ${RATE_LIMIT_WINDOW_MS / 1000}s per recipient`,
      createdAt: now,
    };
  }

  let status: 'sent' | 'failed' = 'sent';
  let errorMessage: string | undefined;

  switch (type) {
    case 'email': {
      const result = await sendEmail(recipient, subject, message, alertId);
      status = result.success ? 'sent' : 'failed';
      errorMessage = result.error;
      break;
    }
    case 'sms': {
      const result = await sendSMS(recipient, message, alertId);
      status = result.success ? 'sent' : 'failed';
      errorMessage = result.error;
      break;
    }
    case 'webhook': {
      // Send to all registered webhook endpoints
      let anySuccess = false;
      const errors: string[] = [];
      const payload = { subject, message, severity, recipient };

      for (const url of webhookEndpoints) {
        const result = await sendWebhook(url, payload, alertId);
        if (result.success) {
          anySuccess = true;
        } else if (result.error) {
          errors.push(`${url}: ${result.error}`);
        }
      }

      if (webhookEndpoints.length === 0) {
        // If no webhook endpoints are registered, treat as in-app
        return sendInApp(recipient, subject, message, severity, alertId);
      }

      status = anySuccess ? 'sent' : 'failed';
      errorMessage = errors.length > 0 ? errors.join('; ') : undefined;
      break;
    }
    case 'in-app': {
      return sendInApp(recipient, subject, message, severity, alertId);
    }
    default:
      status = 'failed';
      errorMessage = `Unknown channel type: ${type}`;
  }

  const entry: NotificationHistoryEntry = {
    id,
    alertId: alertId ?? null,
    channel: type,
    recipient,
    subject,
    message,
    severity,
    status,
    errorMessage,
    createdAt: now,
  };

  history.unshift(entry);

  return entry;
}

// ─── Rules Engine ────────────────────────────────────────────────────────────

function matchRules(alert: AlertEvent): NotificationRule[] {
  return rules.filter((rule) => {
    if (!rule.enabled) return false;

    // Check severity match
    if (rule.severityFilter.length > 0 && !rule.severityFilter.includes(alert.severity)) {
      return false;
    }

    // Check technology match
    if (rule.technologyFilter.length > 0 && !rule.technologyFilter.includes(alert.technology)) {
      return false;
    }

    return true;
  });
}

async function processAlertRules(alert: AlertEvent): Promise<NotificationHistoryEntry[]> {
  const matchedRules = matchRules(alert);

  if (matchedRules.length === 0) {
    log('debug', 'No rules matched for alert', { alertId: alert.alertId, severity: alert.severity });
    return [];
  }

  log('info', 'Rules matched for alert', {
    alertId: alert.alertId,
    severity: alert.severity,
    matchedRules: matchedRules.length,
  });

  const results: NotificationHistoryEntry[] = [];

  for (const rule of matchedRules) {
    for (const recipient of rule.recipients) {
      const entry = await dispatchNotification({
        type: rule.channel,
        recipient,
        subject: alert.title,
        message: alert.message,
        severity: alert.severity,
        alertId: alert.alertId,
      });
      results.push(entry);
    }
  }

  return results;
}

// ─── Pre-seed Rules ──────────────────────────────────────────────────────────

function seedRules(): void {
  const now = new Date().toISOString();

  rules = [
    {
      id: randomUUID(),
      name: 'Critical Alert → SMS + Email to On-Call Engineer',
      severityFilter: ['critical'],
      technologyFilter: [],
      channel: 'sms',
      recipients: ['oncall-engineer@djezzy.dz', '+213555000001'],
      enabled: true,
      createdAt: now,
    },
    {
      id: randomUUID(),
      name: 'Critical Alert → Email Backup',
      severityFilter: ['critical'],
      technologyFilter: [],
      channel: 'email',
      recipients: ['noc-team@djezzy.dz', 'oncall-engineer@djezzy.dz'],
      enabled: true,
      createdAt: now,
    },
    {
      id: randomUUID(),
      name: 'Major Alert → Email to NOC Team',
      severityFilter: ['major'],
      technologyFilter: [],
      channel: 'email',
      recipients: ['noc-team@djezzy.dz'],
      enabled: true,
      createdAt: now,
    },
    {
      id: randomUUID(),
      name: 'Warning Alert → In-App Only',
      severityFilter: ['warning'],
      technologyFilter: [],
      channel: 'in-app',
      recipients: ['noc-dashboard'],
      enabled: true,
      createdAt: now,
    },
  ];

  log('info', 'Pre-seeded notification rules', { count: rules.length });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Express App Setup ───────────────────────────────────────────────────────

const PORT = 3004;
const app = express();

app.use(express.json());

// ─── REST API Routes ─────────────────────────────────────────────────────────

/** POST /notify — send a single notification */
app.post('/notify', async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body as NotificationRequest;

    if (!body.type || !body.recipient || !body.message) {
      res.status(400).json({
        error: 'Missing required fields: type, recipient, message',
      });
      return;
    }

    const validTypes: Channel[] = ['email', 'sms', 'webhook', 'in-app'];
    if (!validTypes.includes(body.type)) {
      res.status(400).json({
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    // If channels array is provided, dispatch to each channel
    if (body.channels && body.channels.length > 0) {
      const results: NotificationHistoryEntry[] = [];
      for (const ch of body.channels) {
        const entry = await dispatchNotification({
          ...body,
          type: ch,
        });
        results.push(entry);
      }
      res.status(200).json({ success: true, results });
      return;
    }

    const entry = await dispatchNotification(body);
    res.status(200).json({ success: true, notification: entry });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log('error', 'Error in POST /notify', { error: errorMsg });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /notify/bulk — batch send notifications */
app.post('/notify/bulk', async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body as BulkNotifyRequest;

    if (!body.notifications || !Array.isArray(body.notifications) || body.notifications.length === 0) {
      res.status(400).json({
        error: 'Request body must contain a non-empty "notifications" array',
      });
      return;
    }

    if (body.notifications.length > 500) {
      res.status(400).json({
        error: 'Batch size exceeds maximum of 500 notifications',
      });
      return;
    }

    const results: NotificationHistoryEntry[] = [];

    // Process in parallel with concurrency limit
    const concurrencyLimit = 20;
    for (let i = 0; i < body.notifications.length; i += concurrencyLimit) {
      const batch = body.notifications.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(batch.map((n) => dispatchNotification(n)));
      results.push(...batchResults);
    }

    const sent = results.filter((r) => r.status === 'sent').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const rateLimited = results.filter((r) => r.status === 'rate-limited').length;

    log('info', 'Bulk notification completed', {
      total: results.length,
      sent,
      failed,
      rateLimited,
    });

    res.status(200).json({
      success: true,
      summary: { total: results.length, sent, failed, rateLimited },
      results,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log('error', 'Error in POST /notify/bulk', { error: errorMsg });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /notify/rules — list notification rules */
app.get('/notify/rules', (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    success: true,
    rules,
    count: rules.length,
  });
});

/** POST /notify/rules — create a notification rule */
app.post('/notify/rules', (req: express.Request, res: express.Response) => {
  try {
    const body = req.body as Partial<NotificationRule>;

    if (!body.name || !body.channel || !body.recipients || !Array.isArray(body.recipients)) {
      res.status(400).json({
        error: 'Missing required fields: name, channel, recipients (array)',
      });
      return;
    }

    const validChannels: Channel[] = ['email', 'sms', 'webhook', 'in-app'];
    if (!validChannels.includes(body.channel)) {
      res.status(400).json({
        error: `Invalid channel. Must be one of: ${validChannels.join(', ')}`,
      });
      return;
    }

    const validSeverities: Severity[] = ['critical', 'major', 'minor', 'warning', 'info'];
    const severityFilter = body.severityFilter ?? [];
    for (const s of severityFilter) {
      if (!validSeverities.includes(s)) {
        res.status(400).json({
          error: `Invalid severity "${s}". Must be one of: ${validSeverities.join(', ')}`,
        });
        return;
      }
    }

    const rule: NotificationRule = {
      id: randomUUID(),
      name: body.name,
      severityFilter,
      technologyFilter: body.technologyFilter ?? [],
      channel: body.channel,
      recipients: body.recipients,
      enabled: body.enabled ?? true,
      createdAt: new Date().toISOString(),
    };

    rules.push(rule);

    log('info', 'Notification rule created', {
      ruleId: rule.id,
      name: rule.name,
      channel: rule.channel,
      recipients: rule.recipients,
    });

    res.status(201).json({ success: true, rule });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log('error', 'Error in POST /notify/rules', { error: errorMsg });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** DELETE /notify/rules/:id — delete a notification rule */
app.delete('/notify/rules/:id', (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const index = rules.findIndex((r) => r.id === id);

  if (index === -1) {
    res.status(404).json({ error: `Rule with id "${id}" not found` });
    return;
  }

  const deleted = rules.splice(index, 1)[0];

  log('info', 'Notification rule deleted', {
    ruleId: deleted.id,
    name: deleted.name,
  });

  res.status(200).json({ success: true, deleted });
});

/** GET /notify/history — list sent notifications with pagination */
app.get('/notify/history', (req: express.Request, res: express.Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const channel = req.query.channel as Channel | undefined;
  const severity = req.query.severity as Severity | undefined;
  const status = req.query.status as string | undefined;

  let filtered = [...history];

  if (channel) {
    filtered = filtered.filter((h) => h.channel === channel);
  }
  if (severity) {
    filtered = filtered.filter((h) => h.severity === severity);
  }
  if (status) {
    filtered = filtered.filter((h) => h.status === status);
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  res.status(200).json({
    success: true,
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/** GET /health — health check */
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'notification-service',
    port: PORT,
    uptime: process.uptime(),
    rulesCount: rules.length,
    historyCount: history.length,
    webhookEndpoints: webhookEndpoints.length,
    timestamp: new Date().toISOString(),
  });
});

// ─── HTTP + Socket.IO Server ─────────────────────────────────────────────────

const server = createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  log('info', 'Socket.IO client connected', { socketId: socket.id });

  socket.on('new-alert', async (alert: AlertEvent) => {
    log('info', 'Received new-alert event via Socket.IO', {
      alertId: alert.alertId,
      severity: alert.severity,
      technology: alert.technology,
      title: alert.title,
      socketId: socket.id,
    });

    try {
      const results = await processAlertRules(alert);

      // Acknowledge back to the sender
      socket.emit('alert-notifications-dispatched', {
        alertId: alert.alertId,
        dispatchedCount: results.length,
        results,
      });

      log('info', 'Alert notifications dispatched', {
        alertId: alert.alertId,
        dispatchedCount: results.length,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log('error', 'Failed to process alert rules', {
        alertId: alert.alertId,
        error: errorMsg,
      });

      socket.emit('alert-notifications-error', {
        alertId: alert.alertId,
        error: errorMsg,
      });
    }
  });

  socket.on('disconnect', () => {
    log('info', 'Socket.IO client disconnected', { socketId: socket.id });
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────

seedRules();

server.listen(PORT, () => {
  log('info', 'Notification service started', {
    port: PORT,
    service: '@netop/notification-service',
  });
});
