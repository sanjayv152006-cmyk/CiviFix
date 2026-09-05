import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Production security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

export interface NotificationRecord {
  id: string;
  icon: string;
  color: 'success' | 'warning' | 'info' | 'error';
  title?: string;
  text: string;
  time: string;
  timestamp: number;
  unread: boolean;
  recipientEmail?: string;
  recipientRole?: 'citizen' | 'admin' | 'all';
  reportId?: string;
  actionType?: 'report_submitted' | 'status_updated' | 'priority_changed' | 'admin_alert';
  emailSent?: boolean;
  emailDetails?: {
    to: string;
    subject: string;
    body: string;
    sentAt: string;
  };
}

export interface EmailRecord {
  id: string;
  to: string;
  recipientName?: string;
  subject: string;
  text: string;
  html: string;
  type: 'citizen_confirmation' | 'admin_alert' | 'status_update' | 'custom';
  reportId?: string;
  sentAt: string;
  timestamp: number;
  status: 'delivered' | 'sent';
}

// In-memory persistent data store
let notificationStore: NotificationRecord[] = [
  {
    id: 'notif-init-1',
    icon: 'fa-check-circle',
    color: 'success',
    title: 'Report Verified',
    text: 'Your report CF-2026-0001 has been verified and assigned to the field team.',
    time: '2 hours ago',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    unread: true,
    recipientRole: 'all',
    reportId: 'CF-2026-0001'
  },
  {
    id: 'notif-init-2',
    icon: 'fa-user-cog',
    color: 'info',
    title: 'Assignment Notice',
    text: 'Your complaint has been assigned to Municipal Team A.',
    time: '5 hours ago',
    timestamp: Date.now() - 5 * 60 * 60 * 1000,
    unread: true,
    recipientRole: 'all'
  },
  {
    id: 'notif-init-3',
    icon: 'fa-hard-hat',
    color: 'warning',
    title: 'Work In Progress',
    text: 'Work has started on your reported issue CF-2026-0006.',
    time: '1 day ago',
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    unread: true,
    recipientRole: 'all',
    reportId: 'CF-2026-0006'
  },
  {
    id: 'notif-init-4',
    icon: 'fa-flag-checkered',
    color: 'success',
    title: 'Issue Resolved',
    text: 'Your issue CF-2026-0003 has been resolved. Please confirm.',
    time: '2 days ago',
    timestamp: Date.now() - 48 * 60 * 60 * 1000,
    unread: false,
    recipientRole: 'all',
    reportId: 'CF-2026-0003'
  }
];

let emailStore: EmailRecord[] = [];

// ================= API ROUTES =================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET /api/notifications
app.get('/api/notifications', (req: Request, res: Response) => {
  const { email, role } = req.query;
  let filtered = [...notificationStore];

  if (email || role) {
    filtered = filtered.filter((n) => {
      // If role matches or notification is for all
      const roleMatch = !n.recipientRole || n.recipientRole === 'all' || (role && n.recipientRole === role);
      // If email matches or notification has no specific email
      const emailMatch = !n.recipientEmail || (email && n.recipientEmail.toLowerCase() === String(email).toLowerCase());
      return roleMatch || emailMatch;
    });
  }

  // Sort descending by timestamp
  filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  res.json({
    success: true,
    notifications: filtered,
    unreadCount: filtered.filter((n) => n.unread).length
  });
});

// POST /api/notifications
app.post('/api/notifications', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.text) {
    return res.status(400).json({ error: 'Notification text is required' });
  }

  const newNotif: NotificationRecord = {
    id: body.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    icon: body.icon || 'fa-bell',
    color: body.color || 'info',
    title: body.title || 'Notification',
    text: body.text,
    time: body.time || 'Just now',
    timestamp: body.timestamp || Date.now(),
    unread: body.unread !== undefined ? body.unread : true,
    recipientEmail: body.recipientEmail,
    recipientRole: body.recipientRole || 'all',
    reportId: body.reportId,
    actionType: body.actionType,
    emailSent: body.emailSent,
    emailDetails: body.emailDetails
  };

  notificationStore.unshift(newNotif);

  res.status(201).json({
    success: true,
    notification: newNotif
  });
});

