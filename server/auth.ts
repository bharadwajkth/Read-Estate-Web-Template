import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AdminSessionUser } from '../src/types';

export const SESSION_COOKIE_NAME = 'sk_agency_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
  user: AdminSessionUser;
  exp: number;
}

let cachedEphemeralSecret: string | null = null;

export function getSessionSecret(): { secret: string; fromEnv: boolean } {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16 && !envSecret.includes('replace-with')) {
    return { secret: envSecret, fromEnv: true };
  }
  if (!cachedEphemeralSecret) {
    cachedEphemeralSecret = crypto.randomBytes(32).toString('hex');
  }
  return { secret: cachedEphemeralSecret, fromEnv: false };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;

  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const originalBuf = Buffer.from(originalHex, 'hex');
  if (derivedBuf.length !== originalBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, originalBuf);
}

export function createSessionToken(
  user: AdminSessionUser,
  secret: string,
  ttlMs: number = SESSION_TTL_MS
): string {
  const payload: SessionPayload = {
    user,
    exp: Date.now() + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret: string
): AdminSessionUser | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const raw = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as SessionPayload;
    if (!parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    if (!parsed.user || !parsed.user.id || !parsed.user.email) {
      return null;
    }
    return parsed.user;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const segment of cookieHeader.split(';')) {
    const idx = segment.indexOf('=');
    if (idx === -1) continue;
    const key = segment.slice(0, idx).trim();
    const val = segment.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

export function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

export interface AuthenticatedRequest extends Request {
  adminUser?: AdminSessionUser;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  const { secret } = getSessionSecret();
  const user = verifySessionToken(token, secret);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  req.adminUser = user;
  next();
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 1000 * 60 * 5;
const RATE_LIMIT_MAX_ATTEMPTS = 20;

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function resetLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}
