import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { APIRequestContext } from '@playwright/test';

interface RfsConfig {
  apiUrl: string;
  apiKey: string;
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

function parseEnvFile(filePath: string): Record<string, string> {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const result: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const splitIndex = trimmed.indexOf('=');
    if (splitIndex === -1) continue;
    const key = trimmed.slice(0, splitIndex).trim();
    const value = trimmed.slice(splitIndex + 1).trim();
    result[key] = value;
  }

  return result;
}

export function getRfsConfig(): RfsConfig {
  const envPath = path.resolve(process.cwd(), '.env.rfs');
  const env = parseEnvFile(envPath);

  if (!env.VITE_API_URL || !env.VITE_API_KEY) {
    throw new Error('Missing RFS API settings in .env.rfs');
  }

  return {
    apiUrl: env.VITE_API_URL.replace(/\/$/, ''),
    apiKey: env.VITE_API_KEY,
  };
}

async function apiCall<T>(
  request: APIRequestContext,
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: Record<string, string>;
    data?: unknown;
    useApiKey?: boolean;
  } = {}
): Promise<T> {
  const config = getRfsConfig();
  const method = options.method ?? 'GET';
  const url = new URL(`${config.apiUrl}/${endpoint}`);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await request.fetch(url.toString(), {
    method,
    headers: options.useApiKey === false ? {} : { 'X-API-Key': config.apiKey },
    data: options.data,
  });

  const text = await response.text();
  let parsed: unknown = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Non-JSON response from ${endpoint}: ${text}`);
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error: string }).error)
        : `HTTP ${response.status()} from ${endpoint}`;
    throw new Error(message);
  }

  return parsed as T;
}

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
  for (const member of members) {
    phoneCounts.set(member.phone, (phoneCounts.get(member.phone) || 0) + 1);
  }

  const uniquePhoneMember = members.find(member => {
    const count = phoneCounts.get(member.phone) || 0;
    return count === 1 && /^[6-9]\d{9}$/.test(member.phone);
  });

  const target = uniquePhoneMember || members.find(member => /^[6-9]\d{9}$/.test(member.phone));
  if (!target) {
    throw new Error('No active member with a usable phone number found in RFS.');
  }

  const password = `RfsPortal!${Date.now().toString().slice(-6)}`;

  await apiCall(request, 'member-auth', {
    method: 'POST',
    params: { action: 'setPassword' },
    data: {
      memberId: target.id,
      passwordHash: sha256(password),
    },
  });

  return {
    id: target.id,
    firstName: target.firstName,
    lastName: target.lastName,
    phone: target.phone,
    password,
  };
}

export function makeUniqueLeadData(): {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string;
} {
  const suffix = Date.now().toString().slice(-8);
  return {
    firstName: 'Rfs',
    lastName: `Lead${suffix}`,
    email: `rfs.auto.${suffix}@example.com`,
    phone: `9${suffix.slice(-9)}`.padEnd(10, '7'),
    age: '31',
  };
}

export async function cleanupLeadByPhone(request: APIRequestContext, phone: string): Promise<void> {
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
    // Cleanup should not mask test results.
  }
}
