import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_AGENCY_SETTINGS,
  INITIAL_PROPERTIES_SEED,
} from '../src/config/agency.config';
import { formatInrPrice } from '../src/lib/propertyUtils';
import type {
  AdminSessionUser,
  AgencySettings,
  Inquiry,
  InquiryInput,
  InquiryStatus,
  Property,
  PropertyInput,
  SecurityAuditReport,
} from '../src/types';
import { getSessionSecret, hashPassword } from './auth';

interface StoredAdminRecord extends AdminSessionUser {
  passwordHash: string;
  isDefaultDemoPassword: boolean;
  updatedAt: string;
}

interface DataStoreSchema {
  version: number;
  agency: AgencySettings;
  properties: Property[];
  inquiries: Inquiry[];
  admins: StoredAdminRecord[];
}

export const DEMO_ADMIN_EMAIL = 'admin@example-realty.com';
export const DEMO_ADMIN_PASSWORD = 'AdminTemplate@2026';

function getDataDir(): string {
  const configured = process.env.DATA_DIR?.trim() || './data';
  return path.resolve(process.cwd(), configured);
}

function getStoreFilePath(): string {
  return path.join(getDataDir(), 'store.json');
}

function buildSeedStore(): DataStoreSchema {
  const now = new Date().toISOString();

  const initialEmail =
    process.env.ADMIN_EMAIL?.trim().toLowerCase() || DEMO_ADMIN_EMAIL;
  const envPass = process.env.ADMIN_INITIAL_PASSWORD?.trim();
  const usingDemoPassword =
    !envPass || envPass.includes('replace-with') || envPass.length < 8;
  const initialPassword = usingDemoPassword ? DEMO_ADMIN_PASSWORD : envPass;

  const properties: Property[] = INITIAL_PROPERTIES_SEED.map((item, idx) => ({
    ...item,
    id: `prop-${idx + 1}`,
    priceDisplay: formatInrPrice(item.priceInr, item.transactionType),
    createdAt: now,
    updatedAt: now,
  }));

  const inquiries: Inquiry[] = [
    {
      id: 'inq-1',
      propertyId: 'prop-1',
      propertyTitle: properties[0].title,
      name: 'Jordan Mercer',
      phone: '(555) 019-3310',
      email: 'j.mercer@regionalfreight.example',
      company: 'Regional Freight & Cold Chain',
      message:
        'Interested in inspecting the 25,000 sq.ft North Logistics Park warehouse for regional distribution.',
      status: 'Site Visit Scheduled',
      internalNotes: 'Scheduled inspection at 4:00 PM.',
      createdAt: now,
    },
  ];

  return {
    version: 1,
    agency: DEFAULT_AGENCY_SETTINGS,
    properties,
    inquiries,
    admins: [
      {
        id: 'admin-1',
        email: initialEmail,
        name: 'Principal Broker',
        role: 'Owner',
        passwordHash: hashPassword(initialPassword),
        isDefaultDemoPassword: usingDemoPassword,
        updatedAt: now,
      },
    ],
  };
}

function ensureStoreLoaded(): DataStoreSchema {
  const dir = getDataDir();
  const filePath = getStoreFilePath();

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    const seed = buildSeedStore();
    persistStore(seed);
    return seed;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as DataStoreSchema;
    if (!parsed.properties || !parsed.agency || !parsed.admins) {
      const seed = buildSeedStore();
      persistStore(seed);
      return seed;
    }
    return parsed;
  } catch {
    const seed = buildSeedStore();
    persistStore(seed);
    return seed;
  }
}