// PATCH /api/notifications/:id/read
app.patch('/api/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const notif = notificationStore.find((n) => n.id === id);
  if (notif) {
    notif.unread = false;
    return res.json({ success: true, notification: notif });
  }
  res.status(404).json({ error: 'Notification not found' });
});

// POST /api/notifications/mark-all-read
app.post('/api/notifications/mark-all-read', (req: Request, res: Response) => {
  const { email, role } = req.body || {};
  notificationStore.forEach((n) => {
    if (!email && !role) {
      n.unread = false;
    } else {
      const matchRole = !role || !n.recipientRole || n.recipientRole === 'all' || n.recipientRole === role;
      const matchEmail = !email || !n.recipientEmail || n.recipientEmail.toLowerCase() === String(email).toLowerCase();
      if (matchRole || matchEmail) {
        n.unread = false;
      }
    }
  });

  res.json({ success: true, message: 'All notifications marked as read' });
});

// POST /api/send-email
app.post('/api/send-email', (req: Request, res: Response) => {
  const { to, recipientName, subject, text, html, type, reportId } = req.body;

  if (!to || !subject || typeof to !== 'string' || typeof subject !== 'string') {
    return res.status(400).json({ error: 'Missing required email fields (to, subject)' });
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to.trim())) {
    return res.status(400).json({ error: 'Invalid recipient email address format' });
  }

  const cleanSubject = subject.trim().slice(0, 200);
  const cleanRecipientName = (recipientName ? String(recipientName) : 'CivicFix User').slice(0, 100);
  const cleanText = (text ? String(text) : '').slice(0, 10000);
  const cleanHtml = (html ? String(html) : `<p>${cleanText}</p>`).slice(0, 30000);

  const sentAt = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const emailRecord: EmailRecord = {
    id: `eml-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    to: to.trim().toLowerCase(),
    recipientName: cleanRecipientName,
    subject: cleanSubject,
    text: cleanText,
    html: cleanHtml,
    type: type || 'custom',
    reportId: reportId ? String(reportId).slice(0, 50) : undefined,
    sentAt,
    timestamp: Date.now(),
    status: 'delivered'
  };

  emailStore.unshift(emailRecord);

  // Keep email outbox capped at 100 entries
  if (emailStore.length > 100) {
    emailStore = emailStore.slice(0, 100);
  }

  console.log(`[CivicFix Email Service] Dispatched email to: ${to} | Subject: "${subject}" | Type: ${type}`);

  res.status(200).json({
    success: true,
    message: `Email successfully dispatched to ${to}`,
    emailRecord
  });
});

// GET /api/emails
app.get('/api/emails', (req: Request, res: Response) => {
  const { to, reportId } = req.query;
  let filtered = [...emailStore];

  if (to) {
    filtered = filtered.filter((e) => e.to.toLowerCase() === String(to).toLowerCase());
  }
  if (reportId) {
    filtered = filtered.filter((e) => e.reportId === String(reportId));
  }

  res.json({
    success: true,
    emails: filtered
  });
});

// ================= VITE INTEGRATION =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    // In sandboxed cloud environments where HMR websocket port is not exposed,
    // intercept /@vite/client to cleanly silence the connection attempt and prevent
    // unhandled rejection / connection error banners.
    app.get('/@vite/client', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const transformed = await vite.transformRequest('/@vite/client');
        if (transformed && transformed.code) {
          const patched = transformed.code.replace(
            /async connect\(handlers\) \{[\s\S]*?\},\s*async disconnect/,
            'async connect(handlers) { /* HMR websocket disabled in container */ }, async disconnect'
          );
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-cache');
          res.send(patched);
          return;
        }
      } catch (err) {
        // Fall back to default middleware if transform fails
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicFix Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
