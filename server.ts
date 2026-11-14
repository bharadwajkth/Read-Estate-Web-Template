import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import {
  checkLoginRateLimit,
  clearSessionCookie,
  createSessionToken,
  getSessionSecret,
  parseCookies,
  requireAuth,
  resetLoginRateLimit,
  SESSION_COOKIE_NAME,
  setSessionCookie,
  verifyPassword,
  verifySessionToken,
  type AuthenticatedRequest,
} from './server/auth';
import {
  createInquiry,
  createProperty,
  deleteProperty,
  DEMO_ADMIN_EMAIL,
  findAdminByEmail,
  getAgencySettings,
  getSecurityAuditReport,
  isDemoModeActive,
  listInquiries,
  listProperties,
  updateAdminPassword,
  updateAgencySettings,
  updateInquiry,
  updateProperty,
} from './server/store';
import {
  validateInquiryInput,
  validatePropertyInput,
} from './src/lib/propertyUtils';
import type { InquiryStatus, PropertyInput } from './src/types';

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Baseline security headers compatible with iframe preview
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Public health & agency settings
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/agency', (_req, res) => {
    res.json({
      agency: getAgencySettings(),
      demoMode: isDemoModeActive(),
    });
  });

  // Public properties catalog (supports query filtering or returns full list for client)
  app.get('/api/properties', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const { secret } = getSessionSecret();
    const isAdmin = Boolean(verifySessionToken(cookies[SESSION_COOKIE_NAME], secret));
    const all = listProperties();

    if (isAdmin && req.query.includeAll === 'true') {
      res.json({ properties: all });
      return;
    }

    const publicList = all.filter(
      (p) => p.status === 'Available' || p.status === 'Under Offer'
    );
    res.json({ properties: publicList });
  });

  // Public lead / site visit submission
  app.post('/api/inquiries', (req, res) => {
    const validation = validateInquiryInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: 'Invalid inquiry fields.', errors: validation.errors });
      return;
    }

    const inquiry = createInquiry(req.body);
    res.status(201).json({ inquiry });
  });

  // Auth endpoints
  app.get('/api/auth/me', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const { secret } = getSessionSecret();
    const user = verifySessionToken(cookies[SESSION_COOKIE_NAME], secret);
    res.json({
      authenticated: Boolean(user),
      user: user || null,
      demoMode: isDemoModeActive(),
      demoEmail: isDemoModeActive() ? DEMO_ADMIN_EMAIL : null,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const clientIp = req.ip || 'local';
    const limit = checkLoginRateLimit(clientIp);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Too many login attempts. Please wait ${limit.retryAfterSec} seconds.`,
      });
      return;
    }

    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const admin = findAdminByEmail(email);
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    resetLoginRateLimit(clientIp);
    const sessionUser = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
    const { secret } = getSessionSecret();
    const token = createSessionToken(sessionUser, secret);
    setSessionCookie(res, token);

    res.json({
      user: sessionUser,
      demoMode: isDemoModeActive(),
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post('/api/auth/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
    const currentPassword =
      typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword =
      typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }

    const admin = findAdminByEmail(req.adminUser!.email);
    if (!admin || !verifyPassword(currentPassword, admin.passwordHash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    updateAdminPassword(admin.id, newPassword);
    res.json({ ok: true, demoMode: isDemoModeActive() });
  });

  // Protected property management routes
  app.post('/api/properties', requireAuth, (req, res) => {
    const payload = req.body as Partial<PropertyInput>;
    const validation = validatePropertyInput(payload);
    if (!validation.valid) {
      res.status(400).json({ error: 'Invalid property data.', errors: validation.errors });
      return;
    }

    const created = createProperty(payload as PropertyInput);
    res.status(201).json({ property: created });
  });

  app.patch('/api/properties/:id', requireAuth, (req, res) => {
    const updated = updateProperty(req.params.id, req.body || {});
    if (!updated) {
      res.status(404).json({ error: 'Property not found.' });
      return;
    }
    res.json({ property: updated });
  });

  app.delete('/api/properties/:id', requireAuth, (req, res) => {
    const removed = deleteProperty(req.params.id);
    if (!removed) {
      res.status(404).json({ error: 'Property not found.' });
      return;
    }
    res.json({ ok: true });
  });

  // Protected inquiries management
  app.get('/api/inquiries', requireAuth, (_req, res) => {
    res.json({ inquiries: listInquiries() });
  });

  app.patch('/api/inquiries/:id', requireAuth, (req, res) => {
    const allowedStatuses: InquiryStatus[] = [
      'New',
      'Contacted',
      'Site Visit Scheduled',
      'Closed',
    ];
    const status = req.body?.status as InquiryStatus | undefined;
    if (status && !allowedStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid inquiry status.' });
      return;
    }

    const updated = updateInquiry(req.params.id, {
      status,
      internalNotes:
        typeof req.body?.internalNotes === 'string' ? req.body.internalNotes : undefined,
    });
    if (!updated) {
      res.status(404).json({ error: 'Inquiry not found.' });
      return;
    }
    res.json({ inquiry: updated });
  });

  // Protected white-label template settings & security audit
  app.put('/api/agency', requireAuth, (req, res) => {
    const agency = updateAgencySettings(req.body || {});
    res.json({ agency });
  });

  app.get('/api/security-audit', requireAuth, (_req, res) => {
    res.json({ report: getSecurityAuditReport() });
  });

  // Vite dev middleware or static production build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