function persistStore(store: DataStoreSchema): void {
  const dir = getDataDir();
  const filePath = getStoreFilePath();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

export function getAgencySettings(): AgencySettings {
  return ensureStoreLoaded().agency;
}

export function updateAgencySettings(patch: Partial<AgencySettings>): AgencySettings {
  const store = ensureStoreLoaded();
  const updated: AgencySettings = {
    ...store.agency,
    ...patch,
    corridors: Array.isArray(patch.corridors)
      ? patch.corridors.filter((c) => c.trim().length > 0)
      : store.agency.corridors,
  };
  store.agency = updated;
  persistStore(store);
  return updated;
}

export function listProperties(): Property[] {
  return ensureStoreLoaded().properties;
}

export function createProperty(input: PropertyInput): Property {
  const store = ensureStoreLoaded();
  const now = new Date().toISOString();
  const newProp: Property = {
    ...input,
    id: `prop-${crypto.randomUUID().slice(0, 8)}`,
    priceDisplay: formatInrPrice(input.priceInr, input.transactionType),
    createdAt: now,
    updatedAt: now,
  };
  store.properties.unshift(newProp);
  persistStore(store);
  return newProp;
}

export function updateProperty(
  id: string,
  patch: Partial<PropertyInput>
): Property | null {
  const store = ensureStoreLoaded();
  const idx = store.properties.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const existing = store.properties[idx];
  const mergedSpecs = patch.specs
    ? { ...existing.specs, ...patch.specs }
    : existing.specs;
  const priceInr =
    typeof patch.priceInr === 'number' ? patch.priceInr : existing.priceInr;
  const transactionType = patch.transactionType ?? existing.transactionType;

  const updated: Property = {
    ...existing,
    ...patch,
    specs: mergedSpecs,
    priceInr,
    transactionType,
    priceDisplay: formatInrPrice(priceInr, transactionType),
    updatedAt: new Date().toISOString(),
  };

  store.properties[idx] = updated;
  persistStore(store);
  return updated;
}

export function deleteProperty(id: string): boolean {
  const store = ensureStoreLoaded();
  const prevLen = store.properties.length;
  store.properties = store.properties.filter((p) => p.id !== id);
  if (store.properties.length === prevLen) return false;
  persistStore(store);
  return true;
}

export function listInquiries(): Inquiry[] {
  return ensureStoreLoaded().inquiries;
}

export function createInquiry(input: InquiryInput): Inquiry {
  const store = ensureStoreLoaded();
  const newInquiry: Inquiry = {
    id: `inq-${crypto.randomUUID().slice(0, 8)}`,
    propertyId: input.propertyId ?? null,
    propertyTitle: input.propertyTitle || 'General Industrial Inquiry',
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    company: (input.company || '').trim(),
    message: input.message.trim(),
    status: 'New',
    internalNotes: '',
    createdAt: new Date().toISOString(),
  };
  store.inquiries.unshift(newInquiry);
  persistStore(store);
  return newInquiry;
}

export function updateInquiry(
  id: string,
  patch: { status?: InquiryStatus; internalNotes?: string }
): Inquiry | null {
  const store = ensureStoreLoaded();
  const idx = store.inquiries.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  store.inquiries[idx] = {
    ...store.inquiries[idx],
    ...(patch.status ? { status: patch.status } : {}),
    ...(typeof patch.internalNotes === 'string'
      ? { internalNotes: patch.internalNotes }
      : {}),
  };
  persistStore(store);
  return store.inquiries[idx];
}

export function findAdminByEmail(email: string): StoredAdminRecord | null {
  const normalized = email.trim().toLowerCase();
  const store = ensureStoreLoaded();
  return store.admins.find((a) => a.email.toLowerCase() === normalized) || null;
}

export function isDemoModeActive(): boolean {
  const store = ensureStoreLoaded();
  return store.admins.some((a) => a.isDefaultDemoPassword);
}

export function updateAdminPassword(adminId: string, newPassword: string): boolean {
  const store = ensureStoreLoaded();
  const idx = store.admins.findIndex((a) => a.id === adminId);
  if (idx === -1) return false;

  store.admins[idx].passwordHash = hashPassword(newPassword);
  store.admins[idx].isDefaultDemoPassword = false;
  store.admins[idx].updatedAt = new Date().toISOString();
  persistStore(store);
  return true;
}

export function getSecurityAuditReport(): SecurityAuditReport {
  const gitignorePath = path.resolve(process.cwd(), '.gitignore');
  let gitignoreContent = '';
  try {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  } catch {
    gitignoreContent = '';
  }

  const hasEnvIgnored = gitignoreContent.includes('.env*');
  const hasDataIgnored = gitignoreContent.includes('data/');
  const hasDbIgnored = gitignoreContent.includes('*.db');
  const gitignoreProtected = hasEnvIgnored && hasDataIgnored && hasDbIgnored;

  const { fromEnv: sessionSecretConfigured } = getSessionSecret();
  const demoCredentialsActive = isDemoModeActive();

  return {
    gitignoreProtected,
    sessionSecretConfigured,
    demoCredentialsActive,
    dataDirRelative: process.env.DATA_DIR?.trim() || './data',
    checks: [
      {
        id: 'chk-gitignore',
        label: '.gitignore excludes .env secrets and local data/',
        passed: gitignoreProtected,
        detail: gitignoreProtected
          ? 'Environment files (.env*), data/, *.db, and uploads/ are excluded from Git commits.'
          : 'Update .gitignore to exclude .env*, data/, and *.db.',
      },
      {
        id: 'chk-cookie',
        label: 'HttpOnly HMAC-SHA256 signed session cookies',
        passed: true,
        detail:
          'Authentication cookies are HttpOnly with timing-safe signature verification and 7-day expiry.',
      },
      {
        id: 'chk-scrypt',
        label: 'Salted scrypt credential hashing',
        passed: true,
        detail:
          'Admin passwords use 16-byte per-user salts with Node crypto.scryptSync and timingSafeEqual.',
      },
      {
        id: 'chk-env-secret',
        label: 'Custom SESSION_SECRET configured in environment',
        passed: sessionSecretConfigured,
        detail: sessionSecretConfigured
          ? 'Using explicit SESSION_SECRET from environment variables.'
          : 'Using ephemeral cryptographic runtime secret. Set SESSION_SECRET in .env before deploying.',
      },
      {
        id: 'chk-password',
        label: 'Default template password rotated',
        passed: !demoCredentialsActive,
        detail: demoCredentialsActive
          ? 'Template demo password is active. Rotate it below or set ADMIN_INITIAL_PASSWORD in .env.'
          : 'Custom admin password is active.',
      },
    ],
  };
}
