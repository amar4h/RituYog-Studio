/**
 * Environment-aware API helper for remote E2E tests.
 * Supports both RFS and Production targets.
 *
 * Environment is determined by E2E_TARGET env var:
 *   E2E_TARGET=rfs  → reads .env.rfs  → https://rfs.rituyog.com
 *   E2E_TARGET=prod → reads .env.production → https://admin.rituyog.com
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { APIRequestContext } from '@playwright/test';

// ============================================
// TYPES
// ============================================

export interface EnvConfig {
  target: 'rfs' | 'prod';
  baseUrl: string;
  apiUrl: string;
  apiKey: string;
  isProduction: boolean;
}

export interface SeededMember {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
}

interface MemberRecord {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
}

interface LeadRecord {
  id: string;
  phone: string;
  email: string;
}

interface SubscriptionRecord {
  id: string;
  memberId: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  memberId: string;
  totalAmount: number;
  status: string;
}

// ============================================
// ENV FILE PARSING
// ============================================

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const result: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }

  return result;
}

// ============================================
// CONFIG LOADING
// ============================================

let _cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (_cachedConfig) return _cachedConfig;

  const target = (process.env.E2E_TARGET || 'rfs') as 'rfs' | 'prod';
  const envFile = target === 'prod' ? '.env.production' : '.env.rfs';
  const envPath = path.resolve(process.cwd(), envFile);
  const env = parseEnvFile(envPath);

  if (!env.VITE_API_URL || !env.VITE_API_KEY) {
    throw new Error(`Missing VITE_API_URL or VITE_API_KEY in ${envFile}`);
  }

  const apiUrl = env.VITE_API_URL.replace(/\/$/, '');

  // Derive base URL from API URL (strip /api suffix)
  const baseUrl = apiUrl.replace(/\/api$/, '');

  _cachedConfig = {
    target,
    baseUrl,
    apiUrl,
    apiKey: env.VITE_API_KEY,
    isProduction: target === 'prod',
  };

  return _cachedConfig;
}

/** Reset cached config (useful for test isolation) */
export function resetConfigCache() {
  _cachedConfig = null;
}

// ============================================
// API CALL HELPER
// ============================================

export async function apiCall<T>(
  request: APIRequestContext,
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: Record<string, string>;
    data?: unknown;
  } = {}
): Promise<T> {
  const config = getEnvConfig();
  const method = options.method ?? 'GET';
  const url = new URL(`${config.apiUrl}/${endpoint}`);

  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, v);
    }
  }

  const response = await request.fetch(url.toString(), {
    method,
    headers: { 'X-API-Key': config.apiKey },
    data: options.data,
  });

  const text = await response.text();
  let parsed: unknown = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Non-JSON response from ${endpoint}: ${text.slice(0, 200)}`);
  }

  if (!response.ok()) {
    const message =
      typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error: string }).error)
        : `HTTP ${response.status()} from ${endpoint}`;
    throw new Error(message);
  }

  return parsed as T;
}

// ============================================
// AUTH HELPERS
// ============================================

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function getAdminPassword(request: APIRequestContext): Promise<string> {
  const settings = await apiCall<{ adminPassword?: string }>(request, 'settings');
  return settings.adminPassword || 'admin123';
}

export async function prepareSeededMember(request: APIRequestContext): Promise<SeededMember> {
  const members = await apiCall<MemberRecord[]>(request, 'members', {
    params: { action: 'getActive' },
  });

  const phoneCounts = new Map<string, number>();
  for (const m of members) {
    phoneCounts.set(m.phone, (phoneCounts.get(m.phone) || 0) + 1);
  }

  const target =
    members.find(m => phoneCounts.get(m.phone) === 1 && /^[6-9]\d{9}$/.test(m.phone)) ||
    members.find(m => /^[6-9]\d{9}$/.test(m.phone));

  if (!target) {
    throw new Error(`No active member with usable phone found on ${getEnvConfig().target}.`);
  }

  const password = `E2ePortal!${Date.now().toString().slice(-6)}`;

  await apiCall(request, 'member-auth', {
    method: 'POST',
    params: { action: 'setPassword' },
    data: { memberId: target.id, passwordHash: sha256(password) },
  });

  return {
    id: target.id,
    firstName: target.firstName,
    lastName: target.lastName,
    phone: target.phone,
    password,
  };
}

// ============================================
// DATA HELPERS (READ-ONLY)
// ============================================

export async function getActiveMembers(request: APIRequestContext): Promise<MemberRecord[]> {
  return apiCall<MemberRecord[]>(request, 'members', {
    params: { action: 'getActive' },
  });
}

export async function getSubscriptions(request: APIRequestContext): Promise<SubscriptionRecord[]> {
  return apiCall<SubscriptionRecord[]>(request, 'subscriptions');
}

export async function getInvoices(request: APIRequestContext): Promise<InvoiceRecord[]> {
  return apiCall<InvoiceRecord[]>(request, 'invoices');
}

// ============================================
// TEST DATA HELPERS (RFS ONLY — WRITE OPERATIONS)
// ============================================

export function makeUniqueLeadData() {
  const suffix = Date.now().toString().slice(-8);
  return {
    firstName: 'E2e',
    lastName: `Lead${suffix}`,
    email: `e2e.auto.${suffix}@example.com`,
    phone: `9${suffix.slice(-9)}`.padEnd(10, '7'),
    age: '31',
  };
}

/** Cleanup a lead and its trials. Only call on RFS! */
export async function cleanupLeadByPhone(request: APIRequestContext, phone: string): Promise<void> {
  if (getEnvConfig().isProduction) {
    throw new Error('cleanupLeadByPhone must NOT be called on production!');
  }

  try {
    const lead = await apiCall<LeadRecord | null>(request, 'leads', {
      params: { action: 'getByPhone', phone },
    });
    if (!lead?.id) return;

    const trials = await apiCall<Array<{ id: string }>>(request, 'trials', {
      params: { action: 'getByLead', leadId: lead.id },
    });
    for (const trial of trials) {
      await apiCall(request, 'trials', {
        method: 'DELETE',
        params: { action: 'delete', id: trial.id },
      });
    }

    await apiCall(request, 'leads', {
      method: 'DELETE',
      params: { action: 'delete', id: lead.id },
    });
  } catch {
    // Cleanup should not mask test results
  }
}
